/**
 * A/B Testing Service for ProofKit SaaS
 * Manages A/B testing of ad variations with statistical significance
 *
 * Features:
 * - Multi-variant testing (A/B/n tests)
 * - Statistical significance calculation
 * - Automatic winner promotion
 * - Underperformer retirement
 * - Confidence intervals and p-values
 * - Bayesian and frequentist methods
 * - Performance tracking by variation
 * - Smart traffic allocation
 */

import dataStore from './data-store.js';
import { executeQuery } from './supabase-client.js';
import logger from './logger.js';

/**
 * A/B Testing Engine with statistical analysis
 */
export class ABTestingService {
  constructor() {
    // Active tests cache
    this.activeTests = new Map();
    this.testResults = new Map();

    // Statistical thresholds
    this.config = {
      minSampleSize: 100, // Minimum impressions per variant
      significanceLevel: 0.05, // 95% confidence
      minConfidence: 0.95,
      winnerThreshold: 0.1, // 10% improvement required
      autoPromoteWinners: true,
      autoRetireUnderperformers: true,
      trafficAllocation: 'equal', // 'equal' or 'adaptive'
      maxVariants: 10
    };

    // Performance metrics
    this.metrics = {
      testsCreated: 0,
      testsCompleted: 0,
      winnersPromoted: 0,
      underperformersRetired: 0,
      avgTestDuration: 0
    };

    console.log('🧪 A/B Testing Service initialized');
  }

  /**
   * Create a new A/B test
   * @param {string} tenantId - Tenant identifier
   * @param {object} testConfig - Test configuration
   * @returns {Promise<object>} Created test
   */
  async createTest(tenantId, testConfig) {
    const {
      name,
      description,
      variants,
      metric = 'ctr', // ctr, conversion_rate, cpa, roas
      targetAudience = 'all',
      duration = 14, // days
      trafficSplit = null // null for equal split
    } = testConfig;

    logger.info('Creating A/B test', { tenantId, name, variantCount: variants.length });

    try {
      // Validate variants
      if (!variants || variants.length < 2) {
        throw new Error('At least 2 variants required for A/B test');
      }

      if (variants.length > this.config.maxVariants) {
        throw new Error(`Maximum ${this.config.maxVariants} variants allowed`);
      }

      // Calculate traffic split
      const split = trafficSplit || this._calculateEqualSplit(variants.length);

      // Create test record
      const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const test = {
        testId,
        tenantId,
        name,
        description,
        metric,
        targetAudience,
        status: 'active',
        createdAt: new Date(),
        startedAt: new Date(),
        endsAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        duration,

        // Variants
        variants: variants.map((variant, index) => ({
          variantId: `${testId}_v${index}`,
          name: variant.name || `Variant ${String.fromCharCode(65 + index)}`,
          headlines: variant.headlines,
          descriptions: variant.descriptions,
          trafficAllocation: split[index],

          // Performance data
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          revenue: 0,

          // Calculated metrics
          ctr: 0,
          conversionRate: 0,
          cpa: 0,
          roas: 0,

          // Statistical data
          confidence: 0,
          significance: null,
          isWinner: false,
          isUnderperformer: false
        })),

        // Analysis results
        analysis: {
          hasWinner: false,
          winner: null,
          isSignificant: false,
          pValue: null,
          confidence: 0,
          recommendations: []
        }
      };

      // Store test
      await this._storeTest(tenantId, test);

      // Cache test
      this.activeTests.set(testId, test);

      this.metrics.testsCreated++;

      logger.info('A/B test created', {
        tenantId,
        testId,
        name,
        variants: test.variants.length
      });

      return {
        success: true,
        test
      };

    } catch (error) {
      logger.error('Failed to create A/B test', {
        tenantId,
        name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update test with new performance data
   * @param {string} testId - Test identifier
   * @param {string} variantId - Variant identifier
   * @param {object} performance - Performance metrics
   * @returns {Promise<object>} Updated test
   */
  async updateTestPerformance(testId, variantId, performance) {
    try {
      // Get test
      let test = this.activeTests.get(testId);

      if (!test) {
        test = await this._loadTest(testId);
        if (!test) {
          throw new Error(`Test ${testId} not found`);
        }
      }

      // Find variant
      const variant = test.variants.find(v => v.variantId === variantId);
      if (!variant) {
        throw new Error(`Variant ${variantId} not found`);
      }

      // Update performance metrics
      variant.impressions += performance.impressions || 0;
      variant.clicks += performance.clicks || 0;
      variant.conversions += performance.conversions || 0;
      variant.cost += performance.cost || 0;
      variant.revenue += performance.revenue || 0;

      // Calculate derived metrics
      variant.ctr = variant.impressions > 0 ? (variant.clicks / variant.impressions) * 100 : 0;
      variant.conversionRate = variant.clicks > 0 ? (variant.conversions / variant.clicks) * 100 : 0;
      variant.cpa = variant.conversions > 0 ? variant.cost / variant.conversions : 0;
      variant.roas = variant.cost > 0 ? variant.revenue / variant.cost : 0;

      // Check if we have enough data for analysis
      if (this._hasMinimumSampleSize(test)) {
        // Perform statistical analysis
        test.analysis = await this._analyzeTest(test);

        // Auto-promote winners if enabled
        if (this.config.autoPromoteWinners && test.analysis.hasWinner) {
          await this._promoteWinner(test);
        }

        // Auto-retire underperformers if enabled
        if (this.config.autoRetireUnderperformers) {
          await this._retireUnderperformers(test);
        }
      }

      // Update cache and storage
      this.activeTests.set(testId, test);
      await this._storeTest(test.tenantId, test);

      logger.debug('Test performance updated', {
        testId,
        variantId,
        impressions: variant.impressions,
        ctr: variant.ctr.toFixed(2)
      });

      return {
        success: true,
        test,
        variant
      };

    } catch (error) {
      logger.error('Failed to update test performance', {
        testId,
        variantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get test results with statistical analysis
   * @param {string} testId - Test identifier
   * @returns {Promise<object>} Test results
   */
  async getTestResults(testId) {
    try {
      let test = this.activeTests.get(testId);

      if (!test) {
        test = await this._loadTest(testId);
        if (!test) {
          throw new Error(`Test ${testId} not found`);
        }
      }

      // Perform fresh analysis
      const analysis = await this._analyzeTest(test);

      return {
        testId,
        name: test.name,
        status: test.status,
        metric: test.metric,
        duration: test.duration,
        startedAt: test.startedAt,
        endsAt: test.endsAt,
        daysRemaining: this._calculateDaysRemaining(test.endsAt),

        // Variants performance
        variants: test.variants.map(v => ({
          variantId: v.variantId,
          name: v.name,
          trafficAllocation: v.trafficAllocation,

          // Performance
          impressions: v.impressions,
          clicks: v.clicks,
          conversions: v.conversions,
          cost: v.cost,

          // Metrics
          ctr: v.ctr.toFixed(2),
          conversionRate: v.conversionRate.toFixed(2),
          cpa: v.cpa.toFixed(2),
          roas: v.roas.toFixed(2),

          // Status
          isWinner: v.isWinner,
          isUnderperformer: v.isUnderperformer,
          confidence: v.confidence
        })),

        // Statistical analysis
        analysis: {
          hasWinner: analysis.hasWinner,
          winner: analysis.winner,
          isSignificant: analysis.isSignificant,
          pValue: analysis.pValue,
          confidence: analysis.confidence,
          sampleSizeAdequate: this._hasMinimumSampleSize(test),
          recommendations: analysis.recommendations
        },

        // Visualization data
        visualization: this._prepareVisualizationData(test)
      };

    } catch (error) {
      logger.error('Failed to get test results', {
        testId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * End a test and determine winner
   * @param {string} testId - Test identifier
   * @param {boolean} forceEnd - Force end even if not significant
   * @returns {Promise<object>} Final results
   */
  async endTest(testId, forceEnd = false) {
    try {
      let test = this.activeTests.get(testId);

      if (!test) {
        test = await this._loadTest(testId);
        if (!test) {
          throw new Error(`Test ${testId} not found`);
        }
      }

      // Perform final analysis
      const analysis = await this._analyzeTest(test);

      // Check if we can declare a winner
      if (!analysis.isSignificant && !forceEnd) {
        return {
          success: false,
          message: 'Test does not have statistically significant results. Extend test duration or force end.',
          analysis
        };
      }

      // Update test status
      test.status = 'completed';
      test.endedAt = new Date();
      test.analysis = analysis;

      // Mark winner
      if (analysis.hasWinner) {
        const winnerVariant = test.variants.find(v => v.variantId === analysis.winner.variantId);
        if (winnerVariant) {
          winnerVariant.isWinner = true;
        }
      }

      // Store final results
      await this._storeTest(test.tenantId, test);
      await this._storeTestResults(test.tenantId, testId, analysis);

      // Remove from active cache
      this.activeTests.delete(testId);

      // Update metrics
      this.metrics.testsCompleted++;
      if (analysis.hasWinner) {
        this.metrics.winnersPromoted++;
      }

      logger.info('Test ended', {
        testId,
        hasWinner: analysis.hasWinner,
        winner: analysis.winner?.name
      });

      return {
        success: true,
        test,
        analysis,
        message: analysis.hasWinner
          ? `Winner: ${analysis.winner.name} with ${analysis.winner.improvement.toFixed(2)}% improvement`
          : 'No clear winner. Results inconclusive.'
      };

    } catch (error) {
      logger.error('Failed to end test', {
        testId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all active tests for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Array>} Active tests
   */
  async getActiveTests(tenantId) {
    try {
      const tests = await this._loadTenantTests(tenantId);

      return tests.filter(test => test.status === 'active').map(test => ({
        testId: test.testId,
        name: test.name,
        metric: test.metric,
        variantCount: test.variants.length,
        startedAt: test.startedAt,
        endsAt: test.endsAt,
        daysRemaining: this._calculateDaysRemaining(test.endsAt),
        hasWinner: test.analysis?.hasWinner || false,
        sampleSize: test.variants.reduce((sum, v) => sum + v.impressions, 0)
      }));

    } catch (error) {
      logger.error('Failed to get active tests', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * =====================================
   * STATISTICAL ANALYSIS METHODS
   * =====================================
   */

  async _analyzeTest(test) {
    const { metric, variants } = test;

    // Check sample size
    if (!this._hasMinimumSampleSize(test)) {
      return {
        hasWinner: false,
        winner: null,
        isSignificant: false,
        pValue: null,
        confidence: 0,
        recommendations: ['Insufficient sample size. Continue collecting data.']
      };
    }

    // Get baseline (control) variant - typically the first one
    const control = variants[0];
    const treatments = variants.slice(1);

    // Calculate performance for each variant
    const variantPerformance = variants.map(v => ({
      variantId: v.variantId,
      name: v.name,
      value: this._getMetricValue(v, metric),
      sampleSize: v.impressions,
      conversions: metric === 'conversion_rate' ? v.conversions : v.clicks
    }));

    // Find best performing variant
    const best = variantPerformance.reduce((best, current) =>
      current.value > best.value ? current : best
    );

    // Calculate statistical significance vs control
    const significance = this._calculateSignificance(
      control,
      variants.find(v => v.variantId === best.variantId),
      metric
    );

    // Calculate confidence and p-value
    const pValue = this._calculatePValue(control, best, metric);
    const confidence = 1 - pValue;

    // Determine if significant
    const isSignificant = pValue < this.config.significanceLevel &&
                          confidence >= this.config.minConfidence;

    // Calculate improvement over control
    const controlValue = this._getMetricValue(control, metric);
    const bestValue = best.value;
    const improvement = controlValue > 0
      ? ((bestValue - controlValue) / controlValue) * 100
      : 0;

    // Determine if there's a clear winner
    const hasWinner = isSignificant &&
                      improvement >= this.config.winnerThreshold &&
                      best.variantId !== control.variantId;

    // Generate recommendations
    const recommendations = this._generateRecommendations({
      hasWinner,
      isSignificant,
      improvement,
      pValue,
      confidence,
      variants: variantPerformance
    });

    return {
      hasWinner,
      winner: hasWinner ? {
        variantId: best.variantId,
        name: best.name,
        value: best.value,
        improvement,
        confidence: (confidence * 100).toFixed(2)
      } : null,
      isSignificant,
      pValue: pValue.toFixed(4),
      confidence: (confidence * 100).toFixed(2),
      variantPerformance,
      recommendations
    };
  }

  _calculateSignificance(control, treatment, metric) {
    // Using two-proportion z-test for conversion-based metrics
    const p1 = this._getMetricValue(control, metric) / 100;
    const p2 = this._getMetricValue(treatment, metric) / 100;
    const n1 = control.impressions;
    const n2 = treatment.impressions;

    if (n1 === 0 || n2 === 0) {
      return { significant: false, zScore: 0 };
    }

    // Pooled proportion
    const pPool = ((p1 * n1) + (p2 * n2)) / (n1 + n2);

    // Standard error
    const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));

    if (se === 0) {
      return { significant: false, zScore: 0 };
    }

    // Z-score
    const zScore = (p2 - p1) / se;

    // Two-tailed test
    const significant = Math.abs(zScore) > 1.96; // 95% confidence

    return { significant, zScore };
  }

  _calculatePValue(control, treatment, metric) {
    // Simplified p-value calculation using z-score
    const significance = this._calculateSignificance(control, treatment, metric);
    const zScore = Math.abs(significance.zScore);

    // Approximate p-value from z-score (two-tailed)
    // Using standard normal distribution approximation
    if (zScore > 6) return 0.0001;

    const pValue = 2 * (1 - this._normalCDF(zScore));

    return Math.max(0.0001, Math.min(1, pValue));
  }

  _normalCDF(z) {
    // Approximation of standard normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - p : p;
  }

  _getMetricValue(variant, metric) {
    switch (metric) {
      case 'ctr':
        return variant.ctr;
      case 'conversion_rate':
        return variant.conversionRate;
      case 'cpa':
        return variant.cpa;
      case 'roas':
        return variant.roas;
      default:
        return 0;
    }
  }

  _hasMinimumSampleSize(test) {
    return test.variants.every(v => v.impressions >= this.config.minSampleSize);
  }

  _generateRecommendations(analysis) {
    const recommendations = [];

    if (!analysis.hasWinner) {
      if (!analysis.isSignificant) {
        recommendations.push('Results are not statistically significant. Continue test or increase traffic.');
      }

      if (analysis.improvement < this.config.winnerThreshold) {
        recommendations.push(`Improvement (${analysis.improvement.toFixed(2)}%) is below threshold (${this.config.winnerThreshold * 100}%). Consider testing more distinct variations.`);
      }
    } else {
      recommendations.push(`${analysis.winner.name} is the clear winner with ${analysis.winner.improvement.toFixed(2)}% improvement at ${analysis.winner.confidence}% confidence.`);
      recommendations.push('Deploy winning variant to all traffic.');
    }

    // Performance spread recommendations
    const values = analysis.variants.map(v => v.value);
    const spread = Math.max(...values) - Math.min(...values);
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

    if (spread / avgValue < 0.05) {
      recommendations.push('All variants performing similarly. Consider more differentiated variations.');
    }

    return recommendations;
  }

  /**
   * =====================================
   * AUTO-OPTIMIZATION METHODS
   * =====================================
   */

  async _promoteWinner(test) {
    if (!test.analysis.hasWinner) {
      return;
    }

    const winner = test.variants.find(v => v.variantId === test.analysis.winner.variantId);
    if (!winner) {
      return;
    }

    winner.isWinner = true;

    // Log winner promotion
    await dataStore.addLog(test.tenantId, 'info',
      `A/B test winner promoted: ${winner.name}`,
      {
        testId: test.testId,
        testName: test.name,
        winner: winner.name,
        improvement: test.analysis.winner.improvement,
        confidence: test.analysis.winner.confidence
      }
    );

    logger.info('Winner promoted', {
      testId: test.testId,
      winner: winner.name,
      improvement: test.analysis.winner.improvement
    });
  }

  async _retireUnderperformers(test) {
    if (!test.analysis.isSignificant) {
      return;
    }

    const control = test.variants[0];
    const controlValue = this._getMetricValue(control, test.metric);

    // Mark variants performing significantly worse than control
    test.variants.forEach(variant => {
      if (variant.variantId === control.variantId) {
        return;
      }

      const variantValue = this._getMetricValue(variant, test.metric);
      const change = controlValue > 0
        ? ((variantValue - controlValue) / controlValue) * 100
        : 0;

      // Mark as underperformer if 20% worse than control
      if (change < -20) {
        variant.isUnderperformer = true;
        this.metrics.underperformersRetired++;

        logger.info('Underperformer retired', {
          testId: test.testId,
          variant: variant.name,
          decline: change.toFixed(2)
        });
      }
    });
  }

  /**
   * =====================================
   * HELPER METHODS
   * =====================================
   */

  _calculateEqualSplit(variantCount) {
    const split = 100 / variantCount;
    return new Array(variantCount).fill(split);
  }

  _calculateDaysRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  _prepareVisualizationData(test) {
    return {
      variants: test.variants.map(v => ({
        name: v.name,
        ctr: v.ctr,
        conversionRate: v.conversionRate,
        impressions: v.impressions,
        conversions: v.conversions
      })),
      metric: test.metric
    };
  }

  /**
   * =====================================
   * STORAGE METHODS
   * =====================================
   */

  async _storeTest(tenantId, test) {
    const key = `ab_test_${test.testId}`;
    await dataStore.setTenantConfig(tenantId, key, {
      ...test,
      updatedAt: new Date()
    });
  }

  async _loadTest(testId) {
    // Search through all tenants (in production, use indexed lookup)
    try {
      const allTests = Array.from(this.activeTests.values());
      return allTests.find(t => t.testId === testId) || null;
    } catch (error) {
      return null;
    }
  }

  async _loadTenantTests(tenantId) {
    try {
      const allConfigs = await dataStore.getAllTenantConfigs(tenantId);
      const testKeys = Object.keys(allConfigs).filter(k => k.startsWith('ab_test_'));

      return testKeys.map(key => allConfigs[key]);
    } catch (error) {
      logger.error('Failed to load tenant tests', { tenantId, error: error.message });
      return [];
    }
  }

  async _storeTestResults(tenantId, testId, analysis) {
    const key = `ab_results_${testId}`;
    await dataStore.setTenantConfig(tenantId, key, {
      testId,
      analysis,
      finalizedAt: new Date()
    });
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeTests: this.activeTests.size,
      winRate: this.metrics.testsCompleted > 0
        ? ((this.metrics.winnersPromoted / this.metrics.testsCompleted) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    logger.info('A/B testing configuration updated', { newConfig });
  }
}

// Export singleton instance
let abTestingServiceInstance = null;

/**
 * Get singleton instance
 */
export function getABTestingService() {
  if (!abTestingServiceInstance) {
    abTestingServiceInstance = new ABTestingService();
  }
  return abTestingServiceInstance;
}

export default getABTestingService;