/**
 * AI Error Recovery Service
 * Automated recovery mechanisms for AI service failures
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Recovery strategies
 */
export const RecoveryStrategies = {
  EXPONENTIAL_BACKOFF: 'exponential_backoff',
  PROVIDER_ROTATION: 'provider_rotation',
  CIRCUIT_BREAKER: 'circuit_breaker',
  RATE_LIMITING: 'rate_limiting',
  HEALTH_CHECKING: 'health_checking',
  AUTOMATIC_SCALING: 'automatic_scaling'
};

/**
 * Circuit breaker states
 */
export const CircuitState = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Failing, requests blocked
  HALF_OPEN: 'half_open' // Testing if service recovered
};

/**
 * AI Error Recovery Service
 */
class AIErrorRecoveryService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      // Circuit breaker settings
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 60000, // 1 minute
      halfOpenMaxCalls: options.halfOpenMaxCalls || 3,

      // Retry settings
      maxRetries: options.maxRetries || 5,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      jitterFactor: options.jitterFactor || 0.1,

      // Provider rotation settings
      enableProviderRotation: options.enableProviderRotation !== false,
      providerCooldown: options.providerCooldown || 300000, // 5 minutes

      // Rate limiting settings
      enableRateLimiting: options.enableRateLimiting !== false,
      requestsPerMinute: options.requestsPerMinute || 60,
      burstLimit: options.burstLimit || 10,

      // Health checking
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      enableAutoRecovery: options.enableAutoRecovery !== false,

      ...options
    };

    // Circuit breaker state per provider
    this.circuits = new Map();

    // Provider availability tracking
    this.providerHealth = new Map();
    this.providerRotationIndex = 0;
    this.availableProviders = ['openai', 'anthropic', 'google'];

    // Rate limiting
    this.requestCounts = new Map();
    this.rateLimitResetTime = new Map();

    // Recovery metrics
    this.metrics = {
      totalRecoveryAttempts: 0,
      successfulRecoveries: 0,
      circuitBreakerTrips: 0,
      providerSwitches: 0,
      rateLimitHits: 0,
      autoRecoveries: 0
    };

    // Active recovery processes
    this.activeRecoveries = new Map();

    // Health check interval
    this.healthCheckTimer = null;

    this.startHealthChecking();
  }

  /**
   * Start periodic health checking
   */
  startHealthChecking() {
    if (this.healthCheckTimer) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.options.healthCheckInterval);

    console.log(`🩺 AI error recovery health checking started (interval: ${this.options.healthCheckInterval}ms)`);
  }

  /**
   * Stop health checking
   */
  stopHealthChecking() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('🩺 AI error recovery health checking stopped');
    }
  }

  /**
   * Get or create circuit breaker for provider
   */
  getCircuit(provider) {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        lastTestTime: null,
        halfOpenCount: 0
      });
    }
    return this.circuits.get(provider);
  }

  /**
   * Record success for provider
   */
  recordSuccess(provider) {
    const circuit = this.getCircuit(provider);

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.halfOpenCount++;

      if (circuit.halfOpenCount >= this.options.halfOpenMaxCalls) {
        circuit.state = CircuitState.CLOSED;
        circuit.failureCount = 0;
        circuit.halfOpenCount = 0;
        console.log(`✅ Circuit breaker closed for ${provider} (recovered)`);
        this.emit('circuitClosed', { provider });
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Reset failure count on success
      circuit.failureCount = Math.max(0, circuit.failureCount - 1);
    }

    this.updateProviderHealth(provider, true);
  }

  /**
   * Record failure for provider
   */
  recordFailure(provider, error) {
    const circuit = this.getCircuit(provider);
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    console.warn(`❌ Recorded failure for ${provider}: ${error.message} (${circuit.failureCount}/${this.options.failureThreshold})`);

    // Trip circuit breaker if threshold exceeded
    if (circuit.failureCount >= this.options.failureThreshold && circuit.state === CircuitState.CLOSED) {
      circuit.state = CircuitState.OPEN;
      this.metrics.circuitBreakerTrips++;

      console.warn(`🚨 Circuit breaker opened for ${provider} (${circuit.failureCount} failures)`);
      this.emit('circuitOpened', { provider, failures: circuit.failureCount });

      // Schedule recovery attempt
      this.scheduleRecovery(provider);
    }

    this.updateProviderHealth(provider, false, error);
  }

  /**
   * Check if provider circuit allows requests
   */
  canCallProvider(provider) {
    const circuit = this.getCircuit(provider);

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if recovery timeout has passed
        if (Date.now() - circuit.lastFailureTime >= this.options.recoveryTimeout) {
          circuit.state = CircuitState.HALF_OPEN;
          circuit.halfOpenCount = 0;
          console.log(`🔍 Circuit breaker half-opened for ${provider} (testing recovery)`);
          this.emit('circuitHalfOpened', { provider });
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow limited calls to test recovery
        return circuit.halfOpenCount < this.options.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Update provider health status
   */
  updateProviderHealth(provider, success, error = null) {
    const health = this.providerHealth.get(provider) || {
      totalCalls: 0,
      successfulCalls: 0,
      lastSuccess: null,
      lastFailure: null,
      lastError: null,
      consecutiveFailures: 0
    };

    health.totalCalls++;

    if (success) {
      health.successfulCalls++;
      health.lastSuccess = Date.now();
      health.consecutiveFailures = 0;
    } else {
      health.lastFailure = Date.now();
      health.lastError = error?.message || 'Unknown error';
      health.consecutiveFailures++;
    }

    this.providerHealth.set(provider, health);
  }

  /**
   * Get next available provider using rotation
   */
  getNextProvider(excludeProviders = []) {
    const available = this.availableProviders.filter(provider => {
      return !excludeProviders.includes(provider) && this.canCallProvider(provider);
    });

    if (available.length === 0) {
      throw new Error('No healthy AI providers available');
    }

    // Simple round-robin rotation
    const provider = available[this.providerRotationIndex % available.length];
    this.providerRotationIndex++;

    return provider;
  }

  /**
   * Execute with retry and circuit breaker logic
   */
  async executeWithRecovery(operation, options = {}) {
    const {
      provider: preferredProvider,
      maxRetries = this.options.maxRetries,
      enableProviderSwitching = this.options.enableProviderRotation,
      context = {}
    } = options;

    let currentProvider = preferredProvider || process.env.AI_PROVIDER || 'openai';
    let attempts = 0;
    let lastError;
    const attemptedProviders = new Set();

    this.metrics.totalRecoveryAttempts++;

    while (attempts < maxRetries) {
      // Check rate limiting
      if (!this.checkRateLimit(context.tenant)) {
        this.metrics.rateLimitHits++;
        const waitTime = this.getRateLimitResetTime(context.tenant);
        console.warn(`⏱️ Rate limit hit for ${context.tenant}, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }

      // Check circuit breaker
      if (!this.canCallProvider(currentProvider)) {
        console.warn(`🚫 Circuit breaker prevents calls to ${currentProvider}`);

        if (enableProviderSwitching) {
          try {
            currentProvider = this.getNextProvider([...attemptedProviders]);
            this.metrics.providerSwitches++;
            console.log(`🔄 Switching to provider: ${currentProvider}`);
          } catch (error) {
            throw new Error(`All providers are unavailable: ${error.message}`);
          }
        } else {
          throw new Error(`Provider ${currentProvider} is circuit-broken and switching is disabled`);
        }
      }

      attemptedProviders.add(currentProvider);

      try {
        // Execute the operation with current provider
        const result = await operation(currentProvider);

        // Record success
        this.recordSuccess(currentProvider);
        this.metrics.successfulRecoveries++;

        console.log(`✅ Operation succeeded with ${currentProvider} (attempt ${attempts + 1})`);
        return result;

      } catch (error) {
        attempts++;
        lastError = error;

        // Record failure
        this.recordFailure(currentProvider, error);

        console.warn(`❌ Operation failed with ${currentProvider} (attempt ${attempts}/${maxRetries}): ${error.message}`);

        // Check if we should switch providers
        if (enableProviderSwitching && attempts < maxRetries) {
          try {
            const nextProvider = this.getNextProvider([...attemptedProviders]);
            if (nextProvider !== currentProvider) {
              currentProvider = nextProvider;
              this.metrics.providerSwitches++;
              console.log(`🔄 Switching to next provider: ${currentProvider}`);
              continue; // Try immediately with new provider
            }
          } catch (switchError) {
            console.warn('No alternative providers available');
          }
        }

        // Apply exponential backoff if we're retrying with the same provider
        if (attempts < maxRetries) {
          const delay = this.calculateBackoffDelay(attempts);
          console.log(`⏳ Backing off ${delay}ms before retry ${attempts + 1}`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw new Error(`Operation failed after ${attempts} attempts with providers: ${[...attemptedProviders].join(', ')}. Last error: ${lastError?.message}`);
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateBackoffDelay(attempt) {
    const baseDelay = this.options.baseDelay * Math.pow(2, attempt - 1);
    const jitter = baseDelay * this.options.jitterFactor * Math.random();
    const delay = baseDelay + jitter;

    return Math.min(delay, this.options.maxDelay);
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(tenant) {
    if (!this.options.enableRateLimiting || !tenant) return true;

    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute windows

    const key = `${tenant}:${windowStart}`;
    const currentCount = this.requestCounts.get(key) || 0;

    if (currentCount >= this.options.requestsPerMinute) {
      return false;
    }

    // Increment counter
    this.requestCounts.set(key, currentCount + 1);
    this.rateLimitResetTime.set(tenant, windowStart + 60000);

    // Cleanup old entries
    this.cleanupRateLimitData(windowStart);

    return true;
  }

  /**
   * Get time until rate limit resets
   */
  getRateLimitResetTime(tenant) {
    const resetTime = this.rateLimitResetTime.get(tenant);
    return resetTime ? Math.max(0, resetTime - Date.now()) : 0;
  }

  /**
   * Cleanup old rate limit data
   */
  cleanupRateLimitData(currentWindow) {
    const cutoff = currentWindow - 120000; // Keep 2 minutes of history

    for (const [key] of this.requestCounts) {
      const [, timestamp] = key.split(':');
      if (parseInt(timestamp) < cutoff) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Schedule provider recovery
   */
  scheduleRecovery(provider) {
    if (this.activeRecoveries.has(provider)) {
      return; // Recovery already scheduled
    }

    const recoveryTimeout = setTimeout(async () => {
      try {
        console.log(`🔧 Attempting recovery for ${provider}`);
        await this.attemptProviderRecovery(provider);
      } catch (error) {
        console.error(`Recovery attempt failed for ${provider}:`, error);
      } finally {
        this.activeRecoveries.delete(provider);
      }
    }, this.options.recoveryTimeout);

    this.activeRecoveries.set(provider, recoveryTimeout);
  }

  /**
   * Attempt to recover a specific provider
   */
  async attemptProviderRecovery(provider) {
    const circuit = this.getCircuit(provider);

    if (circuit.state !== CircuitState.OPEN) {
      return; // Already recovered or in recovery
    }

    try {
      // Test provider with a simple request
      const { getAIProvider } = await import("../lib/aiProvider.js");

      const originalProvider = process.env.AI_PROVIDER;
      process.env.AI_PROVIDER = provider;

      try {
        const providerInstance = await getAIProvider();
        const testResult = await providerInstance.generateText('Health check test');

        if (testResult && testResult.trim()) {
          // Provider is responding - move to half-open
          circuit.state = CircuitState.HALF_OPEN;
          circuit.halfOpenCount = 0;
          this.metrics.autoRecoveries++;

          console.log(`✅ Provider ${provider} recovered automatically`);
          this.emit('providerRecovered', { provider });

          return true;
        }
      } finally {
        process.env.AI_PROVIDER = originalProvider;
      }
    } catch (error) {
      console.warn(`Recovery test failed for ${provider}:`, error.message);
    }

    // Schedule another recovery attempt
    if (this.options.enableAutoRecovery) {
      this.scheduleRecovery(provider);
    }

    return false;
  }

  /**
   * Perform health checks on all providers
   */
  async performHealthChecks() {
    const healthPromises = this.availableProviders.map(async (provider) => {
      try {
        const circuit = this.getCircuit(provider);

        // Skip if circuit is open and not ready for testing
        if (circuit.state === CircuitState.OPEN &&
            Date.now() - circuit.lastFailureTime < this.options.recoveryTimeout) {
          return;
        }

        await this.attemptProviderRecovery(provider);
      } catch (error) {
        console.warn(`Health check failed for ${provider}:`, error.message);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Get provider health status
   */
  getProviderHealth(provider) {
    const circuit = this.getCircuit(provider);
    const health = this.providerHealth.get(provider);

    return {
      provider,
      available: this.canCallProvider(provider),
      circuit: {
        state: circuit.state,
        failureCount: circuit.failureCount,
        lastFailure: circuit.lastFailureTime ? new Date(circuit.lastFailureTime).toISOString() : null
      },
      health: health ? {
        successRate: health.totalCalls > 0 ? (health.successfulCalls / health.totalCalls * 100).toFixed(2) + '%' : '0%',
        totalCalls: health.totalCalls,
        consecutiveFailures: health.consecutiveFailures,
        lastSuccess: health.lastSuccess ? new Date(health.lastSuccess).toISOString() : null,
        lastError: health.lastError
      } : null
    };
  }

  /**
   * Get recovery service status
   */
  getStatus() {
    return {
      timestamp: new Date().toISOString(),
      healthCheckActive: !!this.healthCheckTimer,
      providers: this.availableProviders.map(provider => this.getProviderHealth(provider)),
      metrics: this.metrics,
      activeRecoveries: this.activeRecoveries.size,
      circuitBreakerSettings: {
        failureThreshold: this.options.failureThreshold,
        recoveryTimeout: this.options.recoveryTimeout
      },
      rateLimiting: {
        enabled: this.options.enableRateLimiting,
        requestsPerMinute: this.options.requestsPerMinute
      }
    };
  }

  /**
   * Force recovery attempt for all providers
   */
  async forceRecovery() {
    console.log('🚀 Forcing recovery attempt for all providers');

    const results = await Promise.allSettled(
      this.availableProviders.map(provider => this.attemptProviderRecovery(provider))
    );

    const recovered = results.filter((result, index) => {
      return result.status === 'fulfilled' && result.value === true;
    }).length;

    console.log(`Recovery complete: ${recovered}/${this.availableProviders.length} providers recovered`);

    return {
      attempted: this.availableProviders.length,
      recovered,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset all circuit breakers (emergency use)
   */
  resetAllCircuits() {
    console.warn('⚠️ Resetting all circuit breakers (emergency reset)');

    for (const [provider, circuit] of this.circuits) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.halfOpenCount = 0;
      circuit.lastFailureTime = null;

      console.log(`🔄 Reset circuit breaker for ${provider}`);
    }

    this.emit('allCircuitsReset');

    return { reset: this.circuits.size };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthChecking();

    // Clear active recovery timeouts
    for (const timeout of this.activeRecoveries.values()) {
      clearTimeout(timeout);
    }
    this.activeRecoveries.clear();

    this.removeAllListeners();
    console.log('🧹 AI error recovery service destroyed');
  }
}

// Singleton instance
let errorRecoveryInstance = null;

/**
 * Get the global AI error recovery service
 */
export function getAIErrorRecoveryService(options = {}) {
  if (!errorRecoveryInstance) {
    errorRecoveryInstance = new AIErrorRecoveryService(options);
  }
  return errorRecoveryInstance;
}

/**
 * Wrapper function to execute AI operations with error recovery
 */
export function withErrorRecovery(operation, options = {}) {
  const service = getAIErrorRecoveryService();

  return async (provider) => {
    return await service.executeWithRecovery(operation, {
      ...options,
      provider
    });
  };
}

export default AIErrorRecoveryService;