# Fine-tuning PP-OCRv6 medium

Fine-tunes the [PP-OCRv6 medium](../../models/ppocrv6/) line recognizer on the train split
of our manuscripts dataset (`data/manuscripts/train`, 1,194 pages, ~49k lines). Line
detection stays kraken's default BLLA model; only the recognizer is trained.

## Usage

On a GPU machine with `uv`, `curl`, `unzip` and an NVIDIA driver, from the repo root:

```sh
SMOKE=1 ml-models/finetune/ppocrv6/run.sh   # ~10 min: 20 + 20 pages, 1 epoch
ml-models/finetune/ppocrv6/run.sh           # the real run
```

`run.sh` does everything, and skips each step whose output is already there:

1. creates `ml-models/benchmark/.venv-kraken7` (kraken 7.2, the CUDA build of torch
   that fits the driver, tensorboard). The benchmark uses the same environment.
2. downloads the train split (`data/download_manuscripts.sh train`, ~3 GB) and the base
   weights (`ml-models/models/ppocrv6/medium.safetensors`, 64 MB).
3. compiles the lines into `work/data/train.arrow` and `val.arrow` (`prepare.py`, a few
   minutes, ~8 GB of disk).
4. trains with `ketos train` into `work/runs/<date>/`, keeping the checkpoint with the
   best validation character accuracy as `best_<accuracy>.safetensors`.
5. copies it to `ml-models/models/ppocrv6/finetuned.safetensors` (not committed).

Then benchmark it like the other candidates (the quick set needs the test split, see
`../../benchmark/README.md`):

```sh
cd ml-models/benchmark && make run SYSTEM=ppocrv6-ft
```

Follow training with `tensorboard --logdir ml-models/finetune/ppocrv6/work/runs`, or in
`work/runs/<date>/train.log`.

## Data

- **Train / validation**: the train split, without one Königsfelden page whose line
  coordinates belong to another image size. The validation set is ~10 % of the pages of
  each language/era group, taken as **whole documents** (`doc_id`), so like train and
  test, validation never shares a document with training. `work/data/split.json` lists
  the validation documents.
- **Test**: the test split is not used here. It is what the benchmark measures.
- Lines are cut out along their polygons, as kraken does at inference. Kraken drops a
  few lines whose polygons are broken (it logs `Unexpected exception ...`) and lines
  wider than 2560 px after scaling to 96 px height.
- The 15 `stabs_basel` ALTO files name no image; `prepare.py` adds it.
- Characters of our transcriptions that the model cannot write yet are added to its
  output layer (`--resize union`).

## Settings

| setting        | default                                | note                                        |
| -------------- | -------------------------------------- | ------------------------------------------- |
| `EPOCHS`       | 20                                     | fixed; cosine decay of the rate over all    |
| `BATCH`        | 64                                     | lower it if the GPU runs out of memory      |
| `LR`           | 2e-4                                   | from-scratch default is 5e-4                |
| `WARMUP`       | 500                                    | steps                                       |
| `VAL_FRACTION` | 0.1                                    |                                             |
| `SEED`         | 0                                      | validation split and training               |
| `WORKERS`      | CPUs, at most 8                        | data loading                                |
| `RUN_DIR`      | `work/runs/<date>`                     | set it to a stopped run's folder to resume  |

Optimizer and schedule are the PP-OCRv6 defaults of kraken: AdamW+Muon, weight decay
0.01, per-step warmup then cosine decay, with augmentation, in bf16 mixed precision on
GPUs that support it. A full run is ~700 steps per epoch.

Without a CUDA GPU, the full run stops right away; `ALLOW_NO_GPU=1` trains anyway. The
smoke test runs anywhere (on Apple Silicon it uses MPS).

## Smoke test (2026-11-24)

`SMOKE=1 run.sh` on an M5 MacBook (MPS, 32-bit), from an empty `work/`: 20 + 20 pages
(914 + 952 lines), 1 epoch with augmentation, batch 8, 114 steps in ~5.5 min. Validation
character accuracy 0.849 (kraken's metric on 20 pages, not comparable to the benchmark).
The weights load in the benchmark's `ppocrv6-ft` system and transcribe pages. Not tried
yet: CUDA, bf16, batch 64, and resuming a stopped run.
