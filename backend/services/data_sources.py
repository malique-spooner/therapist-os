from __future__ import annotations

from base64 import urlsafe_b64encode
from datetime import datetime, timedelta
import hashlib
import secrets
from typing import Callable
from urllib.parse import urlencode

import httpx
from cryptography.fernet import InvalidToken

from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from ..config import settings
from ..core.secrets import secret_box
from ..models import DataSourceConnection, DataSourceSyncAttempt
from ..models.life_data import (
    FinanceDataReal,
    HealthDataReal,
    LocationCompanionLogReal,
    LocationDailySummaryReal,
    LocationDataReal,
    LocationEventReal,
    LocationPlaceMemoryReal,
    MusicDataReal,
    SpotifyPlayEventReal,
    RelationshipInteractionReal,
    RelationshipReal,
    WeatherDataReal,
)
from ..models.source_data import ChromeBookmark, ChromeHistoryEvent, YoutubeSearchEvent, YoutubeSubscription, YoutubeWatchEvent
from .ingestion.google_drive_importer import FILE_IMPORT_FOLDERS, THERAPIST_OS_DRIVE_FOLDER
from .ingestion.spotify import SpotifyIngestionService
from .data_mode import dataset_model, normalize_data_mode
from .whisper_service import WhisperService


DEFAULT_SOURCES = {
    "garmin": {
        "name": "Garmin Drive Import",
        "category": "Semi-automated - Health Drive import",
        "icon": "⌚",
        "hint": "Save Garmin exports into the TherapistOS Google Drive folder so Therapist OS can import health data periodically.",
        "folder_path": FILE_IMPORT_FOLDERS["garmin"],
        "setup": {
            "mode": "folder",
            "title": "Connect Garmin exports",
            "description": "Point Garmin export files at the TherapistOS Drive folder.",
            "actionLabel": "Save Garmin folder",
            "instructions": [
                "Put Garmin export files in the TherapistOS Google Drive folder.",
                "Therapist OS will use this folder for semi-automated health imports.",
            ],
            "fields": [
                {"key": "folder_path", "label": "Garmin export folder", "type": "text", "placeholder": FILE_IMPORT_FOLDERS["garmin"], "required": True},
            ],
        },
    },
    "revolut": {
        "name": "Revolut",
        "category": "Semi-automated - Finance export folder",
        "icon": "💷",
        "hint": "Save Revolut exports into the TherapistOS Google Drive folder so Therapist OS can import finance data periodically.",
        "folder_path": FILE_IMPORT_FOLDERS["revolut"],
    },
    "natwest": {
        "name": "NatWest",
        "category": "Semi-automated - Finance export folder",
        "icon": "🏦",
        "hint": "Save NatWest exports into the TherapistOS Google Drive folder so Therapist OS can import finance data periodically.",
        "folder_path": FILE_IMPORT_FOLDERS["natwest"],
    },
    "spotify": {
        "name": "Spotify",
        "category": "Automated - Media",
        "icon": "🎵",
        "hint": "Add your Spotify app credentials, then complete Spotify sign-in to enable recent listening sync.",
        "setup": {
            "mode": "oauth-credentials",
            "title": "Connect Spotify",
            "description": "Save your Spotify app credentials, then continue to Spotify to grant recent-listening access.",
            "actionLabel": "Save Spotify app",
            "authActionLabel": "Continue with Spotify",
            "instructions": [
                "Create a Spotify Web API app in the Spotify developer dashboard.",
                "Add the callback URL shown below to the app settings exactly as written before you continue.",
                "Therapist OS asks for the recently played scope so it can sync your listening history.",
            ],
            "fields": [
                {"key": "client_id", "label": "Client ID", "type": "text", "placeholder": "Spotify client id", "required": True},
                {"key": "client_secret", "label": "Client secret", "type": "password", "placeholder": "Spotify client secret", "required": True},
                {"key": "refresh_token", "label": "Refresh token", "type": "password", "placeholder": "Filled automatically after sign-in", "required": False, "helpText": "Leave blank if you want Therapist OS to fetch this during the sign-in flow."},
            ],
        },
    },
    "google_drive": {
        "name": "Google Drive",
        "category": "Import hub - OAuth",
        "icon": "🗂️",
        "hint": "Set the Takeout folder path and save your Google OAuth credentials so Therapist OS can read Google Takeout archives.",
        "folder_path": FILE_IMPORT_FOLDERS["google_drive"],
        "setup": {
            "mode": "oauth-credentials",
            "title": "Connect Google Drive",
            "description": "Save the Google Takeout folder and your Google app credentials, then continue to Google to grant Drive read access.",
            "actionLabel": "Save Drive setup",
            "authActionLabel": "Continue with Google",
            "instructions": [
                "Create a Google OAuth Web application and copy the Client ID and Client Secret here.",
                "Add the callback URL shown below to your authorized redirect URIs exactly as written.",
                "Therapist OS requests read-only Drive access so it can download new Google Takeout archives from your chosen folder, then split Chrome and YouTube rows into their own canonical tables.",
            ],
            "fields": [
                {"key": "folder_path", "label": "TherapistOS folder", "type": "text", "placeholder": THERAPIST_OS_DRIVE_FOLDER, "required": True},
                {"key": "client_id", "label": "Google client ID", "type": "text", "placeholder": "OAuth client id", "required": True},
                {"key": "client_secret", "label": "Google client secret", "type": "password", "placeholder": "OAuth client secret", "required": True},
                {"key": "refresh_token", "label": "Refresh token", "type": "password", "placeholder": "Filled automatically after sign-in", "required": False},
            ],
        },
    },
    "google_maps": {
        "name": "Google Maps API",
        "category": "API keys",
        "icon": "🗺️",
        "hint": "Save a Google Maps API key from Google Cloud Console.",
        "setup": {
            "mode": "api-key",
            "title": "Connect Google Maps API",
            "description": "Save the Google Maps API key used for map views.",
            "actionLabel": "Save API key",
            "instructions": [
                "Create a Google Maps Platform browser API key in Google Cloud Console.",
                "Restrict it to Maps JavaScript API and your domains.",
            ],
            "fields": [
                {"key": "api_key", "label": "Google Maps API key", "type": "password", "placeholder": "AIza...", "required": True},
            ],
        },
    },
    "instagram": {
        "name": "Instagram",
        "category": "Semi-automated - People export folder",
        "icon": "📸",
        "hint": "Save Instagram exports into Google Drive so Therapist OS can import people and interaction signals periodically.",
        "folder_path": FILE_IMPORT_FOLDERS["instagram"],
    },
    "snapchat": {
        "name": "Snapchat",
        "category": "Semi-automated - People export folder",
        "icon": "👻",
        "hint": "Save Snapchat exports into Google Drive so Therapist OS can import people and interaction signals periodically.",
        "folder_path": FILE_IMPORT_FOLDERS["snapchat"],
    },
    "owntracks": {
        "name": "OwnTracks",
        "category": "Automated - Location",
        "icon": "📍",
        "hint": "Save a webhook username and password, then set OwnTracks to HTTP mode with Basic auth using the public webhook URL.",
        "setup": {
            "mode": "webhook",
            "title": "Connect OwnTracks",
            "description": "Therapist OS will generate the webhook details OwnTracks should use for live location pings.",
            "actionLabel": "Save webhook login",
            "instructions": [
                "Save a private webhook username and password here.",
                "Open OwnTracks on your phone, choose HTTP mode, and paste the public HTTPS webhook URL shown below.",
                "Turn Basic authentication on in OwnTracks and enter the same username and password there.",
                "Keep WebSockets off for this setup, then send a manual location publish to confirm the connection.",
            ],
            "fields": [
                {"key": "username", "label": "OwnTracks username", "type": "text", "placeholder": "owntracks-user", "required": True},
                {"key": "password", "label": "OwnTracks password", "type": "password", "placeholder": "Private webhook password", "required": True},
            ],
        },
    },
    "voice_journal": {
        "name": "Voice & Audio",
        "category": "Backend settings - Dictation and text to speech",
        "icon": "🎙️",
        "hint": "Voice journaling depends on the Whisper flow, which is still pending.",
    },
    "weather": {
        "name": "OpenWeather",
        "category": "Backend settings - Weather",
        "icon": "☀️",
        "hint": "Add your OpenWeather API key to enable weather context.",
        "setup": {
            "mode": "api-key",
            "title": "Connect OpenWeather",
            "description": "Save your OpenWeather API key so Therapist OS can add weather and daylight context automatically.",
            "actionLabel": "Save API key",
            "instructions": [
                "Create an OpenWeather account and generate an API key with access to the One Call API.",
                "Paste the key here and Therapist OS will use your saved home coordinates to add weather and daylight context.",
            ],
            "fields": [
                {"key": "api_key", "label": "OpenWeather API key", "type": "password", "placeholder": "OpenWeather API key", "required": True},
            ],
        },
    },
}

VISIBLE_SOURCE_IDS = (
    "owntracks",
    "spotify",
    "google_drive",
    "garmin",
    "revolut",
    "natwest",
    "instagram",
    "snapchat",
    "weather",
    "google_maps",
)

SENSITIVE_FIELD_KEYS: dict[str, set[str]] = {
    "garmin": {"password"},
    "spotify": {"client_secret", "refresh_token", "access_token", "oauth_state"},
    "google_drive": {"client_secret", "refresh_token", "access_token", "oauth_state"},
    "google_maps": {"api_key"},
    "owntracks": {"password"},
    "weather": {"api_key"},
}


class DataSourceService:
    def __init__(self) -> None:
        self._whisper = WhisperService()

    def _intended_sync_label(self, source_id: str) -> str | None:
        if source_id == "spotify":
            return f"Every {settings.SPOTIFY_SYNC_INTERVAL_MINUTES} minutes in the background"
        if source_id == "weather":
            return "Twice daily in the background, plus manual sync"
        if source_id == "garmin":
            return "Periodic import from the Google Drive Garmin export folder"
        if source_id in {"revolut", "natwest"}:
            return "Periodic import from Google Drive finance export folder"
        if source_id == "owntracks":
            return "Continuous live updates when your phone sends pings"
        if source_id == "google_drive":
            return "Manual refresh when you import new archives"
        if source_id in {"instagram", "snapchat"}:
            return "Periodic import from Google Drive people export folder"
        if source_id == "voice_journal":
            return "On demand when you record or transcribe"
        return None

    @staticmethod
    def _manual_sync_allowed(source_id: str) -> bool:
        return source_id not in {"garmin", "owntracks", "google_maps", "revolut", "natwest", "instagram", "snapchat"}

    def _config(self, record: DataSourceConnection | None) -> dict[str, str]:
        if not record:
            return {}
        public_config = {str(key): str(value) for key, value in (record.config_json or {}).items() if value is not None}
        secret_config = self._secret_config(record)
        if secret_config:
            public_config.update(secret_config)
        return public_config

    def _secret_config(self, record: DataSourceConnection | None) -> dict[str, str]:
        if not record or not record.encrypted_config_json:
            return {}
        try:
            decrypted = secret_box.decrypt(record.encrypted_config_json)
        except InvalidToken:
            record.encrypted_config_json = None
            return {}
        import json

        payload = json.loads(decrypted)
        return {str(key): str(value) for key, value in payload.items() if value is not None}

    def _store_config(self, source_id: str, record: DataSourceConnection, values: dict[str, str]) -> None:
        import json

        sensitive = SENSITIVE_FIELD_KEYS.get(source_id, set())
        public_config = {key: value for key, value in values.items() if key not in sensitive}
        secret_config = {key: value for key, value in values.items() if key in sensitive}
        record.config_json = public_config or None
        record.encrypted_config_json = secret_box.encrypt(json.dumps(secret_config, sort_keys=True)) if secret_config else None

    def _availability(self, db: Session) -> dict[str, bool]:
        garmin = self._record("garmin", db)
        spotify = self._record("spotify", db)
        owntracks = self._record("owntracks", db)
        google_drive = self._record("google_drive", db)
        google_maps = self._record("google_maps", db)
        weather = self._record("weather", db)

        return {
            "garmin": bool((self._config(garmin).get("folder_path") or DEFAULT_SOURCES["garmin"].get("folder_path"))),
            "spotify": SpotifyIngestionService(self._config(spotify)).is_configured,
            "google_drive": bool(self._config(google_drive).get("folder_path") and self._config(google_drive).get("client_id") and self._config(google_drive).get("client_secret") and self._config(google_drive).get("refresh_token")),
            "google_maps": bool(self._config(google_maps).get("api_key") or settings.GOOGLE_MAPS_API_KEY),
            "revolut": bool(DEFAULT_SOURCES["revolut"].get("folder_path")),
            "natwest": bool(DEFAULT_SOURCES["natwest"].get("folder_path")),
            "instagram": bool(DEFAULT_SOURCES["instagram"].get("folder_path")),
            "snapchat": bool(DEFAULT_SOURCES["snapchat"].get("folder_path")),
            "owntracks": bool(self._config(owntracks).get("username") and self._config(owntracks).get("password")),
            "voice_journal": self._whisper.is_available,
            "weather": bool(self._config(weather).get("api_key")),
        }

    def _is_connected(self, source_id: str, config: dict[str, str], available: bool, last_sync_status: str | None = None) -> bool:
        if not available:
            return False
        if source_id == "owntracks":
            return last_sync_status == "success"
        if source_id in {"garmin", "revolut", "natwest", "instagram", "snapchat"}:
            return available
        if source_id in {"spotify", "google_drive"}:
            return bool(config.get("refresh_token"))
        return True

    def _connection_state(self, source_id: str, config: dict[str, str], available: bool, connected: bool) -> str:
        if connected:
            return "connected"
        if source_id in {"spotify", "google_drive"} and self._can_authorize(source_id, config):
            return "authorization-required"
        if available:
            return "ready"
        return "setup-required"

    def _connection_hint(self, source_id: str, config: dict[str, str], available: bool, connected: bool) -> str | None:
        if connected:
            return None
        if source_id == "owntracks" and available:
            return "Webhook login saved. Open OwnTracks on your phone, use HTTP mode with Basic auth, then send a manual location publish."
        if source_id == "spotify" and self._can_authorize(source_id, config):
            return "App credentials saved. Continue with Spotify sign-in to finish connecting your account."
        if source_id == "google_drive" and self._can_authorize(source_id, config):
            return "OAuth setup saved. Continue with Google to grant Drive read-only access and finish the connection."
        return DEFAULT_SOURCES[source_id]["hint"]

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
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                record = db.get(DataSourceConnection, source_id)
                if record is None:
                    raise
        return record

    @staticmethod
    def _serialize_attempt(attempt: DataSourceSyncAttempt) -> dict:
        return {
            "id": attempt.id,
            "status": attempt.status,
            "trigger": attempt.trigger,
            "dataMode": attempt.data_mode,
            "rowsSynced": attempt.rows_synced,
            "detail": attempt.detail,
            "attemptedAt": attempt.attempted_at.isoformat(),
            "cooldownUntil": attempt.cooldown_until.isoformat() if attempt.cooldown_until else None,
        }

    def _append_sync_attempt(
        self,
        source_id: str,
        status: str,
        db: Session,
        *,
        detail: str | None = None,
        trigger: str = "manual",
        cooldown_until: datetime | None = None,
        data_mode: str | None = None,
        rows_synced: int | None = None,
    ) -> None:
        db.add(
            DataSourceSyncAttempt(
                source_id=source_id,
                status=status,
                trigger=trigger,
                data_mode=data_mode,
                rows_synced=rows_synced,
                detail=detail,
                cooldown_until=cooldown_until,
            )
        )

    @staticmethod
    def _result_count(result: object) -> int | None:
        if result is None:
            return 0
        if isinstance(result, dict) and "rows_synced" in result:
            try:
                return int(result["rows_synced"])
            except (TypeError, ValueError):
                return None
        if isinstance(result, list):
            return len(result)
        if isinstance(result, tuple):
            return len(result)
        return 1

    @staticmethod
    def _legacy_attempt(record: DataSourceConnection) -> list[dict]:
        if not record.last_sync_status:
            return []
        attempted_at = record.last_sync_at or record.updated_at or record.created_at
        return [
            {
                "id": 0,
                "status": record.last_sync_status,
                "trigger": "legacy",
                "dataMode": "real-only",
                "rowsSynced": None,
                "detail": record.last_error,
                "attemptedAt": attempted_at.isoformat(),
                "cooldownUntil": None,
            }
        ]

    @staticmethod
    def _latest_attempts(source_id: str, db: Session, limit: int = 10, data_mode: str | None = None) -> list[dict]:
        try:
            query = db.query(DataSourceSyncAttempt).filter(DataSourceSyncAttempt.source_id == source_id)
            if data_mode:
                query = query.filter(DataSourceSyncAttempt.data_mode == data_mode)
            attempts = query.order_by(DataSourceSyncAttempt.attempted_at.desc()).limit(limit).all()
        except (ProgrammingError, OperationalError):
            db.rollback()
            return []
        if attempts:
            return [DataSourceService._serialize_attempt(attempt) for attempt in attempts]
        record = db.query(DataSourceConnection).filter(DataSourceConnection.source_id == source_id).first()
        if record is None:
            return []
        return DataSourceService._legacy_attempt(record)

    @staticmethod
    def _source_dataset_specs(source_id: str):
        if source_id == "garmin":
            return [(HealthDataReal, "date", "updated_at")]
        if source_id in {"revolut", "natwest"}:
            return [(FinanceDataReal, "date", "created_at")]
        if source_id == "spotify":
            return [(SpotifyPlayEventReal, "played_date", "played_at")]
        if source_id == "google_drive":
            return [
                (YoutubeWatchEvent, "created_at", "updated_at"),
                (YoutubeSearchEvent, "created_at", "updated_at"),
                (YoutubeSubscription, "created_at", "updated_at"),
                (ChromeHistoryEvent, "created_at", "updated_at"),
                (ChromeBookmark, "created_at", "updated_at"),
            ]
        if source_id == "youtube":
            return [(MusicDataReal, "date", "updated_at")]
        if source_id == "weather":
            return [(WeatherDataReal, "date", "created_at")]
        if source_id == "owntracks":
            return [
                (LocationDataReal, "timestamp", "timestamp"),
                (LocationDailySummaryReal, "date", "updated_at"),
                (LocationCompanionLogReal, "date", "updated_at"),
                (LocationPlaceMemoryReal, "updated_at", "updated_at"),
                (LocationEventReal, "timestamp", "created_at"),
            ]
        if source_id == "voice_journal":
            return []
        if source_id == "google_calendar":
            return []
        if source_id == "google_photos":
            return []
        if source_id == "google_drive":
            return []
        return []

    @staticmethod
    def _row_matches_source(source_id: str, row: object) -> bool:
        if source_id == "spotify":
            provider_breakdown = getattr(row, "provider_breakdown", None) or {}
            if provider_breakdown:
                return bool(provider_breakdown.get("spotify"))
            if getattr(row, "played_at", None) is not None:
                return True
            return bool(
                getattr(row, "listening_hours", None)
                or getattr(row, "top_tracks", None)
                or getattr(row, "top_genres", None)
            )
        if source_id == "google_drive":
            return True
        if source_id != "youtube":
            return True
        provider_breakdown = getattr(row, "provider_breakdown", None) or {}
        return bool(provider_breakdown.get("youtube"))

    def _dataset_activity(self, source_id: str, mode: str | None, db: Session) -> tuple[int, datetime | None, str | None]:
        specs = self._source_dataset_specs(source_id)
        total_records = 0
        last_collected_at: datetime | None = None
        latest_data_date: str | None = None

        for real_model, date_attr_name, updated_attr_name in specs:
            rows = db.query(real_model).all()
            for row in rows:
                if not self._row_matches_source(source_id, row):
                    continue
                total_records += 1
                updated_value = getattr(row, updated_attr_name, None)
                if updated_value and (last_collected_at is None or updated_value > last_collected_at):
                    last_collected_at = updated_value
                date_value = getattr(row, date_attr_name, None)
                if date_value is not None:
                    iso_value = date_value.date().isoformat() if hasattr(date_value, "date") else date_value.isoformat()
                    if latest_data_date is None or iso_value > latest_data_date:
                        latest_data_date = iso_value

        return total_records, last_collected_at, latest_data_date

    def _backfill_sync_attempts(self, db: Session) -> None:
        changed = False
        for source_id in DEFAULT_SOURCES:
            record = self._record(source_id, db)

            has_real_attempt = db.query(DataSourceSyncAttempt).filter(
                DataSourceSyncAttempt.source_id == source_id,
                DataSourceSyncAttempt.data_mode == "real-only",
            ).first()
            if not has_real_attempt and record.last_sync_status:
                db.add(
                    DataSourceSyncAttempt(
                        source_id=source_id,
                        status=record.last_sync_status,
                        trigger="legacy-backfill",
                        data_mode="real-only",
                        rows_synced=None,
                        detail=record.last_error,
                        attempted_at=record.last_sync_at or record.updated_at or record.created_at,
                    )
                )
                changed = True

        if changed:
            db.flush()

    def sync_guard_message(self, source_id: str, db: Session) -> str | None:
        return None

    def _sync_guard_message_for_record(self, record: DataSourceConnection) -> str | None:
        return None

    @staticmethod
    def _with_runtime_state(record: DataSourceConnection, **updates: str | None) -> None:
        config = dict(record.config_json or {})
        for key, value in updates.items():
            if value in (None, ""):
                config.pop(key, None)
            else:
                config[key] = value
        record.config_json = config or None

    def list_sources(self, db: Session) -> list[dict]:
        availability = self._availability(db)
        payload: list[dict] = []
        for source_id in VISIBLE_SOURCE_IDS:
            default = DEFAULT_SOURCES[source_id]
            record = self._record(source_id, db)
            record.display_name = default["name"]
            record.category = default["category"]
            config = self._config(record)
            record.available = availability.get(source_id, False)
            record.connected = self._is_connected(source_id, config, record.available, record.last_sync_status)
            if source_id in {"garmin", "revolut", "natwest", "instagram", "snapchat"} and record.connected:
                record.last_error = None
            record.connection_hint = self._connection_hint(source_id, config, record.available, record.connected)
            payload.append(self.serialize(record, default["icon"]))
        db.commit()
        return payload

    def connect(self, source_id: str, db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        available = self._availability(db).get(source_id, False)
        config = self._config(record)
        record.available = available
        record.connected = self._is_connected(source_id, config, available, record.last_sync_status)
        if not record.connected:
            record.connected = False
            record.connection_hint = self._connection_hint(source_id, config, available, False)
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
        record.config_json = None
        record.encrypted_config_json = None
        record.available = False
        record.connection_hint = DEFAULT_SOURCES[source_id]["hint"]
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    async def sync(self, source_id: str, db: Session, *, trigger: str = "manual") -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        guard_message = self.sync_guard_message(source_id, db)
        if guard_message:
            record.last_sync_status = "throttled"
            record.last_error = guard_message
            cooldown_until = None
            retry_after_raw = (record.config_json or {}).get("garmin_retry_after")
            if retry_after_raw:
                try:
                    cooldown_until = datetime.fromisoformat(str(retry_after_raw))
                except ValueError:
                    cooldown_until = None
            self._append_sync_attempt(
                source_id,
                "throttled",
                db,
                detail=guard_message,
                trigger=trigger,
                cooldown_until=cooldown_until,
                data_mode="real-only",
                rows_synced=0,
            )
            db.commit()
            db.refresh(record)
            return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])
        if trigger == "manual" and not self._manual_sync_allowed(source_id):
            record.last_sync_status = "automatic-only"
            record.last_error = "Manual sync is not available for this source yet."
            self._append_sync_attempt(
                source_id,
                "automatic-only",
                db,
                detail=record.last_error,
                trigger=trigger,
                data_mode="real-only",
                rows_synced=0,
            )
            db.commit()
            db.refresh(record)
            return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])
        action = self._sync_action(source_id, record)
        if action is None:
            record.connected = False
            record.last_sync_status = "unsupported"
            record.last_error = DEFAULT_SOURCES[source_id]["hint"]
            self._append_sync_attempt(source_id, "unsupported", db, detail=record.last_error, trigger=trigger)
            db.commit()
            db.refresh(record)
            return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

        try:
            result = await action(db)
            record.connected = True
            record.available = True
            record.last_sync_at = datetime.utcnow()
            record.last_sync_status = "success"
            record.last_error = None
            record.connection_hint = None
            if source_id == "spotify" and isinstance(result, dict):
                cursor_ms = result.get("cursor_ms")
                self._with_runtime_state(record, spotify_recent_after_ms=str(cursor_ms) if cursor_ms else None)
            self._append_sync_attempt(
                source_id,
                "success",
                db,
                trigger=trigger,
                data_mode="real-only",
                rows_synced=self._result_count(result),
            )
        except Exception as exc:
            record.connected = False
            record.last_sync_status = "failed"
            record.last_error = str(exc)
            record.connection_hint = DEFAULT_SOURCES[source_id]["hint"]
            self._append_sync_attempt(
                source_id,
                "failed",
                db,
                detail=record.last_error,
                trigger=trigger,
                data_mode="real-only",
                rows_synced=0,
            )
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    def mark_sync_result(
        self,
        source_id: str,
        success: bool,
        db: Session,
        error: str | None = None,
        runtime_updates: dict[str, str | None] | None = None,
        rows_synced: int | None = None,
    ) -> None:
        if source_id not in DEFAULT_SOURCES:
            return
        record = self._record(source_id, db)
        record.available = self._availability(db).get(source_id, record.available)
        record.connected = success
        record.last_sync_status = "success" if success else "failed"
        record.last_sync_at = datetime.utcnow() if success else record.last_sync_at
        record.last_error = None if success else error
        record.connection_hint = None if success else DEFAULT_SOURCES[source_id]["hint"]
        if runtime_updates:
            self._with_runtime_state(record, **runtime_updates)
        if success:
            self._append_sync_attempt(source_id, "success", db, detail=None, data_mode="real-only", rows_synced=rows_synced)
        elif not success:
            self._append_sync_attempt(source_id, "failed", db, detail=error, data_mode="real-only", rows_synced=0)
        db.commit()

    def _sync_action(self, source_id: str, record: DataSourceConnection) -> Callable[[Session], object] | None:
        config = self._config(record)
        if source_id == "garmin":
            from .ingestion.google_drive_importer import GoogleDriveImportService

            async def _sync_garmin(db: Session) -> object:
                drive_config = self.get_runtime_config("google_drive", db)
                return await GoogleDriveImportService(drive_config).scan_source("garmin", db)

            return _sync_garmin
        if source_id == "spotify":
            return SpotifyIngestionService(config).sync_recent_listening
        if source_id == "weather":
            from .ingestion.weather import WeatherIngestionService

            return WeatherIngestionService(config).sync_today
        if source_id == "google_drive":
            from .ingestion.google_drive_importer import GoogleDriveImportService

            return GoogleDriveImportService(config).scan_all
        return None

    def get_setup(self, source_id: str, db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        self._backfill_sync_attempts(db)
        default = DEFAULT_SOURCES[source_id]
        setup = default.get("setup")
        if not setup:
            return {
                "id": source_id,
                "name": default["name"],
                "mode": "unsupported",
                "title": f"Connect {default['name']}",
                "description": default["hint"],
                "instructions": [],
                "actionLabel": "Close",
                "connected": record.connected,
                "available": record.available,
                "fields": [],
                "webhookUrl": None,
                "callbackUrl": None,
                "folderPath": default.get("folder_path"),
                "recentAttempts": [],
                "manualSyncAllowed": self._manual_sync_allowed(source_id),
            }

        config = self._config(record)
        fields = []
        for field in setup.get("fields", []):
            value = config.get(field["key"])
            field_type = field.get("type", "text")
            fields.append(
                {
                    "key": field["key"],
                    "label": field["label"],
                    "type": field_type,
                    "required": field.get("required", True),
                    "placeholder": field.get("placeholder"),
                    "helpText": field.get("helpText"),
                    "hasValue": bool(value),
                    "value": value if field_type not in {"password"} else None,
                }
            )

        return {
            "id": source_id,
            "name": default["name"],
            "mode": setup["mode"],
            "title": setup["title"],
            "description": setup["description"],
            "instructions": setup.get("instructions", []),
            "actionLabel": setup["actionLabel"],
            "connected": record.connected,
            "available": self._availability(db).get(source_id, False),
            "fields": fields,
            "webhookUrl": self._webhook_url(source_id),
            "callbackUrl": self._callback_url(source_id),
            "folderPath": config.get("folder_path") or default.get("folder_path"),
            "canAuthorize": self._can_authorize(source_id, config),
            "authActionLabel": setup.get("authActionLabel"),
            "recentAttempts": self._latest_attempts(source_id, db),
            "intendedSync": self._intended_sync_label(source_id),
            "manualSyncAllowed": self._manual_sync_allowed(source_id),
        }

    def save_setup(self, source_id: str, values: dict[str, str], db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        existing = self._config(record)
        setup = DEFAULT_SOURCES[source_id].get("setup", {})
        next_config = {**existing}

        for field in setup.get("fields", []):
            key = field["key"]
            if key in values:
                value = values[key].strip()
                if value:
                    next_config[key] = value
                elif field.get("required", True):
                    next_config.pop(key, None)

        self._store_config(source_id, record, next_config)
        record.available = self._availability(db).get(source_id, False)
        record.connected = self._is_connected(source_id, next_config, record.available, record.last_sync_status)
        if source_id in {"owntracks", "garmin", "revolut", "natwest", "instagram", "snapchat"}:
            record.last_sync_status = None
        record.last_error = None
        record.connection_hint = self._connection_hint(source_id, next_config, record.available, record.connected)
        if source_id == "garmin":
            self._with_runtime_state(record, garmin_retry_after=None)
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    def begin_authorization(self, source_id: str, db: Session) -> str:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        config = self._config(record)
        if not self._can_authorize(source_id, config):
            raise RuntimeError(DEFAULT_SOURCES[source_id]["hint"])

        state = secrets.token_urlsafe(18)
        next_config = {**config, "oauth_state": state}
        verifier = None
        challenge = None
        self._store_config(source_id, record, next_config)
        db.commit()

        if source_id == "spotify":
            query = urlencode(
                {
                    "client_id": config["client_id"],
                    "response_type": "code",
                    "redirect_uri": self._callback_url(source_id),
                    "state": state,
                    "scope": "user-read-recently-played",
                    "show_dialog": "true",
                }
            )
            return f"https://accounts.spotify.com/authorize?{query}"

        if source_id == "google_drive":
            query = urlencode(
                {
                    "client_id": config["client_id"],
                    "redirect_uri": self._callback_url(source_id),
                    "response_type": "code",
                    "scope": "https://www.googleapis.com/auth/drive.readonly",
                    "access_type": "offline",
                    "include_granted_scopes": "true",
                    "prompt": "consent",
                    "state": state,
                }
            )
            return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

        raise RuntimeError("Authorization flow is not available for this source")

    async def complete_authorization(self, source_id: str, code: str | None, state: str | None, error: str | None, db: Session) -> dict:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        config = self._config(record)

        if error:
            raise RuntimeError(error)
        if not code:
            raise RuntimeError("No authorization code was returned")
        if not state or config.get("oauth_state") != state:
            raise RuntimeError("Authorization state did not match")

        token_payload = await self._exchange_code(source_id, code, config)
        next_config = {**config}
        next_config.pop("oauth_state", None)
        if token_payload.get("refresh_token"):
            next_config["refresh_token"] = str(token_payload["refresh_token"])
        if token_payload.get("access_token"):
            next_config["access_token"] = str(token_payload["access_token"])
        self._store_config(source_id, record, next_config)
        record.available = self._availability(db).get(source_id, False)
        record.connected = self._is_connected(source_id, next_config, record.available, record.last_sync_status)
        record.last_error = None
        record.connection_hint = self._connection_hint(source_id, next_config, record.available, record.connected)
        db.commit()
        db.refresh(record)
        return self.serialize(record, DEFAULT_SOURCES[source_id]["icon"])

    async def _exchange_code(self, source_id: str, code: str, config: dict[str, str]) -> dict[str, str]:
        if source_id == "spotify":
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    "https://accounts.spotify.com/api/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": self._callback_url(source_id),
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                    },
                )
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    detail = self._oauth_error_detail("Spotify", response)
                    raise RuntimeError(detail) from exc
                payload = response.json()
            return {"access_token": payload.get("access_token", ""), "refresh_token": payload.get("refresh_token", "")}

        if source_id == "google_drive":
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": self._callback_url(source_id),
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                    },
                )
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    detail = self._oauth_error_detail("Google Drive", response)
                    raise RuntimeError(detail) from exc
                payload = response.json()
            return {"access_token": payload.get("access_token", ""), "refresh_token": payload.get("refresh_token", "")}

        raise RuntimeError("Authorization exchange is not available for this source")

    @staticmethod
    def _pkce_verifier_from_state(state: str) -> str:
        seed = hashlib.sha256(state.encode("utf-8")).digest()
        return urlsafe_b64encode(seed).decode("utf-8").rstrip("=")[:64]

    @staticmethod
    def _pkce_challenge_from_verifier(verifier: str) -> str:
        digest = hashlib.sha256(verifier.encode("utf-8")).digest()
        return urlsafe_b64encode(digest).decode("utf-8").rstrip("=")

    def _can_authorize(self, source_id: str, config: dict[str, str]) -> bool:
        if source_id in {"spotify", "google_drive"}:
            return bool(config.get("client_id") and config.get("client_secret"))
        return False

    def _webhook_url(self, source_id: str) -> str | None:
        if source_id != "owntracks":
            return None
        base = settings.FRONTEND_URL.rstrip("/")
        return f"{base}{settings.API_V1_PREFIX}/location/owntracks"

    def _callback_url(self, source_id: str) -> str | None:
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        spotify_base = frontend_base.replace("://localhost", "://127.0.0.1")
        if source_id == "spotify":
            return f"{spotify_base}/callback/spotify"
        if source_id == "google_drive":
            return f"{frontend_base}/callback/google-drive"
        return None

    @staticmethod
    def _oauth_error_detail(provider_name: str, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except Exception:  # noqa: BLE001
            payload = {}

        parts = []
        if isinstance(payload, dict):
            error = payload.get("error")
            description = payload.get("error_description") or payload.get("message")
            if error:
                parts.append(str(error))
            if description:
                parts.append(str(description))

        if parts:
            return f"{provider_name} rejected the connection: {' - '.join(parts)}"
        return f"{provider_name} rejected the connection during token exchange. Check the redirect URI, client ID, and client secret."

    def get_runtime_config(self, source_id: str, db: Session) -> dict[str, str]:
        if source_id not in DEFAULT_SOURCES:
            raise KeyError(source_id)
        record = self._record(source_id, db)
        config = self._config(record)
        if source_id == "google_maps" and not config.get("api_key") and settings.GOOGLE_MAPS_API_KEY:
            config["api_key"] = settings.GOOGLE_MAPS_API_KEY
        return config

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
        config = self._config(record)
        sync_guard_message = self._sync_guard_message_for_record(record)
        return {
            "id": record.source_id,
            "name": record.display_name,
            "category": record.category,
            "icon": icon,
            "connected": record.connected,
            "available": record.available,
            "connectionState": self._connection_state(record.source_id, config, record.available, record.connected),
            "lastSync": self._relative_time(record.last_sync_at),
            "lastSyncStatus": record.last_sync_status,
            "folderPath": config.get("folder_path") or DEFAULT_SOURCES[record.source_id].get("folder_path"),
            "connectionHint": record.connection_hint,
            "lastError": record.last_error,
            "syncBlocked": bool(sync_guard_message),
            "syncGuardMessage": sync_guard_message,
            "intendedSync": self._intended_sync_label(record.source_id),
            "manualSyncAllowed": self._manual_sync_allowed(record.source_id),
        }

    def get_activity(self, mode: str | None, db: Session) -> dict:
        normalized_mode = normalize_data_mode(mode)
        self._backfill_sync_attempts(db)
        items: list[dict] = []
        availability = self._availability(db)
        for source_id in VISIBLE_SOURCE_IDS:
            default = DEFAULT_SOURCES[source_id]
            record = self._record(source_id, db)
            record.display_name = default["name"]
            record.category = default["category"]
            config = self._config(record)
            record.available = availability.get(source_id, False)
            record.connected = self._is_connected(source_id, config, record.available, record.last_sync_status)
            record.connection_hint = self._connection_hint(source_id, config, record.available, record.connected)
            serialized = self.serialize(record, default["icon"])
            count, last_collected_at, latest_data_date = self._dataset_activity(source_id, normalized_mode, db)
            serialized["recordsAvailable"] = count
            serialized["lastCollectedAt"] = last_collected_at.isoformat() if last_collected_at else None
            serialized["latestDataDate"] = latest_data_date
            serialized["recentAttempts"] = self._latest_attempts(source_id, db, data_mode=normalized_mode)
            items.append(serialized)
        db.commit()
        return {
            "mode": normalized_mode,
            "generatedAt": datetime.utcnow().isoformat(),
            "items": items,
        }
