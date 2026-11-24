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


def test_document_share_roles_are_restricted():
    assert {role.value for role in DocumentShareRole} == {"viewer", "editor"}
