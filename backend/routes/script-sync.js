/**
 * Script Sync Routes
 * API endpoints for secure communication between Google Ads Scripts and ProofKit backend
 *
 * Endpoints:
 * - POST /api/script/authenticate - Initial handshake
 * - GET /api/script/optimizations - Fetch pending optimizations
 * - POST /api/script/results - Receive execution results
 * - POST /api/script/metrics - Receive performance metrics
 * - POST /api/script/errors - Error reporting
 * - GET /api/script/health - Health check endpoint
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import scriptBridgeService, { REQUEST_TYPES, RESPONSE_CODES } from '../services/script-bridge.js';
import scriptAuthService from '../utils/script-auth.js';
import logger from '../services/logger.js';

const router = express.Router();

// Rate limiting middleware - more permissive for scripts
const scriptRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 requests per hour per IP
  message: {
    code: RESPONSE_CODES.RATE_LIMITED,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.endsWith('/health');
  }
});

// Apply rate limiting to all script routes
router.use(scriptRateLimit);

// Request logging middleware
router.use((req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info('Script API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(obj) {
    const processingTime = Date.now() - startTime;

    logger.info('Script API response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      processingTime,
      success: obj?.success || false
    });

    return originalJson.call(this, obj);
  };

  next();
});

// Error handling middleware for malformed JSON
router.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      code: RESPONSE_CODES.VALIDATION_ERROR,
      message: 'Invalid JSON payload',
      timestamp: new Date().toISOString()
    });
  }
  next(err);
});

/**
 * POST /api/script/authenticate
 * Initial handshake and authentication
 */
router.post('/authenticate', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const request = {
      type: REQUEST_TYPES.AUTHENTICATE,
      signature: req.body.signature,
      tenantId: req.body.tenantId,
      timestamp: req.body.timestamp,
      nonce: req.body.nonce,
      scriptVersion: req.body.scriptVersion,
      payload: {
        tenantId: req.body.tenantId,
        scriptVersion: req.body.scriptVersion,
        capabilities: req.body.capabilities || []
      }
    };

    const response = await scriptBridgeService.processRequest(request, context);

    res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    logger.error('Authentication endpoint error', {
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/script/optimizations
 * Fetch pending optimizations for script processing
 */
router.get('/optimizations', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Extract auth info from headers or query params
    const authInfo = {
      signature: req.get('X-Script-Signature') || req.query.signature,
      tenantId: req.get('X-Tenant-Id') || req.query.tenantId,
      timestamp: req.get('X-Timestamp') || req.query.timestamp,
      nonce: req.get('X-Nonce') || req.query.nonce,
      scriptVersion: req.get('X-Script-Version') || req.query.scriptVersion
    };

    const request = {
      type: REQUEST_TYPES.GET_OPTIMIZATIONS,
      ...authInfo,
      payload: {
        tenantId: authInfo.tenantId,
        limit: parseInt(req.query.limit) || 10,
        priority: req.query.priority,
        lastSyncId: req.query.lastSyncId
      }
    };

    const response = await scriptBridgeService.processRequest(request, context);

    res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    logger.error('Get optimizations endpoint error', {
      error: error.message,
      ip: req.ip,
      tenantId: req.query.tenantId
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/script/results
 * Receive optimization execution results
 */
router.post('/results', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const request = {
      type: REQUEST_TYPES.SUBMIT_RESULTS,
      signature: req.body.signature,
      tenantId: req.body.tenantId,
      timestamp: req.body.timestamp,
      nonce: req.body.nonce,
      scriptVersion: req.body.scriptVersion,
      compressed: req.body.compressed,
      payload: req.body.payload || {
        tenantId: req.body.tenantId,
        results: req.body.results
      }
    };

    const response = await scriptBridgeService.processRequest(request, context);

    res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    logger.error('Submit results endpoint error', {
      error: error.message,
      ip: req.ip,
      tenantId: req.body.tenantId
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/script/metrics
 * Receive performance metrics from script
 */
router.post('/metrics', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const request = {
      type: REQUEST_TYPES.SUBMIT_METRICS,
      signature: req.body.signature,
      tenantId: req.body.tenantId,
      timestamp: req.body.timestamp,
      nonce: req.body.nonce,
      scriptVersion: req.body.scriptVersion,
      payload: {
        tenantId: req.body.tenantId,
        metrics: req.body.metrics
      }
    };

    const response = await scriptBridgeService.processRequest(request, context);

    res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    logger.error('Submit metrics endpoint error', {
      error: error.message,
      ip: req.ip,
      tenantId: req.body.tenantId
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/script/errors
 * Error reporting from script
 */
router.post('/errors', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const request = {
      type: REQUEST_TYPES.REPORT_ERROR,
      signature: req.body.signature,
      tenantId: req.body.tenantId,
      timestamp: req.body.timestamp,
      nonce: req.body.nonce,
      scriptVersion: req.body.scriptVersion,
      payload: {
        tenantId: req.body.tenantId,
        error: req.body.error,
        context: req.body.context
      }
    };

    const response = await scriptBridgeService.processRequest(request, context);

    res.status(response.success ? 200 : 400).json(response);

  } catch (error) {
    logger.error('Report error endpoint error', {
      error: error.message,
      ip: req.ip,
      tenantId: req.body.tenantId
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/script/health
 * Health check endpoint - no authentication required
 */
router.get('/health', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    const request = {
      type: REQUEST_TYPES.HEALTH_CHECK,
      payload: {}
    };

    const response = await scriptBridgeService.processRequest(request, context);

    res.status(response.success ? 200 : 503).json(response);

  } catch (error) {
    logger.error('Health check endpoint error', {
      error: error.message,
      ip: req.ip
    });

    res.status(503).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      data: {
        status: 'unhealthy',
        error: error.message
      }
    });
  }
});

/**
 * GET /api/script/stats
 * Get bridge statistics (admin endpoint)
 */
router.get('/stats', async (req, res) => {
  try {
    // Simple admin check - in production this should be properly secured
    const adminKey = req.get('X-Admin-Key');
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        code: RESPONSE_CODES.AUTH_FAILED,
        message: 'Unauthorized',
        timestamp: new Date().toISOString()
      });
    }

    const tenantId = req.query.tenantId;
    const stats = scriptBridgeService.getStats(tenantId);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'Statistics retrieved',
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Stats endpoint error', {
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Failed to retrieve statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/script/test-auth
 * Test authentication without processing (development endpoint)
 */
router.post('/test-auth', async (req, res) => {
  try {
    // Only available in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        code: RESPONSE_CODES.ERROR,
        message: 'Endpoint not available',
        timestamp: new Date().toISOString()
      });
    }

    const authInfo = {
      signature: req.body.signature,
      tenantId: req.body.tenantId,
      timestamp: req.body.timestamp,
      nonce: req.body.nonce,
      scriptVersion: req.body.scriptVersion,
      payload: JSON.stringify(req.body.payload || {})
    };

    const authResult = await scriptAuthService.validateRequest(authInfo);

    res.json({
      code: authResult.valid ? RESPONSE_CODES.SUCCESS : RESPONSE_CODES.AUTH_FAILED,
      message: authResult.message,
      data: {
        valid: authResult.valid,
        details: authResult.data
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Test auth endpoint error', {
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Test authentication failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/script/bulk-results
 * Handle large batch result submissions with chunking support
 */
router.post('/bulk-results', async (req, res) => {
  try {
    const context = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Handle chunked uploads
    if (req.body.chunked) {
      const chunkId = req.body.chunkId;
      const chunkIndex = req.body.chunkIndex;
      const totalChunks = req.body.totalChunks;
      const chunkData = req.body.chunkData;

      // Store chunk
      if (!scriptBridgeService.chunkStore) {
        scriptBridgeService.chunkStore = new Map();
      }

      if (!scriptBridgeService.chunkStore.has(chunkId)) {
        scriptBridgeService.chunkStore.set(chunkId, {
          chunks: new Array(totalChunks),
          received: 0,
          timestamp: Date.now()
        });
      }

      const chunkInfo = scriptBridgeService.chunkStore.get(chunkId);
      chunkInfo.chunks[chunkIndex] = chunkData;
      chunkInfo.received++;

      // If all chunks received, process the complete data
      if (chunkInfo.received === totalChunks) {
        try {
          const completeData = JSON.parse(chunkInfo.chunks.join(''));

          const request = {
            type: REQUEST_TYPES.SUBMIT_RESULTS,
            signature: req.body.signature,
            tenantId: req.body.tenantId,
            timestamp: req.body.timestamp,
            nonce: req.body.nonce,
            scriptVersion: req.body.scriptVersion,
            payload: completeData
          };

          const response = await scriptBridgeService.processRequest(request, context);

          // Clean up chunks
          scriptBridgeService.chunkStore.delete(chunkId);

          return res.status(response.success ? 200 : 400).json(response);

        } catch (parseError) {
          scriptBridgeService.chunkStore.delete(chunkId);
          throw new Error('Failed to parse chunked data');
        }
      } else {
        // Still waiting for more chunks
        return res.json({
          code: RESPONSE_CODES.SUCCESS,
          message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
          data: {
            chunkId,
            received: chunkInfo.received,
            total: totalChunks
          },
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Handle non-chunked bulk results
      const request = {
        type: REQUEST_TYPES.SUBMIT_RESULTS,
        signature: req.body.signature,
        tenantId: req.body.tenantId,
        timestamp: req.body.timestamp,
        nonce: req.body.nonce,
        scriptVersion: req.body.scriptVersion,
        compressed: req.body.compressed,
        payload: req.body.payload
      };

      const response = await scriptBridgeService.processRequest(request, context);

      res.status(response.success ? 200 : 400).json(response);
    }

  } catch (error) {
    logger.error('Bulk results endpoint error', {
      error: error.message,
      ip: req.ip,
      tenantId: req.body.tenantId
    });

    res.status(500).json({
      code: RESPONSE_CODES.ERROR,
      message: 'Bulk results processing failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Generic error handler for unhandled errors
router.use((err, req, res, next) => {
  logger.error('Unhandled script route error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    code: RESPONSE_CODES.ERROR,
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

export default router;