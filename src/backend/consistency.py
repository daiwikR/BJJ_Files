"""Weekly consistency: targets, streaks, calendar heatmap and consistency awards."""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session as DB

from . import models
from .progression import _award, get_profile, session_day
from .recovery import session_load

SESSION_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000]
HOUR_MILESTONES = [10, 50, 100, 250, 500, 1000, 2000]
STREAK_MILESTONES = [2, 4, 8, 12, 26, 52]


def week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def min_days_for(days_per_week: int) -> int:
    """A week counts when you train on at least ~75% of your planned days."""
    return max(1, math.floor(days_per_week * 0.75 + 0.5))


def build(db: DB, today: date | None = None, weeks_back: int = 26) -> dict:
    today = today or date.today()
    p = get_profile(db)
    dpw = p.days_per_week if p else 3
    cpd = p.classes_per_day if p else 1
    need_days = min_days_for(dpw)

    sessions = db.query(models.Session).all()
    by_day: dict[date, dict] = {}
    for s in sessions:
        d = session_day(s)
        e = by_day.setdefault(d, {"minutes": 0, "sessions": 0, "load": 0.0, "max_rpe": 0})
        e["minutes"] += s.duration_min
        e["sessions"] += 1
        e["load"] += session_load(s.duration_min, s.intensity, s.session_type)
        e["max_rpe"] = max(e["max_rpe"], s.intensity or 0)

    injured_ranges = [(i.started_on, i.resolved_on or today) for i in db.query(models.UserInjury).all()]

    def injured_in(ws: date) -> bool:
        we = ws + timedelta(days=6)
        return any(a <= we and b >= ws for a, b in injured_ranges)

    this_week = week_start(today)
    first = min(by_day) if by_day else today
    first_week = min(week_start(first), this_week - timedelta(weeks=weeks_back - 1))

    weeks = []
    ws = first_week
    while ws <= this_week:
        days = [ws + timedelta(days=i) for i in range(7)]
        trained = [d for d in days if d in by_day]
        mins = sum(by_day[d]["minutes"] for d in trained)
        hit = len(trained) >= need_days
        weeks.append({"start": ws.isoformat(), "days": len(trained), "sessions": sum(by_day[d]["sessions"] for d in trained),
                      "minutes": mins, "hours": round(mins / 60, 1), "load": round(sum(by_day[d]["load"] for d in trained)),
                      "hit": hit, "frozen": (not hit) and injured_in(ws), "current": ws == this_week})
        ws += timedelta(weeks=1)

    # Streak: consecutive hit weeks. Injury weeks freeze it. The week in progress never breaks it.
    best = run = 0
    for w in weeks:
        if w["hit"]:
            run += 1
            best = max(best, run)
        elif w["frozen"] or w["current"]:
            continue
        else:
            run = 0
    current_streak = run

    start_grid = this_week - timedelta(weeks=weeks_back - 1)
    calendar = []
    d = start_grid
    while d <= this_week + timedelta(days=6):
        e = by_day.get(d)
        calendar.append({"day": d.isoformat(), "minutes": e["minutes"] if e else 0, "sessions": e["sessions"] if e else 0,
                         "max_rpe": e["max_rpe"] if e else 0, "future": d > today})
        d += timedelta(days=1)

    cur = weeks[-1]
    total_minutes = sum(e["minutes"] for e in by_day.values())
    return {
        "target": {"days": dpw, "sessions": dpw * cpd, "min_days": need_days},
        "this_week": {**cur, "days_left": 6 - today.weekday()},
        "streak": current_streak,
        "best_streak": best,
        "weeks": weeks[-weeks_back:],
        "calendar": calendar,
        "totals": {"sessions": len(sessions), "hours": round(total_minutes / 60, 1), "days": len(by_day)},
        "rule": f"A week counts when you train on at least {need_days} of your {dpw} planned day{'s' if dpw != 1 else ''}. "
                f"Weeks with an active injury are frozen: they neither add to nor break the streak.",
    }


def evaluate_awards(db: DB, today: date | None = None) -> list[models.Award]:
    c = build(db, today)
    new = []
    for n in SESSION_MILESTONES:
        if c["totals"]["sessions"] >= n:
            title = "First session logged" if n == 1 else f"{n} sessions"
            a = _award(db, f"sessions:{n}", "consistency", title, "Showing up is the whole game.")
            new += [a] if a else []
    for n in HOUR_MILESTONES:
        if c["totals"]["hours"] >= n:
            a = _award(db, f"hours:{n}", "consistency", f"{n} mat hours", "Time on the mat, banked.")
            new += [a] if a else []
    for n in STREAK_MILESTONES:
        if c["best_streak"] >= n:
            a = _award(db, f"streak:{n}", "consistency", f"{n}-week streak", f"{n} weeks in a row on target.")
            new += [a] if a else []
    db.commit()
    return new
