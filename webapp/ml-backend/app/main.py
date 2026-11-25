"""Inference API for handwriting OCR and named-entity recognition."""

import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field

from .pipeline import EntityRecognizer, Pipeline

pipeline: Pipeline | None = None
entity_recognizer: EntityRecognizer | None = None


class EntityRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)
    threshold: float = Field(default=0.5, ge=0, le=1)


class Entity(BaseModel):
    text: str
    label: str
    start: int
    end: int
    score: float | None


class EntityResponse(BaseModel):
    entities: list[Entity]


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    pipeline = Pipeline()
    yield


app = FastAPI(title="Handwriting OCR (Kraken BLLA + TrOCR)", lifespan=lifespan)


@app.post("/predict")
def predict(
    file: UploadFile = File(..., description="Page manuscrite (JPG/PNG)"),
    y_tolerance: int = Query(
        60,
        ge=0,
        description="Écart vertical max (px) pour fusionner les fragments BLLA",
    ),
):
    try:
        image = ImageOps.exif_transpose(
            Image.open(io.BytesIO(file.file.read()))
        ).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400, detail="Le fichier envoyé n'est pas une image lisible."
        ) from None

    result = pipeline(image, y_tolerance=y_tolerance)
    if not result["lines"]:
        raise HTTPException(
            status_code=422, detail="BLLA n'a trouvé aucune ligne de texte."
        )
    return result


@app.post("/entities", response_model=EntityResponse)
def entities(request: EntityRequest):
    """Find people, dates, and locations in already-transcribed text."""
    global entity_recognizer
    if entity_recognizer is None:
        entity_recognizer = EntityRecognizer()
    return {"entities": entity_recognizer(request.text, request.threshold)}
