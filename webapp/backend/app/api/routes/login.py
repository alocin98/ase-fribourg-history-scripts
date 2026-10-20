from fastapi import APIRouter, Depends, HTTPException, Response, Security, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user, get_current_session
from app.api.dependencies.csrf import csrf_header
from app.api.schemas.user import CSRFTokenResponse, UserLogin, UserRead
from app.core.config import settings
from app.infrastructure.database.session import get_db
from app.core.security import create_csrf_token, verify_password
from app.models.sessions import AuthSession
from app.repositories.sessions import SessionRepository
from app.repositories.user import UserRepository

router = APIRouter(tags=["auth"])


async def _authenticate(email: str, password: str, session: AsyncSession):
    repository = UserRepository(session)
    user = await repository.get_by_email(email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    valid, updated_hash = verify_password(
        password,
        user.password_hash,
    )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if updated_hash is not None:
        user.password_hash = updated_hash
        await session.commit()

    return user


@router.post(
    "/login",
    response_model=UserRead,
    dependencies=[Security(csrf_header)],
    name="login",
    description="Authenticate a user and create a new session.",
    status_code=status.HTTP_200_OK,
)
async def login(
    data: UserLogin,
    response: Response,
    session: AsyncSession = Depends(get_db),
):
    user = await _authenticate(data.email, data.password, session)

    session_repository = SessionRepository(session)
    # Revoke expired sessions for the user before creating a new one to avoid having an infinite number of sessions for a user in the database.
    await session_repository.revoke_expired()
    _, token = await session_repository.create(user.id)

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
    )
    return user


@router.post(
    "/logout",
    dependencies=[Security(csrf_header)],
    name="logout",
    description="Revoke the current session and log out the user.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    response: Response,
    auth_session: AuthSession = Depends(get_current_session),
    session: AsyncSession = Depends(get_db),
):
    await SessionRepository(session).revoke(auth_session)
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)


@router.get(
    "/csrf-token",
    response_model=CSRFTokenResponse,
    name="csrf_token",
    description="Generate a new CSRF token. This token should be included in the headers of subsequent requests to protect against CSRF attacks. (The token is also set as a cookie.)",
    status_code=status.HTTP_200_OK,
)
async def csrf_token(response: Response):
    token = create_csrf_token()
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        httponly=False,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
    )
    return {"csrf_token": token}
