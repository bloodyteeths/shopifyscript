/**
 * Cache Invalidation Strategy - Smart Cache Management
 * Manages cache dependencies and invalidation for Google Sheets data
 */

import tenantCache from './cache.js';

class CacheInvalidationStrategy {
  constructor() {
    this.dependencies = new Map(); // cacheKey -> Set of dependent keys
    this.reverseDependencies = new Map(); // cacheKey -> Set of keys that depend on it
    this.invalidationRules = new Map(); // pattern -> invalidation function
    
    // Tracking metrics
    this.metrics = {
      invalidations: 0,
      dependencyInvalidations: 0,
      ruleInvalidations: 0,
      totalDependencies: 0,
      cascadeDepth: 0
    };

    this.initializeInvalidationRules();
  }

  /**
   * Initialize predefined invalidation rules
   */
  initializeInvalidationRules() {
    // Sheet data changes invalidate related cache entries
    this.addInvalidationRule('sheet:write', (tenantId, context) => {
      const patterns = [
        `/api/insights`,
        `/api/config`,
        `/api/summary`,
        `/api/run-logs`
      ];
      
      patterns.forEach(pattern => {
        tenantCache.clearTenantPath(tenantId, pattern);
      });
    });

    // Config changes invalidate insights and summaries
    this.addInvalidationRule('config:update', (tenantId, context) => {
      const patterns = [
        `/api/insights`,
        `/api/summary`,
        `/api/insights/terms`
      ];
      
      patterns.forEach(pattern => {
        tenantCache.clearTenantPath(tenantId, pattern);
      });
    });

    // Row additions invalidate aggregated data
    this.addInvalidationRule('row:add', (tenantId, context) => {
      const sheetTitle = context?.sheetTitle;
      if (sheetTitle) {
        // Invalidate sheet-specific caches
        tenantCache.clearTenantPath(tenantId, `/api/insights`);
        tenantCache.clearTenantPath(tenantId, `/api/summary`);
        
        // Also invalidate any cached row lists for this sheet
        this.invalidateSheetRowCache(tenantId, sheetTitle);
      }
    });

    // Row updates invalidate specific cached data
    this.addInvalidationRule('row:update', (tenantId, context) => {
      const sheetTitle = context?.sheetTitle;
      const rowId = context?.rowId;
      
      if (sheetTitle) {
        // Invalidate aggregated data
        tenantCache.clearTenantPath(tenantId, `/api/insights`);
        tenantCache.clearTenantPath(tenantId, `/api/summary`);
        
        // Invalidate specific row if ID is available
        if (rowId) {
          this.invalidateRowCache(tenantId, sheetTitle, rowId);
        } else {
          this.invalidateSheetRowCache(tenantId, sheetTitle);
        }
      }
    });

    // Row deletions invalidate aggregated data and row lists
    this.addInvalidationRule('row:delete', (tenantId, context) => {
      const sheetTitle = context?.sheetTitle;
      if (sheetTitle) {
        tenantCache.clearTenantPath(tenantId, `/api/insights`);
        tenantCache.clearTenantPath(tenantId, `/api/summary`);
        this.invalidateSheetRowCache(tenantId, sheetTitle);
      }
    });

    // Tenant configuration changes
    this.addInvalidationRule('tenant:config', (tenantId, context) => {
      // Clear all cache for tenant
      tenantCache.clearTenant(tenantId);
    });

    // Time-based invalidation for insights
    this.addInvalidationRule('time:hourly', (tenantId, context) => {
      tenantCache.clearTenantPath(tenantId, `/api/insights`);
      tenantCache.clearTenantPath(tenantId, `/api/summary`);
    });
  }

  /**
   * Add dependency relationship between cache keys
   */
  addDependency(dependentKey, sourceKey) {
    // Add forward dependency
    if (!this.dependencies.has(dependentKey)) {
      this.dependencies.set(dependentKey, new Set());
    }
    this.dependencies.get(dependentKey).add(sourceKey);

    // Add reverse dependency
    if (!this.reverseDependencies.has(sourceKey)) {
      this.reverseDependencies.set(sourceKey, new Set());
    }
    this.reverseDependencies.get(sourceKey).add(dependentKey);

    this.metrics.totalDependencies++;
  }

  /**
   * Remove dependency relationship
   */
  removeDependency(dependentKey, sourceKey) {
    if (this.dependencies.has(dependentKey)) {
      this.dependencies.get(dependentKey).delete(sourceKey);
      if (this.dependencies.get(dependentKey).size === 0) {
        this.dependencies.delete(dependentKey);
      }
    }

    if (this.reverseDependencies.has(sourceKey)) {
      this.reverseDependencies.get(sourceKey).delete(dependentKey);
      if (this.reverseDependencies.get(sourceKey).size === 0) {
        this.reverseDependencies.delete(sourceKey);
      }
    }

    this.metrics.totalDependencies = Math.max(0, this.metrics.totalDependencies - 1);
  }

  /**
   * Add invalidation rule
   */
  addInvalidationRule(pattern, invalidationFunction) {
    this.invalidationRules.set(pattern, invalidationFunction);
  }

  /**
   * Remove invalidation rule
   */
  removeInvalidationRule(pattern) {
    return this.invalidationRules.delete(pattern);
  }

  /**
   * Invalidate cache with dependency cascade
   */
  invalidate(tenantId, cacheKey, context = {}) {
    const fullKey = tenantCache.generateKey(tenantId, cacheKey.path, cacheKey.params);
    
    // Direct invalidation
    const deleted = tenantCache.delete(fullKey);
    if (deleted) {
      this.metrics.invalidations++;
    }

    // Cascade invalidation to dependent keys
    this.cascadeInvalidation(fullKey, tenantId, 0);

    return deleted;
  }

  /**
   * Invalidate using rule pattern
   */
  invalidateByRule(pattern, tenantId, context = {}) {
    const rule = this.invalidationRules.get(pattern);
    if (rule) {
      try {
        rule(tenantId, context);
        this.metrics.ruleInvalidations++;
      } catch (error) {
        console.error(`Cache invalidation rule '${pattern}' failed:`, error.message);
      }
    }
  }

  /**
   * Cascade invalidation to dependent cache entries
   */
  cascadeInvalidation(sourceKey, tenantId, depth = 0) {
    if (depth > 10) { // Prevent infinite loops
      console.warn('Cache invalidation cascade depth limit reached');
      return;
    }

    this.metrics.cascadeDepth = Math.max(this.metrics.cascadeDepth, depth);

    const dependentKeys = this.reverseDependencies.get(sourceKey);
    if (dependentKeys) {
      for (const dependentKey of dependentKeys) {
        const deleted = tenantCache.delete(dependentKey);
        if (deleted) {
          this.metrics.dependencyInvalidations++;
          
          // Continue cascade
          this.cascadeInvalidation(dependentKey, tenantId, depth + 1);
        }
      }
    }
  }

  /**
   * Invalidate sheet-specific row cache
   */
  invalidateSheetRowCache(tenantId, sheetTitle) {
    // Generate pattern for sheet rows
    const patterns = [
      `/api/sheets/${sheetTitle}/rows`,
      `/api/rows/${sheetTitle}`,
      `/api/data/${sheetTitle}`
    ];

    patterns.forEach(pattern => {
      tenantCache.clearTenantPath(tenantId, pattern);
    });
  }

  /**
   * Invalidate specific row cache
   */
  invalidateRowCache(tenantId, sheetTitle, rowId) {
    const patterns = [
      `/api/sheets/${sheetTitle}/rows/${rowId}`,
      `/api/rows/${sheetTitle}/${rowId}`
    ];

    patterns.forEach(pattern => {
      const key = tenantCache.generateKey(tenantId, pattern);
      tenantCache.delete(key);
    });
  }

  /**
   * Smart invalidation based on operation type
   */
  smartInvalidate(tenantId, operation, context = {}) {
    const { type, sheetTitle, rowId, data } = context;

    switch (operation) {
      case 'sheet:write':
        this.invalidateByRule('sheet:write', tenantId, context);
        if (type === 'addRow' || type === 'addRows') {
          this.invalidateByRule('row:add', tenantId, context);
        }
        break;

      case 'sheet:read':
        // No invalidation needed for reads
        break;

      case 'row:update':
        this.invalidateByRule('row:update', tenantId, context);
        break;

      case 'row:delete':
        this.invalidateByRule('row:delete', tenantId, context);
        break;

      case 'config:update':
        this.invalidateByRule('config:update', tenantId, context);
        break;

      case 'tenant:reset':
        this.invalidateByRule('tenant:config', tenantId, context);
        break;

      default:
        // Default to conservative invalidation
        this.invalidateByRule('sheet:write', tenantId, context);
    }
  }

  /**
   * Time-based invalidation (called by scheduler)
   */
  timeBasedInvalidation(interval = 'hourly') {
    const tenants = tenantCache.stats ? Object.keys(tenantCache.getGlobalStats()) : [];
    
    tenants.forEach(tenantId => {
      this.invalidateByRule(`time:${interval}`, tenantId, {
        timestamp: Date.now(),
        interval
      });
    });
  }

  /**
   * Analyze cache dependencies for optimization
   */
  analyzeDependencies() {
    const analysis = {
      totalDependencies: this.metrics.totalDependencies,
      orphanedKeys: 0,
      cyclicDependencies: [],
      hotspots: new Map(), // Keys with many dependencies
      chains: [] // Long dependency chains
    };

    // Check for orphaned dependencies
    for (const key of this.dependencies.keys()) {
      const hasValidCache = tenantCache.cache ? tenantCache.cache.has(key) : false;
      if (!hasValidCache) {
        analysis.orphanedKeys++;
      }
    }

    // Find dependency hotspots
    for (const [key, dependents] of this.reverseDependencies) {
      if (dependents.size > 5) { // Threshold for hotspot
        analysis.hotspots.set(key, dependents.size);
      }
    }

    // Detect potential cycles (simplified detection)
    const visited = new Set();
    const recursionStack = new Set();
    
    const detectCycle = (key, path = []) => {
      if (recursionStack.has(key)) {
        analysis.cyclicDependencies.push([...path, key]);
        return;
      }
      
      if (visited.has(key)) return;
      
      visited.add(key);
      recursionStack.add(key);
      
      const dependencies = this.dependencies.get(key);
      if (dependencies) {
        for (const dep of dependencies) {
          detectCycle(dep, [...path, key]);
        }
      }
      
      recursionStack.delete(key);
    };

    for (const key of this.dependencies.keys()) {
      if (!visited.has(key)) {
        detectCycle(key);
      }
    }

    return analysis;
  }

  /**
   * Cleanup orphaned dependencies
   */
  cleanup() {
    let cleaned = 0;
    
    // Remove dependencies for non-existent cache keys
    for (const [key, deps] of this.dependencies) {
      const hasValidCache = tenantCache.cache ? tenantCache.cache.has(key) : false;
      if (!hasValidCache) {
        this.dependencies.delete(key);
        
        // Clean reverse dependencies
        for (const dep of deps) {
          if (this.reverseDependencies.has(dep)) {
            this.reverseDependencies.get(dep).delete(key);
            if (this.reverseDependencies.get(dep).size === 0) {
              this.reverseDependencies.delete(dep);
            }
          }
        }
        
        cleaned++;
      }
    }

    // Clean reverse dependencies for non-existent keys
    for (const [key, dependents] of this.reverseDependencies) {
      const hasValidCache = tenantCache.cache ? tenantCache.cache.has(key) : false;
      if (!hasValidCache) {
        this.reverseDependencies.delete(key);
        cleaned++;
      }
    }

    this.metrics.totalDependencies = Math.max(0, this.metrics.totalDependencies - cleaned);
    return cleaned;
  }

  /**
   * Get invalidation statistics
   */
  getStats() {
    const ruleCount = this.invalidationRules.size;
    const dependencyCount = this.dependencies.size;
    const reverseDependencyCount = this.reverseDependencies.size;

    return {
      rules: {
        total: ruleCount,
        patterns: Array.from(this.invalidationRules.keys())
      },
      dependencies: {
        forward: dependencyCount,
        reverse: reverseDependencyCount,
        total: this.metrics.totalDependencies
      },
      metrics: {
        ...this.metrics,
        averageCascadeDepth: this.metrics.dependencyInvalidations > 0 
          ? this.metrics.cascadeDepth / this.metrics.dependencyInvalidations 
          : 0
      }
    };
  }

  /**
   * Reset all invalidation tracking
   */
  reset() {
    this.dependencies.clear();
    this.reverseDependencies.clear();
    
    this.metrics = {
      invalidations: 0,
      dependencyInvalidations: 0,
      ruleInvalidations: 0,
      totalDependencies: 0,
      cascadeDepth: 0
    };
  }
}

// Singleton instance
const cacheInvalidation = new CacheInvalidationStrategy();

// Setup time-based invalidation scheduler
setInterval(() => {
  cacheInvalidation.timeBasedInvalidation('hourly');
}, 60 * 60 * 1000); // Every hour

// Cleanup orphaned dependencies periodically
setInterval(() => {
  const cleaned = cacheInvalidation.cleanup();
  if (cleaned > 0) {
    console.log(`CacheInvalidation: Cleaned up ${cleaned} orphaned dependencies`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

export default cacheInvalidation;
export { CacheInvalidationStrategy };