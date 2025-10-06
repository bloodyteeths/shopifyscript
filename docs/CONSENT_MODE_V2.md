# Consent Mode v2 — Ads Autopilot AI Implementation

## Overview

Ads Autopilot AI's Shopify Web Pixel Extension now includes comprehensive Consent Mode v2 support, automatically handling privacy compliance for Google Analytics 4 and Google Ads conversion tracking.

## ✅ Implementation Status

- **Shopify Web Pixel**: ✅ **FULLY IMPLEMENTED** with Consent Mode v2
- **Multi-CMP Support**: ✅ OneTrust, Cookiebot, TrustArc, Didomi, and more
- **GA4 Integration**: ✅ Enhanced ecommerce tracking with consent respect
- **Google Ads Conversions**: ✅ checkout_completed events with privacy compliance
- **Real-time Updates**: ✅ Dynamic consent change handling

## Quick Implementation Guide

### For Merchants

1. **Enable the Ads Autopilot AI Web Pixel Extension** in your Shopify store
2. **Configure your metafields** (see setup guide below)
3. **Install your CMP** (OneTrust, Cookiebot, etc.) - Ads Autopilot AI auto-detects most popular ones
4. **Test consent scenarios** to ensure compliance

### Key Features

- **Privacy-First Defaults**: All ad/analytics consent starts as "denied"
- **Automatic CMP Detection**: Works with popular consent management platforms
- **Data Redaction**: Personal data automatically redacted when consent denied
- **Conversion Modeling**: Google provides estimated conversions for privacy-compliant measurement
- **Regional Compliance**: Special handling for EEA/UK and other privacy-focused regions

## Technical Details

### Consent Types Handled

| Consent Type            | Purpose            | Default | When Required          |
| ----------------------- | ------------------ | ------- | ---------------------- |
| `ad_storage`            | Ads data storage   | Denied  | Google Ads conversions |
| `analytics_storage`     | Analytics data     | Denied  | GA4 enhanced ecommerce |
| `ad_user_data`          | User data sharing  | Denied  | Conversion attribution |
| `ad_personalization`    | Ad personalization | Denied  | Enhanced targeting     |
| `functionality_storage` | Core functionality | Granted | Always allowed         |
| `security_storage`      | Security purposes  | Granted | Always allowed         |

### Integration Points

1. **Shopify Customer Privacy API**: Primary consent source
2. **Google Consent Mode v2**: Direct gtag integration
3. **CMP Providers**: OneTrust, Cookiebot, TrustArc, Didomi, etc.
4. **Custom CMPs**: Manual integration support via events

### Event Flow

```
User Action → Consent Check → Event Processing → Multi-Destination Firing
     ↓              ↓              ↓                    ↓
Page View → Check CMP Status → Redact if Denied → GA4 + Ads (if consented)
Purchase  → Verify Marketing → Include Full Data → Conversion Tracking
```

## Setup Documentation

📖 **Complete guides available at:**

- `/shopify-app/extensions/pk-web-pixel/MERCHANT_SETUP_GUIDE.md`
- `/shopify-app/extensions/pk-web-pixel/CONSENT_MODE_V2_GUIDE.md`

## Testing & Validation

### Required Tests

- **EEA/UK Users**: Consent denied by default, explicit opt-in required
- **Consent Granted**: Full tracking active for GA4 and Google Ads
- **Consent Denied**: Events blocked or anonymized, conversion modeling active
- **Consent Changes**: Real-time updates reflected immediately

### Debug Mode

Enable debug logging by setting `adsautopilot.debug_mode = "true"` in your metafields:

```javascript
// Console output examples:
✓ Ads Autopilot AI Web Pixel initialized with Consent Mode v2
✓ Ads Autopilot AI: Purchase conversion tracked
⚠ Ads Autopilot AI: GA4 event blocked due to consent: page_view
```

## Compliance Benefits

- ✅ **GDPR Compliant**: Respects all user choices and provides lawful basis
- ✅ **CCPA Compliant**: Honors "Do Not Sell" preferences
- ✅ **Privacy by Design**: Built with privacy-first principles
- ✅ **Audit Ready**: Full consent metadata and decision trails

## Migration Path

### From Basic Implementation

1. Update to latest Ads Autopilot AI Web Pixel Extension
2. Configure metafields for GA4/Google Ads (optional)
3. Test consent scenarios
4. Update privacy policy if needed

### From Manual gtag Implementation

1. Remove manual gtag consent code
2. Enable Ads Autopilot AI Web Pixel Extension
3. Ads Autopilot AI handles all consent automatically
4. Verify tracking continues working

## Advanced Features

### Custom CMP Integration

For unsupported CMPs, trigger manual consent updates:

```javascript
// Trigger consent change when user updates preferences
window.dispatchEvent(
  new CustomEvent("consent_changed", {
    detail: {
      analytics: true, // User consented to analytics
      marketing: true, // User consented to marketing
      source: "custom",
    },
  }),
);
```

### Server-Side Consent

Ads Autopilot AI includes consent metadata with all events for server-side respect:

```json
{
  "event": "purchase_completed",
  "consent_metadata": {
    "granted": true,
    "source": "cookiebot",
    "timestamp": 1703123456789
  }
}
```

## Support

- **Technical Issues**: Check the detailed implementation guides
- **Privacy Questions**: Consult the Consent Mode v2 guide
- **General Support**: support@adsautopilot.com
