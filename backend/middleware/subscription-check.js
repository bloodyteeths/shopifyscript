/**
 * Subscription Check Middleware
 * Enforces subscription requirements for premium features
 */

import { SHOPIFY_PRICING_TIERS } from "../services/shopify-billing.js";

// Feature to tier mapping (3-tier system)
const FEATURE_TIER_MAP = {
  // Starter features (available to all paid plans)
  "ai_campaign_optimization": "starter",
  "basic_performance_analytics": "starter", 
  "campaign_monitoring": "starter",
  "email_support": "starter",
  "basic_roas_tracking": "starter",
  "monthly_insights_reports": "starter",
  "budget_caps": "starter",
  "brand_protection": "starter",
  
  // Professional features  
  "advanced_ai_optimization": "professional",
  "real_time_performance_analytics": "professional",
  "priority_email_support": "professional",
  "advanced_roas_analytics": "professional",
  "automated_bid_management": "professional",
  "weekly_insights_reports": "professional",
  
  // Enterprise features
  "custom_ai_optimization_rules": "enterprise",
  "advanced_performance_analytics": "enterprise",
  "priority_support_sla": "enterprise",
  "custom_roas_tracking": "enterprise",
  "advanced_automation_features": "enterprise",
  "custom_reporting": "enterprise"
};

// Tier hierarchy for access control
const TIER_HIERARCHY = {
  "starter": 1,
  "professional": 2,
  "enterprise": 3
};

/**
 * Get current subscription status for a tenant
 * This would integrate with your tenant registry and Shopify Billing API
 */
async function getCurrentSubscription(tenant) {
  try {
    // In production, this would query your tenant registry 
    // and check Shopify Billing API for current subscription
    
    // For now, check if billing enforcement is active
    const billingActive = process.env.BILLING_ENFORCEMENT_ACTIVE === "true";
    
    if (!billingActive) {
      // If billing enforcement disabled, grant enterprise access
      return {
        tier: "enterprise",
        status: "active",
        trialEndsAt: null
      };
    }
    
    // TODO: Implement actual Shopify Billing API check
    // This is a placeholder that should be replaced with real subscription lookup
    return {
      tier: null, // No active subscription  
      status: "none",
      trialEndsAt: null
    };
    
  } catch (error) {
    console.error("Error checking subscription:", error);
    return {
      tier: null,
      status: "error", 
      trialEndsAt: null
    };
  }
}

/**
 * Check if user has access to a specific feature
 */
function hasFeatureAccess(userTier, requiredFeature) {
  if (!userTier || !requiredFeature) {
    return false;
  }
  
  const requiredTier = FEATURE_TIER_MAP[requiredFeature];
  if (!requiredTier) {
    // Feature not found in map, allow access
    return true; 
  }
  
  const userLevel = TIER_HIERARCHY[userTier.toLowerCase()];
  const requiredLevel = TIER_HIERARCHY[requiredTier.toLowerCase()];
  
  return userLevel >= requiredLevel;
}

/**
 * Check if user is within usage limits for their tier
 */
function isWithinUsageLimits(userTier, usage) {
  if (!userTier) {
    return false;
  }
  
  const tierConfig = Object.values(SHOPIFY_PRICING_TIERS)
    .find(tier => tier.id === userTier.toLowerCase());
    
  if (!tierConfig) {
    return false;
  }
  
  const limits = tierConfig.limits;
  
  // Check each limit (-1 means unlimited)
  for (const [key, limit] of Object.entries(limits)) {
    if (limit === -1) continue; // unlimited
    if (usage[key] && usage[key] > limit) {
      return false;
    }
  }
  
  return true;
}

/**
 * Middleware to require active subscription
 */
export function requireActiveSubscription() {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;
      
      if (!tenant) {
        return res.status(400).json({ 
          ok: false, 
          error: "tenant_required",
          message: "Tenant ID required for subscription check"
        });
      }
      
      const subscription = await getCurrentSubscription(tenant);
      
      if (subscription.status === "none" || !subscription.tier) {
        return res.status(402).json({
          ok: false,
          error: "subscription_required", 
          message: "Active subscription required to access this feature",
          upgradeUrl: `/app/billing`
        });
      }
      
      if (subscription.status === "expired" || subscription.status === "cancelled") {
        return res.status(402).json({
          ok: false,
          error: "subscription_expired",
          message: "Your subscription has expired. Please renew to continue.",
          upgradeUrl: `/app/billing`
        });
      }
      
      // Add subscription info to request for downstream use
      req.subscription = subscription;
      next();
      
    } catch (error) {
      console.error("Subscription check error:", error);
      res.status(500).json({
        ok: false, 
        error: "subscription_check_failed",
        message: "Unable to verify subscription status"
      });
    }
  };
}

/**
 * Middleware to require specific feature access
 */
export function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;
      
      if (!tenant) {
        return res.status(400).json({
          ok: false,
          error: "tenant_required" 
        });
      }
      
      const subscription = await getCurrentSubscription(tenant);
      
      if (!hasFeatureAccess(subscription.tier, featureName)) {
        const requiredTier = FEATURE_TIER_MAP[featureName];
        
        return res.status(402).json({
          ok: false,
          error: "feature_access_denied",
          message: `This feature requires ${requiredTier} plan or higher`,
          feature: featureName,
          currentTier: subscription.tier,
          requiredTier: requiredTier,
          upgradeUrl: `/app/billing`
        });
      }
      
      req.subscription = subscription;
      next();
      
    } catch (error) {
      console.error("Feature access check error:", error);
      res.status(500).json({
        ok: false,
        error: "feature_check_failed"
      });
    }
  };
}

/**
 * Middleware to check usage limits
 */
export function checkUsageLimits() {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;
      
      if (!tenant) {
        return res.status(400).json({
          ok: false,
          error: "tenant_required"
        });
      }
      
      const subscription = await getCurrentSubscription(tenant);
      
      // Get current usage from request or query backend
      const usage = req.body.usage || {};
      
      if (!isWithinUsageLimits(subscription.tier, usage)) {
        const tierConfig = Object.values(SHOPIFY_PRICING_TIERS)
          .find(tier => tier.id === subscription.tier);
          
        return res.status(402).json({
          ok: false,
          error: "usage_limit_exceeded",
          message: "You have reached the usage limits for your current plan",
          currentTier: subscription.tier,
          limits: tierConfig?.limits,
          upgradeUrl: `/app/billing`
        });
      }
      
      req.subscription = subscription;
      next();
      
    } catch (error) {
      console.error("Usage limit check error:", error);
      res.status(500).json({
        ok: false,
        error: "usage_check_failed"
      });
    }
  };
}

/**
 * Middleware to require minimum tier level
 */
export function requireTier(minimumTier) {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;
      
      if (!tenant) {
        return res.status(400).json({
          ok: false,
          error: "tenant_required"
        });
      }
      
      const subscription = await getCurrentSubscription(tenant);
      
      const userLevel = TIER_HIERARCHY[subscription.tier?.toLowerCase()];
      const requiredLevel = TIER_HIERARCHY[minimumTier.toLowerCase()];
      
      if (!userLevel || userLevel < requiredLevel) {
        return res.status(402).json({
          ok: false,
          error: "tier_access_denied",
          message: `This feature requires ${minimumTier} plan or higher`,
          currentTier: subscription.tier,
          requiredTier: minimumTier,
          upgradeUrl: `/app/billing`
        });
      }
      
      req.subscription = subscription;
      next();
      
    } catch (error) {
      console.error("Tier check error:", error);
      res.status(500).json({
        ok: false,
        error: "tier_check_failed"
      });
    }
  };
}

export default {
  requireActiveSubscription,
  requireFeature,
  checkUsageLimits,
  requireTier,
  hasFeatureAccess,
  isWithinUsageLimits,
  getCurrentSubscription
};