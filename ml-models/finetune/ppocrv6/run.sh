#!/usr/bin/env bash
# Fine-tunes PP-OCRv6 medium on the train split of data/manuscripts. One command on a
# fresh GPU machine (needs uv, curl, unzip and an NVIDIA driver), from anywhere:
#
#   ml-models/finetune/ppocrv6/run.sh              # full run
#   SMOKE=1 ml-models/finetune/ppocrv6/run.sh      # 20 + 20 pages, 1 epoch: checks the setup
#
# It installs the environment, downloads the train split and the base model if missing,
# compiles the line datasets, trains and copies the best weights to
# ml-models/models/ppocrv6/finetuned.safetensors (benchmark system `ppocrv6-ft`).
# Every step is skipped when its output exists, so a stopped run can be started again.
# Settings below can be overridden from the environment, e.g. EPOCHS=40 BATCH=32 run.sh.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
BENCH="$REPO/ml-models/benchmark"
VENV="$BENCH/.venv-kraken7"  # shared with the benchmark, so ppocrv6-ft can be run there
PY="$VENV/bin/python"
BASE_MODEL="$REPO/ml-models/models/ppocrv6/medium.safetensors"
BASE_URL="https://zenodo.org/records/21788410/files/medium.safetensors?download=1"
WORK="$HERE/work"

SMOKE="${SMOKE:-0}"
if [[ "$SMOKE" == 1 ]]; then
  DATA_DIR="$WORK/smoke-data"; LIMIT=20
  EPOCHS="${EPOCHS:-1}"; BATCH="${BATCH:-8}"; WARMUP="${WARMUP:-10}"
  RUN_DIR="${RUN_DIR:-$WORK/smoke-run}"
else
  DATA_DIR="$WORK/data"; LIMIT=""
  EPOCHS="${EPOCHS:-20}"; BATCH="${BATCH:-64}"; WARMUP="${WARMUP:-500}"
  RUN_DIR="${RUN_DIR:-$WORK/runs/$(date +%Y%m%d-%H%M)}"
fi
LR="${LR:-2e-4}"              # the from-scratch default is 5e-4; lower to keep what it knows
VAL_FRACTION="${VAL_FRACTION:-0.1}"
SEED="${SEED:-0}"
CPUS="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)"
WORKERS="${WORKERS:-$(( CPUS < 8 ? CPUS : 8 ))}"

step() { printf '\n== %s\n' "$*"; }

step "Environment ($VENV)"
command -v uv >/dev/null || { echo "uv is missing: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2; exit 1; }
if [[ ! -x "$PY" ]] || ! "$PY" -c "import kraken, tensorboard" 2>/dev/null; then
  uv venv --allow-existing --python 3.12 "$VENV"
  # --torch-backend auto picks the CUDA build that matches the installed driver.
  uv pip install --python "$PY" --torch-backend auto -r "$HERE/requirements.txt"
fi
read -r DEVICE PRECISION < <("$PY" - <<'EOF'
import torch
if torch.cuda.is_available():
    print("cuda:0", "bf16-mixed" if torch.cuda.is_bf16_supported() else "16-mixed")
elif torch.backends.mps.is_available():
    print("mps", "32-true")
else:
    print("cpu", "32-true")
EOF
)
DEVICE="${DEVICE_OVERRIDE:-$DEVICE}"; PRECISION="${PRECISION_OVERRIDE:-$PRECISION}"
echo "device $DEVICE, precision $PRECISION"
if [[ "$DEVICE" != cuda* && "$SMOKE" != 1 && "${ALLOW_NO_GPU:-0}" != 1 ]]; then
  echo "No CUDA GPU found. A full run needs one; set ALLOW_NO_GPU=1 to train anyway." >&2
  exit 1
fi

step "Train split (data/manuscripts/train)"
if [[ -d "$REPO/data/manuscripts/train" ]]; then
  echo "present"
else
  "$REPO/data/download_manuscripts.sh" train
fi

step "Base model ($BASE_MODEL)"
if [[ -f "$BASE_MODEL" ]]; then
  echo "present"
else
  curl -L --fail --retry 5 -o "$BASE_MODEL.part" "$BASE_URL"
  mv "$BASE_MODEL.part" "$BASE_MODEL"
fi

step "Line datasets ($DATA_DIR)"
if [[ -f "$DATA_DIR/val.arrow" ]]; then
  echo "present (delete the folder to compile again)"
else
  rm -rf "$DATA_DIR"
  "$PY" "$HERE/prepare.py" --out "$DATA_DIR" --val-fraction "$VAL_FRACTION" --seed "$SEED" \
    --workers "$CPUS" ${LIMIT:+--limit "$LIMIT"}
fi
# ketos reads binary datasets through manifest files
echo "$DATA_DIR/train.arrow" > "$DATA_DIR/train.txt"
echo "$DATA_DIR/val.arrow" > "$DATA_DIR/val.txt"

step "Training ($RUN_DIR)"
mkdir -p "$RUN_DIR/logs"
RESUME=()
LAST="$(ls -t "$RUN_DIR"/checkpoint_*.ckpt 2>/dev/null | head -1 || true)"
if [[ -n "$LAST" ]]; then
  echo "resuming from $LAST"
  RESUME=(--resume "$LAST")
else
  RESUME=(--load "$BASE_MODEL")
fi
cat > "$RUN_DIR/settings.txt" <<EOF
started $(date +%Y-%m-%dT%H:%M:%S)
git $(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo unknown)
base $BASE_MODEL
data $DATA_DIR
device $DEVICE precision $PRECISION workers $WORKERS
epochs $EPOCHS batch $BATCH lr $LR warmup $WARMUP val_fraction $VAL_FRACTION seed $SEED
EOF
# AdamW+Muon with a per-step warmup and cosine decay over all epochs (the PP-OCRv6
# defaults); --resize union adds the characters of our data that the model can't write.
"$VENV/bin/ketos" -d "$DEVICE" --precision "$PRECISION" --workers "$WORKERS" \
  --threads "$WORKERS" --seed "$SEED" \
  train "${RESUME[@]}" \
  -f binary -t "$DATA_DIR/train.txt" -e "$DATA_DIR/val.txt" \
  --resize union --augment \
  -q fixed -N "$EPOCHS" -B "$BATCH" -r "$LR" --warmup "$WARMUP" \
  --logger tensorboard --log-dir "$RUN_DIR/logs" \
  -o "$RUN_DIR" 2>&1 | tee -a "$RUN_DIR/train.log"

BEST="$(ls "$RUN_DIR" | grep '^best_.*\.safetensors$' | sort -r | head -1 || true)"
[[ -n "$BEST" ]] || { echo "No best_*.safetensors in $RUN_DIR: see $RUN_DIR/train.log" >&2; exit 1; }
BEST="$RUN_DIR/$BEST"
echo "best model: $BEST (validation character accuracy in the name)"

if [[ "$SMOKE" == 1 ]]; then
  step "Smoke test passed"
  echo "The weights stay in $RUN_DIR. Start the real run with: $0"
else
  cp "$BEST" "$REPO/ml-models/models/ppocrv6/finetuned.safetensors"
  step "Done"
  echo "Copied to ml-models/models/ppocrv6/finetuned.safetensors. Benchmark it with:"
  echo "  cd ml-models/benchmark && make run SYSTEM=ppocrv6-ft"
fi
