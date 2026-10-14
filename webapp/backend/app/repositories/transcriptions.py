from pathlib import Path
from uuid import UUID
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.transcriptions import TranscriptionJob, PageTranscription


class TranscriptionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    ## Transcription Job

    async def create_document_transcription_job(
        self,
        document_id: UUID,
        owner_id: UUID,
    ):
        transcription_job = TranscriptionJob(
            document_id=document_id,
            owner_id=owner_id,
            status="created",
        )
        self.session.add(transcription_job)
        await self.session.commit()
        await self.session.refresh(transcription_job)
        return transcription_job

    async def create_page_transcription_job(
        self,
        document_id: UUID,
        page_id: UUID,
        owner_id: UUID,
    ):
        transcription_job = TranscriptionJob(
            document_id=document_id,
            page_id=page_id,
            owner_id=owner_id,
            status="created",
        )
        self.session.add(transcription_job)
        await self.session.commit()
        await self.session.refresh(transcription_job)
        return transcription_job

    async def start_transcription_job(self, job_id: UUID):
        result = await self.session.scalars(
            select(TranscriptionJob)
            .where(TranscriptionJob.id == job_id)
        )
        transcription_job = result.one_or_none()
        if transcription_job:
            transcription_job.status = "in_progress"
            transcription_job.started_at = datetime.now()
            await self.session.commit()
            await self.session.refresh(transcription_job)
            return transcription_job
        return None

    async def complete_transcription_job(self, job_id: UUID):
        result = await self.session.scalars(
            select(TranscriptionJob)
            .where(TranscriptionJob.id == job_id)
        )
        transcription_job = result.one_or_none()
        if transcription_job:
            transcription_job.status = "completed"
            transcription_job.finished_at = datetime.now()
            await self.session.commit()
            await self.session.refresh(transcription_job)
            return transcription_job
        return None

    async def get_transcription_job_by_id(
        self,
        job_id: UUID,
    ) -> TranscriptionJob | None:
        result = await self.session.scalars(
            select(TranscriptionJob).where(TranscriptionJob.id == job_id)
        )
        return result.one_or_none()

    async def get_transcription_jobs_by_document_id(
        self,
        document_id: UUID,
    ) -> list[TranscriptionJob]:
        result = await self.session.scalars(
            select(TranscriptionJob).where(TranscriptionJob.document_id == document_id)
        )
        return result.scalars().all()

    async def get_transcription_jobs_by_page_id(
        self,
        page_id: UUID,
    ) -> list[TranscriptionJob]:
        result = await self.session.scalars(
            select(TranscriptionJob).where(TranscriptionJob.page_id == page_id)
        )
        return result.scalars().all()
    
    ## Page Transcription

    async def create_page_transcription(
        self,
        page_id: UUID,
        text: str,
    ):
        page_transcription = PageTranscription(
            page_id=page_id,
            text=text,
        )
        self.session.add(page_transcription)
        await self.session.commit()
        await self.session.refresh(page_transcription)
        return page_transcription

    async def get_page_transcription_by_page_id(
        self,
        page_id: UUID,
    ) -> PageTranscription | None:
        result = await self.session.scalars(
            select(PageTranscription).where(PageTranscription.page_id == page_id)
        )
        return result.one_or_none()

    async def update_page_transcription(
        self,
        page_id: UUID,
        text: str,
    ):
        result = await self.session.scalars(
            select(PageTranscription).where(PageTranscription.page_id == page_id)
        )
        page_transcription = result.one_or_none()
        if page_transcription:
            page_transcription.text = text
            await self.session.commit()
            await self.session.refresh(page_transcription)
            return page_transcription
        return None