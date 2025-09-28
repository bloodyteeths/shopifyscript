/**
 * Dashboard Performance API Routes
 * Performance metrics and analytics endpoints
 *
 * Provides KPIs, ROI calculations, historical trends,
 * and period comparisons for performance monitoring
 */

import express from 'express';
import { validateShopifyAccess } from '../middleware/shopify-auth.js';
import { checkSubscriptionAccess } from '../middleware/subscription-check.js';
import { responseOptimizer } from '../middleware/response-optimizer.js';
import DashboardOrchestratorService from '../services/dashboard-orchestrator.js';
import logger from '../services/logger.js';

const router = express.Router();
const dashboardOrchestrator = new DashboardOrchestratorService();

/**
 * Common middleware for all performance routes
 */
router.use(async (req, res, next) => {
  try {
    // Validate Shopify session
    if (!req.session?.shopifySession) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime: 0
        }
      });
    }

    await validateShopifyAccess(req.session.shopifySession);

    // Attach shop domain for tenant access
    req.shopDomain = req.session.shopifySession.shop;

    next();
  } catch (error) {
    logger.error('Dashboard performance authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      metadata: {
        timestamp: new Date().toISOString(),
        cache: 'MISS',
        responseTime: 0
      }
    });
  }
});

/**
 * GET /api/dashboard/performance/metrics
 * Performance KPIs and key metrics
 */
router.get('/metrics',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const metricsData = await dashboardOrchestrator.getPerformanceMetrics(req.shopDomain, {
        metrics: req.query.metrics ? req.query.metrics.split(',') : [
          'conversion_rate', 'click_through_rate', 'cost_per_click',
          'revenue', 'profit_margin', 'customer_acquisition_cost'
        ],
        timeRange: req.query.timeRange || '30d',
        granularity: req.query.granularity || 'day',
        segments: req.query.segments ? req.query.segments.split(',') : null,
        campaigns: req.query.campaigns ? req.query.campaigns.split(',') : null,
        includeGoals: req.query.includeGoals === 'true',
        includeBenchmarks: req.query.includeBenchmarks === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: metricsData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: metricsData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Performance metrics error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * GET /api/dashboard/performance/roi
 * ROI calculations and profitability analysis
 */
router.get('/roi',
  checkSubscriptionAccess(['professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const roiData = await dashboardOrchestrator.getROIAnalysis(req.shopDomain, {
        timeRange: req.query.timeRange || '30d',
        breakdown: req.query.breakdown || 'campaign',
        includeProjections: req.query.includeProjections === 'true',
        includeCosts: req.query.includeCosts !== 'false',
        includeLifetimeValue: req.query.includeLifetimeValue === 'true',
        currency: req.query.currency || 'USD',
        segments: req.query.segments ? req.query.segments.split(',') : null
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: roiData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: roiData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('ROI analysis error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch ROI analysis',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * GET /api/dashboard/performance/trends
 * Historical trends and pattern analysis
 */
router.get('/trends',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const trendsData = await dashboardOrchestrator.getTrendsAnalysis(req.shopDomain, {
        metrics: req.query.metrics ? req.query.metrics.split(',') : [
          'traffic', 'conversions', 'revenue', 'engagement'
        ],
        timeRange: req.query.timeRange || '90d',
        granularity: req.query.granularity || 'week',
        trendType: req.query.trendType || 'linear',
        includeSeasonality: req.query.includeSeasonality === 'true',
        includeAnomalies: req.query.includeAnomalies === 'true',
        includeForecast: req.query.includeForecast === 'true',
        forecastDays: parseInt(req.query.forecastDays) || 30
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: trendsData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: trendsData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Trends analysis error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch trends analysis',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * GET /api/dashboard/performance/comparisons
 * Period-over-period and segment comparisons
 */
router.get('/comparisons',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const comparisonsData = await dashboardOrchestrator.getPerformanceComparisons(req.shopDomain, {
        primaryPeriod: req.query.primaryPeriod || '30d',
        comparisonPeriod: req.query.comparisonPeriod || 'previous_period',
        metrics: req.query.metrics ? req.query.metrics.split(',') : [
          'traffic', 'conversions', 'revenue', 'ctr', 'cpc'
        ],
        segments: req.query.segments ? req.query.segments.split(',') : null,
        campaigns: req.query.campaigns ? req.query.campaigns.split(',') : null,
        includePercentChange: req.query.includePercentChange !== 'false',
        includeSignificance: req.query.includeSignificance === 'true',
        groupBy: req.query.groupBy || 'overall'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: comparisonsData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: comparisonsData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Performance comparisons error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance comparisons',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * GET /api/dashboard/performance/attribution
 * Marketing attribution analysis
 */
router.get('/attribution',
  checkSubscriptionAccess(['professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const attributionData = await dashboardOrchestrator.getAttributionAnalysis(req.shopDomain, {
        model: req.query.model || 'last_click',
        timeRange: req.query.timeRange || '30d',
        includeChannels: req.query.includeChannels !== 'false',
        includeCampaigns: req.query.includeCampaigns === 'true',
        includeKeywords: req.query.includeKeywords === 'true',
        conversionWindow: parseInt(req.query.conversionWindow) || 30,
        viewThroughWindow: parseInt(req.query.viewThroughWindow) || 1
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: attributionData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: attributionData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Attribution analysis error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch attribution analysis',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * GET /api/dashboard/performance/cohorts
 * Cohort analysis for customer segments
 */
router.get('/cohorts',
  checkSubscriptionAccess(['enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const cohortData = await dashboardOrchestrator.getCohortAnalysis(req.shopDomain, {
        cohortType: req.query.cohortType || 'acquisition',
        timeRange: req.query.timeRange || '90d',
        granularity: req.query.granularity || 'week',
        metric: req.query.metric || 'retention',
        includeRevenue: req.query.includeRevenue === 'true',
        includeLifetimeValue: req.query.includeLifetimeValue === 'true',
        minCohortSize: parseInt(req.query.minCohortSize) || 10
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: cohortData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: cohortData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Cohort analysis error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch cohort analysis',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * POST /api/dashboard/performance/goals
 * Set or update performance goals
 */
router.post('/goals',
  checkSubscriptionAccess(['professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const goalsResult = await dashboardOrchestrator.setPerformanceGoals(req.shopDomain, {
        goals: req.body.goals || [],
        timeframe: req.body.timeframe || 'monthly',
        notifyOnProgress: req.body.notifyOnProgress === true,
        alertThresholds: req.body.alertThresholds || {}
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: goalsResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Set performance goals error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to set performance goals',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

/**
 * GET /api/dashboard/performance/export
 * Export performance data
 */
router.get('/export',
  checkSubscriptionAccess(['professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const exportData = await dashboardOrchestrator.exportPerformanceData(req.shopDomain, {
        format: req.query.format || 'csv',
        metrics: req.query.metrics ? req.query.metrics.split(',') : null,
        timeRange: req.query.timeRange || '30d',
        includeRawData: req.query.includeRawData === 'true',
        granularity: req.query.granularity || 'day'
      });

      const responseTime = Date.now() - startTime;

      // Set appropriate content type based on format
      const contentType = req.query.format === 'json' ? 'application/json' : 'text/csv';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="performance-data-${Date.now()}.${req.query.format || 'csv'}"`);

      res.json({
        success: true,
        data: exportData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Performance export error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to export performance data',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });
    }
  }
);

export default router;