# Consent Mode v2 Implementation Guide

## Overview

Google's Consent Mode v2 is a privacy framework that allows websites to adjust how Google tags behave based on user consent choices. The ProofKit Web Pixel Extension fully implements Consent Mode v2 to ensure compliance with privacy regulations while maintaining measurement capabilities.

## What is Consent Mode v2?

Consent Mode v2 is an enhanced version of Google's consent framework that:

- ✅ Respects user privacy choices across all Google services
- ✅ Provides conversion modeling when consent is denied
- ✅ Enables privacy-preserving measurement
- ✅ Maintains compliance with GDPR, CCPA, and other regulations

## Consent Types in v2

### Core Consent Types

| Consent Type            | Purpose                                                      | Default | ProofKit Behavior                   |
| ----------------------- | ------------------------------------------------------------ | ------- | ----------------------------------- |
| `ad_storage`            | Controls whether data can be stored for advertising purposes | Denied  | Required for Google Ads conversions |
| `analytics_storage`     | Controls whether data can be stored for analytics purposes   | Denied  | Required for GA4 enhanced ecommerce |
| `ad_user_data`          | Controls sharing of user data with Google for advertising    | Denied  | Required for conversion tracking    |
| `ad_personalization`    | Controls whether data can be used for ad personalization     | Denied  | Enhances ad targeting               |
| `functionality_storage` | Controls storage needed for core site functionality          | Granted | Always granted by ProofKit          |
| `security_storage`      | Controls storage needed for security purposes                | Granted | Always granted by ProofKit          |

## Implementation in ProofKit

### 1. Default Consent State

ProofKit initializes with privacy-first defaults:

```javascript
// Automatically called when ProofKit Web Pixel loads
gtag("consent", "default", {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  functionality_storage: "granted",
  security_storage: "granted",
});
```

### 2. Regional Configuration

Special handling for EEA/UK and other privacy-focused regions:

```javascript
// EEA/UK specific defaults (stricter)
gtag("consent", "default", {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  region: [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
    "GB",
    "IS",
    "LI",
    "NO",
  ],
});
```

### 3. Consent Detection

ProofKit automatically detects consent from multiple sources:

#### Priority Order:

1. **Shopify Customer Privacy API** (highest priority)
2. **Google Consent Mode v2 State**
3. **Third-party CMP Providers**
4. **Regional Defaults**

```javascript
function getConsentStatus() {
  // 1. Check Shopify's native consent
  const shopifyConsent = window?.shopify?.customerPrivacy;
  if (shopifyConsent?.userDataSharingConsentGiven()) {
    return { analytics: true, marketing: true, source: "shopify" };
  }

  // 2. Check Google Consent Mode v2 state
  if (google_tag_data?.ics?.get("ad_storage") === "granted") {
    return { analytics: true, marketing: true, source: "gtag" };
  }

  // 3. Check CMP providers...
  // 4. Use regional defaults...
}
```

### 4. Dynamic Consent Updates

Real-time consent updates are handled automatically:

```javascript
// Listen for consent changes
window.addEventListener("consent_changed", (event) => {
  const newConsent = event.detail;

  // Update Google Consent Mode
  gtag("consent", "update", {
    ad_storage: newConsent.marketing ? "granted" : "denied",
    analytics_storage: newConsent.analytics ? "granted" : "denied",
    ad_user_data: newConsent.marketing ? "granted" : "denied",
    ad_personalization: newConsent.marketing ? "granted" : "denied",
  });
});
```

## CMP Integration Patterns

### OneTrust Integration

```javascript
// OneTrust specific detection
function checkOneTrustConsent() {
  if (window.OptanonActiveGroups) {
    const hasAnalytics = OptanonActiveGroups.includes("C0002"); // Analytics
    const hasMarketing = OptanonActiveGroups.includes("C0004"); // Marketing

    return {
      analytics: hasAnalytics,
      marketing: hasMarketing,
      source: "onetrust",
    };
  }
  return null;
}

// Listen for OneTrust consent changes
window.addEventListener("OneTrustGroupsUpdated", function () {
  const consent = checkOneTrustConsent();
  if (consent) {
    window.dispatchEvent(
      new CustomEvent("consent_changed", { detail: consent }),
    );
  }
});
```

### Cookiebot Integration

```javascript
// Cookiebot specific detection
function checkCookiebotConsent() {
  if (window.Cookiebot?.consent) {
    return {
      analytics: Cookiebot.consent.statistics,
      marketing: Cookiebot.consent.marketing,
      source: "cookiebot",
    };
  }
  return null;
}

// Listen for Cookiebot consent changes
window.addEventListener("CookiebotOnConsentReady", function () {
  const consent = checkCookiebotConsent();
  if (consent) {
    window.dispatchEvent(
      new CustomEvent("consent_changed", { detail: consent }),
    );
  }
});
```

### Custom CMP Integration

For CMPs not automatically supported:

```javascript
// Custom CMP integration example
function integrateCustomCMP() {
  // Your CMP's consent check logic
  const userConsent = yourCMP.getConsentPreferences();

  // Trigger ProofKit consent update
  window.dispatchEvent(
    new CustomEvent("consent_changed", {
      detail: {
        analytics: userConsent.analytics,
        marketing: userConsent.marketing,
        preferences: userConsent.preferences,
        source: "custom_cmp",
      },
    }),
  );
}

// Call when consent changes in your CMP
yourCMP.onConsentChange(integrateCustomCMP);
```

## Testing Consent Mode v2

### 1. Browser Developer Tools

Check consent state in browser console:

```javascript
// Check current consent state
console.log("Consent State:", {
  ad_storage: google_tag_data?.ics?.get("ad_storage"),
  analytics_storage: google_tag_data?.ics?.get("analytics_storage"),
  ad_user_data: google_tag_data?.ics?.get("ad_user_data"),
  ad_personalization: google_tag_data?.ics?.get("ad_personalization"),
});

// Check ProofKit detection
console.log("ProofKit Consent:", getConsentStatus());
```

### 2. Google Analytics Debug Mode

Enable GA4 debug mode to see consent-affected events:

```javascript
gtag("config", "G-XXXXXXXXXX", {
  debug_mode: true,
});
```

### 3. Google Tag Assistant

Use Google Tag Assistant to verify:

- Consent signals are being sent
- Events are properly blocked/allowed
- Conversion tracking works with consent

### 4. Test Scenarios

#### Scenario 1: No Consent

```javascript
// Simulate denied consent
gtag("consent", "update", {
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});

// Expected: Events blocked, conversions use modeling
```

#### Scenario 2: Analytics Only

```javascript
// Simulate analytics consent only
gtag("consent", "update", {
  ad_storage: "denied",
  analytics_storage: "granted",
  ad_user_data: "denied",
  ad_personalization: "denied",
});

// Expected: GA4 events sent, Ads conversions modeled
```

#### Scenario 3: Full Consent

```javascript
// Simulate full consent
gtag("consent", "update", {
  ad_storage: "granted",
  analytics_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
});

// Expected: All events and conversions tracked normally
```

## Privacy-Preserving Features

### 1. Data Redaction

When consent is denied, ProofKit automatically redacts sensitive data:

```javascript
// Consent denied payload example
{
  "timestamp": 1703123456789,
  "url": "[redacted]",
  "referrer": "[redacted]",
  "user_agent": "[redacted]",
  "event_type": "page_viewed",
  "consent_status": {
    "analytics": false,
    "marketing": false,
    "source": "shopify"
  }
}
```

### 2. Conversion Modeling

Google automatically provides conversion modeling when:

- `ad_storage` is denied but sufficient modeling data exists
- Site has enough conversion volume for statistical significance
- Helps maintain measurement while respecting privacy

### 3. Consent Metadata

All events include consent metadata for audit purposes:

```javascript
{
  "event": "purchase_completed",
  "payload": { /* event data */ },
  "consent_metadata": {
    "granted": true,
    "source": "cookiebot",
    "timestamp": 1703123456789,
    "consent_types": {
      "analytics": true,
      "marketing": true,
      "advertising": true
    }
  }
}
```

## Compliance Benefits

### GDPR Compliance

- ✅ Respects "reject all" choices
- ✅ Honors granular consent preferences
- ✅ Provides lawful basis for processing
- ✅ Enables data subject rights

### CCPA Compliance

- ✅ Respects "Do Not Sell" preferences
- ✅ Provides opt-out mechanisms
- ✅ Maintains transparency in data use

### Other Privacy Laws

- ✅ Works with regional privacy frameworks
- ✅ Adapts to local consent requirements
- ✅ Provides privacy-by-design implementation

## Migration from Consent Mode v1

If you're currently using Consent Mode v1:

### Key Differences

1. **New Consent Types**: `ad_user_data` and `ad_personalization` added
2. **Enhanced Modeling**: Better conversion estimation without consent
3. **Stricter Defaults**: More privacy-focused initial state

### Migration Steps

1. Update to ProofKit Web Pixel (automatic v2 support)
2. Review CMP consent mappings
3. Test with new consent types
4. Update privacy policies if needed

## Best Practices

### 1. Clear Consent Requests

- Use clear, specific language for consent requests
- Explain the benefits of granting consent
- Provide granular controls when possible

### 2. Performance Optimization

- Initialize consent state as early as possible
- Avoid blocking page rendering on consent decisions
- Use ProofKit's automatic detection features

### 3. Regular Testing

- Test consent scenarios monthly
- Verify CMP integration after updates
- Monitor conversion tracking performance

### 4. Documentation

- Document your consent flow
- Train team on privacy requirements
- Keep records of consent implementations

## Support and Resources

- **Google Consent Mode v2 Documentation**: [developers.google.com/tag-platform/security/consent-mode](https://developers.google.com/tag-platform/security/consent-mode)
- **ProofKit Support**: support@proofkit.com
- **Privacy Compliance**: legal@proofkit.com
- **Technical Documentation**: [docs.proofkit.com](https://docs.proofkit.com)

## FAQ

**Q: Do I need to modify my existing CMP?**
A: No, ProofKit automatically detects most popular CMPs. Manual integration is only needed for custom implementations.

**Q: Will I lose conversion data with Consent Mode v2?**
A: Google provides conversion modeling when consent is denied, helping maintain measurement capabilities while respecting privacy.

**Q: How do I know if consent is working correctly?**
A: Enable debug mode and monitor browser console for ProofKit consent messages. Also use Google Tag Assistant for verification.

**Q: What happens in regions without privacy laws?**
A: ProofKit uses reasonable defaults but still respects any consent preferences users provide through your CMP.

**Q: Is this compatible with server-side tracking?**
A: Yes, ProofKit sends consent metadata with all events, allowing server-side systems to respect consent preferences.
