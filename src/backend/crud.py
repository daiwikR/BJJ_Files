from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func, text
from datetime import datetime, timezone
from typing import List, Optional
from . import models, schemas


def create_session(db: DBSession, session_in: schemas.SessionIn) -> models.Session:
    session = models.Session(
        gi_nogi=session_in.gi_nogi,
        session_type=session_in.session_type,
        duration_min=session_in.duration_min,
        partner_weight=session_in.partner_weight,
        notes=session_in.notes,
    )
    db.add(session)
    db.flush()  # get session.id

    for tech in session_in.techniques:
        log = models.TechniqueLog(
            session_id=session.id,
            technique_id=tech.technique_id,
            position_id=tech.position_id,
            reps=tech.reps,
        )
        db.add(log)
        _upsert_proficiency(db, tech.technique_id, tech.position_id, tech.reps)

    db.commit()
    db.refresh(session)
    return session


def _upsert_proficiency(db: DBSession, technique_id: str, position_id: str, reps: int):
    prof = db.query(models.Proficiency).filter_by(technique_id=technique_id).first()
    now = datetime.now(timezone.utc)
    if prof:
        prof.total_reps += reps
        prof.last_practiced = now
    else:
        prof = models.Proficiency(
            technique_id=technique_id,
            position_id=position_id,
            total_reps=reps,
            last_practiced=now,
            raw_score=0.0,
        )
        db.add(prof)


def get_sessions(db: DBSession, limit: int = 50) -> List[models.Session]:
    return db.query(models.Session).order_by(models.Session.date.desc()).limit(limit).all()


def get_proficiency_all(db: DBSession) -> List[models.Proficiency]:
    return db.query(models.Proficiency).all()


def compute_node_proficiency(
    db: DBSession,
    skill_tree: dict,
    target_map: dict,
) -> dict:
    """Returns {position_id: proficiency_0_to_100} with optional decay."""
    profs = db.query(models.Proficiency).all()
    tech_scores: dict[str, float] = {}
    now = datetime.now(timezone.utc)

    for p in profs:
        target = target_map.get(p.technique_id, 50)
        raw = min(100.0, (p.total_reps / target) * 100.0)
        # decay: -1% per week
        if p.last_practiced:
            lp = p.last_practiced
            if lp.tzinfo is None:
                lp = lp.replace(tzinfo=timezone.utc)
            days_since = (now - lp).days
            decay = (days_since / 7) * 1.0
            raw = max(0.0, raw - decay)
        tech_scores[p.technique_id] = raw

    # Aggregate per position: average of all techniques in that position
    pos_techs: dict[str, list] = {}
    for tech in skill_tree.get("techniques", []):
        pid = tech["position_id"]
        tid = tech["id"]
        pos_techs.setdefault(pid, [])
        pos_techs[pid].append(tech_scores.get(tid, 0.0))

    result = {}
    for pid, scores in pos_techs.items():
        result[pid] = sum(scores) / len(scores) if scores else 0.0
    return result


def get_stats(db: DBSession) -> dict:
    total_sessions = db.query(func.count(models.Session.id)).scalar() or 0
    total_minutes = db.query(func.sum(models.Session.duration_min)).scalar() or 0
    total_reps = db.query(func.sum(models.TechniqueLog.reps)).scalar() or 0

    # Weekly mat hours (last 8 weeks)
    weekly_query = text("""
        SELECT strftime('%Y-W%W', date) as week, SUM(duration_min) as minutes
        FROM sessions
        WHERE date >= datetime('now', '-56 days')
        GROUP BY week
        ORDER BY week
    """)
    weekly_rows = db.execute(weekly_query).fetchall()
    weekly_mat = [{"week": r[0], "hours": round(r[1] / 60, 2)} for r in weekly_rows]

    # Top positions by reps
    top_pos_query = text("""
        SELECT position_id, SUM(reps) as total
        FROM technique_logs
        GROUP BY position_id
        ORDER BY total DESC
        LIMIT 5
    """)
    top_rows = db.execute(top_pos_query).fetchall()
    top_positions = [{"position_id": r[0], "total_reps": r[1]} for r in top_rows]

    return {
        "total_sessions": total_sessions,
        "total_mat_hours": round(total_minutes / 60, 2),
        "total_techniques_drilled": total_reps or 0,
        "weekly_mat_hours": weekly_mat,
        "weekly_new_techniques": [],
        "top_positions": top_positions,
    }


def get_drill_queue(db: DBSession, skill_tree: dict, limit: int = 5) -> list:
    """Return techniques not drilled in 14+ days, sorted by staleness."""
    profs = db.query(models.Proficiency).all()
    now = datetime.now(timezone.utc)
    stale = []
    for p in profs:
        if p.last_practiced:
            lp = p.last_practiced
            if lp.tzinfo is None:
                lp = lp.replace(tzinfo=timezone.utc)
            days = (now - lp).days
            if days >= 14:
                stale.append({"technique_id": p.technique_id, "position_id": p.position_id, "days_since": days})

    # Also add never-drilled techniques
    drilled_ids = {p.technique_id for p in profs}
    for tech in skill_tree.get("techniques", []):
        if tech["id"] not in drilled_ids:
            stale.append({"technique_id": tech["id"], "position_id": tech["position_id"], "days_since": 9999})

    stale.sort(key=lambda x: x["days_since"], reverse=True)
    return stale[:limit]
