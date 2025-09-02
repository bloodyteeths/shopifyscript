/**
 * Subscription utilities for server-side subscription checking
 * Handles trial periods, plan tiers, and feature access
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export interface SubscriptionInfo {
  hasActivePayment: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number | null;
  subscriptionTier: 'starter' | 'professional' | 'enterprise' | null;
  subscriptionStatus: string;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  needsSubscription: boolean;
}

/**
 * Check subscription status for a shop using GraphQL API
 */
export async function checkSubscriptionStatus(admin: AdminApiContext): Promise<SubscriptionInfo> {
  const defaultResult: SubscriptionInfo = {
    hasActivePayment: false,
    isInTrial: false,
    trialDaysRemaining: null,
    subscriptionTier: null,
    subscriptionStatus: 'none',
    subscriptionId: null,
    currentPeriodEnd: null,
    needsSubscription: true
  };

  try {
    const subscriptionQuery = `
      query GetCurrentAppSubscription {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            createdAt
            currentPeriodEnd
            trialDays
            test
            lineItems {
              id
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                    interval
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(subscriptionQuery);
    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL subscription query errors:', result.errors);
      return defaultResult;
    }

    const subscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];
    
    if (subscriptions.length === 0) {
      console.log('No active subscriptions found');
      return defaultResult;
    }

    const subscription = subscriptions[0]; // Get the first (primary) subscription
    
    // Determine subscription tier based on price
    const priceAmount = parseFloat(subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || 0);
    let tier: 'starter' | 'professional' | 'enterprise' | null = null;
    
    if (priceAmount === 29) tier = 'starter';
    else if (priceAmount === 79) tier = 'professional';  
    else if (priceAmount === 199) tier = 'enterprise';

    // Calculate trial status
    let isInTrial = false;
    let trialDaysRemaining = null;

    if (subscription.trialDays > 0) {
      const createdAt = new Date(subscription.createdAt);
      const trialEndDate = new Date(createdAt.getTime() + (subscription.trialDays * 24 * 60 * 60 * 1000));
      const now = new Date();
      
      isInTrial = now < trialEndDate;
      trialDaysRemaining = isInTrial ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;
    }

    const hasActivePayment = subscription.status === 'ACTIVE' && !isInTrial;
    const needsSubscription = !hasActivePayment && !isInTrial;

    return {
      hasActivePayment,
      isInTrial,
      trialDaysRemaining,
      subscriptionTier: tier,
      subscriptionStatus: subscription.status,
      subscriptionId: subscription.id,
      currentPeriodEnd: subscription.currentPeriodEnd,
      needsSubscription
    };

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return defaultResult;
  }
}

/**
 * Check if user has access to a specific feature based on their subscription tier
 */
export function hasFeatureAccess(subscriptionInfo: SubscriptionInfo, feature: string): boolean {
  // During trial, allow access to subscribed tier features
  if (subscriptionInfo.isInTrial && subscriptionInfo.subscriptionTier) {
    return checkTierFeatureAccess(subscriptionInfo.subscriptionTier, feature);
  }
  
  // For active paid subscriptions, check tier access
  if (subscriptionInfo.hasActivePayment && subscriptionInfo.subscriptionTier) {
    return checkTierFeatureAccess(subscriptionInfo.subscriptionTier, feature);
  }
  
  // No subscription or trial - only basic features
  return isBasicFeature(feature);
}

/**
 * Check if a feature is available for a specific tier
 */
function checkTierFeatureAccess(tier: string, feature: string): boolean {
  const tierFeatures = {
    starter: [
      'ai_campaign_optimization',
      'basic_performance_analytics', 
      'campaign_monitoring',
      'email_support',
      'basic_roas_tracking',
      'monthly_insights_reports',
      'budget_caps',
      'brand_protection'
    ],
    professional: [
      // All starter features plus:
      'ai_campaign_optimization',
      'basic_performance_analytics',
      'campaign_monitoring', 
      'email_support',
      'basic_roas_tracking',
      'monthly_insights_reports',
      'budget_caps',
      'brand_protection',
      'advanced_ai_optimization',
      'real_time_performance_analytics',
      'priority_email_support',
      'advanced_roas_analytics', 
      'automated_bid_management',
      'weekly_insights_reports'
    ],
    enterprise: [
      // All professional features plus:
      'ai_campaign_optimization',
      'basic_performance_analytics',
      'campaign_monitoring',
      'email_support', 
      'basic_roas_tracking',
      'monthly_insights_reports',
      'budget_caps',
      'brand_protection',
      'advanced_ai_optimization',
      'real_time_performance_analytics',
      'priority_email_support',
      'advanced_roas_analytics',
      'automated_bid_management', 
      'weekly_insights_reports',
      'custom_ai_optimization_rules',
      'advanced_performance_analytics',
      'priority_support_sla',
      'custom_roas_tracking',
      'advanced_automation_features',
      'custom_reporting'
    ]
  };

  return tierFeatures[tier]?.includes(feature) || false;
}

/**
 * Check if a feature is available without subscription (basic features)
 */
function isBasicFeature(feature: string): boolean {
  const basicFeatures = [
    'script_generation',
    'basic_campaign_view',
    'app_navigation',
    'settings_access'
  ];
  
  return basicFeatures.includes(feature);
}

/**
 * Get redirect URL for plan selection
 */
export function getPlanSelectionUrl(shopName: string, appHandle: string): string {
  return `https://${shopName}.myshopify.com/admin/charges/${appHandle}/pricing_plans`;
}

/**
 * Check if user should be redirected to plan selection
 */
export function shouldRedirectToPlans(subscriptionInfo: SubscriptionInfo): boolean {
  return subscriptionInfo.needsSubscription;
}

export default {
  checkSubscriptionStatus,
  hasFeatureAccess,
  shouldRedirectToPlans,
  getPlanSelectionUrl
};