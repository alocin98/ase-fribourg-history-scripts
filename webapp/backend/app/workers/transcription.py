import logging
import tempfile
from pathlib import Path
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.transcriptions import RecognizedEntity, TranscriptionLine
from app.core.config import settings
from app.infrastructure.database.session import session_factory
from app.infrastructure.storage.s3 import download_file_to_path
from app.models.documents import Page
from app.models.transcriptions import PageTranscription, TranscriptionEntities
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository
from app.services.transcriptions import PageResult, TranscriptionService

logger = logging.getLogger(__name__)

# Score minimal d'une entité pour être gardée.
ENTITY_THRESHOLD = 0.5


def get_service(session: AsyncSession) -> TranscriptionService:
    document_repository = DocumentRepository(session)
    transcription_repository = TranscriptionRepository(session)
    return TranscriptionService(
        document_repository=document_repository,
        repository=transcription_repository,
    )


def needs_transcription(transcription: PageTranscription | None) -> bool:
    # Les anciennes transcriptions n'ont que le texte : on les refait pour obtenir
    # les lignes, leurs cadres et leurs confiances.
    return transcription is None or transcription.lines is None


def needs_work(
    transcription: PageTranscription | None,
    entities: TranscriptionEntities | None,
) -> bool:
    # Une page est terminée quand elle a une transcription complète et ses entités.
    return needs_transcription(transcription) or entities is None


def model_url(path: str) -> str:
    return f"{settings.MODEL_BACKEND_URL.rstrip('/')}{path}"


async def transcribe_image(page: Page) -> dict[str, object]:
    """Envoie l'image de la page au modèle et renvoie la transcription à enregistrer."""
    # Télécharger l'image dans un répertoire temporaire
    with tempfile.TemporaryDirectory() as temporary_directory:
        image_path = Path(temporary_directory) / Path(page.image_key).name

        await download_file_to_path(page.image_key, str(image_path))

        with image_path.open("rb") as image_file:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    model_url("/predict"),
                    files={
                        "file": (
                            image_path.name,
                            image_file,
                            page.mime_type,
                        )
                    },
                    # The first CPU request can include PyTorch warm-up/compilation.
                    timeout=settings.MODEL_REQUEST_TIMEOUT,
                )
        # 422 : le modèle n'a trouvé aucune ligne, la page est vide.
        if response.status_code == 422:
            return {
                "page_id": page.id,
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
        "page_id": page.id,
        "text": text,
        "lines": lines,
        "image_width": image_width,
        "image_height": image_height,
    }


async def recognize_entities(text: str) -> list[dict]:
    """Personnes, dates et lieux du texte, positions relatives au texte complet."""
    if not text.strip():
        return []

    async with httpx.AsyncClient() as client:
        response = await client.post(
            model_url("/entities"),
            json={"text": text, "threshold": ENTITY_THRESHOLD},
            # Le modèle GLiNER est chargé au premier appel.
            timeout=settings.MODEL_REQUEST_TIMEOUT,
        )
    response.raise_for_status()
    response_data = response.json()

    if not isinstance(response_data, dict) or not isinstance(
        response_data.get("entities"), list
    ):
        raise ValueError("Model backend response does not contain entities")

    return [
        RecognizedEntity.model_validate(entity).model_dump()
        for entity in response_data["entities"]
    ]


async def process_page(
    page: Page,
    existing: PageTranscription | None,
    entities: TranscriptionEntities | None,
) -> PageResult | None:
    """Transcrit la page si besoin, puis y cherche les entités.

    Renvoie None si la page est déjà terminée. Une erreur de transcription est levée ;
    une erreur de reconnaissance donne entities=None, pour garder le texte obtenu.
    """
    if not needs_work(existing, entities):
        return None

    transcription = None
    text = existing.text if existing is not None else None
    if needs_transcription(existing):
        transcription = await transcribe_image(page)
        text = transcription["text"]

    try:
        found = await recognize_entities(text or "")
    except Exception:
        logger.exception("Entity recognition of page %s failed", page.id)
        found = None

    return PageResult(
        page_id=page.id,
        transcription_id=existing.id if existing is not None else None,
        transcription=transcription,
        entities=found,
    )


async def transcribe_document(job_id: UUID) -> None:
    async with session_factory() as session:
        service = get_service(session)

        job = await service.get_worker_job(job_id)

        if job is None:
            return

        pages = await service.get_document_pages(
            document_id=job.document_id,
            owner_id=job.owner_id,
        )
        # Un rollback expire les objets de la session : détachés, ils restent lisibles
        # pour les pages suivantes.
        session.expunge_all()

        if await service.start_job(job_id) is None:
            return

        # Les pages déjà terminées sont sautées, et une page en échec
        # n'empêche pas de traiter les suivantes.
        failed = False
        pending: list[PageResult] = []

        async def flush_pending() -> None:
            nonlocal failed
            if not pending:
                return
            try:
                await service.save_page_results(pending)
            except Exception:
                logger.exception("Persisting a transcription batch failed")
                await session.rollback()
                failed = True
            pending.clear()

        for page, existing, entities in pages:
            try:
                result = await process_page(page, existing, entities)
                if result is not None:
                    pending.append(result)
                    if result.entities is None:
                        failed = True
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
        service = get_service(session)

        job = await service.get_worker_job(job_id)

        if job is None:
            return

        found = await service.get_page_for_worker(job.page_id)
        if await service.start_job(job_id) is None:
            return

        if found is None:
            await service.complete_job(job_id)
            return

        try:
            result = await process_page(*found)
            if result is not None:
                await service.save_page_results([result])
        except Exception:
            # Après un rollback, job est périmé : on n'utilise plus que job_id.
            logger.exception("Transcription job %s failed", job_id)
            await session.rollback()
            await service.fail_job(job_id)
            return

        if result is not None and result.entities is None:
            await service.fail_job(job_id)
            return

        await service.complete_job(job_id)
