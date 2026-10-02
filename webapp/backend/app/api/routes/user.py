from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, csrf_header
from app.api.schemas.user import UserCreate, UserRead, UserUpdate
from app.core.db import get_db
from app.models.user import User
from app.repositories.user import UserRepository

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    response_model=UserRead,
    dependencies=[Security(csrf_header)],
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    data: UserCreate,
    session: AsyncSession = Depends(get_db),
):
    repository = UserRepository(session)

    if await repository.get_by_email(data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    try:
        return await repository.create(data)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )


@router.patch(
    "/me", 
    response_model=UserRead,
    dependencies=[Security(csrf_header)]
)
async def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = UserRepository(session)

    if data.email is not None:
        existing_user = await repository.get_by_email(data.email)

        if (
            existing_user is not None
            and existing_user.id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

    try:
        return await repository.update(current_user, data)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User update violates a database constraint",
        )

@router.get("/me", response_model=UserRead)
async def read_current_user(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = UserRepository(session)
    user = await repository.get_by_id(current_user.id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found",
        )

    return user