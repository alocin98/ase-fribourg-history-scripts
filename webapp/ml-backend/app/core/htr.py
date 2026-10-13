from threading import Lock

from kraken.configs import RecognitionInferenceConfig, SegmentationInferenceConfig
from kraken.tasks import RecognitionTaskModel, SegmentationTaskModel
from PIL import Image

from app.core.config import settings

# Line extraction runs in-process: kraken's default worker pool would spawn
# extra processes inside every uvicorn worker.
SEGMENTATION_CONFIG = SegmentationInferenceConfig(accelerator="cpu", device=1)
RECOGNITION_CONFIG = RecognitionInferenceConfig(accelerator="cpu", device=1, num_line_workers=0)


class HTRPipeline:
    def __init__(self) -> None:
        self.segmenter = SegmentationTaskModel.load_model(settings.SEGMENTATION_MODEL or None)
        self.recognizer = RecognitionTaskModel.load_model(settings.RECOGNITION_MODEL)
        # The models keep per-call inference state, so one page at a time.
        self._lock = Lock()

    def transcribe(self, image: Image.Image):
        with self._lock:
            segmentation = self.segmenter.predict(image, SEGMENTATION_CONFIG)
            return list(self.recognizer.predict(image, segmentation, RECOGNITION_CONFIG))
