#!/bin/bash
# Records a ~10s demo GIF for the README
# Prerequisites: asciinema, agg, and your worker running
#
# Usage: ./record-demo.sh

set -e

CAST_FILE="/tmp/calorie-demo.cast"
GIF_FILE="demo.gif"

echo "🎬 Recording will start now."
echo "   Type these two commands, then press Ctrl-D or type 'exit':"
echo ""
echo "   f had dal rice and 1 roti for lunch"
echo "   f today"
echo ""

asciinema rec "$CAST_FILE" \
  --cols 80 \
  --rows 15 \
  --idle-time-limit 2

echo "🎞️  Converting to GIF..."
agg "$CAST_FILE" "$GIF_FILE" \
  --cols 80 \
  --rows 15 \
  --speed 1 \
  --theme monokai

echo "✅ Saved to $GIF_FILE"
echo "   Add, commit, and push:"
echo "   git add demo.gif README.md && git commit --author='csawai <csawai@gmail.com>' -m 'add demo GIF' && git push origin main"
