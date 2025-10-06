# Ads Autopilot AI – Launch Todo Board

> Updated: $(date +"%Y-%m-%d")

## Sprint 0 (Week 1) – Kickoff Checklist
- [ ] ✅ Rename all “Ads Autopilot AI” references to “Ads Autopilot AI” (code, UI, docs, marketing assets)
- [ ] Configure production environment variables (Shopify app, Supabase, job worker) with new branding
- [ ] Align squads on sprint ceremonies and communication channels

## Data & Intelligence Squad
### Pipeline Stabilization
- [ ] Update Google Ads script with production BACKEND_URL + tenant id + secret rotation
- [ ] Ensure metrics payload includes `period`, `date`, `entity_type`, cost micros, conversions for each asset level
- [ ] Verify `/api/metrics` persists to `campaign_metrics`, `ad_group_metrics`, `search_terms`, `tenant_metrics`
- [ ] Build ingestion monitoring dashboard (row counts, latest timestamp, error logs)

### Historical Backfill
- [ ] Draft backfill script (GAQL reports → Supabase)
- [ ] Run 30/90 day import for canary tenant
- [ ] Validate data quality (CTR, spend, conversions) vs Google Ads UI

### Insight Engine
- [ ] Populate `/api/ai/performance/insights` device/keyword arrays from Supabase
- [ ] Implement anomaly detection + spend pacing helpers (PL/pgSQL)
- [ ] Ship AI insight templates fed by real metrics

## Product Experience Squad
### Rebrand & Polish
- [ ] Update Shopify UI copy, titles, metadata to Ads Autopilot AI
- [ ] Replace placeholder illustrations/icons with final brand assets
- [ ] Refresh docs (`README`, submission checklist, support pages)

### Dashboard Reality
- [ ] Connect charts and tables to Supabase queries with loading + empty states
- [ ] Add manual refresh + last-updated indicator per widget
- [ ] QA period selector (TODAY, LAST_7_DAYS, LAST_30_DAYS, LAST_90_DAYS) with real data

### Async AI UX
- [ ] Convert “Generate Ads” action to queue job → show immediate “processing” toast
- [ ] Implement job status polling + notification banner/toast when AI copy ready
- [ ] Build content library with history, filters, copy-to-clipboard

### Guided Automations
- [ ] Replace mock “Apply Suggestion” cards with real recommendations
- [ ] Provide diff preview + confirmation modal for each automation
- [ ] Log applied automations to Supabase (`automation_logs`) and surface in UI

## Growth & Compliance Squad
### Security & Ops
- [ ] Apply Supabase RLS policies for queue tables (jobs, job_logs, performance_metrics, etc.)
- [ ] Audit secrets/storage; document rotation procedures
- [ ] Set up centralized logging (Vercel + Supabase + worker) with alerting

### Billing & Tiering
- [ ] Implement Shopify billing verification middleware in production
- [ ] Enforce tier limits (campaign count, data retention, automation frequency)
- [ ] Create in-app upgrade prompts + trial expiration flow

### Launch Readiness
- [ ] Prepare Shopify App Store listing (screenshots, copy, pricing)
- [ ] Write support knowledge base + onboarding checklist
- [ ] Recruit 3 beta stores for testimonials + case studies

## Backlog / Future Enhancements
- [ ] Cross-channel integrations (Performance Max, Meta Ads)
- [ ] Conversational copilot for “why” explanations
- [ ] Automated experiment management (A/B scripts)
- [ ] Partner API + agency multi-account dashboard

---
Track progress in weekly stand-ups and update this board after each sprint review.

