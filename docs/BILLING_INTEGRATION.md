# ProofKit Billing Integration Documentation

## Overview

ProofKit implements a comprehensive billing system supporting both Shopify App Billing and Stripe for direct WordPress billing. The system includes tier-based feature enforcement, usage limits, upgrade flows, and webhook handling.

## Architecture

### Core Components

1. **Billing Services** (`/backend/services/`)
   - `billing.js` - Stripe integration for WordPress users
   - `shopify-billing.js` - Shopify Billing API integration
   - `webhook-handler.js` - Webhook processing for both platforms
   - `upgrade-flow.js` - Upgrade prompts and conversion flows

2. **Middleware** (`/backend/middleware/`)
   - `tier-enforcement.js` - Feature gates and usage limit enforcement

3. **Routes** (`/backend/routes/`)
   - `billing.js` - API endpoints for billing operations

4. **UI Components**
   - Shopify: `/shopify-app/app/routes/billing.jsx`
   - WordPress: `/wordpress-plugin/includes/admin/class-billing.php`

## Pricing Tiers

### Starter - $29/month
**Target:** Small stores getting started with Google Ads automation

**Features:**
- Instant "safe starter" Search campaigns
- Daily optimizer with budget caps, CPC ceilings, business-hours schedule
- Auto-block money-wasting queries (exact negatives)
- Brand protection (never negates brand terms)
- Pixel health check (GA4 + Google Ads) and Consent Mode v2 guidance
- Weekly email summary
- Slack/email alerts for anomalies
- Full audit trail in Google Sheet
- Campaign/ad group exclusions

**Limits:**
- Campaigns: 5
- Ad Groups: 25
- Keywords: 500
- Monthly Spend: $5,000

### Pro - $99/month
**Target:** Growing stores that want AI-powered optimization

**Features:**
- Everything in Starter, plus:
- AI ad copywriter (RSA) with 30/90 character limits
- RSA Test Queue with statistical significance testing
- Keyword Promotions (converts search terms to PHRASE/EXACT keywords)
- Phrase-level waste blocker (n-grams)
- Budget pacer with guardrails
- Sitelinks/Callouts/Snippets drafts
- AI landing page section drafts (Shopify/WP)
- Plain-English change explanations

**Limits:**
- Campaigns: 20
- Ad Groups: 100
- Keywords: 2,000
- Monthly Spend: $25,000

### Growth - $249/month
**Target:** Multi-catalog stores pushing for scale and conversion rate lift

**Features:**
- Everything in Pro, plus:
- Asset Library (pooled headlines/descriptions by theme)
- Geo & daypart optimization hints
- Promo page generator (AI drafts full landing pages)
- Brand/Non-brand mapping
- Pacer rules editor (customize pacing/CPA guards)
- Multi-store support
- Team roles and advanced Slack alerts
- Looker Studio template

**Limits:**
- Campaigns: 50
- Ad Groups: 250
- Keywords: 5,000
- Monthly Spend: $100,000
- Stores: 3
- Team Members: 5

### Enterprise - $699+/month
**Target:** High-spend brands and agencies

**Features:**
- Everything in Growth, plus:
- Custom rules & guardrails
- Server-side tagging/Enhanced Conversions consultation
- Private model prompts for regulated categories
- Onboarding/implementation help
- SSO and audit logs export
- SLA support

**Limits:**
- All limits: Unlimited

## Implementation Guide

### 1. Environment Setup

Create environment variables for billing configuration:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs for each tier
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Shopify Configuration
SHOPIFY_BILLING_TEST=true  # Set to false in production
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Database Schema

The billing system requires storing subscription data. Here's a suggested schema:

```sql
-- User subscriptions (WordPress)
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    platform VARCHAR(20) DEFAULT 'stripe',
    subscription_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255),
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop subscriptions (Shopify)
CREATE TABLE shop_subscriptions (
    id SERIAL PRIMARY KEY,
    shop_domain VARCHAR(255) NOT NULL,
    platform VARCHAR(20) DEFAULT 'shopify',
    subscription_id VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment records
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    subscription_id VARCHAR(255) NOT NULL,
    invoice_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL,
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking
CREATE TABLE usage_metrics (
    id SERIAL PRIMARY KEY,
    user_identifier VARCHAR(255) NOT NULL, -- user_id or shop_domain
    platform VARCHAR(20) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- campaigns, keywords, etc.
    metric_value INTEGER NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_platform (user_identifier, platform),
    INDEX idx_recorded_at (recorded_at)
);
```

### 3. Stripe Setup

1. Create a Stripe account and get API keys
2. Create products and prices for each tier in Stripe Dashboard
3. Set up webhook endpoints in Stripe Dashboard:
   - Endpoint URL: `https://your-domain.com/api/billing/webhooks/stripe`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `checkout.session.completed`

### 4. Shopify Setup

1. Create a Shopify Partner account
2. Create a new app with the following permissions:
   - `read_products`
   - `write_products`
   - `read_analytics`
   - `write_pixels`
3. Configure App Billing in your app settings
4. Set up webhook for `app_subscriptions/update`

### 5. Feature Enforcement

Use the tier enforcement middleware to protect features:

```javascript
import { requireFeature, checkUsageLimit, requireTier } from './middleware/tier-enforcement.js';

// Require specific feature
app.get('/api/ai-copywriter', requireFeature('ai_copywriter'), (req, res) => {
  // Feature implementation
});

// Check usage limits
app.post('/api/campaigns', checkUsageLimit('campaigns'), (req, res) => {
  // Create campaign with remaining quota check
});

// Require minimum tier
app.get('/api/asset-library', requireTier(2), (req, res) => {
  // Growth tier or higher required
});
```

## API Endpoints

### Pricing Information

```
GET /api/billing/pricing
GET /api/billing/features
```

### Stripe (WordPress)

```
POST /api/billing/stripe/checkout
GET /api/billing/stripe/subscriptions/:customerId
POST /api/billing/stripe/subscriptions/:subscriptionId/change
POST /api/billing/stripe/subscriptions/:subscriptionId/cancel
POST /api/billing/stripe/portal/:customerId
```

### Shopify

```
POST /api/billing/shopify/subscribe
GET /api/billing/shopify/subscription/:shop
POST /api/billing/shopify/subscription/:subscriptionId/change
POST /api/billing/shopify/subscription/:subscriptionId/cancel
```

### Webhooks

```
POST /api/billing/webhooks/stripe
POST /api/billing/webhooks/shopify
```

## Frontend Integration

### Shopify App

The billing page is located at `/billing` in the Shopify app and uses Polaris components for a native Shopify experience.

Key features:
- Displays current subscription status
- Shows all available plans with feature comparison
- Handles upgrade/downgrade flows
- Integrates with Shopify's billing confirmation flow

### WordPress Plugin

The billing interface is integrated into the WordPress admin at `admin.php?page=proofkit-billing`.

Key features:
- Native WordPress admin styling
- AJAX-powered plan changes
- Stripe Checkout integration
- Customer portal access for billing management

## Webhook Handling

### Stripe Webhooks

The system handles the following Stripe events:

- `customer.subscription.created` - Activates subscription and enables features
- `customer.subscription.updated` - Updates subscription status and adjusts features
- `customer.subscription.deleted` - Deactivates subscription and disables features
- `invoice.payment_succeeded` - Records successful payment
- `invoice.payment_failed` - Handles failed payments and dunning
- `customer.subscription.trial_will_end` - Sends trial ending notifications

### Shopify Webhooks

- `app_subscriptions/update` - Handles subscription status changes
- `app/uninstalled` - Cleans up data when app is uninstalled

## Security Considerations

1. **Webhook Verification** - All webhooks are verified using HMAC signatures
2. **API Authentication** - Billing endpoints require proper authentication
3. **Input Validation** - All inputs are validated and sanitized
4. **Rate Limiting** - Tier-based rate limiting prevents abuse
5. **Data Encryption** - Sensitive data is encrypted at rest and in transit

## Testing

### Stripe Testing

Use Stripe's test mode with test card numbers:
- Success: `4242424242424242`
- Decline: `4000000000000002`
- Requires authentication: `4000002500003155`

### Shopify Testing

Enable test mode in Shopify billing to avoid real charges during development.

## Monitoring and Analytics

### Key Metrics to Track

1. **Conversion Metrics**
   - Free to paid conversion rate
   - Tier upgrade rate
   - Churn rate by tier

2. **Usage Metrics**
   - Feature adoption by tier
   - Usage limit warnings
   - Support ticket volume by tier

3. **Revenue Metrics**
   - Monthly Recurring Revenue (MRR)
   - Average Revenue Per User (ARPU)
   - Customer Lifetime Value (CLV)

### Logging

The system logs all billing events including:
- Subscription changes
- Payment events
- Feature access attempts
- Upgrade flow interactions

## Troubleshooting

### Common Issues

1. **Webhook Failures**
   - Check webhook signature verification
   - Verify endpoint URLs are accessible
   - Check webhook event types are handled

2. **Payment Failures**
   - Verify Stripe configuration
   - Check customer payment methods
   - Review failed payment logs

3. **Feature Access Issues**
   - Verify subscription status
   - Check tier enforcement middleware
   - Review user subscription data

### Support Contacts

For billing integration support:
- Stripe: https://stripe.com/support
- Shopify: https://partners.shopify.com/support

## Future Enhancements

1. **Annual Billing** - Add annual subscription options with discounts
2. **Usage-Based Billing** - Implement usage-based pricing for high-volume users
3. **Enterprise Features** - Add custom contract support
4. **Affiliate Program** - Implement referral tracking and rewards
5. **Multi-Currency** - Support multiple currencies for global users

---

This billing integration provides a robust foundation for monetizing ProofKit across both Shopify and WordPress platforms while maintaining excellent user experience and security standards.