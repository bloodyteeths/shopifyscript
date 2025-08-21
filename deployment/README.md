# ProofKit SaaS DevOps Infrastructure

This directory contains the production-ready DevOps infrastructure for ProofKit SaaS, including Docker configuration, environment management, health monitoring, logging, and deployment automation.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm run install:all

# Start development server
npm run dev
```

### Production Deployment

```bash
# Using deployment script (recommended)
./deployment/deploy.sh

# Using Docker Compose
docker-compose up -d

# Using production startup script
./deployment/production-start.sh start
```

## 📁 Directory Structure

```
deployment/
├── README.md                 # This file
├── deploy.sh                 # Automated deployment script
├── production-start.sh       # Production startup script
├── environment.js           # Environment validation and management
├── nginx.conf              # Nginx reverse proxy configuration
├── prometheus.yml          # Prometheus monitoring configuration
├── redis.conf              # Redis configuration
└── ssl/                    # SSL certificates (create manually)
```

## 🐳 Docker Configuration

### Multi-Stage Build

The `Dockerfile` uses a multi-stage build approach for optimal production images:

1. **Base**: Node.js 18 Alpine with security updates
2. **Dependencies**: Production dependency installation
3. **Builder**: Full dependency installation and build process
4. **Runtime**: Minimal production runtime with security hardening

### Security Features

- Non-root user execution
- Security-hardened Alpine base
- Minimal attack surface
- Health checks integrated
- Signal handling with dumb-init

### Usage

```bash
# Build production image
docker build -t proofkit-saas:latest .

# Run container
docker run -p 3000:3000 --env-file .env proofkit-saas:latest
```

## 🔧 Environment Management

The environment management system (`environment.js`) provides:

- **Comprehensive validation** of all environment variables
- **Type conversion** and validation
- **Production-specific checks** for security and performance
- **Masked logging** of sensitive values
- **Schema-based configuration** with defaults

### Environment Variables

#### Required

```bash
NODE_ENV=production
PORT=3000
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=your-project-id
GEMINI_API_KEY=AIzaSyYOUR_GEMINI_API_KEY_HERE
HMAC_SECRET=your_very_strong_secret_key_at_least_32_characters_long
```

#### Optional with Defaults

```bash
HOST=0.0.0.0
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_TTL=300000
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
METRICS_ENABLED=true
```

### Usage

```javascript
import { createEnvironment } from "./deployment/environment.js";

const { config, isProduction } = createEnvironment();
```

## 🏥 Health Checks & Monitoring

### Health Check Endpoints

| Endpoint   | Purpose                    | Kubernetes |
| ---------- | -------------------------- | ---------- |
| `/health`  | Overall application health | -          |
| `/ready`   | Readiness probe            | ✅         |
| `/live`    | Liveness probe             | ✅         |
| `/metrics` | Prometheus metrics         | -          |

### Built-in Health Checks

1. **Memory Usage** - Monitors heap usage (critical at >90%)
2. **Event Loop Lag** - Detects performance bottlenecks
3. **Process Health** - Basic process status
4. **Disk Space** - Available storage monitoring
5. **Google Sheets** - External service connectivity
6. **Gemini AI** - AI service availability

### Custom Health Checks

```javascript
import { healthService } from "./services/health.js";

healthService.registerCheck(
  "custom-service",
  async () => {
    // Your health check logic
    return { message: "Service is healthy" };
  },
  { critical: true, timeout: 5000 },
);
```

## 📊 Logging & Observability

### Structured Logging

The logging system provides:

- **Multiple log levels** (error, warn, info, debug, trace)
- **Structured JSON output** for production
- **Human-readable format** for development
- **Automatic request correlation** with trace IDs
- **Performance metrics** tracking
- **Sensitive data masking**

### Log Levels

```javascript
import logger from "./services/logger.js";

logger.error("Error message", { error: errorObject });
logger.warn("Warning message", { context: data });
logger.info("Info message", { user: userId });
logger.debug("Debug message", { details: debugData });
```

### Performance Tracking

```javascript
const traceId = logger.startTimer("database-query");
// ... perform operation
logger.endTimer("database-query", { query: "SELECT * FROM users" });
```

### Request Logging

Automatic request/response logging with:

- Request details (method, URL, headers, body)
- Response status and timing
- User identification and tracing
- Error correlation

## 🚀 Deployment

### Automated Deployment Script

The `deploy.sh` script provides:

- **Prerequisites checking** (Docker, environment)
- **Environment validation**
- **Automated backups** before deployment
- **Health verification** after deployment
- **Rollback capability** on failure
- **Log management** and cleanup

#### Usage

```bash
# Full deployment
./deployment/deploy.sh

# Build only
./deployment/deploy.sh build

# Deploy with monitoring stack
./deployment/deploy.sh --monitoring

# Rollback to previous version
./deployment/deploy.sh rollback

# Check application health
./deployment/deploy.sh health
```

### Production Startup Script

The `production-start.sh` script handles:

- **Environment validation**
- **Dependency verification**
- **Port availability checking**
- **Graceful startup and shutdown**
- **Health monitoring**
- **Process management**

#### Usage

```bash
# Start application
./deployment/production-start.sh start

# Stop application
./deployment/production-start.sh stop

# Restart application
./deployment/production-start.sh restart

# Check status
./deployment/production-start.sh status

# View health
./deployment/production-start.sh health

# Tail logs
./deployment/production-start.sh logs
```

## 🐍 Docker Compose Stack

### Services

1. **proofkit-app** - Main application container
2. **redis** - Caching and session storage
3. **nginx** - Reverse proxy and load balancer
4. **prometheus** - Metrics collection (monitoring profile)
5. **grafana** - Metrics visualization (monitoring profile)
6. **node-exporter** - System metrics (monitoring profile)
7. **cadvisor** - Container metrics (monitoring profile)

### Profiles

- **Default**: Application + Redis + Nginx
- **Monitoring**: Adds Prometheus, Grafana, exporters

#### Usage

```bash
# Start basic stack
docker-compose up -d

# Start with monitoring
docker-compose --profile monitoring up -d

# View logs
docker-compose logs -f proofkit-app

# Scale application
docker-compose up -d --scale proofkit-app=3
```

## 🔒 Security Features

### Nginx Configuration

- **Rate limiting** per IP and endpoint
- **Security headers** (HSTS, CSP, etc.)
- **SSL/TLS termination** ready
- **Request filtering** and validation
- **Static file optimization**

### Application Security

- **HMAC signature verification**
- **Input validation and sanitization**
- **DDoS protection**
- **Request throttling**
- **Security event logging**

### Container Security

- **Non-root execution**
- **Minimal base images**
- **Security scanning ready**
- **Resource limitations**
- **Read-only root filesystem** (where applicable)

## 📈 Monitoring & Alerting

### Prometheus Metrics

- Application-specific metrics
- System performance metrics
- Container resource usage
- Custom business metrics

### Health Monitoring

- Continuous health checks
- Service dependency monitoring
- Performance threshold alerts
- Automated recovery attempts

### Grafana Dashboards

Pre-configured dashboards for:

- Application performance
- System resources
- Error rates and latency
- Business metrics

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# Example workflow integration
- name: Deploy to Production
  run: |
    ./deployment/deploy.sh --skip-backup
```

### Kubernetes

```yaml
# Health check configuration
livenessProbe:
  httpGet:
    path: /live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 🛠️ Troubleshooting

### Common Issues

1. **Environment validation fails**

   ```bash
   # Check environment variables
   ./deployment/deploy.sh build
   ```

2. **Health checks failing**

   ```bash
   # View health status
   curl http://localhost:3000/health | jq .
   ```

3. **Application startup issues**

   ```bash
   # Check logs
   ./deployment/production-start.sh logs
   ```

4. **Docker build failures**
   ```bash
   # Build with verbose output
   docker build --no-cache --progress=plain .
   ```

### Log Analysis

```bash
# View structured logs
tail -f logs/all.log | jq .

# Filter by log level
tail -f logs/error.log

# Search for specific events
grep "health_check" logs/all.log | jq .
```

### Performance Debugging

```bash
# View metrics
curl http://localhost:3000/metrics

# Check health details
curl http://localhost:3000/health | jq .

# Monitor resource usage
docker stats proofkit-app
```

## 🔮 Production Considerations

### Scaling

- Use load balancer (Nginx) for multiple instances
- Redis for shared session storage
- Database connection pooling
- Horizontal pod autoscaling in Kubernetes

### Backup Strategy

- Automated configuration backups
- Database backup integration
- Log rotation and archival
- Disaster recovery procedures

### Security Hardening

- Regular dependency updates
- Security scanning in CI/CD
- Network segmentation
- Access control and authentication

### Performance Optimization

- Enable HTTP/2 in Nginx
- Implement CDN for static assets
- Database query optimization
- Caching strategy refinement

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Guide](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)

---

For support or questions, refer to the main project documentation or contact the development team.
