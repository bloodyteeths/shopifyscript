# PROOFKIT PRODUCTION DEPLOYMENT GUIDE

## CRITICAL SAFETY OVERVIEW
**PRIORITY**: P0-7 CRITICAL  
**MISSION**: Comprehensive canary test checklist to avoid risky first deploys  
**IMPLEMENTATION**: Complete automation with safety validation scripts  

---

## 🚨 BEFORE YOU START - MANDATORY SAFETY CHECKLIST

### Pre-Deployment Requirements
- [ ] **Backend Running**: `curl http://localhost:3001/api/diagnostics` returns healthy
- [ ] **Environment Validated**: All required env vars set (HMAC_SECRET, GOOGLE_SHEETS_*, GEMINI_API_KEY)
- [ ] **Google Ads Access**: Test campaign labeled with `PROOFKIT_AUTOMATED`
- [ ] **Sheets Connected**: Google Sheets integration working
- [ ] **Time Zone Set**: Europe/Istanbul timezone confirmed
- [ ] **Business Hours**: Deploy only Monday-Thursday, 9AM-5PM local time

### Safety Limits (NON-NEGOTIABLE)
- [ ] **Budget Cap**: ≤$5 daily maximum for canary
- [ ] **CPC Ceiling**: ≤$0.25 maximum per click
- [ ] **Window Duration**: ≤120 minutes maximum
- [ ] **Single Campaign**: Only ONE campaign for canary testing
- [ ] **Exclusions Configured**: All other campaigns excluded

---

## 📋 COMPREHENSIVE DEPLOYMENT CHECKLIST

### Phase 1: Environment Setup (5 minutes)

```bash
# 1. Navigate to deployment directory
cd /Users/tamsar/Downloads/proofkit-saas/deployment

# 2. Verify all scripts are present
ls -la canary-*.js run-canary-test.sh

# 3. Check backend health
curl -sS http://localhost:3001/api/diagnostics | jq

# 4. Verify environment variables
echo "HMAC_SECRET length: ${#HMAC_SECRET}"
echo "Sheets configured: $(test -n "$GOOGLE_SHEETS_PRIVATE_KEY" && echo "YES" || echo "NO")"
```

### Phase 2: Dry Run Validation (10 minutes)

```bash
# ALWAYS start with a dry run
./run-canary-test.sh tenant1 --dry-run --strict

# Expected output:
# ✅ Configuration validation passed
# ✅ Environment validation passed  
# ✅ Safety checks passed
# ✅ DRY RUN: Would execute canary test
```

**STOP**: If dry run fails, fix all issues before proceeding.

### Phase 3: Live Canary Test (2+ hours)

```bash
# Execute live canary with full safety monitoring
./run-canary-test.sh tenant1 \
  --window 60 \
  --budget 3.00 \
  --cpc 0.20 \
  --campaign "Your-Canary-Campaign-Name"

# Monitor in real-time (separate terminal)
tail -f logs/canary/canary_tenant1_*.log
```

### Phase 4: Post-Test Validation (10 minutes)

```bash
# Check final status
node canary-rollback.js status tenant1

# Review performance metrics
cat logs/canary/report_tenant1_*.json | jq .summary
```

---

## 🛠️ AUTOMATED VALIDATION SYSTEM

### Comprehensive Safety Scripts

#### 1. **canary-validation.js** - Pre-flight Safety Validation
- Environment health checks
- Configuration validation  
- Budget & CPC safety limits
- Schedule & timing validation
- Campaign exclusions verification

```bash
# Run standalone validation
node canary-validation.js tenant1 config.json --strict
```

#### 2. **canary-rollback.js** - Automatic Safety Rollback
- Real-time monitoring with triggers:
  - Budget breach: >110% of daily cap
  - CPC spike: >120% of ceiling
  - Error flood: ≥3 errors in 5 minutes
  - Performance drop: CTR <50% baseline
  - Spend pace: >50% budget in first hour

```bash
# Monitor with automatic rollback
node canary-rollback.js start tenant1 5.00 0.25
```

#### 3. **audience-validation.js** - GDPR-Compliant Audience Safety
- User list validation
- GDPR consent verification
- Size & reach validation
- OBSERVE mode enforcement
- Hash validation for customer data

```bash
# Validate audience configuration
node audience-validation.js tenant1 audience-config.json --strict
```

#### 4. **canary-execution.js** - Time-boxed Execution Engine
- 4-phase execution: Preparation → Active → Cooldown → Complete
- Real-time monitoring with safety triggers
- Automatic PROMOTE flag management
- Comprehensive logging and reporting

```bash
# Execute full canary with time boxing
node canary-execution.js tenant1 test-config.json
```

---

## 🔄 AUTOMATIC ROLLBACK TRIGGERS

### Immediate Rollback (<30 seconds)
- **Budget Breach**: Spending >110% of daily cap
- **CPC Spike**: Any click >120% of ceiling
- **System Error**: Backend or API failures

### Urgent Rollback (<2 minutes) 
- **Error Flood**: ≥3 script errors in 5 minutes
- **Performance Drop**: CTR drops below 50% of baseline
- **Rapid Spend**: >50% of daily budget consumed in first hour

### Scheduled Rollback (End of window)
- **Quality Score Drop**: Decrease of 2+ points
- **Window Timeout**: Automatic disable at scheduled end

### Manual Rollback (Any time)
```bash
# Emergency manual rollback
node canary-rollback.js manual-rollback tenant1 "emergency_stop"
```

---

## 📊 MONITORING & SAFETY VALIDATION

### Real-Time Monitoring Checklist
- [ ] **Budget Consumption**: Track spend vs. daily cap
- [ ] **Click Performance**: Monitor CPC vs. ceiling
- [ ] **Quality Metrics**: Watch CTR, Quality Score
- [ ] **Error Logs**: Check for script errors
- [ ] **Change History**: Verify only canary affected

### Success Criteria (First Hour)
- [ ] **Ads Serving**: Impressions within 15 minutes
- [ ] **Spend Control**: ≤25% of daily cap consumed
- [ ] **CPC Compliance**: All clicks below ceiling
- [ ] **Quality Maintained**: Score stable or improved
- [ ] **No Errors**: Clean execution logs

### Failure Triggers (Immediate Action)
- [ ] **Budget Exceeded**: >$5.50 spent (10% buffer)
- [ ] **CPC Violation**: Any click >$0.30 (ceiling breach)
- [ ] **Quality Drop**: Score decrease >1 point
- [ ] **Error Pattern**: ≥2 consecutive script failures
- [ ] **Performance Crash**: CTR drop >30%

---

## 🎯 AUDIENCE ATTACHMENT VALIDATION

### GDPR Compliance Requirements
- [ ] **Consent Documentation**: Valid consent records
- [ ] **Data Age**: Customer data <180 days old
- [ ] **Lawful Basis**: Consent/legitimate interest documented
- [ ] **Hash Validation**: Proper SHA256 email/phone hashing
- [ ] **Retention Policy**: Max 365 days data retention

### Technical Validation
- [ ] **List Size**: ≥1,000 users for meaningful testing
- [ ] **Mode Setting**: OBSERVE only (never TARGETING)
- [ ] **Bid Modifier**: ≤±25% adjustment
- [ ] **List Status**: Active and targetable in Google Ads
- [ ] **Permissions**: Proper access rights verified

### Safety Configuration
```json
{
  "mode": "OBSERVE",
  "bidModifier": "+0.10",
  "userListId": "1234567890",
  "campaignName": "Canary-Test-Campaign",
  "consentDocumentation": {
    "purposes": ["marketing", "analytics"],
    "consentVersion": "v2.0",
    "retentionDays": 365
  }
}
```

---

## 🕒 TIME-BOXED EXECUTION PHASES

### Phase 1: Preparation (2 minutes)
1. **Environment Validation**: Backend health, sheets connection
2. **Configuration Validation**: Budget caps, CPC ceilings, exclusions
3. **Audience Validation**: GDPR compliance, list verification
4. **Safety Checks**: Single campaign, reasonable limits
5. **Baseline Collection**: Pre-test performance metrics
6. **Pre-flight Test**: Script preview with PROMOTE=false

### Phase 2: Active Testing (60-120 minutes)
1. **PROMOTE Enable**: Automatic flag activation
2. **Initial Execution**: First script run with changes
3. **Change Verification**: Google Ads modifications confirmed
4. **Continuous Monitoring**: 15-second interval checks
5. **Safety Triggers**: Real-time rollback detection
6. **PROMOTE Disable**: Automatic flag deactivation

### Phase 3: Cooldown (5 minutes)
1. **Final Metrics**: Post-test performance collection
2. **PROMOTE Verification**: Confirm flag disabled
3. **Delayed Effects**: Monitor for continued changes
4. **Performance Analysis**: Compare baseline vs. final
5. **Cleanup Validation**: Verify proper state restoration

### Phase 4: Completion (Immediate)
1. **Report Generation**: Comprehensive execution summary
2. **Data Persistence**: Save logs and metrics
3. **Notifications**: Alert completion status
4. **Recommendations**: Next steps based on results

---

## 🔧 CONFIGURATION EXAMPLES

### Minimal Safe Configuration
```json
{
  "tenant": "tenant1",
  "campaignName": "Test-Campaign",
  "budgetCaps": ["3.00"],
  "cpcCeilings": ["0.20"],
  "schedules": ["today 60 minutes"],
  "exclusions": ["Campaign-A", "Campaign-B", "Campaign-C"],
  "config": {
    "ENABLE_SCRIPT": true,
    "FEATURE_INVENTORY_GUARD": true,
    "PROMOTE": false
  },
  "promoteWindow": {
    "start_at": "now+2m",
    "duration_minutes": 60
  }
}
```

### Advanced Configuration with Audiences
```json
{
  "tenant": "tenant1",
  "campaignName": "Canary-Campaign",
  "budgetCaps": ["5.00"],
  "cpcCeilings": ["0.25"],
  "schedules": ["today 90 minutes"],
  "exclusions": ["All-Other-Campaigns"],
  "audienceConfig": {
    "userListId": "1234567890",
    "mode": "OBSERVE",
    "bidModifier": "+0.10",
    "campaignName": "Canary-Campaign"
  },
  "config": {
    "ENABLE_SCRIPT": true,
    "FEATURE_AI_DRAFTS": true,
    "FEATURE_AUDIENCE_ATTACH": true,
    "FEATURE_INVENTORY_GUARD": true,
    "PROMOTE": false
  },
  "promoteWindow": {
    "start_at": "now+2m", 
    "duration_minutes": 90
  }
}
```

---

## 🚨 EMERGENCY PROCEDURES

### Immediate Actions (Critical Issues)
1. **Manual Stop**: `./run-canary-test.sh tenant1 --emergency-stop`
2. **Disable PROMOTE**: Set config PROMOTE=false immediately
3. **Pause Campaign**: Manual pause in Google Ads interface
4. **Check Spend**: Verify no continued budget consumption
5. **Alert Team**: Notify stakeholders of issue

### Investigation Steps
1. **Review Logs**: Check execution and error logs
2. **Verify State**: Confirm all changes reverted
3. **Analyze Metrics**: Review performance impact
4. **Document Issues**: Record for future prevention
5. **Plan Recovery**: Determine next steps

### Recovery Validation
- [ ] **PROMOTE Disabled**: Confirmed false in config
- [ ] **Campaign Status**: Verify expected state
- [ ] **Budget Reset**: Original limits restored
- [ ] **Audience Detached**: No active targeting
- [ ] **Schedules Cleared**: No active windows

---

## 📈 POST-DEPLOYMENT ANALYSIS

### Performance Metrics Review
- **Spend Analysis**: Total vs. budgeted amounts
- **CPC Performance**: Average vs. ceiling limits
- **Quality Impact**: Score changes documented
- **CTR Comparison**: Before vs. during test
- **Impression Volume**: Delivery consistency

### Success Indicators
- [ ] **Budget Compliance**: Spent ≤ allocated amount
- [ ] **CPC Compliance**: All clicks ≤ ceiling
- [ ] **Quality Maintained**: Score stable or improved
- [ ] **No Incidents**: Zero rollback events
- [ ] **Clean Logs**: No error messages

### Scale Decision Matrix
| Metric | Green Zone | Yellow Zone | Red Zone |
|--------|------------|-------------|----------|
| Budget Utilization | <90% | 90-100% | >100% |
| CPC Performance | <90% ceiling | 90-100% | >100% |
| Quality Score | Improved/Stable | -1 point | -2+ points |
| Error Count | 0 | 1-2 | 3+ |
| CTR Performance | >baseline | 90-100% baseline | <90% |

### Scaling Recommendations
- **Green Zone**: Proceed with gradual expansion
- **Yellow Zone**: Address issues before scaling
- **Red Zone**: Fix problems, repeat canary test

---

## 📚 ADDITIONAL RESOURCES

### Documentation Files
- `/deployment/canary-test-checklist.md` - Complete manual checklist
- `/proofkit_vFINAL_hand-off/GO-LIVE.md` - Original go-live instructions
- `/docs/TEST_PLAN.md` - Comprehensive testing procedures

### Script Files
- `/deployment/run-canary-test.sh` - Main automation script
- `/deployment/canary-validation.js` - Validation engine
- `/deployment/canary-rollback.js` - Rollback manager
- `/deployment/audience-validation.js` - Audience safety validator
- `/deployment/canary-execution.js` - Time-boxed executor

### Log Locations
- `/logs/canary/` - Execution logs and reports
- `/run_logs/` - Historical execution data
- Backend logs via `docker-compose logs`

---

## ⚠️ FINAL SAFETY REMINDERS

### NEVER Skip These Steps
1. **Always run dry-run first**
2. **Verify single campaign setup**
3. **Confirm budget/CPC limits**
4. **Test during business hours only**
5. **Monitor throughout execution**

### Emergency Contacts
- **Technical Issues**: Backend logs analysis required
- **Budget Overrun**: Google Ads account manager
- **Performance Issues**: Campaign optimization review
- **System Failure**: Full rollback protocol activation

### Success Metrics
- Zero rollback events
- Budget consumption within limits
- Performance maintained or improved
- Clean execution logs
- Proper cleanup verification

---

**CRITICAL**: This is a production system affecting real advertising spend. When in doubt, abort the test and investigate. Safety always takes precedence over testing velocity.

**Remember**: Every canary test is a stepping stone to full production deployment. Take time to validate, monitor, and learn from each execution.