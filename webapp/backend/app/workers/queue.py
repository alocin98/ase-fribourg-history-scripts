from collections.abc import Callable
from fastapi import BackgroundTasks

from app.workers.transcription import transcribe_document, transcribe_page


def enqueue_document_transcription(
    background_tasks: BackgroundTasks,
    job_id: str,
) -> None:
    background_tasks.add_task(transcribe_document, job_id)


def enqueue_page_transcription(
    background_tasks: BackgroundTasks,
    job_id: str,
) -> None:
    background_tasks.add_task(transcribe_page, job_id)