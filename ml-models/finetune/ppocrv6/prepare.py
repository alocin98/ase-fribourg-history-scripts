"""Compiles the train split of data/manuscripts into kraken binary datasets for
fine-tuning PP-OCRv6: work/data/train.arrow and work/data/val.arrow.

The test split is never touched: it is what the benchmark measures. The validation set
is taken from the train split by whole documents (doc_id), so validation pages never
share a document with training pages, like train and test.

    python prepare.py                    # whole train split
    python prepare.py --limit 20         # 20 train + 20 val pages, for a smoke test
"""

import argparse
import csv
import json
import os
import random
import re
import tempfile
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
DATA = REPO / "data" / "manuscripts"


def split_documents(rows, val_fraction, seed):
    """Per language/era group, holds out whole documents until about `val_fraction`
    of the group's pages are reached. Documents larger than twice the target are kept
    in train, so one long diary doesn't become the whole validation set."""
    rng = random.Random(seed)
    by_group = defaultdict(lambda: defaultdict(list))
    for row in rows:
        by_group[row["group"]][row["doc_id"]].append(row)

    train, val = [], []
    for group in sorted(by_group):
        docs = by_group[group]
        target = val_fraction * sum(len(pages) for pages in docs.values())
        names = sorted(docs)
        rng.shuffle(names)
        taken = 0
        for name in names:
            pages = docs[name]
            if taken < target and len(pages) <= max(2 * target - taken, 1):
                val += pages
                taken += len(pages)
            else:
                train += pages
    return train, val


def parse(row, patch_dir):
    """Parses a page's XML into a kraken Segmentation whose image is the dataset image.
    Some ALTO files (stabs_basel) name no image, so a copy with the image is parsed."""
    from kraken.lib.xml import XMLPage

    xml = DATA / row["xml"]
    image = (DATA / row["image"]).resolve()
    try:
        seg = XMLPage(xml).to_container()
    except ValueError:
        text = xml.read_text(encoding="utf-8")
        info = f"<sourceImageInformation><fileName>{image}</fileName></sourceImageInformation>"
        text, n = re.subn(r"(<Description>)", rf"\1{info}", text, count=1)
        if not n:
            raise
        patched = Path(patch_dir) / xml.name
        patched.write_text(text, encoding="utf-8")
        seg = XMLPage(patched).to_container()
    seg.imagename = image
    return seg


def compile_split(rows, output, workers, patch_dir):
    from kraken.lib.arrow_dataset import build_binary_dataset

    segs = [parse(row, patch_dir) for row in rows]
    lines = sum(len(seg.lines) for seg in segs)
    print(f"{output.name}: {len(segs)} pages, {lines} lines")
    build_binary_dataset(files=segs, output_file=str(output), format_type=None, num_workers=workers)
    return {"pages": len(segs), "lines": lines}


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=HERE / "work" / "data")
    parser.add_argument("--val-fraction", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--limit", type=int, help="pages per split, for a smoke test")
    parser.add_argument("--workers", type=int, default=min(os.cpu_count() or 1, 16))
    args = parser.parse_args()

    if not (DATA / "train").is_dir():
        raise SystemExit(f"{DATA / 'train'} is missing: run ./data/download_manuscripts.sh train")

    with open(DATA / "metadata.csv", newline="", encoding="utf-8") as f:
        rows = [row for row in csv.DictReader(f) if row["split"] == "train"]
    # One Königsfelden page has line coordinates for another image size.
    skipped = [row["page_id"] for row in rows if row["xml_matches_image"] != "True"]
    rows = [row for row in rows if row["xml_matches_image"] == "True"]

    train, val = split_documents(rows, args.val_fraction, args.seed)
    if args.limit:
        rng = random.Random(args.seed)
        train = rng.sample(train, min(args.limit, len(train)))
        val = rng.sample(val, min(args.limit, len(val)))

    args.out.mkdir(parents=True, exist_ok=True)
    summary = {"skipped_pages": skipped, "seed": args.seed, "limit": args.limit}
    with tempfile.TemporaryDirectory() as patch_dir:
        summary["train"] = compile_split(train, args.out / "train.arrow", args.workers, patch_dir)
        summary["val"] = compile_split(val, args.out / "val.arrow", args.workers, patch_dir)
    summary["val_documents"] = sorted({row["doc_id"] for row in val})
    (args.out / "split.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
