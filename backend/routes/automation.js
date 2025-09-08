/**
 * Advanced Automation API Routes
 * Enterprise-exclusive AI automation and bid management endpoints
 * 
 * Routes:
 * - GET /automation/rules - List automation rules
 * - POST /automation/rules - Create automation rule
 * - GET /automation/rules/:id - Get rule details
 * - PUT /automation/rules/:id - Update rule
 * - DELETE /automation/rules/:id - Delete rule
 * - POST /automation/rules/:id/execute - Execute rule manually
 * - GET /automation/strategies - List bid strategies
 * - POST /automation/strategies - Create custom bid strategy
 * - GET /automation/strategies/:id - Get strategy details
 * - PUT /automation/strategies/:id - Update strategy
 * - DELETE /automation/strategies/:id - Delete strategy
 * - POST /automation/execute/bid-optimization - Execute bid optimization
 * - POST /automation/execute/suite - Execute full automation suite
 * - GET /automation/history - Get execution history
 * - GET /automation/performance - Get performance metrics
 * - GET /automation/alerts - Get automation alerts
 * - POST /automation/alerts/:id/resolve - Resolve alert
 */

import express from "express";
import rateLimit from "express-rate-limit";
import advancedAutomation from "../services/advanced-automation.js";
import analyticsTiers from "../services/analytics-tiers.js";
import { requireFeature, requireTier } from "../middleware/tier-enforcement.js";
import subscriptionCheck from "../middleware/subscription-check.js";

const router = express.Router();

// Rate limiting for automation operations
const automationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for automation
  message: {
    error: "Too many automation requests from this IP",
    code: "RATE_LIMIT_EXCEEDED"
  }
});

// Stricter rate limiting for execution endpoints
const executionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit automation executions
  message: {
    error: "Too many automation executions from this IP",
    code: "EXECUTION_RATE_LIMIT_EXCEEDED"
  }
});

// Apply rate limiting to all automation routes
router.use(automationRateLimit);

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
 * GET /automation/rules - List automation rules
 */
router.get('/rules', 
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { automation_type, is_active, limit, offset } = req.query;
      
      const result = await advancedAutomation.getAutomationRules(req.tenant, {
        automation_type,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
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
          code: "AUTOMATION_RULES_ERROR"
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
      console.error('Error listing automation rules:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_RULES_FAILED"
      });
    }
  }
);

/**
 * POST /automation/rules - Create automation rule
 */
router.post('/rules',
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { rule_name, automation_type, trigger_conditions, action_config, schedule_config, is_active, priority } = req.body;

      if (!rule_name || !automation_type || !trigger_conditions || !action_config) {
        return res.status(400).json({
          error: "Missing required fields: rule_name, automation_type, trigger_conditions, action_config",
          code: "MISSING_RULE_FIELDS"
        });
      }

      const result = await advancedAutomation.createAutomationRule(req.tenant, {
        rule_name: rule_name.trim(),
        automation_type,
        trigger_conditions,
        action_config,
        schedule_config,
        is_active,
        priority
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "AUTOMATION_RULE_CREATE_ERROR"
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error creating automation rule:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_RULE_CREATE_FAILED"
      });
    }
  }
);

/**
 * GET /automation/strategies - List custom bid strategies
 */
router.get('/strategies',
  requireFeature('customBidStrategies', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const result = await advancedAutomation.getCustomBidStrategies(req.tenant);

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
          code: "BID_STRATEGIES_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error listing bid strategies:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "BID_STRATEGIES_FAILED"
      });
    }
  }
);

/**
 * POST /automation/strategies - Create custom bid strategy
 */
router.post('/strategies',
  requireFeature('customBidStrategies', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { strategy_name, strategy_description, algorithm_config, performance_targets, constraints, is_active } = req.body;

      if (!strategy_name || !algorithm_config || !performance_targets) {
        return res.status(400).json({
          error: "Missing required fields: strategy_name, algorithm_config, performance_targets",
          code: "MISSING_STRATEGY_FIELDS"
        });
      }

      const result = await advancedAutomation.createCustomBidStrategy(req.tenant, {
        strategy_name: strategy_name.trim(),
        strategy_description,
        algorithm_config,
        performance_targets,
        constraints,
        is_active
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "BID_STRATEGY_CREATE_ERROR"
        });
      }

      res.status(201).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('Error creating bid strategy:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "BID_STRATEGY_CREATE_FAILED"
      });
    }
  }
);

/**
 * POST /automation/execute/bid-optimization - Execute bid optimization
 */
router.post('/execute/bid-optimization',
  executionRateLimit,
  requireFeature('automatedBidManagement', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { campaign_id, strategy, options } = req.body;

      if (!campaign_id || !strategy) {
        return res.status(400).json({
          error: "Missing required fields: campaign_id, strategy",
          code: "MISSING_EXECUTION_FIELDS"
        });
      }

      const result = await advancedAutomation.executeBidOptimization(
        req.tenant,
        campaign_id,
        strategy,
        options || {}
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "BID_OPTIMIZATION_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: "Bid optimization executed successfully"
      });

    } catch (error) {
      console.error('Error executing bid optimization:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "BID_OPTIMIZATION_FAILED"
      });
    }
  }
);

/**
 * POST /automation/execute/suite - Execute full automation suite
 */
router.post('/execute/suite',
  executionRateLimit,
  requireFeature('fullAiAutomationSuite', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { suite_config } = req.body;

      if (!suite_config) {
        return res.status(400).json({
          error: "Missing required field: suite_config",
          code: "MISSING_SUITE_CONFIG"
        });
      }

      // Validate suite configuration
      const requiredFields = ['enableBidOptimization', 'enableKeywordExpansion', 'enableNegativeKeywordMining', 'enableBudgetOptimization'];
      const hasRequiredConfig = requiredFields.some(field => suite_config[field] === true);

      if (!hasRequiredConfig) {
        return res.status(400).json({
          error: "Suite configuration must enable at least one automation type",
          code: "INVALID_SUITE_CONFIG"
        });
      }

      const result = await advancedAutomation.executeAutomationSuite(req.tenant, suite_config);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "AUTOMATION_SUITE_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data,
        message: "Automation suite executed successfully"
      });

    } catch (error) {
      console.error('Error executing automation suite:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_SUITE_FAILED"
      });
    }
  }
);

/**
 * GET /automation/history - Get automation execution history
 */
router.get('/history',
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { automation_type, limit, offset, start_date, end_date } = req.query;
      
      const result = await advancedAutomation.getAutomationHistory(req.tenant, {
        automation_type,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0,
        startDate: start_date,
        endDate: end_date
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: "AUTOMATION_HISTORY_ERROR"
        });
      }

      res.json({
        success: true,
        data: result.data,
        meta: {
          count: result.data.length,
          hasMore: result.data.length >= (parseInt(limit) || 100)
        }
      });

    } catch (error) {
      console.error('Error getting automation history:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_HISTORY_FAILED"
      });
    }
  }
);

/**
 * GET /automation/performance - Get automation performance metrics
 */
router.get('/performance',
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { automation_type, start_date, end_date, granularity } = req.query;
      
      // This would call a method to get performance metrics from the database
      // For now, returning mock data structure
      const performanceData = {
        overall_metrics: {
          total_automations: 15,
          active_rules: 8,
          executions_last_30_days: 124,
          success_rate: 0.92,
          average_cost_savings: 342.50,
          average_roas_improvement: 0.15
        },
        automation_breakdown: [
          {
            type: 'bid_optimization',
            executions: 85,
            success_rate: 0.94,
            cost_savings: 250.00,
            roas_improvement: 0.12
          },
          {
            type: 'budget_allocation',
            executions: 25,
            success_rate: 0.88,
            cost_savings: 75.00,
            roas_improvement: 0.08
          },
          {
            type: 'keyword_expansion',
            executions: 14,
            success_rate: 0.90,
            cost_savings: 17.50,
            roas_improvement: 0.20
          }
        ],
        timeline_data: [] // Would be populated with historical performance
      };

      res.json({
        success: true,
        data: performanceData,
        meta: {
          period: {
            start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: end_date || new Date().toISOString().split('T')[0],
            granularity: granularity || 'daily'
          }
        }
      });

    } catch (error) {
      console.error('Error getting automation performance:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_PERFORMANCE_FAILED"
      });
    }
  }
);

/**
 * GET /automation/alerts - Get automation alerts
 */
router.get('/alerts',
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { severity, is_resolved, limit, offset } = req.query;
      
      // Mock alerts data - would come from database
      const alerts = [
        {
          id: 1,
          alert_type: 'performance_drop',
          severity: 'high',
          title: 'Campaign Performance Decline Detected',
          message: 'Campaign "Summer Sale 2024" has shown a 25% decrease in ROAS over the last 3 days.',
          automation_context: {
            campaign_id: 'camp_123',
            campaign_name: 'Summer Sale 2024',
            metric: 'roas',
            change_percent: -25
          },
          recommended_actions: [
            'Review bid adjustments',
            'Check for ad fatigue',
            'Analyze competitor activity'
          ],
          is_resolved: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          alert_type: 'budget_exceeded',
          severity: 'medium',
          title: 'Daily Budget Exceeded',
          message: 'Campaign "Brand Keywords" has exceeded its daily budget by 15%.',
          automation_context: {
            campaign_id: 'camp_456',
            campaign_name: 'Brand Keywords',
            budget_limit: 200,
            actual_spend: 230
          },
          recommended_actions: [
            'Increase daily budget',
            'Adjust bid strategy',
            'Pause low-performing keywords'
          ],
          is_resolved: true,
          resolved_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Filter by parameters
      let filteredAlerts = alerts;
      
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }
      
      if (is_resolved !== undefined) {
        const resolved = is_resolved === 'true';
        filteredAlerts = filteredAlerts.filter(alert => alert.is_resolved === resolved);
      }

      // Apply pagination
      const startIndex = parseInt(offset) || 0;
      const limitNum = parseInt(limit) || 50;
      const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + limitNum);

      res.json({
        success: true,
        data: paginatedAlerts,
        meta: {
          count: paginatedAlerts.length,
          total: filteredAlerts.length,
          hasMore: startIndex + limitNum < filteredAlerts.length
        }
      });

    } catch (error) {
      console.error('Error getting automation alerts:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_ALERTS_FAILED"
      });
    }
  }
);

/**
 * POST /automation/alerts/:id/resolve - Resolve automation alert
 */
router.post('/alerts/:id/resolve',
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const { resolution_notes } = req.body;

      if (isNaN(alertId)) {
        return res.status(400).json({
          error: "Invalid alert ID",
          code: "INVALID_ALERT_ID"
        });
      }

      // In real implementation, this would update the database
      // For now, simulate the resolution
      const resolvedAlert = {
        id: alertId,
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: 'user', // Would be actual user ID
        resolution_notes: resolution_notes || ''
      };

      res.json({
        success: true,
        data: resolvedAlert,
        message: "Alert resolved successfully"
      });

    } catch (error) {
      console.error('Error resolving automation alert:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "ALERT_RESOLVE_FAILED"
      });
    }
  }
);

/**
 * GET /automation/health - Health check and system status
 */
router.get('/health', 
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const healthStatus = advancedAutomation.getHealthStatus();
      
      // Add tenant-specific health metrics
      const tenantHealth = {
        ...healthStatus,
        tenant_id: req.tenant,
        last_check: new Date().toISOString(),
        automation_suite_available: true,
        bid_optimization_available: true,
        custom_strategies_available: true
      };

      res.json({
        success: true,
        data: tenantHealth
      });

    } catch (error) {
      console.error('Error getting automation health:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_HEALTH_FAILED"
      });
    }
  }
);

/**
 * GET /automation/templates - Get automation rule templates
 */
router.get('/templates',
  requireFeature('advancedAutomation', { requiredTier: 'enterprise' }),
  async (req, res) => {
    try {
      const { automation_type } = req.query;
      
      // Mock template data - would come from database
      const templates = [
        {
          id: 'template_bid_roas',
          name: 'High-Performance ROAS Optimizer',
          description: 'Automatically adjusts bids to maintain target ROAS while maximizing conversions',
          automation_type: 'bid_optimization',
          template_config: {
            trigger_conditions: {
              performance_criteria: {
                min_conversions: 5,
                min_clicks: 50,
                evaluation_period_days: 7
              },
              trigger_thresholds: {
                roas_below: 3.0,
                cpa_above: 75.0
              }
            },
            action_config: {
              bid_strategy: 'target_roas',
              target_roas: 4.5,
              max_bid_increase: 50,
              max_bid_decrease: 30
            }
          },
          tier_requirement: 'enterprise'
        },
        {
          id: 'template_budget_reallocation',
          name: 'Smart Budget Allocator',
          description: 'Reallocates budget between campaigns based on performance',
          automation_type: 'budget_allocation',
          template_config: {
            trigger_conditions: {
              reallocation_triggers: {
                performance_variance: 0.25,
                underperforming_campaigns: 2
              }
            },
            action_config: {
              reallocation_rules: {
                high_performers_increase: 0.20,
                low_performers_decrease: 0.15
              }
            }
          },
          tier_requirement: 'enterprise'
        }
      ];

      let filteredTemplates = templates;
      if (automation_type) {
        filteredTemplates = templates.filter(t => t.automation_type === automation_type);
      }

      res.json({
        success: true,
        data: filteredTemplates
      });

    } catch (error) {
      console.error('Error getting automation templates:', error);
      res.status(500).json({
        error: "Internal server error",
        code: "AUTOMATION_TEMPLATES_FAILED"
      });
    }
  }
);

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('Automation route error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: "Validation error",
      code: "VALIDATION_ERROR",
      details: error.message
    });
  }

  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return res.status(429).json({
      error: "Rate limit exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many automation requests. Please try again later."
    });
  }

  res.status(500).json({
    error: "Internal server error",
    code: "AUTOMATION_ROUTE_ERROR"
  });
});

export default router;