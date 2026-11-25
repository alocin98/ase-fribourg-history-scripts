"""Runs a system over pages and stores what it answers: meta.json (models, settings,
hardware, commit) and pages.jsonl (one line per page). Scoring is done in report.py,
so metrics can change without running the models again."""

import json
import platform
import resource
import subprocess
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from time import perf_counter

from .dataset import BENCH_DIR, REPO_ROOT, Page
from .systems import SYSTEMS

RUNS_DIR = BENCH_DIR / "runs"
BASELINES_DIR = BENCH_DIR / "baselines"


def command(*args) -> str | None:
    try:
        result = subprocess.run(args, cwd=REPO_ROOT, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def hardware() -> dict:
    memory = command("sysctl", "-n", "hw.memsize")
    return {
        "cpu": command("sysctl", "-n", "machdep.cpu.brand_string") or platform.processor(),
        "memory_gb": round(int(memory) / 2**30, 1) if memory else None,
        "os": platform.platform(),
        "python": platform.python_version(),
    }


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def read_records(run_dir: Path) -> dict[str, dict]:
    """The last record per page: resuming a run appends retries of failed pages."""
    path = run_dir / "pages.jsonl"
    if not path.exists():
        return {}
    records = [json.loads(line) for line in path.read_text().splitlines() if line]
    return {record["page_id"]: record for record in records}


def run(name: str, pages: list[Page], set_name: str, run_dir: Path | None = None) -> Path:
    """Candidates go to runs/<time>_<system>_<set>/, baselines to baselines/<set>/<system>/.
    Pages that are already done in `run_dir` are skipped."""
    system = SYSTEMS[name]
    if run_dir is None and system.baseline:
        run_dir = BASELINES_DIR / set_name / name
    elif run_dir is None:
        run_dir = RUNS_DIR / f"{datetime.now():%Y%m%d-%H%M}_{name}_{set_name}"
    run_dir.mkdir(parents=True, exist_ok=True)

    done = {page_id for page_id, r in read_records(run_dir).items() if "error" not in r}
    todo = [page for page in pages if page.page_id not in done]
    print(f"{run_dir}: {len(todo)} pages to run, {len(done)} already done")
    if not todo:
        return run_dir

    start = perf_counter()
    model = system.create()
    meta_path = run_dir / "meta.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {"started": now()}
    meta.update(
        system=name,
        task=model.task,
        set=set_name,
        info=model.info,
        page_ids=sorted(page.page_id for page in pages),
        hardware=hardware(),
        git_commit=command("git", "describe", "--always", "--dirty", "--exclude=*"),
        load_seconds=round(perf_counter() - start, 2),
    )
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    failed = 0
    with (run_dir / "pages.jsonl").open("a", encoding="utf-8") as f:
        for i, page in enumerate(todo, start=1):
            try:
                record = asdict(model.transcribe(page))
                status = f"{record['timings']['total']:.1f}s"
            except Exception as error:  # one bad page must not stop a long run
                failed += 1
                record = {"error": f"{type(error).__name__}: {error}"}
                status = record["error"]
            f.write(json.dumps({"page_id": page.page_id, **record}, ensure_ascii=False) + "\n")
            f.flush()
            print(f"[{i}/{len(todo)}] {page.page_id}  {status}", flush=True)

    # ru_maxrss is in bytes on macOS and in kilobytes on Linux
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    peak_gb = peak / (2**30 if sys.platform == "darwin" else 2**20)
    meta.update(finished=now(), failed_pages=failed, peak_rss_gb=round(peak_gb, 2))
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return run_dir
