FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models/hf

WORKDIR /app

COPY requirements.txt .

# requirements.txt pulls torch from the PyTorch CPU index; let uv pick the best
# match across both indexes (pip's default behaviour).
RUN uv pip install --system --index-strategy unsafe-best-match -r requirements.txt

# Télécharge les poids TrOCR au build : le conteneur démarre ensuite sans réseau.
# Révision = PR #7 du dépôt HF (variante safetensors) : kraken impose torch 2.4 et
# transformers refuse de charger pytorch_model.bin avec torch < 2.6.
ARG TROCR_MODEL=microsoft/trocr-small-handwritten
ARG TROCR_REVISION=8cb4cfdbd0f9863f3e8e62f7563321c2f0282c56
ENV TROCR_MODEL=${TROCR_MODEL} \
    TROCR_REVISION=${TROCR_REVISION}
RUN python -c "import os; from transformers import TrOCRProcessor, VisionEncoderDecoderModel as M; n, r = os.environ['TROCR_MODEL'], os.environ['TROCR_REVISION']; TrOCRProcessor.from_pretrained(n, revision=r); M.from_pretrained(n, revision=r, use_safetensors=True)"
ENV HF_HUB_OFFLINE=1

COPY app ./app

EXPOSE 8000

# Production start: a single worker, the models are loaded once per process.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
