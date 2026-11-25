# Data

## Historic manuscripts dataset (v1)

1,495 whole-page images of historic manuscripts in **German, French and English**, collected
from 26 open datasets (HTR-United, Zenodo). Every page comes with:

- the **image** (`.jpg`/`.png`)
- its **transcription** as plain text (`.txt`)
- the original **ground truth** with line positions and text (`.xml`, PAGE/ALTO)
- its **labels** in `metadata.csv`: language, date range, period group, source, train/test split

Pages are split into train/test by source document, so the same manuscript never appears in both.

| group         | language | period      | train | test |
| ------------- | -------- | ----------- | ----: | ---: |
| `de_pre1700`  | German   | before 1700 |   196 |   50 |
| `de_post1700` | German   | 1700–1950   |   200 |   50 |
| `fr_pre1700`  | French   | before 1700 |   200 |   50 |
| `fr_post1700` | French   | 1700–1950   |   199 |   50 |
| `en_pre1800`  | English  | ~1750–1800  |   200 |   50 |
| `en_post1800` | English  | 1800–1950   |   200 |   50 |

Sources, licences and per-group statistics are listed in `manuscripts/README.md` after download.

## Download

The images are not stored in git. From the repo root:

```sh
./data/download_manuscripts.sh          # train + test (~3.7 GB)
./data/download_manuscripts.sh test     # only the test split (~0.7 GB)
```

This downloads the zips from
[Google Drive](https://drive.google.com/drive/folders/1wODkJlEEF-wbUCxYRtKwuxFsptxm2SR3),
verifies them and unpacks everything into `data/manuscripts/`:

```
data/manuscripts/
├── metadata.csv
├── train/<group>/<page_id>.jpg | .txt | .xml
└── test/<group>/...
```

## Added test pages

Every v1 source is public, and so are the training sets of the models we benchmark, so
each v1 test page is in the training data of at least one of them (see
`ml-models/benchmark/bench/overlap.py`). `add_sources.py` adds 68 German test pages that
were published after these models were trained:

| source       | pages | group         | what                                                                                       | licence      |
| ------------ | ----: | ------------- | ------------------------------------------------------------------------------------------ | ------------ |
| `grand_tour` |    30 | `de_pre1700`  | [Grand Tour HTR](https://doi.org/10.5281/zenodo.23056692), HAB Wolfenbüttel: 10 pages each of three travel diaries (1652–59, 1664–69, 1689) | CC-BY-SA 4.0 |
| `lassberg`   |    38 | `de_post1700` | [Laßberg letters](https://huggingface.co/datasets/dh-unibe/lassberg-letters-htr), Uni Bern: the test split, 12 letters (1805–1853) | CC-BY 4.0    |

```sh
./data/download_manuscripts.sh test   # first
uv run data/add_sources.py            # ~0.6 GB, cached in manuscripts/_sources/
```

The pages go to `manuscripts/test/<group>/` like the others, their labels to
`manuscripts/metadata_added.csv` (committed). The downloads are pinned and checksummed and
the page choice is fixed, so every run gives the same pages. Grand Tour pages are taken
only when Transkribus marks them as corrected (`GT`, `FINAL` or `DONE`), they have at least
10 lines and are in German; the Laßberg test split is taken whole, without blank pages.

## Test sample

`test_sample.zip` (~32 MB) holds 15 pages drawn at random (fixed seed) from the **test** split,
at least 2 per group, for quickly trying out the backend and frontend without downloading the
full dataset. It has the same layout as the full download:

The `valais_*` pages are CC-BY-NC 4.0 (non-commercial); the rest are CC-BY 4.0 or public domain.
Sources and licences are in the `source` column of `metadata.csv` and in `manuscripts/README.md`.
