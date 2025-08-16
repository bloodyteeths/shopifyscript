/**
 * Google Sheets Optimization Admin Routes
 * Monitoring and management endpoints for the optimized sheets infrastructure
 */

import express from 'express';
import sheetsPool from '../services/sheets-pool.js';
import sheetsBatch from '../services/sheets-batch.js';
import tenantCache from '../services/cache.js';
import cacheInvalidation from '../services/cache-invalidation.js';
import tenantRegistry from '../services/tenant-registry.js';
import optimizedSheets from '../services/sheets.js';

const router = express.Router();

/**
 * Dashboard - Overall system status
 */
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await optimizedSheets.getStats();
    const uptime = process.uptime();
    
    const dashboard = {
      status: 'operational',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      performance: {
        avgResponseTime: stats.service.avgResponseTime,
        cacheHitRate: stats.service.cacheHitRate,
        batchEfficiency: stats.service.batchEfficiency,
        errorRate: stats.service.errors / Math.max(stats.service.operations, 1) * 100
      },
      resources: {
        connectionPool: {
          active: stats.pool.metrics.activeConnections,
          total: stats.pool.pool.size,
          utilization: (stats.pool.metrics.activeConnections / stats.pool.pool.maxConcurrent) * 100
        },
        cache: {
          size: stats.cache.totalSize,
          hitRate: stats.cache.hitRate,
          memory: stats.cache.memoryUsage
        },
        batching: {
          pendingBatches: stats.batch.batch.pendingBatches,
          pendingOperations: stats.batch.batch.pendingOperations,
          efficiency: stats.batch.metrics.efficiencyRate
        }
      },
      tenants: {
        total: Object.keys(stats.pool.tenants || {}).length,
        active: Object.keys(stats.cache.tenantCount || {}).length
      }
    };
    
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate dashboard',
      message: error.message
    });
  }
});

/**
 * Connection Pool Statistics
 */
router.get('/pool/stats', (req, res) => {
  try {
    const stats = sheetsPool.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get pool statistics',
      message: error.message
    });
  }
});

/**
 * Rate limit status for a tenant
 */
router.get('/pool/rate-limit/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const rateLimit = sheetsPool.getTenantRateLimit(tenantId);
    res.json(rateLimit);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get rate limit status',
      message: error.message
    });
  }
});

/**
 * Clear tenant connections
 */
router.delete('/pool/tenant/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const cleared = sheetsPool.clearTenant(tenantId);
    res.json({
      message: `Cleared ${cleared} connections for tenant ${tenantId}`,
      cleared
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear tenant connections',
      message: error.message
    });
  }
});

/**
 * Batch Operations Statistics
 */
router.get('/batch/stats', (req, res) => {
  try {
    const stats = sheetsBatch.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get batch statistics',
      message: error.message
    });
  }
});

/**
 * Flush pending batches
 */
router.post('/batch/flush', async (req, res) => {
  try {
    const { tenantId } = req.body;
    
    let flushed;
    if (tenantId) {
      flushed = await sheetsBatch.flushTenant(tenantId);
    } else {
      flushed = await sheetsBatch.flushAll();
    }
    
    res.json({
      message: `Flushed ${flushed} pending batches`,
      flushed
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to flush batches',
      message: error.message
    });
  }
});

/**
 * Cache Statistics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const globalStats = tenantCache.getGlobalStats();
    res.json(globalStats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: error.message
    });
  }
});

/**
 * Tenant-specific cache statistics
 */
router.get('/cache/tenant/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const stats = tenantCache.getTenantStats(tenantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get tenant cache statistics',
      message: error.message
    });
  }
});

/**
 * Clear cache for tenant
 */
router.delete('/cache/tenant/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const { path } = req.query;
    
    let cleared;
    if (path) {
      cleared = tenantCache.clearTenantPath(tenantId, path);
    } else {
      cleared = tenantCache.clearTenant(tenantId);
    }
    
    res.json({
      message: `Cleared ${cleared} cache entries for tenant ${tenantId}`,
      cleared
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * Cache Invalidation Statistics
 */
router.get('/invalidation/stats', (req, res) => {
  try {
    const stats = cacheInvalidation.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get invalidation statistics',
      message: error.message
    });
  }
});

/**
 * Analyze cache dependencies
 */
router.get('/invalidation/analyze', (req, res) => {
  try {
    const analysis = cacheInvalidation.analyzeDependencies();
    res.json(analysis);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze dependencies',
      message: error.message
    });
  }
});

/**
 * Trigger cache invalidation
 */
router.post('/invalidation/trigger', (req, res) => {
  try {
    const { tenantId, operation, context } = req.body;
    
    if (!tenantId || !operation) {
      return res.status(400).json({
        error: 'Missing required parameters: tenantId, operation'
      });
    }
    
    cacheInvalidation.smartInvalidate(tenantId, operation, context || {});
    
    res.json({
      message: `Triggered ${operation} invalidation for tenant ${tenantId}`,
      tenantId,
      operation,
      context
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger invalidation',
      message: error.message
    });
  }
});

/**
 * Tenant Registry Information
 */
router.get('/tenants', (req, res) => {
  try {
    const tenants = tenantRegistry.getAllTenants();
    const stats = tenantRegistry.getStats();
    
    res.json({
      tenants,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get tenant information',
      message: error.message
    });
  }
});

/**
 * Tenant Health Check
 */
router.get('/tenants/:tenantId/health', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const health = await optimizedSheets.healthCheck(tenantId);
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * Add or update tenant
 */
router.post('/tenants/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;
    const config = req.body;
    
    if (!config.sheetId) {
      return res.status(400).json({
        error: 'Missing required parameter: sheetId'
      });
    }
    
    tenantRegistry.addTenant(tenantId, config);
    
    res.json({
      message: `Tenant ${tenantId} added/updated successfully`,
      tenantId,
      config
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add/update tenant',
      message: error.message
    });
  }
});

/**
 * Performance metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    const stats = await optimizedSheets.getStats();
    
    // Format metrics for monitoring tools (Prometheus-style)
    const metrics = [
      `# HELP sheets_operations_total Total number of operations`,
      `# TYPE sheets_operations_total counter`,
      `sheets_operations_total ${stats.service.operations}`,
      ``,
      `# HELP sheets_errors_total Total number of errors`,
      `# TYPE sheets_errors_total counter`,
      `sheets_errors_total ${stats.service.errors}`,
      ``,
      `# HELP sheets_response_time_avg Average response time in milliseconds`,
      `# TYPE sheets_response_time_avg gauge`,
      `sheets_response_time_avg ${stats.service.avgResponseTime}`,
      ``,
      `# HELP sheets_cache_hit_rate Cache hit rate percentage`,
      `# TYPE sheets_cache_hit_rate gauge`,
      `sheets_cache_hit_rate ${stats.service.cacheHitRate}`,
      ``,
      `# HELP sheets_batch_efficiency Batch efficiency percentage`,
      `# TYPE sheets_batch_efficiency gauge`,
      `sheets_batch_efficiency ${stats.service.batchEfficiency}`,
      ``,
      `# HELP sheets_pool_connections Active pool connections`,
      `# TYPE sheets_pool_connections gauge`,
      `sheets_pool_connections ${stats.pool.metrics.activeConnections}`,
      ``,
      `# HELP sheets_cache_size Total cache entries`,
      `# TYPE sheets_cache_size gauge`,
      `sheets_cache_size ${stats.cache.totalSize}`,
      ``
    ].join('\n');
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error.message
    });
  }
});

/**
 * Configuration endpoint
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      connectionPool: {
        maxConnections: process.env.SHEETS_MAX_CONNECTIONS || 50,
        maxConcurrent: process.env.SHEETS_MAX_CONCURRENT || 10,
        connectionTtl: process.env.SHEETS_CONNECTION_TTL_SEC || 300,
        cleanupInterval: process.env.SHEETS_CLEANUP_INTERVAL_MS || 60000
      },
      rateLimiting: {
        maxRequests: process.env.SHEETS_MAX_REQUESTS || 80,
        windowMs: process.env.SHEETS_RATE_WINDOW_MS || 100000
      },
      batching: {
        batchDelay: process.env.SHEETS_BATCH_DELAY_MS || 100,
        maxBatchSize: process.env.SHEETS_MAX_BATCH_SIZE || 50,
        maxBatchWaitTime: process.env.SHEETS_MAX_BATCH_WAIT_MS || 1000
      },
      caching: {
        maxSize: process.env.CACHE_MAX_SIZE || 10000,
        defaultTtl: process.env.CACHE_DEFAULT_TTL_SEC || 300,
        readTtl: process.env.SHEETS_READ_CACHE_TTL_SEC || 60,
        writeTtl: process.env.SHEETS_WRITE_CACHE_TTL_SEC || 10
      }
    };
    
    res.json(config);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error.message
    });
  }
});

/**
 * System reset (for development/testing)
 */
router.post('/reset', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_SHEETS_OPTIMIZATION') {
      return res.status(400).json({
        error: 'Invalid confirmation. Use confirm: "RESET_SHEETS_OPTIMIZATION"'
      });
    }
    
    // Clear all caches
    const cacheCleared = tenantCache.clear();
    
    // Clear all connections
    const connectionsCleared = sheetsPool.clear();
    
    // Clear all batches
    const batchesCleared = sheetsBatch.clear();
    
    // Reset invalidation tracking
    cacheInvalidation.reset();
    
    res.json({
      message: 'System reset completed',
      cleared: {
        cache: cacheCleared,
        connections: connectionsCleared,
        batches: batchesCleared
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset system',
      message: error.message
    });
  }
});

export default router;