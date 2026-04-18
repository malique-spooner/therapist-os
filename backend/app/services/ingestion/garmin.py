from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from garminconnect import Garmin
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...core.logging import get_logger
from ...models.life_data import HealthDataReal

logger = get_logger(__name__)


class GarminIngestionService:
    def __init__(self, config: dict[str, str] | None = None) -> None:
        self._client: Garmin | None = None
        self._config = config or {}

    @property
    def is_configured(self) -> bool:
        return bool(self._email and self._password)

    @property
    def _email(self) -> str:
        return self._config.get("email") or settings.GARMIN_EMAIL

    @property
    def _password(self) -> str:
        return self._config.get("password") or settings.GARMIN_PASSWORD

    def _ensure_client(self) -> Garmin:
        if not self.is_configured:
            raise RuntimeError("Garmin credentials are not configured")
        if self._client is None:
            try:
                client = Garmin(self._email, self._password)
                client.login()
                self._client = client
            except AssertionError as exc:
                raise RuntimeError(
                    "Garmin sync succeeded partway but no profile was returned. This usually means the underlying source changed, the export is incomplete, or the account needs extra verification."
                ) from exc
            except Exception as exc:
                message = str(exc)
                if "429" in message or "Too Many Requests" in message:
                    raise RuntimeError(
                        "Garmin is rate-limiting sync attempts right now (429 Too Many Requests). Wait a bit, then try syncing again."
                    ) from exc
                raise RuntimeError(f"Garmin sync failed: {message}") from exc
        return self._client

    @staticmethod
    def _date_str(target_date: date) -> str:
        return target_date.isoformat()

    def _fetch_stats(self, target_date: date) -> dict[str, Any]:
        client = self._ensure_client()
        return client.get_stats(self._date_str(target_date))

    def _fetch_sleep(self, target_date: date) -> dict[str, Any]:
        client = self._ensure_client()
        return client.get_sleep_data(self._date_str(target_date))

    def _fetch_hrv(self, target_date: date) -> dict[str, Any]:
        client = self._ensure_client()
        return client.get_hrv_data(self._date_str(target_date))

    def _fetch_resting_hr(self, target_date: date) -> int | None:
        client = self._ensure_client()
        try:
            return client.get_rhr_day(self._date_str(target_date))
        except AttributeError:
            return None

    def _fetch_activities(self, target_date: date) -> list[dict[str, Any]]:
        client = self._ensure_client()
        try:
            return client.get_activities_by_date(self._date_str(target_date), self._date_str(target_date))
        except AttributeError:
            return []

    @staticmethod
    def _extract_sleep_hours(payload: dict[str, Any]) -> float | None:
        seconds = payload.get("dailySleepDTO", {}).get("sleepTimeSeconds")
        if not seconds:
            return None
        return round(seconds / 3600, 2)

    @staticmethod
    def _extract_sleep_score(payload: dict[str, Any]) -> float | None:
        return payload.get("dailySleepDTO", {}).get("sleepScores", {}).get("overall")

    @staticmethod
    def _extract_steps(payload: dict[str, Any]) -> int | None:
        return payload.get("totalSteps")

    @staticmethod
    def _extract_hrv(payload: dict[str, Any]) -> float | None:
        hrv_summary = payload.get("hrvSummary") or {}
        value = hrv_summary.get("lastNightAvg") or hrv_summary.get("weeklyAvg")
        return float(value) if value is not None else None

    @staticmethod
    def _extract_activity_summary(activities: list[dict[str, Any]]) -> tuple[bool, str | None, int | None]:
        if not activities:
            return False, None, None
        primary = max(activities, key=lambda item: item.get("duration", 0))
        duration_seconds = primary.get("duration")
        duration_minutes = round(duration_seconds / 60) if duration_seconds else None
        workout_type = primary.get("activityType", {}).get("typeKey") or primary.get("activityName")
        return True, workout_type, duration_minutes

    async def sync_last_7_days(self, db: Session) -> list[HealthDataReal]:
        records: list[HealthDataReal] = []
        for offset in range(6, -1, -1):
            records.append(await self.sync_date(date.today() - timedelta(days=offset), db))
        return records

    async def sync_date(self, target_date: date, db: Session) -> HealthDataReal:
        stats = self._fetch_stats(target_date)
        sleep = self._fetch_sleep(target_date)
        hrv = self._fetch_hrv(target_date)
        resting_hr = self._fetch_resting_hr(target_date)
        activities = self._fetch_activities(target_date)

        had_workout, workout_type, workout_duration = self._extract_activity_summary(activities)

        record = db.scalar(select(HealthDataReal).where(HealthDataReal.date == target_date))
        if not record:
            record = HealthDataReal(date=target_date)
            db.add(record)

        record.steps = self._extract_steps(stats) or record.steps or 0
        record.sleep_duration_hours = self._extract_sleep_hours(sleep) or record.sleep_duration_hours or 0
        record.sleep_quality = self._extract_sleep_score(sleep) or record.sleep_quality or 0
        record.hrv_ms = self._extract_hrv(hrv) or record.hrv_ms or 0
        if resting_hr is not None:
            record.resting_hr = resting_hr
        record.workout_logged = had_workout
        record.workout_type = workout_type
        record.workout_duration_minutes = workout_duration or 0
        db.commit()
        db.refresh(record)

        logger.info(
            "garmin_health_synced",
            extra={
                "event": "garmin_health_synced",
                "extra_data": {
                    "date": target_date.isoformat(),
                    "steps": record.steps,
                    "workout_logged": record.workout_logged,
                },
            },
        )
        return record
