/**
 * AI Dashboard API Routes
 * Provides endpoints for AI management and monitoring
 */

import express from 'express';
import { getAIProviderService } from '../services/ai-provider.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * Get AI provider status
 */
router.get('/provider/status', async (req, res) => {
  try {
    const aiService = getAIProviderService();
    const status = aiService.getStatus();

    res.json({
      ok: true,
      status: {
        status: status.initialized ? 'healthy' : 'offline',
        initialized: status.initialized,
        provider: status.provider,
        model: process.env.AI_MODEL || 'gemini-1.5-flash-8b',
        metrics: status.metrics
      }
    });
  } catch (error) {
    logger.error('Failed to get AI provider status', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to get AI provider status'
    });
  }
});

/**
 * Get token usage statistics
 */
router.get('/tokens/usage', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || 'proofkit';

    // Mock usage data for now
    const usage = {
      daily: { cost: 0.15, tokens: 1500 },
      monthly: { cost: 4.25, tokens: 42500 }
    };

    // Get budget limits from environment
    const dailyBudget = parseFloat(process.env.AI_DAILY_BUDGET || '10');
    const monthlyBudget = parseFloat(process.env.AI_MONTHLY_BUDGET || '100');
    const alertThreshold = parseFloat(process.env.AI_ALERT_THRESHOLD || '0.8');

    res.json({
      ok: true,
      usage: {
        current: {
          daily: {
            cost: usage?.daily?.cost || 0,
            tokens: usage?.daily?.tokens || 0
          },
          monthly: {
            cost: usage?.monthly?.cost || 0,
            tokens: usage?.monthly?.tokens || 0
          }
        },
        budget: {
          daily: dailyBudget,
          monthly: monthlyBudget,
          alert_threshold: alertThreshold
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get token usage', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to get token usage'
    });
  }
});

/**
 * Get AI-generated drafts
 */
router.get('/drafts', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || 'proofkit';

    // Mock drafts for now
    const drafts = {
      rsa_default: [
        {
          theme: 'Professional Services',
          headlines: [
            'Expert Digital Marketing',
            'Boost Your Online Presence',
            'Get More Customers Today'
          ],
          descriptions: [
            'Transform your business with our proven digital marketing strategies. Get results fast.',
            'Professional marketing services that deliver real ROI. Start growing your business today.'
          ],
          source: 'ai_generated',
          lint: {
            ok: true,
            errors: []
          }
        }
      ],
      library: []
    };

    res.json({
      ok: true,
      rsa_default: drafts.rsa_default || [],
      library: drafts.library || []
    });
  } catch (error) {
    logger.error('Failed to get AI drafts', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to get AI drafts'
    });
  }
});

/**
 * Accept selected AI drafts
 */
router.post('/accept', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || 'proofkit';
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'No items provided to accept'
      });
    }

    // Mock acceptance
    logger.info('Accepting AI drafts', { tenant, count: items.length });

    res.json({
      ok: true,
      accepted: items.length,
      message: `Accepted ${items.length} draft(s)`
    });
  } catch (error) {
    logger.error('Failed to accept drafts', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to accept drafts'
    });
  }
});

/**
 * Get AI activity logs
 */
router.get('/logs', async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || 'proofkit';
    const limit = parseInt(req.query.limit) || 10;

    // Mock logs for demonstration
    const logs = [
      {
        timestamp: new Date().toISOString(),
        operation: 'AI Writer',
        status: 'success',
        details: 'Generated 5 RSA headlines'
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        operation: 'Weekly Summary',
        status: 'success',
        details: 'Generated weekly performance summary'
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        operation: 'Anomaly Detection',
        status: 'success',
        details: 'Analyzed 150 keywords for anomalies'
      },
      {
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        operation: 'AI Insights',
        status: 'success',
        details: 'Generated performance insights report'
      },
      {
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        operation: 'Landing Page AI',
        status: 'success',
        details: 'Optimized landing page content'
      }
    ];

    res.json({
      ok: true,
      logs: logs.slice(0, limit)
    });
  } catch (error) {
    logger.error('Failed to get AI logs', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to get AI logs'
    });
  }
});

export default router;