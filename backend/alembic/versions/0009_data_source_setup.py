"""data source setup config

Revision ID: 0009_source_setup
Revises: 0008_habit_refresh
Create Date: 2026-04-02 07:25:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_source_setup"
down_revision = "0008_habit_refresh"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("data_source_connections", sa.Column("config_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("data_source_connections", "config_json")
