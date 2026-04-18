from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Float, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class _SourceRow:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_row_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    import_file_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GarminDailyWellness(Base, _SourceRow):
    __tablename__ = "garmin_daily_wellness"
    date: Mapped[date] = mapped_column(Date, index=True)
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance_meters: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    active_calories: Mapped[float | None] = mapped_column(Float, nullable=True)
    active_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resting_heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)


class GarminSleepSession(Base, _SourceRow):
    __tablename__ = "garmin_sleep_sessions"
    sleep_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    light_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rem_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awake_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sleep_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class GarminBodyMetric(Base, _SourceRow):
    __tablename__ = "garmin_body_metrics"
    measured_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    metric_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    body_fat_percent: Mapped[float | None] = mapped_column(Float, nullable=True)


class GarminFitnessMetric(Base, _SourceRow):
    __tablename__ = "garmin_fitness_metrics"
    metric_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    metric_type: Mapped[str] = mapped_column(String(80), index=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)


class GarminHydrationLog(Base, _SourceRow):
    __tablename__ = "garmin_hydration_logs"
    logged_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    log_date: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    volume_ml: Mapped[float | None] = mapped_column(Float, nullable=True)


class RevolutTransaction(Base, _SourceRow):
    __tablename__ = "revolut_transactions"
    transaction_uid: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    product: Mapped[str | None] = mapped_column(String(80), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    fee_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    state: Mapped[str | None] = mapped_column(String(40), nullable=True)
    balance_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class NatWestTransaction(Base, _SourceRow):
    __tablename__ = "natwest_transactions"
    transaction_uid: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    occurred_on: Mapped[date | None] = mapped_column(Date, index=True, nullable=True)
    type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    value_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    balance_minor: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    account_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    account_ref: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)


class SpotifyTrack(Base, _SourceRow):
    __tablename__ = "spotify_tracks"
    spotify_track_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    artist_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    album_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    explicit: Mapped[bool | None] = mapped_column(nullable=True)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spotify_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class SpotifyPlayEvent(Base, _SourceRow):
    __tablename__ = "spotify_play_events"
    __table_args__ = (UniqueConstraint("played_at", "spotify_track_id", name="uq_spotify_play_events_played_track"),)
    played_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    spotify_track_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    context_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    context_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)


class YoutubeWatchEvent(Base, _SourceRow):
    __tablename__ = "youtube_watch_events"
    watched_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    channel_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    channel_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class YoutubeSearchEvent(Base, _SourceRow):
    __tablename__ = "youtube_search_events"
    searched_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    query: Mapped[str | None] = mapped_column(Text, nullable=True)


class YoutubeSubscription(Base, _SourceRow):
    __tablename__ = "youtube_subscriptions"
    channel_id: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    channel_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    channel_title: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ChromeHistoryEvent(Base, _SourceRow):
    __tablename__ = "chrome_history_events"
    visited_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)


class ChromeBookmark(Base, _SourceRow):
    __tablename__ = "chrome_bookmarks"
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    folder: Mapped[str | None] = mapped_column(String(255), nullable=True)


class InstagramInteraction(Base, _SourceRow):
    __tablename__ = "instagram_interactions"
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    interaction_type: Mapped[str] = mapped_column(String(80), index=True)
    actor: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)


class SnapchatInteraction(Base, _SourceRow):
    __tablename__ = "snapchat_interactions"
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    interaction_type: Mapped[str] = mapped_column(String(80), index=True)
    actor: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)


class OwnTracksLocationPoint(Base, _SourceRow):
    __tablename__ = "owntracks_location_points"
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class OwnTracksDeviceEvent(Base, _SourceRow):
    __tablename__ = "owntracks_device_events"
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class OwnTracksTransitionEvent(Base, _SourceRow):
    __tablename__ = "owntracks_transition_events"
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    waypoint_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    waypoint_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transition: Mapped[str | None] = mapped_column(String(40), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    radius: Mapped[float | None] = mapped_column(Float, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class OwnTracksWaypoint(Base, _SourceRow):
    __tablename__ = "owntracks_waypoints"
    waypoint_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    waypoint_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    radius: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class OpenWeatherDaily(Base, _SourceRow):
    __tablename__ = "openweather_daily"
    date: Mapped[date] = mapped_column(Date, index=True)
    sunrise_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sunset_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    daylight_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature_high_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature_low_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(80), nullable=True)
    uv_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class OpenWeatherHourly(Base, _SourceRow):
    __tablename__ = "openweather_hourly"
    observed_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    temperature_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    feels_like_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    humidity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(80), nullable=True)
    uv_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    precipitation_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class SpotifyArtist(Base, _SourceRow):
    __tablename__ = "spotify_artists"
    spotify_artist_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    genres: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spotify_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class SpotifyAlbum(Base, _SourceRow):
    __tablename__ = "spotify_albums"
    spotify_album_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    album_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    release_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    total_tracks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    artist_names: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    spotify_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class SpotifyTrackArtist(Base, _SourceRow):
    __tablename__ = "spotify_track_artists"
    spotify_track_id: Mapped[str] = mapped_column(String(120), index=True)
    spotify_artist_id: Mapped[str] = mapped_column(String(120), index=True)
    artist_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    artist_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    album_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)


class SpotifyAudioFeature(Base, _SourceRow):
    __tablename__ = "spotify_audio_features"
    spotify_track_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    danceability: Mapped[float | None] = mapped_column(Float, nullable=True)
    energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    valence: Mapped[float | None] = mapped_column(Float, nullable=True)
    tempo: Mapped[float | None] = mapped_column(Float, nullable=True)
    acousticness: Mapped[float | None] = mapped_column(Float, nullable=True)
    instrumentalness: Mapped[float | None] = mapped_column(Float, nullable=True)
    liveness: Mapped[float | None] = mapped_column(Float, nullable=True)
    speechiness: Mapped[float | None] = mapped_column(Float, nullable=True)
    loudness: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    musical_key: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mode: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_signature: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class YoutubeChannel(Base, _SourceRow):
    __tablename__ = "youtube_channels"
    channel_id: Mapped[str | None] = mapped_column(String(160), unique=True, index=True, nullable=True)
    channel_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    channel_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subscription_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class YoutubePlaylist(Base, _SourceRow):
    __tablename__ = "youtube_playlists"
    playlist_id: Mapped[str | None] = mapped_column(String(160), unique=True, index=True, nullable=True)
    playlist_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    playlist_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    item_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class ChromeExtension(Base, _SourceRow):
    __tablename__ = "chrome_extensions"
    extension_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version: Mapped[str | None] = mapped_column(String(80), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class ChromeDevice(Base, _SourceRow):
    __tablename__ = "chrome_devices"
    device_id: Mapped[str | None] = mapped_column(String(160), unique=True, index=True, nullable=True)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class InstagramProfile(Base, _SourceRow):
    __tablename__ = "instagram_profiles"
    profile_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class InstagramMessage(Base, _SourceRow):
    __tablename__ = "instagram_messages"
    thread_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    sender: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    recipient: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class InstagramMedia(Base, _SourceRow):
    __tablename__ = "instagram_media"
    media_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class InstagramReaction(Base, _SourceRow):
    __tablename__ = "instagram_reactions"
    reacted_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    reaction_type: Mapped[str] = mapped_column(String(80), index=True)
    actor: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class SnapchatFriend(Base, _SourceRow):
    __tablename__ = "snapchat_friends"
    friend_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    friend_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class SnapchatChatEvent(Base, _SourceRow):
    __tablename__ = "snapchat_chat_events"
    chat_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    sender: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    recipient: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class SnapchatSnapEvent(Base, _SourceRow):
    __tablename__ = "snapchat_snap_events"
    snap_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    sender: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class SnapchatStoryEvent(Base, _SourceRow):
    __tablename__ = "snapchat_story_events"
    story_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    path: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
