"""add entities of page transcriptions

Revision ID: 8d4e2b6f1a93
Revises: f3c9a7d6e5b4
Create Date: 2026-11-24 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "8d4e2b6f1a93"
down_revision: Union[str, Sequence[str], None] = "f3c9a7d6e5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "entities",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("transcription_id", sa.UUID(), nullable=False),
        sa.Column(
            "entities", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["transcription_id"], ["page_transcriptions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transcription_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("entities")
