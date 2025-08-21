/**
 * ProofKit Tier Enforcement Middleware
 * Enforces feature access and usage limits based on subscription tiers
 */

import BillingService from "../services/billing.js";
import ShopifyBillingService from "../services/shopify-billing.js";

const billingService = new BillingService();

/**
 * Feature gate middleware - checks if user has access to specific features
 */
export function requireFeature(featureName, options = {}) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const shop = req.shop;

      if (!user && !shop) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      let hasAccess = false;
      let tier = null;

      // Check Shopify subscription
      if (shop && shop.subscription) {
        const shopifyBilling = new ShopifyBillingService();
        tier = shopifyBilling.getSubscriptionTier(shop.subscription);
        hasAccess = tier && tier.features.includes(featureName);
      }
      // Check Stripe subscription for WordPress users
      else if (user && user.subscription) {
        tier = billingService.getTierById(user.subscription.tier);
        hasAccess = tier && tier.features.includes(featureName);
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: `Feature '${featureName}' requires ${options.requiredTier || "a higher"} subscription tier`,
          code: "FEATURE_ACCESS_DENIED",
          feature: featureName,
          currentTier: tier?.name || "none",
          requiredTier: options.requiredTier,
          upgradeUrl: options.upgradeUrl || "/billing/upgrade",
        });
      }

      // Feature access granted
      req.tier = tier;
      req.featureAccess = true;
      next();
    } catch (error) {
      console.error("Error in feature gate middleware:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "FEATURE_CHECK_ERROR",
      });
    }
  };
}

/**
 * Usage limit middleware - checks if user is within tier limits
 */
export function checkUsageLimit(limitType, options = {}) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const shop = req.shop;

      if (!user && !shop) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      let tier = null;
      let currentUsage = {};

      // Get tier and usage for Shopify
      if (shop) {
        const shopifyBilling = new ShopifyBillingService();
        tier = shopifyBilling.getSubscriptionTier(shop.subscription);
        currentUsage = await getCurrentUsage(shop.id, "shopify");
      }
      // Get tier and usage for WordPress/Stripe
      else if (user) {
        tier = billingService.getTierById(user.subscription?.tier);
        currentUsage = await getCurrentUsage(user.id, "wordpress");
      }

      if (!tier) {
        return res.status(403).json({
          error: "Valid subscription required",
          code: "NO_SUBSCRIPTION",
        });
      }

      // Check specific limit
      const limit = tier.limits[limitType];
      const usage = currentUsage[limitType] || 0;

      // -1 means unlimited
      if (limit !== -1 && usage >= limit) {
        return res.status(429).json({
          error: `${limitType} limit exceeded`,
          code: "USAGE_LIMIT_EXCEEDED",
          limitType,
          currentUsage: usage,
          limit,
          tier: tier.name,
          upgradeUrl: options.upgradeUrl || "/billing/upgrade",
        });
      }

      // Within limits, continue
      req.tier = tier;
      req.usage = currentUsage;
      req.remainingQuota = limit === -1 ? -1 : limit - usage;
      next();
    } catch (error) {
      console.error("Error in usage limit middleware:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "USAGE_CHECK_ERROR",
      });
    }
  };
}

/**
 * Tier requirement middleware - requires minimum tier level
 */
export function requireTier(requiredTierIndex) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const shop = req.shop;

      if (!user && !shop) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      let currentTierIndex = -1;
      let tier = null;

      // Check Shopify subscription
      if (shop && shop.subscription) {
        const shopifyBilling = new ShopifyBillingService();
        tier = shopifyBilling.getSubscriptionTier(shop.subscription);
        if (tier) {
          currentTierIndex = billingService.getTierIndexById(tier.id);
        }
      }
      // Check Stripe subscription for WordPress users
      else if (user && user.subscription) {
        tier = billingService.getTierById(user.subscription.tier);
        if (tier) {
          currentTierIndex = billingService.getTierIndexById(tier.id);
        }
      }

      if (currentTierIndex < requiredTierIndex) {
        const requiredTiers = Object.values(billingService.PRICING_TIERS);
        const requiredTier = requiredTiers[requiredTierIndex];

        return res.status(403).json({
          error: `This feature requires ${requiredTier.name} tier or higher`,
          code: "TIER_UPGRADE_REQUIRED",
          currentTier: tier?.name || "none",
          requiredTier: requiredTier.name,
          upgradeUrl: "/billing/upgrade",
        });
      }

      req.tier = tier;
      next();
    } catch (error) {
      console.error("Error in tier requirement middleware:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "TIER_CHECK_ERROR",
      });
    }
  };
}

/**
 * Subscription validation middleware
 */
export function requireActiveSubscription(options = {}) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const shop = req.shop;

      if (!user && !shop) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      let hasActiveSubscription = false;
      let subscription = null;

      // Check Shopify subscription
      if (shop) {
        subscription = shop.subscription;
        hasActiveSubscription =
          subscription && subscription.status === "ACTIVE";
      }
      // Check Stripe subscription for WordPress users
      else if (user) {
        subscription = user.subscription;
        hasActiveSubscription =
          subscription &&
          (subscription.status === "active" ||
            subscription.status === "trialing");
      }

      if (!hasActiveSubscription) {
        return res.status(402).json({
          error: "Active subscription required",
          code: "SUBSCRIPTION_REQUIRED",
          message:
            options.message || "This feature requires an active subscription",
          subscribeUrl: options.subscribeUrl || "/billing/subscribe",
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error("Error in subscription validation middleware:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "SUBSCRIPTION_CHECK_ERROR",
      });
    }
  };
}

/**
 * Rate limiting based on tier
 */
export function tierBasedRateLimit(endpoint) {
  const rateLimits = {
    starter: { requests: 100, window: 3600 }, // 100 requests per hour
    pro: { requests: 500, window: 3600 }, // 500 requests per hour
    growth: { requests: 2000, window: 3600 }, // 2000 requests per hour
    enterprise: { requests: -1, window: 3600 }, // unlimited
  };

  return async (req, res, next) => {
    try {
      const user = req.user;
      const shop = req.shop;

      if (!user && !shop) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      let tier = null;
      let userId = null;

      // Get tier for Shopify
      if (shop) {
        const shopifyBilling = new ShopifyBillingService();
        tier = shopifyBilling.getSubscriptionTier(shop.subscription);
        userId = shop.id;
      }
      // Get tier for WordPress/Stripe
      else if (user) {
        tier = billingService.getTierById(user.subscription?.tier);
        userId = user.id;
      }

      if (!tier) {
        tier = { id: "starter" }; // Default to starter limits for free users
      }

      const limit = rateLimits[tier.id] || rateLimits.starter;

      // Skip rate limiting for unlimited tiers
      if (limit.requests === -1) {
        return next();
      }

      // Check current rate limit usage
      const usage = await getRateLimitUsage(userId, endpoint, limit.window);

      if (usage >= limit.requests) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          limit: limit.requests,
          window: limit.window,
          tier: tier.name,
          retryAfter: limit.window,
        });
      }

      // Increment usage counter
      await incrementRateLimitUsage(userId, endpoint);

      next();
    } catch (error) {
      console.error("Error in rate limit middleware:", error);
      next(); // Don't block on rate limit errors
    }
  };
}

/**
 * Feature flag middleware with tier-based access
 */
export function featureFlag(flagName, tierRequirement = "starter") {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const shop = req.shop;

      // Check if feature is enabled globally
      const isEnabled = await getFeatureFlagStatus(flagName);
      if (!isEnabled) {
        return res.status(404).json({
          error: "Feature not available",
          code: "FEATURE_DISABLED",
        });
      }

      // Check tier requirement
      let tier = null;
      if (shop) {
        const shopifyBilling = new ShopifyBillingService();
        tier = shopifyBilling.getSubscriptionTier(shop.subscription);
      } else if (user) {
        tier = billingService.getTierById(user.subscription?.tier);
      }

      const requiredTierIndex =
        billingService.getTierIndexById(tierRequirement);
      const currentTierIndex = tier
        ? billingService.getTierIndexById(tier.id)
        : -1;

      if (currentTierIndex < requiredTierIndex) {
        return res.status(403).json({
          error: `Feature requires ${tierRequirement} tier or higher`,
          code: "TIER_REQUIRED_FOR_FEATURE",
          feature: flagName,
          requiredTier: tierRequirement,
          currentTier: tier?.id || "none",
        });
      }

      next();
    } catch (error) {
      console.error("Error in feature flag middleware:", error);
      next(); // Don't block on feature flag errors
    }
  };
}

// Helper functions

async function getCurrentUsage(userId, platform) {
  // This would typically query your database
  // For now, return mock data
  return {
    campaigns: 0,
    adGroups: 0,
    keywords: 0,
    monthlySpend: 0,
    stores: 1,
    teamMembers: 1,
  };
}

async function getRateLimitUsage(userId, endpoint, window) {
  // This would typically use Redis or similar
  // For now, return 0
  return 0;
}

async function incrementRateLimitUsage(userId, endpoint) {
  // This would typically increment in Redis
  // For now, do nothing
  return true;
}

async function getFeatureFlagStatus(flagName) {
  // This would typically check a feature flag service
  // For now, return true
  return true;
}

export default {
  requireFeature,
  checkUsageLimit,
  requireTier,
  requireActiveSubscription,
  tierBasedRateLimit,
  featureFlag,
};
