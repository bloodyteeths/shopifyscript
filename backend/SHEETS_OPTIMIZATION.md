# Google Sheets Optimization Infrastructure

## Overview

This document describes the Google Sheets optimization infrastructure implemented to eliminate 429 rate limit errors and support 100+ concurrent tenants with high performance.

## Architecture Components

### 1. Connection Pool (`services/sheets-pool.js`)

**Purpose**: Manages connection reuse and rate limiting to prevent 429 errors

**Features**:

- Connection pooling with configurable limits
- Per-tenant rate limiting (80 requests per 100 seconds)
- Automatic connection cleanup and eviction
- Connection metrics and monitoring

**Configuration**:

```env
SHEETS_MAX_CONNECTIONS=50          # Maximum pooled connections
SHEETS_MAX_CONCURRENT=10           # Maximum concurrent connections
SHEETS_CONNECTION_TTL_SEC=300      # Connection TTL (5 minutes)
SHEETS_MAX_REQUESTS=80             # Rate limit per tenant
SHEETS_RATE_WINDOW_MS=100000       # Rate limit window (100 seconds)
```

**Usage**:

```javascript
import sheetsPool from "./services/sheets-pool.js";

const connection = await sheetsPool.getConnection(tenantId, sheetId);
const doc = connection.doc;
// ... use document
connection.release(); // Important: release connection
```

### 2. Smart Batch Operations (`services/sheets-batch.js`)

**Purpose**: Combines multiple operations into efficient batch requests

**Features**:

- Automatic operation batching with 100ms delay
- Operation grouping by type (reads, writes, updates, deletes)
- Bulk row operations optimization
- Batch metrics and efficiency tracking

**Configuration**:

```env
SHEETS_BATCH_DELAY_MS=100          # Batch delay (100ms)
SHEETS_MAX_BATCH_SIZE=50           # Maximum operations per batch
SHEETS_MAX_BATCH_WAIT_MS=1000      # Maximum batch wait time
```

**Usage**:

```javascript
import sheetsBatch from "./services/sheets-batch.js";

// Operations are automatically batched
const result = await sheetsBatch.queueOperation(tenantId, sheetId, {
  type: "addRow",
  params: { sheetTitle: "Sheet1", row: { col1: "value" } },
});
```

### 3. Cache Invalidation Strategy (`services/cache-invalidation.js`)

**Purpose**: Smart cache management with dependency tracking

**Features**:

- Rule-based invalidation patterns
- Dependency cascade invalidation
- Smart invalidation based on operation types
- Time-based periodic invalidation

**Invalidation Rules**:

- `sheet:write` → Invalidates insights, config, summary, run-logs
- `row:add` → Invalidates aggregated data and row lists
- `row:update` → Invalidates specific row and aggregated data
- `config:update` → Invalidates insights and summaries

**Usage**:

```javascript
import cacheInvalidation from "./services/cache-invalidation.js";

// Smart invalidation based on operation
cacheInvalidation.smartInvalidate(tenantId, "sheet:write", {
  type: "addRow",
  sheetTitle: "Sheet1",
});
```

### 4. Optimized Sheets Service (`services/sheets.js`)

**Purpose**: High-level API that integrates all optimization components

**Features**:

- Tenant-aware operations
- Automatic caching with configurable TTL
- Batch operation queuing
- Cache invalidation integration
- Performance metrics tracking

**Configuration**:

```env
SHEETS_CACHE_TTL_SEC=300           # Default cache TTL (5 minutes)
SHEETS_READ_CACHE_TTL_SEC=60       # Read cache TTL (1 minute)
SHEETS_WRITE_CACHE_TTL_SEC=10      # Write cache TTL (10 seconds)
```

**Usage**:

```javascript
import optimizedSheets from "./services/sheets.js";

// Add row with batching and cache invalidation
const result = await optimizedSheets.addRow(tenantId, sheetTitle, rowData);

// Get rows with caching
const rows = await optimizedSheets.getRows(tenantId, sheetTitle, {
  limit: 100,
});

// Bulk operations
const results = await optimizedSheets.bulkOperations(tenantId, [
  { type: "addRow", params: { sheetTitle: "Sheet1", row: data1 } },
  { type: "addRow", params: { sheetTitle: "Sheet1", row: data2 } },
]);
```

## Performance Metrics

### Target Metrics

- **API Response Time**: <200ms
- **Cache Hit Rate**: >80%
- **Zero 429 Errors**: Under normal load
- **Concurrent Tenants**: 100+

### Monitoring Endpoints

#### Dashboard

```http
GET /api/sheets-admin/dashboard
```

Returns overall system status and performance metrics.

#### Pool Statistics

```http
GET /api/sheets-admin/pool/stats
GET /api/sheets-admin/pool/rate-limit/:tenantId
```

#### Batch Statistics

```http
GET /api/sheets-admin/batch/stats
POST /api/sheets-admin/batch/flush
```

#### Cache Statistics

```http
GET /api/sheets-admin/cache/stats
GET /api/sheets-admin/cache/tenant/:tenantId
DELETE /api/sheets-admin/cache/tenant/:tenantId
```

#### Prometheus Metrics

```http
GET /api/sheets-admin/metrics
```

Returns Prometheus-compatible metrics for monitoring tools.

## Usage Examples

### Basic Operations

```javascript
import { sheets } from "./sheets.js";

// Get tenant document
const connection = await sheets.getTenantDoc("tenant-123");

// Add single row
await sheets.addRow("tenant-123", "leads", {
  timestamp: new Date().toISOString(),
  name: "John Doe",
  email: "john@example.com",
});

// Add multiple rows (optimized)
await sheets.addRows("tenant-123", "leads", [
  { name: "Jane Doe", email: "jane@example.com" },
  { name: "Bob Smith", email: "bob@example.com" },
]);

// Get cached data
const data = await sheets.getCachedData("tenant-123", "leads");
```

### Legacy Compatibility

The original API functions are maintained for backward compatibility:

```javascript
import { getDoc, getDocById, ensureSheet } from "./sheets.js";

// Original functions still work but use optimized infrastructure
const doc = await getDoc();
const sheet = await ensureSheet(doc, "Sheet1", ["col1", "col2"]);
```

### Bulk Operations

```javascript
const operations = [
  {
    type: "addRow",
    params: {
      sheetTitle: "leads",
      row: { name: "Customer 1", email: "customer1@example.com" },
    },
  },
  {
    type: "addRow",
    params: {
      sheetTitle: "leads",
      row: { name: "Customer 2", email: "customer2@example.com" },
    },
  },
];

const results = await optimizedSheets.bulkOperations("tenant-123", operations);
```

## Testing

Run the optimization test suite:

```bash
node backend/test-sheets-optimization.js
```

The test suite validates:

- Connection pool functionality
- Batch operation efficiency
- Cache hit rates
- Invalidation strategies
- Integration between components
- Performance benchmarks

## Configuration Best Practices

### Production Settings

```env
# Connection Pool
SHEETS_MAX_CONNECTIONS=100
SHEETS_MAX_CONCURRENT=20
SHEETS_CONNECTION_TTL_SEC=300

# Rate Limiting (Conservative)
SHEETS_MAX_REQUESTS=75
SHEETS_RATE_WINDOW_MS=100000

# Batching
SHEETS_BATCH_DELAY_MS=50
SHEETS_MAX_BATCH_SIZE=100

# Caching
CACHE_MAX_SIZE=50000
SHEETS_READ_CACHE_TTL_SEC=30
SHEETS_WRITE_CACHE_TTL_SEC=5
```

### Development Settings

```env
# More aggressive for testing
SHEETS_MAX_CONCURRENT=5
SHEETS_BATCH_DELAY_MS=200
SHEETS_READ_CACHE_TTL_SEC=10
```

## Troubleshooting

### Common Issues

1. **429 Rate Limit Errors**
   - Check rate limit status: `GET /api/sheets-admin/pool/rate-limit/:tenantId`
   - Reduce `SHEETS_MAX_REQUESTS` if needed
   - Increase `SHEETS_RATE_WINDOW_MS`

2. **High Memory Usage**
   - Monitor cache size: `GET /api/sheets-admin/cache/stats`
   - Reduce `CACHE_MAX_SIZE`
   - Decrease cache TTL values

3. **Slow Response Times**
   - Check batch efficiency: `GET /api/sheets-admin/batch/stats`
   - Increase batch size: `SHEETS_MAX_BATCH_SIZE`
   - Decrease batch delay: `SHEETS_BATCH_DELAY_MS`

4. **Cache Miss Rate High**
   - Increase cache TTL for read operations
   - Check invalidation frequency
   - Monitor cache hit rate per tenant

### Health Checks

```javascript
const health = await optimizedSheets.healthCheck("tenant-123");
console.log(health.status); // 'healthy' or 'unhealthy'
```

### Emergency Reset

```http
POST /api/sheets-admin/reset
Content-Type: application/json

{
  "confirm": "RESET_SHEETS_OPTIMIZATION"
}
```

## Migration Guide

### From Legacy Code

1. **Replace direct sheet operations**:

   ```javascript
   // Before
   const doc = await getDoc();
   const sheet = await ensureSheet(doc, "leads", headers);
   await sheet.addRow(data);

   // After
   await sheets.addRow("tenant-id", "leads", data);
   ```

2. **Use tenant-aware operations**:

   ```javascript
   // Before - single tenant
   const rows = await sheet.getRows();

   // After - multi-tenant with caching
   const rows = await sheets.getRows("tenant-id", "leads");
   ```

3. **Batch multiple operations**:

   ```javascript
   // Before - individual operations
   for (const row of data) {
     await sheet.addRow(row);
   }

   // After - batched operations
   await sheets.addRows("tenant-id", "leads", data);
   ```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rate**: `sheets_errors_total / sheets_operations_total`
2. **Response Time**: `sheets_response_time_avg`
3. **Cache Hit Rate**: `sheets_cache_hit_rate`
4. **Pool Utilization**: `sheets_pool_connections / max_concurrent`
5. **Batch Efficiency**: `sheets_batch_efficiency`

### Recommended Alerts

- Error rate > 5%
- Average response time > 500ms
- Cache hit rate < 70%
- Pool utilization > 80%
- Rate limit hits > 0

## Performance Optimization Tips

1. **Use bulk operations** for multiple rows
2. **Set appropriate cache TTL** based on data freshness requirements
3. **Monitor batch efficiency** and adjust batch sizes
4. **Use tenant-specific rate limiting** for high-volume tenants
5. **Implement circuit breakers** for failing operations
6. **Pre-warm caches** for frequently accessed data

This optimization infrastructure ensures high performance, reliability, and scalability for Google Sheets operations in a multi-tenant environment.
