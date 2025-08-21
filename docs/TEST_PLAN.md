# ProofKit E2E Testing Plan

## Overview

Comprehensive end-to-end testing strategy for ProofKit's merchant funnel covering local development, CI/CD integration, and troubleshooting procedures.

## Quick Start

```bash
# Install and setup
npm run install:all
npm run seed:demo

# Start services
npm run dev

# Run tests with documentation
npm run cypress:ci && npm run build:docs
```

## Test Coverage

### 8-Step Merchant Funnel

1. **Install & OAuth**: Shopify app installation and authentication
2. **Settings**: Configuration persistence and validation
3. **Safe First Run**: Budget caps and safety limits
4. **Script Preview**: Idempotency testing and mutation validation
5. **AI Drafts**: RSA generation with 30/90 character validation
6. **Intent Blocks**: UTM-driven content preview
7. **Audience Setup**: Google Ads audience attachment with size guards
8. **Go Live**: PROMOTE gate enable and live execution

### Test Types

- **Functional**: Core feature workflows
- **Accessibility**: Keyboard navigation and screen reader support
- **Error Handling**: API failures and validation errors
- **Performance**: Loading states and optimistic updates

## Local Testing

```bash
# Interactive development
npm run cypress:headed

# Headless execution
npm run test:e2e

# Debug mode
DEBUG=cypress:* npm run cypress:headed
```

## CI/CD Integration

### GitHub Actions

- Runs on push/PR to main branches
- Tests Chrome and Firefox browsers
- Generates artifacts: screenshots, documentation, accessibility reports
- Uploads to GitHub Actions artifacts

### Required Environment

```bash
TENANT_ID=demo-tenant-1
BACKEND_URL=http://localhost:3001
HMAC_SECRET=test-secret-key-for-demo
```

## Troubleshooting

**Backend errors**: Check health endpoint and restart services
**Rate limits**: Use test mode with mocked Google Sheets responses  
**OAuth issues**: Verify Shopify API credentials

For complete documentation see auto-generated `FUNNEL_E2E_GUIDE.md`.
