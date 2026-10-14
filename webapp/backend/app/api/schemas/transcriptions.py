from uuid import UUID

from pydantic import BaseModel


class TranscriptionResponse(BaseModel):
    job_id: UUID
    status: str
