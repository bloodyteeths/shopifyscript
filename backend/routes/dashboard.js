/**
 * Dashboard API Routes
 * Main endpoints for the ProofKit AI Dashboard frontend
 *
 * Provides system overview, stats, health, activity, and notifications
 * Uses dashboard-orchestrator service for data aggregation
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
 * Common middleware for all dashboard routes
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
    logger.error('Dashboard authentication error:', error);
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
 * GET /api/dashboard/overview
 * System overview data with key metrics and status
 */
router.get('/overview',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const overviewData = await dashboardOrchestrator.getSystemOverview(req.shopDomain, {
        includeMetrics: true,
        includeHealth: true,
        includeRecentActivity: req.query.includeActivity === 'true',
        timeRange: req.query.timeRange || '24h'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: overviewData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: overviewData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Dashboard overview error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch system overview',
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
 * GET /api/dashboard/stats
 * Quick performance stats for dashboard widgets
 */
router.get('/stats',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const statsData = await dashboardOrchestrator.getQuickStats(req.shopDomain, {
        metrics: req.query.metrics ? req.query.metrics.split(',') : ['traffic', 'conversions', 'roi', 'optimization'],
        timeRange: req.query.timeRange || '7d',
        compareWith: req.query.compareWith || 'previous_period'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: statsData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: statsData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Dashboard stats error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard stats',
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
 * GET /api/dashboard/health
 * System health status for all services
 */
router.get('/health',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const healthData = await dashboardOrchestrator.getSystemHealth(req.shopDomain, {
        includeDetails: req.query.includeDetails === 'true',
        checkConnectivity: req.query.checkConnectivity === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: healthData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: healthData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Dashboard health error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health',
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
 * GET /api/dashboard/activity
 * Recent activity feed across all services
 */
router.get('/activity',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const activityData = await dashboardOrchestrator.getRecentActivity(req.shopDomain, {
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        types: req.query.types ? req.query.types.split(',') : null,
        timeRange: req.query.timeRange || '24h',
        includeMeta: req.query.includeMeta === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: activityData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: activityData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Dashboard activity error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch activity feed',
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
 * GET /api/dashboard/notifications
 * User notifications and alerts
 */
router.get('/notifications',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const notificationsData = await dashboardOrchestrator.getNotifications(req.shopDomain, {
        unreadOnly: req.query.unreadOnly === 'true',
        priority: req.query.priority || null,
        limit: parseInt(req.query.limit) || 25,
        offset: parseInt(req.query.offset) || 0,
        categories: req.query.categories ? req.query.categories.split(',') : null
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: notificationsData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: notificationsData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Dashboard notifications error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
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
 * POST /api/dashboard/notifications/:id/mark-read
 * Mark a notification as read
 */
router.post('/notifications/:id/mark-read',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const result = await dashboardOrchestrator.markNotificationRead(
        req.shopDomain,
        req.params.id
      );

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Mark notification read error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
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
 * POST /api/dashboard/refresh
 * Force refresh of dashboard data (clears cache)
 */
router.post('/refresh',
  checkSubscriptionAccess(['professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const result = await dashboardOrchestrator.forceRefresh(req.shopDomain, {
        services: req.body.services || ['all'],
        clearCache: req.body.clearCache !== false
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Dashboard refresh error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to refresh dashboard data',
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