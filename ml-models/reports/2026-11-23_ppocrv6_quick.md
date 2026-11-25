# PP-OCRv6 medium on the `quick` set (30 pages)

## Data

30 pages of the test split of the historic manuscripts dataset v1 (`data/manuscripts`): whole-page scans with a human transcription. Page set `quick`: 5 pages per language/era group, those the fewest models were trained on (`subsets/quick.txt`).

| group | language | period | pages | sources |
|---|---|---|---|---|
| `de_post1700` | German | 1700–1950 | 5 | lassberg |
| `de_pre1700` | German | before 1700 | 5 | grand_tour |
| `en_post1800` | English | 1800–1950 | 5 | denver_jcrs, joseph_hooker |
| `en_pre1800` | English | before 1800 | 5 | revolutionary_city |
| `fr_post1700` | French | 1700–1950 | 5 | cremma_mss18, cremma_mss19, fondue_fr_mss18, lectaurep_mariages |
| `fr_pre1700` | French | before 1700 | 5 | chateau_chavigny, cremma_mss17, gallicorpora_15e, htromance_medieval_fr |

## Results (normalized, lower is better)

| model | CER % | WER % | s / page | peak memory GB |
|---|---|---|---|---|
| **PP-OCRv6 medium** | 15.8 (8.9–26.1) | 38.8 (29.3–50.1) | 6.4 | 8.6 |
| Qwen3.5-9B (baseline) | 35.2 (21.4–47.2) | 57.8 (40.5–71.7) | 39.7 | 12.0 |
| CHURRO 3B (baseline) | 16.2 (10.1–22.2) | 35.6 (26.4–42.8) | 59.7 | 9.0 |

## CER by language and era (%)

| group | pages | **PP-OCRv6 medium** | Qwen3.5-9B (baseline) | CHURRO 3B (baseline) |
|---|---|---|---|---|
| `de_post1700` | 5 | 8.2 | 49.4 | 12.3 |
| `de_pre1700` | 5 | 16.7 | 45.0 | 34.5 |
| `en_post1800` | 5 | 18.1 | 13.4 | 6.8 |
| `en_pre1800` | 5 | 17.7 | 5.4 | 5.2 |
| `fr_post1700` | 5 | 35.3 | 28.5 | 20.8 |
| `fr_pre1700` | 5 | 6.1 | 42.0 | 11.7 |

## Word errors by type (% of reference words)

| model | substituted | deleted | inserted |
|---|---|---|---|
| **PP-OCRv6 medium** | 30.2 | 5.3 | 3.3 |
| Qwen3.5-9B (baseline) | 38.2 | 11.1 | 8.4 |
| CHURRO 3B (baseline) | 23.1 | 7.0 | 5.6 |

## Pages in the training data

Our sources are public, and so is the training data of most models: a model scores better on pages it was trained on than on new manuscripts. 10 of 30 pages are in the training data of none of the checked models (`de_post1700`, `de_pre1700`); they are the fairest comparison. PP-OCRv6 medium was trained on 14 pages (denver_jcrs, fondue_fr_mss18, gallicorpora_15e, htromance_medieval_fr, joseph_hooker, revolutionary_city). How many pages each model has seen is in the leaderboard; how this was checked, and which models are not checked, is in `bench/overlap.py`.

CER % (normalized):

| model | all 30 pages | 16 not seen by PP-OCRv6 medium | 14 seen by PP-OCRv6 medium | 10 seen by no model |
|---|---|---|---|---|
| **PP-OCRv6 medium** | 15.8 | 20.0 | 10.5 | 12.2 |
| Qwen3.5-9B (baseline) | 35.2 | 41.1 | 27.7 | 47.3 |
| CHURRO 3B (baseline) | 16.2 | 21.8 | 9.1 | 22.7 |

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

Run `20261123-1928_ppocrv6_quick` · commit `3df307e-dirty` · Apple M5, 24.0 GB · 2026-11-23  
Baseline Qwen3.5-9B: `mlx-community/Qwen3.5-9B-8bit`, run on 2026-11-23 (`baselines/quick/qwen3.5-9b/`)  
Baseline CHURRO 3B: `stanford-oval/churro-3B`, run on 2026-11-23 (`baselines/quick/churro-3b/`)
