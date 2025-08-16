/**
 * ProofKit Billing Routes
 * Handles both Stripe (WordPress) and Shopify billing endpoints
 */

import express from 'express';
import crypto from 'crypto';
import BillingService, { PRICING_TIERS } from '../services/billing.js';
import ShopifyBillingService, { SHOPIFY_PRICING_TIERS } from '../services/shopify-billing.js';
import WebhookHandlerService from '../services/webhook-handler.js';
import {
  requireFeature,
  checkUsageLimit,
  requireTier,
  requireActiveSubscription
} from '../middleware/tier-enforcement.js';

const router = express.Router();
const billingService = new BillingService();
const webhookHandler = new WebhookHandlerService();

// ==== PRICING INFORMATION ====

/**
 * Get all pricing tiers and features
 */
router.get('/pricing', (req, res) => {
  try {
    const platform = req.query.platform || 'stripe'; // stripe or shopify
    const tiers = platform === 'shopify' ? SHOPIFY_PRICING_TIERS : PRICING_TIERS;
    
    res.json({
      success: true,
      platform,
      tiers: Object.values(tiers).map(tier => ({
        id: tier.id,
        name: tier.name,
        price: tier.price,
        features: tier.features,
        limits: tier.limits,
        description: gettierDescription(tier.id)
      }))
    });
  } catch (error) {
    console.error('Error getting pricing:', error);
    res.status(500).json({
      error: 'Failed to get pricing information',
      code: 'PRICING_ERROR'
    });
  }
});

/**
 * Get feature comparison matrix
 */
router.get('/features', (req, res) => {
  try {
    const allFeatures = getAllFeatures();
    const tiers = Object.values(PRICING_TIERS);
    
    const featureMatrix = allFeatures.map(feature => ({
      feature: feature.name,
      description: feature.description,
      category: feature.category,
      tiers: tiers.reduce((acc, tier) => {
        acc[tier.id] = tier.features.includes(feature.id);
        return acc;
      }, {})
    }));

    res.json({
      success: true,
      features: featureMatrix,
      tiers: tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        price: tier.price
      }))
    });
  } catch (error) {
    console.error('Error getting features:', error);
    res.status(500).json({
      error: 'Failed to get feature information',
      code: 'FEATURES_ERROR'
    });
  }
});

// ==== STRIPE BILLING (WORDPRESS) ====

/**
 * Create Stripe customer and checkout session
 */
router.post('/stripe/checkout', async (req, res) => {
  try {
    const { email, name, tierIndex, successUrl, cancelUrl, metadata = {} } = req.body;

    if (!email || tierIndex === undefined) {
      return res.status(400).json({
        error: 'Email and tier are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Create customer
    const customer = await billingService.createCustomer(email, name, {
      ...metadata,
      platform: 'wordpress'
    });

    // Create checkout session
    const session = await billingService.createCheckoutSession(
      customer.id,
      tierIndex,
      { customerId: customer.id, ...metadata },
      successUrl || `${req.get('origin')}/billing/success`,
      cancelUrl || `${req.get('origin')}/billing/cancel`
    );

    res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      customerId: customer.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      code: 'CHECKOUT_ERROR'
    });
  }
});

/**
 * Get Stripe customer subscriptions
 */
router.get('/stripe/subscriptions/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const subscriptions = await billingService.getCustomerSubscriptions(customerId);
    
    const formattedSubscriptions = subscriptions.data.map(sub => ({
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      tier: sub.metadata.tier,
      amount: sub.items.data[0]?.price.unit_amount / 100,
      currency: sub.items.data[0]?.price.currency,
      cancelAtPeriodEnd: sub.cancel_at_period_end
    }));

    res.json({
      success: true,
      subscriptions: formattedSubscriptions
    });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({
      error: 'Failed to get subscriptions',
      code: 'SUBSCRIPTION_GET_ERROR'
    });
  }
});

/**
 * Change Stripe subscription tier
 */
router.post('/stripe/subscriptions/:subscriptionId/change', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newTierIndex } = req.body;

    if (newTierIndex === undefined) {
      return res.status(400).json({
        error: 'New tier is required',
        code: 'MISSING_TIER'
      });
    }

    // Calculate proration first
    const proration = await billingService.calculateProration(subscriptionId, newTierIndex);
    
    // Update subscription
    const updatedSubscription = await billingService.changeSubscription(subscriptionId, newTierIndex);

    res.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        tier: updatedSubscription.metadata.tier
      },
      proration: {
        amount: proration.amount_due / 100,
        currency: proration.currency
      }
    });
  } catch (error) {
    console.error('Error changing subscription:', error);
    res.status(500).json({
      error: 'Failed to change subscription',
      code: 'SUBSCRIPTION_CHANGE_ERROR'
    });
  }
});

/**
 * Cancel Stripe subscription
 */
router.post('/stripe/subscriptions/:subscriptionId/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { immediately = false } = req.body;

    const canceledSubscription = await billingService.cancelSubscription(subscriptionId, immediately);

    res.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        canceledAt: canceledSubscription.canceled_at ? new Date(canceledSubscription.canceled_at * 1000) : null,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      code: 'SUBSCRIPTION_CANCEL_ERROR'
    });
  }
});

/**
 * Create Stripe billing portal session
 */
router.post('/stripe/portal/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { returnUrl } = req.body;

    const session = await billingService.createPortalSession(
      customerId,
      returnUrl || `${req.get('origin')}/billing`
    );

    res.json({
      success: true,
      portalUrl: session.url
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      code: 'PORTAL_ERROR'
    });
  }
});

// ==== SHOPIFY BILLING ====

/**
 * Create Shopify subscription
 */
router.post('/shopify/subscribe', async (req, res) => {
  try {
    const { shop, accessToken, tierIndex, returnUrl } = req.body;

    if (!shop || !accessToken || tierIndex === undefined) {
      return res.status(400).json({
        error: 'Shop, access token, and tier are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const shopifyBilling = new ShopifyBillingService();
    const subscription = await shopifyBilling.createSubscription(
      shop,
      accessToken,
      tierIndex,
      returnUrl || `${req.get('origin')}/billing/shopify/success`
    );

    res.json({
      success: true,
      subscription: subscription.appSubscription,
      confirmationUrl: subscription.confirmationUrl
    });
  } catch (error) {
    console.error('Error creating Shopify subscription:', error);
    res.status(500).json({
      error: 'Failed to create Shopify subscription',
      code: 'SHOPIFY_SUBSCRIPTION_ERROR'
    });
  }
});

/**
 * Get current Shopify subscription
 */
router.get('/shopify/subscription/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { accessToken } = req.query;

    if (!accessToken) {
      return res.status(400).json({
        error: 'Access token is required',
        code: 'MISSING_ACCESS_TOKEN'
      });
    }

    const shopifyBilling = new ShopifyBillingService();
    const subscription = await shopifyBilling.getCurrentSubscription(shop, accessToken);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null
      });
    }

    const tier = shopifyBilling.getSubscriptionTier(subscription);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        name: subscription.name,
        status: subscription.status,
        createdAt: subscription.createdAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        tier: tier?.id || null,
        amount: subscription.lineItems[0]?.plan.pricingDetails.price.amount || 0
      }
    });
  } catch (error) {
    console.error('Error getting Shopify subscription:', error);
    res.status(500).json({
      error: 'Failed to get Shopify subscription',
      code: 'SHOPIFY_GET_ERROR'
    });
  }
});

/**
 * Update Shopify subscription
 */
router.post('/shopify/subscription/:subscriptionId/change', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { shop, accessToken, newTierIndex, returnUrl } = req.body;

    if (!shop || !accessToken || newTierIndex === undefined) {
      return res.status(400).json({
        error: 'Shop, access token, and new tier are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const shopifyBilling = new ShopifyBillingService();
    const newSubscription = await shopifyBilling.updateSubscription(
      shop,
      accessToken,
      subscriptionId,
      newTierIndex,
      returnUrl || `${req.get('origin')}/billing/shopify/success`
    );

    res.json({
      success: true,
      subscription: newSubscription.appSubscription,
      confirmationUrl: newSubscription.confirmationUrl
    });
  } catch (error) {
    console.error('Error updating Shopify subscription:', error);
    res.status(500).json({
      error: 'Failed to update Shopify subscription',
      code: 'SHOPIFY_UPDATE_ERROR'
    });
  }
});

/**
 * Cancel Shopify subscription
 */
router.post('/shopify/subscription/:subscriptionId/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { shop, accessToken } = req.body;

    if (!shop || !accessToken) {
      return res.status(400).json({
        error: 'Shop and access token are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const shopifyBilling = new ShopifyBillingService();
    const canceledSubscription = await shopifyBilling.cancelSubscription(shop, accessToken, subscriptionId);

    res.json({
      success: true,
      subscription: canceledSubscription
    });
  } catch (error) {
    console.error('Error canceling Shopify subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel Shopify subscription',
      code: 'SHOPIFY_CANCEL_ERROR'
    });
  }
});

// ==== WEBHOOKS ====

/**
 * Stripe webhook handler
 */
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const rawBody = req.body;

    // Parse the event
    let event;
    try {
      event = billingService.stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Process the event with our webhook handler
    const result = await webhookHandler.processStripeWebhook(event, sig, rawBody);
    
    res.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    res.status(500).json({
      error: 'Webhook handling failed',
      code: 'WEBHOOK_ERROR'
    });
  }
});

/**
 * Shopify webhook handler
 */
router.post('/webhooks/shopify', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const topic = req.headers['x-shopify-topic'];
    const shop = req.headers['x-shopify-shop-domain'];
    const signature = req.headers['x-shopify-hmac-sha256'];
    const rawBody = req.body;

    const data = JSON.parse(rawBody.toString());
    
    // Process the webhook with our webhook handler
    const result = await webhookHandler.processShopifyWebhook(topic, shop, data, signature, rawBody);
    
    res.json({ received: true, processed: result.processed });
  } catch (error) {
    console.error('Error handling Shopify webhook:', error);
    res.status(500).json({
      error: 'Webhook handling failed',
      code: 'WEBHOOK_ERROR'
    });
  }
});

// ==== PROTECTED ENDPOINTS (EXAMPLES) ====

/**
 * Example protected endpoint requiring Pro tier
 */
router.get('/pro-feature', requireTier(1), (req, res) => {
  res.json({
    success: true,
    message: 'You have access to Pro features!',
    tier: req.tier.name
  });
});

/**
 * Example endpoint with usage limits
 */
router.post('/create-campaign', checkUsageLimit('campaigns'), (req, res) => {
  res.json({
    success: true,
    message: 'Campaign created successfully',
    remainingQuota: req.remainingQuota
  });
});

/**
 * Example endpoint requiring specific feature
 */
router.get('/ai-copywriter', requireFeature('ai_copywriter', { requiredTier: 'Pro' }), (req, res) => {
  res.json({
    success: true,
    message: 'AI Copywriter is available',
    tier: req.tier.name
  });
});

// ==== HELPER FUNCTIONS ====

function gettierDescription(tierId) {
  const descriptions = {
    starter: 'Perfect for small stores getting started with Google Ads automation',
    pro: 'Advanced features for growing stores that want AI-powered optimization',
    growth: 'Comprehensive tools for multi-store operations and team collaboration',
    enterprise: 'Custom solutions for high-volume advertisers and agencies'
  };
  return descriptions[tierId] || '';
}

function getAllFeatures() {
  return [
    {
      id: 'instant_safe_starter_campaigns',
      name: 'Safe Starter Campaigns',
      description: 'Automatically creates safe Search campaigns if none exist',
      category: 'Campaign Management'
    },
    {
      id: 'daily_optimizer',
      name: 'Daily Optimizer',
      description: 'Daily optimization with budget caps, CPC ceilings, and scheduling',
      category: 'Optimization'
    },
    {
      id: 'auto_block_waste',
      name: 'Auto-Block Waste',
      description: 'Automatically blocks money-wasting search terms',
      category: 'Optimization'
    },
    {
      id: 'ai_copywriter',
      name: 'AI Copywriter',
      description: 'AI-generated responsive search ads with 30/90 character limits',
      category: 'Creative'
    },
    {
      id: 'rsa_test_queue',
      name: 'RSA Test Queue',
      description: 'Systematic testing of new ad variations with statistical significance',
      category: 'Testing'
    },
    {
      id: 'keyword_promotions',
      name: 'Keyword Promotions',
      description: 'Converts winning search terms into targeted keywords',
      category: 'Keywords'
    },
    {
      id: 'asset_library',
      name: 'Asset Library',
      description: 'Pooled headlines and descriptions organized by theme',
      category: 'Creative'
    },
    {
      id: 'geo_daypart_hints',
      name: 'Geo & Daypart Optimization',
      description: 'AI-suggested regional and time-based bid adjustments',
      category: 'Targeting'
    },
    {
      id: 'custom_rules',
      name: 'Custom Rules',
      description: 'Advanced custom rules and guardrails for enterprise needs',
      category: 'Enterprise'
    }
  ];
}

export default router;