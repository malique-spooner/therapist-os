"""relationship screenshot imports

Revision ID: 0007_rel_imports
Revises: 0006_prompts_tags
Create Date: 2026-04-02 06:55:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_rel_imports"
down_revision = "0006_prompts_tags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "relationship_screenshot_imports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=120)),
        sa.Column("file_size_bytes", sa.Integer()),
        sa.Column("captured_at", sa.DateTime()),
        sa.Column("matched_person_ids", sa.JSON(), nullable=False),
        sa.Column("detected_labels", sa.JSON(), nullable=False),
        sa.Column("note", sa.Text()),
        sa.Column("imported_at", sa.DateTime()),
    )
    op.create_index("ix_relationship_screenshot_imports_source", "relationship_screenshot_imports", ["source"])
    op.create_index("ix_relationship_screenshot_imports_imported_at", "relationship_screenshot_imports", ["imported_at"])


def downgrade() -> None:
    op.drop_index("ix_relationship_screenshot_imports_imported_at", table_name="relationship_screenshot_imports")
    op.drop_index("ix_relationship_screenshot_imports_source", table_name="relationship_screenshot_imports")
    op.drop_table("relationship_screenshot_imports")
