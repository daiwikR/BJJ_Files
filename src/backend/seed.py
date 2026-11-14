"""Idempotent schema patch-ups and library seeding. Runs on every startup."""
import json

from sqlalchemy import inspect, text

from . import content, models
from .database import Base, SessionLocal, engine


def _add_missing_columns():
    """create_all() never alters existing tables, so add columns introduced after v1."""
    wanted = {"sessions": {"intensity": "INTEGER"}}
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, cols in wanted.items():
            if not insp.has_table(table):
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols.items():
                if name not in have:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        # v1 only allowed drilling/sparring/competition and stored no intensity.
        conn.execute(text("UPDATE sessions SET intensity = 4 WHERE intensity IS NULL AND session_type = 'drilling'"))
        conn.execute(text("UPDATE sessions SET intensity = 7 WHERE intensity IS NULL AND session_type = 'sparring'"))
        conn.execute(text("UPDATE sessions SET intensity = 9 WHERE intensity IS NULL AND session_type = 'competition'"))


def _seed_injuries(db):
    existing = {i.slug: i for i in db.query(models.Injury).all()}
    for doc in content.injuries()["injuries"]:
        row = existing.get(doc["slug"])
        payload = json.dumps(doc, ensure_ascii=False)
        if row is None:
            db.add(models.Injury(slug=doc["slug"], name=doc["name"], region=doc["region"], data=payload))
        elif row.data != payload:
            row.name, row.region, row.data = doc["name"], doc["region"], payload


def _seed_foods(db):
    existing = {f.name: f for f in db.query(models.Food).all()}
    for doc in content.foods()["foods"]:
        row = existing.get(doc["name"])
        if row is None:
            db.add(models.Food(custom=False, **doc))
        elif not row.custom:
            for k, v in doc.items():
                setattr(row, k, v)


def run():
    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
    db = SessionLocal()
    try:
        _seed_injuries(db)
        _seed_foods(db)
        db.commit()
    finally:
        db.close()
