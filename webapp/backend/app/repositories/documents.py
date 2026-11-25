from uuid import UUID

from sqlalchemy import delete, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.documents import (
    Document,
    DocumentAccessRole,
    DocumentShare,
    DocumentShareRole,
    Page,
)
from app.models.transcriptions import PageTranscription
from app.models.user import User


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

    async def get_for_user(
        self,
        user_id: UUID,
    ) -> list[tuple[Document, str, DocumentShareRole | None]]:
        result = await self.session.execute(
            select(Document, User.name, DocumentShare.role)
            .join(User, User.id == Document.owner_id)
            .outerjoin(
                DocumentShare,
                (DocumentShare.document_id == Document.id)
                & (DocumentShare.user_id == user_id),
            )
            .where((Document.owner_id == user_id) | (DocumentShare.user_id == user_id))
            .order_by(Document.id.desc())
        )
        return list(result.all())

    async def get_access_role(
        self,
        document_id: UUID,
        user_id: UUID,
    ) -> DocumentAccessRole | None:
        document_owner_id = await self.session.scalar(
            select(Document.owner_id).where(Document.id == document_id)
        )
        if document_owner_id == user_id:
            return DocumentAccessRole.OWNER

        share_role = await self.session.scalar(
            select(DocumentShare.role).where(
                DocumentShare.document_id == document_id,
                DocumentShare.user_id == user_id,
            )
        )
        if share_role == DocumentShareRole.EDITOR:
            return DocumentAccessRole.EDITOR
        if share_role == DocumentShareRole.VIEWER:
            return DocumentAccessRole.VIEWER
        return None

    async def document_exists(self, document_id: UUID) -> bool:
        return (
            await self.session.scalar(
                select(Document.id).where(Document.id == document_id)
            )
            is not None
        )

    async def get_document_by_id(
        self,
        document_id: UUID,
        user_id: UUID,
    ) -> Document | None:
        return await self.session.scalar(
            select(Document).where(
                Document.id == document_id,
                (Document.owner_id == user_id)
                | exists().where(
                    (DocumentShare.document_id == Document.id)
                    & (DocumentShare.user_id == user_id)
                ),
            )
        )

    async def get_pages(
        self,
        document_id: UUID,
        user_id: UUID,
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
                (Document.owner_id == user_id)
                | exists().where(
                    (DocumentShare.document_id == Document.id)
                    & (DocumentShare.user_id == user_id)
                ),
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
        user_id: UUID,
    ) -> list[Page]:
        result = await self.session.scalars(
            select(Page)
            .join(Document)
            .where(
                Page.document_id == document_id,
                (Document.owner_id == user_id)
                | exists().where(
                    (DocumentShare.document_id == Document.id)
                    & (DocumentShare.user_id == user_id)
                ),
            )
            .order_by(Page.page_number)
        )
        return list(result.all())

    async def get_page_by_id(
        self,
        page_id: UUID,
        user_id: UUID,
        document_id: UUID | None = None,
    ) -> Page | None:
        conditions = [
            Page.id == page_id,
            (Document.owner_id == user_id)
            | exists().where(
                (DocumentShare.document_id == Document.id)
                & (DocumentShare.user_id == user_id)
            ),
        ]
        if document_id is not None:
            conditions.append(Page.document_id == document_id)
        return await self.session.scalar(select(Page).join(Document).where(*conditions))

    async def search_in_document(
        self,
        document_id: UUID,
        user_id: UUID,
        query: str,
    ) -> list[tuple[Page, PageTranscription]]:
        result = await self.session.execute(
            select(Page, PageTranscription)
            .join(Document)
            .join(PageTranscription, PageTranscription.page_id == Page.id)
            .where(
                Page.document_id == document_id,
                (Document.owner_id == user_id)
                | exists().where(
                    (DocumentShare.document_id == Document.id)
                    & (DocumentShare.user_id == user_id)
                ),
                PageTranscription.text.ilike(f"%{query}%"),
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

    async def list_shares(
        self,
        document_id: UUID,
    ) -> list[tuple[DocumentShare, str]]:
        result = await self.session.execute(
            select(DocumentShare, User.name)
            .join(User, User.id == DocumentShare.user_id)
            .where(DocumentShare.document_id == document_id)
            .order_by(DocumentShare.created_at)
        )
        return list(result.all())

    async def set_share(
        self,
        document_id: UUID,
        user_id: UUID,
        role: DocumentShareRole,
    ) -> tuple[DocumentShare, str]:
        share = await self.session.scalar(
            select(DocumentShare).where(
                DocumentShare.document_id == document_id,
                DocumentShare.user_id == user_id,
            )
        )
        if share is None:
            share = DocumentShare(
                document_id=document_id,
                user_id=user_id,
                role=role,
            )
            self.session.add(share)
            await self.session.flush()
        else:
            share.role = role
            await self.session.flush()

        user_name = await self.session.scalar(
            select(User.name).where(User.id == user_id)
        )
        if user_name is None:
            raise RuntimeError("Shared user was not found")
        return share, user_name

    async def delete_share(self, document_id: UUID, user_id: UUID) -> bool:
        share = await self.session.scalar(
            select(DocumentShare).where(
                DocumentShare.document_id == document_id,
                DocumentShare.user_id == user_id,
            )
        )
        if share is None:
            return False
        await self.session.delete(share)
        await self.session.flush()
        return True

    async def commit(self):
        await self.session.commit()
