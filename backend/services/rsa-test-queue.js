/**
 * RSA Test Queue Service
 * Manages automated RSA testing with statistical significance
 * PRO tier feature ($99/mo) for rotating and testing ads
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';
import { dualWriteRunLogs } from './dual-write.js';
import logger from './logger.js';

class RSATestQueueService {
  constructor() {
    this.testQueue = new Map(); // In-memory queue for active tests
    this.significanceThreshold = 0.95; // 95% confidence
    this.minTestDuration = 7; // Minimum 7 days
    this.maxConcurrentTests = 3; // Max tests per tenant
    this.minImpressions = 100; // Minimum impressions for significance
    this.minClicks = 10; // Minimum clicks for significance

    // Statistical test configurations
    this.alphaLevel = 0.05; // 5% significance level
    this.minDetectableEffect = 0.1; // 10% minimum effect size

    this.metrics = {
      testsStarted: 0,
      testsCompleted: 0,
      testsWon: 0,
      testsLost: 0,
      avgTestDuration: 0,
      errors: 0
    };
  }

  /**
   * Start a new RSA test for a campaign/ad group
   */
  async startTest(tenantId, testConfig) {
    try {
      // Validate PRO tier access
      const hasAccess = await this.validateTierAccess(tenantId, 'PRO');
      if (!hasAccess) {
        throw new Error('RSA Test Queue requires PRO tier subscription');
      }

      // Validate test configuration
      this.validateTestConfig(testConfig);

      // Check concurrent test limits
      const activeTests = await this.getActiveTests(tenantId);
      if (activeTests.length >= this.maxConcurrentTests) {
        throw new Error(`Maximum concurrent tests limit reached (${this.maxConcurrentTests})`);
      }

      // Create test entry
      const testId = this.generateTestId();
      const test = {
        id: testId,
        tenant_id: tenantId,
        campaign_name: testConfig.campaignName,
        ad_group_name: testConfig.adGroupName,
        control_headlines: testConfig.controlHeadlines || [],
        control_descriptions: testConfig.controlDescriptions || [],
        variant_headlines: testConfig.variantHeadlines,
        variant_descriptions: testConfig.variantDescriptions,
        start_date: new Date().toISOString(),
        end_date: null,
        status: 'RUNNING',
        performance_metrics: {
          control: { impressions: 0, clicks: 0, conversions: 0, cost: 0 },
          variant: { impressions: 0, clicks: 0, conversions: 0, cost: 0 }
        },
        statistical_result: null,
        winner: null,
        confidence_score: null,
        test_configuration: {
          rotation_strategy: testConfig.rotationStrategy || 'EVEN_ROTATION',
          success_metric: testConfig.successMetric || 'CTR',
          minimum_runtime_days: testConfig.minimumRuntimeDays || this.minTestDuration,
          auto_conclude: testConfig.autoeConclude !== false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to both Supabase and Sheets
      await this.saveTest(test);

      // Add to in-memory queue
      this.testQueue.set(testId, test);

      // Log test start
      await dualWriteRunLogs(tenantId, [[
        new Date(),
        'RSA_TEST_STARTED',
        `Started RSA test for ${testConfig.campaignName} › ${testConfig.adGroupName}`,
        `Test ID: ${testId}, Variants: ${testConfig.variantHeadlines.length}H/${testConfig.variantDescriptions.length}D`
      ]]);

      this.metrics.testsStarted++;

      logger.info('RSA test started', {
        tenantId,
        testId,
        campaignName: testConfig.campaignName,
        adGroupName: testConfig.adGroupName
      });

      return {
        success: true,
        testId,
        message: 'RSA test started successfully',
        estimatedDuration: `${this.minTestDuration}+ days`,
        test
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to start RSA test', {
        tenantId,
        error: error.message,
        testConfig
      });
      throw error;
    }
  }

  /**
   * Update test performance metrics
   */
  async updateTestMetrics(tenantId, testId, metrics) {
    try {
      const test = await this.getTest(tenantId, testId);
      if (!test) {
        throw new Error(`Test not found: ${testId}`);
      }

      if (test.status !== 'RUNNING') {
        return { message: 'Test is not running, metrics update skipped' };
      }

      // Update performance metrics
      test.performance_metrics = {
        ...test.performance_metrics,
        ...metrics,
        lastUpdated: new Date().toISOString()
      };
      test.updated_at = new Date().toISOString();

      // Check for statistical significance
      const significance = this.calculateStatisticalSignificance(test);
      test.statistical_result = significance;

      // Auto-conclude if conditions are met
      if (test.test_configuration.auto_conclude && this.shouldConcludeTest(test)) {
        return await this.concludeTest(tenantId, testId, 'AUTO');
      }

      // Save updated test
      await this.saveTest(test);
      this.testQueue.set(testId, test);

      return {
        success: true,
        significance,
        shouldConclude: this.shouldConcludeTest(test)
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to update test metrics', {
        tenantId,
        testId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Conclude a running test
   */
  async concludeTest(tenantId, testId, conclusionType = 'MANUAL') {
    try {
      const test = await this.getTest(tenantId, testId);
      if (!test) {
        throw new Error(`Test not found: ${testId}`);
      }

      if (test.status !== 'RUNNING') {
        throw new Error(`Test is not running: ${test.status}`);
      }

      // Calculate final results
      const significance = this.calculateStatisticalSignificance(test);
      const winner = this.determineWinner(test, significance);

      // Update test record
      test.end_date = new Date().toISOString();
      test.status = 'COMPLETED';
      test.statistical_result = significance;
      test.winner = winner;
      test.confidence_score = significance.confidenceLevel;
      test.conclusion_type = conclusionType;
      test.updated_at = new Date().toISOString();

      // Save final test state
      await this.saveTest(test);

      // Remove from active queue
      this.testQueue.delete(testId);

      // Log test completion
      await dualWriteRunLogs(tenantId, [[
        new Date(),
        'RSA_TEST_COMPLETED',
        `RSA test concluded for ${test.campaign_name} › ${test.ad_group_name}`,
        `Winner: ${winner}, Confidence: ${(significance.confidenceLevel * 100).toFixed(1)}%`
      ]]);

      // Update metrics
      this.metrics.testsCompleted++;
      if (winner === 'VARIANT') this.metrics.testsWon++;
      if (winner === 'CONTROL') this.metrics.testsLost++;

      logger.info('RSA test concluded', {
        tenantId,
        testId,
        winner,
        confidenceLevel: significance.confidenceLevel,
        conclusionType
      });

      return {
        success: true,
        winner,
        significance,
        test,
        actions: this.generateTestActions(test, winner)
      };

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to conclude RSA test', {
        tenantId,
        testId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all tests for a tenant
   */
  async getTests(tenantId, options = {}) {
    try {
      const filters = {
        status: options.status,
        campaignName: options.campaignName,
        limit: options.limit || 50,
        offset: options.offset || 0
      };

      // Try Supabase first, fallback to sheets
      if (isSupabaseEnabled()) {
        return await this.getTestsFromSupabase(tenantId, filters);
      } else {
        return await this.getTestsFromSheets(tenantId, filters);
      }

    } catch (error) {
      logger.error('Failed to get tests', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get active tests for a tenant
   */
  async getActiveTests(tenantId) {
    return await this.getTests(tenantId, { status: 'RUNNING' });
  }

  /**
   * Calculate statistical significance using Z-test for proportions
   */
  calculateStatisticalSignificance(test) {
    const control = test.performance_metrics.control;
    const variant = test.performance_metrics.variant;

    // Require minimum sample sizes
    if (control.impressions < this.minImpressions ||
        variant.impressions < this.minImpressions ||
        control.clicks < this.minClicks ||
        variant.clicks < this.minClicks) {
      return {
        isSignificant: false,
        confidenceLevel: 0,
        reason: 'Insufficient sample size',
        requiresMoreData: true
      };
    }

    // Calculate conversion rates (CTR in this case)
    const controlRate = control.clicks / control.impressions;
    const variantRate = variant.clicks / variant.impressions;

    // Calculate pooled proportion
    const totalClicks = control.clicks + variant.clicks;
    const totalImpressions = control.impressions + variant.impressions;
    const pooledRate = totalClicks / totalImpressions;

    // Calculate standard error
    const standardError = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1/control.impressions + 1/variant.impressions)
    );

    // Calculate Z-score
    const zScore = Math.abs(variantRate - controlRate) / standardError;

    // Critical value for 95% confidence (two-tailed)
    const criticalValue = 1.96;

    // Calculate p-value (approximate)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // Calculate confidence level
    const confidenceLevel = 1 - pValue;

    const isSignificant = Math.abs(zScore) > criticalValue && pValue < this.alphaLevel;

    return {
      isSignificant,
      confidenceLevel: Math.max(0, Math.min(1, confidenceLevel)),
      zScore,
      pValue,
      controlRate,
      variantRate,
      relativeLift: ((variantRate - controlRate) / controlRate) * 100,
      absoluteLift: (variantRate - controlRate) * 100,
      standardError,
      requiresMoreData: !isSignificant && confidenceLevel < 0.8
    };
  }

  /**
   * Determine test winner based on statistical results
   */
  determineWinner(test, significance) {
    if (!significance.isSignificant) {
      return 'INCONCLUSIVE';
    }

    const control = test.performance_metrics.control;
    const variant = test.performance_metrics.variant;

    // Primary metric comparison (CTR)
    const controlCTR = control.clicks / control.impressions;
    const variantCTR = variant.clicks / variant.impressions;

    if (variantCTR > controlCTR) {
      return 'VARIANT';
    } else {
      return 'CONTROL';
    }
  }

  /**
   * Check if test should be concluded
   */
  shouldConcludeTest(test) {
    const startDate = new Date(test.start_date);
    const now = new Date();
    const daysSinceStart = (now - startDate) / (1000 * 60 * 60 * 24);

    // Must run for minimum duration
    if (daysSinceStart < test.test_configuration.minimum_runtime_days) {
      return false;
    }

    // Must have statistical significance
    if (!test.statistical_result || !test.statistical_result.isSignificant) {
      return false;
    }

    // Must have confidence above threshold
    if (test.statistical_result.confidenceLevel < this.significanceThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Generate recommended actions based on test results
   */
  generateTestActions(test, winner) {
    const actions = [];

    if (winner === 'VARIANT') {
      actions.push({
        type: 'PROMOTE_VARIANT',
        description: 'Promote winning variant to all traffic',
        priority: 'HIGH',
        autoApply: true
      });

      actions.push({
        type: 'PAUSE_CONTROL',
        description: 'Pause underperforming control ads',
        priority: 'MEDIUM',
        autoApply: test.test_configuration.auto_conclude
      });
    } else if (winner === 'CONTROL') {
      actions.push({
        type: 'PAUSE_VARIANT',
        description: 'Pause underperforming variant ads',
        priority: 'HIGH',
        autoApply: true
      });

      actions.push({
        type: 'KEEP_CONTROL',
        description: 'Keep control ads running',
        priority: 'LOW',
        autoApply: false
      });
    } else {
      actions.push({
        type: 'EXTEND_TEST',
        description: 'Consider extending test duration for more data',
        priority: 'MEDIUM',
        autoApply: false
      });
    }

    return actions;
  }

  /**
   * Save test to both Supabase and Google Sheets
   */
  async saveTest(test) {
    const results = {
      sheets: { success: false, error: null },
      supabase: { success: false, error: null }
    };

    // Always write to Google Sheets
    try {
      const { sheets } = await import('../sheets.js');

      const testRow = this.convertTestToSheetRow(test);

      // Check if test exists
      const existingRows = await sheets.getRows(test.tenant_id, 'RSA_TEST_QUEUE');
      const existingRowIndex = existingRows.findIndex(row => row[0] === test.id);

      if (existingRowIndex >= 0) {
        // Update existing row
        await sheets.updateRow(test.tenant_id, 'RSA_TEST_QUEUE', existingRowIndex, testRow);
      } else {
        // Add new row
        await sheets.addRow(test.tenant_id, 'RSA_TEST_QUEUE', testRow);
      }

      results.sheets.success = true;
    } catch (error) {
      results.sheets.error = error.message;
      logger.error('Failed to save test to sheets', error);
    }

    // Conditionally write to Supabase
    if (isSupabaseEnabled()) {
      try {
        await this.saveTestToSupabase(test);
        results.supabase.success = true;
      } catch (error) {
        results.supabase.error = error.message;
        logger.error('Failed to save test to Supabase', error);
      }
    }

    return results;
  }

  /**
   * Save test to Supabase
   */
  async saveTestToSupabase(test) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Set tenant context
    await supabase.rpc('set_config', {
      parameter: 'app.current_tenant_id',
      value: test.tenant_id
    });

    const { error } = await supabase
      .from('rsa_test_queue')
      .upsert(test, { onConflict: 'id' });

    if (error) {
      throw new Error(`Supabase test save error: ${error.message}`);
    }
  }

  /**
   * Get test from preferred source
   */
  async getTest(tenantId, testId) {
    // Check in-memory first
    if (this.testQueue.has(testId)) {
      return this.testQueue.get(testId);
    }

    // Try Supabase first, fallback to sheets
    if (isSupabaseEnabled()) {
      try {
        return await this.getTestFromSupabase(tenantId, testId);
      } catch (error) {
        logger.warn('Supabase test fetch failed, trying sheets', error.message);
      }
    }

    return await this.getTestFromSheets(tenantId, testId);
  }

  /**
   * Get tests from Supabase
   */
  async getTestsFromSupabase(tenantId, filters) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    await supabase.rpc('set_config', {
      parameter: 'app.current_tenant_id',
      value: tenantId
    });

    let query = supabase
      .from('rsa_test_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.campaignName) {
      query = query.eq('campaign_name', filters.campaignName);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + filters.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Supabase test fetch error: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get tests from Google Sheets
   */
  async getTestsFromSheets(tenantId, filters) {
    const { sheets } = await import('../sheets.js');

    const rows = await sheets.getRows(tenantId, 'RSA_TEST_QUEUE');
    let tests = rows.map(row => this.convertSheetRowToTest(row));

    if (filters.status) {
      tests = tests.filter(test => test.status === filters.status);
    }

    if (filters.campaignName) {
      tests = tests.filter(test => test.campaign_name === filters.campaignName);
    }

    // Apply pagination
    const start = filters.offset || 0;
    const end = start + (filters.limit || tests.length);

    return tests.slice(start, end);
  }

  /**
   * Convert test object to Google Sheets row format
   */
  convertTestToSheetRow(test) {
    return [
      test.id,
      test.tenant_id,
      test.campaign_name,
      test.ad_group_name,
      JSON.stringify(test.control_headlines),
      JSON.stringify(test.control_descriptions),
      JSON.stringify(test.variant_headlines),
      JSON.stringify(test.variant_descriptions),
      test.start_date,
      test.end_date || '',
      test.status,
      JSON.stringify(test.performance_metrics),
      JSON.stringify(test.statistical_result),
      test.winner || '',
      test.confidence_score || 0,
      JSON.stringify(test.test_configuration),
      test.created_at,
      test.updated_at
    ];
  }

  /**
   * Convert Google Sheets row to test object
   */
  convertSheetRowToTest(row) {
    return {
      id: row[0],
      tenant_id: row[1],
      campaign_name: row[2],
      ad_group_name: row[3],
      control_headlines: this.parseJSON(row[4], []),
      control_descriptions: this.parseJSON(row[5], []),
      variant_headlines: this.parseJSON(row[6], []),
      variant_descriptions: this.parseJSON(row[7], []),
      start_date: row[8],
      end_date: row[9] || null,
      status: row[10],
      performance_metrics: this.parseJSON(row[11], { control: {}, variant: {} }),
      statistical_result: this.parseJSON(row[12], null),
      winner: row[13] || null,
      confidence_score: parseFloat(row[14]) || null,
      test_configuration: this.parseJSON(row[15], {}),
      created_at: row[16],
      updated_at: row[17]
    };
  }

  /**
   * Validate tier access
   */
  async validateTierAccess(tenantId, requiredTier) {
    try {
      if (isSupabaseEnabled()) {
        await supabase.rpc('set_config', {
          parameter: 'app.current_tenant_id',
          value: tenantId
        });

        const { data, error } = await supabase
          .from('tenant_subscriptions')
          .select('tier, status')
          .eq('tenant_id', tenantId)
          .single();

        if (error || !data) {
          return false;
        }

        return data.tier === requiredTier && data.status === 'active';
      } else {
        // Fallback to sheets-based tier checking
        const { sheets } = await import('../sheets.js');
        const configs = await sheets.getRows(tenantId, 'CONFIG');
        const tierConfig = configs.find(row => row[0] === 'subscription_tier');
        return tierConfig && tierConfig[1] === requiredTier;
      }
    } catch (error) {
      logger.warn('Tier validation failed, allowing access', error.message);
      return true; // Fail open for now
    }
  }

  /**
   * Validate test configuration
   */
  validateTestConfig(config) {
    if (!config.campaignName) {
      throw new Error('Campaign name is required');
    }

    if (!config.adGroupName) {
      throw new Error('Ad group name is required');
    }

    if (!config.variantHeadlines || config.variantHeadlines.length === 0) {
      throw new Error('Variant headlines are required');
    }

    if (!config.variantDescriptions || config.variantDescriptions.length === 0) {
      throw new Error('Variant descriptions are required');
    }

    // Validate headline lengths (Google Ads limit: 30 characters)
    config.variantHeadlines.forEach(headline => {
      if (headline.length > 30) {
        throw new Error(`Headline too long (${headline.length} chars): ${headline}`);
      }
    });

    // Validate description lengths (Google Ads limit: 90 characters)
    config.variantDescriptions.forEach(description => {
      if (description.length > 90) {
        throw new Error(`Description too long (${description.length} chars): ${description}`);
      }
    });
  }

  /**
   * Generate unique test ID
   */
  generateTestId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `rsa_test_${timestamp}_${random}`;
  }

  /**
   * Normal CDF approximation for p-value calculation
   */
  normalCDF(z) {
    // Abramowitz and Stegun approximation
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2.0);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    if (z > 0.0) {
      prob = 1.0 - prob;
    }

    return prob;
  }

  /**
   * Safe JSON parsing with fallback
   */
  parseJSON(jsonString, fallback = null) {
    try {
      return jsonString ? JSON.parse(jsonString) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    const activeTests = this.testQueue.size;
    const totalTests = this.metrics.testsStarted;
    const successRate = totalTests > 0 ? (this.metrics.testsWon / totalTests) * 100 : 0;

    return {
      ...this.metrics,
      activeTests,
      successRate: Math.round(successRate * 100) / 100,
      averageTestDuration: this.calculateAverageTestDuration()
    };
  }

  /**
   * Calculate average test duration
   */
  calculateAverageTestDuration() {
    // This would be calculated from completed tests
    // For now, return configured minimum
    return this.minTestDuration;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      activeTests: this.testQueue.size,
      configuration: {
        significanceThreshold: this.significanceThreshold,
        minTestDuration: this.minTestDuration,
        maxConcurrentTests: this.maxConcurrentTests
      }
    };
  }
}

// Singleton instance
const rsaTestQueue = new RSATestQueueService();

export default rsaTestQueue;
export { RSATestQueueService };