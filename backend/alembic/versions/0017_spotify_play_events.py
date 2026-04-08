"""add spotify play event tables

Revision ID: 0017_spotify_play_events
Revises: 0016_data_source_sync_attempts
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "0017_spotify_play_events"
down_revision = "0016_data_source_sync_attempts"
branch_labels = None
depends_on = None


def _create_table(name: str) -> None:
    op.create_table(
        name,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("played_at", sa.DateTime(), nullable=False),
        sa.Column("played_date", sa.Date(), nullable=False),
        sa.Column("track_id", sa.String(length=120), nullable=True),
        sa.Column("track_name", sa.String(length=255), nullable=True),
        sa.Column("artist_name", sa.String(length=255), nullable=True),
        sa.Column("album_name", sa.String(length=255), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("track_uri", sa.String(length=255), nullable=True),
        sa.Column("context_type", sa.String(length=80), nullable=True),
        sa.Column("context_uri", sa.String(length=255), nullable=True),
        sa.Column("external_url", sa.String(length=500), nullable=True),
        sa.Column("explicit", sa.Boolean(), nullable=True),
        sa.Column("popularity", sa.Integer(), nullable=True),
        sa.Column("preview_url", sa.String(length=500), nullable=True),
        sa.Column("valence", sa.Float(), nullable=True),
        sa.Column("energy", sa.Float(), nullable=True),
        sa.Column("danceability", sa.Float(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("played_at", "track_id", name=f"uq_{name}_played_track"),
    )
    op.create_index(f"ix_{name}_played_at", name, ["played_at"], unique=False)
    op.create_index(f"ix_{name}_played_date", name, ["played_date"], unique=False)
    op.create_index(f"ix_{name}_track_id", name, ["track_id"], unique=False)


def upgrade() -> None:
    _create_table("spotify_play_events_real")
    _create_table("spotify_play_events_demo")


def downgrade() -> None:
    for name in ("spotify_play_events_demo", "spotify_play_events_real"):
        op.drop_index(f"ix_{name}_track_id", table_name=name)
        op.drop_index(f"ix_{name}_played_date", table_name=name)
        op.drop_index(f"ix_{name}_played_at", table_name=name)
        op.drop_table(name)
