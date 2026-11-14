"""Glue between the database and the pure logic modules."""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session as DB

from . import content, models, nutrition, recovery, sleep
from .progression import get_profile, session_day


# ─── Sleep ───────────────────────────────────────────────────────────────────

def sleep_rows(db: DB, limit: int = 14) -> list[models.SleepLog]:
    return db.query(models.SleepLog).order_by(models.SleepLog.day.desc()).limit(limit).all()


def _night_dict(r: models.SleepLog) -> dict:
    return {"day": r.day, "screen_off": r.screen_off, "screen_on": r.screen_on, "latency_min": r.latency_min,
            "awake_min": r.awake_min, "night_pickups": r.night_pickups, "quality": r.quality}


def sleep_summary(db: DB, today: date) -> dict | None:
    """Score for last night, or None if last night has not been logged."""
    p = get_profile(db)
    rows = [r for r in sleep_rows(db, 7) if r.day <= today]
    if not rows or rows[0].day != today:
        return None
    s = sleep.summarize([_night_dict(r) for r in rows], need_h=p.sleep_need_h if p else 8.0)
    s["day"] = s["day"].isoformat()
    return s


def sleep_night_out(r: models.SleepLog) -> dict:
    m = sleep.night_metrics(r.screen_off, r.screen_on, r.latency_min, r.awake_min, r.night_pickups)
    return {"day": r.day.isoformat(), "source": r.source, "screen_off": r.screen_off.isoformat(timespec="minutes"),
            "screen_on": r.screen_on.isoformat(timespec="minutes"), "latency_min": r.latency_min, "awake_min": r.awake_min,
            "night_pickups": r.night_pickups, "quality": r.quality, "notes": r.notes, **m}


# ─── Fuel ────────────────────────────────────────────────────────────────────

def _sessions_on(db: DB, day: date) -> list[models.Session]:
    start = datetime.combine(day, datetime.min.time())
    return db.query(models.Session).filter(models.Session.date >= start, models.Session.date < start + timedelta(days=1)).all()


def fuel_day(db: DB, day: date, day_type: str | None = None, hour: float | None = None) -> dict:
    p = get_profile(db)
    today = date.today()
    kg = (p.weight_kg if p and p.weight_kg else None)
    sessions = _sessions_on(db, day)
    load = sum(recovery.session_load(s.duration_min, s.intensity, s.session_type) for s in sessions)
    hours = sum(s.duration_min for s in sessions) / 60
    auto = nutrition.day_type_from_load(load, len(sessions))
    class_h = (p.class_minutes if p else 90) / 60
    planned_default = "moderate" if (p.days_per_week if p else 3) >= 4 else "rest"

    if sessions:
        order = list(nutrition.DAY_TYPES)
        tier = day_type if day_type in order and order.index(day_type) > order.index(auto) else auto
        train_h = hours if tier == auto else max(hours, class_h * (2 if tier == "hard" else 1))
        kcal = sum(nutrition.met_for_rpe(s.intensity or 6) * (kg or nutrition.DEFAULT_WEIGHT_KG) * s.duration_min / 60 for s in sessions)
        if train_h > hours:
            kcal += nutrition.DAY_TYPES[tier]["met"] * (kg or nutrition.DEFAULT_WEIGHT_KG) * (train_h - hours)
        source = "logged"
    else:
        tier = day_type or (planned_default if day == today else "rest")
        train_h = {"rest": 0.0, "light": class_h * 0.75, "moderate": class_h, "hard": class_h * max(1.5, p.classes_per_day if p else 1)}[tier]
        kcal = None
        source = "chosen" if day_type else "assumed"

    t = nutrition.targets(weight_kg=kg, height_cm=p.height_cm if p else None, age=p.age if p else None,
                          sex=p.sex if p else None, goal=p.goal if p else "maintain", day_type=tier,
                          training_hours=train_h, training_kcal=kcal)
    t["day_type_source"] = source
    t["training_hours"] = round(train_h, 2)

    foods = db.query(models.FoodLog).filter_by(day=day).order_by(models.FoodLog.created_at).all()
    waters = db.query(models.WaterLog).filter_by(day=day).order_by(models.WaterLog.created_at).all()
    totals = {
        "kcal": round(sum(f.kcal for f in foods)),
        "protein": round(sum(f.protein for f in foods), 1),
        "carbs": round(sum(f.carbs for f in foods), 1),
        "fat": round(sum(f.fat for f in foods), 1),
        "water_ml": sum(w.ml for w in waters),
        "entries": len(foods),
    }
    logged = totals["entries"] >= 3 or totals["kcal"] >= 0.3 * t["kcal"]
    if hour is None:
        now = datetime.now()
        hour = now.hour + now.minute / 60 if day == today else 24.0
    score = nutrition.fuel_score(totals, t)
    return {
        "day": day.isoformat(), "targets": t, "totals": totals, "score": score, "logged": logged, "hour": round(hour, 2),
        "trained": bool(sessions),
        "entries": [{"id": f.id, "meal": f.meal, "name": f.name, "grams": f.grams, "kcal": round(f.kcal),
                     "protein": round(f.protein, 1), "carbs": round(f.carbs, 1), "fat": round(f.fat, 1)} for f in foods],
        "water": [{"id": w.id, "ml": w.ml} for w in waters],
    }


def low_energy_days(db: DB, today: date) -> int:
    """How many of the last 3 *logged* days (before today) were under 75% of target energy."""
    low = seen = 0
    for i in range(1, 8):
        d = fuel_day(db, today - timedelta(days=i))
        if not d["logged"]:
            continue
        seen += 1
        if d["score"]["energy_ratio"] < 0.75:
            low += 1
        if seen == 3:
            break
    return low


def fuel_context(db: DB, today: date, day_type: str | None = None) -> dict:
    y = fuel_day(db, today - timedelta(days=1))
    t = fuel_day(db, today, day_type)
    frac = nutrition.expected_fraction(t["hour"])
    behind = t["hour"] >= 14 and t["totals"]["water_ml"] < 0.35 * t["targets"]["water_ml"] and (t["totals"]["water_ml"] > 0 or t["totals"]["entries"] > 0)
    return {
        "yesterday_score": y["score"]["score"] if y["logged"] else None,
        "low_days": low_energy_days(db, today),
        "dehydrated_today": bool(behind),
        "today": t,
        "expected_fraction": frac,
    }


# ─── Injuries ────────────────────────────────────────────────────────────────

def injury_doc(db: DB, slug: str) -> dict | None:
    row = db.query(models.Injury).filter_by(slug=slug).first()
    return json.loads(row.data) if row else None


def user_injury_out(db: DB, u: models.UserInjury, today: date | None = None) -> dict:
    today = today or date.today()
    doc = injury_doc(db, u.injury_slug) or {"name": u.injury_slug, "phases": [], "weeks": {}, "region": "other"}
    phases = doc.get("phases", [])
    idx = max(0, min(u.phase_index, len(phases) - 1)) if phases else 0
    phase = phases[idx] if phases else None
    lo, hi = doc.get("weeks", {}).get(u.severity, [None, None])
    end = (u.resolved_on or today)
    return {
        "id": u.id, "slug": u.injury_slug, "name": doc["name"], "region": doc.get("region"), "side": u.side,
        "severity": u.severity, "started_on": u.started_on.isoformat(), "days": (end - u.started_on).days,
        "phase_index": idx, "phase_count": len(phases), "phase": phase, "pain": u.pain,
        "criteria_done": json.loads(u.criteria_done or "[]"), "status": u.status,
        "resolved_on": u.resolved_on.isoformat() if u.resolved_on else None, "notes": u.notes,
        "expected_weeks": [lo, hi],
        "mat_level": phase["mat"] if phase else "full",
        "mat_text": content.injuries()["mat_levels"].get(phase["mat"], "") if phase else "",
    }


def active_injuries(db: DB) -> list[dict]:
    rows = db.query(models.UserInjury).filter_by(status="active").all()
    return [user_injury_out(db, u) for u in rows]


# ─── Recovery ────────────────────────────────────────────────────────────────

def checkin_today(db: DB, today: date) -> dict | None:
    c = db.query(models.CheckIn).filter_by(day=today).first()
    if not c:
        return None
    return {"soreness": c.soreness, "fatigue": c.fatigue, "stress": c.stress, "mood": c.mood, "illness": c.illness, "notes": c.notes}


def assess(db: DB, today: date | None = None, planned_minutes: float | None = None,
           planned_rpe: float | None = None, day_type: str | None = None) -> dict:
    today = today or date.today()
    p = get_profile(db)
    since = datetime.combine(today - timedelta(days=60), datetime.min.time())
    rows = db.query(models.Session).filter(models.Session.date >= since).all()
    sessions = [{"day": session_day(s), "minutes": s.duration_min, "rpe": s.intensity, "type": s.session_type} for s in rows]
    first = db.query(models.Session).order_by(models.Session.date.asc()).first()
    if first and session_day(first) < today - timedelta(days=60):
        # keep the true history length without loading every old session
        sessions.append({"day": session_day(first), "minutes": 0, "rpe": 1, "type": "class"})

    fuel = fuel_context(db, today, day_type)
    injuries = [{"id": i["id"], "name": i["name"], "pain": i["pain"], "mat_level": i["mat_level"],
                 "mat_text": i["mat_text"], "phase": i["phase"]["name"] if i["phase"] else None} for i in active_injuries(db)]
    plan_min = (p.classes_per_day * p.days_per_week * p.class_minutes) if p else 270
    result = recovery.assess(
        sessions=sessions, today=today, checkin=checkin_today(db, today), sleep=sleep_summary(db, today),
        fuel={k: fuel[k] for k in ("yesterday_score", "low_days", "dehydrated_today")}, injuries=injuries,
        age=p.age if p else None, planned_weekly_min=plan_min,
        planned_minutes=planned_minutes or (p.class_minutes if p else None), planned_rpe=planned_rpe,
    )
    result["day"] = today.isoformat()
    return result
