from uuid import UUID

from app.models.documents import Document, Page
from app.repositories.documents import DocumentRepository


class DocumentService:
    def __init__(self, repository: DocumentRepository):
        self.repository = repository

    async def create(
        self,
        *,
        document_id: UUID,
        owner_id: UUID,
        name: str,
        description: str,
    ) -> Document:
        document = await self.repository.create_document(
            document_id=document_id,
            owner_id=owner_id,
            name=name,
            description=description,
        )
        await self.repository.commit()
        return document

    async def get_owned(self, document_id: UUID, owner_id: UUID) -> Document | None:
        return await self.repository.get_document_by_id(document_id, owner_id)

    async def list_owned(self, owner_id: UUID) -> list[Document]:
        return await self.repository.get_all(owner_id)

    async def list_pages(
        self,
        *,
        document_id: UUID,
        owner_id: UUID,
        after_page_number: int | None,
        limit: int,
    ) -> tuple[list[Page], bool]:
        return await self.repository.get_pages(
            document_id=document_id,
            owner_id=owner_id,
            after_page_number=after_page_number,
            limit=limit,
        )

    async def create_pages(
        self,
        *,
        document_id: UUID,
        pages: list[dict[str, int | str]],
    ) -> None:
        await self.repository.create_pages(document_id=document_id, pages=pages)
        await self.repository.commit()

    async def get_owned_page(
        self,
        *,
        document_id: UUID,
        page_id: UUID,
        owner_id: UUID,
    ) -> Page | None:
        return await self.repository.get_page_by_id(
            document_id=document_id,
            page_id=page_id,
            owner_id=owner_id,
        )

    async def get_owned_page_by_id(
        self,
        *,
        page_id: UUID,
        owner_id: UUID,
    ) -> Page | None:
        return await self.repository.get_page_by_id(
            page_id=page_id,
            owner_id=owner_id,
        )

    async def search_in_document(
        self, document_id: UUID, owner_id: UUID, query: str
    ) -> list[Page]:
        if not query:
            return []

        results = await self.repository.search_in_document(
            document_id=document_id, owner_id=owner_id, query=query
        )
        return results

    async def list_all_pages(self, document_id: UUID, owner_id: UUID) -> list[Page]:
        return await self.repository.get_all_pages_by_document_id(document_id, owner_id)

    async def delete(self, document_id: UUID, owner_id: UUID) -> bool:
        document = await self.get_owned(document_id, owner_id)
        if document is None:
            return False
        await self.repository.delete(document)
        await self.repository.commit()
        return True

    async def delete_all_for_owner(self, owner_id: UUID) -> list[UUID]:
        stored = await self.repository.delete_all_for_owner(owner_id)
        await self.repository.commit()
        return stored
