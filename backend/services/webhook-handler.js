/**
 * ProofKit Webhook Handler Service
 * Processes billing webhooks from Stripe and Shopify
 */

import crypto from "crypto";
import logger from "./logger.js";
import BillingService from "./billing.js";
import ShopifyBillingService from "./shopify-billing.js";
import UpgradeFlowService from "./upgrade-flow.js";

export class WebhookHandlerService {
  constructor() {
    this.billingService = new BillingService();
    this.shopifyBilling = new ShopifyBillingService();
    this.upgradeFlow = new UpgradeFlowService();
  }

  /**
   * Process Stripe webhook events
   */
  async processStripeWebhook(event, signature, rawBody) {
    try {
      // Verify webhook signature
      const isValid = this.verifyStripeSignature(rawBody, signature);
      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }

      logger.info("Processing Stripe webhook", {
        type: event.type,
        id: event.id,
      });

      switch (event.type) {
        case "customer.subscription.created":
          return await this.handleStripeSubscriptionCreated(event.data.object);

        case "customer.subscription.updated":
          return await this.handleStripeSubscriptionUpdated(event.data.object);

        case "customer.subscription.deleted":
          return await this.handleStripeSubscriptionDeleted(event.data.object);

        case "invoice.payment_succeeded":
          return await this.handleStripePaymentSucceeded(event.data.object);

        case "invoice.payment_failed":
          return await this.handleStripePaymentFailed(event.data.object);

        case "customer.subscription.trial_will_end":
          return await this.handleStripeTrialWillEnd(event.data.object);

        case "checkout.session.completed":
          return await this.handleStripeCheckoutCompleted(event.data.object);

        default:
          logger.info("Unhandled Stripe webhook event", { type: event.type });
          return { received: true };
      }
    } catch (error) {
      logger.error("Error processing Stripe webhook", {
        error: error.message,
        eventType: event?.type,
        eventId: event?.id,
      });
      throw error;
    }
  }

  /**
   * Process Shopify webhook events
   */
  async processShopifyWebhook(topic, shop, data, signature, rawBody) {
    try {
      // Verify webhook signature
      const isValid = this.verifyShopifySignature(rawBody, signature);
      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }

      logger.info("Processing Shopify webhook", {
        topic,
        shop,
        subscriptionId: data.id,
      });

      switch (topic) {
        case "app_subscriptions/update":
          return await this.handleShopifySubscriptionUpdate(shop, data);

        case "app/uninstalled":
          return await this.handleShopifyAppUninstalled(shop, data);

        default:
          logger.info("Unhandled Shopify webhook topic", { topic });
          return { received: true };
      }
    } catch (error) {
      logger.error("Error processing Shopify webhook", {
        error: error.message,
        topic,
        shop,
      });
      throw error;
    }
  }

  // Stripe webhook handlers

  async handleStripeSubscriptionCreated(subscription) {
    try {
      const customerId = subscription.customer;
      const tier = subscription.metadata.tier;
      const wpUserId = subscription.metadata.wp_user_id;

      logger.info("Stripe subscription created", {
        subscriptionId: subscription.id,
        customerId,
        tier,
        wpUserId,
      });

      // Update user subscription status in database
      if (wpUserId) {
        await this.updateUserSubscription(wpUserId, {
          platform: "stripe",
          subscriptionId: subscription.id,
          customerId,
          tier,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
      }

      // Enable tier features
      const tierIndex = this.billingService.getTierIndexById(tier);
      if (wpUserId && tierIndex >= 0) {
        await this.upgradeFlow.handlePostUpgrade(
          wpUserId,
          tierIndex,
          "wordpress",
        );
      }

      // Send welcome email
      await this.sendSubscriptionWelcomeEmail(subscription);

      return { processed: true };
    } catch (error) {
      logger.error("Error handling subscription created", {
        subscriptionId: subscription.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStripeSubscriptionUpdated(subscription) {
    try {
      const customerId = subscription.customer;
      const tier = subscription.metadata.tier;
      const wpUserId = subscription.metadata.wp_user_id;

      logger.info("Stripe subscription updated", {
        subscriptionId: subscription.id,
        customerId,
        tier,
        status: subscription.status,
      });

      // Update user subscription status
      if (wpUserId) {
        await this.updateUserSubscription(wpUserId, {
          platform: "stripe",
          subscriptionId: subscription.id,
          customerId,
          tier,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
      }

      // Handle tier changes
      if (subscription.status === "active") {
        const tierIndex = this.billingService.getTierIndexById(tier);
        if (wpUserId && tierIndex >= 0) {
          await this.upgradeFlow.handlePostUpgrade(
            wpUserId,
            tierIndex,
            "wordpress",
          );
        }
      }

      // Handle cancellation
      if (subscription.cancel_at_period_end) {
        await this.sendSubscriptionCancellationEmail(subscription);
      }

      return { processed: true };
    } catch (error) {
      logger.error("Error handling subscription updated", {
        subscriptionId: subscription.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStripeSubscriptionDeleted(subscription) {
    try {
      const wpUserId = subscription.metadata.wp_user_id;

      logger.info("Stripe subscription deleted", {
        subscriptionId: subscription.id,
        wpUserId,
      });

      // Update user subscription status
      if (wpUserId) {
        await this.updateUserSubscription(wpUserId, {
          platform: "stripe",
          subscriptionId: subscription.id,
          status: "canceled",
          canceledAt: new Date(),
        });

        // Disable premium features
        await this.disablePremiumFeatures(wpUserId, "wordpress");
      }

      // Send confirmation email
      await this.sendSubscriptionCanceledEmail(subscription);

      return { processed: true };
    } catch (error) {
      logger.error("Error handling subscription deleted", {
        subscriptionId: subscription.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStripePaymentSucceeded(invoice) {
    try {
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;

      logger.info("Stripe payment succeeded", {
        invoiceId: invoice.id,
        subscriptionId,
        amount: invoice.amount_paid,
      });

      // Update payment status
      await this.recordPayment({
        platform: "stripe",
        invoiceId: invoice.id,
        subscriptionId,
        customerId,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        status: "succeeded",
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      });

      // Send receipt
      await this.sendPaymentReceiptEmail(invoice);

      return { processed: true };
    } catch (error) {
      logger.error("Error handling payment succeeded", {
        invoiceId: invoice.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStripePaymentFailed(invoice) {
    try {
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;

      logger.info("Stripe payment failed", {
        invoiceId: invoice.id,
        subscriptionId,
        amount: invoice.amount_due,
      });

      // Record failed payment
      await this.recordPayment({
        platform: "stripe",
        invoiceId: invoice.id,
        subscriptionId,
        customerId,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: "failed",
        failedAt: new Date(),
      });

      // Send dunning email
      await this.sendPaymentFailedEmail(invoice);

      // Check if subscription should be suspended
      const attemptCount = invoice.attempt_count;
      if (attemptCount >= 3) {
        await this.suspendSubscriptionForNonPayment(subscriptionId);
      }

      return { processed: true };
    } catch (error) {
      logger.error("Error handling payment failed", {
        invoiceId: invoice.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStripeTrialWillEnd(subscription) {
    try {
      const wpUserId = subscription.metadata.wp_user_id;
      const trialEnd = new Date(subscription.trial_end * 1000);

      logger.info("Stripe trial will end", {
        subscriptionId: subscription.id,
        trialEnd,
        wpUserId,
      });

      // Send trial ending notification
      await this.sendTrialEndingEmail(subscription);

      return { processed: true };
    } catch (error) {
      logger.error("Error handling trial will end", {
        subscriptionId: subscription.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleStripeCheckoutCompleted(session) {
    try {
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      logger.info("Stripe checkout completed", {
        sessionId: session.id,
        customerId,
        subscriptionId,
      });

      // Update checkout completion status
      await this.recordCheckoutCompletion({
        sessionId: session.id,
        customerId,
        subscriptionId,
        completedAt: new Date(session.created * 1000),
      });

      return { processed: true };
    } catch (error) {
      logger.error("Error handling checkout completed", {
        sessionId: session.id,
        error: error.message,
      });
      throw error;
    }
  }

  // Shopify webhook handlers

  async handleShopifySubscriptionUpdate(shop, subscription) {
    try {
      logger.info("Shopify subscription updated", {
        shop,
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      // Update shop subscription status
      await this.updateShopSubscription(shop, {
        platform: "shopify",
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      });

      // Handle status changes
      if (subscription.status === "ACTIVE") {
        const tier = this.shopifyBilling.getSubscriptionTier(subscription);
        if (tier) {
          const tierIndex = this.billingService.getTierIndexById(tier.id);
          await this.upgradeFlow.handlePostUpgrade(shop, tierIndex, "shopify");
        }
      } else if (subscription.status === "CANCELLED") {
        await this.disablePremiumFeatures(shop, "shopify");
      }

      return { processed: true };
    } catch (error) {
      logger.error("Error handling Shopify subscription update", {
        shop,
        subscriptionId: subscription.id,
        error: error.message,
      });
      throw error;
    }
  }

  async handleShopifyAppUninstalled(shop, data) {
    try {
      logger.info("Shopify app uninstalled", { shop });

      // Clean up shop data
      await this.cleanupShopData(shop);

      return { processed: true };
    } catch (error) {
      logger.error("Error handling app uninstalled", {
        shop,
        error: error.message,
      });
      throw error;
    }
  }

  // Utility methods

  verifyStripeSignature(payload, signature) {
    try {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      const computedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      return signature === `sha256=${computedSignature}`;
    } catch (error) {
      logger.error("Error verifying Stripe signature", {
        error: error.message,
      });
      return false;
    }
  }

  verifyShopifySignature(payload, signature) {
    try {
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
      const computedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64");

      return signature === computedSignature;
    } catch (error) {
      logger.error("Error verifying Shopify signature", {
        error: error.message,
      });
      return false;
    }
  }

  // Database operations (implement according to your database setup)

  async updateUserSubscription(userId, subscriptionData) {
    // Implementation would update user subscription in database
    logger.info("User subscription updated", { userId, ...subscriptionData });
  }

  async updateShopSubscription(shop, subscriptionData) {
    // Implementation would update shop subscription in database
    logger.info("Shop subscription updated", { shop, ...subscriptionData });
  }

  async recordPayment(paymentData) {
    // Implementation would record payment in database
    logger.info("Payment recorded", paymentData);
  }

  async recordCheckoutCompletion(checkoutData) {
    // Implementation would record checkout completion
    logger.info("Checkout completion recorded", checkoutData);
  }

  async disablePremiumFeatures(identifier, platform) {
    // Implementation would disable premium features for user/shop
    logger.info("Premium features disabled", { identifier, platform });
  }

  async suspendSubscriptionForNonPayment(subscriptionId) {
    // Implementation would suspend subscription for non-payment
    logger.info("Subscription suspended for non-payment", { subscriptionId });
  }

  async cleanupShopData(shop) {
    // Implementation would clean up shop data after uninstall
    logger.info("Shop data cleanup initiated", { shop });
  }

  // Email notifications (implement with your email service)

  async sendSubscriptionWelcomeEmail(subscription) {
    logger.info("Welcome email scheduled", { subscriptionId: subscription.id });
  }

  async sendSubscriptionCancellationEmail(subscription) {
    logger.info("Cancellation email scheduled", {
      subscriptionId: subscription.id,
    });
  }

  async sendSubscriptionCanceledEmail(subscription) {
    logger.info("Canceled confirmation email scheduled", {
      subscriptionId: subscription.id,
    });
  }

  async sendPaymentReceiptEmail(invoice) {
    logger.info("Receipt email scheduled", { invoiceId: invoice.id });
  }

  async sendPaymentFailedEmail(invoice) {
    logger.info("Payment failed email scheduled", { invoiceId: invoice.id });
  }

  async sendTrialEndingEmail(subscription) {
    logger.info("Trial ending email scheduled", {
      subscriptionId: subscription.id,
    });
  }
}

export default WebhookHandlerService;
