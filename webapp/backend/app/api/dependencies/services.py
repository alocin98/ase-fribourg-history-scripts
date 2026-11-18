from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db
from app.services.documents import DocumentService
from app.services.transcriptions import TranscriptionService
from app.services.users import UserService


async def get_document_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentService:
    return DocumentService(session)


async def get_transcription_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TranscriptionService:
    return TranscriptionService(session)


async def get_user_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UserService:
    return UserService(session)


TranscriptionServiceDep = Annotated[
    TranscriptionService, Depends(get_transcription_service)
]

UserServiceDep = Annotated[UserService, Depends(get_user_service)]

DocumentServiceDep = Annotated[DocumentService, Depends(get_document_service)]
