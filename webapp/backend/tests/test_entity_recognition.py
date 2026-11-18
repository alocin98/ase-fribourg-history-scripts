import httpx
import pytest
from fastapi import HTTPException

from app.api.routes import transcriptions
from app.api.schemas.transcriptions import EntityRecognitionRequest


class FakeAsyncClient:
    response = httpx.Response(
        200,
        json={
            "entities": [
                {
                    "text": "London",
                    "label": "location",
                    "start": 20,
                    "end": 26,
                    "score": 0.93,
                }
            ]
        },
        request=httpx.Request("POST", "http://model/entities"),
    )

    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, *_args, **_kwargs):
        return self.response


async def test_entity_recognition_proxies_and_validates_response(monkeypatch):
    monkeypatch.setattr(transcriptions.httpx, "AsyncClient", FakeAsyncClient)

    result = await transcriptions.request_entity_recognition(
        EntityRecognitionRequest(text="John Smith visited London.")
    )

    assert result.entities[0].text == "London"
    assert result.entities[0].label == "location"


async def test_entity_recognition_rejects_invalid_model_response(monkeypatch):
    FakeAsyncClient.response = httpx.Response(
        200,
        json={"entities": [{"text": "London", "label": "unknown"}]},
        request=httpx.Request("POST", "http://model/entities"),
    )
    monkeypatch.setattr(transcriptions.httpx, "AsyncClient", FakeAsyncClient)

    with pytest.raises(HTTPException) as error:
        await transcriptions.request_entity_recognition(
            EntityRecognitionRequest(text="London")
        )

    assert error.value.status_code == 502
