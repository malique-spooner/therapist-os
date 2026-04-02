from __future__ import annotations

from datetime import datetime
from typing import Callable

from sqlalchemy.orm import Session

from ..models import DataSourceConnection
from .ingestion.garmin import GarminIngestionService
from .ingestion.spotify import SpotifyIngestionService
from .ingestion.truelayer import TrueLayerIngestionService
from .whisper_service import WhisperService


DEFAULT_SOURCES = {
    "garmin": {
        "name": "Garmin Connect",
        "category": "Body - Steps, Sleep, HRV, Workouts",
        "icon": "⌚",
        "hint": "Add GARMIN_EMAIL and GARMIN_PASSWORD on the backend to enable sync.",
    },
    "truelayer": {
        "name": "TrueLayer (Bank)",
        "category": "Finance - Transactions, Spending Categories",
        "icon": "🏦",
        "hint": "Complete the TrueLayer OAuth setup on the backend to enable bank sync.",
    },
    "spotify": {
        "name": "Spotify",
        "category": "Consumption - Music, Listening Patterns",
        "icon": "🎵",
        "hint": "Spotify sync is not wired yet in this repo.",
    },
    "youtube": {
        "name": "YouTube",
        "category": "Consumption - Watch History",
        "icon": "▶️",
        "hint": "YouTube is still a manual logging path in Phase 2.",
    },
    "owntracks": {
        "name": "OwnTracks",
        "category": "Location - Continuous GPS Logging",
        "icon": "📍",
        "hint": "Configure OwnTracks to POST to the backend webhook once the location endpoint is live.",
    },
    "google_calendar": {
        "name": "Google Calendar",
        "category": "Commitments - Events, Time Allocation",
        "icon": "📅",
        "hint": "Calendar integration is not wired yet in this repo.",
    },
    "google_photos": {
        "name": "Google Photos",
        "category": "Visual - Photo Metadata, Locations",
        "icon": "📷",
        "hint": "Photos integration is not wired yet in this repo.",
    },
    "voice_journal": {
        "name": "Voice Journal",
        "category": "Mood - Transcription, Sentiment Analysis",
        "icon": "🎙️",
        "hint": "Voice journaling depends on the Whisper flow, which is still pending.",
    },
}


class DataSourceService:
    def __init__(self) -> None:
        self._garmin = GarminIngestionService()
        self._spotify = SpotifyIngestionService()
        self._truelayer = TrueLayerIngestionService()
        self._whisper = WhisperService()

    def _availability(self) -> dict[str, bool]:
        return {
            "garmin": self._garmin.is_configured,
            "truelayer": self._truelayer.is_configured,
            "spotify": self._spotify.is_configured,
            "youtube": False,
            "owntracks": True,
            "google_calendar": False,
            "google_photos": False,
            "voice_journal": self._whisper.is_available,
        }

    def _record(self, source_id: str, db: Session) -> DataSourceConnection:
        record = db.get(DataSourceConnection, source_id)
        default = DEFAULT_SOURCES[source_id]
        if not record:
            record = DataSourceConnection(
                source_id=source_id,
                display_name=default["name"],
                category=default["category"],
                connection_hint=default["hint"],
            )
            db.add(record)
            db.flush()
        return record

    def list_sources(self, db: Session) -> list[dict]:
        availability = self._availability()
        payload: list[dict] = []
        for source_id, default in DEFAULT_SOURCES.items():
            record = self._record(source_id, db)
            record.display_name = default["name"]
            record.category = default["category"]
            record.available = availability.get(source_id, False)
            if not record.connected:
                record.connection_hint = default["hint"]
            payload.append(self.serialize(record, default["icon"]))
        db.commit()
        return payload

    def connect(self, source_id: str, db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        available = self._availability().get(source_id, False)
        record.available = available
        if not available:
            record.connected = False
            record.connection_hint = DEFAULT_SOURCES[source_id]["hint"]
            db.commit()
            return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

        record.connected = True
        record.last_error = None
        record.connection_hint = None
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    def disconnect(self, source_id: str, db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        record.connected = False
        record.last_sync_status = None
        record.last_error = None
        record.connection_hint = DEFAULT_SOURCES[source_id]["hint"]
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    async def sync(self, source_id: str, db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        action = self._sync_action(source_id)
        if action is None:
            record.connected = False
            record.last_sync_status = "unsupported"
            record.last_error = DEFAULT_SOURCES[source_id]["hint"]
            db.commit()
            db.refresh(record)
            return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

        try:
            await action(db)
            record.connected = True
            record.available = True
            record.last_sync_at = datetime.utcnow()
            record.last_sync_status = "success"
            record.last_error = None
            record.connection_hint = None
        except RuntimeError as exc:
            record.connected = False
            record.last_sync_status = "failed"
            record.last_error = str(exc)
            record.connection_hint = DEFAULT_SOURCES[source_id]["hint"]
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    def mark_sync_result(self, source_id: str, success: bool, db: Session, error: str | None = None) -> None:
        if source_id not in DEFAULT_SOURCES:
            return
        record = self._record(source_id, db)
        record.available = self._availability().get(source_id, record.available)
        record.connected = success
        record.last_sync_status = "success" if success else "failed"
        record.last_sync_at = datetime.utcnow() if success else record.last_sync_at
        record.last_error = None if success else error
        record.connection_hint = None if success else DEFAULT_SOURCES[source_id]["hint"]
        db.commit()

    def _sync_action(self, source_id: str) -> Callable[[Session], object] | None:
        if source_id == "garmin":
            return self._garmin.sync_last_7_days
        if source_id == "truelayer":
            return self._truelayer.sync_last_30_days
        if source_id == "spotify":
            return self._spotify.sync_recent_listening
        return None

    @staticmethod
    def _relative_time(timestamp: datetime | None) -> str | None:
        if timestamp is None:
            return None
        delta = datetime.utcnow() - timestamp
        seconds = int(delta.total_seconds())
        if seconds < 60:
            return "just now"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes} min ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        days = hours // 24
        return f"{days} day{'s' if days != 1 else ''} ago"

    def serialize(self, record: DataSourceConnection, icon: str) -> dict:
        return {
            "id": record.source_id,
            "name": record.display_name,
            "category": record.category,
            "icon": icon,
            "connected": record.connected,
            "available": record.available,
            "lastSync": self._relative_time(record.last_sync_at),
            "lastSyncStatus": record.last_sync_status,
            "connectionHint": record.connection_hint,
            "lastError": record.last_error,
        }
