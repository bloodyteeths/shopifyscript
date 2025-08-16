# ProofKit Ads Script - Idempotency Test Harness

## Overview

This document describes the **critical P0-1** idempotency test harness that guarantees Google Ads Script runs are safe for production deployment. The harness ensures that running the script multiple times produces the same result (idempotent behavior) and prevents unintended account changes.

## Why Idempotency Testing is Critical

Google Ads Scripts can make irreversible changes to advertising accounts. Without proper idempotency validation:
- Scripts may create duplicate entities on subsequent runs
- Budgets could be repeatedly modified
- Negative keywords could be added multiple times
- Performance data could be corrupted

**This test harness is the final safety gate before production deployment.**

## Components

### 1. Test Harness (`test-harness.js`)
External JavaScript harness that simulates Google Ads Script execution environments and validates idempotency.

### 2. Modified Script (`master.gs`)
Enhanced Google Ads Script with built-in mutation tracking and preview mode capabilities.

### 3. Logging Integration
All test results are automatically logged to `run_logs/` for audit trails and production safety verification.

## How It Works

### Preview Mode Operation
1. **First Run**: Script executes in preview mode, logging all planned mutations without making actual changes
2. **Second Run**: Script executes again in preview mode
3. **Assertion**: Second run should plan **ZERO mutations** (idempotency proof)
4. **Logging**: Results are written to RUN_LOGS with detailed mutation tracking

### Mutation Types Tracked
- `BUDGET_CHANGE`: Campaign budget modifications
- `BIDDING_STRATEGY_CHANGE`: Bidding strategy updates
- `AD_SCHEDULE_ADD`: Ad schedule additions
- `MASTER_NEGATIVE_ADD`: Master negative keyword additions
- `NEGATIVE_LIST_ATTACH`: Negative keyword list attachments
- `WASTE_NEGATIVE_ADD`: Waste negative keyword additions
- `AUTO_NEGATIVE_ADD`: Auto-generated negative keywords
- `RSA_CREATE`: Responsive Search Ad creation
- `AUDIENCE_ATTACH`: Audience list attachments

## Usage

### Method 1: Direct Script Function Call

```javascript
// In Google Apps Script editor
function testIdempotency() {
  return runIdempotencyTest_();
}
```

### Method 2: External Harness (Node.js/Testing Environment)

```javascript
const AdsScriptTestHarness = require('./test-harness.js');

const harness = new AdsScriptTestHarness();
harness.init({ 
  logDirectory: './run_logs',
  maxRetries: 3 
});

// Run the test
const testResults = await harness.runIdempotencyTest(main);
const promoteGate = harness.createPromoteGate(testResults);

if (promoteGate.canPromote) {
  console.log('✓ Script is safe for production deployment');
} else {
  console.error('✗ Script failed idempotency check - DO NOT DEPLOY');
  process.exit(1);
}
```

### Method 3: Properties Service Control

```javascript
// Set test mode via Properties Service
PropertiesService.getScriptProperties().setProperty('PROOFKIT_TEST_MODE', 'PREVIEW');

// Run main function - will execute in preview mode
main();

// Check results
const results = getMutationLog_();
console.log('Mutations planned:', results.mutationCount);
```

## Test Results Interpretation

### PASS ✓
```
✓ IDEMPOTENCY TEST PASSED - Script is idempotent
First run: 15 mutations planned
Second run: 0 mutations planned
```

### FAIL ✗
```
✗ IDEMPOTENCY TEST FAILED - Second run planned 3 mutations
First run: 15 mutations planned  
Second run: 3 mutations planned
Second run mutations: [
  {
    "type": "BUDGET_CHANGE",
    "details": {"campaign": "Search Campaign", "newAmount": 50}
  }
]
```

## Integration with PROMOTE Gates

The test harness creates promote gate decisions that can be integrated with CI/CD pipelines:

```javascript
const promoteGate = harness.createPromoteGate(testResults);

// Example gate structure:
{
  gate: 'IDEMPOTENCY_CHECK',
  passed: true,
  canPromote: true,
  runId: '2025-08-16T10-30-45-123Z_idempotency_test',
  timestamp: '2025-08-16T10:30:45.123Z',
  details: 'Script passed idempotency validation - safe to promote to production',
  logFile: '/run_logs/2025-08-16T10-30-45-123Z_idempotency_test.log'
}
```

## Log File Structure

Test results are automatically written to `run_logs/` with the following format:

```
[2025-08-16T10:30:45.123Z] TEST_HARNESS_INIT: Idempotency test harness initialized
[2025-08-16T10:30:45.124Z] TEST_START: Beginning idempotency validation
[2025-08-16T10:30:45.125Z] FIRST_RUN_START: Starting first preview run
[2025-08-16T10:30:45.126Z] MUTATION_PLANNED: BUDGET_CHANGE - {"campaign":"Search Campaign","newAmount":50}
[2025-08-16T10:30:45.130Z] FIRST_RUN_COMPLETE: First run planned 15 mutations
[2025-08-16T10:30:45.131Z] SECOND_RUN_START: Starting second preview run
[2025-08-16T10:30:45.135Z] SECOND_RUN_COMPLETE: Second run planned 0 mutations
[2025-08-16T10:30:45.136Z] IDEMPOTENCY_CONFIRMED: Script behavior is idempotent
[2025-08-16T10:30:45.137Z] TEST_COMPLETE: Idempotency test PASSED
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Ads Script Idempotency Test
on: [push, pull_request]

jobs:
  idempotency-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Idempotency Test
        run: |
          cd ads-script
          node -e "
            const harness = require('./test-harness.js');
            const h = new harness();
            h.init();
            const results = h.runIdempotencyTest(() => {
              // Mock main function for testing
              console.log('Mock script execution');
            });
            if (!results.passed) {
              console.error('Idempotency test failed');
              process.exit(1);
            }
          "
```

## Troubleshooting

### Common Failure Scenarios

1. **Missing Label Guards**: Entities created without proper labeling may be recreated
   - **Fix**: Ensure all created entities are properly labeled with `cfg.label`

2. **Incomplete State Checks**: Script doesn't check existing state before mutations
   - **Fix**: Add proper existence checks before creating entities

3. **Race Conditions**: Script behavior depends on external timing
   - **Fix**: Add proper waits and retries for consistency

4. **Configuration Changes**: Script behavior changes between runs due to config
   - **Fix**: Ensure configuration is stable during test execution

### Debugging Failed Tests

When a test fails:

1. **Check the mutation log**: Review which mutations were planned in the second run
2. **Verify label logic**: Ensure entities are properly labeled and checked
3. **Check exclusion logic**: Verify campaign/ad group exclusions are working
4. **Review state detection**: Confirm the script properly detects existing entities

## Safety Guarantees

This test harness provides the following safety guarantees:

- ✅ **No Production Changes**: Preview mode prevents actual account modifications
- ✅ **Comprehensive Logging**: All planned changes are logged for audit
- ✅ **Automated Validation**: Zero human judgment required for pass/fail decisions
- ✅ **CI/CD Integration**: Can block deployments on failure
- ✅ **Audit Trail**: Complete log history for compliance and debugging

## CRITICAL: Pre-Production Checklist

Before deploying to production, ensure:

- [ ] Idempotency test passes with 0 second-run mutations
- [ ] Test logs are available in `run_logs/` directory
- [ ] Promote gate shows `canPromote: true`
- [ ] All mutation types are properly tracked
- [ ] No test harness code remains in production script
- [ ] Manual spot-check of first-run planned mutations looks reasonable

**DO NOT DEPLOY TO PRODUCTION IF ANY IDEMPOTENCY TESTS FAIL**

## Support and Maintenance

This test harness is a critical safety component. Any modifications should:

1. Maintain backward compatibility with existing tests
2. Preserve all safety guarantees
3. Include comprehensive test coverage
4. Be thoroughly reviewed by multiple team members

For questions or issues, consult the team lead before making changes to this system.