from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Security, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.csrf import csrf_header
from app.api.schemas.transcriptions import TranscriptionResponse
from app.infrastructure.database.session import get_db
from app.models.user import User
from app.repositories.transcriptions import TranscriptionRepository
from app.workers.queue import enqueue_document_transcription, enqueue_page_transcription

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
    repository = TranscriptionRepository(session)
    jobs = await repository.create_document_transcription_job(
        document_id=document_id, owner_id=current_user.id
    )

    if jobs is None:
        raise HTTPException(status_code=404, detail="Document not found")

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
    repository = TranscriptionRepository(session)
    jobs = await repository.create_page_transcription_job(
        document_id=document_id, page_id=page_id, owner_id=current_user.id
    )

    if jobs is None:
        raise HTTPException(status_code=404, detail="Document or Page not found")

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
