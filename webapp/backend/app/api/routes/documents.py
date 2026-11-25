import zipfile
from urllib.parse import quote
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    Security,
    UploadFile,
    status,
)
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.csrf import csrf_header
from app.api.dependencies.injection import (
    DocumentServiceDep,
    TranscriptionServiceDep,
    UserServiceDep,
)
from app.api.dependencies.pdf import build_document_pdf
from app.api.dependencies.zip_files import extract_and_upload_pages
from app.api.schemas.documents import (
    DocumentCreate,
    DocumentSearchResult,
    DocumentShareCreate,
    DocumentShareRead,
    DocumentShareUpdate,
    DocumentUploadResponse,
    PageRead,
    UserDocumentsRead,
)
from app.api.schemas.transcriptions import PageTranscriptionRead
from app.infrastructure.database.session import get_db
from app.infrastructure.storage.s3 import (
    delete_prefix,
    download_file,
)
from app.models.documents import DocumentAccessRole, DocumentShareRole
from app.models.user import User
from app.services.documents import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


async def require_document_access(
    service: DocumentService,
    document_id: UUID,
    user_id: UUID,
    minimum_role: DocumentAccessRole | None = None,
) -> DocumentAccessRole:
    if not await service.document_exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")

    role = await service.get_access_role(document_id, user_id)
    if role is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this document",
        )

    if minimum_role is not None:
        rank = {
            DocumentAccessRole.VIEWER: 1,
            DocumentAccessRole.EDITOR: 2,
            DocumentAccessRole.OWNER: 3,
        }
        if rank[role] < rank[minimum_role]:
            raise HTTPException(
                status_code=403,
                detail="You do not have the required document role",
            )
    return role


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
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.EDITOR,
    )
    document = await service.require_access(
        document_id,
        current_user.id,
        DocumentAccessRole.EDITOR,
    )
    if document is None:
        raise HTTPException(status_code=403, detail="Editor access required")

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
    if not await service.document_exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    role = await service.get_access_role(document_id, current_user.id)
    if role is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this document",
        )
    if role != DocumentAccessRole.OWNER:
        raise HTTPException(status_code=403, detail="Owner access required")
    if not await service.delete(document_id, current_user.id):
        raise HTTPException(status_code=403, detail="Owner access required")
    await delete_prefix(f"{document_id}/")


@router.get(
    "/me",
    response_model=UserDocumentsRead,
    dependencies=[Security(csrf_header)],
    name="list_user_documents",
    description="List documents owned by or shared with the current user.",
    status_code=status.HTTP_200_OK,
)
async def list_user_documents(
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    return await service.list_for_user(current_user.id)


@router.get(
    "/{document_id}/shares",
    response_model=list[DocumentShareRead],
    dependencies=[Security(csrf_header)],
)
async def list_document_shares(
    document_id: UUID,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.OWNER,
    )
    return await service.list_shares(document_id)


@router.post(
    "/{document_id}/shares",
    response_model=DocumentShareRead,
    dependencies=[Security(csrf_header)],
    status_code=status.HTTP_201_CREATED,
)
async def create_document_share(
    document_id: UUID,
    data: DocumentShareCreate,
    service: DocumentServiceDep,
    user_service: UserServiceDep,
    current_user: User = Depends(get_current_user),
):
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.OWNER,
    )
    target = await user_service.get_by_email(data.email)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Cannot share document with yourself"
        )
    share_role = DocumentShareRole(data.role)
    return await service.set_share(document_id, target.id, share_role)


@router.patch(
    "/{document_id}/shares/{user_id}",
    response_model=DocumentShareRead,
    dependencies=[Security(csrf_header)],
)
async def update_document_share(
    document_id: UUID,
    user_id: UUID,
    data: DocumentShareUpdate,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.OWNER,
    )
    shares = await service.list_shares(document_id)
    if not any(share.user_id == user_id for share in shares):
        raise HTTPException(status_code=404, detail="Share not found")
    return await service.set_share(
        document_id,
        user_id,
        DocumentShareRole(data.role),
    )


@router.delete(
    "/{document_id}/shares/me",
    dependencies=[Security(csrf_header)],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_own_document_share(
    document_id: UUID,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    if not await service.document_exists(document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    role = await service.get_access_role(document_id, current_user.id)
    if role in (None, DocumentAccessRole.OWNER):
        if role is None:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this document",
            )
        raise HTTPException(status_code=404, detail="Share not found")
    if not await service.delete_share(document_id, current_user.id):
        raise HTTPException(status_code=404, detail="Share not found")


@router.delete(
    "/{document_id}/shares/{user_id}",
    dependencies=[Security(csrf_header)],
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document_share(
    document_id: UUID,
    user_id: UUID,
    service: DocumentServiceDep,
    current_user: User = Depends(get_current_user),
):
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.OWNER,
    )
    if not await service.delete_share(document_id, user_id):
        raise HTTPException(status_code=404, detail="Share not found")


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
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.VIEWER,
    )
    pages, document_exists = await service.list_pages(
        document_id=document_id,
        user_id=current_user.id,
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
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.VIEWER,
    )
    page = await service.get_owned_page(
        document_id=document_id,
        page_id=page_id,
        user_id=current_user.id,
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
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.VIEWER,
    )
    page = await service.get_owned_page(
        document_id=document_id, page_id=page_id, user_id=current_user.id
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")

    transcription = await transcription_service.get_page_transcription(page_id)
    if transcription is None:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return transcription


@router.get(
    "/{document_id}/export",
    dependencies=[Security(csrf_header)],
    name="export_document",
    description="Export a document owned by the user as a PDF.",
)
async def download_document(
    document_id: UUID,
    service: DocumentServiceDep,
    transcription_service: TranscriptionServiceDep,
    current_user: User = Depends(get_current_user),
):
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.VIEWER,
    )
    document = await service.require_access(
        document_id,
        current_user.id,
        DocumentAccessRole.VIEWER,
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    pages = await transcription_service.get_document_pages(
        document_id=document_id,
        user_id=current_user.id,
    )
    if not pages:
        raise HTTPException(status_code=404, detail="Document has no pages")

    try:
        pdf = await build_document_pdf(document, pages)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Could not generate the PDF",
        ) from error

    filename = quote(f"{document.name}.pdf")
    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get(
    "/{document_id}/search",
    dependencies=[Security(csrf_header)],
    response_model=list[DocumentSearchResult],
    name="search_document_transcriptions",
    description="Search for a term in the transcriptions of a document owned by the user.",
    status_code=status.HTTP_200_OK,
)
async def search_document_transcriptions(
    document_id: UUID,
    service: DocumentServiceDep,
    transcription_service: TranscriptionServiceDep,
    term: str = Query(..., min_length=3),
    current_user: User = Depends(get_current_user),
):
    await require_document_access(
        service,
        document_id,
        current_user.id,
        DocumentAccessRole.VIEWER,
    )
    results = await service.search_in_document(document_id, current_user.id, term)
    return results
