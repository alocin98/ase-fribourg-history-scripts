from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    uploaded_at: datetime

class DocumentCreate(BaseModel):
    id: UUID
    owner_id: UUID
    original_filename: str
    storage_path: str
    image_paths: list[str]

class PageRead(BaseModel):
    id: UUID
    page_number: int
    image_url: str

class PagePaginateRead(BaseModel):
    document_id: UUID
    owner_id: UUID
    offset: int
    limit: int

class DocumentUploadResponse(BaseModel):
    id: UUID