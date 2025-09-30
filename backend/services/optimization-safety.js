/**
 * Optimization Safety & Rollback Service for ProofKit SaaS
 *
 * Implements comprehensive safety mechanisms, rollback functionality,
 * and protection systems for campaign optimization
 *
 * Features:
 * - Automatic rollback on performance decline
 * - Safety limits and circuit breakers
 * - Change tracking and audit trail
 * - Emergency stop mechanisms
 * - Performance monitoring and alerts
 * - Configuration backup and restore
 * - Gradual rollout protection
 */

import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Safety Check Types
 */
const SAFETY_CHECKS = {
  PERFORMANCE_DECLINE: 'performance_decline',
  BUDGET_OVERSPEND: 'budget_overspend',
  BID_ANOMALY: 'bid_anomaly',
  CONVERSION_DROP: 'conversion_drop',
  COST_SPIKE: 'cost_spike',
  IMPRESSION_LOSS: 'impression_loss',
  QUALITY_SCORE_DROP: 'quality_score_drop',
  ACCOUNT_SUSPENSION: 'account_suspension'
};

/**
 * Rollback Triggers
 */
const ROLLBACK_TRIGGERS = {
  PERFORMANCE_DECLINE: {
    conversionRateDropThreshold: -0.30,  // 30% drop in conversion rate
    roasDropThreshold: -0.25,            // 25% drop in ROAS
    cpaIncreaseThreshold: 0.50,          // 50% increase in CPA
    timeWindow: 24 * 60 * 60 * 1000      // 24 hours
  },
  COST_CONTROL: {
    dailySpendMultiplier: 2.0,           // 2x daily spend
    weeklySpendMultiplier: 1.5,          // 1.5x weekly spend
    monthlySpendMultiplier: 1.2          // 1.2x monthly spend
  },
  VOLUME_PROTECTION: {
    impressionDropThreshold: -0.40,      // 40% drop in impressions
    clickDropThreshold: -0.35,           // 35% drop in clicks
    minVolumeWindow: 6 * 60 * 60 * 1000  // 6 hours
  }
};

/**
 * Safety Severity Levels
 */
const SEVERITY_LEVELS = {
  LOW: 'low',           // Warning, continue monitoring
  MEDIUM: 'medium',     // Pause new changes, alert
  HIGH: 'high',         // Immediate rollback consideration
  CRITICAL: 'critical'  // Emergency rollback, stop all optimization
};

/**
 * Optimization Safety Service
 */
export class OptimizationSafety {
  constructor() {
    this.safetyHistory = new Map();      // tenantId -> safety events
    this.rollbackHistory = new Map();    // tenantId -> rollback history
    this.configBackups = new Map();      // tenantId -> configuration backups
    this.activeMonitoring = new Map();   // tenantId -> monitoring state

    // Configuration
    this.config = {
      enabled: true,
      monitoringInterval: 15 * 60 * 1000,  // 15 minutes
      rollbackCooldown: 60 * 60 * 1000,    // 1 hour between rollbacks
      maxRollbacksPerDay: 3,               // Maximum rollbacks per day
      enableGradualRollout: true,
      gradualRolloutSteps: [10, 25, 50, 100], // Percentage steps
      enableEmergencyStop: true,
      alertThresholds: {
        performance: SEVERITY_LEVELS.HIGH,
        cost: SEVERITY_LEVELS.MEDIUM,
        volume: SEVERITY_LEVELS.MEDIUM
      }
    };

    // Metrics
    this.metrics = {
      safetyChecksRun: 0,
      rollbacksTriggered: 0,
      emergencyStops: 0,
      configsBackedUp: 0,
      alertsSent: 0,
      performanceProtected: 0
    };

    // Start monitoring
    this.startSafetyMonitoring();

    console.log('Optimization Safety Service initialized');
  }

  /**
   * Create configuration backup before optimization
   */
  async createConfigBackup(tenantId, optimizationType, metadata = {}) {
    try {
      const timestamp = new Date().toISOString();
      const backupId = `backup_${Date.now()}`;

      // Get current configuration state
      const currentConfig = await this.getCurrentConfiguration(tenantId);

      const backup = {
        id: backupId,
        tenantId,
        type: optimizationType,
        timestamp,
        configuration: currentConfig,
        metadata: {
          ...metadata,
          createdBy: 'optimization_safety',
          purpose: 'pre_optimization_backup'
        }
      };

      // Store backup
      this.storeConfigBackup(tenantId, backup);

      this.metrics.configsBackedUp++;

      logger.info('Configuration backup created', {
        tenantId,
        backupId,
        type: optimizationType
      });

      return backup;

    } catch (error) {
      logger.error('Failed to create config backup', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute safety checks before optimization
   */
  async executePreOptimizationChecks(tenantId, optimizationPlan) {
    try {
      const checks = [];

      // Check 1: Performance baseline validation
      const performanceCheck = await this.validatePerformanceBaseline(tenantId);
      checks.push(performanceCheck);

      // Check 2: Budget constraints validation
      const budgetCheck = await this.validateBudgetConstraints(tenantId, optimizationPlan);
      checks.push(budgetCheck);

      // Check 3: Change frequency validation
      const frequencyCheck = await this.validateChangeFrequency(tenantId);
      checks.push(frequencyCheck);

      // Check 4: Risk assessment
      const riskCheck = await this.assessOptimizationRisk(tenantId, optimizationPlan);
      checks.push(riskCheck);

      // Check 5: Account health validation
      const healthCheck = await this.validateAccountHealth(tenantId);
      checks.push(healthCheck);

      const overallSafety = this.calculateOverallSafety(checks);

      this.metrics.safetyChecksRun++;

      logger.info('Pre-optimization safety checks completed', {
        tenantId,
        checksRun: checks.length,
        overallSafety: overallSafety.level,
        canProceed: overallSafety.canProceed
      });

      return {
        canProceed: overallSafety.canProceed,
        safetyLevel: overallSafety.level,
        checks,
        recommendations: overallSafety.recommendations,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to execute pre-optimization checks', {
        tenantId,
        error: error.message
      });
      return {
        canProceed: false,
        safetyLevel: SEVERITY_LEVELS.CRITICAL,
        error: error.message
      };
    }
  }

  /**
   * Monitor ongoing optimization performance
   */
  async monitorOptimizationPerformance(tenantId) {
    try {
      const monitoringState = this.activeMonitoring.get(tenantId) || {
        lastCheck: null,
        consecutiveFailures: 0,
        performanceBaseline: null
      };

      // Get current performance metrics
      const currentMetrics = await this.getCurrentPerformanceMetrics(tenantId);

      if (!currentMetrics) {
        return null;
      }

      // Compare against baseline
      const baseline = monitoringState.performanceBaseline ||
                      await this.getPerformanceBaseline(tenantId);

      if (!baseline) {
        // Establish baseline if not available
        monitoringState.performanceBaseline = currentMetrics;
        this.activeMonitoring.set(tenantId, monitoringState);
        return null;
      }

      // Analyze performance changes
      const performanceAnalysis = this.analyzePerformanceChanges(
        baseline,
        currentMetrics
      );

      // Check for rollback triggers
      const rollbackAssessment = this.assessRollbackTriggers(
        tenantId,
        performanceAnalysis
      );

      // Update monitoring state
      monitoringState.lastCheck = new Date().toISOString();
      monitoringState.consecutiveFailures = rollbackAssessment.severity === SEVERITY_LEVELS.CRITICAL
        ? monitoringState.consecutiveFailures + 1
        : 0;

      this.activeMonitoring.set(tenantId, monitoringState);

      // Trigger rollback if necessary
      if (rollbackAssessment.shouldRollback) {
        await this.triggerRollback(tenantId, rollbackAssessment);
      }

      // Send alerts if needed
      if (rollbackAssessment.severity >= this.config.alertThresholds.performance) {
        await this.sendPerformanceAlert(tenantId, performanceAnalysis, rollbackAssessment);
      }

      return {
        performanceAnalysis,
        rollbackAssessment,
        monitoringState,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to monitor optimization performance', {
        tenantId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Trigger rollback to previous configuration
   */
  async triggerRollback(tenantId, rollbackReason) {
    try {
      // Check rollback constraints
      const canRollback = await this.validateRollbackConstraints(tenantId);
      if (!canRollback.allowed) {
        logger.warn('Rollback blocked by constraints', {
          tenantId,
          reason: canRollback.reason
        });
        return { success: false, reason: canRollback.reason };
      }

      // Get latest configuration backup
      const backup = this.getLatestConfigBackup(tenantId);
      if (!backup) {
        throw new Error('No configuration backup available for rollback');
      }

      // Execute rollback
      const rollbackResult = await this.executeRollback(tenantId, backup, rollbackReason);

      // Record rollback
      await this.recordRollback(tenantId, {
        backupId: backup.id,
        reason: rollbackReason,
        result: rollbackResult,
        timestamp: new Date().toISOString()
      });

      this.metrics.rollbacksTriggered++;

      logger.warn('Rollback triggered', {
        tenantId,
        backupId: backup.id,
        reason: rollbackReason.trigger,
        severity: rollbackReason.severity
      });

      return { success: true, backup, result: rollbackResult };

    } catch (error) {
      logger.error('Failed to trigger rollback', {
        tenantId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Emergency stop all optimization activities
   */
  async emergencyStop(tenantId, reason) {
    try {
      logger.critical('Emergency stop triggered', { tenantId, reason });

      // Stop all active optimizations
      await this.stopAllOptimizations(tenantId);

      // Rollback recent changes
      await this.emergencyRollback(tenantId);

      // Disable optimization for this tenant
      await this.disableOptimization(tenantId, reason);

      // Send critical alerts
      await this.sendEmergencyAlert(tenantId, reason);

      this.metrics.emergencyStops++;

      return { success: true, timestamp: new Date().toISOString() };

    } catch (error) {
      logger.error('Failed to execute emergency stop', {
        tenantId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Validation Methods
   */

  async validatePerformanceBaseline(tenantId) {
    try {
      const baseline = await this.getPerformanceBaseline(tenantId);

      if (!baseline) {
        return {
          type: 'performance_baseline',
          status: 'warning',
          severity: SEVERITY_LEVELS.LOW,
          message: 'No performance baseline available',
          canProceed: true
        };
      }

      // Check if baseline is recent enough (within 30 days)
      const baselineAge = Date.now() - new Date(baseline.timestamp).getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      if (baselineAge > maxAge) {
        return {
          type: 'performance_baseline',
          status: 'warning',
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Performance baseline is outdated',
          canProceed: true,
          recommendation: 'Update performance baseline'
        };
      }

      return {
        type: 'performance_baseline',
        status: 'pass',
        severity: SEVERITY_LEVELS.LOW,
        message: 'Performance baseline is valid',
        canProceed: true
      };

    } catch (error) {
      return {
        type: 'performance_baseline',
        status: 'error',
        severity: SEVERITY_LEVELS.HIGH,
        message: `Failed to validate baseline: ${error.message}`,
        canProceed: false
      };
    }
  }

  async validateBudgetConstraints(tenantId, optimizationPlan) {
    try {
      // Get current spend and budget limits
      const currentSpend = await this.getCurrentSpend(tenantId);
      const budgetLimits = await this.getBudgetLimits(tenantId);

      // Estimate spend impact of optimization
      const estimatedImpact = this.estimateSpendImpact(optimizationPlan);

      // Check if optimization would exceed limits
      const projectedSpend = currentSpend + estimatedImpact;

      if (projectedSpend > budgetLimits.daily * 1.1) { // 10% buffer
        return {
          type: 'budget_constraints',
          status: 'fail',
          severity: SEVERITY_LEVELS.HIGH,
          message: 'Optimization would exceed daily budget limits',
          canProceed: false,
          data: { currentSpend, projectedSpend, limit: budgetLimits.daily }
        };
      }

      return {
        type: 'budget_constraints',
        status: 'pass',
        severity: SEVERITY_LEVELS.LOW,
        message: 'Budget constraints validated',
        canProceed: true
      };

    } catch (error) {
      return {
        type: 'budget_constraints',
        status: 'error',
        severity: SEVERITY_LEVELS.MEDIUM,
        message: `Budget validation error: ${error.message}`,
        canProceed: true // Allow with warning
      };
    }
  }

  async validateChangeFrequency(tenantId) {
    try {
      const recentChanges = await this.getRecentOptimizationChanges(tenantId);
      const changeWindow = 24 * 60 * 60 * 1000; // 24 hours
      const maxChangesPerDay = 10;

      const recentChangeCount = recentChanges.filter(change =>
        Date.now() - new Date(change.timestamp).getTime() < changeWindow
      ).length;

      if (recentChangeCount >= maxChangesPerDay) {
        return {
          type: 'change_frequency',
          status: 'fail',
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Too many recent optimization changes',
          canProceed: false,
          data: { recentChanges: recentChangeCount, limit: maxChangesPerDay }
        };
      }

      return {
        type: 'change_frequency',
        status: 'pass',
        severity: SEVERITY_LEVELS.LOW,
        message: 'Change frequency within limits',
        canProceed: true
      };

    } catch (error) {
      return {
        type: 'change_frequency',
        status: 'error',
        severity: SEVERITY_LEVELS.LOW,
        message: `Change frequency validation error: ${error.message}`,
        canProceed: true
      };
    }
  }

  async assessOptimizationRisk(tenantId, optimizationPlan) {
    try {
      let riskScore = 0;
      const riskFactors = [];

      // Risk factor 1: Size of optimization
      const changeSize = this.calculateChangeSize(optimizationPlan);
      if (changeSize > 0.3) { // 30% change
        riskScore += 3;
        riskFactors.push('Large optimization size');
      }

      // Risk factor 2: Multiple simultaneous changes
      if (optimizationPlan.actions && optimizationPlan.actions.length > 5) {
        riskScore += 2;
        riskFactors.push('Multiple simultaneous changes');
      }

      // Risk factor 3: Budget changes
      const budgetChanges = optimizationPlan.actions?.filter(a =>
        a.type.includes('budget')).length || 0;
      if (budgetChanges > 2) {
        riskScore += 2;
        riskFactors.push('Multiple budget changes');
      }

      // Risk factor 4: Historical performance
      const historicalPerformance = await this.getHistoricalOptimizationPerformance(tenantId);
      if (historicalPerformance && historicalPerformance.successRate < 0.7) {
        riskScore += 2;
        riskFactors.push('Poor historical optimization performance');
      }

      let severity = SEVERITY_LEVELS.LOW;
      let canProceed = true;

      if (riskScore >= 7) {
        severity = SEVERITY_LEVELS.HIGH;
        canProceed = false;
      } else if (riskScore >= 4) {
        severity = SEVERITY_LEVELS.MEDIUM;
      }

      return {
        type: 'risk_assessment',
        status: canProceed ? 'pass' : 'fail',
        severity,
        message: `Risk score: ${riskScore}/10`,
        canProceed,
        data: { riskScore, riskFactors }
      };

    } catch (error) {
      return {
        type: 'risk_assessment',
        status: 'error',
        severity: SEVERITY_LEVELS.MEDIUM,
        message: `Risk assessment error: ${error.message}`,
        canProceed: true
      };
    }
  }

  async validateAccountHealth(tenantId) {
    try {
      // Mock account health check
      // In production, this would check Google Ads account status

      return {
        type: 'account_health',
        status: 'pass',
        severity: SEVERITY_LEVELS.LOW,
        message: 'Account health validated',
        canProceed: true
      };

    } catch (error) {
      return {
        type: 'account_health',
        status: 'error',
        severity: SEVERITY_LEVELS.HIGH,
        message: `Account health check failed: ${error.message}`,
        canProceed: false
      };
    }
  }

  /**
   * Performance Analysis
   */

  analyzePerformanceChanges(baseline, current) {
    const changes = {
      conversionRate: this.calculatePercentageChange(
        baseline.conversionRate,
        current.conversionRate
      ),
      roas: this.calculatePercentageChange(baseline.roas, current.roas),
      cpa: this.calculatePercentageChange(baseline.cpa, current.cpa),
      ctr: this.calculatePercentageChange(baseline.ctr, current.ctr),
      impressions: this.calculatePercentageChange(
        baseline.impressions,
        current.impressions
      ),
      clicks: this.calculatePercentageChange(baseline.clicks, current.clicks),
      cost: this.calculatePercentageChange(baseline.cost, current.cost)
    };

    const severity = this.calculatePerformanceChangeSeverity(changes);

    return {
      changes,
      severity,
      baseline,
      current,
      timestamp: new Date().toISOString()
    };
  }

  assessRollbackTriggers(tenantId, performanceAnalysis) {
    const changes = performanceAnalysis.changes;
    const triggers = [];

    // Check conversion rate drop
    if (changes.conversionRate <= ROLLBACK_TRIGGERS.PERFORMANCE_DECLINE.conversionRateDropThreshold) {
      triggers.push({
        type: SAFETY_CHECKS.CONVERSION_DROP,
        severity: SEVERITY_LEVELS.HIGH,
        value: changes.conversionRate,
        threshold: ROLLBACK_TRIGGERS.PERFORMANCE_DECLINE.conversionRateDropThreshold
      });
    }

    // Check ROAS drop
    if (changes.roas <= ROLLBACK_TRIGGERS.PERFORMANCE_DECLINE.roasDropThreshold) {
      triggers.push({
        type: SAFETY_CHECKS.PERFORMANCE_DECLINE,
        severity: SEVERITY_LEVELS.HIGH,
        value: changes.roas,
        threshold: ROLLBACK_TRIGGERS.PERFORMANCE_DECLINE.roasDropThreshold
      });
    }

    // Check CPA increase
    if (changes.cpa >= ROLLBACK_TRIGGERS.PERFORMANCE_DECLINE.cpaIncreaseThreshold) {
      triggers.push({
        type: SAFETY_CHECKS.COST_SPIKE,
        severity: SEVERITY_LEVELS.HIGH,
        value: changes.cpa,
        threshold: ROLLBACK_TRIGGERS.PERFORMANCE_DECLINE.cpaIncreaseThreshold
      });
    }

    // Check impression loss
    if (changes.impressions <= ROLLBACK_TRIGGERS.VOLUME_PROTECTION.impressionDropThreshold) {
      triggers.push({
        type: SAFETY_CHECKS.IMPRESSION_LOSS,
        severity: SEVERITY_LEVELS.MEDIUM,
        value: changes.impressions,
        threshold: ROLLBACK_TRIGGERS.VOLUME_PROTECTION.impressionDropThreshold
      });
    }

    const maxSeverity = triggers.length > 0
      ? Math.max(...triggers.map(t => this.severityToNumber(t.severity)))
      : 0;

    const shouldRollback = triggers.some(t =>
      t.severity === SEVERITY_LEVELS.HIGH || t.severity === SEVERITY_LEVELS.CRITICAL
    );

    return {
      shouldRollback,
      triggers,
      severity: this.numberToSeverity(maxSeverity),
      trigger: triggers[0]?.type || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper Methods
   */

  calculatePercentageChange(oldValue, newValue) {
    if (!oldValue || oldValue === 0) return 0;
    return (newValue - oldValue) / oldValue;
  }

  calculatePerformanceChangeSeverity(changes) {
    let severityScore = 0;

    // Weight different metrics
    severityScore += Math.abs(changes.conversionRate) * 3;
    severityScore += Math.abs(changes.roas) * 3;
    severityScore += Math.abs(changes.cpa) * 2;
    severityScore += Math.abs(changes.ctr) * 1;

    if (severityScore > 1.5) return SEVERITY_LEVELS.CRITICAL;
    if (severityScore > 0.8) return SEVERITY_LEVELS.HIGH;
    if (severityScore > 0.4) return SEVERITY_LEVELS.MEDIUM;
    return SEVERITY_LEVELS.LOW;
  }

  severityToNumber(severity) {
    const map = {
      [SEVERITY_LEVELS.LOW]: 1,
      [SEVERITY_LEVELS.MEDIUM]: 2,
      [SEVERITY_LEVELS.HIGH]: 3,
      [SEVERITY_LEVELS.CRITICAL]: 4
    };
    return map[severity] || 0;
  }

  numberToSeverity(number) {
    const map = {
      1: SEVERITY_LEVELS.LOW,
      2: SEVERITY_LEVELS.MEDIUM,
      3: SEVERITY_LEVELS.HIGH,
      4: SEVERITY_LEVELS.CRITICAL
    };
    return map[number] || SEVERITY_LEVELS.LOW;
  }

  calculateOverallSafety(checks) {
    const failedChecks = checks.filter(c => c.status === 'fail');
    const errorChecks = checks.filter(c => c.status === 'error');

    let canProceed = true;
    let level = SEVERITY_LEVELS.LOW;
    const recommendations = [];

    if (failedChecks.length > 0) {
      canProceed = false;
      level = SEVERITY_LEVELS.HIGH;
      recommendations.push('Resolve failed safety checks before proceeding');
    }

    if (errorChecks.length > 0) {
      level = SEVERITY_LEVELS.MEDIUM;
      recommendations.push('Review error conditions');
    }

    return { canProceed, level, recommendations };
  }

  /**
   * Storage and retrieval methods
   */

  storeConfigBackup(tenantId, backup) {
    if (!this.configBackups.has(tenantId)) {
      this.configBackups.set(tenantId, []);
    }

    const backups = this.configBackups.get(tenantId);
    backups.push(backup);

    // Keep only last 50 backups
    if (backups.length > 50) {
      backups.shift();
    }
  }

  getLatestConfigBackup(tenantId) {
    const backups = this.configBackups.get(tenantId) || [];
    return backups[backups.length - 1] || null;
  }

  async getCurrentConfiguration(tenantId) {
    // This would collect current campaign configurations
    // For now, return mock data
    return {
      campaigns: [],
      budgets: {},
      bids: {},
      schedules: {},
      timestamp: new Date().toISOString()
    };
  }

  async getCurrentPerformanceMetrics(tenantId) {
    // Get recent performance metrics
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Last 24 hours

    try {
      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return null;
      }

      const totals = metrics.reduce((acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
        cost: acc.cost + ((m.cost_micros || 0) / 1000000),
        conversions_value: acc.conversions_value + (m.conversions_value || 0)
      }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversions_value: 0 });

      return {
        impressions: totals.impressions,
        clicks: totals.clicks,
        conversions: totals.conversions,
        cost: totals.cost,
        conversions_value: totals.conversions_value,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        roas: totals.cost > 0 ? totals.conversions_value / totals.cost : 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get current performance metrics', {
        tenantId,
        error: error.message
      });
      return null;
    }
  }

  async getPerformanceBaseline(tenantId) {
    // Get or calculate performance baseline
    try {
      const baseline = await dataStore.getTenantConfig(tenantId, 'performance_baseline', {
        defaultValue: null
      });
      return baseline;
    } catch (error) {
      return null;
    }
  }

  /**
   * Start safety monitoring loop
   */
  startSafetyMonitoring() {
    setInterval(async () => {
      try {
        for (const [tenantId] of this.activeMonitoring) {
          await this.monitorOptimizationPerformance(tenantId);
        }
      } catch (error) {
        logger.error('Error in safety monitoring loop', { error: error.message });
      }
    }, this.config.monitoringInterval);
  }

  /**
   * Public API methods
   */

  async enableSafetyMonitoring(tenantId) {
    this.activeMonitoring.set(tenantId, {
      enabled: true,
      startedAt: new Date().toISOString(),
      lastCheck: null,
      consecutiveFailures: 0
    });

    logger.info('Safety monitoring enabled', { tenantId });
  }

  async disableSafetyMonitoring(tenantId) {
    this.activeMonitoring.delete(tenantId);
    logger.info('Safety monitoring disabled', { tenantId });
  }

  getSafetyHistory(tenantId) {
    return this.safetyHistory.get(tenantId) || [];
  }

  getRollbackHistory(tenantId) {
    return this.rollbackHistory.get(tenantId) || [];
  }

  getConfigBackups(tenantId) {
    return this.configBackups.get(tenantId) || [];
  }

  getMetrics() {
    return { ...this.metrics };
  }

  // Mock implementations for now
  async getCurrentSpend(tenantId) { return 0; }
  async getBudgetLimits(tenantId) { return { daily: 1000 }; }
  estimateSpendImpact(plan) { return 0; }
  async getRecentOptimizationChanges(tenantId) { return []; }
  calculateChangeSize(plan) { return 0.1; }
  async getHistoricalOptimizationPerformance(tenantId) { return null; }
  async validateRollbackConstraints(tenantId) { return { allowed: true }; }
  async executeRollback(tenantId, backup, reason) { return { success: true }; }
  async recordRollback(tenantId, rollback) { }
  async stopAllOptimizations(tenantId) { }
  async emergencyRollback(tenantId) { }
  async disableOptimization(tenantId, reason) { }
  async sendPerformanceAlert(tenantId, analysis, assessment) { }
  async sendEmergencyAlert(tenantId, reason) { }
}

// Singleton instance
let optimizationSafetyInstance = null;

/**
 * Get singleton optimization safety instance
 */
export function getOptimizationSafety() {
  if (!optimizationSafetyInstance) {
    optimizationSafetyInstance = new OptimizationSafety();
  }
  return optimizationSafetyInstance;
}

export default getOptimizationSafety;