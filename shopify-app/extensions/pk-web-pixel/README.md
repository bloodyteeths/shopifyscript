# Ads Autopilot AI Shopify Web Pixel Extension

A privacy-compliant Shopify Web Pixel extension that provides advanced analytics and conversion tracking with Google Consent Mode v2 support.

## 🚀 Features

- **Consent Mode v2 Compliant**: Full implementation of Google's latest privacy framework
- **GA4 Enhanced Ecommerce**: Automatic event tracking for all key customer journey events
- **Google Ads Conversions**: Tracks `checkout_completed` events for advertising optimization
- **Multi-CMP Support**: Works with OneTrust, Cookiebot, TrustArc, Didomi, and more
- **Privacy-First**: Automatically redacts data when consent is not granted
- **Real-time Updates**: Responds to consent changes immediately
- **GDPR/CCPA Compliant**: Built with privacy regulations in mind

## 📋 Requirements

- Shopify store with Web Pixel extensions enabled
- Ads Autopilot AI backend API access
- Optional: Google Analytics 4 property
- Optional: Google Ads account with conversion tracking
- Recommended: Consent Management Platform (CMP)

## 🛠 Installation

1. **Install Ads Autopilot AI App**: Install the Ads Autopilot AI app from the Shopify App Store
2. **Enable Extension**: Navigate to Apps > Ads Autopilot AI > Extensions and enable the Web Pixel
3. **Configure Settings**: Set up your metafields as described in the setup guide
4. **Test Implementation**: Verify tracking works with your consent setup

## 📖 Documentation

- **[Merchant Setup Guide](./MERCHANT_SETUP_GUIDE.md)**: Complete setup instructions for merchants
- **[Consent Mode v2 Guide](./CONSENT_MODE_V2_GUIDE.md)**: Detailed implementation guide for privacy compliance
- **[Shopify Web Pixel API](https://shopify.dev/docs/api/web-pixels-api)**: Official Shopify documentation

## 🔧 Configuration

### Required Metafields

Configure these metafields in your Shopify Admin under the `adsautopilot` namespace:

```
adsautopilot.backend_url = "https://api.adsautopilot.com/api"
adsautopilot.tenant_id = "TENANT_123"
adsautopilot.secret_key = "your_secret_key"
```

### Optional Metafields (for GA4/Google Ads)

```
adsautopilot.ga4_measurement_id = "G-XXXXXXXXXX"
adsautopilot.google_ads_id = "AW-XXXXXXXXX"
adsautopilot.conversion_label = "abc123def456"
adsautopilot.debug_mode = "true"
```

## 📊 Events Tracked

| Shopify Event        | GA4 Event        | Google Ads        | Description             |
| -------------------- | ---------------- | ----------------- | ----------------------- |
| `page_viewed`        | `page_view`      | -                 | User views a page       |
| `product_viewed`     | `view_item`      | -                 | User views a product    |
| `search_submitted`   | `search`         | -                 | User performs a search  |
| `cart_viewed`        | `view_cart`      | -                 | User views cart         |
| `checkout_started`   | `begin_checkout` | -                 | User starts checkout    |
| `checkout_completed` | `purchase`       | ✅ **Conversion** | User completes purchase |

## 🔒 Privacy & Compliance

### Consent Types Supported

- `ad_storage`: Google Ads data storage
- `analytics_storage`: Analytics data storage
- `ad_user_data`: User data sharing for ads
- `ad_personalization`: Ad personalization
- `functionality_storage`: Core functionality (always granted)
- `security_storage`: Security purposes (always granted)

### CMP Compatibility

✅ **OneTrust** - Automatic detection  
✅ **Cookiebot** - Automatic detection  
✅ **TrustArc** - Automatic detection  
✅ **Didomi** - Automatic detection  
✅ **Cookie Consent v3** - Automatic detection  
✅ **GDPR Cookie Consent** - Automatic detection  
✅ **Custom CMPs** - Manual integration supported

### Data Protection

- **Consent Denied**: Personal data redacted (`[redacted]`)
- **Consent Granted**: Full event data collected
- **Regional Defaults**: EEA/UK default to "denied"
- **Audit Trail**: Full consent metadata included

## 🧪 Testing

### Debug Mode

Enable debug mode to see detailed console output:

```javascript
// Set adsautopilot.debug_mode = "true" in metafields
// Check browser console for messages like:
console.log("Ads Autopilot AI Web Pixel initialized with Consent Mode v2");
console.log("Ads Autopilot AI: Purchase conversion tracked", conversionData);
console.log("Ads Autopilot AI: GA4 event blocked due to consent: page_view");
```

### Consent Testing

Test different consent scenarios:

1. **No Consent**: Events should be blocked or anonymized
2. **Analytics Only**: GA4 events sent, Google Ads modeled
3. **Full Consent**: All events and conversions tracked

### Validation Tools

- **Google Tag Assistant**: Verify tag firing and consent signals
- **GA4 Debug View**: Real-time event validation
- **Google Ads Conversions**: Check conversion attribution

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Shopify       │    │   Ads Autopilot AI       │    │   Google        │
│   Web Pixel     │───▶│   Backend API    │    │   Analytics     │
│                 │    │                  │    │   & Ads         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        ▲                       ▲
         │                        │                       │
         ▼                        │                       │
┌─────────────────┐               │              ┌─────────────────┐
│   Consent       │───────────────┘              │   gtag/GA4      │
│   Management    │                              │   Events        │
│   Platform      │◄─────────────────────────────│                 │
└─────────────────┘                              └─────────────────┘
```

## 🔄 Event Flow

1. **User Action**: Customer performs action on store (page view, purchase, etc.)
2. **Consent Check**: Ads Autopilot AI checks current consent status from multiple sources
3. **Event Processing**: Event data is processed based on consent status
4. **Multi-Destination**: Events sent to Ads Autopilot AI backend and optionally GA4/Google Ads
5. **Privacy Compliance**: Personal data redacted if consent not granted

## 📝 Development

### File Structure

```
pk-web-pixel/
├── shopify.web.toml           # Extension configuration
├── src/
│   └── index.js              # Main pixel implementation
├── README.md                 # This file
├── MERCHANT_SETUP_GUIDE.md   # Setup instructions
└── CONSENT_MODE_V2_GUIDE.md  # Privacy implementation guide
```

### Key Functions

- `initializeConsentMode()`: Sets up Consent Mode v2 defaults
- `getConsentStatus()`: Multi-source consent detection
- `fireGA4Event()`: GA4 and Google Ads event firing
- `createPrivacySafePayload()`: Data redaction for privacy
- `registerAnalytics()`: Main entry point and event subscriptions

### Extending the Pixel

To add custom functionality:

```javascript
// In src/index.js, add custom event handling
analytics.subscribe("custom_event", (e) => {
  const consent = getConsentStatus();
  if (!canSend()) return;

  // Your custom logic here
  postPixel("custom_event", customData);
  fireGA4Event("custom_event_name", customParameters, consent);
});
```

## 🆘 Support

- **Documentation**: [docs.adsautopilot.com](https://docs.adsautopilot.com)
- **Email Support**: support@adsautopilot.com
- **Privacy Questions**: legal@adsautopilot.com
- **Discord Community**: [discord.gg/adsautopilot](https://discord.gg/adsautopilot)

## 📜 License

This extension is proprietary software owned by Ads Autopilot AI. Usage is governed by the Ads Autopilot AI Terms of Service and Shopify App Store policies.

## 🔄 Changelog

### v2.0.0 (Current)

- ✅ Added Consent Mode v2 support
- ✅ Enhanced GA4 integration
- ✅ Google Ads conversion tracking
- ✅ Multi-CMP support
- ✅ Privacy-compliant data collection
- ✅ Real-time consent updates

### v1.0.0

- ✅ Basic event tracking
- ✅ Ads Autopilot AI backend integration
- ✅ Simple consent checking

---

**Built with ❤️ by Ads Autopilot AI for privacy-conscious merchants**
