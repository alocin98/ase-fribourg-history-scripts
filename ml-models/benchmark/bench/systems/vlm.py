"""Vision-language models on Apple Silicon (mlx-vlm): whole page in, text out."""

import html
import re
import tempfile
from importlib.metadata import version
from pathlib import Path
from time import perf_counter

from . import Prediction, load_image

# The generic prompt of the CHURRO project (churro_ocr/prompts/ocr.py).
DEFAULT_SYSTEM_PROMPT = (
    "You are an expert in diplomatic transcription of historical documents from various "
    "languages. Your task is to extract the full text from a given page. Only output the "
    "transcribed text between <output> and </output> tags."
)
DEFAULT_USER_PROMPT = (
    "Follow these instructions:\n\n"
    "1. You will be provided with a scanned document page.\n\n"
    "2. Perform transcription on the entirety of the page, converting all visible text into "
    "the following format. Include handwritten and print text, if any. Include tables, "
    "captions, headers, main text and all other visible text.\n\n"
    "3. If you encounter any non-text elements, simply skip them without attempting to "
    "describe them.\n\n"
    "4. Do not modernize or standardize the text. For example, if the transcription is using "
    '"ſ" instead of "s" or "а" instead of "a", keep it that way.\n\n'
    "5. When you come across text in languages other than English, transcribe it as "
    "accurately as possible without translation.\n\n"
    "6. Output the OCR result in the following format:\n\n"
    "<output>\nextracted text here\n</output>\n\n"
    "Remember, your goal is to accurately transcribe the text from the scanned page as much "
    "as possible. Process the entire page, even if it contains a large amount of text, and "
    "provide clear, well-formatted output. Pay attention to the appropriate reading order "
    "and layout of the text."
)
# CHURRO was trained with this system message and no user text (churro_ocr preset).
CHURRO_SYSTEM_PROMPT = "Transcribe the entirety of this historical document to XML format."

_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)
_OUTPUT = re.compile(r"<output>(.*?)(?:</output>|$)", re.DOTALL)
_LINE_BREAK_TAGS = re.compile(r"</[^>]+>|<[^>]*/>|<br[^>]*>", re.IGNORECASE)
_TAG = re.compile(r"<[^>]*>")
# CHURRO starts its answer with <Metadata> (language, a description of the page),
# which is not transcription.
_COMMENTARY = re.compile(r"<(Metadata|Description|PhysicalDescription)\b[^>]*>.*?</\1>", re.DOTALL)


def output_tag_text(raw: str) -> str:
    raw = _THINK.sub("", raw)
    match = _OUTPUT.search(raw)
    return (match.group(1) if match else raw).strip()


def xml_text(raw: str) -> str:
    """Plain text of CHURRO's XML answer: one line per closed element, tags and
    generated commentary removed."""
    raw = _COMMENTARY.sub("", _THINK.sub("", raw))
    raw = re.sub(r"<\?xml[^>]*\?>", "", raw)
    text = _TAG.sub("", _LINE_BREAK_TAGS.sub("\n", raw))
    lines = (html.unescape(line).strip() for line in text.splitlines())
    return "\n".join(line for line in lines if line)


PRESETS = {
    "qwen3.5-9b": {
        "model": "mlx-community/Qwen3.5-9B-8bit",
        "system": DEFAULT_SYSTEM_PROMPT,
        "user": DEFAULT_USER_PROMPT,
        "max_side": 2048,
        "postprocess": output_tag_text,
    },
    "churro-3b": {
        "model": "stanford-oval/churro-3B",
        "system": CHURRO_SYSTEM_PROMPT,
        "user": "",
        "max_side": 2500,  # churro_ocr's MAX_INLINE_IMAGE_DIM
        "postprocess": xml_text,
    },
}


class VLM:
    task = "htr"

    def __init__(self, preset: str, max_tokens: int = 4096):
        from mlx_vlm import load

        config = PRESETS[preset]
        self.max_side = config["max_side"]
        self.max_tokens = max_tokens
        self.postprocess = config["postprocess"]
        self.messages = [
            {"role": "system", "content": config["system"]},
            {"role": "user", "content": config["user"]},
        ]
        self.model, self.processor = load(config["model"])
        self.tmp = tempfile.TemporaryDirectory(prefix="bench-vlm-")
        self.info = {
            "model": config["model"],
            "runtime": f"mlx-vlm {version('mlx-vlm')}",
            "max_side": self.max_side,
            "max_tokens": max_tokens,
            "temperature": 0.0,
            "prompt": self.messages,
        }

    def transcribe(self, page) -> Prediction:
        from mlx_vlm import generate
        from mlx_vlm.prompt_utils import apply_chat_template

        image = load_image(page.image_path)
        image.thumbnail((self.max_side, self.max_side))
        path = Path(self.tmp.name) / "page.png"
        image.save(path)
        prompt = apply_chat_template(
            self.processor,
            self.model.config,
            self.messages,
            num_images=1,
            enable_thinking=False,
        )
        start = perf_counter()
        result = generate(
            self.model,
            self.processor,
            prompt,
            image=[str(path)],
            max_tokens=self.max_tokens,
            temperature=0.0,
            verbose=False,
        )
        elapsed = perf_counter() - start
        return Prediction(
            text=self.postprocess(result.text),
            timings={"recognition": elapsed, "total": elapsed},
            extra={
                "raw_output": result.text,
                "image_size": list(image.size),
                "prompt_tokens": result.prompt_tokens,
                "generation_tokens": result.generation_tokens,
                "truncated": result.generation_tokens >= self.max_tokens,
                "peak_memory_gb": result.peak_memory,
            },
        )
