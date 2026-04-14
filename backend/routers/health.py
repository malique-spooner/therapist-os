from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import HealthDataReal
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
    rows = db.scalars(
        select(HealthDataReal)
        .where(HealthDataReal.date.between(start, end))
        .order_by(HealthDataReal.date)
    ).all()
    return [_serialize(row) for row in rows]


@router.get("/today")
def get_health_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(HealthDataReal).order_by(HealthDataReal.date.desc()))
    if not row:
        raise HTTPException(status_code=404, detail="Health data not available")
    return _serialize(row)


@router.post("/sync")
async def sync_health(db: Session = Depends(get_db)) -> dict:
    raise HTTPException(
        status_code=405,
        detail="Garmin sync is automatic only. Therapist OS runs it once per day in the background.",
    )
