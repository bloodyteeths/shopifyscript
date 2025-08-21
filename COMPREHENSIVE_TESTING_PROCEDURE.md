# ProofKit SaaS - Comprehensive 100% Functionality Testing Procedure

## Overview

This testing procedure validates 100% functionality of the ProofKit SaaS application based on the latest fixes and architecture analysis. The app consists of:

- **Backend API** (Node.js/Express) - Port 3001
- **Shopify UI** (Remix) - Port 3000
- **Google Sheets Integration** - Multi-tenant data storage
- **AI Integration** (Google Gemini) - Content generation
- **Google Ads Script** - Campaign automation

## Prerequisites

### Required Environment Variables

Create `.env` files with these critical settings:

**Backend (.env):**

```bash
# Core Configuration
HMAC_SECRET=test-secret-key-strong-32chars
PORT=3001
BACKEND_URL=http://localhost:3001
NODE_ENV=development

# Google Sheets (REQUIRED)
GOOGLE_SERVICE_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_ID=your-google-sheet-id

# Tenant Registry (Multi-tenant support)
TENANT_REGISTRY_JSON={"proofkit":"your-google-sheet-id","demo-store":"your-demo-sheet-id"}

# AI (Optional - enables content generation)
AI_PROVIDER=google
GOOGLE_API_KEY=your-gemini-api-key
AI_MODEL=gemini-1.5-flash

# CORS & Security
ALLOWED_ORIGINS=http://localhost:3000,https://admin.shopify.com
RATE_LIMIT_PER_MIN=60

# Shopify (for embedded app)
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-secret
SHOPIFY_APP_URL=http://localhost:3000
```

**Shopify UI (.env):**

```bash
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-secret
SCOPES=read_products,write_products,read_customers,read_orders
BACKEND_URL=http://localhost:3001
```

---

## SECTION 1: Environment Setup Tests

### 1.1 Backend Startup Verification

**Steps:**

1. Install dependencies:

   ```bash
   cd /Users/tamsar/Downloads/proofkit-saas/backend
   npm install
   ```

2. Start backend server:

   ```bash
   npm run dev
   ```

3. Verify startup logs show:
   ```
   ✅ Environment configuration loaded successfully
   🔧 Tenant registry initialized with X tenants
   📊 Health service initialized
   🚀 Backend server running on port 3001
   ```

**Expected Results:**

- Server starts without errors
- Port 3001 is accessible
- No missing environment variable warnings

**Validation Commands:**

```bash
# Health check
curl -s http://localhost:3001/health | jq

# Expected: {"status":"healthy","uptime":X,"checks":{...}}

# Diagnostics
curl -s http://localhost:3001/api/diagnostics | jq

# Expected: {"status":"ok","environment":"development","services":{...}}
```

**Common Issues & Fixes:**

- **Google Sheets auth error**: Check `GOOGLE_SERVICE_EMAIL` and `GOOGLE_PRIVATE_KEY` format
- **Port already in use**: Kill existing processes: `lsof -ti:3001 | xargs kill`
- **Missing HMAC_SECRET**: Must be at least 32 characters

### 1.2 Frontend Startup Verification

**Steps:**

1. Install dependencies:

   ```bash
   cd /Users/tamsar/Downloads/proofkit-saas/shopify-ui
   npm install
   ```

2. Start frontend:

   ```bash
   npm run dev
   ```

3. Verify startup logs show:
   ```
   💿 Building...
   💿 Built in Xms
   Remix App Server started at http://localhost:3000
   ```

**Expected Results:**

- Frontend starts on port 3000
- No TypeScript compilation errors
- Can reach http://localhost:3000

**Validation:**

- Open browser to `http://localhost:3000`
- Should see Shopify app interface (may show authentication required)

### 1.3 Environment Variable Validation

**Steps:**

1. Test backend config endpoint:

   ```bash
   curl -s "http://localhost:3001/api/config" \
     -H "X-Shop: proofkit" \
     -H "Content-Type: application/json"
   ```

2. Verify response contains:
   ```json
   {
     "config": {
       "tenant": "proofkit",
       "sheetId": "your-sheet-id",
       "environment": "development"
     }
   }
   ```

**Expected Results:**

- Tenant detection works
- Google Sheets connection established
- Configuration loaded properly

---

## SECTION 2: Shopify Integration Tests

### 2.1 App Installation Process

**Steps:**

1. Set up Shopify Partner account and test store
2. Create app with ngrok tunnel:

   ```bash
   # Install ngrok if not present
   npm install -g ngrok

   # Tunnel backend
   ngrok http 3001 &

   # Tunnel frontend
   ngrok http 3000 &
   ```

3. Configure Shopify app URLs:
   - App URL: `https://your-ngrok-frontend.ngrok.io`
   - Allowed redirection URLs: `https://your-ngrok-frontend.ngrok.io/auth/callback`

4. Install app in test store

**Expected Results:**

- OAuth flow completes successfully
- App appears in Shopify admin
- No authentication errors

**Validation:**

- Check Shopify app admin shows "Connected"
- Verify session data in browser dev tools

### 2.2 Shop Parameter Detection

**Steps:**

1. Access app with shop parameter:

   ```
   http://localhost:3000/app?shop=test-store.myshopify.com
   ```

2. Open browser dev tools and check:
   - URL contains shop parameter
   - Console shows tenant detection logs
   - Cookie/localStorage contains shop name

**Expected Results:**

- Shop parameter detected: `🔍 Detected shop: test-store`
- Tenant routing to correct Google Sheet
- Shop name persisted in UI

**Validation:**

- Check network tab for backend calls include shop header
- Verify `X-Shop: test-store` in request headers

### 2.3 Multi-Tenant Routing

**Steps:**

1. Test with different shop parameters:

   ```bash
   # Test shop A
   curl -s "http://localhost:3001/api/config" -H "X-Shop: shop-a"

   # Test shop B
   curl -s "http://localhost:3001/api/config" -H "X-Shop: shop-b"
   ```

2. Verify different tenant configs returned

**Expected Results:**

- Different tenants get isolated data
- Correct Google Sheet ID for each tenant
- No data bleeding between tenants

---

## SECTION 3: Google Sheets Tests

### 3.1 Initial Sheet/Tab Creation

**Steps:**

1. Test sheet initialization:

   ```bash
   curl -X POST "http://localhost:3001/api/ensureAudienceTabs" \
     -H "X-Shop: proofkit" \
     -H "Content-Type: application/json"
   ```

2. Check Google Sheet manually:
   - Open your Google Sheet
   - Verify tabs are created: `CONFIG`, `AUDIENCES`, `CAMPAIGNS`, `RUN_LOGS`

**Expected Results:**

- All required tabs created
- Headers populated correctly
- No permission errors

**Validation:**

- Console logs: `✅ Created sheet "CONFIG" successfully`
- Google Sheet has proper structure

### 3.2 Data Read/Write Operations

**Steps:**

1. Write test configuration:

   ```bash
   curl -X POST "http://localhost:3001/api/config" \
     -H "X-Shop: proofkit" \
     -H "Content-Type: application/json" \
     -d '{"budget_cap": 100, "cpc_ceiling": 0.50}'
   ```

2. Read configuration back:

   ```bash
   curl -s "http://localhost:3001/api/config" -H "X-Shop: proofkit"
   ```

3. Check Google Sheet manually to verify data written

**Expected Results:**

- Data written to CONFIG tab
- Read operation returns same data
- Proper error handling if sheet access fails

### 3.3 Connection Pool Functionality

**Steps:**

1. Make multiple concurrent requests:

   ```bash
   # Run 5 concurrent requests
   for i in {1..5}; do
     curl -s "http://localhost:3001/api/config" -H "X-Shop: proofkit" &
   done
   wait
   ```

2. Check backend logs for connection pooling:
   ```
   📊 Sheets pool: active=3, queued=0, total=5
   🔄 Connection reused for tenant: proofkit
   ```

**Expected Results:**

- No connection errors
- Pool manages connections efficiently
- Rate limiting prevents API quota exhaustion

---

## SECTION 4: Core Feature Tests

### 4.1 Advanced Settings Configuration

**Steps:**

1. Access Advanced page: `http://localhost:3000/app/advanced`

2. Test configuration form:
   - Budget Cap: Enter `$150`
   - CPC Ceiling: Enter `$0.75`
   - Schedule: Select time range
   - Click "Save Configuration"

3. Verify data persistence:
   - Refresh page
   - Settings should be preserved
   - Check Google Sheets CONFIG tab

**Expected Results:**

- Form saves without errors
- Data persists across page refreshes
- Values appear in Google Sheets
- Shop parameter maintained in URL

**Screenshots to Validate:**

- Form with populated values
- Success message after save
- Google Sheets CONFIG tab with data

### 4.2 AI Integration (Content Generation)

**Steps:**

1. Test AI writer endpoint:

   ```bash
   curl -X POST "http://localhost:3001/api/jobs/ai_writer" \
     -H "X-Shop: proofkit" \
     -H "Content-Type: application/json" \
     -d '{
       "product_name": "Running Shoes",
       "target_audience": "fitness enthusiasts",
       "prompt_type": "rsa"
     }'
   ```

2. Check response contains:
   - Headlines (30 chars max)
   - Descriptions (90 chars max)
   - Proper character count validation

**Expected Results:**

- AI generates valid RSA content
- Character limits enforced
- Content quality appropriate

**Validation:**

```bash
# Check drafts created
curl -s "http://localhost:3001/api/insights" -H "X-Shop: proofkit" | jq '.drafts'
```

### 4.3 Google Ads Script Generation

**Steps:**

1. Test script generation:

   ```bash
   curl -s "http://localhost:3001/api/generate-script" \
     -H "X-Shop: proofkit" \
     -H "Content-Type: application/json"
   ```

2. Verify script contains:
   - Budget management code
   - CPC ceiling logic
   - Schedule restrictions
   - Safety checks

**Expected Results:**

- Valid Google Ads script generated
- All configured limits included
- Idempotency checks present

### 4.4 Automation Triggers

**Steps:**

1. Set promote window:

   ```bash
   curl -X POST "http://localhost:3001/api/promote/window" \
     -H "X-Shop: proofkit" \
     -H "Content-Type: application/json" \
     -d '{
       "start_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
       "duration_minutes": 60,
       "budget_cap": 50
     }'
   ```

2. Check promote gate status:
   ```bash
   curl -s "http://localhost:3001/api/promote/gate/status" \
     -H "X-Shop: proofkit"
   ```

**Expected Results:**

- Promote window activated
- Time-based automation enabled
- Safety limits enforced

---

## SECTION 5: End-to-End Tests

### 5.1 Complete User Workflow

**Test the full merchant journey:**

1. **Shop Setup**
   - Access: `http://localhost:3000/app/advanced?shop=test-store.myshopify.com`
   - Verify shop banner shows if first time
   - Complete shop name setup

2. **Configuration**
   - Set budget cap: $100
   - Set CPC ceiling: $0.50
   - Set schedule: 9 AM - 5 PM
   - Save and verify persistence

3. **Content Creation**
   - Navigate to insights: `http://localhost:3000/app/insights`
   - Generate AI drafts (if AI enabled)
   - Review generated content

4. **Audience Setup**
   - Access audience export: `http://localhost:3000/app/audiences`
   - Create test audience
   - Verify CSV export works

5. **Script Generation**
   - Generate Google Ads script
   - Verify all settings included
   - Test idempotency (run twice, should be no-op)

6. **Go Live**
   - Set promote window
   - Activate automation
   - Monitor run logs

**Validation Checklist:**

- [ ] Shop parameter persisted throughout
- [ ] All data saved to correct Google Sheet
- [ ] No errors in browser console
- [ ] All API calls successful
- [ ] Configuration survives page refreshes

### 5.2 Data Flow Validation

**Steps:**

1. Complete workflow above
2. Verify data in Google Sheets:
   - CONFIG tab has all settings
   - AUDIENCES tab has audience data
   - RUN_LOGS tab shows activity
   - No duplicate entries

3. Test data isolation:
   - Run workflow with different shop parameter
   - Verify data doesn't mix between tenants

**Expected Results:**

- Clean data flow from UI → API → Google Sheets
- Multi-tenant isolation working
- Audit trail in run logs

### 5.3 Error Handling Validation

**Test error scenarios:**

1. **Google Sheets Unavailable**
   - Temporarily break Sheets credentials
   - Verify graceful error messages
   - No app crashes

2. **Invalid Shop Parameter**
   - Use malformed shop name
   - Verify proper validation
   - Fallback to default tenant

3. **API Rate Limits**
   - Make many rapid requests
   - Verify rate limiting works
   - No service degradation

4. **AI Service Unavailable**
   - Remove AI API key
   - Test content generation
   - Verify fallback behavior

---

## SECTION 6: Performance & Data Validation

### 6.1 Loading Performance

**Steps:**

1. Measure page load times:

   ```bash
   curl -o /dev/null -s -w "%{time_total}" \
     "http://localhost:3000/app/advanced?shop=test-store"
   ```

2. Test API response times:
   ```bash
   curl -o /dev/null -s -w "%{time_total}" \
     "http://localhost:3001/api/config" -H "X-Shop: test-store"
   ```

**Expected Results:**

- Page loads < 2 seconds
- API responses < 500ms
- No memory leaks

### 6.2 Data Persistence Verification

**Complete Data Integrity Test:**

1. Configure all settings in Advanced page
2. Create audiences and content
3. Restart both backend and frontend servers
4. Verify all data still present

**Validation:**

- Settings preserved after restart
- Google Sheets data intact
- No data corruption

---

## SECTION 7: Security & Edge Cases

### 7.1 HMAC Validation

**Steps:**

1. Test with invalid HMAC:
   ```bash
   curl -X POST "http://localhost:3001/api/config" \
     -H "X-Shop: proofkit" \
     -H "X-Shopify-Hmac-Sha256: invalid" \
     -d '{}'
   ```

**Expected Results:**

- Request rejected with 403 Forbidden
- No data modification allowed

### 7.2 Input Validation

**Test edge cases:**

1. Very long shop names
2. Special characters in parameters
3. Malformed JSON requests
4. XSS attempts in form fields

**Expected Results:**

- Proper validation and sanitization
- No crashes or data corruption
- Clear error messages

---

## SUCCESS CRITERIA CHECKLIST

### Environment Setup ✅

- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] All environment variables loaded
- [ ] Health checks pass
- [ ] Google Sheets connection works

### Shopify Integration ✅

- [ ] OAuth flow completes
- [ ] Shop parameter detection works
- [ ] Multi-tenant routing functional
- [ ] Session management works

### Core Features ✅

- [ ] Advanced settings save/load
- [ ] AI content generation (if enabled)
- [ ] Google Ads script generation
- [ ] Audience management
- [ ] Promote window automation

### Data & Persistence ✅

- [ ] Google Sheets read/write
- [ ] Configuration persistence
- [ ] Multi-tenant data isolation
- [ ] Audit logging

### Performance & Reliability ✅

- [ ] Page loads < 2 seconds
- [ ] API responses < 500ms
- [ ] Connection pooling works
- [ ] No memory leaks
- [ ] Error handling graceful

### End-to-End ✅

- [ ] Complete user workflow successful
- [ ] Data survives server restart
- [ ] No console errors
- [ ] All features accessible

---

## Troubleshooting Guide

### Common Issues

**"Cannot connect to Google Sheets"**

- Check service account credentials
- Verify Sheet ID is correct
- Ensure sheet is shared with service account

**"Shop parameter not detected"**

- Check URL contains `?shop=` parameter
- Verify cookies/localStorage in browser
- Check tenant routing logs

**"HMAC validation failed"**

- Verify HMAC_SECRET is set correctly
- Check Shopify webhook configuration
- Ensure content-type headers correct

**"AI content generation failed"**

- Check GOOGLE_API_KEY is valid
- Verify AI_PROVIDER is set to 'google'
- Check rate limits not exceeded

### Debug Commands

```bash
# Check backend status
curl -s http://localhost:3001/api/diagnostics | jq

# Check tenant configuration
curl -s "http://localhost:3001/api/config" -H "X-Shop: YOUR_SHOP"

# Test Google Sheets connection
curl -X POST http://localhost:3001/api/ensureAudienceTabs -H "X-Shop: YOUR_SHOP"

# Check promote gate status
curl -s "http://localhost:3001/api/promote/gate/status" -H "X-Shop: YOUR_SHOP"
```

---

## Final Validation

Upon completing all tests, you should have:

1. ✅ **Fully functional ProofKit SaaS application**
2. ✅ **Shopify integration working end-to-end**
3. ✅ **Multi-tenant data isolation verified**
4. ✅ **Google Sheets integration validated**
5. ✅ **All core features tested and working**
6. ✅ **Performance meets requirements**
7. ✅ **Error handling graceful and user-friendly**
8. ✅ **Complete audit trail in Google Sheets**

The application is ready for production deployment when all sections pass validation.
