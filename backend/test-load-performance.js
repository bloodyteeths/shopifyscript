#!/usr/bin/env node
/**
 * Load Testing and Performance Benchmarking Script
 * Tests the system under 100+ concurrent users load
 */

import { performance } from 'perf_hooks';
import https from 'https';
import http from 'http';
import cluster from 'cluster';
import os from 'os';
import { URL } from 'url';

class LoadTester {
  constructor() {
    this.config = {
      // Test configuration
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
      maxConcurrentUsers: Number(process.env.MAX_CONCURRENT_USERS || 100),
      testDurationMinutes: Number(process.env.TEST_DURATION_MINUTES || 10),
      rampUpSeconds: Number(process.env.RAMP_UP_SECONDS || 60),
      
      // Performance thresholds
      maxResponseTime: Number(process.env.MAX_RESPONSE_TIME || 2000),
      minSuccessRate: Number(process.env.MIN_SUCCESS_RATE || 95),
      maxErrorRate: Number(process.env.MAX_ERROR_RATE || 5),
      
      // Test scenarios
      scenarios: [
        {
          name: 'API Health Check',
          method: 'GET',
          path: '/api/health',
          weight: 5, // 5% of requests
          headers: {},
        },
        {
          name: 'Get Metrics',
          method: 'GET',
          path: '/api/metrics?tenant=test-tenant',
          weight: 20, // 20% of requests
          headers: {},
        },
        {
          name: 'Get Insights',
          method: 'GET', 
          path: '/api/insights?tenant=test-tenant',
          weight: 25, // 25% of requests
          headers: {},
        },
        {
          name: 'Get Configuration',
          method: 'GET',
          path: '/api/config?tenant=test-tenant',
          weight: 15, // 15% of requests
          headers: {},
        },
        {
          name: 'Update Configuration',
          method: 'POST',
          path: '/api/upsertConfig',
          weight: 10, // 10% of requests
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant: 'test-tenant',
            config: { testKey: 'testValue', timestamp: Date.now() }
          }),
        },
        {
          name: 'Get Run Logs',
          method: 'GET',
          path: '/api/run-logs?tenant=test-tenant',
          weight: 15, // 15% of requests
          headers: {},
        },
        {
          name: 'Get Summary',
          method: 'GET',
          path: '/api/summary?tenant=test-tenant',
          weight: 10, // 10% of requests
          headers: {},
        },
      ],
    };

    // Metrics tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      responseTimes: [],
      errors: new Map(),
      statusCodes: new Map(),
      scenarioMetrics: new Map(),
      connectionErrors: 0,
      timeouts: 0,
      startTime: 0,
      endTime: 0,
    };

    // Workers for concurrent load
    this.workers = [];
    this.activeUsers = 0;
  }

  /**
   * Start load testing
   */
  async startLoadTest() {
    console.log('🚀 Starting Performance Load Test');
    console.log('================================');
    console.log(`Target URL: ${this.config.baseUrl}`);
    console.log(`Max Concurrent Users: ${this.config.maxConcurrentUsers}`);
    console.log(`Test Duration: ${this.config.testDurationMinutes} minutes`);
    console.log(`Ramp-up Time: ${this.config.rampUpSeconds} seconds`);
    console.log('');

    this.metrics.startTime = Date.now();

    try {
      // Pre-test system check
      await this.preTestHealthCheck();

      // Initialize scenario weights
      this.initializeScenarioWeights();

      // Start load generation
      await this.generateLoad();

      // Generate final report
      await this.generateFinalReport();

    } catch (error) {
      console.error('❌ Load test failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Pre-test health check
   */
  async preTestHealthCheck() {
    console.log('⏳ Running pre-test health check...');
    
    try {
      const healthResponse = await this.makeRequest('GET', '/api/health', {}, '');
      
      if (healthResponse.statusCode === 200) {
        console.log('✅ System health check passed');
        console.log(`   Response time: ${healthResponse.responseTime}ms`);
      } else {
        throw new Error(`Health check failed: ${healthResponse.statusCode}`);
      }
    } catch (error) {
      throw new Error(`Pre-test health check failed: ${error.message}`);
    }
  }

  /**
   * Initialize scenario weight distribution
   */
  initializeScenarioWeights() {
    let cumulativeWeight = 0;
    this.scenarioDistribution = [];

    for (const scenario of this.config.scenarios) {
      cumulativeWeight += scenario.weight;
      this.scenarioDistribution.push({
        ...scenario,
        cumulativeWeight,
      });
      
      // Initialize metrics tracking for scenario
      this.metrics.scenarioMetrics.set(scenario.name, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        responseTimes: [],
      });
    }
  }

  /**
   * Generate load with gradual ramp-up
   */
  async generateLoad() {
    console.log('📈 Starting load generation with gradual ramp-up...');
    
    const testDurationMs = this.config.testDurationMinutes * 60 * 1000;
    const rampUpMs = this.config.rampUpSeconds * 1000;
    const usersPerSecond = this.config.maxConcurrentUsers / this.config.rampUpSeconds;

    let currentUsers = 0;
    const userPromises = [];

    // Gradual ramp-up
    const rampUpInterval = setInterval(() => {
      if (currentUsers >= this.config.maxConcurrentUsers) {
        clearInterval(rampUpInterval);
        console.log(`🎯 Reached target load: ${this.config.maxConcurrentUsers} concurrent users`);
        return;
      }

      // Add users gradually
      const usersToAdd = Math.min(
        Math.ceil(usersPerSecond),
        this.config.maxConcurrentUsers - currentUsers
      );

      for (let i = 0; i < usersToAdd; i++) {
        const userId = currentUsers + i + 1;
        const userPromise = this.simulateUser(userId, testDurationMs);
        userPromises.push(userPromise);
      }

      currentUsers += usersToAdd;
      this.activeUsers = currentUsers;

      console.log(`⚡ Active users: ${currentUsers}/${this.config.maxConcurrentUsers}`);
    }, 1000); // Add users every second

    // Progress reporting
    const progressInterval = setInterval(() => {
      this.printProgressReport();
    }, 10000); // Every 10 seconds

    // Wait for test completion
    setTimeout(() => {
      clearInterval(progressInterval);
      console.log('\n⏰ Test duration completed, stopping load generation...');
    }, testDurationMs);

    // Wait for all users to complete (with extra time for cleanup)
    await new Promise(resolve => {
      setTimeout(resolve, testDurationMs + 30000); // Extra 30 seconds
    });

    this.metrics.endTime = Date.now();
    console.log('✅ Load test completed');
  }

  /**
   * Simulate a single user session
   */
  async simulateUser(userId, testDurationMs) {
    const startTime = Date.now();
    const endTime = startTime + testDurationMs;

    while (Date.now() < endTime) {
      try {
        // Select random scenario based on weights
        const scenario = this.selectRandomScenario();
        
        // Make request
        const response = await this.makeRequest(
          scenario.method,
          scenario.path,
          scenario.headers || {},
          scenario.body || ''
        );

        // Track metrics
        this.trackRequestMetrics(scenario.name, response);

        // Random delay between requests (1-5 seconds)
        const delay = Math.random() * 4000 + 1000;
        await this.sleep(delay);

      } catch (error) {
        this.trackError(error);
      }
    }
  }

  /**
   * Select random scenario based on weights
   */
  selectRandomScenario() {
    const random = Math.random() * 100; // Total weight is 100
    
    for (const scenario of this.scenarioDistribution) {
      if (random <= scenario.cumulativeWeight) {
        return scenario;
      }
    }
    
    // Fallback to first scenario
    return this.scenarioDistribution[0];
  }

  /**
   * Make HTTP request
   */
  async makeRequest(method, path, headers = {}, body = '') {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const url = new URL(path, this.config.baseUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'User-Agent': 'ProofKit-LoadTest/1.0',
          ...headers,
        },
        timeout: this.config.maxResponseTime,
      };

      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = performance.now() - startTime;
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime,
            success: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = performance.now() - startTime;
        reject({
          error,
          responseTime,
          type: 'connection_error',
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = performance.now() - startTime;
        reject({
          error: new Error('Request timeout'),
          responseTime,
          type: 'timeout',
        });
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Track request metrics
   */
  trackRequestMetrics(scenarioName, response) {
    // Global metrics
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += response.responseTime;
    this.metrics.responseTimes.push(response.responseTime);

    if (response.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
      const errorKey = `${response.statusCode}_error`;
      this.metrics.errors.set(errorKey, (this.metrics.errors.get(errorKey) || 0) + 1);
    }

    // Track status codes
    const statusCode = response.statusCode.toString();
    this.metrics.statusCodes.set(statusCode, (this.metrics.statusCodes.get(statusCode) || 0) + 1);

    // Scenario-specific metrics
    const scenarioMetrics = this.metrics.scenarioMetrics.get(scenarioName);
    if (scenarioMetrics) {
      scenarioMetrics.requests++;
      scenarioMetrics.totalResponseTime += response.responseTime;
      scenarioMetrics.avgResponseTime = scenarioMetrics.totalResponseTime / scenarioMetrics.requests;
      scenarioMetrics.responseTimes.push(response.responseTime);

      if (response.success) {
        scenarioMetrics.successes++;
      } else {
        scenarioMetrics.failures++;
      }
    }
  }

  /**
   * Track errors
   */
  trackError(error) {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;

    if (error.type === 'timeout') {
      this.metrics.timeouts++;
    } else if (error.type === 'connection_error') {
      this.metrics.connectionErrors++;
    }

    const errorKey = error.type || 'unknown_error';
    this.metrics.errors.set(errorKey, (this.metrics.errors.get(errorKey) || 0) + 1);
  }

  /**
   * Print progress report
   */
  printProgressReport() {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    const rps = this.metrics.totalRequests / elapsed;
    const successRate = (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(1);
    const avgResponseTime = (this.metrics.totalResponseTime / this.metrics.totalRequests).toFixed(0);

    console.log(`📊 Progress Report (${elapsed.toFixed(0)}s elapsed):`);
    console.log(`   Active Users: ${this.activeUsers}`);
    console.log(`   Total Requests: ${this.metrics.totalRequests}`);
    console.log(`   Requests/sec: ${rps.toFixed(1)}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Avg Response Time: ${avgResponseTime}ms`);
    console.log('');
  }

  /**
   * Calculate percentiles
   */
  calculatePercentiles(values, percentiles = [50, 90, 95, 99]) {
    if (!values.length) return {};
    
    const sorted = [...values].sort((a, b) => a - b);
    const result = {};
    
    percentiles.forEach(p => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });
    
    return result;
  }

  /**
   * Generate comprehensive final report
   */
  async generateFinalReport() {
    console.log('\n🎯 PERFORMANCE LOAD TEST RESULTS');
    console.log('=====================================');

    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const rps = this.metrics.totalRequests / duration;
    const successRate = (this.metrics.successfulRequests / this.metrics.totalRequests * 100);
    const errorRate = (this.metrics.failedRequests / this.metrics.totalRequests * 100);
    const avgResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    // Overall Performance Summary
    console.log('\n📈 OVERALL PERFORMANCE:');
    console.log(`   Test Duration: ${duration.toFixed(1)} seconds`);
    console.log(`   Total Requests: ${this.metrics.totalRequests.toLocaleString()}`);
    console.log(`   Successful Requests: ${this.metrics.successfulRequests.toLocaleString()}`);
    console.log(`   Failed Requests: ${this.metrics.failedRequests.toLocaleString()}`);
    console.log(`   Requests per Second: ${rps.toFixed(2)}`);
    console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`   Error Rate: ${errorRate.toFixed(2)}%`);

    // Response Time Analysis
    const percentiles = this.calculatePercentiles(this.metrics.responseTimes);
    console.log('\n⏱️  RESPONSE TIME ANALYSIS:');
    console.log(`   Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   Median (P50): ${percentiles.p50?.toFixed(0) || 0}ms`);
    console.log(`   90th Percentile: ${percentiles.p90?.toFixed(0) || 0}ms`);
    console.log(`   95th Percentile: ${percentiles.p95?.toFixed(0) || 0}ms`);
    console.log(`   99th Percentile: ${percentiles.p99?.toFixed(0) || 0}ms`);
    console.log(`   Min Response Time: ${Math.min(...this.metrics.responseTimes)?.toFixed(0) || 0}ms`);
    console.log(`   Max Response Time: ${Math.max(...this.metrics.responseTimes)?.toFixed(0) || 0}ms`);

    // Status Code Distribution
    console.log('\n📊 STATUS CODE DISTRIBUTION:');
    for (const [statusCode, count] of [...this.metrics.statusCodes.entries()].sort()) {
      const percentage = (count / this.metrics.totalRequests * 100).toFixed(1);
      console.log(`   ${statusCode}: ${count.toLocaleString()} requests (${percentage}%)`);
    }

    // Error Analysis
    if (this.metrics.errors.size > 0) {
      console.log('\n❌ ERROR ANALYSIS:');
      for (const [error, count] of [...this.metrics.errors.entries()].sort((a, b) => b[1] - a[1])) {
        const percentage = (count / this.metrics.totalRequests * 100).toFixed(1);
        console.log(`   ${error}: ${count.toLocaleString()} occurrences (${percentage}%)`);
      }
    }

    // Scenario Performance Breakdown
    console.log('\n🎭 SCENARIO PERFORMANCE:');
    for (const [scenarioName, metrics] of this.metrics.scenarioMetrics.entries()) {
      const scenarioSuccessRate = (metrics.successes / metrics.requests * 100).toFixed(1);
      const scenarioPercentiles = this.calculatePercentiles(metrics.responseTimes);
      
      console.log(`   ${scenarioName}:`);
      console.log(`     Requests: ${metrics.requests.toLocaleString()}`);
      console.log(`     Success Rate: ${scenarioSuccessRate}%`);
      console.log(`     Avg Response Time: ${metrics.avgResponseTime.toFixed(0)}ms`);
      console.log(`     95th Percentile: ${scenarioPercentiles.p95?.toFixed(0) || 0}ms`);
    }

    // Performance Validation
    console.log('\n✅ PERFORMANCE VALIDATION:');
    console.log('   Target Thresholds:');
    console.log(`     Max Response Time: ${this.config.maxResponseTime}ms`);
    console.log(`     Min Success Rate: ${this.config.minSuccessRate}%`);
    console.log(`     Max Error Rate: ${this.config.maxErrorRate}%`);
    console.log('   Results:');
    
    const responseTimePass = avgResponseTime <= this.config.maxResponseTime;
    const successRatePass = successRate >= this.config.minSuccessRate;
    const errorRatePass = errorRate <= this.config.maxErrorRate;
    const canHandle100Users = this.config.maxConcurrentUsers >= 100;

    console.log(`     Average Response Time: ${responseTimePass ? '✅' : '❌'} ${avgResponseTime.toFixed(0)}ms`);
    console.log(`     Success Rate: ${successRatePass ? '✅' : '❌'} ${successRate.toFixed(1)}%`);
    console.log(`     Error Rate: ${errorRatePass ? '✅' : '❌'} ${errorRate.toFixed(1)}%`);
    console.log(`     100+ Concurrent Users: ${canHandle100Users ? '✅' : '❌'} Tested with ${this.config.maxConcurrentUsers} users`);

    // Overall Assessment
    const allTestsPass = responseTimePass && successRatePass && errorRatePass && canHandle100Users;
    
    console.log('\n🏆 OVERALL ASSESSMENT:');
    if (allTestsPass) {
      console.log('   🎉 EXCELLENT! System passes all performance requirements');
      console.log('   ✅ Ready for production with 100+ concurrent users');
    } else {
      console.log('   ⚠️  ATTENTION: Some performance requirements not met');
      console.log('   🔧 Optimization needed before production deployment');
      
      // Specific recommendations
      if (!responseTimePass) {
        console.log('   📝 Recommendation: Optimize response times with caching and connection pooling');
      }
      if (!successRatePass) {
        console.log('   📝 Recommendation: Investigate error causes and improve error handling');
      }
      if (!errorRatePass) {
        console.log('   📝 Recommendation: Fix underlying issues causing high error rates');
      }
    }

    // Generate JSON report for further analysis
    const jsonReport = {
      timestamp: new Date().toISOString(),
      config: this.config,
      metrics: {
        duration,
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        requestsPerSecond: rps,
        successRate,
        errorRate,
        averageResponseTime: avgResponseTime,
        percentiles,
        statusCodes: Object.fromEntries(this.metrics.statusCodes),
        errors: Object.fromEntries(this.metrics.errors),
        scenarios: Object.fromEntries(this.metrics.scenarioMetrics),
      },
      validation: {
        responseTimePass,
        successRatePass,
        errorRatePass,
        canHandle100Users,
        overallPass: allTestsPass,
      }
    };

    // Save report to file
    const reportPath = `./load-test-report-${Date.now()}.json`;
    try {
      await import('fs').then(fs => {
        fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      });
    } catch (error) {
      console.log('⚠️  Could not save detailed report:', error.message);
    }

    process.exit(allTestsPass ? 0 : 1);
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run load test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const loadTester = new LoadTester();
  loadTester.startLoadTest().catch(console.error);
}

export default LoadTester;