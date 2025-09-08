/**
 * Enhanced Google Sheets Rate Limiter with Exponential Backoff
 * Implements sophisticated rate limiting and retry strategies for Google Sheets API
 */

class SheetsRateLimiter {
  constructor() {
    // Google Sheets API quotas and limits
    this.quotas = {
      // Read requests: 100 requests per 100 seconds per user
      read: {
        limit: Number(process.env.SHEETS_READ_LIMIT || 90), // Leave buffer
        window: Number(process.env.SHEETS_READ_WINDOW || 100000), // 100 seconds
      },
      // Write requests: 100 requests per 100 seconds per user  
      write: {
        limit: Number(process.env.SHEETS_WRITE_LIMIT || 50), // More conservative for writes
        window: Number(process.env.SHEETS_WRITE_WINDOW || 100000), // 100 seconds
      },
      // Batch operations have different limits
      batch: {
        limit: Number(process.env.SHEETS_BATCH_LIMIT || 20),
        window: Number(process.env.SHEETS_BATCH_WINDOW || 100000),
      }
    };

    // Per-tenant rate limiting buckets
    this.buckets = new Map(); // tenantId:operationType -> bucket
    
    // Exponential backoff configuration
    this.backoffConfig = {
      initialDelay: Number(process.env.SHEETS_INITIAL_DELAY || 1000), // 1 second
      maxDelay: Number(process.env.SHEETS_MAX_DELAY || 64000), // 64 seconds
      multiplier: Number(process.env.SHEETS_BACKOFF_MULTIPLIER || 2),
      jitter: true, // Add randomness to prevent thundering herd
    };

    // Circuit breaker pattern
    this.circuitBreaker = new Map(); // tenantId -> { failures, lastFailure, state }
    this.circuitBreakerConfig = {
      failureThreshold: Number(process.env.SHEETS_FAILURE_THRESHOLD || 5),
      timeout: Number(process.env.SHEETS_CIRCUIT_TIMEOUT || 60000), // 1 minute
      halfOpenRetryDelay: Number(process.env.SHEETS_HALF_OPEN_DELAY || 10000), // 10 seconds
    };

    // Metrics
    this.metrics = {
      totalRequests: 0,
      rateLimitedRequests: 0,
      retriedRequests: 0,
      circuitBreakerTrips: 0,
      avgBackoffTime: 0,
      quotaResets: 0,
      apiErrors: new Map(), // Track error frequencies
    };

    // Cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(tenantId, operationType = 'read') {
    const bucketKey = `${tenantId}:${operationType}`;
    const quota = this.quotas[operationType] || this.quotas.read;
    const now = Date.now();

    // Check circuit breaker first
    const circuitState = this.checkCircuitBreaker(tenantId);
    if (circuitState.isOpen) {
      return {
        allowed: false,
        reason: 'circuit_breaker_open',
        retryAfter: circuitState.retryAfter,
        backoffTime: circuitState.retryAfter
      };
    }

    // Get or create bucket
    let bucket = this.buckets.get(bucketKey) || {
      requests: [],
      lastReset: now,
      violationCount: 0,
    };

    // Clean old requests outside the window
    bucket.requests = bucket.requests.filter(
      timestamp => now - timestamp < quota.window
    );

    // Check if under limit
    if (bucket.requests.length >= quota.limit) {
      bucket.violationCount++;
      this.metrics.rateLimitedRequests++;
      
      // Calculate backoff time
      const backoffTime = this.calculateBackoffTime(bucket.violationCount, operationType);
      
      this.buckets.set(bucketKey, bucket);
      
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        retryAfter: backoffTime,
        backoffTime,
        currentUsage: bucket.requests.length,
        limit: quota.limit,
        windowMs: quota.window
      };
    }

    // Record the request
    bucket.requests.push(now);
    bucket.violationCount = Math.max(0, bucket.violationCount - 1); // Gradually reduce violations
    this.buckets.set(bucketKey, bucket);
    this.metrics.totalRequests++;

    return {
      allowed: true,
      currentUsage: bucket.requests.length,
      limit: quota.limit,
      remaining: quota.limit - bucket.requests.length,
      windowMs: quota.window,
      resetTime: now + quota.window
    };
  }

  /**
   * Execute operation with rate limiting and exponential backoff
   */
  async executeWithRateLimit(tenantId, operation, operationType = 'read', maxRetries = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      try {
        // Check rate limit
        const rateLimitResult = await this.checkRateLimit(tenantId, operationType);
        
        if (!rateLimitResult.allowed) {
          if (attempt >= maxRetries) {
            throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${rateLimitResult.reason}`);
          }

          // Wait for backoff period
          console.log(`Rate limited for tenant ${tenantId}, waiting ${rateLimitResult.backoffTime}ms`);
          await this.sleep(rateLimitResult.backoffTime);
          attempt++;
          this.metrics.retriedRequests++;
          continue;
        }

        // Execute the operation
        const result = await operation();
        
        // Reset circuit breaker on success
        this.recordSuccess(tenantId);
        
        return result;

      } catch (error) {
        lastError = error;
        this.recordFailure(tenantId, error);
        
        // Check if error is retryable
        if (attempt >= maxRetries || !this.isRetryableError(error)) {
          throw error;
        }

        // Calculate exponential backoff
        const backoffTime = this.calculateExponentialBackoff(attempt);
        console.log(`Operation failed for tenant ${tenantId}, retrying in ${backoffTime}ms:`, error.message);
        
        await this.sleep(backoffTime);
        attempt++;
        this.metrics.retriedRequests++;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Calculate exponential backoff time
   */
  calculateExponentialBackoff(attempt) {
    let delay = this.backoffConfig.initialDelay * Math.pow(this.backoffConfig.multiplier, attempt);
    delay = Math.min(delay, this.backoffConfig.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.backoffConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Calculate backoff time based on violation count
   */
  calculateBackoffTime(violationCount, operationType) {
    const baseDelay = this.backoffConfig.initialDelay;
    const quota = this.quotas[operationType] || this.quotas.read;
    
    // Calculate backoff based on severity
    let delay = baseDelay * Math.pow(this.backoffConfig.multiplier, Math.min(violationCount, 6));
    delay = Math.min(delay, this.backoffConfig.maxDelay);
    
    // For severe rate limiting, wait for next quota window
    if (violationCount > 3) {
      delay = Math.max(delay, quota.window / 4); // Wait for 25% of quota window
    }
    
    // Add jitter
    if (this.backoffConfig.jitter) {
      delay = delay * (0.7 + Math.random() * 0.6);
    }
    
    this.metrics.avgBackoffTime = (this.metrics.avgBackoffTime + delay) / 2;
    return Math.floor(delay);
  }

  /**
   * Circuit breaker pattern implementation
   */
  checkCircuitBreaker(tenantId) {
    const circuit = this.circuitBreaker.get(tenantId) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' // closed, open, half-open
    };

    const now = Date.now();

    switch (circuit.state) {
      case 'closed':
        return { isOpen: false };
        
      case 'open':
        // Check if enough time has passed to try again
        if (now - circuit.lastFailure > this.circuitBreakerConfig.timeout) {
          circuit.state = 'half-open';
          circuit.failures = 0;
          this.circuitBreaker.set(tenantId, circuit);
          return { isOpen: false };
        }
        
        const retryAfter = this.circuitBreakerConfig.timeout - (now - circuit.lastFailure);
        return { 
          isOpen: true, 
          retryAfter: Math.max(retryAfter, this.circuitBreakerConfig.halfOpenRetryDelay)
        };
        
      case 'half-open':
        return { isOpen: false };
        
      default:
        return { isOpen: false };
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(tenantId) {
    const circuit = this.circuitBreaker.get(tenantId);
    if (circuit) {
      if (circuit.state === 'half-open') {
        circuit.state = 'closed';
        circuit.failures = 0;
      } else if (circuit.state === 'closed') {
        circuit.failures = Math.max(0, circuit.failures - 1);
      }
      this.circuitBreaker.set(tenantId, circuit);
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(tenantId, error) {
    // Track error types
    const errorType = this.categorizeError(error);
    this.metrics.apiErrors.set(errorType, (this.metrics.apiErrors.get(errorType) || 0) + 1);

    // Update circuit breaker
    const circuit = this.circuitBreaker.get(tenantId) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed'
    };

    circuit.failures++;
    circuit.lastFailure = Date.now();

    // Trip circuit breaker if threshold exceeded
    if (circuit.failures >= this.circuitBreakerConfig.failureThreshold && circuit.state !== 'open') {
      circuit.state = 'open';
      this.metrics.circuitBreakerTrips++;
      console.warn(`Circuit breaker opened for tenant ${tenantId} after ${circuit.failures} failures`);
    }

    this.circuitBreaker.set(tenantId, circuit);
  }

  /**
   * Categorize error for metrics
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toString() || '';

    if (message.includes('429') || message.includes('quota') || message.includes('rate limit')) {
      return 'quota_exceeded';
    } else if (message.includes('403') || message.includes('permission')) {
      return 'permission_denied';
    } else if (message.includes('404') || message.includes('not found')) {
      return 'not_found';
    } else if (message.includes('timeout') || code.includes('ETIMEDOUT')) {
      return 'timeout';
    } else if (message.includes('network') || message.includes('connection')) {
      return 'network_error';
    } else if (code.includes('502') || code.includes('503') || code.includes('504')) {
      return 'server_error';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableTypes = [
      'quota_exceeded',
      'timeout',
      'network_error',
      'server_error'
    ];
    
    return retryableTypes.includes(this.categorizeError(error));
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rate limit status for tenant and operation
   */
  getRateLimitStatus(tenantId, operationType = 'read') {
    const bucketKey = `${tenantId}:${operationType}`;
    const bucket = this.buckets.get(bucketKey);
    const quota = this.quotas[operationType] || this.quotas.read;
    const now = Date.now();

    if (!bucket) {
      return {
        limit: quota.limit,
        remaining: quota.limit,
        usage: 0,
        resetTime: now + quota.window,
        windowMs: quota.window
      };
    }

    // Clean old requests
    const validRequests = bucket.requests.filter(
      timestamp => now - timestamp < quota.window
    );

    return {
      limit: quota.limit,
      remaining: Math.max(0, quota.limit - validRequests.length),
      usage: validRequests.length,
      resetTime: validRequests.length > 0 ? Math.max(...validRequests) + quota.window : now,
      windowMs: quota.window,
      violationCount: bucket.violationCount
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(tenantId) {
    const circuit = this.circuitBreaker.get(tenantId);
    if (!circuit) {
      return { state: 'closed', failures: 0 };
    }

    const now = Date.now();
    let timeToRetry = 0;

    if (circuit.state === 'open') {
      timeToRetry = Math.max(0, this.circuitBreakerConfig.timeout - (now - circuit.lastFailure));
    }

    return {
      state: circuit.state,
      failures: circuit.failures,
      lastFailure: circuit.lastFailure,
      timeToRetry
    };
  }

  /**
   * Reset rate limits for tenant
   */
  resetTenantRateLimits(tenantId) {
    let resetCount = 0;
    
    for (const [key, bucket] of this.buckets) {
      if (key.startsWith(`${tenantId}:`)) {
        this.buckets.delete(key);
        resetCount++;
      }
    }

    // Reset circuit breaker
    this.circuitBreaker.delete(tenantId);
    this.metrics.quotaResets++;

    return resetCount;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup rate limit buckets
    for (const [key, bucket] of this.buckets) {
      const operationType = key.split(':')[1];
      const quota = this.quotas[operationType] || this.quotas.read;
      
      bucket.requests = bucket.requests.filter(
        timestamp => now - timestamp < quota.window
      );

      if (bucket.requests.length === 0 && bucket.violationCount === 0) {
        this.buckets.delete(key);
        cleaned++;
      }
    }

    // Cleanup circuit breakers
    for (const [tenantId, circuit] of this.circuitBreaker) {
      if (circuit.state === 'closed' && 
          now - circuit.lastFailure > this.circuitBreakerConfig.timeout * 2) {
        this.circuitBreaker.delete(tenantId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`SheetsRateLimiter: Cleaned up ${cleaned} expired entries`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    const errorSummary = Object.fromEntries(this.metrics.apiErrors);
    
    return {
      requests: {
        total: this.metrics.totalRequests,
        rateLimited: this.metrics.rateLimitedRequests,
        retried: this.metrics.retriedRequests,
        successRate: this.metrics.totalRequests > 0 
          ? ((this.metrics.totalRequests - this.metrics.rateLimitedRequests) / this.metrics.totalRequests * 100).toFixed(2)
          : 100
      },
      circuitBreaker: {
        trips: this.metrics.circuitBreakerTrips,
        activeTenants: this.circuitBreaker.size
      },
      backoff: {
        avgTime: Math.round(this.metrics.avgBackoffTime),
        quotaResets: this.metrics.quotaResets
      },
      errors: errorSummary,
      buckets: {
        active: this.buckets.size,
        circuits: this.circuitBreaker.size
      }
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const now = Date.now();
    
    // Check for unhealthy conditions
    const recentRateLimits = this.metrics.rateLimitedRequests / Math.max(1, this.metrics.totalRequests);
    const recentCircuitBreaks = this.metrics.circuitBreakerTrips;
    
    let status = 'healthy';
    let issues = [];
    
    if (recentRateLimits > 0.3) { // More than 30% rate limited
      status = 'degraded';
      issues.push('high_rate_limiting');
    }
    
    if (recentCircuitBreaks > 0) {
      status = 'degraded';
      issues.push('circuit_breaker_trips');
    }
    
    // Check for open circuit breakers
    let openCircuits = 0;
    for (const [tenantId, circuit] of this.circuitBreaker) {
      if (circuit.state === 'open') {
        openCircuits++;
      }
    }
    
    if (openCircuits > 0) {
      status = 'unhealthy';
      issues.push(`${openCircuits}_open_circuits`);
    }

    return {
      status,
      issues,
      metrics,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
const sheetsRateLimiter = new SheetsRateLimiter();

export default sheetsRateLimiter;
export { SheetsRateLimiter };