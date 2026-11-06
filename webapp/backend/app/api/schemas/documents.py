from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str


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
