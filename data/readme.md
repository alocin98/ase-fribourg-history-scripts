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
