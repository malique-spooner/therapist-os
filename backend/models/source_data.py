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
