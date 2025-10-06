# Ads Autopilot AI - Deployment Checklist

**Date**: October 6, 2025
**Target**: Vercel Production Deployment

---

## ✅ Pre-Deployment Checklist

### 1. Supabase Migrations to Run

You need to run these migrations in order:

#### Core Schema Migrations (Run in Order)
```sql
-- 1. Initial schema (if not already run)
001_initial_schema_fixed.sql

-- 2. Support system tables
002_support_system.sql

-- 3. Custom dashboards
003_custom_dashboards.sql

-- 4. Advanced automation
004_advanced_automation.sql
004_analytics_performance_indexes.sql

-- 5. Security enhancements
005_security_enhancements.sql

-- 6. RSA test queue
006_rsa_test_queue.sql

-- 7. N-gram negatives
007_ngram_negatives.sql

-- 8. Competitor intelligence & website extraction (use FINAL versions)
008_competitor_intelligence.sql
008_website_content_extraction_FINAL.sql

-- 9. Traffic patterns
009_traffic_patterns.sql

-- 10. Dashboard views (use ULTIMATE version)
010_dashboard_views_ULTIMATE.sql

-- 11. Comprehensive dashboard data
011_dashboard_comprehensive_data.sql

-- 12. Period tracking (use SAFE version)
012_add_period_tracking_SAFE.sql

-- 13. **CRITICAL** - Row Level Security policies
013_comprehensive_rls_policies.sql

-- 14. Anomaly detection & spend pacing
014_anomaly_pacing_helpers.sql

-- 15. Critical security fix
999_CRITICAL_SECURITY_FIX.sql
```

#### Which Migrations to Run?

**Check which migrations are already applied:**
1. Log into your Supabase dashboard
2. Go to SQL Editor
3. Run: `SELECT * FROM supabase_migrations ORDER BY version;`
4. Compare with the list above

**Priority Order (if starting fresh):**
1. **P0 - Critical**: 001, 013, 999 (schema + RLS + security)
2. **P1 - Core Features**: 002, 004, 006, 012, 014 (support, automation, RSA, period tracking, anomaly detection)
3. **P2 - Enhancement**: 003, 005, 007, 008, 009, 010, 011 (dashboards, negatives, competitor intel, views)

---

## 2. Vercel Environment Variables

### Backend Deployment (ads-autopilot-backend)

#### **Required - Application Core**
```bash
NODE_ENV=production
PORT=3005
BACKEND_URL=https://your-backend.vercel.app
BACKEND_PUBLIC_URL=https://your-backend.vercel.app/api
WP_BACKEND_URL=https://your-backend.vercel.app

# Tenant Configuration
TENANT_ID=adsautopilot
TENANT_REGISTRY_JSON='{"adsautopilot":"YOUR_GOOGLE_SHEET_ID"}'
```

#### **Required - Security**
```bash
# Generate with: openssl rand -hex 32
HMAC_SECRET=f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5

# Generate with: openssl rand -hex 32
ADMIN_KEY=9b7e3f2a8c1d4e5f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f

# Pixel token secret (can be same as HMAC or different)
PIXEL_TOKEN_SECRET=your_pixel_token_secret_32_chars_min

# Security headers (new)
ENABLE_SECURITY_HEADERS=true

# CORS (update with your actual UI domain)
ALLOWED_ORIGINS=https://your-ui.vercel.app,https://admin.shopify.com
```

#### **Required - Google Services**
```bash
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID=your-sheet-id-here
SHEET_ID=your-sheet-id-here
```

#### **Required - AI Services**
```bash
AI_PROVIDER=google
AI_MODEL=gemini-1.5-flash
AI_TEMPERATURE=0.4
AI_MAX_CALLS_PER_RUN=20
AI_READY=TRUE
AI_SKIP_BUDGET_CHECK=true

GEMINI_API_KEY=AIzaSy_your_gemini_api_key_here
```

#### **Required - Database & Cache**
```bash
# Supabase
SUPABASE_ENABLED=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis (required for sessions and cache)
REDIS_URL=redis://your-redis-url
KV_URL=redis://your-redis-url

# Cache TTL
INSIGHTS_CACHE_TTL_SEC=60
CONFIG_CACHE_TTL_SEC=15
RUNLOGS_CACHE_TTL_SEC=10
```

#### **Required - Shopify**
```bash
SHOPIFY_APP_URL=https://your-ui.vercel.app
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# Billing enforcement
BILLING_ENFORCEMENT_ACTIVE=false  # Set to 'true' when ready for production billing
```

#### **Required - Rate Limiting**
```bash
RATE_LIMIT_MAX=60  # Changed from RATE_LIMIT_PER_MIN
```

#### **Optional - Feature Flags**
```bash
STARTER_ENABLED=true
AUDIENCE_MIN_SIZE=1000
ENABLE_WEBSOCKET=false  # Set to false for serverless
```

---

### Shopify UI Deployment (ads-autopilot-ui)

#### **Required - Application**
```bash
NODE_ENV=production
SHOPIFY_APP_URL=https://your-ui.vercel.app

# Backend connection
BACKEND_PUBLIC_URL=https://your-backend.vercel.app/api

# Shopify OAuth
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=read_products,write_products,read_customers,write_orders
```

#### **Required - Session Storage**
```bash
# Redis for session storage (CRITICAL for production)
KV_URL=redis://your-redis-url
REDIS_URL=redis://your-redis-url
```

#### **Optional - Supabase (if direct client access needed)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 3. Current Environment Variables Status

### From Your `.env` File:
✅ **Already Set:**
- HMAC_SECRET
- Google Sheets credentials
- Gemini API key
- Supabase credentials
- Redis credentials
- Shopify API credentials

⚠️ **Needs Update for Production:**
- `NODE_ENV` → Change to `production`
- `BACKEND_URL` → Update to Vercel URL
- `BACKEND_PUBLIC_URL` → Update to Vercel URL
- `ALLOWED_ORIGINS` → Update to production UI URL
- `SHOPIFY_APP_URL` → Update to Vercel URL
- `TENANT_REGISTRY_JSON` → Verify tenant mapping
- `RATE_LIMIT_PER_MIN` → Change to `RATE_LIMIT_MAX` (already in .env.example)

❌ **Missing (New):**
- `ADMIN_KEY` (for secret rotation)
- `PIXEL_TOKEN_SECRET` (for pixel tokenization)
- `ENABLE_SECURITY_HEADERS` (new security headers)
- `ENABLE_WEBSOCKET=false` (for serverless)

---

## 4. Deployment Steps

### Step 1: Run Supabase Migrations
```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual via Dashboard
# 1. Go to Supabase Dashboard > SQL Editor
# 2. Copy/paste each migration file
# 3. Run in order (001 → 014 → 999)
# 4. Verify: SELECT * FROM supabase_migrations;
```

### Step 2: Generate Missing Secrets
```bash
# Generate ADMIN_KEY
openssl rand -hex 32

# Generate PIXEL_TOKEN_SECRET (or reuse HMAC_SECRET)
openssl rand -hex 32
```

### Step 3: Deploy Backend to Vercel
```bash
cd /Users/tamsar/Downloads/proofkit-saas/backend

# Create vercel project (if not exists)
vercel

# Set environment variables via Vercel dashboard or CLI:
vercel env add HMAC_SECRET production
vercel env add ADMIN_KEY production
vercel env add PIXEL_TOKEN_SECRET production
# ... (repeat for all variables above)

# Deploy
vercel --prod
```

### Step 4: Deploy Shopify UI to Vercel
```bash
cd /Users/tamsar/Downloads/proofkit-saas/shopify-ui

# Create vercel project (if not exists)
vercel

# Set environment variables
vercel env add SHOPIFY_API_KEY production
vercel env add SHOPIFY_API_SECRET production
vercel env add BACKEND_PUBLIC_URL production
vercel env add KV_URL production
# ... (repeat for all variables above)

# Deploy
vercel --prod
```

### Step 5: Update Shopify App Configuration
1. Go to Shopify Partner Dashboard
2. Update App URL to: `https://your-ui.vercel.app`
3. Update Redirect URLs to: `https://your-ui.vercel.app/auth/callback`
4. Save and test OAuth flow

### Step 6: Test Deployment
```bash
# Test backend health
curl https://your-backend.vercel.app/api/health

# Test security headers
curl -I https://your-backend.vercel.app/api/health | grep -E "Strict-Transport|Content-Security"

# Test HMAC endpoint
# (Generate signature and test config endpoint)

# Test Shopify UI
# Open https://your-ui.vercel.app in browser
```

---

## 5. Post-Deployment Verification

### Backend Tests:
- [ ] Health endpoint responds: `/api/health`
- [ ] Security headers present (HSTS, CSP, etc.)
- [ ] HMAC authentication works
- [ ] Supabase connection successful
- [ ] Redis cache working
- [ ] Google Sheets API accessible
- [ ] Gemini AI API accessible

### Shopify UI Tests:
- [ ] OAuth flow completes
- [ ] Session persistence works (Redis)
- [ ] Dashboard loads
- [ ] AI features accessible
- [ ] Billing pages load
- [ ] No console errors

### Integration Tests:
- [ ] Generate script endpoint works
- [ ] Pixel tokenization works
- [ ] RLS policies enforce tenant isolation
- [ ] Billing enforcement respects flag

---

## 6. Rollback Plan

If issues occur:

### Immediate Rollback:
```bash
# Revert to previous deployment
vercel rollback
```

### Disable Features:
```bash
# Disable billing enforcement
vercel env add BILLING_ENFORCEMENT_ACTIVE=false production

# Disable security headers
vercel env add ENABLE_SECURITY_HEADERS=false production

# Disable WebSockets (if causing issues)
vercel env add ENABLE_WEBSOCKET=false production
```

### Database Rollback:
```bash
# If RLS policies cause issues, remove them temporarily
# In Supabase SQL Editor:
DROP POLICY IF EXISTS [policy_name] ON [table_name];
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
```

---

## 7. Monitoring After Deployment

### Key Metrics to Watch:
1. **Error Rates**: Check Vercel logs for 500 errors
2. **Response Times**: Monitor API endpoint latency
3. **Authentication**: Watch for 401/403 errors
4. **RLS Policies**: Check for unexpected data access denials
5. **Token Generation**: Monitor pixel token fetch rates
6. **Billing Checks**: Watch for 402 responses (if enforcement enabled)

### Vercel Logs:
```bash
# Real-time logs
vercel logs --follow

# Filter by function
vercel logs server.js --follow

# Search for errors
vercel logs | grep ERROR
```

### Supabase Logs:
- Go to Supabase Dashboard > Logs
- Filter by severity: ERROR, WARN
- Watch for RLS policy violations
- Monitor query performance

---

## 8. Git Commit & Push

After you confirm migrations and env vars are ready:

```bash
cd /Users/tamsar/Downloads/proofkit-saas

# Stage all changes
git add .

# Commit with deployment message
git commit -m "feat: production deployment prep - RLS, security headers, pixel tokenization, billing integration

- Add comprehensive RLS policies (013_comprehensive_rls_policies.sql)
- Add anomaly detection & spend pacing helpers (014_anomaly_pacing_helpers.sql)
- Implement lightweight security headers middleware
- Add pixel tokenization with JWT tokens (15-min expiry)
- Wire billing token retrieval from Redis
- Normalize rate limit env vars (RATE_LIMIT_MAX)
- Remove emojis from production UI
- Enable minimal CI/CD pipeline
- Update environment configuration for production

🚀 Generated with Claude Code
"

# Push to main
git push origin main
```

---

## 9. Quick Reference

### Critical Environment Variables
| Variable | Backend | UI | Description |
|----------|---------|-----|-------------|
| HMAC_SECRET | ✅ | ❌ | API authentication |
| ADMIN_KEY | ✅ | ❌ | Secret rotation |
| PIXEL_TOKEN_SECRET | ✅ | ❌ | Pixel JWT tokens |
| SUPABASE_URL | ✅ | ⚠️ | Database connection |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | ❌ | Database admin |
| KV_URL / REDIS_URL | ✅ | ✅ | Session storage |
| SHOPIFY_API_KEY | ✅ | ✅ | OAuth |
| SHOPIFY_API_SECRET | ✅ | ✅ | OAuth |
| BACKEND_PUBLIC_URL | ❌ | ✅ | API endpoint |
| ENABLE_SECURITY_HEADERS | ✅ | ❌ | Security middleware |
| BILLING_ENFORCEMENT_ACTIVE | ✅ | ❌ | Billing checks |
| RATE_LIMIT_MAX | ✅ | ❌ | Rate limiting |

### Support Contacts
- **Technical Issues**: Check BUILD_TEST_AUDIT.md
- **Environment Setup**: Check PRODUCTION_ENV_SETUP.md
- **Launch Roadmap**: Check launch_roadmap.md

---

**Ready for deployment!** 🚀

Once you've:
1. Run the Supabase migrations
2. Set all Vercel environment variables
3. Tested locally one more time

Let me know and I'll help you commit and push to git!
