"""data source connections

Revision ID: 0002_data_source_connections
Revises: 0001_initial
Create Date: 2026-04-01 00:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_data_source_connections"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "data_source_connections",
        sa.Column("source_id", sa.String(length=50), primary_key=True),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=200), nullable=False),
        sa.Column("connected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_sync_at", sa.DateTime()),
        sa.Column("last_sync_status", sa.String(length=20)),
        sa.Column("last_error", sa.Text()),
        sa.Column("connection_hint", sa.String(length=255)),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table("data_source_connections")
