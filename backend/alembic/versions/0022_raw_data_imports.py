"""add raw data imports

Revision ID: 0022_raw_data_imports
Revises: 0021_location_places_events
Create Date: 2026-04-13 04:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0022_raw_data_imports"
down_revision = "0021_location_places_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "raw_data_imports",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_id", sa.String(length=50), nullable=False),
        sa.Column("external_file_id", sa.String(length=255), nullable=False),
        sa.Column("file_name", sa.String(length=500), nullable=False),
        sa.Column("mime_type", sa.String(length=200), nullable=True),
        sa.Column("folder_path", sa.String(length=1000), nullable=True),
        sa.Column("web_url", sa.String(length=1000), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("checksum", sa.String(length=255), nullable=True),
        sa.Column("modified_at", sa.DateTime(), nullable=True),
        sa.Column("discovered_at", sa.DateTime(), nullable=False),
        sa.Column("downloaded_at", sa.DateTime(), nullable=True),
        sa.Column("parsed_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="discovered"),
        sa.Column("parser_version", sa.String(length=50), nullable=True),
        sa.Column("raw_metadata", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["source_id"], ["data_source_connections.source_id"]),
        sa.UniqueConstraint("source_id", "external_file_id", name="uq_raw_data_imports_source_external_file"),
    )
    op.create_index("ix_raw_data_imports_source_id", "raw_data_imports", ["source_id"], unique=False)
    op.create_index("ix_raw_data_imports_status", "raw_data_imports", ["status"], unique=False)
    op.create_index("ix_raw_data_imports_discovered_at", "raw_data_imports", ["discovered_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_raw_data_imports_discovered_at", table_name="raw_data_imports")
    op.drop_index("ix_raw_data_imports_status", table_name="raw_data_imports")
    op.drop_index("ix_raw_data_imports_source_id", table_name="raw_data_imports")
    op.drop_table("raw_data_imports")
