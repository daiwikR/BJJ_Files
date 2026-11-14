from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import consistency, models, progression, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["profile"])

_PLAIN_FIELDS = ["name", "classes_per_day", "days_per_week", "class_minutes", "age", "sex",
                 "weight_kg", "height_cm", "goal", "sleep_need_h"]


@router.get("/profile")
def get_profile(db: Session = Depends(get_db)):
    p = progression.get_profile(db)
    return schemas.ProfileOut.model_validate(p) if p else None


@router.put("/profile", response_model=schemas.ProfileOut)
def save_profile(body: schemas.ProfileIn, db: Session = Depends(get_db)):
    p = progression.get_profile(db)
    created = p is None
    if created:
        p = models.Profile(id=1)
        db.add(p)
    for f in _PLAIN_FIELDS:
        setattr(p, f, getattr(body, f))
    if created or body.sync_rank:
        if body.stripes and body.belt == "black":
            body.stripes = 0
        progression.set_rank(db, p, body.belt, body.stripes, body.banked_hours,
                             body.belt_started_on, body.level_started_on)
    elif body.belt_started_on:
        p.belt_started_on = body.belt_started_on
    db.commit()
    progression.evaluate(db)
    db.refresh(p)
    return p


@router.get("/roadmap")
def roadmap(classes_per_day: int | None = None, days_per_week: int | None = None,
            class_minutes: int | None = None, db: Session = Depends(get_db)):
    progression.evaluate(db)
    return progression.build_roadmap(db, cpd=classes_per_day, dpw=days_per_week, minutes=class_minutes)


@router.post("/roadmap/check")
def toggle_competency(body: schemas.CompetencyToggle, db: Session = Depends(get_db)):
    row = db.query(models.CompetencyCheck).filter_by(stage_key=body.stage_key, item_id=body.item_id).first()
    if body.checked and row is None:
        db.add(models.CompetencyCheck(stage_key=body.stage_key, item_id=body.item_id))
    elif not body.checked and row is not None:
        db.delete(row)
    db.commit()
    new = progression.evaluate(db)
    return {"ok": True, "new_awards": len(new)}


@router.post("/roadmap/promote")
def promote(db: Session = Depends(get_db)):
    p = progression.get_profile(db)
    if p is None:
        raise HTTPException(400, "Set up your profile first")
    if p.belt == "black":
        raise HTTPException(400, "Already a black belt")
    progression.promote(db)
    return {"ok": True}


def _award_out(a: models.Award) -> dict:
    return {"id": a.id, "key": a.key, "kind": a.kind, "title": a.title, "detail": a.detail, "belt": a.belt,
            "stripes": a.stripes, "earned_at": a.earned_at.isoformat() if a.earned_at else None, "seen": a.seen}


@router.get("/awards")
def awards(db: Session = Depends(get_db)):
    progression.evaluate(db)
    consistency.evaluate_awards(db)
    rows = db.query(models.Award).order_by(models.Award.earned_at.desc(), models.Award.id.desc()).all()
    return {
        "awards": [_award_out(a) for a in rows],
        "unseen": [_award_out(a) for a in rows if not a.seen],
        "milestones": {"sessions": consistency.SESSION_MILESTONES, "hours": consistency.HOUR_MILESTONES,
                       "streak": consistency.STREAK_MILESTONES},
    }


@router.post("/awards/ack")
def ack_awards(db: Session = Depends(get_db)):
    db.query(models.Award).filter_by(seen=False).update({"seen": True})
    db.commit()
    return {"ok": True}


@router.get("/consistency")
def get_consistency(db: Session = Depends(get_db)):
    return consistency.build(db)


@router.get("/status")
def status(db: Session = Depends(get_db)):
    """Current stage, gate by gate. Used by the dashboard."""
    p = progression.get_profile(db)
    if p is None:
        return None
    progression.evaluate(db)
    s = progression.stage_status(db, p)
    if s is None:
        return {"belt": p.belt, "stripes": p.stripes, "stage": None}
    todo = [c for c in s["stage"]["competencies"] if c["id"] not in s["checked"]]
    return {"belt": p.belt, "stripes": p.stripes, "stage": s["stage"], "gates": s["gates"], "pct": s["pct"],
            "all_met": s["all_met"], "is_belt_stage": s["is_belt_stage"], "checked": s["checked"], "todo": todo,
            "belt_info": {k: s["belt"][k] for k in ("name", "theme", "creed", "color", "split", "weekly_sessions")},
            "total_hours": round(progression.total_hours(db), 1)}
