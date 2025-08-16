/**
 * Alert Configuration Routes
 * RESTful API for managing alert channels, thresholds, and monitoring settings
 */

import { alertsService } from '../services/alerts.js';
import { anomalyDetectionService } from '../services/anomaly-detection.js';
import { runWeeklySummary } from '../jobs/weekly_summary.js';
import logger from '../services/logger.js';

/**
 * Alert Channels Management
 */

/**
 * Get all alert channels for a tenant
 * GET /api/alerts/channels/:tenant
 */
export async function getAlertChannels(req, res) {
  try {
    const { tenant } = req.params;
    
    const channels = alertsService.getChannels(tenant);
    const stats = alertsService.getDeliveryStats(tenant);
    
    res.json({
      success: true,
      data: {
        channels,
        deliveryStats: stats,
        total: channels.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to get alert channels', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert channels',
      details: error.message
    });
  }
}

/**
 * Create a new alert channel
 * POST /api/alerts/channels/:tenant
 */
export async function createAlertChannel(req, res) {
  try {
    const { tenant } = req.params;
    const { type, name, config } = req.body;
    
    // Validate required fields
    if (!type || !name || !config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, name, config'
      });
    }
    
    // Validate channel type
    const validTypes = ['slack', 'email', 'webhook'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid channel type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Generate channel ID
    const channelId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate channel-specific configuration
    const validationResult = validateChannelConfig(type, config);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid channel configuration',
        details: validationResult.errors
      });
    }
    
    // Register the channel
    alertsService.registerChannel(tenant, channelId, {
      type,
      name,
      ...config,
      createdBy: req.user?.id || 'system',
      createdAt: new Date().toISOString()
    });
    
    logger.info('Alert channel created', { tenant, channelId, type, name });
    
    res.status(201).json({
      success: true,
      data: {
        channelId,
        type,
        name,
        message: 'Alert channel created successfully'
      }
    });
    
  } catch (error) {
    logger.error('Failed to create alert channel', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to create alert channel',
      details: error.message
    });
  }
}

/**
 * Update an existing alert channel
 * PUT /api/alerts/channels/:tenant/:channelId
 */
export async function updateAlertChannel(req, res) {
  try {
    const { tenant, channelId } = req.params;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates.id;
    delete updates.tenant;
    delete updates.createdAt;
    delete updates.createdBy;
    
    updates.updatedBy = req.user?.id || 'system';
    updates.updatedAt = new Date().toISOString();
    
    alertsService.updateChannel(tenant, channelId, updates);
    
    logger.info('Alert channel updated', { tenant, channelId, updates });
    
    res.json({
      success: true,
      data: {
        channelId,
        message: 'Alert channel updated successfully'
      }
    });
    
  } catch (error) {
    logger.error('Failed to update alert channel', { 
      error: error.message, 
      tenant: req.params.tenant,
      channelId: req.params.channelId 
    });
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Alert channel not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update alert channel',
        details: error.message
      });
    }
  }
}

/**
 * Delete an alert channel
 * DELETE /api/alerts/channels/:tenant/:channelId
 */
export async function deleteAlertChannel(req, res) {
  try {
    const { tenant, channelId } = req.params;
    
    const removed = alertsService.removeChannel(tenant, channelId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Alert channel not found'
      });
    }
    
    logger.info('Alert channel deleted', { tenant, channelId });
    
    res.json({
      success: true,
      data: {
        channelId,
        message: 'Alert channel deleted successfully'
      }
    });
    
  } catch (error) {
    logger.error('Failed to delete alert channel', { 
      error: error.message, 
      tenant: req.params.tenant,
      channelId: req.params.channelId 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert channel',
      details: error.message
    });
  }
}

/**
 * Test an alert channel
 * POST /api/alerts/channels/:tenant/:channelId/test
 */
export async function testAlertChannel(req, res) {
  try {
    const { tenant, channelId } = req.params;
    
    const result = await alertsService.testChannel(tenant, channelId);
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Test alert sent successfully' : 'Test alert failed'
    });
    
  } catch (error) {
    logger.error('Failed to test alert channel', { 
      error: error.message, 
      tenant: req.params.tenant,
      channelId: req.params.channelId 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to test alert channel',
      details: error.message
    });
  }
}

/**
 * Anomaly Detection Configuration
 */

/**
 * Get anomaly detection settings
 * GET /api/alerts/anomaly-settings/:tenant
 */
export async function getAnomalySettings(req, res) {
  try {
    const { tenant } = req.params;
    
    const thresholds = anomalyDetectionService.getThresholds(tenant);
    const summary = anomalyDetectionService.getAnomalySummary(tenant);
    
    res.json({
      success: true,
      data: {
        thresholds,
        summary,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get anomaly settings', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve anomaly settings',
      details: error.message
    });
  }
}

/**
 * Update anomaly detection thresholds
 * PUT /api/alerts/anomaly-settings/:tenant
 */
export async function updateAnomalySettings(req, res) {
  try {
    const { tenant } = req.params;
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid thresholds object'
      });
    }
    
    // Validate threshold values
    const validationResult = validateThresholds(thresholds);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid threshold values',
        details: validationResult.errors
      });
    }
    
    anomalyDetectionService.setThresholds(tenant, thresholds);
    
    logger.info('Anomaly detection thresholds updated', { tenant, thresholds });
    
    res.json({
      success: true,
      data: {
        thresholds: anomalyDetectionService.getThresholds(tenant),
        message: 'Anomaly detection settings updated successfully'
      }
    });
    
  } catch (error) {
    logger.error('Failed to update anomaly settings', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to update anomaly settings',
      details: error.message
    });
  }
}

/**
 * Manual anomaly detection run
 * POST /api/alerts/anomaly-detection/:tenant/run
 */
export async function runAnomalyDetection(req, res) {
  try {
    const { tenant } = req.params;
    const { timeWindow = '24h' } = req.body;
    
    const results = await anomalyDetectionService.detectAnomalies(tenant, timeWindow);
    
    // Send alerts if any were found
    if (results.alerts.length > 0 || results.warnings.length > 0) {
      const allAnomalies = [...results.alerts, ...results.warnings];
      
      for (const anomaly of allAnomalies) {
        try {
          await alertsService.sendAlert(tenant, {
            ...anomaly,
            tenant,
            timestamp: results.timestamp
          });
        } catch (alertError) {
          logger.warn('Failed to send alert for anomaly', { 
            tenant, 
            anomaly: anomaly.type, 
            error: alertError.message 
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: results,
      message: `Found ${results.alerts.length} alerts and ${results.warnings.length} warnings`
    });
    
  } catch (error) {
    logger.error('Failed to run anomaly detection', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to run anomaly detection',
      details: error.message
    });
  }
}

/**
 * Suppress specific alert type
 * POST /api/alerts/suppress/:tenant
 */
export async function suppressAlert(req, res) {
  try {
    const { tenant } = req.params;
    const { alertType, severity, durationMs = 3600000 } = req.body; // Default 1 hour
    
    if (!alertType || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: alertType, severity'
      });
    }
    
    anomalyDetectionService.suppressAlert(tenant, alertType, severity, durationMs);
    
    const suppressedUntil = new Date(Date.now() + durationMs).toISOString();
    
    logger.info('Alert suppressed', { tenant, alertType, severity, suppressedUntil });
    
    res.json({
      success: true,
      data: {
        alertType,
        severity,
        suppressedUntil,
        message: 'Alert suppressed successfully'
      }
    });
    
  } catch (error) {
    logger.error('Failed to suppress alert', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to suppress alert',
      details: error.message
    });
  }
}

/**
 * Weekly Summary Management
 */

/**
 * Generate weekly summary manually
 * POST /api/alerts/weekly-summary/:tenant/generate
 */
export async function generateWeeklySummary(req, res) {
  try {
    const { tenant } = req.params;
    const options = req.body || {};
    
    const result = await runWeeklySummary(tenant, options);
    
    if (result.ok) {
      // Send weekly summary via configured channels
      try {
        await alertsService.sendWeeklySummary(tenant, result.summary, {
          dashboardUrl: `${req.protocol}://${req.get('host')}/dashboard/${tenant}`,
          settingsUrl: `${req.protocol}://${req.get('host')}/settings/${tenant}`
        });
      } catch (alertError) {
        logger.warn('Failed to send weekly summary alert', { 
          tenant, 
          error: alertError.message 
        });
      }
      
      res.json({
        success: true,
        data: result,
        message: 'Weekly summary generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate weekly summary'
      });
    }
    
  } catch (error) {
    logger.error('Failed to generate weekly summary', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly summary',
      details: error.message
    });
  }
}

/**
 * Get alert delivery history
 * GET /api/alerts/history/:tenant
 */
export async function getAlertHistory(req, res) {
  try {
    const { tenant } = req.params;
    const { limit = 50, offset = 0, severity, type } = req.query;
    
    const stats = alertsService.getDeliveryStats(tenant);
    const anomalySummary = anomalyDetectionService.getAnomalySummary(tenant);
    
    // Note: In a production environment, you'd typically store this in a database
    // For now, we'll return the in-memory data from the services
    
    res.json({
      success: true,
      data: {
        deliveryStats: stats,
        anomalySummary: anomalySummary,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: stats.totalDeliveries
        },
        filters: {
          severity,
          type
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to get alert history', { error: error.message, tenant: req.params.tenant });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert history',
      details: error.message
    });
  }
}

/**
 * Helper Functions
 */

/**
 * Validate channel configuration based on type
 */
function validateChannelConfig(type, config) {
  const errors = [];
  
  switch (type) {
    case 'slack':
      if (!config.webhookUrl) {
        errors.push('webhookUrl is required for Slack channels');
      }
      if (config.webhookUrl && !isValidUrl(config.webhookUrl)) {
        errors.push('Invalid webhook URL format');
      }
      break;
      
    case 'email':
      if (!config.recipients || !Array.isArray(config.recipients) || config.recipients.length === 0) {
        errors.push('recipients array is required for email channels');
      }
      if (config.recipients) {
        const invalidEmails = config.recipients.filter(email => !isValidEmail(email));
        if (invalidEmails.length > 0) {
          errors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        }
      }
      break;
      
    case 'webhook':
      if (!config.url) {
        errors.push('url is required for webhook channels');
      }
      if (config.url && !isValidUrl(config.url)) {
        errors.push('Invalid webhook URL format');
      }
      break;
      
    default:
      errors.push(`Unsupported channel type: ${type}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate anomaly detection thresholds
 */
function validateThresholds(thresholds) {
  const errors = [];
  
  const numericFields = [
    'cpa_spike_percent',
    'cost_spike_percent', 
    'conversion_drop_percent',
    'ctr_drop_percent',
    'cost_daily_threshold',
    'cost_weekly_threshold',
    'zero_conversions_hours',
    'low_conversion_rate_percent'
  ];
  
  for (const field of numericFields) {
    if (thresholds[field] !== undefined) {
      const value = thresholds[field];
      if (typeof value !== 'number' || value < 0) {
        errors.push(`${field} must be a positive number`);
      }
      
      // Specific validation rules
      if (field.includes('_percent') && value > 1000) {
        errors.push(`${field} percentage should be reasonable (< 1000%)`);
      }
      
      if (field === 'zero_conversions_hours' && value > 168) {
        errors.push('zero_conversions_hours should not exceed 168 hours (1 week)');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}