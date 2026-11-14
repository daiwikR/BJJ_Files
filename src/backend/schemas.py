from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

SESSION_TYPES = "^(class|drilling|sparring|open_mat|competition|private)$"
BELTS = "^(white|blue|purple|brown|black)$"


class TechniqueLogIn(BaseModel):
    technique_id: str
    position_id: str
    reps: int = Field(default=1, ge=1)


class SessionIn(BaseModel):
    gi_nogi: str = Field(..., pattern="^(gi|nogi)$")
    session_type: str = Field(..., pattern=SESSION_TYPES)
    duration_min: int = Field(..., ge=5, le=480)
    intensity: int = Field(default=6, ge=1, le=10)
    day: Optional[date] = None
    partner_weight: Optional[str] = None
    notes: Optional[str] = None
    techniques: List[TechniqueLogIn] = []


class TechniqueLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    technique_id: str
    position_id: str
    reps: int


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: datetime
    gi_nogi: str
    session_type: str
    duration_min: int
    intensity: Optional[int] = None
    partner_weight: Optional[str] = None
    notes: Optional[str] = None
    technique_logs: List[TechniqueLogOut] = []


class ProfileIn(BaseModel):
    name: Optional[str] = None
    belt: str = Field("white", pattern=BELTS)
    stripes: int = Field(0, ge=0, le=4)
    belt_started_on: Optional[date] = None
    level_started_on: Optional[date] = None
    banked_hours: float = Field(0, ge=0, le=5000)   # hours already trained in the current stage
    classes_per_day: int = Field(1, ge=1, le=3)
    days_per_week: int = Field(3, ge=1, le=7)
    class_minutes: int = Field(90, ge=30, le=180)
    age: Optional[int] = Field(None, ge=10, le=90)
    sex: Optional[str] = Field(None, pattern="^(male|female)$")
    weight_kg: Optional[float] = Field(None, ge=30, le=250)
    height_cm: Optional[float] = Field(None, ge=120, le=230)
    goal: str = Field("maintain", pattern="^(cut|maintain|gain)$")
    sleep_need_h: float = Field(8.0, ge=6, le=10)
    sync_rank: bool = True    # False = keep rank and stage progress, only update the other fields


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: Optional[str]
    belt: str
    stripes: int
    belt_started_on: Optional[date]
    level_started_on: Optional[date]
    classes_per_day: int
    days_per_week: int
    class_minutes: int
    age: Optional[int]
    sex: Optional[str]
    weight_kg: Optional[float]
    height_cm: Optional[float]
    goal: str
    sleep_need_h: float


class CompetencyToggle(BaseModel):
    stage_key: str
    item_id: str
    checked: bool


class CheckInIn(BaseModel):
    soreness: int = Field(1, ge=1, le=5)
    fatigue: int = Field(1, ge=1, le=5)
    stress: int = Field(1, ge=1, le=5)
    mood: int = Field(1, ge=1, le=5)
    illness: str = Field("none", pattern="^(none|head_cold|systemic)$")
    notes: Optional[str] = None


class SleepIn(BaseModel):
    screen_off: datetime
    screen_on: datetime
    source: str = Field("screen", pattern="^(screen|diary|tap)$")
    latency_min: int = Field(15, ge=0, le=180)
    awake_min: int = Field(0, ge=0, le=300)
    night_pickups: int = Field(0, ge=0, le=30)
    quality: int = Field(3, ge=1, le=5)
    notes: Optional[str] = None


class TapIn(BaseModel):
    at: Optional[datetime] = None


class UserInjuryIn(BaseModel):
    injury_slug: str
    side: Optional[str] = Field(None, pattern="^(left|right|both)$")
    severity: str = Field("mild", pattern="^(mild|moderate|severe)$")
    started_on: Optional[date] = None
    pain: int = Field(3, ge=0, le=10)
    notes: Optional[str] = None


class UserInjuryPatch(BaseModel):
    phase_index: Optional[int] = Field(None, ge=0)
    pain: Optional[int] = Field(None, ge=0, le=10)
    severity: Optional[str] = Field(None, pattern="^(mild|moderate|severe)$")
    criteria_done: Optional[List[str]] = None
    status: Optional[str] = Field(None, pattern="^(active|resolved)$")
    notes: Optional[str] = None


class FoodLogIn(BaseModel):
    day: Optional[date] = None
    meal: str = Field("meal", pattern="^(breakfast|lunch|dinner|snack|pre|post|meal)$")
    food_id: Optional[int] = None
    grams: Optional[float] = Field(None, gt=0, le=5000)
    # Manual entry (used when food_id is not given)
    name: Optional[str] = None
    kcal: Optional[float] = Field(None, ge=0, le=10000)
    protein: Optional[float] = Field(None, ge=0, le=1000)
    carbs: Optional[float] = Field(None, ge=0, le=2000)
    fat: Optional[float] = Field(None, ge=0, le=1000)


class WaterIn(BaseModel):
    day: Optional[date] = None
    ml: int = Field(..., ge=50, le=5000)


class CustomFoodIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    category: str = "custom"
    kcal: float = Field(..., ge=0, le=900)
    protein: float = Field(..., ge=0, le=100)
    carbs: float = Field(..., ge=0, le=100)
    fat: float = Field(..., ge=0, le=100)
    serving_g: float = Field(100, gt=0, le=2000)
    serving_label: Optional[str] = None
