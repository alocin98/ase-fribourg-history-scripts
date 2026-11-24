"""add document shares

Revision ID: 9a1c4d7e6f20
Revises: f3c9a7d6e5b4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "9a1c4d7e6f20"
down_revision: Union[str, Sequence[str], None] = "f3c9a7d6e5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_shares",
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "viewer",
                "editor",
                name="document_share_role",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('viewer', 'editor')",
            name="ck_document_shares_role",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("document_id", "user_id"),
    )
    op.create_index(
        "ix_document_shares_user_id_document_id",
        "document_shares",
        ["user_id", "document_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_document_shares_user_id_document_id",
        table_name="document_shares",
    )
    op.drop_table("document_shares")
