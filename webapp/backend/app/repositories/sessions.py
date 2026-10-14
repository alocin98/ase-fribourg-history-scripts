from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_session_token, hash_session_token
from app.models.sessions import AuthSession


class SessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: UUID) -> tuple[AuthSession, str]:
        token = create_session_token()
        auth_session = AuthSession(
            token_hash=hash_session_token(token),
            user_id=user_id,
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.SESSION_EXPIRE_MINUTES),
        )
        self.session.add(auth_session)
        await self.session.commit()
        await self.session.refresh(auth_session)
        return auth_session, token

    async def get_valid_by_token(self, token: str) -> AuthSession | None:
        auth_session = await self.session.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == hash_session_token(token),
                AuthSession.expires_at > datetime.now(UTC),
            )
        )
        return auth_session

    async def revoke(self, auth_session: AuthSession) -> None:
        await self.session.delete(auth_session)
        await self.session.commit()

    async def revoke_expired(self) -> None:
        await self.session.execute(
            delete(AuthSession).where(AuthSession.expires_at <= datetime.now(UTC))
        )
        await self.session.commit()
