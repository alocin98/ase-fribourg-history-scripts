from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base


class TranscriptionJob(Base):
    __tablename__ = "transcription_jobs"
    __table_args__ = (
        Index("ix_transcription_jobs_owner_created", "owner_id", "created_at"),
        Index("ix_transcription_jobs_document_created", "document_id", "created_at"),
        Index("ix_transcription_jobs_page_id", "page_id"),
        Index("ix_transcription_jobs_status_created", "status", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    document_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
    )
    page_id: Mapped[UUID | None] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=True,
    )
    owner_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    status: Mapped[str] = mapped_column(String(20), default="queued")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    started_at: Mapped[datetime | None]
    finished_at: Mapped[datetime | None]


class PageTranscription(Base):
    __tablename__ = "page_transcriptions"

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    page_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("pages.id", ondelete="CASCADE"),
        unique=True,
    )
    text: Mapped[str | None]
    # Lignes du modèle (texte, cadre, confiance, mots). None pour les anciennes
    # transcriptions qui n'avaient que le texte.
    lines: Mapped[list[dict] | None] = mapped_column(JSONB)
    # Taille de l'image vue par le modèle : les cadres des lignes s'y rapportent.
    image_width: Mapped[int | None]
    image_height: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )


class TranscriptionEntities(Base):
    """Entités nommées (personnes, dates, lieux) trouvées dans une transcription."""

    __tablename__ = "entities"

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    transcription_id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("page_transcriptions.id", ondelete="CASCADE"),
        unique=True,
    )
    # Liste de {text, label, start, end, score} ; start/end sont des positions dans
    # le texte complet de la transcription.
    entities: Mapped[list[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
