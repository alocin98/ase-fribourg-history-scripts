# TrOCR on the `quick` set (30 pages)

## Data

30 pages of the test split of the historic manuscripts dataset v1 (`data/manuscripts`): whole-page scans with a human transcription. Page set `quick`: 5 pages per language/era group, for development (`subsets/quick.txt`).

| group | language | period | pages | sources |
|---|---|---|---|---|
| `de_post1700` | German | 1700–1950 | 5 | mkn_kurrent |
| `de_pre1700` | German | before 1700 | 5 | dresden_hofdiarium, koenigsfelden |
| `en_post1800` | English | 1800–1950 | 5 | denver_jcrs, joseph_hooker |
| `en_pre1800` | English | before 1800 | 5 | revolutionary_city |
| `fr_post1700` | French | 1700–1950 | 5 | poilus_testaments |
| `fr_pre1700` | French | before 1700 | 5 | cremma_medieval, cremma_mss17, gallicorpora_15e, htromance_medieval_fr |

## Results (normalized, lower is better)

| model | CER % | WER % | s / page | peak memory GB |
|---|---|---|---|---|
| **TrOCR** | 68.2 (59.2–74.4) | 96.3 (88.0–102.4) | 8.5 | 7.7 |
| Qwen3.5-9B (baseline) | 22.6 (15.1–27.7) | 50.6 (36.5–60.2) | 34.1 | 12.0 |
| CHURRO 3B (baseline) | 11.8 (8.7–15.0) | 29.3 (22.1–36.4) | 48.9 | 9.0 |

## CER by language and era (%)

| group | pages | **TrOCR** | Qwen3.5-9B (baseline) | CHURRO 3B (baseline) |
|---|---|---|---|---|
| `de_post1700` | 5 | 84.5 | 38.0 | 13.9 |
| `de_pre1700` | 5 | 76.0 | 24.5 | 8.6 |
| `en_post1800` | 5 | 46.2 | 16.6 | 7.6 |
| `en_pre1800` | 5 | 46.6 | 5.4 | 5.2 |
| `fr_post1700` | 5 | 63.9 | 20.7 | 25.6 |
| `fr_pre1700` | 5 | 70.1 | 27.0 | 15.0 |

## Word errors by type (% of reference words)

| model | substituted | deleted | inserted |
|---|---|---|---|
| **TrOCR** | 64.3 | 27.3 | 4.7 |
| Qwen3.5-9B (baseline) | 40.9 | 4.4 | 5.3 |
| CHURRO 3B (baseline) | 19.5 | 3.8 | 6.0 |

## How to read this

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
  hardware in the footer.

---

Run `20261116-1434_trocr_quick` · commit `44c2e06-dirty` · Apple M5, 24.0 GB · 2026-11-16  
Baseline Qwen3.5-9B: `mlx-community/Qwen3.5-9B-8bit`, run on 2026-11-23 (`baselines/quick/qwen3.5-9b/`)  
Baseline CHURRO 3B: `stanford-oval/churro-3B`, run on 2026-11-16 (`baselines/quick/churro-3b/`)
