import tempfile
from pathlib import Path
from uuid import UUID

import fitz
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.infrastructure.storage.s3 import delete_file, ensure_bucket, upload_file

MAX_PAGE_COUNT = 1000


async def extract_and_upload_pdf_pages(
    file: UploadFile,
    document_id: UUID,
    first_page_number: int = 1,
) -> list[dict[str, int | str]]:
    content = await file.read(settings.MAX_UPLOAD_SIZE + 1)
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="PDF file is too large")

    try:
        pdf = fitz.open(stream=content, filetype="pdf")
    except (fitz.FileDataError, RuntimeError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Invalid PDF file") from error

    with pdf:
        if pdf.needs_pass:
            raise HTTPException(
                status_code=400, detail="Password-protected PDFs are not supported"
            )
        if not pdf.page_count:
            raise HTTPException(status_code=400, detail="PDF does not contain pages")
        if pdf.page_count > MAX_PAGE_COUNT:
            raise HTTPException(status_code=400, detail="Too many pages in PDF")

        await ensure_bucket()
        uploaded_keys: list[str] = []
        pages = []
        try:
            with tempfile.TemporaryDirectory() as temporary_directory:
                for index, pdf_page in enumerate(pdf, start=first_page_number):
                    page_path = Path(temporary_directory) / f"{index:04d}.png"
                    page_size = max(pdf_page.rect.width, pdf_page.rect.height)
                    if page_size <= 0:
                        raise HTTPException(
                            status_code=400, detail="PDF contains an empty page"
                        )
                    scale = min(
                        2,
                        settings.MAX_WIDTH / page_size,
                    )
                    image = pdf_page.get_pixmap(
                        matrix=fitz.Matrix(scale, scale),
                        alpha=False,
                    )
                    image.save(page_path)

                    image_key = f"{document_id}/pages/{page_path.name}"
                    uploaded_keys.append(image_key)
                    await upload_file(str(page_path), image_key)
                    pages.append(
                        {
                            "page_number": index,
                            "width": image.width,
                            "height": image.height,
                            "mime_type": "image/png",
                            "image_key": image_key,
                        }
                    )
        except Exception:
            for image_key in uploaded_keys:
                await delete_file(image_key)
            raise

    return pages
