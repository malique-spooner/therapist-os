from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from ...models import RawImportRow
from ...models.life_data import SpotifyPlayEventReal
from ...models.source_data import (
    ChromeHistoryEvent,
    GarminBodyMetric,
    GarminDailyWellness,
    GarminFitnessMetric,
    GarminHydrationLog,
    GarminSleepSession,
    InstagramInteraction,
    NatWestTransaction,
    RevolutTransaction,
    SnapchatInteraction,
    SpotifyPlayEvent,
    SpotifyTrack,
    YoutubeSearchEvent,
    YoutubeSubscription,
    YoutubeWatchEvent,
)


class SourceCleanerService:
    def clean_all(self, db: Session) -> dict[str, int]:
        totals: dict[str, int] = {}
        for source_id in ("garmin", "revolut", "natwest", "youtube", "chrome", "instagram", "snapchat"):
            totals[source_id] = self.clean_source(source_id, db)
        totals["spotify"] = self.clean_spotify(db)
        db.commit()
        return totals

    def clean_source(self, source_id: str, db: Session) -> int:
        rows = db.scalars(select(RawImportRow).where(RawImportRow.source_id == source_id)).all()
        count = 0
        for staged in rows:
            payload = staged.raw_payload or {}
            path = str(payload.get("path") or "")
            row = payload.get("row") if isinstance(payload.get("row"), dict) else payload
            if not isinstance(row, dict):
                continue
            made = self._clean_row(source_id, path, row, staged, db)
            if made:
                staged.status = "cleaned"
                count += made
        db.commit()
        return count

    def clean_spotify(self, db: Session) -> int:
        count = 0
        for event in db.scalars(select(SpotifyPlayEventReal)).all():
            track_hash = self._hash("spotify_track", event.track_id or event.track_name, event.artist_name)
            if event.track_id:
                track = self._upsert(db, SpotifyTrack, track_hash, spotify_track_id=event.track_id)
                track.name = event.track_name
                track.artist_name = event.artist_name
                track.album_name = event.album_name
                track.duration_ms = event.duration_ms
                track.explicit = event.explicit
                track.popularity = event.popularity
                track.spotify_url = event.external_url
                track.metadata_json = event.metadata_json
            play_hash = self._hash("spotify_play", event.played_at.isoformat(), event.track_id or event.track_name)
            play = self._upsert(db, SpotifyPlayEvent, play_hash, played_at=event.played_at)
            play.spotify_track_id = event.track_id
            play.context_type = event.context_type
            play.context_uri = event.context_uri
            play.metadata_json = event.metadata_json
            count += 1
        return count

    def _clean_row(self, source_id: str, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        if source_id == "garmin":
            return self._clean_garmin(path, row, staged, db)
        if source_id == "revolut":
            return self._clean_revolut(row.get("row", row), staged, db)
        if source_id == "natwest":
            return self._clean_natwest(row.get("row", row), staged, db)
        if source_id == "youtube":
            return self._clean_youtube(path, row, staged, db)
        if source_id == "chrome":
            return self._clean_chrome(path, row, staged, db)
        if source_id == "instagram":
            return self._clean_social(InstagramInteraction, "instagram", path, row, staged, db)
        if source_id == "snapchat":
            return self._clean_social(SnapchatInteraction, "snapchat", path, row, staged, db)
        return 0

    def _clean_garmin(self, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        if "UDSFile" in path and row.get("calendarDate"):
            record = self._upsert(db, GarminDailyWellness, staged.row_hash, date=self._date(row.get("calendarDate")))
            record.import_file_id = staged.import_id
            record.steps = self._int(row.get("totalSteps"))
            record.distance_meters = self._int(row.get("totalDistanceMeters") or row.get("wellnessDistanceMeters"))
            record.total_calories = self._float(row.get("totalKilocalories"))
            record.active_calories = self._float(row.get("activeKilocalories"))
            record.active_seconds = self._int(row.get("activeSeconds"))
            record.min_heart_rate = self._int(row.get("minHeartRate"))
            record.max_heart_rate = self._int(row.get("maxHeartRate"))
            record.resting_heart_rate = self._int(row.get("restingHeartRate"))
            record.metadata_json = row
            return 1
        if "sleepData" in path:
            sleep_date = self._date(row.get("calendarDate") or row.get("sleepStartTimestampLocal"))
            record = self._upsert(db, GarminSleepSession, staged.row_hash)
            record.import_file_id = staged.import_id
            record.sleep_date = sleep_date
            record.started_at = self._dt(row.get("sleepStartTimestampLocal") or row.get("sleepStartTimestampGMT"))
            record.ended_at = self._dt(row.get("sleepEndTimestampLocal") or row.get("sleepEndTimestampGMT"))
            record.duration_minutes = self._minutes(row.get("sleepTimeSeconds") or row.get("durationInSeconds"))
            record.deep_minutes = self._minutes(row.get("deepSleepSeconds"))
            record.light_minutes = self._minutes(row.get("lightSleepSeconds"))
            record.rem_minutes = self._minutes(row.get("remSleepSeconds"))
            record.awake_minutes = self._minutes(row.get("awakeSleepSeconds") or row.get("awakeDurationInSeconds"))
            record.sleep_score = self._float(row.get("overallSleepScore") or row.get("sleepScore"))
            record.metadata_json = row
            return 1
        if "userBioMetrics" in path:
            record = self._upsert(db, GarminBodyMetric, staged.row_hash)
            record.import_file_id = staged.import_id
            record.measured_at = self._dt(row.get("sampleDate") or row.get("calendarDate"))
            record.metric_date = self._date(row.get("calendarDate") or row.get("sampleDate"))
            record.weight_kg = self._float(row.get("weight") or row.get("weightKg"))
            record.bmi = self._float(row.get("bmi"))
            record.body_fat_percent = self._float(row.get("bodyFat"))
            record.metadata_json = row
            return 1
        if any(token in path for token in ("fitnessAgeData", "RunRacePredictions", "MetricsMaxMetData")):
            record = self._upsert(db, GarminFitnessMetric, staged.row_hash, metric_type=path.split("/")[-1].split("_")[0])
            record.import_file_id = staged.import_id
            record.metric_date = self._date(row.get("calendarDate") or row.get("date") or row.get("predictionDate"))
            record.value = self._first_float(row)
            record.metadata_json = row
            return 1
        if "HydrationLogFile" in path:
            record = self._upsert(db, GarminHydrationLog, staged.row_hash)
            record.import_file_id = staged.import_id
            record.logged_at = self._dt(row.get("eventTimeLocal") or row.get("calendarDate"))
            record.log_date = self._date(row.get("calendarDate") or row.get("eventTimeLocal"))
            record.volume_ml = self._float(row.get("valueInML") or row.get("volumeML") or row.get("amount"))
            record.metadata_json = row
            return 1
        return 0

    def _clean_revolut(self, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        amount = self._money(row.get("Amount"))
        if amount is None or not row.get("Started Date"):
            return 0
        uid = self._hash("revolut", row)
        record = self._upsert(db, RevolutTransaction, staged.row_hash, transaction_uid=uid)
        record.import_file_id = staged.import_id
        record.occurred_at = self._dt(row.get("Started Date"))
        record.completed_at = self._dt(row.get("Completed Date"))
        record.type = row.get("Type")
        record.product = row.get("Product")
        record.description = row.get("Description")
        record.amount_minor = amount
        record.fee_minor = self._money(row.get("Fee"))
        record.currency = row.get("Currency")
        record.state = row.get("State")
        record.balance_minor = self._money(row.get("Balance"))
        record.metadata_json = row
        return 1

    def _clean_natwest(self, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        value = self._money(row.get("Value"))
        occurred = self._date(row.get("Date"), "%d %b %Y")
        if value is None or not occurred:
            return 0
        uid = self._hash("natwest", row)
        record = self._upsert(db, NatWestTransaction, staged.row_hash, transaction_uid=uid)
        record.import_file_id = staged.import_id
        record.occurred_on = occurred
        record.type = row.get("Type")
        record.description = row.get("Description")
        record.value_minor = value
        record.balance_minor = self._money(row.get("Balance"))
        record.account_name = row.get("Account Name")
        record.account_ref = row.get("Account Number")
        record.metadata_json = row
        return 1

    def _clean_youtube(self, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        if "watch-history" in path.lower():
            record = self._upsert(db, YoutubeWatchEvent, staged.row_hash)
            record.import_file_id = staged.import_id
            record.watched_at = self._dt(row.get("time") or row.get("Time"))
            record.title = row.get("title") or row.get("Title")
            record.video_url = row.get("titleUrl") or row.get("Video URL")
            subtitles = row.get("subtitles") if isinstance(row.get("subtitles"), list) else []
            if subtitles:
                record.channel_name = subtitles[0].get("name")
                record.channel_url = subtitles[0].get("url")
            record.metadata_json = row
            return 1
        if "search-history" in path.lower():
            record = self._upsert(db, YoutubeSearchEvent, staged.row_hash)
            record.import_file_id = staged.import_id
            record.searched_at = self._dt(row.get("time") or row.get("Time"))
            record.query = row.get("title") or row.get("query") or row.get("Search Query")
            record.metadata_json = row
            return 1
        if "subscriptions" in path.lower():
            record = self._upsert(db, YoutubeSubscription, staged.row_hash)
            record.import_file_id = staged.import_id
            record.channel_id = row.get("Channel Id") or row.get("channelId")
            record.channel_url = row.get("Channel Url") or row.get("Channel URL")
            record.channel_title = row.get("Channel Title") or row.get("Title")
            record.metadata_json = row
            return 1
        return 0

    def _clean_chrome(self, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        if "Chrome/History.json" not in path:
            return 0
        url = row.get("url") or row.get("URL")
        record = self._upsert(db, ChromeHistoryEvent, staged.row_hash)
        record.import_file_id = staged.import_id
        record.visited_at = self._chrome_time(row.get("time_usec") or row.get("time"))
        record.url = url
        record.title = row.get("title") or row.get("Title")
        record.domain = urlparse(str(url)).netloc.replace("www.", "") if url else None
        record.metadata_json = row
        return 1

    def _clean_social(self, model: type, source_id: str, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        text = row.get("text") or row.get("Text") or row.get("Message") or row.get("title") or row.get("cells")
        if text is None and not path:
            return 0
        record = self._upsert(db, model, staged.row_hash, interaction_type=self._interaction_type(source_id, path))
        record.import_file_id = staged.import_id
        record.occurred_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
        record.actor = row.get("sender") or row.get("Sender") or row.get("From") or row.get("User") or row.get("username")
        record.text = str(text)[:5000] if text is not None else None
        record.path = path
        record.metadata_json = row
        return 1

    @staticmethod
    def _upsert(db: Session, model: type, source_row_hash: str, **required: Any):
        record = db.scalar(select(model).where(model.source_row_hash == source_row_hash))
        if record is None:
            record = model(source_row_hash=source_row_hash, **required)
            db.add(record)
        for key, value in required.items():
            setattr(record, key, value)
        return record

    @staticmethod
    def _hash(*parts: Any) -> str:
        return hashlib.sha256(repr(parts).encode("utf-8")).hexdigest()

    @staticmethod
    def _dt(value: Any) -> datetime | None:
        if not value:
            return None
        text = str(value).replace("Z", "+00:00")
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d"):
            try:
                return datetime.strptime(str(value), fmt)
            except ValueError:
                pass
        try:
            return datetime.fromisoformat(text).replace(tzinfo=None)
        except ValueError:
            return None

    def _date(self, value: Any, fmt: str | None = None) -> date | None:
        if not value:
            return None
        if fmt:
            try:
                return datetime.strptime(str(value), fmt).date()
            except ValueError:
                return None
        parsed = self._dt(value)
        return parsed.date() if parsed else None

    @staticmethod
    def _int(value: Any) -> int | None:
        try:
            return int(float(value)) if value not in (None, "") else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _float(value: Any) -> float | None:
        try:
            return float(value) if value not in (None, "") else None
        except (TypeError, ValueError):
            return None

    def _first_float(self, row: dict[str, Any]) -> float | None:
        for value in row.values():
            parsed = self._float(value)
            if parsed is not None:
                return parsed
        return None

    def _minutes(self, seconds: Any) -> int | None:
        parsed = self._int(seconds)
        return int(parsed / 60) if parsed is not None else None

    @staticmethod
    def _money(value: Any) -> int | None:
        if value in (None, ""):
            return None
        try:
            return int(Decimal(str(value).replace(",", "").strip()) * 100)
        except (InvalidOperation, ValueError):
            return None

    @staticmethod
    def _chrome_time(value: Any) -> datetime | None:
        try:
            raw = int(value)
        except (TypeError, ValueError):
            return None
        return datetime(1601, 1, 1) + timedelta(microseconds=raw)

    @staticmethod
    def _interaction_type(source_id: str, path: str) -> str:
        lower = path.lower()
        if source_id == "snapchat":
            if "chat_history" in lower:
                return "chat"
            if "snap_history" in lower:
                return "snap"
        if "message" in lower or "inbox" in lower:
            return "message"
        if "like" in lower:
            return "like"
        if "comment" in lower:
            return "comment"
        return "event"
