from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.user import UserRepository


class UserAlreadyExistsError(Exception):
    pass


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = UserRepository(session)

    async def create(self, *, email: str, name: str, password: str) -> User:
        if await self.repository.get_by_email(email) is not None:
            raise UserAlreadyExistsError

        user = await self.repository.create(
            email=email,
            name=name,
            password=get_password_hash(password),
        )
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get(self, user_id: UUID) -> User | None:
        return await self.repository.get_by_id(user_id)

    async def update(
        self,
        user: User,
        *,
        email: str | None = None,
        name: str | None = None,
        password: str | None = None,
    ) -> User:
        if email is not None:
            existing_user = await self.repository.get_by_email(email)
            if existing_user is not None and existing_user.id != user.id:
                raise UserAlreadyExistsError

        await self.repository.update(
            user,
            email=email,
            name=name,
            password_hash=(
                get_password_hash(password) if password is not None else None
            ),
        )

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        await self.repository.delete(user)
        await self.session.commit()
