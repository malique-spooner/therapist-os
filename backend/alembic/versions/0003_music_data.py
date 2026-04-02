"""music data

Revision ID: 0003_music_data
Revises: 0002_data_source_connections
Create Date: 2026-04-01 06:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_music_data"
down_revision = "0002_data_source_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "music_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("listening_hours", sa.Float()),
        sa.Column("average_valence", sa.Float()),
        sa.Column("average_energy", sa.Float()),
        sa.Column("average_danceability", sa.Float()),
        sa.Column("new_discoveries", sa.Integer(), server_default=sa.text("0")),
        sa.Column("top_genres", sa.JSON()),
        sa.Column("top_tracks", sa.JSON()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_music_data_date", "music_data", ["date"])


def downgrade() -> None:
    op.drop_index("ix_music_data_date", table_name="music_data")
    op.drop_table("music_data")
