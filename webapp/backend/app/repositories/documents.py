from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.schemas.documents import DocumentCreate, PagePaginateRead
from app.models.documents import Document, Page


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: DocumentCreate) -> Document:
        document = Document(
            id=data.id,
            owner_id=data.owner_id,
            original_filename=data.original_filename,
            storage_path=data.storage_path,
        )
        self.session.add(document)
        await self.session.flush()

        self.session.add_all(
            Page(
                document_id=document.id,
                page_number=page_number,
                image_path=str(image_path),
            )
            for page_number, image_path in enumerate(data.image_paths, start=1)
        )
        await self.session.commit()
        return document

    async def get_all(self, owner_id: UUID) -> list[Document]:
        result = await self.session.scalars(
            select(Document)
            .where(Document.owner_id == owner_id)
            .order_by(Document.uploaded_at.desc())
        )
        return list(result.all())

    async def delete(self, document: Document) -> None:
        await self.session.execute(delete(Page).where(Page.document_id == document.id))
        await self.session.delete(document)
        await self.session.commit()

    async def delete_all_for_owner(self, owner_id: UUID) -> list[tuple[UUID, str]]:
        documents = await self.get_all(owner_id)
        stored = [(document.id, document.storage_path) for document in documents]
        for document in documents:
            await self.session.execute(delete(Page).where(Page.document_id == document.id))
            await self.session.delete(document)
        if documents:
            await self.session.commit()
        return stored

    async def get_document_by_id(
        self,
        document_id: UUID,
        owner_id: UUID,
    ) -> Document | None:
        return await self.session.scalar(
            select(Document).where(
                Document.id == document_id,
                Document.owner_id == owner_id,
            )
        )

    async def get_pages(
        self,
        parameters: PagePaginateRead
    ) -> list[Page]:
        result = await self.session.scalars(
            select(Page)
            .join(Document)
            .where(
                Page.document_id == parameters.document_id,
                Document.owner_id == parameters.owner_id,
            )
            .order_by(Page.page_number)
            .offset(parameters.offset)
            .limit(parameters.limit)
        )
        return list(result.all())

    async def get_page_by_id(
        self,
        page_id: UUID,
        document_id: UUID,
        owner_id: UUID,
    ) -> Page | None:
        return await self.session.scalar(
            select(Page).join(Document).where(
                Page.id == page_id,
                Page.document_id == document_id,
                Document.owner_id == owner_id,
            )
        )

