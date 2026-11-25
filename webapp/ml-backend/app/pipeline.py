"""Page manuscrite → texte : segmentation Kraken BLLA puis reconnaissance TrOCR.

Portage du notebook english_cursive_mvp.ipynb (Polina) : mêmes prétraitements,
même regroupement des fragments BLLA et mêmes paramètres de génération.
"""

import math
import os
import re
import threading
from importlib import resources

import torch
from gliner import GLiNER
from kraken import blla
from kraken.lib import vgsl
from PIL import Image, ImageOps
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

TROCR_MODEL = os.environ.get("TROCR_MODEL", "microsoft/trocr-small-handwritten")
TROCR_REVISION = os.environ.get("TROCR_REVISION")
TROCR_NUM_BEAMS = int(os.environ.get("TROCR_NUM_BEAMS", "2"))
TROCR_BATCH_SIZE = int(os.environ.get("TROCR_BATCH_SIZE", "4"))
DEVICE = os.environ.get("DEVICE", "cpu")
GLINER_MODEL = os.environ.get("GLINER_MODEL", "urchade/gliner_small-v2.1")
ENTITY_LABELS = ("person", "location")

STRICT_DATE_RE = re.compile(
    r"""
    (?<!\w)
    (?:
        (?:0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+
        (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|
           Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Sept|Oct(?:ober)?|
           Nov(?:ember)?|Dec(?:ember)?)\s+
        (?:1\d{3}|20\d{2})
        |
        (?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:1\d{3}|20\d{2})
        |
        (?:1\d{3}|20\d{2})
    )
    (?!\w)
    """,
    re.IGNORECASE | re.VERBOSE,
)

# BLLA redimensionne la page à 1800 px de haut, donc la mémoire croît avec le ratio
# largeur/hauteur. Avec oneDNN, une page de ratio 1,38 tue déjà un conteneur dans une
# VM Docker de 4 Go (OOM) ; sans oneDNN le pic est d'environ 3,4 Go.
torch.backends.mkldnn.enabled = os.environ.get("MKLDNN", "0") == "1"
# Au-delà de ce ratio, on complète l'image par du blanc en bas avant BLLA
# (une bande d'une seule ligne de 1159x68 px ferait ~30 000 px de large).
MAX_ASPECT = float(os.environ.get("MAX_ASPECT", "1.4"))


def baseline_y(line):
    return sum(point[1] for point in line.baseline) / len(line.baseline)


def group_blla_fragments(lines, y_tolerance=60):
    # BLLA renvoie parfois les morceaux gauche/droite d'une même ligne manuscrite.
    groups = []
    for line in sorted(lines, key=baseline_y):
        y = baseline_y(line)
        if groups and abs(y - groups[-1]["mean_y"]) <= y_tolerance:
            groups[-1]["lines"].append(line)
            values = [baseline_y(item) for item in groups[-1]["lines"]]
            groups[-1]["mean_y"] = sum(values) / len(values)
        else:
            groups.append({"mean_y": y, "lines": [line]})
    return groups


def group_tokens(tokens, probs, to_string, word_start="\u2581"):
    """Regroupe les tokens SentencePiece d'une ligne en mots.

    Un token qui commence par « ▁ » ouvre un mot. La confiance d'un mot (et de la
    ligne) est la moyenne des probabilités de ses tokens.
    """
    # 1. On découpe la suite de tokens en mots.
    words = []
    for i in range(len(tokens)):
        token = tokens[i]
        prob = probs[i]
        if token.startswith(word_start) or len(words) == 0:
            words.append({"tokens": [], "probs": []})
        current_word = words[-1]
        current_word["tokens"].append(token)
        current_word["probs"].append(prob)

    # 2. Pour chaque mot : son texte et la moyenne des probabilités de ses tokens.
    result = []
    for word in words:
        text = to_string(word["tokens"]).strip()
        if text == "":
            continue
        confidence = sum(word["probs"]) / len(word["probs"])
        result.append({"text": text, "confidence": confidence})

    # 3. La confiance de la ligne : moyenne des probabilités de tous ses tokens.
    if len(probs) == 0:
        line_confidence = None
    else:
        line_confidence = sum(probs) / len(probs)
    return result, line_confidence


def normalize_entity_text(text: str) -> str:
    """Replace line breaks with spaces without changing character offsets."""
    return text.replace("\r\n", "  ").replace("\r", " ").replace("\n", " ")


def extract_strict_dates(text: str):
    """Find only full day-month-year dates, numeric dates, and standalone years."""
    return [
        {
            "text": match.group(0),
            "label": "date",
            "start": match.start(),
            "end": match.end(),
            # A rule match has no model confidence.
            "score": None,
        }
        for match in STRICT_DATE_RE.finditer(text)
    ]


class Pipeline:
    """Charge BLLA + TrOCR une seule fois et sérialise les inférences."""

    def __init__(self):
        self.seg_model = vgsl.TorchVGSLModel.load_model(
            str(resources.files("kraken").joinpath("blla.mlmodel"))
        )
        self.processor = TrOCRProcessor.from_pretrained(
            TROCR_MODEL, revision=TROCR_REVISION
        )
        self.model = VisionEncoderDecoderModel.from_pretrained(
            TROCR_MODEL, revision=TROCR_REVISION, use_safetensors=True
        ).to(DEVICE)
        self.model.eval()
        self._lock = threading.Lock()

    def segment(self, image, y_tolerance=60, padding=12):
        # Un contraste renforcé aide BLLA et TrOCR sur l'encre bleue pâle.
        prepared = ImageOps.autocontrast(ImageOps.grayscale(image)).convert("RGB")
        padded = prepared
        if prepared.width / prepared.height > MAX_ASPECT:
            padded = Image.new(
                "RGB", (prepared.width, math.ceil(prepared.width / MAX_ASPECT)), "white"
            )
            padded.paste(prepared, (0, 0))
        segmentation = blla.segment(
            padded, text_direction="horizontal-lr", model=self.seg_model, device=DEVICE
        )
        groups = group_blla_fragments(segmentation.lines, y_tolerance=y_tolerance)

        crops = []
        boxes = []
        for group in groups:
            points = [
                p for line in group["lines"] for p in (line.boundary or line.baseline)
            ]
            left = max(0, int(min(p[0] for p in points)) - padding)
            top = max(0, int(min(p[1] for p in points)) - padding)
            right = min(prepared.width, int(max(p[0] for p in points)) + padding + 1)
            bottom = min(prepared.height, int(max(p[1] for p in points)) + padding + 1)
            boxes.append((left, top, right, bottom))
            crops.append(prepared.crop((left, top, right, bottom)))
        return len(segmentation.lines), crops, boxes

    def transcribe_lines(self, images, batch_size=TROCR_BATCH_SIZE):
        tokenizer = self.processor.tokenizer
        special_ids = set(tokenizer.all_special_ids)
        results = []
        for start in range(0, len(images), batch_size):
            batch = images[start : start + batch_size]
            pixel_values = self.processor(
                images=batch, return_tensors="pt"
            ).pixel_values.to(DEVICE)
            with torch.inference_mode():
                generated_ids = self.model.generate(
                    pixel_values,
                    max_new_tokens=128,
                    num_beams=TROCR_NUM_BEAMS,
                    return_dict_in_generate=True,
                    output_scores=True,
                )
                # Log-probabilité de chaque token retenu dans le meilleur faisceau.
                scores = self.model.compute_transition_scores(
                    generated_ids.sequences,
                    generated_ids.scores,
                    getattr(generated_ids, "beam_indices", None),
                    # Beam search already returns log-probabilities. Greedy
                    # decoding returns raw logits and needs explicit normalization.
                    normalize_logits=TROCR_NUM_BEAMS == 1,
                )
            texts = self.processor.batch_decode(
                generated_ids.sequences, skip_special_tokens=True
            )
            # Une ligne de l'image par tour de boucle.
            for line_number in range(len(texts)):
                # sequences commence par le token de départ du décodeur, sans score :
                # on le saute pour que token_ids[i] corresponde à log_probs[i].
                token_ids = generated_ids.sequences[line_number][1:].tolist()
                log_probs = scores[line_number].tolist()

                tokens = []
                probs = []
                for i in range(len(token_ids)):
                    token_id = token_ids[i]
                    if token_id == tokenizer.eos_token_id:
                        break
                    if token_id in special_ids:
                        continue
                    tokens.append(tokenizer.convert_ids_to_tokens(token_id))
                    # Le modèle donne log(p) : exp() redonne la probabilité p.
                    probs.append(math.exp(log_probs[i]))

                words, confidence = group_tokens(
                    tokens, probs, tokenizer.convert_tokens_to_string
                )
                results.append(
                    {
                        "text": texts[line_number].strip(),
                        "confidence": confidence,
                        "words": words,
                    }
                )
        return results

    def __call__(self, image: Image.Image, y_tolerance=60):
        with self._lock:
            n_fragments, crops, boxes = self.segment(image, y_tolerance=y_tolerance)
            lines = self.transcribe_lines(crops)
        texts = []
        for line in lines:
            texts.append(line["text"])
        result = {
            # GLiNER needs the context across adjacent lines. Keep individual
            # line geometry below, but expose the page as one space-joined text.
            "text": " ".join(texts),
            "lines": [
                {"index": i, "text": t, "bbox": list(b)}
                for i, (t, b) in enumerate(zip(texts, boxes, strict=True), start=1)
            ],
            "n_fragments": n_fragments,
            "image_size": list(image.size),
            "models": {
                "segmentation": "kraken-blla (default)",
                "recognition": TROCR_MODEL,
            },
        }
        # Ajoute à chaque ligne sa confiance et celle de ses mots.
        for i in range(len(lines)):
            result["lines"][i]["confidence"] = lines[i]["confidence"]
            result["lines"][i]["words"] = lines[i]["words"]
        return result


class EntityRecognizer:
    """Extracts named entities from OCR text with a pretrained GLiNER model."""

    def __init__(self):
        self.model = GLiNER.from_pretrained(GLINER_MODEL)
        self._lock = threading.Lock()

    def __call__(self, text: str, threshold: float = 0.5):
        normalized_text = normalize_entity_text(text)
        with self._lock:
            entities = self.model.predict_entities(
                normalized_text, list(ENTITY_LABELS), threshold=threshold
            )
        recognized = [
            {
                "text": entity["text"],
                "label": entity["label"],
                "start": entity["start"],
                "end": entity["end"],
                "score": entity["score"],
            }
            for entity in entities
        ]
        dates = extract_strict_dates(normalized_text)
        date_spans = [(date["start"], date["end"]) for date in dates]
        recognized = [
            entity
            for entity in recognized
            if not any(
                entity["start"] < date_end and entity["end"] > date_start
                for date_start, date_end in date_spans
            )
        ]
        return sorted([*recognized, *dates], key=lambda entity: entity["start"])
