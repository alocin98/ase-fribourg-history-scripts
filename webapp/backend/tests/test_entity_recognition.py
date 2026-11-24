from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from app.services.transcriptions import PageResult, TranscriptionService
from app.workers import transcription as worker

LONDON = {
    "text": "London",
    "label": "location",
    "start": 13,
    "end": 19,
    "score": 0.93,
}


class FakeAsyncClient:
    # (status, json) renvoyés par le modèle.
    response: tuple[int, object] = (200, {"entities": [LONDON]})
    calls: list[tuple[str, dict]] = []

    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, url, **kwargs):
        FakeAsyncClient.calls.append((url, kwargs))
        status_code, body = FakeAsyncClient.response
        return httpx.Response(
            status_code, json=body, request=httpx.Request("POST", url)
        )


@pytest.fixture
def model_client(monkeypatch):
    FakeAsyncClient.response = (200, {"entities": [LONDON]})
    FakeAsyncClient.calls = []
    monkeypatch.setattr(worker.httpx, "AsyncClient", FakeAsyncClient)
    return FakeAsyncClient


def transcription(text="John visited London.", lines=()):
    return SimpleNamespace(id=uuid4(), text=text, lines=list(lines))


async def test_recognize_entities_validates_model_response(model_client):
    entities = await worker.recognize_entities("John visited London.")

    assert entities == [LONDON]
    url, kwargs = model_client.calls[0]
    assert url.endswith("/entities")
    assert kwargs["json"]["text"] == "John visited London."


async def test_recognize_entities_skips_empty_text(model_client):
    assert await worker.recognize_entities("  \n") == []
    assert model_client.calls == []


async def test_recognize_entities_rejects_invalid_model_response(model_client):
    model_client.response = (
        200,
        {"entities": [{"text": "London", "label": "unknown"}]},
    )

    with pytest.raises(ValueError):
        await worker.recognize_entities("London")


async def test_process_page_skips_finished_page(model_client):
    page = SimpleNamespace(id=uuid4())

    result = await worker.process_page(page, transcription(), SimpleNamespace())

    assert result is None
    assert model_client.calls == []


async def test_process_page_only_recognizes_entities_of_existing_text(
    model_client, monkeypatch
):
    async def fail_transcription(_page):
        raise AssertionError("the page must not be transcribed again")

    monkeypatch.setattr(worker, "transcribe_image", fail_transcription)
    page = SimpleNamespace(id=uuid4())
    existing = transcription()

    result = await worker.process_page(page, existing, None)

    assert result == PageResult(
        page_id=page.id,
        transcription_id=existing.id,
        transcription=None,
        entities=[LONDON],
    )


async def test_process_page_transcribes_then_recognizes_entities(
    model_client, monkeypatch
):
    page = SimpleNamespace(id=uuid4())
    new_transcription = {"page_id": page.id, "text": "John visited London."}

    async def fake_transcription(_page):
        return new_transcription

    monkeypatch.setattr(worker, "transcribe_image", fake_transcription)

    result = await worker.process_page(page, None, None)

    assert result.transcription is new_transcription
    assert result.transcription_id is None
    assert result.entities == [LONDON]
    assert model_client.calls[0][1]["json"]["text"] == "John visited London."


async def test_process_page_keeps_text_when_entity_recognition_fails(
    model_client, monkeypatch
):
    model_client.response = (503, {"detail": "unavailable"})
    page = SimpleNamespace(id=uuid4())
    new_transcription = {"page_id": page.id, "text": "John visited London."}

    async def fake_transcription(_page):
        return new_transcription

    monkeypatch.setattr(worker, "transcribe_image", fake_transcription)

    result = await worker.process_page(page, None, None)

    assert result.transcription is new_transcription
    assert result.entities is None


class FakeRepository:
    def __init__(self, saved_ids):
        self.saved_ids = saved_ids
        self.saved_transcriptions = None
        self.saved_entities = None
        self.deleted_ids = None
        self.committed = False

    async def save_page_transcriptions(self, transcriptions):
        self.saved_transcriptions = transcriptions
        return self.saved_ids

    async def save_transcription_entities(self, rows):
        self.saved_entities = rows

    async def delete_transcription_entities(self, transcription_ids):
        self.deleted_ids = transcription_ids

    async def commit(self):
        self.committed = True


async def test_save_page_results_links_entities_to_their_transcription():
    new_page, existing_page, failed_page = uuid4(), uuid4(), uuid4()
    new_id, existing_id, failed_id = uuid4(), uuid4(), uuid4()
    new_transcription = {"page_id": new_page, "text": "London"}
    failed_transcription = {"page_id": failed_page, "text": "Paris"}
    repository = FakeRepository({new_page: new_id, failed_page: failed_id})
    service = TranscriptionService(
        session=None, document_repository=object(), repository=repository
    )

    await service.save_page_results(
        [
            PageResult(new_page, None, new_transcription, [LONDON]),
            PageResult(existing_page, existing_id, None, []),
            PageResult(failed_page, failed_id, failed_transcription, None),
        ]
    )

    assert repository.saved_transcriptions == [new_transcription, failed_transcription]
    assert repository.saved_entities == [
        {"transcription_id": new_id, "entities": [LONDON]},
        {"transcription_id": existing_id, "entities": []},
    ]
    # Le texte de cette page a changé sans nouvelles entités : les anciennes partent.
    assert repository.deleted_ids == [failed_id]
    assert repository.committed
