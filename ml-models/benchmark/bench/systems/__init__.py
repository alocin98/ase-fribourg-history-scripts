"""The systems that can be benchmarked. A system is only imported when it is used,
because they need different environments (kraken + torch, or MLX)."""

from dataclasses import dataclass, field
from importlib import import_module

from PIL import Image, ImageOps


@dataclass
class PredLine:
    text: str
    bbox: tuple[int, int, int, int] | None = None
    confidence: float | None = None
    polygon: list[list[int]] | None = None  # line boundary, when a system reuses the lines


@dataclass
class Prediction:
    """What a system returns for one page. Vision-language models return no lines."""

    text: str
    lines: list[PredLine] = field(default_factory=list)
    timings: dict[str, float] = field(default_factory=dict)
    language: str | None = None
    extra: dict = field(default_factory=dict)


@dataclass(frozen=True)
class System:
    label: str
    cls: str  # "module.Class" in this package
    options: dict = field(default_factory=dict)
    baseline: bool = False  # run once per page set, results stored in baselines/

    def create(self):
        module, cls = self.cls.split(".")
        return getattr(import_module(f"{__name__}.{module}"), cls)(**self.options)


SYSTEMS = {
    "trocr": System("TrOCR", "trocr.TrOCR"),
    "mccatmus": System("McCATMuS", "mccatmus.McCATMuS"),
    "lid-mccatmus": System("Language detection A", "mccatmus.McCATMuS", {"max_lines": 10}),
    "ppocrv6": System("PP-OCRv6 medium", "ppocrv6.PPOCRv6"),
    "ppocrv6-ft": System(
        "PP-OCRv6 medium fine-tuned",
        "ppocrv6.PPOCRv6",
        {"model": "ppocrv6/finetuned.safetensors"},
    ),
    "medusa-9b": System("MEDUSA 0.2 9B", "medusa.Medusa"),
    "qwen3.5-9b": System("Qwen3.5-9B", "vlm.VLM", {"preset": "qwen3.5-9b"}, True),
    "churro-3b": System("CHURRO 3B", "vlm.VLM", {"preset": "churro-3b"}, True),
}


def load_image(path) -> Image.Image:
    """Loads the image like the ML backend's /predict endpoint does."""
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")
