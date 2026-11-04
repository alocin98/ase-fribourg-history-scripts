"""add lines and image size to page transcriptions

Revision ID: 5e8b1c7d2f40
Revises: a2111232a42e
Create Date: 2026-10-22 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "5e8b1c7d2f40"
down_revision: Union[str, Sequence[str], None] = "a2111232a42e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "page_transcriptions",
        sa.Column("lines", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "page_transcriptions", sa.Column("image_width", sa.Integer(), nullable=True)
    )
    op.add_column(
        "page_transcriptions", sa.Column("image_height", sa.Integer(), nullable=True)
    )
    # Une seule transcription par page : on garde la plus récente avant la contrainte.
    op.execute(
        """
        DELETE FROM page_transcriptions AS older
        USING page_transcriptions AS newer
        WHERE older.page_id = newer.page_id
          AND (older.updated_at, older.id) < (newer.updated_at, newer.id)
        """
    )
    op.create_unique_constraint(
        "uq_page_transcriptions_page_id", "page_transcriptions", ["page_id"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_page_transcriptions_page_id", "page_transcriptions", type_="unique"
    )
    op.drop_column("page_transcriptions", "image_height")
    op.drop_column("page_transcriptions", "image_width")
    op.drop_column("page_transcriptions", "lines")
