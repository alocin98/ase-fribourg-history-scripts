"""add indexes for query paths and page transcription uniqueness

Revision ID: f3c9a7d6e5b4
Revises: d7e795ef9053
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3c9a7d6e5b4"
down_revision: Union[str, Sequence[str], None] = "d7e795ef9053"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_documents_owner_id_id", "documents", ["owner_id", "id"]
    )
    op.create_index(
        "ix_pages_document_id_page_number",
        "pages",
        ["document_id", "page_number"],
    )
    op.create_index(
        "ix_transcription_jobs_owner_created",
        "transcription_jobs",
        ["owner_id", "created_at"],
    )
    op.create_index(
        "ix_transcription_jobs_document_created",
        "transcription_jobs",
        ["document_id", "created_at"],
    )
    op.create_index(
        "ix_transcription_jobs_page_id", "transcription_jobs", ["page_id"]
    )
    op.create_index(
        "ix_transcription_jobs_status_created",
        "transcription_jobs",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_transcription_jobs_status_created", table_name="transcription_jobs")
    op.drop_index("ix_transcription_jobs_page_id", table_name="transcription_jobs")
    op.drop_index(
        "ix_transcription_jobs_document_created", table_name="transcription_jobs"
    )
    op.drop_index(
        "ix_transcription_jobs_owner_created", table_name="transcription_jobs"
    )
    op.drop_index("ix_pages_document_id_page_number", table_name="pages")
    op.drop_index("ix_documents_owner_id_id", table_name="documents")