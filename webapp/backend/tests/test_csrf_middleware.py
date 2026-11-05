import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.middleware import CSRFMiddleware


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.add_middleware(CSRFMiddleware)

    @app.get("/")
    def read():
        return {"ok": True}

    @app.post("/")
    def write():
        return {"ok": True}

    return TestClient(app)


def test_safe_methods_skip_csrf_check(client: TestClient):
    assert client.get("/").status_code == 200


def test_post_without_token_is_rejected(client: TestClient):
    response = client.post("/")

    assert response.status_code == 403


def test_post_with_mismatching_token_is_rejected(client: TestClient):
    client.cookies.set(settings.CSRF_COOKIE_NAME, "cookie-token")
    response = client.post("/", headers={settings.CSRF_HEADER_NAME: "other-token"})

    assert response.status_code == 403


def test_post_with_matching_token_is_accepted(client: TestClient):
    client.cookies.set(settings.CSRF_COOKIE_NAME, "token")
    response = client.post("/", headers={settings.CSRF_HEADER_NAME: "token"})

    assert response.status_code == 200
