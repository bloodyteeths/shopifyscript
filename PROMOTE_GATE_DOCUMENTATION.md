# ProofKit PROMOTE Gate - Production Safety Documentation

## 🚨 CRITICAL PRODUCTION SAFETY SYSTEM 🚨

The PROMOTE Gate is a comprehensive safety system designed to prevent accidental mutations to live Google Ads accounts. This system enforces the principle of **explicit promotion** - where all live changes must be explicitly enabled by setting `PROMOTE=TRUE`.

## Overview

The PROMOTE Gate provides multiple layers of protection:

1. **Script-Level Protection** - Blocks mutations in Google Ads scripts when `PROMOTE=FALSE`
2. **Backend Validation** - Middleware that validates PROMOTE status before processing requests
3. **NEG_GUARD System** - Protects against reserved keyword conflicts
4. **Label Guard** - Ensures all entities are properly tagged with `PROOFKIT_AUTOMATED`
5. **Idempotency Validation** - Prevents duplicate mutations through comprehensive testing
6. **Mutation Limits** - Enforces safety thresholds on the number of changes per run

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Ads Script   │    │    Backend API   │    │  PROMOTE Gate   │
│                 │    │                  │    │    Monitor     │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │                 │
│ │ PROMOTE     │ │    │ │ Middleware   │ │    │ ┌─────────────┐ │
│ │ Gate Check  │◄┼────┼►│ Validation   │ │    │ │Idempotency  │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ │Test Suite   │ │
│                 │    │                  │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │                 │
│ │ NEG_GUARD   │ │    │ │ PROMOTE      │ │    │ ┌─────────────┐ │
│ │ Protection  │ │    │ │ Status API   │ │    │ │Safety       │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ │Monitoring   │ │
│                 │    │                  │    │ └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Configuration

### Setting PROMOTE Status

The PROMOTE flag is controlled through the tenant configuration:

```javascript
// In Google Sheets CONFIG_{tenant} tab or backend configuration
{
  "PROMOTE": "TRUE",  // Enables live mutations
  "label": "PROOFKIT_AUTOMATED",
  "enabled": "TRUE"
}
```

### Environment Variables

```bash
# Backend environment
PROMOTE_GATE_ENABLED=true
MAX_MUTATIONS_PER_RUN=100
RESERVED_KEYWORDS=proofkit,brand,competitor,important
```

## Google Ads Script Integration

### PROMOTE Gate in master.gs

The Google Ads script includes comprehensive PROMOTE gate validation:

```javascript
function main() {
  // Initialize idempotency tracking
  initializeIdempotencyTracking_();

  var cfg = getConfig_();
  if (!cfg || !cfg.enabled) return;

  // ===== CRITICAL PROMOTE GATE ENFORCEMENT =====
  if (!validatePromoteGate_(cfg)) {
    log_("! PROMOTE GATE FAILED - Script execution blocked for safety");
    return;
  }

  // Initialize safety guards
  initializeSafetyGuards_(cfg);

  // Mutations only proceed if PROMOTE=TRUE
  if (!PREVIEW_MODE && cfg.PROMOTE) {
    // Safe to proceed with live changes
  } else {
    // Log planned changes only
  }
}
```

### Safety Guard Functions

```javascript
/**
 * Critical PROMOTE gate validation
 */
function validatePromoteGate_(cfg) {
  if (!cfg) return false;

  var promoteEnabled =
    cfg.PROMOTE === true || String(cfg.PROMOTE).toLowerCase() === "true";

  if (!promoteEnabled) {
    log_("! PROMOTE GATE: PROMOTE=FALSE - All mutations blocked");
    return false;
  }

  return true;
}

/**
 * Initialize safety guards
 */
function initializeSafetyGuards_(cfg) {
  NEG_GUARD_ACTIVE = cfg.PROMOTE && !PREVIEW_MODE;

  log_("• Safety Guards Initialized:");
  log_("  - PROMOTE: " + (cfg.PROMOTE ? "ENABLED" : "DISABLED"));
  log_("  - NEG_GUARD: " + (NEG_GUARD_ACTIVE ? "ACTIVE" : "INACTIVE"));
  log_("  - LABEL_GUARD: " + (cfg.label || "PROOFKIT_AUTOMATED"));
}
```

## Backend Middleware Integration

### PROMOTE Gate Middleware

```javascript
/**
 * PROMOTE gate middleware for Express routes
 */
function promoteGateMiddleware(mutationType = "GENERAL") {
  return async (req, res, next) => {
    const tenant = req.query.tenant || req.body.tenant;
    const gateResult = await validatePromoteGate(tenant, mutationType);

    if (!gateResult.ok) {
      return res.status(403).json({
        ok: false,
        code: "PROMOTE_GATE_BLOCKED",
        error: "PROMOTE gate active - Live mutations blocked for safety",
        promote: gateResult.promote,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}
```

### Protected Endpoints

Apply PROMOTE gate middleware to critical mutation endpoints:

```javascript
// Autopilot mutations
app.post(
  "/api/jobs/autopilot_tick",
  promoteGateMiddleware("AUTOPILOT_TICK"),
  async (req, res) => {
    /* handler */
  },
);

// Insights actions
app.post(
  "/api/insights/actions/apply",
  promoteGateMiddleware("INSIGHTS_ACTIONS"),
  async (req, res) => {
    /* handler */
  },
);

// CPC ceiling changes
app.post(
  "/api/cpc-ceilings/batch",
  promoteGateMiddleware("CPC_CEILINGS_BATCH"),
  async (req, res) => {
    /* handler */
  },
);
```

## NEG_GUARD Protection System

### Reserved Keywords Protection

The NEG_GUARD system prevents adding important terms as negative keywords:

```javascript
var RESERVED_KEYWORDS = ["proofkit", "brand", "competitor", "important"];

function isReservedKeyword_(term) {
  if (!term) return false;
  var termLower = String(term).toLowerCase().trim();

  for (var i = 0; i < RESERVED_KEYWORDS.length; i++) {
    if (termLower.indexOf(RESERVED_KEYWORDS[i]) !== -1) {
      log_("! NEG_GUARD: Blocked reserved keyword: " + term);
      return true;
    }
  }

  return false;
}
```

### Negative Keyword Validation

```javascript
function upsertListNegs_(list, terms) {
  (terms || []).forEach(function (t) {
    t = String(t || "").trim();
    if (t && !have[t.toLowerCase()] && !isReservedKeyword_(t)) {
      if (!PREVIEW_MODE && NEG_GUARD_ACTIVE) {
        list.addNegativeKeyword(t);
      } else {
        log_("• Master negative planned: " + t);
      }
    }
  });
}
```

## Label Guard System

### Comprehensive Labeling

All entities created or modified by ProofKit are labeled with `PROOFKIT_AUTOMATED`:

```javascript
/**
 * Enhanced label guard - ensures entity is properly labeled
 */
function safeLabelWithGuard_(entity, labelName) {
  try {
    var hasLabel = false;
    var labels = entity.labels().get();
    while (labels.hasNext()) {
      if (labels.next().getName() === labelName) {
        hasLabel = true;
        break;
      }
    }

    if (!hasLabel) {
      entity.applyLabel(labelName);
      log_("• Label applied: " + labelName);
    }
  } catch (e) {
    log_("! Label guard error: " + e);
  }
}
```

## Testing and Validation

### Idempotency Testing

Run the idempotency test suite to ensure script safety:

```bash
# Run idempotency tests
node run-idempotency-test.cjs

# Run comprehensive PROMOTE gate tests
node promote-gate-test.cjs --verbose
```

### PROMOTE Gate Test Suite

The comprehensive test suite validates:

- PROMOTE=FALSE blocks mutations
- PROMOTE=TRUE allows mutations
- Idempotency is maintained
- Safety guards are active
- Label protection works
- NEG_GUARD prevents reserved keywords
- Mutation limits are enforced

### Test Categories

1. **PROMOTE Gate Validation**
   - `PROMOTE_FALSE_BLOCKS_MUTATIONS`
   - `PROMOTE_TRUE_ALLOWS_MUTATIONS`
   - `MISSING_PROMOTE_DEFAULTS_FALSE`

2. **Idempotency Validation**
   - `IDEMPOTENCY_LOG_EXISTS`
   - `IDEMPOTENCY_TEST_PASSED`

3. **Safety Guards**
   - `LABEL_GUARD_CONFIGURED`
   - `PREVIEW_MODE_PROTECTION`

4. **NEG_GUARD Protection**
   - `RESERVED_KEYWORD_PROTECTION`
   - `NEG_GUARD_ACTIVATION`

5. **Label Guard Protection**
   - `LABEL_APPLICATION_SIMULATION`
   - `DUPLICATE_LABEL_HANDLING`

6. **Mutation Limits**
   - `NORMAL_MUTATION_COUNT`
   - `EXCESSIVE_MUTATION_COUNT`

7. **Backend Integration**
   - `HMAC_SIGNATURE_VALIDATION`
   - `BACKEND_GATE_STATUS`

## Operational Procedures

### Pre-Deployment Checklist

Before enabling PROMOTE=TRUE for any tenant:

1. ✅ **Run Idempotency Tests**

   ```bash
   node run-idempotency-test.cjs
   # Must show: "✓ IDEMPOTENCY TEST PASSED"
   ```

2. ✅ **Run PROMOTE Gate Test Suite**

   ```bash
   node promote-gate-test.cjs --verbose
   # Must show: "✅ Test Suite PASSED"
   ```

3. ✅ **Validate PROMOTE Gate Status**

   ```bash
   node promote-gate.cjs --log-dir ./run_logs
   # Must show: "✅ All safety checks passed"
   ```

4. ✅ **Check Recent Logs**
   - Verify label guard is active
   - Confirm NEG_GUARD protection
   - Validate mutation counts are reasonable

5. ✅ **Backend Gate Status**
   ```bash
   # Check backend PROMOTE gate endpoint
   curl -X GET "https://backend.proofkit.net/api/promote/gate/status?tenant=TENANT_ID&sig=HMAC_SIG"
   ```

### Emergency Procedures

#### Immediate PROMOTE Disable

If issues are detected in production:

1. **Disable PROMOTE Immediately**

   ```sql
   UPDATE CONFIG_TENANT_ID SET value='FALSE' WHERE key='PROMOTE';
   ```

2. **Stop Running Scripts**
   - Cancel any scheduled Google Ads script runs
   - Check Google Ads UI for active automation

3. **Assess Impact**
   - Review recent mutation logs
   - Check for unexpected changes in Google Ads accounts
   - Validate campaign performance

4. **Investigation**
   - Run idempotency tests to identify issues
   - Check backend logs for error patterns
   - Validate safety guard configurations

#### Recovery Process

1. **Fix Root Cause**
   - Address any configuration issues
   - Update safety guard parameters
   - Fix script logic if needed

2. **Validate Fixes**
   - Run complete test suite
   - Verify idempotency
   - Test with PROMOTE=FALSE first

3. **Gradual Re-enable**
   - Start with preview mode testing
   - Enable for test tenant first
   - Monitor carefully for 24 hours
   - Gradually enable for production tenants

### Monitoring and Alerting

#### Key Metrics to Monitor

1. **PROMOTE Gate Status**
   - Track PROMOTE=TRUE/FALSE per tenant
   - Monitor gate decision frequencies
   - Alert on unexpected gate failures

2. **Mutation Rates**
   - Track mutations per run per tenant
   - Alert on excessive mutation counts
   - Monitor mutation success rates

3. **Safety Guard Status**
   - Verify label guard is active
   - Check NEG_GUARD protection
   - Monitor reserved keyword blocks

4. **Idempotency Health**
   - Track idempotency test results
   - Monitor test execution frequency
   - Alert on test failures

#### Alert Configurations

```yaml
# Example alerting rules
alerts:
  - name: promote_gate_failure
    condition: promote_gate_blocked_rate > 10%
    action: immediate_notification

  - name: excessive_mutations
    condition: mutations_per_run > 100
    action: auto_disable_promote

  - name: idempotency_test_failure
    condition: idempotency_test_failed
    action: block_deployments

  - name: reserved_keyword_violations
    condition: reserved_keywords_blocked > 5
    action: review_required
```

## Troubleshooting

### Common Issues

#### PROMOTE Gate Blocked Unexpectedly

**Symptoms:**

- Script logs show "PROMOTE GATE FAILED"
- Backend returns 403 PROMOTE_GATE_BLOCKED
- No mutations are being applied

**Diagnosis:**

```bash
# Check PROMOTE configuration
node promote-gate.cjs --log-dir ./run_logs

# Check backend gate status
curl -X GET "backend/api/promote/gate/status?tenant=TENANT&sig=SIG"

# Review recent idempotency tests
ls -la run_logs/*idempotency*.log
```

**Solutions:**

1. Verify PROMOTE=TRUE in configuration
2. Check idempotency test results
3. Validate safety guard configurations
4. Review recent error logs

#### Idempotency Test Failures

**Symptoms:**

- Tests show mutations on second run
- PROMOTE gate blocks deployment
- "IDEMPOTENCY TEST FAILED" in logs

**Diagnosis:**

```bash
# Run detailed idempotency test
node run-idempotency-test.cjs --verbose

# Check mutation logs
grep "MUTATION_PLANNED" run_logs/latest_idempotency.log
```

**Solutions:**

1. Review entity creation logic for label guards
2. Check state detection in script
3. Validate exclusion rules
4. Fix duplicate detection logic

#### NEG_GUARD False Positives

**Symptoms:**

- Valid keywords blocked as "reserved"
- Excessive NEG_GUARD warnings in logs
- Terms not being added as negatives

**Diagnosis:**

```bash
# Check reserved keyword list
grep "RESERVED_KEYWORDS" ads-script/master.gs

# Review blocked terms
grep "NEG_GUARD: Blocked" run_logs/*.log
```

**Solutions:**

1. Review and update reserved keyword list
2. Implement more specific matching logic
3. Add whitelist for approved terms
4. Adjust keyword protection rules

### Debug Mode

Enable debug mode for detailed PROMOTE gate logging:

```javascript
// In Google Ads script
var PROMOTE_DEBUG = true;

function validatePromoteGate_(cfg) {
  if (PROMOTE_DEBUG) {
    log_("DEBUG: PROMOTE Gate validation starting");
    log_("DEBUG: Config PROMOTE=" + cfg.PROMOTE);
    log_("DEBUG: Config enabled=" + cfg.enabled);
  }

  // ... validation logic
}
```

## Security Considerations

### HMAC Validation

All PROMOTE gate status requests require HMAC signature validation:

```javascript
function verify(sig, payload) {
  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64")
    .replace(/=+$/, "");
  return sig === expectedSig;
}
```

### Access Control

- PROMOTE status changes require appropriate permissions
- Backend endpoints are protected with HMAC authentication
- Audit logs track all PROMOTE gate decisions

### Data Protection

- No sensitive account data in PROMOTE gate logs
- PII is excluded from safety monitoring
- Audit trails maintain security compliance

## Best Practices

### Configuration Management

1. **Always Test First**
   - Run idempotency tests before enabling PROMOTE
   - Use preview mode to validate changes
   - Test with non-critical accounts first

2. **Gradual Rollouts**
   - Enable PROMOTE for one tenant at a time
   - Monitor for 24 hours before expanding
   - Keep rollback procedures ready

3. **Documentation**
   - Document all PROMOTE status changes
   - Maintain change logs for safety configurations
   - Keep emergency contact information updated

### Development Workflow

1. **Local Testing**

   ```bash
   # Always run local tests
   node promote-gate-test.cjs --verbose
   node run-idempotency-test.cjs
   ```

2. **Staging Validation**
   - Deploy to staging environment first
   - Run full test suite in staging
   - Validate all safety mechanisms

3. **Production Deployment**
   - Use PROMOTE gate validation in CI/CD
   - Require idempotency test passage
   - Monitor deployment health

### Maintenance

1. **Regular Testing**
   - Run monthly idempotency validation
   - Update test suites for new features
   - Validate safety guard effectiveness

2. **Configuration Reviews**
   - Quarterly review of reserved keywords
   - Annual safety threshold validation
   - Regular mutation limit assessments

3. **Documentation Updates**
   - Keep procedures current with system changes
   - Update troubleshooting guides
   - Maintain emergency contact information

## Conclusion

The PROMOTE Gate system provides comprehensive protection against accidental mutations in production Google Ads accounts. By requiring explicit promotion through `PROMOTE=TRUE` and validating through multiple safety layers, the system ensures that only intended changes reach live advertising accounts.

The system's multi-layered approach - combining script-level validation, backend middleware, comprehensive testing, and operational procedures - provides robust protection while maintaining operational flexibility.

Regular testing, monitoring, and adherence to operational procedures are essential for maintaining the effectiveness of this critical production safety system.

---

**⚠️ REMEMBER: Always validate PROMOTE gate functionality before deploying to production. The safety of client advertising accounts depends on proper implementation and testing of these safety mechanisms.**
