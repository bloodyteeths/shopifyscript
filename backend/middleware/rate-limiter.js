/**
 * Tenant-Aware Rate Limiter - Multi-Tenant Infrastructure
 * Provides per-tenant rate limiting with configurable rules
 */

import tenantRegistry from '../services/tenant-registry.js';

class TenantRateLimiter {
  constructor() {
    this.buckets = new Map(); // tenantId:endpoint -> bucket
    this.globalBuckets = new Map(); // ip -> bucket for global limits
    
    // Default rate limit configurations
    this.defaultLimits = {
      window: 60000, // 1 minute
      max: 60,       // 60 requests per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      enableHeaders: true
    };
    
    // Plan-based rate limits
    this.planLimits = {
      starter: {
        '/api/metrics': { window: 60000, max: 10 },
        '/api/insights': { window: 60000, max: 30 },
        '/api/config': { window: 60000, max: 20 },
        '/api/upsertConfig': { window: 60000, max: 5 },
        '/api/autopilot': { window: 300000, max: 1 }, // 5 minutes
        'default': { window: 60000, max: 60 }
      },
      growth: {
        '/api/metrics': { window: 60000, max: 30 },
        '/api/insights': { window: 60000, max: 100 },
        '/api/config': { window: 60000, max: 50 },
        '/api/upsertConfig': { window: 60000, max: 15 },
        '/api/autopilot': { window: 300000, max: 2 },
        'default': { window: 60000, max: 120 }
      },
      pro: {
        '/api/metrics': { window: 60000, max: 100 },
        '/api/insights': { window: 60000, max: 300 },
        '/api/config': { window: 60000, max: 100 },
        '/api/upsertConfig': { window: 60000, max: 50 },
        '/api/autopilot': { window: 60000, max: 5 },
        'default': { window: 60000, max: 300 }
      }
    };
    
    // Endpoint-specific limits (regardless of plan)
    this.endpointLimits = {
      '/api/seed-demo': { window: 3600000, max: 1 }, // 1 hour, 1 request
      '/api/jobs/ai_writer': { window: 600000, max: 3 }, // 10 minutes
      '/api/jobs/weekly_summary': { window: 3600000, max: 1 }, // 1 hour
      '/api/connect/sheets/test': { window: 60000, max: 5 },
      '/api/connect/sheets/save': { window: 300000, max: 2 } // 5 minutes
    };
    
    // Global IP-based limits (anti-abuse)
    this.globalLimits = {
      window: 60000, // 1 minute
      max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 300) // 300 requests per minute per IP
    };
    
    // Cleanup expired buckets every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Create rate limiting middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const result = await this.checkRateLimit(req);
        
        if (result.exceeded) {
          // Set rate limit headers
          if (result.headers) {
            Object.entries(result.headers).forEach(([key, value]) => {
              res.setHeader(key, value);
            });
          }
          
          return res.status(429).json({
            ok: false,
            error: 'rate_limited',
            code: 'RATE_LIMIT_EXCEEDED',
            message: result.message,
            retryAfter: result.retryAfter
          });
        }
        
        // Set rate limit headers for successful requests
        if (result.headers) {
          Object.entries(result.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
        
        next();
      } catch (error) {
        console.error('RateLimiter: Error checking rate limit:', error.message);
        next(); // Continue on error to avoid blocking requests
      }
    };
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(req) {
    const ip = this.getClientIP(req);
    const tenantId = this.getTenantId(req);
    const endpoint = this.normalizeEndpoint(req.path);
    
    // Check global IP-based rate limit first (anti-abuse)
    const globalResult = this.checkGlobalLimit(ip);
    if (globalResult.exceeded) {
      return {
        exceeded: true,
        message: 'Global rate limit exceeded',
        retryAfter: globalResult.retryAfter,
        headers: globalResult.headers
      };
    }
    
    // Check tenant-specific rate limit
    const tenantResult = await this.checkTenantLimit(tenantId, endpoint, ip);
    
    return {
      exceeded: tenantResult.exceeded,
      message: tenantResult.message,
      retryAfter: tenantResult.retryAfter,
      headers: {
        ...globalResult.headers,
        ...tenantResult.headers
      }
    };
  }

  /**
   * Check global IP-based rate limit
   */
  checkGlobalLimit(ip) {
    const key = `global:${ip}`;
    const now = Date.now();
    const bucket = this.globalBuckets.get(key) || {
      start: now,
      count: 0,
      lastReset: now
    };
    
    // Reset bucket if window expired
    if (now - bucket.start > this.globalLimits.window) {
      bucket.start = now;
      bucket.count = 0;
      bucket.lastReset = now;
    }
    
    bucket.count++;
    this.globalBuckets.set(key, bucket);
    
    const remaining = Math.max(0, this.globalLimits.max - bucket.count);
    const resetTime = bucket.start + this.globalLimits.window;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    
    return {
      exceeded: bucket.count > this.globalLimits.max,
      retryAfter: retryAfter,
      headers: {
        'X-RateLimit-Global-Limit': this.globalLimits.max,
        'X-RateLimit-Global-Remaining': remaining,
        'X-RateLimit-Global-Reset': Math.ceil(resetTime / 1000)
      }
    };
  }

  /**
   * Check tenant-specific rate limit
   */
  async checkTenantLimit(tenantId, endpoint, ip) {
    const limits = await this.getTenantLimits(tenantId, endpoint);
    const key = `${tenantId}:${endpoint}:${ip}`;
    const now = Date.now();
    
    const bucket = this.buckets.get(key) || {
      start: now,
      count: 0,
      lastReset: now
    };
    
    // Reset bucket if window expired
    if (now - bucket.start > limits.window) {
      bucket.start = now;
      bucket.count = 0;
      bucket.lastReset = now;
    }
    
    bucket.count++;
    this.buckets.set(key, bucket);
    
    const remaining = Math.max(0, limits.max - bucket.count);
    const resetTime = bucket.start + limits.window;
    const retryAfter = Math.ceil((resetTime - now) / 1000);
    
    return {
      exceeded: bucket.count > limits.max,
      message: `Tenant rate limit exceeded for ${endpoint}`,
      retryAfter: retryAfter,
      headers: {
        'X-RateLimit-Limit': limits.max,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000),
        'X-RateLimit-Window': Math.ceil(limits.window / 1000)
      }
    };
  }

  /**
   * Get rate limits for tenant and endpoint
   */
  async getTenantLimits(tenantId, endpoint) {
    // Check endpoint-specific limits first
    if (this.endpointLimits[endpoint]) {
      return this.endpointLimits[endpoint];
    }
    
    try {
      const tenant = tenantRegistry.getTenant(tenantId);
      const plan = tenant?.plan || 'starter';
      const planLimits = this.planLimits[plan] || this.planLimits.starter;
      
      // Check for endpoint-specific limit in plan
      if (planLimits[endpoint]) {
        return planLimits[endpoint];
      }
      
      // Use plan default
      return planLimits.default || this.defaultLimits;
    } catch (error) {
      console.warn(`RateLimiter: Failed to get tenant limits for ${tenantId}:`, error.message);
      return this.defaultLimits;
    }
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * Get tenant ID from request
   */
  getTenantId(req) {
    return (
      req.query?.tenant ||
      req.body?.tenant ||
      req.headers['x-tenant-id'] ||
      'default'
    );
  }

  /**
   * Normalize endpoint path for rate limiting
   */
  normalizeEndpoint(path) {
    // Remove query parameters and trailing slashes
    const cleanPath = path.split('?')[0].replace(/\/$/, '');
    
    // Group similar endpoints
    if (cleanPath.startsWith('/api/insights/terms')) {
      return '/api/insights/terms';
    }
    if (cleanPath.startsWith('/api/jobs/')) {
      return cleanPath; // Keep job endpoints separate
    }
    if (cleanPath.startsWith('/api/audiences/')) {
      return '/api/audiences';
    }
    if (cleanPath.startsWith('/api/overlays/')) {
      return '/api/overlays';
    }
    if (cleanPath.startsWith('/api/intent/')) {
      return '/api/intent';
    }
    if (cleanPath.startsWith('/api/shopify/')) {
      return '/api/shopify';
    }
    
    return cleanPath;
  }

  /**
   * Clean up expired buckets
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean tenant buckets
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastReset > 300000) { // 5 minutes
        this.buckets.delete(key);
        cleaned++;
      }
    }
    
    // Clean global buckets
    for (const [key, bucket] of this.globalBuckets) {
      if (now - bucket.lastReset > 300000) { // 5 minutes
        this.globalBuckets.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`RateLimiter: Cleaned up ${cleaned} expired buckets`);
    }
  }

  /**
   * Get current rate limit status for tenant/endpoint
   */
  getStatus(tenantId, endpoint, ip) {
    const key = `${tenantId}:${endpoint}:${ip}`;
    const bucket = this.buckets.get(key);
    
    if (!bucket) {
      return {
        requests: 0,
        remaining: null,
        resetTime: null,
        window: null
      };
    }
    
    const limits = this.getTenantLimits(tenantId, endpoint);
    const remaining = Math.max(0, limits.max - bucket.count);
    const resetTime = bucket.start + limits.window;
    
    return {
      requests: bucket.count,
      limit: limits.max,
      remaining,
      resetTime,
      window: limits.window,
      exceeded: bucket.count > limits.max
    };
  }

  /**
   * Get global rate limit status for IP
   */
  getGlobalStatus(ip) {
    const key = `global:${ip}`;
    const bucket = this.globalBuckets.get(key);
    
    if (!bucket) {
      return {
        requests: 0,
        limit: this.globalLimits.max,
        remaining: this.globalLimits.max,
        resetTime: null,
        window: this.globalLimits.window,
        exceeded: false
      };
    }
    
    const remaining = Math.max(0, this.globalLimits.max - bucket.count);
    const resetTime = bucket.start + this.globalLimits.window;
    
    return {
      requests: bucket.count,
      limit: this.globalLimits.max,
      remaining,
      resetTime,
      window: this.globalLimits.window,
      exceeded: bucket.count > this.globalLimits.max
    };
  }

  /**
   * Reset rate limit for specific tenant/endpoint/ip
   */
  reset(tenantId, endpoint, ip) {
    const key = `${tenantId}:${endpoint}:${ip}`;
    return this.buckets.delete(key);
  }

  /**
   * Reset global rate limit for IP
   */
  resetGlobal(ip) {
    const key = `global:${ip}`;
    return this.globalBuckets.delete(key);
  }

  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now();
    const tenantBuckets = Array.from(this.buckets.entries()).map(([key, bucket]) => {
      const [tenantId, endpoint, ip] = key.split(':');
      return {
        tenantId,
        endpoint,
        ip,
        requests: bucket.count,
        age: now - bucket.start,
        lastReset: bucket.lastReset
      };
    });
    
    const globalBuckets = Array.from(this.globalBuckets.entries()).map(([key, bucket]) => {
      const ip = key.replace('global:', '');
      return {
        ip,
        requests: bucket.count,
        age: now - bucket.start,
        lastReset: bucket.lastReset
      };
    });
    
    return {
      tenantBuckets: tenantBuckets.length,
      globalBuckets: globalBuckets.length,
      totalMemoryUsage: this.buckets.size + this.globalBuckets.size,
      activeTenants: new Set(tenantBuckets.map(b => b.tenantId)).size,
      activeIPs: new Set([
        ...tenantBuckets.map(b => b.ip),
        ...globalBuckets.map(b => b.ip)
      ]).size,
      details: {
        tenant: tenantBuckets,
        global: globalBuckets
      }
    };
  }

  /**
   * Update plan limits configuration
   */
  updatePlanLimits(plan, limits) {
    if (this.planLimits[plan]) {
      Object.assign(this.planLimits[plan], limits);
      console.log(`RateLimiter: Updated limits for plan ${plan}`);
    }
  }

  /**
   * Update endpoint limits configuration
   */
  updateEndpointLimits(endpoint, limits) {
    this.endpointLimits[endpoint] = limits;
    console.log(`RateLimiter: Updated limits for endpoint ${endpoint}`);
  }

  /**
   * Destroy rate limiter (cleanup)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.buckets.clear();
    this.globalBuckets.clear();
  }
}

// Singleton instance
const tenantRateLimiter = new TenantRateLimiter();

export default tenantRateLimiter;
export { TenantRateLimiter };