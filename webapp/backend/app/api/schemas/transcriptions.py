from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TranscriptionResponse(BaseModel):
    job_id: UUID
    status: str


class TranscriptionWord(BaseModel):
    text: str
    # Moyenne des probabilités des tokens du mot, entre 0 et 1.
    confidence: float


class TranscriptionLine(BaseModel):
    index: int
    text: str
    # [gauche, haut, droite, bas] en pixels de l'image vue par le modèle.
    bbox: tuple[int, int, int, int] | None = None
    # Moyenne des probabilités des tokens de la ligne, entre 0 et 1.
    confidence: float | None = None
    words: list[TranscriptionWord] = []


class PageTranscriptionRead(BaseModel):
    # Lu directement depuis l'objet PageTranscription de la base.
    model_config = ConfigDict(from_attributes=True)

    page_id: UUID
    text: str | None
    # None pour les anciennes transcriptions (texte seul), à refaire.
    lines: list[TranscriptionLine] | None
    # Taille de l'image vue par le modèle, None pour les anciennes transcriptions.
    image_width: int | None
    image_height: int | None


class EntityRecognitionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)
    threshold: float = Field(default=0.5, ge=0, le=1)


class RecognizedEntity(BaseModel):
    text: str
    label: Literal["person", "date", "location"]
    start: int
    end: int
    score: float


class EntityRecognitionResponse(BaseModel):
    entities: list[RecognizedEntity]
