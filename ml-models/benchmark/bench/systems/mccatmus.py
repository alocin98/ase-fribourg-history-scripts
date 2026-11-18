"""Kraken BLLA + McCATMuS (https://doi.org/10.5281/zenodo.13788177), a multilingual
model for documents from the 16th to the 21st century.

With `max_lines` it is the language detector of approach A: transcribe the first
lines, then let lingua pick the language of that text.
"""

import dataclasses
import urllib.request
from importlib import resources
from importlib.metadata import version
from statistics import fmean
from time import perf_counter

from lingua import Language, LanguageDetectorBuilder

from ..dataset import MODELS_DIR
from . import Prediction, PredLine, load_image

MODEL_URL = "https://zenodo.org/records/13788177/files/McCATMuS_nfd_nofix_V1.mlmodel?download=1"
MODEL_PATH = MODELS_DIR / "mccatmus" / "McCATMuS_nfd_nofix_V1.mlmodel"

# Only the languages of the archive: telling four languages apart is what makes
# detection work on noisy HTR output.
LANGUAGES = {
    Language.GERMAN: "de",
    Language.FRENCH: "fr",
    Language.ENGLISH: "en",
    Language.LATIN: "la",
}


class McCATMuS:
    def __init__(self, max_lines: int | None = None):
        from kraken import blla, rpred
        from kraken.lib import models, vgsl

        if not MODEL_PATH.exists():
            print(f"Downloading McCATMuS to {MODEL_PATH}")
            partial = MODEL_PATH.with_suffix(".part")
            urllib.request.urlretrieve(MODEL_URL, partial)
            partial.rename(MODEL_PATH)

        self.blla, self.rpred = blla, rpred
        self.seg_model = vgsl.TorchVGSLModel.load_model(
            str(resources.files("kraken") / "blla.mlmodel")
        )
        self.rec_model = models.load_any(str(MODEL_PATH))
        self.detector = LanguageDetectorBuilder.from_languages(*LANGUAGES).build()
        self.max_lines = max_lines
        self.task = "lid" if max_lines else "htr"
        self.info = {
            "segmentation": "kraken-blla (default)",
            "recognition": MODEL_PATH.name,
            "max_lines": max_lines,
            "language_detector": f"lingua {version('lingua-language-detector')}",
        }

    def transcribe(self, page) -> Prediction:
        image = load_image(page.image_path)
        start = perf_counter()
        segmentation = self.blla.segment(
            image, text_direction="horizontal-lr", model=self.seg_model
        )
        if self.max_lines:
            segmentation = dataclasses.replace(
                segmentation, lines=segmentation.lines[: self.max_lines]
            )
        segmented = perf_counter()
        records = list(self.rpred.rpred(self.rec_model, image, segmentation))
        recognized = perf_counter()

        lines = []
        for record, line in zip(records, segmentation.lines, strict=True):
            xs, ys = zip(*(line.boundary or line.baseline), strict=True)
            confidence = fmean(record.confidences) if record.confidences else None
            bbox = (int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys)))
            lines.append(PredLine(record.prediction, bbox, confidence))
        text = "\n".join(line.text for line in lines)

        confidences = {}
        if text.strip():
            for value in self.detector.compute_language_confidence_values(text):
                confidences[LANGUAGES[value.language]] = round(value.value, 4)
        done = perf_counter()
        return Prediction(
            text=text,
            lines=lines,
            language=max(confidences, key=confidences.get) if confidences else None,
            timings={
                "segmentation": segmented - start,
                "recognition": recognized - segmented,
                "language_detection": done - recognized,
                "total": done - start,
            },
            extra={"language_confidences": confidences},
        )
