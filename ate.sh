#!/bin/bash
# Usage: f had 2 eggs for breakfast
#        f today
#        f undo
#        f week

WORKER_URL="${CALORIE_TRACKER_URL:-https://calorie-tracker.<your-subdomain>.workers.dev}"

if [ -z "$*" ]; then
  echo "Usage: f <what you ate>"
  echo "Commands: f today | f undo | f week"
  exit 1
fi

curl -s -X POST "$WORKER_URL" -d "$*"
echo
