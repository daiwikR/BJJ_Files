"""Fill a throwaway database with ~14 weeks of realistic data so you can explore the app.

    BJJ_DB_URL=sqlite:///./demo.db python -m scripts.seed_demo
    BJJ_DB_URL=sqlite:///./demo.db uvicorn src.backend.main:app --port 8000

It refuses to touch the default bjj_tracker.db.
"""
import os
import random
import sys
from datetime import date, datetime, time, timedelta

if "BJJ_DB_URL" not in os.environ or "bjj_tracker" in os.environ["BJJ_DB_URL"]:
    sys.exit("Set BJJ_DB_URL to a demo database first, e.g. BJJ_DB_URL=sqlite:///./demo.db")

from src.backend import consistency, crud, models, progression, schemas, seed  # noqa: E402
from src.backend.database import SessionLocal  # noqa: E402

random.seed(7)
seed.run()
db = SessionLocal()
if progression.get_profile(db):
    sys.exit("That database already has a profile. Delete the file to reseed.")

today = date.today()
ago = lambda weeks=0, days=0: today - timedelta(weeks=weeks, days=days)  # noqa: E731

p = models.Profile(id=1, name="Demo", classes_per_day=1, days_per_week=4, class_minutes=90,
                   age=29, sex="male", weight_kg=78, height_cm=178, goal="maintain", sleep_need_h=8)
db.add(p)
progression.set_rank(db, p, "white", 1, banked_hours=15, belt_started_on=ago(30), level_started_on=ago(14))
db.commit()


_tree = {t["id"]: t["position_id"] for t in __import__("src.backend.content", fromlist=["x"]).skill_tree()["techniques"]}
_ids = list(_tree)


def log(day, kind="class", minutes=90, rpe=6, gi="gi", notes=None):
    techs = []
    if kind in ("class", "drilling"):
        for tid in random.sample(_ids[:22], 2):
            techs.append(schemas.TechniqueLogIn(technique_id=tid, position_id=_tree[tid], reps=random.choice([10, 15, 20])))
    crud.create_session(db, schemas.SessionIn(gi_nogi=gi, session_type=kind, duration_min=minutes, intensity=rpe, day=day, notes=notes, techniques=techs))


def train_week(monday, plan):
    for offset, kind, minutes, rpe in plan:
        d = monday + timedelta(days=offset)
        if d <= today:
            log(d, kind, minutes, rpe, gi=random.choice(["gi", "gi", "nogi"]))


NORMAL = [(0, "class", 90, 6), (1, "drilling", 60, 4), (3, "class", 90, 7), (5, "open_mat", 90, 7)]
LIGHT = [(0, "class", 90, 5), (3, "class", 75, 6)]
this_monday = today - timedelta(days=today.weekday())

# Weeks 14 -> 7 ago: build the first stage
for w in range(14, 6, -1):
    train_week(this_monday - timedelta(weeks=w), LIGHT if w == 10 else NORMAL)
for item in ["mount2", "side2", "back", "early", "noBench"]:
    db.add(models.CompetencyCheck(stage_key="white-1", item_id=item))
db.commit()
for a in progression.evaluate(db, today=ago(6)):
    a.earned_at = datetime.combine(ago(6), time(20, 15))
db.commit()

# Weeks 6 -> 1 ago: steady
for w in range(6, 0, -1):
    train_week(this_monday - timedelta(weeks=w), NORMAL)
# Last few days: a spike
for i, (kind, minutes, rpe) in enumerate([("sparring", 100, 9), ("class", 90, 8), ("open_mat", 120, 8), ("class", 90, 7)]):
    d = today - timedelta(days=4 - i)
    if not db.query(models.Session).filter(models.Session.date >= datetime.combine(d, time.min),
                                           models.Session.date < datetime.combine(d + timedelta(days=1), time.min)).first():
        log(d, kind, minutes, rpe, notes="Hard rounds with the comp team" if rpe >= 9 else None)
for item in ["retain", "break"]:
    db.add(models.CompetencyCheck(stage_key="white-2", item_id=item))

# Sleep: 12 nights, the last two short
for i in range(12):
    d = today - timedelta(days=i)
    short = i < 2
    off = datetime.combine(d - timedelta(days=1), time(23, random.choice([5, 20, 40]))) + timedelta(hours=1.4 if short else 0)
    on = datetime.combine(d, time(6, random.choice([30, 45]))) + timedelta(minutes=0 if short else 35)
    db.add(models.SleepLog(day=d, source="screen", screen_off=off, screen_on=on, latency_min=20 if short else 15,
                           awake_min=15 if short else 5, night_pickups=2 if short else 0, quality=2 if short else random.choice([3, 4, 4])))

db.add(models.CheckIn(day=today, soreness=4, fatigue=3, stress=3, mood=2, illness="none"))


def eat(day, meal, name, grams):
    f = db.query(models.Food).filter_by(name=name).one()
    k = grams / 100
    db.add(models.FoodLog(day=day, meal=meal, name=f.name, grams=grams, kcal=f.kcal * k, protein=f.protein * k, carbs=f.carbs * k, fat=f.fat * k))


y = today - timedelta(days=1)
for meal, name, g in [("breakfast", "Oats, dry", 60), ("breakfast", "Milk, whole", 250), ("lunch", "Chicken curry", 250),
                      ("lunch", "White rice, cooked", 220), ("dinner", "Dal, cooked", 250), ("dinner", "Roti / chapati", 80)]:
    eat(y, meal, name, g)
db.add(models.WaterLog(day=y, ml=1500))
for meal, name, g in [("breakfast", "Egg, whole", 150), ("breakfast", "Bread, wholemeal", 80), ("breakfast", "Banana", 120),
                      ("lunch", "Chicken breast, cooked", 150), ("lunch", "White rice, cooked", 200)]:
    eat(today, meal, name, g)
db.add(models.WaterLog(day=today, ml=750))

db.add(models.UserInjury(injury_slug="finger-sprain", side="right", severity="mild", started_on=ago(9), phase_index=2,
                         pain=0, status="resolved", resolved_on=ago(6)))
db.add(models.UserInjury(injury_slug="grapplers-elbow", side="left", severity="mild", started_on=ago(2), phase_index=1,
                         pain=3, criteria_done='["1:0"]'))
db.commit()

consistency.evaluate_awards(db)
progression.evaluate(db)
# Leave only the stripe unseen so the first launch shows one celebration, not ten.
for a in db.query(models.Award).filter(models.Award.kind == "consistency"):
    a.seen = True
    a.earned_at = datetime.combine(ago(random.randint(1, 12)), time(20, 0))
db.commit()
print(f"Seeded {db.query(models.Session).count()} sessions. Rank: {p.belt} {p.stripes} stripes.")
