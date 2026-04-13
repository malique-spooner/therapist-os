"""add source-specific standard tables

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


def _base() -> list[sa.Column]:
    return [
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_row_hash", sa.String(length=64), nullable=False),
        sa.Column("import_file_id", sa.Integer(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    ]


def _create(name: str, extra: list[sa.Column]) -> None:
    op.create_table(name, *_base(), *extra)
    op.create_index(f"ix_{name}_source_row_hash", name, ["source_row_hash"], unique=True)


def upgrade() -> None:
    _create(
        "owntracks_location_points",
        [
            sa.Column("recorded_at", sa.DateTime(), nullable=True),
            sa.Column("device_id", sa.String(length=120), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("accuracy", sa.Float(), nullable=True),
            sa.Column("battery_level", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=40), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "owntracks_device_events",
        [
            sa.Column("occurred_at", sa.DateTime(), nullable=True),
            sa.Column("device_id", sa.String(length=120), nullable=True),
            sa.Column("event_type", sa.String(length=40), nullable=False),
            sa.Column("detail", sa.String(length=255), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "owntracks_transition_events",
        [
            sa.Column("occurred_at", sa.DateTime(), nullable=True),
            sa.Column("device_id", sa.String(length=120), nullable=True),
            sa.Column("waypoint_id", sa.String(length=120), nullable=True),
            sa.Column("waypoint_name", sa.String(length=255), nullable=True),
            sa.Column("transition", sa.String(length=40), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("radius", sa.Float(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "owntracks_waypoints",
        [
            sa.Column("waypoint_id", sa.String(length=120), nullable=False),
            sa.Column("waypoint_name", sa.String(length=255), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("radius", sa.Float(), nullable=True),
            sa.Column("category", sa.String(length=80), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "openweather_daily",
        [
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("sunrise_time", sa.DateTime(), nullable=True),
            sa.Column("sunset_time", sa.DateTime(), nullable=True),
            sa.Column("daylight_hours", sa.Float(), nullable=True),
            sa.Column("temperature_high_c", sa.Float(), nullable=True),
            sa.Column("temperature_low_c", sa.Float(), nullable=True),
            sa.Column("condition", sa.String(length=80), nullable=True),
            sa.Column("uv_index", sa.Float(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "openweather_hourly",
        [
            sa.Column("observed_at", sa.DateTime(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("temperature_c", sa.Float(), nullable=True),
            sa.Column("feels_like_c", sa.Float(), nullable=True),
            sa.Column("humidity", sa.Integer(), nullable=True),
            sa.Column("condition", sa.String(length=80), nullable=True),
            sa.Column("uv_index", sa.Float(), nullable=True),
            sa.Column("precipitation_mm", sa.Float(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "spotify_artists",
        [
            sa.Column("spotify_artist_id", sa.String(length=120), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("genres", sa.JSON(), nullable=True),
            sa.Column("popularity", sa.Integer(), nullable=True),
            sa.Column("spotify_url", sa.String(length=500), nullable=True),
        ],
    )
    _create(
        "spotify_albums",
        [
            sa.Column("spotify_album_id", sa.String(length=120), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("album_type", sa.String(length=80), nullable=True),
            sa.Column("release_date", sa.String(length=40), nullable=True),
            sa.Column("total_tracks", sa.Integer(), nullable=True),
            sa.Column("artist_names", sa.JSON(), nullable=True),
            sa.Column("spotify_url", sa.String(length=500), nullable=True),
        ],
    )
    _create(
        "spotify_track_artists",
        [
            sa.Column("spotify_track_id", sa.String(length=120), nullable=False),
            sa.Column("spotify_artist_id", sa.String(length=120), nullable=False),
            sa.Column("artist_name", sa.String(length=255), nullable=True),
            sa.Column("artist_order", sa.Integer(), nullable=True),
            sa.Column("album_id", sa.String(length=120), nullable=True),
        ],
    )
    _create(
        "spotify_audio_features",
        [
            sa.Column("spotify_track_id", sa.String(length=120), nullable=False),
            sa.Column("danceability", sa.Float(), nullable=True),
            sa.Column("energy", sa.Float(), nullable=True),
            sa.Column("valence", sa.Float(), nullable=True),
            sa.Column("tempo", sa.Float(), nullable=True),
            sa.Column("acousticness", sa.Float(), nullable=True),
            sa.Column("instrumentalness", sa.Float(), nullable=True),
            sa.Column("liveness", sa.Float(), nullable=True),
            sa.Column("speechiness", sa.Float(), nullable=True),
            sa.Column("loudness", sa.Float(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column("musical_key", sa.Integer(), nullable=True),
            sa.Column("mode", sa.Integer(), nullable=True),
            sa.Column("time_signature", sa.Integer(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "youtube_channels",
        [
            sa.Column("channel_id", sa.String(length=160), nullable=True),
            sa.Column("channel_url", sa.Text(), nullable=True),
            sa.Column("channel_title", sa.String(length=255), nullable=True),
            sa.Column("subscription_date", sa.DateTime(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "youtube_playlists",
        [
            sa.Column("playlist_id", sa.String(length=160), nullable=True),
            sa.Column("playlist_url", sa.Text(), nullable=True),
            sa.Column("playlist_title", sa.String(length=255), nullable=True),
            sa.Column("item_count", sa.Integer(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "chrome_extensions",
        [
            sa.Column("extension_id", sa.String(length=120), nullable=True),
            sa.Column("name", sa.String(length=255), nullable=True),
            sa.Column("version", sa.String(length=80), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "chrome_devices",
        [
            sa.Column("device_id", sa.String(length=160), nullable=True),
            sa.Column("device_name", sa.String(length=255), nullable=True),
            sa.Column("device_type", sa.String(length=80), nullable=True),
            sa.Column("last_active_at", sa.DateTime(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "instagram_profiles",
        [
            sa.Column("profile_id", sa.String(length=120), nullable=True),
            sa.Column("username", sa.String(length=255), nullable=True),
            sa.Column("display_name", sa.String(length=255), nullable=True),
            sa.Column("bio", sa.Text(), nullable=True),
            sa.Column("profile_url", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "instagram_messages",
        [
            sa.Column("thread_id", sa.String(length=120), nullable=True),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.Column("sender", sa.String(length=255), nullable=True),
            sa.Column("recipient", sa.String(length=255), nullable=True),
            sa.Column("text", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "instagram_media",
        [
            sa.Column("media_id", sa.String(length=120), nullable=True),
            sa.Column("posted_at", sa.DateTime(), nullable=True),
            sa.Column("media_type", sa.String(length=40), nullable=True),
            sa.Column("caption", sa.Text(), nullable=True),
            sa.Column("media_url", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "instagram_reactions",
        [
            sa.Column("reacted_at", sa.DateTime(), nullable=True),
            sa.Column("reaction_type", sa.String(length=80), nullable=False),
            sa.Column("actor", sa.String(length=255), nullable=True),
            sa.Column("target", sa.String(length=255), nullable=True),
            sa.Column("text", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "snapchat_friends",
        [
            sa.Column("friend_id", sa.String(length=120), nullable=True),
            sa.Column("username", sa.String(length=255), nullable=True),
            sa.Column("display_name", sa.String(length=255), nullable=True),
            sa.Column("friend_status", sa.String(length=40), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "snapchat_chat_events",
        [
            sa.Column("chat_id", sa.String(length=120), nullable=True),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.Column("sender", sa.String(length=255), nullable=True),
            sa.Column("recipient", sa.String(length=255), nullable=True),
            sa.Column("text", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "snapchat_snap_events",
        [
            sa.Column("snap_id", sa.String(length=120), nullable=True),
            sa.Column("sent_at", sa.DateTime(), nullable=True),
            sa.Column("sender", sa.String(length=255), nullable=True),
            sa.Column("caption", sa.Text(), nullable=True),
            sa.Column("media_url", sa.Text(), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )
    _create(
        "snapchat_story_events",
        [
            sa.Column("story_id", sa.String(length=120), nullable=True),
            sa.Column("posted_at", sa.DateTime(), nullable=True),
            sa.Column("author", sa.String(length=255), nullable=True),
            sa.Column("title", sa.String(length=255), nullable=True),
            sa.Column("path", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
        ],
    )


def downgrade() -> None:
    for name in reversed(
        [
            "snapchat_story_events",
            "snapchat_snap_events",
            "snapchat_chat_events",
            "snapchat_friends",
            "instagram_reactions",
            "instagram_media",
            "instagram_messages",
            "instagram_profiles",
            "chrome_devices",
            "chrome_extensions",
            "youtube_playlists",
            "youtube_channels",
            "spotify_audio_features",
            "spotify_track_artists",
            "spotify_albums",
            "spotify_artists",
            "openweather_hourly",
            "openweather_daily",
            "owntracks_waypoints",
            "owntracks_transition_events",
            "owntracks_device_events",
            "owntracks_location_points",
        ]
    ):
        op.drop_index(f"ix_{name}_source_row_hash", table_name=name)
        op.drop_table(name)
