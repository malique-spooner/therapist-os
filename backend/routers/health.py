from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import HealthData
from ..services.data_sources import DataSourceService
from ..services.ingestion.garmin import GarminIngestionService
from ..services.periods import date_window

router = APIRouter(prefix="/health", tags=["health"], dependencies=[Depends(verify_api_key)])
service = GarminIngestionService()
data_source_service = DataSourceService()


def _serialize(row: HealthData) -> dict:
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
def get_health(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    rows = db.scalars(select(HealthData).where(HealthData.date.between(start, end)).order_by(HealthData.date)).all()
    return [_serialize(row) for row in rows]


@router.get("/today")
def get_health_today(db: Session = Depends(get_db)) -> dict:
    row = db.scalar(select(HealthData).order_by(HealthData.date.desc()))
    if not row:
        raise HTTPException(status_code=404, detail="Health data not available")
    return _serialize(row)


@router.post("/sync")
async def sync_health(db: Session = Depends(get_db)) -> dict:
    try:
        records = await service.sync_last_7_days(db)
    except RuntimeError as exc:
        data_source_service.mark_sync_result("garmin", success=False, db=db, error=str(exc))
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    data_source_service.mark_sync_result("garmin", success=True, db=db)
    return {
        "detail": "Health synced",
        "daysSynced": len(records),
        "latestDate": records[-1].date.isoformat() if records else None,
    }
