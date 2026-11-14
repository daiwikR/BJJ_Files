from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, nutrition, schemas, services
from ..database import get_db

router = APIRouter(prefix="/api/fuel", tags=["fuel"])


@router.get("/day")
def fuel_day(day: date | None = None, day_type: str | None = None, db: Session = Depends(get_db)):
    today = date.today()
    day = day or today
    if day_type not in nutrition.DAY_TYPES:
        day_type = None
    d = services.fuel_day(db, day, day_type)
    sl = services.sleep_summary(db, today) if day == today else None
    d["hints"] = nutrition.hints(
        d["totals"], d["targets"], hour=d["hour"], trained_today=d["trained"],
        short_sleep=bool(sl and sl["hours"] < 6.5),
        low_days=services.low_energy_days(db, day) if day == today else 0,
    )
    d["day_types"] = {k: v["label"] for k, v in nutrition.DAY_TYPES.items()}
    return d


@router.get("/history")
def history(days: int = 14, db: Session = Depends(get_db)):
    today = date.today()
    out = []
    for i in range(days - 1, -1, -1):
        d = services.fuel_day(db, today - timedelta(days=i))
        out.append({"day": d["day"], "logged": d["logged"], "score": d["score"]["score"] if d["logged"] else None,
                    "kcal": d["totals"]["kcal"], "protein": d["totals"]["protein"], "water_ml": d["totals"]["water_ml"],
                    "target_kcal": d["targets"]["kcal"], "target_protein": d["targets"]["protein"]})
    return out


@router.get("/foods")
def search_foods(q: str = "", limit: int = 30, db: Session = Depends(get_db)):
    query = db.query(models.Food)
    if q.strip():
        for word in q.strip().split():
            query = query.filter(models.Food.name.ilike(f"%{word}%"))
    rows = query.order_by(models.Food.custom.desc(), models.Food.name).limit(limit).all()
    return [{"id": f.id, "name": f.name, "category": f.category, "kcal": f.kcal, "protein": f.protein, "carbs": f.carbs,
             "fat": f.fat, "serving_g": f.serving_g, "serving_label": f.serving_label, "custom": f.custom} for f in rows]


@router.post("/foods")
def add_custom_food(body: schemas.CustomFoodIn, db: Session = Depends(get_db)):
    if db.query(models.Food).filter(models.Food.name.ilike(body.name)).first():
        raise HTTPException(409, "A food with that name already exists")
    f = models.Food(custom=True, **body.model_dump())
    db.add(f)
    db.commit()
    return {"id": f.id}


@router.post("/food")
def log_food(body: schemas.FoodLogIn, db: Session = Depends(get_db)):
    day = body.day or date.today()
    if body.food_id is not None:
        food = db.get(models.Food, body.food_id)
        if food is None:
            raise HTTPException(404, "Unknown food")
        grams = body.grams or food.serving_g
        k = grams / 100
        row = models.FoodLog(day=day, meal=body.meal, name=food.name, grams=grams, kcal=food.kcal * k,
                             protein=food.protein * k, carbs=food.carbs * k, fat=food.fat * k)
    else:
        if not body.name:
            raise HTTPException(422, "Give a food_id or a name")
        p, c, f = body.protein or 0, body.carbs or 0, body.fat or 0
        kcal = body.kcal if body.kcal is not None else 4 * p + 4 * c + 9 * f
        row = models.FoodLog(day=day, meal=body.meal, name=body.name, grams=body.grams, kcal=kcal, protein=p, carbs=c, fat=f)
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.delete("/food/{entry_id}")
def delete_food(entry_id: int, db: Session = Depends(get_db)):
    db.query(models.FoodLog).filter_by(id=entry_id).delete()
    db.commit()
    return {"ok": True}


@router.post("/water")
def log_water(body: schemas.WaterIn, db: Session = Depends(get_db)):
    row = models.WaterLog(day=body.day or date.today(), ml=body.ml)
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.delete("/water/last")
def undo_water(day: date | None = None, db: Session = Depends(get_db)):
    row = db.query(models.WaterLog).filter_by(day=day or date.today()).order_by(models.WaterLog.id.desc()).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
