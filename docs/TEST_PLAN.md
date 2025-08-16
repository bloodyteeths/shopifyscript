## Backend Smoke

- Health: GET /api/health → { ok:true }
- Upsert: POST /api/upsertConfig?tenant=TENANT_123&sig=HMAC("POST:TENANT_123:upsertconfig:<nonce>") body { nonce, settings }
- Summary: GET /api/summary?tenant=TENANT_123&sig=HMAC("GET:TENANT_123:config") → { ok:true }

Command snippet

```bash
TENANT=TENANT_123
export HMAC_SECRET=change_me
curl -sS http://localhost:3001/api/health
nonce=$(date +%s)
sig_upsert=$(node tools/hmac.js "POST:${TENANT}:upsertconfig:${nonce}")
curl -sS -X POST "http://localhost:3001/api/upsertConfig?tenant=${TENANT}&sig=${sig_upsert}" -H "content-type: application/json" --data '{"nonce":'${nonce}',"settings":{"label":"PROOFKIT_AUTOMATED","default_final_url":"https://www.proofkit.net"}}'
sig_get=$(node tools/hmac.js "GET:${TENANT}:config")
curl -sS "http://localhost:3001/api/summary?tenant=${TENANT}&sig=${sig_get}"
```

## Intent OS

- Apply overlays: POST /api/intent/apply?tenant=TENANT_123&sig=HMAC("POST:TENANT_123:intentapply:<nonce>")
- Revert overlays: POST /api/intent/revert?tenant=TENANT_123&sig=HMAC("POST:TENANT_123:intentrevert:<nonce>")
- Acceptance: RUN_LOGS_* contains intent_apply / intent_revert entries.


## Shopify Canary Wizard

- Visit /app/canary
- Enter one campaign as canary, set caps (3–5/day) and CPC (0.15–0.25)
- Map audience in OBSERVE with +10 bid mod (backend enforces safe guards)
- Trigger AI dry-run (no live changes)
- Schedule Promote Window (e.g., now+2m for 60m). Verify RUN_LOGS entries.

