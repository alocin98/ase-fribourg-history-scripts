from pydantic import BaseModel


class LineRead(BaseModel):
    id: str
    text: str
    confidence: float
    baseline: list[tuple[int, int]]
    boundary: list[tuple[int, int]]


class TranscriptionRead(BaseModel):
    width: int
    height: int
    text: str
    lines: list[LineRead]
