import shutil
import zipfile
from pathlib import Path, PurePosixPath
from uuid import UUID, uuid4
from PIL import Image

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, Security, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, csrf_header
from app.api.schemas.documents import DocumentRead, DocumentUploadResponse, PageRead, PagePaginateRead, DocumentCreate
from app.core.db import get_db
from app.core.config import settings
from app.models.user import User
from app.repositories.documents import DocumentRepository

router = APIRouter(prefix="/documents", tags=["documents"])
STORAGE_ROOT = Path(settings.STORAGE_ROOT)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
MAX_PAGE_COUNT = 1000


def _mime_type_for_extension(extension: str) -> str:
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
    }[extension.lower()]

def _remove_upload_files(archive_path: Path, pages_dir: Path) -> None:
    archive_path.unlink(missing_ok=True)
    shutil.rmtree(pages_dir, ignore_errors=True)

def _remove_storage(document_id: UUID) -> None:
    root = STORAGE_ROOT.resolve()
    folder = (root / str(document_id)).resolve()
    if folder.parent != root:
        return
    shutil.rmtree(folder, ignore_errors=True)

def _safe_zip_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        raise HTTPException(status_code=400, detail="The ZIP contains an unsafe path")
    return path



@router.post(
    "/",
    response_model=DocumentUploadResponse,
    dependencies=[Security(csrf_header)],
    name="create_document",
    description="Create a new document. The document is created before its file is uploaded.",
    status_code=status.HTTP_201_CREATED
)
async def create_document(
    data: DocumentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:

    document_id = uuid4()
    document_dir = STORAGE_ROOT / str(document_id)
    document_dir.mkdir(parents=True, exist_ok=False)

    repository = DocumentRepository(session)
    document = await repository.create_document(
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
    status_code=status.HTTP_201_CREATED
)
async def upload_files_to_document(
    document_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")

    repository = DocumentRepository(session)
    document = await repository.get_document_by_id(document_id, current_user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    document_dir = STORAGE_ROOT / str(document_id)
    pages_dir = document_dir / "pages"
    archive_path = document_dir / "original.zip"
    document_dir.mkdir(parents=True, exist_ok=True)

    try:
        with archive_path.open("wb") as output:
            bytes_written = 0
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="ZIP file is too large")
                output.write(chunk)

        pages_dir.mkdir()
        with zipfile.ZipFile(archive_path) as archive:
            members = [member for member in archive.infolist() if not member.is_dir()]
            if len(members) > MAX_PAGE_COUNT:
                raise HTTPException(status_code=400, detail="Too many files in ZIP")

            image_members = []
            for member in members:
                safe_path = _safe_zip_path(member.filename)
                if safe_path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
                    raise HTTPException(status_code=400, detail="ZIP contains a non-image file")
                if member.file_size > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="An image is too large")
                image_members.append((member, safe_path))

            if not image_members:
                raise HTTPException(status_code=400, detail="ZIP does not contain images")

            pages = []
            for page_number, (member, safe_path) in enumerate(image_members, start=1):
                image_path = pages_dir / f"{page_number:04d}{safe_path.suffix.lower()}"
                with archive.open(member) as source, image_path.open("wb") as target:
                    shutil.copyfileobj(source, target)
                with Image.open(image_path) as image:
                    width, height = image.size
                pages.append(
                    {
                        "page_number": page_number,
                        "width": width,
                        "height": height,
                        "mime_type": _mime_type_for_extension(safe_path.suffix),
                        "image_path": image_path,
                    }
                )

        # The document is created before its file is uploaded. Persist only its pages here.
        await repository.create_pages(document_id=document_id, pages=pages)
        return DocumentUploadResponse(id=document.id)
    except HTTPException:
        await session.rollback()
        _remove_upload_files(archive_path, pages_dir)
        raise
    except (zipfile.BadZipFile, OSError):
        await session.rollback()
        _remove_upload_files(archive_path, pages_dir)
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception:
        await session.rollback()
        _remove_upload_files(archive_path, pages_dir)
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    repository = DocumentRepository(session)
    document = await repository.get_document_by_id(document_id, current_user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    await repository.delete(document)
    _remove_storage(document_id)

@router.get(
    "/me",
    response_model=list[DocumentRead],
    dependencies=[Security(csrf_header)],
    name="list_user_documents",
    description="List all documents owned by the current user.",
    status_code=status.HTTP_200_OK
)
async def list_user_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    return await repository.get_all(current_user.id)

@router.get(
    "/{document_id}/pages",
    response_model=list[PageRead],
    dependencies=[Security(csrf_header)],
    name="list_document_pages",
    description="List all pages of a document owned by the current user.",
    status_code=status.HTTP_200_OK
)
async def list_document_pages(
    request: Request,
    document_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    document = await repository.get_document_by_id(document_id, current_user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    pages = await repository.get_pages(
        parameters=PagePaginateRead(
            document_id=document_id,
            owner_id=current_user.id,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
    )
    return [
        PageRead(
            id=item.id,
            page_number=item.page_number,
            image_url=str(request.url_for("get_page", document_id=document_id, page_id=item.id)),
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
    status_code=status.HTTP_200_OK
)
async def get_document_page(
    document_id: UUID,
    page_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    page = await repository.get_page_by_id(
        page_id=page_id,
        document_id=document_id,
        owner_id=current_user.id,
    )
    if page is None or not Path(page.image_path).is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(page.image_path)

@router.get(
    "/{document_id}/download",
    dependencies=[Security(csrf_header)],
    name="download_document",
    description="Download the original ZIP file of a document owned by the current user.",
    status_code=status.HTTP_200_OK
)
async def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    document = await repository.get_document_by_id(document_id, current_user.id)
    archive_path = STORAGE_ROOT / str(document_id) / "original.zip"
    if document is None or not archive_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        archive_path,
        filename=f"{document.name}.zip",
        media_type="application/zip",
    )