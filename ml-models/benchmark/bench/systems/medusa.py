"""MEDUSA 0.2 9B (https://huggingface.co/ENC-PSL/Medusa0.2Line-9B), Qwen3.5-9B fine-tuned
to read single lines of medieval manuscripts, on Apple Silicon (mlx-vlm, 8-bit).

MEDUSA reads lines, not pages. It reads the lines kraken BLLA found in the latest
`ppocrv6` run (kraken 7 and mlx-vlm don't fit in one environment), so both models read
exactly the same lines; run `ppocrv6` on the page set first. The segmentation time of
that run is added to the time per page.

Line images and prompt follow the authors' DocWorkflow pipeline (VLMLineHTR in
src/tasks/htr/base_vlm_htr.py and the configuration on the model card): the line polygon
is cut out on black, at most 401,408 pixels, greedy decoding, at most 128 new tokens.
DocWorkflow's CATMuS post-processing (character whitelist) is not applied.
"""

import json
from importlib.metadata import version
from time import perf_counter

from PIL import Image, ImageDraw

from ..dataset import MODELS_DIR
from ..run import RUNS_DIR
from . import Prediction, PredLine, load_image

HF_MODEL = "ENC-PSL/Medusa0.2Line-9B"
HF_REVISION = "b7a781e1352b5397a30c9e54d7027bb972fd9af9"
MODEL_PATH = MODELS_DIR / "medusa" / "Medusa0.2Line-9B-mlx-8bit"
# The DocWorkflow prompt of the model card (a folded YAML block, so one line).
PROMPT = (
    "Transcribe the handwritten text in this line image. "
    "Keep abbreviations as written, do not expand them. "
    "Modernize word segmentation (split or join words following modern usage). "
    "Use only u and i, never v and j, regardless of the original or modern usage. "
    "Do not record allographic variants, use standard letter forms. "
    "Output ONLY the transcription."
)
MAX_PIXELS = 401_408
MAX_RATIO = 190  # DocWorkflow pads lines that are longer than this
MAX_TOKENS = 128
LINES_FROM = "ppocrv6"


def line_image(image: Image.Image, polygon: list[list[int]]) -> Image.Image | None:
    """The line polygon on black, like DocWorkflow's _extract_line_image, scaled down to
    at most MAX_PIXELS (DocWorkflow leaves that to the processor's max_pixels)."""
    xs, ys = [x for x, _ in polygon], [y for _, y in polygon]
    left, top, right, bottom = min(xs), min(ys), max(xs), max(ys)
    w, h = right - left, bottom - top
    if w <= 0 or h <= 0:
        return None
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon([(x - left, y - top) for x, y in polygon], fill=255)
    crop = image.crop((left, top, right, bottom))
    line = Image.composite(crop, Image.new("RGB", (w, h)), mask)
    if w / h > MAX_RATIO:
        padded = Image.new("RGB", (w, max(1, w // MAX_RATIO)))
        padded.paste(line, (0, (padded.height - h) // 2))
        line = padded
    elif h / w > MAX_RATIO:
        padded = Image.new("RGB", (max(1, h // MAX_RATIO), h))
        padded.paste(line, ((padded.width - w) // 2, 0))
        line = padded
    scale = (MAX_PIXELS / (line.width * line.height)) ** 0.5
    if scale < 1:
        size = (max(1, int(line.width * scale)), max(1, int(line.height * scale)))
        line = line.resize(size, Image.Resampling.BICUBIC)
    return line


def latest_lines_run():
    runs = sorted(RUNS_DIR.glob(f"*_{LINES_FROM}_*"), reverse=True)
    if not runs:
        raise SystemExit(f"No {LINES_FROM} run in {RUNS_DIR}: run `{LINES_FROM}` first")
    return runs[0]


class Medusa:
    task = "htr"

    def __init__(self):
        from mlx_vlm import load
        from mlx_vlm.prompt_utils import apply_chat_template

        if not MODEL_PATH.exists():
            raise SystemExit(f"{MODEL_PATH} not found, see ml-models/models/medusa/README.md")
        self.model, self.processor = load(str(MODEL_PATH))
        self.prompt = apply_chat_template(
            self.processor,
            self.model.config,
            [{"role": "user", "content": PROMPT}],
            num_images=1,
            enable_thinking=False,
        )
        self.lines_run = latest_lines_run()
        self.segmentations = {}
        for line in (self.lines_run / "pages.jsonl").read_text().splitlines():
            record = json.loads(line)
            if "error" not in record:
                self.segmentations[record["page_id"]] = record
        self.info = {
            "model": f"{HF_MODEL}@{HF_REVISION[:7]}, converted to MLX 8-bit",
            "runtime": f"mlx-vlm {version('mlx-vlm')}",
            "lines_from": f"runs/{self.lines_run.name}",
            "max_pixels": MAX_PIXELS,
            "max_tokens": MAX_TOKENS,
            "temperature": 0.0,
            "prompt": self.prompt,
        }

    def read_line(self, image: Image.Image):
        from mlx_vlm import generate

        result = generate(
            self.model,
            self.processor,
            self.prompt,
            image=[image],
            max_tokens=MAX_TOKENS,
            temperature=0.0,
            verbose=False,
        )
        return result.text.strip(), result

    def transcribe(self, page) -> Prediction:
        segmentation = self.segmentations.get(page.page_id)
        if segmentation is None:
            raise ValueError(f"page not in {self.lines_run.name}")
        image = load_image(page.image_path)
        start = perf_counter()
        lines, peak, tokens, truncated = [], 0.0, 0, 0
        for seg_line in segmentation["lines"]:
            crop = line_image(image, seg_line["polygon"])
            text = ""
            if crop is not None:
                text, result = self.read_line(crop)
                peak = max(peak, result.peak_memory)
                tokens += result.generation_tokens
                truncated += result.generation_tokens >= MAX_TOKENS
            lines.append(PredLine(text, tuple(seg_line["bbox"]), None, seg_line["polygon"]))
        recognition = perf_counter() - start
        seg_time = segmentation["timings"]["segmentation"]
        return Prediction(
            text="\n".join(line.text for line in lines),
            lines=lines,
            timings={
                "segmentation": seg_time,
                "recognition": recognition,
                "total": seg_time + recognition,
            },
            extra={
                "generation_tokens": tokens,
                "truncated_lines": truncated,
                "peak_memory_gb": peak,
            },
        )
