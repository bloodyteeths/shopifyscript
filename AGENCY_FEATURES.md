# ProofKit Agency Features

## Overview

ProofKit's agency-scale utilities provide comprehensive tools for managing multiple clients, automating workflows, and generating white-label reports. This system is designed for agencies and consultants managing multiple advertising accounts.

## Core Features

### 1. Template Library System

**File**: `/backend/services/agency-templates.js`

The template library allows agencies to create, share, and clone configurations across multiple tenants.

#### Key Capabilities:

- **Template Creation**: Convert existing tenant configurations into reusable templates
- **Template Cloning**: Apply templates to new clients with customizations
- **Bulk Operations**: Clone templates to multiple tenants simultaneously
- **Version Control**: Track template versions and changes
- **Import/Export**: Share templates between agencies or environments

#### API Endpoints:

```
GET    /api/agency/templates                    # List all templates
GET    /api/agency/templates/:id               # Get specific template
POST   /api/agency/templates                   # Create new template
PUT    /api/agency/templates/:id               # Update template
DELETE /api/agency/templates/:id               # Delete template
POST   /api/agency/templates/:id/clone         # Clone to single tenant
POST   /api/agency/templates/:id/bulk-clone    # Clone to multiple tenants
GET    /api/agency/templates/:id/export        # Export template
POST   /api/agency/templates/import            # Import template
GET    /api/agency/templates/analytics         # Template usage analytics
```

#### Example Usage:

```javascript
// Create template from existing config
const template = await templateService.createTemplate({
  templateId: "ecommerce-standard",
  templateName: "E-commerce Standard Setup",
  description: "Standard configuration for e-commerce clients",
  sourceConfig: existingTenantConfig,
  category: "ecommerce",
  tags: ["retail", "standard", "proven"],
  createdBy: "agency-user-123",
});

// Clone template to new client with customizations
const clonedConfig = await templateService.cloneToTenant(
  "ecommerce-standard",
  "new-client-456",
  {
    budgetMultiplier: 1.5,
    finalUrl: "https://newclient.com",
    businessHours: {
      start: "08:00",
      end: "20:00",
      days: "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY",
    },
  },
);
```

### 2. White-Label PDF Reports

**File**: `/backend/services/pdf-reports.js`

Automated generation of branded performance reports for clients.

#### Key Capabilities:

- **Weekly Reports**: Automated weekly performance summaries
- **Custom Branding**: Agency logos, colors, and contact information
- **Performance Analytics**: Comprehensive metrics analysis
- **Insights & Recommendations**: AI-generated insights and actionable recommendations
- **Bulk Generation**: Generate reports for multiple clients simultaneously

#### Report Sections:

1. **Executive Summary**: High-level performance overview
2. **Performance Metrics**: Detailed campaign and ad group metrics
3. **Key Insights**: Automated performance insights
4. **Recommendations**: Actionable optimization suggestions
5. **Search Terms Analysis**: Top converting and wasteful terms
6. **Appendix**: Technical details and methodology

#### API Endpoints:

```
POST   /api/agency/reports/weekly              # Generate single report
POST   /api/agency/reports/bulk-weekly         # Generate multiple reports
GET    /api/agency/reports/history/:tenantId   # Get report history
```

#### Example Usage:

```javascript
// Generate weekly report
const report = await reportService.generateWeeklyReport({
  tenantId: "client-123",
  clientName: "Acme Corp",
  reportPeriod: "2025-08-10 - 2025-08-16",
  agencyBranding: {
    agencyName: "Digital Marketing Pro",
    logoUrl: "https://agency.com/logo.png",
  },
  metricsData: {
    metrics: campaignMetrics,
    search_terms: searchTermData,
  },
  customizations: {
    sections: {
      hideSearchTerms: false,
      hideCampaignDetails: false,
    },
  },
});
```

### 3. Microsoft Ads Script Port

**File**: `/microsoft-ads-script/master.js`

Complete port of Google Ads Script functionality to Microsoft Ads (Bing Ads).

#### Key Features:

- **API Compatibility**: Mirrors Google Ads Script API structure
- **Safety Controls**: Same PROMOTE gate and safety features
- **Idempotency Testing**: Prevents duplicate operations
- **Campaign Management**: Budget caps, bidding strategies, schedules
- **Negative Keywords**: Master lists and auto-negation
- **Responsive Ads**: Automated RSA creation
- **Audience Targeting**: Audience attachment and management

#### Platform Differences Handled:

- Microsoft Ads reporting structure
- Different bidding strategy names (`MAXIMIZE_CLICKS` vs `TARGET_SPEND`)
- Campaign type differences
- Audience targeting methods
- Ad format variations

### 4. Bulk Operations Service

**File**: `/backend/services/agency-bulk.js`

Queue-based system for processing large-scale operations across multiple clients.

#### Operation Types:

- **Template Cloning**: Apply templates to multiple tenants
- **Configuration Updates**: Bulk update tenant settings
- **Campaign Actions**: Pause/resume campaigns across accounts
- **Negative Keywords**: Add negative keywords to multiple accounts
- **Report Generation**: Generate reports for multiple clients
- **Audience Sync**: Synchronize audiences across accounts

#### Features:

- **Queue Management**: Asynchronous processing with configurable concurrency
- **Progress Tracking**: Real-time progress updates
- **Error Handling**: Individual operation error tracking
- **Job Cancellation**: Cancel running or queued operations
- **Analytics**: Track operation success rates and performance

#### API Endpoints:

```
POST   /api/agency/bulk/config-update          # Bulk configuration updates
POST   /api/agency/bulk/campaign-status        # Bulk campaign pause/resume
POST   /api/agency/bulk/negative-keywords      # Bulk negative keyword addition
```

### 5. Agency Dashboard

**File**: `/backend/routes/agency.js`

Comprehensive dashboard for agency-level management and monitoring.

#### Dashboard Components:

- **Performance Overview**: Aggregate performance across all clients
- **Alert Management**: Critical issues requiring attention
- **Template Analytics**: Template usage and performance
- **Bulk Operation Status**: Queue status and recent operations
- **Client Health**: Individual client performance summaries

#### API Endpoints:

```
GET    /api/agency/dashboard/summary           # Agency overview metrics
GET    /api/agency/dashboard/performance       # Cross-client performance data
GET    /api/agency/dashboard/alerts            # Critical alerts and notifications
```

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Add to your `.env` file:

```env
# Agency Features
AGENCY_TEMPLATES_ENABLED=true
AGENCY_REPORTS_ENABLED=true
AGENCY_BULK_ENABLED=true
MAX_CONCURRENT_BULK_JOBS=5

# PDF Generation
PDF_GENERATION_METHOD=puppeteer
REPORT_STORAGE_PATH=./reports

# Microsoft Ads
MICROSOFT_ADS_ENABLED=true
MICROSOFT_ADS_DEVELOPER_TOKEN=your_token_here
```

### 3. Directory Structure

The system will automatically create these directories:

```
backend/
├── templates/          # Template storage
├── reports/           # Generated reports
├── bulk-operations/   # Bulk job tracking
└── report-templates/  # Report templates
```

## Usage Examples

### Template Workflow

```javascript
// 1. Create template from successful client
const template = await templateService.createTemplate({
  templateId: "saas-proven",
  templateName: "SaaS Proven Strategy",
  sourceConfig: clientConfig,
  category: "saas",
});

// 2. Clone to new clients with customizations
const results = await templateService.bulkClone("saas-proven", [
  {
    tenantId: "client-a",
    customizations: { budgetMultiplier: 1.2, finalUrl: "https://clienta.com" },
  },
  {
    tenantId: "client-b",
    customizations: { budgetMultiplier: 0.8, finalUrl: "https://clientb.com" },
  },
]);
```

### Bulk Operations Workflow

```javascript
// 1. Queue bulk operation
const job = await bulkService.queueBulkOperation({
  type: "negative_keywords",
  tenantIds: ["client-1", "client-2", "client-3"],
  parameters: {
    negativeKeywords: ["free", "cheap", "discount"],
    targetLevel: "campaign",
  },
  createdBy: "agency-user-123",
});

// 2. Monitor progress
const status = await bulkService.getJobStatus(job.id);
console.log(`Progress: ${status.progress}%`);

// 3. Get results
if (status.status === "completed") {
  console.log(
    "Success rate:",
    status.results.filter((r) => r.success).length / status.results.length,
  );
}
```

### Report Generation Workflow

```javascript
// Generate reports for all clients
const reportsConfig = clientList.map((client) => ({
  tenantId: client.id,
  clientName: client.name,
  metricsData: client.weeklyMetrics,
  agencyBranding: {
    agencyName: "Your Agency",
    logoUrl: "https://youragency.com/logo.png",
  },
}));

const results = await reportService.bulkGenerateReports(reportsConfig);
```

## Microsoft Ads Script Integration

### Deployment

1. **Upload Script**: Upload `/microsoft-ads-script/master.js` to Microsoft Ads Scripts
2. **Configure Variables**: Update `TENANT_ID`, `BACKEND_URL`, and `SHARED_SECRET`
3. **Set Schedule**: Configure automatic execution schedule
4. **Test Execution**: Run in preview mode first

### Key Differences from Google Ads

- **Bidding Strategies**: `TARGET_SPEND` → `MAXIMIZE_CLICKS`
- **Reporting**: Different report types and column names
- **Audience Targeting**: Different API methods for audience attachment
- **Campaign Types**: Different type enumeration values

## Security Considerations

### Authentication

- All API endpoints require HMAC authentication
- Template access can be restricted by agency/user
- Bulk operations are logged with user attribution

### Data Protection

- Templates automatically sanitize sensitive data
- Reports can exclude sensitive metrics
- Bulk operations support dry-run mode

### Rate Limiting

- Bulk operations respect API rate limits
- Configurable concurrency limits
- Automatic retry with exponential backoff

## Monitoring & Analytics

### Template Analytics

- Track template usage and success rates
- Identify most popular templates
- Monitor template performance impact

### Bulk Operation Analytics

- Success/failure rates by operation type
- Average execution times
- Queue performance metrics

### Report Analytics

- Track report generation frequency
- Monitor client engagement with reports
- Identify most requested report sections

## Support & Troubleshooting

### Common Issues

1. **Template Clone Failures**
   - Check tenant ID validity
   - Verify customization parameters
   - Review template configuration format

2. **Bulk Operation Timeouts**
   - Reduce batch sizes
   - Increase operation timeouts
   - Check API rate limits

3. **Report Generation Errors**
   - Verify metrics data format
   - Check branding asset URLs
   - Review PDF generation dependencies

### Debug Mode

Enable debug logging:

```env
DEBUG_AGENCY_FEATURES=true
LOG_LEVEL=debug
```

### Performance Optimization

- Use template caching for frequently used templates
- Implement pagination for large client lists
- Use background job processing for reports
- Cache dashboard data with appropriate TTL

## Roadmap

### Planned Features

- **A/B Testing Framework**: Template and strategy testing
- **Advanced Analytics**: Predictive performance modeling
- **Client Portal**: Self-service client reporting
- **API Integrations**: CRM and billing system integration
- **Advanced Automation**: Machine learning-based optimizations

### Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request with documentation updates

## License

This agency features extension maintains the same license as the core ProofKit system.
