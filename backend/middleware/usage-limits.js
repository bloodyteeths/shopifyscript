/**
 * Usage Limits Middleware
 * Enforces plan-based usage limits matching Shopify plan descriptions
 */

import { PRICING_TIERS } from "../services/billing.js";

// Plan limits matching Shopify plan descriptions exactly
const PLAN_LIMITS = {
  starter: {
    campaigns: 5,
    dataRetentionDays: 7,
    supportType: "email",
    features: [
      "ai_campaign_optimization",
      "basic_performance_analytics", 
      "campaign_monitoring",
      "email_support",
      "basic_roas_tracking",
      "monthly_insights_reports"
    ]
  },
  professional: {
    campaigns: 25,
    dataRetentionDays: 30,
    supportType: "priority_email",
    features: [
      "ai_campaign_optimization",
      "basic_performance_analytics",
      "campaign_monitoring", 
      "email_support",
      "basic_roas_tracking",
      "monthly_insights_reports",
      "advanced_ai_optimization",
      "real_time_performance_analytics",
      "priority_email_support",
      "advanced_roas_analytics", 
      "automated_bid_management",
      "weekly_insights_reports"
    ]
  },
  enterprise: {
    campaigns: -1, // unlimited
    dataRetentionDays: 90,
    supportType: "priority_phone_email",
    features: [
      "ai_campaign_optimization",
      "basic_performance_analytics",
      "campaign_monitoring",
      "email_support", 
      "basic_roas_tracking",
      "monthly_insights_reports",
      "advanced_ai_optimization",
      "real_time_performance_analytics",
      "priority_email_support",
      "advanced_roas_analytics",
      "automated_bid_management", 
      "weekly_insights_reports",
      "full_ai_automation_suite",
      "custom_performance_dashboards",
      "priority_phone_email_support",
      "custom_roas_modeling",
      "advanced_bid_strategies",
      "daily_insights_custom_reports"
    ]
  }
};

/**
 * Get current usage for a tenant
 */
async function getCurrentUsage(tenant) {
  try {
    // This would query your data source to get current usage
    // For now, we'll simulate with basic data
    
    // TODO: Query actual campaign count from Google Ads API or stored data
    const campaignCount = 0; // Placeholder - implement actual counting
    
    return {
      campaigns: campaignCount,
      // Add other usage metrics as needed
    };
  } catch (error) {
    console.error('Error getting current usage:', error);
    return {
      campaigns: 0
    };
  }
}

/**
 * Get user's subscription tier from request context
 */
function getUserTier(req) {
  // This should come from subscription check middleware
  return req.subscription?.tier || 'starter'; // Default to starter
}

/**
 * Middleware to check campaign count limits
 */
export function checkCampaignLimit() {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;
      
      if (!tenant) {
        return res.status(400).json({
          ok: false,
          error: "tenant_required",
          message: "Tenant ID required for usage limit check"
        });
      }

      const userTier = getUserTier(req);
      const planLimits = PLAN_LIMITS[userTier];
      
      if (!planLimits) {
        return res.status(400).json({
          ok: false,
          error: "invalid_tier",
          message: "Invalid subscription tier"
        });
      }

      // Check campaign limit (if not unlimited)
      if (planLimits.campaigns !== -1) {
        const usage = await getCurrentUsage(tenant);
        
        if (usage.campaigns >= planLimits.campaigns) {
          return res.status(402).json({
            ok: false,
            error: "campaign_limit_exceeded",
            message: `Your ${userTier} plan allows up to ${planLimits.campaigns} campaigns. You currently have ${usage.campaigns}.`,
            currentUsage: usage.campaigns,
            limit: planLimits.campaigns,
            tier: userTier,
            upgradeUrl: "/app/billing?upgrade=professional&feature=more_campaigns"
          });
        }
      }

      // Add usage info to request
      req.usage = await getCurrentUsage(tenant);
      req.planLimits = planLimits;
      
      next();
      
    } catch (error) {
      console.error("Campaign limit check error:", error);
      res.status(500).json({
        ok: false,
        error: "usage_check_failed",
        message: "Unable to verify usage limits"
      });
    }
  };
}

/**
 * Middleware to enforce data retention limits
 */
export function enforceDataRetention() {
  return (req, res, next) => {
    const userTier = getUserTier(req);
    const planLimits = PLAN_LIMITS[userTier];
    
    if (planLimits) {
      // Add data retention limit to request for downstream use
      req.dataRetentionDays = planLimits.dataRetentionDays;
      
      console.log(`🗓️ Data retention for ${userTier} plan: ${planLimits.dataRetentionDays} days`);
    }
    
    next();
  };
}

/**
 * Check if user has specific feature access
 */
export function hasFeatureAccess(userTier, feature) {
  const planLimits = PLAN_LIMITS[userTier];
  return planLimits && planLimits.features.includes(feature);
}

/**
 * Get plan limits for a tier
 */
export function getPlanLimits(tier) {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.starter;
}

/**
 * Middleware to add usage info to responses
 */
export function addUsageInfo() {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data && typeof data === 'object' && req.usage && req.planLimits) {
        data.usage = {
          current: req.usage,
          limits: req.planLimits,
          tier: getUserTier(req)
        };
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

export default {
  checkCampaignLimit,
  enforceDataRetention,
  hasFeatureAccess,
  getPlanLimits,
  addUsageInfo,
  PLAN_LIMITS
};