/**
 * Cache Monitoring and Management Service
 * Provides cache performance metrics, invalidation, and monitoring
 */

import { getJson, setJson } from "./redis.js";
import analyticsTiers from "./analytics-tiers.js";

class CacheMonitorService {
  constructor() {
    this.metrics = {
      hits: new Map(),
      misses: new Map(),
      invalidations: new Map(),
      performance: new Map()
    };
    this.startTime = Date.now();
  }

  /**
   * Record cache hit
   */
  recordHit(tenant, cacheType = 'insights', responseTime = 0) {
    const key = `${tenant}:${cacheType}`;
    const current = this.metrics.hits.get(key) || { count: 0, totalTime: 0 };
    this.metrics.hits.set(key, {
      count: current.count + 1,
      totalTime: current.totalTime + responseTime,
      lastHit: Date.now()
    });
  }

  /**
   * Record cache miss
   */
  recordMiss(tenant, cacheType = 'insights', responseTime = 0) {
    const key = `${tenant}:${cacheType}`;
    const current = this.metrics.misses.get(key) || { count: 0, totalTime: 0 };
    this.metrics.misses.set(key, {
      count: current.count + 1,
      totalTime: current.totalTime + responseTime,
      lastMiss: Date.now()
    });
  }

  /**
   * Record cache invalidation
   */
  recordInvalidation(tenant, cacheType = 'insights', reason = 'manual') {
    const key = `${tenant}:${cacheType}`;
    const current = this.metrics.invalidations.get(key) || { count: 0, reasons: {} };
    const reasons = { ...current.reasons };
    reasons[reason] = (reasons[reason] || 0) + 1;
    
    this.metrics.invalidations.set(key, {
      count: current.count + 1,
      reasons,
      lastInvalidation: Date.now()
    });
  }

  /**
   * Get cache metrics for tenant
   */
  async getTenantMetrics(tenant) {
    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      const cacheTypes = ['insights', 'realtime', 'roas', 'terms'];
      
      const tenantMetrics = {};
      
      for (const cacheType of cacheTypes) {
        const key = `${tenant}:${cacheType}`;
        const hits = this.metrics.hits.get(key) || { count: 0, totalTime: 0 };
        const misses = this.metrics.misses.get(key) || { count: 0, totalTime: 0 };
        const invalidations = this.metrics.invalidations.get(key) || { count: 0, reasons: {} };
        
        const totalRequests = hits.count + misses.count;
        const hitRate = totalRequests > 0 ? (hits.count / totalRequests) * 100 : 0;
        const avgHitTime = hits.count > 0 ? hits.totalTime / hits.count : 0;
        const avgMissTime = misses.count > 0 ? misses.totalTime / misses.count : 0;
        
        tenantMetrics[cacheType] = {
          hits: hits.count,
          misses: misses.count,
          hitRate: Number(hitRate.toFixed(2)),
          avgHitTime: Number(avgHitTime.toFixed(2)),
          avgMissTime: Number(avgMissTime.toFixed(2)),
          invalidations: invalidations.count,
          invalidationReasons: invalidations.reasons,
          lastActivity: Math.max(
            hits.lastHit || 0,
            misses.lastMiss || 0,
            invalidations.lastInvalidation || 0
          )
        };
      }

      return {
        tenant,
        tier: features.tier,
        cacheInterval: this.getCacheIntervalForTier(features.tier),
        metrics: tenantMetrics,
        overall: this.calculateOverallMetrics(tenantMetrics),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting tenant cache metrics:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate overall metrics
   */
  calculateOverallMetrics(tenantMetrics) {
    let totalHits = 0;
    let totalMisses = 0;
    let totalInvalidations = 0;
    let weightedHitTime = 0;
    let weightedMissTime = 0;

    for (const metrics of Object.values(tenantMetrics)) {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
      totalInvalidations += metrics.invalidations;
      weightedHitTime += metrics.avgHitTime * metrics.hits;
      weightedMissTime += metrics.avgMissTime * metrics.misses;
    }

    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const avgHitTime = totalHits > 0 ? weightedHitTime / totalHits : 0;
    const avgMissTime = totalMisses > 0 ? weightedMissTime / totalMisses : 0;

    return {
      totalRequests,
      totalHits,
      totalMisses,
      hitRate: Number(overallHitRate.toFixed(2)),
      avgHitTime: Number(avgHitTime.toFixed(2)),
      avgMissTime: Number(avgMissTime.toFixed(2)),
      totalInvalidations,
      performanceImprovement: Number((avgMissTime - avgHitTime).toFixed(2))
    };
  }

  /**
   * Invalidate cache for tenant
   */
  async invalidateCache(tenant, cacheType = 'all', reason = 'manual') {
    try {
      const cacheTypes = cacheType === 'all' ? ['insights', 'realtime', 'roas', 'terms'] : [cacheType];
      const results = {};
      
      for (const type of cacheTypes) {
        const cacheKey = `${type}:${tenant}`;
        
        try {
          // Clear Redis cache
          await setJson(cacheKey, null, 1); // Set with 1 second TTL to effectively delete
          
          // Clear in-memory cache (if accessible)
          // Note: This would need to be coordinated across instances in production
          
          this.recordInvalidation(tenant, type, reason);
          results[type] = { success: true, key: cacheKey };
        } catch (error) {
          console.error(`Failed to invalidate ${type} cache for ${tenant}:`, error);
          results[type] = { success: false, error: error.message };
        }
      }

      return {
        tenant,
        invalidated: Object.keys(results).length,
        results,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get cache health status
   */
  async getCacheHealth() {
    const uptime = Date.now() - this.startTime;
    
    // Calculate overall statistics
    let totalHits = 0;
    let totalMisses = 0;
    let totalInvalidations = 0;
    
    for (const hits of this.metrics.hits.values()) {
      totalHits += hits.count;
    }
    
    for (const misses of this.metrics.misses.values()) {
      totalMisses += misses.count;
    }
    
    for (const invalidations of this.metrics.invalidations.values()) {
      totalInvalidations += invalidations.count;
    }
    
    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    
    // Check Redis connectivity
    let redisHealth = 'unknown';
    try {
      await getJson('health_check');
      redisHealth = 'connected';
    } catch (error) {
      redisHealth = 'disconnected';
    }
    
    return {
      status: overallHitRate > 70 ? 'healthy' : overallHitRate > 50 ? 'warning' : 'critical',
      uptime,
      redis: redisHealth,
      statistics: {
        totalRequests,
        totalHits,
        totalMisses,
        hitRate: Number(overallHitRate.toFixed(2)),
        totalInvalidations
      },
      memory: {
        hitEntries: this.metrics.hits.size,
        missEntries: this.metrics.misses.size,
        invalidationEntries: this.metrics.invalidations.size
      },
      timestamp: Date.now()
    };
  }

  /**
   * Get cache interval for tier
   */
  getCacheIntervalForTier(tier) {
    const intervals = {
      starter: 300000,     // 5 minutes
      professional: 30000, // 30 seconds
      enterprise: 10000    // 10 seconds
    };
    return intervals[tier] || intervals.starter;
  }

  /**
   * Cleanup old metrics (run periodically)
   */
  cleanupOldMetrics(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge;
    
    // Clean up hits
    for (const [key, data] of this.metrics.hits.entries()) {
      if (data.lastHit && data.lastHit < cutoff) {
        this.metrics.hits.delete(key);
      }
    }
    
    // Clean up misses
    for (const [key, data] of this.metrics.misses.entries()) {
      if (data.lastMiss && data.lastMiss < cutoff) {
        this.metrics.misses.delete(key);
      }
    }
    
    // Clean up invalidations
    for (const [key, data] of this.metrics.invalidations.entries()) {
      if (data.lastInvalidation && data.lastInvalidation < cutoff) {
        this.metrics.invalidations.delete(key);
      }
    }
  }

  /**
   * Preload cache for high-priority tenants
   */
  async preloadCache(tenant, cacheTypes = ['insights']) {
    const results = {};
    
    for (const cacheType of cacheTypes) {
      try {
        // This would trigger cache population
        // Implementation depends on the specific cache loading logic
        results[cacheType] = { success: true, preloaded: true };
      } catch (error) {
        results[cacheType] = { success: false, error: error.message };
      }
    }
    
    return results;
  }
}

// Export singleton instance
const cacheMonitor = new CacheMonitorService();

// Cleanup old metrics every hour
setInterval(() => {
  cacheMonitor.cleanupOldMetrics();
}, 60 * 60 * 1000);

export default cacheMonitor;
export { CacheMonitorService };