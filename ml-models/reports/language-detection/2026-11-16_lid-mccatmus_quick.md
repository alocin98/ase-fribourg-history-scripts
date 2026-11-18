# Language detection A on the `quick` set (30 pages)

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

## Method

Approach A, in two steps:

1. **Transcribe**: Kraken's default layout model finds the text lines, and the first 10
   are read with [McCATMuS](https://doi.org/10.5281/zenodo.13788177), a multilingual
   handwriting model for the 16th to 21st century (trained mostly on French).
2. **Detect**: [lingua](https://github.com/pemistahl/lingua-py) scores that text for
   German, French, English and Latin only, and the language with the highest confidence
   wins. Limiting the candidates to the archive's languages keeps it robust on noisy
   transcriptions.

## Results

| language | pages | accuracy % |
|---|---|---|
| German | 10 | 40.0 |
| English | 10 | 70.0 |
| French | 10 | 80.0 |
| **all** | 30 | **63.3** |

7.4 s per page.

## How to read this

- **Accuracy**: pages whose detected language equals the dataset label. A page without
  usable text counts as wrong.

---

Run `20261116-1636_lid-mccatmus_quick` · commit `44c2e06-dirty` · Apple M5, 24.0 GB · 2026-11-16
