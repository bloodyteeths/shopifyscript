/**
 * Dashboard Cache Service for ProofKit SaaS
 * Intelligent caching system for dashboard data aggregation
 *
 * Features:
 * - Smart TTL based on data type and volatility
 * - Cache invalidation strategies
 * - Preloading for frequently accessed data
 * - Performance metrics and monitoring
 * - Tenant isolation
 */

import logger from './logger.js';

/**
 * Dashboard-specific cache with intelligent TTL and preloading
 */
class DashboardCacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.accessStats = new Map();
    this.preloadQueue = new Map();

    // Configuration
    this.config = {
      maxSize: Number(process.env.DASHBOARD_CACHE_MAX_SIZE || 1000),
      cleanupInterval: 60000, // 1 minute
      preloadThreshold: 5, // Preload after 5 accesses
      maxPreloadAge: 30000 // 30 seconds before preload refresh
    };

    // Smart TTL configuration based on data volatility
    this.dataTtls = new Map([
      // High volatility - short TTL
      ['activity_feed', 30 * 1000], // 30 seconds
      ['optimization_queue', 60 * 1000], // 1 minute
      ['real_time_metrics', 60 * 1000], // 1 minute

      // Medium volatility - medium TTL
      ['performance_metrics', 5 * 60 * 1000], // 5 minutes
      ['data_sources_summary', 5 * 60 * 1000], // 5 minutes
      ['campaign_stats', 5 * 60 * 1000], // 5 minutes

      // Low volatility - long TTL
      ['system_overview', 15 * 60 * 1000], // 15 minutes
      ['tenant_config', 30 * 60 * 1000], // 30 minutes
      ['competitor_analysis', 60 * 60 * 1000], // 1 hour

      // Very low volatility - very long TTL
      ['scraped_content', 24 * 60 * 60 * 1000], // 24 hours
      ['demographic_profiles', 12 * 60 * 60 * 1000] // 12 hours
    ]);

    // Dependency mapping for cache invalidation
    this.dependencies = new Map([
      ['system_overview', ['performance_metrics', 'data_sources_summary']],
      ['performance_metrics', ['campaign_stats', 'real_time_metrics']],
      ['optimization_queue', ['campaign_stats', 'performance_metrics']],
      ['activity_feed', ['optimization_queue', 'system_overview']]
    ]);

    this.startCleanupTimer();
    console.log('🗄️  Dashboard Cache Service initialized');
  }

  /**
   * Generate cache key with tenant isolation
   */
  generateKey(tenantId, dataType, params = {}) {
    if (!tenantId) {
      throw new Error('Tenant ID is required for dashboard cache');
    }

    const normalizedParams = this._normalizeParams(params);
    const paramString = Object.keys(normalizedParams).length > 0
      ? `?${new URLSearchParams(normalizedParams).toString()}`
      : '';

    return `dashboard:${tenantId}:${dataType}${paramString}`;
  }

  /**
   * Set cache entry with intelligent TTL
   */
  set(tenantId, dataType, data, params = {}, customTtl = null) {
    const key = this.generateKey(tenantId, dataType, params);
    const ttl = customTtl || this.dataTtls.get(dataType) || (5 * 60 * 1000); // Default 5 minutes
    const expires = Date.now() + ttl;

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this._evictOldest();
    }

    const entry = {
      data,
      expires,
      tenantId,
      dataType,
      params,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this._estimateSize(data)
    };

    this.cache.set(key, entry);
    this.ttlMap.set(key, expires);
    this._updateAccessStats(tenantId, dataType, 'set');

    logger.debug('Dashboard cache set', {
      tenantId,
      dataType,
      key,
      ttl: `${ttl / 1000}s`,
      size: entry.size
    });

    return key;
  }

  /**
   * Get cache entry with access tracking
   */
  get(tenantId, dataType, params = {}) {
    const key = this.generateKey(tenantId, dataType, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this._updateAccessStats(tenantId, dataType, 'miss');
      this._checkPreloadEligibility(tenantId, dataType, params);
      return null;
    }

    if (Date.now() > entry.expires) {
      this._delete(key);
      this._updateAccessStats(tenantId, dataType, 'expired');
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this._updateAccessStats(tenantId, dataType, 'hit');

    // Check if this should be preloaded
    this._checkPreloadEligibility(tenantId, dataType, params);

    logger.debug('Dashboard cache hit', {
      tenantId,
      dataType,
      key,
      accessCount: entry.accessCount,
      age: `${(Date.now() - entry.createdAt) / 1000}s`
    });

    return entry.data;
  }

  /**
   * Check if data exists in cache and is valid
   */
  has(tenantId, dataType, params = {}) {
    const key = this.generateKey(tenantId, dataType, params);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this._delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate cache entries by data type
   */
  invalidate(tenantId, dataType) {
    let invalidated = 0;

    // Invalidate direct entries
    for (const [key, entry] of this.cache) {
      if (entry.tenantId === tenantId && entry.dataType === dataType) {
        this._delete(key);
        invalidated++;
      }
    }

    // Invalidate dependent entries
    const dependents = this._getDependents(dataType);
    for (const dependent of dependents) {
      for (const [key, entry] of this.cache) {
        if (entry.tenantId === tenantId && entry.dataType === dependent) {
          this._delete(key);
          invalidated++;
        }
      }
    }

    logger.info('Dashboard cache invalidated', {
      tenantId,
      dataType,
      invalidated,
      dependents: dependents.length
    });

    return invalidated;
  }

  /**
   * Invalidate all cache entries for a tenant
   */
  invalidateTenant(tenantId) {
    let invalidated = 0;

    for (const [key, entry] of this.cache) {
      if (entry.tenantId === tenantId) {
        this._delete(key);
        invalidated++;
      }
    }

    this._updateAccessStats(tenantId, 'all', 'tenant_invalidate', invalidated);

    logger.info('Dashboard cache tenant invalidated', {
      tenantId,
      invalidated
    });

    return invalidated;
  }

  /**
   * Preload frequently accessed data
   */
  async preload(tenantId, dataType, params = {}, dataLoader) {
    const key = this.generateKey(tenantId, dataType, params);

    // Check if already cached and fresh
    if (this.has(tenantId, dataType, params)) {
      const entry = this.cache.get(key);
      const age = Date.now() - entry.createdAt;

      if (age < this.config.maxPreloadAge) {
        return; // Still fresh, no need to preload
      }
    }

    try {
      logger.debug('Dashboard cache preloading', {
        tenantId,
        dataType,
        key
      });

      const data = await dataLoader();
      this.set(tenantId, dataType, data, params);

      this._updateAccessStats(tenantId, dataType, 'preload');
    } catch (error) {
      logger.error('Dashboard cache preload failed', {
        tenantId,
        dataType,
        error: error.message
      });
    }
  }

  /**
   * Get cache statistics for a tenant
   */
  getTenantStats(tenantId) {
    const stats = this.accessStats.get(tenantId) || this._createEmptyStats();
    const entries = Array.from(this.cache.values()).filter(entry => entry.tenantId === tenantId);

    const totalHits = Object.values(stats.dataTypes).reduce((sum, dt) => sum + dt.hits, 0);
    const totalMisses = Object.values(stats.dataTypes).reduce((sum, dt) => sum + dt.misses, 0);
    const hitRate = totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses)) * 100
      : 0;

    return {
      hitRate: Number(hitRate.toFixed(2)),
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      dataTypes: stats.dataTypes,
      preloadQueue: this.preloadQueue.get(tenantId)?.size || 0
    };
  }

  /**
   * Get global cache statistics
   */
  getGlobalStats() {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    let totalHits = 0;
    let totalMisses = 0;
    const dataTypeStats = {};

    for (const stats of this.accessStats.values()) {
      for (const [dataType, dtStats] of Object.entries(stats.dataTypes)) {
        if (!dataTypeStats[dataType]) {
          dataTypeStats[dataType] = { hits: 0, misses: 0, sets: 0 };
        }
        dataTypeStats[dataType].hits += dtStats.hits;
        dataTypeStats[dataType].misses += dtStats.misses;
        dataTypeStats[dataType].sets += dtStats.sets;
        totalHits += dtStats.hits;
        totalMisses += dtStats.misses;
      }
    }

    const hitRate = totalHits + totalMisses > 0
      ? (totalHits / (totalHits + totalMisses)) * 100
      : 0;

    return {
      hitRate: Number(hitRate.toFixed(2)),
      totalEntries,
      totalSize,
      maxSize: this.config.maxSize,
      tenantCount: this.accessStats.size,
      dataTypeStats,
      memoryUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttlMap.clear();
    this.accessStats.clear();
    this.preloadQueue.clear();
    return size;
  }

  /**
   * Private: Delete cache entry
   */
  _delete(key) {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      this._updateAccessStats(entry.tenantId, entry.dataType, 'delete');
      return true;
    }
    return false;
  }

  /**
   * Private: Normalize parameters for consistent caching
   */
  _normalizeParams(params) {
    const normalized = {};

    // Sort keys and normalize values
    Object.keys(params).sort().forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        normalized[key] = String(value);
      }
    });

    return normalized;
  }

  /**
   * Private: Estimate data size
   */
  _estimateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Rough byte estimation
    } catch {
      return 1000; // Default estimate
    }
  }

  /**
   * Private: Update access statistics
   */
  _updateAccessStats(tenantId, dataType, operation, count = 1) {
    if (!this.accessStats.has(tenantId)) {
      this.accessStats.set(tenantId, this._createEmptyStats());
    }

    const stats = this.accessStats.get(tenantId);

    if (!stats.dataTypes[dataType]) {
      stats.dataTypes[dataType] = { hits: 0, misses: 0, sets: 0, expired: 0, deletes: 0, preloads: 0 };
    }

    if (stats.dataTypes[dataType][operation] !== undefined) {
      stats.dataTypes[dataType][operation] += count;
    }

    stats.lastActivity = Date.now();
  }

  /**
   * Private: Create empty stats object
   */
  _createEmptyStats() {
    return {
      dataTypes: {},
      lastActivity: Date.now()
    };
  }

  /**
   * Private: Check if data should be preloaded
   */
  _checkPreloadEligibility(tenantId, dataType, params) {
    const key = this.generateKey(tenantId, dataType, params);

    if (!this.preloadQueue.has(tenantId)) {
      this.preloadQueue.set(tenantId, new Map());
    }

    const tenantQueue = this.preloadQueue.get(tenantId);
    const accessInfo = tenantQueue.get(key) || { count: 0, lastAccess: 0 };

    accessInfo.count++;
    accessInfo.lastAccess = Date.now();
    tenantQueue.set(key, accessInfo);

    // Mark for preload if threshold reached
    if (accessInfo.count >= this.config.preloadThreshold) {
      accessInfo.shouldPreload = true;
    }
  }

  /**
   * Private: Get dependent data types
   */
  _getDependents(dataType) {
    const dependents = [];

    for (const [dependent, dependencies] of this.dependencies) {
      if (dependencies.includes(dataType)) {
        dependents.push(dependent);
      }
    }

    return dependents;
  }

  /**
   * Private: Evict oldest entries (LRU)
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._delete(oldestKey);
    }
  }

  /**
   * Private: Cleanup expired entries
   */
  _cleanup() {
    const now = Date.now();
    const expired = [];

    for (const [key, expires] of this.ttlMap) {
      if (now > expires) {
        expired.push(key);
      }
    }

    expired.forEach(key => this._delete(key));

    if (expired.length > 0) {
      logger.debug('Dashboard cache cleanup', {
        expired: expired.length,
        remaining: this.cache.size
      });
    }

    return expired.length;
  }

  /**
   * Private: Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this._cleanup();
    }, this.config.cleanupInterval);
  }
}

// Export singleton instance
const dashboardCache = new DashboardCacheService();

export default dashboardCache;
export { DashboardCacheService };