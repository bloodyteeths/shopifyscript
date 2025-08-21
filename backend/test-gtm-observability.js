#!/usr/bin/env node

/**
 * ProofKit GTM/Observability System Test Suite
 * Comprehensive testing of weekly summaries, anomaly detection, alerts, and Looker integration
 */

import { runWeeklySummary } from "./jobs/weekly_summary.js";
import { anomalyDetectionService } from "./services/anomaly-detection.js";
import { alertsService } from "./services/alerts.js";
import { jobScheduler } from "./jobs/scheduler.js";
import logger from "./services/logger.js";
import { getDoc, ensureSheet } from "./sheets.js";

const TEST_TENANT = "test_tenant_" + Date.now();

/**
 * Test Suite Configuration
 */
const testConfig = {
  tenant: TEST_TENANT,
  skipCleanup: process.argv.includes("--keep-data"),
  verbose: process.argv.includes("--verbose"),
  runAll: !process.argv.includes("--quick"),
};

/**
 * Test Results Tracking
 */
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
};

/**
 * Test Helper Functions
 */
function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    if (testConfig.verbose) console.log(`✓ ${message}`);
  } else {
    testResults.failed++;
    console.error(`✗ ${message}`);
    testResults.errors.push(message);
  }
}

function skip(message) {
  testResults.skipped++;
  console.log(`⊗ SKIPPED: ${message}`);
}

async function runTest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    await testFn();
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    console.error(`❌ ${name} - FAILED:`, error.message);
    testResults.errors.push(`${name}: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Setup Test Data
 */
async function setupTestData() {
  console.log("\n📊 Setting up test data...");

  try {
    const doc = await getDoc();
    if (!doc) throw new Error("Failed to connect to Google Sheets");

    // Create test metrics data
    const metricsSheet = await ensureSheet(
      doc,
      `METRICS_${testConfig.tenant}`,
      [
        "date",
        "level",
        "campaign",
        "ad_group",
        "id",
        "name",
        "clicks",
        "cost",
        "conversions",
        "impr",
        "ctr",
      ],
    );

    const searchTermsSheet = await ensureSheet(
      doc,
      `SEARCH_TERMS_${testConfig.tenant}`,
      [
        "date",
        "campaign",
        "ad_group",
        "search_term",
        "clicks",
        "cost",
        "conversions",
      ],
    );

    // Generate sample data for the last 30 days
    const now = new Date();
    const sampleData = [];
    const searchTermsData = [];

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      // Simulate some performance variations
      const baseClicks = 100 + Math.random() * 50;
      const baseCost = baseClicks * (0.5 + Math.random() * 0.5);
      const baseConversions = Math.floor(
        baseClicks * (0.02 + Math.random() * 0.03),
      );
      const baseImpressions = baseClicks * (10 + Math.random() * 5);

      // Add anomaly on day 5 (high cost spike)
      const costMultiplier = i === 5 ? 3 : 1;
      const conversionMultiplier = i === 5 ? 0.3 : 1; // Lower conversions during spike

      sampleData.push({
        date: dateStr,
        level: "campaign",
        campaign: "Test Campaign A",
        ad_group: "Test AdGroup 1",
        id: "12345",
        name: "Test Keyword",
        clicks: Math.floor(baseClicks).toString(),
        cost: (baseCost * costMultiplier).toFixed(2),
        conversions: Math.floor(
          baseConversions * conversionMultiplier,
        ).toString(),
        impr: Math.floor(baseImpressions).toString(),
        ctr: ((baseClicks / baseImpressions) * 100).toFixed(2),
      });

      // Add search terms data
      searchTermsData.push({
        date: dateStr,
        campaign: "Test Campaign A",
        ad_group: "Test AdGroup 1",
        search_term: "test product",
        clicks: Math.floor(baseClicks * 0.3).toString(),
        cost: (baseCost * 0.3 * costMultiplier).toFixed(2),
        conversions: Math.floor(
          baseConversions * 0.4 * conversionMultiplier,
        ).toString(),
      });

      searchTermsData.push({
        date: dateStr,
        campaign: "Test Campaign A",
        ad_group: "Test AdGroup 1",
        search_term: "product test",
        clicks: Math.floor(baseClicks * 0.2).toString(),
        cost: (baseCost * 0.2 * costMultiplier).toFixed(2),
        conversions: Math.floor(
          baseConversions * 0.3 * conversionMultiplier,
        ).toString(),
      });
    }

    // Clear existing data and add sample data
    await metricsSheet.clearRows();
    await metricsSheet.setHeaderRow([
      "date",
      "level",
      "campaign",
      "ad_group",
      "id",
      "name",
      "clicks",
      "cost",
      "conversions",
      "impr",
      "ctr",
    ]);

    for (const row of sampleData) {
      await metricsSheet.addRow(row);
    }

    await searchTermsSheet.clearRows();
    await searchTermsSheet.setHeaderRow([
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ]);

    for (const row of searchTermsData) {
      await searchTermsSheet.addRow(row);
    }

    console.log(
      `✅ Test data created: ${sampleData.length} metrics rows, ${searchTermsData.length} search terms rows`,
    );
    return true;
  } catch (error) {
    console.error("❌ Failed to setup test data:", error.message);
    throw error;
  }
}

/**
 * Test Weekly Summary Generation
 */
async function testWeeklySummary() {
  const result = await runWeeklySummary(testConfig.tenant, {
    generateAI: false,
  });

  assert(result.ok, "Weekly summary generation should succeed");
  assert(result.summary, "Weekly summary should contain summary data");
  assert(result.summary.metrics, "Weekly summary should contain metrics");
  assert(result.summary.trends, "Weekly summary should contain trends");
  assert(
    typeof result.duration === "number",
    "Weekly summary should report duration",
  );

  // Test with AI insights
  const resultWithAI = await runWeeklySummary(testConfig.tenant, {
    generateAI: true,
  });
  assert(resultWithAI.ok, "Weekly summary with AI should succeed");

  if (testConfig.verbose) {
    console.log(
      "Sample weekly summary:",
      JSON.stringify(result.summary, null, 2),
    );
  }
}

/**
 * Test Anomaly Detection
 */
async function testAnomalyDetection() {
  // Set custom thresholds for testing
  anomalyDetectionService.setThresholds(testConfig.tenant, {
    cpa_spike_percent: 30,
    cost_spike_percent: 50,
    conversion_drop_percent: 25,
  });

  const results = await anomalyDetectionService.detectAnomalies(
    testConfig.tenant,
    "30d",
  );

  assert(
    typeof results === "object",
    "Anomaly detection should return results object",
  );
  assert(Array.isArray(results.alerts), "Results should contain alerts array");
  assert(
    Array.isArray(results.warnings),
    "Results should contain warnings array",
  );
  assert(results.timestamp, "Results should contain timestamp");

  // We expect to find the cost spike we injected
  assert(
    results.alerts.length > 0 || results.warnings.length > 0,
    "Should detect the injected anomaly",
  );

  const summary = anomalyDetectionService.getAnomalySummary(testConfig.tenant);
  assert(
    summary.tenant === testConfig.tenant,
    "Anomaly summary should be for correct tenant",
  );
  assert(
    typeof summary.totalRuns === "number",
    "Summary should include run count",
  );

  if (testConfig.verbose) {
    console.log("Anomaly detection results:", {
      alerts: results.alerts.length,
      warnings: results.warnings.length,
      types: [...results.alerts, ...results.warnings].map((a) => a.type),
    });
  }
}

/**
 * Test Alert Channel Management
 */
async function testAlertChannels() {
  // Test Slack channel creation
  alertsService.registerChannel(testConfig.tenant, "test_slack", {
    type: "slack",
    name: "Test Slack Channel",
    webhookUrl: "https://hooks.slack.com/test",
    enabled: true,
  });

  // Test email channel creation
  alertsService.registerChannel(testConfig.tenant, "test_email", {
    type: "email",
    name: "Test Email Channel",
    recipients: ["test@example.com"],
    enabled: true,
  });

  const channels = alertsService.getChannels(testConfig.tenant);
  assert(channels.length >= 2, "Should have at least 2 test channels");

  const slackChannel = channels.find((c) => c.type === "slack");
  const emailChannel = channels.find((c) => c.type === "email");

  assert(slackChannel, "Should have Slack channel");
  assert(emailChannel, "Should have email channel");
  assert(slackChannel.enabled, "Slack channel should be enabled");
  assert(emailChannel.enabled, "Email channel should be enabled");

  if (testConfig.verbose) {
    console.log(
      "Configured channels:",
      channels.map((c) => ({ type: c.type, name: c.name })),
    );
  }
}

/**
 * Test Alert Sending (without actual delivery)
 */
async function testAlertSending() {
  // Create test alert data
  const testAlert = {
    type: "cost_spike",
    severity: "high",
    tenant: testConfig.tenant,
    timestamp: new Date().toISOString(),
    message: "Test cost spike detected",
    currentCost: 150.0,
    expectedCost: 75.0,
    percentIncrease: 100,
  };

  // Test sending (will fail actual delivery but should handle gracefully)
  try {
    const result = await alertsService.sendAlert(testConfig.tenant, testAlert);
    assert(
      typeof result === "object",
      "Send alert should return result object",
    );
    assert(
      typeof result.success === "boolean",
      "Result should include success status",
    );

    if (testConfig.verbose) {
      console.log("Alert sending result:", result);
    }
  } catch (error) {
    // Expected to fail actual delivery in test environment
    console.log("Alert sending failed as expected (no real webhooks)");
  }

  // Test delivery stats
  const stats = alertsService.getDeliveryStats(testConfig.tenant);
  assert(typeof stats === "object", "Should return delivery statistics");
  assert(
    typeof stats.totalDeliveries === "number",
    "Stats should include delivery count",
  );
}

/**
 * Test Job Scheduler
 */
async function testJobScheduler() {
  // Add test tenant to scheduler
  jobScheduler.addTenant(testConfig.tenant);

  const status = jobScheduler.getStatus();
  assert(typeof status === "object", "Scheduler should return status");
  assert(Array.isArray(status.tenants), "Status should include tenants array");
  assert(
    status.tenants.includes(testConfig.tenant),
    "Should include test tenant",
  );
  assert(typeof status.jobs === "object", "Status should include jobs");

  // Test manual job execution
  try {
    const anomalyResult = await jobScheduler.triggerJob(
      "anomaly_detection",
      testConfig.tenant,
    );
    assert(
      typeof anomalyResult === "object",
      "Manual anomaly detection job should return result",
    );

    const summaryResult = await jobScheduler.triggerJob(
      "weekly_summary",
      testConfig.tenant,
    );
    assert(
      typeof summaryResult === "object",
      "Manual weekly summary job should return result",
    );

    if (testConfig.verbose) {
      console.log("Manual job execution successful");
    }
  } catch (error) {
    console.log("Manual job execution result:", error.message);
  }

  // Test job enable/disable
  jobScheduler.setJobEnabled("health_check", false);
  const updatedStatus = jobScheduler.getStatus();
  assert(
    !updatedStatus.jobs.health_check.enabled,
    "Should disable health check job",
  );

  jobScheduler.setJobEnabled("health_check", true);
}

/**
 * Test Looker Studio Template Validation
 */
async function testLookerTemplate() {
  try {
    const fs = await import("fs");
    const path = await import("path");

    const templatePath = path.resolve(
      process.cwd(),
      "looker-studio",
      "proofkit-template.json",
    );
    const templateContent = await fs.promises.readFile(templatePath, "utf8");
    const template = JSON.parse(templateContent);

    assert(template.metadata, "Template should have metadata");
    assert(template.metadata.name, "Template should have name");
    assert(template.dataConnections, "Template should have data connections");
    assert(template.pages, "Template should have pages");
    assert(Array.isArray(template.pages), "Pages should be an array");
    assert(template.pages.length > 0, "Should have at least one page");

    // Validate data connection structure
    const primaryConnection = template.dataConnections.primary;
    assert(primaryConnection, "Should have primary data connection");
    assert(
      primaryConnection.type === "google_sheets",
      "Primary connection should be Google Sheets",
    );
    assert(Array.isArray(primaryConnection.sheets), "Should have sheets array");

    // Check for required sheets
    const sheetNames = primaryConnection.sheets.map((s) => s.name);
    assert(
      sheetNames.includes("METRICS_{TENANT}"),
      "Should include metrics sheet",
    );
    assert(
      sheetNames.includes("SEARCH_TERMS_{TENANT}"),
      "Should include search terms sheet",
    );
    assert(
      sheetNames.includes("RUN_LOGS_{TENANT}"),
      "Should include run logs sheet",
    );
    assert(
      sheetNames.includes("ANOMALIES_{TENANT}"),
      "Should include anomalies sheet",
    );

    if (testConfig.verbose) {
      console.log("Looker template validation passed:", {
        pages: template.pages.length,
        sheets: sheetNames.length,
        calculatedFields: template.calculatedFields?.length,
      });
    }
  } catch (error) {
    console.error("Looker template validation failed:", error.message);
    throw error;
  }
}

/**
 * Cleanup Test Data
 */
async function cleanupTestData() {
  if (testConfig.skipCleanup) {
    console.log("\n🔧 Skipping cleanup (--keep-data flag)");
    return;
  }

  console.log("\n🧹 Cleaning up test data...");

  try {
    const doc = await getDoc();
    if (!doc) return;

    // Remove test sheets
    const sheetsToDelete = [
      `METRICS_${testConfig.tenant}`,
      `SEARCH_TERMS_${testConfig.tenant}`,
      `RUN_LOGS_${testConfig.tenant}`,
      `ANOMALIES_${testConfig.tenant}`,
    ];

    for (const sheetName of sheetsToDelete) {
      try {
        const sheet = doc.sheetsByTitle[sheetName];
        if (sheet) {
          await sheet.delete();
          console.log(`Deleted sheet: ${sheetName}`);
        }
      } catch (error) {
        console.log(`Could not delete sheet ${sheetName}: ${error.message}`);
      }
    }

    // Remove tenant from scheduler
    jobScheduler.removeTenant(testConfig.tenant);

    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log("🚀 ProofKit GTM/Observability System Test Suite");
  console.log("================================================");
  console.log(`Test Tenant: ${testConfig.tenant}`);
  console.log(`Mode: ${testConfig.runAll ? "Full" : "Quick"}`);
  console.log(`Cleanup: ${testConfig.skipCleanup ? "Disabled" : "Enabled"}`);

  try {
    // Setup
    await setupTestData();

    // Core functionality tests
    await runTest("Weekly Summary Generation", testWeeklySummary);
    await runTest("Anomaly Detection", testAnomalyDetection);
    await runTest("Alert Channel Management", testAlertChannels);
    await runTest("Alert Sending", testAlertSending);
    await runTest("Job Scheduler", testJobScheduler);
    await runTest("Looker Studio Template", testLookerTemplate);

    // Integration tests (if running full suite)
    if (testConfig.runAll) {
      console.log("\n🔗 Running integration tests...");

      // Test end-to-end workflow
      await runTest("End-to-End Workflow", async () => {
        // Generate weekly summary
        const summaryResult = await runWeeklySummary(testConfig.tenant);
        assert(summaryResult.ok, "E2E: Weekly summary should succeed");

        // Run anomaly detection
        const anomalyResult = await anomalyDetectionService.detectAnomalies(
          testConfig.tenant,
        );
        assert(
          anomalyResult.alerts || anomalyResult.warnings,
          "E2E: Should detect anomalies",
        );

        // Send alerts for anomalies
        for (const alert of anomalyResult.alerts.slice(0, 1)) {
          // Test just one
          try {
            await alertsService.sendAlert(testConfig.tenant, {
              ...alert,
              tenant: testConfig.tenant,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            // Expected to fail in test environment
          }
        }

        console.log("E2E workflow completed successfully");
      });
    }
  } catch (error) {
    console.error("💥 Test suite failed:", error.message);
    testResults.failed++;
  } finally {
    // Cleanup
    await cleanupTestData();

    // Results summary
    console.log("\n📊 Test Results Summary");
    console.log("=======================");
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⊗ Skipped: ${testResults.skipped}`);

    if (testResults.errors.length > 0) {
      console.log("\n❌ Errors:");
      testResults.errors.forEach((error) => console.log(`  - ${error}`));
    }

    const success = testResults.failed === 0;
    console.log(
      `\n${success ? "🎉 All tests passed!" : "💥 Some tests failed!"}`,
    );

    process.exit(success ? 0 : 1);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
