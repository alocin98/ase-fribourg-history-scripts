"""The pipeline of the ML backend (Kraken BLLA + TrOCR), imported unchanged."""

import os
import sys
from time import perf_counter

from ..dataset import REPO_ROOT
from . import Prediction, PredLine, load_image


class TrOCR:
    task = "htr"

    def __init__(self):
        # Same pin as webapp/ml-backend/Dockerfile: kraken needs torch 2.4, which
        # transformers no longer accepts for .bin weights, so we load safetensors.
        os.environ.setdefault("TROCR_REVISION", "8cb4cfdbd0f9863f3e8e62f7563321c2f0282c56")
        sys.path.insert(0, str(REPO_ROOT / "webapp" / "ml-backend"))
        from app import pipeline

        self.pipeline = pipeline.Pipeline()
        self.info = {
            "segmentation": "kraken-blla (default)",
            "recognition": pipeline.TROCR_MODEL,
            "revision": pipeline.TROCR_REVISION,
            "device": pipeline.DEVICE,
        }

    def transcribe(self, page) -> Prediction:
        image = load_image(page.image_path)
        start = perf_counter()
        _, crops, boxes = self.pipeline.segment(image)
        segmented = perf_counter()
        results = self.pipeline.transcribe_lines(crops) if crops else []
        done = perf_counter()
        lines = [
            PredLine(r["text"], tuple(box), r["confidence"])
            for r, box in zip(results, boxes, strict=True)
        ]
        return Prediction(
            text="\n".join(line.text for line in lines),
            lines=lines,
            timings={
                "segmentation": segmented - start,
                "recognition": done - segmented,
                "total": done - start,
            },
        )
