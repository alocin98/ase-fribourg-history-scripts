import shutil
import zipfile
from pathlib import Path, PurePosixPath
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas.documents import DocumentRead, DocumentUploadResponse, PageRead, PagePaginateRead, DocumentCreate
from app.core.db import get_db
from app.core.config import settings
from app.models.user import User
from app.repositories.documents import DocumentRepository

router = APIRouter(prefix="/documents", tags=["documents"])
STORAGE_ROOT = Path(settings.STORAGE_ROOT)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
MAX_PAGE_COUNT = 1000


def _safe_zip_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        raise HTTPException(status_code=400, detail="The ZIP contains an unsafe path")
    return path


@router.post("/", status_code=201, response_model=DocumentUploadResponse)
async def create_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")

    document_dir = STORAGE_ROOT / uuid4().hex
    pages_dir = document_dir / "pages"
    archive_path = document_dir / "original.zip"
    document_dir.mkdir(parents=True, exist_ok=False)

    try:
        # Save the uploaded ZIP file to disk and check its size while writing
        with archive_path.open("wb") as output:
            bytes_written = 0
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="ZIP file is too large")
                output.write(chunk)

        # Extract the ZIP file and validate its contents
        pages_dir.mkdir()
        with zipfile.ZipFile(archive_path) as archive:
            # Validate the ZIP file contents
            members = [member for member in archive.infolist() if not member.is_dir()]
            if len(members) > MAX_PAGE_COUNT:
                raise HTTPException(status_code=400, detail="Too many files in ZIP")

            # Validate that all files are images and within the size limit
            image_members = []
            for member in members:
                safe_path = _safe_zip_path(member.filename)
                if safe_path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
                    raise HTTPException(status_code=400, detail="ZIP contains a non-image file")
                if member.file_size > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="An image is too large")
                image_members.append((member, safe_path))

            # Validate that there is at least one image in the ZIP
            if not image_members:
                raise HTTPException(status_code=400, detail="ZIP does not contain images")

            # Extract the images to the pages directory and create a list of their paths
            image_paths = []
            for page_number, (member, safe_path) in enumerate(image_members, start=1):
                image_path = pages_dir / f"{page_number:04d}{safe_path.suffix.lower()}"
                with archive.open(member) as source, image_path.open("wb") as target:
                    shutil.copyfileobj(source, target)
                image_paths.append(image_path)

        # Create the document and its pages in the database
        repository = DocumentRepository(session)
        document = await repository.create(
            data=DocumentCreate(
                owner_id=current_user.id,
                original_filename=Path(file.filename).name,
                storage_path=str(archive_path),
                image_paths=image_paths,
            )
        )
        return DocumentUploadResponse(id=document.id)
    except HTTPException:
        await session.rollback()
        shutil.rmtree(document_dir, ignore_errors=True)
        raise
    except (zipfile.BadZipFile, OSError):
        await session.rollback()
        shutil.rmtree(document_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Invalid ZIP file")
    except Exception:
        await session.rollback()
        shutil.rmtree(document_dir, ignore_errors=True)
        raise
    finally:
        await file.close()


@router.get("/me", response_model=list[DocumentRead])
async def list_user_documents(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    return await repository.get_all(current_user.id)


@router.get("/{document_id}/pages", response_model=list[PageRead])
async def list_document_pages(
    request: Request,
    document_id: int,
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
        )
        for item in pages
    ]


@router.get("/{document_id}/pages/{page_id}", name="get_page")
async def get_document_page(
    document_id: int,
    page_id: int,
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    page = await repository.get_page_by_id(
        page_id=page_id,
        document_id=document_id
    )
    if page is None or not Path(page.image_path).is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(page.image_path)


@router.get("/{document_id}/download", name="download_document")
async def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    repository = DocumentRepository(session)
    document = await repository.get_document_by_id(document_id, current_user.id)
    if document is None or not Path(document.storage_path).is_file():
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        document.storage_path,
        filename=document.original_filename,
        media_type="application/zip",
    )