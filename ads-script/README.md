# ProofKit Google Ads Script - Idempotency Test Harness

**CRITICAL P0-1 PRODUCTION SAFETY SYSTEM**

This directory contains the complete idempotency testing system that ensures Google Ads Scripts are safe for production deployment by guaranteeing that second runs plan zero mutations.

## 🚨 CRITICAL SAFETY NOTICE

**DO NOT DEPLOY TO PRODUCTION WITHOUT PASSING IDEMPOTENCY TESTS**

This system is the final safety gate before production deployment. All scripts must pass idempotency validation to prevent unintended account changes.

## 📁 Files Delivered

### Core System Files

- **`master.gs`** - Enhanced Google Ads Script with built-in mutation tracking and preview mode
- **`test-harness.cjs`** - External test harness for simulating and validating script execution
- **`promote-gate.cjs`** - Production promotion gate that blocks unsafe deployments
- **`run-idempotency-test.cjs`** - Complete test runner demonstrating the full workflow

### Documentation

- **`IDEMPOTENCY_TEST_GUIDE.md`** - Comprehensive guide for using the test harness
- **`README.md`** - This overview file

## 🔧 Quick Start

### Run Complete Test Suite

```bash
cd ads-script
node run-idempotency-test.cjs
```

### Check Promote Gate Status

```bash
node promote-gate.cjs --log-dir ../run_logs
```

### Manual Test in Google Apps Script

```javascript
// In Google Apps Script editor, add this function:
function testIdempotency() {
  return runIdempotencyTest_();
}
```

### Production Deployment

1. **Run idempotency tests** - Must pass with 0 second-run mutations
2. **Verify promote gate** - Must show `canPromote: true`
3. **Deploy to Google Ads** - Paste master.gs; set TENANT_ID, BACKEND_URL, SHARED_SECRET; then schedule

## ✅ What This System Guarantees

1. **Zero Mutations on Second Run**: Ensures scripts are truly idempotent
2. **Comprehensive Logging**: All planned changes are logged for audit
3. **Automated Validation**: No human judgment required for pass/fail decisions
4. **Production Gate**: Automatically blocks unsafe deployments
5. **Audit Trail**: Complete log history for compliance

## 🔍 Mutation Types Tracked

The system tracks and validates all critical Google Ads operations:

- **Budget Changes**: Campaign budget modifications
- **Bidding Updates**: Strategy and ceiling changes
- **Ad Schedules**: Business hours additions
- **Negative Keywords**: Master and waste negative additions
- **RSA Creation**: Responsive Search Ad generation
- **Audience Attachment**: Remarketing list connections
- **Label Applications**: Entity labeling for tracking

## 📊 Test Results Format

### PASS Example ✅
```
✓ IDEMPOTENCY TEST PASSED - Script is idempotent
First run: 15 mutations planned
Second run: 0 mutations planned
```

### FAIL Example ❌
```
✗ IDEMPOTENCY TEST FAILED - Second run planned 3 mutations
Action Required: Fix script before production deployment
```

## 🔒 Promote Gate Integration

The system integrates with CI/CD pipelines to prevent unsafe deployments:

```yaml
# GitHub Actions Example
- name: Run Idempotency Tests
  run: |
    cd ads-script
    node run-idempotency-test.cjs
    # Exits with code 1 if tests fail, blocking deployment
```

## 📋 Pre-Production Checklist

Before deploying to production, ensure:

- [ ] ✅ Idempotency test passes (0 second-run mutations)
- [ ] ✅ Test logs available in `run_logs/` directory  
- [ ] ✅ Promote gate shows `canPromote: true`
- [ ] ✅ All mutation types properly tracked
- [ ] ✅ Manual review of first-run mutations completed
- [ ] ✅ No test harness code in production script

## 🚨 Emergency Procedures

### If Idempotency Test Fails

1. **STOP** - Do not proceed with deployment
2. **Investigate** - Review mutation logs to identify issues
3. **Fix** - Add missing label guards or state checks
4. **Retest** - Run idempotency test again
5. **Verify** - Ensure promote gate passes before deployment

### Common Failure Scenarios

1. **Missing Label Guards**: Add proper entity labeling
2. **Incomplete State Checks**: Verify existence before creation
3. **Configuration Changes**: Ensure stable config during testing
4. **Race Conditions**: Add proper waits and retries

## 🔧 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   master.gs     │───▶│  test-harness.cjs │───▶│ promote-gate.cjs│
│ (Enhanced ADS   │    │  (Validation     │    │ (Safety Gate)   │
│  Script)        │    │   Logic)         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mutation      │    │    Test Results  │    │  Deployment     │
│   Tracking      │    │    + Logs        │    │  Decision       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📞 Support

This is a critical safety system. For questions or issues:

1. Review the comprehensive guide: `IDEMPOTENCY_TEST_GUIDE.md`
2. Check test logs in `run_logs/` directory
3. Consult team lead before making system changes

## ⚡ Performance

- **Test Runtime**: < 30 seconds typical
- **Log File Size**: ~1-2KB per test
- **Zero Production Impact**: Preview mode only
- **CI/CD Integration**: < 1 minute total

## 🔄 Maintenance

This system requires:
- Regular log cleanup (automated via CI/CD)
- Periodic validation against Google Ads API changes
- Team training on proper usage and interpretation

---

**Remember: This system is your final safeguard against production incidents. Use it religiously before every deployment.**