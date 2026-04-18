"""nutrition relationships and checkins

Revision ID: 0005_rel_checkins
Revises: 0004_location_data
Create Date: 2026-04-02 02:25:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_rel_checkins"
down_revision = "0004_location_data"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "nutrition_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("breakfast", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("lunch", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("dinner", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("heavy_snacking", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("food_quality", sa.Integer()),
        sa.Column("caffeine_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("caffeine_last_before_noon", sa.Boolean()),
        sa.Column("alcohol_units", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_nutrition_logs_date", "nutrition_logs", ["date"])

    op.create_table(
        "relationships",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("tier", sa.String(length=20), nullable=False),
        sa.Column("desired_frequency_days", sa.Integer(), nullable=False),
        sa.Column("avatar_colour", sa.String(length=7)),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime()),
    )

    op.create_table(
        "relationship_interactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("timestamp", sa.Integer(), nullable=False),
        sa.Column("person_ids", sa.JSON(), nullable=False),
        sa.Column("interaction_type", sa.String(length=50), nullable=False),
        sa.Column("presence_score", sa.Integer()),
        sa.Column("feeling_word", sa.String(length=50)),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_index("ix_relationship_interactions_date", "relationship_interactions", ["date"])
    op.create_index("ix_relationship_interactions_timestamp", "relationship_interactions", ["timestamp"])

    op.create_table(
        "daily_checkins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("timestamp", sa.Integer(), nullable=False),
        sa.Column("emotional_state", sa.Integer(), nullable=False),
        sa.Column("energy_level", sa.Integer(), nullable=False),
        sa.Column("one_word", sa.String(length=50)),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_index("ix_daily_checkins_date", "daily_checkins", ["date"])
    op.create_index("ix_daily_checkins_timestamp", "daily_checkins", ["timestamp"])


def downgrade() -> None:
    op.drop_index("ix_daily_checkins_timestamp", table_name="daily_checkins")
    op.drop_index("ix_daily_checkins_date", table_name="daily_checkins")
    op.drop_table("daily_checkins")
    op.drop_index("ix_relationship_interactions_timestamp", table_name="relationship_interactions")
    op.drop_index("ix_relationship_interactions_date", table_name="relationship_interactions")
    op.drop_table("relationship_interactions")
    op.drop_table("relationships")
    op.drop_index("ix_nutrition_logs_date", table_name="nutrition_logs")
    op.drop_table("nutrition_logs")
