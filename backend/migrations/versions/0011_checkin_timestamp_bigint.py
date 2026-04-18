"""checkin timestamp bigint

Revision ID: 0011_checkin_ts_big
Revises: 0010_src_crypto
Create Date: 2026-04-02 13:50:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0011_checkin_ts_big"
down_revision = "0010_src_crypto"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("daily_checkins", "timestamp", existing_type=sa.Integer(), type_=sa.BigInteger(), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("daily_checkins", "timestamp", existing_type=sa.BigInteger(), type_=sa.Integer(), existing_nullable=False)
