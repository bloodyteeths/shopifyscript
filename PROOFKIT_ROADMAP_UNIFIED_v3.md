# Proofkit — Unified Roadmap & Claude Rules (v3)

> **What this is:** A single, build-ready roadmap that **merges** your original **Roadmap & Claude Rules (v1.0)**, the **Pricing Tiers & Master Roadmap (v2)** feature scope, and the new **Audience OS + Profit-Aware Retargeting** addendum. Hand this file to Cursor/Claude; each milestone includes exact **Agent Prompts**.

---

## 0) Claude Rules (Agent Contract) — unchanged, plus audience/privacy add-ons

**Always begin with:**

- **SCOPE** — one sentence on what you are changing and _why it matters to merchants_.
- **ASSUMPTIONS** — env vars, IDs, and preconditions you expect.
- **PLAN** — steps with acceptance tests.
- **ARTIFACTS** — filenames and diffs (unified diff), plus any new code.
- **TESTS** — scriptable steps (curl or UI) to verify.
- **ROLLBACK** — what to revert if acceptance fails.

**Coding standards:**

- **Fail fast** on missing secrets/deps (return a single actionable command).
- **Small diffs** over big rewrites.
- **Guardrails** — no hardcoded secrets; read from `.env`/Shopify/WP settings.
- **Idempotent** Ads Script & jobs — re-runs must not duplicate labels, schedules, negatives, RSAs, or audiences.
- **Length linting** — enforce Google RSA 30/90 at build time; per-channel limits for overlays.
- **Observability** — log to backend `/api/metrics` → `RUN_LOGS_{tenant}` for every major mutation.
- **PROMOTE gate** — never push live unless `PROMOTE=TRUE` in config.
- **Privacy** — treat Customer Match PII with SHA-256 for API; for UI uploads never store raw PII at rest; filter by consent.
- **Intent OS principle** — Retrieve → Reason → Generate → Validate → Write; show the validation.

---

## 1) System Architecture (merged)

- **Backend (Node/Express)** — HMAC API (`/api/config`, `/api/metrics`, `/api/upsertConfig`), Google Sheets storage (swap to Postgres later).
- **Google Ads Script** — budgets/bidding/schedules, RSA builder (30/90), negatives (exact + n-gram), GAQL collectors, **audience attach** (uses existing list IDs), **profit- & inventory-aware pacer**.
- **Microsoft Ads Script (port)** — mirrors Google Script features where supported.
- **Shopify App** — Remix/Node template; Polaris UI; App Bridge; **Web Pixel Extension**.
- **WordPress Plugin** — Boilerplate; Woo purchase hooks; settings.
- **AI Worker** — Generates RSA assets, overlays, sitelinks/callouts/snippets; drafts intent blocks/pages; writes to Sheets.
- **Audience OS** — Shopify → Sheets seeds; segment builder & CSV exports; Ads Script audience attach; optional Customer Match API refresher.
- **Intent OS** — Catalog overlays (metafields), Intent Blocks (UTM-personalized sections), Promo Page Generator, UTM template pusher.
- **Dashboards** — Looker Studio on Sheets; weekly summaries & Slack/email alerts.

---

## 2) Pricing & Packaging (from v2)

- **Starter $29** — safe Search setup, daily optimizer, waste blockers, pixel health, weekly recap.
- **Pro $99** — AI RSA copy, RSA test queue, keyword promotions, n-gram waste, budget pacer, sitelinks/callouts/snippets, LP drafts.
- **Growth $249** — Asset Library, geo/daypart hints, promo page generator, brand/non-brand map, pacer rules editor, multi-store, Looker.
- **Enterprise $699+** — custom guardrails, server-side tagging playbooks, regulated copy prompts, SSO, audit logs, SLA.

---

## 3) Sheets (brain) — consolidated tables

- **CONFIG\_{tenant}** — flags, tenant info, default URLs, PROMOTE.
- **METRICS\_{tenant}**, **SEARCH*TERMS*{tenant}** — GAQL collectors.
- **MASTER*NEGATIVES*{tenant}**, **NGRAM*WASTE*{tenant}**, **NEG*GUARD*{tenant}**.
- **RSA*ASSETS_DEFAULT*{tenant}**, **RSA*ASSETS_MAP*{tenant}**, **ASSET*LIBRARY*{tenant}**.
- **KEYWORD*UPSERTS*{tenant}**, **BUDGET*CAPS*{tenant}**, **CPC*CEILINGS*{tenant}**, **SCHEDULES\_{tenant}**, **EXCLUSIONS\_{tenant}**.
- **GEO*DAYPART_HINTS*{tenant}**, **PACER*RULES*{tenant}**, **PACE*SIGNALS*{tenant}**.
- **LP*FIXES_QUEUE*{tenant}**, **BRAND*NONBRAND_MAP*{tenant}**.
- **AUDIENCE*SEEDS*{tenant}**, **AUDIENCE*SEGMENTS*{tenant}**, **AUDIENCE*EXPORT*{tenant}**, **AUDIENCE*MAP*{tenant}**.
- **SKU*MARGIN*{tenant}**, **SKU*STOCK*{tenant}**, **ADGROUP*SKU_MAP*{tenant}**.
- **RUN*LOGS*{tenant}** — audit.

---

## 4) Delivery Plan (Epics & Milestones)

### EPIC A — Backend (Week 1)

**A1. HMAC API + Sheets storage** — endpoints `/api/config`, `/api/metrics`, `/api/upsertConfig`; 429 & health checks.  
**A2. Tenant Config schema** — auto-create missing tabs with headers.  
**A3. Security & Ops** — rate limit; request logs.

**Agent Prompt**

```
SCOPE: Stand up HMAC API + Sheets repo; create config tabs if missing.
ASSUMPTIONS: GOOGLE_SA creds; SHEET_ID per tenant.
PLAN: Build endpoints; Sheets repo with upsert; health+rate limit.
TESTS: curl signed/unsigned; see rows in RUN_LOGS.
ROLLBACK: Disable route prefix /api via env.
```

---

### EPIC B — Google Ads Script Core (Week 1–2)

**B1. Universal script (Search)** — budget caps; `TARGET_SPEND` + CPC ceiling; schedule; master neg list; ad-group exact negatives; n-gram miner; RSA builder (30/90) with dedupe + label guard; GAQL collectors.  
**B2. Zero‑state seed** — safe Search campaign if none.  
**B3. Exclusions** — skip entities in `EXCLUSIONS_*`.

**Agent Prompt**

```
SCOPE: Universal Ads Script with idempotent budgets, RSA build, negatives, collectors.
ASSUMPTIONS: CONFIG/BUDGET_CAPS/CPC_CEILINGS/SCHEDULES tabs exist.
PLAN: Implement modules; GAQL ST report; 30/90 lint; shared set attach.
TESTS: Preview twice -> second run no-op; RSAs valid; negatives deduped.
ROLLBACK: disable ENABLE_SCRIPT in CONFIG.
```

---

### EPIC C — Shopify App (Week 2–3)

**C1. Template bootstrap** — Remix/Node starter, Polaris, App Bridge.  
**C2. Web Pixel Extension** — checkout_completed & standard events (consent-aware).  
**C3. Settings UI** — Tenant ID, backend URL, HMAC, GA4/AW IDs; saves to backend.  
**C4. Review readiness** — App Requirements checklist, Built for Shopify hygiene.

**Agent Prompt**

```
SCOPE: Shopify embedded app + Web Pixel + settings.
ASSUMPTIONS: Partner app creds; dev store.
PLAN: Scaffold template; add settings; add pixel with sandbox; health route.
TESTS: Install → OAuth → settings persist; pixel test order.
ROLLBACK: Remove extension & app blocks; revoke app.
```

---

### EPIC D — WordPress Plugin (Week 3)

**D1. Boilerplate plugin** — settings, Woo purchase hook, GA4/AW send.  
**D2. Compliance** — GPL, i18n, sanitization, uninstaller.

**Agent Prompt**

```
SCOPE: WP plugin for purchase events + settings.
ASSUMPTIONS: Woo dev store.
PLAN: Boilerplate; options page; thankyou hook; sanitize/escape.
TESTS: Install/activate; test order fires; options persist.
ROLLBACK: Uninstall hook removes options.
```

---

### EPIC E — AI Loop (Week 4)

**E1. RSA & negatives generator** — reads ST + LP, drafts H/D & n-grams with validation; writes to Sheets.  
**E2. LP Fixes Queue** — title/CTA suggestions; Promo Page drafts (never auto-publish).

**Agent Prompt**

```
SCOPE: AI drafts for RSAs/negatives + LP fixes.
ASSUMPTIONS: OpenAI/Anthropic key; rate limits.
PLAN: Retrieve→Reason→Generate→Validate→Write; enforce 30/90; DUP check.
TESTS: 5 sample terms → valid drafts; PROMOTE gate respected.
ROLLBACK: Disable AI worker via env.
```

---

### EPIC F — Observability & GTM (Week 4)

**F1. Weekly summary** — plain-English: what changed/why/next.  
**F2. Alerts** — spend/CPA spikes; Slack/email.  
**F3. Looker Studio** — prebuilt dashboard.

**Agent Prompt**

```
SCOPE: Summaries + alerts + Looker.
PLAN: Build weekly job; thresholds; Looker datasource = Sheets.
TESTS: Trigger test events; email/slack webhook fires.
```

---

### EPIC G — Audience OS (Weeks 1–6, parallelizable)

#### G1. Shopify → Sheets backbone (Week 1)

Create: `AUDIENCE_SEEDS_*`, `SKU_MARGIN_*`, `SKU_STOCK_*`. Backfill 24m; add webhooks. Hash email/phone (SHA‑256) in RAM only; write hashes.

**Agent Prompt**

```
SCOPE: Shopify→Sheets ingestion for audiences and margin/stock.
ASSUMPTIONS: Admin GraphQL scopes; Web Pixel aggregates via app proxy.
PLAN: Pull orders/customers/line_items/products/variants/inventory; compute total_spent, order_count, last_order_at, top_category, last_product_ids; write tabs; webhooks.
TESTS: 100 synthetic orders; idempotent upsert; margin computed.
```

#### G2. Segment builder + CSV exports (Week 2)

Add: `AUDIENCE_SEGMENTS_*` (logic*sqlish), materialize to `AUDIENCE_EXPORT*\*` as **CM_UI_UNHASHED** and **CM_API_HASHED** with counts & URLs.

**Agent Prompt**

```
SCOPE: Segment engine and CSV materializer (UI/API formats).
PLAN: Parser (AND/OR, >=, NOW-Xd); evaluator; exporters; run log.
TESTS: 8 predefined segments compile; CSV headers validated.
```

#### G3. Google Ads wiring (No‑API attach) (Week 3)

Add: `AUDIENCE_MAP_*` and **Ads Script audienceAttach\_()** to attach/detach user lists to campaigns with `mode` (OBSERVE/TARGET/EXCLUDE) + optional bid modifiers (skip if list too small). Provide **UI playbook** for merchants to upload CSVs and copy list IDs.

**Agent Prompt**

```
SCOPE: Ads Script audience attach using AUDIENCE_MAP_*.
PLAN: Load map; resolve campaigns; attach user lists; idempotent; log size guards.
TESTS: Preview shows attach; re-run no-op; detach works.
```

#### G4. Optional Customer Match API refresher (Weeks 4–6)

Feature-flagged service to auto-refresh lists (hash & upload via API) per segment `refresh_freq`; membership duration = cadence + 3 days; consent filter.

**Agent Prompt**

```
SCOPE: CM API refresher behind FEATURE_CM_API.
ASSUMPTIONS: Dev token, OAuth client/secret, refresh token.
PLAN: Hash+normalize; batch updates; consent filter; retries; status UI.
TESTS: Sandbox list refresh; no raw PII persisted.
```

#### G5. Profit & inventory-aware pacing (Week 4–5)

Compute `PACE_SIGNALS_*` (margin-weighted conv share). In Ads Script: reallocate within min/max caps; reduce bids/pause ad groups mapped to OOS/low-stock SKUs; audience gating by margin/LTV.

**Agent Prompt**

```
SCOPE: Profit/inventory-aware pacer + audience gating.
PLAN: Compute 7d_margin_value; apply caps & reallocation; inventory guard; LTV/margin checks for bid modifiers.
TESTS: Simulated data proves allocation math and guard logs.
```

#### G6. Agency scale & reporting (Week 5–6)

Templates library (clone segments & maps), white-label weekly PDF + Looker template; ops tools (CSV download; hashing self-check; list size checker).

**Agent Prompt**

```
SCOPE: Agency templates and reporting.
PLAN: Export/import tabs across tenants; weekly PDF; Looker template.
TESTS: Clone to new tenant <30 min; weekly report auto-generates.
```

---

## 5) Intent OS (landing + catalog) — highlights to build first

- **Catalog overlays (metafields)** per channel with Apply/Revert & bulk by collection.
- **Intent Blocks** (Shopify OS2.0 / WP block) — personalize content by UTM intent using `INTENT_BLOCKS_*`.
- **Promo Page Generator** — draft pages for high‑intent clusters (never auto-publish).
- **UTM template pusher** — standardize UTMs for analytics.

**Agent Prompt**

```
SCOPE: Catalog overlays + Intent Blocks (UTM-driven) + promo drafts.
PLAN: Metafields overlay service; OS2.0 section that reads Sheet rows by intent_key; generate drafts via AI; PROMOTE gate.
TESTS: Apply/Revert works; UTM changes page copy; drafts created.
```

---

## 6) Compliance & Privacy

- Customer Match: consent notice; UI uploads hash in Google; API uploads use SHA‑256; no raw PII at rest.
- Consent Mode v2 guidance in docs; Web Pixel respects privacy API.
- Uninstall cleanup: remove theme blocks, stop jobs; leave Sheets for audit.

---

## 7) Shopify & WP Review Readiness

- Follow Shopify **App Requirements checklist**; use Polaris; performance budget.
- WP plugin guidelines (GPL, i18n, sanitization, uninstaller).
- Provide Test Plan and screencast; changelog on resubmits.

---

## 8) KPIs to reach $1M

- K‑factor ≥ 0.6 via agency referrals & viral tools.
- Trial → Paid ≥ 35%; Pro/Growth mix ≥ 60% of paid.
- Churn: Pro ≤ 5%, Growth ≤ 3%.
- Weekly “first win” rate ≥ 80% (negatives added, RSA draft created, or intent block impact shown).
- Agency activation: 200–300 partners × 3 stores avg by M12.

---

## 9) Appendices

### 9.1 Predefined segments

- buyers*30d, buyers_180d, repeat_2plus, high_LTV_top20, churn_risk_90d_no_purchase, category*{X}\_buyers_180d, VIP_AOV>{x}, abandoned_checkout_14d.

### 9.2 Google Ads UI Upload Playbook (for lists)

1. Tools & Settings → Audience Manager → Segments → **+**.
2. **Customer list** → upload **CM_UI_UNHASHED** CSV; select fields; set duration (e.g., 180d).
3. After processing, copy **User List ID** → paste into `AUDIENCE_MAP_*`.

### 9.3 Feature flags

- `FEATURE_AUDIENCE_EXPORT=true` (G2), `FEATURE_AUDIENCE_ATTACH=true` (G3), `FEATURE_CM_API=false` (G4 default), `FEATURE_INVENTORY_GUARD=true` (G5).

---

## 10) Claude Prompt Template (paste into each task)

> **ROLE:** Senior engineer building Proofkit SaaS (backend + Shopify + WP + Ads/Microsoft Scripts + Audience OS).  
> **GOAL:** {one‑sentence merchant impact}.  
> **INPUTS:** `{env}`, `{tenant}`, relevant snippets or file tree.  
> **CONSTRAINTS:** Idempotent; secrets from env; RSA 30/90; negative dedupe; consent safe; audience attach read-only IDs unless FEATURE_CM_API.  
> **DELIVER:** SCOPE / ASSUMPTIONS / PLAN / ARTIFACTS (diffs) / TESTS / ROLLBACK.  
> **VALIDATE:** Show length checks, idempotency proof, consent filtering, and list-size guards for any audience attachment.

---

## Agent Status & Audit — 2025-08-13

- A1 HMAC API + Sheets storage — done
  - Evidence: `/api/health` OK; signed `/api/upsertConfig` 200; signed `/api/config` 200; unsigned 403; repo `sheets.js` abstraction with auto-headers.
- A2 Tenant Config schema — done
  - Evidence: `readConfigFromSheets()` assembles typed blobs for BUDGET*CAPS/CPC_CEILINGS/SCHEDULES/MASTER_NEGATIVES/WASTE_NEGATIVE_MAP/RSA*\* /EXCLUSIONS.
- A3 Security & Ops — done
  - Evidence: Request logging, rate limiting by IP+tenant, health endpoint.

- B1 Universal Ads Script — done
  - Evidence: budgets, bidding ceiling, schedules, master & exact negatives, n-gram, RSA 30/90 with dedupe+label guard, GAQL collectors.
- B2 Zero‑state seed — done
- B3 Exclusions — done
  - Evidence: `isExcludedCampaign_`/`isExcludedAdGroup_` helpers; guards in budgets/bidding/schedules/negatives/ST miner.

- C1 Shopify bootstrap — partial
  - Evidence: Node skeleton with `/health`, `/settings` forwarding to backend.
- C2 Web Pixel — partial (consent gating added)
  - Evidence: `checkout_completed` handler to GA4/AW.
  - Next: consent gating + docs.
- C3 Settings UI — partial
  - Next: Polaris + App Bridge embedded app.
- C4 Review readiness — pending

- D1 WP plugin — done; D2 Compliance — partial (uninstaller added)
  - Evidence: settings page, Woo hook, GA4/AW, backend forward; add uninstaller, i18n, run `phpcs`.

- F Observability — partial (orchestrator + monitor scripts)
- G Audience OS — not started

Notes for future Cursor agents

- Proceed to Audience OS seeds (G1) and Shopify embedded UI; add preview no‑op test harness for Ads Script runs; complete WP compliance (i18n, phpcs).
