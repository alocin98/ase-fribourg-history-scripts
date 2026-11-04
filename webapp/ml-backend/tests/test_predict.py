import io

from PIL import Image


def png_bytes(size=(20, 10)):
    buffer = io.BytesIO()
    Image.new("RGB", size, "white").save(buffer, format="PNG")
    return buffer.getvalue()


def test_predict_returns_transcription(client):
    response = client.post(
        "/predict", files={"file": ("page.png", png_bytes(), "image/png")}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "hello"
    assert body["image_size"] == [20, 10]


def test_predict_rejects_non_image(client):
    response = client.post(
        "/predict", files={"file": ("page.txt", b"not an image", "text/plain")}
    )

    assert response.status_code == 400


def test_predict_requires_file(client):
    response = client.post("/predict")

    assert response.status_code == 422


def test_predict_without_lines_is_unprocessable(client, fake_pipeline):
    fake_pipeline.lines = []

    response = client.post(
        "/predict", files={"file": ("page.png", png_bytes(), "image/png")}
    )

    assert response.status_code == 422
