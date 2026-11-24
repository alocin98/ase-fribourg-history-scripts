from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class DocumentShareRole(StrEnum):
    VIEWER = "viewer"
    EDITOR = "editor"


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (Index("ix_documents_owner_id_id", "owner_id", "id"),)

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    owner_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id"),
    )
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(500))


class Page(Base):
    __tablename__ = "pages"
    __table_args__ = (
        Index("ix_pages_document_id_page_number", "document_id", "page_number"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    document_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
    )
    width: Mapped[int]
    height: Mapped[int]
    mime_type: Mapped[str] = mapped_column(String(100))
    page_number: Mapped[int]
    image_key: Mapped[str] = mapped_column(String(500))


class DocumentShare(Base):
    __tablename__ = "document_shares"
    __table_args__ = (
        CheckConstraint(
            "role IN ('viewer', 'editor')",
            name="ck_document_shares_role",
        ),
        Index("ix_document_shares_user_id_document_id", "user_id", "document_id"),
    )

    document_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[DocumentShareRole] = mapped_column(
        Enum(
            DocumentShareRole,
            name="document_share_role",
            native_enum=False,
            length=20,
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
