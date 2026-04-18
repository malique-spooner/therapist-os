from __future__ import annotations

from datetime import date, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...core.logging import get_logger
from ...models.life_data import WeatherDataReal
from ...models.source_data import OpenWeatherDaily, OpenWeatherHourly

logger = get_logger(__name__)


class WeatherIngestionService:
    BASE_URL = "https://api.openweathermap.org/data/3.0/onecall"

    def __init__(self, config: dict[str, str] | None = None) -> None:
        self._config = config or {}

    @property
    def _api_key(self) -> str:
        return self._config.get("api_key") or settings.OPENWEATHER_API_KEY

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def sync_today(self, db: Session) -> WeatherDataReal:
        return await self.sync_date(date.today(), db)

    async def sync_date(self, target_date: date, db: Session) -> WeatherDataReal:
        if not self.is_configured:
            raise RuntimeError("OPENWEATHER_API_KEY is not configured")

        params = {
            "lat": settings.USER_LATITUDE,
            "lon": settings.USER_LONGITUDE,
            "appid": self._api_key,
            "units": "metric",
        }

        async with httpx.AsyncClient(timeout=20) as client:
            if target_date == date.today():
                response = await client.get(self.BASE_URL, params={**params, "exclude": "minutely,alerts"})
                response.raise_for_status()
                payload = response.json()
                day_payload = payload["daily"][0]
                hourly_payload = payload.get("hourly", [])
            else:
                timestamp = int(datetime.combine(target_date, datetime.min.time()).timestamp())
                response = await client.get(f"{self.BASE_URL}/timemachine", params={**params, "dt": timestamp})
                response.raise_for_status()
                payload = response.json()
                daily = payload.get("data", [])
                if not daily:
                    raise RuntimeError("Historical weather data unavailable for requested date")
                temps = [entry.get("temp", 0.0) for entry in daily]
                day_payload = {
                    "sunrise": daily[0].get("sunrise"),
                    "sunset": daily[0].get("sunset"),
                    "temp": {"min": min(temps), "max": max(temps)},
                    "weather": [daily[0].get("weather", [{}])[0]],
                    "uvi": max((entry.get("uvi", 0.0) for entry in daily), default=0.0),
                }
                hourly_payload = daily

        sunrise = datetime.fromtimestamp(day_payload["sunrise"])
        sunset = datetime.fromtimestamp(day_payload["sunset"])
        condition = (day_payload.get("weather") or [{}])[0].get("main", "").lower() or None
        self._upsert_openweather_daily(target_date, sunrise, sunset, day_payload, condition, db)
        self._upsert_openweather_hourly(target_date, hourly_payload, db)
        record = db.scalar(select(WeatherDataReal).where(WeatherDataReal.date == target_date))
        if not record:
            record = WeatherDataReal(date=target_date, sunrise_time=sunrise.time(), sunset_time=sunset.time(), daylight_hours=0)
            db.add(record)

        record.sunrise_time = sunrise.time()
        record.sunset_time = sunset.time()
        record.daylight_hours = round((sunset - sunrise).total_seconds() / 3600, 1)
        record.temperature_high_c = day_payload.get("temp", {}).get("max")
        record.temperature_low_c = day_payload.get("temp", {}).get("min")
        record.condition = condition
        record.uv_index = day_payload.get("uvi")
        db.commit()
        db.refresh(record)
        logger.info(
            "weather_synced",
            extra={
                "event": "weather_synced",
                "extra_data": {
                    "date": target_date.isoformat(),
                    "condition": condition,
                },
            },
        )
        return record

    def _upsert_openweather_daily(
        self,
        target_date: date,
        sunrise: datetime,
        sunset: datetime,
        day_payload: dict,
        condition: str | None,
        db: Session,
    ) -> None:
        source_row_hash = self._daily_hash(target_date)
        record = db.scalar(select(OpenWeatherDaily).where(OpenWeatherDaily.source_row_hash == source_row_hash))
        if not record:
            record = OpenWeatherDaily(source_row_hash=source_row_hash, date=target_date)
            db.add(record)
            db.flush()
        record.updated_at = datetime.utcnow()
        record.date = target_date
        record.sunrise_time = sunrise
        record.sunset_time = sunset
        record.daylight_hours = round((sunset - sunrise).total_seconds() / 3600, 1)
        record.temperature_high_c = day_payload.get("temp", {}).get("max")
        record.temperature_low_c = day_payload.get("temp", {}).get("min")
        record.condition = condition
        record.uv_index = day_payload.get("uvi")
        record.payload_json = day_payload

    def _upsert_openweather_hourly(self, target_date: date, hourly_payload: list[dict], db: Session) -> None:
        for item in hourly_payload:
            timestamp = item.get("dt") or item.get("time")
            if timestamp is None:
                continue
            observed_at = datetime.fromtimestamp(int(timestamp))
            source_row_hash = self._hourly_hash(target_date, observed_at)
            record = db.scalar(select(OpenWeatherHourly).where(OpenWeatherHourly.source_row_hash == source_row_hash))
            if not record:
                record = OpenWeatherHourly(source_row_hash=source_row_hash, observed_at=observed_at, date=observed_at.date())
                db.add(record)
                db.flush()
            weather = (item.get("weather") or [{}])[0]
            record.updated_at = datetime.utcnow()
            record.observed_at = observed_at
            record.date = observed_at.date()
            record.temperature_c = item.get("temp")
            record.feels_like_c = item.get("feels_like")
            record.humidity = item.get("humidity")
            record.condition = weather.get("main") or weather.get("description")
            record.uv_index = item.get("uvi")
            record.precipitation_mm = item.get("rain", {}).get("1h") if isinstance(item.get("rain"), dict) else item.get("rain")
            record.payload_json = item

    @staticmethod
    def _daily_hash(target_date: date) -> str:
        return f"openweather-daily:{target_date.isoformat()}"

    @staticmethod
    def _hourly_hash(target_date: date, observed_at: datetime) -> str:
        return f"openweather-hourly:{target_date.isoformat()}:{int(observed_at.timestamp())}"

    async def sync_recent_days(self, db: Session, days: int = 5) -> list[WeatherDataReal]:
        records: list[WeatherDataReal] = []
        start = date.today() - timedelta(days=days - 1)
        for offset in range(days):
            target = start + timedelta(days=offset)
            records.append(await self.sync_date(target, db))
        return records
