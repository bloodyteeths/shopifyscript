# ProofKit SaaS Production Deployment Guide

Complete guide for deploying ProofKit SaaS to production with Docker, monitoring, and security best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Health Checks](#health-checks)
9. [Backup & Recovery](#backup--recovery)
10. [Production Checklist](#production-checklist)

## Prerequisites

### System Requirements

**Minimum Production Requirements:**

- **CPU**: 4 vCPUs
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **OS**: Ubuntu 22.04 LTS or CentOS 8+

**Recommended Production Requirements:**

- **CPU**: 8 vCPUs
- **RAM**: 16GB
- **Storage**: 200GB SSD with backup storage
- **Network**: Load balancer with SSL termination

### Software Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y git curl jq htop nginx certbot
```

### External Services Setup

1. **Google Cloud Platform**
   - Create service account with Sheets API access
   - Generate private key (JSON format)
   - Enable Google Sheets API

2. **Google Ads**
   - Developer token for API access
   - OAuth2 credentials
   - Manager account access

3. **Gemini AI** (Optional)
   - API key for content generation
   - Quota limits configured

## Environment Setup

### 1. Clone Repository

```bash
# Production deployment location
sudo mkdir -p /opt/proofkit
sudo chown $USER:$USER /opt/proofkit
cd /opt/proofkit

# Clone from your repository
git clone https://github.com/your-org/proofkit-saas.git .
```

### 2. Environment Configuration

Create production environment file:

```bash
cp .env.example .env
```

**Production `.env` Configuration:**

```bash
# === APPLICATION SETTINGS ===
NODE_ENV=production
PORT=3001
BACKEND_PUBLIC_URL=https://api.yourdomain.com

# === SECURITY ===
HMAC_SECRET=your-256-bit-secret-key-here-minimum-32-chars
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# === GOOGLE SERVICES ===
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=your-project-id
SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz

# === AI SERVICES (OPTIONAL) ===
AI_PROVIDER=google
GOOGLE_API_KEY=AIzaSyD...
GEMINI_API_KEY=AIzaSyD...

# === REDIS ===
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# === RATE LIMITING ===
RATE_LIMIT_MAX=100
INSIGHTS_CACHE_TTL_SEC=300
CONFIG_CACHE_TTL_SEC=60
RUNLOGS_CACHE_TTL_SEC=30

# === MONITORING ===
LOG_LEVEL=info
ENABLE_METRICS=true
HEALTH_CHECK_INTERVAL=30000

# === PERFORMANCE ===
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=65000

# === PRIVACY & COMPLIANCE ===
DATA_RETENTION_DAYS=365
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years
GDPR_ENABLED=true
```

### 3. Secrets Management

**Using Docker Secrets (Recommended):**

```bash
# Create secrets directory
sudo mkdir -p /opt/proofkit/secrets

# Store sensitive values as files
echo "your-hmac-secret" | sudo tee /opt/proofkit/secrets/hmac_secret
echo "your-google-private-key" | sudo tee /opt/proofkit/secrets/google_private_key
echo "your-redis-password" | sudo tee /opt/proofkit/secrets/redis_password

# Set proper permissions
sudo chmod 600 /opt/proofkit/secrets/*
sudo chown root:root /opt/proofkit/secrets/*
```

## Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/proofkit`:

```nginx
upstream proofkit_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Client Configuration
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    location / {
        proxy_pass http://proofkit_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint (no auth required)
    location /health {
        proxy_pass http://proofkit_backend;
        access_log off;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/proofkit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Database Setup

### Google Sheets Configuration

1. **Create Master Spreadsheet**

   ```bash
   # Use the provided sheet template or create new
   # Note the SHEET_ID from the URL
   ```

2. **Service Account Setup**

   ```bash
   # Share spreadsheet with service account email
   # Grant "Editor" permissions
   ```

3. **Database Schema Initialization**
   ```javascript
   // The application auto-creates required sheets:
   // - CONFIG_{tenant}
   // - METRICS_{tenant}
   // - SEARCH_TERMS_{tenant}
   // - RUN_LOGS_{tenant}
   // - AUDIENCE_SEGMENTS_{tenant}
   // - And others as needed
   ```

## Application Deployment

### 1. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      target: runtime
      args:
        NODE_ENV: production
    image: proofkit-saas:latest
    container_name: proofkit-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    ports:
      - "3001:3001"
    volumes:
      - app-logs:/app/logs
      - ./secrets:/run/secrets:ro
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: proofkit-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Optional: Monitoring Stack
  prometheus:
    image: prom/prometheus:latest
    container_name: proofkit-prometheus
    restart: unless-stopped
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"
      - "--web.enable-lifecycle"
    profiles:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: proofkit-grafana
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_admin_password
    profiles:
      - monitoring

volumes:
  app-logs:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  default:
    name: proofkit-network
```

### 2. Production Dockerfile

```dockerfile
# Multi-stage production build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production --omit=dev

# Copy source code
COPY . .

# Build optimizations
RUN npm run build 2>/dev/null || echo "No build step defined"

# Production runtime
FROM node:18-alpine AS runtime

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proofkit -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Copy application
COPY --from=builder --chown=proofkit:nodejs /app .

# Create log directory
RUN mkdir -p logs && chown proofkit:nodejs logs

# Switch to non-root user
USER proofkit

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "backend/server.js"]

EXPOSE 3001
```

### 3. Deploy Application

```bash
# Build and deploy
cd /opt/proofkit

# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs app
```

## Monitoring & Logging

### 1. Application Logging

Configure structured logging in production:

```javascript
// backend/services/logger.js
const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "proofkit-api" },
  transports: [
    new winston.transports.File({
      filename: "/app/logs/error.log",
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "/app/logs/combined.log",
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}
```

### 2. Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/proofkit << EOF
/opt/proofkit/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 proofkit proofkit
    postrotate
        docker-compose -f /opt/proofkit/docker-compose.prod.yml restart app
    endscript
}
EOF
```

### 3. Prometheus Metrics

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files: []

scrape_configs:
  - job_name: "proofkit-api"
    static_configs:
      - targets: ["app:3001"]
    metrics_path: "/metrics"
    scrape_interval: 30s

  - job_name: "redis"
    static_configs:
      - targets: ["redis:6379"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["host.docker.internal:9100"]
```

## Health Checks

### 1. Application Health Endpoints

The application provides multiple health check endpoints:

```bash
# Basic health check
curl -f http://localhost:3001/health

# Readiness check (dependencies)
curl -f http://localhost:3001/ready

# Liveness check
curl -f http://localhost:3001/live

# Detailed diagnostics
curl -s http://localhost:3001/api/diagnostics | jq
```

### 2. Monitoring Script

Create `/opt/proofkit/scripts/health-monitor.sh`:

```bash
#!/bin/bash

# Health monitoring script
LOG_FILE="/var/log/proofkit-health.log"
API_URL="http://localhost:3001"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_health() {
    local endpoint=$1
    local name=$2

    if curl -f -s --max-time 10 "$API_URL$endpoint" > /dev/null; then
        log "✓ $name check passed"
        return 0
    else
        log "✗ $name check failed"
        return 1
    fi
}

# Run health checks
check_health "/health" "Health"
check_health "/ready" "Readiness"
check_health "/live" "Liveness"

# Check Docker containers
if ! docker-compose -f /opt/proofkit/docker-compose.prod.yml ps | grep -q "Up"; then
    log "✗ Docker containers not running"
    exit 1
fi

log "✓ All health checks passed"
```

Add to crontab:

```bash
# Monitor every 5 minutes
*/5 * * * * /opt/proofkit/scripts/health-monitor.sh
```

## Backup & Recovery

### 1. Automated Backup Script

Create `/opt/proofkit/scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/proofkit"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup Docker volumes
docker run --rm \
  -v proofkit-saas_app-logs:/source/logs \
  -v proofkit-saas_redis-data:/source/redis \
  -v "$BACKUP_DIR:/backup" \
  alpine:latest \
  tar czf "/backup/proofkit_volumes_$DATE.tar.gz" -C /source .

# Backup configuration
tar czf "$BACKUP_DIR/proofkit_config_$DATE.tar.gz" \
  -C /opt/proofkit \
  .env docker-compose.prod.yml deployment/ monitoring/

# Google Sheets backup (export key data)
curl -s "http://localhost:3001/api/export/backup" \
  -H "Authorization: Bearer ${BACKUP_TOKEN}" \
  > "$BACKUP_DIR/sheets_export_$DATE.json"

# Cleanup old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

### 2. Recovery Procedures

**Complete System Recovery:**

```bash
# 1. Restore configuration
cd /opt/proofkit
tar xzf /opt/backups/proofkit/proofkit_config_YYYYMMDD_HHMMSS.tar.gz

# 2. Restore Docker volumes
docker run --rm \
  -v proofkit-saas_app-logs:/target/logs \
  -v proofkit-saas_redis-data:/target/redis \
  -v "/opt/backups/proofkit:/backup" \
  alpine:latest \
  tar xzf "/backup/proofkit_volumes_YYYYMMDD_HHMMSS.tar.gz" -C /target

# 3. Restart services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify recovery
curl -f http://localhost:3001/health
```

## Production Checklist

### Pre-Deployment

- [ ] Environment variables configured and secured
- [ ] SSL certificates obtained and configured
- [ ] Firewall rules configured
- [ ] Google Sheets access verified
- [ ] API keys validated and secured
- [ ] Backup procedures tested
- [ ] Monitoring configured

### Security

- [ ] HMAC secrets are cryptographically secure (32+ chars)
- [ ] All sensitive data in Docker secrets or encrypted storage
- [ ] Rate limiting configured (100 req/min default)
- [ ] CORS origins restricted to production domains
- [ ] Security headers configured in Nginx
- [ ] SSL/TLS properly configured (A+ rating)
- [ ] Input validation enabled
- [ ] DDoS protection active

### Performance

- [ ] Database connection pooling configured
- [ ] Redis caching enabled
- [ ] Nginx compression enabled
- [ ] CDN configured for static assets
- [ ] Health check intervals optimized
- [ ] Log rotation configured
- [ ] Resource limits set for containers

### Monitoring

- [ ] Application metrics exposed
- [ ] Prometheus scraping configured
- [ ] Grafana dashboards imported
- [ ] Alert rules configured
- [ ] Log aggregation setup
- [ ] Health monitoring scripts active
- [ ] Backup verification automated

### Testing

- [ ] All health endpoints responding
- [ ] API authentication working
- [ ] Google Sheets integration verified
- [ ] AI services responding (if enabled)
- [ ] GDPR compliance endpoints tested
- [ ] Load testing completed
- [ ] Failover procedures tested
- [ ] Backup/restore procedures verified

### Documentation

- [ ] API documentation accessible
- [ ] Operational runbooks complete
- [ ] Emergency contacts updated
- [ ] Deployment procedures documented
- [ ] Monitoring playbooks created

## Emergency Procedures

### Immediate Response

1. **Service Down**

   ```bash
   # Check container status
   docker-compose -f /opt/proofkit/docker-compose.prod.yml ps

   # View recent logs
   docker-compose -f /opt/proofkit/docker-compose.prod.yml logs --tail=100 app

   # Restart if needed
   docker-compose -f /opt/proofkit/docker-compose.prod.yml restart app
   ```

2. **High Memory Usage**

   ```bash
   # Check container resources
   docker stats proofkit-app

   # Scale horizontally (if load balancer configured)
   docker-compose -f /opt/proofkit/docker-compose.prod.yml up -d --scale app=2
   ```

3. **Database Issues**

   ```bash
   # Check Google Sheets API status
   curl -s "https://status.cloud.google.com/"

   # Verify service account permissions
   # Check SHEET_ID and credentials
   ```

### Contact Information

- **Primary Ops**: ops@proofkit.net
- **Emergency**: +1-555-PROOFKIT-OPS
- **Status Page**: https://status.proofkit.net

---

**Document Version**: 1.0  
**Last Updated**: 2024-08-16  
**Review Date**: 2024-09-16
