"""add location place memory and raw events

Revision ID: 0021_location_places_events
Revises: 0020_admin_auth
Create Date: 2026-04-10 06:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0021_location_places_events"
down_revision = "0020_admin_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("location_place_memory_real", "location_place_memory_demo"):
        op.create_table(
            table,
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("place_key", sa.String(length=120), nullable=False),
            sa.Column("label", sa.String(length=120), nullable=True),
            sa.Column("category", sa.String(length=40), nullable=True),
            sa.Column("tone", sa.String(length=20), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("confidence_score", sa.Float(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
            sa.Column("merged_into_key", sa.String(length=120), nullable=True),
            sa.Column("split_from_key", sa.String(length=120), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("visit_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("total_minutes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("first_seen_at", sa.DateTime(), nullable=True),
            sa.Column("last_seen_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        op.create_index(f"ix_{table}_place_key", table, ["place_key"], unique=True)
        op.create_index(f"ix_{table}_status", table, ["status"], unique=False)
        op.create_index(f"ix_{table}_merged_into_key", table, ["merged_into_key"], unique=False)
        op.create_index(f"ix_{table}_split_from_key", table, ["split_from_key"], unique=False)

    for table in ("location_place_history_real", "location_place_history_demo"):
        op.create_table(
            table,
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("place_key", sa.String(length=120), nullable=False),
            sa.Column("action", sa.String(length=30), nullable=False),
            sa.Column("detail_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index(f"ix_{table}_place_key", table, ["place_key"], unique=False)
        op.create_index(f"ix_{table}_action", table, ["action"], unique=False)
        op.create_index(f"ix_{table}_created_at", table, ["created_at"], unique=False)

    for table in ("location_events_real", "location_events_demo"):
        op.create_table(
            table,
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("timestamp", sa.DateTime(), nullable=False),
            sa.Column("event_type", sa.String(length=40), nullable=False),
            sa.Column("trigger", sa.String(length=40), nullable=True),
            sa.Column("waypoint_name", sa.String(length=120), nullable=True),
            sa.Column("waypoint_id", sa.String(length=120), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("radius", sa.Float(), nullable=True),
            sa.Column("raw_payload", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index(f"ix_{table}_timestamp", table, ["timestamp"], unique=False)
        op.create_index(f"ix_{table}_event_type", table, ["event_type"], unique=False)
        op.create_index(f"ix_{table}_waypoint_id", table, ["waypoint_id"], unique=False)


def downgrade() -> None:
    for table in ("location_place_history_demo", "location_place_history_real"):
        op.drop_index(f"ix_{table}_created_at", table_name=table)
        op.drop_index(f"ix_{table}_action", table_name=table)
        op.drop_index(f"ix_{table}_place_key", table_name=table)
        op.drop_table(table)

    for table in ("location_events_demo", "location_events_real"):
        op.drop_index(f"ix_{table}_waypoint_id", table_name=table)
        op.drop_index(f"ix_{table}_event_type", table_name=table)
        op.drop_index(f"ix_{table}_timestamp", table_name=table)
        op.drop_table(table)

    for table in ("location_place_memory_demo", "location_place_memory_real"):
        op.drop_index(f"ix_{table}_split_from_key", table_name=table)
        op.drop_index(f"ix_{table}_merged_into_key", table_name=table)
        op.drop_index(f"ix_{table}_status", table_name=table)
        op.drop_index(f"ix_{table}_place_key", table_name=table)
        op.drop_table(table)
