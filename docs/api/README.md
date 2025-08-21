# ProofKit SaaS API Documentation

Comprehensive API reference for the ProofKit SaaS platform - Google Ads automation and e-commerce optimization.

## Overview

ProofKit SaaS is a comprehensive advertising automation platform that provides:

- **Google Ads Campaign Management**: Automated bidding, budget management, negative keyword mining
- **E-commerce Integration**: Shopify and WordPress plugins for product optimization
- **AI-Powered Content Generation**: RSA headlines, descriptions, and content optimization
- **Privacy & Compliance**: GDPR-compliant data handling with automated retention policies
- **Real-time Analytics**: Performance monitoring and insights dashboard

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Google Ads    │    │ Google Sheets   │
│   (Shopify/WP)  │◄──►│     Script      │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────►│  Backend API    │◄─────────────┘
                        │   (Node.js)     │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   AI Services   │
                        │  (Gemini API)   │
                        └─────────────────┘
```

## Base URL

- **Production**: `https://api.proofkit.net`
- **Development**: `http://localhost:3001`

## Authentication

ProofKit uses HMAC-SHA256 authentication for all API endpoints.

### HMAC Authentication

All API requests must include:

- `tenant`: Unique tenant identifier
- `sig`: HMAC signature

**Signature Generation:**

```javascript
const payload = `${method}:${tenant}:${endpoint}:${nonce}`;
const signature = crypto
  .createHmac("sha256", HMAC_SECRET)
  .update(payload)
  .digest("base64")
  .replace(/=+$/, ""); // Remove padding
```

**Example Request:**

```bash
curl -X GET "https://api.proofkit.net/api/config?tenant=TENANT_123&sig=ABC123" \
  -H "Content-Type: application/json"
```

## Endpoints Overview

### Core Configuration

- [`GET /api/config`](#get-apiconfig) - Retrieve tenant configuration
- [`POST /api/upsertConfig`](#post-apiupsertconfig) - Update tenant settings

### Metrics & Analytics

- [`POST /api/metrics`](#post-apimetrics) - Submit performance data
- [`GET /api/insights`](#get-apiinsights) - Get performance insights
- [`GET /api/insights/terms`](#get-apiinsightsterms) - Search terms analysis
- [`GET /api/summary`](#get-apisummary) - KPI summary

### Campaign Management

- [`POST /api/jobs/autopilot_tick`](#post-apijobsautopilot_tick) - Execute automation
- [`POST /api/cpc-ceilings/batch`](#post-apicpc-ceilingsbatch) - Bulk CPC updates
- [`POST /api/insights/actions/apply`](#post-apiinsightsactionsapply) - Apply recommendations

### Content & AI

- [`GET /api/ai/drafts`](#get-apiaidrafts) - List AI-generated content
- [`POST /api/ai/accept`](#post-apiaiaccept) - Accept AI drafts
- [`POST /api/jobs/ai_writer`](#post-apijobsai_writer) - Generate content

### E-commerce Integration

- [`POST /api/shopify/seo/preview`](#post-apishopifyseospreview) - SEO optimization preview
- [`POST /api/shopify/seo/apply`](#post-apishopifyseoapply) - Apply SEO changes
- [`POST /api/shopify/tags/batch`](#post-apishopifytagsbatch) - Bulk tag operations

### Privacy & Compliance

- [`POST /api/privacy/consent`](#post-apiprivacyconsent) - Record user consent
- [`POST /api/privacy/delete`](#post-apiprivacydelete) - Data deletion request
- [`GET /api/privacy/export`](#get-apiprivacyexport) - Data export request

### Health & Monitoring

- [`GET /health`](#get-health) - Service health check
- [`GET /ready`](#get-ready) - Readiness probe
- [`GET /metrics`](#get-metrics) - Prometheus metrics

---

## Detailed Endpoint Documentation

### GET /api/config

Retrieve tenant configuration including automation settings, feature flags, and campaign parameters.

**Authentication:** HMAC Required

**Parameters:**

- `tenant` (string, required): Tenant identifier
- `sig` (string, required): HMAC signature

**Response:**

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "label": "PROOFKIT_AUTOMATED",
    "plan": "pro",
    "PROMOTE": false,
    "daily_budget_cap_default": 3.0,
    "cpc_ceiling_default": 0.2,
    "AP": {
      "objective": "protect",
      "mode": "auto",
      "schedule": "weekdays_9_18",
      "target_cpa": 10.0
    },
    "FEATURE_AI_DRAFTS": true,
    "FEATURE_AUDIENCE_EXPORT": true
  }
}
```

### POST /api/metrics

Submit performance metrics, search terms, and run logs from Google Ads scripts.

**Authentication:** HMAC Required

**Body:**

```json
{
  "nonce": 1643723400000,
  "metrics": [
    [
      "2024-01-15",
      "campaign",
      "Test Campaign",
      "Ad Group 1",
      "123",
      "Keyword",
      45,
      12.5,
      2,
      1200,
      0.0375
    ]
  ],
  "search_terms": [
    ["2024-01-15", "Test Campaign", "Ad Group 1", "running shoes", 12, 8.4, 1]
  ],
  "run_logs": [["2024-01-15T10:30:00Z", "automation_completed"]]
}
```

**Headers:**

- `date`, `level`, `campaign`, `ad_group`, `id`, `name`, `clicks`, `cost`, `conversions`, `impr`, `ctr`
- `date`, `campaign`, `ad_group`, `search_term`, `clicks`, `cost`, `conversions`
- `timestamp`, `message`

### GET /api/insights

Get performance insights and recommendations for a specified time window.

**Authentication:** HMAC Required

**Parameters:**

- `w` (string, optional): Time window - `24h`, `7d`, `30d`, `all` (default: `7d`)

**Response:**

```json
{
  "ok": true,
  "w": "7d",
  "kpi": {
    "clicks": 450,
    "cost": 125.8,
    "conversions": 18,
    "ctr": 0.0325,
    "cpc": 0.28,
    "cpa": 6.99
  },
  "top_terms": [
    {
      "term": "running shoes",
      "clicks": 45,
      "cost": 15.2,
      "conversions": 3
    }
  ],
  "explain": [
    {
      "label": "expensive keyword",
      "action": "add_exact_negative",
      "reason": "Cost $8.50 • 0 conversions"
    }
  ]
}
```

### POST /api/jobs/autopilot_tick

Execute automated campaign optimization based on performance data and configuration.

**Authentication:** HMAC Required

**Query Parameters:**

- `dry` (boolean): Preview mode - don't apply changes
- `force` (boolean): Skip schedule and timing gates

**Body:**

```json
{
  "nonce": 1643723400000
}
```

**Response:**

```json
{
  "ok": true,
  "planned": [
    {
      "type": "add_negative",
      "term": "cheap shoes",
      "match": "phrase",
      "scope": "account"
    }
  ],
  "applied": [
    {
      "type": "lower_cpc_ceiling",
      "campaign": "*",
      "amount": 0.18
    }
  ],
  "kpi": {
    "clicks": 120,
    "cost": 45.6,
    "conv": 3,
    "cpa": 15.2
  }
}
```

### GET /api/ai/drafts

Retrieve AI-generated content drafts including RSA headlines, descriptions, and ad extensions.

**Authentication:** HMAC Required

**Response:**

```json
{
  "ok": true,
  "rsa_default": [
    {
      "theme": "default",
      "headlines": [
        "Premium Running Shoes",
        "Fast Free Shipping",
        "30-Day Returns"
      ],
      "descriptions": [
        "Discover top-rated running shoes with advanced cushioning technology.",
        "Shop now and get free shipping on orders over $50."
      ],
      "lint": {
        "ok": true,
        "errors": []
      }
    }
  ],
  "library": [
    {
      "theme": "winter_sale",
      "headlines": ["Winter Sale - 40% Off", "Limited Time Offer"],
      "descriptions": ["Save big on winter footwear collection."],
      "source": "ai_generated",
      "lint": { "ok": true, "errors": [] }
    }
  ]
}
```

### POST /api/privacy/consent

Record user consent for data processing in compliance with GDPR requirements.

**Authentication:** HMAC Required

**Body:**

```json
{
  "nonce": 1643723400000,
  "userId": "user_123",
  "consentData": {
    "analytics": true,
    "marketing": true,
    "functional": true,
    "consent_version": "1.0",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Response:**

```json
{
  "ok": true,
  "consentId": "consent_abc123"
}
```

### POST /api/privacy/delete

Process data deletion request (Right to be Forgotten) for specified user.

**Authentication:** HMAC Required

**Body:**

```json
{
  "nonce": 1643723400000,
  "userId": "user_123",
  "requestData": {
    "email": "user@example.com",
    "reason": "user_request",
    "verification_method": "email_confirmation"
  }
}
```

**Response:**

```json
{
  "ok": true,
  "deletionId": "del_xyz789",
  "recordsDeleted": 42
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "error": "Human readable error message"
}
```

**Common Error Codes:**

- `AUTH`: Authentication failed
- `THROTTLED`: Rate limit exceeded
- `PAYLOAD_TOO_LARGE`: Request body exceeds limits
- `VALIDATION`: Invalid request parameters
- `SHEETS`: Google Sheets connection error
- `AI_ERROR`: AI service unavailable

## Rate Limiting

- **Default**: 60 requests per minute per IP/tenant combination
- **Burst**: Up to 100 requests in short periods
- **Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Data Formats

### Date/Time

All timestamps use ISO 8601 format: `2024-01-15T10:30:00Z`

### Currency

All monetary values in USD as decimal numbers: `12.50`

### Metrics Arrays

Performance data submitted as arrays aligned to predefined headers for efficiency.

## Webhooks

ProofKit supports webhooks for real-time notifications:

**Supported Events:**

- `automation.completed`
- `budget.exceeded`
- `conversion.spike`
- `negative.keyword.added`

**Webhook Payload:**

```json
{
  "event": "automation.completed",
  "tenant": "TENANT_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "campaign_count": 5,
    "changes_applied": 12
  }
}
```

## SDK Examples

### Node.js

```javascript
const ProofKitAPI = require("@proofkit/api-client");

const client = new ProofKitAPI({
  baseURL: "https://api.proofkit.net",
  tenant: "TENANT_123",
  hmacSecret: "your-secret-key",
});

// Get insights
const insights = await client.insights.get({ window: "7d" });

// Submit metrics
await client.metrics.submit({
  metrics: metricsData,
  searchTerms: searchTermsData,
});
```

### Python

```python
from proofkit import ProofKitClient

client = ProofKitClient(
    base_url='https://api.proofkit.net',
    tenant='TENANT_123',
    hmac_secret='your-secret-key'
)

# Get configuration
config = client.config.get()

# Execute automation
result = client.autopilot.tick(dry_run=True)
```

## Testing

ProofKit provides a sandbox environment for testing integrations:

**Sandbox URL**: `https://sandbox-api.proofkit.net`

**Test Credentials:**

- Tenant: `SANDBOX_TEST`
- HMAC Secret: `sandbox_secret_key_for_testing_only`

## Support

- **Documentation**: https://docs.proofkit.net
- **Status Page**: https://status.proofkit.net
- **Support Email**: support@proofkit.net
- **Emergency**: +1-555-PROOFKIT

---

_Last Updated: 2024-08-16_
_API Version: v0.3.0_
