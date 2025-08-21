/**
 * Google Sheets Connection Pool - Performance Optimization
 * Manages connection reuse and rate limiting to prevent 429 errors
 */

import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

class SheetsConnectionPool {
  constructor() {
    this.pool = new Map(); // tenantId -> { doc, auth, lastUsed, inUse, useCount }
    // Reasonable limits for production while protecting quotas
    const envMaxConns = Number(process.env.SHEETS_MAX_CONNECTIONS || 100);
    const envMaxConcurrent = Number(process.env.SHEETS_MAX_CONCURRENT || 25);
    const envMaxRequests = Number(process.env.SHEETS_MAX_REQUESTS || 80);
    this.maxConnections = Math.max(1, Math.min(envMaxConns, 200)); // Increased from 50 to 200
    this.maxConcurrent = Math.max(1, Math.min(envMaxConcurrent, 50)); // Increased from 2 to 50
    this.connectionTtl =
      Number(process.env.SHEETS_CONNECTION_TTL_SEC || 300) * 1000; // 5 minutes

    // Connection queue for handling concurrent limit gracefully
    this.connectionQueue = [];
    this.queueTimeout = Number(process.env.SHEETS_QUEUE_TIMEOUT_MS || 10000); // 10 seconds

    // Rate limiting - Google Sheets quota: 100 requests per 100 seconds per user
    this.rateLimiter = {
      requests: new Map(), // timestamp array per tenant
      maxRequests: Math.max(1, Math.min(envMaxRequests, 90)), // Increased from 20 to 90/100s
      windowMs: Number(process.env.SHEETS_RATE_WINDOW_MS || 100000), // 100 seconds
    };

    // Connection metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      rateLimitHits: 0,
      poolHits: 0,
      poolMisses: 0,
      connectionsCreated: 0,
      connectionsDestroyed: 0,
      errors: 0,
    };

    // Cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get or create connection for a tenant
   */
  async getConnection(tenantId, sheetId) {
    const poolKey = `${tenantId}:${sheetId}`;

    // Check rate limiting first
    if (!this.checkRateLimit(tenantId)) {
      this.metrics.rateLimitHits++;
      throw new Error(
        `Rate limit exceeded for tenant ${tenantId}. Please try again later.`,
      );
    }

    // Try to get from pool
    let poolEntry = this.pool.get(poolKey);

    if (poolEntry && !this.isExpired(poolEntry) && !poolEntry.inUse) {
      poolEntry.inUse = true;
      poolEntry.lastUsed = Date.now();
      poolEntry.useCount++;
      this.metrics.poolHits++;
      return {
        doc: poolEntry.doc,
        release: () => this.releaseConnection(poolKey),
      };
    }

    // Check connection limits - use queuing if at limit
    if (this.metrics.activeConnections >= this.maxConcurrent) {
      return await this.queueConnection(tenantId, sheetId, poolKey);
    }

    // Create new connection
    this.metrics.poolMisses++;
    return await this.createConnection(tenantId, sheetId, poolKey);
  }

  /**
   * Queue connection request when at concurrent limit
   */
  async queueConnection(tenantId, sheetId, poolKey) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from queue if timeout
        const index = this.connectionQueue.findIndex(
          (item) => item.resolve === resolve,
        );
        if (index !== -1) {
          this.connectionQueue.splice(index, 1);
        }
        reject(
          new Error(
            `Connection request timed out for tenant ${tenantId} after ${this.queueTimeout}ms`,
          ),
        );
      }, this.queueTimeout);

      this.connectionQueue.push({
        tenantId,
        sheetId,
        poolKey,
        resolve,
        reject,
        timeoutId,
        queuedAt: Date.now(),
      });

      // Try to process queue immediately in case a connection was just released
      this.processQueue();
    });
  }

  /**
   * Process queued connection requests
   */
  async processQueue() {
    if (
      this.connectionQueue.length === 0 ||
      this.metrics.activeConnections >= this.maxConcurrent
    ) {
      return;
    }

    const queuedRequest = this.connectionQueue.shift();
    clearTimeout(queuedRequest.timeoutId);

    try {
      this.metrics.poolMisses++;
      const connection = await this.createConnection(
        queuedRequest.tenantId,
        queuedRequest.sheetId,
        queuedRequest.poolKey,
      );
      queuedRequest.resolve(connection);
    } catch (error) {
      queuedRequest.reject(error);
    }

    // Process next item in queue if we still have capacity
    if (
      this.connectionQueue.length > 0 &&
      this.metrics.activeConnections < this.maxConcurrent
    ) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Create new connection
   */
  async createConnection(tenantId, sheetId, poolKey) {
    try {
      const { GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
      if (!GOOGLE_SERVICE_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error("Google Sheets authentication not configured");
      }

      const serviceAccountAuth = new JWT({
        email: GOOGLE_SERVICE_EMAIL,
        key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
      await doc.loadInfo();

      // Add to pool
      const poolEntry = {
        doc,
        auth: serviceAccountAuth,
        tenantId,
        sheetId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        inUse: true,
        useCount: 1,
      };

      // Evict old connections if pool is full
      if (this.pool.size >= this.maxConnections) {
        this.evictOldest();
      }

      this.pool.set(poolKey, poolEntry);
      this.metrics.connectionsCreated++;
      this.metrics.activeConnections++;
      this.recordRequest(tenantId);

      return {
        doc,
        release: () => this.releaseConnection(poolKey),
      };
    } catch (error) {
      this.metrics.errors++;

      // Handle specific Google Sheets errors
      if (error.message.includes("429") || error.message.includes("quota")) {
        throw new Error(
          `Google Sheets quota exceeded for tenant ${tenantId}. Please try again later.`,
        );
      }

      if (error.message.includes("403")) {
        throw new Error(
          `Access denied to sheet ${sheetId} for tenant ${tenantId}. Check permissions.`,
        );
      }

      if (error.message.includes("404")) {
        throw new Error(`Sheet ${sheetId} not found for tenant ${tenantId}.`);
      }

      throw new Error(
        `Failed to connect to Google Sheets for tenant ${tenantId}: ${error.message}`,
      );
    }
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(poolKey) {
    const poolEntry = this.pool.get(poolKey);
    if (poolEntry) {
      poolEntry.inUse = false;
      poolEntry.lastUsed = Date.now();
      this.metrics.activeConnections = Math.max(
        0,
        this.metrics.activeConnections - 1,
      );

      // Process any queued connections now that we have capacity
      if (this.connectionQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Check if connection is expired
   */
  isExpired(poolEntry) {
    return Date.now() - poolEntry.lastUsed > this.connectionTtl;
  }

  /**
   * Check rate limiting for tenant
   */
  checkRateLimit(tenantId) {
    const now = Date.now();
    let requests = this.rateLimiter.requests.get(tenantId) || [];

    // Remove requests outside the window
    requests = requests.filter(
      (timestamp) => now - timestamp < this.rateLimiter.windowMs,
    );

    // Check if under limit
    if (requests.length >= this.rateLimiter.maxRequests) {
      return false;
    }

    this.rateLimiter.requests.set(tenantId, requests);
    return true;
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(tenantId) {
    const now = Date.now();
    let requests = this.rateLimiter.requests.get(tenantId) || [];
    requests.push(now);

    // Clean old requests
    requests = requests.filter(
      (timestamp) => now - timestamp < this.rateLimiter.windowMs,
    );
    this.rateLimiter.requests.set(tenantId, requests);
  }

  /**
   * Evict oldest unused connection
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.pool) {
      if (!entry.inUse && entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.destroyConnection(oldestKey);
    }
  }

  /**
   * Destroy connection
   */
  destroyConnection(poolKey) {
    const poolEntry = this.pool.get(poolKey);
    if (poolEntry) {
      this.pool.delete(poolKey);
      this.metrics.connectionsDestroyed++;

      if (poolEntry.inUse) {
        this.metrics.activeConnections = Math.max(
          0,
          this.metrics.activeConnections - 1,
        );
      }
    }
  }

  /**
   * Cleanup expired connections
   */
  cleanup() {
    const now = Date.now();
    const expired = [];

    for (const [key, entry] of this.pool) {
      if (!entry.inUse && this.isExpired(entry)) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.destroyConnection(key));

    // Cleanup rate limiter
    for (const [tenantId, requests] of this.rateLimiter.requests) {
      const filtered = requests.filter(
        (timestamp) => now - timestamp < this.rateLimiter.windowMs,
      );
      if (filtered.length === 0) {
        this.rateLimiter.requests.delete(tenantId);
      } else {
        this.rateLimiter.requests.set(tenantId, filtered);
      }
    }

    return expired.length;
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    const cleanupInterval = Number(
      process.env.SHEETS_CLEANUP_INTERVAL_MS || 60000,
    ); // 1 minute

    setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(
          `SheetsConnectionPool: Cleaned up ${cleaned} expired connections`,
        );
      }
    }, cleanupInterval);
  }

  /**
   * Clear all connections for a tenant
   */
  clearTenant(tenantId) {
    let cleared = 0;

    for (const [key, entry] of this.pool) {
      if (entry.tenantId === tenantId) {
        this.destroyConnection(key);
        cleared++;
      }
    }

    // Clear rate limiting
    this.rateLimiter.requests.delete(tenantId);

    return cleared;
  }

  /**
   * Clear all connections
   */
  clear() {
    const size = this.pool.size;
    this.pool.clear();
    this.rateLimiter.requests.clear();

    // Clear and reject any queued requests
    this.connectionQueue.forEach((item) => {
      clearTimeout(item.timeoutId);
      item.reject(new Error("Connection pool was cleared"));
    });
    this.connectionQueue = [];

    this.metrics.activeConnections = 0;
    this.metrics.connectionsDestroyed += size;

    return size;
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const tenantStats = new Map();

    for (const entry of this.pool.values()) {
      if (!tenantStats.has(entry.tenantId)) {
        tenantStats.set(entry.tenantId, {
          connections: 0,
          inUse: 0,
          requests: 0,
        });
      }
      const stats = tenantStats.get(entry.tenantId);
      stats.connections++;
      if (entry.inUse) stats.inUse++;
    }

    // Add request counts
    for (const [tenantId, requests] of this.rateLimiter.requests) {
      if (!tenantStats.has(tenantId)) {
        tenantStats.set(tenantId, { connections: 0, inUse: 0, requests: 0 });
      }
      tenantStats.get(tenantId).requests = requests.length;
    }

    const hitRate =
      this.metrics.poolHits + this.metrics.poolMisses > 0
        ? (this.metrics.poolHits /
            (this.metrics.poolHits + this.metrics.poolMisses)) *
          100
        : 0;

    return {
      pool: {
        size: this.pool.size,
        maxConnections: this.maxConnections,
        maxConcurrent: this.maxConcurrent,
        connectionTtl: this.connectionTtl,
      },
      queue: {
        pending: this.connectionQueue.length,
        timeoutMs: this.queueTimeout,
      },
      rateLimiting: {
        maxRequests: this.rateLimiter.maxRequests,
        windowMs: this.rateLimiter.windowMs,
        activeTenants: this.rateLimiter.requests.size,
      },
      metrics: {
        ...this.metrics,
        hitRate: Number(hitRate.toFixed(2)),
      },
      tenants: Object.fromEntries(tenantStats),
    };
  }

  /**
   * Get tenant-specific rate limit status
   */
  getTenantRateLimit(tenantId) {
    const requests = this.rateLimiter.requests.get(tenantId) || [];
    const remaining = Math.max(
      0,
      this.rateLimiter.maxRequests - requests.length,
    );
    const resetTime =
      requests.length > 0
        ? Math.max(...requests) + this.rateLimiter.windowMs
        : Date.now();

    return {
      limit: this.rateLimiter.maxRequests,
      remaining,
      resetTime,
      windowMs: this.rateLimiter.windowMs,
    };
  }
}

// Singleton instance
const sheetsPool = new SheetsConnectionPool();

export default sheetsPool;
export { SheetsConnectionPool };
