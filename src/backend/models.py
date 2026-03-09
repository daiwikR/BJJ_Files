from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    gi_nogi = Column(String, nullable=False)          # "gi" | "nogi"
    session_type = Column(String, nullable=False)      # "drilling" | "sparring" | "competition"
    duration_min = Column(Integer, nullable=False)
    partner_weight = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    technique_logs = relationship("TechniqueLog", back_populates="session", cascade="all, delete-orphan")


class TechniqueLog(Base):
    __tablename__ = "technique_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    technique_id = Column(String, nullable=False)
    position_id = Column(String, nullable=False)
    reps = Column(Integer, default=1)

    session = relationship("Session", back_populates="technique_logs")


class Proficiency(Base):
    __tablename__ = "proficiency"

    id = Column(Integer, primary_key=True, index=True)
    position_id = Column(String, nullable=False, index=True)
    technique_id = Column(String, nullable=False, unique=True, index=True)
    total_reps = Column(Integer, default=0)
    last_practiced = Column(DateTime(timezone=True), nullable=True)
    raw_score = Column(Float, default=0.0)
