"""Belt / stripe progression: gates, awards and projected dates.

A stage (one stripe) is complete when three gates are all met:
  1. mat hours in the stage  >= the stage's hour budget
  2. weeks in the stage      >= the belt's calendar floor per stage
  3. competencies ticked     >= 80% of the stage checklist
The fifth stage of a belt additionally needs the IBJJF minimum time at that belt, and
ends in a BELT-READY award. The belt itself changes only when the athlete confirms
their coach promoted them.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session as DB

from . import content, models

SKILL_GATE = 0.8
TRAINING_WEEKS_PER_YEAR = 48
WEEKS_PER_MONTH = 52 / 12


def get_profile(db: DB) -> models.Profile | None:
    return db.query(models.Profile).first()


def total_hours(db: DB) -> float:
    return (db.query(func.sum(models.Session.duration_min)).scalar() or 0) / 60


def session_day(s: models.Session) -> date:
    return s.date.date() if isinstance(s.date, datetime) else s.date


def checks_for(db: DB, stage_key: str) -> set[str]:
    rows = db.query(models.CompetencyCheck.item_id).filter_by(stage_key=stage_key).all()
    return {r[0] for r in rows}


def _add_months(d: date, months: float) -> date:
    return d + timedelta(days=round(months * 30.4375))


def stage_status(db: DB, p: models.Profile, today: date | None = None) -> dict | None:
    """Gate-by-gate status of the stage the athlete is currently in."""
    today = today or date.today()
    st = content.stage(p.belt, p.stripes)
    if st is None:
        return None
    belt = content.belt(p.belt)
    hours = max(0.0, total_hours(db) - (p.hours_consumed or 0.0))
    started = p.level_started_on or today
    weeks = max(0.0, (today - started).days / 7)
    done = checks_for(db, st["key"]) & {c["id"] for c in st["competencies"]}
    need_skills = math.ceil(len(st["competencies"]) * SKILL_GATE)

    gates = {
        "hours": {"have": round(hours, 1), "need": st["hours"], "met": hours >= st["hours"]},
        "weeks": {"have": round(weeks, 1), "need": st["floor_weeks"], "met": weeks >= st["floor_weeks"]},
        "skills": {"have": len(done), "need": need_skills, "total": len(st["competencies"]), "met": len(done) >= need_skills},
    }
    is_belt_stage = st["index"] == 4
    if is_belt_stage and belt["ibjjf_min_months"] > 0:
        belt_start = p.belt_started_on or started
        months = (today - belt_start).days / 30.4375
        gates["time_at_belt"] = {"have": round(months, 1), "need": belt["ibjjf_min_months"],
                                 "met": months >= belt["ibjjf_min_months"]}
    return {
        "stage": st,
        "belt": belt,
        "hours": hours,
        "weeks": weeks,
        "checked": sorted(done),
        "gates": gates,
        "all_met": all(g["met"] for g in gates.values()),
        "is_belt_stage": is_belt_stage,
        "pct": round(min(1.0, hours / st["hours"]) * 100, 1) if st["hours"] else 100,
    }


def _award(db: DB, key: str, kind: str, title: str, detail: str, belt: str | None = None, stripes: int | None = None):
    if db.query(models.Award).filter_by(key=key).first():
        return None
    a = models.Award(key=key, kind=kind, title=title, detail=detail, belt=belt, stripes=stripes, earned_at=datetime.now())
    db.add(a)
    return a


def evaluate(db: DB, today: date | None = None) -> list[models.Award]:
    """Award every stripe whose gates are met. Safe to call after any change."""
    today = today or date.today()
    p = get_profile(db)
    new = []
    if p is None:
        return new
    for _ in range(8):
        s = stage_status(db, p, today)
        if s is None or not s["all_met"]:
            break
        st, belt = s["stage"], s["belt"]
        if s["is_belt_stage"]:
            nxt = content.BELT_ORDER[content.BELT_ORDER.index(p.belt) + 1]
            a = _award(db, f"belt_ready:{nxt}", "belt_ready", f"{content.belt(nxt)['name']} ready",
                       f"Every gate for '{st['title']}' is met. The hours are in and the skills are there. "
                       f"The belt is your coach's call: keep showing up.", belt=p.belt, stripes=4)
            if a:
                new.append(a)
            break
        p.hours_consumed = (p.hours_consumed or 0.0) + st["hours"]
        p.stripes += 1
        p.level_started_on = today
        a = _award(db, f"stripe:{p.belt}-{p.stripes}", "stripe",
                   f"{belt['name']}, stripe {p.stripes}",
                   f"Stage complete: {st['title']}. {st['focus']}", belt=p.belt, stripes=p.stripes)
        if a:
            new.append(a)
        db.flush()
    db.commit()
    return new


def promote(db: DB, today: date | None = None) -> models.Award | None:
    """The athlete confirms their coach tied on the next belt."""
    today = today or date.today()
    p = get_profile(db)
    if p is None or p.belt == "black":
        return None
    s = stage_status(db, p, today)
    nxt = content.BELT_ORDER[content.BELT_ORDER.index(p.belt) + 1]
    logged = total_hours(db)
    if s and s["is_belt_stage"] and s["gates"]["hours"]["met"]:
        p.hours_consumed = (p.hours_consumed or 0.0) + s["stage"]["hours"]   # surplus carries over
    else:
        p.hours_consumed = logged
    p.belt, p.stripes = nxt, 0
    p.belt_started_on = today
    p.level_started_on = today
    a = _award(db, f"belt:{nxt}", "belt", content.belt(nxt)["name"],
               content.belt(nxt).get("creed", ""), belt=nxt, stripes=0)
    db.commit()
    return a


def set_rank(db: DB, p: models.Profile, belt: str, stripes: int, banked_hours: float = 0.0,
             belt_started_on: date | None = None, level_started_on: date | None = None):
    """Manual rank sync (onboarding, or your coach gave you a stripe)."""
    p.belt, p.stripes = belt, max(0, min(4, stripes))
    p.hours_consumed = total_hours(db) - max(0.0, banked_hours)
    p.level_started_on = level_started_on or date.today()
    p.belt_started_on = belt_started_on or p.belt_started_on or p.level_started_on


def weekly_plan_hours(cpd: int, dpw: int, minutes: int) -> float:
    return cpd * dpw * minutes / 60


def actual_weekly_hours(db: DB, today: date, weeks: int = 4) -> float:
    since = datetime.combine(today - timedelta(days=weeks * 7 - 1), datetime.min.time())
    mins = db.query(func.sum(models.Session.duration_min)).filter(models.Session.date >= since).scalar() or 0
    return mins / 60 / weeks


def build_roadmap(db: DB, today: date | None = None, cpd: int | None = None, dpw: int | None = None,
                  minutes: int | None = None) -> dict:
    today = today or date.today()
    p = get_profile(db)
    rm = content.roadmap()
    if p is None:
        return {"model": rm["model"], "belts": rm["belts"], "black": rm["black"], "profile": None}

    cpd = cpd or p.classes_per_day
    dpw = dpw or p.days_per_week
    minutes = minutes or p.class_minutes
    plan_h = weekly_plan_hours(cpd, dpw, minutes)
    eff_h = plan_h * TRAINING_WEEKS_PER_YEAR / 52          # illness, travel, life
    actual_h = actual_weekly_hours(db, today)
    status = stage_status(db, p, today)

    cur_belt_i = content.BELT_ORDER.index(p.belt)
    cursor = today
    carry = 0.0
    belt_start = p.belt_started_on or p.level_started_on or today
    belts_out = []

    for belt in rm["belts"]:
        bi = content.BELT_ORDER.index(belt["id"])
        stages_out = []
        if bi > cur_belt_i:
            belt_start = cursor
        for i, st in enumerate(belt["stages"]):
            entry = {**st, "index": i, "floor_weeks": belt["stage_floor_weeks"], "checked": []}
            if bi < cur_belt_i or (bi == cur_belt_i and i < p.stripes):
                entry["state"] = "done"
            else:
                is_current = bi == cur_belt_i and i == p.stripes
                if is_current and status:
                    have = status["hours"]
                    weeks_in = status["weeks"]
                    entry["state"] = "current"
                    entry["checked"] = status["checked"]
                    entry["gates"] = status["gates"]
                    entry["pct"] = status["pct"]
                    entry["ready"] = status["all_met"]
                else:
                    have, weeks_in = carry, 0.0
                    entry["state"] = "locked"
                hours_left = max(0.0, st["hours"] - have)
                w_hours = hours_left / eff_h if eff_h > 0 else None
                w_floor = max(0.0, belt["stage_floor_weeks"] - weeks_in)
                if w_hours is None:
                    entry["eta"] = None
                    entry["limited_by"] = "no_plan"
                else:
                    weeks = max(w_hours, w_floor)
                    limited = "hours" if w_hours >= w_floor else "calendar"
                    eta = cursor + timedelta(days=round(weeks * 7))
                    if i == 4 and belt["ibjjf_min_months"] > 0:
                        earliest = _add_months(belt_start, belt["ibjjf_min_months"])
                        if earliest > eta:
                            weeks = (earliest - cursor).days / 7
                            eta, limited = earliest, "ibjjf"
                    carry = max(0.0, have + weeks * eff_h - st["hours"])
                    cursor = eta
                    entry["eta"] = eta.isoformat()
                    entry["weeks"] = round(weeks, 1)
                    entry["limited_by"] = limited
                    if is_current and actual_h > 0:
                        w_act = max(hours_left / actual_h, w_floor)
                        entry["eta_actual"] = (today + timedelta(days=round(w_act * 7))).isoformat()
            stages_out.append(entry)
        state = "done" if bi < cur_belt_i else "current" if bi == cur_belt_i else "locked"
        belts_out.append({**{k: v for k, v in belt.items() if k != "stages"}, "state": state, "stages": stages_out,
                          "eta": stages_out[-1].get("eta")})

    sessions_pw = cpd * dpw
    cur = content.belt(p.belt)
    lo, hi = cur.get("weekly_sessions", [4, 6])
    if sessions_pw > hi:
        volume = {"level": "high", "text": f"{sessions_pw} sessions a week is above the {lo}-{hi} most {cur['name'].lower()}s can recover from. "
                  f"The dates assume you can sustain it. Make extra sessions technical or drilling, and let the Recovery tab pull you back when it says so."}
    elif sessions_pw < lo:
        volume = {"level": "low", "text": f"{sessions_pw} session{'s' if sessions_pw != 1 else ''} a week is under the usual {lo}-{hi} for this belt. "
                  f"You will still progress; it just takes longer. Consistency beats bursts."}
    else:
        volume = {"level": "ok", "text": f"{sessions_pw} sessions a week sits inside the {lo}-{hi} range coaches recommend at this belt."}
    if cpd >= 2:
        volume["text"] += " With two or more classes in a day, make one of them low intensity."

    return {
        "model": rm["model"],
        "belts": belts_out,
        "black": {**rm["black"], "state": "current" if p.belt == "black" else "locked", "eta": cursor.isoformat() if p.belt != "black" else None},
        "plan": {"classes_per_day": cpd, "days_per_week": dpw, "class_minutes": minutes,
                 "weekly_hours": round(plan_h, 1), "effective_weekly_hours": round(eff_h, 1),
                 "actual_weekly_hours": round(actual_h, 1), "sessions_per_week": sessions_pw, "volume": volume},
        "current": {"belt": p.belt, "stripes": p.stripes, "stage_key": status["stage"]["key"] if status else None,
                    "ready": bool(status and status["all_met"]), "is_belt_stage": bool(status and status["is_belt_stage"])},
        "split": cur.get("split"),
    }
