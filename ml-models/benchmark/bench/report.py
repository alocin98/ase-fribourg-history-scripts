"""Scores a run against the human transcription, writes its report to reports/ and
updates the leaderboard."""

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from statistics import fmean

from .dataset import BENCH_DIR, REPORTS_DIR, SETS, Page, load_pages
from .metrics import VIEWS, Counts, bootstrap_interval, edits, match_lines, normalized
from .run import BASELINES_DIR, read_records
from .systems import SYSTEMS
from .systems.vlm import PRESETS

LANGUAGES = {"de": "German", "fr": "French", "en": "English", "la": "Latin"}


@dataclass
class LineScore:
    gt: int
    pred: int
    matched: int
    chars: Counts  # normalized text of the matched lines


@dataclass
class Score:
    page: Page
    chars: dict[str, Counts]  # by text view (strict, normalized)
    words: dict[str, Counts]
    lines: LineScore | None
    record: dict


@dataclass
class Run:
    path: Path
    meta: dict
    scores: list[Score]
    errors: dict[str, str]

    @property
    def label(self) -> str:
        return SYSTEMS[self.meta["system"]].label

    @property
    def name(self) -> str:
        """Name in the tables: the candidate in bold, baselines marked as such."""
        if SYSTEMS[self.meta["system"]].baseline:
            return f"{self.label} (baseline)"
        return f"**{self.label}**"

    @property
    def set_name(self) -> str:
        return self.meta["set"]


def score_lines(page: Page, pred: list[dict]) -> LineScore | None:
    if not pred or any(line["bbox"] is None for line in pred):
        return None
    gt = page.lines
    matches = match_lines([line.bbox for line in gt], [line["bbox"] for line in pred])
    chars = sum(
        (edits(normalized(gt[i].text), normalized(pred[j]["text"])) for i, j in matches),
        Counts(),
    )
    return LineScore(len(gt), len(pred), len(matches), chars)


def score_page(page: Page, record: dict) -> Score:
    ref, hyp = page.text, record.get("text") or ""
    return Score(
        page,
        chars={view: edits(f(ref), f(hyp)) for view, f in VIEWS.items()},
        words={view: edits(f(ref).split(), f(hyp).split()) for view, f in VIEWS.items()},
        lines=score_lines(page, record.get("lines") or []),
        record=record,
    )


def load_run(path: Path, pages: dict[str, Page]) -> Run:
    meta = json.loads((path / "meta.json").read_text())
    # The raw answers of the vision-language models are parsed again here, so a
    # parsing fix needs no new run.
    parse = PRESETS.get(meta["system"], {}).get("postprocess")
    scores, errors = [], {}
    for page_id, record in read_records(path).items():
        if "error" in record:
            errors[page_id] = record["error"]
            continue
        if parse:
            record["text"] = parse(record["extra"]["raw_output"])
        scores.append(score_page(pages[page_id], record))
    return Run(path, meta, scores, errors)


def load_baselines(set_name: str, pages: dict[str, Page]) -> list[Run]:
    paths = [BASELINES_DIR / set_name / name for name, s in SYSTEMS.items() if s.baseline]
    return [load_run(path, pages) for path in paths if (path / "meta.json").exists()]


def pct(value: float | None) -> str:
    return "–" if value is None else f"{100 * value:.1f}"


def num(value: float | None) -> str:
    return "–" if value is None else f"{value:.1f}"


def total(scores: list[Score], kind="chars", view="normalized") -> Counts:
    return sum((getattr(s, kind)[view] for s in scores), Counts())


def rate(scores: list[Score], kind="chars", view="normalized") -> float | None:
    return total(scores, kind, view).rate()


def rate_with_interval(scores: list[Score], kind: str) -> str:
    per_doc = defaultdict(Counts)
    for s in scores:
        per_doc[s.page.doc_id] += getattr(s, kind)["normalized"]
    interval = bootstrap_interval(list(per_doc.values()))
    cell = pct(rate(scores, kind))
    return f"{cell} ({pct(interval[0])}–{pct(interval[1])})" if interval else cell


def accuracy(scores: list[Score]) -> float | None:
    if not scores:
        return None
    return sum(s.record["language"] == s.page.language for s in scores) / len(scores)


def mean_time(scores: list[Score], key: str = "total") -> float | None:
    values = [s.record["timings"][key] for s in scores if key in s.record["timings"]]
    return fmean(values) if values else None


def peak_memory_gb(run: Run) -> float | None:
    mlx = [s.record["extra"].get("peak_memory_gb", 0) for s in run.scores]
    return max(mlx, default=0) or run.meta.get("peak_rss_gb")


def group_by(items, key) -> dict:
    groups = defaultdict(list)
    for item in items:
        groups[key(item)].append(item)
    return dict(sorted(groups.items()))


def period(group: str) -> str:
    """de_pre1700 -> before 1700, en_post1800 -> 1800–1950"""
    year = group[-4:]
    return f"before {year}" if "_pre" in group else f"{year}–1950"


def table(header: list[str], rows: list[list]) -> str:
    lines = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    return "\n".join(lines + ["| " + " | ".join(map(str, row)) + " |" for row in rows])


def cer_by(runs: list[Run], key, column: str) -> str:
    grouped = [group_by(r.scores, key) for r in runs]
    rows = [
        [f"`{k}`", len(items), *(pct(rate(g[k])) for g in grouped)]
        for k, items in grouped[0].items()
    ]
    return table([column, "pages", *(r.name for r in runs)], rows)


def data_section(pages: list[Page], set_name: str) -> str:
    rows = [
        [
            f"`{group}`",
            LANGUAGES[items[0].language],
            period(group),
            len(items),
            ", ".join(sorted({p.source for p in items})),
        ]
        for group, items in group_by(pages, lambda p: p.group).items()
    ]
    return (
        f"## Data\n\n{len(pages)} pages of the test split of the historic manuscripts "
        "dataset v1 (`data/manuscripts`): whole-page scans with a human transcription. "
        f"Page set `{set_name}`: {SETS[set_name]} (`subsets/{set_name}.txt`).\n\n"
        + table(["group", "language", "period", "pages", "sources"], rows)
    )


def footer(run: Run, baselines: list[Run]) -> str:
    hw = run.meta["hardware"]
    lines = [
        f"Run `{run.path.name}` · commit `{run.meta.get('git_commit')}` · "
        f"{hw.get('cpu')}, {hw.get('memory_gb')} GB · {run.meta['started'][:10]}"
    ]
    lines += [
        f"Baseline {b.label}: `{b.meta['info']['model']}`, run on "
        f"{b.meta['started'][:10]} (`{b.path.relative_to(BENCH_DIR)}/`)"
        for b in baselines
    ]
    return "---\n\n" + "  \n".join(lines)


HOW_TO_READ = """## How to read this

- **CER / WER**: characters / words that differ from the human transcription
  (substituted, missing or added), in % of its length. Lower is better. It can go above
  100 when a model adds a lot of text.
- **Normalized**: case, accents, punctuation and old letter forms (ſ → s) are ignored,
  so models with different transcription conventions can be compared.
- **Brackets**: 95 % interval from resampling documents. When the ranges of two models
  overlap, the difference may be chance.
- **Errors by type**: substituted = misread, deleted = skipped, inserted = added words,
  in % of the words of the human transcription.
- **Baselines**: vision-language models we don't tune, run once on this page set.
- **Time / memory**: seconds per page without model loading, and peak memory, on the
  hardware in the footer."""

HOW_TO_READ_LID = """## How to read this

- **Accuracy**: pages whose detected language equals the dataset label. A page without
  usable text counts as wrong.
- Approach A transcribes the first 10 lines with McCATMuS and gives that text to lingua,
  which chooses between German, French, English and Latin."""


def transcription_report(run: Run, baselines: list[Run], details: bool):
    runs = [run, *baselines]
    common = set.intersection(*({s.page.page_id for s in r.scores} for r in runs))
    for r in runs:
        r.scores = [s for s in r.scores if s.page.page_id in common]
    pages = [s.page for s in run.scores]
    out = [
        f"# {run.label} on the `{run.set_name}` set ({len(pages)} pages)",
        data_section(pages, run.set_name),
    ]
    if len(pages) < len(run.meta["page_ids"]):
        out.append(
            f"> Only {len(pages)} of {len(run.meta['page_ids'])} pages are scored: the "
            "others failed or are missing from a baseline."
        )

    rows = [
        [
            r.name,
            rate_with_interval(r.scores, "chars"),
            rate_with_interval(r.scores, "words"),
            num(mean_time(r.scores)),
            num(peak_memory_gb(r)),
        ]
        for r in runs
    ]
    header = ["model", "CER %", "WER %", "s / page", "peak memory GB"]
    out.append("## Results (normalized, lower is better)\n\n" + table(header, rows))
    out.append("## CER by language and era (%)\n\n" + cer_by(runs, lambda s: s.page.group, "group"))
    rows = [
        [r.name, *(pct(total(r.scores, "words").rate(p)) for p in ("sub", "dele", "ins"))]
        for r in runs
    ]
    out.append(
        "## Word errors by type (% of reference words)\n\n"
        + table(["model", "substituted", "deleted", "inserted"], rows)
    )
    out.append(HOW_TO_READ)
    if details:
        out.append(transcription_details(run, runs))
    out.append(footer(run, baselines))

    summary = {
        "task": "htr",
        "label": run.label,
        "set": run.set_name,
        "pages": len(pages),
        "cer": rate(run.scores),
        "wer": rate(run.scores, "words"),
        "seconds_per_page": mean_time(run.scores),
        "date": run.meta["started"][:10],
    }
    return "\n\n".join(out) + "\n", summary


def transcription_details(run: Run, runs: list[Run]) -> str:
    rows = [
        [
            r.name,
            pct(rate(r.scores, "chars", "strict")),
            pct(rate(r.scores, "words", "strict")),
        ]
        for r in runs
    ]
    out = [
        "## Details",
        "### Strict scores (case, accents, punctuation and ſ count)\n\n"
        + table(["model", "CER %", "WER %"], rows),
        "### CER by source (%)\n\n" + cer_by(runs, lambda s: s.page.source, "source"),
    ]

    lines = [s.lines for s in run.scores if s.lines]
    if lines:
        gt = sum(x.gt for x in lines)
        pred = sum(x.pred for x in lines)
        matched = sum(x.matched for x in lines)
        line_cer = sum((x.chars for x in lines), Counts()).rate()
        header = ["human lines", "predicted", "matched", "precision %", "recall %"]
        row = [gt, pred, matched, pct(matched / pred), pct(matched / gt), pct(line_cer)]
        out.append(
            "### Line detection\n\nA predicted line matches a human line when their "
            "boxes overlap (IoU ≥ 0.3). Line CER uses matched lines only.\n\n"
            + table([*header, "line CER %"], [row])
        )

    rows = [
        [
            r.name,
            r.meta.get("load_seconds", "–"),
            num(mean_time(r.scores, "segmentation")),
            num(mean_time(r.scores, "recognition")),
            num(mean_time(r.scores)),
        ]
        for r in runs
    ]
    header = ["model", "loading", "segmentation", "recognition", "total per page"]
    out.append("### Time (seconds)\n\n" + table(header, rows))

    problems = [
        f"- truncated output ({r.label}): {s.page.page_id}"
        for r in runs
        for s in r.scores
        if s.record["extra"].get("truncated")
    ]
    problems += [
        f"- failed ({r.label}): {page_id}: {error}"
        for r in runs
        for page_id, error in sorted(r.errors.items())
    ]
    if problems:
        out.append("### Problems\n\n" + "\n".join(problems))
    return "\n\n".join(out)


def language_report(run: Run, details: bool):
    scores = run.scores
    out = [
        f"# {run.label} on the `{run.set_name}` set ({len(scores)} pages)",
        data_section([s.page for s in scores], run.set_name),
    ]
    by_language = group_by(scores, lambda s: s.page.language)
    rows = [
        [LANGUAGES[code], len(items), pct(accuracy(items))] for code, items in by_language.items()
    ]
    rows.append(["**all**", len(scores), f"**{pct(accuracy(scores))}**"])
    out.append(
        "## Results\n\n"
        + table(["language", "pages", "accuracy %"], rows)
        + f"\n\n{num(mean_time(scores))} s per page."
    )
    out.append(HOW_TO_READ_LID)
    if details:
        codes = [*LANGUAGES, None]
        counts = Counter((s.page.language, s.record["language"]) for s in scores)
        confusion = [[true, *(counts[true, code] for code in codes)] for true in by_language]
        rows = [
            [f"`{source}`", items[0].page.group, len(items), pct(accuracy(items))]
            for source, items in group_by(scores, lambda s: s.page.source).items()
        ]
        out.append(
            "## Details\n\n### Detected languages (rows: true language)\n\n"
            + table(["true \\ detected", *(code or "none" for code in codes)], confusion)
            + "\n\n### Accuracy by source\n\n"
            + table(["source", "group", "pages", "accuracy %"], rows)
        )
    out.append(footer(run, []))

    summary = {
        "task": "lid",
        "label": run.label,
        "set": run.set_name,
        "pages": len(scores),
        "accuracy": accuracy(scores),
        "seconds_per_page": mean_time(scores),
        "date": run.meta["started"][:10],
    }
    return "\n\n".join(out) + "\n", summary


def write_report(run_dir: Path, details: bool = False) -> Path:
    """Transcription reports go to ml-models/reports/, language detection reports
    to ml-models/reports/language-detection/."""
    pages = {p.page_id: p for p in load_pages()}
    run = load_run(run_dir, pages)
    if run.meta["task"] == "lid":
        text, summary = language_report(run, details)
        folder = REPORTS_DIR / "language-detection"
    else:
        system = run.meta["system"]
        baselines = load_baselines(run.set_name, pages)
        baselines = [b for b in baselines if b.meta["system"] != system]
        text, summary = transcription_report(run, baselines, details)
        folder = REPORTS_DIR
    path = folder / f"{run.meta['started'][:10]}_{run.meta['system']}_{run.set_name}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    update_leaderboard(str(path.relative_to(REPORTS_DIR)), summary, pages)
    return path


def update_leaderboard(report: str, summary: dict, pages: dict[str, Page]):
    """Keeps the headline numbers of every report in leaderboard.json and renders
    leaderboard.md from them and from the baselines."""
    store = REPORTS_DIR / "leaderboard.json"
    entries = json.loads(store.read_text()) if store.exists() else {}
    entries[report] = summary
    store.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n")

    out = [
        "# Leaderboard",
        "Headline numbers of every report and of the baselines, best first. "
        "Updated with every report.",
    ]
    for set_name in SETS:
        rows = [
            (
                f"[{e['label']}]({file})",
                e["date"],
                e["cer"],
                e["wer"],
                e["seconds_per_page"],
                e["pages"],
            )
            for file, e in entries.items()
            if e["task"] == "htr" and e["set"] == set_name
        ]
        rows += [
            (
                f"{b.label} (baseline)",
                b.meta["started"][:10],
                rate(b.scores),
                rate(b.scores, "words"),
                mean_time(b.scores),
                len(b.scores),
            )
            for b in load_baselines(set_name, pages)
        ]
        if rows:
            rows.sort(key=lambda row: row[2] if row[2] is not None else 9)
            rows = [[name, date, pct(c), pct(w), num(s), n] for name, date, c, w, s, n in rows]
            header = ["model", "date", "CER %", "WER %", "s / page", "pages"]
            out.append(
                f"## Transcription, `{set_name}` set (normalized, lower is better)\n\n"
                + table(header, rows)
            )

    lid = [(file, e) for file, e in entries.items() if e["task"] == "lid"]
    if lid:
        lid.sort(key=lambda item: -(item[1]["accuracy"] or 0))
        rows = [
            [
                f"[{e['label']}]({file})",
                f"`{e['set']}`",
                e["date"],
                pct(e["accuracy"]),
                num(e["seconds_per_page"]),
                e["pages"],
            ]
            for file, e in lid
        ]
        header = ["method", "set", "date", "accuracy %", "s / page", "pages"]
        out.append("## Language detection (higher is better)\n\n" + table(header, rows))
    (REPORTS_DIR / "leaderboard.md").write_text("\n\n".join(out) + "\n")
