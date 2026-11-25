from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db
from app.repositories.documents import DocumentRepository
from app.repositories.transcriptions import TranscriptionRepository
from app.repositories.user import UserRepository
from app.services.documents import DocumentService
from app.services.transcriptions import TranscriptionService
from app.services.users import UserService


async def get_document_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentService:
    document_repository = DocumentRepository(session)
    return DocumentService(document_repository)


async def get_transcription_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TranscriptionService:
    document_repository = DocumentRepository(session)
    transcription_repository = TranscriptionRepository(session)
    return TranscriptionService(document_repository, transcription_repository)


async def get_user_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UserService:
    user_repository = UserRepository(session)
    return UserService(user_repository)


TranscriptionServiceDep = Annotated[
    TranscriptionService, Depends(get_transcription_service)
]

UserServiceDep = Annotated[UserService, Depends(get_user_service)]

DocumentServiceDep = Annotated[DocumentService, Depends(get_document_service)]
