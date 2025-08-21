# ProofKit Web Pixel - Merchant Setup Guide

## Overview

The ProofKit Web Pixel Extension provides privacy-compliant analytics and conversion tracking for your Shopify store. It integrates seamlessly with Google Analytics 4 (GA4), Google Ads, and your Consent Management Platform (CMP) to ensure GDPR, CCPA, and other privacy regulation compliance.

## Features

- ✅ **Consent Mode v2 Compliant**: Automatically respects user consent preferences
- ✅ **GA4 Integration**: Enhanced ecommerce tracking with automatic event firing
- ✅ **Google Ads Conversions**: Tracks checkout_completed events for advertising optimization
- ✅ **Multi-CMP Support**: Works with OneTrust, Cookiebot, TrustArc, Didomi, and more
- ✅ **Privacy-First**: Redacts data when consent is not granted
- ✅ **Real-time Updates**: Responds to consent changes immediately

## Setup Instructions

### Step 1: Install the Extension

1. Navigate to your Shopify Admin
2. Go to Apps > ProofKit
3. Click on "Extensions" tab
4. Enable the "ProofKit Web Pixel" extension

### Step 2: Configure Extension Settings

In your Shopify Admin, configure the following metafields under `proofkit` namespace:

#### Required Settings

| Metafield Key | Description                          | Example Value                  |
| ------------- | ------------------------------------ | ------------------------------ |
| `backend_url` | ProofKit backend API endpoint        | `https://api.proofkit.com/api` |
| `tenant_id`   | Your ProofKit tenant identifier      | `TENANT_123`                   |
| `secret_key`  | HMAC secret for secure communication | `your_secret_key_here`         |

#### Optional Settings (for GA4/Google Ads)

| Metafield Key        | Description                       | Example Value     |
| -------------------- | --------------------------------- | ----------------- |
| `ga4_measurement_id` | Google Analytics 4 Measurement ID | `G-XXXXXXXXXX`    |
| `google_ads_id`      | Google Ads Account ID             | `AW-XXXXXXXXX`    |
| `conversion_label`   | Google Ads Conversion Label       | `abc123def456`    |
| `debug_mode`         | Enable debug logging              | `true` or `false` |

### Step 3: Configure Your Consent Management Platform

The ProofKit Web Pixel automatically detects and integrates with most popular CMPs. Follow the setup guide for your specific CMP:

#### Supported CMPs

- **OneTrust**: Automatically detected via `OptanonActiveGroups`
- **Cookiebot**: Automatically detected via `Cookiebot.consent`
- **TrustArc**: Automatically detected via `truste.eu.bindMap`
- **Didomi**: Automatically detected via `Didomi.getUserConsentStatusForPurpose`
- **Cookie Consent v3**: Automatically detected via `cookieconsent_options`
- **GDPR Cookie Consent**: Automatically detected via `wp_gdpr_cookie_consent_settings`

#### Manual CMP Integration

If your CMP is not automatically detected, you can trigger consent updates manually:

```javascript
// Trigger consent change event when user updates preferences
window.dispatchEvent(
  new CustomEvent("consent_changed", {
    detail: {
      analytics: true, // User consented to analytics
      marketing: true, // User consented to marketing
      preferences: true, // User consented to preferences
      source: "custom",
    },
  }),
);
```

### Step 4: Configure Google Analytics 4 (Optional)

If you want to send events to GA4:

1. Create a GA4 property in Google Analytics
2. Install the GA4 tracking code on your site:

```html
<!-- Google tag (gtag.js) -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }

  // ProofKit Web Pixel will handle consent initialization
  gtag("js", new Date());
  gtag("config", "G-XXXXXXXXXX", {
    // Don't send page_view automatically - ProofKit handles this
    send_page_view: false,
  });
</script>
```

3. Set the `ga4_measurement_id` metafield to your GA4 Measurement ID

### Step 5: Configure Google Ads Conversions (Optional)

If you want to track conversions in Google Ads:

1. Create a conversion action in Google Ads
2. Note the Conversion ID and Label
3. Set the following metafields:
   - `google_ads_id`: Your Google Ads ID (e.g., `AW-XXXXXXXXX`)
   - `conversion_label`: Your conversion label

### Step 6: Testing and Validation

#### Test Consent Scenarios

1. **With Consent Granted**:
   - Navigate through your store
   - Complete a purchase
   - Verify events appear in GA4 and Google Ads

2. **With Consent Denied**:
   - Disable consent in your CMP
   - Navigate through your store
   - Verify events are blocked or anonymized

#### Debug Mode

Enable debug mode by setting the `debug_mode` metafield to `true`. This will log detailed information to the browser console:

```javascript
// Check console for ProofKit debug messages
console.log("ProofKit: GA4 event blocked due to consent: page_view");
console.log("ProofKit: Purchase conversion tracked", {
  transaction_id: "order_123",
  value: 99.99,
  currency: "USD",
  consent_status: { analytics: true, marketing: true, source: "shopify" },
});
```

## Events Tracked

The ProofKit Web Pixel automatically tracks the following Shopify events:

| Shopify Event        | GA4 Event        | Description                                       |
| -------------------- | ---------------- | ------------------------------------------------- |
| `page_viewed`        | `page_view`      | User views a page                                 |
| `product_viewed`     | `view_item`      | User views a product                              |
| `search_submitted`   | `search`         | User performs a search                            |
| `cart_viewed`        | `view_cart`      | User views their cart                             |
| `checkout_started`   | `begin_checkout` | User starts checkout                              |
| `checkout_completed` | `purchase`       | User completes purchase (+ Google Ads conversion) |

## Privacy Features

### Consent Mode v2 Implementation

The extension implements Google's Consent Mode v2 with the following consent types:

- `ad_storage`: Controls ads data storage
- `analytics_storage`: Controls analytics data storage
- `ad_user_data`: Controls user data sharing for ads
- `ad_personalization`: Controls ad personalization
- `functionality_storage`: Always granted (required for core functionality)
- `security_storage`: Always granted (required for security)

### Data Protection

- **Consent Denied**: Personal data is redacted (`[redacted]`) and minimal events are sent
- **Consent Granted**: Full event data is collected and sent to configured destinations
- **Automatic Updates**: Consent changes are immediately reflected in data collection

### Regional Compliance

- **EEA/UK**: Consent defaults to "denied" and requires explicit user consent
- **Other Regions**: Consent defaults to "granted" unless a CMP indicates otherwise
- **CCPA**: Respects "Do Not Sell" preferences when detected

## Troubleshooting

### Common Issues

1. **Events not appearing in GA4**:
   - Check that `ga4_measurement_id` is correctly set
   - Verify GA4 tracking code is installed
   - Ensure consent is granted for analytics

2. **Google Ads conversions not tracking**:
   - Verify `google_ads_id` and `conversion_label` are correct
   - Check that consent is granted for marketing/advertising
   - Confirm the conversion action is active in Google Ads

3. **Consent not detected**:
   - Check browser console for consent-related errors
   - Verify your CMP is properly configured
   - Test manual consent event triggering

### Debug Console Messages

Monitor the browser console for ProofKit messages:

```
✓ ProofKit Web Pixel initialized with Consent Mode v2
✓ ProofKit: Purchase conversion tracked
⚠ ProofKit: GA4 event blocked due to consent: page_view
⚠ ProofKit: Error reading Shopify consent: [error details]
```

## Support

For technical support or questions:

1. Check the [ProofKit Documentation](https://docs.proofkit.com)
2. Contact support at support@proofkit.com
3. Join our [Discord Community](https://discord.gg/proofkit)

## Compliance Certifications

- ✅ GDPR Compliant
- ✅ CCPA Compliant
- ✅ Google Consent Mode v2 Certified
- ✅ Shopify App Store Privacy Standards
- ✅ IAB TCF v2.0 Compatible
