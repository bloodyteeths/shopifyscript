# Ads Autopilot AI – Launch Roadmap

## Executive Summary
Ads Autopilot AI must move from a promising prototype to a dependable Shopify app that clients can trust to automate their Google Ads accounts. This roadmap focuses on three parallel workstreams—**Data & Intelligence**, **Product Experience**, and **Growth & Compliance**—that can be executed simultaneously by dedicated implementation squads (“agents”). The overall objective is to deliver a polished, production-ready app within the next 6–8 weeks, culminating in a public launch on the Shopify App Store.

## Guiding Principles
- **Real data first**: AI copy, insights, and automations rely on accurate, granular metrics. Data ingestion and verification are top priority.
- **Asynchronous by default**: Long-running AI tasks must run in the background with clear user notifications.
- **Security & trust**: Enforce RLS, respect Shopify billing, and implement audit logs before launch.
- **Iterate in weekly sprints**: Each workstream ships incremental value every week with demos and retro check-ins.

## Workstreams & Parallel Agents

### 1. Data & Intelligence Squad
**Mission**: Populate Supabase with reliable Google Ads metrics, power real analytics, and feed AI systems with meaningful context.

| Phase | Duration | Epic Goals | Key Deliverables |
|-------|----------|------------|------------------|
| **1A. Pipeline Stabilization** | Week 1 | Fix Google Ads script ingestion | ✅ Updated Ads script with period/date; ✅ Metrics endpoint persisting campaign/ad-group/keyword/search-term tables; ✅ Telemetry for ingestion failures |
| **1B. Historical Backfill** | Week 2 | Fill Supabase with 90 days of data | ✅ Backfill job using Ads API reports; ✅ Validation dashboards (Supabase row counts, sanity metrics) |
| **1C. Insight Engine** | Weeks 3–4 | Generate production-ready insights | ✅ Trend & device data APIs; ✅ AI insights templates using real metrics; ✅ Anomaly detection + recommendation rules |
| **1D. Automation Intelligence** | Weeks 5–6 | Feed automations with clean signals | ✅ PL/pgSQL helpers for spend pacing, waste detection; ✅ Metrics snapshots for before/after comparisons |

**Dependencies**: Access to Google Ads accounts, verified Supabase credentials, background job runner.

### 2. Product Experience Squad
**Mission**: Deliver a Shopify UI that feels premium, communicates automation progress, and reenforces user trust in Ads Autopilot AI.

| Phase | Duration | Epic Goals | Key Deliverables |
|-------|----------|------------|------------------|
| **2A. Rebrand & Polish** | Week 1 | Remove “Ads Autopilot AI”, establish Ads Autopilot AI voice | ✅ Global rebrand; ✅ Updated copy & assets; ✅ Store listing draft |
| **2B. Dashboard Reality** | Weeks 2–3 | Show real data in every widget | ✅ Period selector w/ dynamic KPIs; ✅ Charts populated from Supabase; ✅ Empty states and refresh actions |
| **2C. Async AI UX** | Weeks 3–4 | Turn AI content generation into background flow | ✅ Job-status polling; ✅ Toast/notification system; ✅ Content library history |
| **2D. Guided Automations** | Weeks 5–6 | Provide clear “next steps” | ✅ Automation checklist; ✅ “Apply” modals with diff preview; ✅ Logging + undo |

**Dependencies**: Workstream 1 data outputs, Shopify billing flow, job queue APIs.

### 3. Growth, Compliance & Launch Squad
**Mission**: Ensure monetization, security, and marketing readiness for the public Shopify launch.

| Phase | Duration | Epic Goals | Key Deliverables |
|-------|----------|------------|------------------|
| **3A. Platform Compliance** | Weeks 1–2 | Lock down security baseline | ✅ RLS policies on Supabase queues; ✅ Secrets rotation; ✅ Logging/audit trail |
| **3B. Shopify Billing & Tiering** | Weeks 2–3 | Enforce pricing tiers | ✅ Production billing integration; ✅ Tier-based feature gating; ✅ Trial-to-paid upgrade paths |
| **3C. Launch Readiness** | Weeks 4–5 | Pass Shopify review & plan GTM | ✅ App listing assets, demo videos; ✅ Support docs & status page; ✅ Beta customer testimonials |
| **3D. Post-Launch Flywheel** | Ongoing | Optimize retention & acquisition | ✅ NPS + feedback loop; ✅ Experiment backlog; ✅ Partnership outreach |

**Dependencies**: UX updates, stable SCP metrics, marketing resources.

## Cross-Stream Milestones
1. **Week 1**: Rebrand complete, data ingestion fixes merged, RLS enforced, background worker stub in place.
2. **Week 2**: Supabase backfill running, dashboard widgets driven by real data, billing integration QA.
3. **Week 4**: AI content async flow live, insights populated, automation previews available.
4. **Week 6**: Shopify submission package ready, early adopters onboarded, production monitoring configured.

## Operating Rhythm
- **Daily**: Stand-ups per squad (15 mins). Cross-squad async update in shared channel.
- **Weekly**: Friday demo + retro; Monday planning with updated to-do board.
- **Metrics**: Track ingestion health, AI job success rate, dashboard load times, active tenants, trial-to-paid conversions.

## Risks & Mitigations
- **Data sparsity**: Mitigate with synthetic data for QA + backfill script; block AI copy release until real metrics validated.
- **Long-running AI jobs**: Move to queue; enforce worker timeouts; surface status in UI.
- **Shopify review delays**: Start compliance checklist early; keep sandbox store ready for QA.
- **Security findings**: Perform internal audit; schedule penetration testing before launch.

## Next Actions (Week 1)
1. Finalize Ads Autopilot AI branding across repo and marketing materials.
2. Instrument Ads script posts and confirm Supabase tables refresh with live data.
3. Stand up job worker skeleton (e.g., Cloud Run) to dequeue AI writing tasks.
4. Implement Supabase RLS policies on queue tables and run migrations.
5. Align squads on sprint backlog (see `TODO.md`).

