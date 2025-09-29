/**
 * Subscription Check Middleware
 * Enforces subscription requirements for premium features
 */

import { SHOPIFY_PRICING_TIERS } from "../services/shopify-billing.js";
import ShopifyBillingService from "../services/shopify-billing.js";

/**
 * Get shop access token from session or database
 * In production, this should query a secure token store
 */
async function getShopAccessToken(shopDomain) {
  try {
    // This is a placeholder - in production you would:
    // 1. Query the session store for the shop's access token
    // 2. Or query a secure token database
    // 3. Handle token refresh if needed
    
    // For now, return null to indicate token not available
    // This prevents Shopify API calls when tokens aren't set up
    return null;
  } catch (error) {
    console.error("Failed to retrieve shop access token:", error);
    return null;
  }
}

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
 * Integrates with tenant registry and Shopify Billing API
 */
async function getCurrentSubscription(tenant) {
  try {
    // Check if billing enforcement is active
    const billingActive = process.env.BILLING_ENFORCEMENT_ACTIVE === "true";
    
    if (!billingActive) {
      // If billing enforcement disabled, grant enterprise access
      return {
        tier: "enterprise",
        status: "active",
        trialEndsAt: null,
        shopifySubscriptionId: null
      };
    }

    // Query database for tenant subscription info
    let subscription = null;
    try {
      const { getSupabaseClient } = await import("../services/supabase-client.js");
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*")
        .eq("tenant_id", tenant)
        .single();
        
      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.warn("Database query error for subscription:", error);
      } else if (data) {
        subscription = data;
      }
    } catch (dbError) {
      console.warn("Database connection error, falling back to Shopify API:", dbError);
    }

    // If we have cached subscription data, check if it's recent
    if (subscription && subscription.updated_at) {
      const lastUpdate = new Date(subscription.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      // If updated within last 4 hours and status is active, use cached data
      if (hoursSinceUpdate < 4 && subscription.status === "active") {
        return {
          tier: subscription.tier,
          status: subscription.status,
          trialEndsAt: subscription.trial_ends_at,
          currentPeriodEnd: subscription.current_period_end,
          shopifySubscriptionId: subscription.subscription_id
        };
      }
    }

    // For real-time verification, query Shopify Billing API if we have shop info
    if (subscription && subscription.shop_domain) {
      try {
        // Get access token for this shop (in production, this would be stored securely)
        const accessToken = await getShopAccessToken(subscription.shop_domain);
        
        if (accessToken) {
          const billingService = new ShopifyBillingService();
          const shopifySubscription = await billingService.getCurrentSubscription(
            subscription.shop_domain, 
            accessToken
          );
          
          if (shopifySubscription) {
            const tier = billingService.getSubscriptionTier(shopifySubscription);
            const status = billingService.parseSubscriptionStatus(shopifySubscription.status);
            
            // Update database with fresh Shopify data
            try {
              const { createClient } = await import("../services/supabase-client.js");
              const supabase = createClient();
              
              await supabase
                .from("tenant_subscriptions")
                .update({
                  subscription_id: shopifySubscription.id,
                  tier: tier?.id || subscription.tier,
                  status: status,
                  current_period_end: shopifySubscription.currentPeriodEnd,
                  updated_at: new Date().toISOString()
                })
                .eq("tenant_id", tenant);
                
              return {
                tier: tier?.id || subscription.tier,
                status: status,
                trialEndsAt: subscription.trial_ends_at,
                currentPeriodEnd: shopifySubscription.currentPeriodEnd,
                shopifySubscriptionId: shopifySubscription.id
              };
            } catch (updateError) {
              console.error("Failed to update subscription from Shopify:", updateError);
            }
          }
        }
      } catch (shopifyError) {
        console.warn("Shopify API verification failed, using cached data:", shopifyError);
      }
    }

    // Return subscription status based on database data
    if (subscription) {
      // Check if subscription is expired
      if (subscription.current_period_end) {
        const periodEnd = new Date(subscription.current_period_end);
        const now = new Date();
        
        if (now > periodEnd && subscription.status === "active") {
          // Update status to past_due in database
          try {
            const { createClient } = await import("../services/supabase-client.js");
            const supabase = createClient();
            
            await supabase
              .from("tenant_subscriptions")
              .update({ 
                status: "past_due", 
                updated_at: new Date().toISOString() 
              })
              .eq("tenant_id", tenant);
              
            subscription.status = "past_due";
          } catch (updateError) {
            console.error("Failed to update subscription status:", updateError);
          }
        }
      }

      return {
        tier: subscription.tier,
        status: subscription.status,
        trialEndsAt: subscription.trial_ends_at,
        currentPeriodEnd: subscription.current_period_end,
        shopifySubscriptionId: subscription.subscription_id
      };
    }
    
    // No subscription found
    return {
      tier: null,
      status: "none",
      trialEndsAt: null,
      shopifySubscriptionId: null
    };
    
  } catch (error) {
    console.error("Error checking subscription:", error);
    return {
      tier: null,
      status: "error", 
      trialEndsAt: null,
      shopifySubscriptionId: null
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

/**
 * Sync subscription status with Shopify Billing API
 * This can be called periodically or when subscription changes are detected
 */
export async function syncSubscriptionStatus(tenant, shopDomain, accessToken) {
  try {
    const billingService = new ShopifyBillingService();
    const shopifySubscription = await billingService.getCurrentSubscription(shopDomain, accessToken);
    
    if (shopifySubscription) {
      const tier = billingService.getSubscriptionTier(shopifySubscription);
      const status = billingService.parseSubscriptionStatus(shopifySubscription.status);
      
      // Update database with current Shopify subscription data
      const { getSupabaseClient } = await import("../services/supabase-client.js");
      const supabase = getSupabaseClient();
      
      const subscriptionData = {
        tenant_id: tenant,
        shop_domain: shopDomain,
        platform: 'shopify',
        subscription_id: shopifySubscription.id,
        tier: tier?.id || 'starter',
        status: status,
        current_period_start: shopifySubscription.createdAt,
        current_period_end: shopifySubscription.currentPeriodEnd,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .upsert(subscriptionData, { 
          onConflict: 'tenant_id',
          ignoreDuplicates: false 
        })
        .select();
        
      if (error) {
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      console.log(`Subscription synced for tenant ${tenant}:`, {
        tier: tier?.id,
        status: status,
        subscriptionId: shopifySubscription.id
      });
      
      return subscriptionData;
    } else {
      // No active subscription found in Shopify
      const { getSupabaseClient } = await import("../services/supabase-client.js");
      const supabase = getSupabaseClient();
      
      await supabase
        .from("tenant_subscriptions")
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq("tenant_id", tenant);
        
      console.log(`No active subscription found for tenant ${tenant}, marked as cancelled`);
      
      return null;
    }
  } catch (error) {
    console.error("Failed to sync subscription status:", error);
    throw error;
  }
}

/**
 * Retry wrapper for subscription operations with exponential backoff
 */
export async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Subscription operation attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 500ms, 1s, 2s
      const delay = Math.pow(2, attempt - 1) * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export {
  getCurrentSubscription,
  hasFeatureAccess,
  isWithinUsageLimits
};

export default {
  requireActiveSubscription,
  requireFeature,
  checkUsageLimits
};