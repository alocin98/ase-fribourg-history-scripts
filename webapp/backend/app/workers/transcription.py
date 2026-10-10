import asyncio
from uuid import UUID

from app.core.db import session_factory
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository


async def page_transcription(session, page_id: UUID) -> None:
    repository = TranscriptionRepository(session)

    await asyncio.sleep(5)

    await repository.create_page_transcription(
        page_id=page_id,
        text=f"This is the transcribed text for page {page_id}",
    )

async def transcribe_document(job_id: UUID) -> None:
    async with session_factory() as session:
        transcription_repository = TranscriptionRepository(session)
        document_repository = DocumentRepository(session)

        job = await transcription_repository.get_transcription_job_by_id(job_id)

        if job is None:
            return

        await transcription_repository.start_transcription_job(job_id)

        pages = await document_repository.get_all_pages_by_document_id(
            document_id=job.document_id,
            owner_id=job.owner_id,
        )

        for page in pages:
            await page_transcription(session, page.id)

        await transcription_repository.complete_transcription_job(job_id)

async def transcribe_page(job_id: UUID) -> None:
    async with session_factory() as session:
        transcription_repository = TranscriptionRepository(session)

        job = await transcription_repository.get_transcription_job_by_id(job_id)

        if job is None:
            return

        await transcription_repository.start_transcription_job(job_id)
        await page_transcription(session, job.page_id)
        await transcription_repository.complete_transcription_job(job_id)