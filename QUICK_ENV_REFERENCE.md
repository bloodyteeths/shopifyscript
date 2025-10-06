# Ads Autopilot AI - Quick Environment Variable Reference

Fast reference for setting up production environment variables in Vercel.

---

## Backend (Vercel: ads-autopilot-backend)

### Critical Variables (Must Set First)

```bash
# Security
HMAC_SECRET=<generate-with-openssl-rand-hex-32>

# Application
NODE_ENV=production
PORT=3005
BACKEND_URL=https://ads-autopilot-backend.vercel.app
BACKEND_PUBLIC_URL=https://ads-autopilot-backend.vercel.app/api
ALLOWED_ORIGINS=https://ads-autopilot-ui.vercel.app,https://admin.shopify.com

# Tenant
TENANT_ID=adsautopilot
TENANT_REGISTRY_JSON={"adsautopilot":"<YOUR_SHEET_ID>"}

# Google Sheets (get from service account JSON)
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n<key>\n-----END PRIVATE KEY-----\n
GOOGLE_SHEETS_PROJECT_ID=<project-id>
SHEET_ID=<44-char-sheet-id>

# Supabase (from dashboard)
SUPABASE_ENABLED=true
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<jwt-token>

# Redis (from Redis Cloud)
REDIS_URL=redis://default:<password>@<host>:<port>
KV_URL=redis://default:<password>@<host>:<port>

# Shopify (from Partner Dashboard)
SHOPIFY_API_KEY=<api-key>
SHOPIFY_API_SECRET=<api-secret>
SHOPIFY_APP_URL=https://ads-autopilot-ui.vercel.app

# AI (from Google AI Studio)
AI_PROVIDER=google
AI_MODEL=gemini-1.5-flash
GEMINI_API_KEY=AIzaSy<your-key>
AI_READY=TRUE
```

### Optional Variables (Set After Initial Deploy)

```bash
# Cache TTL
INSIGHTS_CACHE_TTL_SEC=60
CONFIG_CACHE_TTL_SEC=15
RUNLOGS_CACHE_TTL_SEC=10

# AI Config
AI_TEMPERATURE=0.4
AI_MAX_CALLS_PER_RUN=20
AI_SKIP_BUDGET_CHECK=false

# Features
AUDIENCE_MIN_SIZE=1000
STARTER_ENABLED=true

# Rate Limiting
RATE_LIMIT_MAX=60

# Backend URLs
WP_BACKEND_URL=https://ads-autopilot-backend.vercel.app
```

---

## Shopify UI (Vercel: ads-autopilot-ui)

### Critical Variables (Must Set First)

```bash
# Application (DO NOT SET NODE_ENV - it's in vercel.json)
PORT=3000

# Backend
BACKEND_PUBLIC_URL=https://ads-autopilot-backend.vercel.app/api

# Security (MUST MATCH BACKEND)
HMAC_SECRET=<same-as-backend>

# Tenant
TENANT_ID=adsautopilot
TENANT_REGISTRY_JSON={"adsautopilot":"<YOUR_SHEET_ID>"}
DEFAULT_DEV_TENANT=adsautopilot

# Shopify (from Partner Dashboard)
SHOPIFY_API_KEY=<api-key>
SHOPIFY_API_SECRET=<api-secret>
SHOPIFY_APP_URL=https://ads-autopilot-ui.vercel.app
SCOPES=read_products,write_products

# Google Sheets (same as backend)
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n<key>\n-----END PRIVATE KEY-----\n
GOOGLE_SHEETS_PROJECT_ID=<project-id>
SHEET_ID=<44-char-sheet-id>

# Redis (same as backend)
REDIS_URL=redis://default:<password>@<host>:<port>
```

### Optional Variables

```bash
# AI
AI_SKIP_BUDGET_CHECK=false
```

---

## How to Get Each Credential

### HMAC_SECRET
```bash
# Generate on your local machine
openssl rand -hex 32
# Copy output to both backend and UI
```

### Google Sheets Credentials
1. Go to Google Cloud Console
2. Create/select project
3. Enable Google Sheets API
4. Create service account
5. Download JSON key
6. Extract:
   - `client_email` → GOOGLE_SHEETS_CLIENT_EMAIL
   - `private_key` → GOOGLE_SHEETS_PRIVATE_KEY (keep \n characters)
   - `project_id` → GOOGLE_SHEETS_PROJECT_ID
7. Share your Google Sheet with the service account email

### SHEET_ID
1. Open your Google Sheet
2. Copy ID from URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

### Supabase Credentials
1. Go to Supabase Dashboard
2. Select your project
3. Settings → API
4. Copy:
   - URL → SUPABASE_URL
   - service_role key → SUPABASE_SERVICE_ROLE_KEY

### Redis URL
1. Go to Redis Cloud Console
2. Select your database
3. Copy connection string (format: `redis://default:password@host:port`)

### Shopify Credentials
1. Go to Shopify Partner Dashboard
2. Apps → Your App
3. Copy:
   - API key → SHOPIFY_API_KEY
   - API secret key → SHOPIFY_API_SECRET
4. Update App URL to Vercel deployment URL

### Gemini API Key
1. Go to Google AI Studio (aistudio.google.com)
2. Get API Key
3. Copy → GEMINI_API_KEY

---

## Deployment Steps

### 1. Create Vercel Projects

```bash
# From project root
cd backend
vercel --prod

cd ../shopify-ui
vercel --prod
```

### 2. Add Environment Variables

**Option A: Via Vercel Dashboard**
1. Project Settings → Environment Variables
2. Add each variable
3. Select "Production" environment
4. Mark secrets as "Sensitive"

**Option B: Via CLI**
```bash
# For backend
vercel env add HMAC_SECRET production
vercel env add GOOGLE_SHEETS_CLIENT_EMAIL production
# ... etc

# For UI
cd shopify-ui
vercel env add HMAC_SECRET production
# ... etc
```

### 3. Redeploy

```bash
# Trigger new deployment to apply env vars
vercel --prod
```

### 4. Verify

```bash
# Test backend
curl https://ads-autopilot-backend.vercel.app/health

# Test UI (visit in browser)
# https://ads-autopilot-ui.vercel.app
```

---

## Common Issues

### "HMAC verification failed"
- Ensure HMAC_SECRET is identical in backend and UI
- Check for trailing spaces or newlines

### "Google Sheets permission denied"
- Share sheet with service account email
- Grant "Editor" permission
- Verify GOOGLE_SHEETS_CLIENT_EMAIL matches

### "Supabase connection timeout"
- Check SUPABASE_URL format (https://)
- Verify service role key is correct
- Ensure Vercel IPs are whitelisted in Supabase

### "Redis connection refused"
- Verify REDIS_URL format
- Check password is correct
- Ensure Redis is accessible from Vercel

---

## Environment Variable Count

- **Backend**: 30 variables (18 critical, 12 optional)
- **Shopify UI**: 15 variables (12 critical, 3 optional)
- **Shared between both**: 8 variables (must be identical)

---

## Security Checklist

- [ ] HMAC_SECRET is 32+ characters
- [ ] HMAC_SECRET matches between backend and UI
- [ ] All secrets marked as "Sensitive" in Vercel
- [ ] ALLOWED_ORIGINS restricted to production domains
- [ ] Shopify API credentials are from production app
- [ ] Google service account has minimal permissions
- [ ] Supabase service role key is kept secret
- [ ] Redis password is strong
- [ ] No test/development values in production

---

**Quick Start**: Copy variables from this guide → Paste into Vercel → Deploy → Test
**Full Documentation**: See PRODUCTION_ENV_SETUP.md
