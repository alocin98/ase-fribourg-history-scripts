"""Kraken BLLA + PP-OCRv6 medium (https://doi.org/10.5281/zenodo.21788410), a line
recognizer pretrained on ~6.2M lines in 37 languages. Needs kraken >= 7.1, so it runs in
.venv-kraken7.

The run also stores each line's polygon, so `medusa` can read exactly the same lines.
"""

import os
import urllib.request
from importlib.metadata import version
from statistics import fmean
from time import perf_counter

from ..dataset import MODELS_DIR
from . import Prediction, PredLine, load_image

MODEL_URL = "https://zenodo.org/records/21788410/files/medium.safetensors?download=1"
MODEL_PATH = MODELS_DIR / "ppocrv6" / "medium.safetensors"


class PPOCRv6:
    task = "htr"

    def __init__(self):
        from kraken.configs import RecognitionInferenceConfig, SegmentationInferenceConfig
        from kraken.tasks import RecognitionTaskModel, SegmentationTaskModel

        if not MODEL_PATH.exists():
            print(f"Downloading PP-OCRv6 medium to {MODEL_PATH}")
            MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            partial = MODEL_PATH.with_suffix(".part")
            urllib.request.urlretrieve(MODEL_URL, partial)
            partial.rename(MODEL_PATH)

        # On the CPU like the other kraken candidates. Line extraction in worker
        # processes hangs here (spawned workers), and is not the slow part anyway.
        threads = os.cpu_count() or 1
        self.seg_config = SegmentationInferenceConfig(accelerator="cpu", num_threads=threads)
        self.rec_config = RecognitionInferenceConfig(
            accelerator="cpu", num_threads=threads, num_line_workers=0
        )
        self.seg_model = SegmentationTaskModel.load_model()  # kraken's default BLLA model
        self.rec_model = RecognitionTaskModel.load_model(MODEL_PATH)
        self.info = {
            "segmentation": f"kraken-blla (default, kraken {version('kraken')})",
            "recognition": f"PP-OCRv6 medium ({MODEL_PATH.name}, zenodo 21788410)",
            "device": "cpu",
            "decoder": "greedy CTC",
        }

    def transcribe(self, page) -> Prediction:
        image = load_image(page.image_path)
        start = perf_counter()
        segmentation = self.seg_model.predict(image, self.seg_config)
        segmented = perf_counter()
        records = list(self.rec_model.predict(image, segmentation, self.rec_config))
        recognized = perf_counter()

        lines = []
        for record, line in zip(records, segmentation.lines, strict=True):
            polygon = [[int(x), int(y)] for x, y in (line.boundary or line.baseline)]
            xs, ys = zip(*polygon, strict=True)
            confidence = fmean(record.confidences) if record.confidences else None
            bbox = (min(xs), min(ys), max(xs), max(ys))
            lines.append(PredLine(record.prediction, bbox, confidence, polygon))
        return Prediction(
            text="\n".join(line.text for line in lines),
            lines=lines,
            timings={
                "segmentation": segmented - start,
                "recognition": recognized - segmented,
                "total": recognized - start,
            },
        )
