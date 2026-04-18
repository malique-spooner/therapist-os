"""location data

Revision ID: 0004_location_data
Revises: 0003_music_data
Create Date: 2026-04-01 06:55:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_location_data"
down_revision = "0003_music_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "location_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float()),
        sa.Column("battery_level", sa.Integer()),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_index("ix_location_data_timestamp", "location_data", ["timestamp"])
    op.create_table(
        "location_daily_summary",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("home_hours", sa.Float()),
        sa.Column("gym_visits", sa.Integer(), server_default=sa.text("0")),
        sa.Column("social_venue_visits", sa.Integer(), server_default=sa.text("0")),
        sa.Column("new_places_visited", sa.Integer(), server_default=sa.text("0")),
        sa.Column("commute_detected", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("time_outdoors_minutes", sa.Integer()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_location_daily_summary_date", "location_daily_summary", ["date"])


def downgrade() -> None:
    op.drop_index("ix_location_daily_summary_date", table_name="location_daily_summary")
    op.drop_table("location_daily_summary")
    op.drop_index("ix_location_data_timestamp", table_name="location_data")
    op.drop_table("location_data")
