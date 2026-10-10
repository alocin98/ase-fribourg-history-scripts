from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TranscriptionResponse(BaseModel):
    job_id: UUID
    status: str