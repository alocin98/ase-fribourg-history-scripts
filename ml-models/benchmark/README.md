# HTR benchmark

Measures how well our models read the historic manuscripts dataset (`data/manuscripts`,
see `data/readme.md`), so every model we build or train is compared on the same pages
against the same targets. It covers **transcription** and **language detection**; entity
recognition comes later, once we have ground truth for it.

- **Page sets**: two frozen lists of test pages, `quick` (30 pages, for development) and
  `full` (266 pages), in `subsets/`.
- **Candidates**: the models we work on (TrOCR, McCATMuS, later our fine-tuned models).
  Their raw output goes to `runs/` (not committed), their report to `../reports/`.
- **Baselines**: two vision-language models we don't tune (Qwen3.5-9B, CHURRO). They are
  run once per page set, stored in `baselines/` and shown in every report as the target.
- **Reports**: one per candidate run, in `../reports/` (transcription) and
  `../reports/language-detection/`. `../reports/leaderboard.md` lists them all, best first.

A run only stores what the model answered. Scoring happens when the report is written, so
metrics can change without running the models again.

## Usage

```sh
./data/download_manuscripts.sh test     # from the repo root, once (~0.7 GB)

cd ml-models/benchmark
make install                            # two venvs, see below
make check                              # format, lint, tests (same as CI)

make run SYSTEM=mccatmus                # quick set: run and write the report
make run SYSTEM=mccatmus SET=full
make run SYSTEM=lid-mccatmus            # language detection
make baselines SET=full                 # once per set, ~6.5 h for full on an M5
```

Without make: `python -m bench systems` lists the systems, `python -m bench run <system>
--set quick|full [--limit 3] [--resume runs/<folder>]` runs one (`--limit` writes no
report), and `python -m bench report runs/<folder> [--details]` writes the report of a
run again. `--details` adds strict scores, scores per source, line detection, time and
failed or truncated pages.

To add a candidate, write a class with `task` (`"htr"` or `"lid"`), `info` and
`transcribe(page) -> Prediction` in `bench/systems/` and register it in `SYSTEMS` in
`bench/systems/__init__.py`.

**Two environments.** Kraken pins torch 2.4 and transformers 4.57 (see
`webapp/ml-backend/readme.md`), the MLX models need transformers 5. `.venv-trocr` runs
`trocr`, `mccatmus`, `lid-mccatmus` and the reports, `.venv-vlm` runs the baselines (Apple
Silicon only).

## Page sets

Both sets come from the test split; the train split is kept for training. Train and test
never share a document, but they share collections, so a model trained on our train split
has seen similar hands, never these pages.

- `quick`: 5 pages per language/era group, from different documents where possible.
- `full`: the whole test split without the Valais census pages.

The census pages (`valais_de`, `valais_fr`, 34 test pages) are printed forms where only the
handwritten entries are transcribed. A model that reads the printed headers would get every
printed word counted as an error, so they are left out of both sets.

The sets are written once with `python -m bench make-sets` and must not change, because
the stored baselines refer to exactly these pages.

## Systems

| system         | what it is                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `trocr`        | The current ML backend (`webapp/ml-backend/app/pipeline.py`): Kraken BLLA + `trocr-small-handwritten`.    |
| `mccatmus`     | Kraken BLLA + [McCATMuS](https://doi.org/10.5281/zenodo.13788177), multilingual, 16th–21st century. Downloaded to `../models/mccatmus/` on first use. |
| `lid-mccatmus` | Language detection, approach A (see below).                                                                |
| `qwen3.5-9b`   | Baseline: `mlx-community/Qwen3.5-9B-8bit`, whole page in, text out.                                        |
| `churro-3b`    | Baseline: `stanford-oval/churro-3B`, whole page in, text out.                                              |

## Metrics

- **CER / WER**: character / word edit distance to the human transcription of the whole
  page, divided by its length. Edits are summed over all pages before dividing, so short
  pages don't dominate.
- **Errors by type**: the word edits split into substituted (misread), deleted (skipped)
  and inserted (added) words.
- **95 % interval**: bootstrap over documents, not pages. Pages of one document share a
  hand, so resampling pages would make the interval too narrow.
- **Time and memory**: seconds per page without model loading; peak process memory for
  the candidates, peak GPU memory reported by mlx-vlm for the baselines.
- **Line detection** (`--details`): a predicted line matches a human line when their boxes
  overlap (IoU ≥ 0.3), and CER is also computed on the matched lines.

Text is compared in two views (`bench/metrics.py`). Reports use **normalized**, `--details`
adds **strict**:

- strict: Unicode NFC, whitespace and line breaks collapsed. Case, punctuation, accents
  and letters like `ſ` must match.
- normalized: also lower case, accents removed, `ſ` → `s` and other compatibility forms
  folded, punctuation replaced by spaces. Fairer for models with different transcription
  conventions (TrOCR cannot write `ſ` at all).

## Language detection

We use **approach A**: transcribe first with a multilingual model, then detect the
language of the text. If that isn't reliable enough, the fallback is a language selection
in the upload dialog.

`lid-mccatmus` recognizes the first 10 lines with McCATMuS and gives the text to
[lingua](https://github.com/pemistahl/lingua-py), restricted to German, French, English
and Latin.

First result on `quick`: 63 % correct. McCATMuS was trained on ~90 % French, and its
output on German Kurrent looks like Latin or French to the detector (0 of 5 Kurrent pages
correct). The detector itself is fine: on CHURRO's transcriptions of the same pages it gets
30 of 30. So detection should improve with a better transcription model. Other things to
expect: heavily abbreviated medieval French can look like Latin, and pages that mix
languages have only one label in the dataset.

## Baselines

Both run on a 24 GB Apple Silicon Mac with temperature 0, at most 4096 new tokens and the
longest image side at most 2048 px (Qwen) or 2500 px (CHURRO, the limit of its own
tooling).

- **Qwen3.5-9B** (~10.4 GB) gets the generic transcription prompt of the CHURRO project
  and answers between `<output>` tags. Thinking is turned off.
- **CHURRO 3B** (~7.5 GB) is Qwen2.5-VL-3B fine-tuned on ~100k pages from historical
  collections ([paper](https://arxiv.org/abs/2509.19768)). It gets the system message it
  was trained with and answers in XML, starting with a `<Metadata>` block; `xml_text` in
  `bench/systems/vlm.py` drops that block and the tags. The weights are under the Qwen
  Research licence (non-commercial), fine for the benchmark but not for the deployed app.

The raw answer of every page is stored and parsed again for each report, so parsing can be
fixed without a new run.

We don't tune these models, so their failures are part of the baseline:

- **Invented text**: CHURRO wrote "Stahlgewichte" where the page says "Nahrungsmittel".
- **Letter-spaced output**: Qwen sometimes switches to "D i c o i g i t" on hard pages.
  Every letter then counts as a word, so WER can go above 100 % while CER suffers less.
- **Repetition loops**: Qwen sometimes repeats a line or a token until the token limit (2
  of 30 `quick` pages). We score these pages as they are. One such page moves Qwen's CER on
  `quick` from 28 % to 48 %; `--details` lists truncated pages.

## Known issue: memory on census pages

TrOCR peaks at ~1.6 GB on a normal page but at 4.8–7 GB on the Valais census pages (many
small cells). The ML backend's Docker VM has 4 GB, so such pages could crash the deployed
service. The cause is not investigated yet.
