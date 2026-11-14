from datetime import date, datetime, timedelta

TODAY = date.today()


def _profile(client, **kw):
    body = {"belt": "white", "stripes": 0, "classes_per_day": 1, "days_per_week": 3, "class_minutes": 90,
            "weight_kg": 80, "height_cm": 180, "age": 30, "sex": "male"}
    body.update(kw)
    r = client.put("/api/profile", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _session(client, days_ago=0, minutes=90, rpe=6, kind="class"):
    r = client.post("/api/sessions", json={"gi_nogi": "gi", "session_type": kind, "duration_min": minutes,
                                           "intensity": rpe, "day": (TODAY - timedelta(days=days_ago)).isoformat()})
    assert r.status_code == 200, r.text
    return r.json()


def test_libraries_are_seeded(client):
    lib = client.get("/api/injuries").json()
    slugs = {i["slug"] for i in lib["injuries"]}
    assert {"mcl-sprain", "rotator-cuff", "elbow-hyperextension", "rib-injury", "concussion"} <= slugs
    assert all(i["phases"] and i["red_flags"] for i in lib["injuries"])
    assert len(client.get("/api/fuel/foods?limit=200").json()) > 80


def test_stripe_needs_hours_and_weeks_and_skills(client):
    six_weeks_ago = (TODAY - timedelta(weeks=7)).isoformat()
    _profile(client, level_started_on=six_weeks_ago, belt_started_on=six_weeks_ago)
    for i in range(27):                       # 27 x 90 min = 40.5 h, stage needs 40
        _session(client, days_ago=i + 1)
    st = client.get("/api/status").json()
    assert st["gates"]["hours"]["met"] and st["gates"]["weeks"]["met"]
    assert not st["gates"]["skills"]["met"] and st["stripes"] == 0     # hours alone are not enough

    for item in st["stage"]["competencies"][:5]:                        # 5 of 6 = 83% >= 80%
        client.post("/api/roadmap/check", json={"stage_key": "white-0", "item_id": item["id"], "checked": True})
    st = client.get("/api/status").json()
    assert st["stripes"] == 1 and st["stage"]["key"] == "white-1"
    assert st["gates"]["hours"]["have"] == 0.5                          # surplus carried over
    aw = client.get("/api/awards").json()
    assert any(a["key"] == "stripe:white-1" for a in aw["unseen"])
    client.post("/api/awards/ack")
    assert client.get("/api/awards").json()["unseen"] == []


def test_calendar_floor_blocks_speed_running(client):
    _profile(client)                                                    # stage started today
    for i in range(30):
        _session(client, days_ago=i)
    st = client.get("/api/status").json()
    for item in st["stage"]["competencies"]:
        client.post("/api/roadmap/check", json={"stage_key": "white-0", "item_id": item["id"], "checked": True})
    st = client.get("/api/status").json()
    assert st["gates"]["hours"]["met"] and st["gates"]["skills"]["met"]
    assert not st["gates"]["weeks"]["met"] and st["stripes"] == 0


def test_belt_is_never_auto_awarded(client):
    long_ago = (TODAY - timedelta(weeks=120)).isoformat()
    _profile(client, belt="white", stripes=4, banked_hours=80, level_started_on=long_ago, belt_started_on=long_ago)
    st = client.get("/api/status").json()
    for item in st["stage"]["competencies"]:
        client.post("/api/roadmap/check", json={"stage_key": "white-4", "item_id": item["id"], "checked": True})
    st = client.get("/api/status").json()
    assert st["all_met"] and st["belt"] == "white" and st["stripes"] == 4
    assert any(a["kind"] == "belt_ready" for a in client.get("/api/awards").json()["awards"])
    client.post("/api/roadmap/promote")
    st = client.get("/api/status").json()
    assert st["belt"] == "blue" and st["stripes"] == 0
    assert st["gates"]["hours"]["have"] == 5.0                          # 80 banked - 75 needed


def test_roadmap_projection_respects_schedule_and_ibjjf_minimums(client):
    _profile(client, belt="blue", stripes=0)
    slow = client.get("/api/roadmap").json()
    fast = client.get("/api/roadmap?classes_per_day=2&days_per_week=6").json()
    blue_slow = next(b for b in slow["belts"] if b["id"] == "blue")
    blue_fast = next(b for b in fast["belts"] if b["id"] == "blue")
    assert blue_fast["eta"] < blue_slow["eta"]
    # 2 x 6 x 90 min would clear 600 h in about a year, but IBJJF requires 24 months at blue
    earliest = TODAY + timedelta(days=round(24 * 30.4375))
    assert blue_fast["eta"] >= earliest.isoformat()
    assert blue_fast["stages"][4]["limited_by"] in ("ibjjf", "calendar")   # time, not hours, is the limit
    assert fast["plan"]["volume"]["level"] == "high"
    assert [b["state"] for b in slow["belts"]] == ["done", "current", "locked", "locked"]


def test_consistency_streak_counts_hit_weeks(client):
    _profile(client)
    monday = TODAY - timedelta(days=TODAY.weekday())
    for w in (1, 2, 3):                                                 # three full previous weeks, 2 days each
        for d in (0, 2):
            day = monday - timedelta(weeks=w) + timedelta(days=d)
            _session(client, days_ago=(TODAY - day).days)
    c = client.get("/api/consistency").json()
    assert c["target"]["min_days"] == 2
    assert c["streak"] == 3 and c["best_streak"] == 3
    assert any(a["key"] == "streak:2" for a in client.get("/api/awards").json()["awards"])


def test_sleep_from_screen_times_feeds_recovery(client):
    _profile(client)
    off = datetime.combine(TODAY - timedelta(days=1), datetime.min.time()).replace(hour=23, minute=30)
    on = datetime.combine(TODAY, datetime.min.time()).replace(hour=4, minute=0)
    r = client.put("/api/sleep", json={"screen_off": off.isoformat(), "screen_on": on.isoformat(),
                                       "latency_min": 20, "night_pickups": 2, "quality": 2})
    assert r.status_code == 200 and r.json()["asleep_min"] == 240       # 270 - 20 - 2x5
    a = client.get("/api/recovery/assess").json()
    assert a["inputs"]["sleep"] and a["buckets"]["sleep"]["penalty"] > 10
    assert a["zone"]["key"] == "tone"
    bad = client.put("/api/sleep", json={"screen_off": on.isoformat(), "screen_on": off.isoformat()})
    assert bad.status_code == 422


def test_lights_out_and_wake_taps_make_a_night(client):
    _profile(client)
    off = datetime.combine(TODAY - timedelta(days=1), datetime.min.time()).replace(hour=22, minute=45)
    on = datetime.combine(TODAY, datetime.min.time()).replace(hour=6, minute=45)
    client.post("/api/sleep/lights-out", json={"at": off.isoformat()})
    assert client.get("/api/sleep").json()["pending_tap"]
    n = client.post("/api/sleep/wake", json={"at": on.isoformat()}).json()
    assert n["source"] == "tap" and n["hours"] == 7.75
    assert client.get("/api/sleep").json()["pending_tap"] is None


def test_food_and_water_logging_drive_targets_and_hints(client):
    _profile(client)
    chicken = client.get("/api/fuel/foods?q=chicken breast").json()[0]
    client.post("/api/fuel/food", json={"food_id": chicken["id"], "grams": 200, "meal": "lunch"})
    client.post("/api/fuel/food", json={"name": "Home dal and rice", "protein": 18, "carbs": 70, "fat": 8, "meal": "dinner"})
    client.post("/api/fuel/water", json={"ml": 750})
    d = client.get("/api/fuel/day?day_type=hard").json()
    assert d["totals"]["protein"] == 80.0 and d["totals"]["water_ml"] == 750
    assert d["totals"]["kcal"] == 330 + 424
    assert d["targets"]["day_type"] == "hard" and d["targets"]["protein"] == 144
    rest = client.get("/api/fuel/day?day_type=rest").json()
    assert rest["targets"]["carbs"] < d["targets"]["carbs"]
    client.delete("/api/fuel/water/last")
    assert client.get("/api/fuel/day").json()["totals"]["water_ml"] == 0


def test_poor_fuel_yesterday_costs_readiness(client):
    _profile(client)
    y = (TODAY - timedelta(days=1)).isoformat()
    for _ in range(3):
        client.post("/api/fuel/food", json={"name": "Biscuits", "protein": 2, "carbs": 30, "fat": 8, "day": y})
    a = client.get("/api/recovery/assess").json()
    assert a["inputs"]["fuel"] and a["buckets"]["fuel"]["penalty"] > 5


def test_active_injury_limits_recovery_and_can_be_progressed(client):
    _profile(client)
    inj = client.post("/api/my-injuries", json={"injury_slug": "mcl-sprain", "severity": "moderate", "pain": 4, "side": "left"}).json()
    assert inj["mat_level"] == "off" and inj["expected_weeks"] == [3, 8]
    assert client.get("/api/recovery/assess").json()["zone"]["key"] == "recover"
    inj = client.patch(f"/api/my-injuries/{inj['id']}", json={"phase_index": 3, "pain": 1}).json()
    assert inj["mat_level"] == "positional"
    assert client.get("/api/recovery/assess").json()["zone"]["key"] == "smart"
    client.patch(f"/api/my-injuries/{inj['id']}", json={"status": "resolved"})
    assert client.get("/api/recovery/assess").json()["zone"]["key"] == "go"


def test_deleting_a_session_removes_its_hours(client):
    _profile(client)
    s = _session(client, minutes=120)
    assert client.get("/api/status").json()["gates"]["hours"]["have"] == 2.0
    client.delete(f"/api/sessions/{s['id']}")
    assert client.get("/api/status").json()["gates"]["hours"]["have"] == 0
