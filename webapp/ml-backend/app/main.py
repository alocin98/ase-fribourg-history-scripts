"""API d'inférence : un seul endpoint, POST /predict."""
import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from .pipeline import Pipeline

pipeline: Pipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    pipeline = Pipeline()
    yield


app = FastAPI(title="Handwriting OCR (Kraken BLLA + TrOCR)", lifespan=lifespan)


@app.post("/predict")
def predict(
    file: UploadFile = File(..., description="Page manuscrite (JPG/PNG)"),
    y_tolerance: int = Query(60, ge=0, description="Écart vertical max (px) pour fusionner les fragments BLLA"),
):
    try:
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(file.file.read()))).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Le fichier envoyé n'est pas une image lisible.")

    result = pipeline(image, y_tolerance=y_tolerance)
    if not result["lines"]:
        raise HTTPException(status_code=422, detail="BLLA n'a trouvé aucune ligne de texte.")
    return result
