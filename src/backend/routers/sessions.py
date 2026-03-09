from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=schemas.SessionOut)
def log_session(session_in: schemas.SessionIn, db: Session = Depends(get_db)):
    return crud.create_session(db, session_in)


@router.get("", response_model=List[schemas.SessionOut])
def list_sessions(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_sessions(db, limit=limit)
