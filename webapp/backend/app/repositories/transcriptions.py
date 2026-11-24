from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import Document, Page
from app.models.transcriptions import (
    PageTranscription,
    TranscriptionEntities,
    TranscriptionJob,
)


class TranscriptionJobStatus:
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


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
            status=TranscriptionJobStatus.QUEUED,
        )
        self.session.add(transcription_job)
        await self.session.flush()
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
            status=TranscriptionJobStatus.QUEUED,
        )
        self.session.add(transcription_job)
        await self.session.flush()
        return transcription_job

    async def start_transcription_job(self, job_id: UUID):
        result = await self.session.scalars(
            update(TranscriptionJob)
            .where(
                TranscriptionJob.id == job_id,
                TranscriptionJob.status == TranscriptionJobStatus.QUEUED,
            )
            .values(status=TranscriptionJobStatus.IN_PROGRESS, started_at=func.now())
            .returning(TranscriptionJob)
        )
        return result.one_or_none()

    async def fail_transcription_job(self, job_id: UUID):
        result = await self.session.scalars(
            update(TranscriptionJob)
            .where(
                TranscriptionJob.id == job_id,
                TranscriptionJob.status == TranscriptionJobStatus.IN_PROGRESS,
            )
            .values(status=TranscriptionJobStatus.FAILED, finished_at=func.now())
            .returning(TranscriptionJob)
        )
        return result.one_or_none()

    async def complete_transcription_job(self, job_id: UUID):
        result = await self.session.scalars(
            update(TranscriptionJob)
            .where(
                TranscriptionJob.id == job_id,
                TranscriptionJob.status == TranscriptionJobStatus.IN_PROGRESS,
            )
            .values(status=TranscriptionJobStatus.COMPLETED, finished_at=func.now())
            .returning(TranscriptionJob)
        )
        return result.one_or_none()

    async def get_transcription_job_by_id(
        self,
        job_id: UUID,
        owner_id: UUID | None = None,
    ) -> TranscriptionJob | None:
        conditions = [TranscriptionJob.id == job_id]
        if owner_id is not None:
            conditions.append(TranscriptionJob.owner_id == owner_id)
        result = await self.session.scalars(select(TranscriptionJob).where(*conditions))
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
        lines: list[dict] | None = None,
        image_width: int | None = None,
        image_height: int | None = None,
    ):
        statement = insert(PageTranscription).values(
            page_id=page_id,
            text=text,
            lines=lines,
            image_width=image_width,
            image_height=image_height,
        )
        statement = statement.on_conflict_do_update(
            index_elements=[PageTranscription.page_id],
            set_={
                "text": statement.excluded.text,
                "lines": statement.excluded.lines,
                "image_width": statement.excluded.image_width,
                "image_height": statement.excluded.image_height,
                "updated_at": func.now(),
            },
        )
        return await self.session.scalar(statement.returning(PageTranscription))

    async def get_page_transcription_by_page_id(
        self,
        page_id: UUID,
    ) -> PageTranscription | None:
        result = await self.session.scalars(
            select(PageTranscription).where(PageTranscription.page_id == page_id)
        )
        return result.one_or_none()

    async def get_owned_page_transcription(
        self,
        document_id: UUID,
        page_id: UUID,
        owner_id: UUID,
    ) -> PageTranscription | None:
        return await self.session.scalar(
            select(PageTranscription)
            .join(Page, Page.id == PageTranscription.page_id)
            .join(Document, Document.id == Page.document_id)
            .where(
                Page.id == page_id,
                Page.document_id == document_id,
                Document.owner_id == owner_id,
            )
        )

    async def update_page_transcription(
        self,
        page_id: UUID,
        text: str,
        lines: list[dict] | None = None,
        image_width: int | None = None,
        image_height: int | None = None,
    ):
        return await self.save_page_transcription(
            page_id=page_id,
            text=text,
            lines=lines,
            image_width=image_width,
            image_height=image_height,
        )

    async def save_page_transcription(
        self,
        page_id: UUID,
        text: str,
        lines: list[dict],
        image_width: int | None,
        image_height: int | None,
    ):
        return await self.create_page_transcription(
            page_id, text, lines, image_width, image_height
        )

    async def save_page_transcriptions(
        self, transcriptions: list[dict[str, object]]
    ) -> dict[UUID, UUID]:
        """Enregistre les transcriptions et renvoie l'id de chacune, par page."""
        if not transcriptions:
            return {}
        statement = insert(PageTranscription).values(transcriptions)
        statement = statement.on_conflict_do_update(
            index_elements=[PageTranscription.page_id],
            set_={
                "text": statement.excluded.text,
                "lines": statement.excluded.lines,
                "image_width": statement.excluded.image_width,
                "image_height": statement.excluded.image_height,
                "updated_at": func.now(),
            },
        )
        result = await self.session.execute(
            statement.returning(PageTranscription.page_id, PageTranscription.id)
        )
        return {page_id: transcription_id for page_id, transcription_id in result}

    async def get_document_pages_with_transcriptions(
        self,
        document_id: UUID,
        owner_id: UUID,
    ) -> list[tuple[Page, PageTranscription | None, TranscriptionEntities | None]]:
        result = await self.session.execute(
            select(Page, PageTranscription, TranscriptionEntities)
            .join(Document)
            .outerjoin(
                PageTranscription,
                PageTranscription.page_id == Page.id,
            )
            .outerjoin(
                TranscriptionEntities,
                TranscriptionEntities.transcription_id == PageTranscription.id,
            )
            .where(
                Page.document_id == document_id,
                Document.owner_id == owner_id,
            )
            .order_by(Page.page_number)
        )
        return list(result.all())

    async def get_page_with_transcription(
        self,
        page_id: UUID,
    ) -> tuple[Page, PageTranscription | None, TranscriptionEntities | None] | None:
        result = await self.session.execute(
            select(Page, PageTranscription, TranscriptionEntities)
            .outerjoin(
                PageTranscription,
                PageTranscription.page_id == Page.id,
            )
            .outerjoin(
                TranscriptionEntities,
                TranscriptionEntities.transcription_id == PageTranscription.id,
            )
            .where(Page.id == page_id)
        )
        return result.one_or_none()

    ## Entities

    async def get_page_transcription_with_entities(
        self,
        page_id: UUID,
    ) -> tuple[PageTranscription, TranscriptionEntities | None] | None:
        result = await self.session.execute(
            select(PageTranscription, TranscriptionEntities)
            .outerjoin(
                TranscriptionEntities,
                TranscriptionEntities.transcription_id == PageTranscription.id,
            )
            .where(PageTranscription.page_id == page_id)
        )
        return result.one_or_none()

    async def save_transcription_entities(self, rows: list[dict[str, object]]) -> None:
        """Enregistre les entités ({transcription_id, entities}) de chaque transcription."""
        if not rows:
            return
        statement = insert(TranscriptionEntities).values(rows)
        statement = statement.on_conflict_do_update(
            index_elements=[TranscriptionEntities.transcription_id],
            set_={
                "entities": statement.excluded.entities,
                "updated_at": func.now(),
            },
        )
        await self.session.execute(statement)

    async def delete_transcription_entities(
        self, transcription_ids: list[UUID]
    ) -> None:
        if not transcription_ids:
            return
        await self.session.execute(
            delete(TranscriptionEntities).where(
                TranscriptionEntities.transcription_id.in_(transcription_ids)
            )
        )

    async def commit(self):
        await self.session.commit()
