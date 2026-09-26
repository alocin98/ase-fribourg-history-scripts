"""create documents and pages tables

Revision ID: 8b2c5f7a1d90
Revises: f45437e31114
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8b2c5f7a1d90"
down_revision: Union[str, Sequence[str], None] = "f45437e31114"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_owner_id", "documents", ["owner_id"])
    op.create_table(
        "pages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("image_path", sa.String(length=500), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pages_document_id", "pages", ["document_id"])


def downgrade() -> None:
    op.drop_index("ix_pages_document_id", table_name="pages")
    op.drop_table("pages")
    op.drop_index("ix_documents_owner_id", table_name="documents")
    op.drop_table("documents")
