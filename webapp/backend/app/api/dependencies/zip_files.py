import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from uuid import UUID

from fastapi import HTTPException, UploadFile
from PIL import Image

from app.core.config import settings
from app.infrastructure.storage.s3 import delete_file, ensure_bucket, upload_file

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


def _safe_zip_path(name: str) -> PurePosixPath:
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        raise HTTPException(status_code=400, detail="The ZIP contains an unsafe path")
    return path


async def extract_and_upload_pages(
    file: UploadFile,
    document_id: UUID,
    first_page_number: int = 1,
) -> list[dict[str, int | str]]:
    await ensure_bucket()
    with tempfile.TemporaryDirectory() as temporary_directory:
        temporary_root = Path(temporary_directory)
        archive_path = temporary_root / "original.zip"
        pages_dir = temporary_root / "pages"
        pages_dir.mkdir()

        with archive_path.open("wb") as output:
            bytes_written = 0
            while chunk := await file.read(1024 * 1024):
                bytes_written += len(chunk)
                if bytes_written > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="ZIP file is too large")
                output.write(chunk)

        with zipfile.ZipFile(archive_path) as archive:
            members = [member for member in archive.infolist() if not member.is_dir()]
            if len(members) > MAX_PAGE_COUNT:
                raise HTTPException(status_code=400, detail="Too many files in ZIP")

            image_members = []
            for member in members:
                safe_path = _safe_zip_path(member.filename)
                if safe_path.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
                    raise HTTPException(
                        status_code=400, detail="ZIP contains a non-image file"
                    )
                if member.file_size > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="An image is too large")
                image_members.append((member, safe_path))

            if not image_members:
                raise HTTPException(
                    status_code=400, detail="ZIP does not contain images"
                )

            pages = []
            uploaded_keys = []
            try:
                for page_number, (member, safe_path) in enumerate(
                    image_members, start=first_page_number
                ):
                    image_path = (
                        pages_dir / f"{page_number:04d}{safe_path.suffix.lower()}"
                    )
                    with archive.open(member) as source, image_path.open("wb") as target:
                        while chunk := source.read(1024 * 1024):
                            target.write(chunk)
                    with Image.open(image_path) as image:
                        width, height = image.size
                    image_key = f"{document_id}/pages/{image_path.name}"
                    uploaded_keys.append(image_key)
                    await upload_file(str(image_path), image_key)
                    pages.append(
                        {
                            "page_number": page_number,
                            "width": width,
                            "height": height,
                            "mime_type": _mime_type_for_extension(safe_path.suffix),
                            "image_key": image_key,
                        }
                    )
            except Exception:
                for image_key in uploaded_keys:
                    await delete_file(image_key)
                raise

    return pages
