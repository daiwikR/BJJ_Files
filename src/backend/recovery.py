"""Readiness calculator.

Pure functions only: everything here takes plain data and returns plain data, so the
logic can be read, tested and reasoned about without a database.

Model
-----
Start at 100 and subtract penalties from five independent buckets, each with a cap:

    LOAD     (max 40)  session-RPE training load: acute:chronic ratio, monotony,
                       consecutive days, density of hard sessions
    SLEEP    (max 25)  last night's sleep score (screen-time anchored diary)
    BODY     (max 25)  today's check-in: soreness, fatigue, stress, mood
    FUEL     (max 15)  yesterday's fuel score, today's hydration, under-eating streak
    INJURY   (max 30)  active injuries: current pain and rehab phase

The score maps to one of five zones. Hard overrides then cap the zone regardless of
the score (systemic illness, pain >= 7/10, under 5 h sleep, rehab phase limits).

References
----------
* Foster et al. 2001, session-RPE: load = RPE (1-10) x minutes.
* Foster 1998, monotony = mean daily load / SD of daily load over a week; strain = load x monotony.
* Gabbett 2016 (BJSM), acute:chronic workload ratio: 0.8-1.3 "sweet spot", above 1.5 "danger zone".
  ACWR is a guide, not a predictor; it has well-known statistical critics, so it is one
  input among several here and is ignored until there are 3 weeks of history.
* Hooper & Mackinnon 1995, daily self-rating of sleep, stress, fatigue and soreness.
* Milewski et al. 2014, athletes sleeping under 8 h had about 1.7x the injury rate.
"""
from __future__ import annotations

from datetime import date, timedelta
from statistics import mean, pstdev

ZONES = [
    # key, min score, label, headline, RPE cap, volume factor
    ("go",      80, "GO",              "Train as planned.",                                   10, 1.0),
    ("smart",   65, "TRAIN SMART",     "Train, but keep the hard rounds controlled.",          7, 0.9),
    ("tone",    45, "TONE IT DOWN",    "Technical work only today. No hard sparring.",         5, 0.6),
    ("recover", 25, "ACTIVE RECOVERY", "Skip the mat. Move, mobilise, do your rehab.",         3, 0.3),
    ("rest",     0, "REST",            "Full rest day. This is training too.",                 0, 0.0),
]
ZONE_ORDER = [z[0] for z in ZONES]

MAT_LEVEL_CAP = {  # most restrictive rehab phase -> best zone allowed
    "off": "recover", "solo": "recover", "drill": "tone", "positional": "smart", "light": "smart", "full": "go",
}
MAT_LEVEL_PENALTY = {"off": 15, "solo": 12, "drill": 8, "positional": 5, "light": 2, "full": 0}

DEFAULT_RPE = {"drilling": 4, "class": 6, "open_mat": 6, "sparring": 7, "competition": 9, "private": 5}


def session_load(minutes: float, rpe: float | None, session_type: str = "class") -> float:
    r = rpe if rpe else DEFAULT_RPE.get(session_type, 6)
    return float(minutes) * float(r)


def _zone(key: str) -> dict:
    for k, lo, label, headline, rpe_cap, vol in ZONES:
        if k == key:
            return {"key": k, "label": label, "headline": headline, "rpe_cap": rpe_cap, "volume_factor": vol, "min_score": lo}
    raise KeyError(key)


def zone_for_score(score: float) -> str:
    for k, lo, *_ in ZONES:
        if score >= lo:
            return k
    return "rest"


def worse(a: str, b: str) -> str:
    return a if ZONE_ORDER.index(a) >= ZONE_ORDER.index(b) else b


def load_metrics(sessions: list[dict], today: date) -> dict:
    """sessions: [{day: date, minutes, rpe, type}]. Returns daily loads and derived metrics."""
    daily: dict[date, float] = {}
    hard_days: set[date] = set()
    first_day = None
    for s in sessions:
        d = s["day"]
        if d > today:
            continue
        first_day = d if first_day is None or d < first_day else first_day
        daily[d] = daily.get(d, 0.0) + session_load(s["minutes"], s.get("rpe"), s.get("type", "class"))
        if (s.get("rpe") or DEFAULT_RPE.get(s.get("type", "class"), 6)) >= 8:
            hard_days.add(d)

    days28 = [today - timedelta(days=i) for i in range(27, -1, -1)]
    series = [daily.get(d, 0.0) for d in days28]
    # Before today's session is logged, measure up to last night. Otherwise every
    # training-day morning would look like a drop in load.
    end = today if daily.get(today, 0) > 0 else today - timedelta(days=1)
    window = [daily.get(end - timedelta(days=i), 0.0) for i in range(27, -1, -1)]
    last7 = window[-7:]
    acute = sum(last7)
    chronic = sum(window) / 4
    history_days = (today - first_day).days + 1 if first_day else 0

    acwr = None
    if history_days >= 21 and chronic > 0:
        acwr = acute / chronic

    training_days_7 = sum(1 for x in last7 if x > 0)
    monotony = None
    if training_days_7 >= 3:
        sd = pstdev(last7)
        monotony = mean(last7) / sd if sd > 0 else 5.0
        monotony = min(monotony, 5.0)

    # Consecutive training days ending today (or yesterday if nothing logged yet today)
    consecutive = 0
    cursor = today if daily.get(today, 0) > 0 else today - timedelta(days=1)
    while daily.get(cursor, 0) > 0:
        consecutive += 1
        cursor -= timedelta(days=1)

    hard_3d = sum(1 for i in range(0, 3) if (today - timedelta(days=i)) in hard_days)
    prev7 = sum(window[-14:-7])
    return {
        "series": [{"day": d.isoformat(), "load": round(v)} for d, v in zip(days28, series)],
        "acute": round(acute),
        "chronic": round(chronic),
        "acwr": round(acwr, 2) if acwr is not None else None,
        "monotony": round(monotony, 2) if monotony is not None else None,
        "strain": round(acute * monotony) if monotony is not None else None,
        "consecutive_days": consecutive,
        "hard_3d": hard_3d,
        "training_days_7": training_days_7,
        "rest_days_7": 7 - training_days_7,
        "minutes_7": round(sum(s["minutes"] for s in sessions if end - timedelta(days=6) <= s["day"] <= end)),
        "prev_week_load": round(prev7),
        "history_days": history_days,
        "today_load": round(daily.get(today, 0.0)),
        # load of the 6 days before today: what a session today gets added to
        "prior_6": round(sum(daily.get(today - timedelta(days=i), 0.0) for i in range(1, 7))),
    }


def _factor(key, bucket, label, value, status, penalty, detail):
    return {"key": key, "bucket": bucket, "label": label, "value": value, "status": status,
            "penalty": round(penalty, 1), "detail": detail}


def _load_factors(m: dict, planned_weekly_min: float, age: int | None) -> list[dict]:
    out = []
    acwr = m["acwr"]
    if acwr is None:
        if m["history_days"] == 0:
            out.append(_factor("acwr", "load", "Load ratio", "no data", "info", 0,
                               "No sessions logged yet. Log training and this fills in."))
        else:
            ratio = m["minutes_7"] / planned_weekly_min if planned_weekly_min else 0
            pen = 10 if ratio > 1.5 else 5 if ratio > 1.25 else 0
            out.append(_factor("acwr", "load", "Load ratio", "building baseline", "watch" if pen else "info", pen,
                               f"Needs 3 weeks of history ({m['history_days']} days so far). Meanwhile the last 7 days are compared "
                               f"with your plan: {m['minutes_7']} min trained against {round(planned_weekly_min)} min planned."))
    else:
        if acwr > 2.0:
            pen, status = 30, "bad"
            msg = "More than double your normal load. This is the pattern most associated with injury."
        elif acwr > 1.5:
            pen, status = 15 + (acwr - 1.5) * 30, "bad"
            msg = "Danger zone: this week is far above what your body is used to."
        elif acwr > 1.3:
            pen, status = 8 + (acwr - 1.3) * 35, "watch"
            msg = "Above the 0.8-1.3 sweet spot. You are ramping faster than you have adapted."
        elif acwr >= 0.8:
            pen, status = 0, "good"
            msg = "Inside the 0.8-1.3 sweet spot: this week matches what you are conditioned for."
        else:
            pen, status = 0, "info"
            msg = "Below your normal load. Fine for a deload; if it lasts, build back up gradually rather than all at once."
        out.append(_factor("acwr", "load", "Load ratio (7 d : 28 d)", f"{acwr:.2f}", status, pen,
                           f"{msg} Last 7 days {m['acute']} AU against a 4-week average of {m['chronic']} AU per week."))

    c = m["consecutive_days"]
    pen = {0: 0, 1: 0, 2: 0, 3: 4, 4: 8, 5: 12}.get(c, 16)
    out.append(_factor("streak_days", "load", "Days in a row", f"{c}", "bad" if c >= 5 else "watch" if c >= 3 else "good", pen,
                       "No rest day for a while. Connective tissue adapts slower than fitness." if c >= 3
                       else "Rest days are spaced well."))

    h = m["hard_3d"]
    pen = 12 if h >= 3 else 6 if h == 2 else 0
    out.append(_factor("hard", "load", "Hard sessions, last 3 days", f"{h}", "bad" if h >= 3 else "watch" if h == 2 else "good", pen,
                       "Sessions at RPE 8+ stacked together. Hard days need easy days between them." if h >= 2
                       else "Hard sessions are spaced out."))

    mono = m["monotony"]
    if mono is not None:
        flag = mono > 2.0 and m["training_days_7"] >= 5
        out.append(_factor("monotony", "load", "Monotony", f"{mono:.1f}", "watch" if flag else "good", 6 if flag else 0,
                           "Every day looks the same. Above 2.0 with high volume is linked to overtraining; mix hard, easy and off days."
                           if flag else "Good variation between heavy and light days."))

    if age and age >= 40:
        mult = 1.3 if age >= 50 else 1.15
        for f in out:
            f["penalty"] = round(f["penalty"] * mult, 1)
        out.append(_factor("age", "load", "Masters adjustment", f"x{mult}", "info", 0,
                           "Load penalties are scaled up slightly: recovery between hard sessions takes longer after 40."))
    return out


def _sleep_factors(sleep: dict | None) -> list[dict]:
    if not sleep:
        return [_factor("sleep", "sleep", "Sleep", "not logged", "info", 0,
                        "Log last night's sleep to include it. Until then the score assumes sleep was fine.")]
    pen = (100 - sleep["score"]) * 0.25
    h = sleep["hours"]
    status = "good" if sleep["score"] >= 80 else "watch" if sleep["score"] >= 60 else "bad"
    bits = [f"{h:.1f} h asleep (need {sleep['need_h']:.0f} h)"]
    if sleep.get("avg_hours_7") is not None and sleep["nights_logged"] >= 3:
        bits.append(f"7-night average {sleep['avg_hours_7']:.1f} h")
    if sleep.get("debt_hours_7"):
        bits.append(f"{sleep['debt_hours_7']:.1f} h of sleep debt")
    return [_factor("sleep", "sleep", "Sleep score", f"{sleep['score']}", status, pen, ", ".join(bits) + ".")]


_SCALE = {
    "soreness": ([0, 1, 4, 8, 12], ["Fresh", "A little stiff", "Sore", "Very sore", "Wrecked"]),
    "fatigue":  ([0, 1, 4, 8, 12], ["Full of energy", "Good", "A bit flat", "Tired", "Exhausted"]),
    "stress":   ([0, 1, 3, 5, 8],  ["Relaxed", "Normal", "Busy head", "Stressed", "Overloaded"]),
    "mood":     ([0, 0, 2, 4, 6],  ["Fired up", "Good", "Meh", "Low", "Dreading it"]),
}


_BODY_LABELS = {"soreness": "Soreness", "fatigue": "Energy", "stress": "Stress", "mood": "Motivation"}


def _body_factors(checkin: dict | None) -> list[dict]:
    if not checkin:
        return [_factor("checkin", "body", "Body check-in", "not done", "info", 0,
                        "No check-in today, so how you feel is not part of the score. It takes 15 seconds.")]
    out = []
    for key, (pens, labels) in _SCALE.items():
        v = max(1, min(5, int(checkin.get(key, 1))))
        out.append(_factor(key, "body", _BODY_LABELS[key], labels[v - 1],
                           "good" if v <= 2 else "watch" if v == 3 else "bad", pens[v - 1],
                           f"You rated this {v}/5."))
    ill = checkin.get("illness", "none")
    if ill == "head_cold":
        out.append(_factor("illness", "body", "Illness", "Head cold", "watch", 10,
                           "Symptoms above the neck only: light training is usually fine, but stay off the mat so you do not pass it on."))
    elif ill == "systemic":
        out.append(_factor("illness", "body", "Illness", "Fever / chest / body aches", "bad", 25,
                           "Symptoms below the neck or a fever: do not train. Training through it prolongs illness."))
    return out


def _fuel_factors(fuel: dict | None) -> list[dict]:
    if not fuel or fuel.get("yesterday_score") is None:
        extra = []
        if fuel and fuel.get("dehydrated_today"):
            extra.append(_factor("hydration", "fuel", "Hydration today", "behind", "watch", 3,
                                 "Well behind on water for this time of day."))
        return [_factor("fuel", "fuel", "Fuel", "not logged", "info", 0,
                        "No food log for yesterday, so fuelling is not part of the score.")] + extra
    score = fuel["yesterday_score"]
    out = [_factor("fuel", "fuel", "Yesterday's fuel score", f"{score}",
                   "good" if score >= 80 else "watch" if score >= 60 else "bad", (100 - score) * 0.12,
                   "Protein, carbs, energy and water against yesterday's targets. What you ate yesterday is what you recover with today.")]
    if fuel.get("low_days", 0) >= 2:
        out.append(_factor("low_energy", "fuel", "Under-eating streak", f"{fuel['low_days']} of 3 days", "bad", 5,
                           "Several days under 75% of target energy. Low energy availability blunts recovery and raises injury risk."))
    if fuel.get("dehydrated_today"):
        out.append(_factor("hydration", "fuel", "Hydration today", "behind", "watch", 3,
                           "Well behind on water for this time of day."))
    return out


def _injury_factors(injuries: list[dict]) -> list[dict]:
    out = []
    for inj in injuries:
        pain = max(0, min(10, int(inj.get("pain", 0))))
        level = inj.get("mat_level", "full")
        pen = pain * 1.5 + MAT_LEVEL_PENALTY.get(level, 0)
        out.append(_factor(f"injury:{inj['id']}", "injury", inj["name"], f"pain {pain}/10",
                           "bad" if pain >= 5 or level in ("off", "solo") else "watch", pen,
                           f"Rehab phase: {inj.get('phase', 'n/a')}. Mat limit for this phase: {inj.get('mat_text', level)}"))
    return out


BUCKET_CAPS = {"load": 40, "sleep": 25, "body": 25, "fuel": 15, "injury": 30}
BUCKET_LABELS = {"load": "Training load", "sleep": "Sleep", "body": "How you feel", "fuel": "Fuel", "injury": "Injuries"}


def assess(*, sessions: list[dict], today: date, checkin: dict | None = None, sleep: dict | None = None,
           fuel: dict | None = None, injuries: list[dict] | None = None, age: int | None = None,
           planned_weekly_min: float = 270, planned_minutes: float | None = None,
           planned_rpe: float | None = None) -> dict:
    injuries = injuries or []
    m = load_metrics(sessions, today)

    factors = (
        _load_factors(m, planned_weekly_min, age)
        + _sleep_factors(sleep)
        + _body_factors(checkin)
        + _fuel_factors(fuel)
        + _injury_factors(injuries)
    )

    buckets = {}
    for key, cap in BUCKET_CAPS.items():
        raw = sum(f["penalty"] for f in factors if f["bucket"] == key)
        buckets[key] = {"label": BUCKET_LABELS[key], "penalty": round(min(cap, raw), 1), "cap": cap}
    score = max(0, round(100 - sum(b["penalty"] for b in buckets.values())))

    zone_key = zone_for_score(score)
    overrides = []

    def cap_zone(limit: str, why: str):
        nonlocal zone_key
        if ZONE_ORDER.index(zone_key) < ZONE_ORDER.index(limit):
            zone_key = limit
            overrides.append(why)

    if checkin and checkin.get("illness") == "systemic":
        cap_zone("rest", "Fever or below-the-neck symptoms: rest until they clear.")
    if checkin and checkin.get("illness") == "head_cold":
        cap_zone("tone", "Head cold: keep it light and train away from partners.")
    if sleep and sleep["hours"] < 5:
        cap_zone("tone", f"Only {sleep['hours']:.1f} h of sleep: reaction time and judgement are down, so no hard sparring.")
    if m["acwr"] is not None and m["acwr"] > 2.0:
        cap_zone("tone", "Training load is more than double your 4-week normal.")
    for inj in injuries:
        if int(inj.get("pain", 0)) >= 7:
            cap_zone("recover", f"{inj['name']}: pain {inj['pain']}/10. Rehab only, and get it looked at.")
        limit = MAT_LEVEL_CAP.get(inj.get("mat_level", "full"), "go")
        cap_zone(limit, f"{inj['name']}: current rehab phase allows '{inj.get('mat_level')}' work only.")

    zone = _zone(zone_key)

    # ── Today's prescription ────────────────────────────────────────────────
    base_minutes = planned_minutes if planned_minutes else 90
    rpe_cap = zone["rpe_cap"]
    max_minutes = round(base_minutes * zone["volume_factor"] / 5) * 5
    room = None
    if m["acwr"] is not None and m["chronic"] > 0 and rpe_cap > 0:
        # load units left today before the 7-day total leaves the sweet spot
        room = max(0.0, 1.3 * m["chronic"] - m["prior_6"] - m["today_load"])
        if zone_key in ("go", "smart"):
            by_load = room / min(rpe_cap, planned_rpe or 6)
            if by_load < max_minutes:
                max_minutes = max(30, round(by_load / 5) * 5)

    planned = None
    if planned_minutes and planned_rpe:
        add = planned_minutes * planned_rpe
        proj = ((m["prior_6"] + m["today_load"] + add) / m["chronic"]
                if m["acwr"] is not None and m["chronic"] > 0 else None)
        too_hard = planned_rpe > rpe_cap
        too_long = planned_minutes > max_minutes
        if rpe_cap == 0:
            verdict = "Skip it. Rest today."
        elif too_hard and too_long:
            verdict = f"Too much today. Cut to about {max_minutes} min and keep intensity at RPE {rpe_cap} or below."
        elif too_hard:
            verdict = f"Duration is fine. Drop the intensity to RPE {rpe_cap} or below."
        elif too_long:
            verdict = f"Intensity is fine. Shorten to about {max_minutes} min."
        else:
            verdict = "Good to go as planned."
        planned = {"minutes": planned_minutes, "rpe": planned_rpe, "load": round(add),
                   "projected_acwr": round(proj, 2) if proj is not None else None,
                   "ok": not (too_hard or too_long) and rpe_cap > 0, "verdict": verdict}

    session_menu = {
        "go": ["Full class", "Hard sparring", "Competition rounds"],
        "smart": ["Full class", "Positional sparring", "A few controlled rolls with partners you trust"],
        "tone": ["Technique and drilling", "Flow rolling", "Positional work at 50%"],
        "recover": ["Walk 20-30 min", "Mobility and breathing", "Rehab exercises", "Solo movement drills"],
        "rest": ["Sleep", "Eat at target", "Easy walk if you feel like it"],
    }[zone_key]

    # ── Advice ──────────────────────────────────────────────────────────────
    advice = []
    worst = sorted([f for f in factors if f["penalty"] > 0], key=lambda f: -f["penalty"])[:3]
    for f in worst:
        advice.append(f"{f['label']}: {f['detail']}")
    if m["acwr"] is not None and m["acwr"] < 0.8 and zone_key == "go" and m["chronic"] > 0:
        advice.append("You are fresh and under your usual load. Good day for a hard session, but return to normal volume over 1-2 weeks, not in one jump.")
    if m["prev_week_load"] and m["acute"] > m["prev_week_load"] * 1.3 and m["history_days"] >= 14:
        advice.append("This week is over 30% heavier than last week. Increases of about 10% a week are easier to absorb.")
    if not advice and zone_key == "go":
        advice.append("Nothing is holding you back today. Train hard, then eat and sleep like it mattered.")

    signals = sum([bool(checkin), bool(sleep), bool(fuel and fuel.get("yesterday_score") is not None), m["history_days"] >= 21])
    confidence = "high" if signals >= 3 else "medium" if signals == 2 else "low"

    return {
        "score": score,
        "zone": zone,
        "overrides": overrides,
        "buckets": buckets,
        "factors": factors,
        "metrics": {k: v for k, v in m.items() if k != "series"},
        "series": m["series"],
        "prescription": {"rpe_cap": rpe_cap, "max_minutes": max_minutes if rpe_cap > 0 else 0,
                         "sessions": session_menu, "load_room": round(room) if room is not None else None},
        "planned": planned,
        "advice": advice,
        "confidence": confidence,
        "inputs": {"checkin": bool(checkin), "sleep": bool(sleep),
                   "fuel": bool(fuel and fuel.get("yesterday_score") is not None),
                   "injuries": len(injuries), "history_days": m["history_days"]},
    }
