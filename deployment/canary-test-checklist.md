# PROOFKIT CANARY TEST CHECKLIST - COMPREHENSIVE SAFETY GUIDE

## CRITICAL SAFETY OVERVIEW

**PRIORITY**: P0-7 CRITICAL  
**MISSION**: Avoid risky first deploys with comprehensive canary testing  
**MAX RISK TOLERANCE**: $5 daily budget, 120 minutes window

---

## PHASE 0: PRE-FLIGHT SAFETY SETUP

### 0.1 Environment Verification

- [ ] **Backend Health Check**: `curl http://localhost:3001/api/diagnostics`
- [ ] **Sheets Connection**: Verify `GOOGLE_SHEETS_PRIVATE_KEY` valid
- [ ] **HMAC Security**: Ensure `HMAC_SECRET` ≥ 32 chars
- [ ] **AI Readiness**: Check `GEMINI_API_KEY` format (AIza...)
- [ ] **Timezone Set**: Confirm Europe/Istanbul timezone

### 0.2 Canary Campaign Selection

- [ ] **Single Campaign**: Pick ONE Search campaign only
- [ ] **Label Applied**: `PROOFKIT_AUTOMATED` label in Google Ads UI
- [ ] **Performance History**: Campaign has ≥7 days of data
- [ ] **Budget Baseline**: Current daily budget documented
- [ ] **CPC Baseline**: Current avg CPC documented

### 0.3 Safety Configuration (CONFIG\_{tenant})

```
ENABLE_SCRIPT=true
FEATURE_AI_DRAFTS=true
FEATURE_INTENT_BLOCKS=true
FEATURE_AUDIENCE_EXPORT=true
FEATURE_AUDIENCE_ATTACH=true
FEATURE_CM_API=false
FEATURE_INVENTORY_GUARD=true
PROMOTE=FALSE (CRITICAL: Only enable during window)
```

---

## PHASE 1: RISK CAPS & SAFETY LIMITS

### 1.1 Budget Safety Caps (BUDGET*CAPS*{tenant})

- [ ] **Daily Limit**: $3-5 maximum (document: `$\_\_\_\_`)
- [ ] **Percentage Check**: ≤50% of normal daily budget
- [ ] **Absolute Floor**: Never >$10 for canary
- [ ] **Validation**: Backend validates cap before script run

### 1.2 CPC Safety Ceilings (CPC*CEILINGS*{tenant})

- [ ] **Max CPC**: $0.15-0.25 (document: `$\_\_\_\_`)
- [ ] **Baseline Check**: ≤150% of historical avg CPC
- [ ] **Category Limit**: Industry-appropriate ceiling
- [ ] **Validation**: Script enforces ceiling in real-time

### 1.3 Schedule Safety Window (SCHEDULES\_{tenant})

- [ ] **Duration**: 60-120 minutes maximum (document: `___ min`)
- [ ] **Time Window**: Business hours only (9AM-5PM local)
- [ ] **Day Restriction**: Monday-Thursday only (no Friday/weekend)
- [ ] **Timezone**: Europe/Istanbul confirmed

### 1.4 Campaign Exclusions (EXCLUSIONS\_{tenant})

- [ ] **All Other Campaigns**: Listed by name (CSV format)
- [ ] **Double-Check**: Only canary campaign NOT in exclusions
- [ ] **Label Guard**: `PROOFKIT_AUTOMATED` as fallback protection
- [ ] **Validation**: Script verifies exclusions before run

---

## PHASE 2: AUDIENCE ATTACHMENT SAFETY

### 2.1 Audience Preparation

- [ ] **Segment Size**: ≥1,000 users for meaningful test
- [ ] **List Upload**: Customer Match list in Google Ads
- [ ] **List ID**: User List ID copied (format: numbers only)
- [ ] **GDPR Compliance**: Consent verified for uploaded users

### 2.2 Attachment Configuration (AUDIENCE*MAP*{tenant})

- [ ] **Mode**: OBSERVE only (never TARGETING for canary)
- [ ] **Bid Modifier**: +10% maximum
- [ ] **Campaign Match**: Exact canary campaign name
- [ ] **Size Validation**: Script checks minimum list size

### 2.3 Attachment Safety Checks

- [ ] **Dry Run**: Test attachment without PROMOTE=TRUE
- [ ] **Size Guard**: Auto-skip if list <1,000 users
- [ ] **Mode Enforcement**: Script blocks TARGETING mode
- [ ] **Rollback Ready**: Clear `AUDIENCE_MAP_*` prepared

---

## PHASE 3: AI DRAFTS VALIDATION

### 3.1 AI Draft Safety Run

- [ ] **Dry Run Mode**: `dryRun: true` in API call
- [ ] **Asset Generation**: RSA headlines/descriptions created
- [ ] **Length Validation**: 30-char headlines, 90-char descriptions
- [ ] **Content Review**: Manual approval of all generated content
- [ ] **Safe Claims**: No superlatives or unverified claims

### 3.2 Draft Quality Gates

- [ ] **Deduplication**: No duplicate content across drafts
- [ ] **Brand Compliance**: Brand voice and guidelines followed
- [ ] **Legal Review**: Claims legally defensible
- [ ] **Performance History**: A/B test potential assessed

---

## PHASE 4: PROMOTE WINDOW CONFIGURATION

### 4.1 Window Scheduling

- [ ] **Start Time**: `now+2m` minimum for setup buffer
- [ ] **Duration**: 60-120 minutes (document: `___ min`)
- [ ] **End Time**: Auto-calculated and verified
- [ ] **Business Hours**: Within 9AM-5PM Europe/Istanbul

### 4.2 Promote Gate Safety

- [ ] **Initial State**: PROMOTE=FALSE confirmed
- [ ] **Auto-Enable**: Scheduled start triggers PROMOTE=TRUE
- [ ] **Auto-Disable**: Scheduled end triggers PROMOTE=FALSE
- [ ] **Manual Override**: Emergency disable capability ready

---

## PHASE 5: PRE-FLIGHT SCRIPT VALIDATION

### 5.1 Preview Mode Test (PROMOTE=FALSE)

- [ ] **Budget Preview**: Shows budget cap application
- [ ] **CPC Preview**: Shows bidding ceiling application
- [ ] **Schedule Preview**: Shows time window setup
- [ ] **Exclusions Preview**: Shows master negatives
- [ ] **No Mutations**: Confirms no actual changes made

### 5.2 Validation Checklist

- [ ] **N-gram Miner**: Negative keyword generation ready
- [ ] **RSA Build**: Asset compilation prepared
- [ ] **Audience Attach**: Attachment configuration shown
- [ ] **Change History**: Only canary campaign targeted
- [ ] **Error Check**: No validation errors in logs

---

## PHASE 6: LIVE EXECUTION MONITORING

### 6.1 Real-Time Monitoring Setup

- [ ] **RUN_LOGS Sheet**: Open and refreshing
- [ ] **Google Ads Interface**: Change History tab open
- [ ] **Budget Monitor**: Spend tracking ready
- [ ] **Performance Alerts**: CTR/CPC thresholds set

### 6.2 Live Execution Validation

- [ ] **Script Start**: Execution timestamp logged
- [ ] **Order Sequence**: Budget → Bidding → Schedule → Negatives → RSA → Audience
- [ ] **Success Confirmations**: Each step completed successfully
- [ ] **Spend Monitoring**: Real-time budget consumption tracked

### 6.3 Success Markers (First Hour)

- [ ] **Impressions**: Ads serving within 15 minutes
- [ ] **Spend Pace**: ≤25% of daily cap in first hour
- [ ] **CPC Compliance**: All clicks below ceiling
- [ ] **Quality Score**: Maintained or improved
- [ ] **Change History**: Only expected modifications

---

## PHASE 7: EMERGENCY ROLLBACK PROCEDURES

### 7.1 Immediate Rollback Triggers

- [ ] **Budget Breach**: >110% of daily cap
- [ ] **CPC Spike**: Any click >120% of ceiling
- [ ] **Error Flood**: ≥3 script errors in 5 minutes
- [ ] **Performance Drop**: CTR <50% of baseline
- [ ] **Compliance Alert**: Policy violation detected

### 7.2 Rollback Execution (<2 minutes)

1. **PROMOTE Disable**: Set `PROMOTE=false` immediately
2. **Audience Detach**: Clear `AUDIENCE_MAP_*` entries
3. **Campaign Pause**: Manual pause in Google Ads
4. **Budget Reset**: Restore original budget limits
5. **Schedule Clear**: Remove active schedules

### 7.3 Post-Rollback Validation

- [ ] **Spend Stop**: No new spend within 5 minutes
- [ ] **Change Revert**: All modifications reversed
- [ ] **Baseline Restore**: Original settings confirmed
- [ ] **Incident Log**: Full rollback event documented
- [ ] **Analysis Ready**: Data preserved for review

---

## PHASE 8: POST-CANARY ANALYSIS

### 8.1 Performance Review

- [ ] **Total Spend**: Document actual vs. budgeted
- [ ] **Click Performance**: Avg CPC vs. ceiling
- [ ] **Quality Impact**: Score changes documented
- [ ] **Audience Response**: OBSERVE mode insights
- [ ] **AI Draft Performance**: Creative effectiveness

### 8.2 Scale Decision Gates

- [ ] **Success Criteria**: All safety metrics met
- [ ] **Performance Improvement**: Measurable gains vs. baseline
- [ ] **No Incidents**: Zero rollback events
- [ ] **Quality Maintained**: No score degradation
- [ ] **Budget Efficiency**: CPA within targets

### 8.3 Production Readiness

- [ ] **Schedule Expansion**: Gradual hour increases
- [ ] **Budget Scaling**: Incremental daily increases
- [ ] **Campaign Expansion**: Additional campaigns qualified
- [ ] **AI Draft Enable**: Production mode activation
- [ ] **Full Monitoring**: Ongoing safety nets active

---

## EMERGENCY CONTACTS & PROCEDURES

### Critical Escalation

- **Script Issues**: Backend logs analysis required
- **Budget Overrun**: Google Ads account manager contact
- **Performance Drop**: Campaign optimization review
- **Technical Failure**: Full system rollback protocol

### Documentation Requirements

- **Execution Log**: Complete timestamped record
- **Spend Report**: Detailed budget utilization
- **Performance Delta**: Before/after comparison
- **Incident Report**: Any issues encountered
- **Lessons Learned**: Process improvements identified

---

**FINAL SAFETY REMINDER**: Never skip validation steps. Every canary test is a production deployment with real budget impact. When in doubt, abort and analyze.
