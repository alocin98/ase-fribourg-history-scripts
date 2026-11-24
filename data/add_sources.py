# /// script
# requires-python = ">=3.12"
# dependencies = ["pyarrow==26.0.1", "pillow==13.0.0", "lingua-language-detector==2.2.0"]
# ///
"""Adds test pages from two datasets that were published after the models we benchmark
were trained, so no model can have seen them (see ml-models/benchmark/bench/overlap.py):

- Grand Tour HTR (Herzog August Bibliothek, zenodo 23056692, 2026-09-30, CC-BY-SA 4.0):
  German travel diaries of the 17th century -> de_pre1700.
- Laßberg letters (dh-unibe/lassberg-letters-htr, 2026-11-03, CC-BY 4.0): letters to and
  from Joseph von Laßberg, 1805-1853, mostly Kurrent -> de_post1700 (French letters ->
  fr_post1700). Its test split only.

    uv run data/add_sources.py      # after ./data/download_manuscripts.sh test

Pages go to data/manuscripts/test/<group>/ like the others, their labels to
data/manuscripts/metadata_added.csv (not metadata.csv, which the v1 download
overwrites). The downloads are pinned and checked, the page choice is fixed, so the
result is the same on every machine. Running it again rewrites the same pages.
"""

import csv
import hashlib
import io
import random
import re
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree

import pyarrow.parquet as pq
from lingua import Language, LanguageDetectorBuilder
from PIL import Image

OUT = Path(__file__).resolve().parent / "manuscripts"
CACHE = OUT / "_sources"
METADATA = OUT / "metadata_added.csv"
COLUMNS = (
    "page_id,split,group,language,not_before,not_after,date,date_precision,source,doc_id,"
    "image,xml,text,xml_format,image_width,image_height,xml_matches_image,n_lines,n_chars,"
    "lang_detected,lang_margin,original_xml,original_image"
).split(",")

GRAND_TOUR = "https://zenodo.org/records/23056692/files/{}?download=1"
# zip -> (md5, first year, last year). The 1701-1702 diaries are left out: four copies of
# one text, and de_post1700 gets the Laßberg letters.
GRAND_TOUR_DIARIES = {
    "wagener_1652-1659.zip": ("f2c18560cedbe4e5d20d75288937b439", 1652, 1659),
    "christian_august_1664-1669.zip": ("d21edadedfc0ab21daeac31343447c5c", 1664, 1669),
    "ludwig_rudolf_1689.zip": ("90cb82b80c565bc734b7934cbd23a543", 1689, 1689),
}
GRAND_TOUR_PAGES = 10  # per diary
# Transkribus status of pages with a corrected transcription. The 1664-1669 diary is all
# DONE; NEW and IN_PROGRESS pages are uncorrected or empty.
CORRECTED = {"GT", "FINAL", "DONE"}
MIN_LINES = 10

LASSBERG_REVISION = "984d4240a2b52cbe76b3d1f19e901af463e011cf"
LASSBERG = (
    "https://huggingface.co/datasets/dh-unibe/lassberg-letters-htr/resolve/"
    f"{LASSBERG_REVISION}/data/test-00000-of-00001.parquet"
)
LASSBERG_SHA256 = "e59760991257f4dd58b5fcfc1824eeb9bf7c15c1a3e6a2cc9943fd9a5de51b1b"
# Dates from the register of the Laßberg edition (github.com/michaelscho/lassberg,
# data/register/register.csv). The three letters from Ms. K 2911 are not in it.
LASSBERG_DATES = {
    "0077": "1805-09-21",
    "0892": "1824-01-20",
    "1209": "1827-12-14",
    "1486": "1830-10-01",
    "1508": "1831-01-18",
    "1779": "1834-06-05",
    "1781": "1834-06-06",
    "2319": "1842-04-07",
    "2921": "1850-06-26",
}
LASSBERG_RANGE = (1805, 1855)  # Laßberg's correspondence in the dataset

LANGUAGES = {
    Language.GERMAN: "de",
    Language.FRENCH: "fr",
    Language.ENGLISH: "en",
    Language.LATIN: "la",
}
DETECTOR = LanguageDetectorBuilder.from_languages(*LANGUAGES).build()


def download(url: str, path: Path, md5: str | None = None, sha256: str | None = None):
    if not path.exists():
        print(f"downloading {path.name}")
        path.parent.mkdir(parents=True, exist_ok=True)
        partial = path.with_suffix(path.suffix + ".part")
        urllib.request.urlretrieve(url, partial)
        partial.rename(path)
    for algorithm, expected in (("md5", md5), ("sha256", sha256)):
        if expected and hashlib.file_digest(path.open("rb"), algorithm).hexdigest() != expected:
            raise SystemExit(f"{path}: {algorithm} mismatch, delete it and run again")


def tag(element) -> str:
    return element.tag.rsplit("}", 1)[-1]


def page_lines(root) -> list[str]:
    lines = []
    for line in (e for e in root.iter() if tag(e) == "TextLine"):
        equiv = next((c for c in line if tag(c) == "TextEquiv"), [])
        unicode = next((u for u in equiv if tag(u) == "Unicode"), None)
        text = (unicode.text or "") if unicode is not None else ""
        if text.strip():
            lines.append(text)
    return lines


def language(text: str) -> tuple[str | None, float | None]:
    values = DETECTOR.compute_language_confidence_values(text)
    if not values:
        return None, None
    margin = values[0].value - (values[1].value if len(values) > 1 else 0)
    return LANGUAGES[values[0].language], round(margin, 3)


def page_id(source: str, stem: str, original: str) -> str:
    return f"{source}__{stem}__{hashlib.sha1(original.encode()).hexdigest()[:6]}"


def write_page(row: dict, image: Image.Image, xml: bytes, lines: list[str], ext: str):
    group_dir = OUT / "test" / row["group"]
    group_dir.mkdir(parents=True, exist_ok=True)
    pid = row["page_id"]
    root = ElementTree.fromstring(xml)
    for element in root.iter():
        if tag(element) == "Page":
            element.set("imageFilename", f"{pid}.{ext}")
            matches = (
                int(element.get("imageWidth", 0)),
                int(element.get("imageHeight", 0)),
            ) == image.size
    namespace = root.tag[1:].split("}")[0]
    ElementTree.register_namespace("", namespace)
    image.save(group_dir / f"{pid}.{ext}", quality=95) if ext == "jpg" else image.save(
        group_dir / f"{pid}.{ext}"
    )
    ElementTree.ElementTree(root).write(group_dir / f"{pid}.xml", "utf-8", xml_declaration=True)
    text = "\n".join(lines) + "\n"
    (group_dir / f"{pid}.txt").write_text(text, encoding="utf-8")
    lang, margin = language(text)
    row.update(
        split="test",
        language=row["group"][:2],
        image=f"test/{row['group']}/{pid}.{ext}",
        xml=f"test/{row['group']}/{pid}.xml",
        text=f"test/{row['group']}/{pid}.txt",
        xml_format="page",
        image_width=image.size[0],
        image_height=image.size[1],
        xml_matches_image=matches,
        n_lines=len(lines),
        n_chars=len(text.replace("\n", "")),
        lang_detected=lang,
        lang_margin=margin,
    )
    return row


def grand_tour() -> list[dict]:
    rows = []
    for name, (md5, first, last) in GRAND_TOUR_DIARIES.items():
        path = CACHE / "grand_tour" / name
        download(GRAND_TOUR.format(name), path, md5=md5)
        with zipfile.ZipFile(path) as archive:
            candidates = []
            for member in sorted(archive.namelist()):
                if "/page/" not in member or not member.endswith(".xml"):
                    continue
                xml = archive.read(member)
                root = ElementTree.fromstring(xml)
                meta = next((e for e in root.iter() if tag(e) == "TranskribusMetadata"), None)
                lines = page_lines(root)
                if meta is None or meta.get("status") not in CORRECTED or len(lines) < MIN_LINES:
                    continue
                if language("\n".join(lines))[0] != "de":
                    continue  # French or Latin passages
                page = next(e for e in root.iter() if tag(e) == "Page")
                image_member = member.replace("/page/", "/").rsplit("/", 1)[0] + "/"
                image_member += page.get("imageFilename")
                candidates.append((member, image_member, xml, lines))
            random.Random(f"grand_tour-{name}").shuffle(candidates)
            for member, image_member, xml, lines in sorted(candidates[:GRAND_TOUR_PAGES]):
                diary = name.removesuffix(".zip")
                manuscript = member.split("/")[1]
                stem = f"{manuscript}_{Path(member).stem}"
                image = Image.open(io.BytesIO(archive.read(image_member))).convert("RGB")
                row = {
                    "page_id": page_id("grand_tour", stem, member),
                    "group": "de_pre1700",
                    "not_before": first,
                    "not_after": last,
                    "date": first if first == last else "",
                    "date_precision": "year" if first == last else "range",
                    "source": "grand_tour",
                    "doc_id": f"grand_tour/{diary}",
                    "original_xml": member,
                    "original_image": image_member,
                }
                rows.append(write_page(row, image, xml, lines, "jpg"))
    return rows


def lassberg() -> list[dict]:
    path = CACHE / "lassberg" / f"test-{LASSBERG_REVISION[:7]}.parquet"
    download(LASSBERG, path, sha256=LASSBERG_SHA256)
    rows = []
    for record in pq.read_table(path).to_pylist():
        number = re.search(r"lassberg-letter-(\d{4})", record["doc_id"])
        date = LASSBERG_DATES.get(number.group(1)) if number else None
        year = int(date[:4]) if date else None
        stem = f"{record['doc_id']}_{record['page_id']}".replace(" ", "_").replace(",", "-")
        root = ElementTree.fromstring(record["page_xml"].encode())
        lines = page_lines(root)
        if "\n".join(lines) != record["text_cleaned"].strip("\n"):
            # The cleaned text resolves editorial brackets; use it as the reference.
            lines = record["text_cleaned"].strip("\n").split("\n")
        lang = language("\n".join(lines))[0]
        if len(lines) < 3 or lang not in ("de", "fr"):
            continue  # blank pages, envelopes
        image = Image.open(io.BytesIO(record["image"]["bytes"]))
        row = {
            "page_id": page_id("lassberg", stem, f"{record['doc_folder']}/{record['page_id']}"),
            "group": f"{lang}_post1700",  # some letters are in French
            "not_before": year or LASSBERG_RANGE[0],
            "not_after": year or LASSBERG_RANGE[1],
            "date": date or "",
            "date_precision": "day" if date else "range",
            "source": "lassberg",
            "doc_id": f"lassberg/{record['doc_id']}",
            "original_xml": f"{record['doc_folder']}/{record['page_id']}",
            "original_image": f"{record['doc_folder']}/{record['page_id']}",
        }
        rows.append(write_page(row, image.convert("RGB"), record["page_xml"].encode(), lines, "png"))
    return rows


def main():
    rows = grand_tour() + lassberg()
    with METADATA.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, COLUMNS)
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda r: r["page_id"]))
    print(f"{len(rows)} pages, labels in {METADATA}")


if __name__ == "__main__":
    main()
