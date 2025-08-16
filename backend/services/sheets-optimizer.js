/**
 * Google Sheets Connection Optimizer - Multi-Tenant Database Optimization
 * 
 * Features:
 * - Advanced connection pooling for 100+ tenants
 * - Smart batching and request queuing
 * - Connection lifecycle management
 * - Auto-scaling and load balancing
 * - Performance monitoring and optimization
 */

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import tenantRegistry from './tenant-registry.js';
import logger from './logger.js';

class SheetsOptimizer {
  constructor() {
    this.connectionPool = new Map(); // tenantId -> connection pool
    this.requestQueue = new Map(); // tenantId -> request queue
    this.connectionMetrics = new Map(); // tenantId -> metrics
    this.batchProcessor = new Map(); // tenantId -> batch processor
    
    // Configuration
    this.config = {
      maxConnectionsPerTenant: Number(process.env.SHEETS_MAX_CONNECTIONS_PER_TENANT || 5),
      minConnectionsPerTenant: Number(process.env.SHEETS_MIN_CONNECTIONS_PER_TENANT || 1),
      connectionIdleTimeout: Number(process.env.SHEETS_CONNECTION_IDLE_TIMEOUT || 300000), // 5 minutes
      requestTimeout: Number(process.env.SHEETS_REQUEST_TIMEOUT || 30000), // 30 seconds
      batchSize: Number(process.env.SHEETS_BATCH_SIZE || 10),
      batchTimeout: Number(process.env.SHEETS_BATCH_TIMEOUT || 1000), // 1 second
      maxQueueSize: Number(process.env.SHEETS_MAX_QUEUE_SIZE || 100),
      healthCheckInterval: Number(process.env.SHEETS_HEALTH_CHECK_INTERVAL || 60000), // 1 minute
      scalingThreshold: Number(process.env.SHEETS_SCALING_THRESHOLD || 0.8), // 80% utilization
      retryAttempts: Number(process.env.SHEETS_RETRY_ATTEMPTS || 3),
      retryDelay: Number(process.env.SHEETS_RETRY_DELAY || 1000)
    };

    this.startHealthChecker();
    this.startMetricsCollector();
    this.initializeAutoScaling();
  }

  /**
   * Get optimized connection for tenant
   */
  async getConnection(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    if (!tenant || !tenant.enabled) {
      throw new Error(`Tenant not available: ${tenantId}`);
    }

    const pool = await this.getOrCreatePool(tenantId);
    return this.acquireConnection(pool, tenantId);
  }

  /**
   * Get or create connection pool for tenant
   */
  async getOrCreatePool(tenantId) {
    if (!this.connectionPool.has(tenantId)) {
      await this.createPool(tenantId);
    }
    return this.connectionPool.get(tenantId);
  }

  /**
   * Create connection pool for tenant
   */
  async createPool(tenantId) {
    const tenant = tenantRegistry.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const pool = {
      tenantId,
      connections: [],
      available: [],
      busy: [],
      config: tenant.sheetsConfig,
      created: Date.now(),
      lastUsed: Date.now(),
      metrics: {
        totalConnections: 0,
        activeConnections: 0,
        completedRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        totalResponseTime: 0,
        queueSize: 0,
        maxQueueSize: 0
      }
    };

    // Create initial connections
    for (let i = 0; i < this.config.minConnectionsPerTenant; i++) {
      await this.createConnection(pool);
    }

    this.connectionPool.set(tenantId, pool);
    this.requestQueue.set(tenantId, []);
    this.connectionMetrics.set(tenantId, pool.metrics);

    logger.info('Connection pool created', {
      tenantId,
      initialConnections: pool.connections.length,
      operation: 'pool_creation'
    });

    return pool;
  }

  /**
   * Create individual connection
   */
  async createConnection(pool) {
    try {
      const { tenantId, config } = pool;
      
      // Create JWT auth
      const serviceAccountAuth = new JWT({
        email: config.clientEmail,
        key: config.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Create document connection
      const doc = new GoogleSpreadsheet(config.sheetId, serviceAccountAuth);
      
      const connection = {
        id: `${tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        doc,
        auth: serviceAccountAuth,
        created: Date.now(),
        lastUsed: Date.now(),
        requestCount: 0,
        inUse: false,
        healthy: true,
        tenantId
      };

      // Test connection
      await this.testConnection(connection);

      pool.connections.push(connection);
      pool.available.push(connection);
      pool.metrics.totalConnections++;

      logger.debug('Connection created', {
        tenantId,
        connectionId: connection.id,
        totalConnections: pool.connections.length,
        operation: 'connection_creation'
      });

      return connection;
    } catch (error) {
      logger.error('Failed to create connection', {
        tenantId: pool.tenantId,
        error: error.message,
        operation: 'connection_creation_error'
      });
      throw error;
    }
  }

  /**
   * Test connection health
   */
  async testConnection(connection) {
    try {
      await connection.doc.loadInfo();
      connection.healthy = true;
      return true;
    } catch (error) {
      connection.healthy = false;
      logger.warn('Connection health check failed', {
        connectionId: connection.id,
        tenantId: connection.tenantId,
        error: error.message,
        operation: 'health_check_failed'
      });
      return false;
    }
  }

  /**
   * Acquire connection from pool
   */
  async acquireConnection(pool, tenantId) {
    const startTime = Date.now();

    // Check for available connections
    if (pool.available.length > 0) {
      const connection = pool.available.shift();
      pool.busy.push(connection);
      connection.inUse = true;
      connection.lastUsed = Date.now();
      pool.metrics.activeConnections++;
      
      return connection;
    }

    // Try to create new connection if under limit
    if (pool.connections.length < this.config.maxConnectionsPerTenant) {
      try {
        const connection = await this.createConnection(pool);
        pool.available.splice(pool.available.indexOf(connection), 1);
        pool.busy.push(connection);
        connection.inUse = true;
        pool.metrics.activeConnections++;
        
        return connection;
      } catch (error) {
        logger.warn('Failed to create new connection', {
          tenantId,
          error: error.message,
          operation: 'connection_scaling_error'
        });
      }
    }

    // Wait for available connection
    return this.waitForConnection(pool, tenantId, startTime);
  }

  /**
   * Wait for available connection
   */
  async waitForConnection(pool, tenantId, startTime) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for tenant: ${tenantId}`));
      }, this.config.requestTimeout);

      const checkAvailable = () => {
        if (pool.available.length > 0) {
          clearTimeout(timeout);
          const connection = pool.available.shift();
          pool.busy.push(connection);
          connection.inUse = true;
          connection.lastUsed = Date.now();
          pool.metrics.activeConnections++;
          resolve(connection);
        } else {
          setTimeout(checkAvailable, 100); // Check every 100ms
        }
      };

      checkAvailable();
    });
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection) {
    const pool = this.connectionPool.get(connection.tenantId);
    if (!pool) return;

    // Move from busy to available
    const busyIndex = pool.busy.indexOf(connection);
    if (busyIndex !== -1) {
      pool.busy.splice(busyIndex, 1);
      pool.available.push(connection);
      connection.inUse = false;
      connection.lastUsed = Date.now();
      pool.metrics.activeConnections--;
      pool.lastUsed = Date.now();
    }
  }

  /**
   * Execute sheets operation with optimizations
   */
  async executeOperation(tenantId, operation, params = {}) {
    const startTime = Date.now();
    let connection = null;

    try {
      // Get connection from pool
      connection = await this.getConnection(tenantId);
      
      // Execute operation with retry logic
      const result = await this.executeWithRetry(connection, operation, params);
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(tenantId, 'success', responseTime);
      
      logger.debug('Sheets operation completed', {
        tenantId,
        operation: operation.name || 'unknown',
        responseTime,
        connectionId: connection.id,
        operation_type: 'sheets_operation'
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(tenantId, 'error', responseTime);
      
      logger.error('Sheets operation failed', {
        tenantId,
        operation: operation.name || 'unknown',
        error: error.message,
        responseTime,
        connectionId: connection?.id,
        operation_type: 'sheets_operation_error'
      });
      
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection);
      }
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry(connection, operation, params, attempt = 1) {
    try {
      return await operation(connection.doc, params);
    } catch (error) {
      if (attempt < this.config.retryAttempts && this.isRetryableError(error)) {
        logger.warn('Retrying sheets operation', {
          tenantId: connection.tenantId,
          attempt,
          error: error.message,
          operation_type: 'sheets_retry'
        });
        
        await this.delay(this.config.retryDelay * attempt);
        return this.executeWithRetry(connection, operation, params, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'RATE_LIMIT_EXCEEDED',
      'QUOTA_EXCEEDED',
      'INTERNAL_ERROR',
      'UNAVAILABLE'
    ];
    
    return retryableErrors.some(type => 
      error.message.includes(type) || error.code === type
    );
  }

  /**
   * Batch processing for multiple operations
   */
  async executeBatch(tenantId, operations) {
    if (!operations || operations.length === 0) {
      return [];
    }

    const batches = this.createBatches(operations, this.config.batchSize);
    const results = [];

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(op => this.executeOperation(tenantId, op.operation, op.params))
      );
      
      results.push(...batchResults.map((result, index) => ({
        operation: batch[index],
        result: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      })));
    }

    logger.info('Batch operations completed', {
      tenantId,
      totalOperations: operations.length,
      batches: batches.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      operation_type: 'batch_operations'
    });

    return results;
  }

  /**
   * Create batches from operations array
   */
  createBatches(operations, batchSize) {
    const batches = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Update metrics for tenant
   */
  updateMetrics(tenantId, status, responseTime) {
    const metrics = this.connectionMetrics.get(tenantId);
    if (!metrics) return;

    if (status === 'success') {
      metrics.completedRequests++;
    } else {
      metrics.failedRequests++;
    }

    metrics.totalResponseTime += responseTime;
    const totalRequests = metrics.completedRequests + metrics.failedRequests;
    metrics.avgResponseTime = metrics.totalResponseTime / totalRequests;
  }

  /**
   * Start health checker
   */
  startHealthChecker() {
    setInterval(async () => {
      await this.performHealthChecks();
      await this.cleanupIdleConnections();
      await this.scaleConnections();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all connections
   */
  async performHealthChecks() {
    for (const [tenantId, pool] of this.connectionPool) {
      const unhealthyConnections = [];
      
      for (const connection of pool.connections) {
        if (!connection.inUse) {
          const healthy = await this.testConnection(connection);
          if (!healthy) {
            unhealthyConnections.push(connection);
          }
        }
      }

      // Remove unhealthy connections
      for (const connection of unhealthyConnections) {
        await this.removeConnection(pool, connection);
      }

      if (unhealthyConnections.length > 0) {
        logger.info('Removed unhealthy connections', {
          tenantId,
          removed: unhealthyConnections.length,
          remaining: pool.connections.length,
          operation_type: 'health_check_cleanup'
        });
      }
    }
  }

  /**
   * Remove connection from pool
   */
  async removeConnection(pool, connection) {
    // Remove from all arrays
    pool.connections = pool.connections.filter(c => c.id !== connection.id);
    pool.available = pool.available.filter(c => c.id !== connection.id);
    pool.busy = pool.busy.filter(c => c.id !== connection.id);
    
    pool.metrics.totalConnections--;
    if (connection.inUse) {
      pool.metrics.activeConnections--;
    }
  }

  /**
   * Cleanup idle connections
   */
  async cleanupIdleConnections() {
    const now = Date.now();
    
    for (const [tenantId, pool] of this.connectionPool) {
      const idleConnections = pool.available.filter(connection => 
        now - connection.lastUsed > this.config.connectionIdleTimeout &&
        pool.connections.length > this.config.minConnectionsPerTenant
      );

      for (const connection of idleConnections) {
        await this.removeConnection(pool, connection);
      }

      if (idleConnections.length > 0) {
        logger.debug('Cleaned up idle connections', {
          tenantId,
          cleaned: idleConnections.length,
          remaining: pool.connections.length,
          operation_type: 'idle_cleanup'
        });
      }
    }
  }

  /**
   * Auto-scale connections based on load
   */
  async scaleConnections() {
    for (const [tenantId, pool] of this.connectionPool) {
      const utilization = pool.busy.length / pool.connections.length;
      
      // Scale up if utilization is high
      if (utilization > this.config.scalingThreshold && 
          pool.connections.length < this.config.maxConnectionsPerTenant) {
        try {
          await this.createConnection(pool);
          logger.info('Scaled up connections', {
            tenantId,
            utilization: (utilization * 100).toFixed(1) + '%',
            totalConnections: pool.connections.length,
            operation_type: 'scale_up'
          });
        } catch (error) {
          logger.warn('Failed to scale up connections', {
            tenantId,
            error: error.message,
            operation_type: 'scale_up_error'
          });
        }
      }
    }
  }

  /**
   * Start metrics collector
   */
  startMetricsCollector() {
    setInterval(() => {
      this.collectAndLogMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Collect and log metrics
   */
  collectAndLogMetrics() {
    const globalMetrics = {
      totalPools: this.connectionPool.size,
      totalConnections: 0,
      activeConnections: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      tenantMetrics: {}
    };

    for (const [tenantId, pool] of this.connectionPool) {
      const metrics = pool.metrics;
      globalMetrics.totalConnections += pool.connections.length;
      globalMetrics.activeConnections += pool.busy.length;
      globalMetrics.totalRequests += metrics.completedRequests + metrics.failedRequests;
      
      globalMetrics.tenantMetrics[tenantId] = {
        connections: pool.connections.length,
        activeConnections: pool.busy.length,
        completedRequests: metrics.completedRequests,
        failedRequests: metrics.failedRequests,
        avgResponseTime: metrics.avgResponseTime,
        utilization: pool.connections.length > 0 ? (pool.busy.length / pool.connections.length * 100).toFixed(1) + '%' : '0%'
      };
    }

    if (globalMetrics.totalRequests > 0) {
      const totalResponseTime = Array.from(this.connectionMetrics.values())
        .reduce((sum, m) => sum + m.totalResponseTime, 0);
      globalMetrics.avgResponseTime = totalResponseTime / globalMetrics.totalRequests;
    }

    logger.info('Sheets optimizer metrics', {
      metrics: globalMetrics,
      operation_type: 'metrics_collection'
    });
  }

  /**
   * Initialize auto-scaling
   */
  initializeAutoScaling() {
    logger.info('Sheets optimizer initialized', {
      config: this.config,
      operation_type: 'optimizer_initialization'
    });
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get optimizer metrics
   */
  getMetrics() {
    const metrics = {
      pools: this.connectionPool.size,
      totalConnections: 0,
      activeConnections: 0,
      config: this.config,
      tenants: {}
    };

    for (const [tenantId, pool] of this.connectionPool) {
      metrics.totalConnections += pool.connections.length;
      metrics.activeConnections += pool.busy.length;
      metrics.tenants[tenantId] = {
        connections: pool.connections.length,
        active: pool.busy.length,
        available: pool.available.length,
        metrics: pool.metrics
      };
    }

    return metrics;
  }

  /**
   * Close all connections for a tenant
   */
  async closeTenantConnections(tenantId) {
    const pool = this.connectionPool.get(tenantId);
    if (!pool) return;

    // Remove all connections
    for (const connection of pool.connections) {
      // Connections will be garbage collected
    }

    this.connectionPool.delete(tenantId);
    this.requestQueue.delete(tenantId);
    this.connectionMetrics.delete(tenantId);

    logger.info('Closed tenant connections', {
      tenantId,
      operation_type: 'tenant_cleanup'
    });
  }

  /**
   * Shutdown optimizer
   */
  async shutdown() {
    logger.info('Shutting down sheets optimizer');
    
    for (const tenantId of this.connectionPool.keys()) {
      await this.closeTenantConnections(tenantId);
    }
  }
}

// Export singleton instance
const sheetsOptimizer = new SheetsOptimizer();
export default sheetsOptimizer;
export { SheetsOptimizer };