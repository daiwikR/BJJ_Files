from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TechniqueLogIn(BaseModel):
    technique_id: str
    position_id: str
    reps: int = Field(default=1, ge=1)


class SessionIn(BaseModel):
    gi_nogi: str = Field(..., pattern="^(gi|nogi)$")
    session_type: str = Field(..., pattern="^(drilling|sparring|competition)$")
    duration_min: int = Field(..., ge=1)
    partner_weight: Optional[str] = None
    notes: Optional[str] = None
    techniques: List[TechniqueLogIn] = []


class TechniqueLogOut(BaseModel):
    id: int
    technique_id: str
    position_id: str
    reps: int

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: int
    date: datetime
    gi_nogi: str
    session_type: str
    duration_min: int
    partner_weight: Optional[str]
    notes: Optional[str]
    technique_logs: List[TechniqueLogOut] = []

    class Config:
        from_attributes = True


class ProficiencyOut(BaseModel):
    position_id: str
    technique_id: str
    total_reps: int
    last_practiced: Optional[datetime]
    raw_score: float
    decayed_score: float


class NodeProficiency(BaseModel):
    position_id: str
    proficiency: float
    technique_count: int
    total_reps: int
    last_practiced: Optional[datetime]


class StatsOut(BaseModel):
    total_sessions: int
    total_mat_hours: float
    total_techniques_drilled: int
    weekly_mat_hours: List[dict]
    weekly_new_techniques: List[dict]
    top_positions: List[dict]
