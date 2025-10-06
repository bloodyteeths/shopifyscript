# Ads Autopilot AI - Production Environment Setup Guide

This guide provides comprehensive instructions for configuring production environment variables across all deployment platforms (Vercel, Supabase, Redis Cloud, Google Cloud).

## Table of Contents

1. [Overview](#overview)
2. [Environment Variable Categories](#environment-variable-categories)
3. [Platform-Specific Setup](#platform-specific-setup)
4. [Security Best Practices](#security-best-practices)
5. [Verification & Testing](#verification--testing)

---

## Overview

Ads Autopilot AI consists of three main components, each with its own environment configuration:

1. **Backend API** (`/backend`) - Deployed to Vercel
2. **Shopify UI** (`/shopify-ui`) - Deployed to Vercel
3. **Job Worker** (future) - Background task processing

All services share common credentials (Google Sheets, Supabase, Redis) but have component-specific variables.

---

## Environment Variable Categories

### 1. Shared Credentials

These variables must be **identical** across all services:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `HMAC_SECRET` | Signature verification key (32+ chars) | Generate using: `openssl rand -hex 32` |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Service account email | Google Cloud Console > IAM & Admin > Service Accounts |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Service account private key | Download JSON key from Google Cloud |
| `GOOGLE_SHEETS_PROJECT_ID` | Google Cloud project ID | Google Cloud Console > Dashboard |
| `SHEET_ID` | Master Google Sheet ID | URL of your Google Sheet |
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |
| `REDIS_URL` | Redis connection string | Redis Cloud Console > Database |

### 2. Backend-Specific Variables

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3005` (Vercel auto-assigns) |
| `BACKEND_URL` | Internal backend URL | `https://ads-autopilot-backend.vercel.app` |
| `BACKEND_PUBLIC_URL` | Public API endpoint | `https://ads-autopilot-backend.vercel.app/api` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://ads-autopilot-ui.vercel.app,https://admin.shopify.com` |
| `TENANT_ID` | Default tenant | `adsautopilot` |
| `TENANT_REGISTRY_JSON` | Tenant-to-sheet mapping | `{"adsautopilot":"SHEET_ID_HERE"}` |
| `AI_PROVIDER` | AI service provider | `google` |
| `AI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `GEMINI_API_KEY` | Google AI API key | Google AI Studio |
| `SHOPIFY_API_KEY` | Shopify app API key | Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | Shopify app secret | Shopify Partner Dashboard |
| `RATE_LIMIT_MAX` | API rate limit (requests per minute) | `60` |

### 3. Shopify UI-Specific Variables

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `PORT` | UI server port | `3000` (Vercel auto-assigns) |
| `BACKEND_PUBLIC_URL` | Backend API URL | `https://ads-autopilot-backend.vercel.app/api` |
| `SHOPIFY_APP_URL` | Shopify app URL | `https://ads-autopilot-ui.vercel.app` |
| `SHOPIFY_API_KEY` | Shopify app API key | Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | Shopify app secret | Shopify Partner Dashboard |
| `SCOPES` | Shopify OAuth scopes | `read_products,write_products` |
| `TENANT_ID` | Default tenant | `adsautopilot` |

---

## Platform-Specific Setup

### Vercel - Backend API

1. **Navigate to Project Settings**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select `ads-autopilot-backend` project
   - Go to Settings > Environment Variables

2. **Add Production Variables**

```bash
# Application
NODE_ENV=production
PORT=3005
BACKEND_URL=https://ads-autopilot-backend.vercel.app
BACKEND_PUBLIC_URL=https://ads-autopilot-backend.vercel.app/api
WP_BACKEND_URL=https://ads-autopilot-backend.vercel.app
ALLOWED_ORIGINS=https://ads-autopilot-ui.vercel.app,https://admin.shopify.com

# Multi-tenant
TENANT_ID=adsautopilot
TENANT_REGISTRY_JSON={"adsautopilot":"YOUR_SHEET_ID"}

# Security
HMAC_SECRET=<your-32-char-secret>

# Google Sheets
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account@project.iam.gserviceaccount.com>
GOOGLE_SHEETS_PRIVATE_KEY=<full-private-key-with-newlines>
GOOGLE_SHEETS_PROJECT_ID=<your-project-id>
SHEET_ID=<your-sheet-id>

# AI Services
AI_PROVIDER=google
AI_MODEL=gemini-1.5-flash
AI_TEMPERATURE=0.4
AI_MAX_CALLS_PER_RUN=20
AI_READY=TRUE
GEMINI_API_KEY=<your-gemini-api-key>

# Supabase
SUPABASE_ENABLED=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Redis
REDIS_URL=redis://default:<password>@<host>:<port>
KV_URL=redis://default:<password>@<host>:<port>

# Cache TTL
INSIGHTS_CACHE_TTL_SEC=60
CONFIG_CACHE_TTL_SEC=15
RUNLOGS_CACHE_TTL_SEC=10

# Rate Limiting
RATE_LIMIT_MAX=60

# Shopify
SHOPIFY_APP_URL=https://ads-autopilot-ui.vercel.app
SHOPIFY_API_KEY=<your-shopify-api-key>
SHOPIFY_API_SECRET=<your-shopify-api-secret>

# Features
AUDIENCE_MIN_SIZE=1000
STARTER_ENABLED=true
AI_SKIP_BUDGET_CHECK=false
```

3. **Configure Deployment Settings**
   - Environment: Production
   - Apply to: Production branch only
   - Sensitive: Mark all secrets as sensitive

### Vercel - Shopify UI

1. **Navigate to Project Settings**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select `ads-autopilot-ui` project
   - Go to Settings > Environment Variables

2. **Add Production Variables**

```bash
# Note: Do NOT set NODE_ENV in environment variables (causes build issues)
# It's automatically set in vercel.json

# Application
PORT=3000

# Backend Integration
BACKEND_PUBLIC_URL=https://ads-autopilot-backend.vercel.app/api

# Multi-tenant
TENANT_ID=adsautopilot
TENANT_REGISTRY_JSON={"adsautopilot":"YOUR_SHEET_ID"}
DEFAULT_DEV_TENANT=adsautopilot

# Security
HMAC_SECRET=<same-as-backend>

# Shopify
SHOPIFY_API_KEY=<your-shopify-api-key>
SHOPIFY_API_SECRET=<your-shopify-api-secret>
SHOPIFY_APP_URL=https://ads-autopilot-ui.vercel.app
SCOPES=read_products,write_products

# Google Sheets (for direct access if needed)
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account@project.iam.gserviceaccount.com>
GOOGLE_SHEETS_PRIVATE_KEY=<full-private-key-with-newlines>
GOOGLE_SHEETS_PROJECT_ID=<your-project-id>
SHEET_ID=<your-sheet-id>

# Redis
REDIS_URL=redis://default:<password>@<host>:<port>

# AI
AI_SKIP_BUDGET_CHECK=false
```

### Supabase - Database Configuration

1. **Navigate to Supabase Dashboard**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Configure Edge Functions (if using)**
   - Go to Edge Functions
   - Set environment variables for background workers

```bash
# Same shared credentials as above
GOOGLE_SHEETS_CLIENT_EMAIL=<value>
GOOGLE_SHEETS_PRIVATE_KEY=<value>
SUPABASE_URL=<value>
SUPABASE_SERVICE_ROLE_KEY=<value>
REDIS_URL=<value>
HMAC_SECRET=<value>
```

3. **Enable Row Level Security (RLS)**
   - Go to Authentication > Policies
   - Ensure RLS is enabled on all tables
   - Configure policies for tenant isolation

### Redis Cloud - Cache Configuration

1. **Navigate to Redis Cloud Console**
   - Go to [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)
   - Select your database

2. **Get Connection String**
   - Format: `redis://default:<password>@<host>:<port>`
   - Copy this exact string to `REDIS_URL` and `KV_URL`

3. **Configure Security**
   - Enable TLS/SSL in production
   - Whitelist Vercel IP ranges (see Vercel docs)
   - Set strong password

### Google Cloud - Service Account Setup

1. **Create Service Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - IAM & Admin > Service Accounts
   - Create new service account

2. **Grant Permissions**
   - Google Sheets API access
   - Google AI (Gemini) API access (if using)

3. **Generate Key**
   - Download JSON key file
   - Extract fields:
     - `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
     - `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY`
     - `project_id` → `GOOGLE_SHEETS_PROJECT_ID`

4. **Share Google Sheet**
   - Open your master Google Sheet
   - Share with service account email
   - Grant "Editor" permissions

---

## Security Best Practices

### 1. Secret Management

- **Never commit secrets to Git**
  - All `.env` files are gitignored
  - Use `.env.example` files as templates

- **Use environment-specific secrets**
  - Development: Use test/sandbox keys
  - Production: Use live API keys with restricted permissions

- **Rotate secrets regularly**
  - HMAC_SECRET: Every 90 days
  - API keys: When team members leave
  - Service account keys: Annually

### 2. Access Control

- **Principle of Least Privilege**
  - Grant only necessary permissions
  - Use separate service accounts for dev/prod

- **Shopify Scopes**
  - Request only required OAuth scopes
  - Review before each app submission

- **Supabase RLS**
  - Enable Row Level Security on all tables
  - Test policies with different tenant IDs

### 3. Network Security

- **CORS Configuration**
  - Whitelist only production domains
  - Never use wildcard (`*`) in production

- **Rate Limiting**
  - Enforce per-minute limits
  - Monitor for abuse patterns

- **TLS/SSL**
  - Use HTTPS for all endpoints
  - Enable Redis TLS in production

---

## Verification & Testing

### 1. Environment Variable Checklist

Before deploying to production, verify:

- [ ] All required variables are set in Vercel
- [ ] HMAC_SECRET matches between backend and UI
- [ ] Google Sheets service account has access to sheet
- [ ] Supabase connection works from Vercel
- [ ] Redis connection succeeds
- [ ] Shopify API keys are from production app
- [ ] CORS origins include production UI URL
- [ ] No development/test values in production

### 2. Connection Tests

**Backend Health Check:**
```bash
curl https://ads-autopilot-backend.vercel.app/health
# Expected: {"ok":true,"status":"healthy"}
```

**API Authentication Test:**
```bash
curl "https://ads-autopilot-backend.vercel.app/api/summary?tenant=adsautopilot&sig=<valid-signature>"
# Expected: JSON response with metrics
```

**Supabase Connection:**
```bash
# From Vercel function logs
# Look for: "✅ Supabase connection successful"
```

**Redis Connection:**
```bash
# From Vercel function logs
# Look for: "✅ Redis connection successful"
```

### 3. Integration Tests

**Test Shopify OAuth Flow:**
1. Install app on test Shopify store
2. Verify redirect to SHOPIFY_APP_URL
3. Complete OAuth flow
4. Check dashboard loads with real data

**Test AI Content Generation:**
1. Navigate to AI Content Studio
2. Generate ad copy
3. Verify job queues to background worker
4. Check results appear in UI

**Test Multi-Tenant Isolation:**
1. Create two test tenants
2. Verify each sees only their data
3. Check RLS policies enforce separation

### 4. Monitoring Setup

**Vercel Analytics:**
- Enable in project settings
- Monitor function execution time
- Track error rates

**Supabase Logs:**
- Monitor database queries
- Check for slow queries
- Review RLS policy violations

**Redis Monitoring:**
- Track cache hit rates
- Monitor memory usage
- Check connection pool health

---

## Deployment Workflow

### Initial Setup

1. **Configure Vercel Projects**
   ```bash
   # Backend
   vercel --prod
   vercel env add HMAC_SECRET production
   # (Repeat for all variables)

   # Frontend
   cd shopify-ui
   vercel --prod
   vercel env add HMAC_SECRET production
   # (Repeat for all variables)
   ```

2. **Trigger Deployment**
   ```bash
   # Push to main branch triggers auto-deployment
   git push origin main
   ```

3. **Verify Deployment**
   - Check Vercel deployment logs
   - Test health endpoints
   - Verify environment variables loaded

### Updates & Rollbacks

**Update Environment Variable:**
```bash
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
# Redeploy required
vercel --prod
```

**Rollback Deployment:**
```bash
# From Vercel Dashboard:
# Deployments > Select previous deployment > Promote to Production
```

---

## Troubleshooting

### Common Issues

**"HMAC signature verification failed"**
- Check HMAC_SECRET matches between backend and UI
- Verify secret has no trailing spaces/newlines

**"Supabase connection timeout"**
- Verify SUPABASE_URL is correct
- Check Vercel IP is whitelisted in Supabase
- Ensure service role key is valid

**"Google Sheets permission denied"**
- Share sheet with service account email
- Verify service account has "Editor" permissions
- Check GOOGLE_SHEETS_CLIENT_EMAIL is correct

**"Redis connection refused"**
- Verify Redis host/port are correct
- Check password is URL-encoded if it contains special characters
- Ensure Vercel IPs are whitelisted

**"Shopify OAuth redirect_uri mismatch"**
- Update redirect URLs in Shopify Partner Dashboard
- Add both `https://ads-autopilot-ui.vercel.app` and Vercel preview URLs

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Shopify App Docs**: https://shopify.dev/docs/apps
- **Google Cloud Docs**: https://cloud.google.com/docs

---

**Last Updated**: 2025-10-06
**Version**: 1.0
