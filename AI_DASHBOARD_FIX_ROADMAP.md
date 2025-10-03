# AI Dashboard Fix Roadmap
**Created**: 2025-10-03
**Estimated Completion**: 5-7 days for critical fixes
**Target**: Make dashboard show real-time, time-specific data from Google Ads

---

## 🎯 Mission
Fix the AI dashboard to display accurate, time-specific data instead of ALL-TIME aggregated metrics.

---

## Phase 1: Database Schema Fix (Day 1 - Morning)
**Duration**: 2-3 hours
**Priority**: CRITICAL - Blocks everything else

### Tasks:
1. ✅ Create migration to add `period` column to `tenant_metrics`
2. ✅ Update UNIQUE constraint to include period
3. ✅ Create indexes for period-based queries
4. ✅ Add `period` column to all comprehensive data tables:
   - `device_metrics`
   - `keyword_performance`
   - `hourly_patterns`
   - `geographic_performance`
   - `ad_performance`
   - `conversion_values`

### Deliverables:
- `migrations/012_add_period_tracking.sql`
- Migration applied to Supabase

---

## Phase 2: Google Ads Script Fix (Day 1 - Afternoon)
**Duration**: 4-6 hours
**Priority**: CRITICAL - Source of all data

### Tasks:
1. ✅ Rewrite `collectPerf_()` to collect EACH period separately
2. ✅ Add period field to all collection functions:
   - `collectCampaignDetails_()`
   - `collectDeviceMetrics_()`
   - `collectKeywordPerformance_()`
   - `collectHourlyPatterns_()`
   - `collectGeographicData_()`
   - `collectAdPerformance_()`
   - `collectConversionValue_()`
3. ✅ Update `sendMetrics_()` to include period in payload
4. ✅ Test script with dry-run mode

### Deliverables:
- Updated `embedded-script-v2.js`
- Test results showing multiple period data points

---

## Phase 3: Backend API Updates (Day 2)
**Duration**: 6-8 hours
**Priority**: CRITICAL - Dashboard is non-functional

### Part A: Fix Existing Endpoints
1. ✅ Update `/api/ai/stats/quick` to filter by period
2. ✅ Update `/api/metrics` to accept and store period field
3. ✅ Add time range validation and defaults
4. ✅ Remove hardcoded mock data

### Part B: Create Missing Endpoints
1. ✅ Create `/api/ai/campaigns` endpoint
2. ✅ Create `/api/ai/optimizations/stats` endpoint
3. ✅ Create `/api/ai/performance/insights` endpoint
4. ✅ Create `/api/ai/campaigns/optimize` endpoint

### Deliverables:
- Updated `routes/ai.js`
- Updated `routes/metrics.js`
- New endpoint files in `routes/`

---

## Phase 4: Data Storage Layer (Day 2 Evening)
**Duration**: 2-3 hours
**Priority**: HIGH - Ensures data integrity

### Tasks:
1. ✅ Update `dual-write.js` to handle period field
2. ✅ Create helper functions for period-based queries
3. ✅ Add data validation for period values
4. ✅ Update Supabase client queries

### Deliverables:
- Updated `services/dual-write.js`
- New `services/metrics-query-helper.js`

---

## Phase 5: Frontend Time Controls (Day 3)
**Duration**: 4-6 hours
**Priority**: HIGH - User experience

### Tasks:
1. ✅ Add time range selector component
2. ✅ Update `UserDashboard.tsx` to use time ranges
3. ✅ Update `CampaignManager.tsx` to filter by time
4. ✅ Update `PerformanceInsights.tsx` to use existing selector
5. ✅ Update `AIContentStudio.tsx` to show time context
6. ✅ Add period display labels ("Today", "Last 7 Days", etc.)

### Deliverables:
- New `components/TimeRangeSelector.tsx`
- Updated dashboard components
- Consistent time range handling across all views

---

## Phase 6: API Service Layer (Day 4)
**Duration**: 6-8 hours
**Priority**: MEDIUM - Clean architecture

### Tasks:
1. ✅ Create `services/campaign-data-service.js`
2. ✅ Create `services/performance-data-service.js`
3. ✅ Create `services/optimization-service.js`
4. ✅ Move business logic from routes to services
5. ✅ Add caching layer for frequently accessed data

### Deliverables:
- New service files
- Cleaner route handlers
- Improved performance

---

## Phase 7: Testing & Validation (Day 5)
**Duration**: Full day
**Priority**: HIGH - Ensure fixes work

### Tasks:
1. ✅ Test Google Ads script in sandbox
2. ✅ Verify data collection for each period
3. ✅ Test API endpoints with real data
4. ✅ Test frontend with different time ranges
5. ✅ Verify database queries return correct data
6. ✅ Load testing with realistic data volumes
7. ✅ Create automated tests

### Deliverables:
- Test scripts in `tests/`
- Validation report
- Bug fixes from testing

---

## Phase 8: Missing Services (Days 6-7+)
**Duration**: 2-3 weeks (can be done incrementally)
**Priority**: LOW - Can be implemented after critical fixes

### Week 1: Data Collection Services
1. ⏳ `services/website-scraper.js`
2. ⏳ `services/competitor-intelligence.js`
3. ⏳ `services/traffic-analyzer.js`
4. ⏳ `services/demographic-profiler.js`

### Week 2: Intelligence Services
1. ⏳ `services/content-intelligence.js`
2. ⏳ `services/market-gaps.js`

### Week 3: Optimization Services
1. ⏳ `services/campaign-optimizer.js` (enhance existing)
2. ⏳ `services/dynamic-copy.js`

---

## 📊 Success Metrics

### Must Pass Before Launch:
- [ ] User selects "Today" → sees only today's metrics (not ALL_TIME)
- [ ] User selects "Last 7 Days" → sees 7 distinct daily values
- [ ] Metrics change when dashboard refreshes (not static ALL_TIME)
- [ ] All API endpoints return real data (no mocks)
- [ ] Database contains period-labeled data
- [ ] Script sends multiple period data points per run

### Nice to Have:
- [ ] Hourly breakdown shows distinct hourly patterns
- [ ] Device metrics show today's device split
- [ ] Geographic data shows current geo performance
- [ ] Campaign optimizer suggests real optimizations

---

## 🚀 Implementation Order

### Day 1:
- Morning: Phase 1 (Database Schema)
- Afternoon: Phase 2 (Google Ads Script)
- Evening: Testing & validation

### Day 2:
- Morning: Phase 3A (Fix Existing Endpoints)
- Afternoon: Phase 3B (Create Missing Endpoints)
- Evening: Phase 4 (Data Storage Layer)

### Day 3:
- Full Day: Phase 5 (Frontend Time Controls)

### Day 4:
- Full Day: Phase 6 (API Service Layer)

### Day 5:
- Full Day: Phase 7 (Testing & Validation)

### Days 6-7+:
- Phase 8 (Missing Services) - Can be done incrementally

---

## 🛡️ Risk Mitigation

### Risks:
1. **Breaking existing data** - Mitigate with migration rollback plan
2. **Script fails in production** - Test in dry-run mode first
3. **Performance issues** - Add indexes and caching
4. **User confusion** - Add clear labels and help text

### Rollback Plan:
- Keep old script version as backup
- Database migration is reversible
- Feature flag for new dashboard
- Gradual rollout to beta users first

---

## 📝 Notes

- All changes are backward compatible
- Existing ALL_TIME data remains in database
- New period-specific data is additive
- Users can switch between views
- Admin view still available for debugging

---

**Last Updated**: 2025-10-03
**Status**: Ready to begin implementation
