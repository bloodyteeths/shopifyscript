/**
 * AI Error Handling Middleware
 * Centralized error handling, logging, and monitoring for AI operations
 */

import { performance } from 'perf_hooks';

/**
 * AI Error Types for categorization
 */
export const AIErrorTypes = {
  PROVIDER_ERROR: 'provider_error',
  BUDGET_EXCEEDED: 'budget_exceeded',
  RATE_LIMIT: 'rate_limit',
  AUTHENTICATION: 'authentication',
  NETWORK_ERROR: 'network_error',
  VALIDATION_ERROR: 'validation_error',
  TIMEOUT: 'timeout',
  EMPTY_RESPONSE: 'empty_response',
  QUOTA_EXCEEDED: 'quota_exceeded',
  MODEL_NOT_FOUND: 'model_not_found',
  UNKNOWN: 'unknown'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * AI Error Handler Class
 */
class AIErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxFailureRate: options.maxFailureRate || 0.5, // 50% failure rate triggers alert
      alertWindow: options.alertWindow || 5 * 60 * 1000, // 5 minutes
      logLevel: options.logLevel || 'warn',
      enableAlerts: options.enableAlerts !== false,
      ...options
    };

    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      errorsByType: new Map(),
      errorsByProvider: new Map(),
      recentErrors: [],
      alertsSent: new Set()
    };

    this.tenantMetrics = new Map();
  }

  /**
   * Categorize error based on message and type
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('budget limit') || message.includes('budget exceeded')) {
      return { type: AIErrorTypes.BUDGET_EXCEEDED, severity: ErrorSeverity.MEDIUM };
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return { type: AIErrorTypes.RATE_LIMIT, severity: ErrorSeverity.MEDIUM };
    }

    if (message.includes('api key') || message.includes('unauthorized') || message.includes('forbidden')) {
      return { type: AIErrorTypes.AUTHENTICATION, severity: ErrorSeverity.HIGH };
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return { type: AIErrorTypes.TIMEOUT, severity: ErrorSeverity.MEDIUM };
    }

    if (message.includes('empty response') || message.includes('no content')) {
      return { type: AIErrorTypes.EMPTY_RESPONSE, severity: ErrorSeverity.LOW };
    }

    if (message.includes('quota') || message.includes('limit reached')) {
      return { type: AIErrorTypes.QUOTA_EXCEEDED, severity: ErrorSeverity.HIGH };
    }

    if (message.includes('model') && message.includes('not found')) {
      return { type: AIErrorTypes.MODEL_NOT_FOUND, severity: ErrorSeverity.MEDIUM };
    }

    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return { type: AIErrorTypes.NETWORK_ERROR, severity: ErrorSeverity.MEDIUM };
    }

    if (error.provider) {
      return { type: AIErrorTypes.PROVIDER_ERROR, severity: ErrorSeverity.MEDIUM };
    }

    return { type: AIErrorTypes.UNKNOWN, severity: ErrorSeverity.LOW };
  }

  /**
   * Log AI error with structured format
   */
  logError(error, context = {}) {
    const { type, severity } = this.categorizeError(error);
    const timestamp = new Date().toISOString();

    const errorLog = {
      timestamp,
      type,
      severity,
      message: error.message,
      provider: error.provider || context.provider || 'unknown',
      tenant: context.tenant,
      operation: context.operation,
      attempts: error.attempts || 1,
      stack: error.stack,
      context: {
        ...context,
        originalError: error.originalError?.message
      }
    };

    // Store for metrics
    this.metrics.totalFailures++;
    this.metrics.errorsByType.set(type, (this.metrics.errorsByType.get(type) || 0) + 1);
    this.metrics.errorsByProvider.set(errorLog.provider, (this.metrics.errorsByProvider.get(errorLog.provider) || 0) + 1);

    // Keep recent errors for analysis (last 100)
    this.metrics.recentErrors.push(errorLog);
    if (this.metrics.recentErrors.length > 100) {
      this.metrics.recentErrors.shift();
    }

    // Update tenant metrics
    if (context.tenant) {
      this.updateTenantMetrics(context.tenant, errorLog);
    }

    // Log based on severity
    const logMethod = severity === ErrorSeverity.CRITICAL ? 'error' :
                     severity === ErrorSeverity.HIGH ? 'error' :
                     severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';

    console[logMethod](`🤖❌ AI Error [${severity.toUpperCase()}]:`, errorLog);

    // Check if we need to send alerts
    if (this.options.enableAlerts) {
      this.checkAndSendAlerts(errorLog);
    }

    return errorLog;
  }

  /**
   * Update tenant-specific metrics
   */
  updateTenantMetrics(tenant, errorLog) {
    if (!this.tenantMetrics.has(tenant)) {
      this.tenantMetrics.set(tenant, {
        totalFailures: 0,
        errorsByType: new Map(),
        lastError: null,
        firstError: null
      });
    }

    const metrics = this.tenantMetrics.get(tenant);
    metrics.totalFailures++;
    metrics.errorsByType.set(errorLog.type, (metrics.errorsByType.get(errorLog.type) || 0) + 1);
    metrics.lastError = errorLog;

    if (!metrics.firstError) {
      metrics.firstError = errorLog;
    }
  }

  /**
   * Check if alerts should be sent
   */
  checkAndSendAlerts(errorLog) {
    const now = Date.now();
    const windowStart = now - this.options.alertWindow;

    // Count recent errors in the alert window
    const recentErrors = this.metrics.recentErrors.filter(
      e => Date.parse(e.timestamp) > windowStart
    );

    const recentRequests = this.metrics.totalRequests; // This should be tracked per window
    const failureRate = recentRequests > 0 ? recentErrors.length / recentRequests : 0;

    // High failure rate alert
    if (failureRate > this.options.maxFailureRate) {
      const alertKey = `failure_rate_${Math.floor(now / this.options.alertWindow)}`;
      if (!this.metrics.alertsSent.has(alertKey)) {
        this.sendAlert({
          type: 'high_failure_rate',
          message: `AI failure rate is ${(failureRate * 100).toFixed(1)}% (threshold: ${(this.options.maxFailureRate * 100).toFixed(1)}%)`,
          failureRate,
          recentErrors: recentErrors.length,
          window: '5 minutes'
        });
        this.metrics.alertsSent.add(alertKey);
      }
    }

    // Critical error alert
    if (errorLog.severity === ErrorSeverity.CRITICAL) {
      this.sendAlert({
        type: 'critical_error',
        message: `Critical AI error occurred: ${errorLog.message}`,
        error: errorLog,
        requiresImmedateAttention: true
      });
    }

    // Provider down alert
    const providerErrors = this.metrics.recentErrors.filter(
      e => e.provider === errorLog.provider && Date.parse(e.timestamp) > windowStart
    );

    if (providerErrors.length > 5) { // 5 errors in 5 minutes from same provider
      const alertKey = `provider_down_${errorLog.provider}_${Math.floor(now / this.options.alertWindow)}`;
      if (!this.metrics.alertsSent.has(alertKey)) {
        this.sendAlert({
          type: 'provider_issues',
          message: `Multiple failures from provider ${errorLog.provider} (${providerErrors.length} in 5 min)`,
          provider: errorLog.provider,
          errorCount: providerErrors.length
        });
        this.metrics.alertsSent.add(alertKey);
      }
    }
  }

  /**
   * Send alert (can be extended to integrate with monitoring services)
   */
  sendAlert(alert) {
    console.warn(`🚨 AI ALERT:`, alert);

    // Here you could integrate with:
    // - Email notifications
    // - Slack/Discord webhooks
    // - PagerDuty
    // - DataDog/New Relic
    // - Custom monitoring dashboards

    // For now, just log to console with special formatting
    const alertMessage = `
╔══════════════════════════════════════╗
║           🚨 AI SYSTEM ALERT 🚨      ║
╠══════════════════════════════════════╣
║ Type: ${alert.type.padEnd(28)} ║
║ Time: ${new Date().toLocaleString().padEnd(28)} ║
║ Message: ${alert.message.substring(0, 25).padEnd(25)}║
${alert.requiresImmedateAttention ? '║ ⚠️  REQUIRES IMMEDIATE ATTENTION ⚠️  ║' : ''}
╚══════════════════════════════════════╝`;

    console.warn(alertMessage);
  }

  /**
   * Track successful request (for failure rate calculation)
   */
  trackSuccess(context = {}) {
    this.metrics.totalRequests++;

    if (context.tenant) {
      if (!this.tenantMetrics.has(context.tenant)) {
        this.tenantMetrics.set(context.tenant, {
          totalFailures: 0,
          errorsByType: new Map(),
          lastError: null,
          firstError: null
        });
      }
    }
  }

  /**
   * Get error metrics and statistics
   */
  getMetrics(tenant = null) {
    if (tenant) {
      return {
        tenant: this.tenantMetrics.get(tenant) || {},
        global: this.getGlobalMetrics()
      };
    }

    return this.getGlobalMetrics();
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;

    const errors24h = this.metrics.recentErrors.filter(e => Date.parse(e.timestamp) > last24h);
    const errors1h = this.metrics.recentErrors.filter(e => Date.parse(e.timestamp) > last1h);

    return {
      total: {
        requests: this.metrics.totalRequests,
        failures: this.metrics.totalFailures,
        successRate: this.metrics.totalRequests > 0 ?
          ((this.metrics.totalRequests - this.metrics.totalFailures) / this.metrics.totalRequests * 100).toFixed(2) + '%' : 'N/A'
      },
      recent: {
        errors24h: errors24h.length,
        errors1h: errors1h.length
      },
      breakdown: {
        byType: Object.fromEntries(this.metrics.errorsByType),
        byProvider: Object.fromEntries(this.metrics.errorsByProvider)
      },
      health: this.getHealthStatus()
    };
  }

  /**
   * Get overall health status
   */
  getHealthStatus() {
    const metrics = this.getGlobalMetrics();
    const recentErrorCount = metrics.recent.errors1h;

    if (recentErrorCount === 0) return 'healthy';
    if (recentErrorCount <= 2) return 'good';
    if (recentErrorCount <= 5) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Clear old metrics (cleanup)
   */
  cleanup() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Keep 24 hours

    this.metrics.recentErrors = this.metrics.recentErrors.filter(
      e => Date.parse(e.timestamp) > cutoff
    );

    // Clean up old alert keys
    const alertCutoff = Math.floor(cutoff / this.options.alertWindow);
    this.metrics.alertsSent.forEach(key => {
      const keyTime = parseInt(key.split('_').pop());
      if (keyTime < alertCutoff) {
        this.metrics.alertsSent.delete(key);
      }
    });
  }

  /**
   * Generate user-friendly error messages
   */
  getUserFriendlyMessage(error) {
    const { type } = this.categorizeError(error);

    const friendlyMessages = {
      [AIErrorTypes.BUDGET_EXCEEDED]: "AI usage budget has been exceeded. Please check your billing settings or upgrade your plan.",
      [AIErrorTypes.RATE_LIMIT]: "AI service is temporarily busy. Please try again in a moment.",
      [AIErrorTypes.AUTHENTICATION]: "AI service authentication failed. Please check your API configuration.",
      [AIErrorTypes.NETWORK_ERROR]: "Network connectivity issue. Please check your internet connection and try again.",
      [AIErrorTypes.TIMEOUT]: "AI service is taking longer than usual. Please try again.",
      [AIErrorTypes.EMPTY_RESPONSE]: "AI service returned an empty response. Please try rephrasing your request.",
      [AIErrorTypes.QUOTA_EXCEEDED]: "AI service quota exceeded. Please try again later or upgrade your plan.",
      [AIErrorTypes.MODEL_NOT_FOUND]: "The requested AI model is not available. Please try a different model.",
      [AIErrorTypes.PROVIDER_ERROR]: "AI service is experiencing technical difficulties. Please try again later.",
      [AIErrorTypes.UNKNOWN]: "An unexpected error occurred with the AI service. Please try again."
    };

    return friendlyMessages[type] || friendlyMessages[AIErrorTypes.UNKNOWN];
  }
}

// Singleton instance
let errorHandlerInstance = null;

/**
 * Get the global AI error handler instance
 */
export function getAIErrorHandler(options = {}) {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new AIErrorHandler(options);
  }
  return errorHandlerInstance;
}

/**
 * Express middleware for AI error handling
 */
export function aiErrorMiddleware(options = {}) {
  const handler = getAIErrorHandler(options);

  return (error, req, res, next) => {
    // Only handle AI-related errors
    if (!error.provider && !error.message?.includes('AI') && !error.name?.includes('AIProvider')) {
      return next(error);
    }

    const context = {
      tenant: req.query?.tenant || req.body?.tenant,
      operation: req.route?.path || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    const errorLog = handler.logError(error, context);
    const friendlyMessage = handler.getUserFriendlyMessage(error);

    // Determine response status based on error type
    let statusCode = 500;
    const { type, severity } = handler.categorizeError(error);

    switch (type) {
      case AIErrorTypes.BUDGET_EXCEEDED:
      case AIErrorTypes.QUOTA_EXCEEDED:
        statusCode = 402; // Payment Required
        break;
      case AIErrorTypes.AUTHENTICATION:
        statusCode = 401; // Unauthorized
        break;
      case AIErrorTypes.RATE_LIMIT:
        statusCode = 429; // Too Many Requests
        break;
      case AIErrorTypes.VALIDATION_ERROR:
        statusCode = 400; // Bad Request
        break;
      case AIErrorTypes.TIMEOUT:
        statusCode = 504; // Gateway Timeout
        break;
      default:
        statusCode = 503; // Service Unavailable
    }

    res.status(statusCode).json({
      ok: false,
      error: 'ai_service_error',
      message: friendlyMessage,
      type,
      severity,
      errorId: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      retryAfter: type === AIErrorTypes.RATE_LIMIT ? 60 : undefined,
      supportMessage: severity === ErrorSeverity.CRITICAL ?
        "This issue has been automatically reported to our team." : undefined
    });
  };
}

/**
 * Wrapper function to add error handling to AI operations
 */
export function withAIErrorHandling(operation, context = {}) {
  const handler = getAIErrorHandler();

  return async (...args) => {
    const startTime = performance.now();

    try {
      const result = await operation(...args);

      // Track successful operation
      handler.trackSuccess(context);

      return result;
    } catch (error) {
      // Track and log the error
      const enhancedContext = {
        ...context,
        duration: performance.now() - startTime,
        args: args.map(arg => typeof arg === 'object' ? '[object]' : String(arg))
      };

      handler.logError(error, enhancedContext);

      // Re-throw the error for upstream handling
      throw error;
    }
  };
}

export default AIErrorHandler;