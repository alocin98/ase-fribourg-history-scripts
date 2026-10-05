"""add user is_active

Revision ID: d5e1b7a4c2f0
Revises: c4c2a2f2d8b1
Create Date: 2026-10-05 01:25:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e1b7a4c2f0"
down_revision: Union[str, Sequence[str], None] = "c4c2a2f2d8b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "is_active")
