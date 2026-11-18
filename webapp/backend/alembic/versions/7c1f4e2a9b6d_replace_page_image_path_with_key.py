"""replace page image paths with storage keys

Revision ID: 7c1f4e2a9b6d
Revises: a2111232a42e
Create Date: 2026-10-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7c1f4e2a9b6d"
down_revision: Union[str, Sequence[str], None] = "a2111232a42e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("pages", "image_path", new_column_name="image_key")


def downgrade() -> None:
    op.alter_column("pages", "image_key", new_column_name="image_path")