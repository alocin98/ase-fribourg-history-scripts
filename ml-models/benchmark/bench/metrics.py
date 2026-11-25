"""Text normalization, edit counts, line matching and bootstrap intervals."""

import random
import unicodedata
from collections import Counter
from dataclasses import dataclass

from rapidfuzz.distance import Levenshtein


def strict(text: str) -> str:
    """Unicode NFC, whitespace and line breaks collapsed to single spaces."""
    return " ".join(unicodedata.normalize("NFC", text).split())


def normalized(text: str) -> str:
    """Lower case without accents, ſ -> s and other compatibility forms folded,
    punctuation and symbols replaced by spaces."""
    text = unicodedata.normalize("NFD", unicodedata.normalize("NFKC", text).casefold())
    kept = (
        " " if unicodedata.category(c)[0] in "PS" else c
        for c in text
        if unicodedata.category(c)[0] != "M"
    )
    return " ".join("".join(kept).split())


VIEWS = {"strict": strict, "normalized": normalized}


@dataclass(frozen=True)
class Counts:
    """Edits that turn the reference into the hypothesis. `ref` is the number of
    reference characters or words. Counts are summed over pages, never averaged."""

    ref: int = 0
    sub: int = 0
    dele: int = 0
    ins: int = 0

    def __add__(self, other):
        return Counts(
            self.ref + other.ref,
            self.sub + other.sub,
            self.dele + other.dele,
            self.ins + other.ins,
        )

    def rate(self, part: str = "errors") -> float | None:
        if not self.ref:
            return None
        if part == "errors":
            return (self.sub + self.dele + self.ins) / self.ref
        return getattr(self, part) / self.ref


def edits(reference, hypothesis) -> Counts:
    """Works on strings (characters) and on lists of words."""
    ops = Counter(op.tag for op in Levenshtein.editops(reference, hypothesis))
    return Counts(len(reference), ops["replace"], ops["delete"], ops["insert"])


def iou(a, b) -> float:
    width = min(a[2], b[2]) - max(a[0], b[0])
    height = min(a[3], b[3]) - max(a[1], b[1])
    if width <= 0 or height <= 0:
        return 0.0
    inter = width * height
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union


def match_lines(gt, pred, threshold: float = 0.3) -> list[tuple[int, int]]:
    """One-to-one line pairs by box overlap, best pairs first. The threshold is low
    because line boxes are thin, so a few pixels of padding already cost a lot."""
    pairs = [(iou(g, p), i, j) for i, g in enumerate(gt) for j, p in enumerate(pred)]
    used_gt, used_pred, matches = set(), set(), []
    for overlap, i, j in sorted(pairs, reverse=True):
        if overlap >= threshold and i not in used_gt and j not in used_pred:
            used_gt.add(i)
            used_pred.add(j)
            matches.append((i, j))
    return sorted(matches)


def bootstrap_interval(docs: list[Counts], iterations: int = 1000):
    """95 % interval of the error rate, resampling documents. Pages of a document
    share a hand, so resampling pages would make the interval too narrow."""
    if len(docs) < 2:
        return None
    rng = random.Random(0)
    rates = sorted(
        sum(rng.choices(docs, k=len(docs)), Counts()).rate() or 0.0 for _ in range(iterations)
    )
    return rates[int(0.025 * iterations)], rates[int(0.975 * iterations) - 1]
