from __future__ import annotations

from datetime import date, datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...core.logging import get_logger
from ...models import WeatherData

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

    async def sync_today(self, db: Session) -> WeatherData:
        return await self.sync_date(date.today(), db)

    async def sync_date(self, target_date: date, db: Session) -> WeatherData:
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
                response = await client.get(self.BASE_URL, params={**params, "exclude": "minutely,hourly,alerts"})
                response.raise_for_status()
                payload = response.json()
                day_payload = payload["daily"][0]
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

        sunrise = datetime.fromtimestamp(day_payload["sunrise"])
        sunset = datetime.fromtimestamp(day_payload["sunset"])
        condition = (day_payload.get("weather") or [{}])[0].get("main", "").lower() or None
        record = db.scalar(select(WeatherData).where(WeatherData.date == target_date))
        if not record:
            record = WeatherData(date=target_date, sunrise_time=sunrise.time(), sunset_time=sunset.time(), daylight_hours=0)
            db.add(record)

        record.sunrise_time = sunrise.time()
        record.sunset_time = sunset.time()
        record.daylight_hours = round((sunset - sunrise).total_seconds() / 3600, 1)
        record.temperature_high_c = day_payload.get("temp", {}).get("max")
        record.temperature_low_c = day_payload.get("temp", {}).get("min")
        record.condition = condition
        record.uv_index = day_payload.get("uvi")
        record.is_demo = False
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

    async def sync_recent_days(self, db: Session, days: int = 5) -> list[WeatherData]:
        records: list[WeatherData] = []
        start = date.today() - timedelta(days=days - 1)
        for offset in range(days):
            target = start + timedelta(days=offset)
            records.append(await self.sync_date(target, db))
        return records
