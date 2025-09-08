/**
 * Dashboard Management API Routes
 * Enterprise-exclusive custom dashboard endpoints
 * 
 * Routes:
 * - GET /dashboards - List all dashboards
 * - POST /dashboards - Create new dashboard
 * - POST /dashboards/from-template - Create from template
 * - GET /dashboards/:id - Get dashboard details
 * - PUT /dashboards/:id - Update dashboard
 * - DELETE /dashboards/:id - Delete dashboard
 * - GET /dashboards/:id/widgets - Get dashboard widgets
 * - POST /dashboards/:id/widgets - Add widget
 * - PUT /dashboards/:id/widgets/:widgetId - Update widget
 * - DELETE /dashboards/:id/widgets/:widgetId - Delete widget
 * - GET /dashboards/:id/widgets/:widgetId/data - Get widget data
 * - GET /dashboards/templates - Get available templates
 * - POST /dashboards/:id/export - Export dashboard
 * - POST /dashboards/:id/share - Generate share link
 */

import express from "express";
import rateLimit from "express-rate-limit";
import dashboardBuilder from "../services/dashboard-builder.js";
import analyticsTiers from "../services/analytics-tiers.js";
import { requireFeature, requireTier } from "../middleware/tier-enforcement.js";
import subscriptionCheck from "../middleware/subscription-check.js";

const router = express.Router();

// Rate limiting for dashboard operations
const dashboardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many dashboard requests from this IP",
    code: "RATE_LIMIT_EXCEEDED"
  }
});

// Apply rate limiting to all dashboard routes
router.use(dashboardRateLimit);

// Middleware to extract tenant from request
const extractTenant = (req, res, next) => {
  const tenant = req.headers['x-tenant-id'] || req.query.tenant || req.shop?.domain?.replace('.myshopify.com', '') || req.user?.tenant_id;
  
  if (!tenant) {
    return res.status(400).json({
      error: "Tenant ID is required",
      code: "MISSING_TENANT"
    });
  }
  
  req.tenant = tenant;
  next();
};

// Apply middleware to all routes
router.use(subscriptionCheck.checkSubscription);
router.use(extractTenant);

/**
 * GET /dashboards - List all dashboards for tenant
 */
router.get('/', 
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { include_widgets, limit, offset } = req.query;
      
      const result = await dashboardBuilder.getDashboards(req.tenant, {
        includeWidgets: include_widgets === 'true',
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      if (!result.success) {
        if (result.upgradeRequired) {
          return res.status(403).json({
            error: result.error,
            code: "UPGRADE_REQUIRED",
            requiredTier: "enterprise",
            upgradeUrl: "/app/billing"
          });
        }
        
        return res.status(400).json({
          error: result.error,
          code: "DASHBOARD_LIST_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data,
        meta: {
          count: result.data.length,
          hasMore: result.data.length >= (parseInt(limit) || 50)
        }
      });

    } catch (error) {
      console.error('Error listing dashboards:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "DASHBOARD_LIST_FAILED"
      });
    }
  }
);

/**
 * POST /dashboards - Create new dashboard
 */
router.post('/',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { dashboard_name, description, layout_config, theme_config, is_default } = req.body;

      if (!dashboard_name || dashboard_name.trim().length === 0) {
        return res.status(400).json({
          error: "Dashboard name is required",
          code: "MISSING_DASHBOARD_NAME"
        });
      }

      const result = await dashboardBuilder.createDashboard(req.tenant, {
        dashboard_name: dashboard_name.trim(),
        description,
        layout_config,
        theme_config,
        is_default
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "DASHBOARD_CREATE_ERROR"
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error creating dashboard:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "DASHBOARD_CREATE_FAILED"
      });
    }
  }
);

/**
 * POST /dashboards/from-template - Create dashboard from template
 */
router.post('/from-template',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { template_id, dashboard_name } = req.body;

      if (!template_id || !dashboard_name) {
        return res.status(400).json({
          error: "Template ID and dashboard name are required",
          code: "MISSING_TEMPLATE_DATA"
        });
      }

      const result = await dashboardBuilder.createDashboardFromTemplate(
        req.tenant,
        template_id,
        dashboard_name.trim()
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "TEMPLATE_CREATE_ERROR"
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error creating dashboard from template:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "TEMPLATE_CREATE_FAILED"
      });
    }
  }
);

/**
 * GET /dashboards/:id - Get dashboard details
 */
router.get('/:id',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      
      if (isNaN(dashboardId)) {
        return res.status(400).json({
          error: "Invalid dashboard ID",
          code: "INVALID_DASHBOARD_ID"
        });
      }

      const dashboard = await dashboardBuilder.getDashboard(req.tenant, dashboardId);

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      console.error('Error getting dashboard:', error);
      
      if (error.message === 'Dashboard not found') {
        return res.status(404).json({
          error: "Dashboard not found",
          code: "DASHBOARD_NOT_FOUND"
        });
      }

      res.status(500).json({
        error: "Internal server error",
        code: "DASHBOARD_GET_FAILED"
      });
    }
  }
);

/**
 * PUT /dashboards/:id - Update dashboard
 */
router.put('/:id',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      
      if (isNaN(dashboardId)) {
        return res.status(400).json({
          error: "Invalid dashboard ID",
          code: "INVALID_DASHBOARD_ID"
        });
      }

      const allowedUpdates = [
        'dashboard_name', 
        'description', 
        'layout_config', 
        'theme_config', 
        'is_default'
      ];

      const updates = {};
      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No valid updates provided",
          code: "NO_UPDATES"
        });
      }

      const result = await dashboardBuilder.updateDashboard(req.tenant, dashboardId, updates);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "DASHBOARD_UPDATE_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error updating dashboard:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "DASHBOARD_UPDATE_FAILED"
      });
    }
  }
);

/**
 * DELETE /dashboards/:id - Delete dashboard
 */
router.delete('/:id',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      
      if (isNaN(dashboardId)) {
        return res.status(400).json({
          error: "Invalid dashboard ID",
          code: "INVALID_DASHBOARD_ID"
        });
      }

      const result = await dashboardBuilder.deleteDashboard(req.tenant, dashboardId);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "DASHBOARD_DELETE_ERROR"
        });
      }

      res.json({
        success: true,
        message: "Dashboard deleted successfully"
      });

    } catch (error) {
      console.error('Error deleting dashboard:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "DASHBOARD_DELETE_FAILED"
      });
    }
  }
);

/**
 * POST /dashboards/:id/widgets - Add widget to dashboard
 */
router.post('/:id/widgets',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      
      if (isNaN(dashboardId)) {
        return res.status(400).json({
          error: "Invalid dashboard ID",
          code: "INVALID_DASHBOARD_ID"
        });
      }

      const requiredFields = ['widget_type', 'widget_title', 'data_source', 'position_config', 'widget_config'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: "MISSING_WIDGET_FIELDS"
        });
      }

      const result = await dashboardBuilder.addWidget(req.tenant, dashboardId, req.body);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "WIDGET_ADD_ERROR"
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error adding widget:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "WIDGET_ADD_FAILED"
      });
    }
  }
);

/**
 * PUT /dashboards/:id/widgets/:widgetId - Update widget
 */
router.put('/:id/widgets/:widgetId',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      
      if (isNaN(widgetId)) {
        return res.status(400).json({
          error: "Invalid widget ID",
          code: "INVALID_WIDGET_ID"
        });
      }

      const allowedUpdates = [
        'widget_title', 
        'widget_config', 
        'position_config', 
        'filters', 
        'is_visible',
        'refresh_interval'
      ];

      const updates = {};
      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          error: "No valid updates provided",
          code: "NO_UPDATES"
        });
      }

      const result = await dashboardBuilder.updateWidget(req.tenant, widgetId, updates);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "WIDGET_UPDATE_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error updating widget:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "WIDGET_UPDATE_FAILED"
      });
    }
  }
);

/**
 * DELETE /dashboards/:id/widgets/:widgetId - Delete widget
 */
router.delete('/:id/widgets/:widgetId',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      
      if (isNaN(widgetId)) {
        return res.status(400).json({
          error: "Invalid widget ID",
          code: "INVALID_WIDGET_ID"
        });
      }

      const result = await dashboardBuilder.deleteWidget(req.tenant, widgetId);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "WIDGET_DELETE_ERROR"
        });
      }

      res.json({
        success: true,
        message: "Widget deleted successfully"
      });

    } catch (error) {
      console.error('Error deleting widget:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "WIDGET_DELETE_FAILED"
      });
    }
  }
);

/**
 * GET /dashboards/:id/widgets/:widgetId/data - Get widget data
 */
router.get('/:id/widgets/:widgetId/data',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const widgetId = parseInt(req.params.widgetId);
      const dateRange = req.query.range || '30d';
      
      if (isNaN(widgetId)) {
        return res.status(400).json({
          error: "Invalid widget ID",
          code: "INVALID_WIDGET_ID"
        });
      }

      const result = await dashboardBuilder.getWidgetData(req.tenant, widgetId, dateRange);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "WIDGET_DATA_ERROR"
        });
      }

      res.json(result);

    } catch (error) {
      console.error('Error getting widget data:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "WIDGET_DATA_FAILED"
      });
    }
  }
);

/**
 * GET /dashboards/templates - Get available dashboard templates
 */
router.get('/templates',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const result = await dashboardBuilder.getTemplates(req.tenant);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "TEMPLATES_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "TEMPLATES_FAILED"
      });
    }
  }
);

/**
 * POST /dashboards/:id/export - Export dashboard
 */
router.post('/:id/export',
  requireFeature('customDashboards', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const format = req.body.format || 'json';
      
      if (isNaN(dashboardId)) {
        return res.status(400).json({
          error: "Invalid dashboard ID",
          code: "INVALID_DASHBOARD_ID"
        });
      }

      const result = await dashboardBuilder.exportDashboard(req.tenant, dashboardId, format);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "EXPORT_ERROR"
        });
      }

      // Set appropriate headers for download
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${result.filename}"`
      });

      res.json(result.data);

    } catch (error) {
      console.error('Error exporting dashboard:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "EXPORT_FAILED"
      });
    }
  }
);

/**
 * GET /dashboards/health - Health check endpoint
 */
router.get('/health', (req, res) => {
  const healthStatus = dashboardBuilder.getHealthStatus();
  res.json(healthStatus);
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('Dashboard route error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: "Validation error",
      code: "VALIDATION_ERROR",
      details: error.message
    });
  }

  res.status(500).json({
    error: "Internal server error",
    code: "DASHBOARD_ROUTE_ERROR"
  });
});

export default router;