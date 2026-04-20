from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.auth import verify_api_key
from ..models.life_data import WeatherDataDemo, WeatherDataReal
from ..services.data_sources import DataSourceService
from ..services.ingestion.weather import WeatherIngestionService
from ..services.data_mode import read_dataset_model
from ..services.periods import date_window

router = APIRouter(prefix="/weather", tags=["weather"], dependencies=[Depends(verify_api_key)])
data_source_service = DataSourceService()


def _serialize(record) -> dict:
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
def get_weather_today(mode: str | None = None, db: Session = Depends(get_db)) -> dict:
    weather_model = read_dataset_model(mode, WeatherDataReal, WeatherDataDemo)
    record = db.scalar(select(weather_model).order_by(weather_model.date.desc()))
    if not record:
        raise HTTPException(status_code=404, detail="Weather data not available")
    return _serialize(record)


@router.get("")
def get_weather(period: str = "this-week", mode: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    start, end = date_window(period)
    weather_model = read_dataset_model(mode, WeatherDataReal, WeatherDataDemo)
    records = db.scalars(select(weather_model).where(weather_model.date.between(start, end)).order_by(weather_model.date)).all()
    return [_serialize(record) for record in records]


@router.post("/sync")
async def sync_weather(db: Session = Depends(get_db)) -> dict:
    try:
        service = WeatherIngestionService(data_source_service.get_runtime_config("weather", db))
        record = await service.sync_today(db)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"detail": "Weather synced", "date": record.date.isoformat()}
