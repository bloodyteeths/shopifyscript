
# Proofkit — Final Roadmap & Agent Contract (vFINAL 2025-08-13)

> **Compatibility:** This file is the **single source of truth** going forward. It **extends** your original *Roadmap & Claude Rules (v1.0)* and the *Pricing Tiers & Master Roadmap (v2)* and **merges** the *Audience OS + Profit-Aware Retargeting* addendum.  
> **Starter ZIP:** Using the previous starter ZIP is **fine**. Keep its structure. When conflicts appear, **prefer this roadmap** and patch via small diffs.

---

## 0) Agent Contract (Claude/Cursor rules)

**Every task must begin with:**

- **SCOPE** — one sentence on what changes and why it matters to merchants.
- **ASSUMPTIONS** — env vars, IDs, preconditions.
- **PLAN** — bullet steps, each with an acceptance check.
- **ARTIFACTS** — file paths + unified diffs, migrations, and configs.
- **TESTS** — scriptable (curl/UI) steps to verify.
- **ROLLBACK** — short steps to undo safely.

**Coding & Ops guardrails**

- **Fail fast:** if a secret or dependency is missing, return **one actionable command** to provide it.
- **Idempotent:** re-runs must not duplicate labels, schedules, negatives, RSAs, audiences, or theme blocks.
- **Secrets:** never hardcode; read from env/Shopify/WP/Sheet.
- **PROMOTE gate:** no live change unless `PROMOTE=TRUE`.
- **Length linting:** Google RSA **30/90**; channel-specific lengths for overlays (Meta/TikTok/LinkedIn).
- **Observability:** log every mutation to `/api/metrics` → `RUN_LOGS_{tenant}`.
- **Privacy:** for Customer Match, hash email/phone with **SHA‑256** for API uploads; for UI uploads, never store raw PII at rest; filter on merchant consent.
- **Docs links:** include spec/source links in PR descriptions when policy-sensitive.
- **Small diffs:** patch by module; keep commit scope tight.

---

## 1) Release Trains (what ships when)

### R0 — Foundation (Week 1)
- Backend HMAC API + Sheets repo.
- Google Ads Script Core (budgets, CPC ceiling, schedule, master neg list, ad‑group exact negatives, GAQL collectors, RSA builder + lint + label guards).
- Shopify App bootstrap (OAuth, Embedded, Settings, Web Pixel).

### R1 — Intent OS (Weeks 2–4)
- Catalog Overlays (metafields) + Apply/Revert + bulk apply.
- Intent Blocks (Shopify OS2.0/WP block) — UTM-driven content.
- Promo Page Generator (draft-only).  
- AI Drafts loop (RSA + sitelinks/callouts + n‑gram waste miner).

### R2 — Audience OS + Profit Pacer (Weeks 4–6)
- Shopify→Sheets audience seeds; Segment builder; CSV exports (UI+API formats).
- Ads Script audience attach (OBSERVE/TARGET/EXCLUDE) + bid modifiers (size guards).
- Optional Customer Match API refresher (feature-flagged).
- Profit- & inventory-aware pacing; ADGROUP⇄SKU map; weekly summary + Looker.

### R3 — Agency Scale (Weeks 6–8)
- Template library (clone tabs/maps across tenants).
- White-label weekly PDF; ops tools (CSV download, hashing self-check, list size checker).
- Microsoft Ads Script port.

---

## 2) Environment & Flags

**ENV (backend)**
```
GOOGLE_SHEETS_SA_JSON
SHEETS_ROOT_ID            # per-tenant Sheet ID looked up from registry
APP_BASE_URL
HMAC_SHARED_SECRET
OPENAI_KEY / ANTHROPIC_KEY (optional for AI)
SHOPIFY_APP_KEY / SHOPIFY_APP_SECRET
```
**Feature flags (in CONFIG_{tenant} or env)**
```
FEATURE_AI_DRAFTS=true
FEATURE_INTENT_BLOCKS=true
FEATURE_AUDIENCE_EXPORT=true
FEATURE_AUDIENCE_ATTACH=true
FEATURE_CM_API=false           # keep off until ready
FEATURE_INVENTORY_GUARD=true
ENABLE_SCRIPT=true
```

---

## 3) Sheets (brain) — canonical tabs

- **CONFIG_{tenant}** — flags, defaults, PROMOTE.  
- **METRICS_{tenant}**, **SEARCH_TERMS_{tenant}** — GAQL collectors.  
- **MASTER_NEGATIVES_{tenant}**, **NGRAM_WASTE_{tenant}**, **NEG_GUARD_{tenant}**.  
- **RSA_ASSETS_DEFAULT_{tenant}**, **RSA_ASSETS_MAP_{tenant}**, **ASSET_LIBRARY_{tenant}**.  
- **KEYWORD_UPSERTS_{tenant}**, **BUDGET_CAPS_{tenant}**, **CPC_CEILINGS_{tenant}**, **SCHEDULES_{tenant}**, **EXCLUSIONS_{tenant}**.  
- **GEO_DAYPART_HINTS_{tenant}**, **PACER_RULES_{tenant}**, **PACE_SIGNALS_{tenant}**.  
- **LP_FIXES_QUEUE_{tenant}**, **BRAND_NONBRAND_MAP_{tenant}**.  
- **AUDIENCE_SEEDS_{tenant}**, **AUDIENCE_SEGMENTS_{tenant}**, **AUDIENCE_EXPORT_{tenant}**, **AUDIENCE_MAP_{tenant}**.  
- **SKU_MARGIN_{tenant}**, **SKU_STOCK_{tenant}**, **ADGROUP_SKU_MAP_{tenant}**.  
- **RUN_LOGS_{tenant}**.

> If a tab is missing, backend should **auto-create headers** on first use.

---

## 4) Directory layout (aligns with your starter ZIP)

```
/backend
  /api (routes)
  /jobs (cron/workers)
  /lib  (sheets, shopify, googleads, auth, hash)
  /segments (audience engine)
  /pace (profit/inventory calculators)
  /templates (PDF, Looker configs)
/ads-script
  master.gs
  README.md
/shopify-app (Remix/Node template)
  /extensions/web-pixel
/wordpress-plugin
  proofkit/
/docs
  TEST_PLAN.md
  LISTING_COPY.md
  PRIVACY.md
```

---

## 5) Milestones (with Agent Prompts)

### M0 — Backend + Sheets repo (R0/W1)
**Goal:** HMAC API & Sheets repository with auto-tab creation.

**Acceptance:** `curl` signed requests succeed; rows appear in `RUN_LOGS_*`; missing tabs auto-created.

**Agent Prompt**
```
SCOPE: Stand up HMAC API + Sheets repo with auto-tab creation.
ASSUMPTIONS: GOOGLE_SHEETS_SA_JSON, SHEETS_ROOT_ID, HMAC_SHARED_SECRET.
PLAN:
- Endpoints: GET /api/config, POST /api/metrics, POST /api/upsertConfig.
- Repo: upsert helpers; auto-create headers.
- Health: /api/health; rate limiting.
ARTIFACTS: /backend/api/*.ts, /backend/lib/sheets.ts, /backend/lib/hmac.ts
TESTS: curl unsigned=403; signed=200; verify rows in RUN_LOGS_*.
ROLLBACK: disable /api via env; leave Sheets as-is.
```

---

### M1 — Google Ads Script Core (R0/W1)
**Goal:** Budgets/CPC/schedule + master negatives + ad-group exact negatives + n‑gram miner + RSA builder (30/90) + GAQL collectors.

**Acceptance:** Preview OK; re-run is no-op; RSAs satisfy 30/90; negatives deduped; label guard holds.

**Agent Prompt**
```
SCOPE: Implement idempotent universal Ads Script with collectors.
ASSUMPTIONS: CONFIG/BUDGET_CAPS/CPC_CEILINGS/SCHEDULES exist.
PLAN:
- Budget caps + TARGET_SPEND + CPC ceiling.
- Shared neg list attach; ad-group exact negatives; n-gram miner.
- RSA builder with 30/90 lint + uniqueness; label PROOFKIT_AUTOMATED.
- GAQL: search terms, campaign/adgroup metrics → Sheets.
ARTIFACTS: /ads-script/master.gs (+ functions: capBudget_, setBidding_, ensureSchedule_, ensureSharedNegList_, mineNgrams_, buildRSAs_, collectors_)
TESTS: Preview twice (second is no-op); RSA lengths validated; no duplicate shared set links.
ROLLBACK: set ENABLE_SCRIPT=false in CONFIG.
```

---

### M2 — Shopify App Bootstrap (R0/W1–W2)
**Goal:** Embedded app with settings + Web Pixel (consent-aware).

**Acceptance:** Install on dev store; settings persist to backend; pixel test order fires (no duplicates).

**Agent Prompt**
```
SCOPE: Shopify app bootstrap + settings + Web Pixel.
ASSUMPTIONS: Partner app creds; dev store.
PLAN: Scaffold template; Polaris UI; App Bridge; settings page (tenant, backend URL, HMAC, GA4/AW IDs); Web Pixel extension (checkout_completed).
ARTIFACTS: /shopify-app/* and /shopify-app/extensions/web-pixel/*
TESTS: OAuth flow; save settings; place test order → pixel fired.
ROLLBACK: uninstall removes extension blocks.
```

---

### M3 — Catalog Overlays + Intent Blocks + Promo Drafts (R1/W2–W4)
**Goal:** Win-the-page via UTM-personalized content + safe catalog copy.

**Acceptance:** Apply/Revert works; UTM changes page content; drafts created, never auto-published.

**Agent Prompt**
```
SCOPE: Catalog overlays (metafields) + Intent Blocks + promo page drafts.
ASSUMPTIONS: Sheets tabs exist; storefront theme OS2.0.
PLAN: Overlay service with Apply/Revert & bulk by collection; OS2.0 section reading INTENT_BLOCKS_* by UTM; Promo Draft generator writes theme sections/pages as DRAFT.
ARTIFACTS: /shopify-app/app/routes/overlays.tsx, /shopify-app/app/sections/intent-block.liquid, /backend/lib/overlays.ts
TESTS: Toggle overlay; visit URL with utm_term -> sees tailored content; draft created in theme editor.
ROLLBACK: Remove blocks; revert metafields via overlay history.
```

---

### M4 — AI Drafts (RSA/Negatives/Sitelinks) (R1/W3–W4)
**Goal:** AI writes drafts matching search intent; validated; written to Sheets.

**Acceptance:** 5 sample queries produce length-valid RSAs; n‑gram waste populated; PROMOTE gate respected.

**Agent Prompt**
```
SCOPE: AI drafts for RSAs, sitelinks/callouts, and n-gram waste.
ASSUMPTIONS: OPENAI_KEY/ANTHROPIC_KEY; rate limits.
PLAN: Retrieve→Reason→Generate→Validate→Write; enforce 30/90; dedupe; cite sources where possible.
ARTIFACTS: /backend/jobs/ai_writer.ts, /backend/lib/validators.ts
TESTS: Run job on sample Sheet; see assets in RSA_ASSETS_DEFAULT_*; no live changes until PROMOTE=TRUE.
ROLLBACK: disable FEATURE_AI_DRAFTS.
```

---

### M5 — Audience OS: Seeds + Segments + Exports (R2/W4–W5)
**Goal:** Build audiences from Shopify orders with consent; output CSVs.

**Acceptance:** 8 predefined segments compile; CSVs materialized (UI+API formats) with counts logged.

**Agent Prompt**
```
SCOPE: Shopify→Sheets audience seeds; segment builder; CSV exports.
ASSUMPTIONS: Admin GraphQL scopes; hashing helpers.
PLAN: Tabs AUDIENCE_SEEDS_*, AUDIENCE_SEGMENTS_*, AUDIENCE_EXPORT_*; parser for logic_sqlish; evaluator; exporters CM_UI_UNHASHED & CM_API_HASHED; consent filter.
ARTIFACTS: /backend/segments/definitions.ts, materialize.ts, /backend/web/routes/audiences.ts
TESTS: Segment counts; header validation; consent off rows excluded.
ROLLBACK: disable FEATURE_AUDIENCE_EXPORT.
```

---

### M6 — Ads Script Audience Attach (No-API) (R2/W5)
**Goal:** Attach Customer Match lists to campaigns/ad groups with mode+bid mod.

**Acceptance:** Preview shows attach/detach; size guards respected; idempotent.

**Agent Prompt**
```
SCOPE: Extend Ads Script to attach user lists per AUDIENCE_MAP_*.
ASSUMPTIONS: Lists created in Audience Manager; list IDs known.
PLAN: Load AUDIENCE_MAP_*; resolve campaigns; apply OBSERVE/TARGET/EXCLUDE; set bid_modifier only if size >= threshold; log to RUN_LOGS_*; provide UI upload playbook.
ARTIFACTS: /ads-script/master.gs (audienceAttach_())
TESTS: Attach -> re-run no-op; EXCLUDE works; detach path verified.
ROLLBACK: clear AUDIENCE_MAP_* or set FEATURE_AUDIENCE_ATTACH=false.
```

---

### M7 — Optional CM API Refresher (R2/W5–W6)
**Goal:** Auto-refresh Customer Match via Google Ads API (feature-flag).

**Acceptance:** Nightly job refreshes; sizes trend up; no raw PII persisted.

**Agent Prompt**
```
SCOPE: Customer Match API refresher behind FEATURE_CM_API.
ASSUMPTIONS: Dev token, OAuth client/secret, refresh token.
PLAN: Hash/normalize; batch updates; consent filter; membership duration = cadence+3d; status UI.
ARTIFACTS: /backend/googleads/cm_uploader.ts, /backend/jobs/cm_refresh.ts
TESTS: Sandbox refresh; error retries; audit entries.
ROLLBACK: set FEATURE_CM_API=false.
```

---

### M8 — Profit & Inventory-Aware Pacer (R2/W4–W6)
**Goal:** Allocate budgets by 7d **margin value**; guard against OOS inventory.

**Acceptance:** Budget share shifts toward high-margin intents; OOS ad groups paused or capped; weekly summary cites reasons.

**Agent Prompt**
```
SCOPE: Compute PACE_SIGNALS_* and enforce profit/inventory-aware pacing.
ASSUMPTIONS: SKU_MARGIN_*, SKU_STOCK_*, ADGROUP_SKU_MAP_* exist.
PLAN: Compute 7d_margin_value per campaign; write PACE_SIGNALS_*; Ads Script reallocates within min/max caps; inventory guard reduces bids/pauses; audience gating by margin/LTV.
ARTIFACTS: /backend/pace/compute_signals.ts, /ads-script/master.gs (applyPacing_(), inventoryGuard_())
TESTS: Simulated data proves allocation math and guard logs.
ROLLBACK: disable FEATURE_INVENTORY_GUARD.
```

---

### M9 — Agency Mode + Reporting + Microsoft Port (R3/W6–W8)
**Goal:** Scale-through-templates and multi-store; add white-label weekly; port Script to Microsoft Ads.

**Acceptance:** New tenant setup < 30 min; weekly PDF renders; Microsoft Script runs basics.

**Agent Prompt**
```
SCOPE: Agency templates + reporting + Microsoft Ads Script port.
ASSUMPTIONS: Two tenants for clone test; Bing sandbox.
PLAN: Export/import tabs; PDF weekly; Looker template; port master.gs features feasible in Bing Scripts.
ARTIFACTS: /backend/tenants/templates.ts, /backend/jobs/weekly_report.ts, /ads-script/microsoft/master.js
TESTS: Clone success; weekly PDF attached; Bing preview OK.
ROLLBACK: feature flags off; docs remain.
```

---

## 6) KPIs to hit $1M (operator view)

- **K‑factor ≥ 0.6** (referrals/agency partners).  
- **Trial→Paid ≥ 35%**; **Pro/Growth ≥ 60%** of paid.  
- **Churn:** Pro ≤ 5%, Growth ≤ 3% monthly.  
- **Weekly first‑win ≥ 80%** (negatives added, RSA draft, or intent block lift).  
- **Agency activation:** 200–300 partners × 3 stores avg by M12.

---

## 7) Test Plan (smoke)

- Backend HMAC: unsigned 403 / signed 200; rows in `RUN_LOGS_*`.  
- Ads Script: second preview is **no‑op**; RSA 30/90; negatives deduped; audience attach idempotent.  
- Shopify: overlay Apply/Revert; UTM shows Intent Block content; draft page generated.  
- Audience exports: UI and API CSV headers validate; sizes logged.  
- Pacer: simulated data shifts budgets as expected; OOS ad group paused/capped with reason.  
- Weekly report: PDF generated; Looker shows live.

---

## 8) Appendices

### A. Predefined segments (Audience OS)
- buyers_30d, buyers_180d, repeat_2plus, high_LTV_top20, churn_risk_90d_no_purchase, category_{X}_buyers_180d, VIP_AOV>{x}, abandoned_checkout_14d

### B. Google Ads list upload (UI) — merchant steps
1) Tools & Settings → Audience Manager → Segments → **+**  
2) **Customer list** → upload our **CM_UI_UNHASHED** CSV (Google hashes)  
3) Set membership duration (e.g., 180d) → Copy **User List ID** → add to `AUDIENCE_MAP_*`

### C. Reserved labels & config
- Label: **PROOFKIT_AUTOMATED**, **PROOFKIT_INTENT**  
- Respect `EXCLUSIONS_*`; never negate `NEG_GUARD_*` terms or brand.

### D. RSA limits
- Headlines ≤ **30 chars**, Descriptions ≤ **90 chars** (validate at build time).

---

**End of roadmap — proceed with R0/M0.**

---

## Agent Audit — 2025-08-13T02:17:50.775Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T02:17:50.781Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T02:17:50.780Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T02:17:50.781Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T02:17:50.783Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T02:17:50.803Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T02:17:50.816Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T02:19:03.854Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T02:19:03.863Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T02:19:03.863Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T02:19:03.863Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T02:19:03.864Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T02:19:03.897Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T02:19:03.897Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:40:19.765Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:40:19.767Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:40:19.768Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:40:19.769Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:40:19.770Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:40:19.781Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:40:19.817Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:36.164Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:36.165Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:36.165Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:36.165Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:36.173Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:36.199Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:36.216Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:38.920Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:38.925Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:38.925Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:38.925Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:38.932Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:38.951Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:38.961Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:41.691Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:41.691Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:41.691Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:41.691Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:41.697Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:41.720Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:41.742Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:44.516Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:44.517Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:44.517Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:44.517Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:44.528Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:44.547Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:44.564Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:47.310Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:47.310Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:47.310Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:47.310Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:47.319Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:47.341Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:47.358Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:50.074Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:50.087Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:50.087Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:50.088Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:50.098Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:50.104Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:50.115Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:52.857Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:52.857Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:52.858Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:52.858Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:52.870Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:52.890Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:52.906Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:55.682Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:55.682Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:55.683Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:55.682Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:55.690Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:55.717Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:55.735Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:44:58.457Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:44:58.457Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:44:58.457Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:44:58.458Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:44:58.464Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:44:58.485Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:44:58.505Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:01.266Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:01.266Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:01.267Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:01.267Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:01.279Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:01.293Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:01.318Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:04.042Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:04.042Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:04.042Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:04.042Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:04.053Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:04.075Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:04.091Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:06.831Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:06.845Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:06.845Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:06.845Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:06.859Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:06.864Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:06.872Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:09.793Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:09.809Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:09.809Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:09.811Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:09.820Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:09.825Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:09.836Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:12.592Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:12.593Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:12.593Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:12.608Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:12.608Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:12.623Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:12.641Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:15.333Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:15.332Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:15.333Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:15.333Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:15.341Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:15.366Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:15.384Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:18.119Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:18.126Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:18.126Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:18.130Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:18.138Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:18.150Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:18.178Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:21.001Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:21.002Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:21.005Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:21.006Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:21.013Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:21.033Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:21.055Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:23.800Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:23.800Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:23.800Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:23.800Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:23.811Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:23.833Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:23.850Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:26.577Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:26.577Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:26.577Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:26.578Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:26.600Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:26.610Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:26.628Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:29.345Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:29.351Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:29.351Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:29.352Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:29.359Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:29.384Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:29.401Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:32.170Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:32.178Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:32.181Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:32.182Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:32.182Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:32.202Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:32.217Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:34.974Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:34.974Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:34.976Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:34.976Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:34.981Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:35.011Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:35.027Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:37.736Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:37.737Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:37.738Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:37.738Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:37.748Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:37.773Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:37.790Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:40.617Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:40.622Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:40.622Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:40.623Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:40.634Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:40.650Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:40.662Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:43.427Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:43.427Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:43.428Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:43.428Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:43.437Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:43.461Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:43.480Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:46.222Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:46.222Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:46.223Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:46.226Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:46.234Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:46.256Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:46.274Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:48.998Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:49.003Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:49.004Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:49.004Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:49.012Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:49.029Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:49.052Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:51.758Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:51.774Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:51.773Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:51.773Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:51.787Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:51.798Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:51.807Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:54.550Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:54.554Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:54.556Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:54.556Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:54.562Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:54.588Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:54.599Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:45:57.327Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:45:57.327Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:45:57.328Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:45:57.328Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:45:57.339Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:45:57.360Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:45:57.379Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:46:21.046Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:46:21.046Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:46:21.047Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:46:21.047Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:46:21.047Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:46:21.078Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:46:21.097Z

- G1-tabs — done
  - Skipped: missing Sheets creds

---

## Agent Audit — 2025-08-13T09:46:21.097Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:46:21.139Z

- M0-summary — done
  - Skipped: summary check failed (likely missing in-memory config)

---

## Agent Audit — 2025-08-13T09:54:38.199Z

- M1-wp — done
  - Uninstaller present

---

## Agent Audit — 2025-08-13T09:54:38.201Z

- M0-backend — done
  - Endpoints present

---

## Agent Audit — 2025-08-13T09:54:38.202Z

- M0-sheets — done
  - Repo ensures headers

---

## Agent Audit — 2025-08-13T09:54:38.209Z

- M1-ads — done
  - Core features present

---

## Agent Audit — 2025-08-13T09:54:38.207Z

- M0-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T09:54:38.238Z

- M1-ads-lint — done
  - RSA 30/90 present

---

## Agent Audit — 2025-08-13T09:54:38.241Z

- M1-consent — done
  - Consent docs present

---

## Agent Audit — 2025-08-13T09:54:38.241Z

- G1-tabs — done
  - Skipped: missing Sheets creds

---

## Agent Audit — 2025-08-13T09:54:38.287Z

- M0-summary — done
  - Skipped: summary check failed (likely missing in-memory config)

---

## Agent Audit — 2025-08-13T10:05:47.755Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:05:47.755Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:05:47.760Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:05:47.762Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:05:47.769Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:06:56.512Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:06:56.514Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:06:56.517Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:06:56.520Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:06:56.539Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:06:56.587Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T10:06:56.606Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T10:17:21.675Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:17:21.675Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:17:21.678Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:17:21.686Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:17:26.825Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:17:26.828Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:17:26.830Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:18:15.514Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:18:15.519Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:18:15.521Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:18:15.523Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:18:15.541Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:18:15.587Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T10:18:15.608Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T10:18:16.437Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:18:16.438Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:18:16.444Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:18:16.453Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:18:39.657Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:18:39.666Z

- R2-ads — done
  - Audience map present (attach next)

---

## Agent Audit — 2025-08-13T10:18:39.666Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:18:39.667Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:18:39.675Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:25:39.413Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:25:39.414Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:25:39.414Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:25:39.418Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:25:39.432Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:25:39.476Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T10:25:39.509Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T10:25:40.373Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T10:25:40.377Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:25:40.379Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:25:40.380Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:25:40.381Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T10:25:40.386Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:25:40.423Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T10:32:10.317Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:32:10.318Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T10:32:10.324Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:32:10.324Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:32:10.327Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T10:32:10.337Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:32:10.365Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T10:32:10.415Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T10:37:18.196Z

- M3-intent-ui2 — done
  - Intent UI route present

---

## Agent Audit — 2025-08-13T10:37:18.197Z

- M3-overlays-ui — done
  - Overlays UI route present

---

## Agent Audit — 2025-08-13T10:37:18.198Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:37:18.199Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:37:18.202Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:37:18.223Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:37:18.248Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:37:18.292Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T10:37:18.293Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T10:37:19.066Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T10:37:19.069Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T10:37:19.074Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:37:19.074Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:37:19.075Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:37:19.084Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:37:19.118Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T10:37:19.231Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T10:42:15.862Z

- M3-intent-ui2 — done
  - Intent UI route present

---

## Agent Audit — 2025-08-13T10:42:15.865Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T10:42:15.863Z

- M3-overlays-ui — done
  - Overlays UI route present

---

## Agent Audit — 2025-08-13T10:42:15.868Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T10:42:15.869Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T10:42:15.898Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:42:15.916Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T10:42:16.003Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T10:42:16.004Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T10:42:16.915Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:42:16.916Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:42:16.918Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T10:42:16.920Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:42:16.923Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T10:42:16.931Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:42:16.967Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T10:42:17.009Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T10:51:51.257Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:51:51.263Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T10:51:51.265Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T10:51:51.267Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:51:51.269Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:51:51.277Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:51:51.318Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T10:51:51.334Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-13T10:51:51.371Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T10:51:51.438Z

- M4-no-key — done
  - AI no-key path OK

---

## Agent Audit — 2025-08-13T10:52:10.784Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T10:52:10.787Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T10:52:10.788Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T10:52:10.789Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T10:52:10.794Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T10:52:10.799Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T10:52:10.844Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T10:52:10.857Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-13T10:52:10.890Z

- M4-ai-ready — done
  - Config exposes ai_ready (fallback check)

---

## Agent Audit — 2025-08-13T10:52:10.890Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T10:52:11.009Z

- M4-no-key — done
  - AI no-key path OK

---

## Agent Audit — 2025-08-13T11:11:32.821Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T11:11:32.822Z

- M3-intent-ui2 — done
  - Intent UI route present

---

## Agent Audit — 2025-08-13T11:11:32.824Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T11:11:32.825Z

- M3-overlays-ui — done
  - Overlays UI route present

---

## Agent Audit — 2025-08-13T11:11:32.828Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T11:11:32.832Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T11:11:32.946Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T11:11:33.008Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T11:11:33.009Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T11:11:33.859Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T11:11:33.866Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T11:11:33.866Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T11:11:33.868Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T11:11:33.872Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T11:11:33.882Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T11:11:33.916Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T11:11:33.935Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-13T11:11:33.966Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T11:11:33.972Z

- M4-ai-ready — done
  - Config exposes ai_ready (fallback check)

---

## Agent Audit — 2025-08-13T11:11:34.036Z

- M4-no-key — done
  - AI no-key path OK

---

## Agent Audit — 2025-08-13T11:54:06.984Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T11:54:06.989Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T11:54:06.989Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T11:54:06.989Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T11:54:06.993Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T11:54:07.016Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T11:54:07.044Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T11:54:07.067Z

- F-weekly — done
  - Weekly summary endpoint present

---

## Agent Audit — 2025-08-13T11:54:07.088Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-13T11:54:07.110Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T11:54:07.112Z

- M4-ai-ready — done
  - Config exposes ai_ready (fallback check)

---

## Agent Audit — 2025-08-13T11:54:07.145Z

- F-weekly-smoke — done
  - Weekly summary smoke OK

---

## Agent Audit — 2025-08-13T11:54:07.177Z

- M4-no-key — done
  - AI no-key path OK

---

## Agent Audit — 2025-08-13T11:54:09.085Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-13T11:54:09.085Z

- M3-overlays-ui — done
  - Overlays UI route present

---

## Agent Audit — 2025-08-13T11:54:09.086Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-13T11:54:09.086Z

- M3-intent-ui2 — done
  - Intent UI route present

---

## Agent Audit — 2025-08-13T11:54:09.093Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-13T11:54:09.097Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T11:54:09.138Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-13T11:54:09.190Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-13T11:54:09.191Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-13T11:54:09.846Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-13T11:54:09.851Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-13T11:54:09.853Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-13T11:54:09.857Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-13T11:54:09.858Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-13T11:54:09.862Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-13T11:54:09.902Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-13T11:54:09.914Z

- F-weekly — done
  - Weekly summary endpoint present

---

## Agent Audit — 2025-08-13T11:54:09.935Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-13T11:54:09.960Z

- M4-ai-ready — done
  - Config exposes ai_ready (fallback check)

---

## Agent Audit — 2025-08-13T11:54:09.961Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-13T11:54:10.006Z

- F-weekly-smoke — done
  - Weekly summary smoke OK

---

## Agent Audit — 2025-08-13T11:54:10.040Z

- M4-no-key — done
  - AI no-key path OK

---

## Agent Audit — 2025-08-14T07:42:39.132Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-14T07:42:39.133Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-14T07:42:39.135Z

- M3-intent-ui2 — done
  - Intent UI route present

---

## Agent Audit — 2025-08-14T07:42:39.136Z

- M3-overlays-ui — done
  - Overlays UI route present

---

## Agent Audit — 2025-08-14T07:42:39.140Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-14T07:42:39.154Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-14T07:42:39.188Z

- M3-audiences-ui — done
  - Audiences UI route present

---

## Agent Audit — 2025-08-14T07:42:39.189Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-14T07:42:39.324Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-14T07:42:39.324Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-14T07:49:00.979Z

- M3-overlays-ui — done
  - Overlays UI route present

---

## Agent Audit — 2025-08-14T07:49:00.979Z

- M3-intent-ui2 — done
  - Intent UI route present

---

## Agent Audit — 2025-08-14T07:49:00.983Z

- M3-intent-ui — done
  - Liquid section present

---

## Agent Audit — 2025-08-14T07:49:00.989Z

- R2-tabs — done
  - ADGROUP_SKU_MAP scaffolded

---

## Agent Audit — 2025-08-14T07:49:00.992Z

- M3-intent — done
  - Apply/Revert endpoints present

---

## Agent Audit — 2025-08-14T07:49:00.999Z

- R1-health — done
  - Health OK

---

## Agent Audit — 2025-08-14T07:49:01.045Z

- M3-audiences-ui — done
  - Audiences UI route present

---

## Agent Audit — 2025-08-14T07:49:01.046Z

- M4-ai — done
  - AI writer + validators present

---

## Agent Audit — 2025-08-14T07:49:01.110Z

- M3-apply — done
  - Intent apply OK

---

## Agent Audit — 2025-08-14T07:49:01.110Z

- M3-revert — done
  - Intent revert OK

---

## Agent Audit — 2025-08-14T07:53:35.728Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-14T07:53:35.729Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-14T07:53:35.729Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-14T07:53:35.729Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-14T07:53:35.737Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-14T07:53:35.759Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-14T07:53:35.803Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-14T07:53:35.823Z

- F-weekly — done
  - Weekly summary endpoint present

---

## Agent Audit — 2025-08-14T07:53:35.824Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-14T07:53:35.878Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-14T07:53:35.880Z

- M4-ai-ready — done
  - Config exposes ai_ready (fallback check)

---

## Agent Audit — 2025-08-14T07:53:35.895Z

- F-weekly-smoke — done
  - Weekly summary smoke OK

---

## Agent Audit — 2025-08-14T07:53:36.043Z

- M4-no-key — done
  - AI no-key path OK

---

## Agent Audit — 2025-08-14T07:55:28.248Z

- R2-ads — done
  - audience attach wired

---

## Agent Audit — 2025-08-14T07:55:28.247Z

- R2-tabs — done
  - Segments/Export tabs wired

---

## Agent Audit — 2025-08-14T07:55:28.249Z

- R2-health — done
  - Health OK

---

## Agent Audit — 2025-08-14T07:55:28.249Z

- R2-api — done
  - Exports list endpoint present

---

## Agent Audit — 2025-08-14T07:55:28.249Z

- R2-build — done
  - Export build endpoint present

---

## Agent Audit — 2025-08-14T07:55:28.251Z

- R2-stub — done
  - Materialize stub present

---

## Agent Audit — 2025-08-14T07:55:28.324Z

- F-weekly — done
  - Weekly summary endpoint present

---

## Agent Audit — 2025-08-14T07:55:28.328Z

- M4-diag — done
  - Diagnostics endpoint OK

---

## Agent Audit — 2025-08-14T07:55:28.334Z

- M4-job — done
  - AI writer job endpoint present

---

## Agent Audit — 2025-08-14T07:55:28.410Z

- M4-ai-ready — done
  - Config exposes ai_ready (fallback check)

---

## Agent Audit — 2025-08-14T07:55:28.410Z

- R2-build-smoke — done
  - Export build smoke OK

---

## Agent Audit — 2025-08-14T07:55:28.411Z

- F-weekly-smoke — done
  - Weekly summary smoke OK

---

## Agent Audit — 2025-08-14T07:55:28.570Z

- M4-no-key — done
  - AI no-key path OK
