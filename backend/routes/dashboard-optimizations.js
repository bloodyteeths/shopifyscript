/**
 * Dashboard Optimizations API Routes
 * Optimization management and action endpoints
 *
 * Provides pending/applied optimizations, history tracking,
 * and action endpoints for approval, rejection, and rollback
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
 * Common middleware for all optimization routes
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
    logger.error('Dashboard optimizations authentication error:', error);
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
 * GET /api/dashboard/optimizations/pending
 * Get pending optimizations awaiting approval
 */
router.get('/pending',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const pendingData = await dashboardOrchestrator.getPendingOptimizations(req.shopDomain, {
        types: req.query.types ? req.query.types.split(',') : null,
        priority: req.query.priority || null,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'impact_score',
        sortOrder: req.query.sortOrder || 'desc',
        includeImpact: req.query.includeImpact !== 'false',
        includeRisks: req.query.includeRisks === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: pendingData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: pendingData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Pending optimizations error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending optimizations',
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
 * GET /api/dashboard/optimizations/applied
 * Get applied optimizations and their performance
 */
router.get('/applied',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const appliedData = await dashboardOrchestrator.getAppliedOptimizations(req.shopDomain, {
        timeRange: req.query.timeRange || '30d',
        types: req.query.types ? req.query.types.split(',') : null,
        status: req.query.status || null,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0,
        includePerformance: req.query.includePerformance !== 'false',
        includeImpact: req.query.includeImpact === 'true',
        sortBy: req.query.sortBy || 'applied_date',
        sortOrder: req.query.sortOrder || 'desc'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: appliedData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: appliedData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Applied optimizations error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch applied optimizations',
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
 * GET /api/dashboard/optimizations/history
 * Get optimization history and trends
 */
router.get('/history',
  checkSubscriptionAccess(['professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const historyData = await dashboardOrchestrator.getOptimizationHistory(req.shopDomain, {
        timeRange: req.query.timeRange || '90d',
        granularity: req.query.granularity || 'week',
        types: req.query.types ? req.query.types.split(',') : null,
        includeMetrics: req.query.includeMetrics !== 'false',
        includeTrends: req.query.includeTrends === 'true',
        includeSuccess: req.query.includeSuccess === 'true',
        groupBy: req.query.groupBy || 'type'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: historyData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: historyData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Optimization history error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch optimization history',
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
 * POST /api/dashboard/actions/approve
 * Approve a pending optimization
 */
router.post('/actions/approve',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const approveResult = await dashboardOrchestrator.approveOptimization(req.shopDomain, {
        optimizationId: req.body.optimizationId,
        scheduleTime: req.body.scheduleTime || null,
        testDuration: req.body.testDuration || null,
        rollbackConditions: req.body.rollbackConditions || {},
        notifyOnComplete: req.body.notifyOnComplete !== false,
        userEmail: req.body.userEmail || null,
        approvalNote: req.body.approvalNote || null
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: approveResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Approve optimization error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to approve optimization',
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
 * POST /api/dashboard/actions/reject
 * Reject a pending optimization
 */
router.post('/actions/reject',
  checkSubscriptionAccess(['basic', 'professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const rejectResult = await dashboardOrchestrator.rejectOptimization(req.shopDomain, {
        optimizationId: req.body.optimizationId,
        reason: req.body.reason || 'User rejected',
        preventSimilar: req.body.preventSimilar === true,
        userEmail: req.body.userEmail || null,
        rejectionNote: req.body.rejectionNote || null
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: rejectResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Reject optimization error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to reject optimization',
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
 * POST /api/dashboard/actions/rollback
 * Rollback an applied optimization
 */
router.post('/actions/rollback',
  checkSubscriptionAccess(['professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const rollbackResult = await dashboardOrchestrator.rollbackOptimization(req.shopDomain, {
        optimizationId: req.body.optimizationId,
        reason: req.body.reason || 'Performance decline',
        preserveData: req.body.preserveData !== false,
        notifyOnComplete: req.body.notifyOnComplete !== false,
        userEmail: req.body.userEmail || null,
        rollbackNote: req.body.rollbackNote || null
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: rollbackResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Rollback optimization error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to rollback optimization',
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
 * GET /api/dashboard/optimizations/recommendations
 * Get AI-generated optimization recommendations
 */
router.get('/recommendations',
  checkSubscriptionAccess(['professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const recommendationsData = await dashboardOrchestrator.getOptimizationRecommendations(req.shopDomain, {
        priority: req.query.priority || 'high',
        types: req.query.types ? req.query.types.split(',') : null,
        limit: parseInt(req.query.limit) || 20,
        includeImpact: req.query.includeImpact !== 'false',
        includeRisks: req.query.includeRisks === 'true',
        autoGenerateNew: req.query.autoGenerateNew === 'true',
        excludeRecent: req.query.excludeRecent === 'true'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: recommendationsData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: recommendationsData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Optimization recommendations error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch optimization recommendations',
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
 * POST /api/dashboard/optimizations/batch-approve
 * Approve multiple optimizations at once
 */
router.post('/batch-approve',
  checkSubscriptionAccess(['professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const batchResult = await dashboardOrchestrator.batchApproveOptimizations(req.shopDomain, {
        optimizationIds: req.body.optimizationIds || [],
        scheduleTime: req.body.scheduleTime || null,
        rollbackConditions: req.body.rollbackConditions || {},
        staggerDeployment: req.body.staggerDeployment === true,
        userEmail: req.body.userEmail || null,
        batchNote: req.body.batchNote || null
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: batchResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Batch approve error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to batch approve optimizations',
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
 * GET /api/dashboard/optimizations/impact/:id
 * Get detailed impact analysis for a specific optimization
 */
router.get('/impact/:id',
  checkSubscriptionAccess(['professional', 'enterprise']),
  responseOptimizer,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const impactData = await dashboardOrchestrator.getOptimizationImpact(
        req.shopDomain,
        req.params.id,
        {
          timeRange: req.query.timeRange || '30d',
          includeProjections: req.query.includeProjections === 'true',
          compareBaseline: req.query.compareBaseline !== 'false',
          includeSegments: req.query.includeSegments === 'true',
          granularity: req.query.granularity || 'day'
        }
      );

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: impactData,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: impactData.fromCache ? 'HIT' : 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Optimization impact error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to fetch optimization impact',
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
 * POST /api/dashboard/optimizations/settings
 * Update optimization settings and preferences
 */
router.post('/settings',
  checkSubscriptionAccess(['professional', 'enterprise']),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const settingsResult = await dashboardOrchestrator.updateOptimizationSettings(req.shopDomain, {
        autoApprove: req.body.autoApprove || {},
        riskTolerance: req.body.riskTolerance || 'medium',
        notifications: req.body.notifications || {},
        schedulingPreferences: req.body.schedulingPreferences || {},
        excludedTypes: req.body.excludedTypes || [],
        approvalWorkflow: req.body.approvalWorkflow || 'manual'
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        data: settingsResult,
        metadata: {
          timestamp: new Date().toISOString(),
          cache: 'MISS',
          responseTime
        }
      });

    } catch (error) {
      logger.error('Update optimization settings error:', error);
      const responseTime = Date.now() - startTime;

      res.status(500).json({
        success: false,
        error: 'Failed to update optimization settings',
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