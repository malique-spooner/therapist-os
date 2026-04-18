"""expand habit name length

Revision ID: 0019_expand_habit_name_length
Revises: 0018_habit_editor_fields
Create Date: 2026-04-06 04:00:01.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0019_expand_habit_name_length"
down_revision = "0018_habit_editor_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("habits", "name", existing_type=sa.String(length=100), type_=sa.String(length=255), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("habits", "name", existing_type=sa.String(length=255), type_=sa.String(length=100), existing_nullable=False)
