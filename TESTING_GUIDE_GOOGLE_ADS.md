# Ads Autopilot AI - Complete Testing Guide
**Last Updated:** September 19, 2025

## 📊 Dashboard Differences

### Existing `/insights` Endpoint (Backend API)
- **Purpose:** Server-side data API
- **Type:** JSON API endpoint
- **Authentication:** HMAC required
- **Data:** Raw metrics from Google Sheets/Supabase
- **Use:** Called by Google Ads Script to fetch insights

### New `analytics-dashboard.html` (Frontend)
- **Purpose:** Visual analytics dashboard
- **Type:** HTML/JavaScript frontend
- **Authentication:** None (can add later)
- **Data:** Visualized metrics with charts
- **Use:** Human-readable dashboard for monitoring

**Key Difference:** The insights API provides data, the dashboard visualizes it. They work together!

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Vercel

```bash
# 1. Ensure you're in the backend directory
cd backend

# 2. Check if Vercel CLI is installed
vercel --version

# 3. Deploy to production
vercel --prod

# 4. Note the deployment URL (e.g., https://ads-autopilot-backend.vercel.app)
```

### Step 2: Update Script Configuration

Replace placeholders in `master.gs`:
```javascript
var TENANT_ID = 'mybabybymerry';  // Your shop/tenant name
var BACKEND_URL = 'https://ads-autopilot-backend.vercel.app/api';  // Your Vercel URL
var SHARED_SECRET = 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';  // Your HMAC secret
```

## 🧪 Testing in Google Ads

### Phase 1: Preview Mode Testing (SAFE)

1. **Enable Preview Mode in Script:**
```javascript
var PREVIEW_MODE = true;  // Set to true for testing
var RUN_MODE = 'PREVIEW';
```

2. **Create Test Script in Google Ads:**
   - Go to Tools & Settings → Scripts
   - Click the blue plus button
   - Name it: "Ads Autopilot AI - Test"
   - Paste the script from `master.gs`
   - Update configuration values

3. **Run Preview Test:**
   - Click "Preview" button (not Run)
   - Check logs for planned changes
   - Verify no actual changes are made

### Phase 2: Configuration Testing

1. **Check Google Sheets Creation:**
   - Run script once
   - Go to Google Sheets
   - Verify tabs created:
     - CONFIG_MAIN
     - CONFIG_RSA_MAP
     - CONFIG_BUDGET_CAPS
     - METRICS
     - SEARCH_TERMS

2. **Verify Backend Connection:**
   - Check script logs for:
     ```
     ✅ Configuration fetched successfully
     ✅ Metrics posted successfully
     ```

3. **Test Safety Features:**
   - Set `PROMOTE: FALSE` in CONFIG_MAIN
   - Run script
   - Verify: "PROMOTE=FALSE - All mutations blocked"

### Phase 3: Limited Live Testing

1. **Create Canary Campaign:**
   - Create label: "CANARY_TEST"
   - Apply to ONE small campaign
   - In CONFIG_MAIN, set:
     ```
     label_include: CANARY_TEST
     PROMOTE: TRUE
     daily_budget_cap_default: 5.00
     cpc_ceiling_default: 0.30
     ```

2. **Monitor First Run:**
   - Run script manually
   - Check for:
     - Budget adjustments
     - CPC changes
     - Negative keywords added
     - RSAs created

### Phase 4: AI Features Testing

1. **Enable AI Features:**
   ```javascript
   // In CONFIG_MAIN sheet:
   AI_FEATURES_ENABLED: TRUE
   ```

2. **Test AI Endpoints:**
   ```bash
   # Test AI recommendations
   curl -X POST https://your-backend.vercel.app/api/ai/recommendations \
     -H "Content-Type: application/json" \
     -d '{"performance": {...}, "context": {...}}'
   ```

3. **Monitor AI Actions:**
   - Check logs for "AI" prefixed actions
   - Verify AI-generated content quality
   - Monitor token usage

## 📈 Success Metrics

### Immediate Success Indicators (First Run)

✅ **Script Execution:**
- Execution time < 30 seconds
- No errors in logs
- "Ads Autopilot AI run complete" message

✅ **Data Flow:**
- CONFIG tabs created in Sheets
- Metrics appear in METRICS tab
- Search terms collected in SEARCH_TERMS tab

✅ **Safety Systems:**
- Labels applied to campaigns
- PROMOTE gate working
- Preview mode prevents changes

### 24-Hour Success Metrics

📊 **Performance Improvements:**
- **CPC Reduction:** Target 10-15% lower
- **CTR Increase:** Target 5-10% higher
- **Wasted Spend:** Reduction via negatives
- **Budget Efficiency:** Better allocation

📊 **Automation Metrics:**
- **Negative Keywords Added:** 20-50 expected
- **Campaigns Optimized:** All active campaigns
- **RSAs Created:** 1+ per ad group without ads
- **Schedule Applied:** Business hours set

### 7-Day Success Metrics

🎯 **Business Impact:**
- **ROAS Improvement:** 15-20% increase
- **Conversion Rate:** 10-15% improvement
- **Cost Per Conversion:** 15-20% reduction
- **Quality Score:** Average increase

🎯 **AI Performance:**
- **AI Recommendations Applied:** 50+
- **Prediction Accuracy:** >70%
- **Token Cost:** <$5/week
- **Time Saved:** 5-10 hours/week

## 🔍 Monitoring & Debugging

### Check Script Logs
```javascript
// In Google Ads Scripts editor
Logger.log() // outputs appear in logs
```

### Monitor Google Sheets
- METRICS tab: Performance data
- RUN_LOGS tab: Execution history
- CONFIG_* tabs: Current settings

### Backend Logs (Vercel)
```bash
vercel logs --follow
```

### Dashboard Monitoring
Open `analytics-dashboard.html` to see:
- Real-time metrics
- AI optimization count
- System status
- Feature activation

## ⚠️ Troubleshooting

### Common Issues & Solutions

1. **"Config disabled or not found"**
   - Check HMAC_SECRET matches
   - Verify backend is deployed
   - Check BACKEND_URL is correct

2. **"PROMOTE GATE FAILED"**
   - Set PROMOTE: TRUE in CONFIG_MAIN
   - Remove PREVIEW_MODE in script

3. **No changes happening**
   - Check PROMOTE: TRUE
   - Verify not in PREVIEW_MODE
   - Check campaign has label if using label_include

4. **"Authentication failed"**
   - Verify HMAC_SECRET
   - Check TENANT_ID matches
   - Ensure backend is running

5. **No AI features**
   - Set AI_FEATURES_ENABLED: TRUE
   - Check Gemini API key configured
   - Verify AI endpoints accessible

## 📋 Testing Checklist

### Pre-Launch
- [ ] Backend deployed to Vercel
- [ ] Environment variables configured
- [ ] Google Sheets service account setup
- [ ] Script configuration updated
- [ ] Preview mode test passed

### Soft Launch (Day 1)
- [ ] Canary campaign selected
- [ ] First run completed
- [ ] Sheets tabs created
- [ ] Metrics flowing
- [ ] No critical errors

### Optimization Phase (Days 2-7)
- [ ] Negative keywords being added
- [ ] Budgets adjusted appropriately
- [ ] RSAs created successfully
- [ ] AI features activated
- [ ] Performance improving

### Full Production (Day 7+)
- [ ] All campaigns included
- [ ] ROAS improving
- [ ] Cost per conversion down
- [ ] AI optimizations working
- [ ] Dashboard showing gains

## 🎯 Expected Results Timeline

**Hour 1:** Script runs, data collected
**Day 1:** Initial optimizations applied
**Day 3:** Performance trends visible
**Week 1:** Measurable improvements
**Week 2:** Full optimization cycle
**Month 1:** 20-30% performance gain

## 📞 Support & Next Steps

1. **Monitor Daily:** Check dashboard and sheets
2. **Adjust Settings:** Tweak budgets and CPCs based on results
3. **Enable More Features:** Gradually activate AI features
4. **Scale Up:** Add more campaigns after successful test
5. **Analyze Results:** Use insights for strategic decisions

## 🏁 Go-Live Checklist

```bash
✅ Backend deployed: https://ads-autopilot-backend.vercel.app
✅ Script installed in Google Ads
✅ Configuration complete
✅ Preview test successful
✅ Canary campaign ready
✅ Monitoring dashboard accessible
✅ Success metrics defined
✅ Rollback plan ready
```

**Ready to Launch:** When all items checked, set PROMOTE: TRUE and run!