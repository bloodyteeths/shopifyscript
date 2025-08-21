# ProofKit GTM/Observability System

## Overview

The ProofKit GTM/Observability system provides comprehensive monitoring, alerting, and analytics for Google Ads campaigns. This unified system delivers:

- **AI-powered weekly summaries** with plain-English insights
- **Real-time anomaly detection** for spend/CPA spikes
- **Multi-channel alerting** via Slack, email, and webhooks
- **Looker Studio templates** for merchant dashboards
- **Automated job scheduling** for continuous monitoring

## 🚀 Quick Start

### 1. Configure Alert Channels

```bash
# Create Slack channel
curl -X POST "http://localhost:3007/api/alerts/channels/TENANT_123" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "slack",
    "name": "ProofKit Alerts",
    "config": {
      "webhookUrl": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
      "enabled": true
    }
  }'

# Create email channel
curl -X POST "http://localhost:3007/api/alerts/channels/TENANT_123" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "name": "Admin Notifications",
    "config": {
      "recipients": ["admin@yourstore.com"],
      "emailWebhookUrl": "https://api.sendgrid.com/v3/mail/send",
      "apiKey": "YOUR_SENDGRID_API_KEY",
      "enabled": true
    }
  }'
```

### 2. Set Anomaly Detection Thresholds

```bash
curl -X PUT "http://localhost:3007/api/alerts/anomaly-settings/TENANT_123" \
  -H "Content-Type: application/json" \
  -d '{
    "thresholds": {
      "cpa_spike_percent": 50,
      "cost_spike_percent": 75,
      "conversion_drop_percent": 30,
      "cost_daily_threshold": 1000,
      "zero_conversions_hours": 24
    }
  }'
```

### 3. Generate Manual Reports

```bash
# Generate weekly summary
curl -X POST "http://localhost:3007/api/alerts/weekly-summary/TENANT_123/generate" \
  -H "Content-Type: application/json" \
  -d '{"generateAI": true}'

# Run anomaly detection
curl -X POST "http://localhost:3007/api/alerts/anomaly-detection/TENANT_123/run" \
  -H "Content-Type: application/json" \
  -d '{"timeWindow": "24h"}'
```

## 📊 Core Components

### Weekly Summary Service

**File:** `backend/jobs/weekly_summary.js`

Enhanced with AI insights and comprehensive analytics:

```javascript
import { runWeeklySummary } from "./jobs/weekly_summary.js";

const result = await runWeeklySummary("TENANT_123", {
  generateAI: true, // Include AI-powered insights
});

console.log(result.summary.structured);
```

**Features:**

- Week-over-week performance comparisons
- Top performing campaigns and search terms
- AI-generated insights and recommendations
- Plain-English explanations of trends
- Automated anomaly detection integration

### Anomaly Detection Service

**File:** `backend/services/anomaly-detection.js`

Intelligent monitoring with multiple detection algorithms:

```javascript
import { anomalyDetectionService } from "./services/anomaly-detection.js";

// Set custom thresholds
anomalyDetectionService.setThresholds("TENANT_123", {
  cpa_spike_percent: 75,
  cost_spike_percent: 100,
});

// Run detection
const results = await anomalyDetectionService.detectAnomalies(
  "TENANT_123",
  "24h",
);
```

**Detection Types:**

- **Statistical:** Z-score analysis vs historical performance
- **Threshold:** Absolute limits for cost, CPA, conversion rates
- **Pattern:** Unusual spending distributions and campaign divergence
- **Time-based:** Hour-of-day and day-of-week anomalies

### Alerts Service

**File:** `backend/services/alerts.js`

Multi-channel alert delivery with intelligent throttling:

```javascript
import { alertsService } from "./services/alerts.js";

// Register Slack channel
alertsService.registerChannel("TENANT_123", "slack_main", {
  type: "slack",
  name: "Main Alerts",
  webhookUrl: "https://hooks.slack.com/...",
  minSeverity: "medium",
  businessHoursOnly: false,
});

// Send alert
await alertsService.sendAlert("TENANT_123", {
  type: "cost_spike",
  severity: "high",
  message: "Daily cost exceeded threshold",
  currentCost: 1500,
  threshold: 1000,
});
```

**Channel Types:**

- **Slack:** Rich formatted alerts with action buttons
- **Email:** HTML templates with metrics and trends
- **Webhook:** JSON payloads for custom integrations

### Job Scheduler

**File:** `backend/jobs/scheduler.js`

Automated execution of monitoring tasks:

```javascript
import { jobScheduler } from "./jobs/scheduler.js";

// Start scheduler
jobScheduler.addTenant("TENANT_123");
jobScheduler.start();

// Manual job execution
await jobScheduler.triggerJob("weekly_summary", "TENANT_123");
```

**Scheduled Jobs:**

- **Anomaly Detection:** Every 15 minutes
- **Weekly Summary:** Mondays at 9 AM
- **Health Checks:** Every 5 minutes

## 🎨 Looker Studio Integration

### Template Configuration

**File:** `looker-studio/proofkit-template.json`

Comprehensive dashboard template with:

- **Executive Summary:** High-level KPIs and trends
- **Campaign Performance:** Detailed campaign analysis
- **Search Terms:** Keyword performance insights
- **Alerts & Anomalies:** Real-time monitoring dashboard
- **Time Analysis:** Performance patterns by hour/day

### Setup Instructions

1. **Connect Data Source:**

   ```
   - Add Google Sheets connector
   - URL: Your ProofKit Google Sheets document
   - Sheets: METRICS_{TENANT}, SEARCH_TERMS_{TENANT}, etc.
   ```

2. **Configure Parameters:**

   ```json
   {
     "tenant_id": "TENANT_123",
     "avg_order_value": 75,
     "target_cpa": 25
   }
   ```

3. **Import Template:**
   - Copy template JSON configuration
   - Create new Looker Studio report
   - Apply template settings and styling

## 🔧 API Endpoints

### Alert Channel Management

```bash
# List channels
GET /api/alerts/channels/:tenant

# Create channel
POST /api/alerts/channels/:tenant
{
  "type": "slack|email|webhook",
  "name": "Channel Name",
  "config": { ... }
}

# Update channel
PUT /api/alerts/channels/:tenant/:channelId
{ "enabled": false }

# Test channel
POST /api/alerts/channels/:tenant/:channelId/test
```

### Anomaly Detection

```bash
# Get settings
GET /api/alerts/anomaly-settings/:tenant

# Update thresholds
PUT /api/alerts/anomaly-settings/:tenant
{
  "thresholds": {
    "cpa_spike_percent": 50,
    "cost_spike_percent": 75
  }
}

# Manual detection run
POST /api/alerts/anomaly-detection/:tenant/run
{ "timeWindow": "24h" }

# Suppress alerts
POST /api/alerts/suppress/:tenant
{
  "alertType": "cost_spike",
  "severity": "medium",
  "durationMs": 3600000
}
```

### Weekly Summaries

```bash
# Generate summary
POST /api/alerts/weekly-summary/:tenant/generate
{ "generateAI": true }

# View history
GET /api/alerts/history/:tenant?limit=50&severity=high
```

## 🧪 Testing

### Comprehensive Test Suite

**File:** `backend/test-gtm-observability.js`

```bash
# Run full test suite
node backend/test-gtm-observability.js

# Quick tests only
node backend/test-gtm-observability.js --quick

# Keep test data for inspection
node backend/test-gtm-observability.js --keep-data

# Verbose output
node backend/test-gtm-observability.js --verbose
```

**Test Coverage:**

- Weekly summary generation with AI
- Anomaly detection algorithms
- Alert channel management
- Multi-channel alert delivery
- Job scheduler functionality
- Looker template validation
- End-to-end workflow testing

### Sample Test Output

```
🚀 ProofKit GTM/Observability System Test Suite
================================================

📊 Setting up test data...
✅ Test data created: 31 metrics rows, 62 search terms rows

🧪 Testing: Weekly Summary Generation
✓ Weekly summary generation should succeed
✓ Weekly summary should contain summary data
✓ Weekly summary should contain metrics
✅ Weekly Summary Generation - PASSED

🧪 Testing: Anomaly Detection
✓ Anomaly detection should return results object
✓ Should detect the injected anomaly
✅ Anomaly Detection - PASSED

📊 Test Results Summary
=======================
✅ Passed: 24
❌ Failed: 0
⊗ Skipped: 0

🎉 All tests passed!
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
GOOGLE_SERVICE_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
SHEET_ID=your_google_sheet_id
HMAC_SECRET=your_secure_secret

# Optional AI features
AI_PROVIDER=google
GOOGLE_API_KEY=your_gemini_api_key

# Alert integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SENDGRID_API_KEY=SG.your_sendgrid_key
```

### Google Sheets Setup

The system requires the following sheet tabs per tenant:

1. **METRICS\_{TENANT}:** Campaign performance data
   - Columns: date, level, campaign, ad_group, id, name, clicks, cost, conversions, impr, ctr

2. **SEARCH*TERMS*{TENANT}:** Search query performance
   - Columns: date, campaign, ad_group, search_term, clicks, cost, conversions

3. **RUN*LOGS*{TENANT}:** System execution logs
   - Columns: timestamp, type, message, data

4. **ANOMALIES\_{TENANT}:** Detected anomalies (auto-created)
   - Columns: timestamp, type, severity, message, value, threshold, confidence, metadata

## 📈 Performance & Scaling

### Optimization Features

- **Connection Pooling:** Efficient Google Sheets API usage
- **Smart Caching:** Reduced API calls and faster responses
- **Batch Processing:** Optimized data operations
- **Throttled Alerting:** Prevents alert spam
- **Background Jobs:** Non-blocking execution

### Monitoring

```bash
# Check scheduler status
curl "http://localhost:3007/api/alerts/history/TENANT_123"

# View delivery statistics
curl "http://localhost:3007/api/alerts/channels/TENANT_123"
```

## 🚨 Alert Types & Templates

### Supported Alert Types

| Type               | Severity | Trigger                           | Template     |
| ------------------ | -------- | --------------------------------- | ------------ |
| `cost_spike`       | High     | Daily cost >150% of average       | Slack, Email |
| `cpa_spike`        | Medium   | CPA increase >50%                 | Slack, Email |
| `zero_conversions` | High     | No conversions for 24h with spend | Slack, Email |
| `conversion_drop`  | Medium   | Conversions down >30%             | Slack, Email |
| `weekly_summary`   | Info     | Weekly (Mondays 9 AM)             | Email        |

### Custom Templates

Templates support variable interpolation:

```html
<!-- Email template example -->
<h2>🚨 Cost Spike Alert</h2>
<p>Current Cost: ${{currentCost}}</p>
<p>Expected: ${{expectedCost}}</p>
<p>Increase: {{percentIncrease}}%</p>
```

## 🔒 Security & Compliance

### Authentication

- HMAC-based request signing for external APIs
- Service account authentication for Google Sheets
- Webhook URL validation

### Data Privacy

- Sensitive data sanitization in logs
- Configurable data retention periods
- GDPR-compliant data handling

### Rate Limiting

- API endpoint throttling
- Alert frequency limits
- Google Sheets API quota management

## 🆘 Troubleshooting

### Common Issues

**Sheets Connection Fails:**

```bash
# Check service account permissions
# Verify GOOGLE_SERVICE_EMAIL and GOOGLE_PRIVATE_KEY
# Ensure sheet is shared with service account email
```

**Alerts Not Sending:**

```bash
# Test channel configuration
curl -X POST "http://localhost:3007/api/alerts/channels/TENANT_123/slack_main/test"

# Check webhook URLs and API keys
# Verify channel is enabled
```

**No Anomalies Detected:**

```bash
# Check data availability and date ranges
# Adjust detection thresholds
# Verify sufficient historical data (minimum 7 days)
```

### Debug Mode

```bash
# Enable verbose logging
export LOG_LEVEL=debug
node backend/server-refactored.js

# Run test suite with verbose output
node backend/test-gtm-observability.js --verbose
```

## 📚 Additional Resources

- **API Documentation:** `/docs/API.md`
- **Google Sheets Setup:** `/docs/SHEETS_SETUP.md`
- **Looker Studio Guide:** `/looker-studio/README.md`
- **Deployment Guide:** `/deployment/README.md`

## 🤝 Contributing

1. Run the test suite: `node backend/test-gtm-observability.js`
2. Follow the existing code patterns and documentation
3. Add tests for new features
4. Update this README for significant changes

## 📄 License

ProofKit SaaS - Commercial License. All rights reserved.

---

**ProofKit GTM/Observability System** - Delivering intelligent monitoring and actionable insights for merchant success. 🎯
