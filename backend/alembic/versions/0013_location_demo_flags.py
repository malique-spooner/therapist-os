"""Add demo flags to location tables.

Revision ID: 0013_location_demo_flags
Revises: 0012_demo_flags
Create Date: 2026-04-03
"""

from alembic import op
import sqlalchemy as sa


revision = "0013_location_demo_flags"
down_revision = "0012_demo_flags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("location_data", "location_daily_summary", "location_companion_logs"):
        op.add_column(table, sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
        op.create_index(f"ix_{table}_is_demo", table, ["is_demo"], unique=False)
    op.alter_column("location_data", "is_demo", server_default=None)
    op.alter_column("location_daily_summary", "is_demo", server_default=None)
    op.alter_column("location_companion_logs", "is_demo", server_default=None)


def downgrade() -> None:
    for table in ("location_companion_logs", "location_daily_summary", "location_data"):
        op.drop_index(f"ix_{table}_is_demo", table_name=table)
        op.drop_column(table, "is_demo")
