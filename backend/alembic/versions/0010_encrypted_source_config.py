"""encrypted source config

Revision ID: 0010_src_crypto
Revises: 0009_source_setup
Create Date: 2026-04-02 10:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_src_crypto"
down_revision = "0009_source_setup"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("data_source_connections", sa.Column("encrypted_config_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("data_source_connections", "encrypted_config_json")
