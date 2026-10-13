from PIL import Image, UnidentifiedImageError

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.api.schemas.htr import LineRead, TranscriptionRead
from app.core.config import settings

router = APIRouter(prefix="/htr", tags=["htr"])


@router.post(
    "/transcribe",
    response_model=TranscriptionRead,
    name="transcribe",
    description="Segment a page image with BLLA and transcribe its lines with CATMuS Medieval.",
)
def transcribe(request: Request, file: UploadFile = File(...)) -> TranscriptionRead:
    if file.size is not None and file.size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="The image is too large")

    try:
        image = Image.open(file.file)
        image.load()
    except (UnidentifiedImageError, OSError) as e:
        raise HTTPException(status_code=400, detail="The file is not a valid image") from e

    records = request.app.state.htr.transcribe(image)

    lines = [
        LineRead(
            id=record.id,
            text=record.prediction,
            # We are taking the average confidence here..
            confidence=sum(record.confidences) / len(record.confidences) if record.confidences else 0.0,
            baseline=record.baseline,
            boundary=record.boundary,
        )
        for record in records
    ]
    return TranscriptionRead(
        width=image.width,
        height=image.height,
        text="\n".join(line.text for line in lines),
        lines=lines,
    )
