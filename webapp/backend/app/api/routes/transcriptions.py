from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Security, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.csrf import csrf_header
from app.api.dependencies.injection import (
    DocumentServiceDep,
    TranscriptionServiceDep,
)
from app.api.schemas.transcriptions import TranscriptionResponse
from app.models.user import User
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
    description="Create a transcription job for a specific page of a document owned by the current user.",
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
