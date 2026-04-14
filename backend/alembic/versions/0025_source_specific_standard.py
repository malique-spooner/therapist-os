"""add source-specific live tables

Revision ID: 0025_source_specific_standard
Revises: 0024_source_clean_tables
Create Date: 2026-04-14 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0025_source_specific_standard"
down_revision = "0024_source_clean_tables"
branch_labels = None
depends_on = None


def _bind():
    return op.get_bind()


def _has_table(name: str) -> bool:
    return sa.inspect(_bind()).has_table(name)


def _base_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_row_hash", sa.String(length=64), nullable=False),
        sa.Column("import_file_id", sa.Integer(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]


def _create(name: str, extra_columns: list[sa.Column]) -> bool:
    if _has_table(name):
        return False
    op.create_table(name, *_base_columns(), *extra_columns)
    op.create_index(f"ix_{name}_source_row_hash", name, ["source_row_hash"], unique=True)
    op.create_index(f"ix_{name}_import_file_id", name, ["import_file_id"], unique=False)
    return True


def upgrade() -> None:
    _create(
        "garmin_daily_wellness",
        [
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("steps", sa.Integer(), nullable=True),
            sa.Column("distance_meters", sa.Integer(), nullable=True),
            sa.Column("total_calories", sa.Float(), nullable=True),
            sa.Column("active_calories", sa.Float(), nullable=True),
            sa.Column("active_seconds", sa.Integer(), nullable=True),
            sa.Column("min_heart_rate", sa.Integer(), nullable=True),
            sa.Column("max_heart_rate", sa.Integer(), nullable=True),
            sa.Column("resting_heart_rate", sa.Integer(), nullable=True),
        ],
    )
    _create(
        "garmin_sleep_sessions",
        [
            sa.Column("sleep_date", sa.Date(), nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("ended_at", sa.DateTime(), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=True),
            sa.Column("deep_minutes", sa.Integer(), nullable=True),
            sa.Column("light_minutes", sa.Integer(), nullable=True),
            sa.Column("rem_minutes", sa.Integer(), nullable=True),
            sa.Column("awake_minutes", sa.Integer(), nullable=True),
            sa.Column("sleep_score", sa.Float(), nullable=True),
        ],
    )
    _create(
        "garmin_body_metrics",
        [
            sa.Column("measured_at", sa.DateTime(), nullable=True),
            sa.Column("metric_date", sa.Date(), nullable=True),
            sa.Column("weight_kg", sa.Float(), nullable=True),
            sa.Column("bmi", sa.Float(), nullable=True),
            sa.Column("body_fat_percent", sa.Float(), nullable=True),
        ],
    )
    _create(
        "garmin_fitness_metrics",
        [
            sa.Column("metric_date", sa.Date(), nullable=True),
            sa.Column("metric_type", sa.String(length=80), nullable=False),
            sa.Column("value", sa.Float(), nullable=True),
        ],
    )
    _create(
        "garmin_hydration_logs",
        [
            sa.Column("logged_at", sa.DateTime(), nullable=True),
            sa.Column("log_date", sa.Date(), nullable=True),
            sa.Column("volume_ml", sa.Float(), nullable=True),
        ],
    )
    created = _create(
        "revolut_transactions",
        [
            sa.Column("transaction_uid", sa.String(length=120), nullable=False),
            sa.Column("occurred_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("type", sa.String(length=80), nullable=True),
            sa.Column("product", sa.String(length=80), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("amount_minor", sa.BigInteger(), nullable=True),
            sa.Column("fee_minor", sa.BigInteger(), nullable=True),
            sa.Column("currency", sa.String(length=10), nullable=True),
            sa.Column("state", sa.String(length=40), nullable=True),
            sa.Column("balance_minor", sa.BigInteger(), nullable=True),
        ],
    )
    if created:
        op.create_index("ix_revolut_transactions_transaction_uid", "revolut_transactions", ["transaction_uid"], unique=True)
    created = _create(
        "natwest_transactions",
        [
            sa.Column("transaction_uid", sa.String(length=120), nullable=False),
            sa.Column("occurred_on", sa.Date(), nullable=True),
            sa.Column("type", sa.String(length=80), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("value_minor", sa.BigInteger(), nullable=True),
            sa.Column("balance_minor", sa.BigInteger(), nullable=True),
            sa.Column("account_name", sa.String(length=160), nullable=True),
            sa.Column("account_ref", sa.String(length=120), nullable=True),
        ],
    )
    if created:
        op.create_index("ix_natwest_transactions_transaction_uid", "natwest_transactions", ["transaction_uid"], unique=True)
    created = _create(
        "spotify_tracks",
        [
            sa.Column("spotify_track_id", sa.String(length=120), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("artist_name", sa.String(length=255), nullable=True),
            sa.Column("album_name", sa.String(length=255), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column("explicit", sa.Boolean(), nullable=True),
            sa.Column("popularity", sa.Integer(), nullable=True),
            sa.Column("spotify_url", sa.String(length=500), nullable=True),
        ],
    )
    if created:
        op.create_index("ix_spotify_tracks_spotify_track_id", "spotify_tracks", ["spotify_track_id"], unique=True)
    created = _create(
        "spotify_play_events",
        [
            sa.Column("played_at", sa.DateTime(), nullable=False),
            sa.Column("spotify_track_id", sa.String(length=120), nullable=True),
            sa.Column("context_type", sa.String(length=80), nullable=True),
            sa.Column("context_uri", sa.String(length=255), nullable=True),
        ],
    )
    if created:
        op.create_index(
            "ix_spotify_play_events_played_at_spotify_track_id",
            "spotify_play_events",
            ["played_at", "spotify_track_id"],
            unique=True,
        )
    _create(
        "youtube_watch_events",
        [
            sa.Column("watched_at", sa.DateTime(), nullable=True),
            sa.Column("title", sa.Text(), nullable=True),
            sa.Column("video_url", sa.Text(), nullable=True),
            sa.Column("channel_name", sa.String(length=255), nullable=True),
            sa.Column("channel_url", sa.Text(), nullable=True),
        ],
    )
    _create(
        "youtube_search_events",
        [
            sa.Column("searched_at", sa.DateTime(), nullable=True),
            sa.Column("query", sa.Text(), nullable=True),
        ],
    )
    _create(
        "youtube_subscriptions",
        [
            sa.Column("channel_id", sa.String(length=160), nullable=True),
            sa.Column("channel_url", sa.Text(), nullable=True),
            sa.Column("channel_title", sa.String(length=255), nullable=True),
        ],
    )
    _create(
        "chrome_history_events",
        [
            sa.Column("visited_at", sa.DateTime(), nullable=True),
            sa.Column("url", sa.Text(), nullable=True),
            sa.Column("title", sa.Text(), nullable=True),
            sa.Column("domain", sa.String(length=255), nullable=True),
        ],
    )
    _create(
        "chrome_bookmarks",
        [
            sa.Column("url", sa.Text(), nullable=True),
            sa.Column("title", sa.Text(), nullable=True),
            sa.Column("folder", sa.String(length=255), nullable=True),
        ],
    )
    _create(
        "instagram_interactions",
        [
            sa.Column("occurred_at", sa.DateTime(), nullable=True),
            sa.Column("interaction_type", sa.String(length=80), nullable=False),
            sa.Column("actor", sa.String(length=255), nullable=True),
            sa.Column("text", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
        ],
    )
    _create(
        "snapchat_interactions",
        [
            sa.Column("occurred_at", sa.DateTime(), nullable=True),
            sa.Column("interaction_type", sa.String(length=80), nullable=False),
            sa.Column("actor", sa.String(length=255), nullable=True),
            sa.Column("text", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
        ],
    )


def downgrade() -> None:
    # This migration only creates missing live tables; dropping them is not safe on a live dataset.
    pass
