# Technical Specifications & Standards

## Architecture Requirements

### Multi-Tenancy Implementation

```javascript
// Tenant Resolution Pattern
const tenantId = req.headers["x-tenant-id"] || req.query.tenant;
const config = await TenantRegistry.getConfig(tenantId);
const sheets = await SheetsPool.getConnection(config.sheetId);
```

### Caching Strategy

```javascript
// Cache Key Pattern: tenant:resource:identifier
const cacheKey = `${tenantId}:config:${configType}`;
const ttl = CONFIG_CACHE_TTL_SEC || 15;

// Cache Invalidation Pattern
await cache.invalidatePattern(`${tenantId}:*`);
```

### Error Handling Standards

```javascript
// Standard Error Response
{
  ok: false,
  code: 'ERROR_CODE',
  error: 'Human readable message',
  details: { /* Optional debug info */ },
  timestamp: new Date().toISOString(),
  tenant: tenantId
}
```

## File Size Guidelines

### Preferred Maximum Lines

- **Route Files**: 200 lines
- **Service Files**: 300 lines
- **Middleware Files**: 150 lines
- **Component Files**: 250 lines
- **Utility Files**: 100 lines

### Refactoring Triggers

If a file exceeds preferred size:

1. **Extract Functions**: Move related functions to utilities
2. **Split Responsibilities**: Create separate files for distinct features
3. **Create Modules**: Group related functionality into modules
4. **Use Composition**: Compose smaller pieces into larger functionality

## Google Sheets Optimization

### Rate Limit Protection

```javascript
// Request Queue Pattern
class SheetsRequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.rateLimit = 100; // requests per 100 seconds
  }

  async execute(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }
}
```

### Batch Operations

```javascript
// Batch Read Pattern
const batchRead = async (sheetId, ranges) => {
  const request = {
    spreadsheetId: sheetId,
    ranges: ranges,
    majorDimension: "ROWS",
  };
  return await sheets.spreadsheets.values.batchGet(request);
};
```

### Connection Pooling

```javascript
// Connection Pool Pattern
class SheetsConnectionPool {
  constructor(maxConnections = 10) {
    this.connections = new Map();
    this.maxConnections = maxConnections;
  }

  async getConnection(sheetId) {
    if (!this.connections.has(sheetId)) {
      this.connections.set(sheetId, new SheetsConnection(sheetId));
    }
    return this.connections.get(sheetId);
  }
}
```

## Security Standards

### HMAC Validation

```javascript
// HMAC Validation Pattern
const validateHMAC = (signature, payload, secret) => {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/=+$/, "");
  return signature === expected;
};
```

### Input Validation

```javascript
// Input Validation Pattern
const validateTenantId = (tenantId) => {
  if (!tenantId || typeof tenantId !== "string") {
    throw new ValidationError("Invalid tenant ID");
  }
  if (!/^[A-Z0-9_]+$/.test(tenantId)) {
    throw new ValidationError("Tenant ID contains invalid characters");
  }
  return tenantId;
};
```

### PII Handling

```javascript
// PII Hashing Pattern
const hashPII = (data, salt) => {
  return crypto
    .createHash("sha256")
    .update(data + salt)
    .digest("hex");
};
```

## Performance Requirements

### API Response Times

- **Health Checks**: <50ms
- **Configuration Reads**: <200ms
- **Data Queries**: <500ms
- **Batch Operations**: <2000ms

### Caching Requirements

- **Config Data**: 15 second TTL
- **Insights Data**: 60 second TTL
- **Run Logs**: 10 second TTL
- **Cache Hit Rate**: >80% target

### Memory Usage

- **Process Memory**: <512MB per instance
- **Cache Memory**: <128MB per tenant
- **Connection Pool**: <50 connections total

## Testing Standards

### Unit Test Coverage

```javascript
// Test Pattern Example
describe("TenantRegistry", () => {
  test("should resolve tenant configuration", async () => {
    const config = await TenantRegistry.getConfig("TENANT_123");
    expect(config).toHaveProperty("sheetId");
    expect(config.sheetId).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
```

### Integration Test Pattern

```javascript
// Integration Test Example
describe("API Integration", () => {
  test("should handle HMAC authentication", async () => {
    const payload = "GET:TENANT_123:config";
    const signature = signPayload(payload, process.env.HMAC_SECRET);
    const response = await request(app)
      .get("/api/config")
      .query({ tenant: "TENANT_123", sig: signature })
      .expect(200);
    expect(response.body.ok).toBe(true);
  });
});
```

### Performance Test Requirements

```javascript
// Performance Test Example
describe("Performance", () => {
  test("should handle 100 concurrent requests", async () => {
    const requests = Array(100)
      .fill()
      .map(() => request(app).get("/api/health"));
    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});
```

## Database Schema (Google Sheets)

### Standard Sheet Structure

```javascript
// Configuration Sheet Pattern
const CONFIG_HEADERS = ["key", "value", "type", "description"];

// Metrics Sheet Pattern
const METRICS_HEADERS = [
  "date",
  "level",
  "campaign",
  "ad_group",
  "id",
  "name",
  "clicks",
  "cost",
  "conversions",
  "impr",
  "ctr",
];

// Audience Sheet Pattern
const AUDIENCE_HEADERS = [
  "customer_id",
  "email_hash",
  "phone_hash",
  "total_spent",
  "order_count",
  "last_order_at",
  "top_category",
  "last_product_ids_csv",
];
```

### Data Validation Rules

```javascript
// Validation Pattern
const validateMetricsRow = (row) => {
  return {
    date: new Date(row.date).toISOString(),
    clicks: Math.max(0, parseInt(row.clicks) || 0),
    cost: Math.max(0, parseFloat(row.cost) || 0),
    conversions: Math.max(0, parseInt(row.conversions) || 0),
  };
};
```

## Monitoring & Observability

### Logging Standards

```javascript
// Structured Logging Pattern
const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        tenant: meta.tenant,
        operation: meta.operation,
        duration: meta.duration,
        ...meta,
      }),
    );
  },
};
```

### Health Check Implementation

```javascript
// Health Check Pattern
const healthCheck = async () => {
  const checks = {
    database: await checkSheetsConnection(),
    cache: await checkCacheConnection(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };

  const healthy = Object.values(checks).every(
    (check) => check === true || check.status === "healthy",
  );

  return { healthy, checks };
};
```

### Metrics Collection

```javascript
// Metrics Pattern
const metrics = {
  requestDuration: new Histogram({
    name: "request_duration_seconds",
    help: "Request duration in seconds",
    labelNames: ["method", "route", "status", "tenant"],
  }),

  cacheHitRate: new Counter({
    name: "cache_hits_total",
    help: "Cache hit counter",
    labelNames: ["cache_type", "tenant"],
  }),
};
```

## Environment Configuration

### Required Environment Variables

```bash
# Core Configuration
PORT=3001
NODE_ENV=production
HMAC_SECRET=your-secret-key

# Google Services
GOOGLE_SERVICE_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Multi-Tenant Registry
TENANT_REGISTRY_JSON='{"TENANT_123":"sheet-id-123"}'

# Caching Configuration
REDIS_URL=redis://localhost:6379
INSIGHTS_CACHE_TTL_SEC=60
CONFIG_CACHE_TTL_SEC=15

# Rate Limiting
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000

# AI Configuration (Optional)
AI_PROVIDER=google
GOOGLE_API_KEY=your-api-key
AI_MODEL=gemini-1.5-flash
```

### Configuration Validation

```javascript
// Environment Validation Pattern
const validateEnvironment = () => {
  const required = [
    "HMAC_SECRET",
    "GOOGLE_SERVICE_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "TENANT_REGISTRY_JSON",
  ];

  for (const env of required) {
    if (!process.env[env]) {
      throw new Error(`Required environment variable ${env} is missing`);
    }
  }

  // Validate JSON format
  try {
    JSON.parse(process.env.TENANT_REGISTRY_JSON);
  } catch (error) {
    throw new Error("TENANT_REGISTRY_JSON is not valid JSON");
  }
};
```

## Deployment Requirements

### Docker Configuration

```dockerfile
# Multi-stage build pattern
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "backend/server.js"]
```

### Health Check Configuration

```yaml
# Docker Compose Health Check
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Production Readiness Checklist

- [ ] All environment variables configured
- [ ] Health checks responding correctly
- [ ] Monitoring and logging configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Cache warming implemented
- [ ] Error handling comprehensive
- [ ] Performance benchmarks met
- [ ] Test coverage >90%
- [ ] Documentation complete
