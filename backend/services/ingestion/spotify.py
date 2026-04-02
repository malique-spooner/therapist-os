from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta
from typing import Any

import spotipy
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...core.logging import get_logger
from ...models import MusicData

logger = get_logger(__name__)


class SpotifyIngestionService:
    def __init__(self) -> None:
        self._client: spotipy.Spotify | None = None

    @property
    def is_configured(self) -> bool:
        return bool(settings.SPOTIFY_CLIENT_ID and settings.SPOTIFY_CLIENT_SECRET and settings.SPOTIFY_REFRESH_TOKEN)

    def _ensure_client(self) -> spotipy.Spotify:
        if not self.is_configured:
            raise RuntimeError("Spotify credentials are not configured")
        if self._client is None:
            auth_manager = spotipy.oauth2.SpotifyOAuth(
                client_id=settings.SPOTIFY_CLIENT_ID,
                client_secret=settings.SPOTIFY_CLIENT_SECRET,
                redirect_uri="http://localhost:3000/callback",
                scope="user-read-recently-played",
                open_browser=False,
                cache_handler=None,
            )
            token_info = {
                "access_token": "",
                "refresh_token": settings.SPOTIFY_REFRESH_TOKEN,
                "expires_at": 0,
                "token_type": "Bearer",
                "scope": "user-read-recently-played",
            }
            access_token = auth_manager.refresh_access_token(settings.SPOTIFY_REFRESH_TOKEN)["access_token"]
            token_info["access_token"] = access_token
            self._client = spotipy.Spotify(auth=access_token, auth_manager=auth_manager)
        return self._client

    async def sync_recent_listening(self, db: Session) -> list[MusicData]:
        client = self._ensure_client()
        cutoff = datetime.now(UTC) - timedelta(days=7)
        recent = client.current_user_recently_played(limit=50, after=int(cutoff.timestamp() * 1000))
        items = recent.get("items", [])
        if not items:
            return []

        track_ids = [item["track"]["id"] for item in items if item.get("track", {}).get("id")]
        audio_features = self._fetch_audio_features(client, track_ids)
        artists = self._collect_artist_ids(items)
        genres_by_artist = self._fetch_artist_genres(client, artists)

        by_date: dict[date, list[dict[str, Any]]] = defaultdict(list)
        for item in items:
            played_at = datetime.fromisoformat(item["played_at"].replace("Z", "+00:00"))
            played_date = played_at.astimezone(UTC).date()
            track = item.get("track") or {}
            features = audio_features.get(track.get("id"), {})
            by_date[played_date].append(
                {
                    "played_at": played_at,
                    "duration_ms": track.get("duration_ms", 0),
                    "track_id": track.get("id"),
                    "track_name": track.get("name"),
                    "artist_name": ", ".join(artist.get("name", "") for artist in track.get("artists", [])),
                    "artist_ids": [artist.get("id") for artist in track.get("artists", []) if artist.get("id")],
                    "features": features,
                }
            )

        records: list[MusicData] = []
        for target_date, entries in sorted(by_date.items()):
            records.append(self._upsert_summary(target_date, entries, genres_by_artist, db))

        db.commit()
        logger.info(
            "spotify_consumption_synced",
            extra={
                "event": "spotify_consumption_synced",
                "extra_data": {
                    "days": len(records),
                    "plays": len(items),
                },
            },
        )
        return records

    async def get_daily_summary(self, target_date: date, db: Session) -> MusicData | None:
        return db.scalar(select(MusicData).where(MusicData.date == target_date))

    def _fetch_audio_features(self, client: spotipy.Spotify, track_ids: list[str]) -> dict[str, dict[str, Any]]:
        if not track_ids:
            return {}
        try:
            features = client.audio_features(track_ids)
        except Exception:
            features = None
        return {
            feature["id"]: feature
            for feature in (features or [])
            if feature and feature.get("id")
        }

    @staticmethod
    def _collect_artist_ids(items: list[dict[str, Any]]) -> list[str]:
        seen: list[str] = []
        for item in items:
            for artist in item.get("track", {}).get("artists", []):
                artist_id = artist.get("id")
                if artist_id and artist_id not in seen:
                    seen.append(artist_id)
        return seen

    def _fetch_artist_genres(self, client: spotipy.Spotify, artist_ids: list[str]) -> dict[str, list[str]]:
        if not artist_ids:
            return {}
        genres: dict[str, list[str]] = {}
        for start in range(0, len(artist_ids), 50):
            batch = artist_ids[start:start + 50]
            try:
                response = client.artists(batch)
            except Exception:
                continue
            for artist in response.get("artists", []):
                if artist and artist.get("id"):
                    genres[artist["id"]] = artist.get("genres", [])
        return genres

    def _upsert_summary(
        self,
        target_date: date,
        entries: list[dict[str, Any]],
        genres_by_artist: dict[str, list[str]],
        db: Session,
    ) -> MusicData:
        record = db.scalar(select(MusicData).where(MusicData.date == target_date))
        if not record:
            record = MusicData(date=target_date)
            db.add(record)

        duration_hours = sum(entry["duration_ms"] for entry in entries) / 3_600_000
        valences = [entry["features"].get("valence") for entry in entries if entry["features"].get("valence") is not None]
        energies = [entry["features"].get("energy") for entry in entries if entry["features"].get("energy") is not None]
        danceabilities = [entry["features"].get("danceability") for entry in entries if entry["features"].get("danceability") is not None]

        genres: Counter[str] = Counter()
        top_tracks_counter: Counter[tuple[str, str]] = Counter()
        seen_track_ids: set[str] = set()
        for entry in entries:
            top_tracks_counter[(entry["track_name"], entry["artist_name"])] += 1
            track_id = entry.get("track_id")
            if track_id:
                seen_track_ids.add(track_id)
            for artist_id in entry["artist_ids"]:
                for genre in genres_by_artist.get(artist_id, []):
                    genres[genre] += 1

        record.listening_hours = round(duration_hours, 2)
        record.average_valence = round(sum(valences) / len(valences), 3) if valences else None
        record.average_energy = round(sum(energies) / len(energies), 3) if energies else None
        record.average_danceability = round(sum(danceabilities) / len(danceabilities), 3) if danceabilities else None
        record.new_discoveries = len(seen_track_ids)
        record.top_genres = [genre for genre, _ in genres.most_common(5)]
        record.top_tracks = [
            {"name": name, "artist": artist, "plays": plays}
            for (name, artist), plays in top_tracks_counter.most_common(5)
        ]
        db.flush()
        return record
