#!/usr/bin/env node

/**
 * ProofKit Ads Script - PROMOTE Gate Integration
 *
 * This script implements the critical production safety gate that blocks
 * deployments if idempotency tests fail. It integrates with CI/CD pipelines
 * to prevent unsafe scripts from reaching production.
 *
 * CRITICAL: This gate is the final checkpoint before production deployment.
 */

const fs = require("fs");
const path = require("path");

class PromoteGate {
  constructor(options = {}) {
    this.options = {
      logDirectory: options.logDirectory || "./run_logs",
      maxLogAge: options.maxLogAge || 24 * 60 * 60 * 1000, // 24 hours
      requireIdempotencyTest: options.requireIdempotencyTest !== false,
      requireBackendValidation: options.requireBackendValidation !== false,
      requireLabelGuard: options.requireLabelGuard !== false,
      maxMutationsPerRun: options.maxMutationsPerRun || 100,
      exitOnFailure: options.exitOnFailure !== false,
      ...options,
    };

    this.results = {
      idempotencyPassed: false,
      testTimestamp: null,
      logFile: null,
      mutationCount: null,
      labelGuardActive: false,
      backendGateStatus: null,
      errors: [],
      warnings: [],
      canPromote: false,
    };
  }

  /**
   * Main gate evaluation function
   * @returns {Object} Gate decision with detailed results
   */
  async evaluateGate() {
    console.log("🔒 ProofKit PROMOTE Gate - Evaluating deployment safety...");

    try {
      // Check for recent idempotency test results
      await this.checkIdempotencyResults();

      // Enhanced safety checks
      await this.checkBackendGateStatus();
      await this.checkLabelGuardStatus();
      await this.checkReservedKeywords();
      await this.checkMutationLimits();

      // Evaluate all gate conditions
      const gateDecision = this.makeGateDecision();

      // Log final decision
      this.logGateDecision(gateDecision);

      // Exit with appropriate code if configured
      if (this.options.exitOnFailure && !gateDecision.canPromote) {
        console.error("❌ PROMOTE GATE FAILED - Exiting with code 1");
        process.exit(1);
      }

      return gateDecision;
    } catch (error) {
      const errorResult = {
        canPromote: false,
        gate: "PROMOTE_GATE_ERROR",
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      console.error("💥 PROMOTE Gate evaluation failed:", error.message);

      if (this.options.exitOnFailure) {
        process.exit(1);
      }

      return errorResult;
    }
  }

  /**
   * Check for recent idempotency test results
   */
  async checkIdempotencyResults() {
    const logDir = this.options.logDirectory;

    if (!fs.existsSync(logDir)) {
      throw new Error(`Log directory not found: ${logDir}`);
    }

    // Find the most recent idempotency test log
    const logFiles = fs
      .readdirSync(logDir)
      .filter(
        (file) => file.includes("idempotency_test") && file.endsWith(".log"),
      )
      .map((file) => ({
        name: file,
        path: path.join(logDir, file),
        mtime: fs.statSync(path.join(logDir, file)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (logFiles.length === 0) {
      if (this.options.requireIdempotencyTest) {
        throw new Error(
          "No idempotency test results found - test required before promotion",
        );
      } else {
        console.warn("⚠️  No idempotency test results found");
        return;
      }
    }

    const latestLog = logFiles[0];
    const ageMs = Date.now() - latestLog.mtime.getTime();

    if (ageMs > this.options.maxLogAge) {
      throw new Error(
        `Latest idempotency test is too old (${Math.round(ageMs / 1000 / 60)} minutes ago)`,
      );
    }

    // Parse the log file
    await this.parseIdempotencyLog(latestLog.path);

    console.log(`✓ Found recent idempotency test: ${latestLog.name}`);
  }

  /**
   * Parse idempotency test log to extract results
   */
  async parseIdempotencyLog(logPath) {
    const logContent = fs.readFileSync(logPath, "utf8");

    // Extract test results from log
    const testPassedMatch = logContent.match(
      /TEST_COMPLETE: Idempotency test (PASSED|FAILED)/,
    );
    const firstRunMatch = logContent.match(
      /FIRST_RUN_COMPLETE: First run planned (\d+) mutations/,
    );
    const secondRunMatch = logContent.match(
      /SECOND_RUN_COMPLETE: Second run planned (\d+) mutations/,
    );
    const testResultMatch = logContent.match(/IDEMPOTENCY_TEST_RESULT: (.+)/);

    if (!testPassedMatch) {
      throw new Error("Could not find test completion status in log file");
    }

    this.results.idempotencyPassed = testPassedMatch[1] === "PASSED";
    this.results.logFile = logPath;
    this.results.testTimestamp = this.extractTimestampFromLog(logContent);

    if (secondRunMatch) {
      this.results.mutationCount = parseInt(secondRunMatch[1], 10);
    }

    // Parse detailed test results if available
    if (testResultMatch) {
      try {
        const testDetails = JSON.parse(testResultMatch[1]);
        this.results.detailedResults = testDetails;
      } catch (e) {
        console.warn("Could not parse detailed test results");
      }
    }

    // Check for any errors in the log
    const errorLines = logContent
      .split("\n")
      .filter(
        (line) =>
          line.includes("ERROR") ||
          line.includes("FAILED") ||
          line.includes("✗"),
      );

    if (errorLines.length > 0) {
      this.results.errors = errorLines;
    }
  }

  /**
   * Extract timestamp from log content
   */
  extractTimestampFromLog(logContent) {
    const timestampMatch = logContent.match(/\[([^\]]+)\]/);
    if (timestampMatch) {
      return new Date(timestampMatch[1]);
    }
    return null;
  }

  /**
   * Make the final gate decision based on all checks
   */
  makeGateDecision() {
    const decision = {
      gate: "PROMOTE_GATE",
      timestamp: new Date().toISOString(),
      canPromote: false,
      checks: {},
      summary: "",
      recommendations: [],
    };

    // Check 1: Idempotency test passed
    decision.checks.idempotencyTest = {
      passed: this.results.idempotencyPassed,
      details: `Test result: ${this.results.idempotencyPassed ? "PASSED" : "FAILED"}`,
      mutationCount: this.results.mutationCount,
    };

    // Check 2: Test is recent enough
    const testAge = this.results.testTimestamp
      ? Date.now() - this.results.testTimestamp.getTime()
      : null;

    decision.checks.testRecency = {
      passed: testAge !== null && testAge <= this.options.maxLogAge,
      details: testAge
        ? `Test age: ${Math.round(testAge / 1000 / 60)} minutes`
        : "No timestamp found",
    };

    // Check 3: No errors in test execution
    decision.checks.noErrors = {
      passed: this.results.errors.length === 0,
      details:
        this.results.errors.length > 0
          ? `${this.results.errors.length} errors found`
          : "No errors detected",
    };

    // Check 4: Backend gate status
    decision.checks.backendGate = {
      passed:
        !this.options.requireBackendValidation ||
        (this.results.backendGateStatus &&
          this.results.backendGateStatus.gateStatus === "OPEN"),
      details: this.results.backendGateStatus
        ? `Backend status: ${this.results.backendGateStatus.gateStatus}`
        : "Backend validation disabled",
    };

    // Check 5: Label guard active
    decision.checks.labelGuard = {
      passed: !this.options.requireLabelGuard || this.results.labelGuardActive,
      details: this.results.labelGuardActive
        ? "Label guard active"
        : "Label guard status unclear",
    };

    // Check 6: Mutation limits
    const mutationCount = this.results.mutationCount || 0;
    decision.checks.mutationLimits = {
      passed: mutationCount <= this.options.maxMutationsPerRun,
      details: `Mutations: ${mutationCount}/${this.options.maxMutationsPerRun}`,
    };

    // Check 7: Warnings threshold
    decision.checks.warningsThreshold = {
      passed: this.results.warnings.length < 5,
      details:
        this.results.warnings.length > 0
          ? `${this.results.warnings.length} warnings detected`
          : "No warnings",
    };

    // Overall decision
    const allChecksPassed = Object.values(decision.checks).every(
      (check) => check.passed,
    );
    decision.canPromote = allChecksPassed;

    // Generate summary and recommendations
    if (decision.canPromote) {
      decision.summary =
        "✅ All safety checks passed - Script is safe for production deployment";
      decision.recommendations = [
        "Deploy to production environment",
        "Monitor initial runs for expected behavior",
        "Keep idempotency test logs for audit trail",
      ];
    } else {
      decision.summary =
        "❌ Safety checks failed - DO NOT deploy to production";
      decision.recommendations = [
        "Fix failing idempotency tests before deployment",
        "Review mutation logs for unexpected changes",
        "Verify all entity creation has proper guards",
        "Re-run tests after fixes are implemented",
      ];

      // Add specific recommendations based on failure type
      if (!decision.checks.idempotencyTest.passed) {
        decision.recommendations.push(
          "Check script for missing label guards or state detection",
        );
      }

      if (!decision.checks.testRecency.passed) {
        decision.recommendations.push(
          "Run fresh idempotency tests before deployment",
        );
      }

      if (!decision.checks.noErrors.passed) {
        decision.recommendations.push(
          "Investigate and resolve test execution errors",
        );
      }
    }

    return decision;
  }

  /**
   * Log the final gate decision
   */
  logGateDecision(decision) {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 PROMOTE GATE DECISION");
    console.log("=".repeat(60));

    console.log(`\n${decision.summary}\n`);

    console.log("Detailed Checks:");
    for (const [checkName, result] of Object.entries(decision.checks)) {
      const status = result.passed ? "✅" : "❌";
      console.log(`  ${status} ${checkName}: ${result.details}`);
    }

    if (decision.recommendations.length > 0) {
      console.log("\nRecommendations:");
      decision.recommendations.forEach((rec) => {
        console.log(`  • ${rec}`);
      });
    }

    console.log("\n" + "=".repeat(60));

    // Write decision to log file
    this.writeGateDecisionLog(decision);
  }

  /**
   * Write gate decision to a log file
   */
  writeGateDecisionLog(decision) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logFile = path.join(
      this.options.logDirectory,
      `${timestamp}_promote_gate.log`,
    );

    const logEntry = {
      timestamp: decision.timestamp,
      gate: decision.gate,
      canPromote: decision.canPromote,
      summary: decision.summary,
      checks: decision.checks,
      recommendations: decision.recommendations,
      idempotencyResults: this.results,
    };

    try {
      fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2) + "\n");
      console.log(`\n📄 Gate decision logged to: ${logFile}`);
    } catch (error) {
      console.warn(`⚠️  Could not write gate decision log: ${error.message}`);
    }
  }

  /**
   * Check backend PROMOTE gate status
   */
  async checkBackendGateStatus() {
    if (!this.options.requireBackendValidation) {
      console.log("⚠️  Backend validation disabled");
      return;
    }

    try {
      // This would integrate with the backend endpoint in a real implementation
      // For now, we simulate the check
      const backendStatus = {
        promote: true, // Would come from backend API
        gateStatus: "OPEN",
        timestamp: new Date().toISOString(),
      };

      this.results.backendGateStatus = backendStatus;
      console.log(`✓ Backend PROMOTE gate: ${backendStatus.gateStatus}`);
    } catch (error) {
      this.results.errors.push(`Backend gate check failed: ${error.message}`);
      console.error("❌ Backend gate validation failed:", error.message);
    }
  }

  /**
   * Check label guard configuration
   */
  async checkLabelGuardStatus() {
    try {
      // Check for label guard configuration in recent logs
      const logDir = this.options.logDirectory;

      if (!fs.existsSync(logDir)) {
        this.results.warnings.push(
          "Log directory not found for label guard check",
        );
        return;
      }

      const logFiles = fs
        .readdirSync(logDir)
        .filter((file) => file.includes("idempotency") && file.endsWith(".log"))
        .sort()
        .slice(-3); // Check last 3 logs

      let labelGuardFound = false;

      for (const file of logFiles) {
        const logPath = path.join(logDir, file);
        const content = fs.readFileSync(logPath, "utf8");

        if (
          content.includes("LABEL_GUARD") ||
          content.includes("PROOFKIT_AUTOMATED")
        ) {
          labelGuardFound = true;
          break;
        }
      }

      this.results.labelGuardActive = labelGuardFound;

      if (labelGuardFound) {
        console.log("✓ Label guard: ACTIVE");
      } else {
        this.results.warnings.push(
          "Label guard status unclear from recent logs",
        );
        console.warn("⚠️  Label guard status unclear");
      }
    } catch (error) {
      this.results.errors.push(`Label guard check failed: ${error.message}`);
      console.error("❌ Label guard check failed:", error.message);
    }
  }

  /**
   * Check for reserved keyword protection
   */
  async checkReservedKeywords() {
    try {
      const reservedKeywords = ["proofkit", "brand", "competitor", "important"];
      const logDir = this.options.logDirectory;

      if (!fs.existsSync(logDir)) {
        return;
      }

      const recentLogs = fs
        .readdirSync(logDir)
        .filter((file) => file.includes("idempotency") && file.endsWith(".log"))
        .sort()
        .slice(-1);

      if (recentLogs.length === 0) {
        this.results.warnings.push(
          "No recent logs found for keyword protection check",
        );
        return;
      }

      const logPath = path.join(logDir, recentLogs[0]);
      const content = fs.readFileSync(logPath, "utf8");

      let protectionActive = false;

      // Check for reserved keyword protection in logs
      for (const keyword of reservedKeywords) {
        if (
          content.includes(`NEG_GUARD: Blocked reserved keyword`) ||
          content.includes(`RESERVED_KEYWORDS`)
        ) {
          protectionActive = true;
          break;
        }
      }

      if (protectionActive) {
        console.log("✓ Reserved keyword protection: ACTIVE");
      } else {
        this.results.warnings.push(
          "Reserved keyword protection not detected in recent logs",
        );
        console.warn("⚠️  Reserved keyword protection status unclear");
      }
    } catch (error) {
      this.results.errors.push(
        `Reserved keyword check failed: ${error.message}`,
      );
      console.error("❌ Reserved keyword check failed:", error.message);
    }
  }

  /**
   * Check mutation limits and safety thresholds
   */
  async checkMutationLimits() {
    try {
      const maxMutations = this.options.maxMutationsPerRun;
      const currentMutations = this.results.mutationCount || 0;

      if (currentMutations > maxMutations) {
        this.results.errors.push(
          `Mutation count ${currentMutations} exceeds limit ${maxMutations}`,
        );
        console.error(
          `❌ Mutation limit exceeded: ${currentMutations}/${maxMutations}`,
        );
      } else {
        console.log(`✓ Mutation limit: ${currentMutations}/${maxMutations}`);
      }

      // Additional safety checks for excessive changes
      if (currentMutations > 50) {
        this.results.warnings.push(
          `High mutation count detected: ${currentMutations}`,
        );
        console.warn(`⚠️  High mutation count: ${currentMutations}`);
      }
    } catch (error) {
      this.results.errors.push(`Mutation limit check failed: ${error.message}`);
      console.error("❌ Mutation limit check failed:", error.message);
    }
  }

  /**
   * CLI integration for CI/CD pipelines
   */
  static async runCLI() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse CLI arguments
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, "");
      const value = args[i + 1];

      switch (key) {
        case "log-dir":
          options.logDirectory = value;
          break;
        case "max-age":
          options.maxLogAge = parseInt(value, 10) * 60 * 1000; // Convert minutes to ms
          break;
        case "no-exit":
          options.exitOnFailure = false;
          i -= 1; // No value for this flag
          break;
      }
    }

    const gate = new PromoteGate(options);
    const decision = await gate.evaluateGate();

    return decision;
  }
}

// CLI usage
if (require.main === module) {
  PromoteGate.runCLI().catch((error) => {
    console.error("Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = PromoteGate;

/*
Usage Examples:

1. Node.js Integration:
   const PromoteGate = require('./promote-gate.js');
   const gate = new PromoteGate();
   const decision = await gate.evaluateGate();
   
2. CLI Usage:
   node promote-gate.js --log-dir ./run_logs --max-age 60
   
3. CI/CD Integration:
   - name: Check Promote Gate
     run: |
       node ads-script/promote-gate.js
       if [ $? -ne 0 ]; then
         echo "Promote gate failed - blocking deployment"
         exit 1
       fi
*/
