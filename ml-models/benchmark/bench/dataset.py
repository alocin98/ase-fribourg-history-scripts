"""Test pages of data/manuscripts and the two fixed page sets."""

import csv
import random
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from xml.etree import ElementTree

BENCH_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BENCH_DIR.parents[1]
REPORTS_DIR = BENCH_DIR.parent / "reports"
MODELS_DIR = BENCH_DIR.parent / "models"  # weights, not committed
DATA_DIR = REPO_ROOT / "data" / "manuscripts"
SETS_DIR = BENCH_DIR / "subsets"

SETS = {
    "quick": "5 pages per language/era group, those the fewest models were trained on",
    "full": "the whole test split without pages whose transcription leaves out text",
}
# Pages with printed or stamped text that the human transcription leaves out: a model
# that reads it gets every word counted as an error. Checked by eye on 2026-11-23.
# - Valais census: printed forms, only the handwritten entries are transcribed.
# - Poilus wills: every test page has court and registration stamps and notes
#   ("Enregistré à Paris ...") that are not transcribed, only the will itself.
EXCLUDED_SOURCES = {"valais_de", "valais_fr", "poilus_testaments"}
# - Denver JCRS: only the handwriting is transcribed; these pages also have a printed
#   letterhead, stamp or form (a telegram, a receipt).
EXCLUDED_PAGES = {
    "denver_jcrs__page_B002_01_0104_0144_007__0af3b3",
    "denver_jcrs__page_B002_01_0105_0060_005__36aef3",
    "denver_jcrs__page_B002_01_0105_0135_021__0da96a",
    "denver_jcrs__page_B002_01_0105_0148_007__8be149",
    "denver_jcrs__page_B002_01_0107_0030_026__302938",
    "denver_jcrs__page_B002_01_0108_0024_003__685c42",
    "denver_jcrs__page_B002_01_0108_0048_004__d2726f",
    "denver_jcrs__page_B002_01_0108_0132_002__84c20f",
    "denver_jcrs__page_B002_01_0113_0158_001__08db5b",
    "denver_jcrs__page_B002_01_0117_0147_007__cb0b2f",
}


def excluded(page) -> bool:
    return page.source in EXCLUDED_SOURCES or page.page_id in EXCLUDED_PAGES


@dataclass(frozen=True)
class Line:
    text: str
    bbox: tuple[int, int, int, int] | None  # left, top, right, bottom


@dataclass(frozen=True)
class Page:
    page_id: str
    group: str
    language: str
    source: str
    doc_id: str
    image_path: Path
    xml_path: Path
    text_path: Path

    @cached_property
    def text(self) -> str:
        return self.text_path.read_text(encoding="utf-8")

    @cached_property
    def lines(self) -> list[Line]:
        return parse_lines(self.xml_path)


def load_pages(split: str = "test") -> list[Page]:
    """The pages of the v1 release (metadata.csv) and the pages that data/add_sources.py
    adds (metadata_added.csv)."""
    metadata = DATA_DIR / "metadata.csv"
    if not metadata.exists():
        raise SystemExit(f"{metadata} not found, run ./data/download_manuscripts.sh {split}")
    rows = []
    for path in (metadata, DATA_DIR / "metadata_added.csv"):
        if path.exists():
            with path.open(encoding="utf-8") as f:
                rows += [row for row in csv.DictReader(f) if row["split"] == split]
    missing = [row["image"] for row in rows if not (DATA_DIR / row["image"]).exists()]
    if missing:
        raise SystemExit(
            f"{len(missing)} page images missing (e.g. {missing[0]}): run "
            f"./data/download_manuscripts.sh {split}, then uv run data/add_sources.py"
        )
    pages = [
        Page(
            row["page_id"],
            row["group"],
            row["language"],
            row["source"],
            row["doc_id"],
            DATA_DIR / row["image"],
            DATA_DIR / row["xml"],
            DATA_DIR / row["text"],
        )
        for row in rows
    ]
    return sorted(pages, key=lambda p: p.page_id)


def read_set(name: str, sets_dir: Path = SETS_DIR) -> list[str]:
    lines = (sets_dir / f"{name}.txt").read_text().splitlines()
    return [line for line in lines if line and not line.startswith("#")]


def select(pages: list[Page], set_name: str, limit: int | None = None) -> list[Page]:
    by_id = {p.page_id: p for p in pages}
    return [by_id[page_id] for page_id in read_set(set_name)][:limit]


def make_sets(pages: list[Page], per_group: int = 5, seed: int = 42, seen_by=None) -> dict:
    """`quick` takes the pages that the fewest benchmarked models were trained on
    (`seen_by(page)`, see overlap.py), and among those pages from different documents
    where a group has enough of them."""
    if seen_by is None:
        from .overlap import times_seen as seen_by
    full = [p for p in pages if not excluded(p)]
    quick = []
    for group in sorted({p.group for p in full}):
        rng = random.Random(f"{seed}-{group}")
        in_group = [p for p in full if p.group == group]
        chosen = []
        for level in sorted({seen_by(p) for p in in_group}):
            candidates = [p for p in in_group if seen_by(p) == level]
            first_pages = {}
            for page in candidates:
                first_pages.setdefault(page.doc_id, page)
            firsts = [first_pages[doc] for doc in sorted(first_pages)]
            rest = [p for p in candidates if p not in firsts]
            rng.shuffle(firsts)
            rng.shuffle(rest)
            chosen += (firsts + rest)[: per_group - len(chosen)]
            if len(chosen) == per_group:
                break
        quick += chosen
    return {"quick": sorted(quick, key=lambda p: p.page_id), "full": full}


def write_sets(pages: list[Page], sets_dir: Path = SETS_DIR, force: bool = False):
    for name, chosen in make_sets(pages).items():
        path = sets_dir / f"{name}.txt"
        if path.exists() and not force:
            raise FileExistsError(f"{path} exists; changing it invalidates the baselines")
        header = f"# Page set '{name}': {SETS[name]}. Written by `python -m bench make-sets`."
        path.write_text("\n".join([header] + [p.page_id for p in chosen]) + "\n")
        print(f"{path}: {len(chosen)} pages")


def _tag(element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def _bbox(points: str):
    """Bounding box of "x,y x,y ..." (PAGE) or "x y x y ..." (ALTO)."""
    numbers = [float(n) for n in points.replace(",", " ").split()]
    xs, ys = numbers[0::2], numbers[1::2]
    return (round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))) if xs else None


def parse_lines(xml_path: Path) -> list[Line]:
    """Text lines of an ALTO or PAGE file in document order, without empty lines."""
    root = ElementTree.parse(xml_path).getroot()
    lines = []
    for element in root.iter():
        if _tag(element) != "TextLine":
            continue
        if _tag(root) == "alto":
            words = []
            for child in element:
                if _tag(child) == "String":
                    words.append(child.get("CONTENT", ""))
                elif _tag(child) == "HYP" and words:
                    words[-1] += child.get("CONTENT", "")
            text = " ".join(word for word in words if word)
            if element.get("HPOS"):
                x, y, w, h = (float(element.get(k)) for k in ("HPOS", "VPOS", "WIDTH", "HEIGHT"))
                bbox = _bbox(f"{x} {y} {x + w} {y + h}")
            else:
                polygon = next((e for e in element.iter() if _tag(e) == "Polygon"), None)
                bbox = _bbox(polygon.get("POINTS", "")) if polygon is not None else None
        else:
            # The line's own TextEquiv, not the ones of its words.
            equiv = next((c for c in element if _tag(c) == "TextEquiv"), [])
            unicode = next((u for u in equiv if _tag(u) == "Unicode"), None)
            text = unicode.text or "" if unicode is not None else ""
            coords = next((c for c in element if _tag(c) == "Coords"), None)
            bbox = _bbox(coords.get("points", "")) if coords is not None else None
        if text.strip():
            lines.append(Line(text, bbox))
    return lines
