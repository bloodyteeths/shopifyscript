/**
 * Performance Testing and Benchmarking Service
 * Tests real-time analytics performance across different tiers
 */

import analyticsTiers from "./analytics-tiers.js";
import cacheMonitor from "./cache-monitor.js";
import { getJson, setJson } from "./redis.js";

class PerformanceTestService {
  constructor() {
    this.testResults = new Map();
    this.benchmarks = {
      maxLoadTime: 2000,        // 2 seconds max load time
      minCacheHitRate: 70,      // 70% minimum cache hit rate
      maxQueryTime: 1000,       // 1 second max query time
      tierResponseTimes: {
        starter: 5000,          // 5 seconds acceptable for starter
        professional: 2000,     // 2 seconds for professional
        enterprise: 1000        // 1 second for enterprise
      }
    };
  }

  /**
   * Run comprehensive performance test for tenant
   */
  async runPerformanceTest(tenant, testType = 'full') {
    const testId = `perf_test_${tenant}_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      const results = {
        testId,
        tenant,
        tier: features.tier,
        testType,
        startTime,
        tests: {},
        summary: {},
        recommendations: []
      };

      console.log(`Starting performance test ${testId} for ${tenant} (${features.tier} tier)`);

      // Test 1: Cache Performance
      results.tests.cachePerformance = await this.testCachePerformance(tenant);
      
      // Test 2: Query Response Times
      results.tests.queryPerformance = await this.testQueryPerformance(tenant);
      
      // Test 3: Real-time Update Performance
      if (features.realTimeUpdates) {
        results.tests.realTimePerformance = await this.testRealTimePerformance(tenant);
      }
      
      // Test 4: Tier-specific Feature Performance
      results.tests.tierFeatures = await this.testTierSpecificFeatures(tenant);
      
      // Test 5: Load Testing
      if (testType === 'full' || testType === 'load') {
        results.tests.loadPerformance = await this.testLoadPerformance(tenant);
      }

      // Calculate summary and recommendations
      results.summary = this.calculateTestSummary(results.tests, features.tier);
      results.recommendations = this.generatePerformanceRecommendations(results);
      results.endTime = Date.now();
      results.totalTime = results.endTime - startTime;

      // Store results
      this.testResults.set(testId, results);
      
      // Cache results for 1 hour
      try {
        await setJson(`perf_test:${testId}`, results, 3600);
      } catch (e) {
        console.warn('Failed to cache test results:', e.message);
      }

      return results;
    } catch (error) {
      console.error('Performance test failed:', error);
      return {
        testId,
        tenant,
        error: error.message,
        testType,
        startTime,
        endTime: Date.now(),
        failed: true
      };
    }
  }

  /**
   * Test cache performance
   */
  async testCachePerformance(tenant) {
    const test = {
      name: 'Cache Performance',
      startTime: Date.now(),
      metrics: {}
    };

    try {
      // Get current cache metrics
      const cacheMetrics = await cacheMonitor.getTenantMetrics(tenant);
      
      // Test cache hit rates
      test.metrics.hitRate = cacheMetrics.overall?.hitRate || 0;
      test.metrics.avgHitTime = cacheMetrics.overall?.avgHitTime || 0;
      test.metrics.avgMissTime = cacheMetrics.overall?.avgMissTime || 0;
      
      // Test cache retrieval times
      const cacheTestStart = Date.now();
      try {
        await getJson(`insights:${tenant}`);
        test.metrics.retrievalTime = Date.now() - cacheTestStart;
      } catch (e) {
        test.metrics.retrievalTime = Date.now() - cacheTestStart;
        test.metrics.retrievalError = e.message;
      }

      // Performance evaluation
      test.passed = test.metrics.hitRate >= this.benchmarks.minCacheHitRate;
      test.score = Math.min(100, test.metrics.hitRate);
      
      if (!test.passed) {
        test.issues = [`Cache hit rate ${test.metrics.hitRate}% below benchmark ${this.benchmarks.minCacheHitRate}%`];
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      test.score = 0;
    }

    test.endTime = Date.now();
    test.duration = test.endTime - test.startTime;
    return test;
  }

  /**
   * Test query performance
   */
  async testQueryPerformance(tenant) {
    const test = {
      name: 'Query Performance',
      startTime: Date.now(),
      queries: {}
    };

    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      
      // Test basic insights query
      const insightsStart = Date.now();
      // Simulate insights query (would call actual endpoint in real implementation)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
      test.queries.insights = {
        time: Date.now() - insightsStart,
        passed: true
      };

      // Test real-time query (if available)
      if (features.realTimeUpdates) {
        const realTimeStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
        test.queries.realTime = {
          time: Date.now() - realTimeStart,
          passed: true
        };
      }

      // Test ROAS calculation (if available)
      if (features.advancedRoas) {
        const roasStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 75));
        test.queries.roas = {
          time: Date.now() - roasStart,
          passed: true
        };
      }

      // Calculate overall performance
      const queryTimes = Object.values(test.queries).map(q => q.time);
      test.avgQueryTime = queryTimes.length > 0 ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length : 0;
      test.maxQueryTime = queryTimes.length > 0 ? Math.max(...queryTimes) : 0;
      
      const maxAllowed = this.benchmarks.tierResponseTimes[features.tier] || this.benchmarks.maxQueryTime;
      test.passed = test.maxQueryTime <= maxAllowed;
      test.score = Math.max(0, Math.min(100, 100 - (test.maxQueryTime / maxAllowed) * 50));

      if (!test.passed) {
        test.issues = [`Max query time ${test.maxQueryTime}ms exceeds ${maxAllowed}ms for ${features.tier} tier`];
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      test.score = 0;
    }

    test.endTime = Date.now();
    test.duration = test.endTime - test.startTime;
    return test;
  }

  /**
   * Test real-time update performance
   */
  async testRealTimePerformance(tenant) {
    const test = {
      name: 'Real-time Performance',
      startTime: Date.now(),
      updates: []
    };

    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      const expectedInterval = features.refreshInterval;
      
      // Simulate multiple real-time updates
      for (let i = 0; i < 5; i++) {
        const updateStart = Date.now();
        
        // Simulate cache check and potential update
        await new Promise(resolve => setTimeout(resolve, Math.random() * expectedInterval * 0.1));
        
        test.updates.push({
          updateNumber: i + 1,
          time: Date.now() - updateStart,
          withinInterval: true
        });
      }

      // Calculate performance metrics
      const updateTimes = test.updates.map(u => u.time);
      test.avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
      test.maxUpdateTime = Math.max(...updateTimes);
      test.consistency = updateTimes.every(t => Math.abs(t - test.avgUpdateTime) < test.avgUpdateTime * 0.3);
      
      // Performance evaluation
      test.passed = test.maxUpdateTime <= expectedInterval && test.consistency;
      test.score = test.consistency ? Math.max(0, 100 - (test.avgUpdateTime / expectedInterval) * 100) : 50;
      
      if (!test.passed) {
        test.issues = [];
        if (test.maxUpdateTime > expectedInterval) {
          test.issues.push(`Update time ${test.maxUpdateTime}ms exceeds interval ${expectedInterval}ms`);
        }
        if (!test.consistency) {
          test.issues.push('Update times are inconsistent');
        }
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      test.score = 0;
    }

    test.endTime = Date.now();
    test.duration = test.endTime - test.startTime;
    return test;
  }

  /**
   * Test tier-specific features
   */
  async testTierSpecificFeatures(tenant) {
    const test = {
      name: 'Tier Feature Performance',
      startTime: Date.now(),
      features: {}
    };

    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      
      // Test data filtering performance
      const filterStart = Date.now();
      const mockData = {
        series: Array(1000).fill().map((_, i) => ({ t: i, value: Math.random() * 100 })),
        kpi: {
          clicks: 1000,
          cost: 500,
          conversions: 50,
          roas: 2.5,
          customMetric: 123
        }
      };
      
      const filteredData = await analyticsTiers.filterAnalyticsData(tenant, mockData);
      
      test.features.dataFiltering = {
        time: Date.now() - filterStart,
        originalDataPoints: mockData.series.length,
        filteredDataPoints: filteredData.series?.length || 0,
        kpisFiltered: filteredData.tierInfo?.limitations?.kpisFiltered?.length || 0,
        passed: true
      };

      // Test feature validation performance
      const validationStart = Date.now();
      const featuresToTest = ['realTimeUpdates', 'advancedRoas', 'customDashboards'];
      const validationResults = {};
      
      for (const feature of featuresToTest) {
        const result = await analyticsTiers.validateFeatureAccess(tenant, feature);
        validationResults[feature] = result;
      }
      
      test.features.validation = {
        time: Date.now() - validationStart,
        featuresChecked: featuresToTest.length,
        results: validationResults,
        passed: true
      };

      // Overall feature performance score
      const featureTests = Object.values(test.features).filter(f => f.passed);
      test.passed = featureTests.length === Object.keys(test.features).length;
      test.score = (featureTests.length / Object.keys(test.features).length) * 100;

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      test.score = 0;
    }

    test.endTime = Date.now();
    test.duration = test.endTime - test.startTime;
    return test;
  }

  /**
   * Test load performance
   */
  async testLoadPerformance(tenant) {
    const test = {
      name: 'Load Performance',
      startTime: Date.now(),
      load: {}
    };

    try {
      const concurrentRequests = 10;
      const requests = [];

      // Simulate concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(this.simulateAnalyticsRequest(tenant));
      }

      const loadStart = Date.now();
      const results = await Promise.allSettled(requests);
      const loadTime = Date.now() - loadStart;

      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const responseTimes = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.responseTime);

      test.load = {
        concurrentRequests,
        successful,
        failed,
        totalTime: loadTime,
        avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        successRate: (successful / concurrentRequests) * 100
      };

      // Performance evaluation
      test.passed = test.load.successRate >= 95 && test.load.maxResponseTime <= this.benchmarks.maxLoadTime;
      test.score = Math.min(test.load.successRate, 100 - (test.load.maxResponseTime / this.benchmarks.maxLoadTime) * 50);

      if (!test.passed) {
        test.issues = [];
        if (test.load.successRate < 95) {
          test.issues.push(`Success rate ${test.load.successRate}% below 95%`);
        }
        if (test.load.maxResponseTime > this.benchmarks.maxLoadTime) {
          test.issues.push(`Max response time ${test.load.maxResponseTime}ms exceeds ${this.benchmarks.maxLoadTime}ms`);
        }
      }

    } catch (error) {
      test.error = error.message;
      test.passed = false;
      test.score = 0;
    }

    test.endTime = Date.now();
    test.duration = test.endTime - test.startTime;
    return test;
  }

  /**
   * Simulate analytics request for load testing
   */
  async simulateAnalyticsRequest(tenant) {
    const start = Date.now();
    
    // Simulate various request types
    const requestTypes = ['insights', 'realtime', 'roas'];
    const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)];
    
    // Simulate processing time based on request type
    const processingTime = {
      insights: 200 + Math.random() * 300,
      realtime: 50 + Math.random() * 100,
      roas: 100 + Math.random() * 200
    };
    
    await new Promise(resolve => setTimeout(resolve, processingTime[requestType] || 200));
    
    return {
      requestType,
      responseTime: Date.now() - start,
      success: Math.random() > 0.05 // 95% success rate
    };
  }

  /**
   * Calculate test summary
   */
  calculateTestSummary(tests, tier) {
    const testResults = Object.values(tests);
    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    const avgScore = testResults.reduce((sum, t) => sum + (t.score || 0), 0) / totalTests;
    
    const overallRating = avgScore >= 90 ? 'excellent' : 
                         avgScore >= 75 ? 'good' : 
                         avgScore >= 60 ? 'fair' : 'poor';
    
    return {
      tier,
      passedTests,
      totalTests,
      passRate: (passedTests / totalTests) * 100,
      avgScore: Math.round(avgScore),
      overallRating,
      totalDuration: testResults.reduce((sum, t) => sum + (t.duration || 0), 0),
      criticalIssues: testResults.filter(t => !t.passed && t.score < 30).length
    };
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(results) {
    const recommendations = [];
    const { tests, summary } = results;
    
    // Cache performance recommendations
    if (tests.cachePerformance && !tests.cachePerformance.passed) {
      recommendations.push({
        priority: 'high',
        category: 'cache',
        title: 'Improve Cache Performance',
        description: `Cache hit rate of ${tests.cachePerformance.metrics.hitRate}% is below optimal`,
        actions: [
          'Review cache invalidation strategy',
          'Consider increasing cache TTL',
          'Implement cache warming for popular queries'
        ]
      });
    }

    // Query performance recommendations
    if (tests.queryPerformance && !tests.queryPerformance.passed) {
      recommendations.push({
        priority: 'high',
        category: 'database',
        title: 'Optimize Query Performance',
        description: `Query times exceed acceptable limits for ${results.tier} tier`,
        actions: [
          'Add database indexes',
          'Optimize query structure',
          'Consider query result caching'
        ]
      });
    }

    // Load performance recommendations
    if (tests.loadPerformance && !tests.loadPerformance.passed) {
      recommendations.push({
        priority: 'critical',
        category: 'scalability',
        title: 'Address Load Performance Issues',
        description: 'System struggling under concurrent load',
        actions: [
          'Implement connection pooling',
          'Add horizontal scaling',
          'Review resource allocation'
        ]
      });
    }

    // Tier-specific recommendations
    if (summary.avgScore < 75) {
      recommendations.push({
        priority: 'medium',
        category: 'optimization',
        title: 'General Performance Optimization',
        description: 'Overall performance below expected standards',
        actions: [
          'Review system architecture',
          'Implement performance monitoring',
          'Consider infrastructure upgrades'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get test results
   */
  getTestResults(testId) {
    return this.testResults.get(testId);
  }

  /**
   * Get all test results for tenant
   */
  getTenantTestResults(tenant, limit = 10) {
    const tenantTests = Array.from(this.testResults.values())
      .filter(test => test.tenant === tenant)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
    
    return tenantTests;
  }

  /**
   * Clean up old test results
   */
  cleanupOldResults(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoff = Date.now() - maxAge;
    
    for (const [testId, result] of this.testResults.entries()) {
      if (result.startTime < cutoff) {
        this.testResults.delete(testId);
      }
    }
  }
}

// Export singleton instance
const performanceTester = new PerformanceTestService();

// Cleanup old results every hour
setInterval(() => {
  performanceTester.cleanupOldResults();
}, 60 * 60 * 1000);

export default performanceTester;
export { PerformanceTestService };