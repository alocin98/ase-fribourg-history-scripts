FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/hf

WORKDIR /srv

COPY requirements.txt .
RUN pip install -r requirements.txt

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
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
