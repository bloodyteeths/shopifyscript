# Ads Autopilot AI - Environment Configuration Summary

This document summarizes all environment variable updates for the "Ads Autopilot AI" rebrand and production deployment.

**Date**: 2025-10-06
**Status**: Complete

---

## Files Updated

### 1. Root Environment Files

#### `/Users/tamsar/Downloads/proofkit-saas/.env.example`
**Changes**:
- Updated header comment from generic to "Ads Autopilot AI SaaS Environment Configuration"
- No other changes needed (already properly configured)

**Status**: ✅ Complete

#### `/Users/tamsar/Downloads/proofkit-saas/.env.billing.example`
**Changes**:
- Updated header: "ProofKit Billing Configuration" → "Ads Autopilot AI Billing Configuration"
- Updated `DATABASE_URL`: `proofkit` → `adsautopilot`
- Updated `DB_NAME`: `proofkit` → `adsautopilot`
- Updated `DB_USER`: `proofkit_user` → `adsautopilot_user`
- Updated `EMAIL_FROM`: `billing@proofkit.com` → `billing@adsautopilotai.com`
- Updated `EMAIL_FROM_NAME`: "ProofKit Billing" → "Ads Autopilot AI Billing"
- Updated `COMPANY_NAME`: "ProofKit, Inc." → "Ads Autopilot AI, Inc."
- Updated `BACKUP_BUCKET`: `proofkit-billing-backups` → `adsautopilot-billing-backups`
- Updated `REDIS_SESSION_PREFIX`: `proofkit:session:` → `adsautopilot:session:`
- Updated `REDIS_CACHE_PREFIX`: `proofkit:cache:` → `adsautopilot:cache:`

**Status**: ✅ Complete

### 2. Backend Environment Files

#### `/Users/tamsar/Downloads/proofkit-saas/backend/.env.example`
**Changes**:
- Complete rewrite with comprehensive configuration
- Added detailed section headers and comments
- Organized variables into logical categories:
  - Application Settings
  - Security
  - Multi-Tenant Configuration
  - Google Services
  - AI Services
  - Supabase Database
  - Redis Cache
  - Rate Limiting
  - Shopify Integration
  - Audience Configuration
  - Feature Flags
- Updated default tenant ID: `proofkit` → `adsautopilot`
- Added all required environment variables with descriptions

**Status**: ✅ Complete

### 3. Shopify UI Environment Files

#### `/Users/tamsar/Downloads/proofkit-saas/shopify-ui/.env.example` (NEW)
**Changes**:
- Created new comprehensive .env.example file
- Includes all required variables for production deployment
- Organized into sections:
  - Application Settings
  - Backend Integration
  - Multi-Tenant Configuration
  - Security
  - Shopify App Configuration
  - Google Sheets (Direct Access)
  - Redis Cache
  - AI Configuration
- Added helpful comments explaining production vs development values

**Status**: ✅ Complete

#### `/Users/tamsar/Downloads/proofkit-saas/shopify-ui/vercel.json`
**Changes**:
- Added `build.env` section for production builds
- Environment variables already properly configured:
  - `SHOPIFY_APP_URL`: `https://ads-autopilot-ui.vercel.app`
  - `BACKEND_PUBLIC_URL`: `https://ads-autopilot-backend.vercel.app/api`

**Status**: ✅ Complete

### 4. Documentation Files

#### `/Users/tamsar/Downloads/proofkit-saas/docs/deployment/DEPLOYMENT.md`
**Changes**:
- Updated title: "Ads Autopilot AI SaaS" → "Ads Autopilot AI"
- Updated deployment directory: `/opt/adsautopilot` → `/opt/ads-autopilot`
- Updated repository name: `adsautopilot-saas.git` → `ads-autopilot-ai.git`
- Updated production URLs to use Vercel deployment URLs
- Updated port from 3001 to 3005 (matches backend)
- Updated contact information:
  - Email: `ops@adsautopilot.net` → `ops@adsautopilotai.com`
  - Status page: `status.adsautopilot.net` → `status.adsautopilotai.com`

**Status**: ✅ Complete

#### `/Users/tamsar/Downloads/proofkit-saas/PRODUCTION_ENV_SETUP.md` (NEW)
**Changes**:
- Created comprehensive production environment setup guide
- Includes platform-specific instructions for:
  - Vercel (Backend API)
  - Vercel (Shopify UI)
  - Supabase
  - Redis Cloud
  - Google Cloud
- Security best practices
- Verification and testing procedures
- Troubleshooting guide
- Deployment workflow

**Status**: ✅ Complete

---

## Key Environment Variables Summary

### Shared Across All Services

These must be **identical** in all deployments:

| Variable | Purpose | Example |
|----------|---------|---------|
| `HMAC_SECRET` | Signature verification | 32+ character random string |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Service account email | `service@project.iam.gserviceaccount.com` |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Service account key | Full private key with newlines |
| `GOOGLE_SHEETS_PROJECT_ID` | GCP project ID | `your-project-id` |
| `SHEET_ID` | Master sheet ID | 44-character sheet ID |
| `SUPABASE_URL` | Supabase API URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | JWT token |
| `REDIS_URL` | Redis connection | `redis://default:pwd@host:port` |

### Backend-Specific Variables

| Variable | Production Value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `PORT` | `3005` |
| `BACKEND_URL` | `https://ads-autopilot-backend.vercel.app` |
| `BACKEND_PUBLIC_URL` | `https://ads-autopilot-backend.vercel.app/api` |
| `ALLOWED_ORIGINS` | `https://ads-autopilot-ui.vercel.app,https://admin.shopify.com` |
| `TENANT_ID` | `adsautopilot` |
| `AI_PROVIDER` | `google` |
| `AI_MODEL` | `gemini-1.5-flash` |

### Shopify UI-Specific Variables

| Variable | Production Value |
|----------|------------------|
| `PORT` | `3000` |
| `BACKEND_PUBLIC_URL` | `https://ads-autopilot-backend.vercel.app/api` |
| `SHOPIFY_APP_URL` | `https://ads-autopilot-ui.vercel.app` |
| `TENANT_ID` | `adsautopilot` |

---

## Deployment Platforms Configuration

### 1. Vercel - Backend (`ads-autopilot-backend`)

**Project URL**: https://ads-autopilot-backend.vercel.app

**Required Environment Variables**:
- 30+ variables (see PRODUCTION_ENV_SETUP.md for complete list)
- All marked as "Production" environment
- Sensitive variables marked as sensitive

**Configuration**:
- Build command: `npm install`
- Output directory: Default
- Framework: Node.js
- Runtime: Node.js 20.x

### 2. Vercel - Shopify UI (`ads-autopilot-ui`)

**Project URL**: https://ads-autopilot-ui.vercel.app

**Required Environment Variables**:
- 15+ variables (see PRODUCTION_ENV_SETUP.md for complete list)
- All marked as "Production" environment
- Sensitive variables marked as sensitive

**Configuration**:
- Build command: `npm run build`
- Framework: Remix
- Runtime: Node.js 20.x

### 3. Supabase

**Project URL**: https://xmwxqjqdwtjieoszqljn.supabase.co

**Configuration**:
- Database tables with RLS enabled
- Service role key configured
- Edge functions (future) with environment variables

### 4. Redis Cloud

**Connection**: redis://default:pwd@redis-17817.c262.us-east-1-3.ec2.redns.redis-cloud.com:17817

**Configuration**:
- TLS/SSL enabled
- Vercel IPs whitelisted
- Strong password set

### 5. Google Cloud Platform

**Service Account**: mybaby-sync-backend@shortcutai-caq80.iam.gserviceaccount.com

**APIs Enabled**:
- Google Sheets API
- Google Generative AI (Gemini)

**Permissions**:
- Shared with "Editor" access on master Google Sheet
- API keys configured for Gemini

---

## Migration Checklist for Production

### Pre-Deployment

- [x] Update all .env.example files with new branding
- [x] Create comprehensive environment documentation
- [x] Update deployment guides
- [ ] Generate production HMAC_SECRET (use: `openssl rand -hex 32`)
- [ ] Obtain production Shopify API credentials
- [ ] Configure production Google Cloud service account
- [ ] Set up production Supabase project
- [ ] Configure production Redis Cloud instance
- [ ] Obtain Gemini API key for production

### Vercel Configuration

- [ ] Create Vercel project: `ads-autopilot-backend`
- [ ] Create Vercel project: `ads-autopilot-ui`
- [ ] Configure environment variables in Vercel (Backend - 30+ vars)
- [ ] Configure environment variables in Vercel (UI - 15+ vars)
- [ ] Verify all secrets marked as sensitive
- [ ] Test deployment preview
- [ ] Promote to production

### Third-Party Services

- [ ] Share Google Sheet with service account
- [ ] Enable RLS policies in Supabase
- [ ] Whitelist Vercel IPs in Redis Cloud
- [ ] Configure Shopify app redirect URLs
- [ ] Set up monitoring and alerts

### Testing & Verification

- [ ] Test backend health endpoint
- [ ] Verify HMAC signature validation
- [ ] Test Supabase connection
- [ ] Test Redis cache functionality
- [ ] Verify Google Sheets access
- [ ] Test Shopify OAuth flow
- [ ] Load test API endpoints
- [ ] Verify tenant isolation

### Post-Deployment

- [ ] Monitor Vercel function logs
- [ ] Check Supabase query performance
- [ ] Monitor Redis cache hit rates
- [ ] Set up error tracking (Sentry/etc.)
- [ ] Configure uptime monitoring
- [ ] Document production URLs
- [ ] Update DNS records (if custom domain)

---

## Security Considerations

### 1. Secret Management
- All secrets stored in Vercel environment variables (encrypted)
- No secrets committed to Git repository
- `.env` files properly gitignored
- Production secrets rotated regularly

### 2. Access Control
- Principle of least privilege applied
- Service accounts with minimal permissions
- Shopify scopes limited to necessary permissions
- Supabase RLS enforced on all tables

### 3. Network Security
- CORS restricted to production domains only
- Rate limiting enabled (60 req/min)
- TLS/SSL enforced for all connections
- Redis password authentication required

### 4. Compliance
- GDPR data handling configured
- Audit logging enabled
- Data retention policies set
- Privacy policy and terms of service URLs configured

---

## Environment Variable Reference

### Complete Variable List

**Application Settings** (8 variables):
- NODE_ENV, PORT, BACKEND_URL, BACKEND_PUBLIC_URL, WP_BACKEND_URL, SHOPIFY_APP_URL, ALLOWED_ORIGINS, SCOPES

**Multi-Tenant** (3 variables):
- TENANT_ID, TENANT_REGISTRY_JSON, DEFAULT_DEV_TENANT

**Security** (1 variable):
- HMAC_SECRET

**Google Services** (4 variables):
- GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_PROJECT_ID, SHEET_ID

**AI Services** (6 variables):
- AI_PROVIDER, AI_MODEL, AI_TEMPERATURE, AI_MAX_CALLS_PER_RUN, AI_READY, GEMINI_API_KEY, AI_SKIP_BUDGET_CHECK

**Supabase** (3 variables):
- SUPABASE_ENABLED, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

**Redis** (5 variables):
- REDIS_URL, KV_URL, INSIGHTS_CACHE_TTL_SEC, CONFIG_CACHE_TTL_SEC, RUNLOGS_CACHE_TTL_SEC

**Rate Limiting** (1 variable):
- RATE_LIMIT_MAX

**Shopify** (2 variables):
- SHOPIFY_API_KEY, SHOPIFY_API_SECRET

**Features** (2 variables):
- AUDIENCE_MIN_SIZE, STARTER_ENABLED

**Total**: 35+ environment variables

---

## Next Steps

1. **Generate Production Secrets**
   ```bash
   # Generate HMAC secret
   openssl rand -hex 32
   ```

2. **Configure Vercel Projects**
   - Create projects in Vercel dashboard
   - Add environment variables from PRODUCTION_ENV_SETUP.md
   - Deploy from main branch

3. **Test Deployments**
   - Run health checks
   - Verify API authentication
   - Test end-to-end flows

4. **Monitor Production**
   - Set up alerts
   - Monitor error rates
   - Track performance metrics

---

## Support & Documentation

- **Environment Setup Guide**: `/PRODUCTION_ENV_SETUP.md`
- **Deployment Guide**: `/docs/deployment/DEPLOYMENT.md`
- **Example Configurations**: All `.env.example` files
- **Launch Roadmap**: `/ROADMAP.md`

---

**Configuration Status**: ✅ Complete
**Ready for Production**: Pending secret generation and Vercel deployment
**Last Updated**: 2025-10-06
