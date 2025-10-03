# AI Dashboard Fix - Complete Deployment Guide
**Date**: 2025-10-03
**Estimated Deployment Time**: 30-45 minutes

---

## 🎯 What This Fixes

**Problem**: Dashboard shows ALL-TIME data instead of time-specific data (TODAY, LAST_7_DAYS, etc.)

**Solution**: Complete implementation of period tracking from Google Ads script → Database → Backend API → Frontend

---

## ✅ What Has Been Implemented

### Backend (100% Complete)
- ✅ Database migration with `period` column
- ✅ Updated metrics endpoint to handle period field
- ✅ Fixed dual-write service for period storage
- ✅ Updated AI endpoints with period filtering
- ✅ Created 3 missing API endpoints
- ✅ Fixed Google Ads script data collection

### Frontend (100% Complete)
- ✅ Created `TimeRangeSelector` component
- ✅ Updated `UserDashboard` with time controls
- ✅ Updated `CampaignManager` with time controls
- ✅ Updated `PerformanceInsights` with time controls
- ✅ All components now pass `period` parameter

---

## 📋 Pre-Deployment Checklist

Before starting deployment, ensure you have:

- [ ] Access to Supabase database
- [ ] Access to backend server (SSH or deployment platform)
- [ ] Access to Google Ads account
- [ ] Access to frontend deployment (Shopify app)
- [ ] Backup of current database (recommended)
- [ ] Testing environment (optional but recommended)

---

## 🚀 Step-by-Step Deployment

### Step 1: Database Migration (5-10 minutes)

**Priority**: CRITICAL - Must be done first

```bash
# 1. Connect to Supabase
psql -h your-supabase-host.supabase.co \\
     -U postgres \\
     -d postgres \\
     -p 5432

# 2. Run the migration
\\i /Users/tamsar/Downloads/proofkit-saas/backend/migrations/012_add_period_tracking.sql

# 3. Verify the migration succeeded
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenant_metrics'
  AND column_name = 'period';

# Expected output:
#  column_name | data_type
# -------------+-------------------
#  period      | character varying

# 4. Check that existing data was labeled
SELECT period, COUNT(*) as count
FROM tenant_metrics
GROUP BY period;

# Expected output:
#  period   | count
# ----------+-------
#  ALL_TIME | <number>
```

**If migration fails**:
```sql
-- Rollback (if needed)
ALTER TABLE tenant_metrics DROP COLUMN IF EXISTS period;
ALTER TABLE device_metrics DROP COLUMN IF EXISTS period;
-- etc. for all tables
```

---

### Step 2: Deploy Backend Code (10-15 minutes)

**Files Modified**:
- `backend/routes/metrics.js`
- `backend/routes/ai.js`
- `backend/services/dual-write.js`
- `backend/embedded-script-v2.js`

**Deployment Steps**:

```bash
# 1. Navigate to backend directory
cd /Users/tamsar/Downloads/proofkit-saas/backend

# 2. Verify all changes are present
git status

# 3. Test the backend locally (optional but recommended)
npm test

# 4. Restart the backend server
# Option A: If using PM2
pm2 restart backend

# Option B: If using systemd
sudo systemctl restart proofkit-backend

# Option C: If using npm/node directly
pkill -f "node.*server.js"
npm start &

# 5. Verify backend is running
curl http://localhost:3000/health
# Expected: {"ok":true,"status":"healthy"}

# 6. Test the new endpoints
curl "http://localhost:3000/api/ai/stats/quick?period=TODAY&tenant=test&sig=<signature>"
# Should return data without errors
```

**Verification**:
```bash
# Check logs for errors
tail -f logs/backend.log
# Or
pm2 logs backend

# Look for:
# ✅ "✅ Using tenant_metrics data for tenant_name [TODAY]: X records"
# ❌ Any errors mentioning 'period' column
```

---

### Step 3: Update Google Ads Script (5-10 minutes)

**IMPORTANT**: The script has already been updated in `backend/embedded-script-v2.js`

**Deployment Steps**:

1. **Generate new script for a test campaign**:
```bash
# From backend directory
curl -X POST "http://localhost:3000/api/script/generate?tenant=YOUR_TENANT&sig=<signature>"
```

2. **Manual deployment in Google Ads**:
   - Go to Google Ads → Tools → Scripts
   - Select your ProofKit script
   - Click "Edit"
   - **Replace the `collectPerf_()` function** (lines ~598-730)
   - Click "Preview" to test
   - Check logs for: `"Collecting metrics for 4 time periods..."`
   - If preview succeeds, click "Save"
   - Run the script manually once

3. **Verify script is sending period data**:
```bash
# Check backend logs after script runs
tail -f logs/backend.log | grep "period"

# Look for:
# ✅ "Metrics dual-write for tenant_name: {period: 'TODAY', ...}"
# ✅ "Using tenant_metrics data for tenant_name [TODAY]: X records"
```

**Expected Script Output**:
```
Collecting metrics for 4 time periods...
Campaign [TODAY] My Campaign - Impr: 1234, Clicks: 56
Campaign [YESTERDAY] My Campaign - Impr: 2345, Clicks: 78
Campaign [LAST_7_DAYS] My Campaign - Impr: 15000, Clicks: 450
Campaign [LAST_30_DAYS] My Campaign - Impr: 60000, Clicks: 1800
✅ Collected 16 metric rows across all periods
```

---

### Step 4: Deploy Frontend (5-10 minutes)

**Files Modified**:
- `shopify-ui/app/components/TimeRangeSelector.tsx` (NEW)
- `shopify-ui/app/components/AIDashboard/UserDashboard.tsx`
- `shopify-ui/app/components/AIDashboard/CampaignManager.tsx`
- `shopify-ui/app/components/AIDashboard/PerformanceInsights.tsx`

**Deployment Steps**:

```bash
# 1. Navigate to Shopify UI directory
cd /Users/tamsar/Downloads/proofkit-saas/shopify-ui

# 2. Install dependencies (if any new ones)
npm install

# 3. Build the application
npm run build

# Expected output:
# ✓ built in XXXms

# 4. Deploy to Shopify
npm run deploy
# Or if using custom deployment:
npm run shopify app deploy

# 5. Verify deployment
# Open your Shopify app in browser
# Navigate to AI Dashboard
```

**Verification**:
- [ ] Time period selector appears in UserDashboard
- [ ] Time period selector appears in CampaignManager
- [ ] PerformanceInsights existing selector still works
- [ ] Changing selector triggers new API call
- [ ] No console errors in browser dev tools

---

### Step 5: Post-Deployment Testing (10-15 minutes)

**Critical Tests**:

#### Test 1: Time Period Selector Works
```
1. Open AI Dashboard
2. Click time period dropdown
3. Select "Today"
4. Verify data updates
5. Select "Last 7 Days"
6. Verify different numbers appear
```

#### Test 2: API Returns Period-Specific Data
```bash
# Test TODAY
curl "http://localhost:3000/api/ai/stats/quick?period=TODAY&tenant=YOUR_TENANT&sig=<signature>"
# Should return TODAY metrics

# Test LAST_7_DAYS
curl "http://localhost:3000/api/ai/stats/quick?period=LAST_7_DAYS&tenant=YOUR_TENANT&sig=<signature>"
# Should return different metrics than TODAY
```

#### Test 3: Database Contains Period Data
```sql
-- Check database has period-labeled data
SELECT
  period,
  date,
  entity_name,
  clicks,
  impressions
FROM tenant_metrics
WHERE tenant_id = 'YOUR_TENANT'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY period, date DESC
LIMIT 20;

-- Expected: Rows with period='TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS'
```

#### Test 4: Frontend-to-Backend Flow
```
1. Open browser dev tools → Network tab
2. Change time period selector to "Today"
3. Look for API call with ?period=TODAY
4. Verify response contains data
5. Check dashboard updates with new values
```

---

## 🐛 Troubleshooting

### Problem: "Column 'period' does not exist"
**Solution**:
```sql
-- Migration didn't run. Re-run step 1
\\i backend/migrations/012_add_period_tracking.sql
```

### Problem: Dashboard still shows same numbers for all periods
**Possible Causes**:
1. Script hasn't run yet with new code
2. Script is still sending old format without period
3. Backend not deployed properly

**Solution**:
```bash
# Check if period data exists in database
psql -c "SELECT DISTINCT period FROM tenant_metrics WHERE tenant_id='YOUR_TENANT';"

# If only 'ALL_TIME' or 'UNKNOWN':
# - Wait for script to run (runs hourly by default)
# - Or manually run the script in Google Ads
```

### Problem: Frontend selector appears but doesn't change data
**Possible Causes**:
1. API not receiving period parameter
2. Frontend not re-fetching on period change

**Solution**:
```javascript
// Check browser console for:
// Request URL: /api/ai/stats/quick?period=TODAY

// If URL doesn't have period parameter:
// - Clear browser cache
// - Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
// - Verify frontend deployment succeeded
```

### Problem: "Duplicate key value violates unique constraint"
**Cause**: Old unique constraint still in place

**Solution**:
```sql
-- Drop old constraint
ALTER TABLE tenant_metrics DROP CONSTRAINT IF EXISTS tenant_metrics_tenant_id_date_entity_type_entity_id_key;

-- Add new constraint with period
ALTER TABLE tenant_metrics ADD CONSTRAINT tenant_metrics_unique_period
UNIQUE(tenant_id, date, period, entity_type, entity_id);
```

---

## 📊 Success Criteria

Deployment is successful when:

- ✅ Time period selector visible in dashboard
- ✅ Selecting "Today" shows different data than "Last 7 Days"
- ✅ Database contains rows with period='TODAY', 'YESTERDAY', etc.
- ✅ API calls include ?period=<value> parameter
- ✅ Dashboard data changes when refreshing/switching periods
- ✅ No errors in backend logs
- ✅ No errors in browser console
- ✅ Google Ads script logs show "Collecting metrics for 4 time periods"

---

## 🔄 Rollback Plan

If deployment fails and needs to be rolled back:

### Step 1: Rollback Database
```sql
-- Remove period column
ALTER TABLE tenant_metrics DROP COLUMN IF EXISTS period;
ALTER TABLE device_metrics DROP COLUMN IF EXISTS period;
ALTER TABLE keyword_performance DROP COLUMN IF EXISTS period;
-- etc. for all tables

-- Restore old unique constraint
ALTER TABLE tenant_metrics ADD CONSTRAINT tenant_metrics_old_unique
UNIQUE(tenant_id, date, entity_type, entity_id);
```

### Step 2: Rollback Backend Code
```bash
# Revert to previous commit
git revert HEAD
git push

# Restart backend
pm2 restart backend
```

### Step 3: Rollback Frontend
```bash
cd shopify-ui
git revert HEAD
npm run build
npm run deploy
```

### Step 4: Rollback Google Ads Script
- Open Google Ads → Scripts
- Restore previous version from "Revision History"
- Save and run

---

## 📝 Post-Deployment Tasks

After successful deployment:

1. **Monitor for 24 hours**:
   ```bash
   # Watch backend logs
   tail -f logs/backend.log

   # Watch for errors
   grep -i "error" logs/backend.log | tail -20
   ```

2. **Verify data collection**:
   ```sql
   -- Check that new period data is being collected daily
   SELECT
     date,
     period,
     COUNT(*) as row_count
   FROM tenant_metrics
   WHERE date >= CURRENT_DATE - INTERVAL '3 days'
   GROUP BY date, period
   ORDER BY date DESC, period;
   ```

3. **Update documentation** (if applicable)

4. **Notify users** of new time period feature

5. **Monitor user feedback** for any issues

---

## 🎉 Expected Improvements

After deployment, users will:

- ✅ See real-time TODAY metrics instead of all-time averages
- ✅ Compare yesterday vs. today performance
- ✅ View last 7 days aggregated properly
- ✅ Track daily/weekly trends accurately
- ✅ Make data-driven decisions based on current performance

---

## 📞 Support

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review logs for specific error messages
3. Verify each step was completed in order
4. Test with a single tenant first before rolling out to all

---

**Deployment Checklist**:
- [ ] Step 1: Database migration completed
- [ ] Step 2: Backend deployed and verified
- [ ] Step 3: Google Ads script updated
- [ ] Step 4: Frontend deployed
- [ ] Step 5: All tests passing
- [ ] Monitoring in place
- [ ] Rollback plan ready if needed

**Estimated Total Time**: 30-45 minutes

**Best Time to Deploy**: During low-traffic hours (early morning/late evening)

---

Last Updated: 2025-10-03
