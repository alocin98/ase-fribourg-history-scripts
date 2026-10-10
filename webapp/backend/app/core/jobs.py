from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.workers.transcription import transcribe_document, transcribe_page

def run_background_task(background_tasks: BackgroundTasks, func, *args, **kwargs):
    background_tasks.add_task(func, *args, **kwargs)

def enqueue_document_transcription(background_tasks: BackgroundTasks, job_id: str):
    run_background_task(background_tasks, transcribe_document, job_id)

def enqueue_page_transcription(background_tasks: BackgroundTasks, job_id: str):
    run_background_task(background_tasks, transcribe_page, job_id)
