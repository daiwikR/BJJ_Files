import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import content, models, schemas, services, sleep
from ..database import get_db

router = APIRouter(prefix="/api", tags=["recovery"])


# ─── Readiness ───────────────────────────────────────────────────────────────

@router.get("/recovery/assess")
def assess(planned_minutes: float | None = None, planned_rpe: float | None = None,
           day_type: str | None = None, db: Session = Depends(get_db)):
    return services.assess(db, planned_minutes=planned_minutes, planned_rpe=planned_rpe, day_type=day_type)


@router.get("/recovery/checkin")
def get_checkin(db: Session = Depends(get_db)):
    return services.checkin_today(db, date.today())


@router.put("/recovery/checkin")
def put_checkin(body: schemas.CheckInIn, db: Session = Depends(get_db)):
    today = date.today()
    c = db.query(models.CheckIn).filter_by(day=today).first()
    if c is None:
        c = models.CheckIn(day=today)
        db.add(c)
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return services.checkin_today(db, today)


# ─── Sleep ───────────────────────────────────────────────────────────────────

@router.get("/sleep")
def get_sleep(db: Session = Depends(get_db)):
    today = date.today()
    rows = services.sleep_rows(db, 14)
    tap = db.query(models.SleepTap).order_by(models.SleepTap.id.desc()).first()
    p = db.query(models.Profile).first()
    return {
        "nights": [services.sleep_night_out(r) for r in rows],
        "summary": services.sleep_summary(db, today),
        "pending_tap": tap.lights_out.isoformat(timespec="minutes") if tap else None,
        "need_h": p.sleep_need_h if p else 8.0,
        "today": today.isoformat(),
    }


def _upsert_night(db: Session, body: schemas.SleepIn) -> models.SleepLog:
    window = (body.screen_on - body.screen_off).total_seconds() / 60
    if not sleep.MIN_WINDOW_MIN <= window <= sleep.MAX_WINDOW_MIN:
        raise HTTPException(422, "Wake time must be 1-16 hours after lights out")
    day = body.screen_on.date()
    row = db.query(models.SleepLog).filter_by(day=day).first()
    if row is None:
        row = models.SleepLog(day=day)
        db.add(row)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@router.put("/sleep")
def put_sleep(body: schemas.SleepIn, db: Session = Depends(get_db)):
    return services.sleep_night_out(_upsert_night(db, body))


@router.delete("/sleep/{day}")
def delete_sleep(day: date, db: Session = Depends(get_db)):
    db.query(models.SleepLog).filter_by(day=day).delete()
    db.commit()
    return {"ok": True}


@router.post("/sleep/lights-out")
def lights_out(body: schemas.TapIn, db: Session = Depends(get_db)):
    db.query(models.SleepTap).delete()
    at = (body.at or datetime.now()).replace(second=0, microsecond=0, tzinfo=None)
    db.add(models.SleepTap(lights_out=at))
    db.commit()
    return {"pending_tap": at.isoformat(timespec="minutes")}


@router.post("/sleep/wake")
def wake(body: schemas.TapIn, db: Session = Depends(get_db)):
    tap = db.query(models.SleepTap).order_by(models.SleepTap.id.desc()).first()
    if tap is None:
        raise HTTPException(400, "No 'lights out' tap to pair with")
    at = (body.at or datetime.now()).replace(second=0, microsecond=0, tzinfo=None)
    row = _upsert_night(db, schemas.SleepIn(screen_off=tap.lights_out, screen_on=at, source="tap"))
    db.query(models.SleepTap).delete()
    db.commit()
    return services.sleep_night_out(row)


@router.delete("/sleep/tap/pending")
def cancel_tap(db: Session = Depends(get_db)):
    db.query(models.SleepTap).delete()
    db.commit()
    return {"ok": True}


# ─── Injuries ────────────────────────────────────────────────────────────────

@router.get("/injuries")
def injury_library(db: Session = Depends(get_db)):
    rows = db.query(models.Injury).order_by(models.Injury.id).all()
    lib = content.injuries()
    return {"disclaimer": lib["disclaimer"], "mat_levels": lib["mat_levels"], "sources": lib["sources"],
            "injuries": [json.loads(r.data) for r in rows]}


@router.get("/my-injuries")
def my_injuries(db: Session = Depends(get_db)):
    rows = db.query(models.UserInjury).order_by(models.UserInjury.status, models.UserInjury.started_on.desc()).all()
    return [services.user_injury_out(db, u) for u in rows]


@router.post("/my-injuries")
def add_injury(body: schemas.UserInjuryIn, db: Session = Depends(get_db)):
    if services.injury_doc(db, body.injury_slug) is None:
        raise HTTPException(404, "Unknown injury")
    u = models.UserInjury(injury_slug=body.injury_slug, side=body.side, severity=body.severity,
                          started_on=body.started_on or date.today(), pain=body.pain, notes=body.notes)
    db.add(u)
    db.commit()
    return services.user_injury_out(db, u)


@router.patch("/my-injuries/{injury_id}")
def patch_injury(injury_id: int, body: schemas.UserInjuryPatch, db: Session = Depends(get_db)):
    u = db.get(models.UserInjury, injury_id)
    if u is None:
        raise HTTPException(404, "Not found")
    data = body.model_dump(exclude_unset=True)
    if "criteria_done" in data:
        u.criteria_done = json.dumps(data.pop("criteria_done") or [])
    if "phase_index" in data:
        doc = services.injury_doc(db, u.injury_slug) or {"phases": []}
        data["phase_index"] = max(0, min(data["phase_index"], max(0, len(doc["phases"]) - 1)))
    if data.get("status") == "resolved":
        u.resolved_on = date.today()
    elif data.get("status") == "active":
        u.resolved_on = None
    for k, v in data.items():
        setattr(u, k, v)
    db.commit()
    return services.user_injury_out(db, u)


@router.delete("/my-injuries/{injury_id}")
def delete_injury(injury_id: int, db: Session = Depends(get_db)):
    u = db.get(models.UserInjury, injury_id)
    if u:
        db.delete(u)
        db.commit()
    return {"ok": True}
