from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


# ─── Training ────────────────────────────────────────────────────────────────

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    gi_nogi = Column(String, nullable=False)          # "gi" | "nogi"
    session_type = Column(String, nullable=False)     # see schemas.SESSION_TYPES
    duration_min = Column(Integer, nullable=False)
    intensity = Column(Integer, nullable=True)        # session RPE, 1-10
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


# ─── Athlete profile & progression ───────────────────────────────────────────

class Profile(Base):
    """Single-row table: this is a one-athlete, local-first app."""
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=True)
    belt = Column(String, nullable=False, default="white")     # white|blue|purple|brown|black
    stripes = Column(Integer, nullable=False, default=0)       # 0-4
    belt_started_on = Column(Date, nullable=True)              # when the current belt was tied on
    level_started_on = Column(Date, nullable=True)             # when the current stripe stage began
    # Mat hours already "spent" on completed stages. Hours in the current stage are
    # (all logged hours - hours_consumed). Can be negative to credit prior training.
    hours_consumed = Column(Float, nullable=False, default=0.0)

    # Schedule the roadmap is built from
    classes_per_day = Column(Integer, nullable=False, default=1)
    days_per_week = Column(Integer, nullable=False, default=3)
    class_minutes = Column(Integer, nullable=False, default=90)

    # Body data for recovery + fuelling maths (all metric)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)            # "male" | "female" | None
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    goal = Column(String, nullable=False, default="maintain")  # cut | maintain | gain
    sleep_need_h = Column(Float, nullable=False, default=8.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompetencyCheck(Base):
    __tablename__ = "competency_checks"
    __table_args__ = (UniqueConstraint("stage_key", "item_id"),)

    id = Column(Integer, primary_key=True)
    stage_key = Column(String, nullable=False, index=True)   # e.g. "white-0"
    item_id = Column(String, nullable=False)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())


class Award(Base):
    __tablename__ = "awards"

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True)   # e.g. "stripe:white-1", "streak:4"
    kind = Column(String, nullable=False)               # stripe | belt_ready | belt | consistency
    title = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    belt = Column(String, nullable=True)
    stripes = Column(Integer, nullable=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    seen = Column(Boolean, nullable=False, default=False)


# ─── Recovery ────────────────────────────────────────────────────────────────

class CheckIn(Base):
    """Daily body check-in. All 1-5 scales are stored as 1 = best, 5 = worst."""
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True)
    day = Column(Date, nullable=False, unique=True, index=True)
    soreness = Column(Integer, nullable=False, default=1)
    fatigue = Column(Integer, nullable=False, default=1)
    stress = Column(Integer, nullable=False, default=1)
    mood = Column(Integer, nullable=False, default=1)
    illness = Column(String, nullable=False, default="none")   # none | head_cold | systemic
    notes = Column(Text, nullable=True)


class SleepLog(Base):
    """One row per night, keyed by the date you woke up."""
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True)
    day = Column(Date, nullable=False, unique=True, index=True)
    source = Column(String, nullable=False, default="screen")  # screen | diary | tap
    screen_off = Column(DateTime, nullable=False)   # last phone use / lights out (local time)
    screen_on = Column(DateTime, nullable=False)    # first pickup / out of bed (local time)
    latency_min = Column(Integer, nullable=False, default=15)   # time to fall asleep
    awake_min = Column(Integer, nullable=False, default=0)      # awake during the night
    night_pickups = Column(Integer, nullable=False, default=0)
    quality = Column(Integer, nullable=False, default=3)        # 1 = terrible … 5 = great
    notes = Column(Text, nullable=True)


class SleepTap(Base):
    """Pending 'lights out' tap waiting for its matching 'I'm up' tap."""
    __tablename__ = "sleep_taps"

    id = Column(Integer, primary_key=True)
    lights_out = Column(DateTime, nullable=False)


class Injury(Base):
    """Injury library, seeded from config/injuries.json."""
    __tablename__ = "injuries"

    id = Column(Integer, primary_key=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    region = Column(String, nullable=False, index=True)
    data = Column(Text, nullable=False)    # full JSON document


class UserInjury(Base):
    __tablename__ = "user_injuries"

    id = Column(Integer, primary_key=True)
    injury_slug = Column(String, nullable=False, index=True)
    side = Column(String, nullable=True)             # left | right | both | None
    severity = Column(String, nullable=False, default="mild")   # mild | moderate | severe
    started_on = Column(Date, nullable=False)
    phase_index = Column(Integer, nullable=False, default=0)
    pain = Column(Integer, nullable=False, default=3)           # 0-10 right now
    criteria_done = Column(Text, nullable=False, default="[]")  # JSON list of "phase:idx"
    status = Column(String, nullable=False, default="active")   # active | resolved
    resolved_on = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)


# ─── Fuel ────────────────────────────────────────────────────────────────────

class Food(Base):
    """Food library (values per 100 g / 100 mL), seeded from config/foods.json."""
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True, index=True)
    category = Column(String, nullable=False)
    kcal = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    serving_g = Column(Float, nullable=False, default=100)
    serving_label = Column(String, nullable=True)
    custom = Column(Boolean, nullable=False, default=False)


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True)
    day = Column(Date, nullable=False, index=True)
    meal = Column(String, nullable=False, default="meal")  # breakfast|lunch|dinner|snack|pre|post
    name = Column(String, nullable=False)
    grams = Column(Float, nullable=True)
    kcal = Column(Float, nullable=False, default=0)
    protein = Column(Float, nullable=False, default=0)
    carbs = Column(Float, nullable=False, default=0)
    fat = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WaterLog(Base):
    __tablename__ = "water_logs"

    id = Column(Integer, primary_key=True)
    day = Column(Date, nullable=False, index=True)
    ml = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
