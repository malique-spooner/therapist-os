"""add demo flags and widen relationship interaction timestamp

Revision ID: 0012_demo_flags_and_relationship_bigint
Revises: 0011_checkin_timestamp_bigint
Create Date: 2026-04-03 06:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_demo_flags_and_relationship_bigint"
down_revision = "0011_checkin_timestamp_bigint"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in (
        "health_data",
        "finance_data",
        "music_data",
        "nutrition_logs",
        "daily_checkins",
        "habit_logs",
        "relationships",
        "relationship_interactions",
        "weather_data",
    ):
        op.add_column(table, sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
        op.create_index(f"ix_{table}_is_demo", table, ["is_demo"], unique=False)

    with op.batch_alter_table("relationship_interactions") as batch_op:
        batch_op.alter_column("timestamp", existing_type=sa.Integer(), type_=sa.BigInteger(), existing_nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("relationship_interactions") as batch_op:
        batch_op.alter_column("timestamp", existing_type=sa.BigInteger(), type_=sa.Integer(), existing_nullable=False)

    for table in (
        "weather_data",
        "relationship_interactions",
        "relationships",
        "habit_logs",
        "daily_checkins",
        "nutrition_logs",
        "music_data",
        "finance_data",
        "health_data",
    ):
        op.drop_index(f"ix_{table}_is_demo", table_name=table)
        op.drop_column(table, "is_demo")
