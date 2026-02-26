# Ads Autopilot AI — Google Ads API Integration Roadmap

## Overview

Replace the current script-paste approach with direct Google Ads API integration. Users connect their own Google Ads accounts via OAuth, and the app manages campaigns, optimizations, and reporting directly through the API.

**API Access Level:** Basic (15,000 operations/day shared across ALL tenants)

---

## Phase 1: OAuth + API Client Foundation (Week 1-2)

### Goals
- Users can connect their Google Ads account via OAuth
- Backend can make authenticated API calls on their behalf
- Global quota tracking ensures we stay under 15,000 ops/day

### Backend
- [ ] Install `google-ads-api` npm package
- [ ] Supabase migration: `google_ads_connections`, `google_ads_daily_quotas`, `google_ads_operation_log`
- [ ] `google-ads-auth.js` — OAuth flow (generate URL, exchange code, refresh tokens, encrypt storage)
- [ ] `google-ads-client.js` — Core API wrapper (campaign/adgroup/keyword/RSA CRUD, GAQL reports)
- [ ] `google-ads-quota.js` — Global quota tracker (15k/day, fair-share allocation, check before every call)
- [ ] Routes: auth URL, callback, connection status, list accounts, select account, disconnect

### Frontend
- [ ] `app.connect-google.tsx` — Connection page with OAuth button (iframe-safe)
- [ ] `auth.google-ads.callback.tsx` — OAuth callback handler
- [ ] Update `hmac.server.ts` — Add op keys for `/google-ads/*` endpoints
- [ ] Connection status component

### Verification
- Connect a test Google Ads account via OAuth
- List accessible accounts, select one, verify connection status

---

## Phase 2: Campaign Management via API (Week 3-4)

### Goals
- Create, view, pause, and manage campaigns directly from the app
- No more script copy-paste

### Backend
- [ ] `google-ads-campaign-manager.js` — Create full campaigns (~15 ops), pause/enable (1 op), update budget, manage keywords
- [ ] Campaign CRUD routes
- [ ] Extend `campaign-optimizer.js` with `executePlan()` via API
- [ ] Extend `rsa-generator.js` with `pushRSAToGoogleAds()`

### Frontend
- [ ] Rewrite `app.autopilot.tsx` — Campaign list + creation wizard (no script)
- [ ] `CampaignCreationWizard.tsx` — Step-by-step campaign builder
- [ ] `GoogleAdsConnectionGuard.tsx` — Redirect if not connected

### Verification
- Create a campaign from the app, verify in Google Ads dashboard
- Pause/enable/update budget from the app

---

## Phase 3: Data Sync & Real Dashboard (Week 5)

### Goals
- Dashboard shows real performance data from Google Ads
- Periodic sync keeps data fresh without burning quota

### Backend
- [ ] `google-ads-sync.js` — Pull metrics, search terms, keywords into Supabase (~5-8 ops/tenant)
- [ ] Sync schedules: metrics every 4hrs, search terms daily, on-demand if stale
- [ ] Quota-aware syncing (skip if budget low)

### Frontend
- [ ] `app._index.tsx` — Real metrics + connection status
- [ ] `PerformanceInsights.tsx` — Wire to real synced data
- [ ] `CampaignManager.tsx` — Real campaigns with actions
- [ ] "Last synced" indicator + manual refresh

### Sync Frequency by Tier
| Tier | Metrics | Search Terms | Optimization |
|------|---------|-------------|--------------|
| Starter ($29) | 4hrs | Daily | Daily |
| Professional ($79) | 2hrs | 6hrs | 6hrs |
| Enterprise ($199) | 1hr | 3hrs | 4hrs |

---

## Phase 4: Autopilot Engine (Week 6)

### Goals
- Automated server-side optimization replaces the Google Ads Script
- AI-powered recommendations with optional auto-apply

### Backend
- [ ] `google-ads-autopilot.js`:
  1. Pull fresh metrics
  2. Run campaign optimizer + negative analyzer + ML autopilot
  3. Build prioritized action queue (safety > waste > optimization > growth)
  4. Execute within remaining quota
  5. Log all actions
- [ ] Extend `bid-manager.js`, `negative-analyzer.js` with API execution
- [ ] Optimization cron job

### Frontend
- [ ] `AutopilotControls.tsx` — Enable/disable, aggressiveness, auto-approve, guardrails
- [ ] Optimization log in dashboard

---

## Phase 5: Wire Up Remaining Features (Week 7)

| Feature | Data Source | Work |
|---------|------------|------|
| AI Content Studio | `/ai/generate/rsa` + API push | Wire RSA deploy |
| Competitor Intel | Auction Insights GAQL | New sync |
| Search Terms | `search_terms` (synced) | Already done in Phase 3 |
| Negative Keywords | `negative-analyzer.js` + API | Already done in Phase 4 |
| Reports | `tenant_metrics` + `report-generator.js` | Wire to synced data |
| Anomaly Detection | `anomaly-detection.js` | Run on synced metrics |

### Deferred (separate integrations needed)
- SERP Monitor — needs external SERP API
- Traffic Patterns — needs GA4 integration
- Customer Segments — partial from Google Ads audiences

---

## Quota Budget (Basic Access: 15,000 ops/day)

| Operation | Ops |
|-----------|-----|
| Campaign metrics report | 1 |
| Search terms report | 1 |
| Create full campaign | ~15 |
| Update budget / pause / enable | 1 |
| Add negative keywords (batch) | 1 |
| Full data sync per tenant | ~5-8 |
| Autopilot cycle per tenant | ~10-50 |

| Active tenants | Ops/tenant/day | Status |
|---------------|----------------|--------|
| 10 | ~1,500 | Comfortable |
| 50 | ~300 | Good |
| 100 | ~150 | Manageable |
| 200+ | <75 | Apply for Standard access |

---

## Risks & Mitigations
- **Quota exhaustion**: Global counter checked before every API call. Autopilot defers non-critical actions when quota low.
- **Token expiry**: Auto-refresh on every API call. Alert user if refresh fails.
- **Shopify iframe OAuth**: Use `window.open('_top')` to escape iframe for Google consent screen.
- **API errors**: Structured error handler maps Google Ads errors to user-friendly messages. Retry with backoff.
- **Scaling beyond Basic**: Monitor quota usage. Apply for Standard access at ~100 tenants.

