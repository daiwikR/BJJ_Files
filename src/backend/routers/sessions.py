from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import consistency, crud, progression, schemas
from ..database import get_db

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=schemas.SessionOut)
def log_session(session_in: schemas.SessionIn, db: Session = Depends(get_db)):
    session = crud.create_session(db, session_in)
    progression.evaluate(db)
    consistency.evaluate_awards(db)
    db.refresh(session)
    return session


@router.get("", response_model=List[schemas.SessionOut])
def list_sessions(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_sessions(db, limit=limit)


@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    if not crud.delete_session(db, session_id):
        raise HTTPException(404, "Session not found")
    return {"ok": True}
