from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str


class SharedDocumentRead(DocumentRead):
    owner_name: str
    access: Literal["viewer", "editor"]


class UserDocumentsRead(BaseModel):
    user_documents: list[DocumentRead]
    shared_document: list[SharedDocumentRead]


class DocumentCreate(BaseModel):
    name: str
    description: str


class PageRead(BaseModel):
    id: UUID
    page_number: int
    image_url: str
    height: int | None = None
    width: int | None = None
    mime_type: str | None = None


class DocumentUploadResponse(BaseModel):
    id: UUID


class DocumentSearchResult(BaseModel):
    page_id: UUID
    page_number: int
    text_excerpt: str


class DocumentShareCreate(BaseModel):
    email: str
    role: Literal["viewer", "editor"]


class DocumentShareUpdate(BaseModel):
    role: Literal["viewer", "editor"]


class DocumentShareRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: UUID
    user_id: UUID
    role: str
    created_at: datetime
