from datetime import date, datetime, timedelta

from src.backend import nutrition, recovery, sleep

TODAY = date(2026, 6, 15)


def _steady(weeks=5, per_week=(0, 2, 4), minutes=90, rpe=6, until=TODAY):
    """Sessions on fixed weekdays for `weeks` weeks ending the day before `until`."""
    out = []
    for i in range(1, weeks * 7 + 1):
        d = until - timedelta(days=i)
        if d.weekday() in per_week:
            out.append({"day": d, "minutes": minutes, "rpe": rpe, "type": "class"})
    return out


def test_session_load_is_rpe_times_minutes():
    assert recovery.session_load(90, 6) == 540
    assert recovery.session_load(60, None, "drilling") == 240   # falls back to the type default


def test_steady_training_sits_in_sweet_spot_and_is_go():
    r = recovery.assess(sessions=_steady(), today=TODAY)
    assert 0.8 <= r["metrics"]["acwr"] <= 1.3
    assert r["zone"]["key"] == "go"
    assert r["score"] >= 90


def test_no_acwr_until_three_weeks_of_history():
    r = recovery.assess(sessions=_steady(weeks=2), today=TODAY)
    assert r["metrics"]["acwr"] is None
    assert any(f["key"] == "acwr" and f["value"] == "building baseline" for f in r["factors"])


def test_load_spike_pulls_readiness_down():
    base = _steady()
    spike = [{"day": TODAY - timedelta(days=i), "minutes": 120, "rpe": 9, "type": "sparring"} for i in range(0, 6)]
    r = recovery.assess(sessions=base + spike, today=TODAY)
    assert r["metrics"]["acwr"] > 1.5
    assert r["metrics"]["consecutive_days"] >= 6
    assert r["zone"]["key"] in ("tone", "recover", "rest")
    assert r["buckets"]["load"]["penalty"] == 40          # capped


def test_bad_checkin_alone_cannot_exceed_its_cap():
    r = recovery.assess(sessions=_steady(), today=TODAY,
                        checkin={"soreness": 5, "fatigue": 5, "stress": 5, "mood": 5, "illness": "none"})
    assert r["buckets"]["body"]["penalty"] == 25
    assert r["score"] == 75
    assert r["zone"]["key"] == "smart"


def test_systemic_illness_forces_rest_whatever_the_score():
    r = recovery.assess(sessions=_steady(), today=TODAY,
                        checkin={"soreness": 1, "fatigue": 1, "stress": 1, "mood": 1, "illness": "systemic"})
    assert r["zone"]["key"] == "rest"
    assert r["overrides"]


def test_short_sleep_caps_zone_at_tone_it_down():
    night = {"day": TODAY, "screen_off": datetime(2026, 6, 15, 2, 0), "screen_on": datetime(2026, 6, 15, 6, 30),
             "latency_min": 15, "awake_min": 0, "night_pickups": 0, "quality": 4}
    s = sleep.summarize([night])
    assert s["hours"] < 5
    r = recovery.assess(sessions=_steady(), today=TODAY, sleep=s)
    assert r["zone"]["key"] == "tone"
    assert r["prescription"]["rpe_cap"] == 5


def test_injury_phase_limits_the_zone():
    inj = [{"id": 1, "name": "MCL Sprain", "pain": 2, "mat_level": "drill", "mat_text": "", "phase": "Load"}]
    r = recovery.assess(sessions=_steady(), today=TODAY, injuries=inj)
    assert r["zone"]["key"] == "tone"
    hurt = [{**inj[0], "pain": 8, "mat_level": "positional"}]
    assert recovery.assess(sessions=_steady(), today=TODAY, injuries=hurt)["zone"]["key"] == "recover"


def test_planned_session_verdict():
    tired = {"soreness": 4, "fatigue": 4, "stress": 3, "mood": 3, "illness": "none"}
    r = recovery.assess(sessions=_steady(), today=TODAY, checkin=tired, planned_minutes=120, planned_rpe=9)
    assert r["planned"]["ok"] is False
    assert "RPE" in r["planned"]["verdict"]
    fine = recovery.assess(sessions=_steady(), today=TODAY, planned_minutes=90, planned_rpe=6)
    assert fine["planned"]["ok"] is True


def test_masters_athletes_get_heavier_load_penalties():
    base = _steady()
    spike = [{"day": TODAY - timedelta(days=i), "minutes": 45, "rpe": 8, "type": "sparring"} for i in range(0, 3)]
    young = recovery.assess(sessions=base + spike, today=TODAY, age=25)
    old = recovery.assess(sessions=base + spike, today=TODAY, age=52)
    assert old["score"] < young["score"]


# ─── Sleep ───────────────────────────────────────────────────────────────────

def test_screen_gap_is_corrected_for_latency_and_wakings():
    m = sleep.night_metrics(datetime(2026, 6, 14, 23, 0), datetime(2026, 6, 15, 7, 0), latency_min=20, awake_min=10)
    assert m["window_min"] == 480 and m["asleep_min"] == 450 and m["hours"] == 7.5
    # pickups cost 5 min each when no awake time was given
    assert sleep.night_metrics(datetime(2026, 6, 14, 23, 0), datetime(2026, 6, 15, 7, 0), 15, 0, 4)["asleep_min"] == 445


def test_full_night_scores_high_and_short_night_low():
    def night(day, off_h, on_h, q):
        return {"day": day, "screen_off": datetime(2026, 6, day.day - 1, off_h, 0), "screen_on": datetime(2026, 6, day.day, on_h, 30),
                "latency_min": 10, "awake_min": 0, "night_pickups": 0, "quality": q}
    good = sleep.summarize([night(TODAY - timedelta(days=i), 22, 6, 5) for i in range(5)])
    bad = sleep.summarize([night(TODAY - timedelta(days=i), 23, 4, 2) for i in range(5)])
    assert good["score"] >= 90
    assert bad["score"] <= 45
    assert bad["debt_hours_7"] > good["debt_hours_7"]


# ─── Nutrition ───────────────────────────────────────────────────────────────

def test_targets_scale_with_body_weight_and_training_load():
    rest = nutrition.targets(weight_kg=80, height_cm=180, age=30, sex="male", day_type="rest")
    hard = nutrition.targets(weight_kg=80, height_cm=180, age=30, sex="male", day_type="hard", training_hours=2)
    assert rest["protein"] == 144                     # 1.8 g/kg
    assert hard["carbs"] > rest["carbs"]
    assert hard["carbs"] >= 7 * 80
    assert hard["water_ml"] == rest["water_ml"] + 1200  # 600 mL per training hour
    assert rest["fat"] >= rest["fat_floor"] == 64


def test_cut_raises_protein_and_lowers_energy():
    m = nutrition.targets(weight_kg=80, height_cm=180, age=30, sex="male", goal="maintain", day_type="moderate", training_hours=1.5)
    c = nutrition.targets(weight_kg=80, height_cm=180, age=30, sex="male", goal="cut", day_type="moderate", training_hours=1.5)
    assert c["protein"] == 176 and c["kcal"] < m["kcal"]


def test_fuel_score_and_hints():
    t = nutrition.targets(weight_kg=80, height_cm=180, age=30, sex="male", day_type="hard", training_hours=2)
    full = {"kcal": t["kcal"], "protein": t["protein"], "carbs": t["carbs"], "fat": t["fat"], "water_ml": t["water_ml"]}
    assert nutrition.fuel_score(full, t)["score"] == 100
    low = {"kcal": 900, "protein": 40, "carbs": 90, "fat": 20, "water_ml": 500}
    assert nutrition.fuel_score(low, t)["score"] < 40
    keys = {h["key"] for h in nutrition.hints(low, t, hour=20) if h["tone"] == "warn"}
    assert {"water", "protein", "carbs", "fat", "energy"} <= keys
    carb = next(h for h in nutrition.hints(low, t, hour=20) if h["key"] == "carbs")
    assert carb["title"] == "Carb up today"
    assert not [h for h in nutrition.hints(full, t, hour=20) if h["tone"] == "warn"]


def test_hints_do_not_nag_early_in_the_day():
    t = nutrition.targets(weight_kg=80, day_type="moderate", training_hours=1.5)
    morning = {"kcal": 500, "protein": 30, "carbs": 60, "fat": 15, "water_ml": 500}
    assert not [h for h in nutrition.hints(morning, t, hour=8.5) if h["tone"] == "warn"]
