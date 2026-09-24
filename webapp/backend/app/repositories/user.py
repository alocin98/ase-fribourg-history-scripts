from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate) -> User:
        user = User(
            email=data.email,
            name=data.name,
            password_hash=get_password_hash(data.password),
        )

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def update(self, user: User, data: UserUpdate) -> User:
        values = data.model_dump(exclude_unset=True)

        if "password" in values:
            user.password_hash = get_password_hash(values.pop("password"))

        for field, value in values.items():
            setattr(user, field, value)

        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def delete(self, user: User) -> None:
        await self.session.delete(user)
        await self.session.commit()