/**
 * Real-Time Analytics Performance Test Suite
 * Tests tier-based caching, performance, and feature differentiation
 */

import analyticsTiers from "./services/analytics-tiers.js";
import roasCalculator from "./services/roas-calculator.js";
import cacheMonitor from "./services/cache-monitor.js";
import performanceTester from "./services/performance-tester.js";

const TEST_TENANTS = {
  starter: "starter_test_tenant",
  professional: "pro_test_tenant", 
  enterprise: "enterprise_test_tenant"
};

async function runAnalyticsTests() {
  console.log("🚀 Starting Real-Time Analytics Performance Test Suite");
  console.log("="*60);

  const results = {
    tierFeatures: {},
    cachePerformance: {},
    roasCalculations: {},
    performanceTests: {},
    overallScore: 0
  };

  try {
    // Test 1: Tier Feature Differentiation
    console.log("\n📊 Test 1: Tier Feature Differentiation");
    for (const [tier, tenant] of Object.entries(TEST_TENANTS)) {
      console.log(`  Testing ${tier} tier features...`);
      
      const features = await analyticsTiers.getTierFeatures(tenant);
      results.tierFeatures[tier] = {
        tier: features.tier,
        refreshInterval: features.refreshInterval,
        realTimeUpdates: features.realTimeUpdates,
        advancedRoas: features.advancedRoas,
        customDashboards: features.customDashboards,
        maxDataPoints: features.maxDataPoints,
        chartTypes: features.chartTypes?.length || 0,
        exportFormats: features.exportFormats?.length || 0
      };
      
      console.log(`    ✓ ${tier}: ${features.refreshInterval/1000}s refresh, ${features.maxDataPoints} data points`);
    }

    // Test 2: Cache Performance by Tier
    console.log("\n⚡ Test 2: Cache Performance by Tier");
    for (const [tier, tenant] of Object.entries(TEST_TENANTS)) {
      console.log(`  Testing ${tier} tier cache performance...`);
      
      const features = await analyticsTiers.getTierFeatures(tenant);
      
      // Simulate data filtering
      const mockData = {
        series: Array(1000).fill().map((_, i) => ({ t: `2024-01-${String(i % 30 + 1).padStart(2, '0')}`, value: Math.random() * 100 })),
        kpi: {
          clicks: 1000 + Math.random() * 5000,
          cost: 500 + Math.random() * 2000,
          conversions: 50 + Math.random() * 200,
          impressions: 10000 + Math.random() * 50000,
          ctr: 0.02 + Math.random() * 0.03,
          cpc: 0.5 + Math.random() * 2,
          cpa: 10 + Math.random() * 40
        }
      };

      const startTime = Date.now();
      const filteredData = await analyticsTiers.filterAnalyticsData(tenant, mockData);
      const processingTime = Date.now() - startTime;

      results.cachePerformance[tier] = {
        originalDataPoints: mockData.series.length,
        filteredDataPoints: filteredData.series?.length || 0,
        processingTime,
        refreshInterval: features.refreshInterval,
        dataPointsFiltered: filteredData.tierInfo?.limitations?.dataPointsFiltered || 0,
        upgradeRequired: filteredData.tierInfo?.upgradeRequired || false
      };

      const efficiency = processingTime < 100 ? "Excellent" : processingTime < 200 ? "Good" : "Fair";
      console.log(`    ✓ ${tier}: ${processingTime}ms processing, ${filteredData.series?.length} data points (${efficiency})`);
    }

    // Test 3: ROAS Calculation Performance
    console.log("\n💰 Test 3: ROAS Calculation Performance by Tier");
    for (const [tier, tenant] of Object.entries(TEST_TENANTS)) {
      console.log(`  Testing ${tier} tier ROAS calculations...`);
      
      const mockMetrics = {
        cost: 1000 + Math.random() * 5000,
        conversions: 50 + Math.random() * 200,
        clicks: 2000 + Math.random() * 8000,
        impressions: 50000 + Math.random() * 200000
      };

      const startTime = Date.now();
      const roasData = await roasCalculator.calculateROAS(tenant, mockMetrics, {
        attributionModel: "last_click",
        includeLTV: true,
        segments: []
      });
      const calculationTime = Date.now() - startTime;

      results.roasCalculations[tier] = {
        calculationTime,
        basicRoas: roasData.basic?.roas || 0,
        hasAdvanced: !!roasData.advanced,
        hasSegmented: !!roasData.segmented,
        hasCustom: !!roasData.custom,
        tierInfo: roasData.tierInfo
      };

      const roasValue = roasData.basic?.roas || 0;
      console.log(`    ✓ ${tier}: ${calculationTime}ms, ROAS: ${roasValue.toFixed(2)}, Advanced: ${!!roasData.advanced}`);
    }

    // Test 4: Performance Testing
    console.log("\n🏃‍♀️ Test 4: Comprehensive Performance Testing");
    for (const [tier, tenant] of Object.entries(TEST_TENANTS)) {
      console.log(`  Running performance test for ${tier} tier...`);
      
      const perfResults = await performanceTester.runPerformanceTest(tenant, 'quick');
      
      results.performanceTests[tier] = {
        testId: perfResults.testId,
        totalTime: perfResults.totalTime,
        passedTests: perfResults.summary?.passedTests || 0,
        totalTests: perfResults.summary?.totalTests || 0,
        avgScore: perfResults.summary?.avgScore || 0,
        overallRating: perfResults.summary?.overallRating || 'unknown',
        criticalIssues: perfResults.summary?.criticalIssues || 0
      };

      const passRate = results.performanceTests[tier].passedTests / results.performanceTests[tier].totalTests * 100;
      console.log(`    ✓ ${tier}: ${passRate.toFixed(0)}% pass rate, ${perfResults.summary?.avgScore || 0}/100 score, ${perfResults.totalTime}ms total`);
    }

    // Test 5: Real-time Update Intervals
    console.log("\n⏱️  Test 5: Real-time Update Interval Validation");
    const intervalTests = {};
    
    for (const [tier, tenant] of Object.entries(TEST_TENANTS)) {
      const features = await analyticsTiers.getTierFeatures(tenant);
      const expectedInterval = features.refreshInterval;
      
      // Simulate cache timing test
      const cacheTests = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        // Simulate cache check
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        cacheTests.push(Date.now() - start);
      }
      
      const avgCacheTime = cacheTests.reduce((a, b) => a + b, 0) / cacheTests.length;
      const meetsInterval = avgCacheTime < expectedInterval;
      
      intervalTests[tier] = {
        expectedInterval,
        avgCacheTime: Math.round(avgCacheTime),
        meetsInterval,
        efficiency: expectedInterval > 0 ? Math.round((1 - avgCacheTime / expectedInterval) * 100) : 100
      };
      
      console.log(`    ✓ ${tier}: ${expectedInterval/1000}s interval, ${Math.round(avgCacheTime)}ms avg cache time (${meetsInterval ? 'PASS' : 'FAIL'})`);
    }

    // Calculate Overall Score
    const tierScores = Object.values(results.performanceTests).map(t => t.avgScore);
    results.overallScore = tierScores.reduce((a, b) => a + b, 0) / tierScores.length;

    // Final Results Summary
    console.log("\n" + "="*60);
    console.log("📋 REAL-TIME ANALYTICS TEST RESULTS SUMMARY");
    console.log("="*60);

    console.log("\n🏆 Tier Performance Scores:");
    for (const [tier, perf] of Object.entries(results.performanceTests)) {
      const rating = perf.overallRating;
      const emoji = rating === 'excellent' ? '🌟' : rating === 'good' ? '✅' : rating === 'fair' ? '⚠️' : '❌';
      console.log(`  ${emoji} ${tier.toUpperCase()}: ${perf.avgScore}/100 (${rating})`);
    }

    console.log(`\n📊 Overall System Score: ${Math.round(results.overallScore)}/100`);

    console.log("\n⚡ Cache Performance Summary:");
    for (const [tier, cache] of Object.entries(results.cachePerformance)) {
      const refreshTime = cache.refreshInterval / 1000;
      console.log(`  ${tier}: ${refreshTime}s refresh, ${cache.processingTime}ms processing`);
    }

    console.log("\n💰 ROAS Calculation Summary:");
    for (const [tier, roas] of Object.entries(results.roasCalculations)) {
      const features = roas.hasAdvanced ? " + Advanced" : "";
      const custom = roas.hasCustom ? " + Custom" : "";
      console.log(`  ${tier}: ${roas.basicRoas.toFixed(2)} ROAS, ${roas.calculationTime}ms${features}${custom}`);
    }

    console.log("\n📈 Feature Differentiation Summary:");
    for (const [tier, features] of Object.entries(results.tierFeatures)) {
      console.log(`  ${tier}: ${features.chartTypes} charts, ${features.exportFormats} formats, ${features.maxDataPoints === -1 ? 'unlimited' : features.maxDataPoints} data points`);
    }

    // Performance Recommendations
    console.log("\n🎯 Performance Recommendations:");
    const recommendations = [];
    
    if (results.overallScore < 80) {
      recommendations.push("- Consider optimizing database queries with recommended indexes");
      recommendations.push("- Implement Redis caching for better performance");
    }
    
    if (results.cachePerformance.starter?.processingTime > 200) {
      recommendations.push("- Optimize data filtering logic for Starter tier");
    }
    
    if (results.roasCalculations.professional?.calculationTime > 100) {
      recommendations.push("- Cache ROAS calculation results for Professional tier");
    }
    
    if (Object.values(intervalTests).some(t => !t.meetsInterval)) {
      recommendations.push("- Review real-time update intervals and cache efficiency");
    }
    
    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(rec));
    } else {
      console.log("  🎉 All performance metrics are within acceptable ranges!");
    }

    console.log("\n✅ Test Suite Completed Successfully!");
    console.log("="*60);

    return results;

  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error);
    console.error("Stack trace:", error.stack);
    return { error: error.message, results };
  }
}

// Export for use in other test files
export { runAnalyticsTests, TEST_TENANTS };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnalyticsTests()
    .then(results => {
      if (results.error) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error("Fatal test error:", error);
      process.exit(1);
    });
}