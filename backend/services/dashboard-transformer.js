/**
 * Dashboard Transformer Service for ProofKit SaaS
 * Data normalization, metric calculations, and aggregation logic
 *
 * Features:
 * - Data normalization from multiple sources
 * - Metric calculations (ROI, ROAS, CTR, etc.)
 * - Aggregation logic for complex insights
 * - Time-series data processing
 * - Performance scoring algorithms
 */

import logger from './logger.js';

/**
 * Data transformation and metric calculation service
 */
class DashboardTransformerService {
  constructor() {
    // Metric calculation constants
    this.constants = {
      COST_MICROS_TO_DOLLARS: 1000000,
      PERCENTAGE_MULTIPLIER: 100,
      DAYS_IN_MONTH: 30,
      HOURS_IN_DAY: 24,
      QUALITY_SCORE_MAX: 10,
      PERFORMANCE_THRESHOLDS: {
        EXCELLENT_CTR: 5.0,
        GOOD_CTR: 2.0,
        EXCELLENT_CONVERSION_RATE: 5.0,
        GOOD_CONVERSION_RATE: 2.0,
        MIN_ROAS: 2.0,
        TARGET_ROAS: 4.0
      }
    };

    console.log('📊 Dashboard Transformer Service initialized');
  }

  /**
   * =====================================
   * SYSTEM OVERVIEW TRANSFORMATIONS
   * =====================================
   */

  /**
   * Transform system overview data
   */
  transformSystemOverview(rawData) {
    try {
      const {
        campaigns = [],
        metrics = [],
        dataSourcesStatus = {},
        optimizationQueue = []
      } = rawData;

      // Calculate aggregate metrics
      const totalMetrics = this._calculateTotalMetrics(metrics);
      const performanceScore = this._calculatePerformanceScore(totalMetrics);
      const healthScore = this._calculateHealthScore(dataSourcesStatus);

      // Trending analysis
      const trends = this._calculateTrends(metrics);

      return {
        summary: {
          totalCampaigns: campaigns.length,
          activeCampaigns: campaigns.filter(c => c.status === 'ENABLED').length,
          totalSpend: totalMetrics.cost,
          totalRevenue: totalMetrics.revenue,
          totalClicks: totalMetrics.clicks,
          totalImpressions: totalMetrics.impressions,
          performanceScore,
          healthScore
        },
        metrics: {
          ...totalMetrics,
          roas: this._calculateROAS(totalMetrics.revenue, totalMetrics.cost),
          ctr: this._calculateCTR(totalMetrics.clicks, totalMetrics.impressions),
          conversionRate: this._calculateConversionRate(totalMetrics.conversions, totalMetrics.clicks),
          avgCpc: this._calculateAvgCPC(totalMetrics.cost, totalMetrics.clicks),
          avgCpa: this._calculateAvgCPA(totalMetrics.cost, totalMetrics.conversions)
        },
        trends,
        optimization: {
          pendingActions: optimizationQueue.length,
          automationStatus: this._getAutomationStatus(dataSourcesStatus),
          lastOptimization: this._getLastOptimizationTime(optimizationQueue)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to transform system overview', { error: error.message });
      return this._getEmptySystemOverview();
    }
  }

  /**
   * =====================================
   * DATA SOURCES TRANSFORMATIONS
   * =====================================
   */

  /**
   * Transform data sources summary
   */
  transformDataSourcesSummary(rawSources) {
    try {
      const sources = {
        websiteScraper: this._transformDataSource(rawSources.websiteScraper, 'Website Scraper'),
        competitorIntelligence: this._transformDataSource(rawSources.competitorIntelligence, 'Competitor Intelligence'),
        trafficAnalyzer: this._transformDataSource(rawSources.trafficAnalyzer, 'Traffic Analyzer'),
        customerProfiler: this._transformDataSource(rawSources.customerProfiler, 'Customer Profiler'),
        serpMonitor: this._transformDataSource(rawSources.serpMonitor, 'SERP Monitor')
      };

      // Calculate overall status
      const statuses = Object.values(sources).map(s => s.status);
      const healthyCount = statuses.filter(s => s === 'healthy').length;
      const totalCount = statuses.length;

      return {
        sources,
        overall: {
          status: healthyCount === totalCount ? 'healthy' : healthyCount > totalCount / 2 ? 'warning' : 'error',
          healthyCount,
          totalCount,
          healthPercentage: Math.round((healthyCount / totalCount) * 100)
        },
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to transform data sources summary', { error: error.message });
      return this._getEmptyDataSourcesSummary();
    }
  }

  /**
   * =====================================
   * OPTIMIZATION QUEUE TRANSFORMATIONS
   * =====================================
   */

  /**
   * Transform optimization queue data
   */
  transformOptimizationQueue(rawQueue) {
    try {
      const queue = Array.isArray(rawQueue) ? rawQueue : [];

      // Group by priority and type
      const grouped = this._groupOptimizations(queue);

      // Calculate potential impact
      const impactAnalysis = this._calculateOptimizationImpact(queue);

      return {
        pending: {
          high: grouped.high,
          medium: grouped.medium,
          low: grouped.low,
          total: queue.length
        },
        byType: this._groupByType(queue),
        impactAnalysis,
        recommendedActions: this._getRecommendedActions(queue),
        automation: {
          autoApplyEnabled: this._checkAutoApplyStatus(queue),
          nextAutoRun: this._getNextAutoRun(),
          lastAutoRun: this._getLastAutoRun()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to transform optimization queue', { error: error.message });
      return this._getEmptyOptimizationQueue();
    }
  }

  /**
   * =====================================
   * PERFORMANCE METRICS TRANSFORMATIONS
   * =====================================
   */

  /**
   * Transform performance metrics with time series
   */
  transformPerformanceMetrics(rawMetrics, timeframe = '7d') {
    try {
      const metrics = Array.isArray(rawMetrics) ? rawMetrics : [];

      // Group by time period
      const timeSeries = this._createTimeSeries(metrics, timeframe);

      // Calculate period-over-period changes
      const periodComparison = this._calculatePeriodComparison(timeSeries, timeframe);

      // Calculate key performance indicators
      const kpis = this._calculateKPIs(metrics);

      // Segmentation analysis
      const segments = this._analyzeSegments(metrics);

      return {
        timeSeries,
        periodComparison,
        kpis,
        segments,
        benchmarks: this._calculateBenchmarks(metrics),
        insights: this._generatePerformanceInsights(kpis, periodComparison),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to transform performance metrics', { error: error.message });
      return this._getEmptyPerformanceMetrics();
    }
  }

  /**
   * =====================================
   * ACTIVITY FEED TRANSFORMATIONS
   * =====================================
   */

  /**
   * Transform activity feed data
   */
  transformActivityFeed(rawActivities, limit = 50) {
    try {
      const activities = Array.isArray(rawActivities) ? rawActivities : [];

      // Sort by timestamp (most recent first)
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      // Transform each activity
      const transformedActivities = sortedActivities.map(activity => ({
        id: activity.id || this._generateActivityId(),
        type: activity.type,
        action: activity.action,
        entity: activity.entity,
        details: this._transformActivityDetails(activity),
        impact: this._calculateActivityImpact(activity),
        timestamp: activity.timestamp,
        status: activity.status || 'completed',
        user: activity.user || 'System',
        priority: this._calculateActivityPriority(activity)
      }));

      // Group by time periods
      const grouped = this._groupActivitiesByTime(transformedActivities);

      return {
        activities: transformedActivities,
        grouped,
        summary: {
          total: transformedActivities.length,
          byType: this._countByType(transformedActivities),
          byStatus: this._countByStatus(transformedActivities),
          timeframe: this._getActivityTimeframe(transformedActivities)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to transform activity feed', { error: error.message });
      return this._getEmptyActivityFeed();
    }
  }

  /**
   * =====================================
   * PRIVATE HELPER METHODS
   * =====================================
   */

  /**
   * Calculate total metrics from raw data
   */
  _calculateTotalMetrics(metrics) {
    return metrics.reduce((totals, metric) => ({
      cost: totals.cost + (metric.cost_micros / this.constants.COST_MICROS_TO_DOLLARS),
      clicks: totals.clicks + (metric.clicks || 0),
      impressions: totals.impressions + (metric.impressions || 0),
      conversions: totals.conversions + (metric.conversions || 0),
      revenue: totals.revenue + (metric.revenue || metric.conversions * (metric.avg_order_value || 50))
    }), { cost: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 });
  }

  /**
   * Calculate performance score (0-100)
   */
  _calculatePerformanceScore(metrics) {
    const roas = this._calculateROAS(metrics.revenue, metrics.cost);
    const ctr = this._calculateCTR(metrics.clicks, metrics.impressions);
    const conversionRate = this._calculateConversionRate(metrics.conversions, metrics.clicks);

    // Weighted scoring
    const roasScore = Math.min(100, (roas / this.constants.PERFORMANCE_THRESHOLDS.TARGET_ROAS) * 100);
    const ctrScore = Math.min(100, (ctr / this.constants.PERFORMANCE_THRESHOLDS.EXCELLENT_CTR) * 100);
    const conversionScore = Math.min(100, (conversionRate / this.constants.PERFORMANCE_THRESHOLDS.EXCELLENT_CONVERSION_RATE) * 100);

    return Math.round((roasScore * 0.5 + ctrScore * 0.25 + conversionScore * 0.25));
  }

  /**
   * Calculate health score based on data sources
   */
  _calculateHealthScore(dataSourcesStatus) {
    const sources = Object.values(dataSourcesStatus);
    if (sources.length === 0) return 0;

    const healthyCount = sources.filter(s => s.status === 'healthy').length;
    return Math.round((healthyCount / sources.length) * 100);
  }

  /**
   * Calculate trends from time series data
   */
  _calculateTrends(metrics) {
    if (metrics.length < 2) return {};

    const sorted = metrics.sort((a, b) => new Date(a.date) - new Date(b.date));
    const recent = sorted.slice(-7); // Last 7 days
    const previous = sorted.slice(-14, -7); // Previous 7 days

    const recentTotals = this._calculateTotalMetrics(recent);
    const previousTotals = this._calculateTotalMetrics(previous);

    return {
      cost: this._calculatePercentageChange(previousTotals.cost, recentTotals.cost),
      clicks: this._calculatePercentageChange(previousTotals.clicks, recentTotals.clicks),
      conversions: this._calculatePercentageChange(previousTotals.conversions, recentTotals.conversions),
      revenue: this._calculatePercentageChange(previousTotals.revenue, recentTotals.revenue)
    };
  }

  /**
   * Transform individual data source
   */
  _transformDataSource(source, name) {
    if (!source) {
      return {
        name,
        status: 'unknown',
        lastUpdate: null,
        errorCount: 0,
        dataPoints: 0,
        health: 0
      };
    }

    return {
      name,
      status: source.status || 'unknown',
      lastUpdate: source.lastUpdate || source.timestamp,
      errorCount: source.errorCount || 0,
      dataPoints: source.dataPoints || source.count || 0,
      health: this._calculateSourceHealth(source),
      details: source.details || {}
    };
  }

  /**
   * Calculate source health percentage
   */
  _calculateSourceHealth(source) {
    if (!source) return 0;

    let health = 100;

    // Reduce health based on errors
    if (source.errorCount > 0) {
      health -= Math.min(50, source.errorCount * 10);
    }

    // Reduce health based on data freshness
    if (source.lastUpdate) {
      const hoursOld = (Date.now() - new Date(source.lastUpdate)) / (1000 * 60 * 60);
      if (hoursOld > 24) {
        health -= Math.min(30, (hoursOld - 24) * 2);
      }
    }

    // Reduce health if no data points
    if ((source.dataPoints || 0) === 0) {
      health -= 20;
    }

    return Math.max(0, Math.round(health));
  }

  /**
   * Group optimizations by priority
   */
  _groupOptimizations(queue) {
    return queue.reduce((groups, opt) => {
      const priority = opt.priority || 'medium';
      if (!groups[priority]) groups[priority] = [];
      groups[priority].push(opt);
      return groups;
    }, { high: [], medium: [], low: [] });
  }

  /**
   * Calculate optimization impact
   */
  _calculateOptimizationImpact(queue) {
    const totalPotentialSavings = queue.reduce((sum, opt) =>
      sum + (opt.estimatedSavings || 0), 0);
    const totalPotentialRevenue = queue.reduce((sum, opt) =>
      sum + (opt.estimatedRevenue || 0), 0);

    return {
      potentialSavings: totalPotentialSavings,
      potentialRevenue: totalPotentialRevenue,
      netImpact: totalPotentialRevenue - totalPotentialSavings,
      highImpactCount: queue.filter(opt =>
        (opt.estimatedSavings || 0) + (opt.estimatedRevenue || 0) > 100).length
    };
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   */
  _calculateROAS(revenue, cost) {
    return cost > 0 ? revenue / cost : 0;
  }

  /**
   * Calculate CTR (Click-Through Rate)
   */
  _calculateCTR(clicks, impressions) {
    return impressions > 0 ? (clicks / impressions) * this.constants.PERCENTAGE_MULTIPLIER : 0;
  }

  /**
   * Calculate Conversion Rate
   */
  _calculateConversionRate(conversions, clicks) {
    return clicks > 0 ? (conversions / clicks) * this.constants.PERCENTAGE_MULTIPLIER : 0;
  }

  /**
   * Calculate Average CPC
   */
  _calculateAvgCPC(cost, clicks) {
    return clicks > 0 ? cost / clicks : 0;
  }

  /**
   * Calculate Average CPA
   */
  _calculateAvgCPA(cost, conversions) {
    return conversions > 0 ? cost / conversions : 0;
  }

  /**
   * Calculate percentage change
   */
  _calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * this.constants.PERCENTAGE_MULTIPLIER;
  }

  /**
   * Create time series data
   */
  _createTimeSeries(metrics, timeframe) {
    const grouped = {};
    const sortedMetrics = metrics.sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedMetrics.forEach(metric => {
      const date = new Date(metric.date).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { cost: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 };
      }

      grouped[date].cost += metric.cost_micros / this.constants.COST_MICROS_TO_DOLLARS;
      grouped[date].clicks += metric.clicks || 0;
      grouped[date].impressions += metric.impressions || 0;
      grouped[date].conversions += metric.conversions || 0;
      grouped[date].revenue += metric.revenue || 0;
    });

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      ...data,
      roas: this._calculateROAS(data.revenue, data.cost),
      ctr: this._calculateCTR(data.clicks, data.impressions),
      conversionRate: this._calculateConversionRate(data.conversions, data.clicks)
    }));
  }

  /**
   * Generate activity ID
   */
  _generateActivityId() {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Empty data structures for error handling
   */
  _getEmptySystemOverview() {
    return {
      summary: { totalCampaigns: 0, activeCampaigns: 0, totalSpend: 0, totalRevenue: 0, performanceScore: 0, healthScore: 0 },
      metrics: { cost: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0, roas: 0, ctr: 0, conversionRate: 0 },
      trends: {},
      optimization: { pendingActions: 0, automationStatus: 'unknown', lastOptimization: null },
      timestamp: new Date().toISOString()
    };
  }

  _getEmptyDataSourcesSummary() {
    return {
      sources: {},
      overall: { status: 'unknown', healthyCount: 0, totalCount: 0, healthPercentage: 0 },
      lastUpdate: new Date().toISOString()
    };
  }

  _getEmptyOptimizationQueue() {
    return {
      pending: { high: [], medium: [], low: [], total: 0 },
      byType: {},
      impactAnalysis: { potentialSavings: 0, potentialRevenue: 0, netImpact: 0, highImpactCount: 0 },
      recommendedActions: [],
      automation: { autoApplyEnabled: false, nextAutoRun: null, lastAutoRun: null },
      timestamp: new Date().toISOString()
    };
  }

  _getEmptyPerformanceMetrics() {
    return {
      timeSeries: [],
      periodComparison: {},
      kpis: {},
      segments: {},
      benchmarks: {},
      insights: [],
      timestamp: new Date().toISOString()
    };
  }

  _getEmptyActivityFeed() {
    return {
      activities: [],
      grouped: {},
      summary: { total: 0, byType: {}, byStatus: {}, timeframe: null },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Additional helper methods with stub implementations
   */
  _calculatePeriodComparison(timeSeries, timeframe) { return {}; }
  _calculateKPIs(metrics) { return {}; }
  _analyzeSegments(metrics) { return {}; }
  _calculateBenchmarks(metrics) { return {}; }
  _generatePerformanceInsights(kpis, comparison) { return []; }
  _groupByType(queue) { return {}; }
  _getRecommendedActions(queue) { return []; }
  _checkAutoApplyStatus(queue) { return false; }
  _getNextAutoRun() { return null; }
  _getLastAutoRun() { return null; }
  _getAutomationStatus(sources) { return 'active'; }
  _getLastOptimizationTime(queue) { return null; }
  _transformActivityDetails(activity) { return activity.details || {}; }
  _calculateActivityImpact(activity) { return activity.impact || 'low'; }
  _calculateActivityPriority(activity) { return activity.priority || 'medium'; }
  _groupActivitiesByTime(activities) { return {}; }
  _countByType(activities) { return {}; }
  _countByStatus(activities) { return {}; }
  _getActivityTimeframe(activities) { return null; }
}

// Export singleton instance
const dashboardTransformer = new DashboardTransformerService();

export default dashboardTransformer;
export { DashboardTransformerService };