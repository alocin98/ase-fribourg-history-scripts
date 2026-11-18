import logging
import tempfile
from pathlib import Path
from uuid import UUID

import httpx

from app.api.schemas.transcriptions import TranscriptionLine
from app.core.config import settings
from app.infrastructure.database.session import session_factory
from app.infrastructure.storage.s3 import download_file_to_path
from app.models.documents import Page
from app.models.transcriptions import PageTranscription
from app.services.transcriptions import TranscriptionService

logger = logging.getLogger(__name__)


def needs_transcription(transcription: PageTranscription | None) -> bool:
    # Les anciennes transcriptions n'ont que le texte : on les refait pour obtenir
    # les lignes, leurs cadres et leurs confiances.
    return transcription is None or transcription.lines is None


async def transcribe_page_content(
    service: TranscriptionService,
    page_id: UUID,
    existing: PageTranscription | None = None,
    page: Page | None = None,
) -> dict[str, object] | None:
    if existing is None:
        existing = await service.get_page_transcription(page_id)
    if not needs_transcription(existing):
        return None

    if page is None:
        page = await service.get_page_for_worker(page_id)
    if page is None:
        return None

    # Télécharger l'image dans un répertoire temporaire
    with tempfile.TemporaryDirectory() as temporary_directory:
        image_path = Path(temporary_directory) / Path(page.image_key).name

        await download_file_to_path(page.image_key, str(image_path))

        with image_path.open("rb") as image_file:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.MODEL_BACKEND_URL.rstrip('/')}/predict",
                    files={
                        "file": (
                            image_path.name,
                            image_file,
                            page.mime_type,
                        )
                    },
                    timeout=120.0,
                )
        # 422 : le modèle n'a trouvé aucune ligne, la page est vide.
        if response.status_code == 422:
            return {
                "page_id": page_id,
                "text": "",
                "lines": [],
                "image_width": None,
                "image_height": None,
            }
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

    return {
        "page_id": page_id,
        "text": text,
        "lines": lines,
        "image_width": image_width,
        "image_height": image_height,
    }


async def page_transcription(
    service: TranscriptionService,
    page_id: UUID,
    existing: PageTranscription | None = None,
    page: Page | None = None,
) -> bool:
    result = await transcribe_page_content(service, page_id, existing, page)
    if result is None:
        return False
    await service.save_page_transcriptions([result])
    return True


async def transcribe_document(job_id: UUID) -> None:
    async with session_factory() as session:
        service = TranscriptionService(session)

        job = await service.get_worker_job(job_id)

        if job is None:
            return

        pages = await service.get_document_pages(
            document_id=job.document_id,
            owner_id=job.owner_id,
        )

        if await service.start_job(job_id) is None:
            return

        # Les pages déjà transcrites sont sautées, et une page en échec
        # n'empêche pas de transcrire les suivantes.
        failed = False
        pending: list[dict[str, object]] = []

        async def flush_pending() -> None:
            nonlocal failed
            if not pending:
                return
            try:
                await service.save_page_transcriptions(pending)
                pending.clear()
            except Exception:
                logger.exception("Persisting a transcription batch failed")
                await session.rollback()
                pending.clear()
                failed = True

        for page, existing in pages:
            try:
                result = await transcribe_page_content(service, page.id, existing, page)
                if result is not None:
                    pending.append(result)
                if len(pending) >= 20:
                    await flush_pending()
            except Exception:
                logger.exception("Transcription of page %s failed", page.id)
                await flush_pending()
                await session.rollback()
                failed = True

        await flush_pending()

        if failed:
            await service.fail_job(job_id)
            return

        await service.complete_job(job_id)


async def transcribe_page(job_id: UUID) -> None:
    async with session_factory() as session:
        service = TranscriptionService(session)

        job = await service.get_worker_job(job_id)

        if job is None:
            return

        existing = await service.get_page_transcription(job.page_id)
        if await service.start_job(job_id) is None:
            return

        if not needs_transcription(existing):
            await service.complete_job(job_id)
            return

        try:
            if not await page_transcription(service, job.page_id):
                await service.complete_job(job_id)
                return
        except Exception:
            # Après un rollback, job est périmé : on n'utilise plus que job_id.
            logger.exception("Transcription job %s failed", job_id)
            await session.rollback()
            await service.fail_job(job_id)
            return

        await service.complete_job(job_id)
