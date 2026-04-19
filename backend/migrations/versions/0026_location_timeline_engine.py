"""add location timeline engine tables

Revision ID: 0026_location_timeline_engine
Revises: 0025_source_specific_standard
Create Date: 2026-04-19 19:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0026_location_timeline_engine"
down_revision = "0025_source_specific_standard"
branch_labels = None
depends_on = None


def _add_location_data_columns(table: str) -> None:
    op.add_column(table, sa.Column("velocity", sa.Float(), nullable=True))
    op.add_column(table, sa.Column("motion_activities", sa.JSON(), nullable=True))
    op.add_column(table, sa.Column("in_regions", sa.JSON(), nullable=True))
    op.add_column(table, sa.Column("in_region_ids", sa.JSON(), nullable=True))
    op.add_column(table, sa.Column("connection", sa.String(length=20), nullable=True))
    op.add_column(table, sa.Column("course", sa.Float(), nullable=True))


def _drop_location_data_columns(table: str) -> None:
    op.drop_column(table, "course")
    op.drop_column(table, "connection")
    op.drop_column(table, "in_region_ids")
    op.drop_column(table, "in_regions")
    op.drop_column(table, "motion_activities")
    op.drop_column(table, "velocity")


def _create_visit_table(table: str) -> None:
    op.create_table(
        table,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("row_id", sa.String(length=160), nullable=False),
        sa.Column("place_key", sa.String(length=120), nullable=False),
        sa.Column("place_label", sa.String(length=120), nullable=True),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("start_timestamp", sa.DateTime(), nullable=False),
        sa.Column("end_timestamp", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="inferred"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    for column, unique in (("row_id", True), ("place_key", False), ("category", False), ("start_timestamp", False), ("end_timestamp", False), ("status", False), ("source", False)):
        op.create_index(f"ix_{table}_{column}", table, [column], unique=unique)


def _create_movement_table(table: str) -> None:
    op.create_table(
        table,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("row_id", sa.String(length=160), nullable=False),
        sa.Column("movement_type", sa.String(length=40), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column("start_timestamp", sa.DateTime(), nullable=False),
        sa.Column("end_timestamp", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("start_latitude", sa.Float(), nullable=False),
        sa.Column("start_longitude", sa.Float(), nullable=False),
        sa.Column("end_latitude", sa.Float(), nullable=False),
        sa.Column("end_longitude", sa.Float(), nullable=False),
        sa.Column("distance_metres", sa.Float(), nullable=True),
        sa.Column("average_speed_kmh", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="inferred"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    for column, unique in (("row_id", True), ("movement_type", False), ("start_timestamp", False), ("end_timestamp", False), ("status", False), ("source", False)):
        op.create_index(f"ix_{table}_{column}", table, [column], unique=unique)


def _create_override_table(table: str) -> None:
    op.create_table(
        table,
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("row_id", sa.String(length=160), nullable=True),
        sa.Column("target_kind", sa.String(length=20), nullable=False),
        sa.Column("target_key", sa.String(length=160), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column("category", sa.String(length=40), nullable=True),
        sa.Column("movement_type", sa.String(length=40), nullable=True),
        sa.Column("tone", sa.String(length=20), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("radius_metres", sa.Float(), nullable=True),
        sa.Column("signature_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    for column in ("row_id", "target_kind", "target_key"):
        op.create_index(f"ix_{table}_{column}", table, [column], unique=False)


def upgrade() -> None:
    for table in ("location_data_real", "location_data_demo"):
        _add_location_data_columns(table)

    for table in ("location_visits_real", "location_visits_demo"):
        _create_visit_table(table)

    for table in ("location_movements_real", "location_movements_demo"):
        _create_movement_table(table)

    for table in ("location_tag_overrides_real", "location_tag_overrides_demo"):
        _create_override_table(table)


def downgrade() -> None:
    for table in ("location_tag_overrides_demo", "location_tag_overrides_real"):
        for column in ("target_key", "target_kind", "row_id"):
            op.drop_index(f"ix_{table}_{column}", table_name=table)
        op.drop_table(table)

    for table in ("location_movements_demo", "location_movements_real"):
        for column in ("source", "status", "end_timestamp", "start_timestamp", "movement_type", "row_id"):
            op.drop_index(f"ix_{table}_{column}", table_name=table)
        op.drop_table(table)

    for table in ("location_visits_demo", "location_visits_real"):
        for column in ("source", "status", "end_timestamp", "start_timestamp", "category", "place_key", "row_id"):
            op.drop_index(f"ix_{table}_{column}", table_name=table)
        op.drop_table(table)

    for table in ("location_data_demo", "location_data_real"):
        _drop_location_data_columns(table)
