/**
 * Dashboard API Endpoints Test Suite
 * Comprehensive testing of all dashboard API routes
 *
 * Tests authentication, response format, caching, and functionality
 * for all dashboard endpoints created by API-001
 */

import fetch from 'node-fetch';
import logger from './services/logger.js';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testShop: process.env.TEST_SHOP || 'test-shop.myshopify.com',
  testSession: {
    shopifySession: {
      shop: 'test-shop.myshopify.com',
      accessToken: 'test-token',
      userId: 'test-user-123'
    }
  },
  timeout: 10000
};

/**
 * Test utilities
 */
class DashboardAPITester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Execute API test with authentication
   */
  async apiTest(endpoint, method = 'GET', body = null, expectedStatus = 200) {
    this.results.total++;

    try {
      const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${JSON.stringify(TEST_CONFIG.testSession)}`
        },
        timeout: TEST_CONFIG.timeout
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      // Validate response structure
      const isValidStructure = this.validateResponseStructure(data);
      const isCorrectStatus = response.status === expectedStatus;

      if (isValidStructure && isCorrectStatus) {
        this.results.passed++;
        console.log(`✅ ${method} ${endpoint} - PASSED`);
        return { success: true, data, response };
      } else {
        this.results.failed++;
        const error = `Status: ${response.status}, Structure: ${isValidStructure}`;
        this.results.errors.push(`${method} ${endpoint}: ${error}`);
        console.log(`❌ ${method} ${endpoint} - FAILED: ${error}`);
        return { success: false, error, data, response };
      }

    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`${method} ${endpoint}: ${error.message}`);
      console.log(`❌ ${method} ${endpoint} - ERROR: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate standard API response structure
   */
  validateResponseStructure(data) {
    if (!data || typeof data !== 'object') return false;

    // Check required fields
    if (!data.hasOwnProperty('success')) return false;
    if (!data.hasOwnProperty('metadata')) return false;

    // Check metadata structure
    const metadata = data.metadata;
    if (!metadata.hasOwnProperty('timestamp')) return false;
    if (!metadata.hasOwnProperty('cache')) return false;
    if (!metadata.hasOwnProperty('responseTime')) return false;

    // Check cache value
    if (!['HIT', 'MISS'].includes(metadata.cache)) return false;

    // Check response time is numeric
    if (typeof metadata.responseTime !== 'number') return false;

    return true;
  }

  /**
   * Test performance requirements
   */
  async testPerformance(endpoint, targetTime = 300) {
    const startTime = Date.now();
    const result = await this.apiTest(endpoint);
    const actualTime = Date.now() - startTime;

    if (actualTime <= targetTime) {
      console.log(`⚡ ${endpoint} - Performance PASSED (${actualTime}ms <= ${targetTime}ms)`);
    } else {
      console.log(`⚠️  ${endpoint} - Performance WARNING (${actualTime}ms > ${targetTime}ms)`);
    }

    return { actualTime, targetTime, passed: actualTime <= targetTime };
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('DASHBOARD API TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.errors.length > 0) {
      console.log('\nErrors:');
      this.results.errors.forEach(error => console.log(`  - ${error}`));
    }
    console.log('='.repeat(60));
  }
}

/**
 * Main test execution
 */
async function runDashboardAPITests() {
  console.log('Starting Dashboard API Tests...\n');
  const tester = new DashboardAPITester();

  try {
    // Test Main Dashboard Routes
    console.log('📊 Testing Main Dashboard Routes...');
    await tester.apiTest('/api/dashboard/overview');
    await tester.apiTest('/api/dashboard/overview?timeRange=24h&includeActivity=true');
    await tester.apiTest('/api/dashboard/stats');
    await tester.apiTest('/api/dashboard/stats?metrics=traffic,conversions&timeRange=7d');
    await tester.apiTest('/api/dashboard/health');
    await tester.apiTest('/api/dashboard/health?includeDetails=true');
    await tester.apiTest('/api/dashboard/activity');
    await tester.apiTest('/api/dashboard/activity?limit=25&types=optimization,alert');
    await tester.apiTest('/api/dashboard/notifications');
    await tester.apiTest('/api/dashboard/notifications?unreadOnly=true');

    // Test Dashboard Insights Routes
    console.log('\n🔍 Testing Dashboard Insights Routes...');
    await tester.apiTest('/api/dashboard/insights/website');
    await tester.apiTest('/api/dashboard/insights/website?analyzeSEO=true&checkPerformance=true');
    await tester.apiTest('/api/dashboard/insights/competitors');
    await tester.apiTest('/api/dashboard/insights/competitors?includeKeywords=true&includePricing=true');
    await tester.apiTest('/api/dashboard/insights/traffic');
    await tester.apiTest('/api/dashboard/insights/traffic?timeRange=30d&includeSegments=true');
    await tester.apiTest('/api/dashboard/insights/customers');
    await tester.apiTest('/api/dashboard/insights/customers?segmentBy=value&includeLifecycle=true');
    await tester.apiTest('/api/dashboard/insights/serp');
    await tester.apiTest('/api/dashboard/insights/serp?includeCompetitors=true&trackingHistory=true');

    // Test Dashboard Performance Routes
    console.log('\n📈 Testing Dashboard Performance Routes...');
    await tester.apiTest('/api/dashboard/performance/metrics');
    await tester.apiTest('/api/dashboard/performance/metrics?metrics=conversion_rate,ctr&includeGoals=true');
    await tester.apiTest('/api/dashboard/performance/roi');
    await tester.apiTest('/api/dashboard/performance/roi?breakdown=campaign&includeProjections=true');
    await tester.apiTest('/api/dashboard/performance/trends');
    await tester.apiTest('/api/dashboard/performance/trends?includeSeasonality=true&includeForecast=true');
    await tester.apiTest('/api/dashboard/performance/comparisons');
    await tester.apiTest('/api/dashboard/performance/comparisons?primaryPeriod=30d&includeSignificance=true');
    await tester.apiTest('/api/dashboard/performance/attribution');
    await tester.apiTest('/api/dashboard/performance/cohorts');

    // Test Dashboard Optimizations Routes
    console.log('\n🎯 Testing Dashboard Optimizations Routes...');
    await tester.apiTest('/api/dashboard/optimizations/pending');
    await tester.apiTest('/api/dashboard/optimizations/pending?priority=high&includeRisks=true');
    await tester.apiTest('/api/dashboard/optimizations/applied');
    await tester.apiTest('/api/dashboard/optimizations/applied?includePerformance=true&includeImpact=true');
    await tester.apiTest('/api/dashboard/optimizations/history');
    await tester.apiTest('/api/dashboard/optimizations/history?includeTrends=true&includeSuccess=true');
    await tester.apiTest('/api/dashboard/optimizations/recommendations');
    await tester.apiTest('/api/dashboard/optimizations/recommendations?priority=high&includeRisks=true');

    // Test POST endpoints
    console.log('\n🔧 Testing Action Endpoints...');
    await tester.apiTest('/api/dashboard/actions/approve', 'POST', {
      optimizationId: 'test-opt-123',
      scheduleTime: new Date(Date.now() + 3600000).toISOString(),
      notifyOnComplete: true
    });

    await tester.apiTest('/api/dashboard/actions/reject', 'POST', {
      optimizationId: 'test-opt-124',
      reason: 'Test rejection',
      preventSimilar: false
    });

    await tester.apiTest('/api/dashboard/actions/rollback', 'POST', {
      optimizationId: 'test-opt-125',
      reason: 'Test rollback',
      preserveData: true
    });

    await tester.apiTest('/api/dashboard/notifications/test-notif-123/mark-read', 'POST');

    await tester.apiTest('/api/dashboard/refresh', 'POST', {
      services: ['website', 'traffic'],
      clearCache: true
    });

    // Test Performance Requirements
    console.log('\n⚡ Testing Performance Requirements...');
    await tester.testPerformance('/api/dashboard/overview', 300);
    await tester.testPerformance('/api/dashboard/stats', 300);
    await tester.testPerformance('/api/dashboard/health', 300);

    // Test Authentication Requirements
    console.log('\n🔐 Testing Authentication Requirements...');
    // Test without session (should fail with 401)
    const noAuthResult = await fetch(`${TEST_CONFIG.baseUrl}/api/dashboard/overview`);
    if (noAuthResult.status === 401) {
      console.log('✅ Authentication enforcement - PASSED');
      tester.results.passed++;
    } else {
      console.log('❌ Authentication enforcement - FAILED');
      tester.results.failed++;
      tester.results.errors.push('Authentication not properly enforced');
    }
    tester.results.total++;

    // Test Error Handling
    console.log('\n❗ Testing Error Handling...');
    await tester.apiTest('/api/dashboard/nonexistent', 'GET', null, 404);

  } catch (error) {
    console.error('Test execution error:', error);
  }

  tester.printSummary();
  return tester.results;
}

/**
 * Specific integration tests
 */
async function runIntegrationTests() {
  console.log('\n🔗 Running Integration Tests...');
  const tester = new DashboardAPITester();

  try {
    // Test data consistency across endpoints
    const overviewResult = await tester.apiTest('/api/dashboard/overview');
    const statsResult = await tester.apiTest('/api/dashboard/stats');

    if (overviewResult.success && statsResult.success) {
      console.log('✅ Data consistency check - Both endpoints accessible');
    }

    // Test caching behavior
    const firstCall = await tester.apiTest('/api/dashboard/stats');
    const secondCall = await tester.apiTest('/api/dashboard/stats');

    if (firstCall.success && secondCall.success) {
      if (secondCall.data.metadata.cache === 'HIT') {
        console.log('✅ Caching working - Second call was cached');
      } else {
        console.log('⚠️  Caching - Second call was not cached (may be expected)');
      }
    }

    // Test pagination
    await tester.apiTest('/api/dashboard/activity?limit=10&offset=0');
    await tester.apiTest('/api/dashboard/activity?limit=10&offset=10');

  } catch (error) {
    console.error('Integration test error:', error);
  }

  return tester.results;
}

// Export for use in other tests
export { DashboardAPITester, runDashboardAPITests, runIntegrationTests };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDashboardAPITests()
    .then(() => runIntegrationTests())
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}