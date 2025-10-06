# Ads Autopilot AI Data Flow Architecture

## 🎯 Overview

This document provides a comprehensive overview of Ads Autopilot AI's data architecture, showing how information flows between Shopify stores, the Ads Autopilot AI application, backend services, and external integrations.

## 📊 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shopify       │    │   Ads Autopilot AI      │    │   Backend       │    │   Google        │
│   Store         │◄──►│   App (UI)      │◄──►│   API           │◄──►│   Services      │
│                 │    │                 │    │                 │    │                 │
│ • Admin Panel   │    │ • Remix UI      │    │ • Express.js    │    │ • Sheets API    │
│ • OAuth         │    │ • Polaris       │    │ • HMAC Auth     │    │ • Ads API       │
│ • Webhooks      │    │ • App Bridge    │    │ • Rate Limiting │    │ • Analytics     │
│ • App Proxy     │    │ • React         │    │ • Validation    │    │ • Pixel API     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔄 Detailed Data Flow

### 1. Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Store   │────►│ Shopify │────►│ Ads Autopilot AI│────►│ Backend │
│ Owner   │     │ OAuth   │     │ App     │     │ API     │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
1. Install      2. OAuth       3. Token        4. HMAC
   Request         Flow          Exchange        Validation
```

**Process**:

1. **Store Owner** initiates app installation from Shopify App Store
2. **Shopify OAuth** handles authentication and permission grants
3. **Ads Autopilot AI App** receives OAuth tokens and establishes session
4. **Backend API** validates all requests using HMAC signatures

### 2. Core Application Data Flow

```
┌─────────────────┐
│ Shopify Admin   │
│ (Merchant)      │
└─────────┬───────┘
          │ User Actions
          ▼
┌─────────────────┐
│ Ads Autopilot AI UI     │
│ (Embedded)      │
│ • Intent OS     │
│ • Audiences     │
│ • Campaigns     │
│ • Analytics     │
└─────────┬───────┘
          │ API Calls (HMAC)
          ▼
┌─────────────────┐
│ Backend API     │
│ • Data Validation
│ • Business Logic │
│ • Rate Limiting │
│ • Error Handling│
└─────────┬───────┘
          │ External Integrations
          ▼
┌─────────────────┐
│ Google Services │
│ • Sheets API    │
│ • Ads API       │
│ • Analytics     │
│ • Pixel Events  │
└─────────────────┘
```

### 3. Intent OS & Conversion Optimization Flow

```
Store Data → Product Analysis → Intent Detection → Content Generation → Overlay Application
    │              │                │                 │                    │
    ▼              ▼                ▼                 ▼                    ▼
Product       AI Analysis      UTM Params        Dynamic            Metafield
Catalog       & Patterns      & User Intent      Content            Updates

Customer      Audience         Campaign          A/B Testing        Performance
Behavior   → Segmentation  →  Configuration  →  & Canary       →  Tracking
```

## 🔒 Security Layer

### HMAC Validation Process

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Ads Autopilot AI UI │────►│ Signature   │────►│ Backend     │
│ Request     │     │ Generation  │     │ Validation  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
1. Prepare          2. Generate          3. Validate
   Request Data        HMAC-SHA256         & Process
```

**Implementation**:

- All API requests include HMAC signature
- Shared secret validates request authenticity
- Prevents tampering and replay attacks

### Data Encryption

```
Client ◄──── HTTPS ────► Ads Autopilot AI UI ◄──── HTTPS ────► Backend API
  │                         │                            │
  ▼                         ▼                            ▼
TLS 1.3                 App Bridge                  Server-side
Encryption             Secure Context               Validation
```

## 📁 Data Types & Storage

### 1. Configuration Data (Stored in Google Sheets)

**Intent Blocks**:

```json
{
  "intent_key": "high-intent-sale",
  "hero_headline": "Limited Time: 40% Off Everything",
  "benefit_bullets": ["Free Shipping", "30-Day Returns", "Expert Support"],
  "proof_snippet": "Join 10,000+ satisfied customers",
  "cta_text": "Shop Now & Save",
  "url_target": "/collections/sale"
}
```

**Audience Segments**:

```json
{
  "segment_id": "high-value-customers",
  "criteria": {
    "order_count": "> 3",
    "total_spent": "> 500",
    "last_order": "< 90 days"
  },
  "size": 1250,
  "targeting_config": {...}
}
```

### 2. Analytics Data (Google Analytics Integration)

**Conversion Events**:

```json
{
  "event_name": "intent_conversion",
  "parameters": {
    "intent_key": "high-intent-sale",
    "utm_source": "google",
    "utm_campaign": "summer_sale",
    "conversion_value": 89.99
  }
}
```

### 3. No PII Storage

**What We DON'T Store**:

- ❌ Customer names or contact information
- ❌ Payment or billing details
- ❌ Personal identifiers
- ❌ Sensitive customer data

**What We DO Store**:

- ✅ Anonymized behavior patterns
- ✅ Aggregated conversion metrics
- ✅ Campaign performance data
- ✅ A/B testing results

## 🌐 External Integrations

### Google Sheets API Integration

```
Ads Autopilot AI Backend ◄──── API Calls ────► Google Sheets
       │                                    │
       ▼                                    ▼
• Configuration        Read/Write        • Intent Blocks
• Audience Data   ◄─── Operations ────► • Campaign Data
• Analytics                              • Performance Metrics
```

**Purpose**: Merchant-controlled data storage and easy export capabilities

### Google Ads Script Integration

```
Ads Autopilot AI Backend → Script Generation → Google Ads Account
       │               │                      │
       ▼               ▼                      ▼
Campaign Config    JavaScript Code      Automated Bidding
Audience Data      Uploaded to Ads      Campaign Optimization
```

**Purpose**: Automated campaign optimization based on Intent OS insights

### Web Pixel Integration (Optional)

```
Shopify Store → Customer Events → Ads Autopilot AI Pixel → Analytics
     │              │                 │              │
     ▼              ▼                 ▼              ▼
Storefront     Purchase Events    Consent Mode    Performance
Pages          Add to Cart        Validation      Tracking
```

**Purpose**: Enhanced conversion tracking with privacy compliance

## 🚦 Rate Limiting & Performance

### API Rate Limits

- **Authentication**: 100 requests/minute per store
- **Data Operations**: 500 requests/minute per store
- **Analytics**: 1000 requests/minute per store
- **Bulk Operations**: 50 requests/minute per store

### Caching Strategy

```
Request → Cache Check → Fresh Data? → Return Cached
   │          │            │              │
   ▼          ▼            ▼              ▼
Direct     Cache Hit    Cache Miss    API Call
to API     (Fast)       (Refresh)     (Fallback)
```

## 📊 Monitoring & Observability

### Key Metrics Tracked

- **Response Time**: Average API response time < 500ms
- **Error Rate**: < 0.1% of all requests
- **Uptime**: 99.9% availability SLA
- **Data Accuracy**: 100% HMAC validation success

### Health Checks

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Load        │────►│ Health      │────►│ Alert       │
│ Balancer    │     │ Endpoint    │     │ System      │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 🔄 Data Lifecycle

### 1. Data Creation

- Merchant configures Intent OS settings
- Campaign data created in Google Sheets
- Performance baselines established

### 2. Data Processing

- Real-time event processing
- Audience segmentation updates
- Campaign optimization cycles

### 3. Data Retention

- Configuration data: Indefinite (merchant-controlled)
- Analytics data: 2 years maximum
- Log data: 90 days
- Error data: 30 days

### 4. Data Deletion

- Merchant-initiated deletion: Immediate
- App uninstall: 30-day grace period
- GDPR requests: 48-hour compliance

## 🛡️ Privacy & Compliance

### GDPR Compliance

- **Legal Basis**: Legitimate business interest
- **Data Minimization**: Only necessary data collected
- **Right to Deletion**: Immediate deletion capabilities
- **Data Portability**: Google Sheets export functionality

### Consent Management

```
Customer Visit → Consent Check → Tracking Allowed? → Event Collection
      │              │                │                    │
      ▼              ▼                ▼                    ▼
Pixel Load     Consent Mode      Yes/No/Partial      Anonymized Data
```

## 📞 Emergency Procedures

### Data Breach Response

1. **Detection** (< 5 minutes): Automated monitoring alerts
2. **Assessment** (< 15 minutes): Determine scope and impact
3. **Containment** (< 30 minutes): Isolate affected systems
4. **Notification** (< 24 hours): Notify affected merchants
5. **Recovery** (< 72 hours): Restore normal operations

### Service Outage Response

1. **Immediate**: Switch to cached/fallback data
2. **5 minutes**: Emergency maintenance page
3. **15 minutes**: Status page update
4. **30 minutes**: Merchant notification
5. **Recovery**: Full service restoration

---

**Document Version**: 1.0  
**Last Updated**: August 16, 2025  
**Next Review**: Annual security audit
