from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.iiif import transform_image
from app.api.schemas.iiif import InfoResponse
from app.infrastructure.database.session import get_db
from app.infrastructure.storage.s3 import download_file
from app.models.user import User
from app.repositories.documents import DocumentRepository

router = APIRouter(prefix="/iiif/3", tags=["iiif"])


async def get_owned_page(
    page_id: UUID,
    current_user: User,
    session: AsyncSession,
):
    page = await DocumentRepository(session).get_page_by_id(
        page_id=page_id,
        owner_id=current_user.id,
    )

    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")

    return page


@router.get(
    "/{page_id}/info.json",
    response_model=InfoResponse,
    name="iiif_info",
    description="Get IIIF Image API information for a specific page. This endpoint provides metadata about the image, including its dimensions and available formats.",
    status_code=status.HTTP_200_OK,
)
async def iiif_info(
    page_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    page = await get_owned_page(page_id, current_user, session)

    image_url = request.url_for(
        "iiif_image",
        page_id=str(page_id),
        region="full",
        size="full",
        rotation="0",
        quality="default",
        image_format="jpg",
    )

    return InfoResponse(
        context="http://iiif.io/api/image/3/context.json",
        id=str(image_url).removesuffix("/full/full/0/default.jpg"),
        type="ImageService3",
        profile=["level2"],
        width=page.width,
        height=page.height,
        format="jpg",
        maxWidth=page.width,
        maxHeight=page.height,
        extraFormats=["png", "webp"],
    )


@router.get(
    "/{page_id}/{region}/{size}/{rotation}/{quality}.{image_format}",
    name="iiif_image",
    description="Get a transformed IIIF image for a specific page. This endpoint allows users to request a specific region, size, rotation, quality, and format of the image. Example: /iiif/3/{page_id}/full/full/0/default.jpg",
    status_code=status.HTTP_200_OK,
)
async def iiif_image(
    page_id: UUID,
    region: str,
    size: str,
    rotation: str,
    quality: str,
    image_format: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    page = await get_owned_page(page_id, current_user, session)

    try:
        content = await download_file(page.image_key)
    except Exception as error:
        raise HTTPException(
            status_code=404,
            detail="Image not found",
        ) from error

    transformed = transform_image(
        content,
        region=region,
        size=size,
        rotation=rotation,
        quality=quality,
        image_format=image_format,
    )

    return Response(
        content=transformed.content,
        media_type=transformed.media_type,
        headers={
            "X-IIIF-Width": str(transformed.width),
            "X-IIIF-Height": str(transformed.height),
        },
    )