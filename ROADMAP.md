# Ads Autopilot AI — Tier Feature Roadmap

## Subscription Tiers

| | Starter ($29/mo) | Professional ($79/mo) | Enterprise ($199/mo) |
|---|---|---|---|
| **Campaigns** | 5 | 25 | Unlimited |
| **Data Retention** | 7 days | 30 days | 90 days |
| **AI Campaign Optimization** | Basic | Advanced | Full suite + custom rules |
| **Bid Management** | Manual | Automated | Advanced strategies |
| **Analytics** | Basic performance | Real-time analytics | Custom dashboards |
| **Competitor Insights** | -- | Auction insights | Auction insights |
| **Reports** | Monthly (email) | Weekly (email) | Daily + custom |
| **Autopilot** | Basic monitoring | Full autopilot | Full + custom rules |
| **Support** | Email | Priority email | Priority phone + email |
| **ROAS Tracking** | Basic | Advanced analytics | Custom modeling |

---

## Implementation Status

### Fully Implemented

| Feature | Tier | Status |
|---------|------|--------|
| Google Ads OAuth connection | All | Done |
| Campaign list + metrics from API | All | Done |
| Campaign creation wizard | All | Done |
| Campaign pause/enable/budget edit | All | Done |
| AI ad copy generation (AIContentStudio) | All | Done |
| Competitor Insights (CompetitorIntel) | Pro+ | Done (frontend + backend gating) |
| Autopilot controls (enable/disable, aggressiveness) | All | Done |
| Autopilot optimization engine | All | Done |
| Data sync from Google Ads | All | Done |
| Subscription management via Shopify managed pricing | All | Done |
| HMAC-signed backend API calls | All | Done |
| NavMenu sidebar navigation (5 pages) | All | Done |

### Newly Implemented (Tier Gating Update)

| Feature | Details | Status |
|---------|---------|--------|
| Subscription enforcement on Google Ads routes | requireActiveSubscription() middleware | Done |
| Campaign limit enforcement | enforceCampaignLimits() on /campaigns/create (5/25/unlimited) | Done |
| Feature gating: Auction Insights | requireFeature("advanced_ai_optimization") — Pro+ only | Done |
| Feature gating: Optimize endpoint | requireFeature("automated_bid_management") — Pro+ only | Done |
| Billing bypass removed | BILLING_ENFORCEMENT_DISABLED opt-out replaces BILLING_ENFORCEMENT_ACTIVE opt-in | Done |
| Data retention cleanup | Daily cron deletes old metrics per tier (7/30/90 days) | Done |
| Metrics date clamping | API clamps date range to tier retention limit | Done |
| Frontend campaign limit UI | Shows upgrade banner when at campaign limit | Done |
| getCurrentUsage() real implementation | Uses getCampaignCount() from campaign-counter.js | Done |

### Not Yet Implemented (Future Work)

| Feature | Tier | Priority | Notes |
|---------|------|----------|-------|
| Weekly/daily email reports | Pro/Enterprise | Medium | Requires email service (SendGrid/Postmark) |
| Custom AI optimization rules | Enterprise | Medium | UI for defining custom rules, backend rule engine |
| Custom performance dashboards | Enterprise | Low | Dashboard builder exists in backend but not exposed in UI |
| Advanced bid strategies UI | Enterprise | Medium | Backend supports it, needs frontend |
| Custom ROAS modeling | Enterprise | Low | Requires ML pipeline or advanced analytics |
| Priority support SLA tracking | Enterprise | Low | External tool integration (Zendesk/Intercom) |
| Real-time analytics websocket | Pro+ | Low | Currently polling-based, works fine |
| GA4 integration | All | Medium | TrafficPatterns component exists but GA4 not connected |
| SERP monitoring | Pro+ | Low | SERPMonitor component exists but needs SerpAPI key |

---

## Architecture Notes

### Tier Enforcement Flow

1. **Frontend** (Shopify UI): `checkSubscriptionStatus()` queries Shopify GraphQL for active subscription
2. **Tier sync**: Dashboard loader calls `backendFetch("/billing/shopify/sync-tier")` to sync tier to backend
3. **Backend storage**: Tier stored in `tenant_subscriptions` table (Supabase)
4. **Route middleware**: `requireActiveSubscription()` checks subscription status on every Google Ads API call
5. **Feature middleware**: `requireFeature("feature_name")` checks if tenant's tier includes the feature
6. **Campaign limits**: `enforceCampaignLimits()` checks campaign count against tier limit before creation
7. **Data retention**: Daily cron deletes old data, API clamps date ranges to tier limits

### Key Files

| File | Purpose |
|------|---------|
| `backend/middleware/subscription-check.js` | Primary tier enforcement middleware |
| `backend/middleware/usage-limits.js` | Campaign/usage limit checking |
| `backend/services/campaign-counter.js` | Campaign count tracking + limit enforcement |
| `backend/services/data-retention.js` | Daily data cleanup by tier |
| `backend/routes/google-ads.js` | All Google Ads API routes (with middleware) |
| `shopify-ui/app/utils/subscription.server.ts` | Frontend subscription checking |
| `shopify-ui/app/routes/app.campaigns.tsx` | Campaign page with limit UI |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `BILLING_ENFORCEMENT_DISABLED` | Set to `"true"` to disable billing checks (dev only) | Not set (enforcement active) |
| `SHOPIFY_APP_HANDLE` | App handle for managed pricing URL | `adsautopilot-autopilot` |
