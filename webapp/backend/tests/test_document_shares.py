from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.models.documents import DocumentAccessRole, DocumentShareRole
from app.services.documents import DocumentService


@pytest.mark.parametrize(
    ("role", "minimum_role", "allowed"),
    [
        (DocumentAccessRole.VIEWER, DocumentAccessRole.VIEWER, True),
        (DocumentAccessRole.VIEWER, DocumentAccessRole.EDITOR, False),
        (DocumentAccessRole.EDITOR, DocumentAccessRole.VIEWER, True),
        (DocumentAccessRole.EDITOR, DocumentAccessRole.EDITOR, True),
        (DocumentAccessRole.OWNER, DocumentAccessRole.EDITOR, True),
    ],
)
async def test_require_document_access_roles(role, minimum_role, allowed):
    document_id = uuid4()
    user_id = uuid4()
    document = SimpleNamespace(id=document_id)
    repository = SimpleNamespace(
        get_access_role=AsyncMock(return_value=role),
        get_document_by_id=AsyncMock(return_value=document),
    )

    result = await DocumentService(repository).require_access(
        document_id,
        user_id,
        minimum_role,
    )

    assert (result is not None) is allowed


async def test_list_for_user_separates_owned_and_shared_documents():
    user_id = uuid4()
    owner_id = uuid4()
    owned_document = SimpleNamespace(
        id=uuid4(),
        owner_id=user_id,
        name="Owned",
        description="Owned document",
    )
    shared_document = SimpleNamespace(
        id=uuid4(),
        owner_id=owner_id,
        name="Shared",
        description="Shared document",
    )
    repository = SimpleNamespace(
        get_for_user=AsyncMock(
            return_value=[
                (owned_document, "Current user", None),
                (shared_document, "Document owner", DocumentShareRole.EDITOR),
            ]
        )
    )

    result = await DocumentService(repository).list_for_user(user_id)

    assert result == {
        "user_documents": [owned_document],
        "shared_document": [
            {
                "id": shared_document.id,
                "name": "Shared",
                "description": "Shared document",
                "owner_name": "Document owner",
                "access": "editor",
            }
        ],
    }


def test_document_share_roles_are_restricted():
    assert {role.value for role in DocumentShareRole} == {"viewer", "editor"}
