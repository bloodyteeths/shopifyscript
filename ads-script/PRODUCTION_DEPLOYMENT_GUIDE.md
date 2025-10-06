# Google Ads Script - Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Ads Autopilot AI Google Ads Script to production with proper configuration, security, and secret rotation.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Configuration](#backend-configuration)
3. [Script Configuration](#script-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Secret Rotation](#secret-rotation)
6. [Monitoring & Verification](#monitoring--verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Access

- **Google Ads Account** with Scripts access (standard or manager account)
- **Backend Access** to your Ads Autopilot AI backend
- **Admin Credentials** for secret management

### Required Information

Before deployment, gather the following:

```
TENANT_ID:       Your unique tenant identifier (e.g., 'myshop-prod-001')
BACKEND_URL:     Production backend URL (e.g., 'https://api.adsautopilot.net/api')
SHARED_SECRET:   32+ character HMAC secret for authentication
SECRET_VERSION:  Version number for secret tracking (start with '1')
```

### Generate Secure Secret

Generate a strong HMAC secret (minimum 32 characters):

```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Example output:**
```
f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5
```

---

## Backend Configuration

### 1. Update Backend Environment Variables

Add or update the following in your backend `.env` file:

```bash
# Backend Configuration
PORT=3001
BACKEND_URL=https://api.adsautopilot.net
BACKEND_PUBLIC_URL=https://api.adsautopilot.net/api

# Security - HMAC Secret
HMAC_SECRET=f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5

# Tenant Configuration
TENANT_ID=myshop-prod-001
TENANT_REGISTRY_JSON='{"myshop-prod-001":"YOUR_GOOGLE_SHEET_ID"}'

# Google Sheets API
GOOGLE_SHEETS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SHEET_ID=YOUR_GOOGLE_SHEET_ID
```

### 2. Verify Backend Health

Test your backend is accessible:

```bash
# Health check
curl https://api.adsautopilot.net/api/health

# Expected response:
# {"status":"healthy","timestamp":"2024-..."}
```

### 3. Configure Tenant Registry

Ensure your tenant is registered in the backend:

```javascript
// In backend/services/tenant-registry.js or via environment
{
  "myshop-prod-001": "YOUR_GOOGLE_SHEET_ID"
}
```

---

## Script Configuration

### 1. Choose Script File

You have two script options:

- **`GOOGLE_ADS_SCRIPT_FOR_UPLOAD.gs`** - Simplified version for basic deployment
- **`master.gs`** - Enhanced version with additional features (recommended)

Both scripts now include:
- Production-ready configuration placeholders
- Secret rotation mechanism
- Enhanced error handling and logging
- HMAC authentication with automatic failover

### 2. Configure Script Variables

Open your chosen script file and replace the placeholder values:

```javascript
// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES BEFORE DEPLOYMENT
// ============================================================================
var TENANT_ID      = 'myshop-prod-001';                                    // Your tenant ID
var BACKEND_URL    = 'https://api.adsautopilot.net/api';                  // Production backend URL
var SHARED_SECRET  = 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';  // HMAC secret
var SECRET_VERSION = '1';                                                  // Secret version
```

### 3. Validate Configuration

Before deployment, verify your configuration:

**Checklist:**
- [ ] `TENANT_ID` matches backend configuration
- [ ] `BACKEND_URL` is accessible and ends with `/api`
- [ ] `SHARED_SECRET` is the same value used in backend `.env`
- [ ] `SECRET_VERSION` is set (start with '1')
- [ ] All placeholder values (`__PLACEHOLDER__`) are replaced

---

## Deployment Steps

### Step 1: Access Google Ads Scripts

1. Log into your Google Ads account
2. Navigate to **Tools & Settings** > **Bulk Actions** > **Scripts**
3. Click the **+ (Plus)** button to create a new script

### Step 2: Upload Script

1. **Name your script**: `Ads Autopilot AI - Production`
2. **Delete** the default template code
3. **Copy and paste** your configured script (entire contents)
4. Click **Save**

### Step 3: Initial Test Run

Before scheduling, run a test:

1. Click **Preview** button
2. **Authorize** the script when prompted (first time only)
3. Review the **Logs** tab for output
4. Verify successful execution

**Expected log output:**
```
• Config loaded successfully
• Found X campaigns
• Collected X metric rows across all periods
✓ Ads Autopilot AI run complete
```

**If you see authentication errors:**
```
! Config fetch error: HTTP 401
```
→ Verify `TENANT_ID`, `BACKEND_URL`, and `SHARED_SECRET` match backend

### Step 4: Schedule Script

Once testing succeeds:

1. Click **Create Schedule**
2. **Recommended schedule:**
   - **Frequency**: Every 6 hours
   - **Times**: 12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM (account timezone)
3. **Enable email notifications** for failures
4. Click **Save**

### Step 5: Monitor First Scheduled Runs

Check the first few automated runs:

1. Go to **Scripts** > **Executions**
2. Review execution logs
3. Confirm data is flowing to backend
4. Check for any errors

---

## Secret Rotation

### Why Rotate Secrets?

Regular secret rotation is a security best practice that:
- Limits exposure from potential compromises
- Meets compliance requirements (PCI-DSS, SOC 2, etc.)
- Reduces impact of credential leaks

**Recommended rotation schedule**: Every 90 days (quarterly)

### How Secret Rotation Works

The script includes **zero-downtime secret rotation**:

1. **Backend signals rotation** needed (optional)
2. **Script receives new secret** from backend response
3. **Script stores new secret** in Script Properties
4. **Both secrets work** during transition period
5. **Script auto-migrates** to new secret on success
6. **Old secret deprecated** after migration

### Rotation Process

#### Backend Preparation

1. **Generate new secret:**

```bash
openssl rand -hex 32
# Output: 9b7e3f2a8c1d4e5f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f
```

2. **Update backend `.env`:**

```bash
# Keep old secret temporarily
HMAC_SECRET=f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5
HMAC_SECRET_NEW=9b7e3f2a8c1d4e5f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f
SECRET_VERSION_NEW=2
```

3. **Configure backend to accept both secrets** during transition

#### Script Update (Manual Method)

1. **Edit script in Google Ads:**
   - Navigate to Scripts
   - Open your production script
   - Update `SHARED_SECRET` and `SECRET_VERSION`

```javascript
var SHARED_SECRET  = '9b7e3f2a8c1d4e5f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f';  // NEW
var SECRET_VERSION = '2';  // INCREMENT
```

2. **Save and test** with Preview
3. **Verify** authentication succeeds

#### Automatic Rotation (Advanced)

The script supports automatic rotation via backend signaling:

1. **Backend sends rotation notification** in config response:

```json
{
  "config": { ... },
  "secret_rotation": {
    "new_secret": "9b7e3f2a8c1d4e5f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f",
    "new_version": "2",
    "deadline": "2024-12-31T23:59:59Z"
  }
}
```

2. **Script automatically:**
   - Stores new secret in Script Properties
   - Retries failed auth with new secret
   - Migrates to new secret on success
   - Logs rotation events

**Automatic rotation logs:**
```
! Backend signaling secret rotation required
✓ New secret received and stored for rotation
! Authentication failed with primary secret, trying rotation
✓ Authentication successful with rotated secret
✓ Rotated secret cleared
```

### Post-Rotation Verification

After rotation:

1. **Verify script runs successfully** with new secret
2. **Check logs** for rotation confirmation
3. **Remove old secret** from backend after 24-48 hours
4. **Update documentation** with new secret version

---

## Monitoring & Verification

### Key Metrics to Monitor

1. **Script Execution Success Rate**
   - Target: >95% success rate
   - Check: Google Ads Scripts > Executions

2. **Authentication Success**
   - Look for: No repeated 401/403 errors
   - Check: Script logs

3. **Data Synchronization**
   - Verify: Metrics appearing in backend
   - Check: Backend dashboard or database

4. **Performance**
   - Script runtime: <5 minutes typical
   - API calls: Monitor rate limits

### Log Indicators

**Healthy execution:**
```
• Config loaded successfully
• Found 12 campaigns
• Collected 245 metric rows across all periods
• RSAs created: 3
• Audience attach: 2 attached, 1 skipped, 0 errors
✓ Ads Autopilot AI run complete
```

**Issues requiring attention:**
```
! Config fetch error: HTTP 500          → Backend issue
! Authentication failed                 → Secret mismatch
! Backend post error                   → Network or backend issue
```

### Setting Up Alerts

Configure email alerts in Google Ads Scripts:

1. Go to Scripts > Settings
2. Enable **Email notifications for failures**
3. Add additional recipients (optional)
4. Set **Notification frequency**: Immediate

---

## Troubleshooting

### Common Issues

#### 1. Authentication Fails (HTTP 401/403)

**Symptoms:**
```
! Config fetch error: HTTP 401
! Authentication failed with primary secret
```

**Solutions:**
- Verify `TENANT_ID` matches backend configuration
- Confirm `SHARED_SECRET` is identical in script and backend `.env`
- Check `BACKEND_URL` is correct and includes `/api` suffix
- Ensure backend is running and accessible

**Test authentication:**
```bash
# Test backend authentication
curl -X GET "https://api.adsautopilot.net/api/config?tenant=myshop-prod-001&sig=TEST" \
  -H "X-Secret-Version: 1"
```

#### 2. Config Not Found (HTTP 404)

**Symptoms:**
```
CONFIG HTTP 404
Config disabled or not found
```

**Solutions:**
- Verify tenant is registered in `TENANT_REGISTRY_JSON`
- Check Google Sheet ID is correct
- Ensure backend can access Google Sheets
- Bootstrap config by calling `/config` endpoint

#### 3. Script Times Out

**Symptoms:**
```
Script exceeded maximum execution time
```

**Solutions:**
- Reduce `CHUNK` size in `postToBackend_()` (default 500)
- Optimize Google Ads account (reduce campaigns/ad groups)
- Split processing into multiple scheduled runs
- Enable caching in backend

#### 4. Secret Rotation Issues

**Symptoms:**
```
! Failed to store rotated secret
! Rotated secret not found
```

**Solutions:**
- Check Script Properties permissions
- Manually update script if auto-rotation fails
- Verify backend is sending rotation data correctly
- Clear cached properties: `PropertiesService.getScriptProperties().deleteAllProperties()`

#### 5. Data Not Appearing in Backend

**Symptoms:**
- Script runs successfully but no data in backend
- Metrics not updating

**Solutions:**
- Verify backend `/metrics` endpoint is accessible
- Check backend logs for errors
- Confirm Google Sheets permissions
- Test with Preview mode to check POST requests
- Verify network connectivity

### Debug Mode

Enable verbose logging:

```javascript
// Add to script configuration
var DEBUG_MODE = true;

// Add to log_ function
function log_(m) {
  Logger.log(m);
  if (DEBUG_MODE) {
    console.log(m);  // Additional console logging
  }
}
```

### Support Resources

- **Google Ads Scripts Documentation**: https://developers.google.com/google-ads/scripts
- **Backend API Documentation**: Contact your system administrator
- **HMAC Authentication**: https://tools.ietf.org/html/rfc2104

---

## Security Best Practices

### Do's ✓

- **Rotate secrets** every 90 days
- **Use environment-specific secrets** (prod, staging, dev)
- **Monitor script executions** regularly
- **Enable email alerts** for failures
- **Use strong secrets** (32+ characters, random)
- **Restrict script edit access** to authorized users only
- **Test changes** in Preview mode first
- **Keep backup** of script code

### Don'ts ✗

- **DON'T commit secrets** to version control
- **DON'T share secrets** via insecure channels (email, Slack)
- **DON'T use weak secrets** (dictionary words, patterns)
- **DON'T skip testing** before scheduling
- **DON'T ignore auth failures** - investigate immediately
- **DON'T modify running scripts** without testing

---

## Production Checklist

Before going live, verify:

- [ ] Backend is deployed and accessible
- [ ] HMAC secret is strong (32+ characters)
- [ ] Tenant is registered in backend
- [ ] Script configuration is correct
- [ ] Preview run succeeds without errors
- [ ] Authentication works (no 401/403 errors)
- [ ] Data appears in backend after test run
- [ ] Email alerts are configured
- [ ] Script schedule is set (every 6 hours recommended)
- [ ] Documentation is updated with configuration details
- [ ] Secret rotation schedule is documented
- [ ] Rollback plan is prepared

---

## Success Metrics

Your deployment is successful when:

- **Script execution success rate** >95%
- **Authentication success rate** >99%
- **Data synchronization** 100% (all runs sync data)
- **Average runtime** <5 minutes
- **Zero downtime** during secret rotation
- **Alerts functioning** (test by triggering error)

---

## Changelog

### Version 2.1.0 (Current)
- Added production-ready configuration with placeholders
- Implemented zero-downtime secret rotation
- Enhanced HMAC authentication with automatic failover
- Improved error handling and logging
- Added secret version tracking
- Updated User-Agent headers with version info

### Version 2.0.0
- Initial production release
- HMAC authentication
- Multi-tenant support
- Comprehensive error handling

---

## Contact & Support

For deployment assistance:

- **Technical Issues**: Review troubleshooting section above
- **Backend Issues**: Contact backend administrator
- **Security Questions**: Contact security team
- **Google Ads Issues**: Consult Google Ads support

---

**Document Version**: 2.1.0
**Last Updated**: 2024-10-06
**Maintained By**: Ads Autopilot AI Team
