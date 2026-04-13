from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
from typing import Any
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.orm import Session

from ...models import RawImportRow
from ...models.life_data import SpotifyPlayEventReal
from ...models.source_data import (
    ChromeHistoryEvent,
    ChromeBookmark,
    ChromeDevice,
    ChromeExtension,
    GarminBodyMetric,
    GarminDailyWellness,
    GarminFitnessMetric,
    GarminHydrationLog,
    GarminSleepSession,
    InstagramMedia,
    InstagramInteraction,
    InstagramMessage,
    InstagramProfile,
    InstagramReaction,
    NatWestTransaction,
    SnapchatChatEvent,
    SnapchatFriend,
    RevolutTransaction,
    SnapchatSnapEvent,
    SnapchatStoryEvent,
    SnapchatInteraction,
    SpotifyAlbum,
    SpotifyArtist,
    SpotifyAudioFeature,
    SpotifyPlayEvent,
    SpotifyTrack,
    SpotifyTrackArtist,
    YoutubeChannel,
    YoutubePlaylist,
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
        if source_id == "chrome":
            return self._clean_chrome_fast(db)
        if source_id in {"instagram", "snapchat"}:
            return self._clean_social_fast(source_id, db)
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

    def _clean_chrome_fast(self, db: Session) -> int:
        result = db.execute(text(
            """
            insert into chrome_history_events (
                source_row_hash, import_file_id, metadata_json, created_at, updated_at,
                visited_at, url, title, domain
            )
            select distinct on (r.row_hash)
                r.row_hash,
                r.import_id,
                r.raw_payload->'row',
                now(),
                now(),
                timestamp '1601-01-01' + (((r.raw_payload->'row'->>'time_usec')::bigint) * interval '1 microsecond'),
                r.raw_payload->'row'->>'url',
                r.raw_payload->'row'->>'title',
                regexp_replace(split_part(r.raw_payload->'row'->>'url', '/', 3), '^www\\.', '')
            from raw_import_rows r
            where r.source_id = 'chrome'
              and r.raw_payload->>'path' = 'Takeout/Chrome/History.json'
              and r.raw_payload->'row'->>'time_usec' is not null
            order by r.row_hash, r.id
            on conflict (source_row_hash) do update set
                import_file_id = excluded.import_file_id,
                metadata_json = excluded.metadata_json,
                updated_at = now(),
                visited_at = excluded.visited_at,
                url = excluded.url,
                title = excluded.title,
                domain = excluded.domain
            """
        ))
        db.commit()
        return int(result.rowcount or 0)

    def _clean_social_fast(self, source_id: str, db: Session) -> int:
        table = "instagram_interactions" if source_id == "instagram" else "snapchat_interactions"
        result = db.execute(text(
            f"""
            insert into {table} (
                source_row_hash, import_file_id, metadata_json, created_at, updated_at,
                occurred_at, interaction_type, actor, text, path
            )
            select distinct on (r.row_hash)
                r.row_hash,
                r.import_id,
                coalesce(r.raw_payload->'row', r.raw_payload),
                now(),
                now(),
                null,
                case
                    when lower(r.raw_payload->>'path') like '%chat%' then 'chat'
                    when lower(r.raw_payload->>'path') like '%snap%' then 'snap'
                    when lower(r.raw_payload->>'path') like '%message%' then 'message'
                    when lower(r.raw_payload->>'path') like '%like%' then 'like'
                    when lower(r.raw_payload->>'path') like '%comment%' then 'comment'
                    else 'event'
                end,
                coalesce(r.raw_payload->'row'->>'sender', r.raw_payload->'row'->>'Sender', r.raw_payload->'row'->>'username'),
                left(coalesce(r.raw_payload->'row'->>'text', r.raw_payload->'row'->>'Text', r.raw_payload->'row'->>'Message', r.raw_payload->'row'->>'title', r.raw_payload->>'path'), 5000),
                r.raw_payload->>'path'
            from raw_import_rows r
            where r.source_id = :source_id
            order by r.row_hash, r.id
            on conflict (source_row_hash) do update set
                import_file_id = excluded.import_file_id,
                metadata_json = excluded.metadata_json,
                updated_at = now(),
                interaction_type = excluded.interaction_type,
                actor = excluded.actor,
                text = excluded.text,
                path = excluded.path
            """
        ), {"source_id": source_id})
        db.commit()
        return int(result.rowcount or 0)

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
            return self._clean_instagram(path, row, staged, db)
        if source_id == "snapchat":
            return self._clean_snapchat(path, row, staged, db)
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
        lower_path = path.lower()
        if "watch-history" in lower_path:
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
            channel_id = row.get("channelId") or row.get("channel_id") or record.channel_url or record.channel_name
            if channel_id:
                channel = self._upsert(db, YoutubeChannel, self._hash("youtube-channel", channel_id))
                channel.import_file_id = staged.import_id
                channel.channel_id = str(channel_id)
                channel.channel_url = record.channel_url
                channel.channel_title = record.channel_name
                channel.subscription_date = record.watched_at
                channel.payload_json = row
            return 1
        if "search-history" in lower_path:
            record = self._upsert(db, YoutubeSearchEvent, staged.row_hash)
            record.import_file_id = staged.import_id
            record.searched_at = self._dt(row.get("time") or row.get("Time"))
            record.query = row.get("title") or row.get("query") or row.get("Search Query")
            record.metadata_json = row
            return 1
        if "subscriptions" in lower_path:
            record = self._upsert(db, YoutubeSubscription, staged.row_hash)
            record.import_file_id = staged.import_id
            record.channel_id = row.get("Channel Id") or row.get("channelId")
            record.channel_url = row.get("Channel Url") or row.get("Channel URL")
            record.channel_title = row.get("Channel Title") or row.get("Title")
            record.metadata_json = row
            channel = self._upsert(db, YoutubeChannel, self._hash("youtube-channel", record.channel_id or record.channel_url or record.channel_title))
            channel.import_file_id = staged.import_id
            channel.channel_id = record.channel_id
            channel.channel_url = record.channel_url
            channel.channel_title = record.channel_title
            channel.subscription_date = self._dt(row.get("Subscribed At") or row.get("Subscription Date"))
            channel.payload_json = row
            return 1
        if "playlist" in lower_path:
            playlist_key = row.get("Playlist Id") or row.get("playlistId") or row.get("Playlist URL") or row.get("Playlist Title")
            if not playlist_key:
                return 0
            playlist = self._upsert(db, YoutubePlaylist, self._hash("youtube-playlist", playlist_key))
            playlist.import_file_id = staged.import_id
            playlist.playlist_id = row.get("Playlist Id") or row.get("playlistId")
            playlist.playlist_url = row.get("Playlist URL") or row.get("playlistUrl")
            playlist.playlist_title = row.get("Playlist Title") or row.get("Title")
            playlist.item_count = self._int(row.get("Video Count") or row.get("Item Count") or row.get("videos"))
            playlist.payload_json = row
            return 1
        return 0

    def _clean_chrome(self, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        lower_path = path.lower()
        if "history" in lower_path:
            if "chrome/history.json" not in lower_path:
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
        if "bookmark" in lower_path:
            bookmark = self._upsert(db, ChromeBookmark, staged.row_hash)
            bookmark.import_file_id = staged.import_id
            bookmark.url = row.get("url") or row.get("URL")
            bookmark.title = row.get("title") or row.get("Title")
            bookmark.folder = row.get("folder") or row.get("Folder") or row.get("path")
            bookmark.metadata_json = row
            return 1
        if "extension" in lower_path:
            extension_id = row.get("id") or row.get("extension_id") or row.get("name")
            if not extension_id:
                return 0
            extension = self._upsert(db, ChromeExtension, self._hash("chrome-extension", extension_id))
            extension.import_file_id = staged.import_id
            extension.extension_id = str(extension_id)
            extension.name = row.get("name") or row.get("Name")
            extension.version = row.get("version") or row.get("Version")
            extension.description = row.get("description") or row.get("Description")
            extension.payload_json = row
            return 1
        if "device" in lower_path:
            device_id = row.get("id") or row.get("device_id") or row.get("name")
            if not device_id:
                return 0
            device = self._upsert(db, ChromeDevice, self._hash("chrome-device", device_id))
            device.import_file_id = staged.import_id
            device.device_id = str(device_id)
            device.device_name = row.get("name") or row.get("Name")
            device.device_type = row.get("type") or row.get("Type")
            device.last_active_at = self._dt(row.get("last_active_at") or row.get("lastActiveAt") or row.get("last_seen"))
            device.payload_json = row
            return 1
        return 0

    def _clean_instagram(self, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        text = row.get("text") or row.get("Text") or row.get("Message") or row.get("title") or row.get("cells")
        if text is None and not path:
            return 0
        lower_path = path.lower()
        if "profile" in lower_path or row.get("username"):
            profile = self._upsert(db, InstagramProfile, staged.row_hash)
            profile.import_file_id = staged.import_id
            profile.profile_id = row.get("id") or row.get("profileId") or row.get("username")
            profile.username = row.get("username") or row.get("User")
            profile.display_name = row.get("name") or row.get("displayName") or row.get("full_name")
            profile.bio = row.get("bio") or row.get("Bio")
            profile.profile_url = row.get("url") or row.get("URL")
            profile.payload_json = row
        if "message" in lower_path or "chat" in lower_path:
            message = self._upsert(db, InstagramMessage, self._hash("instagram-message", staged.row_hash))
            message.import_file_id = staged.import_id
            message.thread_id = row.get("thread_id") or row.get("threadId") or row.get("conversationId") or row.get("path")
            message.sent_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
            message.sender = row.get("sender") or row.get("Sender") or row.get("From") or row.get("User") or row.get("username")
            message.recipient = row.get("recipient") or row.get("Recipient") or row.get("To")
            message.text = str(text)[:5000] if text is not None else None
            message.path = path
            message.payload_json = row
        if "media" in lower_path or "post" in lower_path or row.get("media_url") or row.get("caption"):
            media = self._upsert(db, InstagramMedia, self._hash("instagram-media", staged.row_hash))
            media.import_file_id = staged.import_id
            media.media_id = row.get("media_id") or row.get("mediaId") or row.get("id")
            media.posted_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
            media.media_type = row.get("media_type") or row.get("mediaType") or row.get("type")
            media.caption = row.get("caption") or row.get("text") or row.get("Message")
            media.media_url = row.get("media_url") or row.get("mediaUrl") or row.get("url")
            media.path = path
            media.payload_json = row
        reaction = self._upsert(db, InstagramReaction, self._hash("instagram-reaction", staged.row_hash))
        reaction.import_file_id = staged.import_id
        reaction.reacted_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
        reaction.reaction_type = self._interaction_type("instagram", path)
        reaction.actor = row.get("sender") or row.get("Sender") or row.get("From") or row.get("User") or row.get("username")
        reaction.target = row.get("target") or row.get("Target") or row.get("to")
        reaction.text = str(text)[:5000] if text is not None else None
        reaction.path = path
        reaction.payload_json = row
        return self._clean_social(InstagramInteraction, "instagram", path, row, staged, db)

    def _clean_snapchat(self, path: str, row: dict[str, Any], staged: RawImportRow, db: Session) -> int:
        text = row.get("text") or row.get("Text") or row.get("Message") or row.get("title") or row.get("cells")
        if text is None and not path:
            return 0
        lower_path = path.lower()
        if "friend" in lower_path or row.get("username"):
            friend = self._upsert(db, SnapchatFriend, staged.row_hash)
            friend.import_file_id = staged.import_id
            friend.friend_id = row.get("id") or row.get("friendId") or row.get("username")
            friend.username = row.get("username") or row.get("User")
            friend.display_name = row.get("name") or row.get("displayName") or row.get("full_name")
            friend.friend_status = row.get("status") or row.get("friend_status")
            friend.payload_json = row
        if "chat" in lower_path or "message" in lower_path:
            chat = self._upsert(db, SnapchatChatEvent, self._hash("snapchat-chat", staged.row_hash))
            chat.import_file_id = staged.import_id
            chat.chat_id = row.get("chat_id") or row.get("chatId") or row.get("conversationId") or row.get("path")
            chat.sent_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
            chat.sender = row.get("sender") or row.get("Sender") or row.get("From") or row.get("User") or row.get("username")
            chat.recipient = row.get("recipient") or row.get("Recipient") or row.get("To")
            chat.text = str(text)[:5000] if text is not None else None
            chat.path = path
            chat.payload_json = row
        if "snap" in lower_path:
            snap = self._upsert(db, SnapchatSnapEvent, self._hash("snapchat-snap", staged.row_hash))
            snap.import_file_id = staged.import_id
            snap.snap_id = row.get("snap_id") or row.get("snapId") or row.get("id")
            snap.sent_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
            snap.sender = row.get("sender") or row.get("Sender") or row.get("User") or row.get("username")
            snap.caption = row.get("caption") or row.get("text") or row.get("Message")
            snap.media_url = row.get("media_url") or row.get("mediaUrl") or row.get("url")
            snap.path = path
            snap.payload_json = row
        if "story" in lower_path:
            story = self._upsert(db, SnapchatStoryEvent, self._hash("snapchat-story", staged.row_hash))
            story.import_file_id = staged.import_id
            story.story_id = row.get("story_id") or row.get("storyId") or row.get("id")
            story.posted_at = self._dt(row.get("timestamp") or row.get("Timestamp") or row.get("Date") or row.get("time"))
            story.author = row.get("author") or row.get("sender") or row.get("username")
            story.title = row.get("title") or row.get("name")
            story.path = path
            story.payload_json = row
        return self._clean_social(SnapchatInteraction, "snapchat", path, row, staged, db)

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
            db.flush()
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
