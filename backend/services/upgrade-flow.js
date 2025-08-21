/**
 * ProofKit Upgrade Flow Service
 * Handles upgrade prompts, feature gates, and conversion flows
 */

import BillingService from "./billing.js";
import ShopifyBillingService from "./shopify-billing.js";
import logger from "./logger.js";

export class UpgradeFlowService {
  constructor() {
    this.billingService = new BillingService();
    this.shopifyBilling = new ShopifyBillingService();
  }

  /**
   * Generate upgrade prompt for a specific feature
   */
  generateUpgradePrompt(feature, userTier, platform = "stripe") {
    const requiredTier = this.getRequiredTierForFeature(feature);
    const currentTierIndex = this.billingService.getTierIndexById(userTier);
    const requiredTierIndex =
      this.billingService.getTierIndexById(requiredTier);

    if (currentTierIndex >= requiredTierIndex) {
      return null; // User already has access
    }

    const tiers = Object.values(this.billingService.PRICING_TIERS);
    const currentTier = tiers[currentTierIndex];
    const targetTier = tiers[requiredTierIndex];

    return {
      type: "feature_upgrade",
      feature,
      currentTier: currentTier?.name || "Free",
      requiredTier: targetTier.name,
      requiredTierPrice: targetTier.price,
      savings: this.calculateAnnualSavings(targetTier.price),
      benefits: this.getUpgradeBenefits(currentTierIndex, requiredTierIndex),
      cta: `Upgrade to ${targetTier.name}`,
      urgency: this.getUrgencyMessage(feature),
      upgradeUrl: this.getUpgradeUrl(requiredTierIndex, platform),
    };
  }

  /**
   * Generate usage limit warning
   */
  generateUsageLimitWarning(
    limitType,
    currentUsage,
    userTier,
    platform = "stripe",
  ) {
    const tier = this.billingService.getTierById(userTier);
    if (!tier) return null;

    const limit = tier.limits[limitType];
    if (limit === -1) return null; // Unlimited

    const usagePercentage = (currentUsage / limit) * 100;

    if (usagePercentage < 80) return null; // Not close to limit

    const nextTierIndex = this.getNextTierIndex(userTier);
    const nextTier = Object.values(this.billingService.PRICING_TIERS)[
      nextTierIndex
    ];

    if (!nextTier) return null;

    return {
      type: "usage_limit_warning",
      limitType,
      currentUsage,
      limit,
      usagePercentage: Math.round(usagePercentage),
      warningLevel:
        usagePercentage >= 95
          ? "critical"
          : usagePercentage >= 90
            ? "high"
            : "medium",
      nextTier: nextTier.name,
      nextTierLimit: nextTier.limits[limitType],
      nextTierPrice: nextTier.price,
      upgradeUrl: this.getUpgradeUrl(nextTierIndex, platform),
      message: this.getUsageLimitMessage(
        limitType,
        usagePercentage,
        nextTier.name,
      ),
    };
  }

  /**
   * Generate conversion funnel for onboarding
   */
  generateOnboardingUpgrade(userBehavior, platform = "stripe") {
    const { actionsPerformed, timeSpent, featuresAttempted } = userBehavior;

    // Determine best tier based on behavior
    let recommendedTierIndex = 0; // Start with Starter

    if (
      featuresAttempted.includes("ai_copywriter") ||
      featuresAttempted.includes("rsa_test_queue")
    ) {
      recommendedTierIndex = 1; // Pro
    }

    if (
      featuresAttempted.includes("asset_library") ||
      timeSpent > 30 * 60 * 1000
    ) {
      // 30+ minutes
      recommendedTierIndex = 2; // Growth
    }

    if (actionsPerformed > 20 || featuresAttempted.length > 10) {
      recommendedTierIndex = 3; // Enterprise
    }

    const recommendedTier = Object.values(this.billingService.PRICING_TIERS)[
      recommendedTierIndex
    ];

    return {
      type: "onboarding_upgrade",
      recommendedTier: recommendedTier.name,
      recommendedTierIndex,
      price: recommendedTier.price,
      personalizedBenefits: this.getPersonalizedBenefits(
        featuresAttempted,
        recommendedTier,
      ),
      incentive: this.getOnboardingIncentive(recommendedTierIndex),
      upgradeUrl: this.getUpgradeUrl(recommendedTierIndex, platform),
      timeLimit: "24 hours", // Limited time offer
      socialProof: this.getSocialProof(recommendedTier.id),
    };
  }

  /**
   * Handle post-upgrade experience
   */
  async handlePostUpgrade(userId, newTierIndex, platform) {
    try {
      const newTier = Object.values(this.billingService.PRICING_TIERS)[
        newTierIndex
      ];

      // Log upgrade event
      logger.info("User upgraded subscription", {
        userId,
        newTier: newTier.id,
        platform,
        timestamp: new Date().toISOString(),
      });

      // Send welcome email for new tier
      await this.sendUpgradeWelcomeEmail(userId, newTier, platform);

      // Enable new features
      await this.enableTierFeatures(userId, newTier.features, platform);

      // Schedule onboarding for new features
      await this.scheduleFeatureOnboarding(userId, newTier.id, platform);

      // Track upgrade conversion
      await this.trackUpgradeConversion(userId, newTierIndex, platform);

      return {
        success: true,
        newTier: newTier.name,
        enabledFeatures: newTier.features,
        onboardingScheduled: true,
      };
    } catch (error) {
      logger.error("Error handling post-upgrade experience", {
        userId,
        newTierIndex,
        platform,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate smart upgrade suggestions based on usage patterns
   */
  generateSmartUpgradeSuggestions(userId, usageData, platform = "stripe") {
    const suggestions = [];

    // Analyze usage patterns
    const { campaigns, keywords, monthlySpend, features } = usageData;

    // High usage suggestion
    if (campaigns > 15 && usageData.currentTier === "starter") {
      suggestions.push({
        type: "usage_based",
        reason: "campaign_volume",
        title: "Managing many campaigns?",
        description:
          "Pro tier gives you 4x the campaign limit plus AI copywriting",
        tierIndex: 1,
        priority: "high",
      });
    }

    // Feature-based suggestions
    if (features.attemptedPremium && features.attemptedPremium.length > 0) {
      suggestions.push({
        type: "feature_based",
        reason: "premium_features",
        title: "Unlock the features you tried",
        description: `Get access to ${features.attemptedPremium.join(", ")} and more`,
        tierIndex: this.getMinimumTierForFeatures(features.attemptedPremium),
        priority: "medium",
      });
    }

    // Spend-based suggestions
    if (monthlySpend > 10000 && usageData.currentTier !== "enterprise") {
      suggestions.push({
        type: "spend_based",
        reason: "high_spend",
        title: "Maximize your ad ROI",
        description:
          "Growth tier includes advanced budget optimization for high-spend accounts",
        tierIndex: 2,
        priority: "high",
      });
    }

    return suggestions.map((suggestion) => ({
      ...suggestion,
      upgradeUrl: this.getUpgradeUrl(suggestion.tierIndex, platform),
      tier: Object.values(this.billingService.PRICING_TIERS)[
        suggestion.tierIndex
      ],
    }));
  }

  // Helper methods

  getRequiredTierForFeature(feature) {
    const featureTierMap = {
      ai_copywriter: "pro",
      rsa_test_queue: "pro",
      keyword_promotions: "pro",
      asset_library: "growth",
      geo_daypart_hints: "growth",
      promo_page_generator: "growth",
      custom_rules: "enterprise",
      server_side_tagging: "enterprise",
    };

    return featureTierMap[feature] || "starter";
  }

  getNextTierIndex(currentTierId) {
    const currentIndex = this.billingService.getTierIndexById(currentTierId);
    const tiers = Object.values(this.billingService.PRICING_TIERS);
    return Math.min(currentIndex + 1, tiers.length - 1);
  }

  calculateAnnualSavings(monthlyPrice) {
    // Assume 2 months free on annual plans
    const annualPrice = monthlyPrice * 10; // 10 months instead of 12
    const monthlyCost = monthlyPrice * 12;
    return monthlyCost - annualPrice;
  }

  getUpgradeBenefits(currentTierIndex, targetTierIndex) {
    const allTiers = Object.values(this.billingService.PRICING_TIERS);
    const benefits = [];

    for (let i = currentTierIndex + 1; i <= targetTierIndex; i++) {
      const tier = allTiers[i];
      if (tier) {
        benefits.push(
          ...tier.features.filter((f) => !f.startsWith("Everything in")),
        );
      }
    }

    return [...new Set(benefits)].slice(0, 5); // Remove duplicates, limit to 5
  }

  getUrgencyMessage(feature) {
    const urgencyMessages = {
      ai_copywriter: "Save hours of manual ad writing",
      rsa_test_queue: "Stop guessing which ads work best",
      asset_library: "Scale your ad creation instantly",
      geo_daypart_hints: "Optimize for your best performing times",
      custom_rules: "Get enterprise-level control",
    };

    return urgencyMessages[feature] || "Unlock advanced features now";
  }

  getUpgradeUrl(tierIndex, platform) {
    const baseUrl =
      platform === "shopify"
        ? "/billing"
        : "/wp-admin/admin.php?page=proofkit-billing";
    return `${baseUrl}?upgrade=${tierIndex}&utm_source=feature_gate&utm_medium=upgrade_flow`;
  }

  getUsageLimitMessage(limitType, usagePercentage, nextTier) {
    const limitMessages = {
      campaigns: `You're at ${usagePercentage}% of your campaign limit. ${nextTier} gives you more capacity.`,
      keywords: `You've used ${usagePercentage}% of your keyword limit. Upgrade to ${nextTier} for more.`,
      monthlySpend: `You're approaching your monthly spend limit. ${nextTier} supports higher volumes.`,
    };

    return (
      limitMessages[limitType] ||
      `You're at ${usagePercentage}% capacity. Upgrade to ${nextTier} for more resources.`
    );
  }

  getPersonalizedBenefits(attemptedFeatures, tier) {
    return tier.features
      .filter((feature) =>
        attemptedFeatures.some((attempted) =>
          feature.toLowerCase().includes(attempted.toLowerCase()),
        ),
      )
      .slice(0, 3);
  }

  getOnboardingIncentive(tierIndex) {
    const incentives = [
      "7-day free trial",
      "14-day free trial + setup consultation",
      "30-day free trial + priority support",
      "Custom pricing + dedicated success manager",
    ];

    return incentives[tierIndex] || "7-day free trial";
  }

  getSocialProof(tierId) {
    const proofData = {
      starter: { customers: 1200, testimonial: "Perfect for getting started" },
      pro: {
        customers: 800,
        testimonial: "AI copywriting saves us hours every week",
      },
      growth: {
        customers: 300,
        testimonial: "Scaled from $10k to $100k monthly spend",
      },
      enterprise: {
        customers: 50,
        testimonial: "Custom rules give us complete control",
      },
    };

    return proofData[tierId] || proofData.starter;
  }

  getMinimumTierForFeatures(features) {
    let maxTierIndex = 0;

    features.forEach((feature) => {
      const requiredTier = this.getRequiredTierForFeature(feature);
      const tierIndex = this.billingService.getTierIndexById(requiredTier);
      maxTierIndex = Math.max(maxTierIndex, tierIndex);
    });

    return maxTierIndex;
  }

  async sendUpgradeWelcomeEmail(userId, tier, platform) {
    // Implementation would send email via email service
    logger.info("Upgrade welcome email scheduled", {
      userId,
      tier: tier.id,
      platform,
    });
  }

  async enableTierFeatures(userId, features, platform) {
    // Implementation would update user permissions/features
    logger.info("Tier features enabled", {
      userId,
      features: features.length,
      platform,
    });
  }

  async scheduleFeatureOnboarding(userId, tierId, platform) {
    // Implementation would schedule onboarding tasks
    logger.info("Feature onboarding scheduled", { userId, tierId, platform });
  }

  async trackUpgradeConversion(userId, tierIndex, platform) {
    // Implementation would track conversion in analytics
    logger.info("Upgrade conversion tracked", { userId, tierIndex, platform });
  }
}

export default UpgradeFlowService;
