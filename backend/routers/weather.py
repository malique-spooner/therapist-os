from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models import WeatherData
from ..services.ingestion.weather import WeatherIngestionService
from ..services.periods import date_window

router = APIRouter(prefix="/weather", tags=["weather"], dependencies=[Depends(verify_api_key)])
service = WeatherIngestionService()


def _serialize(record: WeatherData) -> dict:
    return {
        "date": record.date.isoformat(),
        "sunriseTime": record.sunrise_time.isoformat(),
        "sunsetTime": record.sunset_time.isoformat(),
        "daylightHours": record.daylight_hours,
        "temperatureHighC": record.temperature_high_c,
        "temperatureLowC": record.temperature_low_c,
        "condition": record.condition,
        "uvIndex": record.uv_index,
    }


@router.get("/today")
def get_weather_today(db: Session = Depends(get_db)) -> dict:
    record = db.scalar(select(WeatherData).order_by(WeatherData.date.desc()))
    if not record:
        raise HTTPException(status_code=404, detail="Weather data not available")
    return _serialize(record)


@router.get("")
def get_weather(period: str = "this-week", db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    records = db.scalars(select(WeatherData).where(WeatherData.date.between(start, end)).order_by(WeatherData.date)).all()
    return [_serialize(record) for record in records]


@router.post("/sync")
async def sync_weather(db: Session = Depends(get_db)) -> dict:
    try:
        record = await service.sync_today(db)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"detail": "Weather synced", "date": record.date.isoformat()}
