#!/usr/bin/env bash
set -euo pipefail

MAX_TRIES=${MAX_TRIES:-30}
SLEEP_SECS=${SLEEP_SECS:-2}
PARALLEL=${PARALLEL:-8}
CONFIG=${CONFIG:-tools/tasks.config.json}

try=0
while [ $try -lt $MAX_TRIES ]; do
  echo "[monitor] pass=$try config=$CONFIG"
  # Health checks (non-fatal)
  curl -sS http://localhost:3001/api/health || true
  curl -sS http://localhost:3002/health || true

  # Run orchestrator once
  OUT=$(node tools/task-master.js --run --max-parallel=$PARALLEL --config="$CONFIG" 2>&1 || true)
  echo "$OUT"
  if echo "$OUT" | grep -q "Task summary: { ok:" && ! echo "$OUT" | grep -q "error:"; then
    echo "[monitor] All tasks done for $CONFIG"
    exit 0
  fi
  try=$((try+1))
  sleep $SLEEP_SECS
done

echo "[monitor] Timed out waiting for tasks to finish for $CONFIG" >&2
exit 1
