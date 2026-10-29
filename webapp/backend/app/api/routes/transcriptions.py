from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Security, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import csrf_header, get_current_user
from app.api.schemas.transcriptions import TranscriptionResponse
from app.core.db import get_db
from app.core.jobs import enqueue_document_transcription, enqueue_page_transcription
from app.models.user import User
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository

router = APIRouter(prefix="/transcriptions", tags=["transcriptions"])


@router.post(
    "/document/{document_id}",
    dependencies=[Security(csrf_header)],
    name="create_document_transcription",
    description="Create a transcription job for a document owned by the current user.",
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_document_transcription_job(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    document = await DocumentRepository(session).get_document_by_id(
        document_id, current_user.id
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    repository = TranscriptionRepository(session)
    jobs = await repository.create_document_transcription_job(
        document_id=document_id, owner_id=current_user.id
    )

    enqueue_document_transcription(background_tasks, jobs.id)

    return TranscriptionResponse(job_id=jobs.id, status=jobs.status)


@router.post(
    "/document/{document_id}/pages/{page_id}",
    dependencies=[Security(csrf_header)],
    name="create_page_transcription",
    description="Create a transcription job for a specific page of a document owned by the current user.",
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_page_transcription(
    document_id: UUID,
    page_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    page = await DocumentRepository(session).get_page_by_id(
        page_id=page_id, document_id=document_id, owner_id=current_user.id
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Document or Page not found")

    repository = TranscriptionRepository(session)
    jobs = await repository.create_page_transcription_job(
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = TranscriptionRepository(session)
    job = await repository.get_transcription_job_by_id(job_id=job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Transcription job not found")

    return TranscriptionResponse(job_id=job.id, status=job.status)
    repository = TranscriptionRepository(session)
    job = await repository.get_transcription_job_by_id(job_id=job_id)

    if job is None:
        raise HTTPException(status_code=404, detail="Transcription job not found")

    return TranscriptionResponse(job_id=job.id, status=job.status)
