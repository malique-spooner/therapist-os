from __future__ import annotations

from collections import Counter, defaultdict
from datetime import UTC, date, datetime, timedelta
import hashlib
from typing import Any

import spotipy
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...config import settings
from ...core.logging import get_logger
from ...models.life_data import MusicDataReal, SpotifyPlayEventReal
from ...models.source_data import SpotifyAlbum, SpotifyArtist, SpotifyAudioFeature, SpotifyTrackArtist

logger = get_logger(__name__)


class SpotifyIngestionService:
    def __init__(self, config: dict[str, str] | None = None) -> None:
        self._client: spotipy.Spotify | None = None
        self._config = config or {}

    @property
    def is_configured(self) -> bool:
        return bool(self._client_id and self._client_secret and self._refresh_token)

    @property
    def _client_id(self) -> str:
        return self._config.get("client_id") or settings.SPOTIFY_CLIENT_ID

    @property
    def _client_secret(self) -> str:
        return self._config.get("client_secret") or settings.SPOTIFY_CLIENT_SECRET

    @property
    def _refresh_token(self) -> str:
        return self._config.get("refresh_token") or settings.SPOTIFY_REFRESH_TOKEN

    @property
    def _redirect_uri(self) -> str:
        return f"{settings.FRONTEND_URL.rstrip('/').replace('://localhost', '://127.0.0.1')}/callback/spotify"

    @property
    def _recent_after_ms(self) -> int | None:
        raw = self._config.get("spotify_recent_after_ms")
        if not raw:
            return None
        try:
            return int(raw)
        except (TypeError, ValueError):
            return None

    def _ensure_client(self) -> spotipy.Spotify:
        if not self.is_configured:
            raise RuntimeError("Spotify credentials are not configured")
        if self._client is None:
            auth_manager = spotipy.oauth2.SpotifyOAuth(
                client_id=self._client_id,
                client_secret=self._client_secret,
                redirect_uri=self._redirect_uri,
                scope="user-read-recently-played",
                open_browser=False,
                cache_handler=None,
            )
            token_info = {
                "access_token": "",
                "refresh_token": self._refresh_token,
                "expires_at": 0,
                "token_type": "Bearer",
                "scope": "user-read-recently-played",
            }
            access_token = auth_manager.refresh_access_token(self._refresh_token)["access_token"]
            token_info["access_token"] = access_token
            self._client = spotipy.Spotify(auth=access_token, auth_manager=auth_manager)
        return self._client

    async def sync_recent_listening(self, db: Session) -> dict[str, Any]:
        client = self._ensure_client()
        cutoff = datetime.now(UTC) - timedelta(days=7)
        items = self._fetch_recent_items(client, cutoff)
        if not items:
            return {"rows_synced": 0, "cursor_ms": self._recent_after_ms, "days_synced": 0}

        track_ids = [item["track"]["id"] for item in items if item.get("track", {}).get("id")]
        audio_features = self._fetch_audio_features(client, track_ids)
        artists = self._collect_artist_ids(items)
        genres_by_artist = self._fetch_artist_genres(client, artists)

        inserted_events = 0
        by_date: dict[date, list[dict[str, Any]]] = defaultdict(list)
        newest_played_at_ms = self._recent_after_ms or 0
        for item in items:
            played_at = datetime.fromisoformat(item["played_at"].replace("Z", "+00:00"))
            played_date = played_at.astimezone(UTC).date()
            track = item.get("track") or {}
            features = audio_features.get(track.get("id"), {})
            newest_played_at_ms = max(newest_played_at_ms, int(played_at.timestamp() * 1000))
            self._upsert_track_metadata(track, features, db)
            inserted_events += self._upsert_play_event(played_at, track, item.get("context"), features, db)
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

        records: list[MusicDataReal] = []
        for target_date, entries in sorted(by_date.items()):
            day_entries = self._entries_for_date(target_date, db)
            records.append(self._upsert_summary(target_date, day_entries, genres_by_artist, db))

        db.commit()
        logger.info(
            "spotify_consumption_synced",
            extra={
                "event": "spotify_consumption_synced",
                "extra_data": {
                    "days": len(records),
                    "plays": len(items),
                    "inserted_events": inserted_events,
                },
            },
        )
        return {
            "rows_synced": inserted_events,
            "cursor_ms": newest_played_at_ms or None,
            "days_synced": len(records),
            "latest_date": records[-1].date.isoformat() if records else None,
        }

    async def get_daily_summary(self, target_date: date, db: Session) -> MusicDataReal | None:
        return db.scalar(select(MusicDataReal).where(MusicDataReal.date == target_date))

    def _fetch_recent_items(self, client: spotipy.Spotify, cutoff: datetime) -> list[dict[str, Any]]:
        after_ms = self._recent_after_ms
        if after_ms is not None:
            recent = client.current_user_recently_played(limit=50, after=after_ms)
            return recent.get("items", [])

        before_ms: int | None = None
        items: list[dict[str, Any]] = []
        seen_keys: set[tuple[str, str | None]] = set()

        while True:
            params: dict[str, Any] = {"limit": 50}
            if before_ms is not None:
                params["before"] = before_ms
            recent = client.current_user_recently_played(**params)
            batch = recent.get("items", [])
            if not batch:
                break
            stop = False
            for item in batch:
                played_at = datetime.fromisoformat(item["played_at"].replace("Z", "+00:00"))
                if played_at < cutoff:
                    stop = True
                    continue
                track_id = (item.get("track") or {}).get("id")
                key = (item["played_at"], track_id)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                items.append(item)
            oldest_ms = int(datetime.fromisoformat(batch[-1]["played_at"].replace("Z", "+00:00")).timestamp() * 1000)
            before_ms = oldest_ms - 1
            if stop or len(batch) < 50 or len(items) >= 1000:
                break
        return items

    def _upsert_play_event(
        self,
        played_at: datetime,
        track: dict[str, Any],
        context: dict[str, Any] | None,
        features: dict[str, Any],
        db: Session,
    ) -> int:
        track_id = track.get("id")
        existing = db.scalar(
            select(SpotifyPlayEventReal).where(
                SpotifyPlayEventReal.played_at == played_at,
                SpotifyPlayEventReal.track_id == track_id,
            )
        )
        if existing:
            return 0
        db.add(
            SpotifyPlayEventReal(
                played_at=played_at,
                played_date=played_at.astimezone(UTC).date(),
                track_id=track_id,
                track_name=track.get("name"),
                artist_name=", ".join(artist.get("name", "") for artist in track.get("artists", [])),
                album_name=(track.get("album") or {}).get("name"),
                duration_ms=track.get("duration_ms"),
                track_uri=track.get("uri"),
                context_type=(context or {}).get("type"),
                context_uri=(context or {}).get("uri"),
                external_url=((track.get("external_urls") or {}).get("spotify")),
                explicit=track.get("explicit"),
                popularity=track.get("popularity"),
                preview_url=track.get("preview_url"),
                valence=features.get("valence"),
                energy=features.get("energy"),
                danceability=features.get("danceability"),
                metadata_json={
                    "album_id": (track.get("album") or {}).get("id"),
                    "artist_ids": [artist.get("id") for artist in track.get("artists", []) if artist.get("id")],
                },
            )
        )
        return 1

    def _entries_for_date(self, target_date: date, db: Session) -> list[dict[str, Any]]:
        rows = db.scalars(
            select(SpotifyPlayEventReal)
            .where(SpotifyPlayEventReal.played_date == target_date)
            .order_by(SpotifyPlayEventReal.played_at)
        ).all()
        return [
            {
                "played_at": row.played_at,
                "duration_ms": row.duration_ms or 0,
                "track_id": row.track_id,
                "track_name": row.track_name,
                "artist_name": row.artist_name or "",
                "artist_ids": list((row.metadata_json or {}).get("artist_ids") or []),
                "features": {
                    "valence": row.valence,
                    "energy": row.energy,
                    "danceability": row.danceability,
                },
            }
            for row in rows
        ]

    def _fetch_audio_features(self, client: spotipy.Spotify, track_ids: list[str]) -> dict[str, dict[str, Any]]:
        if not track_ids:
            return {}
        unique_track_ids = list(dict.fromkeys(track_ids))
        try:
            features = client.audio_features(unique_track_ids)
        except Exception as exc:
            logger.warning(
                "spotify_audio_features_unavailable",
                extra={
                    "event": "spotify_audio_features_unavailable",
                    "extra_data": {"reason": str(exc)},
                },
            )
            features = None
        return {
            feature["id"]: feature
            for feature in (features or [])
            if feature and feature.get("id")
        }

    def _upsert_track_metadata(self, track: dict[str, Any], features: dict[str, Any], db: Session) -> None:
        track_id = track.get("id")
        if not track_id:
            return

        album = track.get("album") or {}
        album_id = album.get("id")
        if album_id:
            album_hash = self._hash("spotify_album", album_id)
            album_row = db.scalar(select(SpotifyAlbum).where(SpotifyAlbum.source_row_hash == album_hash))
            if not album_row:
                album_row = SpotifyAlbum(source_row_hash=album_hash, spotify_album_id=album_id)
                db.add(album_row)
                db.flush()
            album_row.name = album.get("name")
            album_row.album_type = album.get("album_type")
            album_row.release_date = album.get("release_date")
            album_row.total_tracks = album.get("total_tracks")
            album_row.artist_names = [artist.get("name") for artist in album.get("artists", []) if artist.get("name")]
            album_row.spotify_url = ((album.get("external_urls") or {}).get("spotify"))
            album_row.metadata_json = album

        for order, artist in enumerate(track.get("artists", [])):
            artist_id = artist.get("id")
            if not artist_id:
                continue
            artist_hash = self._hash("spotify_artist", artist_id)
            artist_row = db.scalar(select(SpotifyArtist).where(SpotifyArtist.source_row_hash == artist_hash))
            if not artist_row:
                artist_row = SpotifyArtist(source_row_hash=artist_hash, spotify_artist_id=artist_id)
                db.add(artist_row)
                db.flush()
            artist_row.name = artist.get("name")
            artist_row.genres = artist.get("genres")
            artist_row.popularity = artist.get("popularity")
            artist_row.spotify_url = ((artist.get("external_urls") or {}).get("spotify"))
            artist_row.metadata_json = artist

            track_artist_hash = self._hash("spotify_track_artist", track_id, artist_id)
            link_row = db.scalar(select(SpotifyTrackArtist).where(SpotifyTrackArtist.source_row_hash == track_artist_hash))
            if not link_row:
                link_row = SpotifyTrackArtist(source_row_hash=track_artist_hash, spotify_track_id=track_id, spotify_artist_id=artist_id)
                db.add(link_row)
                db.flush()
            link_row.artist_name = artist.get("name")
            link_row.artist_order = order
            link_row.album_id = album_id
            link_row.metadata_json = artist

        feature_hash = self._hash("spotify_audio_features", track_id)
        feature_row = db.scalar(select(SpotifyAudioFeature).where(SpotifyAudioFeature.source_row_hash == feature_hash))
        if not feature_row:
            feature_row = SpotifyAudioFeature(source_row_hash=feature_hash, spotify_track_id=track_id)
            db.add(feature_row)
            db.flush()
        feature_row.danceability = features.get("danceability")
        feature_row.energy = features.get("energy")
        feature_row.valence = features.get("valence")
        feature_row.tempo = features.get("tempo")
        feature_row.acousticness = features.get("acousticness")
        feature_row.instrumentalness = features.get("instrumentalness")
        feature_row.liveness = features.get("liveness")
        feature_row.speechiness = features.get("speechiness")
        feature_row.loudness = features.get("loudness")
        feature_row.duration_ms = features.get("duration_ms")
        feature_row.musical_key = features.get("key")
        feature_row.mode = features.get("mode")
        feature_row.time_signature = features.get("time_signature")
        feature_row.payload_json = features

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

    @staticmethod
    def _hash(*parts: Any) -> str:
        return hashlib.sha256(repr(parts).encode("utf-8")).hexdigest()

    def _upsert_summary(
        self,
        target_date: date,
        entries: list[dict[str, Any]],
        genres_by_artist: dict[str, list[str]],
        db: Session,
    ) -> MusicDataReal:
        record = db.scalar(select(MusicDataReal).where(MusicDataReal.date == target_date))
        if not record:
            record = MusicDataReal(date=target_date)
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
        record.provider_breakdown = {
            "spotify": {
                "label": "Spotify",
                "listeningHours": record.listening_hours,
                "averageValence": record.average_valence,
                "averageEnergy": record.average_energy,
                "averageDanceability": record.average_danceability,
                "newDiscoveries": record.new_discoveries,
                "topGenres": record.top_genres or [],
                "topTracks": record.top_tracks or [],
            }
        }
        db.flush()
        return record
