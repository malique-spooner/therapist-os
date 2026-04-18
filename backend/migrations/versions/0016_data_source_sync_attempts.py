"""add data source sync attempts

Revision ID: 0016_data_source_sync_attempts
Revises: 0015_mode_split_meta_tables
Create Date: 2026-04-05
"""

from alembic import op
import sqlalchemy as sa


revision = "0016_data_source_sync_attempts"
down_revision = "0015_mode_split_meta_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_source_sync_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_id", sa.String(length=50), sa.ForeignKey("data_source_connections.source_id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("trigger", sa.String(length=30), nullable=False, server_default="manual"),
        sa.Column("data_mode", sa.String(length=20), nullable=True),
        sa.Column("rows_synced", sa.Integer(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("cooldown_until", sa.DateTime(), nullable=True),
        sa.Column("attempted_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_data_source_sync_attempts_source_id", "data_source_sync_attempts", ["source_id"], unique=False)
    op.create_index("ix_data_source_sync_attempts_status", "data_source_sync_attempts", ["status"], unique=False)
    op.create_index("ix_data_source_sync_attempts_attempted_at", "data_source_sync_attempts", ["attempted_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_data_source_sync_attempts_attempted_at", table_name="data_source_sync_attempts")
    op.drop_index("ix_data_source_sync_attempts_status", table_name="data_source_sync_attempts")
    op.drop_index("ix_data_source_sync_attempts_source_id", table_name="data_source_sync_attempts")
    op.drop_table("data_source_sync_attempts")
