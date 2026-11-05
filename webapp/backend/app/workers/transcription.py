import logging
from pathlib import Path
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transcriptions import TranscriptionLine
from app.core.config import settings
from app.core.db import session_factory
from app.models.documents import Page
from app.models.transcriptions import PageTranscription
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository

logger = logging.getLogger(__name__)


def needs_transcription(transcription: PageTranscription | None) -> bool:
    # Les anciennes transcriptions n'ont que le texte : on les refait pour obtenir
    # les lignes, leurs cadres et leurs confiances.
    return transcription is None or transcription.lines is None


async def page_transcription(session: AsyncSession, page_id: UUID) -> bool:
    repository = TranscriptionRepository(session)

    existing = await repository.get_page_transcription_by_page_id(page_id)
    if not needs_transcription(existing):
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
        # 422 : le modèle n'a trouvé aucune ligne, la page est vide.
        if response.status_code == 422:
            await repository.save_page_transcription(page_id, "", [], None, None)
            return True
        response.raise_for_status()
        response_data = response.json()

    if not isinstance(response_data, dict):
        raise ValueError("Model backend response is not a JSON object")

    text = response_data.get("text")
    if not isinstance(text, str):
        raise ValueError("Model backend response does not contain text")

    # On vérifie chaque ligne avec le schéma avant de l'enregistrer.
    lines = []
    for line in response_data.get("lines", []):
        lines.append(TranscriptionLine.model_validate(line).model_dump())

    # Taille de l'image vue par le modèle : les cadres des lignes s'y rapportent.
    image_width = None
    image_height = None
    if response_data.get("image_size"):
        image_width, image_height = response_data["image_size"]

    await repository.save_page_transcription(
        page_id=page_id,
        text=text,
        lines=lines,
        image_width=image_width,
        image_height=image_height,
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

        # Les objets expirent après un rollback : on garde les identifiants.
        page_ids = []
        for page in pages:
            page_ids.append(page.id)

        await transcription_repository.start_transcription_job(job_id)

        # Les pages déjà transcrites sont sautées, et une page en échec
        # n'empêche pas de transcrire les suivantes.
        failed = False
        for page_id in page_ids:
            try:
                await page_transcription(session, page_id)
            except Exception:
                logger.exception("Transcription of page %s failed", page_id)
                await session.rollback()
                failed = True

        if failed:
            await transcription_repository.fail_transcription_job(job_id)
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
        if not needs_transcription(existing):
            await transcription_repository.complete_transcription_job(job_id)
            return

        await transcription_repository.start_transcription_job(job_id)

        try:
            if not await page_transcription(session, job.page_id):
                await transcription_repository.complete_transcription_job(job_id)
                return
        except Exception:
            # Après un rollback, job est périmé : on n'utilise plus que job_id.
            logger.exception("Transcription job %s failed", job_id)
            await session.rollback()
            await transcription_repository.fail_transcription_job(job_id)
            return

        await transcription_repository.complete_transcription_job(job_id)
