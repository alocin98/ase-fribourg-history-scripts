"""merge transcription and image key migrations

Revision ID: d7e795ef9053
Revises: 5e8b1c7d2f40, 7c1f4e2a9b6d
Create Date: 2026-11-04 14:40:02.273193

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e795ef9053'
down_revision: Union[str, Sequence[str], None] = ('5e8b1c7d2f40', '7c1f4e2a9b6d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
