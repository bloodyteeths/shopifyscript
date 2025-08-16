/**
 * ProofKit Shopify Billing Service
 * Handles Shopify App Billing API for embedded app subscriptions
 */

import { PRICING_TIERS } from './billing.js';

export const SHOPIFY_PRICING_TIERS = {
  STARTER: {
    ...PRICING_TIERS.STARTER,
    shopifyPlanId: 'proofkit_starter',
    test: process.env.SHOPIFY_BILLING_TEST === 'true'
  },
  PRO: {
    ...PRICING_TIERS.PRO,
    shopifyPlanId: 'proofkit_pro',
    test: process.env.SHOPIFY_BILLING_TEST === 'true'
  },
  GROWTH: {
    ...PRICING_TIERS.GROWTH,
    shopifyPlanId: 'proofkit_growth',
    test: process.env.SHOPIFY_BILLING_TEST === 'true'
  },
  ENTERPRISE: {
    ...PRICING_TIERS.ENTERPRISE,
    shopifyPlanId: 'proofkit_enterprise',
    test: process.env.SHOPIFY_BILLING_TEST === 'true'
  }
};

export class ShopifyBillingService {
  constructor(shopifyAdmin) {
    this.shopify = shopifyAdmin;
  }

  /**
   * Create an app subscription for Shopify store
   */
  async createSubscription(shop, accessToken, tierIndex, returnUrl) {
    const tiers = Object.values(SHOPIFY_PRICING_TIERS);
    if (tierIndex < 0 || tierIndex >= tiers.length) {
      throw new Error('Invalid pricing tier');
    }

    const tier = tiers[tierIndex];

    try {
      const mutation = `
        mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
          appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
            appSubscription {
              id
              name
              status
              createdAt
              currentPeriodEnd
              lineItems {
                id
                plan {
                  id
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
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        name: `ProofKit ${tier.name} Plan`,
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: tier.price,
                currencyCode: 'USD'
              },
              interval: 'EVERY_30_DAYS'
            }
          }
        }],
        returnUrl,
        test: tier.test
      };

      const response = await this.makeGraphQLRequest(shop, accessToken, mutation, variables);
      
      if (response.data.appSubscriptionCreate.userErrors.length > 0) {
        throw new Error(`Shopify billing error: ${response.data.appSubscriptionCreate.userErrors[0].message}`);
      }

      return response.data.appSubscriptionCreate;
    } catch (error) {
      console.error('Error creating Shopify subscription:', error);
      throw new Error('Failed to create Shopify subscription');
    }
  }

  /**
   * Get current active subscription for a shop
   */
  async getCurrentSubscription(shop, accessToken) {
    try {
      const query = `
        query {
          currentAppInstallation {
            id
            activeSubscriptions {
              id
              name
              status
              createdAt
              currentPeriodEnd
              lineItems {
                id
                plan {
                  id
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

      const response = await this.makeGraphQLRequest(shop, accessToken, query);
      
      if (response.data.currentAppInstallation?.activeSubscriptions) {
        return response.data.currentAppInstallation.activeSubscriptions[0] || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  /**
   * Cancel current subscription
   */
  async cancelSubscription(shop, accessToken, subscriptionId) {
    try {
      const mutation = `
        mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        id: subscriptionId
      };

      const response = await this.makeGraphQLRequest(shop, accessToken, mutation, variables);
      
      if (response.data.appSubscriptionCancel.userErrors.length > 0) {
        throw new Error(`Shopify billing error: ${response.data.appSubscriptionCancel.userErrors[0].message}`);
      }

      return response.data.appSubscriptionCancel.appSubscription;
    } catch (error) {
      console.error('Error canceling Shopify subscription:', error);
      throw new Error('Failed to cancel Shopify subscription');
    }
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(shop, accessToken, subscriptionId, newTierIndex, returnUrl) {
    // Shopify doesn't support direct subscription updates, so we need to:
    // 1. Cancel current subscription
    // 2. Create new subscription
    // 3. Handle the transition gracefully

    try {
      // Cancel current subscription
      await this.cancelSubscription(shop, accessToken, subscriptionId);
      
      // Create new subscription
      const newSubscription = await this.createSubscription(shop, accessToken, newTierIndex, returnUrl);
      
      return newSubscription;
    } catch (error) {
      console.error('Error updating Shopify subscription:', error);
      throw new Error('Failed to update Shopify subscription');
    }
  }

  /**
   * Check if shop has active subscription
   */
  async hasActiveSubscription(shop, accessToken) {
    try {
      const subscription = await this.getCurrentSubscription(shop, accessToken);
      return subscription && subscription.status === 'ACTIVE';
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Get subscription tier from Shopify subscription
   */
  getSubscriptionTier(subscription) {
    if (!subscription || !subscription.lineItems || subscription.lineItems.length === 0) {
      return null;
    }

    const amount = parseFloat(subscription.lineItems[0].plan.pricingDetails.price.amount);
    
    // Map amount to tier
    const tiers = Object.values(SHOPIFY_PRICING_TIERS);
    const tier = tiers.find(t => t.price === amount);
    
    return tier || null;
  }

  /**
   * Verify subscription webhook
   */
  verifyWebhook(body, signature) {
    const hmac = signature.replace('sha256=', '');
    const computed = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('base64');
    
    return hmac === computed;
  }

  /**
   * Handle Shopify billing webhooks
   */
  async handleWebhook(topic, shop, data) {
    try {
      switch (topic) {
        case 'app_subscriptions/update':
          return await this.handleSubscriptionUpdate(shop, data);
        
        default:
          console.log(`Unhandled Shopify webhook topic: ${topic}`);
          return { received: true };
      }
    } catch (error) {
      console.error('Error handling Shopify webhook:', error);
      throw error;
    }
  }

  async handleSubscriptionUpdate(shop, subscription) {
    console.log(`Subscription updated for shop ${shop}:`, subscription.id);
    
    // Update database with subscription changes
    // Adjust feature access based on subscription status
    // Send notifications if needed
    
    return { processed: true };
  }

  /**
   * Create a usage charge for one-time fees
   */
  async createUsageCharge(shop, accessToken, subscriptionId, description, amount) {
    try {
      const mutation = `
        mutation appUsageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
          appUsageRecordCreate(subscriptionLineItemId: $subscriptionLineItemId, price: $price, description: $description) {
            appUsageRecord {
              id
              price {
                amount
                currencyCode
              }
              description
              createdAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        subscriptionLineItemId: subscriptionId,
        price: {
          amount: amount,
          currencyCode: 'USD'
        },
        description
      };

      const response = await this.makeGraphQLRequest(shop, accessToken, mutation, variables);
      
      if (response.data.appUsageRecordCreate.userErrors.length > 0) {
        throw new Error(`Shopify usage charge error: ${response.data.appUsageRecordCreate.userErrors[0].message}`);
      }

      return response.data.appUsageRecordCreate.appUsageRecord;
    } catch (error) {
      console.error('Error creating usage charge:', error);
      throw new Error('Failed to create usage charge');
    }
  }

  /**
   * Make GraphQL request to Shopify Admin API
   */
  async makeGraphQLRequest(shop, accessToken, query, variables = {}) {
    const url = `https://${shop}/admin/api/2023-10/graphql.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data;
  }

  /**
   * Get tier information by Shopify plan ID
   */
  getTierByShopifyPlan(planId) {
    return Object.values(SHOPIFY_PRICING_TIERS).find(tier => tier.shopifyPlanId === planId);
  }

  /**
   * Check if user has access to a specific feature (Shopify context)
   */
  hasFeatureAccess(subscription, feature) {
    const tier = this.getSubscriptionTier(subscription);
    return tier && tier.features.includes(feature);
  }

  /**
   * Check if user is within usage limits (Shopify context)
   */
  isWithinLimits(subscription, usage) {
    const tier = this.getSubscriptionTier(subscription);
    if (!tier) return false;

    const limits = tier.limits;
    
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
   * Get checkout URL for subscription upgrade
   */
  getUpgradeUrl(confirmationUrl) {
    // The confirmation URL from Shopify subscription creation
    // This URL will redirect the merchant to confirm the subscription
    return confirmationUrl;
  }

  /**
   * Parse subscription status from Shopify
   */
  parseSubscriptionStatus(status) {
    const statusMap = {
      'ACTIVE': 'active',
      'CANCELLED': 'cancelled',
      'DECLINED': 'declined',
      'EXPIRED': 'expired',
      'FROZEN': 'suspended',
      'PENDING': 'pending'
    };
    
    return statusMap[status] || 'unknown';
  }
}

export default ShopifyBillingService;