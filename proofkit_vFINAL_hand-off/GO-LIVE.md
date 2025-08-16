# Proofkit — Go‑Live (Canary) Runbook

This checklist gets you from **green smokes** to a **time‑boxed live canary** safely.

> Timezone note: your environment uses **Europe/Istanbul**. When scheduling windows, use local time.

## 0) Prereqs
- Google Sheet created; note its ID.
- Ads account has **label** `PROOFKIT_AUTOMATED` (create once in Google Ads UI).
- Copy `.env.example` → `.env` and fill in at least:
  - `HMAC_SECRET`, `TENANT_REGISTRY_JSON`, `ALLOWED_ORIGINS`
  - Optional: `GOOGLE_API_KEY` (Gemini). AI is optional; drafts remain in Sheets until `PROMOTE=TRUE`.

## 1) Start backend
```bash
(HMAC_SECRET=change_me PORT=3001 node backend/server.js > /tmp/pk_backend.log 2>&1 &)
```

Check diagnostics:
```bash
curl -sS http://localhost:3001/api/diagnostics | jq
```

## 2) Shopify app (embedded UI)
Open the app and visit:
- `/app/intent` – manage Intent Blocks (CRUD), preview with `?utm_term=`
- `/app/overlays` – Apply/Revert/Bulk overlays (history + diff)
- `/app/audiences` – Build segments (UI/API) and download CSVs, write `AUDIENCE_MAP_*`
- `/app/canary` – **Wizard** for safe canary

## 3) Canary Wizard steps
1. Choose a single Search campaign as **canary** (ensure it has the label `PROOFKIT_AUTOMATED`).
2. Set **risk caps**:
   - Daily budget cap: **$3–$5**
   - CPC ceiling: **$0.15–$0.25**
   - Narrow schedule today: **60–120 minutes**
3. Add **exclusions**: list every other campaign by name.
4. **Audience (optional)**: paste a Customer Match list ID; mode **OBSERVE**, bid mod +10% (applied only if size known and ≥ min).
5. (Optional) **AI drafts**: trigger AI dry‑run. You’ll see 30/90‑valid drafts in Sheets; Ads don’t change yet.
6. **Promote Window**: schedule **start time** (e.g., now+2m) and **duration** (60–120 min).

## 4) Script preview → run
- **Before window**: Preview should include `PROMOTE off → no ad/keyword mutations`.
- **During window**: Preview then Run; logs ordered as:
  - Budget → Bidding → Schedule → Master negatives → N‑gram miner → RSA build (PROMOTE gate) → Audience attach
- Re‑preview in the same window → **no‑op** (idempotency proof).

## 5) Monitor & rollback
- Watch **RUN_LOGS** in Sheets and Google Ads Change History.
- Rollback in <2 min:
  - Set `PROMOTE=false` (or let the window close automatically).
  - Revert overlays in `/app/overlays` (history), remove Intent Block from theme/page.
  - Clear `AUDIENCE_MAP_*` to detach on next run.

## 6) After canary
- Expand schedule and budget gradually.
- Turn on AI drafts later by keeping PROMOTE windows small; review drafts first.
- Submit Shopify/WP apps using the included **review checklists**.
