from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    uploaded_at: datetime

class DocumentCreate(BaseModel):
    owner_id: int
    original_filename: str
    storage_path: str
    image_paths: list[str]

class PageRead(BaseModel):
    id: int
    page_number: int
    image_url: str

class PagePaginateRead(BaseModel):
    document_id: int
    owner_id: int
    offset: int
    limit: int

class DocumentUploadResponse(BaseModel):
    id: int