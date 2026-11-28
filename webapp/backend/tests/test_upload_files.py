from io import BytesIO
from uuid import uuid4

import fitz
import pytest
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError

from app.api.dependencies import pdf_files
from app.api.schemas.user import UserCreate, UserUpdate


def make_pdf(page_count: int = 1) -> bytes:
    pdf = fitz.open()
    for _ in range(page_count):
        pdf.new_page(width=200, height=300)
    content = pdf.tobytes()
    pdf.close()
    return content


def test_password_requires_eight_characters():
    with pytest.raises(ValidationError):
        UserCreate(email="person@example.com", name="Person", password="short")

    user = UserCreate(email="person@example.com", name="Person", password="long-enough")
    assert user.password == "long-enough"

    with pytest.raises(ValidationError):
        UserUpdate(password="short")
    assert UserUpdate(password=None).password is None


@pytest.mark.asyncio
async def test_pdf_pages_render_and_continue_page_numbering(monkeypatch):
    async def no_op():
        return None

    uploaded = []

    async def save_file(path, key):
        uploaded.append((key, path))

    monkeypatch.setattr(pdf_files, "ensure_bucket", no_op)
    monkeypatch.setattr(pdf_files, "upload_file", save_file)

    pages = await pdf_files.extract_and_upload_pdf_pages(
        UploadFile(filename="source.pdf", file=BytesIO(make_pdf(page_count=2))),
        uuid4(),
        first_page_number=4,
    )

    assert [page["page_number"] for page in pages] == [4, 5]
    assert all(page["mime_type"] == "image/png" for page in pages)
    assert all(page["width"] > 0 and page["height"] > 0 for page in pages)
    assert len(uploaded) == 2


@pytest.mark.asyncio
async def test_pdf_import_rejects_invalid_pdf():
    with pytest.raises(HTTPException) as error:
        await pdf_files.extract_and_upload_pdf_pages(
            UploadFile(filename="source.pdf", file=BytesIO(b"not a PDF")),
            uuid4(),
        )

    assert error.value.status_code == 400
