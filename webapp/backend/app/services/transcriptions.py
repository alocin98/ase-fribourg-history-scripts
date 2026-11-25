from dataclasses import dataclass
from uuid import UUID

from app.models.documents import Page
from app.models.transcriptions import (
    PageTranscription,
    TranscriptionEntities,
    TranscriptionJob,
)
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository


@dataclass
class PageResult:
    """Ce que le worker a produit pour une page, prêt à être enregistré."""

    page_id: UUID
    # Transcription déjà en base (None si la page n'en avait pas).
    transcription_id: UUID | None
    # Nouvelle transcription (page_id, text, lines, image_width, image_height),
    # None si celle en base est déjà complète.
    transcription: dict[str, object] | None
    # Entités trouvées dans le texte, None si la reconnaissance a échoué.
    entities: list[dict] | None


class TranscriptionService:
    def __init__(
        self,
        document_repository: DocumentRepository,
        repository: TranscriptionRepository,
    ):
        self.document_repository = document_repository
        self.repository = repository

    async def create_document_job(
        self, *, document_id: UUID, owner_id: UUID
    ) -> TranscriptionJob:
        job = await self.repository.create_document_transcription_job(
            document_id=document_id,
            owner_id=owner_id,
        )
        await self.repository.commit()
        return job

    async def create_page_job(
        self, *, document_id: UUID, page_id: UUID, owner_id: UUID
    ) -> TranscriptionJob:
        job = await self.repository.create_page_transcription_job(
            document_id=document_id,
            page_id=page_id,
            owner_id=owner_id,
        )
        await self.repository.commit()
        return job

    async def get_job(self, job_id: UUID, owner_id: UUID) -> TranscriptionJob | None:
        return await self.repository.get_transcription_job_by_id(
            job_id=job_id,
            owner_id=owner_id,
        )

    async def get_owned_page_transcription(
        self, *, document_id: UUID, page_id: UUID, owner_id: UUID
    ) -> PageTranscription | None:
        return await self.repository.get_owned_page_transcription(
            document_id=document_id,
            page_id=page_id,
            owner_id=owner_id,
        )

    async def get_worker_job(self, job_id: UUID) -> TranscriptionJob | None:
        return await self.repository.get_transcription_job_by_id(job_id)

    async def get_page_transcription_with_entities(
        self, page_id: UUID
    ) -> tuple[PageTranscription, TranscriptionEntities | None] | None:
        return await self.repository.get_page_transcription_with_entities(page_id)

    async def get_document_pages(
        self, *, document_id: UUID, owner_id: UUID
    ) -> list[tuple[Page, PageTranscription | None, TranscriptionEntities | None]]:
        return await self.repository.get_document_pages_with_transcriptions(
            document_id=document_id,
            owner_id=owner_id,
        )

    async def get_page_for_worker(
        self, page_id: UUID
    ) -> tuple[Page, PageTranscription | None, TranscriptionEntities | None] | None:
        return await self.repository.get_page_with_transcription(page_id)

    async def start_job(self, job_id: UUID) -> TranscriptionJob | None:
        job = await self.repository.start_transcription_job(job_id)
        await self.repository.commit()
        return job

    async def fail_job(self, job_id: UUID) -> TranscriptionJob | None:
        job = await self.repository.fail_transcription_job(job_id)
        await self.repository.commit()
        return job

    async def complete_job(self, job_id: UUID) -> TranscriptionJob | None:
        job = await self.repository.complete_transcription_job(job_id)
        await self.repository.commit()
        return job

    async def save_page_transcription(
        self,
        *,
        page_id: UUID,
        text: str,
        lines: list[dict],
        image_width: int | None,
        image_height: int | None,
    ) -> None:
        await self.repository.save_page_transcription(
            page_id=page_id,
            text=text,
            lines=lines,
            image_width=image_width,
            image_height=image_height,
        )
        await self.repository.commit()

    async def save_page_results(self, results: list[PageResult]) -> None:
        """Enregistre, dans une même transaction, les transcriptions et leurs entités."""
        saved_ids = await self.repository.save_page_transcriptions(
            [result.transcription for result in results if result.transcription]
        )

        entity_rows = []
        stale_ids = []
        for result in results:
            transcription_id = saved_ids.get(result.page_id, result.transcription_id)
            if transcription_id is None:
                continue
            if result.entities is not None:
                entity_rows.append(
                    {"transcription_id": transcription_id, "entities": result.entities}
                )
            elif result.transcription is not None:
                # Texte refait mais entités en échec : les anciennes ne correspondent
                # plus au texte, on les retire pour que la page soit refaite.
                stale_ids.append(transcription_id)

        await self.repository.delete_transcription_entities(stale_ids)
        await self.repository.save_transcription_entities(entity_rows)
        await self.repository.commit()
