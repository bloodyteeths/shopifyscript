/**
 * Dashboard Insights API Routes
 * Data source endpoints for AI-powered insights
 *
 * Provides website analysis, competitor intelligence, traffic patterns,
 * customer segments, and SERP monitoring data
 */

import express from 'express';
import responseOptimizerMiddleware from '../middleware/response-optimizer.js';
import dashboardOrchestrator from '../services/dashboard-orchestrator.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * Common middleware for all insights routes
 * Extracts tenant from headers or query params (set by the Shopify UI proxy)
 */
router.use(async (req, res, next) => {
  try {
    const tenant = req.headers['x-tenant-id'] || req.query.tenant || req.query.shop;

    if (!tenant) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required — missing tenant identifier',
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime: 0
        }
      });
    }

    // Attach tenant/shop domain for downstream handlers
    req.shopDomain = String(tenant).replace('.myshopify.com', '');

    next();
  } catch (error) {
    logger.error('Dashboard insights authentication error:', error);
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
 * GET /api/dashboard/insights/website
 * Website content analysis and insights
 */
router.get('/website',
  responseOptimizerMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const websiteData = await dashboardOrchestrator.getWebsiteInsights(req.shopDomain, {
        includeContent: req.query.includeContent === 'true',
        analyzeSEO: req.query.analyzeSEO !== 'false',
        checkPerformance: req.query.checkPerformance === 'true',
        scanDepth: req.query.scanDepth || 'surface',
        pages: req.query.pages ? req.query.pages.split(',') : null,
        timeRange: req.query.timeRange || '7d'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: websiteData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: websiteData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Website insights error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch website insights',
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
 * GET /api/dashboard/insights/competitors
 * Competitor intelligence and analysis
 */
router.get('/competitors',
  responseOptimizerMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const competitorData = await dashboardOrchestrator.getCompetitorInsights(req.shopDomain, {
        competitors: req.query.competitors ? req.query.competitors.split(',') : null,
        analysisDepth: req.query.analysisDepth || 'standard',
        includeKeywords: req.query.includeKeywords === 'true',
        includePricing: req.query.includePricing === 'true',
        includeContent: req.query.includeContent === 'true',
        timeRange: req.query.timeRange || '30d',
        limit: parseInt(req.query.limit) || 10
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: competitorData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: competitorData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Competitor insights error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch competitor insights',
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
 * GET /api/dashboard/insights/traffic
 * Traffic patterns and user behavior analysis
 */
router.get('/traffic',
  responseOptimizerMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const trafficData = await dashboardOrchestrator.getTrafficInsights(req.shopDomain, {
        timeRange: req.query.timeRange || '7d',
        granularity: req.query.granularity || 'day',
        includeSegments: req.query.includeSegments === 'true',
        includeDevices: req.query.includeDevices === 'true',
        includeGeo: req.query.includeGeo === 'true',
        includeSources: req.query.includeSources !== 'false',
        comparePrevious: req.query.comparePrevious === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: trafficData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: trafficData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Traffic insights error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch traffic insights',
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
 * GET /api/dashboard/insights/customers
 * Customer segments and behavior analysis
 */
router.get('/customers',
  responseOptimizerMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const customerData = await dashboardOrchestrator.getCustomerInsights(req.shopDomain, {
        segmentBy: req.query.segmentBy || 'behavior',
        includeLifecycle: req.query.includeLifecycle === 'true',
        includeValue: req.query.includeValue === 'true',
        includePreferences: req.query.includePreferences === 'true',
        timeRange: req.query.timeRange || '30d',
        minSegmentSize: parseInt(req.query.minSegmentSize) || 10,
        maxSegments: parseInt(req.query.maxSegments) || 20
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: customerData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: customerData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Customer insights error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer insights',
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
 * GET /api/dashboard/insights/serp
 * SERP monitoring and ranking insights
 */
router.get('/serp',
  responseOptimizerMiddleware,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const serpData = await dashboardOrchestrator.getSerpInsights(req.shopDomain, {
        keywords: req.query.keywords ? req.query.keywords.split(',') : null,
        location: req.query.location || 'US',
        language: req.query.language || 'en',
        device: req.query.device || 'desktop',
        includeCompetitors: req.query.includeCompetitors === 'true',
        includeFeatures: req.query.includeFeatures === 'true',
        timeRange: req.query.timeRange || '30d',
        trackingHistory: req.query.trackingHistory === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: serpData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: serpData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('SERP insights error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch SERP insights',
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
 * POST /api/dashboard/insights/website/scan
 * Trigger a new website scan
 */
router.post('/website/scan',
  async (req, res) => {
    const startTime = Date.now();

    try {
      const scanResult = await dashboardOrchestrator.triggerWebsiteScan(req.shopDomain, {
        depth: req.body.depth || 'standard',
        pages: req.body.pages || [],
        priorityPages: req.body.priorityPages || [],
        includeImages: req.body.includeImages === true,
        checkAccessibility: req.body.checkAccessibility === true
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: scanResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Website scan error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to trigger website scan',
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
 * POST /api/dashboard/insights/competitors/add
 * Add a new competitor for monitoring
 */
router.post('/competitors/add',
  async (req, res) => {
    const startTime = Date.now();

    try {
      const addResult = await dashboardOrchestrator.addCompetitor(req.shopDomain, {
        competitorDomain: req.body.competitorDomain,
        competitorName: req.body.competitorName || null,
        monitoringLevel: req.body.monitoringLevel || 'standard',
        trackKeywords: req.body.trackKeywords || [],
        trackPricing: req.body.trackPricing === true,
        notifyChanges: req.body.notifyChanges === true
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: addResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Add competitor error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to add competitor',
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
 * DELETE /api/dashboard/insights/competitors/:id
 * Remove a competitor from monitoring
 */
router.delete('/competitors/:id',
  async (req, res) => {
    const startTime = Date.now();

    try {
      const removeResult = await dashboardOrchestrator.removeCompetitor(
        req.shopDomain,
        req.params.id
      );

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: removeResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Remove competitor error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to remove competitor',
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