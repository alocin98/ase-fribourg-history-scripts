from fastapi import APIRouter, Depends, HTTPException, Response, Security, status
from sqlalchemy.exc import IntegrityError

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.csrf import csrf_header
from app.api.dependencies.injection import DocumentServiceDep, UserServiceDep
from app.api.schemas.user import UserCreate, UserRead, UserUpdate
from app.core.config import settings
from app.infrastructure.storage.s3 import delete_prefix
from app.models.user import User
from app.services.users import UserAlreadyExistsError

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    response_model=UserRead,
    dependencies=[Security(csrf_header)],
    name="Create User",
    description="Create a new user in the system (E.g. signup). This endpoint is typically used for user registration.",
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    data: UserCreate,
    user_service: UserServiceDep,
):
    try:
        return await user_service.create(
            email=data.email,
            name=data.name,
            password=data.password,
        )
    except (IntegrityError, UserAlreadyExistsError) as e:
        await user_service.session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from e


@router.patch(
    "/me",
    response_model=UserRead,
    dependencies=[Security(csrf_header)],
    name="Update Current User",
    description="Update the current user's information. This endpoint allows users to update their own profile information",
    status_code=status.HTTP_200_OK,
)
async def update_current_user(
    data: UserUpdate,
    user_service: UserServiceDep,
    current_user: User = Depends(get_current_user),
):
    try:
        return await user_service.update(
            current_user,
            email=data.email,
            name=data.name,
            password=data.password,
        )
    except (IntegrityError, UserAlreadyExistsError) as e:
        await user_service.session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User update violates a database constraint",
        ) from e


@router.get(
    "/me",
    response_model=UserRead,
    name="Read Current User",
    description="Read the current user's information.",
    status_code=status.HTTP_200_OK,
)
async def read_current_user(
    user_service: UserServiceDep,
    current_user: User = Depends(get_current_user),
):
    user = await user_service.get(current_user.id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.delete(
    "/me",
    dependencies=[Security(csrf_header)],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_current_user(
    response: Response,
    document_service: DocumentServiceDep,
    user_service: UserServiceDep,
    current_user: User = Depends(get_current_user),
) -> None:
    stored = await document_service.delete_all_for_owner(current_user.id)
    for document_id in stored:
        await delete_prefix(f"{document_id}/")
    await user_service.delete(current_user)
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)
