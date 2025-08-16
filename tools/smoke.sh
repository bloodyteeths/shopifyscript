#!/usr/bin/env bash
set -euo pipefail

(lsof -ti :3001 | xargs -r kill -9) || true
HMAC_SECRET=change_me PORT=3001 node backend/server.js > /tmp/pk_backend.log 2>&1 &
sleep 1

curl -sS http://localhost:3001/api/health | grep -q 'ok' || exit 1
node tools/task-master.js --run --max-parallel=8 --config=tools/tasks.R1.config.json >/dev/null
node tools/task-master.js --run --max-parallel=8 --config=tools/tasks.R2.config.json >/dev/null
# weekly summary
TENANT=TENANT_123
nonce=$(date +%s)
sig=$(node tools/hmac.js POST:$TENANT:weekly_summary:$nonce)
curl -sS -X POST "http://localhost:3001/api/jobs/weekly_summary?tenant=$TENANT&sig=$sig" -H 'content-type: application/json' --data '{"nonce":'${nonce}'}' | grep -q 'ok'
echo SMOKE_OK


