import pytest
from fastapi.testclient import TestClient

from app import main


class FakePipeline:
    """Stands in for the real pipeline so tests don't load the Kraken/TrOCR models."""

    def __init__(self):
        self.lines = [
            {
                "index": 1,
                "text": "hello",
                "bbox": [0, 0, 10, 10],
                "confidence": 0.9,
                "words": [{"text": "hello", "confidence": 0.9}],
            }
        ]

    def __call__(self, image, y_tolerance=60):
        return {
            "text": "\n".join(line["text"] for line in self.lines),
            "lines": self.lines,
            "n_fragments": len(self.lines),
            "image_size": list(image.size),
            "models": {},
        }


@pytest.fixture
def fake_pipeline(monkeypatch):
    pipeline = FakePipeline()
    monkeypatch.setattr(main, "Pipeline", lambda: pipeline)
    return pipeline


@pytest.fixture
def client(fake_pipeline):
    with TestClient(main.app) as client:
        yield client
