/**
 * Optimized Google Sheets API Wrapper - Multi-Tenant Performance Infrastructure
 * Integrates connection pooling, smart batching, and cache invalidation
 */

import sheetsPool from './sheets-pool.js';
import sheetsBatch from './sheets-batch.js';
import tenantCache from './cache.js';
import cacheInvalidation from './cache-invalidation.js';
import tenantRegistry from './tenant-registry.js';

class OptimizedSheetsService {
  constructor() {
    this.defaultHeaders = {
      'timestamp': 'Timestamp',
      'event': 'Event',
      'data': 'Data',
      'status': 'Status'
    };
    
    this.cacheConfig = {
      defaultTtl: Number(process.env.SHEETS_CACHE_TTL_SEC || 300) * 1000, // 5 minutes
      readTtl: Number(process.env.SHEETS_READ_CACHE_TTL_SEC || 60) * 1000, // 1 minute
      writeTtl: Number(process.env.SHEETS_WRITE_CACHE_TTL_SEC || 10) * 1000, // 10 seconds
    };

    // Performance metrics
    this.metrics = {
      operations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchedOperations: 0,
      errors: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }

  /**
   * Get tenant document with connection pooling
   */
  async getTenantDoc(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.enabled) {
      throw new Error(`Tenant disabled: ${tenantId}`);
    }

    const connection = await sheetsPool.getConnection(tenantId, tenant.sheetId);
    return connection;
  }

  /**
   * Ensure sheet exists with proper headers (cached)
   */
  async ensureSheet(tenantId, title, headers = null) {
    const cacheKey = { path: `/sheets/${title}/info`, params: {} };
    
    // Check cache first
    let sheetInfo = tenantCache.get(tenantId, cacheKey.path, cacheKey.params);
    if (sheetInfo) {
      this.metrics.cacheHits++;
      return sheetInfo;
    }

    this.metrics.cacheMisses++;
    const startTime = Date.now();

    try {
      const connection = await this.getTenantDoc(tenantId);
      const doc = connection.doc;
      
      let sheet = doc.sheetsByTitle[title];
      if (!sheet) {
        const headerValues = headers || Object.values(this.defaultHeaders);
        sheet = await doc.addSheet({ title, headerValues });
        
        // Invalidate related caches
        cacheInvalidation.smartInvalidate(tenantId, 'sheet:write', {
          type: 'createSheet',
          sheetTitle: title
        });
      } else {
        // Ensure headers are set
        try {
          await sheet.loadHeaderRow();
          if (!sheet._headerValues || sheet._headerValues.length === 0) {
            const headerValues = headers || Object.values(this.defaultHeaders);
            await sheet.setHeaderRow(headerValues);
          }
        } catch (error) {
          if (headers?.length) {
            await sheet.setHeaderRow(headers);
          }
        }
      }

      // Cache sheet info
      sheetInfo = {
        title: sheet.title,
        sheetId: sheet.sheetId,
        rowCount: sheet.rowCount,
        columnCount: sheet.columnCount,
        headerValues: sheet._headerValues || []
      };

      tenantCache.set(tenantId, cacheKey.path, cacheKey.params, sheetInfo, this.cacheConfig.defaultTtl);
      connection.release();

      this.updateMetrics(startTime);
      return sheetInfo;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get rows with smart caching and batching
   */
  async getRows(tenantId, sheetTitle, options = {}) {
    const { limit = 100, offset = 0, useCache = true } = options;
    const cacheKey = { 
      path: `/sheets/${sheetTitle}/rows`, 
      params: { limit, offset } 
    };

    // Check cache first
    if (useCache) {
      const cached = tenantCache.get(tenantId, cacheKey.path, cacheKey.params);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
    }

    this.metrics.cacheMisses++;

    // Use batch operation for efficiency
    const operation = {
      type: 'getRows',
      params: {
        sheetTitle,
        options: { limit, offset }
      }
    };

    try {
      const startTime = Date.now();
      const tenant = tenantRegistry.getTenant(tenantId);
      const rows = await sheetsBatch.queueOperation(tenantId, tenant.sheetId, operation);
      
      // Sanitize and cache results
      const sanitizedRows = this.sanitizeRows(rows);
      
      if (useCache) {
        tenantCache.set(
          tenantId, 
          cacheKey.path, 
          cacheKey.params, 
          sanitizedRows, 
          this.cacheConfig.readTtl
        );
      }

      this.updateMetrics(startTime);
      this.metrics.batchedOperations++;
      
      return sanitizedRows;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Add single row with smart batching and cache invalidation
   */
  async addRow(tenantId, sheetTitle, rowData) {
    const operation = {
      type: 'addRow',
      params: {
        sheetTitle,
        row: rowData
      }
    };

    try {
      const startTime = Date.now();
      const tenant = tenantRegistry.getTenant(tenantId);
      const result = await sheetsBatch.queueOperation(tenantId, tenant.sheetId, operation);

      // Invalidate related caches
      cacheInvalidation.smartInvalidate(tenantId, 'sheet:write', {
        type: 'addRow',
        sheetTitle,
        data: rowData
      });

      this.updateMetrics(startTime);
      this.metrics.batchedOperations++;

      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Add multiple rows with optimized batching
   */
  async addRows(tenantId, sheetTitle, rowsData) {
    const operation = {
      type: 'addRows',
      params: {
        sheetTitle,
        rows: rowsData
      }
    };

    try {
      const startTime = Date.now();
      const tenant = tenantRegistry.getTenant(tenantId);
      const result = await sheetsBatch.queueOperation(tenantId, tenant.sheetId, operation);

      // Invalidate related caches
      cacheInvalidation.smartInvalidate(tenantId, 'sheet:write', {
        type: 'addRows',
        sheetTitle,
        data: rowsData,
        count: rowsData.length
      });

      this.updateMetrics(startTime);
      this.metrics.batchedOperations++;

      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Update row with batching and cache invalidation
   */
  async updateRow(tenantId, sheetTitle, row, rowId = null) {
    const operation = {
      type: 'updateRow',
      params: {
        sheetTitle,
        row,
        rowId
      }
    };

    try {
      const startTime = Date.now();
      const tenant = tenantRegistry.getTenant(tenantId);
      const result = await sheetsBatch.queueOperation(tenantId, tenant.sheetId, operation);

      // Invalidate related caches
      cacheInvalidation.smartInvalidate(tenantId, 'row:update', {
        sheetTitle,
        rowId: rowId || row._rowNumber,
        data: row._rawData || row
      });

      this.updateMetrics(startTime);
      this.metrics.batchedOperations++;

      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Delete row with batching and cache invalidation
   */
  async deleteRow(tenantId, sheetTitle, row, rowId = null) {
    const operation = {
      type: 'deleteRow',
      params: {
        sheetTitle,
        row,
        rowId
      }
    };

    try {
      const startTime = Date.now();
      const tenant = tenantRegistry.getTenant(tenantId);
      const result = await sheetsBatch.queueOperation(tenantId, tenant.sheetId, operation);

      // Invalidate related caches
      cacheInvalidation.smartInvalidate(tenantId, 'row:delete', {
        sheetTitle,
        rowId: rowId || row._rowNumber
      });

      this.updateMetrics(startTime);
      this.metrics.batchedOperations++;

      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get cached sheet data or fetch if not available
   */
  async getCachedSheetData(tenantId, sheetTitle, ttl = null) {
    const cacheKey = { 
      path: `/sheets/${sheetTitle}/data`, 
      params: {} 
    };

    // Check cache first
    const cached = tenantCache.get(tenantId, cacheKey.path, cacheKey.params);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    // Fetch fresh data
    const rows = await this.getRows(tenantId, sheetTitle, { useCache: false });
    const sheetInfo = await this.ensureSheet(tenantId, sheetTitle);

    const data = {
      info: sheetInfo,
      rows: rows,
      lastUpdated: Date.now()
    };

    // Cache with custom TTL
    const cacheTtl = ttl || this.cacheConfig.readTtl;
    tenantCache.set(tenantId, cacheKey.path, cacheKey.params, data, cacheTtl);

    return data;
  }

  /**
   * Bulk operations with transaction-like behavior
   */
  async bulkOperations(tenantId, operations) {
    const results = [];
    const startTime = Date.now();
    
    try {
      // Group operations by sheet for efficiency
      const operationsBySheet = new Map();
      
      operations.forEach((op, index) => {
        const sheetTitle = op.sheetTitle;
        if (!operationsBySheet.has(sheetTitle)) {
          operationsBySheet.set(sheetTitle, []);
        }
        operationsBySheet.get(sheetTitle).push({ ...op, originalIndex: index });
      });

      // Execute operations sheet by sheet
      for (const [sheetTitle, sheetOps] of operationsBySheet) {
        try {
          const tenant = tenantRegistry.getTenant(tenantId);
          
          // Execute all operations for this sheet
          const sheetResults = await Promise.all(
            sheetOps.map(op => 
              sheetsBatch.queueOperation(tenantId, tenant.sheetId, {
                type: op.type,
                params: { ...op.params, sheetTitle }
              })
            )
          );

          // Map results back to original order
          sheetOps.forEach((op, index) => {
            results[op.originalIndex] = {
              success: true,
              data: sheetResults[index]
            };
          });

          // Invalidate caches for write operations
          const writeOps = sheetOps.filter(op => 
            ['addRow', 'addRows', 'updateRow', 'deleteRow'].includes(op.type)
          );
          
          if (writeOps.length > 0) {
            cacheInvalidation.smartInvalidate(tenantId, 'sheet:write', {
              type: 'bulkOperations',
              sheetTitle,
              operations: writeOps.length
            });
          }

        } catch (error) {
          // Mark all operations for this sheet as failed
          sheetOps.forEach(op => {
            results[op.originalIndex] = {
              success: false,
              error: error.message
            };
          });
        }
      }

      this.updateMetrics(startTime);
      this.metrics.batchedOperations += operations.length;

      return results;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Force flush all pending batches for a tenant
   */
  async flushPendingOperations(tenantId) {
    const flushed = await sheetsBatch.flushTenant(tenantId);
    return flushed;
  }

  /**
   * Clear all caches for a tenant
   */
  clearTenantCache(tenantId) {
    const cleared = tenantCache.clearTenant(tenantId);
    sheetsPool.clearTenant(tenantId);
    return cleared;
  }

  /**
   * Sanitize row data for safe serialization
   */
  sanitizeRows(rows) {
    if (!Array.isArray(rows)) return rows;
    
    return rows.map(row => {
      if (typeof row === 'object' && row._rawData) {
        return {
          ...row._rawData,
          _rowNumber: row._rowNumber,
          _timestamp: Date.now()
        };
      }
      return row;
    });
  }

  /**
   * Update performance metrics
   */
  updateMetrics(startTime) {
    this.metrics.operations++;
    const responseTime = Date.now() - startTime;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.operations;
  }

  /**
   * Get service statistics
   */
  getStats() {
    const poolStats = sheetsPool.getStats();
    const batchStats = sheetsBatch.getStats();
    const cacheStats = tenantCache.getGlobalStats();
    const invalidationStats = cacheInvalidation.getStats();

    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
      : 0;

    const batchEfficiency = this.metrics.operations > 0
      ? (this.metrics.batchedOperations / this.metrics.operations) * 100
      : 0;

    return {
      service: {
        operations: this.metrics.operations,
        errors: this.metrics.errors,
        avgResponseTime: Number(this.metrics.avgResponseTime.toFixed(2)),
        cacheHitRate: Number(cacheHitRate.toFixed(2)),
        batchEfficiency: Number(batchEfficiency.toFixed(2))
      },
      pool: poolStats,
      batch: batchStats,
      cache: cacheStats,
      invalidation: invalidationStats
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(tenantId = 'default') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Check tenant registry
      const tenant = tenantRegistry.getTenant(tenantId);
      health.checks.tenantRegistry = tenant ? 'healthy' : 'unhealthy';

      // Check connection pool
      const poolStats = sheetsPool.getStats();
      health.checks.connectionPool = poolStats.pool.size >= 0 ? 'healthy' : 'unhealthy';

      // Check cache
      const cacheStats = tenantCache.getGlobalStats();
      health.checks.cache = cacheStats.totalSize >= 0 ? 'healthy' : 'unhealthy';

      // Test basic operation
      try {
        await this.ensureSheet(tenantId, 'health-check', ['timestamp', 'status']);
        health.checks.basicOperation = 'healthy';
      } catch (error) {
        health.checks.basicOperation = 'unhealthy';
        health.errors = health.errors || [];
        health.errors.push(error.message);
      }

      // Overall status
      const unhealthyChecks = Object.values(health.checks).filter(status => status === 'unhealthy');
      if (unhealthyChecks.length > 0) {
        health.status = 'unhealthy';
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

// Singleton instance
const optimizedSheets = new OptimizedSheetsService();

export default optimizedSheets;
export { OptimizedSheetsService };