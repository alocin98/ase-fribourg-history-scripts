#!/usr/bin/env bash
# Download the historic manuscripts dataset (v1) from Google Drive into data/manuscripts/.
#
#   ./data/download_manuscripts.sh          # train + test (~3.7 GB)
#   ./data/download_manuscripts.sh test     # only the test split (~0.7 GB)
#
# Works with curl (default on macOS) or wget. Downloads are verified with SHA-256 and
# skipped if a valid zip is already present.
set -euo pipefail

# Google Drive file ids of the zips in
# https://drive.google.com/drive/folders/1wODkJlEEF-wbUCxYRtKwuxFsptxm2SR3
TRAIN_ID="1d5z1VoA83PL8nDC588ux4cVr9nWQl-Hc"
TEST_ID="1CsXGDRssM0oVTkckxrkt4G-EIZPhuE8P"
TRAIN_SHA256="01b1dcec4f88c6de84422da93e887806da4a4c013ffdd3d9ec3e014eb6309691"
TEST_SHA256="93f3486ad2f306a612f27ffd2883e1ae9d3b3beed50f2f5ddc1093b94e38125a"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$ROOT/manuscripts"
DL="$OUT/_release"
mkdir -p "$DL"

sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

fetch() {  # fetch <file id> <target path>
  # drive.usercontent.google.com with confirm=t skips the "can't scan for viruses" page of large files
  local url="https://drive.usercontent.google.com/download?id=$1&export=download&confirm=t"
  if command -v curl >/dev/null; then
    curl -L --fail --retry 5 -C - -o "$2" "$url"
  else
    wget -c --tries=5 -O "$2" "$url"
  fi
}

get() {  # get <name> <file id> <sha256>
  local name="$1" id="$2" sum="$3" zip="$DL/manuscripts_v1_$1.zip"
  if [[ "$id" == __* ]]; then
    echo "File id for '$name' is not set yet in $0" >&2; exit 1
  fi
  if [[ -f "$zip" && "$(sha256 "$zip")" == "$sum" ]]; then
    echo "[$name] already downloaded"
  else
    echo "[$name] downloading…"
    fetch "$id" "$zip"
    if [[ "$(sha256 "$zip")" != "$sum" ]]; then
      echo "[$name] checksum mismatch – delete $zip and retry (Drive may have returned an error page)" >&2
      exit 1
    fi
  fi
  echo "[$name] unzipping into $OUT"
  unzip -q -o "$zip" -d "$OUT"
}

case "${1:-all}" in
  train) get train "$TRAIN_ID" "$TRAIN_SHA256" ;;
  test)  get test "$TEST_ID" "$TEST_SHA256" ;;
  all)   get test "$TEST_ID" "$TEST_SHA256"; get train "$TRAIN_ID" "$TRAIN_SHA256" ;;
  *)     echo "usage: $0 [all|train|test]" >&2; exit 2 ;;
esac

echo "Done: $(find "$OUT/train" "$OUT/test" -name '*.txt' 2>/dev/null | wc -l | tr -d ' ') pages in $OUT"
echo "Optional: delete $DL to free ~3.7 GB of zips."
