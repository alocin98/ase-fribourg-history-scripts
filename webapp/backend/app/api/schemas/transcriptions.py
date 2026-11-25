from typing import Literal
from uuid import UUID

from pydantic import BaseModel


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


class RecognizedEntity(BaseModel):
    text: str
    label: Literal["person", "date", "location"]
    # Positions dans le texte complet de la transcription.
    start: int
    end: int
    score: float | None


class PageTranscriptionRead(BaseModel):
    page_id: UUID
    text: str | None
    # None pour les anciennes transcriptions (texte seul), à refaire.
    lines: list[TranscriptionLine] | None
    # Taille de l'image vue par le modèle, None pour les anciennes transcriptions.
    image_width: int | None
    image_height: int | None
    # None tant que les entités n'ont pas été cherchées (ou si cela a échoué).
    entities: list[RecognizedEntity] | None


class EntitySummaryResponse(BaseModel):
    query: str
    found: bool
    title: str | None = None
    summary: str | None = None
    url: str | None = None
    thumbnail_url: str | None = None
    source: Literal["Wikipedia"] = "Wikipedia"
