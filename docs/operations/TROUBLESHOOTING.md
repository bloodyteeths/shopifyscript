# ProofKit SaaS Troubleshooting Guide

Comprehensive troubleshooting guide for diagnosing and resolving issues in ProofKit SaaS production environments.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Authentication Problems](#authentication-problems)
4. [Google Services Issues](#google-services-issues)
5. [Performance Problems](#performance-problems)
6. [API Endpoint Failures](#api-endpoint-failures)
7. [Docker & Container Issues](#docker--container-issues)
8. [Database Problems](#database-problems)
9. [Security & Compliance](#security--compliance)
10. [Monitoring & Alerts](#monitoring--alerts)
11. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostics

### Health Check Commands

Run these commands first to get a quick overview of system status:

```bash
# 1. Check application health
curl -f http://localhost:3001/health

# 2. Check container status
docker-compose -f docker-compose.prod.yml ps

# 3. Check recent logs
docker-compose -f docker-compose.prod.yml logs --tail=50 app

# 4. Check system resources
docker stats --no-stream

# 5. Check detailed diagnostics
curl -s http://localhost:3001/api/diagnostics | jq
```

### System Status Overview

```bash
#!/bin/bash
# Quick system status script

echo "=== ProofKit System Status ==="
echo "Time: $(date)"
echo ""

# Container status
echo "🐳 Container Status:"
docker-compose -f /opt/proofkit/docker-compose.prod.yml ps

# Health checks
echo -e "\n🏥 Health Checks:"
curl -f -s http://localhost:3001/health > /dev/null && echo "✅ Health: OK" || echo "❌ Health: FAIL"
curl -f -s http://localhost:3001/ready > /dev/null && echo "✅ Ready: OK" || echo "❌ Ready: FAIL"
curl -f -s http://localhost:3001/live > /dev/null && echo "✅ Live: OK" || echo "❌ Live: FAIL"

# Resource usage
echo -e "\n💾 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Recent errors
echo -e "\n🚨 Recent Errors (last 10):"
docker-compose -f /opt/proofkit/docker-compose.prod.yml logs app 2>&1 | grep -i error | tail -10
```

## Common Issues

### 1. Application Won't Start

**Symptoms:**
- Container exits immediately
- Health checks fail
- Port binding errors

**Diagnosis:**
```bash
# Check container logs
docker-compose logs app

# Check for port conflicts
sudo netstat -tulpn | grep :3001

# Verify environment variables
docker-compose config

# Check file permissions
ls -la /opt/proofkit/
```

**Solutions:**

**A. Port Already in Use**
```bash
# Find process using port
sudo lsof -i :3001

# Kill conflicting process
sudo kill -9 <PID>

# Or change port in .env
PORT=3002
```

**B. Missing Environment Variables**
```bash
# Verify required variables
grep -E "^(NODE_ENV|HMAC_SECRET|GOOGLE_)" .env

# Check for missing quotes in multiline values
cat .env | grep -A5 -B5 "PRIVATE_KEY"
```

**C. Permission Issues**
```bash
# Fix ownership
sudo chown -R $USER:$USER /opt/proofkit

# Fix secrets permissions
sudo chmod 600 /opt/proofkit/secrets/*
```

### 2. High Memory Usage

**Symptoms:**
- Container OOMKilled
- Slow response times
- Memory warnings in logs

**Diagnosis:**
```bash
# Monitor memory usage
docker stats proofkit-app

# Check Node.js heap usage
curl -s http://localhost:3001/metrics | grep nodejs_heap

# Analyze memory leaks
docker exec -it proofkit-app node -e "console.log(process.memoryUsage())"
```

**Solutions:**

**A. Increase Container Limits**
```yaml
# In docker-compose.prod.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

**B. Optimize Application**
```bash
# Enable garbage collection logs
NODE_OPTIONS="--max-old-space-size=1024 --gc-interval=100"

# Clear caches periodically
curl -X POST http://localhost:3001/api/internal/clear-cache
```

### 3. Database Connection Issues

**Symptoms:**
- "no_sheets" errors
- Authentication failures
- Timeout errors

**Diagnosis:**
```bash
# Test Google Sheets connection
curl -s http://localhost:3001/api/diagnostics | jq '.sheets_ok'

# Check service account email
grep GOOGLE_SHEETS_CLIENT_EMAIL .env

# Verify private key format
grep -c "BEGIN PRIVATE KEY" .env
```

**Solutions:**

**A. Invalid Service Account**
```bash
# Verify service account exists in Google Cloud Console
# Check if service account has Sheets API enabled
# Ensure spreadsheet is shared with service account email
```

**B. Malformed Private Key**
```bash
# Private key should be properly escaped
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Verify line breaks are \n not actual newlines
```

## Authentication Problems

### HMAC Authentication Failures

**Symptoms:**
- 403 "invalid signature" errors
- Authentication intermittently fails
- Clock sync issues

**Diagnosis:**
```bash
# Test HMAC generation
node -e "
const crypto = require('crypto');
const secret = 'your-hmac-secret';
const payload = 'GET:TENANT_123:config';
const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64').replace(/=+$/, '');
console.log('Signature:', sig);
"

# Check server time
date
curl -s http://localhost:3001/api/config/echo?tenant=TEST&sig=INVALID | jq '.ip'
```

**Solutions:**

**A. Clock Synchronization**
```bash
# Sync system clock
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd

# Verify timezone
timedatectl status
```

**B. Secret Key Issues**
```bash
# Ensure secret is at least 32 characters
echo -n "$HMAC_SECRET" | wc -c

# Regenerate secure secret
openssl rand -base64 32
```

**C. Payload Format**
```javascript
// Correct payload format
const payload = `${method}:${tenant}:${endpoint}:${nonce}`;

// For GET /api/config
const payload = `GET:TENANT_123:config`;

// For POST /api/metrics  
const payload = `POST:TENANT_123:metrics:${Date.now()}`;
```

## Google Services Issues

### 1. Sheets API Errors

**Common Error Codes:**

**403 Forbidden**
```bash
# Solution: Check sharing permissions
# 1. Open spreadsheet in browser
# 2. Click Share
# 3. Add service account email with Editor access
```

**404 Not Found**
```bash
# Solution: Verify SHEET_ID
SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz  # Extract from URL

# Test sheet access
curl "https://docs.google.com/spreadsheets/d/$SHEET_ID/edit"
```

**429 Rate Limited**
```bash
# Solution: Implement exponential backoff
# Check quota in Google Cloud Console
# Consider upgrading API limits
```

### 2. Gemini AI Failures

**Symptoms:**
- AI drafts not generating
- "ai_not_configured" warnings
- API key errors

**Diagnosis:**
```bash
# Test AI configuration
curl -s http://localhost:3001/api/diagnostics | jq '.ai_ready'

# Verify API key format
echo $GEMINI_API_KEY | grep -E "^AIza"

# Check quota usage
# Visit Google Cloud Console > Gemini API > Quotas
```

**Solutions:**

**A. Invalid API Key**
```bash
# Generate new API key in Google Cloud Console
# Format: AIzaSyD...
GEMINI_API_KEY=AIzaSyD1234567890abcdef

# Test key validity
curl -X POST \
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

**B. Quota Exceeded**
```bash
# Check current usage
# Implement request throttling
# Consider upgrading quota limits
```

## Performance Problems

### 1. Slow API Responses

**Diagnosis:**
```bash
# Test response times
time curl -s http://localhost:3001/api/insights?tenant=TEST&sig=SIG

# Check active connections
ss -tuln | grep :3001

# Monitor event loop lag
curl -s http://localhost:3001/metrics | grep nodejs_eventloop_lag
```

**Solutions:**

**A. Database Optimization**
```bash
# Enable query caching
INSIGHTS_CACHE_TTL_SEC=300
CONFIG_CACHE_TTL_SEC=60

# Optimize sheet size
# Archive old data to separate sheets
```

**B. Connection Pooling**
```javascript
// Increase connection limits
app.set('trust proxy', true);
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
```

### 2. High CPU Usage

**Diagnosis:**
```bash
# Check CPU usage patterns
docker stats proofkit-app

# Profile Node.js process
docker exec -it proofkit-app node --prof server.js

# Analyze CPU usage
curl -s http://localhost:3001/metrics | grep process_cpu
```

**Solutions:**

**A. Optimize Event Loop**
```javascript
// Add process monitoring
setInterval(() => {
  const usage = process.cpuUsage();
  console.log('CPU Usage:', usage);
}, 30000);
```

**B. Load Balancing**
```yaml
# Scale horizontally
docker-compose up -d --scale app=3

# Add load balancer
# Configure Nginx upstream with multiple backends
```

## API Endpoint Failures

### 1. 404 Not Found Errors

**Diagnosis:**
```bash
# Check route registration
curl -s http://localhost:3001/nonexistent | jq

# Verify endpoint exists
grep -r "app.get.*insights" backend/

# Check middleware ordering
```

**Solutions:**
```javascript
// Ensure proper route order
app.use('/api', routes);
app.use('*', notFoundHandler);  // This should be last
```

### 2. 500 Internal Server Errors

**Diagnosis:**
```bash
# Check error logs
docker-compose logs app | grep -A5 -B5 "500"

# Enable debug logging
DEBUG=true docker-compose restart app

# Check uncaught exceptions
curl -s http://localhost:3001/api/diagnostics | jq '.errors'
```

**Solutions:**

**A. Error Handling**
```javascript
// Add proper error boundaries
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});
```

**B. Validation Issues**
```javascript
// Add input validation
const { body, validationResult } = require('express-validator');

app.post('/api/metrics', [
  body('nonce').isNumeric(),
  body('metrics').isArray()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }
});
```

## Docker & Container Issues

### 1. Container Build Failures

**Symptoms:**
- Docker build fails
- Missing dependencies
- Permission denied errors

**Diagnosis:**
```bash
# Build with verbose output
docker build --no-cache --progress=plain .

# Check Dockerfile syntax
docker build --dry-run .

# Verify base image
docker pull node:18-alpine
```

**Solutions:**

**A. Dependencies Issues**
```dockerfile
# Clear npm cache
RUN npm cache clean --force

# Use specific Node version
FROM node:18.17.0-alpine

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++
```

**B. Permission Problems**
```dockerfile
# Create user correctly
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proofkit -u 1001 -G nodejs

# Set ownership
COPY --chown=proofkit:nodejs . .
```

### 2. Volume Mount Issues

**Diagnosis:**
```bash
# Check volume permissions
docker exec -it proofkit-app ls -la /app/logs

# Verify volume creation
docker volume ls | grep proofkit

# Check mount points
docker inspect proofkit-app | jq '.[0].Mounts'
```

**Solutions:**
```bash
# Fix volume permissions
docker exec -it proofkit-app chown -R proofkit:nodejs /app/logs

# Recreate volumes if needed
docker-compose down -v
docker-compose up -d
```

## Database Problems

### 1. Sheet Schema Issues

**Symptoms:**
- Missing columns
- Data type mismatches
- Header row problems

**Diagnosis:**
```bash
# Check sheet structure
curl -s "http://localhost:3001/api/config?tenant=TEST&sig=SIG" | jq '.config'

# Verify required sheets exist
# Check Google Sheets directly
```

**Solutions:**

**A. Recreate Sheets**
```bash
# Delete and recreate problematic sheets
# Application will auto-create with correct schema

# Or manually fix headers:
# METRICS: date,level,campaign,ad_group,id,name,clicks,cost,conversions,impr,ctr
# SEARCH_TERMS: date,campaign,ad_group,search_term,clicks,cost,conversions
```

**B. Data Migration**
```javascript
// Backup data before schema changes
const backup = await sheet.getRows();

// Clear and recreate with new schema
await sheet.clearRows();
await sheet.setHeaderRow(newHeaders);

// Migrate data with transformation
const transformedData = backup.map(transformRow);
await sheet.addRows(transformedData);
```

### 2. Data Corruption

**Diagnosis:**
```bash
# Check for invalid data
curl -s "http://localhost:3001/api/insights/debug?tenant=TEST&sig=SIG" | jq

# Look for parsing errors in logs
docker-compose logs app | grep -i "parse\|invalid\|NaN"
```

**Solutions:**

**A. Data Validation**
```javascript
// Add data validation
function validateMetrics(data) {
  return data.filter(row => {
    return row.clicks >= 0 && 
           row.cost >= 0 && 
           !isNaN(Date.parse(row.date));
  });
}
```

**B. Data Cleanup**
```bash
# Remove invalid rows
# Fix date formats
# Ensure numeric fields are properly typed
```

## Security & Compliance

### 1. GDPR Compliance Issues

**Symptoms:**
- Data retention violations
- Missing consent records
- Incomplete deletion

**Diagnosis:**
```bash
# Check retention compliance
curl -s "http://localhost:3001/api/privacy/retention-compliance?tenant=TEST&sig=SIG" | jq

# Verify consent records
curl -s "http://localhost:3001/api/privacy/processing-log?tenant=TEST&sig=SIG" | jq
```

**Solutions:**

**A. Automated Cleanup**
```bash
# Enable automated data cleanup
curl -X POST "http://localhost:3001/api/privacy/cleanup?tenant=TEST&sig=SIG" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

**B. Consent Management**
```javascript
// Ensure proper consent recording
await privacyService.recordConsent(userId, {
  analytics: true,
  marketing: false,
  functional: true,
  consent_version: "2.0",
  timestamp: new Date().toISOString()
});
```

### 2. Security Vulnerabilities

**Diagnosis:**
```bash
# Security audit
npm audit

# Check dependencies
docker run --rm -v "$PWD:/app" -w /app node:18-alpine npm audit --audit-level high

# Test security headers
curl -I https://api.yourdomain.com/health
```

**Solutions:**

**A. Update Dependencies**
```bash
# Update packages
npm update
npm audit fix

# Rebuild containers
docker-compose build --no-cache
```

**B. Security Headers**
```nginx
# In Nginx configuration
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## Monitoring & Alerts

### 1. Missing Metrics

**Diagnosis:**
```bash
# Check metrics endpoint
curl -s http://localhost:3001/metrics

# Verify Prometheus scraping
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "proofkit-api")'

# Check metric collection
docker-compose logs prometheus | grep proofkit
```

**Solutions:**

**A. Metrics Configuration**
```javascript
// Ensure metrics are enabled
process.env.ENABLE_METRICS = 'true';

// Register custom metrics
const promClient = require('prom-client');
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});
```

### 2. Alert Fatigue

**Solutions:**
```yaml
# Optimize alert rules in prometheus.yml
groups:
  - name: proofkit-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        annotations:
          summary: "High error rate detected"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{name="proofkit-app"} / container_spec_memory_limit_bytes > 0.8
        for: 5m
        annotations:
          summary: "Memory usage above 80%"
```

## Emergency Procedures

### 1. Service Outage

**Immediate Actions (2-5 minutes):**

```bash
# 1. Check service status
curl -f http://localhost:3001/health || echo "Service DOWN"

# 2. Quick restart
docker-compose restart app

# 3. Check logs for immediate errors
docker-compose logs --tail=20 app | grep -i error

# 4. Verify external dependencies
curl -s "https://sheets.googleapis.com/v4/spreadsheets/test" || echo "Sheets API issue"
```

**Escalation Actions (5-15 minutes):**

```bash
# 1. Scale horizontally if possible
docker-compose up -d --scale app=2

# 2. Rollback to previous version
docker-compose down
docker-compose up -d proofkit-saas:previous-tag

# 3. Check resource constraints
df -h
free -m
docker system df
```

### 2. Data Loss Prevention

**Immediate Backup:**
```bash
# Emergency backup
./scripts/backup.sh emergency

# Export critical data
curl -s "http://localhost:3001/api/export/emergency" > emergency-export.json

# Snapshot volumes
docker run --rm \
  -v proofkit-saas_app-logs:/source \
  -v /emergency-backup:/backup \
  alpine:latest \
  cp -r /source/* /backup/
```

### 3. Security Incident

**Immediate Response:**
```bash
# 1. Isolate service
docker-compose down

# 2. Block suspicious IPs in firewall
sudo ufw deny from <suspicious-ip>

# 3. Rotate secrets
# Generate new HMAC secret
openssl rand -base64 32

# 4. Check access logs
grep -E "(429|403|404)" /var/log/nginx/access.log | tail -100

# 5. Audit recent changes
docker-compose logs --since="1h" app | grep -E "(POST|PUT|DELETE)"
```

## Contact Information

### Emergency Escalation

1. **Level 1 - Operations Team**
   - Email: ops@proofkit.net
   - Slack: #proofkit-ops
   - Response: 15 minutes

2. **Level 2 - Engineering Lead**
   - Email: engineering@proofkit.net
   - Phone: +1-555-PROOFKIT-ENG
   - Response: 30 minutes

3. **Level 3 - CTO/Emergency**
   - Email: emergency@proofkit.net  
   - Phone: +1-555-PROOFKIT-911
   - Response: 60 minutes

### External Services

- **Google Cloud Support**: https://cloud.google.com/support
- **Nginx Support**: Professional support if applicable
- **DNS Provider**: Contact your DNS provider
- **Hosting Provider**: Contact your hosting provider

### Documentation

- **Status Page**: https://status.proofkit.net
- **API Docs**: https://docs.proofkit.net
- **Internal Wiki**: https://wiki.proofkit.net
- **Incident Reports**: https://incidents.proofkit.net

---

**Remember**: Document all issues and resolutions in the incident response system for future reference and improvement.

**Document Version**: 1.0  
**Last Updated**: 2024-08-16  
**Next Review**: 2024-09-16