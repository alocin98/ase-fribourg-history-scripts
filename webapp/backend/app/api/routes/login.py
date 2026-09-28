from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.user import Token, UserLogin
from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_access_token, verify_password
from app.repositories.user import UserRepository

router = APIRouter(prefix="/login", tags=["login"])


async def _authenticate(email: str, password: str, session: AsyncSession) -> Token:
    repository = UserRepository(session)
    user = await repository.get_by_email(email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    valid, updated_hash = verify_password(
        password,
        user.password_hash,
    )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if updated_hash is not None:
        user.password_hash = updated_hash
        await session.commit()

    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )

    return Token(access_token=access_token)


@router.post("", response_model=Token)
async def login(
    data: UserLogin,
    session: AsyncSession = Depends(get_db),
):
    return await _authenticate(data.email, data.password, session)


@router.post("/access-token", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: AsyncSession = Depends(get_db),
):
    """OAuth2 compatible login (form data), used by the Swagger UI. The username field is the email."""
    return await _authenticate(form_data.username, form_data.password, session)
