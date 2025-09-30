/**
 * Test Suite for Worker Infrastructure
 * Demonstrates and tests the complete worker pool, queue manager, and job monitoring system
 */

import { createWorkerPool } from './services/worker-pool.js';
import { createQueueManager, JOB_TYPES, JOB_PRIORITIES } from './services/queue-manager.js';
import { createJobMonitor } from './services/job-monitor.js';
import { initializeDatabase } from './services/database-init.js';
import logger from './services/logger.js';

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  testTenants: [
    { id: 'tenant_starter_1', tier: 'starter' },
    { id: 'tenant_pro_1', tier: 'pro' },
    { id: 'tenant_enterprise_1', tier: 'enterprise' }
  ],
  jobCounts: {
    starter: 5,
    pro: 15,
    enterprise: 30
  },
  testDuration: 60000, // 1 minute
  enableRealTimeMonitoring: true
};

/**
 * Test Results Storage
 */
let testResults = {
  startTime: null,
  endTime: null,
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  averageProcessingTime: 0,
  workerStats: {},
  queueStats: {},
  monitoringStats: {},
  errors: []
};

/**
 * Main Test Runner
 */
class WorkerInfrastructureTest {
  constructor() {
    this.jobMonitor = null;
    this.queueManager = null;
    this.workerPool = null;
    this.isRunning = false;
    this.testJobs = [];
  }

  /**
   * Initialize test environment
   */
  async setup() {
    try {
      logger.info('Setting up worker infrastructure test environment');

      // Initialize database
      await initializeDatabase();

      // Create components
      this.jobMonitor = createJobMonitor();
      this.queueManager = createQueueManager();
      this.workerPool = createWorkerPool(this.jobMonitor);

      // Set up event listeners
      this.setupEventListeners();

      // Start processing
      this.queueManager.startProcessing();

      logger.info('Test environment setup completed');

    } catch (error) {
      logger.error('Test setup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Set up event listeners for monitoring
   */
  setupEventListeners() {
    // Queue manager events
    this.queueManager.on('jobQueued', ({ job }) => {
      logger.debug('Job queued in test', { jobId: job.id, type: job.type });
    });

    this.queueManager.on('jobDequeued', async ({ job, tier }) => {
      logger.debug('Job dequeued in test', { jobId: job.id, tier });
      await this.executeTestJob(job, tier);
    });

    // Worker pool events
    this.workerPool.on('jobCompleted', ({ job, result, duration }) => {
      testResults.completedJobs++;
      testResults.averageProcessingTime =
        (testResults.averageProcessingTime * (testResults.completedJobs - 1) + duration) /
        testResults.completedJobs;

      logger.info('Test job completed', {
        jobId: job.id,
        duration,
        completedJobs: testResults.completedJobs
      });
    });

    this.workerPool.on('jobFailed', ({ job, error }) => {
      testResults.failedJobs++;
      testResults.errors.push({
        jobId: job.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error('Test job failed', { jobId: job.id, error: error.message });
    });

    // Job monitor events
    this.jobMonitor.on('alert', (alert) => {
      logger.warn('Test alert generated', alert);
    });

    this.jobMonitor.on('metricsCollected', (metrics) => {
      if (TEST_CONFIG.enableRealTimeMonitoring) {
        logger.info('Test metrics', {
          activeJobs: metrics.activeJobs,
          jobsPerMinute: metrics.jobsPerMinute,
          errorRate: metrics.errorRate
        });
      }
    });
  }

  /**
   * Execute a test job with the worker pool
   */
  async executeTestJob(job, tier) {
    try {
      const result = await this.workerPool.executeJob(job);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;

    } catch (error) {
      logger.error('Test job execution failed', {
        jobId: job.id,
        tier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate test jobs for different tiers
   */
  generateTestJobs() {
    const jobs = [];

    for (const tenant of TEST_CONFIG.testTenants) {
      const jobCount = TEST_CONFIG.jobCounts[tenant.tier];

      for (let i = 0; i < jobCount; i++) {
        const jobTypes = Object.values(JOB_TYPES);
        const randomType = jobTypes[Math.floor(Math.random() * jobTypes.length)];

        const job = {
          type: randomType,
          tenantId: tenant.id,
          data: this.generateJobData(randomType, i),
          priority: this.getRandomPriority(),
          metadata: {
            testJob: true,
            testIndex: i,
            tier: tenant.tier,
            generatedAt: new Date().toISOString()
          }
        };

        jobs.push(job);
      }
    }

    // Shuffle jobs to simulate realistic load
    return this.shuffleArray(jobs);
  }

  /**
   * Generate job-specific data
   */
  generateJobData(type, index) {
    const baseData = {
      testIndex: index,
      timestamp: new Date().toISOString()
    };

    switch (type) {
      case JOB_TYPES.OPTIMIZATION:
        return {
          ...baseData,
          type: 'performance',
          metrics: ['page_speed', 'bundle_size', 'cache_efficiency']
        };

      case JOB_TYPES.ANALYSIS:
        return {
          ...baseData,
          type: 'traffic',
          timeframe: '24h',
          metrics: ['page_views', 'unique_visitors', 'bounce_rate']
        };

      case JOB_TYPES.REPORTING:
        return {
          ...baseData,
          type: 'weekly',
          format: 'pdf',
          sections: ['summary', 'metrics', 'recommendations']
        };

      case JOB_TYPES.ANOMALY_DETECTION:
        return {
          ...baseData,
          timeframe: '1h',
          thresholds: { traffic_spike: 2.0, error_rate: 0.05 }
        };

      case JOB_TYPES.WEEKLY_SUMMARY:
        return {
          ...baseData,
          generateAI: true,
          includeCharts: true
        };

      default:
        return baseData;
    }
  }

  /**
   * Get random job priority
   */
  getRandomPriority() {
    const priorities = Object.values(JOB_PRIORITIES);
    const weights = [0.1, 0.5, 0.3, 0.08, 0.02]; // LOW, NORMAL, HIGH, URGENT, CRITICAL

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return priorities[i];
      }
    }

    return JOB_PRIORITIES.NORMAL;
  }

  /**
   * Shuffle array utility
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Run the complete test suite
   */
  async runTest() {
    try {
      logger.info('Starting worker infrastructure test', TEST_CONFIG);

      testResults.startTime = new Date();
      this.isRunning = true;

      // Generate test jobs
      this.testJobs = this.generateTestJobs();
      testResults.totalJobs = this.testJobs.length;

      logger.info('Generated test jobs', {
        totalJobs: this.testJobs.length,
        byTier: TEST_CONFIG.jobCounts
      });

      // Queue all jobs
      const queuePromises = this.testJobs.map(async (jobData) => {
        try {
          const job = await this.queueManager.addJob(jobData);
          return job;
        } catch (error) {
          logger.error('Failed to queue test job', {
            jobData,
            error: error.message
          });
          testResults.errors.push({
            phase: 'queuing',
            jobData,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          return null;
        }
      });

      const queuedJobs = await Promise.allSettled(queuePromises);
      const successfullyQueued = queuedJobs.filter(r => r.status === 'fulfilled' && r.value).length;

      logger.info('Jobs queued', {
        attempted: this.testJobs.length,
        successful: successfullyQueued,
        failed: this.testJobs.length - successfullyQueued
      });

      // Wait for test duration or all jobs to complete
      await this.waitForTestCompletion();

      // Collect final results
      await this.collectFinalResults();

      testResults.endTime = new Date();
      this.isRunning = false;

      // Generate test report
      const report = this.generateTestReport();

      logger.info('Worker infrastructure test completed', report);

      return report;

    } catch (error) {
      logger.error('Test execution failed', { error: error.message });
      testResults.errors.push({
        phase: 'execution',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Wait for test completion
   */
  async waitForTestCompletion() {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (this.isRunning && (Date.now() - startTime) < TEST_CONFIG.testDuration) {
      // Check if all jobs are completed
      const totalProcessed = testResults.completedJobs + testResults.failedJobs;

      if (totalProcessed >= testResults.totalJobs) {
        logger.info('All test jobs processed, completing test early');
        break;
      }

      // Log progress
      const elapsed = Date.now() - startTime;
      const progress = (totalProcessed / testResults.totalJobs * 100).toFixed(1);

      logger.info('Test progress', {
        elapsed: Math.round(elapsed / 1000),
        maxDuration: Math.round(TEST_CONFIG.testDuration / 1000),
        progress: `${progress}%`,
        completed: testResults.completedJobs,
        failed: testResults.failedJobs,
        total: testResults.totalJobs
      });

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  /**
   * Collect final test results
   */
  async collectFinalResults() {
    try {
      // Worker pool stats
      testResults.workerStats = this.workerPool.getStats();

      // Queue manager stats
      testResults.queueStats = this.queueManager.getStats();

      // Job monitor stats
      testResults.monitoringStats = this.jobMonitor.getJobStats('1h');

    } catch (error) {
      logger.error('Failed to collect final results', { error: error.message });
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    const duration = testResults.endTime - testResults.startTime;
    const successRate = testResults.totalJobs > 0
      ? (testResults.completedJobs / testResults.totalJobs * 100).toFixed(2)
      : 0;

    const report = {
      summary: {
        duration: Math.round(duration / 1000),
        totalJobs: testResults.totalJobs,
        completedJobs: testResults.completedJobs,
        failedJobs: testResults.failedJobs,
        successRate: `${successRate}%`,
        averageProcessingTime: Math.round(testResults.averageProcessingTime),
        jobsPerSecond: testResults.totalJobs > 0
          ? (testResults.completedJobs / (duration / 1000)).toFixed(2)
          : 0
      },
      infrastructure: {
        workerPool: {
          totalWorkers: testResults.workerStats.totalWorkers,
          workersByTier: testResults.workerStats.workersByTier,
          totalJobsProcessed: testResults.workerStats.totalJobsProcessed,
          totalErrors: testResults.workerStats.totalErrors,
          avgProcessingTime: testResults.workerStats.avgProcessingTime
        },
        queueManager: {
          totalJobsQueued: testResults.queueStats.metrics?.totalJobsQueued || 0,
          totalJobsProcessed: testResults.queueStats.metrics?.totalJobsProcessed || 0,
          totalJobsFailed: testResults.queueStats.metrics?.totalJobsFailed || 0,
          queueSizes: testResults.queueStats.queueSizes || {},
          isProcessing: testResults.queueStats.isProcessing
        },
        monitoring: {
          activeJobs: testResults.monitoringStats.activeJobs || 0,
          currentMetrics: testResults.monitoringStats.currentMetrics || {},
          jobsByType: testResults.monitoringStats.jobsByType || {},
          jobsByTenant: testResults.monitoringStats.jobsByTenant || {}
        }
      },
      errors: testResults.errors,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const successRate = testResults.totalJobs > 0
      ? (testResults.completedJobs / testResults.totalJobs)
      : 0;

    if (successRate < 0.95) {
      recommendations.push('Consider increasing worker pool size or improving error handling');
    }

    if (testResults.averageProcessingTime > 5000) {
      recommendations.push('Average processing time is high, consider optimizing job execution');
    }

    if (testResults.errors.length > testResults.totalJobs * 0.1) {
      recommendations.push('High error rate detected, review error logs for common issues');
    }

    const queueBacklog = Object.values(testResults.queueStats.queueSizes || {})
      .reduce((sum, size) => sum + size, 0);

    if (queueBacklog > 50) {
      recommendations.push('Queue backlog detected, consider scaling worker pools');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal');
    }

    return recommendations;
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    try {
      logger.info('Cleaning up test environment');

      this.isRunning = false;

      if (this.queueManager) {
        this.queueManager.stopProcessing();
        await this.queueManager.shutdown();
      }

      if (this.workerPool) {
        await this.workerPool.shutdown();
      }

      if (this.jobMonitor) {
        await this.jobMonitor.shutdown();
      }

      logger.info('Test cleanup completed');

    } catch (error) {
      logger.error('Test cleanup failed', { error: error.message });
    }
  }

  /**
   * Run health check on all components
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      components: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Worker pool health
      if (this.workerPool) {
        health.components.workerPool = await this.workerPool.healthCheck();
      }

      // Queue manager health
      if (this.queueManager) {
        health.components.queueManager = {
          status: this.queueManager.isProcessing ? 'healthy' : 'stopped',
          stats: this.queueManager.getStats()
        };
      }

      // Job monitor health
      if (this.jobMonitor) {
        health.components.jobMonitor = this.jobMonitor.healthCheck();
      }

      // Check if any component is unhealthy
      const unhealthyComponents = Object.values(health.components)
        .filter(comp => comp.status !== 'healthy');

      if (unhealthyComponents.length > 0) {
        health.overall = 'degraded';
      }

    } catch (error) {
      health.overall = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

/**
 * Run test if this file is executed directly
 */
async function runWorkerInfrastructureTest() {
  const test = new WorkerInfrastructureTest();

  try {
    // Setup
    await test.setup();

    // Health check before test
    const preTestHealth = await test.healthCheck();
    logger.info('Pre-test health check', preTestHealth);

    // Run test
    const report = await test.runTest();

    // Health check after test
    const postTestHealth = await test.healthCheck();
    logger.info('Post-test health check', postTestHealth);

    // Display results
    console.log('\n=== WORKER INFRASTRUCTURE TEST RESULTS ===\n');
    console.log('Summary:');
    console.log(`  Duration: ${report.summary.duration}s`);
    console.log(`  Total Jobs: ${report.summary.totalJobs}`);
    console.log(`  Completed: ${report.summary.completedJobs}`);
    console.log(`  Failed: ${report.summary.failedJobs}`);
    console.log(`  Success Rate: ${report.summary.successRate}`);
    console.log(`  Avg Processing Time: ${report.summary.averageProcessingTime}ms`);
    console.log(`  Jobs/Second: ${report.summary.jobsPerSecond}`);

    console.log('\nRecommendations:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));

    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err.error} (${err.timestamp})`);
      });
      if (report.errors.length > 5) {
        console.log(`  ... and ${report.errors.length - 5} more errors`);
      }
    }

    return report;

  } catch (error) {
    logger.error('Test failed', { error: error.message });
    throw error;
  } finally {
    await test.cleanup();
  }
}

// Export for use as module
export {
  WorkerInfrastructureTest,
  runWorkerInfrastructureTest,
  TEST_CONFIG
};

// Run test if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorkerInfrastructureTest()
    .then(() => {
      logger.info('Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Test failed', { error: error.message });
      process.exit(1);
    });
}