"""add raw import rows

Revision ID: 0023_raw_import_rows
Revises: 0022_raw_data_imports
Create Date: 2026-04-13 04:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0023_raw_import_rows"
down_revision = "0022_raw_data_imports"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "raw_import_rows",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("import_id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.String(length=50), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("row_hash", sa.String(length=64), nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=False),
        sa.Column("normalized_payload", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="raw"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["import_id"], ["raw_data_imports.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["data_source_connections.source_id"]),
        sa.UniqueConstraint("import_id", "row_hash", name="uq_raw_import_rows_import_row_hash"),
    )
    op.create_index("ix_raw_import_rows_import_id", "raw_import_rows", ["import_id"], unique=False)
    op.create_index("ix_raw_import_rows_source_id", "raw_import_rows", ["source_id"], unique=False)
    op.create_index("ix_raw_import_rows_status", "raw_import_rows", ["status"], unique=False)
    op.create_index("ix_raw_import_rows_created_at", "raw_import_rows", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_raw_import_rows_created_at", table_name="raw_import_rows")
    op.drop_index("ix_raw_import_rows_status", table_name="raw_import_rows")
    op.drop_index("ix_raw_import_rows_source_id", table_name="raw_import_rows")
    op.drop_index("ix_raw_import_rows_import_id", table_name="raw_import_rows")
    op.drop_table("raw_import_rows")
