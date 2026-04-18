"""open prompts and location companion tags

Revision ID: 0006_prompts_tags
Revises: 0005_rel_checkins
Create Date: 2026-04-02 06:25:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_prompts_tags"
down_revision = "0005_rel_checkins"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "location_companion_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("person_ids", sa.JSON(), nullable=False),
        sa.Column("context_label", sa.String(length=120)),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_location_companion_logs_date", "location_companion_logs", ["date"])

    op.create_table(
        "app_open_prompt_states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("prompt_key", sa.String(length=120), nullable=False, unique=True),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("last_shown_at", sa.DateTime()),
        sa.Column("dismissed_at", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_app_open_prompt_states_prompt_key", "app_open_prompt_states", ["prompt_key"])


def downgrade() -> None:
    op.drop_index("ix_app_open_prompt_states_prompt_key", table_name="app_open_prompt_states")
    op.drop_table("app_open_prompt_states")
    op.drop_index("ix_location_companion_logs_date", table_name="location_companion_logs")
    op.drop_table("location_companion_logs")
