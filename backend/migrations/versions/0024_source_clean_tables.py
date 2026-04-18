"""add source clean tables

Revision ID: 0024_source_clean_tables
Revises: 0023_raw_import_rows
Create Date: 2026-04-13
"""

from alembic import op
import sqlalchemy as sa


revision = "0024_source_clean_tables"
down_revision = "0023_raw_import_rows"
branch_labels = None
depends_on = None


def _base() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_row_hash", sa.String(length=64), nullable=False),
        sa.Column("import_file_id", sa.Integer(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def _ix(name: str, cols: list[str], unique: bool = False) -> None:
    op.create_index(f"ix_{name}_{'_'.join(cols)}", name, cols, unique=unique)


def _common_ix(name: str) -> None:
    _ix(name, ["source_row_hash"], unique=True)
    _ix(name, ["import_file_id"])


def upgrade() -> None:
    op.create_table("garmin_daily_wellness", *_base(), sa.Column("date", sa.Date(), nullable=False), sa.Column("steps", sa.Integer()), sa.Column("distance_meters", sa.Integer()), sa.Column("total_calories", sa.Float()), sa.Column("active_calories", sa.Float()), sa.Column("active_seconds", sa.Integer()), sa.Column("min_heart_rate", sa.Integer()), sa.Column("max_heart_rate", sa.Integer()), sa.Column("resting_heart_rate", sa.Integer()))
    op.create_table("garmin_sleep_sessions", *_base(), sa.Column("sleep_date", sa.Date()), sa.Column("started_at", sa.DateTime()), sa.Column("ended_at", sa.DateTime()), sa.Column("duration_minutes", sa.Integer()), sa.Column("deep_minutes", sa.Integer()), sa.Column("light_minutes", sa.Integer()), sa.Column("rem_minutes", sa.Integer()), sa.Column("awake_minutes", sa.Integer()), sa.Column("sleep_score", sa.Float()))
    op.create_table("garmin_body_metrics", *_base(), sa.Column("measured_at", sa.DateTime()), sa.Column("metric_date", sa.Date()), sa.Column("weight_kg", sa.Float()), sa.Column("bmi", sa.Float()), sa.Column("body_fat_percent", sa.Float()))
    op.create_table("garmin_fitness_metrics", *_base(), sa.Column("metric_date", sa.Date()), sa.Column("metric_type", sa.String(length=80), nullable=False), sa.Column("value", sa.Float()))
    op.create_table("garmin_hydration_logs", *_base(), sa.Column("logged_at", sa.DateTime()), sa.Column("log_date", sa.Date()), sa.Column("volume_ml", sa.Float()))
    op.create_table("revolut_transactions", *_base(), sa.Column("transaction_uid", sa.String(length=120), nullable=False), sa.Column("occurred_at", sa.DateTime()), sa.Column("completed_at", sa.DateTime()), sa.Column("type", sa.String(length=80)), sa.Column("product", sa.String(length=80)), sa.Column("description", sa.Text()), sa.Column("amount_minor", sa.BigInteger()), sa.Column("fee_minor", sa.BigInteger()), sa.Column("currency", sa.String(length=10)), sa.Column("state", sa.String(length=40)), sa.Column("balance_minor", sa.BigInteger()), sa.UniqueConstraint("transaction_uid", name="uq_revolut_transactions_uid"))
    op.create_table("natwest_transactions", *_base(), sa.Column("transaction_uid", sa.String(length=120), nullable=False), sa.Column("occurred_on", sa.Date()), sa.Column("type", sa.String(length=80)), sa.Column("description", sa.Text()), sa.Column("value_minor", sa.BigInteger()), sa.Column("balance_minor", sa.BigInteger()), sa.Column("account_name", sa.String(length=160)), sa.Column("account_ref", sa.String(length=120)), sa.UniqueConstraint("transaction_uid", name="uq_natwest_transactions_uid"))
    op.create_table("spotify_tracks", *_base(), sa.Column("spotify_track_id", sa.String(length=120), nullable=False), sa.Column("name", sa.String(length=255)), sa.Column("artist_name", sa.String(length=255)), sa.Column("album_name", sa.String(length=255)), sa.Column("duration_ms", sa.Integer()), sa.Column("explicit", sa.Boolean()), sa.Column("popularity", sa.Integer()), sa.Column("spotify_url", sa.String(length=500)), sa.UniqueConstraint("spotify_track_id", name="uq_spotify_tracks_track_id"))
    op.create_table("spotify_play_events", *_base(), sa.Column("played_at", sa.DateTime(), nullable=False), sa.Column("spotify_track_id", sa.String(length=120)), sa.Column("context_type", sa.String(length=80)), sa.Column("context_uri", sa.String(length=255)), sa.UniqueConstraint("played_at", "spotify_track_id", name="uq_spotify_play_events_played_track"))
    op.create_table("youtube_watch_events", *_base(), sa.Column("watched_at", sa.DateTime()), sa.Column("title", sa.Text()), sa.Column("video_url", sa.Text()), sa.Column("channel_name", sa.String(length=255)), sa.Column("channel_url", sa.Text()))
    op.create_table("youtube_search_events", *_base(), sa.Column("searched_at", sa.DateTime()), sa.Column("query", sa.Text()))
    op.create_table("youtube_subscriptions", *_base(), sa.Column("channel_id", sa.String(length=160)), sa.Column("channel_url", sa.Text()), sa.Column("channel_title", sa.String(length=255)))
    op.create_table("chrome_history_events", *_base(), sa.Column("visited_at", sa.DateTime()), sa.Column("url", sa.Text()), sa.Column("title", sa.Text()), sa.Column("domain", sa.String(length=255)))
    op.create_table("chrome_bookmarks", *_base(), sa.Column("url", sa.Text()), sa.Column("title", sa.Text()), sa.Column("folder", sa.String(length=255)))
    op.create_table("instagram_interactions", *_base(), sa.Column("occurred_at", sa.DateTime()), sa.Column("interaction_type", sa.String(length=80), nullable=False), sa.Column("actor", sa.String(length=255)), sa.Column("text", sa.Text()), sa.Column("path", sa.Text()))
    op.create_table("snapchat_interactions", *_base(), sa.Column("occurred_at", sa.DateTime()), sa.Column("interaction_type", sa.String(length=80), nullable=False), sa.Column("actor", sa.String(length=255)), sa.Column("text", sa.Text()), sa.Column("path", sa.Text()))

    for name in ("garmin_daily_wellness", "garmin_sleep_sessions", "garmin_body_metrics", "garmin_fitness_metrics", "garmin_hydration_logs", "revolut_transactions", "natwest_transactions", "spotify_tracks", "spotify_play_events", "youtube_watch_events", "youtube_search_events", "youtube_subscriptions", "chrome_history_events", "chrome_bookmarks", "instagram_interactions", "snapchat_interactions"):
        _common_ix(name)


def downgrade() -> None:
    for name in reversed(("garmin_daily_wellness", "garmin_sleep_sessions", "garmin_body_metrics", "garmin_fitness_metrics", "garmin_hydration_logs", "revolut_transactions", "natwest_transactions", "spotify_tracks", "spotify_play_events", "youtube_watch_events", "youtube_search_events", "youtube_subscriptions", "chrome_history_events", "chrome_bookmarks", "instagram_interactions", "snapchat_interactions")):
        op.drop_table(name)
