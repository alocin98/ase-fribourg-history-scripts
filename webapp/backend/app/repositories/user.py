from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, *, email: str, name: str, password: str) -> User:
        user = User(
            email=email,
            name=name,
            password_hash=get_password_hash(password),
        )

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def update(
        self,
        user: User,
        *,
        email: str | None = None,
        name: str | None = None,
        password: str | None = None,
    ) -> User:
        if email is not None:
            user.email = email
        if name is not None:
            user.name = name
        if password is not None:
            user.password_hash = get_password_hash(password)

        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def delete(self, user: User) -> None:
        await self.session.delete(user)
        await self.session.commit()
