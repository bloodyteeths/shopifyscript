/**
 * ProofKit Billing Service
 * Handles Stripe integration for WordPress users and subscription management
 */

import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PRICING_TIERS = {
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 29,
    features: [
      "ai_campaign_optimization",
      "basic_performance_analytics", 
      "campaign_monitoring",
      "email_support",
      "basic_roas_tracking",
      "monthly_insights_reports",
      "budget_caps",
      "brand_protection"
    ],
    limits: {
      campaigns: 5,
      adGroups: 25,
      keywords: 500,
      monthlySpend: 5000,
      dataRetentionDays: 7
    },
  },
  PROFESSIONAL: {
    id: "professional",
    name: "Professional", 
    price: 79,
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
    ],
    limits: {
      campaigns: 25,
      adGroups: 100,
      keywords: 2000,
      monthlySpend: 25000,
      dataRetentionDays: 30
    },
  },
  ENTERPRISE: {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
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
      "custom_ai_optimization_rules",
      "advanced_performance_analytics",
      "priority_support_sla",
      "custom_roas_tracking",
      "advanced_automation_features",
      "custom_reporting"
    ],
    limits: {
      campaigns: -1, // unlimited
      adGroups: -1,
      keywords: -1, 
      monthlySpend: -1,
      stores: -1,
      teamMembers: -1,
      dataRetentionDays: 90
    },
  },
};

export class BillingService {
  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create a Stripe customer for a new user
   */
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          source: "proofkit",
        },
      });

      return customer;
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      throw new Error("Failed to create customer");
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(customerId, tierIndex, metadata = {}) {
    const tiers = Object.values(PRICING_TIERS);
    if (tierIndex < 0 || tierIndex >= tiers.length) {
      throw new Error("Invalid pricing tier");
    }

    const tier = tiers[tierIndex];

    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: tier.stripePriceId,
          },
        ],
        metadata: {
          ...metadata,
          tier: tier.id,
          tierId: tier.id,
        },
        billing_cycle_anchor: "now",
        proration_behavior: "create_prorations",
        collection_method: "charge_automatically",
      });

      return subscription;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw new Error("Failed to create subscription");
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId,
    tierIndex,
    metadata = {},
    successUrl,
    cancelUrl,
  ) {
    const tiers = Object.values(PRICING_TIERS);
    if (tierIndex < 0 || tierIndex >= tiers.length) {
      throw new Error("Invalid pricing tier");
    }

    const tier = tiers[tierIndex];

    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: tier.stripePriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          ...metadata,
          tier: tier.id,
        },
        subscription_data: {
          metadata: {
            ...metadata,
            tier: tier.id,
          },
        },
      });

      return session;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new Error("Failed to create checkout session");
    }
  }

  /**
   * Upgrade/downgrade subscription
   */
  async changeSubscription(subscriptionId, newTierIndex) {
    const tiers = Object.values(PRICING_TIERS);
    if (newTierIndex < 0 || newTierIndex >= tiers.length) {
      throw new Error("Invalid pricing tier");
    }

    const newTier = tiers[newTierIndex];

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newTier.stripePriceId,
            },
          ],
          metadata: {
            ...subscription.metadata,
            tier: newTier.id,
          },
          proration_behavior: "create_prorations",
        },
      );

      return updatedSubscription;
    } catch (error) {
      console.error("Error changing subscription:", error);
      throw new Error("Failed to change subscription");
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, immediately = false) {
    try {
      if (immediately) {
        const subscription =
          await this.stripe.subscriptions.del(subscriptionId);
        return subscription;
      } else {
        const subscription = await this.stripe.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end: true,
          },
        );
        return subscription;
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw new Error("Failed to cancel subscription");
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        {
          expand: ["latest_invoice", "customer"],
        },
      );
      return subscription;
    } catch (error) {
      console.error("Error retrieving subscription:", error);
      throw new Error("Failed to retrieve subscription");
    }
  }

  /**
   * Get customer's active subscriptions
   */
  async getCustomerSubscriptions(customerId) {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        expand: ["data.latest_invoice"],
      });
      return subscriptions;
    } catch (error) {
      console.error("Error retrieving customer subscriptions:", error);
      throw new Error("Failed to retrieve subscriptions");
    }
  }

  /**
   * Create a portal session for customer to manage billing
   */
  async createPortalSession(customerId, returnUrl) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return session;
    } catch (error) {
      console.error("Error creating portal session:", error);
      throw new Error("Failed to create portal session");
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case "customer.subscription.created":
          return await this.handleSubscriptionCreated(event.data.object);

        case "customer.subscription.updated":
          return await this.handleSubscriptionUpdated(event.data.object);

        case "customer.subscription.deleted":
          return await this.handleSubscriptionDeleted(event.data.object);

        case "invoice.payment_succeeded":
          return await this.handlePaymentSucceeded(event.data.object);

        case "invoice.payment_failed":
          return await this.handlePaymentFailed(event.data.object);

        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { received: true };
      }
    } catch (error) {
      console.error("Error handling webhook:", error);
      throw error;
    }
  }

  async handleSubscriptionCreated(subscription) {
    console.log("Subscription created:", subscription.id);
    // Update database with new subscription
    // Send welcome email
    // Enable features based on tier
    return { processed: true };
  }

  async handleSubscriptionUpdated(subscription) {
    console.log("Subscription updated:", subscription.id);
    // Update database with changes
    // Adjust feature access based on new tier
    // Send confirmation email if tier changed
    return { processed: true };
  }

  async handleSubscriptionDeleted(subscription) {
    console.log("Subscription deleted:", subscription.id);
    // Update database to reflect cancellation
    // Disable premium features
    // Send cancellation confirmation
    return { processed: true };
  }

  async handlePaymentSucceeded(invoice) {
    console.log("Payment succeeded for invoice:", invoice.id);
    // Update payment status in database
    // Send receipt
    return { processed: true };
  }

  async handlePaymentFailed(invoice) {
    console.log("Payment failed for invoice:", invoice.id);
    // Update payment status in database
    // Send dunning email
    // Potentially suspend service after grace period
    return { processed: true };
  }

  /**
   * Get tier information by ID
   */
  getTierById(tierId) {
    return Object.values(PRICING_TIERS).find((tier) => tier.id === tierId);
  }

  /**
   * Get tier index by ID
   */
  getTierIndexById(tierId) {
    const tiers = Object.values(PRICING_TIERS);
    return tiers.findIndex((tier) => tier.id === tierId);
  }

  /**
   * Check if user has access to a specific feature
   */
  hasFeatureAccess(userTier, feature) {
    const tier = this.getTierById(userTier);
    return tier && tier.features.includes(feature);
  }

  /**
   * Check if user is within usage limits
   */
  isWithinLimits(userTier, usage) {
    const tier = this.getTierById(userTier);
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
   * Get usage limits for a tier
   */
  getTierLimits(tierId) {
    const tier = this.getTierById(tierId);
    return tier ? tier.limits : null;
  }

  /**
   * Calculate prorated amount for tier change
   */
  async calculateProration(subscriptionId, newTierIndex) {
    const tiers = Object.values(PRICING_TIERS);
    if (newTierIndex < 0 || newTierIndex >= tiers.length) {
      throw new Error("Invalid pricing tier");
    }

    const newTier = tiers[newTierIndex];

    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);

      const preview = await this.stripe.invoices.retrieveUpcoming({
        customer: subscription.customer,
        subscription: subscriptionId,
        subscription_items: [
          {
            id: subscription.items.data[0].id,
            price: newTier.stripePriceId,
          },
        ],
        subscription_proration_behavior: "create_prorations",
      });

      return {
        amount_due: preview.amount_due,
        currency: preview.currency,
        lines: preview.lines.data,
      };
    } catch (error) {
      console.error("Error calculating proration:", error);
      throw new Error("Failed to calculate proration");
    }
  }
}

export default BillingService;
