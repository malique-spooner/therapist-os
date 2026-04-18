"""add habit editor fields

Revision ID: 0018_habit_editor_fields
Revises: 0017_spotify_play_events
Create Date: 2026-04-06 04:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0018_habit_editor_fields"
down_revision = "0017_spotify_play_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("habits", sa.Column("action_text", sa.String(length=160), nullable=True))
    op.add_column("habits", sa.Column("when_text", sa.String(length=160), nullable=True))
    op.add_column("habits", sa.Column("why_text", sa.String(length=255), nullable=True))
    op.add_column("habits", sa.Column("habit_mode", sa.String(length=20), nullable=True))
    op.add_column("habits", sa.Column("cadence_type", sa.String(length=30), nullable=True))
    op.add_column("habits", sa.Column("target_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("habits", "target_count")
    op.drop_column("habits", "cadence_type")
    op.drop_column("habits", "habit_mode")
    op.drop_column("habits", "why_text")
    op.drop_column("habits", "when_text")
    op.drop_column("habits", "action_text")
