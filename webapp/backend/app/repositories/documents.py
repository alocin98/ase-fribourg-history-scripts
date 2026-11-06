from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import Document, Page


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_document(
        self,
        *,
        document_id: UUID,
        owner_id: UUID,
        name: str,
        description: str,
    ) -> Document:
        document = Document(
            id=document_id,
            owner_id=owner_id,
            name=name,
            description=description,
        )

        self.session.add(document)
        await self.session.commit()
        await self.session.refresh(document)
        return document

    async def create_pages(
        self,
        document_id: UUID,
        pages: list[dict[str, int | str]],
    ) -> None:
        self.session.add_all(
            Page(
                document_id=document_id,
                page_number=page["page_number"],
                width=page["width"],
                height=page["height"],
                mime_type=page["mime_type"],
                image_key=str(page["image_key"]),
            )
            for page in pages
        )
        await self.session.commit()

    async def get_all(self, owner_id: UUID) -> list[Document]:
        result = await self.session.scalars(
            select(Document)
            .where(Document.owner_id == owner_id)
            .order_by(Document.id.desc())
        )
        return list(result.all())

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
        document_id: UUID,
        owner_id: UUID,
        offset: int,
        limit: int,
    ) -> list[Page]:
        result = await self.session.scalars(
            select(Page)
            .join(Document)
            .where(
                Page.document_id == document_id,
                Document.owner_id == owner_id,
            )
            .order_by(Page.page_number)
            .offset(offset)
            .limit(limit)
        )
        return list(result.all())

    async def get_all_pages_by_document_id(
        self,
        document_id: UUID,
        owner_id: UUID,
    ) -> list[Page]:
        result = await self.session.scalars(
            select(Page)
            .join(Document)
            .where(
                Page.document_id == document_id,
                Document.owner_id == owner_id,
            )
            .order_by(Page.page_number)
        )
        return list(result.all())

    async def get_page_by_id(
        self,
        page_id: UUID,
        owner_id: UUID,
    ) -> Page | None:
        return await self.session.scalar(
            select(Page)
            .join(Document)
            .where(
                Page.id == page_id,
                Document.owner_id == owner_id,
            )
        )

    async def delete(self, document: Document) -> None:
        await self.session.execute(delete(Page).where(Page.document_id == document.id))
        await self.session.delete(document)
        await self.session.commit()

    async def delete_all_for_owner(self, owner_id: UUID) -> list[UUID]:
        documents = await self.get_all(owner_id)
        stored = [document.id for document in documents]
        for document in documents:
            await self.session.execute(
                delete(Page).where(Page.document_id == document.id)
            )
            await self.session.delete(document)
        if documents:
            await self.session.commit()
        return stored
