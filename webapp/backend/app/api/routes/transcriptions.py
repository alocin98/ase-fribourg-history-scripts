import re
import time
from difflib import SequenceMatcher
from typing import Literal
from uuid import UUID

import httpx
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Security,
    status,
)

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.csrf import csrf_header
from app.api.dependencies.injection import (
    DocumentServiceDep,
    TranscriptionServiceDep,
)
from app.api.schemas.transcriptions import EntitySummaryResponse, TranscriptionResponse
from app.models.user import User
from app.workers.queue import enqueue_document_transcription, enqueue_page_transcription

router = APIRouter(prefix="/transcriptions", tags=["transcriptions"])

WIKIPEDIA_CACHE_TTL_SECONDS = 24 * 60 * 60
WIKIPEDIA_USER_AGENT = (
    "ManuscriptAI/0.1 (https://github.com/alocin98/ase-fribourg-history-scripts)"
)
_wikipedia_cache: dict[tuple[str, str, str], tuple[float, EntitySummaryResponse]] = {}


def shorten_wikipedia_extract(text: str, max_sentences: int = 2) -> str:
    """Keep a compact, readable introduction without generating new facts."""
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return ""
    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    return " ".join(sentences[:max_sentences])


def clean_entity_query(query: str) -> str:
    """Remove punctuation commonly attached to an OCR entity span."""
    return " ".join(query.split()).strip(" \t\r\n.,;:!?\"'()[]{}-–—")


def fuzzy_person_query(query: str) -> str:
    """Allow one OCR character error in each sufficiently long name token."""
    tokens = re.findall(r"[\w'’-]+", query, flags=re.UNICODE)
    return " ".join(f"{token}~1" if len(token) >= 4 else token for token in tokens)


def name_similarity(query: str, title: str) -> float:
    def normalize(value: str) -> str:
        return "".join(
            character for character in value.casefold() if character.isalnum()
        )

    return SequenceMatcher(None, normalize(query), normalize(title)).ratio()


def wikidata_entity_is_human(entity: dict) -> bool:
    for claim in entity.get("claims", {}).get("P31", []):
        value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        if isinstance(value, dict) and value.get("id") == "Q5":
            return True
    return False


async def request_entity_summary(
    query: str,
    label: Literal["person", "location"],
    language: Literal["en", "fr"],
) -> EntitySummaryResponse:
    normalized_query = clean_entity_query(query)
    cache_key = (language, label, normalized_query.casefold())
    cached = _wikipedia_cache.get(cache_key)
    now = time.monotonic()
    if cached is not None and cached[0] > now:
        return cached[1]

    try:
        async with httpx.AsyncClient(
            timeout=10,
            headers={"User-Agent": WIKIPEDIA_USER_AGENT},
        ) as client:
            response = await client.get(
                f"https://{language}.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "generator": "search",
                    "gsrsearch": fuzzy_person_query(normalized_query)
                    if label == "person"
                    else normalized_query,
                    "gsrnamespace": 0,
                    "gsrlimit": 8 if label == "person" else 1,
                    "prop": "extracts|info|pageimages|pageprops",
                    "exintro": 1,
                    "explaintext": 1,
                    "inprop": "url",
                    "piprop": "thumbnail",
                    "pithumbsize": 320,
                    "redirects": 1,
                    "format": "json",
                    "formatversion": 2,
                },
            )
            response.raise_for_status()
            payload = response.json()

            wikidata_payload = None
            if label == "person" and isinstance(payload, dict):
                pages = payload.get("query", {}).get("pages", [])
                qids = [
                    page.get("pageprops", {}).get("wikibase_item")
                    for page in pages
                    if isinstance(page, dict)
                    and "disambiguation" not in page.get("pageprops", {})
                ]
                qids = [qid for qid in qids if isinstance(qid, str)]
                if qids:
                    wikidata_response = await client.get(
                        "https://www.wikidata.org/w/api.php",
                        params={
                            "action": "wbgetentities",
                            "ids": "|".join(qids),
                            "props": "claims",
                            "format": "json",
                        },
                    )
                    wikidata_response.raise_for_status()
                    wikidata_payload = wikidata_response.json()
    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Wikipedia lookup timed out",
        ) from error
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Wikipedia is unavailable",
        ) from error

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Wikipedia returned an invalid response",
        )
    pages = payload.get("query", {}).get("pages", [])
    pages = [page for page in pages if isinstance(page, dict)]
    if label == "person":
        wikidata_entities = (
            wikidata_payload.get("entities", {})
            if isinstance(wikidata_payload, dict)
            else {}
        )
        human_pages = []
        for candidate in pages:
            pageprops = candidate.get("pageprops", {})
            qid = pageprops.get("wikibase_item")
            entity = wikidata_entities.get(qid, {})
            if (
                "disambiguation" not in pageprops
                and isinstance(entity, dict)
                and wikidata_entity_is_human(entity)
            ):
                human_pages.append(candidate)
        page = max(
            human_pages,
            key=lambda candidate: name_similarity(
                normalized_query, str(candidate.get("title", ""))
            ),
            default=None,
        )
        if (
            page is not None
            and name_similarity(normalized_query, str(page.get("title", ""))) < 0.45
        ):
            page = None
    else:
        page = min(
            pages,
            key=lambda candidate: candidate.get("index", 10**9),
            default=None,
        )

    if page is None:
        result = EntitySummaryResponse(query=normalized_query, found=False)
    else:
        thumbnail = page.get("thumbnail")
        thumbnail_url = thumbnail.get("source") if isinstance(thumbnail, dict) else None
        title = page.get("title")
        extract = page.get("extract")
        url = page.get("fullurl")
        result = EntitySummaryResponse(
            query=normalized_query,
            found=True,
            title=title if isinstance(title, str) else None,
            summary=(
                shorten_wikipedia_extract(extract) if isinstance(extract, str) else None
            ),
            url=url if isinstance(url, str) else None,
            thumbnail_url=(thumbnail_url if isinstance(thumbnail_url, str) else None),
        )

    _wikipedia_cache[cache_key] = (now + WIKIPEDIA_CACHE_TTL_SECONDS, result)
    return result


@router.get(
    "/entities/summary",
    name="get_entity_summary",
    description="Get a short, sourced Wikipedia introduction for a person or place.",
)
async def get_entity_summary(
    query: str = Query(min_length=1, max_length=200),
    label: Literal["person", "location"] = Query(),
    language: Literal["en", "fr"] = Query(default="en"),
    _current_user: User = Depends(get_current_user),
) -> EntitySummaryResponse:
    return await request_entity_summary(query, label, language)


@router.post(
    "/document/{document_id}",
    dependencies=[Security(csrf_header)],
    name="create_document_transcription",
    description="Create a job that transcribes the pages of a document owned by the current user and finds their named entities.",
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_document_transcription_job(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    document_service: DocumentServiceDep,
    transcription_service: TranscriptionServiceDep,
    current_user: User = Depends(get_current_user),
) -> TranscriptionResponse:
    document = await document_service.get_owned(document_id, current_user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    jobs = await transcription_service.create_document_job(
        document_id=document_id, owner_id=current_user.id
    )

    enqueue_document_transcription(background_tasks, jobs.id)

    return TranscriptionResponse(job_id=jobs.id, status=jobs.status)


@router.post(
    "/document/{document_id}/pages/{page_id}",
    dependencies=[Security(csrf_header)],
    name="create_page_transcription",
    description="Create a job that transcribes a specific page of a document owned by the current user and finds its named entities.",
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_page_transcription(
    document_id: UUID,
    page_id: UUID,
    background_tasks: BackgroundTasks,
    document_service: DocumentServiceDep,
    transcription_service: TranscriptionServiceDep,
    current_user: User = Depends(get_current_user),
):
    page = await document_service.get_owned_page(
        document_id=document_id, page_id=page_id, owner_id=current_user.id
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Document or Page not found")

    jobs = await transcription_service.create_page_job(
        document_id=document_id, page_id=page_id, owner_id=current_user.id
    )

    enqueue_page_transcription(background_tasks, jobs.id)

    return TranscriptionResponse(job_id=jobs.id, status=jobs.status)


@router.get(
    "/jobs/{job_id}",
    dependencies=[Security(csrf_header)],
    name="get_transcription_job_status",
    description="Get the status of a transcription job.",
)
async def get_transcription_job_status(
    job_id: UUID,
    transcription_service: TranscriptionServiceDep,
    current_user: User = Depends(get_current_user),
):
    job = await transcription_service.get_job(job_id=job_id, owner_id=current_user.id)

    if job is None:
        raise HTTPException(status_code=404, detail="Transcription job not found")

    return TranscriptionResponse(job_id=job.id, status=job.status)
