from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.security import ALGORITHM
from app.models.user import User
from app.repositories.user import UserRepository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_STR}/login/access-token"
)

async def get_current_user(
    token: Annotated[str, Depends(reusable_oauth2)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        ) 

        subject = payload.get("sub")
        
        if subject is None:
            raise credentials_exception

        user_id = int(subject)

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_exception

    repository = UserRepository(session)
    user = await repository.get_by_id(user_id)

    if user is None:
        raise credentials_exception

    return user