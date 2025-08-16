
# Proofkit SaaS — Roadmap & Claude Rules (v1.0)

**Goal:** Ship a pair of merchant-friendly apps (Shopify + WordPress) powered by a backend + a universal Google Ads Script that optimizes Search campaigns without the Google Ads API. Win on *time-to-value*, *hands‑off optimization*, and *privacy‑first pixels*. Fast approval, zero gray areas.

---

## 0) Claude Rules (Agent Contract)

These rules keep every task crisp and reviewable. Claude should echo the checklist at the top of each reply, then deliver the artifacts.

**Always begin with:**

- **SCOPE:** One sentence on what you are changing and *why it matters to merchants*.
- **ASSUMPTIONS:** List env vars, IDs, and preconditions you expect.
- **PLAN:** Bullets of steps, each with an acceptance test.
- **ARTIFACTS:** Filenames and diffs (unified diff "+/-" lines), plus any new code.
- **TESTS:** Scriptable steps (curl or UI) to verify.
- **ROLLBACK:** What to revert if acceptance fails.

**Coding standards:**

- **Fail fast:** If a dependency or secret is missing, return a *single actionable command* to provide it.
- **Small diffs:** Prefer focused patches over monolithic rewrites.
- **Guardrails:** Never hardcode secrets; read from `.env`/WP options/Shopify app config.
- **Idempotent scripts:** Re‑runs must not duplicate labels, schedules, negatives, or RSAs.
- **Length linting:** Enforce RSA 30‑char headlines & 90‑char descriptions at build time.
- **Observability:** Log to backend `/api/metrics` → `RUN_LOGS_{tenant}` on every major mutation.
- **Prompts:** When generating ad copy/keywords, output **drafts + rationale + sources**; never push live without a “PROMOTE=TRUE” flag in config.

**Prompt patterns (for tasks that use AI):**

- **Retrieve → Reason → Generate → Validate → Write**. Always show the *validation* (length checks, duplicates, policy triggers).
- **Source‑aware:** Cite docs for any policy-sensitive action (Shopify review checklists, WP guidelines, Google Ads Script limits).

References (best practices): Anthropic prompt engineering & Claude Code guidelines. See links in _Appendix A_.

---

## 1) System Architecture (high‑level)

- **Backend (Node/Express):** HMAC‑auth API (`/api/config`, `/api/metrics`, `/api/upsertConfig`). Storage = Google Sheets (via service account) at launch; abstract a repository to swap for Postgres later.
- **Google Ads Script:** Pulls config, enforces budgets/bidding/schedules, builds RSAs (30/90), manages negatives, mines search terms, posts metrics.
- **Shopify App:** Official template (Remix/Node). OAuth + Embedded UI (Polaris). Web Pixel Extension for GA4/AW + Consent Mode v2 guidance.
- **WordPress Plugin:** Boilerplate‑based plugin with settings (GA4/AW/tenant/secret). Woo hooks for purchases. Optional backend forward.
- **AI Worker (optional in v1):** Periodic job reads performance + search terms + landing page → proposes headlines/descriptions/negatives; writes to Sheets tabs. Human promotion flag in config.
- **Dashboards:** Looker Studio template over Sheets, or a minimal in‑app dashboard (later).

---

## 2) Delivery Plan (Epics → Milestones → Acceptance)

### EPIC A — Backend (Week 1)
**A1. HMAC API + Sheets storage**
- Endpoints: `GET /api/config`, `POST /api/metrics`, `POST /api/upsertConfig`.
- **Acceptance:** `curl` tests with valid/invalid HMAC; rows appear in Sheets tabs for `RUN_LOGS`, `METRICS`, `SEARCH_TERMS`.

**A2. Tenant Config schema**
- Tabs: `CONFIG_{tenant}`, `BUDGET_CAPS_{tenant}`, `CPC_CEILINGS_{tenant}`, `SCHEDULES_{tenant}`, `MASTER_NEGATIVES_{tenant}`, `WASTE_NEGATIVE_MAP_{tenant}`, `RSA_ASSETS_DEFAULT_{tenant}`, `RSA_ASSETS_MAP_{tenant}`, `EXCLUSIONS_{tenant}`, `DESIRED_STATE_{tenant}`.
- **Acceptance:** Repo layer returns typed object; empty tabs auto‑create with headers.

**A3. Security & Ops**
- Rate limit by IP + tenant, request logging, health endpoint.
- **Acceptance:** Load test 10 rps; 429s appear post‑threshold.

### EPIC B — Google Ads Script (Week 1–2)
**B1. Universal script** (Search only)
- Budget caps, `TARGET_SPEND` + CPC ceiling, ad schedule if none, master negative list attach, ad‑group exact negatives, auto‑negate waste from ST report, RSA builder with 30/90 lint + dedupe + label guard, GAQL collectors.
- **Acceptance:** Preview logs show actions; rerun is idempotent; RSAs comply with 30/90; no duplicate shared set links.

**B2. Zero‑state seeding**
- Safe campaign + ad group + one RSA when the account has zero Search campaigns.
- **Acceptance:** New account → seeded with default budget/schedule/final URL.

**B3. Change safety**
- Skip entities listed in `EXCLUSIONS`.
- **Acceptance:** Entities in the map are untouched across runs.

### EPIC C — Shopify App (Week 2–3)
**C1. Bootstrap app using official template**
- Start from Shopify’s Remix or Node template; Polaris UI; App Bridge.
- **Acceptance:** OAuth works on a dev store; app loads embedded; health page.

**C2. Web Pixel Extension**
- Subscribes to checkout_completed; emits GA4/AW if configured.
- **Acceptance:** Test order fires client events; docs page instructs merchants to add Consent Mode v2 (CMP).

**C3. Settings UI**
- Tenant ID, HMAC secret, Backend URL, GA4/AW IDs; save + push subset via `/api/upsertConfig` (default_final_url).
- **Acceptance:** Settings persist; backend receives update; config GET returns merged value.

**C4. Review readiness (Built for Shopify)**
- Implement checklist items from Shopify’s **App Requirements** (UX, performance, support, privacy, billing if applicable).
- **Acceptance:** Internal review sheet with each requirement linked and evidenced (screenshots, Loom).

### EPIC D — WordPress Plugin (Week 3)
**D1. Build from WordPress Plugin Boilerplate**
- Settings page with GA4/AW + backend creds; Woo hooks for purchase event; optional run log forward.
- **Acceptance:** Install/activate on a test store; GA4/AW fires on thank you; settings saved.

**D2. Compliance**
- GPL license, i18n ready, sanitization/escaping, uninstaller.
- **Acceptance:** `phpcs` clean; passes plugin guidelines checklist.

### EPIC E — AI Assist (Week 4, optional for v1)
**E1. RSA & negatives generator**
- Worker reads last 100 search terms + top LP; drafts H/D & negatives with justifications and 30/90 validation; writes to `RSA_ASSETS_*` and `WASTE_NEGATIVE_MAP_*`.
- **Acceptance:** Human sets `PROMOTE=TRUE` → next script run creates/updates RSAs and negatives; if FALSE, no changes.

### EPIC F — Docs, Pricing, GTM (Week 4)
- One‑page onboarding; pricing page; privacy & data‑processing appendix; support policy & SLA.
- **Acceptance:** New merchant can deploy in <30 minutes end‑to‑end.

---

## 3) Open‑Source Accelerators (fork/borrow)

- **Shopify App templates (official):**
  - Node + React template (OAuth/Embedded/Polaris) — GitHub: `shopify-app-template-node`.  
  - Remix template (recommended) — GitHub: `shopify-app-template-remix`.  
- **Polaris UI + App Bridge:** Use Polaris components & guidelines; follow App Design docs.
- **Web Pixel Extension docs:** “Web Pixels API / pixels” + community threads for activation gotchas.
- **WordPress Plugin Boilerplate:** Devin Vinson’s boilerplate (plus demo plugin). Use WP‑CLI `scaffold plugin` as needed.
- **Google Ads Scripts examples:** Negative keyword lists; reporting/GAQL usage; AdsApp reference.
- **Consent Mode v2:** Google Tag Platform docs + review summaries (mandatory for EEA features like remarketing / modeled conversions).

See links in _Appendix A_.

---

## 4) Beating Competitors — Product Edge

- **No API Required:** Works in any Google Ads account with Scripts permissions; zero OAuth friction.
- **Zero‑state seeding:** Merchants with no structure get a safe, working Search campaign instantly.
- **Sheet‑as‑Brain:** Human/AI collaboration. All drafts, policies, and toggles live in Sheets → auditable and easy to revert.
- **Opinionated safety:** Guard labels, RSAs length linting, idempotent changes, exclusions map.
- **Pixels included:** Shopify Web Pixel + Woo hooks with clear Consent Mode v2 guidance.
- **Fast setup:** Copy/paste script + connect store plugin/app; < 30 minutes to value.

---

## 5) Shopify Approval — Fast Track Checklist

- Follow **App Requirements Checklist** line‑by‑line (branding, onboarding, quality, privacy, billing). Provide Help docs and contact info.
- Use **Polaris** for UI consistency; Embedded app (App Bridge). Ensure performance (avoid blocking calls, pagination for tables).
- Clear permissions explanation; no gray‑area data collection; CMP/Consent Mode instructions for EEA.
- App listing: crisp value prop, accurate screenshots, pricing, privacy policy, terms of service, support email.
- Prepare for **annual Built‑for‑Shopify reviews** (new in 2025). Keep docs and UX aligned.

(Links in _Appendix A_.)

---

## 6) Pricing & Packaging (initial)

- **Starter** $29/mo — Script optimizer + pixels + weekly email.
- **Pro** $99/mo — AI copy drafts, pacer, partner guardrail, daily alerts, dashboard.
- **Growth** $249/mo — Multi‑store, desired‑state builder, Slack alerts, priority support.
- 14‑day trial; 20% annual discount.

---

## 7) Acceptance Tests (smoke scripts)

- Backend HMAC: prove 403 on bad sig; 200 on good; new rows in Sheets.
- Ads Script: preview logs show caps/schedules/RSAs; second run makes no changes; new search term with ≥2 clicks & zero conversions becomes exact negative.
- Shopify Pixel: test order logs GA4/AW event; CMP blocks until consent; event fires after consent.
- WP Woo: purchase hook fires; settings persisted; run log forwarded.

---

## Appendix A — Source Links

- **Shopify app requirements checklist:** https://shopify.dev/docs/apps/launch/app-requirements-checklist
- **Built for Shopify program & annual reviews:** https://community.shopify.dev/t/preparing-for-annual-reviews-in-2025/3124  •  https://www.shopify.com/partners/blog/built-for-shopify-updates
- **Shopify app templates:** Remix — https://github.com/Shopify/shopify-app-template-remix  •  Node — https://github.com/Shopify/shopify-app-template-node
- **Polaris UI:** https://polaris-react.shopify.com/
- **Web Pixels API / pixel extension:** https://shopify.dev/docs/api/pixels  •  https://shopify.dev/docs/api/web-pixels-api
- **WordPress plugin guidelines & boilerplate:** Guidelines — https://developer.wordpress.org/plugins/wordpress-org/  •  Detailed — https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/  •  Boilerplate — https://github.com/DevinVinson/WordPress-Plugin-Boilerplate
- **Google Ads Scripts & GAQL:** AdsApp reference — https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp  •  Reporting GAQL — https://developers.google.com/google-ads/scripts/docs/features/reports  •  Negative keyword lists example — https://developers.google.com/google-ads/scripts/docs/examples/negative-keyword-lists
- **RSA limits (30/90):** https://support.google.com/google-ads/answer/7684791
- **Consent Mode v2:** https://developers.google.com/tag-platform/security/guides/consent

---

## Appendix B — Claude Prompt Template (paste into each task)

> **ROLE:** Senior engineer building Proofkit SaaS (backend + Shopify + WP + Ads Script).
>
> **GOAL:** {one‑sentence merchant impact}.
>
> **INPUTS:** `{env}`, `{tenant}`, relevant code snippets or file tree.
>
> **CONSTRAINTS:** Idempotent changes; secrets from env; follow App/WP/Google guidelines; RSA len 30/90; no duplicate shared sets; consent mode guidance.
>
> **DELIVER:** SCOPE / ASSUMPTIONS / PLAN / ARTIFACTS (diffs) / TESTS (curl & UI) / ROLLBACK.
>
> **VALIDATE:** Show length checks, idempotency proof, guideline references for any sensitive change.

---

## Agent Status & Audit — 2025-08-13

- A1. HMAC API + Sheets storage — done
  - Evidence: `/api/health` OK; signed `/api/upsertConfig` 200; unsigned `/api/config` 403; signed `/api/config` 200 (returns updated `default_final_url`).
  - Notes: In-memory fallback active if Sheets creds absent; repo layer present (`sheets.js`). Next agent: wire GOOGLE_SERVICE_EMAIL/GOOGLE_PRIVATE_KEY/SHEET_ID and validate row writes to `RUN_LOGS_*`.
- A2. Tenant Config schema — done
  - Evidence: Backend auto-creates and reads tabs via `ensureSheet` and returns typed `config` object with `BUDGET_CAPS`, `CPC_CEILINGS`, `SCHEDULES`, `MASTER_NEGATIVES`, `WASTE_NEGATIVE_MAP`, `RSA_ASSETS_*`, `EXCLUSIONS`.
  - Next: add a task to assert empty tabs get headers on first access.
- A3. Security & Ops — done
  - Evidence: Request logging (no secrets), health endpoint, IP+tenant rate limiting (429 on threshold).
  - Next: add metrics counter to `/api/metrics` writes for basic observability.
- B1. Universal Google Ads Script — done
  - Evidence: `ads-script/master.gs` includes budget caps, `TARGET_SPEND` + CPC ceiling, schedule if none, shared neg + waste exact negs, RSA builder with 30/90 lint + dedupe + label guard, GAQL collectors.
  - Next: add explicit preview test harness to assert second run is no-op.
- B2. Zero‑state seeding — done
  - Evidence: `ensureSeed_()` builds safe Search campaign/ad group/RSA when zero-state.
- B3. Change safety (EXCLUSIONS) — done
  - Evidence: `isExcludedCampaign_`/`isExcludedAdGroup_` added; all loops (budgets/bidding/schedules/negatives/ST auto-negation) check and skip.
- C1. Shopify App bootstrap — partial
  - Evidence: Node skeleton server with `/health`; install script; background runner.
  - Gap: OAuth/Embedded app (Polaris/App Bridge) not yet wired.
- C2. Web Pixel Extension — partial
  - Evidence: `checkout_completed` subscription emits GA4/AW events with consent gating.
  - Gap: documentation & broader consent checks.
- C3. Settings UI — partial
  - Evidence: `/settings` POST persists and forwards a subset to backend `/api/upsertConfig`.
  - Gap: Polaris UI and persistence not implemented.
- C4. Review readiness — pending
  - Gap: App Requirements checklist and evidence to be compiled.
- D1. WordPress plugin — done
  - Evidence: Settings page; Woo `thankyou` hook; GA4/AW send; optional run log forward to backend; `uninstall.php` removes options.
  - Next: add nonce checks across forms (basic present), test on a dev store.
- D2. Compliance — partial
  - Evidence: GPL header and sanitization/escaping in settings; uninstaller present.
  - Gap: i18n, `phpcs` config/run.

Notes for future Cursor agents
- Shopify: OAuth/Embedded + Polaris UI; Consent Mode v2 docs; pixel consent coverage.
- WordPress: add i18n and run `phpcs`.
- Backend: enable Sheets creds and validate writes; weekly summary job.

