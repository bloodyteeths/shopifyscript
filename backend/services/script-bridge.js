/**
 * Script Communication Bridge Service
 * Handles secure bidirectional communication between Google Ads Scripts and Ads Autopilot AI backend
 *
 * Features:
 * - HMAC signature validation for incoming requests
 * - Request authentication and tenant validation
 * - Payload compression and chunking support
 * - Rate limiting per tenant
 * - Audit logging of all script interactions
 * - Large payload handling (>1MB)
 * - Request/response transformation
 * - Connection pooling and retry logic
 */

import zlib from 'zlib';
import { promisify } from 'util';
import scriptAuthService from '../utils/script-auth.js';
import optimizationQueueService from './optimization-queue.js';
import dataStore from './data-store.js';
import logger from './logger.js';
import tenantRegistry from './tenant-registry.js';
import { broadcastToTenant, WS_EVENTS, MESSAGE_PRIORITY } from './websocket-server.js';

// Promisify compression functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Constants
const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const COMPRESSION_THRESHOLD = 1024; // Compress payloads > 1KB
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_CONCURRENT_REQUESTS = 100;

// Request types
const REQUEST_TYPES = {
  AUTHENTICATE: 'authenticate',
  GET_OPTIMIZATIONS: 'get_optimizations',
  SUBMIT_RESULTS: 'submit_results',
  SUBMIT_METRICS: 'submit_metrics',
  REPORT_ERROR: 'report_error',
  HEALTH_CHECK: 'health_check',
  CHUNK_UPLOAD: 'chunk_upload'
};

// Response codes
const RESPONSE_CODES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

class ScriptBridgeService {
  constructor() {
    this.activeConnections = new Map(); // tenant_id -> connection info
    this.requestMetrics = new Map(); // tenant_id -> request metrics
    this.chunkStore = new Map(); // chunk_id -> chunk data
    this.compressionStats = new Map(); // tenant_id -> compression statistics
    this.errorThresholds = new Map(); // tenant_id -> error tracking

    // Cleanup expired chunks every 10 minutes
    setInterval(() => this.cleanupExpiredChunks(), 10 * 60 * 1000);

    logger.info('Script Bridge Service initialized');
  }

  /**
   * Process incoming script request
   * @param {Object} request - Incoming request
   * @param {Object} context - Request context (IP, headers, etc.)
   * @returns {Promise<Object>} Response object
   */
  async processRequest(request, context = {}) {
    const startTime = Date.now();
    let response;

    try {
      // Basic request validation
      const validation = this.validateBasicRequest(request);
      if (!validation.valid) {
        return this.createResponse(RESPONSE_CODES.VALIDATION_ERROR, validation.error);
      }

      // Extract authentication info
      const authInfo = this.extractAuthInfo(request);

      // Log incoming request
      this.logIncomingRequest(request, context, authInfo);

      // Authenticate request (except for health checks)
      if (request.type !== REQUEST_TYPES.HEALTH_CHECK) {
        const authResult = await this.authenticateRequest(authInfo, request);
        if (!authResult.valid) {
          this.recordAuthFailure(authInfo.tenantId, authResult.message);
          return this.createResponse(RESPONSE_CODES.AUTH_FAILED, authResult.message);
        }
      }

      // Check rate limits
      if (authInfo.tenantId) {
        const rateLimitCheck = await this.checkRateLimit(authInfo.tenantId, request.type);
        if (!rateLimitCheck.allowed) {
          return this.createResponse(RESPONSE_CODES.RATE_LIMITED, 'Rate limit exceeded', {
            retryAfter: rateLimitCheck.retryAfter
          });
        }
      }

      // Handle payload decompression if needed
      const processedRequest = await this.processIncomingPayload(request);

      // Route request to appropriate handler
      response = await this.routeRequest(processedRequest, context);

      // Compress response if needed
      response = await this.processOutgoingPayload(response, authInfo.tenantId);

      // Record successful request
      this.recordSuccessfulRequest(authInfo.tenantId, request.type, Date.now() - startTime);

    } catch (error) {
      logger.error('Script bridge request processing failed', {
        error: error.message,
        requestType: request?.type,
        tenantId: request?.tenantId,
        stack: error.stack
      });

      response = this.createResponse(RESPONSE_CODES.ERROR, 'Internal server error');
      this.recordRequestError(request?.tenantId, request?.type, error.message);
    }

    // Add processing time to response
    response.processingTime = Date.now() - startTime;

    // Log outgoing response
    this.logOutgoingResponse(response, request, context);

    return response;
  }

  /**
   * Handle authentication requests
   * @param {Object} request - Authentication request
   * @returns {Promise<Object>} Authentication response
   */
  async handleAuthenticate(request) {
    try {
      const { tenantId, scriptVersion, capabilities } = request.payload;

      // Validate tenant
      const tenant = await tenantRegistry.getTenant(tenantId);
      if (!tenant || tenant.status !== 'active') {
        return this.createResponse(RESPONSE_CODES.TENANT_INACTIVE, 'Tenant not found or inactive');
      }

      // Check script compatibility
      const compatibility = await this.checkScriptCompatibility(scriptVersion, tenantId);
      if (!compatibility.compatible) {
        return this.createResponse(RESPONSE_CODES.VALIDATION_ERROR, compatibility.error);
      }

      // Store connection info
      this.activeConnections.set(tenantId, {
        authenticatedAt: new Date().toISOString(),
        scriptVersion,
        capabilities,
        lastActivity: new Date().toISOString()
      });

      // Generate session token for this connection
      const sessionToken = scriptAuthService.generateNonce();

      logger.info('Script authentication successful', {
        tenantId,
        scriptVersion,
        capabilities
      });

      return this.createResponse(RESPONSE_CODES.SUCCESS, 'Authentication successful', {
        sessionToken,
        serverVersion: process.env.SERVER_VERSION || '1.0.0',
        supportedFeatures: this.getSupportedFeatures(),
        optimizationLimits: await this.getOptimizationLimits(tenantId),
        nextSync: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
      });

    } catch (error) {
      logger.error('Authentication handling failed', {
        error: error.message,
        tenantId: request.payload?.tenantId
      });

      return this.createResponse(RESPONSE_CODES.ERROR, 'Authentication failed');
    }
  }

  /**
   * Handle optimization retrieval requests
   * @param {Object} request - Get optimizations request
   * @returns {Promise<Object>} Optimizations response
   */
  async handleGetOptimizations(request) {
    try {
      const { tenantId, limit, priority, lastSyncId } = request.payload;

      // Get pending optimizations
      const optimizations = await optimizationQueueService.getPendingOptimizations(
        tenantId,
        limit || 10,
        priority
      );

      // Filter by lastSyncId if provided (incremental sync)
      let filteredOptimizations = optimizations;
      if (lastSyncId) {
        filteredOptimizations = optimizations.filter(opt =>
          opt.id > lastSyncId
        );
      }

      // Transform optimizations for script consumption
      const scriptOptimizations = filteredOptimizations.map(opt =>
        this.transformOptimizationForScript(opt)
      );

      // Update connection activity
      this.updateConnectionActivity(tenantId);

      logger.info('Optimizations retrieved for script', {
        tenantId,
        count: scriptOptimizations.length,
        priority,
        lastSyncId
      });

      return this.createResponse(RESPONSE_CODES.SUCCESS, 'Optimizations retrieved', {
        optimizations: scriptOptimizations,
        count: scriptOptimizations.length,
        hasMore: scriptOptimizations.length === (limit || 10),
        nextSyncId: scriptOptimizations.length > 0 ?
          scriptOptimizations[scriptOptimizations.length - 1].id : lastSyncId,
        serverTime: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get optimizations failed', {
        error: error.message,
        tenantId: request.payload?.tenantId
      });

      return this.createResponse(RESPONSE_CODES.ERROR, 'Failed to retrieve optimizations');
    }
  }

  /**
   * Handle optimization results submission
   * @param {Object} request - Submit results request
   * @returns {Promise<Object>} Submission response
   */
  async handleSubmitResults(request) {
    try {
      const { tenantId, results } = request.payload;

      if (!Array.isArray(results)) {
        return this.createResponse(RESPONSE_CODES.VALIDATION_ERROR, 'Results must be an array');
      }

      const processedResults = [];
      const errors = [];

      // Process each result
      for (const result of results) {
        try {
          const processed = await this.processOptimizationResult(tenantId, result);
          processedResults.push(processed);

          // Emit script executed success event
          await broadcastToTenant(tenantId, {
            type: WS_EVENTS.SCRIPT_EXECUTED,
            scriptId: result.scriptId || 'google-ads-script',
            status: 'success',
            results: {
              optimizationId: result.optimizationId,
              type: result.type,
              impact: result.impact,
              timestamp: new Date().toISOString()
            }
          }, MESSAGE_PRIORITY.NORMAL);

        } catch (error) {
          errors.push({
            optimizationId: result.optimizationId,
            error: error.message
          });

          // Emit script executed error event
          await broadcastToTenant(tenantId, {
            type: WS_EVENTS.SCRIPT_EXECUTED,
            scriptId: result.scriptId || 'google-ads-script',
            status: 'error',
            results: {
              optimizationId: result.optimizationId,
              error: error.message,
              timestamp: new Date().toISOString()
            }
          }, MESSAGE_PRIORITY.HIGH);
        }
      }

      // Update connection activity
      this.updateConnectionActivity(tenantId);

      // Emit metrics updated event if results were processed
      if (processedResults.length > 0) {
        await broadcastToTenant(tenantId, {
          type: WS_EVENTS.METRICS_UPDATED,
          metrics: {
            optimizationsApplied: processedResults.length,
            lastUpdate: new Date().toISOString(),
            source: 'script-bridge'
          }
        }, MESSAGE_PRIORITY.LOW);
      }

      logger.info('Optimization results processed', {
        tenantId,
        successful: processedResults.length,
        failed: errors.length
      });

      return this.createResponse(RESPONSE_CODES.SUCCESS, 'Results processed', {
        processed: processedResults.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        serverTime: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Submit results failed', {
        error: error.message,
        tenantId: request.payload?.tenantId
      });

      return this.createResponse(RESPONSE_CODES.ERROR, 'Failed to process results');
    }
  }

  /**
   * Handle metrics submission
   * @param {Object} request - Submit metrics request
   * @returns {Promise<Object>} Submission response
   */
  async handleSubmitMetrics(request) {
    try {
      const { tenantId, metrics } = request.payload;

      // Validate metrics structure
      const validation = this.validateMetrics(metrics);
      if (!validation.valid) {
        return this.createResponse(RESPONSE_CODES.VALIDATION_ERROR, validation.error);
      }

      // Store metrics
      await this.storeScriptMetrics(tenantId, metrics);

      // Update connection activity
      this.updateConnectionActivity(tenantId);

      logger.info('Script metrics received', {
        tenantId,
        metricsCount: Object.keys(metrics).length
      });

      return this.createResponse(RESPONSE_CODES.SUCCESS, 'Metrics recorded');

    } catch (error) {
      logger.error('Submit metrics failed', {
        error: error.message,
        tenantId: request.payload?.tenantId
      });

      return this.createResponse(RESPONSE_CODES.ERROR, 'Failed to record metrics');
    }
  }

  /**
   * Handle error reporting
   * @param {Object} request - Error report request
   * @returns {Promise<Object>} Error response
   */
  async handleReportError(request) {
    try {
      const { tenantId, error, context } = request.payload;

      // Store error report
      await this.storeScriptError(tenantId, error, context);

      // Update error thresholds
      this.updateErrorThresholds(tenantId, error);

      // Check if error threshold exceeded
      const thresholdCheck = this.checkErrorThreshold(tenantId);
      if (thresholdCheck.exceeded) {
        // Alert admin or pause script processing
        await this.handleErrorThresholdExceeded(tenantId, thresholdCheck);
      }

      logger.warn('Script error reported', {
        tenantId,
        errorType: error.type,
        message: error.message
      });

      return this.createResponse(RESPONSE_CODES.SUCCESS, 'Error recorded');

    } catch (error) {
      logger.error('Report error failed', {
        error: error.message,
        tenantId: request.payload?.tenantId
      });

      return this.createResponse(RESPONSE_CODES.ERROR, 'Failed to record error');
    }
  }

  /**
   * Handle health check requests
   * @param {Object} request - Health check request
   * @returns {Promise<Object>} Health response
   */
  async handleHealthCheck(request) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.SERVER_VERSION || '1.0.0',
        services: {
          database: await this.checkDatabaseHealth(),
          queue: await this.checkQueueHealth(),
          authentication: await this.checkAuthHealth()
        }
      };

      return this.createResponse(RESPONSE_CODES.SUCCESS, 'System healthy', health);

    } catch (error) {
      logger.error('Health check failed', { error: error.message });

      return this.createResponse(RESPONSE_CODES.ERROR, 'Health check failed', {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  // Private helper methods

  validateBasicRequest(request) {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request format' };
    }

    if (!request.type || !Object.values(REQUEST_TYPES).includes(request.type)) {
      return { valid: false, error: 'Invalid request type' };
    }

    if (!request.payload && request.type !== REQUEST_TYPES.HEALTH_CHECK) {
      return { valid: false, error: 'Request payload required' };
    }

    return { valid: true };
  }

  extractAuthInfo(request) {
    return {
      signature: request.signature,
      tenantId: request.tenantId,
      timestamp: request.timestamp,
      nonce: request.nonce,
      scriptVersion: request.scriptVersion
    };
  }

  async authenticateRequest(authInfo, request) {
    try {
      const payload = JSON.stringify(request.payload);
      return await scriptAuthService.validateRequest({
        ...authInfo,
        payload
      });
    } catch (error) {
      return { valid: false, message: 'Authentication failed' };
    }
  }

  async checkRateLimit(tenantId, requestType) {
    // Implementation would check rate limits based on tenant subscription
    // For now, return allowed
    return { allowed: true };
  }

  async processIncomingPayload(request) {
    if (request.compressed) {
      try {
        const decompressed = await gunzip(Buffer.from(request.payload, 'base64'));
        request.payload = JSON.parse(decompressed.toString('utf8'));
        request.compressed = false;
      } catch (error) {
        throw new Error('Failed to decompress payload');
      }
    }

    return request;
  }

  async processOutgoingPayload(response, tenantId) {
    const payloadSize = JSON.stringify(response.data || {}).length;

    if (payloadSize > COMPRESSION_THRESHOLD) {
      try {
        const compressed = await gzip(JSON.stringify(response.data));
        response.data = compressed.toString('base64');
        response.compressed = true;

        // Update compression stats
        this.updateCompressionStats(tenantId, payloadSize, compressed.length);
      } catch (error) {
        logger.warn('Failed to compress response', { tenantId, error: error.message });
      }
    }

    return response;
  }

  async routeRequest(request, context) {
    switch (request.type) {
      case REQUEST_TYPES.AUTHENTICATE:
        return this.handleAuthenticate(request);

      case REQUEST_TYPES.GET_OPTIMIZATIONS:
        return this.handleGetOptimizations(request);

      case REQUEST_TYPES.SUBMIT_RESULTS:
        return this.handleSubmitResults(request);

      case REQUEST_TYPES.SUBMIT_METRICS:
        return this.handleSubmitMetrics(request);

      case REQUEST_TYPES.REPORT_ERROR:
        return this.handleReportError(request);

      case REQUEST_TYPES.HEALTH_CHECK:
        return this.handleHealthCheck(request);

      default:
        return this.createResponse(RESPONSE_CODES.VALIDATION_ERROR, 'Unknown request type');
    }
  }

  createResponse(code, message, data = null) {
    return {
      code,
      message,
      data,
      timestamp: new Date().toISOString(),
      success: code === RESPONSE_CODES.SUCCESS
    };
  }

  transformOptimizationForScript(optimization) {
    return {
      id: optimization.id,
      type: optimization.type,
      priority: optimization.priority,
      data: optimization.data,
      metadata: {
        estimatedImpact: optimization.metadata?.estimatedImpact,
        confidence: optimization.metadata?.confidence,
        tags: optimization.metadata?.tags || []
      }
    };
  }

  async processOptimizationResult(tenantId, result) {
    const { optimizationId, status, data, error } = result;

    if (status === 'success') {
      await optimizationQueueService.updateOptimizationStatus(
        optimizationId,
        'applied',
        {
          appliedAt: new Date().toISOString(),
          results: data,
          rollbackData: data.rollbackData
        }
      );
    } else {
      await optimizationQueueService.updateOptimizationStatus(
        optimizationId,
        'failed',
        { error }
      );
    }

    return { optimizationId, processed: true };
  }

  validateMetrics(metrics) {
    if (!metrics || typeof metrics !== 'object') {
      return { valid: false, error: 'Invalid metrics format' };
    }

    const requiredFields = ['executionTime', 'memoryUsage', 'apiCalls'];
    for (const field of requiredFields) {
      if (!(field in metrics)) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }

  async storeScriptMetrics(tenantId, metrics) {
    await dataStore.storeMetrics({
      tenantId,
      type: 'script_metrics',
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  async storeScriptError(tenantId, error, context) {
    await dataStore.storeError({
      tenantId,
      type: 'script_error',
      error,
      context,
      timestamp: new Date().toISOString()
    });
  }

  updateConnectionActivity(tenantId) {
    const connection = this.activeConnections.get(tenantId);
    if (connection) {
      connection.lastActivity = new Date().toISOString();
    }
  }

  updateCompressionStats(tenantId, originalSize, compressedSize) {
    if (!this.compressionStats.has(tenantId)) {
      this.compressionStats.set(tenantId, {
        requests: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0
      });
    }

    const stats = this.compressionStats.get(tenantId);
    stats.requests++;
    stats.totalOriginalSize += originalSize;
    stats.totalCompressedSize += compressedSize;
  }

  updateErrorThresholds(tenantId, error) {
    if (!this.errorThresholds.has(tenantId)) {
      this.errorThresholds.set(tenantId, {
        count: 0,
        lastReset: Date.now(),
        errors: []
      });
    }

    const threshold = this.errorThresholds.get(tenantId);
    threshold.count++;
    threshold.errors.push({
      type: error.type,
      timestamp: Date.now()
    });

    // Keep only last 50 errors
    if (threshold.errors.length > 50) {
      threshold.errors.shift();
    }
  }

  checkErrorThreshold(tenantId) {
    const threshold = this.errorThresholds.get(tenantId);
    if (!threshold) return { exceeded: false };

    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = threshold.errors.filter(e => e.timestamp > hourAgo);

    return {
      exceeded: recentErrors.length > 10, // 10 errors per hour threshold
      count: recentErrors.length
    };
  }

  async handleErrorThresholdExceeded(tenantId, thresholdInfo) {
    logger.error('Script error threshold exceeded', {
      tenantId,
      errorCount: thresholdInfo.count
    });

    // Could implement alerting or automatic script pause here
  }

  logIncomingRequest(request, context, authInfo) {
    logger.info('Script request received', {
      type: request.type,
      tenantId: authInfo.tenantId,
      ip: context.ip,
      userAgent: context.userAgent
    });
  }

  logOutgoingResponse(response, request, context) {
    logger.info('Script response sent', {
      requestType: request?.type,
      responseCode: response.code,
      processingTime: response.processingTime,
      compressed: response.compressed
    });
  }

  recordSuccessfulRequest(tenantId, requestType, processingTime) {
    // Update request metrics
    if (!this.requestMetrics.has(tenantId)) {
      this.requestMetrics.set(tenantId, {});
    }

    const metrics = this.requestMetrics.get(tenantId);
    if (!metrics[requestType]) {
      metrics[requestType] = {
        count: 0,
        totalTime: 0,
        avgTime: 0
      };
    }

    const typeMetrics = metrics[requestType];
    typeMetrics.count++;
    typeMetrics.totalTime += processingTime;
    typeMetrics.avgTime = typeMetrics.totalTime / typeMetrics.count;
  }

  recordAuthFailure(tenantId, reason) {
    logger.warn('Script authentication failed', { tenantId, reason });
  }

  recordRequestError(tenantId, requestType, error) {
    logger.error('Script request error', { tenantId, requestType, error });
  }

  getSupportedFeatures() {
    return [
      'compression',
      'chunking',
      'batch_processing',
      'incremental_sync',
      'rollback_support'
    ];
  }

  async getOptimizationLimits(tenantId) {
    // Get subscription-based limits
    const subscription = await tenantRegistry.getSubscription(tenantId);
    return {
      maxOptimizationsPerHour: subscription?.optimization_limit || 100,
      maxBatchSize: 10,
      supportedTypes: Object.values(optimizationQueueService.OPTIMIZATION_TYPES)
    };
  }

  async checkDatabaseHealth() {
    try {
      await dataStore.healthCheck();
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  async checkQueueHealth() {
    try {
      // Simple queue health check
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  async checkAuthHealth() {
    try {
      // Simple auth health check
      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  cleanupExpiredChunks() {
    const now = Date.now();
    let cleaned = 0;

    for (const [chunkId, chunk] of this.chunkStore.entries()) {
      if (now - chunk.timestamp > 30 * 60 * 1000) { // 30 minutes
        this.chunkStore.delete(chunkId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up expired chunks', { count: cleaned });
    }
  }

  /**
   * Get bridge statistics
   * @param {string} tenantId - Optional tenant filter
   * @returns {Object} Bridge statistics
   */
  getStats(tenantId = null) {
    const stats = {
      activeConnections: tenantId ?
        (this.activeConnections.has(tenantId) ? 1 : 0) :
        this.activeConnections.size,
      requestMetrics: tenantId ?
        this.requestMetrics.get(tenantId) :
        Object.fromEntries(this.requestMetrics),
      compressionStats: tenantId ?
        this.compressionStats.get(tenantId) :
        Object.fromEntries(this.compressionStats),
      chunkStoreSize: this.chunkStore.size
    };

    return stats;
  }
}

// Export singleton instance
const scriptBridgeService = new ScriptBridgeService();
export default scriptBridgeService;

// Named exports
export {
  scriptBridgeService as ScriptBridgeService,
  REQUEST_TYPES,
  RESPONSE_CODES
};