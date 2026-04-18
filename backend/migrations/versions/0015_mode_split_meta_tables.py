"""split profile, budget, imports, and conversations by demo mode

Revision ID: 0015_mode_split_meta_tables
Revises: 0014_finance_bank_and_media_provider_breakdown
Create Date: 2026-04-04
"""

from alembic import op
import sqlalchemy as sa


revision = "0015_mode_split_meta_tables"
down_revision = "0014_finance_bank_media"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("relationship_screenshot_imports", "user_profile", "monthly_budget", "ai_conversations"):
        op.add_column(table, sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
        op.create_index(f"ix_{table}_is_demo", table, ["is_demo"], unique=False)
        op.alter_column(table, "is_demo", server_default=None)
    op.drop_constraint("monthly_budget_month_key", "monthly_budget", type_="unique")
    op.create_unique_constraint("uq_monthly_budget_month_is_demo", "monthly_budget", ["month", "is_demo"])


def downgrade() -> None:
    op.drop_constraint("uq_monthly_budget_month_is_demo", "monthly_budget", type_="unique")
    op.create_unique_constraint("monthly_budget_month_key", "monthly_budget", ["month"])
    for table in ("ai_conversations", "monthly_budget", "user_profile", "relationship_screenshot_imports"):
        op.drop_index(f"ix_{table}_is_demo", table_name=table)
        op.drop_column(table, "is_demo")
