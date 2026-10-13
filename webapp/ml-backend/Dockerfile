FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY requirements.txt .

# CPU-only torch wheels keep the image free of CUDA libraries.
RUN uv pip install --system \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    --index-strategy unsafe-best-match \
    -r requirements.txt

# Models delivered by the ML team (copied from ml-models/models, see readme).
# Text segmentation: BLLA, bundled with kraken.
COPY models /models

COPY app ./app

# Each worker holds its own copy of the models in memory.
ENV WEB_CONCURRENCY=1

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
