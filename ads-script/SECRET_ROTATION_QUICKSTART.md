# Secret Rotation Quick Reference

## Overview

This guide provides quick commands and examples for managing HMAC secret rotation for Google Ads Scripts.

---

## Prerequisites

- Admin access to backend
- ADMIN_KEY from backend `.env`
- Access to Google Ads Scripts
- HTTPS endpoint for all API calls

---

## Quick Start Commands

### 1. Generate New Secret

```bash
# Generate a secure 32-byte hex secret
openssl rand -hex 32

# Example output:
# 9b7e3f2a8c1d4e5f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f
```

### 2. Initiate Rotation

```bash
curl -X POST https://api.adsautopilot.net/api/secrets/rotate \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "tenantId": "myshop-prod-001",
    "expiryHours": 48
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Secret rotation initiated",
  "data": {
    "tenantId": "myshop-prod-001",
    "newVersion": "2",
    "newSecret": "9b7e3f2a8c1d4e5f...",
    "expiryTime": "2024-10-08T12:00:00Z",
    "instructions": [...]
  }
}
```

### 3. Check Rotation Status

```bash
curl -X GET "https://api.adsautopilot.net/api/secrets/status?tenantId=myshop-prod-001" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "myshop-prod-001",
    "status": "in_progress",
    "currentVersion": "1",
    "newVersion": "2",
    "timeRemaining": "47h 30m",
    "migrationProgress": "100%"
  }
}
```

### 4. Complete Rotation

```bash
curl -X POST https://api.adsautopilot.net/api/secrets/complete \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "tenantId": "myshop-prod-001",
    "confirmMigration": true
  }'
```

### 5. Rollback (if needed)

```bash
curl -X POST https://api.adsautopilot.net/api/secrets/rollback \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "tenantId": "myshop-prod-001",
    "reason": "Script authentication failures detected"
  }'
```

---

## Step-by-Step Rotation Process

### Phase 1: Initiate (5 minutes)

1. **Generate new secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Call rotation API:**
   ```bash
   curl -X POST https://api.adsautopilot.net/api/secrets/rotate \
     -H "Content-Type: application/json" \
     -H "X-Admin-Key: YOUR_ADMIN_KEY" \
     -d '{"tenantId": "myshop-prod-001", "expiryHours": 48}'
   ```

3. **Save the new secret** from response

### Phase 2: Backend Update (10 minutes)

1. **Update backend `.env`:**
   ```bash
   # Add new secret (keep old one)
   HMAC_SECRET=old_secret_here
   HMAC_SECRET_NEW=new_secret_here
   SECRET_VERSION_NEW=2
   ```

2. **Update backend code to accept both secrets** (if not already implemented)

3. **Restart backend:**
   ```bash
   pm2 restart ads-autopilot-backend
   # or
   systemctl restart ads-autopilot
   ```

4. **Verify backend health:**
   ```bash
   curl https://api.adsautopilot.net/api/health
   ```

### Phase 3: Script Update (5 minutes)

1. **Open Google Ads Script**
2. **Update configuration:**
   ```javascript
   var SHARED_SECRET  = 'NEW_SECRET_HERE';
   var SECRET_VERSION = '2';
   ```
3. **Save changes**
4. **Test with Preview** - verify no auth errors

### Phase 4: Monitor (24-48 hours)

1. **Check script executions:**
   - Google Ads > Scripts > Executions
   - Look for successful runs

2. **Monitor backend logs:**
   ```bash
   tail -f /var/log/ads-autopilot/backend.log | grep "authentication"
   ```

3. **Check rotation status periodically:**
   ```bash
   curl -X GET "https://api.adsautopilot.net/api/secrets/status?tenantId=myshop-prod-001" \
     -H "X-Admin-Key: YOUR_ADMIN_KEY"
   ```

### Phase 5: Complete (5 minutes)

1. **Verify all scripts migrated:**
   - Check status endpoint shows 100% migration
   - Review last 24 hours of script executions

2. **Complete rotation:**
   ```bash
   curl -X POST https://api.adsautopilot.net/api/secrets/complete \
     -H "Content-Type: application/json" \
     -H "X-Admin-Key: YOUR_ADMIN_KEY" \
     -d '{"tenantId": "myshop-prod-001", "confirmMigration": true}'
   ```

3. **Remove old secret from backend:**
   ```bash
   # Update .env
   HMAC_SECRET=new_secret_here  # Update to new secret
   # Remove these lines:
   # HMAC_SECRET_NEW=...
   # SECRET_VERSION_NEW=...
   ```

4. **Restart backend one final time**

---

## Automatic Rotation (Script-Side)

The Google Ads Script includes automatic rotation handling:

**When backend signals rotation:**
```json
{
  "config": { ... },
  "secret_rotation": {
    "new_secret": "9b7e3f2a...",
    "new_version": "2",
    "deadline": "2024-10-08T12:00:00Z"
  }
}
```

**Script automatically:**
1. Stores new secret in Script Properties
2. Retries failed auth with new secret
3. Migrates to new secret on success
4. Clears temporary storage

**Script logs will show:**
```
! Backend signaling secret rotation required
✓ New secret received and stored for rotation
! Authentication failed with primary secret, trying rotation
✓ Authentication successful with rotated secret
✓ Rotated secret cleared
```

---

## Troubleshooting

### Issue: Rotation API Returns 403

**Cause:** Invalid or missing ADMIN_KEY

**Solution:**
```bash
# Verify ADMIN_KEY in backend .env
echo $ADMIN_KEY

# Verify you're using correct key in request
curl ... -H "X-Admin-Key: CORRECT_KEY_HERE"
```

### Issue: Script Still Using Old Secret

**Cause:** Script not updated or cached

**Solution:**
1. Verify script code has new secret
2. Clear Script Properties:
   ```javascript
   PropertiesService.getScriptProperties().deleteAllProperties()
   ```
3. Re-run script with Preview

### Issue: Backend Accepts Neither Secret

**Cause:** Backend configuration error

**Solution:**
1. Check backend logs for HMAC validation errors
2. Verify `.env` has correct secrets
3. Restart backend: `pm2 restart ads-autopilot-backend`
4. Test with health endpoint

### Issue: Need to Rollback

**Symptoms:**
- Multiple script authentication failures
- Backend errors after rotation
- Data not syncing

**Solution:**
```bash
# Rollback rotation
curl -X POST https://api.adsautopilot.net/api/secrets/rollback \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "tenantId": "myshop-prod-001",
    "reason": "Multiple authentication failures"
  }'

# Revert script to old secret
# Revert backend .env to old secret
# Investigate root cause before retrying
```

---

## Security Best Practices

### Secret Generation

✅ **DO:**
- Use cryptographically secure random generators
- Generate minimum 32 bytes (64 hex characters)
- Use different secrets for prod/staging/dev

❌ **DON'T:**
- Use dictionary words or patterns
- Reuse secrets across environments
- Generate short secrets (<16 bytes)

### Secret Storage

✅ **DO:**
- Store in environment variables
- Use secret management services (AWS Secrets Manager, etc.)
- Encrypt secrets at rest

❌ **DON'T:**
- Commit secrets to git
- Share via email/Slack
- Store in plain text files

### Rotation Schedule

✅ **DO:**
- Rotate every 90 days (quarterly)
- Schedule during low-traffic periods
- Document rotation dates
- Test in staging first

❌ **DON'T:**
- Skip regular rotation
- Rotate during peak hours
- Rotate without monitoring
- Rush the process

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/secrets/rotate` | POST | Initiate rotation |
| `/api/secrets/status` | GET | Check rotation status |
| `/api/secrets/complete` | POST | Complete rotation |
| `/api/secrets/rollback` | POST | Rollback rotation |
| `/api/secrets/history` | GET | View rotation history |
| `/api/secrets/generate` | POST | Generate new secret |

**All endpoints require:** `X-Admin-Key` header

---

## Monitoring Queries

### Backend Logs

```bash
# View authentication attempts
tail -f backend.log | grep "Script authentication"

# View rotation events
tail -f backend.log | grep "Secret rotation"

# Count auth failures
grep "authentication failed" backend.log | wc -l
```

### Google Ads Script Logs

**Access:** Google Ads > Scripts > [Your Script] > Logs

**Look for:**
- ✓ Config loaded successfully
- ✓ Authentication successful with rotated secret
- ! Authentication failed messages

### Database Queries (if using Supabase)

```sql
-- Count successful script runs by version
SELECT
  secret_version,
  COUNT(*) as run_count,
  AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate
FROM script_executions
WHERE created_at > NOW() - INTERVAL '48 hours'
GROUP BY secret_version;
```

---

## Rotation Checklist

**Before Starting:**
- [ ] Generate new secure secret
- [ ] Schedule maintenance window (optional)
- [ ] Notify stakeholders (optional)
- [ ] Backup current configuration

**During Rotation:**
- [ ] Initiate rotation via API
- [ ] Update backend environment
- [ ] Restart backend services
- [ ] Update Google Ads Script
- [ ] Test script with Preview
- [ ] Monitor for 24-48 hours

**After Completion:**
- [ ] Complete rotation via API
- [ ] Remove old secret from backend
- [ ] Restart backend
- [ ] Verify script runs successfully
- [ ] Document new secret version
- [ ] Update rotation schedule

---

## Support

For issues during rotation:

1. **Check logs first** (backend and script)
2. **Review troubleshooting section** above
3. **Rollback if critical** (use rollback API)
4. **Contact backend administrator** for help

**Emergency Rollback:**
```bash
curl -X POST https://api.adsautopilot.net/api/secrets/rollback \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"tenantId": "YOUR_TENANT", "reason": "Emergency rollback"}'
```

---

**Version:** 1.0
**Last Updated:** 2024-10-06
