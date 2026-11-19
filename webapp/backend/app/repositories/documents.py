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
        await self.session.flush()
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
        after_page_number: int | None,
        limit: int,
    ) -> tuple[list[Page], bool]:
        page_join = Page.document_id == Document.id
        if after_page_number is not None:
            page_join = page_join & (Page.page_number > after_page_number)
        statement = (
            select(Document, Page)
            .outerjoin(Page, page_join)
            .where(
                Document.id == document_id,
                Document.owner_id == owner_id,
            )
            .order_by(Page.page_number)
        )
        rows = (await self.session.execute(statement.limit(limit))).all()
        if not rows:
            return [], False
        return [page for _, page in rows if page is not None], True

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
        document_id: UUID | None = None,
    ) -> Page | None:
        conditions = [Page.id == page_id, Document.owner_id == owner_id]
        if document_id is not None:
            conditions.append(Page.document_id == document_id)
        return await self.session.scalar(select(Page).join(Document).where(*conditions))

    async def search_in_document(
        self,
        document_id: UUID,
        owner_id: UUID,
        query: str,
    ) -> list[Page]:
        result = await self.session.scalars(
            select(Page)
            .join(Document)
            .where(
                Page.document_id == document_id,
                Document.owner_id == owner_id,
                Page.text.ilike(f"%{query}%"),
            )
            .order_by(Page.page_number)
        )
        return list(result.all())

    async def get_page(self, page_id: UUID) -> Page | None:
        return await self.session.scalar(select(Page).where(Page.id == page_id))

    async def delete(self, document: Document) -> None:
        await self.session.execute(delete(Page).where(Page.document_id == document.id))
        await self.session.delete(document)

    async def delete_all_for_owner(self, owner_id: UUID) -> list[UUID]:
        result = await self.session.scalars(
            select(Document.id).where(Document.owner_id == owner_id)
        )
        stored = list(result.all())
        if not stored:
            return []

        await self.session.execute(delete(Page).where(Page.document_id.in_(stored)))
        await self.session.execute(
            delete(Document).where(Document.owner_id == owner_id)
        )
        return stored

    async def commit(self):
        await self.session.commit()
