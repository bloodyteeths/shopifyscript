/**
 * Basic Dashboard Services Test
 * Tests core functionality without complex service dependencies
 */

import dashboardCache from './services/dashboard-cache.js';
import dashboardTransformer from './services/dashboard-transformer.js';

/**
 * Run basic dashboard tests
 */
async function runBasicTests() {
  console.log('🚀 Starting Basic Dashboard Tests...\n');

  const testTenantId = 'test_tenant_basic';
  const results = { passed: 0, failed: 0, errors: [] };

  try {
    // Test 1: Cache Service Basic Operations
    console.log('📦 Testing Cache Service...');
    await testCacheBasic(testTenantId, results);

    // Test 2: Transformer Service
    console.log('🔄 Testing Transformer Service...');
    await testTransformerBasic(results);

    // Test 3: Performance Testing
    console.log('⚡ Testing Performance...');
    await testPerformance(testTenantId, results);

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    results.failed++;
    results.errors.push({ test: 'Test Suite', error: error.message });
  }

  // Report results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`- ${error.test}: ${error.error}`);
    });
  }

  const successRate = Math.round((results.passed / (results.passed + results.failed)) * 100);
  console.log(`\n🎯 Success Rate: ${successRate}%`);

  // Cleanup
  dashboardCache.clear();
  console.log('\n🧹 Cleanup completed');
}

async function testCacheBasic(tenantId, results) {
  try {
    // Test set/get
    const testData = { test: 'data', value: 123, timestamp: Date.now() };
    dashboardCache.set(tenantId, 'test_type', testData);
    const retrieved = dashboardCache.get(tenantId, 'test_type');

    if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
      console.log('  ✅ Cache set/get working');
      results.passed++;
    } else {
      throw new Error('Cache data mismatch');
    }

    // Test TTL
    dashboardCache.set(tenantId, 'ttl_test', { test: 'ttl' }, {}, 50);
    await new Promise(resolve => setTimeout(resolve, 100));
    const expired = dashboardCache.get(tenantId, 'ttl_test');

    if (expired === null) {
      console.log('  ✅ Cache TTL working');
      results.passed++;
    } else {
      throw new Error('TTL not working');
    }

    // Test invalidation
    dashboardCache.set(tenantId, 'invalidate_test', { test: 'invalidate' });
    const invalidated = dashboardCache.invalidate(tenantId, 'invalidate_test');

    if (invalidated > 0) {
      console.log('  ✅ Cache invalidation working');
      results.passed++;
    } else {
      throw new Error('Invalidation not working');
    }

  } catch (error) {
    console.log(`  ❌ Cache test failed: ${error.message}`);
    results.failed++;
    results.errors.push({ test: 'Cache Basic', error: error.message });
  }
}

async function testTransformerBasic(results) {
  try {
    // Test system overview transformation
    const mockData = {
      campaigns: [
        { id: 1, status: 'ENABLED' },
        { id: 2, status: 'PAUSED' },
        { id: 3, status: 'ENABLED' }
      ],
      metrics: [
        { cost_micros: 1000000, clicks: 100, impressions: 5000, conversions: 5, revenue: 250 },
        { cost_micros: 2000000, clicks: 150, impressions: 7500, conversions: 8, revenue: 400 }
      ],
      dataSourcesStatus: {
        websiteScraper: { status: 'healthy', lastUpdate: new Date().toISOString() },
        competitorIntelligence: { status: 'healthy', lastUpdate: new Date().toISOString() }
      },
      optimizationQueue: [
        { priority: 'high', type: 'bid_adjustment' },
        { priority: 'medium', type: 'keyword_expansion' }
      ]
    };

    const overview = dashboardTransformer.transformSystemOverview(mockData);

    if (overview && overview.summary && overview.metrics) {
      console.log('  ✅ System overview transformation working');
      console.log(`    - Total campaigns: ${overview.summary.totalCampaigns}`);
      console.log(`    - Active campaigns: ${overview.summary.activeCampaigns}`);
      console.log(`    - Performance score: ${overview.summary.performanceScore}`);
      results.passed++;
    } else {
      throw new Error('System overview transformation failed');
    }

    // Test data sources transformation
    const sourcesData = {
      websiteScraper: { status: 'healthy', lastUpdate: new Date().toISOString(), dataPoints: 100 },
      competitorIntelligence: { status: 'healthy', lastUpdate: new Date().toISOString(), dataPoints: 50 },
      trafficAnalyzer: { status: 'warning', lastUpdate: new Date().toISOString(), errorCount: 2 }
    };

    const sources = dashboardTransformer.transformDataSourcesSummary(sourcesData);

    if (sources && sources.sources && sources.overall) {
      console.log('  ✅ Data sources transformation working');
      console.log(`    - Overall status: ${sources.overall.status}`);
      console.log(`    - Health percentage: ${sources.overall.healthPercentage}%`);
      results.passed++;
    } else {
      throw new Error('Data sources transformation failed');
    }

    // Test optimization queue transformation
    const queueData = [
      { priority: 'high', type: 'bid_adjustment', estimatedSavings: 100 },
      { priority: 'medium', type: 'keyword_expansion', estimatedRevenue: 200 },
      { priority: 'low', type: 'ad_copy_test', estimatedSavings: 50 }
    ];

    const queue = dashboardTransformer.transformOptimizationQueue(queueData);

    if (queue && queue.pending && queue.impactAnalysis) {
      console.log('  ✅ Optimization queue transformation working');
      console.log(`    - Total pending: ${queue.pending.total}`);
      console.log(`    - High priority: ${queue.pending.high.length}`);
      results.passed++;
    } else {
      throw new Error('Optimization queue transformation failed');
    }

  } catch (error) {
    console.log(`  ❌ Transformer test failed: ${error.message}`);
    results.failed++;
    results.errors.push({ test: 'Transformer Basic', error: error.message });
  }
}

async function testPerformance(tenantId, results) {
  try {
    const iterations = 100;
    const times = [];

    console.log(`  Running ${iterations} cache operations...`);

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      dashboardCache.set(tenantId, 'perf_test', { data: i, timestamp: Date.now() });
      dashboardCache.get(tenantId, 'perf_test');
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`  ✅ Performance test completed`);
    console.log(`    - Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`    - Max time: ${maxTime}ms`);
    console.log(`    - All operations < 10ms: ${maxTime < 10 ? 'Yes' : 'No'}`);

    if (avgTime < 5) {
      results.passed++;
    } else {
      throw new Error(`Average time too high: ${avgTime}ms`);
    }

  } catch (error) {
    console.log(`  ❌ Performance test failed: ${error.message}`);
    results.failed++;
    results.errors.push({ test: 'Performance', error: error.message });
  }
}

// Run tests
runBasicTests()
  .then(() => {
    console.log('\n✅ Basic dashboard tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Basic dashboard tests failed:', error);
    process.exit(1);
  });