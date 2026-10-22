from pathlib import Path
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import session_factory
from app.models.documents import Page
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository


async def page_transcription(session: AsyncSession, page_id: UUID) -> bool:
    repository = TranscriptionRepository(session)

    existing = await repository.get_page_transcription_by_page_id(page_id)
    if existing is not None:
        return False

    page = await session.scalar(select(Page).where(Page.id == page_id))
    if page is None:
        return False

    with open(page.image_path, "rb") as image_file:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.MODEL_BACKEND_URL.rstrip('/')}/predict",
                files={
                    "file": (
                        Path(page.image_path).name,
                        image_file,
                        page.mime_type,
                    )
                },
                timeout=120.0,
            )
        response.raise_for_status()
        response_data = response.json()

    if not isinstance(response_data, dict):
        raise ValueError("Model backend response is not a JSON object")

    text = response_data.get("text")
    if not isinstance(text, str):
        raise ValueError("Model backend response does not contain text")

    await repository.create_page_transcription(
        page_id=page_id,
        text=text,
    )
    return True


async def transcribe_document(job_id: UUID) -> None:
    async with session_factory() as session:
        transcription_repository = TranscriptionRepository(session)
        document_repository = DocumentRepository(session)

        job = await transcription_repository.get_transcription_job_by_id(job_id)

        if job is None:
            return

        pages = await document_repository.get_all_pages_by_document_id(
            document_id=job.document_id,
            owner_id=job.owner_id,
        )

        for page in pages:
            existing = await transcription_repository.get_page_transcription_by_page_id(
                page.id
            )
            if existing is not None:
                await transcription_repository.complete_transcription_job(job_id)
                return

        await transcription_repository.start_transcription_job(job_id)

        for page in pages:
            if not await page_transcription(session, page.id):
                await transcription_repository.complete_transcription_job(job_id)
                return

        await transcription_repository.complete_transcription_job(job_id)


async def transcribe_page(job_id: UUID) -> None:
    async with session_factory() as session:
        transcription_repository = TranscriptionRepository(session)

        job = await transcription_repository.get_transcription_job_by_id(job_id)

        if job is None:
            return

        existing = await transcription_repository.get_page_transcription_by_page_id(
            job.page_id
        )
        if existing is not None:
            await transcription_repository.complete_transcription_job(job_id)
            return

        await transcription_repository.start_transcription_job(job_id)

        if not await page_transcription(session, job.page_id):
            await transcription_repository.complete_transcription_job(job_id)
            return

        await transcription_repository.complete_transcription_job(job_id)
