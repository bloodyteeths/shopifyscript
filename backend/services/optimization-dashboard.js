/**
 * Optimization Dashboard Service for ProofKit SaaS
 *
 * Provides comprehensive dashboard endpoints and data aggregation
 * for monitoring optimization performance and activities
 *
 * Features:
 * - Real-time optimization metrics
 * - Performance tracking and visualization
 * - Optimization history and audit trails
 * - Safety monitoring dashboards
 * - A/B test results visualization
 * - Campaign performance analytics
 * - Alert and notification management
 */

import dataStore from './data-store.js';
import logger from './logger.js';
import { getCampaignOptimizer } from './campaign-optimizer.js';
import { getBidManager } from './bid-manager.js';
import { getBudgetAllocator } from './budget-allocator.js';
import { getOptimizationRules } from './optimization-rules.js';
import { getOptimizationTesting } from './optimization-testing.js';
import { getOptimizationSafety } from './optimization-safety.js';

/**
 * Dashboard Widget Types
 */
const WIDGET_TYPES = {
  OPTIMIZATION_OVERVIEW: 'optimization_overview',
  PERFORMANCE_METRICS: 'performance_metrics',
  SAFETY_STATUS: 'safety_status',
  ACTIVE_TESTS: 'active_tests',
  OPTIMIZATION_HISTORY: 'optimization_history',
  RULE_PERFORMANCE: 'rule_performance',
  COST_SAVINGS: 'cost_savings',
  PERFORMANCE_TRENDS: 'performance_trends',
  ALERT_FEED: 'alert_feed',
  CAMPAIGN_BREAKDOWN: 'campaign_breakdown'
};

/**
 * Time Periods for Analytics
 */
const TIME_PERIODS = {
  LAST_24H: '24h',
  LAST_7D: '7d',
  LAST_30D: '30d',
  LAST_90D: '90d',
  CUSTOM: 'custom'
};

/**
 * Optimization Dashboard Service
 */
export class OptimizationDashboard {
  constructor() {
    this.campaignOptimizer = null;
    this.bidManager = null;
    this.budgetAllocator = null;
    this.optimizationRules = null;
    this.optimizationTesting = null;
    this.optimizationSafety = null;

    // Cache for dashboard data
    this.dashboardCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    console.log('Optimization Dashboard Service initialized');
  }

  /**
   * Initialize dashboard service
   */
  async initialize() {
    try {
      this.campaignOptimizer = getCampaignOptimizer();
      this.bidManager = getBidManager();
      this.budgetAllocator = getBudgetAllocator();
      this.optimizationRules = getOptimizationRules();
      this.optimizationTesting = getOptimizationTesting();
      this.optimizationSafety = getOptimizationSafety();

      await this.campaignOptimizer.initialize();
      await this.optimizationTesting.initialize();

      logger.info('Optimization dashboard service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize optimization dashboard service:', error);
      throw error;
    }
  }

  /**
   * Get complete dashboard data for a tenant
   */
  async getDashboardData(tenantId, options = {}) {
    const {
      period = TIME_PERIODS.LAST_7D,
      widgets = Object.values(WIDGET_TYPES),
      refresh = false
    } = options;

    try {
      // Check cache if not forcing refresh
      const cacheKey = `dashboard_${tenantId}_${period}_${widgets.join(',')}`;
      if (!refresh) {
        const cached = this.getCachedData(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const dashboardData = {
        tenantId,
        period,
        timestamp: new Date().toISOString(),
        widgets: {}
      };

      // Generate data for each requested widget
      for (const widgetType of widgets) {
        try {
          const widgetData = await this.generateWidgetData(tenantId, widgetType, period);
          dashboardData.widgets[widgetType] = widgetData;
        } catch (error) {
          logger.error('Failed to generate widget data', {
            tenantId,
            widgetType,
            error: error.message
          });
          dashboardData.widgets[widgetType] = {
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Cache the result
      this.setCachedData(cacheKey, dashboardData);

      return dashboardData;

    } catch (error) {
      logger.error('Failed to get dashboard data', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate data for a specific widget
   */
  async generateWidgetData(tenantId, widgetType, period) {
    switch (widgetType) {
      case WIDGET_TYPES.OPTIMIZATION_OVERVIEW:
        return await this.getOptimizationOverview(tenantId, period);

      case WIDGET_TYPES.PERFORMANCE_METRICS:
        return await this.getPerformanceMetrics(tenantId, period);

      case WIDGET_TYPES.SAFETY_STATUS:
        return await this.getSafetyStatus(tenantId);

      case WIDGET_TYPES.ACTIVE_TESTS:
        return await this.getActiveTests(tenantId);

      case WIDGET_TYPES.OPTIMIZATION_HISTORY:
        return await this.getOptimizationHistory(tenantId, period);

      case WIDGET_TYPES.RULE_PERFORMANCE:
        return await this.getRulePerformance(tenantId, period);

      case WIDGET_TYPES.COST_SAVINGS:
        return await this.getCostSavings(tenantId, period);

      case WIDGET_TYPES.PERFORMANCE_TRENDS:
        return await this.getPerformanceTrends(tenantId, period);

      case WIDGET_TYPES.ALERT_FEED:
        return await this.getAlertFeed(tenantId, period);

      case WIDGET_TYPES.CAMPAIGN_BREAKDOWN:
        return await this.getCampaignBreakdown(tenantId, period);

      default:
        throw new Error(`Unknown widget type: ${widgetType}`);
    }
  }

  /**
   * Get optimization overview widget data
   */
  async getOptimizationOverview(tenantId, period) {
    try {
      const optimizerMetrics = this.campaignOptimizer.getMetrics();
      const bidManagerMetrics = this.bidManager.getMetrics();
      const budgetAllocatorMetrics = this.budgetAllocator.getMetrics();
      const rulesMetrics = this.optimizationRules.getMetrics();
      const safetyMetrics = this.optimizationSafety.getMetrics();

      // Get recent optimization runs
      const recentOptimizations = this.campaignOptimizer.getHistory(tenantId);
      const lastOptimization = recentOptimizations[recentOptimizations.length - 1];

      const overview = {
        totalOptimizations: optimizerMetrics.optimizationsRun,
        campaignsOptimized: optimizerMetrics.campaignsOptimized,
        budgetAdjustments: budgetAllocatorMetrics.reallocationCount,
        bidAdjustments: bidManagerMetrics.bidAdjustments,
        rulesExecuted: rulesMetrics.rulesExecuted,
        rollbacksTriggered: safetyMetrics.rollbacksTriggered,
        totalSavings: optimizerMetrics.totalSavings + budgetAllocatorMetrics.budgetSaved,
        totalGains: optimizerMetrics.totalGains,
        netROI: this.calculateNetROI(optimizerMetrics, budgetAllocatorMetrics),
        lastOptimization: lastOptimization ? {
          timestamp: lastOptimization.timestamp,
          actions: lastOptimization.actionsGenerated,
          executed: lastOptimization.actionsExecuted
        } : null,
        optimizationHealth: this.calculateOptimizationHealth(
          optimizerMetrics,
          safetyMetrics
        ),
        period,
        timestamp: new Date().toISOString()
      };

      return overview;

    } catch (error) {
      logger.error('Failed to get optimization overview', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get performance metrics widget data
   */
  async getPerformanceMetrics(tenantId, period) {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get metrics from data store
      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return {
          noData: true,
          period,
          message: 'No performance data available for this period'
        };
      }

      // Aggregate metrics
      const totals = metrics.reduce((acc, m) => ({
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
        cost: acc.cost + ((m.cost_micros || 0) / 1000000),
        conversions_value: acc.conversions_value + (m.conversions_value || 0)
      }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversions_value: 0 });

      // Calculate derived metrics
      const performanceMetrics = {
        totalImpressions: totals.impressions,
        totalClicks: totals.clicks,
        totalConversions: totals.conversions,
        totalCost: totals.cost,
        totalConversionsValue: totals.conversions_value,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        avgCPA: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        roas: totals.cost > 0 ? totals.conversions_value / totals.cost : 0,
        avgCPC: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
        period,
        periodDates: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        timestamp: new Date().toISOString()
      };

      // Get comparison with previous period
      const previousPeriod = await this.getPreviousPeriodMetrics(tenantId, startDate, endDate);
      if (previousPeriod) {
        performanceMetrics.comparison = this.calculateMetricsComparison(
          performanceMetrics,
          previousPeriod
        );
      }

      return performanceMetrics;

    } catch (error) {
      logger.error('Failed to get performance metrics', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get safety status widget data
   */
  async getSafetyStatus(tenantId) {
    try {
      const safetyHistory = this.optimizationSafety.getSafetyHistory(tenantId);
      const rollbackHistory = this.optimizationSafety.getRollbackHistory(tenantId);
      const recentBackups = this.optimizationSafety.getConfigBackups(tenantId);

      // Get recent safety events
      const recentEvents = safetyHistory
        .filter(event => Date.now() - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000)
        .slice(-10);

      // Calculate safety score
      const safetyScore = this.calculateSafetyScore(safetyHistory, rollbackHistory);

      const safetyStatus = {
        overallStatus: safetyScore >= 90 ? 'excellent' :
                      safetyScore >= 70 ? 'good' :
                      safetyScore >= 50 ? 'warning' : 'critical',
        safetyScore,
        totalRollbacks: rollbackHistory.length,
        recentRollbacks: rollbackHistory.filter(r =>
          Date.now() - new Date(r.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length,
        configBackups: recentBackups.length,
        latestBackup: recentBackups[recentBackups.length - 1],
        recentEvents: recentEvents.map(event => ({
          type: event.type,
          severity: event.severity,
          message: event.message,
          timestamp: event.timestamp
        })),
        monitoringEnabled: true, // Would check actual monitoring status
        alertsEnabled: true,
        autoRollbackEnabled: true,
        timestamp: new Date().toISOString()
      };

      return safetyStatus;

    } catch (error) {
      logger.error('Failed to get safety status', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get active tests widget data
   */
  async getActiveTests(tenantId) {
    try {
      const testHistory = this.optimizationTesting.getTestHistory(tenantId);
      const activeTests = testHistory.filter(test => test.status === 'running');

      const testsData = {
        activeTestsCount: activeTests.length,
        totalTestsRun: testHistory.length,
        activeTests: activeTests.map(test => ({
          id: test.id,
          name: test.name,
          type: test.type,
          status: test.status,
          startedAt: test.startedAt,
          duration: Date.now() - new Date(test.startedAt).getTime(),
          variantsCount: test.variants?.length || 0,
          currentWinner: test.currentWinner,
          significance: test.results?.significance?.maxSignificance || 0
        })),
        recentCompletedTests: testHistory
          .filter(test => test.status === 'completed')
          .slice(-5)
          .map(test => ({
            id: test.id,
            name: test.name,
            type: test.type,
            completedAt: test.completedAt,
            winner: test.results?.winner?.name,
            improvement: test.results?.improvement || 0
          })),
        testingMetrics: this.optimizationTesting.getMetrics(),
        timestamp: new Date().toISOString()
      };

      return testsData;

    } catch (error) {
      logger.error('Failed to get active tests', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get optimization history widget data
   */
  async getOptimizationHistory(tenantId, period) {
    try {
      const history = this.campaignOptimizer.getHistory(tenantId);
      const { startDate } = this.getPeriodDates(period);

      const filteredHistory = history.filter(h =>
        new Date(h.timestamp) >= startDate
      );

      const historyData = {
        totalOptimizations: filteredHistory.length,
        history: filteredHistory.slice(-20).map(h => ({
          timestamp: h.timestamp,
          actionsGenerated: h.actionsGenerated,
          actionsExecuted: h.actionsExecuted,
          dryRun: h.dryRun,
          duration: h.duration,
          success: h.actionsExecuted > 0
        })),
        optimizationFrequency: this.calculateOptimizationFrequency(filteredHistory),
        successRate: filteredHistory.length > 0
          ? filteredHistory.filter(h => h.actionsExecuted > 0).length / filteredHistory.length
          : 0,
        avgActionsPerOptimization: filteredHistory.length > 0
          ? filteredHistory.reduce((sum, h) => sum + h.actionsGenerated, 0) / filteredHistory.length
          : 0,
        period,
        timestamp: new Date().toISOString()
      };

      return historyData;

    } catch (error) {
      logger.error('Failed to get optimization history', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get rule performance widget data
   */
  async getRulePerformance(tenantId, period) {
    try {
      const rules = this.optimizationRules.getRules();
      const ruleHistory = await this.optimizationRules.getTenantRuleHistory(tenantId);

      const rulePerformance = {
        totalRules: rules.length,
        activeRules: rules.filter(r => r.enabled).length,
        rulesExecuted: rules.reduce((sum, r) => sum + (r.executionCount || 0), 0),
        topPerformingRules: rules
          .filter(r => r.executionCount > 0)
          .map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            executionCount: r.executionCount,
            successCount: r.successCount,
            successRate: r.executionCount > 0 ? r.successCount / r.executionCount : 0,
            lastExecuted: r.lastExecuted
          }))
          .sort((a, b) => b.successRate - a.successRate)
          .slice(0, 10),
        recentRuleExecutions: ruleHistory.slice(-10),
        rulesMetrics: this.optimizationRules.getMetrics(),
        period,
        timestamp: new Date().toISOString()
      };

      return rulePerformance;

    } catch (error) {
      logger.error('Failed to get rule performance', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get cost savings widget data
   */
  async getCostSavings(tenantId, period) {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      const optimizerMetrics = this.campaignOptimizer.getMetrics();
      const budgetAllocatorMetrics = this.budgetAllocator.getMetrics();

      // Calculate savings breakdown
      const costSavings = {
        totalSavings: optimizerMetrics.totalSavings + budgetAllocatorMetrics.budgetSaved,
        totalGains: optimizerMetrics.totalGains,
        netBenefit: (optimizerMetrics.totalGains + budgetAllocatorMetrics.budgetSaved) - optimizerMetrics.totalSavings,
        savingsBreakdown: {
          budgetOptimization: budgetAllocatorMetrics.budgetSaved || 0,
          bidOptimization: optimizerMetrics.totalSavings * 0.6, // Estimated
          campaignPausing: optimizerMetrics.totalSavings * 0.4  // Estimated
        },
        gainsBreakdown: {
          budgetScaling: optimizerMetrics.totalGains * 0.7,     // Estimated
          bidOptimization: optimizerMetrics.totalGains * 0.3    // Estimated
        },
        roi: this.calculateOptimizationROI(optimizerMetrics, budgetAllocatorMetrics),
        monthlySavingsProjection: this.projectMonthlySavings(
          optimizerMetrics.totalSavings + budgetAllocatorMetrics.budgetSaved,
          period
        ),
        period,
        timestamp: new Date().toISOString()
      };

      return costSavings;

    } catch (error) {
      logger.error('Failed to get cost savings', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get performance trends widget data
   */
  async getPerformanceTrends(tenantId, period) {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get daily metrics for trend analysis
      const dailyMetrics = await this.getDailyMetrics(tenantId, startDate, endDate);

      const trends = {
        conversionRateTrend: this.calculateTrend(dailyMetrics, 'conversionRate'),
        roasTrend: this.calculateTrend(dailyMetrics, 'roas'),
        ctrTrend: this.calculateTrend(dailyMetrics, 'ctr'),
        cpaTrend: this.calculateTrend(dailyMetrics, 'cpa'),
        dailyData: dailyMetrics.slice(-30), // Last 30 days
        trendSummary: {
          improving: 0,
          stable: 0,
          declining: 0
        },
        period,
        timestamp: new Date().toISOString()
      };

      // Count trend directions
      [trends.conversionRateTrend, trends.roasTrend, trends.ctrTrend].forEach(trend => {
        if (trend.direction === 'improving') trends.trendSummary.improving++;
        else if (trend.direction === 'declining') trends.trendSummary.declining++;
        else trends.trendSummary.stable++;
      });

      return trends;

    } catch (error) {
      logger.error('Failed to get performance trends', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get alert feed widget data
   */
  async getAlertFeed(tenantId, period) {
    try {
      const { startDate } = this.getPeriodDates(period);

      // Get logs that represent alerts
      const logs = await dataStore.getLogs(tenantId, {
        startDate,
        level: ['warning', 'error'],
        limit: 50
      });

      const alerts = logs.map(log => ({
        id: log.id,
        type: this.categorizeAlert(log.message),
        severity: log.level === 'error' ? 'high' : 'medium',
        message: log.message,
        timestamp: log.timestamp,
        data: log.data
      }));

      const alertFeed = {
        totalAlerts: alerts.length,
        highSeverityAlerts: alerts.filter(a => a.severity === 'high').length,
        recentAlerts: alerts.slice(0, 20),
        alertsByType: this.groupAlertsByType(alerts),
        alertsByDay: this.groupAlertsByDay(alerts),
        period,
        timestamp: new Date().toISOString()
      };

      return alertFeed;

    } catch (error) {
      logger.error('Failed to get alert feed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get campaign breakdown widget data
   */
  async getCampaignBreakdown(tenantId, period) {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return {
          noData: true,
          period,
          message: 'No campaign data available for this period'
        };
      }

      // Group by campaign
      const campaignGroups = {};
      metrics.forEach(m => {
        const campaignId = m.campaign_id || 'unknown';
        if (!campaignGroups[campaignId]) {
          campaignGroups[campaignId] = {
            campaignId,
            campaignName: m.campaign_name || 'Unknown',
            metrics: []
          };
        }
        campaignGroups[campaignId].metrics.push(m);
      });

      // Calculate campaign performance
      const campaigns = Object.values(campaignGroups).map(group => {
        const totals = group.metrics.reduce((acc, m) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          conversions: acc.conversions + (m.conversions || 0),
          cost: acc.cost + ((m.cost_micros || 0) / 1000000),
          conversions_value: acc.conversions_value + (m.conversions_value || 0)
        }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversions_value: 0 });

        return {
          campaignId: group.campaignId,
          campaignName: group.campaignName,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          cost: totals.cost,
          conversions_value: totals.conversions_value,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
          cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
          roas: totals.cost > 0 ? totals.conversions_value / totals.cost : 0,
          performanceScore: this.calculateCampaignPerformanceScore(totals)
        };
      });

      const campaignBreakdown = {
        totalCampaigns: campaigns.length,
        topCampaigns: campaigns
          .sort((a, b) => b.performanceScore - a.performanceScore)
          .slice(0, 10),
        worstCampaigns: campaigns
          .sort((a, b) => a.performanceScore - b.performanceScore)
          .slice(0, 5),
        campaignDistribution: {
          highPerforming: campaigns.filter(c => c.performanceScore >= 70).length,
          average: campaigns.filter(c => c.performanceScore >= 40 && c.performanceScore < 70).length,
          underperforming: campaigns.filter(c => c.performanceScore < 40).length
        },
        totalMetrics: {
          totalCost: campaigns.reduce((sum, c) => sum + c.cost, 0),
          totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
          totalConversionsValue: campaigns.reduce((sum, c) => sum + c.conversions_value, 0)
        },
        period,
        timestamp: new Date().toISOString()
      };

      return campaignBreakdown;

    } catch (error) {
      logger.error('Failed to get campaign breakdown', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Helper methods
   */

  getPeriodDates(period) {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case TIME_PERIODS.LAST_24H:
        startDate.setDate(startDate.getDate() - 1);
        break;
      case TIME_PERIODS.LAST_7D:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case TIME_PERIODS.LAST_30D:
        startDate.setDate(startDate.getDate() - 30);
        break;
      case TIME_PERIODS.LAST_90D:
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  calculateNetROI(optimizerMetrics, budgetAllocatorMetrics) {
    const totalGains = optimizerMetrics.totalGains || 0;
    const totalSavings = (optimizerMetrics.totalSavings || 0) + (budgetAllocatorMetrics.budgetSaved || 0);
    const totalCost = 0; // Would calculate actual optimization cost

    if (totalCost === 0) return totalGains + totalSavings;
    return ((totalGains + totalSavings - totalCost) / totalCost) * 100;
  }

  calculateOptimizationHealth(optimizerMetrics, safetyMetrics) {
    let healthScore = 100;

    // Deduct for rollbacks
    healthScore -= (safetyMetrics.rollbacksTriggered || 0) * 10;

    // Deduct for emergency stops
    healthScore -= (safetyMetrics.emergencyStops || 0) * 20;

    // Bonus for successful optimizations
    healthScore += Math.min(20, (optimizerMetrics.optimizationsRun || 0) * 2);

    return Math.max(0, Math.min(100, healthScore));
  }

  calculateSafetyScore(safetyHistory, rollbackHistory) {
    let score = 100;

    // Recent rollbacks impact score more
    const recentRollbacks = rollbackHistory.filter(r =>
      Date.now() - new Date(r.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
    );

    score -= recentRollbacks.length * 15;

    // Total rollbacks
    score -= Math.min(30, rollbackHistory.length * 5);

    return Math.max(0, score);
  }

  calculateCampaignPerformanceScore(metrics) {
    let score = 0;
    const weights = { ctr: 15, conversionRate: 35, roas: 35, volume: 15 };

    const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
    const roas = metrics.cost > 0 ? metrics.conversions_value / metrics.cost : 0;

    // CTR score
    if (ctr >= 5) score += weights.ctr;
    else if (ctr >= 3) score += weights.ctr * 0.8;
    else if (ctr >= 1) score += weights.ctr * 0.5;

    // Conversion rate score
    if (conversionRate >= 5) score += weights.conversionRate;
    else if (conversionRate >= 3) score += weights.conversionRate * 0.8;
    else if (conversionRate >= 1) score += weights.conversionRate * 0.5;

    // ROAS score
    if (roas >= 5) score += weights.roas;
    else if (roas >= 3) score += weights.roas * 0.8;
    else if (roas >= 1.5) score += weights.roas * 0.5;

    // Volume score
    if (metrics.clicks >= 500 && metrics.conversions >= 20) score += weights.volume;
    else if (metrics.clicks >= 100 && metrics.conversions >= 5) score += weights.volume * 0.7;
    else if (metrics.clicks >= 50) score += weights.volume * 0.4;

    return Math.round(score);
  }

  // Cache management
  getCachedData(key) {
    const cached = this.dashboardCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.dashboardCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (this.dashboardCache.size > 100) {
      const oldestKey = this.dashboardCache.keys().next().value;
      this.dashboardCache.delete(oldestKey);
    }
  }

  // Mock implementations for now
  async getPreviousPeriodMetrics(tenantId, startDate, endDate) { return null; }
  calculateMetricsComparison(current, previous) { return {}; }
  calculateOptimizationFrequency(history) { return 'daily'; }
  calculateOptimizationROI(optimizerMetrics, budgetAllocatorMetrics) { return 0; }
  projectMonthlySavings(totalSavings, period) { return totalSavings * 4; }
  async getDailyMetrics(tenantId, startDate, endDate) { return []; }
  calculateTrend(data, metric) { return { direction: 'stable', change: 0 }; }
  categorizeAlert(message) { return 'optimization'; }
  groupAlertsByType(alerts) { return {}; }
  groupAlertsByDay(alerts) { return {}; }

  /**
   * Public API methods
   */

  async refreshDashboard(tenantId, widgets = null) {
    const widgetsToRefresh = widgets || Object.values(WIDGET_TYPES);
    return await this.getDashboardData(tenantId, {
      widgets: widgetsToRefresh,
      refresh: true
    });
  }

  async getWidgetData(tenantId, widgetType, period = TIME_PERIODS.LAST_7D) {
    return await this.generateWidgetData(tenantId, widgetType, period);
  }

  clearCache(tenantId = null) {
    if (tenantId) {
      // Clear cache for specific tenant
      for (const [key] of this.dashboardCache) {
        if (key.includes(`dashboard_${tenantId}_`)) {
          this.dashboardCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.dashboardCache.clear();
    }
  }
}

// Singleton instance
let optimizationDashboardInstance = null;

/**
 * Get singleton optimization dashboard instance
 */
export function getOptimizationDashboard() {
  if (!optimizationDashboardInstance) {
    optimizationDashboardInstance = new OptimizationDashboard();
  }
  return optimizationDashboardInstance;
}

export default getOptimizationDashboard;