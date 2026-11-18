#!/bin/bash
# Double-clic : lance un petit serveur local et ouvre la présentation.
cd "$(dirname "$0")"
PORT=8766
(sleep 1; open "http://localhost:$PORT/") &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
