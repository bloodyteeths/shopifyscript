#!/usr/bin/env node

/**
 * ProofKit Ads Script - Idempotency Test Runner
 *
 * This script demonstrates the complete idempotency testing workflow
 * and can be used as a reference implementation for CI/CD integration.
 */

const fs = require("fs");
const path = require("path");

// Import our test harness and promote gate
const AdsScriptTestHarness = require("./test-harness.cjs");
const PromoteGate = require("./promote-gate.cjs");

/**
 * Mock Google Ads Script main function for demonstration
 * In real usage, this would be the actual master.gs main() function
 */
function mockMainFunction() {
  console.log("Executing mock Google Ads Script...");

  // Simulate some planned mutations on first run
  if (mockMainFunction.callCount === 0) {
    console.log("First run - planning mutations...");
    // This would trigger actual logMutation_ calls in real script
    mockMainFunction.plannedMutations = [
      {
        type: "BUDGET_CHANGE",
        details: { campaign: "Test Campaign", amount: 50 },
      },
      {
        type: "RSA_CREATE",
        details: { campaign: "Test Campaign", adGroup: "Test AdGroup" },
      },
    ];
  } else {
    console.log("Second run - should plan no mutations...");
    // Idempotent behavior - no mutations on second run
    mockMainFunction.plannedMutations = [];
  }

  mockMainFunction.callCount++;
  return mockMainFunction.plannedMutations;
}

mockMainFunction.callCount = 0;
mockMainFunction.plannedMutations = [];

/**
 * Main test execution function
 */
async function runIdempotencyTest() {
  console.log("🚀 Starting ProofKit Idempotency Test Workflow\n");

  try {
    // Initialize test harness
    const harness = new AdsScriptTestHarness();
    harness.init({
      logDirectory: path.join(__dirname, "../run_logs"),
      maxRetries: 3,
      assertionTimeout: 30000,
    });

    console.log("📋 Running idempotency validation...");

    // Run the test
    const testResults = await harness.runIdempotencyTest(mockMainFunction);

    // Display results
    console.log("\n📊 Test Results:");
    console.log(`Run ID: ${testResults.runId}`);
    console.log(`Test Passed: ${testResults.passed ? "✅ YES" : "❌ NO"}`);
    console.log(
      `First Run Mutations: ${testResults.firstRun?.mutationCount || "N/A"}`,
    );
    console.log(
      `Second Run Mutations: ${testResults.secondRun?.mutationCount || "N/A"}`,
    );

    if (testResults.logFile) {
      console.log(`Log File: ${testResults.logFile}`);
    }

    if (!testResults.passed) {
      console.log("\n❌ Test Failed - Second Run Mutations:");
      console.log(
        JSON.stringify(testResults.secondRun?.mutations || [], null, 2),
      );
    }

    // Create promote gate decision
    const promoteGate = harness.createPromoteGate(testResults);

    console.log("\n🔒 Promote Gate Decision:");
    console.log(`Can Promote: ${promoteGate.canPromote ? "✅ YES" : "❌ NO"}`);
    console.log(`Details: ${promoteGate.details}`);

    // Write test results to log file for promote gate
    if (testResults.runId) {
      const logDir = path.join(__dirname, "../run_logs");
      const logFile = path.join(logDir, `${testResults.runId}.log`);

      // Ensure log directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logContent =
        [
          `[${new Date().toISOString()}] TEST_HARNESS_INIT: Idempotency test harness initialized`,
          `[${new Date().toISOString()}] TEST_START: Beginning idempotency validation`,
          `[${new Date().toISOString()}] FIRST_RUN_START: Starting first preview run`,
          `[${new Date().toISOString()}] FIRST_RUN_COMPLETE: First run planned ${testResults.firstRun?.mutationCount || 0} mutations`,
          `[${new Date().toISOString()}] SECOND_RUN_START: Starting second preview run`,
          `[${new Date().toISOString()}] SECOND_RUN_COMPLETE: Second run planned ${testResults.secondRun?.mutationCount || 0} mutations`,
          `[${new Date().toISOString()}] ${testResults.passed ? "IDEMPOTENCY_CONFIRMED: Script behavior is idempotent" : "IDEMPOTENCY_VIOLATION: Script is not idempotent"}`,
          `[${new Date().toISOString()}] TEST_COMPLETE: Idempotency test ${testResults.passed ? "PASSED" : "FAILED"}`,
          `[${new Date().toISOString()}] IDEMPOTENCY_TEST_RESULT: ${JSON.stringify(testResults)}`,
        ].join("\n") + "\n";

      fs.writeFileSync(logFile, logContent);
      console.log(`\n📄 Test log written to: ${logFile}`);
    }

    // Run promote gate evaluation
    console.log("\n🔐 Running Promote Gate Evaluation...");

    const gate = new PromoteGate({
      logDirectory: path.join(__dirname, "../run_logs"),
      maxLogAge: 24 * 60 * 60 * 1000, // 24 hours
      exitOnFailure: false, // Don't exit so we can show results
    });

    const gateDecision = await gate.evaluateGate();

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 FINAL SUMMARY");
    console.log("=".repeat(60));

    if (testResults.passed && gateDecision.canPromote) {
      console.log("🎉 SUCCESS: Script passed all safety checks");
      console.log("✅ Safe for production deployment");
      console.log("\nNext steps:");
      console.log("  • Deploy to production environment");
      console.log("  • Monitor initial runs for expected behavior");
      console.log("  • Keep test logs for audit trail");
    } else {
      console.log("🚫 FAILURE: Script failed safety checks");
      console.log("❌ DO NOT deploy to production");
      console.log("\nRequired actions:");

      if (!testResults.passed) {
        console.log("  • Fix idempotency issues in script");
        console.log("  • Add proper label guards");
        console.log("  • Verify state detection logic");
      }

      if (!gateDecision.canPromote) {
        console.log("  • Address promote gate failures");
        console.log("  • Re-run tests after fixes");
      }

      console.log("  • Do not proceed with deployment");
    }

    console.log("=".repeat(60));

    // Exit with appropriate code
    const success = testResults.passed && gateDecision.canPromote;
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("\n💥 Test execution failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// CLI integration
if (require.main === module) {
  console.log("ProofKit Ads Script - Idempotency Test Runner");
  console.log("Critical P0-1 safety validation for production deployment\n");

  runIdempotencyTest();
}

module.exports = {
  runIdempotencyTest,
  mockMainFunction,
};

/*
Usage:

1. Direct execution:
   node run-idempotency-test.js

2. CI/CD Integration:
   - name: Run Idempotency Tests
     run: |
       cd ads-script
       node run-idempotency-test.js
       
3. Package.json script:
   "scripts": {
     "test:idempotency": "node run-idempotency-test.js",
     "prerelease": "npm run test:idempotency"
   }
*/
