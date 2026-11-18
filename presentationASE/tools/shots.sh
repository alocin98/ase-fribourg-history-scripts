#!/bin/bash
# Screenshot every step of every slide (1920x1080, ?shot mode) into $1 (default: shots/).
# Needs the deck served on 127.0.0.1:8766 (start.command) and Google Chrome.
cd "$(dirname "$0")/.."
OUT=${1:-shots}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE=$(mktemp -d)
mkdir -p "$OUT"
# number of steps of each slide (max data-step of each <section>, at least 1)
STEPS=$(python3 -I -c "
import re
s = open('index.html').read()
secs = re.findall(r'<section class=\"slide.*?</section>', s, re.S)
print(' '.join(str(max([int(x) for x in re.findall(r'data-step=\"(\d+)\"', x)] or [1])) for x in secs))")
i=0
for k in $STEPS; do
  i=$((i + 1))
  for j in $(seq 1 $k); do
    out=$(printf "%s/s%02d_%d.png" "$OUT" $i $j)
    "$CHROME" --headless=new --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=6000 \
      --user-data-dir="$PROFILE" --enable-logging=stderr --v=0 \
      --screenshot="$out" "http://127.0.0.1:8766/?shot#$i.$j" 2>&1 | grep -i 'CONSOLE' | grep -v 'DevTools' | sed "s|^|$out: |"
  done
done
rm -rf "$PROFILE"
