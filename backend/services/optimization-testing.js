/**
 * Optimization Testing Framework for ProofKit SaaS
 *
 * Automated testing framework for optimization strategies, A/B testing,
 * performance validation, and safety testing
 *
 * Features:
 * - A/B testing for optimization strategies
 * - Performance baseline establishment
 * - Statistical significance testing
 * - Automated rollback on poor performance
 * - Strategy validation and safety checks
 * - Performance impact measurement
 * - Champion/challenger testing
 */

import dataStore from './data-store.js';
import logger from './logger.js';
import { getCampaignOptimizer } from './campaign-optimizer.js';

/**
 * Test Types
 */
const TEST_TYPES = {
  STRATEGY_COMPARISON: 'strategy_comparison',    // Compare optimization strategies
  BID_STRATEGY: 'bid_strategy',                 // Test different bidding approaches
  BUDGET_ALLOCATION: 'budget_allocation',       // Test budget distribution methods
  RULE_VALIDATION: 'rule_validation',          // Validate new optimization rules
  SAFETY_TEST: 'safety_test',                  // Test safety mechanisms
  PERFORMANCE_BASELINE: 'performance_baseline'  // Establish performance baselines
};

/**
 * Test Status
 */
const TEST_STATUS = {
  SETUP: 'setup',                    // Test being configured
  RUNNING: 'running',                // Test currently active
  PAUSED: 'paused',                  // Test temporarily paused
  COMPLETED: 'completed',            // Test finished successfully
  FAILED: 'failed',                  // Test failed or error occurred
  STOPPED: 'stopped',                // Test manually stopped
  ROLLBACK: 'rollback'               // Test caused rollback
};

/**
 * Statistical significance thresholds
 */
const SIGNIFICANCE_THRESHOLDS = {
  MIN_CONFIDENCE: 0.95,              // 95% confidence required
  MIN_SAMPLE_SIZE: 100,              // Minimum conversions per variant
  MIN_TEST_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days minimum
  MAX_TEST_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days maximum
  EARLY_STOPPING_LOSS: -0.20,       // Stop if 20% performance loss
  EARLY_STOPPING_WIN: 0.30          // Declare winner if 30% improvement
};

/**
 * Optimization Testing Framework
 */
export class OptimizationTesting {
  constructor() {
    this.activeTests = new Map();      // tenantId -> active tests
    this.testHistory = new Map();      // tenantId -> test history
    this.baselines = new Map();        // tenantId -> performance baselines
    this.campaignOptimizer = null;

    // Configuration
    this.config = {
      maxConcurrentTests: 3,
      defaultTestDuration: 14 * 24 * 60 * 60 * 1000, // 14 days
      enableAutoRollback: true,
      rollbackThreshold: -0.15,      // 15% performance loss triggers rollback
      enableEarlyStopping: true,
      monitoringInterval: 60 * 60 * 1000 // 1 hour
    };

    // Metrics
    this.metrics = {
      testsCreated: 0,
      testsCompleted: 0,
      testsFailed: 0,
      rollbacksTriggered: 0,
      strategiesValidated: 0,
      performanceImprovements: 0
    };

    // Start monitoring loop
    this.startMonitoring();

    console.log('Optimization Testing Framework initialized');
  }

  /**
   * Initialize the testing framework
   */
  async initialize() {
    try {
      this.campaignOptimizer = getCampaignOptimizer();
      await this.campaignOptimizer.initialize();

      logger.info('Optimization testing framework initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize optimization testing framework:', error);
      throw error;
    }
  }

  /**
   * Create a new A/B test for optimization strategies
   */
  async createStrategyTest(tenantId, testConfig) {
    try {
      // Validate test configuration
      this.validateTestConfig(testConfig);

      // Check concurrent test limits
      const activeTests = this.getActiveTests(tenantId);
      if (activeTests.length >= this.config.maxConcurrentTests) {
        throw new Error(`Maximum concurrent tests limit reached (${this.config.maxConcurrentTests})`);
      }

      // Establish baseline performance
      const baseline = await this.establishBaseline(tenantId);

      // Create test
      const test = {
        id: `test_${Date.now()}`,
        tenantId,
        type: testConfig.type,
        name: testConfig.name,
        description: testConfig.description,
        status: TEST_STATUS.SETUP,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        duration: testConfig.duration || this.config.defaultTestDuration,
        baseline,
        variants: testConfig.variants,
        trafficSplit: testConfig.trafficSplit || this.createEvenSplit(testConfig.variants.length),
        currentWinner: null,
        results: null,
        metadata: testConfig.metadata || {}
      };

      // Setup test variants
      await this.setupTestVariants(test);

      // Start the test
      test.status = TEST_STATUS.RUNNING;
      test.startedAt = new Date().toISOString();

      // Store test
      this.storeTest(tenantId, test);

      this.metrics.testsCreated++;

      logger.info('A/B test created', {
        tenantId,
        testId: test.id,
        type: test.type,
        variants: test.variants.length
      });

      return test;

    } catch (error) {
      logger.error('Failed to create strategy test', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Establish performance baseline for a tenant
   */
  async establishBaseline(tenantId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 days baseline

    try {
      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return null;
      }

      // Calculate baseline metrics
      const totals = metrics.reduce((acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
        cost: acc.cost + ((m.cost_micros || 0) / 1000000),
        conversions_value: acc.conversions_value + (m.conversions_value || 0)
      }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversions_value: 0 });

      const baseline = {
        period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        metrics: {
          totalImpressions: totals.impressions,
          totalClicks: totals.clicks,
          totalConversions: totals.conversions,
          totalCost: totals.cost,
          totalConversionsValue: totals.conversions_value,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
          cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
          roas: totals.cost > 0 ? totals.conversions_value / totals.cost : 0
        },
        establishedAt: new Date().toISOString()
      };

      // Store baseline
      this.baselines.set(tenantId, baseline);

      logger.info('Performance baseline established', {
        tenantId,
        baselineMetrics: baseline.metrics
      });

      return baseline;

    } catch (error) {
      logger.error('Failed to establish baseline', {
        tenantId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Setup test variants with different optimization strategies
   */
  async setupTestVariants(test) {
    try {
      for (let i = 0; i < test.variants.length; i++) {
        const variant = test.variants[i];

        // Validate variant configuration
        this.validateVariant(variant);

        // Setup variant-specific configurations
        variant.id = `variant_${i}`;
        variant.trafficPercentage = test.trafficSplit[i];
        variant.metrics = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          conversions_value: 0
        };
        variant.performance = null;
        variant.significance = null;

        // Store variant configuration in tenant config
        await this.storeVariantConfig(test.tenantId, test.id, variant);
      }

      logger.info('Test variants setup completed', {
        testId: test.id,
        variantCount: test.variants.length
      });

    } catch (error) {
      logger.error('Failed to setup test variants', {
        testId: test.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Monitor active tests for performance and significance
   */
  async monitorTests() {
    try {
      for (const [tenantId, tests] of this.activeTests) {
        const activeTests = tests.filter(t => t.status === TEST_STATUS.RUNNING);

        for (const test of activeTests) {
          await this.monitorSingleTest(tenantId, test);
        }
      }
    } catch (error) {
      logger.error('Error monitoring tests', { error: error.message });
    }
  }

  /**
   * Monitor a single test
   */
  async monitorSingleTest(tenantId, test) {
    try {
      // Collect current performance data
      const currentMetrics = await this.collectTestMetrics(tenantId, test);

      // Update test metrics
      this.updateTestMetrics(test, currentMetrics);

      // Check for statistical significance
      const significance = this.calculateStatisticalSignificance(test);

      // Check for early stopping conditions
      const earlyStop = this.checkEarlyStoppingConditions(test, significance);

      if (earlyStop.shouldStop) {
        await this.stopTest(tenantId, test, earlyStop.reason);
        return;
      }

      // Check if test duration is complete
      const testDuration = Date.now() - new Date(test.startedAt).getTime();
      if (testDuration >= test.duration) {
        await this.completeTest(tenantId, test);
        return;
      }

      // Check for rollback conditions
      if (this.config.enableAutoRollback) {
        const rollback = this.checkRollbackConditions(test);
        if (rollback.shouldRollback) {
          await this.triggerRollback(tenantId, test, rollback.reason);
          return;
        }
      }

      // Log test progress
      logger.info('Test progress updated', {
        tenantId,
        testId: test.id,
        duration: Math.round(testDuration / (24 * 60 * 60 * 1000)),
        significance: significance.maxSignificance
      });

    } catch (error) {
      logger.error('Failed to monitor test', {
        tenantId,
        testId: test.id,
        error: error.message
      });
    }
  }

  /**
   * Collect test metrics for all variants
   */
  async collectTestMetrics(tenantId, test) {
    const startDate = new Date(test.startedAt);
    const endDate = new Date();

    try {
      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      // Group metrics by variant based on campaign assignments
      const variantMetrics = {};

      for (const variant of test.variants) {
        variantMetrics[variant.id] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          conversions_value: 0
        };
      }

      // Assign metrics to variants based on campaign configuration
      // This would need to be implemented based on how campaigns are assigned to variants
      for (const metric of metrics) {
        const variantId = await this.getCampaignVariant(tenantId, test.id, metric.campaign_id);

        if (variantId && variantMetrics[variantId]) {
          variantMetrics[variantId].impressions += metric.impressions || 0;
          variantMetrics[variantId].clicks += metric.clicks || 0;
          variantMetrics[variantId].conversions += metric.conversions || 0;
          variantMetrics[variantId].cost += (metric.cost_micros || 0) / 1000000;
          variantMetrics[variantId].conversions_value += metric.conversions_value || 0;
        }
      }

      return variantMetrics;

    } catch (error) {
      logger.error('Failed to collect test metrics', {
        tenantId,
        testId: test.id,
        error: error.message
      });
      return {};
    }
  }

  /**
   * Calculate statistical significance between variants
   */
  calculateStatisticalSignificance(test) {
    if (!test.variants || test.variants.length < 2) {
      return { maxSignificance: 0, significantWinner: null };
    }

    let maxSignificance = 0;
    let significantWinner = null;

    // Compare each variant against the control (first variant)
    const control = test.variants[0];

    for (let i = 1; i < test.variants.length; i++) {
      const variant = test.variants[i];

      // Check minimum sample size
      if (control.metrics.conversions < SIGNIFICANCE_THRESHOLDS.MIN_SAMPLE_SIZE ||
          variant.metrics.conversions < SIGNIFICANCE_THRESHOLDS.MIN_SAMPLE_SIZE) {
        continue;
      }

      // Calculate conversion rates
      const controlRate = control.metrics.clicks > 0
        ? control.metrics.conversions / control.metrics.clicks
        : 0;
      const variantRate = variant.metrics.clicks > 0
        ? variant.metrics.conversions / variant.metrics.clicks
        : 0;

      // Simple significance test (would use proper statistical test in production)
      const improvement = controlRate > 0 ? (variantRate - controlRate) / controlRate : 0;
      const significance = Math.min(0.99, Math.abs(improvement) * 2); // Simplified

      if (significance > maxSignificance) {
        maxSignificance = significance;
        significantWinner = improvement > 0 ? variant : control;
      }
    }

    return {
      maxSignificance,
      significantWinner,
      isSignificant: maxSignificance >= SIGNIFICANCE_THRESHOLDS.MIN_CONFIDENCE
    };
  }

  /**
   * Check early stopping conditions
   */
  checkEarlyStoppingConditions(test, significance) {
    if (!this.config.enableEarlyStopping) {
      return { shouldStop: false };
    }

    // Check for significant winner
    if (significance.isSignificant && significance.significantWinner) {
      const control = test.variants[0];
      const winner = significance.significantWinner;

      const controlRate = control.metrics.clicks > 0
        ? control.metrics.conversions / control.metrics.clicks
        : 0;
      const winnerRate = winner.metrics.clicks > 0
        ? winner.metrics.conversions / winner.metrics.clicks
        : 0;

      const improvement = controlRate > 0 ? (winnerRate - controlRate) / controlRate : 0;

      if (improvement >= SIGNIFICANCE_THRESHOLDS.EARLY_STOPPING_WIN) {
        return {
          shouldStop: true,
          reason: 'early_winner',
          winner: winner,
          improvement
        };
      }

      if (improvement <= SIGNIFICANCE_THRESHOLDS.EARLY_STOPPING_LOSS) {
        return {
          shouldStop: true,
          reason: 'early_loss_prevention',
          loser: winner,
          decline: Math.abs(improvement)
        };
      }
    }

    return { shouldStop: false };
  }

  /**
   * Check rollback conditions
   */
  checkRollbackConditions(test) {
    if (!test.baseline) {
      return { shouldRollback: false };
    }

    // Calculate overall test performance vs baseline
    const totalMetrics = test.variants.reduce((acc, variant) => ({
      impressions: acc.impressions + variant.metrics.impressions,
      clicks: acc.clicks + variant.metrics.clicks,
      conversions: acc.conversions + variant.metrics.conversions,
      cost: acc.cost + variant.metrics.cost,
      conversions_value: acc.conversions_value + variant.metrics.conversions_value
    }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversions_value: 0 });

    if (totalMetrics.clicks === 0 || totalMetrics.cost === 0) {
      return { shouldRollback: false };
    }

    const currentConversionRate = totalMetrics.conversions / totalMetrics.clicks;
    const currentRoas = totalMetrics.conversions_value / totalMetrics.cost;

    const baselineConversionRate = test.baseline.metrics.conversionRate / 100;
    const baselineRoas = test.baseline.metrics.roas;

    // Check for significant performance decline
    const conversionRateDecline = baselineConversionRate > 0
      ? (currentConversionRate - baselineConversionRate) / baselineConversionRate
      : 0;

    const roasDecline = baselineRoas > 0
      ? (currentRoas - baselineRoas) / baselineRoas
      : 0;

    if (conversionRateDecline <= this.config.rollbackThreshold ||
        roasDecline <= this.config.rollbackThreshold) {
      return {
        shouldRollback: true,
        reason: 'performance_decline',
        conversionRateDecline,
        roasDecline
      };
    }

    return { shouldRollback: false };
  }

  /**
   * Complete a test and apply winning strategy
   */
  async completeTest(tenantId, test) {
    try {
      const significance = this.calculateStatisticalSignificance(test);

      test.status = TEST_STATUS.COMPLETED;
      test.completedAt = new Date().toISOString();
      test.results = {
        significance,
        winner: significance.significantWinner,
        finalMetrics: test.variants.map(v => ({
          variantId: v.id,
          name: v.name,
          metrics: v.metrics,
          performance: this.calculateVariantPerformance(v)
        }))
      };

      // Apply winning strategy if significant
      if (significance.isSignificant && significance.significantWinner) {
        await this.applyWinningStrategy(tenantId, test, significance.significantWinner);
        this.metrics.performanceImprovements++;
      }

      this.metrics.testsCompleted++;
      this.metrics.strategiesValidated++;

      logger.info('Test completed', {
        tenantId,
        testId: test.id,
        duration: Date.now() - new Date(test.startedAt).getTime(),
        significant: significance.isSignificant,
        winner: significance.significantWinner?.name
      });

      // Move test to history
      this.moveTestToHistory(tenantId, test);

    } catch (error) {
      logger.error('Failed to complete test', {
        tenantId,
        testId: test.id,
        error: error.message
      });
      test.status = TEST_STATUS.FAILED;
      this.metrics.testsFailed++;
    }
  }

  /**
   * Trigger rollback for a test
   */
  async triggerRollback(tenantId, test, reason) {
    try {
      test.status = TEST_STATUS.ROLLBACK;
      test.completedAt = new Date().toISOString();
      test.rollbackReason = reason;

      // Implement rollback logic - restore to baseline configuration
      await this.executeRollback(tenantId, test);

      this.metrics.rollbacksTriggered++;

      logger.warn('Test rollback triggered', {
        tenantId,
        testId: test.id,
        reason: reason
      });

      // Move test to history
      this.moveTestToHistory(tenantId, test);

    } catch (error) {
      logger.error('Failed to execute rollback', {
        tenantId,
        testId: test.id,
        error: error.message
      });
    }
  }

  /**
   * Apply winning strategy to all campaigns
   */
  async applyWinningStrategy(tenantId, test, winner) {
    try {
      logger.info('Applying winning strategy', {
        tenantId,
        testId: test.id,
        winner: winner.name
      });

      // This would apply the winning optimization strategy
      // to all campaigns for the tenant

      // Store winning strategy as default for tenant
      await dataStore.setTenantConfig(tenantId, `winning_strategy_${test.type}`, {
        strategy: winner.strategy,
        testId: test.id,
        appliedAt: new Date().toISOString(),
        performance: this.calculateVariantPerformance(winner)
      });

    } catch (error) {
      logger.error('Failed to apply winning strategy', {
        tenantId,
        testId: test.id,
        error: error.message
      });
    }
  }

  /**
   * Validation methods
   */

  validateTestConfig(config) {
    if (!config.type || !Object.values(TEST_TYPES).includes(config.type)) {
      throw new Error('Invalid test type');
    }

    if (!config.variants || config.variants.length < 2) {
      throw new Error('At least 2 variants required');
    }

    if (config.variants.length > 5) {
      throw new Error('Maximum 5 variants allowed');
    }
  }

  validateVariant(variant) {
    if (!variant.name) {
      throw new Error('Variant name required');
    }

    if (!variant.strategy) {
      throw new Error('Variant strategy required');
    }
  }

  /**
   * Helper methods
   */

  createEvenSplit(variantCount) {
    const percentage = Math.floor(100 / variantCount);
    const split = new Array(variantCount).fill(percentage);

    // Handle remainder
    const remainder = 100 - (percentage * variantCount);
    for (let i = 0; i < remainder; i++) {
      split[i]++;
    }

    return split;
  }

  storeTest(tenantId, test) {
    if (!this.activeTests.has(tenantId)) {
      this.activeTests.set(tenantId, []);
    }
    this.activeTests.get(tenantId).push(test);
  }

  getActiveTests(tenantId) {
    return this.activeTests.get(tenantId) || [];
  }

  moveTestToHistory(tenantId, test) {
    // Remove from active tests
    const activeTests = this.activeTests.get(tenantId) || [];
    const index = activeTests.findIndex(t => t.id === test.id);
    if (index > -1) {
      activeTests.splice(index, 1);
    }

    // Add to history
    if (!this.testHistory.has(tenantId)) {
      this.testHistory.set(tenantId, []);
    }
    this.testHistory.get(tenantId).push(test);

    // Keep only last 100 tests in history
    const history = this.testHistory.get(tenantId);
    if (history.length > 100) {
      history.shift();
    }
  }

  updateTestMetrics(test, currentMetrics) {
    for (const variant of test.variants) {
      if (currentMetrics[variant.id]) {
        variant.metrics = currentMetrics[variant.id];
      }
    }
  }

  calculateVariantPerformance(variant) {
    const metrics = variant.metrics;
    return {
      ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
      conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0,
      cpa: metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0,
      roas: metrics.cost > 0 ? metrics.conversions_value / metrics.cost : 0
    };
  }

  async storeVariantConfig(tenantId, testId, variant) {
    // Store variant configuration for campaign assignment
    const key = `test_${testId}_variant_${variant.id}`;
    await dataStore.setTenantConfig(tenantId, key, variant);
  }

  async getCampaignVariant(tenantId, testId, campaignId) {
    // This would return which variant a campaign is assigned to
    // For now, return a mock assignment
    return `variant_${Math.floor(Math.random() * 2)}`;
  }

  async executeRollback(tenantId, test) {
    // Implement rollback to baseline configuration
    logger.info('Executing rollback to baseline', {
      tenantId,
      testId: test.id
    });
  }

  /**
   * Start monitoring loop
   */
  startMonitoring() {
    setInterval(() => {
      this.monitorTests().catch(error => {
        logger.error('Error in monitoring loop', { error: error.message });
      });
    }, this.config.monitoringInterval);
  }

  /**
   * Public API methods
   */

  async stopTest(tenantId, testId, reason = 'manual_stop') {
    const activeTests = this.getActiveTests(tenantId);
    const test = activeTests.find(t => t.id === testId);

    if (!test) {
      throw new Error('Test not found');
    }

    test.status = TEST_STATUS.STOPPED;
    test.completedAt = new Date().toISOString();
    test.stopReason = reason;

    this.moveTestToHistory(tenantId, test);

    logger.info('Test stopped', { tenantId, testId, reason });
  }

  getTestResults(tenantId, testId) {
    const activeTests = this.getActiveTests(tenantId);
    const historyTests = this.testHistory.get(tenantId) || [];

    return activeTests.find(t => t.id === testId) ||
           historyTests.find(t => t.id === testId);
  }

  getTestHistory(tenantId) {
    return this.testHistory.get(tenantId) || [];
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Singleton instance
let optimizationTestingInstance = null;

/**
 * Get singleton optimization testing instance
 */
export function getOptimizationTesting() {
  if (!optimizationTestingInstance) {
    optimizationTestingInstance = new OptimizationTesting();
  }
  return optimizationTestingInstance;
}

export default getOptimizationTesting;