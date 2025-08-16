
# Proofkit — Pricing Tiers & Master Roadmap (v2)

## Pricing & Features (merchant-friendly)

### STARTER — $29/mo
**Who it’s for:** Small stores that want Google Search ads that “just run” safely.

**Included**
- Instant “safe starter” Search campaign if you have none.
- Daily optimizer: budget caps, smart CPC ceilings, business-hours schedule.
- Auto-block money-wasting queries (exact negatives) from real search terms.
- Brand protection: never negates your brand terms.
- Pixel health check (GA4 + Google Ads) and Consent Mode v2 guidance.
- Weekly email summary: what happened, what changed, what’s next.
- Slack/email alerts for real anomalies (spend/CPA spikes).
- Full audit trail in your Google Sheet (“the brain”).
- Exclusions: mark any campaign/ad group “hands-off”.

### PRO — $99/mo
**Who it’s for:** Stores that want AI-generated ads and steady testing.

**Everything in Starter, plus**
- AI ad copywriter (RSA) that respects 30/90 limits.
- **RSA Test Queue:** rotates one new ad at a time; auto-pauses losers with significance.
- **Keyword Promotions:** converts winning search terms into new PHRASE/EXACT keywords.
- **Phrase-level waste blocker (n‑grams):** stops common bad phrases early.
- **Budget pacer:** shifts spend daily toward what’s converting (guardrails applied).
- Sitelinks / Callouts / Snippets drafts from your site (apply in one click).
- Shopify/WP: AI drafts for landing page sections (never auto-publishes).
- Plain-English “why we changed this” notes in your Sheet.

### GROWTH — $249/mo
**Who it’s for:** Multi-catalog stores pushing for scale and conversion rate lift.

**Everything in Pro, plus**
- **Asset Library:** pooled headlines/descriptions by theme; per-ad-group pulls.
- **Geo & daypart hints:** AI suggests regional/hour blocks; script applies schedules/modifiers where allowed.
- **Promo page generator:** AI drafts full landing pages for high‑intent themes.
- **Brand/Non‑brand mapping:** separate handling, optional split or tagging.
- **Pacer rules editor:** customize pacing/CPA guards in a simple table.
- Multi‑store support; team roles; advanced Slack alerts (thresholds & digests).
- Looker Studio template (one click) powered by your Sheet.

### ENTERPRISE — $699+/mo
**Who it’s for:** High‑spend brands and agencies that need deeper controls.

**Everything in Growth, plus**
- Custom rules & guardrails; allow/deny lists by campaign or theme.
- Server‑side tagging/Enhanced Conversions consultation & playbooks.
- Private model prompts for your category (regulated copy tone, claims control).
- Onboarding/implementation help; SSO; audit logs export; SLA.

---

## Master Roadmap (build order)

### Phase 0 — Foundation
- **Sheets schema** (per tenant): CONFIG, METRICS, SEARCH_TERMS, MASTER_NEGATIVES, KEYWORD_UPSERTS, BUDGET_CAPS, CPC_CEILINGS, EXCLUSIONS.
- **Backend** (HMAC API): `/api/config`, `/api/metrics`, `/api/upsertConfig` (Sheets storage).

### Phase 1 — Ads Script Core
- Budget caps + CPC ceilings + business-hours schedule (idempotent).
- Shared negative list + ad‑group exact negatives from Search Terms.
- RSA builder with 30/90 lint and label guard (no duplicates).
- Metrics & Search Terms collectors (GAQL) → write to Sheet.

### Phase 2 — AI Loop (Pro)
- **AI service** reads Sheets + landing page, writes:
  - RSA_ASSETS_DEFAULT (linted H/D); KEYWORD_UPSERTS; NGRAM_WASTE; CPC_CEILINGS; BUDGET_CAPS.
- Script applies **KEYWORD_UPSERTS** idempotently.
- **RSA Test Queue** + experiment logger (EXPERIMENTS tab).
- **LP Fixes Queue**: title/CTA/above‑the‑fold suggestions (Shopify/WP draft endpoints).

### Phase 3 — Growth Features
- **Asset Library** + per‑ad‑group pulls; protect brand terms (NEG_GUARD).
- **Geo/Daypart hints** → schedules/modifiers.
- **Promo Pages** (Shopify/WP): create drafts, never publish automatically.
- **Brand/Non‑brand map** → reporting & optional split/labels.
- **Pacer Rules** UI → budget reallocation with min/max guardrails.

### Phase 4 — Apps & Compliance
- Shopify app (Remix template, Polaris, App Bridge). OAuth + Embedded settings.
- Web Pixel extension (purchase events) + Consent Mode v2 guidance.
- WordPress plugin (Boilerplate): settings, Woo purchase hook, Enhanced Conversions option.
- Listing & review prep (Shopify app requirements; WP guidelines).

### Phase 5 — Observability & GTM
- Weekly summary builder; Slack/email alerts.
- Looker Studio dashboard prebuilt on Sheets.
- Pricing/billing (Shopify Billing for app; Stripe for WP users).
- Docs: onboarding, privacy, data processing, support SLA.

---

## Tables (Sheet-as-brain)

- **ASSET_LIBRARY**: theme | headline | description | tone | source
- **RSA_TEST_QUEUE**: campaign | ad_group | headlines_pipe | descriptions_pipe | start | end | status
- **NGRAM_WASTE**: phrase | notes
- **NEG_GUARD**: protected_term | type (brand/core)
- **PACER_RULES**: rule | param_a | param_b | active
- **GEO_DAYPART_HINTS**: region | hour_block | bid_modifier
- **LP_FIXES_QUEUE**: url | issue | suggested_fix | priority
- **BRAND_NONBRAND_MAP**: term | class

---

## Open‑Source starters to fork/borrow

- **Shopify App Template (Remix)** — OAuth + Embedded app baseline.  
- **Shopify App Template (Node)** — alternative foundation.  
- **Polaris UI & App Bridge** — admin UI components/patterns.  
- **Web Pixels API** — official pixel extension docs.  
- **WordPress Plugin Boilerplate** — clean plugin structure.  
- **WP Plugin Guidelines** — compliance for .org listing.  
- **Google Ads Scripts** — AdsApp reference; GAQL reporting.

(Links referenced in the spec; keep them in docs when forking.)

---

## Claude rules (quick)
- Start each task with: **SCOPE / ASSUMPTIONS / PLAN / ARTIFACTS (diffs) / TESTS / ROLLBACK**.
- Idempotent by design; secrets from env; no hardcoding.
- Validate RSA 30/90, duplicate checks, and NEG_GUARD before any live changes.
- Never publish Shopify/WP content automatically—**drafts only** unless `PROMOTE=TRUE` in CONFIG.

---

## Agent Status & Audit — 2025-08-13

- Phase 0 — Foundation: done
  - Evidence: Backend `/api/health` OK; HMAC 403 on bad sig; signed `/api/upsertConfig` 200 then `/api/config` 200 with updated `default_final_url`. Sheets repo abstraction present with auto-headers via `ensureSheet` and typed config assembly in `backend/server.js`.

- Phase 1 — Ads Script Core: done
  - Evidence: `ads-script/master.gs` enforces budget caps, CPC ceilings with `TARGET_SPEND`, adds business-hours schedule if none, attaches master negatives, adds ad‑group exact negatives from search terms, n‑gram waste application, RSA builder with 30/90 lint + dedupe + label guard, GAQL collectors; zero‑state seeding implemented; `EXCLUSIONS` guards added with `isExcludedCampaign_`/`isExcludedAdGroup_` across loops.
  - Next: preview harness to assert second run is no‑op.

- Phase 2 — AI Loop (Pro): not started
- Phase 3 — Growth Features: not started
- Phase 4 — Apps & Compliance: partial (Shopify Node skeleton + pixel consent; WP plugin + uninstaller)
- Phase 5 — Observability & GTM: partial (orchestrator + monitor; request logging & rate limit)

Notes for future Cursor agents
- Add Polaris/App Bridge settings UI + OAuth; Consent Mode docs.
- WP: i18n + `phpcs`.
- Enable Sheets creds and validate end-to-end flows + weekly summary job.

