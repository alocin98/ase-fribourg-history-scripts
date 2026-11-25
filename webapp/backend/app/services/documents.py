from datetime import datetime
from typing import TypedDict
from uuid import UUID

from app.models.documents import (
    Document,
    DocumentAccessRole,
    DocumentShare,
    DocumentShareRole,
    Page,
)
from app.repositories.documents import DocumentRepository


class DocumentShareData(TypedDict):
    document_id: UUID
    user_id: UUID
    name: str
    role: str
    created_at: datetime


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

    async def get_access_role(
        self,
        document_id: UUID,
        user_id: UUID,
    ) -> DocumentAccessRole | None:
        return await self.repository.get_access_role(document_id, user_id)

    async def document_exists(self, document_id: UUID) -> bool:
        return await self.repository.document_exists(document_id)

    async def get_page_by_id_unrestricted(self, page_id: UUID) -> Page | None:
        return await self.repository.get_page(page_id)

    async def require_access(
        self,
        document_id: UUID,
        user_id: UUID,
        minimum_role: DocumentAccessRole,
    ) -> Document | None:
        role = await self.repository.get_access_role(document_id, user_id)
        if role is None:
            return None
        rank = {
            DocumentAccessRole.VIEWER: 1,
            DocumentAccessRole.EDITOR: 2,
            DocumentAccessRole.OWNER: 3,
        }
        if rank[role] < rank[minimum_role]:
            return None
        return await self.repository.get_document_by_id(document_id, user_id)

    async def list_for_user(
        self,
        user_id: UUID,
    ) -> dict[str, list[Document] | list[dict[str, UUID | str]]]:
        documents = await self.repository.get_for_user(user_id)
        user_documents: list[Document] = []
        shared_document: list[dict[str, UUID | str]] = []

        for document, owner_name, share_role in documents:
            if document.owner_id == user_id:
                user_documents.append(document)
            else:
                if share_role is None:
                    raise RuntimeError("Shared document is missing its access role")
                shared_document.append(
                    {
                        "id": document.id,
                        "name": document.name,
                        "description": document.description,
                        "owner_name": owner_name,
                        "access": share_role.value,
                    }
                )

        return {
            "user_documents": user_documents,
            "shared_document": shared_document,
        }

    async def list_pages(
        self,
        *,
        document_id: UUID,
        user_id: UUID,
        after_page_number: int | None,
        limit: int,
    ) -> tuple[list[Page], bool]:
        return await self.repository.get_pages(
            document_id=document_id,
            user_id=user_id,
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
        user_id: UUID,
    ) -> Page | None:
        return await self.repository.get_page_by_id(
            document_id=document_id,
            page_id=page_id,
            user_id=user_id,
        )

    async def get_owned_page_by_id(
        self,
        *,
        page_id: UUID,
        user_id: UUID,
    ) -> Page | None:
        return await self.repository.get_page_by_id(
            page_id=page_id,
            user_id=user_id,
        )

    async def search_in_document(
        self, document_id: UUID, user_id: UUID, query: str
    ) -> list[dict]:
        results = await self.repository.search_in_document(
            document_id=document_id,
            user_id=user_id,
            query=query,
        )

        search_query = query.casefold()
        response = []

        for page, transcription in results:
            text = transcription.text or ""
            match_index = text.casefold().find(search_query)

            start = max(0, match_index - 80)
            end = min(len(text), match_index + len(query) + 80)
            excerpt = text[start:end].strip()

            if start > 0:
                excerpt = "... " + excerpt
            if end < len(text):
                excerpt += " ..."

            response.append(
                {
                    "page_id": page.id,
                    "page_number": page.page_number,
                    "text_excerpt": excerpt,
                }
            )

        return response

    async def list_all_pages(self, document_id: UUID, user_id: UUID) -> list[Page]:
        return await self.repository.get_all_pages_by_document_id(document_id, user_id)

    async def delete(self, document_id: UUID, owner_id: UUID) -> bool:
        role = await self.repository.get_access_role(document_id, owner_id)
        if role != DocumentAccessRole.OWNER:
            return False
        document = await self.repository.get_document_by_id(document_id, owner_id)
        if document is None:
            return False
        await self.repository.delete(document)
        await self.repository.commit()
        return True

    async def delete_all_for_owner(self, owner_id: UUID) -> list[UUID]:
        stored = await self.repository.delete_all_for_owner(owner_id)
        await self.repository.commit()
        return stored

    @staticmethod
    def _share_data(share: DocumentShare, name: str) -> DocumentShareData:
        return {
            "document_id": share.document_id,
            "user_id": share.user_id,
            "name": name,
            "role": share.role.value,
            "created_at": share.created_at,
        }

    async def list_shares(self, document_id: UUID) -> list[DocumentShareData]:
        shares = await self.repository.list_shares(document_id)
        return [self._share_data(share, name) for share, name in shares]

    async def set_share(
        self,
        document_id: UUID,
        user_id: UUID,
        role: DocumentShareRole,
    ) -> DocumentShareData:
        share, name = await self.repository.set_share(document_id, user_id, role)
        await self.repository.commit()
        return self._share_data(share, name)

    async def delete_share(self, document_id: UUID, user_id: UUID) -> bool:
        deleted = await self.repository.delete_share(document_id, user_id)
        await self.repository.commit()
        return deleted
