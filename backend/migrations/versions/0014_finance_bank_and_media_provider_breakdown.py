"""add finance bank metadata and music provider breakdown

Revision ID: 0014_finance_bank_media
Revises: 0013_location_demo_flags
Create Date: 2026-04-03
"""

from alembic import op
import sqlalchemy as sa


revision = "0014_finance_bank_media"
down_revision = "0013_location_demo_flags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("finance_data", sa.Column("bank_name", sa.String(length=120), nullable=True))
    op.add_column("finance_data", sa.Column("account_name", sa.String(length=160), nullable=True))
    op.add_column("finance_data", sa.Column("account_ref", sa.String(length=200), nullable=True))
    op.add_column("finance_data", sa.Column("source_type", sa.String(length=40), nullable=True))
    op.create_index("ix_finance_data_bank_name", "finance_data", ["bank_name"])
    op.create_index("ix_finance_data_account_ref", "finance_data", ["account_ref"])

    op.add_column("music_data", sa.Column("provider_breakdown", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("music_data", "provider_breakdown")

    op.drop_index("ix_finance_data_account_ref", table_name="finance_data")
    op.drop_index("ix_finance_data_bank_name", table_name="finance_data")
    op.drop_column("finance_data", "source_type")
    op.drop_column("finance_data", "account_ref")
    op.drop_column("finance_data", "account_name")
    op.drop_column("finance_data", "bank_name")
