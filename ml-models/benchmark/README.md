# HTR benchmark

Measures how well our models read the historic manuscripts dataset (`data/manuscripts`,
see `data/readme.md`), so every model we build or train is compared on the same pages
against the same targets. It covers **transcription** and **language detection**; entity
recognition comes later, once we have ground truth for it.

- **Page sets**: two frozen lists of test pages, `quick` (30 pages, for development) and
  `full` (315 pages), in `subsets/`.
- **Candidates**: the models we work on (TrOCR, McCATMuS, PP-OCRv6, MEDUSA, later our
  fine-tuned models).
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
uv run data/add_sources.py              # adds 68 newer German test pages (~0.6 GB download)

cd ml-models/benchmark
make install                            # three venvs, see below
make check                              # format, lint, tests (same as CI)

make run SYSTEM=mccatmus                # quick set: run and write the report
make run SYSTEM=mccatmus SET=full
make run SYSTEM=ppocrv6                 # before medusa-9b, which reads its lines
make run SYSTEM=medusa-9b               # see ../models/medusa/README.md first
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

**Three environments.** Kraken 5.3 pins torch 2.4 and transformers 4.57 (see
`webapp/ml-backend/readme.md`), the MLX models need transformers 5, and PP-OCRv6 needs
kraken 7, whose safetensors pin conflicts with transformers 5. `.venv-trocr` runs
`trocr`, `mccatmus`, `lid-mccatmus`, the reports and the checks, `.venv-vlm` runs the
baselines and `medusa-9b` (Apple Silicon only), `.venv-kraken7` runs `ppocrv6`. `make
run` picks the right one.

## Page sets

Both sets come from the test split; the train split is kept for training. Train and test
never share a document, but they share collections, so a model trained on our train split
has seen similar hands, never these pages.

- `quick`: 5 pages per language/era group: the pages the fewest checked models were
  trained on (see below), and among them pages from different documents where possible.
  Since 2026-11-23 its 10 German pages are new to every checked model; of the other 20,
  11 have been seen by one model and 9 by two (no French or English page by fewer).
- `full`: the whole test split without the pages below.

Some pages have printed or stamped text that the human transcription leaves out. A model
that reads it gets every word counted as an error, so these pages are in neither set
(`EXCLUDED_SOURCES` and `EXCLUDED_PAGES` in `bench/dataset.py`, checked by eye):

- the Valais census pages (`valais_de`, `valais_fr`, 34 test pages): printed forms where
  only the handwritten entries are transcribed;
- the Poilus wills (`poilus_testaments`, 9): court and registration stamps and notes on
  every page, only the will is transcribed;
- 10 of the 22 Denver pages (`denver_jcrs`): printed letterheads, a stamp, a telegram
  and a receipt form, only the handwriting is transcribed.

The sets are written with `python -m bench make-sets` and must not change, because the
stored baselines refer to exactly these pages. They were rewritten once, on 2026-11-23,
to add the pages of `data/add_sources.py`, to prefer pages no model has seen and to drop
the Poilus and Denver pages above; all systems and baselines were run again on them. Results from before compare only with
each other.

## Systems

| system         | what it is                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `trocr`        | The current ML backend (`webapp/ml-backend/app/pipeline.py`): Kraken BLLA + `trocr-small-handwritten`.    |
| `mccatmus`     | Kraken BLLA + [McCATMuS](https://doi.org/10.5281/zenodo.13788177), multilingual, 16th–21st century. Downloaded to `../models/mccatmus/` on first use. |
| `ppocrv6`      | Kraken 7 BLLA + [PP-OCRv6 medium](https://doi.org/10.5281/zenodo.21788410), pretrained on ~6.2M lines in 37 languages. Downloaded to `../models/ppocrv6/` on first use. |
| `medusa-9b`    | [MEDUSA 0.2 9B](https://huggingface.co/ENC-PSL/Medusa0.2Line-9B) (8-bit MLX), a VLM for single medieval lines, on the lines of the latest `ppocrv6` run. |
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

## Pages in the training data

Our sources are public datasets, and so are the training sets of most published models.
A model that was trained on a test page scores better on it than on a new manuscript.
`bench/overlap.py` (with `bench/seen_pages.json`) lists the test pages each model's
published training data contains, and how this was checked. Reports compare all models
on the pages no checked model has seen, and on the pages the candidate has and hasn't
seen; the leaderboard shows how many pages each model has seen.

- `ppocrv6` was trained on the full repositories of 17 of our 26 v1 sources.
- `medusa-9b` was trained on all our medieval French manuscripts (CATMuS Medieval) and
  5 Königsfelden pages (Tridis).
- `churro-3b` was trained on 124 of our test pages (CHURRO-DS training split, matched by
  page), most of the French ones among them.
- `mccatmus` was trained on 38 (CATMuS Modern: CREMMA MSS 17–19, Lectaurep, Poilus).
- Not checked: TrOCR and Qwen3.5, whose training data is not published.

No v1 page is new to all checked models: where one is clean, another has trained on it.
So `data/add_sources.py` adds 68 German pages published after all these models were
trained (Grand Tour diaries 1652–1689, Laßberg letters 1805–1853). There are no such
pages for French and English yet.

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

## Known issue: memory on census pages

TrOCR peaks at ~1.6 GB on a normal page but at 4.8–7 GB on the Valais census pages (many
small cells). The ML backend's Docker VM has 4 GB, so such pages could crash the deployed
service. The cause is not investigated yet.
