/**
 * RSA Test Queue API Routes
 * PRO tier feature for automated RSA A/B testing
 */

import express from 'express';

const router = express.Router();

// HMAC verification function (imported from parent scope)
let verify;

// Initialize routes with HMAC verification
export function initializeRSATestQueueRoutes(hmacVerify) {
  verify = hmacVerify;
  return router;
}

// Get active tests
router.get("/test-queue", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:test_queue`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { default: rsaTestQueue } = await import("../services/rsa-test-queue.js");

    const options = {
      status: req.query.status,
      campaignName: req.query.campaign_name,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const tests = await rsaTestQueue.getTests(tenant, options);
    const activeTests = await rsaTestQueue.getActiveTests(tenant);
    const metrics = rsaTestQueue.getMetrics();

    res.json({
      ok: true,
      tests,
      active_tests: activeTests.length,
      summary: {
        total_tests: tests.length,
        active_tests: activeTests.length,
        success_rate: metrics.successRate,
        avg_duration: metrics.averageTestDuration
      },
      metrics
    });
  } catch (error) {
    console.error("Test queue fetch error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch test queue",
      code: "TEST_QUEUE_FETCH_FAILED"
    });
  }
});

// Start new RSA test
router.post("/test-queue/start", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:test_queue_start:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { default: rsaTestQueue } = await import("../services/rsa-test-queue.js");

    const testConfig = req.body;
    if (!testConfig.campaignName || !testConfig.adGroupName) {
      return res.status(400).json({
        ok: false,
        error: "campaignName and adGroupName are required"
      });
    }

    if (!testConfig.variantHeadlines || !testConfig.variantDescriptions) {
      return res.status(400).json({
        ok: false,
        error: "variantHeadlines and variantDescriptions are required"
      });
    }

    const result = await rsaTestQueue.startTest(tenant, testConfig);

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Test start error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to start test",
      code: "TEST_START_FAILED"
    });
  }
});

// Conclude RSA test
router.post("/test-queue/conclude", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), testId } = req.body || {};
  const payload = `POST:${tenant}:test_queue_conclude:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  if (!testId) {
    return res.status(400).json({
      ok: false,
      error: "testId is required"
    });
  }

  try {
    const { default: rsaTestQueue } = await import("../services/rsa-test-queue.js");

    const conclusionType = req.body.conclusionType || 'MANUAL';
    const result = await rsaTestQueue.concludeTest(tenant, testId, conclusionType);

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Test conclusion error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to conclude test",
      code: "TEST_CONCLUDE_FAILED"
    });
  }
});

// Update test metrics (called by Google Ads script)
router.post("/test-queue/update-metrics", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), testId, metrics } = req.body || {};
  const payload = `POST:${tenant}:test_queue_metrics:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  if (!testId || !metrics) {
    return res.status(400).json({
      ok: false,
      error: "testId and metrics are required"
    });
  }

  try {
    const { default: rsaTestQueue } = await import("../services/rsa-test-queue.js");

    const result = await rsaTestQueue.updateTestMetrics(tenant, testId, metrics);

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Test metrics update error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to update test metrics",
      code: "TEST_METRICS_UPDATE_FAILED"
    });
  }
});

// Get test details
router.get("/test-queue/:testId", async (req, res) => {
  const { tenant, sig } = req.query;
  const { testId } = req.params;
  const payload = `GET:${tenant}:test_detail:${testId}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { default: rsaTestQueue } = await import("../services/rsa-test-queue.js");

    const test = await rsaTestQueue.getTest(tenant, testId);

    if (!test) {
      return res.status(404).json({
        ok: false,
        error: "Test not found"
      });
    }

    res.json({
      ok: true,
      test
    });
  } catch (error) {
    console.error("Test detail fetch error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch test details",
      code: "TEST_DETAIL_FETCH_FAILED"
    });
  }
});

// Get test queue health check
router.get("/test-queue/health", async (req, res) => {
  try {
    const { default: rsaTestQueue } = await import("../services/rsa-test-queue.js");

    const health = await rsaTestQueue.healthCheck();

    res.json({
      ok: true,
      ...health
    });
  } catch (error) {
    console.error("Test queue health check error:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Health check failed",
      code: "TEST_QUEUE_HEALTH_FAILED"
    });
  }
});

export default router;