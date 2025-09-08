/**
 * Reports API Routes
 * Manages automated insights reporting and user preferences
 * Supports tier-specific report features and customization
 */

import express from 'express';
import reportGenerator from '../services/report-generator.js';
import scheduledReports from '../jobs/scheduled-reports.js';
import emailService from '../services/email-service.js';
import analyticsTiers from '../services/analytics-tiers.js';
import subscriptionCheck from '../middleware/subscription-check.js';

const { requireActiveSubscription, requireFeature, requireTier } = subscriptionCheck;

const router = express.Router();

/**
 * GET /api/reports/generate
 * Generate report on-demand for the current tenant
 */
router.get('/generate', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant, type = 'insights', format = 'json' } = req.query;
    const { tier } = req.subscription;

    console.log(`Generating on-demand ${type} report for tenant ${tenant} (${tier} tier)`);

    // Generate report
    const reportData = await reportGenerator.generateReport(tenant, type, {
      skipCache: req.query.fresh === 'true',
      includeCharts: format === 'json'
    });

    // Return report based on requested format
    if (format === 'email') {
      // Send via email instead of returning data
      const userEmail = req.query.email;
      if (!userEmail) {
        return res.status(400).json({
          ok: false,
          error: 'email_required',
          message: 'Email address required for email format'
        });
      }

      const emailResult = await reportGenerator.sendReportEmail(tenant, userEmail, reportData, { type });
      
      res.json({
        ok: true,
        message: 'Report sent via email',
        reportGenerated: true,
        emailSent: emailResult.success,
        messageId: emailResult.messageId
      });
    } else {
      // Return JSON data
      res.json({
        ok: true,
        report: reportData,
        generatedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Report generation failed:', error);
    res.status(500).json({
      ok: false,
      error: 'report_generation_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/send
 * Send existing or new report via email
 */
router.post('/send', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant, email, type = 'insights', subject, reportData } = req.body;
    
    if (!email) {
      return res.status(400).json({
        ok: false,
        error: 'email_required',
        message: 'Email address is required'
      });
    }

    let report = reportData;
    
    // Generate report if not provided
    if (!report) {
      report = await reportGenerator.generateReport(tenant, type);
    }

    // Send email
    const emailResult = await emailService.sendReportEmail(tenant, email, report, type);

    res.json({
      ok: true,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      message: 'Report sent successfully'
    });

  } catch (error) {
    console.error('Report send failed:', error);
    res.status(500).json({
      ok: false,
      error: 'report_send_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/settings
 * Get current report settings for tenant
 */
router.get('/settings', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant } = req.query;
    const { tier } = req.subscription;

    // Get tier features
    const tierFeatures = await analyticsTiers.getTierFeatures(tenant);
    
    // Build settings based on tier
    const settings = {
      tier,
      frequency: {
        current: reportGenerator.reportFrequency[tier],
        available: this.getAvailableFrequencies(tier),
        nextScheduled: await this.getNextScheduledReport(tenant, tier)
      },
      
      reportTypes: {
        insights: true,
        custom: tier === 'enterprise',
        available: this.getAvailableReportTypes(tier)
      },
      
      deliveryOptions: {
        email: true,
        dashboard: true,
        api: tier !== 'starter'
      },
      
      features: {
        weeklyReports: tierFeatures.weeklyReports,
        dailyReports: tierFeatures.dailyReports,
        customReports: tier === 'enterprise',
        realTimeData: tierFeatures.realTimeUpdates,
        advancedMetrics: tier !== 'starter',
        exportFormats: tierFeatures.exportFormats
      }
    };

    res.json({
      ok: true,
      settings
    });

  } catch (error) {
    console.error('Failed to get report settings:', error);
    res.status(500).json({
      ok: false,
      error: 'settings_fetch_failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/reports/settings
 * Update report settings (limited by tier)
 */
router.put('/settings', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant, settings } = req.body;
    const { tier } = req.subscription;

    // Validate settings against tier limitations
    const validationResult = await this.validateReportSettings(settings, tier);
    
    if (!validationResult.valid) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_settings',
        message: 'Settings not allowed for current tier',
        violations: validationResult.violations
      });
    }

    // In production, save settings to database
    // For now, return success
    console.log(`Updated report settings for tenant ${tenant}:`, settings);

    res.json({
      ok: true,
      message: 'Report settings updated successfully',
      settings: {
        ...settings,
        tier,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to update report settings:', error);
    res.status(500).json({
      ok: false,
      error: 'settings_update_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/history
 * Get report generation history
 */
router.get('/history', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant, limit = 20, offset = 0, type } = req.query;
    
    // In production, this would query a reports history database
    // For now, return mock history data
    const history = this.getMockReportHistory(tenant, limit, offset, type);

    res.json({
      ok: true,
      history,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: history.length,
        hasMore: offset + limit < history.length
      }
    });

  } catch (error) {
    console.error('Failed to get report history:', error);
    res.status(500).json({
      ok: false,
      error: 'history_fetch_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/test
 * Test report generation and email delivery
 */
router.post('/test', requireActiveSubscription(), async (req, res) => {
  try {
    const { tenant, email, type = 'insights' } = req.body;
    
    if (!email) {
      return res.status(400).json({
        ok: false,
        error: 'email_required'
      });
    }

    console.log(`Testing report delivery for tenant ${tenant}`);

    // Generate test report
    const reportData = await reportGenerator.generateReport(tenant, type, {
      skipCache: true
    });

    // Add test marker
    reportData.isTest = true;
    reportData.testTimestamp = new Date().toISOString();

    // Send test email
    const emailResult = await reportGenerator.sendReportEmail(tenant, email, reportData, {
      reportType: type,
      subject: `[TEST] ${reportData.reportName}`
    });

    res.json({
      ok: true,
      testCompleted: true,
      reportGenerated: true,
      emailSent: emailResult.success,
      messageId: emailResult.messageId,
      reportData: {
        tier: reportData.tier,
        frequency: reportData.frequency,
        generationTime: reportData.metadata.generationTime
      }
    });

  } catch (error) {
    console.error('Report test failed:', error);
    res.status(500).json({
      ok: false,
      error: 'test_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/schedule/status
 * Get scheduled reports status
 */
router.get('/schedule/status', requireActiveSubscription(), async (req, res) => {
  try {
    const jobStatus = scheduledReports.getJobStatus();
    const metrics = scheduledReports.getMetrics();

    res.json({
      ok: true,
      scheduler: {
        status: jobStatus.isRunning ? 'running' : 'stopped',
        jobs: jobStatus.jobs,
        metrics: {
          jobsExecuted: metrics.jobsExecuted,
          reportsGenerated: metrics.reportsGenerated,
          emailsSent: metrics.emailsSent,
          lastExecution: metrics.lastExecution,
          avgExecutionTime: metrics.avgExecutionTimeFormatted
        }
      }
    });

  } catch (error) {
    console.error('Failed to get schedule status:', error);
    res.status(500).json({
      ok: false,
      error: 'status_fetch_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/schedule/trigger
 * Manually trigger scheduled reports (admin only)
 */
router.post('/schedule/trigger', requireActiveSubscription(), async (req, res) => {
  try {
    const { tier, reportType = 'insights' } = req.body;
    
    if (!tier) {
      return res.status(400).json({
        ok: false,
        error: 'tier_required',
        message: 'Tier parameter required (starter, professional, enterprise)'
      });
    }

    console.log(`Manually triggering ${tier} reports`);

    const results = await scheduledReports.triggerReportsManually(tier, reportType);

    res.json({
      ok: true,
      triggered: true,
      tier,
      results: {
        success: results.success,
        failed: results.failed,
        errors: results.errors.slice(0, 5) // Limit error details
      }
    });

  } catch (error) {
    console.error('Manual report trigger failed:', error);
    res.status(500).json({
      ok: false,
      error: 'trigger_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/custom/templates - Enterprise only
 * Get available custom report templates
 */
router.get('/custom/templates', requireTier('enterprise'), async (req, res) => {
  try {
    const templates = [
      {
        id: 'executive_summary',
        name: 'Executive Summary',
        description: 'High-level KPIs and strategic insights',
        frequency: ['daily', 'weekly', 'monthly'],
        metrics: ['revenue', 'roas', 'customer_acquisition', 'performance_score']
      },
      {
        id: 'customer_lifecycle',
        name: 'Customer Lifecycle Analysis',
        description: 'Detailed customer journey and lifetime value analysis',
        frequency: ['weekly', 'monthly'],
        metrics: ['clv', 'retention_rate', 'churn_risk', 'segment_performance']
      },
      {
        id: 'performance_benchmarks',
        name: 'Performance Benchmarking',
        description: 'Compare performance against industry benchmarks',
        frequency: ['monthly', 'quarterly'],
        metrics: ['industry_comparison', 'competitive_analysis', 'market_position']
      }
    ];

    res.json({
      ok: true,
      templates
    });

  } catch (error) {
    console.error('Failed to get custom templates:', error);
    res.status(500).json({
      ok: false,
      error: 'templates_fetch_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/reports/custom/generate - Enterprise only
 * Generate custom report
 */
router.post('/custom/generate', requireTier('enterprise'), async (req, res) => {
  try {
    const { tenant, template, metrics, timeframe, email } = req.body;

    if (!template) {
      return res.status(400).json({
        ok: false,
        error: 'template_required'
      });
    }

    console.log(`Generating custom report for tenant ${tenant}: ${template}`);

    // Generate custom report
    const reportData = await reportGenerator.generateReport(tenant, 'custom', {
      template,
      metrics,
      timeframe,
      skipCache: true
    });

    // Send via email if requested
    if (email) {
      const emailResult = await reportGenerator.sendReportEmail(tenant, email, reportData, {
        reportType: 'custom'
      });
      
      res.json({
        ok: true,
        report: reportData,
        emailSent: emailResult.success,
        messageId: emailResult.messageId
      });
    } else {
      res.json({
        ok: true,
        report: reportData
      });
    }

  } catch (error) {
    console.error('Custom report generation failed:', error);
    res.status(500).json({
      ok: false,
      error: 'custom_report_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/metrics
 * Get report service metrics and health
 */
router.get('/metrics', requireActiveSubscription(), async (req, res) => {
  try {
    const reportMetrics = reportGenerator.getMetrics();
    const emailMetrics = emailService.getMetrics();
    const schedulerMetrics = scheduledReports.getMetrics();

    res.json({
      ok: true,
      metrics: {
        reportGenerator: reportMetrics,
        emailService: emailMetrics,
        scheduler: schedulerMetrics
      },
      health: {
        reportGenerator: 'healthy',
        emailService: emailMetrics.isConfigured ? 'healthy' : 'unhealthy',
        scheduler: schedulerMetrics.isRunning ? 'healthy' : 'stopped'
      }
    });

  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({
      ok: false,
      error: 'metrics_fetch_failed',
      message: error.message
    });
  }
});

// Helper methods attached to router for internal use
router.getAvailableFrequencies = function(tier) {
  switch (tier) {
    case 'starter':
      return ['monthly'];
    case 'professional':
      return ['weekly', 'monthly'];
    case 'enterprise':
      return ['daily', 'weekly', 'monthly'];
    default:
      return ['monthly'];
  }
};

router.getAvailableReportTypes = function(tier) {
  const types = ['insights'];
  if (tier === 'enterprise') {
    types.push('custom', 'executive', 'benchmark');
  }
  return types;
};

router.getNextScheduledReport = async function(tenant, tier) {
  // This would calculate the next scheduled report time based on tier
  const frequency = reportGenerator.reportFrequency[tier];
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      return tomorrow.toISOString();
      
    case 'weekly':
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + (7 - nextMonday.getDay() + 1) % 7);
      nextMonday.setHours(9, 0, 0, 0);
      return nextMonday.toISOString();
      
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(10, 0, 0, 0);
      return nextMonth.toISOString();
      
    default:
      return null;
  }
};

router.validateReportSettings = async function(settings, tier) {
  const violations = [];
  
  // Check frequency restrictions
  if (settings.frequency) {
    const allowed = this.getAvailableFrequencies(tier);
    if (!allowed.includes(settings.frequency)) {
      violations.push(`Frequency '${settings.frequency}' not available for ${tier} tier`);
    }
  }
  
  // Check report type restrictions
  if (settings.reportTypes) {
    const allowed = this.getAvailableReportTypes(tier);
    for (const type of settings.reportTypes) {
      if (!allowed.includes(type)) {
        violations.push(`Report type '${type}' not available for ${tier} tier`);
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
};

router.getMockReportHistory = function(tenant, limit, offset, type) {
  // Mock report history - in production this would query the database
  const history = [];
  const now = new Date();
  
  for (let i = 0; i < Math.min(limit, 10); i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 7)); // Weekly reports
    
    history.push({
      id: `report_${tenant}_${date.getTime()}`,
      tenant,
      type: type || 'insights',
      status: 'completed',
      generatedAt: date.toISOString(),
      sentAt: date.toISOString(),
      generationTime: Math.floor(Math.random() * 5000) + 1000,
      emailSent: true,
      downloadUrl: `/api/reports/download/report_${tenant}_${date.getTime()}`
    });
  }
  
  return history;
};

export default router;