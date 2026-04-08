from __future__ import annotations

import uuid
from datetime import date, datetime, time

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class _HealthDataMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    steps: Mapped[int | None] = mapped_column(Integer, default=0)
    sleep_duration_hours: Mapped[float | None] = mapped_column(Float, default=0)
    sleep_quality: Mapped[float | None] = mapped_column(Float, default=0)
    hrv_ms: Mapped[float | None] = mapped_column(Float, default=0)
    resting_hr: Mapped[int | None] = mapped_column(Integer, default=0)
    workout_logged: Mapped[bool] = mapped_column(Boolean, default=False)
    workout_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    workout_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HealthDataReal(_HealthDataMixin, Base):
    __tablename__ = "health_data_real"


class HealthDataDemo(_HealthDataMixin, Base):
    __tablename__ = "health_data_demo"


class _FinanceDataMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    amount_pence: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(50), index=True)
    merchant: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    account_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    account_ref: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    source_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FinanceDataReal(_FinanceDataMixin, Base):
    __tablename__ = "finance_data_real"


class FinanceDataDemo(_FinanceDataMixin, Base):
    __tablename__ = "finance_data_demo"


class _MusicDataMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    listening_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_valence: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_danceability: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_discoveries: Mapped[int] = mapped_column(Integer, default=0)
    top_genres: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    top_tracks: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    provider_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MusicDataReal(_MusicDataMixin, Base):
    __tablename__ = "music_data_real"


class MusicDataDemo(_MusicDataMixin, Base):
    __tablename__ = "music_data_demo"


class _SpotifyPlayEventMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    played_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    played_date: Mapped[date] = mapped_column(Date, index=True)
    track_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    track_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    artist_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    album_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    track_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)
    context_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    context_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    explicit: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    popularity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    valence: Mapped[float | None] = mapped_column(Float, nullable=True)
    energy: Mapped[float | None] = mapped_column(Float, nullable=True)
    danceability: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SpotifyPlayEventReal(_SpotifyPlayEventMixin, Base):
    __tablename__ = "spotify_play_events_real"
    __table_args__ = (UniqueConstraint("played_at", "track_id", name="uq_spotify_play_events_real_played_track"),)


class SpotifyPlayEventDemo(_SpotifyPlayEventMixin, Base):
    __tablename__ = "spotify_play_events_demo"
    __table_args__ = (UniqueConstraint("played_at", "track_id", name="uq_spotify_play_events_demo_played_track"),)


class _WeatherDataMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    sunrise_time: Mapped[time] = mapped_column(Time)
    sunset_time: Mapped[time] = mapped_column(Time)
    daylight_hours: Mapped[float] = mapped_column(Float)
    temperature_high_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature_low_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uv_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WeatherDataReal(_WeatherDataMixin, Base):
    __tablename__ = "weather_data_real"


class WeatherDataDemo(_WeatherDataMixin, Base):
    __tablename__ = "weather_data_demo"


class _NutritionLogMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    breakfast: Mapped[bool] = mapped_column(Boolean, default=False)
    lunch: Mapped[bool] = mapped_column(Boolean, default=False)
    dinner: Mapped[bool] = mapped_column(Boolean, default=False)
    heavy_snacking: Mapped[bool] = mapped_column(Boolean, default=False)
    food_quality: Mapped[int | None] = mapped_column(Integer, nullable=True)
    caffeine_count: Mapped[int] = mapped_column(Integer, default=0)
    caffeine_last_before_noon: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    alcohol_units: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NutritionLogReal(_NutritionLogMixin, Base):
    __tablename__ = "nutrition_logs_real"


class NutritionLogDemo(_NutritionLogMixin, Base):
    __tablename__ = "nutrition_logs_demo"


class _DailyCheckInMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    timestamp: Mapped[int] = mapped_column(BigInteger, index=True)
    emotional_state: Mapped[int] = mapped_column(Integer)
    energy_level: Mapped[int] = mapped_column(Integer)
    one_word: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyCheckInReal(_DailyCheckInMixin, Base):
    __tablename__ = "daily_checkins_real"


class DailyCheckInDemo(_DailyCheckInMixin, Base):
    __tablename__ = "daily_checkins_demo"


class _HabitLogMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    habit_id: Mapped[str] = mapped_column(ForeignKey("habits.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    completed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    numeric_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    scale_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HabitLogReal(_HabitLogMixin, Base):
    __tablename__ = "habit_logs_real"
    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_habit_logs_real_habit_date"),)


class HabitLogDemo(_HabitLogMixin, Base):
    __tablename__ = "habit_logs_demo"
    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_habit_logs_demo_habit_date"),)


class _RelationshipMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))
    tier: Mapped[str] = mapped_column(String(20))
    desired_frequency_days: Mapped[int] = mapped_column(Integer)
    avatar_colour: Mapped[str | None] = mapped_column(String(7), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RelationshipReal(_RelationshipMixin, Base):
    __tablename__ = "relationships_real"


class RelationshipDemo(_RelationshipMixin, Base):
    __tablename__ = "relationships_demo"


class _RelationshipInteractionMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    date: Mapped[date] = mapped_column(Date, index=True)
    timestamp: Mapped[int] = mapped_column(BigInteger, index=True)
    person_ids: Mapped[list[str]] = mapped_column(JSON)
    interaction_type: Mapped[str] = mapped_column(String(50))
    presence_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feeling_word: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RelationshipInteractionReal(_RelationshipInteractionMixin, Base):
    __tablename__ = "relationship_interactions_real"


class RelationshipInteractionDemo(_RelationshipInteractionMixin, Base):
    __tablename__ = "relationship_interactions_demo"


class _RelationshipScreenshotImportMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(40), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    matched_person_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    detected_labels: Mapped[list[str]] = mapped_column(JSON, default=list)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class RelationshipScreenshotImportReal(_RelationshipScreenshotImportMixin, Base):
    __tablename__ = "relationship_screenshot_imports_real"


class RelationshipScreenshotImportDemo(_RelationshipScreenshotImportMixin, Base):
    __tablename__ = "relationship_screenshot_imports_demo"


class _LocationDataMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LocationDataReal(_LocationDataMixin, Base):
    __tablename__ = "location_data_real"


class LocationDataDemo(_LocationDataMixin, Base):
    __tablename__ = "location_data_demo"


class _LocationDailySummaryMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    home_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    gym_visits: Mapped[int] = mapped_column(Integer, default=0)
    social_venue_visits: Mapped[int] = mapped_column(Integer, default=0)
    new_places_visited: Mapped[int] = mapped_column(Integer, default=0)
    commute_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    time_outdoors_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LocationDailySummaryReal(_LocationDailySummaryMixin, Base):
    __tablename__ = "location_daily_summary_real"


class LocationDailySummaryDemo(_LocationDailySummaryMixin, Base):
    __tablename__ = "location_daily_summary_demo"


class _LocationCompanionLogMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    person_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    context_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LocationCompanionLogReal(_LocationCompanionLogMixin, Base):
    __tablename__ = "location_companion_logs_real"


class LocationCompanionLogDemo(_LocationCompanionLogMixin, Base):
    __tablename__ = "location_companion_logs_demo"


class _UserProfileMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile_document: Mapped[str] = mapped_column(Text)
    last_therapy_session: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    key_themes: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    active_goals: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    important_relationships: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    health_baseline: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mood_baseline: Mapped[float | None] = mapped_column(Float, nullable=True)
    notable_patterns: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)


class UserProfileReal(_UserProfileMixin, Base):
    __tablename__ = "user_profile_real"


class UserProfileDemo(_UserProfileMixin, Base):
    __tablename__ = "user_profile_demo"


class _MonthlyBudgetMixin:
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    month: Mapped[date] = mapped_column(Date, index=True)
    limit_pence: Mapped[int] = mapped_column(Integer, default=1000)
    spent_pence: Mapped[int] = mapped_column(Integer, default=0)
    auto_switch_at_80: Mapped[bool] = mapped_column(Boolean, default=True)
    disable_paid_at_limit: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MonthlyBudgetReal(_MonthlyBudgetMixin, Base):
    __tablename__ = "monthly_budget_real"
    __table_args__ = (UniqueConstraint("month", name="uq_monthly_budget_real_month"),)


class MonthlyBudgetDemo(_MonthlyBudgetMixin, Base):
    __tablename__ = "monthly_budget_demo"
    __table_args__ = (UniqueConstraint("month", name="uq_monthly_budget_demo_month"),)


class _AIConversationMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    session_type: Mapped[str] = mapped_column(String(20), default="async")
    ai_provider: Mapped[str] = mapped_column(String(50))
    ai_model: Mapped[str] = mapped_column(String(100))
    total_tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_pence: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AIConversationReal(_AIConversationMixin, Base):
    __tablename__ = "ai_conversations_real"

    messages: Mapped[list["AIMessageReal"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class AIConversationDemo(_AIConversationMixin, Base):
    __tablename__ = "ai_conversations_demo"

    messages: Mapped[list["AIMessageDemo"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class _AIMessageMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_pence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    frameworks_referenced: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)


class AIMessageReal(_AIMessageMixin, Base):
    __tablename__ = "ai_messages_real"

    conversation_id: Mapped[str] = mapped_column(ForeignKey("ai_conversations_real.id"), index=True)
    conversation: Mapped[AIConversationReal] = relationship(back_populates="messages")


class AIMessageDemo(_AIMessageMixin, Base):
    __tablename__ = "ai_messages_demo"

    conversation_id: Mapped[str] = mapped_column(ForeignKey("ai_conversations_demo.id"), index=True)
    conversation: Mapped[AIConversationDemo] = relationship(back_populates="messages")
