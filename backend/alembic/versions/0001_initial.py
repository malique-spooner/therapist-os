"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "health_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("steps", sa.Integer()),
        sa.Column("sleep_duration_hours", sa.Float()),
        sa.Column("sleep_quality", sa.Float()),
        sa.Column("hrv_ms", sa.Float()),
        sa.Column("resting_hr", sa.Integer()),
        sa.Column("workout_logged", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("workout_type", sa.String(length=50)),
        sa.Column("workout_duration_minutes", sa.Integer()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_health_data_date", "health_data", ["date"])
    op.create_table(
        "finance_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount_pence", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("merchant", sa.String(length=200)),
        sa.Column("description", sa.String(length=500)),
        sa.Column("transaction_id", sa.String(length=200), unique=True),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_index("ix_finance_data_date", "finance_data", ["date"])
    op.create_index("ix_finance_data_category", "finance_data", ["category"])
    op.create_table(
        "habits",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("sub_label", sa.String(length=100)),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("category_icon", sa.String(length=10), nullable=False),
        sa.Column("habit_type", sa.String(length=20), nullable=False),
        sa.Column("unit", sa.String(length=20)),
        sa.Column("max_value", sa.Integer()),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_table(
        "habit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("habit_id", sa.String(length=36), sa.ForeignKey("habits.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean()),
        sa.Column("numeric_value", sa.Float()),
        sa.Column("scale_value", sa.Integer()),
        sa.Column("created_at", sa.DateTime()),
        sa.UniqueConstraint("habit_id", "date", name="uq_habit_log_habit_date"),
    )
    op.create_index("ix_habit_logs_habit_id", "habit_logs", ["habit_id"])
    op.create_index("ix_habit_logs_date", "habit_logs", ["date"])
    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime()),
        sa.Column("session_type", sa.String(length=20), nullable=False),
        sa.Column("ai_provider", sa.String(length=50), nullable=False),
        sa.Column("ai_model", sa.String(length=100), nullable=False),
        sa.Column("total_tokens_used", sa.Integer(), server_default=sa.text("0")),
        sa.Column("total_cost_pence", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_table(
        "ai_messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("conversation_id", sa.String(length=36), sa.ForeignKey("ai_conversations.id"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("source", sa.String(length=30)),
        sa.Column("tokens_used", sa.Integer()),
        sa.Column("cost_pence", sa.Integer()),
        sa.Column("frameworks_referenced", sa.JSON()),
    )
    op.create_index("ix_ai_messages_conversation_id", "ai_messages", ["conversation_id"])
    op.create_table(
        "user_profile",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.Column("profile_document", sa.Text(), nullable=False),
        sa.Column("last_therapy_session", sa.DateTime()),
        sa.Column("total_sessions", sa.Integer(), server_default=sa.text("0")),
        sa.Column("key_themes", sa.JSON()),
        sa.Column("active_goals", sa.JSON()),
        sa.Column("important_relationships", sa.JSON()),
        sa.Column("health_baseline", sa.JSON()),
        sa.Column("mood_baseline", sa.Float()),
        sa.Column("notable_patterns", sa.JSON()),
    )
    op.create_table(
        "weather_data",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("sunrise_time", sa.Time(), nullable=False),
        sa.Column("sunset_time", sa.Time(), nullable=False),
        sa.Column("daylight_hours", sa.Float(), nullable=False),
        sa.Column("temperature_high_c", sa.Float()),
        sa.Column("temperature_low_c", sa.Float()),
        sa.Column("condition", sa.String(length=50)),
        sa.Column("uv_index", sa.Float()),
        sa.Column("created_at", sa.DateTime()),
    )
    op.create_index("ix_weather_data_date", "weather_data", ["date"])
    op.create_table(
        "monthly_budget",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("month", sa.Date(), nullable=False, unique=True),
        sa.Column("limit_pence", sa.Integer(), server_default=sa.text("1000")),
        sa.Column("spent_pence", sa.Integer(), server_default=sa.text("0")),
        sa.Column("auto_switch_at_80", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("disable_paid_at_limit", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_monthly_budget_month", "monthly_budget", ["month"])


def downgrade() -> None:
    op.drop_index("ix_monthly_budget_month", table_name="monthly_budget")
    op.drop_table("monthly_budget")
    op.drop_index("ix_weather_data_date", table_name="weather_data")
    op.drop_table("weather_data")
    op.drop_table("user_profile")
    op.drop_index("ix_ai_messages_conversation_id", table_name="ai_messages")
    op.drop_table("ai_messages")
    op.drop_table("ai_conversations")
    op.drop_index("ix_habit_logs_date", table_name="habit_logs")
    op.drop_index("ix_habit_logs_habit_id", table_name="habit_logs")
    op.drop_table("habit_logs")
    op.drop_table("habits")
    op.drop_index("ix_finance_data_category", table_name="finance_data")
    op.drop_index("ix_finance_data_date", table_name="finance_data")
    op.drop_table("finance_data")
    op.drop_index("ix_health_data_date", table_name="health_data")
    op.drop_table("health_data")
