from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import HealthDataDemo, HealthDataReal
from ..services.data_mode import read_dataset_model
from ..services.periods import date_window

router = APIRouter(prefix="/health", tags=["health"], dependencies=[Depends(verify_api_key)])


def _serialize(row) -> dict:
    return {
        "date": row.date.isoformat(),
        "steps": row.steps or 0,
        "sleepDuration": row.sleep_duration_hours or 0,
        "sleepQuality": row.sleep_quality or 0,
        "hrv": row.hrv_ms or 0,
        "restingHR": row.resting_hr or 0,
        "hadWorkout": row.workout_logged,
        "workoutType": row.workout_type,
        "workoutDurationMinutes": row.workout_duration_minutes or 0,
    }


@router.get("")
def get_health(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    health_model = read_dataset_model(mode, HealthDataReal, HealthDataDemo)
    rows = db.scalars(
        select(health_model)
        .where(health_model.date.between(start, end))
        .order_by(health_model.date)
    ).all()
    return [_serialize(row) for row in rows]


@router.get("/today")
def get_health_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    health_model = read_dataset_model(mode, HealthDataReal, HealthDataDemo)
    row = db.scalar(select(health_model).order_by(health_model.date.desc()))
    if not row:
        raise HTTPException(status_code=404, detail="Health data not available")
    return _serialize(row)


@router.post("/sync")
async def sync_health(db: Session = Depends(get_db)) -> dict:
    raise HTTPException(
        status_code=405,
        detail="Garmin sync is automatic only. Therapist OS runs it once per day in the background.",
    )
