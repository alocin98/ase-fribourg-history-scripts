from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.database.session import get_db
from app.models.sessions import AuthSession
from app.models.user import User
from app.repositories.sessions import SessionRepository


async def get_current_session(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AuthSession:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise credentials_exception

    auth_session = await SessionRepository(session).get_valid_by_token(token)
    if auth_session is None:
        raise credentials_exception
    return auth_session


async def get_current_session_and_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> tuple[AuthSession, User]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise credentials_exception

    session_and_user = await SessionRepository(session).get_valid_session_and_user(
        token
    )
    if session_and_user is None:
        raise credentials_exception
    return session_and_user


async def get_current_user(
    auth_session_and_user: Annotated[
        tuple[AuthSession, User], Depends(get_current_session_and_user)
    ],
) -> User:
    _, user = auth_session_and_user
    return user
