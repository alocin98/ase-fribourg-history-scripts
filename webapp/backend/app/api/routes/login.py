from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.user import Token, UserLogin
from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_access_token, verify_password
from app.repositories.user import UserRepository

router = APIRouter(prefix="/login", tags=["login"])


@router.post("", response_model=Token)
async def login(
    data: UserLogin,
    session: AsyncSession = Depends(get_db),
):
    repository = UserRepository(session)
    user = await repository.get_by_email(data.email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    valid, updated_hash = verify_password(
        data.password,
        user.password_hash,
    )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Allows pwdlib to transparently upgrade old password hashes.
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