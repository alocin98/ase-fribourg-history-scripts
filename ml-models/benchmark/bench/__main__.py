"""python -m bench systems | make-sets | run SYSTEM | report RUN_FOLDER"""

import argparse
from pathlib import Path

from .dataset import SETS, load_pages, select, write_sets
from .report import write_report
from .run import run
from .systems import SYSTEMS


def main():
    parser = argparse.ArgumentParser(prog="python -m bench")
    commands = parser.add_subparsers(dest="command", required=True)

    commands.add_parser("systems", help="list the systems")

    make_sets = commands.add_parser("make-sets", help="write subsets/quick.txt and full.txt")
    make_sets.add_argument(
        "--force", action="store_true", help="overwrite; the baselines must then be run again"
    )

    run_parser = commands.add_parser("run", help="run a system and write its report")
    run_parser.add_argument("system", choices=SYSTEMS)
    run_parser.add_argument("--set", default="quick", choices=SETS)
    run_parser.add_argument("--limit", type=int, help="only the first N pages, no report")
    run_parser.add_argument("--resume", type=Path, help="continue this run folder")

    report = commands.add_parser("report", help="write the report of a run again")
    report.add_argument("run", type=Path, help="run folder in runs/")
    report.add_argument(
        "--details",
        action="store_true",
        help="add strict scores, scores per source, line detection, time and problems",
    )

    args = parser.parse_args()
    if args.command == "systems":
        for name, system in SYSTEMS.items():
            print(f"{name:14} {system.label}{' (baseline)' if system.baseline else ''}")
    elif args.command == "make-sets":
        write_sets(load_pages(), force=args.force)
    elif args.command == "run":
        pages = select(load_pages(), args.set, args.limit)
        run_dir = run(args.system, pages, args.set, args.resume)
        # Baselines have no report of their own, they appear in every report.
        if not SYSTEMS[args.system].baseline and not args.limit:
            print(f"Report written to {write_report(run_dir)}")
    elif args.command == "report":
        print(f"Report written to {write_report(args.run, args.details)}")


if __name__ == "__main__":
    main()
