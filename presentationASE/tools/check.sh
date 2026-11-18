#!/bin/bash
# Load every step of every slide headless and print any JS error (deck.js stores them in <body data-err>).
# Needs the deck served on 127.0.0.1:8766 (start.command) and Google Chrome.
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE=$(mktemp -d)
STEPS=$(python3 -I -c "
import re
s = open('index.html').read()
secs = re.findall(r'<section class=\"slide.*?</section>', s, re.S)
print(' '.join(str(max([int(x) for x in re.findall(r'data-step=\"(\d+)\"', x)] or [1])) for x in secs))")
i=0; bad=0
for k in $STEPS; do
  i=$((i + 1))
  for j in $(seq 1 $k); do
    dom=$("$CHROME" --headless=new --window-size=1920,1080 --virtual-time-budget=4000 --user-data-dir="$PROFILE" \
      --dump-dom "http://127.0.0.1:8766/?shot#$i.$j" 2>/dev/null)
    err=$(echo "$dom" | grep -o 'data-err="[^"]*"')
    [ -n "$err" ] && { echo "slide $i.$j: $err"; bad=1; }
    echo "$dom" | grep -q 'class="slide[^"]*active' || { echo "slide $i.$j: no active slide"; bad=1; }
  done
done
rm -rf "$PROFILE"
[ $bad = 0 ] && echo "no errors"
