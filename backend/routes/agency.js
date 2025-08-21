/**
 * Agency Management Routes
 * Handles agency-level operations, templates, and bulk management
 */

import express from "express";
import AgencyTemplateService from "../services/agency-templates.js";
import PDFReportService from "../services/pdf-reports.js";
import { hmacAuth } from "../middleware/security.js";

const router = express.Router();
const templateService = new AgencyTemplateService();
const reportService = new PDFReportService();

// ===== TEMPLATE MANAGEMENT =====

/**
 * Get all templates with optional filtering
 */
router.get("/templates", hmacAuth, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      tags: req.query.tags ? req.query.tags.split(",") : undefined,
      publicOnly: req.query.public_only === "true",
    };

    const templates = await templateService.getTemplates(filters);

    res.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Error getting templates:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get specific template by ID
 */
router.get("/templates/:templateId", hmacAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await templateService.getTemplate(templateId);

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Error getting template:", error);
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create new template
 */
router.post("/templates", hmacAuth, async (req, res) => {
  try {
    const templateData = req.body;
    const template = await templateService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      template,
      message: "Template created successfully",
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Update existing template
 */
router.put("/templates/:templateId", hmacAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    const template = await templateService.updateTemplate(templateId, updates);

    res.json({
      success: true,
      template,
      message: "Template updated successfully",
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Delete template
 */
router.delete("/templates/:templateId", hmacAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    await templateService.deleteTemplate(templateId);

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clone template to tenant
 */
router.post("/templates/:templateId/clone", hmacAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { targetTenantId, customizations } = req.body;

    if (!targetTenantId) {
      return res.status(400).json({
        success: false,
        error: "targetTenantId is required",
      });
    }

    const clonedConfig = await templateService.cloneToTenant(
      templateId,
      targetTenantId,
      customizations,
    );

    res.json({
      success: true,
      config: clonedConfig,
      message: `Template cloned to tenant ${targetTenantId}`,
    });
  } catch (error) {
    console.error("Error cloning template:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Bulk clone template to multiple tenants
 */
router.post("/templates/:templateId/bulk-clone", hmacAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { tenantConfigs } = req.body;

    if (!tenantConfigs || !Array.isArray(tenantConfigs)) {
      return res.status(400).json({
        success: false,
        error: "tenantConfigs array is required",
      });
    }

    const results = await templateService.bulkClone(templateId, tenantConfigs);

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      message: `Bulk clone completed: ${successCount}/${results.length} successful`,
    });
  } catch (error) {
    console.error("Error in bulk clone:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Export template
 */
router.get("/templates/:templateId/export", hmacAuth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const exportData = await templateService.exportTemplate(templateId);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${templateId}-export.json"`,
    );
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  } catch (error) {
    console.error("Error exporting template:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Import template
 */
router.post("/templates/import", hmacAuth, async (req, res) => {
  try {
    const { exportData, importOptions } = req.body;

    if (!exportData) {
      return res.status(400).json({
        success: false,
        error: "exportData is required",
      });
    }

    const template = await templateService.importTemplate(
      exportData,
      importOptions,
    );

    res.status(201).json({
      success: true,
      template,
      message: "Template imported successfully",
    });
  } catch (error) {
    console.error("Error importing template:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get template analytics
 */
router.get("/templates/analytics", hmacAuth, async (req, res) => {
  try {
    const analytics = await templateService.getTemplateAnalytics();

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Error getting template analytics:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== REPORT MANAGEMENT =====

/**
 * Generate weekly report for client
 */
router.post("/reports/weekly", hmacAuth, async (req, res) => {
  try {
    const reportConfig = req.body;

    if (
      !reportConfig.tenantId ||
      !reportConfig.clientName ||
      !reportConfig.metricsData
    ) {
      return res.status(400).json({
        success: false,
        error: "tenantId, clientName, and metricsData are required",
      });
    }

    const report = await reportService.generateWeeklyReport(reportConfig);

    res.json({
      success: true,
      report: {
        reportId: report.reportId,
        htmlPath: report.htmlPath,
        pdfPath: report.pdfPath,
      },
      message: "Weekly report generated successfully",
    });
  } catch (error) {
    console.error("Error generating weekly report:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Bulk generate reports for multiple clients
 */
router.post("/reports/bulk-weekly", hmacAuth, async (req, res) => {
  try {
    const { reportsConfig } = req.body;

    if (!reportsConfig || !Array.isArray(reportsConfig)) {
      return res.status(400).json({
        success: false,
        error: "reportsConfig array is required",
      });
    }

    const results = await reportService.bulkGenerateReports(reportsConfig);

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      message: `Bulk report generation completed: ${successCount}/${results.length} successful`,
    });
  } catch (error) {
    console.error("Error in bulk report generation:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get report history for tenant
 */
router.get("/reports/history/:tenantId", hmacAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const history = await reportService.getReportHistory(tenantId, limit);

    res.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error("Error getting report history:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== BULK OPERATIONS =====

/**
 * Bulk update tenant configurations
 */
router.post("/bulk/config-update", hmacAuth, async (req, res) => {
  try {
    const { tenantIds, configUpdates, updateMode = "merge" } = req.body;

    if (!tenantIds || !Array.isArray(tenantIds) || !configUpdates) {
      return res.status(400).json({
        success: false,
        error: "tenantIds array and configUpdates are required",
      });
    }

    const results = [];

    for (const tenantId of tenantIds) {
      try {
        // Here you would integrate with your tenant config service
        // For now, we'll simulate the operation
        const success = await simulateBulkConfigUpdate_(
          tenantId,
          configUpdates,
          updateMode,
        );

        results.push({
          tenantId,
          success: true,
          message: "Configuration updated successfully",
        });
      } catch (error) {
        results.push({
          tenantId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      message: `Bulk config update completed: ${successCount}/${results.length} successful`,
    });
  } catch (error) {
    console.error("Error in bulk config update:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Bulk pause/resume campaigns across tenants
 */
router.post("/bulk/campaign-status", hmacAuth, async (req, res) => {
  try {
    const { tenantIds, action, campaignNames } = req.body;

    if (
      !tenantIds ||
      !Array.isArray(tenantIds) ||
      !["pause", "resume"].includes(action)
    ) {
      return res.status(400).json({
        success: false,
        error: "tenantIds array and valid action (pause/resume) are required",
      });
    }

    const results = [];

    for (const tenantId of tenantIds) {
      try {
        // Here you would integrate with your ads script execution service
        const success = await simulateBulkCampaignAction_(
          tenantId,
          action,
          campaignNames,
        );

        results.push({
          tenantId,
          success: true,
          message: `Campaigns ${action}d successfully`,
        });
      } catch (error) {
        results.push({
          tenantId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      message: `Bulk campaign ${action} completed: ${successCount}/${results.length} successful`,
    });
  } catch (error) {
    console.error("Error in bulk campaign action:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Bulk add negative keywords across tenants
 */
router.post("/bulk/negative-keywords", hmacAuth, async (req, res) => {
  try {
    const { tenantIds, negativeKeywords, targetLevel = "campaign" } = req.body;

    if (
      !tenantIds ||
      !Array.isArray(tenantIds) ||
      !negativeKeywords ||
      !Array.isArray(negativeKeywords)
    ) {
      return res.status(400).json({
        success: false,
        error: "tenantIds and negativeKeywords arrays are required",
      });
    }

    const results = [];

    for (const tenantId of tenantIds) {
      try {
        // Here you would integrate with your ads script execution service
        const success = await simulateBulkNegativeKeywords_(
          tenantId,
          negativeKeywords,
          targetLevel,
        );

        results.push({
          tenantId,
          success: true,
          message: `${negativeKeywords.length} negative keywords added successfully`,
        });
      } catch (error) {
        results.push({
          tenantId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      message: `Bulk negative keywords added: ${successCount}/${results.length} successful`,
    });
  } catch (error) {
    console.error("Error in bulk negative keywords:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== AGENCY DASHBOARD DATA =====

/**
 * Get agency dashboard summary
 */
router.get("/dashboard/summary", hmacAuth, async (req, res) => {
  try {
    // This would integrate with your metrics collection service
    const summary = await getAgencyDashboardSummary_();

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Error getting dashboard summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get performance across all clients
 */
router.get("/dashboard/performance", hmacAuth, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || "last_7_days";
    const groupBy = req.query.group_by || "tenant";

    // This would integrate with your metrics collection service
    const performance = await getAgencyPerformanceData_(timeframe, groupBy);

    res.json({
      success: true,
      performance,
      timeframe,
      groupBy,
    });
  } catch (error) {
    console.error("Error getting performance data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get client alerts and notifications
 */
router.get("/dashboard/alerts", hmacAuth, async (req, res) => {
  try {
    const severity = req.query.severity; // 'low', 'medium', 'high'
    const limit = parseInt(req.query.limit) || 50;

    // This would integrate with your alerting service
    const alerts = await getAgencyAlerts_(severity, limit);

    res.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Error getting alerts:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== HELPER FUNCTIONS =====

async function simulateBulkConfigUpdate_(tenantId, configUpdates, updateMode) {
  // Simulate configuration update
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (Math.random() > 0.9) {
    throw new Error("Simulated config update error");
  }

  return true;
}

async function simulateBulkCampaignAction_(tenantId, action, campaignNames) {
  // Simulate campaign action
  await new Promise((resolve) => setTimeout(resolve, 150));

  if (Math.random() > 0.95) {
    throw new Error("Simulated campaign action error");
  }

  return true;
}

async function simulateBulkNegativeKeywords_(
  tenantId,
  negativeKeywords,
  targetLevel,
) {
  // Simulate negative keyword addition
  await new Promise((resolve) => setTimeout(resolve, 120));

  if (Math.random() > 0.93) {
    throw new Error("Simulated negative keyword error");
  }

  return true;
}

async function getAgencyDashboardSummary_() {
  // Simulate dashboard summary data
  return {
    totalClients: 25,
    activeCampaigns: 340,
    totalSpend: 125430.5,
    totalConversions: 1247,
    averageCPC: 2.34,
    averageConversionRate: 3.67,
    alertsCount: {
      high: 3,
      medium: 12,
      low: 28,
    },
    recentActivity: [
      { type: "template_used", count: 8, period: "today" },
      { type: "reports_generated", count: 15, period: "this_week" },
      { type: "bulk_operations", count: 4, period: "today" },
    ],
  };
}

async function getAgencyPerformanceData_(timeframe, groupBy) {
  // Simulate performance data
  const mockData = [];

  for (let i = 0; i < 25; i++) {
    mockData.push({
      id: `tenant_${i + 1}`,
      name: `Client ${i + 1}`,
      clicks: Math.floor(Math.random() * 5000) + 1000,
      cost: Math.random() * 10000 + 1000,
      conversions: Math.floor(Math.random() * 200) + 10,
      impressions: Math.floor(Math.random() * 50000) + 10000,
      ctr: Math.random() * 5 + 1,
      conversionRate: Math.random() * 8 + 1,
      costPerConversion: Math.random() * 100 + 20,
    });
  }

  return {
    data: mockData,
    totals: mockData.reduce(
      (acc, curr) => ({
        clicks: acc.clicks + curr.clicks,
        cost: acc.cost + curr.cost,
        conversions: acc.conversions + curr.conversions,
        impressions: acc.impressions + curr.impressions,
      }),
      { clicks: 0, cost: 0, conversions: 0, impressions: 0 },
    ),
  };
}

async function getAgencyAlerts_(severity, limit) {
  // Simulate alerts data
  const alerts = [];
  const alertTypes = [
    "Budget overspend",
    "Low conversion rate",
    "High CPC",
    "Campaign paused",
    "Ad disapproval",
    "Negative keyword conflict",
  ];

  for (let i = 0; i < Math.min(limit, 30); i++) {
    alerts.push({
      id: `alert_${i + 1}`,
      tenantId: `tenant_${Math.floor(Math.random() * 25) + 1}`,
      clientName: `Client ${Math.floor(Math.random() * 25) + 1}`,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity:
        severity || ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      message: "Sample alert message",
      createdAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      acknowledged: Math.random() > 0.7,
    });
  }

  return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default router;
