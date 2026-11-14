"""Sleep estimation from phone screen-off / screen-on times plus diary corrections.

Why this shape: phone-interaction studies show the last and first touch of the night
track sleep onset and wake time well (R^2 about 0.9 against wrist actigraphy), but
they over-estimate *duration*, because lying awake and night wakings without the phone
are invisible. A sleep diary fixes exactly that gap. So the screen gap is the anchor
and three diary numbers correct it: time to fall asleep, time awake in the night, and
how the sleep felt.
"""
from __future__ import annotations

from datetime import datetime
from statistics import pstdev

PICKUP_COST_MIN = 5          # assumed minutes lost per night-time phone pickup
MIN_WINDOW_MIN = 60
MAX_WINDOW_MIN = 16 * 60


def night_metrics(screen_off: datetime, screen_on: datetime, latency_min: int = 15,
                  awake_min: int = 0, night_pickups: int = 0) -> dict:
    window = (screen_on - screen_off).total_seconds() / 60
    lost = latency_min + max(awake_min, night_pickups * PICKUP_COST_MIN)
    asleep = max(0.0, window - lost)
    return {
        "window_min": round(window),
        "asleep_min": round(asleep),
        "hours": round(asleep / 60, 2),
        "efficiency": round(asleep / window * 100) if window > 0 else 0,
    }


def _clock_offset(dt: datetime) -> float:
    """Minutes after 18:00, so bedtimes either side of midnight compare sanely."""
    m = dt.hour * 60 + dt.minute - 18 * 60
    return m if m >= 0 else m + 24 * 60


def _lin(value: float, lo: float, hi: float) -> float:
    """0 at lo, 1 at hi, clamped."""
    if hi == lo:
        return 1.0
    return max(0.0, min(1.0, (value - lo) / (hi - lo)))


def summarize(nights: list[dict], need_h: float = 8.0) -> dict | None:
    """nights: newest first, each with screen_off, screen_on, latency_min, awake_min,
    night_pickups, quality, day. Returns the score for the newest night with 7-night context."""
    if not nights:
        return None
    rows = []
    for n in nights[:7]:
        m = night_metrics(n["screen_off"], n["screen_on"], n["latency_min"], n["awake_min"], n["night_pickups"])
        rows.append({**n, **m})
    last = rows[0]
    avg_h = sum(r["hours"] for r in rows) / len(rows)
    debt_h = sum(max(0.0, need_h - r["hours"]) for r in rows)
    bed_sd = pstdev([_clock_offset(r["screen_off"]) for r in rows]) if len(rows) >= 3 else None

    parts = {
        "duration": round(50 * _lin(last["hours"], 4.0, need_h), 1),
        "quality": round(20 * (last["quality"] - 1) / 4, 1),
        "efficiency": round(10 * _lin(last["efficiency"], 65, 85), 1),
        "regularity": round(10 * (1 - _lin(bed_sd, 30, 90)), 1) if bed_sd is not None else 7.0,
        "debt": round(10 * _lin(avg_h, need_h - 2, need_h - 0.25), 1),
    }
    score = round(sum(parts.values()))
    return {
        "day": last["day"],
        "hours": last["hours"],
        "window_min": last["window_min"],
        "efficiency": last["efficiency"],
        "quality": last["quality"],
        "avg_hours_7": round(avg_h, 2),
        "debt_hours_7": round(debt_h, 1),
        "bedtime_sd_min": round(bed_sd) if bed_sd is not None else None,
        "nights_logged": len(rows),
        "need_h": need_h,
        "score": score,
        "parts": parts,
    }
