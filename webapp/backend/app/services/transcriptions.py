from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import Page
from app.models.transcriptions import PageTranscription, TranscriptionJob
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository


class TranscriptionService:
    def __init__(self, session: AsyncSession):
        self.document_repository = DocumentRepository(session)
        self.repository = TranscriptionRepository(session)

    async def create_document_job(
        self, *, document_id: UUID, owner_id: UUID
    ) -> TranscriptionJob:
        return await self.repository.create_document_transcription_job(
            document_id=document_id,
            owner_id=owner_id,
        )

    async def create_page_job(
        self, *, document_id: UUID, page_id: UUID, owner_id: UUID
    ) -> TranscriptionJob:
        return await self.repository.create_page_transcription_job(
            document_id=document_id,
            page_id=page_id,
            owner_id=owner_id,
        )

    async def get_job(self, job_id: UUID, owner_id: UUID) -> TranscriptionJob | None:
        return await self.repository.get_transcription_job_by_id(
            job_id=job_id,
            owner_id=owner_id,
        )

    async def get_page_transcription(self, page_id: UUID) -> PageTranscription | None:
        return await self.repository.get_page_transcription_by_page_id(page_id)

    async def get_worker_job(self, job_id: UUID) -> TranscriptionJob | None:
        return await self.repository.get_transcription_job_by_id(job_id)

    async def get_document_pages(
        self, *, document_id: UUID, owner_id: UUID
    ) -> list[Page]:
        return await self.document_repository.get_all_pages_by_document_id(
            document_id=document_id,
            owner_id=owner_id,
        )

    async def get_page_for_worker(self, page_id: UUID) -> Page | None:
        return await self.document_repository.get_page(page_id)

    async def start_job(self, job_id: UUID) -> TranscriptionJob | None:
        return await self.repository.start_transcription_job(job_id)

    async def fail_job(self, job_id: UUID) -> TranscriptionJob | None:
        return await self.repository.fail_transcription_job(job_id)

    async def complete_job(self, job_id: UUID) -> TranscriptionJob | None:
        return await self.repository.complete_transcription_job(job_id)

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
