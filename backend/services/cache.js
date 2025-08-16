/**
 * Tenant-Aware Caching Service - Multi-Tenant Infrastructure
 * Provides isolated caching with tenant-specific namespacing
 */

class TenantAwareCache {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.stats = new Map();
    this.maxSize = Number(process.env.CACHE_MAX_SIZE || 10000);
    this.defaultTtl = Number(process.env.CACHE_DEFAULT_TTL_SEC || 300) * 1000; // 5 minutes
    this.cleanupInterval = 60000; // 1 minute
    
    // Configure TTL by path pattern
    this.pathTtls = new Map([
      ['/api/insights', Number(process.env.INSIGHTS_CACHE_TTL_SEC || 60) * 1000],
      ['/api/config', Number(process.env.CONFIG_CACHE_TTL_SEC || 15) * 1000],
      ['/api/run-logs', Number(process.env.RUNLOGS_CACHE_TTL_SEC || 10) * 1000],
      ['/api/summary', Number(process.env.SUMMARY_CACHE_TTL_SEC || 30) * 1000],
      ['/api/insights/terms', Number(process.env.TERMS_CACHE_TTL_SEC || 120) * 1000]
    ]);

    this.startCleanupTimer();
  }

  /**
   * Generate cache key with tenant isolation
   */
  generateKey(tenantId, path, params = {}) {
    const normalizedTenant = String(tenantId || 'default');
    const normalizedPath = String(path || '');
    
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const key = `${normalizedTenant}:${normalizedPath}${sortedParams ? `?${sortedParams}` : ''}`;
    return key;
  }

  /**
   * Get TTL for a specific path
   */
  getTtlForPath(path) {
    for (const [pattern, ttl] of this.pathTtls) {
      if (path.startsWith(pattern)) {
        return ttl;
      }
    }
    return this.defaultTtl;
  }

  /**
   * Set cache entry with tenant isolation
   */
  set(tenantId, path, params, data, customTtl = null) {
    const key = this.generateKey(tenantId, path, params);
    const ttl = customTtl || this.getTtlForPath(path);
    const expires = Date.now() + ttl;
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry = {
      data,
      expires,
      tenantId,
      path,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.ttlMap.set(key, expires);
    
    // Update stats
    this.updateStats(tenantId, 'set');
    
    return key;
  }

  /**
   * Get cache entry with tenant isolation
   */
  get(tenantId, path, params = {}) {
    const key = this.generateKey(tenantId, path, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.updateStats(tenantId, 'miss');
      return null;
    }

    if (Date.now() > entry.expires) {
      this.delete(key);
      this.updateStats(tenantId, 'expired');
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.updateStats(tenantId, 'hit');
    return entry.data;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      this.updateStats(entry.tenantId, 'delete');
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries for a tenant
   */
  clearTenant(tenantId) {
    const normalizedTenant = String(tenantId || 'default');
    let cleared = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tenantId === normalizedTenant) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
        cleared++;
      }
    }
    
    this.updateStats(tenantId, 'clear', cleared);
    return cleared;
  }

  /**
   * Clear cache entries by path pattern for a tenant
   */
  clearTenantPath(tenantId, pathPattern) {
    const normalizedTenant = String(tenantId || 'default');
    let cleared = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tenantId === normalizedTenant && entry.path.startsWith(pathPattern)) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
        cleared++;
      }
    }
    
    this.updateStats(tenantId, 'clearPath', cleared);
    return cleared;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttlMap.clear();
    this.stats.clear();
    return size;
  }

  /**
   * Check if key exists and is valid
   */
  has(tenantId, path, params = {}) {
    const key = this.generateKey(tenantId, path, params);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache size for a tenant
   */
  getTenantSize(tenantId) {
    const normalizedTenant = String(tenantId || 'default');
    let count = 0;
    
    for (const entry of this.cache.values()) {
      if (entry.tenantId === normalizedTenant) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Update cache statistics
   */
  updateStats(tenantId, operation, count = 1) {
    const normalizedTenant = String(tenantId || 'default');
    
    if (!this.stats.has(normalizedTenant)) {
      this.stats.set(normalizedTenant, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        expired: 0,
        clears: 0,
        clearPaths: 0,
        lastActivity: Date.now()
      });
    }
    
    const stats = this.stats.get(normalizedTenant);
    if (operation in stats) {
      stats[operation] += count;
    }
    stats.lastActivity = Date.now();
  }

  /**
   * Get cache statistics for a tenant
   */
  getTenantStats(tenantId) {
    const normalizedTenant = String(tenantId || 'default');
    const stats = this.stats.get(normalizedTenant) || {
      hits: 0, misses: 0, sets: 0, deletes: 0, expired: 0, clears: 0, clearPaths: 0
    };
    
    const hitRate = stats.hits + stats.misses > 0 
      ? (stats.hits / (stats.hits + stats.misses)) * 100 
      : 0;
    
    return {
      ...stats,
      hitRate: Number(hitRate.toFixed(2)),
      size: this.getTenantSize(tenantId)
    };
  }

  /**
   * Get global cache statistics
   */
  getGlobalStats() {
    const totalStats = {
      hits: 0, misses: 0, sets: 0, deletes: 0, expired: 0, clears: 0, clearPaths: 0
    };
    
    for (const stats of this.stats.values()) {
      Object.keys(totalStats).forEach(key => {
        totalStats[key] += stats[key] || 0;
      });
    }
    
    const hitRate = totalStats.hits + totalStats.misses > 0 
      ? (totalStats.hits / (totalStats.hits + totalStats.misses)) * 100 
      : 0;
    
    return {
      ...totalStats,
      hitRate: Number(hitRate.toFixed(2)),
      totalSize: this.cache.size,
      maxSize: this.maxSize,
      tenantCount: this.stats.size,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Evict oldest entries (LRU)
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const expired = [];
    
    for (const [key, expires] of this.ttlMap) {
      if (now > expires) {
        expired.push(key);
      }
    }
    
    expired.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.updateStats(entry.tenantId, 'expired');
      }
      this.cache.delete(key);
      this.ttlMap.delete(key);
    });
    
    return expired.length;
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`TenantAwareCache: Cleaned up ${cleaned} expired entries`);
      }
    }, this.cleanupInterval);
  }

  /**
   * Estimate memory usage
   */
  getMemoryUsage() {
    // Rough estimation of memory usage
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.data).length * 2; // Rough byte estimation
    }
    return {
      estimated: `${(size / 1024 / 1024).toFixed(2)} MB`,
      entries: this.cache.size
    };
  }

  /**
   * Export cache configuration
   */
  getConfig() {
    return {
      maxSize: this.maxSize,
      defaultTtl: this.defaultTtl,
      cleanupInterval: this.cleanupInterval,
      pathTtls: Object.fromEntries(this.pathTtls)
    };
  }
}

// Singleton instance
const tenantCache = new TenantAwareCache();

export default tenantCache;
export { TenantAwareCache };