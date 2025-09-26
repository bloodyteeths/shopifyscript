/**
 * AI Insights Routes
 * Handles endpoints for AI-powered analytics insights and recommendations
 */

import express from 'express';
import logger from '../services/logger.js';
import aiInsightsService from '../services/ai-insights.js';

const router = express.Router();

/**
 * Generate AI insights from analytics data
 * GET /api/ai/insights
 */
router.get('/insights', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || req.query.tenant;
    const period = req.query.period || req.query.w || '7d';

    if (!tenant) {
      return res.status(400).json({
        error: "Tenant ID is required",
        code: "MISSING_TENANT"
      });
    }

    logger.info('AI insights request', { tenant, period });

    // Validate period
    const validPeriods = ['24h', '7d', '30d', '90d'];
    const normalizedPeriod = validPeriods.includes(period) ? period : '7d';

    // First, get the metrics data from the existing analytics endpoint
    let metricsData = null;

    try {
      // Try to fetch metrics from Supabase/Sheets (similar to insights page)
      const backendUrl = process.env.BACKEND_PUBLIC_URL || 'https://ads-autopilot-backend.vercel.app/api';
      const metricsResponse = await fetch(
        `${backendUrl}/analytics/metrics/${tenant}?period=${normalizedPeriod}&type=all`,
        {
          method: 'GET',
          headers: {
            'X-Tenant-Id': tenant,
            'Accept': 'application/json'
          }
        }
      );

      if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json();
        metricsData = metricsResult.data;
        logger.info('Fetched metrics for AI insights', {
          tenant,
          period: normalizedPeriod,
          campaignCount: metricsData?.campaigns?.length || 0,
          source: metricsData?.source
        });
      } else {
        logger.warn('Failed to fetch metrics for AI insights', {
          tenant,
          period: normalizedPeriod,
          status: metricsResponse.status
        });
      }
    } catch (metricsError) {
      logger.error('Error fetching metrics for AI insights', {
        error: metricsError.message,
        tenant,
        period: normalizedPeriod
      });
    }

    // Generate AI insights from the metrics data
    const insights = await aiInsightsService.generateInsights(metricsData, normalizedPeriod, tenant);

    res.json({
      success: true,
      data: insights,
      tenant,
      period: normalizedPeriod,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('AI insights endpoint error', {
      error: error.message,
      stack: error.stack,
      tenant: req.headers['x-tenant-id'] || req.query.tenant,
      period: req.query.period || req.query.w
    });

    res.status(500).json({
      error: "Failed to generate AI insights",
      code: "AI_INSIGHTS_ERROR",
      message: error.message
    });
  }
});

/**
 * Clear AI insights cache
 * DELETE /api/ai/insights/cache
 */
router.delete('/insights/cache', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || req.query.tenant;
    const period = req.query.period;

    if (!tenant) {
      return res.status(400).json({
        error: "Tenant ID is required",
        code: "MISSING_TENANT"
      });
    }

    await aiInsightsService.clearCache(tenant, period);

    res.json({
      success: true,
      message: "AI insights cache cleared",
      tenant,
      period: period || 'all'
    });

  } catch (error) {
    logger.error('AI insights cache clear error', {
      error: error.message,
      tenant: req.headers['x-tenant-id'] || req.query.tenant
    });

    res.status(500).json({
      error: "Failed to clear AI insights cache",
      code: "CACHE_CLEAR_ERROR"
    });
  }
});

/**
 * Get AI insights summary for dashboard
 * GET /api/ai/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || req.query.tenant;
    const period = req.query.period || req.query.w || '7d';

    if (!tenant) {
      return res.status(400).json({
        error: "Tenant ID is required",
        code: "MISSING_TENANT"
      });
    }

    // Get full insights first
    const insights = await aiInsightsService.generateInsights(null, period, tenant);

    // Extract summary data
    const summary = {
      totalRecommendations: insights.recommendations?.length || 0,
      highPriorityIssues: insights.recommendations?.filter(r => r.priority === 'high').length || 0,
      potentialSavings: insights.costOptimization?.totalWaste || 0,
      topInsight: insights.overview?.[0] || null,
      lastUpdated: insights.timestamp
    };

    res.json({
      success: true,
      data: summary,
      tenant,
      period
    });

  } catch (error) {
    logger.error('AI insights summary error', {
      error: error.message,
      tenant: req.headers['x-tenant-id'] || req.query.tenant
    });

    res.status(500).json({
      error: "Failed to get AI insights summary",
      code: "AI_SUMMARY_ERROR"
    });
  }
});

export default router;