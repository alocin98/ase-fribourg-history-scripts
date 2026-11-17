import tempfile
import zipfile
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Security,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.csrf import csrf_header
from app.api.dependencies.services import (
    DocumentServiceDep,
    TranscriptionServiceDep,
)
from app.api.dependencies.zip_files import extract_and_upload_pages
from app.api.schemas.documents import (
    DocumentCreate,
    DocumentRead,
    DocumentUploadResponse,
    PageRead,
)
from app.api.schemas.transcriptions import PageTranscriptionRead
from app.infrastructure.database.session import get_db
from app.infrastructure.storage.s3 import (
    delete_prefix,
    download_file,
)
from app.models.user import User

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/",
    response_model=DocumentUploadResponse,
    dependencies=[Security(csrf_header)],
    name="create_document",
    description="Create a new document. The document is created before its file is uploaded.",
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    data: DocumentCreate,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
) -> DocumentUploadResponse:

    document_id = uuid4()
    document = await service.create(
        document_id=document_id,
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
    )

    return DocumentUploadResponse(id=document.id)


@router.post(
    "/{document_id}",
    response_model=DocumentUploadResponse,
    dependencies=[Security(csrf_header)],
    name="upload_files_to_document",
    description="Upload a ZIP file containing images to an existing document.",
    status_code=status.HTTP_201_CREATED,
)
async def upload_files_to_document(
    document_id: UUID,
    service: DocumentServiceDep,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    document = await service.get_owned(document_id, current_user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        pages = await extract_and_upload_pages(file, document_id)
        await service.create_pages(document_id=document_id, pages=pages)
        return DocumentUploadResponse(id=document.id)
    except HTTPException:
        await session.rollback()
        await delete_prefix(f"{document_id}/")
        raise
    except (zipfile.BadZipFile, OSError) as e:
        await session.rollback()
        await delete_prefix(f"{document_id}/")
        raise HTTPException(status_code=400, detail="Invalid ZIP file") from e
    except Exception:
        await session.rollback()
        await delete_prefix(f"{document_id}/")
        raise
    finally:
        await file.close()


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Security(csrf_header)],
)
async def delete_document(
    document_id: UUID,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
) -> None:
    if not await service.delete(document_id, current_user.id):
        raise HTTPException(status_code=404, detail="Document not found")
    await delete_prefix(f"{document_id}/")


@router.get(
    "/me",
    response_model=list[DocumentRead],
    dependencies=[Security(csrf_header)],
    name="list_user_documents",
    description="List all documents owned by the current user.",
    status_code=status.HTTP_200_OK,
)
async def list_user_documents(
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    return await service.list_owned(current_user.id)


@router.get(
    "/{document_id}/pages",
    response_model=list[PageRead],
    dependencies=[Security(csrf_header)],
    name="list_document_pages",
    description="List all pages of a document owned by the current user.",
    status_code=status.HTTP_200_OK,
)
async def list_document_pages(
    request: Request,
    document_id: UUID,
    service: DocumentServiceDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    after_page_number: int | None = (page - 1) * page_size if page > 1 else None
    pages, document_exists = await service.list_pages(
        document_id=document_id,
        owner_id=current_user.id,
        after_page_number=after_page_number,
        limit=page_size,
    )
    if not document_exists:
        raise HTTPException(status_code=404, detail="Document not found")

    return [
        PageRead(
            id=item.id,
            page_number=item.page_number,
            image_url=str(
                request.url_for("get_page", document_id=document_id, page_id=item.id)
            ),
            height=item.height,
            width=item.width,
            mime_type=item.mime_type,
        )
        for item in pages
    ]


@router.get(
    "/{document_id}/pages/{page_id}",
    name="get_page",
    description="Get a specific page of a document owned by the current user.",
    status_code=status.HTTP_200_OK,
)
async def get_document_page(
    document_id: UUID,
    page_id: UUID,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    page = await service.get_owned_page(
        document_id=document_id,
        page_id=page_id,
        owner_id=current_user.id,
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    try:
        image = await download_file(page.image_key)
    except Exception as error:
        raise HTTPException(status_code=404, detail="Page not found") from error
    if not image:
        raise HTTPException(status_code=404, detail="Page not found")
    return Response(content=image, media_type=page.mime_type)


@router.get(
    "/{document_id}/pages/{page_id}/transcription",
    name="get_page_transcription",
    description="Get the transcription of a specific page of a document owned by the current user.",
    status_code=status.HTTP_200_OK,
    response_model=PageTranscriptionRead,
)
async def get_page_transcription(
    document_id: UUID,
    page_id: UUID,
    service: DocumentServiceDep,
    transcription_service: TranscriptionServiceDep,
    current_user: User = Depends(get_current_user),
):
    page = await service.get_owned_page(
        document_id=document_id, page_id=page_id, owner_id=current_user.id
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")

    transcription = await transcription_service.get_page_transcription(page_id)
    if transcription is None:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return transcription


@router.get(
    "/{document_id}/download",
    dependencies=[Security(csrf_header)],
    name="download_document",
    description="Download the original ZIP file of a document owned by the current user.",
    status_code=status.HTTP_200_OK,
)
async def download_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    document = await service.get_owned(document_id, current_user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    pages = await service.list_all_pages(
        document_id=document_id,
        owner_id=current_user.id,
    )
    temporary_zip = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    temporary_zip_path = Path(temporary_zip.name)
    try:
        with zipfile.ZipFile(temporary_zip, "w", zipfile.ZIP_DEFLATED) as archive:
            for page in pages:
                image = await download_file(page.image_key)
                archive.writestr(f"pages/{Path(page.image_key).name}", image)
    except Exception as error:
        temporary_zip.close()
        temporary_zip_path.unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail="Document not found") from error

    temporary_zip.close()
    background_tasks.add_task(temporary_zip_path.unlink, missing_ok=True)
    return FileResponse(
        temporary_zip_path,
        headers={
            "Content-Disposition": f'attachment; filename="{document.name}.zip"',
        },
        media_type="application/zip",
    )
