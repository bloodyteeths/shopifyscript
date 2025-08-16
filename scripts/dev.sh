#!/usr/bin/env bash
set -euo pipefail

TENANT=${TENANT:-TENANT_123}
SECRET=${HMAC_SECRET:-${SECRET:-dev_secret}}
BACKEND_PORT=${BACKEND_PORT:-3001}
UI_PORT=${UI_PORT:-3003}
LOG_DIR=${LOG_DIR:-/tmp}
BE_LOG="$LOG_DIR/pk_backend.log"
UI_LOG="$LOG_DIR/pk_ui.log"
PIDFILE="$LOG_DIR/pk_dev.pids"

choose_port(){ local s=$1; for p in $(seq "$s" $((s+20))); do if ! lsof -ti :"$p" >/dev/null; then echo "$p"; return; fi; done; return 1; }
kill_port(){ lsof -ti :"$1" | xargs -r kill -9 || true; }

hmac(){ node -e "const c=require('crypto');const [op,sec]=process.argv.slice(1);process.stdout.write(encodeURIComponent(c.createHmac('sha256',sec).update(op).digest('base64').replace(/=+$/,'')))" "$1" "$SECRET"; }
health_backend(){ local sig; sig=$(hmac "GET:${TENANT}:run_logs"); curl -s -o /dev/null -w "%{http_code}" "http://localhost:${BACKEND_PORT}/api/run-logs?tenant=${TENANT}&sig=${sig}&limit=1" || true; }
health_ui(){ curl -s -o /dev/null -w "%{http_code}" "http://localhost:${UI_PORT}/app/insights" || true; }

start_backend(){
  kill_port "$BACKEND_PORT" || true
  echo "Starting backend on :$BACKEND_PORT ..."
  HMAC_SECRET="$SECRET" BACKEND_PUBLIC_URL="http://localhost:${BACKEND_PORT}/api" PORT="$BACKEND_PORT" \
    node backend/server.js > "$BE_LOG" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1
  local code; code=$(health_backend)
  [ "$code" = "200" ] || { echo "❌ Backend health $code"; sed -n '1,160p' "$BE_LOG" || true; exit 1; }
  echo "✅ Backend ready at http://localhost:${BACKEND_PORT}/api"
}

start_ui(){
  kill_port "$UI_PORT" || true
  echo "Starting UI dev on :$UI_PORT ..."
  HMAC_SECRET="$SECRET" BACKEND_PUBLIC_URL="http://localhost:${BACKEND_PORT}/api" PORT="$UI_PORT" TENANT_ID="$TENANT" \
    npm --prefix shopify-ui run dev > "$UI_LOG" 2>&1 &
  echo " $!" >> "$PIDFILE"
  sleep 2
  if lsof -i :"$UI_PORT" >/dev/null; then
    local code; code=$(health_ui)
    if [ "$code" = "200" ]; then echo "✅ UI dev at http://localhost:${UI_PORT}"; return 0; fi
    echo "⚠️ UI dev health $code, falling back to prod server..."
  else
    echo "⚠️ UI dev failed to bind, falling back to prod server..."
  fi
  kill_port "$UI_PORT" || true
  echo "Building UI..."
  rm -rf shopify-ui/build shopify-ui/public/build || true
  HMAC_SECRET="$SECRET" BACKEND_PUBLIC_URL="http://localhost:${BACKEND_PORT}/api" \
    npm --prefix shopify-ui run build > /dev/null 2>&1 || true
  echo "Starting UI prod on :$UI_PORT ..."
  PORT="$UI_PORT" HMAC_SECRET="$SECRET" BACKEND_PUBLIC_URL="http://localhost:${BACKEND_PORT}/api" TENANT_ID="$TENANT" \
    node shopify-ui/server/express.js > "$UI_LOG" 2>&1 &
  echo " $!" >> "$PIDFILE"
  sleep 1
  echo "Validating client assets..."
  ASSETS=$(curl -s "http://localhost:${UI_PORT}/app/autopilot" | grep -oE '/build/[^"]+\.js' | sort -u || true)
  for a in $ASSETS; do
    if [ ! -f "shopify-ui/public${a}" ]; then echo "❌ Missing asset on disk: ${a}"; exit 1; fi
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${UI_PORT}${a}")
    cc=$(curl -sI "http://localhost:${UI_PORT}${a}" | awk -F': ' 'tolower($1)=="cache-control"{print tolower($2)}' | tr -d '\r')
    if [ "$code" != "200" ]; then echo "❌ Asset not served (HTTP $code): ${a}"; exit 1; fi
    echo "$cc" | grep -q "immutable" || echo "⚠️ Cache-Control missing immutable for ${a}: $cc"
  done
  echo "Doctor:"
  echo "  BACKEND_PUBLIC_URL=${BACKEND_PUBLIC_URL}"
  echo "  UI_PORT=${UI_PORT}"
  echo "  Build dir: $(ls -1 shopify-ui/public/build 2>/dev/null | head -n 5 || echo 'missing')"
  echo "✅ UI prod at http://localhost:${UI_PORT} (health $(health_ui))"
}

case "${1:-up}" in
  up)
    mkdir -p "$(dirname "$PIDFILE")"; : > "$PIDFILE"
    BACKEND_PORT=$(choose_port "$BACKEND_PORT"); export BACKEND_PORT
    UI_PORT=$(choose_port "$UI_PORT"); export UI_PORT
    start_backend
    start_ui
    echo
    echo "Logs: backend $BE_LOG | ui $UI_LOG"
    echo "Open: http://localhost:${UI_PORT}/app/insights  &  /app/autopilot"
    ;;
  down)
    echo "Stopping..."
    if [ -f "$PIDFILE" ]; then while read -r pid; do pid="${pid// /}"; [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true; done < "$PIDFILE"; rm -f "$PIDFILE"; fi
    kill_port "$BACKEND_PORT" || true; kill_port "$UI_PORT" || true; echo "✅ Stopped."
    ;;
  status)
    echo "Backend http://localhost:${BACKEND_PORT}/api -> $(health_backend)"
    echo "UI      http://localhost:${UI_PORT}     -> $(health_ui)"
    echo "PIDs: $(cat "$PIDFILE" 2>/dev/null || echo 'none')"
    ;;
  logs)
    echo "=== BACKEND (tail) ==="; tail -n 120 "$BE_LOG" 2>/dev/null || true
    echo; echo "=== UI (tail) ==="; tail -n 120 "$UI_LOG" 2>/dev/null || true
    ;;
  doctor)
    echo "Node: $(node -v)"
    echo "Remix: $(node -e \"console.log(require('./shopify-ui/node_modules/@remix-run/react/package.json').version)\")"
    echo "BACKEND_PUBLIC_URL=${BACKEND_PUBLIC_URL}"
    echo "UI_PORT=${UI_PORT} BACKEND_PORT=${BACKEND_PORT}"
    echo "public/build:"
    ls -lah shopify-ui/public/build 2>/dev/null || true
    ;;
  *) echo "Usage: scripts/dev.sh {up|down|status|logs}"; exit 1 ;;
esac


