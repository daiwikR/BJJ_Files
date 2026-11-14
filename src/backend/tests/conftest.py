import os
import tempfile

# Point the app at a throwaway database before anything imports it.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["BJJ_DB_URL"] = f"sqlite:///{_tmp.name}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from src.backend import models  # noqa: E402
from src.backend.database import SessionLocal  # noqa: E402
from src.backend.main import app  # noqa: E402

_USER_TABLES = [models.TechniqueLog, models.Session, models.Proficiency, models.Profile, models.CompetencyCheck,
                models.Award, models.CheckIn, models.SleepLog, models.SleepTap, models.UserInjury,
                models.FoodLog, models.WaterLog]


@pytest.fixture()
def client():
    db = SessionLocal()
    for t in _USER_TABLES:
        db.query(t).delete()
    db.commit()
    db.close()
    return TestClient(app)
