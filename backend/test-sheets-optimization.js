/**
 * Google Sheets Optimization Test Suite
 * Tests all optimization components: connection pooling, batching, caching, and invalidation
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

// Import optimized components
import sheetsPool from "./services/sheets-pool.js";
import sheetsBatch from "./services/sheets-batch.js";
import tenantCache from "./services/cache.js";
import cacheInvalidation from "./services/cache-invalidation.js";
import tenantRegistry from "./services/tenant-registry.js";
import optimizedSheets from "./services/sheets.js";
import { sheets } from "./sheets.js";

class SheetsOptimizationTester {
  constructor() {
    this.testResults = {
      connectionPool: { passed: 0, failed: 0, errors: [] },
      batching: { passed: 0, failed: 0, errors: [] },
      caching: { passed: 0, failed: 0, errors: [] },
      invalidation: { passed: 0, failed: 0, errors: [] },
      integration: { passed: 0, failed: 0, errors: [] },
    };

    this.testTenantId = "test-tenant";
    this.testSheetTitle = "optimization-test";
  }

  /**
   * Run all optimization tests
   */
  async runAllTests() {
    console.log("🚀 Starting Google Sheets Optimization Test Suite\n");

    try {
      // Initialize tenant registry
      await this.initializeTenant();

      // Run test suites
      await this.testConnectionPool();
      await this.testBatchOperations();
      await this.testCaching();
      await this.testCacheInvalidation();
      await this.testIntegration();

      // Performance benchmark
      await this.performanceBenchmark();

      // Display results
      this.displayResults();
    } catch (error) {
      console.error("❌ Test suite failed:", error.message);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  /**
   * Initialize test tenant
   */
  async initializeTenant() {
    console.log("📋 Initializing test tenant...");

    try {
      await tenantRegistry.initialize();

      // Add test tenant if not exists
      if (!tenantRegistry.getTenant(this.testTenantId)) {
        const sheetId = process.env.SHEET_ID || "test-sheet-id";
        tenantRegistry.addTenant(this.testTenantId, {
          sheetId,
          name: "Test Tenant",
          plan: "enterprise",
          enabled: true,
        });
      }

      console.log("✅ Test tenant initialized\n");
    } catch (error) {
      console.error("❌ Failed to initialize test tenant:", error.message);
      throw error;
    }
  }

  /**
   * Test connection pool functionality
   */
  async testConnectionPool() {
    console.log("🔌 Testing Connection Pool...");

    try {
      // Test 1: Basic connection
      try {
        const tenant = tenantRegistry.getTenant(this.testTenantId);
        const connection = await sheetsPool.getConnection(
          this.testTenantId,
          tenant.sheetId,
        );

        if (connection && connection.doc) {
          this.recordTest(
            "connectionPool",
            true,
            "Basic connection successful",
          );
          connection.release();
        } else {
          this.recordTest("connectionPool", false, "Failed to get connection");
        }
      } catch (error) {
        this.recordTest(
          "connectionPool",
          false,
          `Connection error: ${error.message}`,
        );
      }

      // Test 2: Connection reuse
      try {
        const tenant = tenantRegistry.getTenant(this.testTenantId);
        const conn1 = await sheetsPool.getConnection(
          this.testTenantId,
          tenant.sheetId,
        );
        conn1.release();

        const conn2 = await sheetsPool.getConnection(
          this.testTenantId,
          tenant.sheetId,
        );
        conn2.release();

        const stats = sheetsPool.getStats();

        if (stats.metrics.poolHits > 0) {
          this.recordTest(
            "connectionPool",
            true,
            `Connection reuse working (${stats.metrics.poolHits} hits)`,
          );
        } else {
          this.recordTest(
            "connectionPool",
            false,
            "Connection reuse not working",
          );
        }
      } catch (error) {
        this.recordTest(
          "connectionPool",
          false,
          `Reuse test error: ${error.message}`,
        );
      }

      // Test 3: Rate limiting check
      try {
        const rateLimit = sheetsPool.getTenantRateLimit(this.testTenantId);

        if (rateLimit.limit > 0 && rateLimit.remaining >= 0) {
          this.recordTest(
            "connectionPool",
            true,
            `Rate limiting configured (${rateLimit.remaining}/${rateLimit.limit})`,
          );
        } else {
          this.recordTest(
            "connectionPool",
            false,
            "Rate limiting not configured",
          );
        }
      } catch (error) {
        this.recordTest(
          "connectionPool",
          false,
          `Rate limit test error: ${error.message}`,
        );
      }

      console.log("✅ Connection Pool tests completed\n");
    } catch (error) {
      console.error("❌ Connection Pool test suite failed:", error.message);
    }
  }

  /**
   * Test batch operations
   */
  async testBatchOperations() {
    console.log("📦 Testing Batch Operations...");

    try {
      // Test 1: Batch queuing
      try {
        const testData = {
          timestamp: new Date().toISOString(),
          test: "batch-test-1",
        };
        const tenant = tenantRegistry.getTenant(this.testTenantId);

        const result = await sheetsBatch.queueOperation(
          this.testTenantId,
          tenant.sheetId,
          {
            type: "addRow",
            params: {
              sheetTitle: this.testSheetTitle,
              row: testData,
            },
          },
        );

        if (result) {
          this.recordTest(
            "batching",
            true,
            "Batch operation queued successfully",
          );
        } else {
          this.recordTest("batching", false, "Batch operation failed");
        }
      } catch (error) {
        this.recordTest(
          "batching",
          false,
          `Batch queue error: ${error.message}`,
        );
      }

      // Test 2: Multiple operations batching
      try {
        const operations = [];
        const tenant = tenantRegistry.getTenant(this.testTenantId);

        for (let i = 0; i < 5; i++) {
          operations.push(
            sheetsBatch.queueOperation(this.testTenantId, tenant.sheetId, {
              type: "addRow",
              params: {
                sheetTitle: this.testSheetTitle,
                row: {
                  timestamp: new Date().toISOString(),
                  test: `batch-test-${i}`,
                },
              },
            }),
          );
        }

        const results = await Promise.all(operations);
        const successCount = results.filter((r) => r).length;

        if (successCount === 5) {
          this.recordTest(
            "batching",
            true,
            `Multiple operations batched (${successCount}/5)`,
          );
        } else {
          this.recordTest(
            "batching",
            false,
            `Batch operations partially failed (${successCount}/5)`,
          );
        }
      } catch (error) {
        this.recordTest(
          "batching",
          false,
          `Multiple batch error: ${error.message}`,
        );
      }

      // Test 3: Batch statistics
      try {
        const stats = sheetsBatch.getStats();

        if (stats.metrics.batchedOperations > 0) {
          this.recordTest(
            "batching",
            true,
            `Batch statistics available (${stats.metrics.batchedOperations} ops)`,
          );
        } else {
          this.recordTest("batching", false, "No batch statistics available");
        }
      } catch (error) {
        this.recordTest(
          "batching",
          false,
          `Batch stats error: ${error.message}`,
        );
      }

      console.log("✅ Batch Operations tests completed\n");
    } catch (error) {
      console.error("❌ Batch Operations test suite failed:", error.message);
    }
  }

  /**
   * Test caching functionality
   */
  async testCaching() {
    console.log("💾 Testing Caching...");

    try {
      // Test 1: Basic cache operations
      try {
        const testData = { test: "cache-data", timestamp: Date.now() };
        const cacheKey = tenantCache.set(
          this.testTenantId,
          "/test/cache",
          {},
          testData,
        );

        if (cacheKey) {
          this.recordTest("caching", true, "Cache set operation successful");
        } else {
          this.recordTest("caching", false, "Cache set operation failed");
        }

        const retrieved = tenantCache.get(this.testTenantId, "/test/cache", {});

        if (retrieved && retrieved.test === testData.test) {
          this.recordTest("caching", true, "Cache get operation successful");
        } else {
          this.recordTest("caching", false, "Cache get operation failed");
        }
      } catch (error) {
        this.recordTest(
          "caching",
          false,
          `Basic cache error: ${error.message}`,
        );
      }

      // Test 2: Tenant isolation
      try {
        const testData1 = { tenant: "tenant1", data: "test1" };
        const testData2 = { tenant: "tenant2", data: "test2" };

        tenantCache.set("tenant1", "/test/isolation", {}, testData1);
        tenantCache.set("tenant2", "/test/isolation", {}, testData2);

        const result1 = tenantCache.get("tenant1", "/test/isolation", {});
        const result2 = tenantCache.get("tenant2", "/test/isolation", {});

        if (result1.data === "test1" && result2.data === "test2") {
          this.recordTest("caching", true, "Tenant isolation working");
        } else {
          this.recordTest("caching", false, "Tenant isolation failed");
        }
      } catch (error) {
        this.recordTest(
          "caching",
          false,
          `Tenant isolation error: ${error.message}`,
        );
      }

      // Test 3: Cache statistics
      try {
        const stats = tenantCache.getGlobalStats();

        if (stats.totalSize > 0 && stats.hitRate >= 0) {
          this.recordTest(
            "caching",
            true,
            `Cache statistics available (${stats.totalSize} entries, ${stats.hitRate}% hit rate)`,
          );
        } else {
          this.recordTest("caching", false, "Cache statistics not available");
        }
      } catch (error) {
        this.recordTest(
          "caching",
          false,
          `Cache stats error: ${error.message}`,
        );
      }

      console.log("✅ Caching tests completed\n");
    } catch (error) {
      console.error("❌ Caching test suite failed:", error.message);
    }
  }

  /**
   * Test cache invalidation
   */
  async testCacheInvalidation() {
    console.log("🗑️ Testing Cache Invalidation...");

    try {
      // Test 1: Direct invalidation
      try {
        const testData = { test: "invalidation-test", timestamp: Date.now() };
        tenantCache.set(this.testTenantId, "/test/invalidation", {}, testData);

        const beforeInvalidation = tenantCache.get(
          this.testTenantId,
          "/test/invalidation",
          {},
        );

        cacheInvalidation.invalidate(this.testTenantId, {
          path: "/test/invalidation",
          params: {},
        });

        const afterInvalidation = tenantCache.get(
          this.testTenantId,
          "/test/invalidation",
          {},
        );

        if (beforeInvalidation && !afterInvalidation) {
          this.recordTest("invalidation", true, "Direct invalidation working");
        } else {
          this.recordTest("invalidation", false, "Direct invalidation failed");
        }
      } catch (error) {
        this.recordTest(
          "invalidation",
          false,
          `Direct invalidation error: ${error.message}`,
        );
      }

      // Test 2: Rule-based invalidation
      try {
        tenantCache.set(
          this.testTenantId,
          "/api/insights",
          {},
          { data: "test" },
        );
        tenantCache.set(
          this.testTenantId,
          "/api/summary",
          {},
          { data: "test" },
        );

        cacheInvalidation.invalidateByRule("sheet:write", this.testTenantId, {
          sheetTitle: this.testSheetTitle,
        });

        const insights = tenantCache.get(
          this.testTenantId,
          "/api/insights",
          {},
        );
        const summary = tenantCache.get(this.testTenantId, "/api/summary", {});

        if (!insights && !summary) {
          this.recordTest(
            "invalidation",
            true,
            "Rule-based invalidation working",
          );
        } else {
          this.recordTest(
            "invalidation",
            false,
            "Rule-based invalidation failed",
          );
        }
      } catch (error) {
        this.recordTest(
          "invalidation",
          false,
          `Rule-based invalidation error: ${error.message}`,
        );
      }

      // Test 3: Smart invalidation
      try {
        tenantCache.set(
          this.testTenantId,
          "/api/insights",
          {},
          { data: "test" },
        );

        cacheInvalidation.smartInvalidate(this.testTenantId, "sheet:write", {
          type: "addRow",
          sheetTitle: this.testSheetTitle,
        });

        const invalidated = !tenantCache.get(
          this.testTenantId,
          "/api/insights",
          {},
        );

        if (invalidated) {
          this.recordTest("invalidation", true, "Smart invalidation working");
        } else {
          this.recordTest("invalidation", false, "Smart invalidation failed");
        }
      } catch (error) {
        this.recordTest(
          "invalidation",
          false,
          `Smart invalidation error: ${error.message}`,
        );
      }

      console.log("✅ Cache Invalidation tests completed\n");
    } catch (error) {
      console.error("❌ Cache Invalidation test suite failed:", error.message);
    }
  }

  /**
   * Test integration of all components
   */
  async testIntegration() {
    console.log("🔗 Testing Integration...");

    try {
      // Test 1: Complete workflow
      try {
        const testData = {
          timestamp: new Date().toISOString(),
          test: "integration-test",
          value: Math.random(),
        };

        // Add row using optimized service
        const result = await optimizedSheets.addRow(
          this.testTenantId,
          this.testSheetTitle,
          testData,
        );

        if (result) {
          this.recordTest("integration", true, "Optimized addRow successful");
        } else {
          this.recordTest("integration", false, "Optimized addRow failed");
        }

        // Get rows with caching
        const rows = await optimizedSheets.getRows(
          this.testTenantId,
          this.testSheetTitle,
          { limit: 10 },
        );

        if (rows && Array.isArray(rows)) {
          this.recordTest(
            "integration",
            true,
            `Optimized getRows successful (${rows.length} rows)`,
          );
        } else {
          this.recordTest("integration", false, "Optimized getRows failed");
        }
      } catch (error) {
        this.recordTest(
          "integration",
          false,
          `Integration workflow error: ${error.message}`,
        );
      }

      // Test 2: Legacy compatibility
      try {
        const doc = await sheets.getTenantDoc(this.testTenantId);

        if (doc && doc.doc) {
          this.recordTest(
            "integration",
            true,
            "Legacy compatibility maintained",
          );
        } else {
          this.recordTest("integration", false, "Legacy compatibility broken");
        }
      } catch (error) {
        this.recordTest(
          "integration",
          false,
          `Legacy compatibility error: ${error.message}`,
        );
      }

      // Test 3: Health check
      try {
        const health = await optimizedSheets.healthCheck(this.testTenantId);

        if (health.status === "healthy") {
          this.recordTest("integration", true, "Health check passed");
        } else {
          this.recordTest(
            "integration",
            false,
            `Health check failed: ${health.status}`,
          );
        }
      } catch (error) {
        this.recordTest(
          "integration",
          false,
          `Health check error: ${error.message}`,
        );
      }

      console.log("✅ Integration tests completed\n");
    } catch (error) {
      console.error("❌ Integration test suite failed:", error.message);
    }
  }

  /**
   * Performance benchmark
   */
  async performanceBenchmark() {
    console.log("⚡ Running Performance Benchmark...");

    try {
      const startTime = Date.now();
      const operationCount = 20;
      const operations = [];

      // Simulate concurrent operations
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          optimizedSheets.addRow(this.testTenantId, this.testSheetTitle, {
            timestamp: new Date().toISOString(),
            benchmark: `test-${i}`,
            value: Math.random(),
          }),
        );
      }

      const results = await Promise.allSettled(operations);
      const endTime = Date.now();

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const totalTime = endTime - startTime;
      const avgTime = totalTime / operationCount;

      console.log(`📊 Benchmark Results:`);
      console.log(`   Operations: ${operationCount}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average Time: ${avgTime.toFixed(2)}ms per operation`);
      console.log(
        `   Throughput: ${(operationCount / (totalTime / 1000)).toFixed(2)} ops/sec\n`,
      );
    } catch (error) {
      console.error("❌ Performance benchmark failed:", error.message);
    }
  }

  /**
   * Record test result
   */
  recordTest(category, passed, message) {
    if (passed) {
      this.testResults[category].passed++;
      console.log(`  ✅ ${message}`);
    } else {
      this.testResults[category].failed++;
      this.testResults[category].errors.push(message);
      console.log(`  ❌ ${message}`);
    }
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log("📋 Test Results Summary:");
    console.log("========================\n");

    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(this.testResults).forEach(([category, results]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      const total = results.passed + results.failed;
      const passRate =
        total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

      console.log(`${categoryName}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  📊 Pass Rate: ${passRate}%`);

      if (results.errors.length > 0) {
        console.log(`  🔍 Errors:`);
        results.errors.forEach((error) => console.log(`    - ${error}`));
      }
      console.log("");

      totalPassed += results.passed;
      totalFailed += results.failed;
    });

    const overallTotal = totalPassed + totalFailed;
    const overallPassRate =
      overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : 0;

    console.log("Overall Results:");
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  📊 Overall Pass Rate: ${overallPassRate}%\n`);

    // Display service statistics
    console.log("📊 Service Statistics:");
    console.log("=====================\n");

    try {
      const stats = optimizedSheets.getStats();
      console.log(
        "Connection Pool:",
        JSON.stringify(stats.pool.metrics, null, 2),
      );
      console.log(
        "Batch Operations:",
        JSON.stringify(stats.batch.metrics, null, 2),
      );
      console.log(
        "Cache Performance:",
        JSON.stringify(
          {
            hitRate: stats.cache.hitRate,
            totalSize: stats.cache.totalSize,
            tenantCount: stats.cache.tenantCount,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.log("Could not retrieve service statistics:", error.message);
    }
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    console.log("🧹 Cleaning up test data...");

    try {
      // Flush pending operations
      await sheetsBatch.flushAll();

      // Clear test tenant cache
      tenantCache.clearTenant(this.testTenantId);
      tenantCache.clearTenant("tenant1");
      tenantCache.clearTenant("tenant2");

      // Clear test tenant from pool
      sheetsPool.clearTenant(this.testTenantId);

      console.log("✅ Cleanup completed\n");
    } catch (error) {
      console.error("❌ Cleanup failed:", error.message);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SheetsOptimizationTester();
  tester.runAllTests().catch(console.error);
}

export default SheetsOptimizationTester;
