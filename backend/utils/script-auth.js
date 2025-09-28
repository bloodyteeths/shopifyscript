/**
 * Script Authentication Utilities
 * Provides HMAC-based authentication for Google Ads Script communication
 *
 * Features:
 * - HMAC signature generation and validation
 * - Request timestamp validation (prevents replay attacks)
 * - Tenant authentication helpers
 * - Security utilities for script communication
 */

import crypto from 'crypto';
import { sign, verify } from './hmac.js';
import tenantRegistry from '../services/tenant-registry.js';
import logger from '../services/logger.js';

// Security constants
const TIMESTAMP_TOLERANCE = 5 * 60 * 1000; // 5 minutes in milliseconds
const NONCE_CACHE_SIZE = 1000;
const NONCE_EXPIRY = 10 * 60 * 1000; // 10 minutes

class ScriptAuthService {
  constructor() {
    this.nonceCache = new Map(); // Store used nonces to prevent replay
    this.failedAttempts = new Map(); // Track failed authentication attempts
    this.rateLimits = new Map(); // Rate limiting per tenant

    // Cleanup expired nonces every 5 minutes
    setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000);
  }

  /**
   * Generate HMAC signature for script requests
   * @param {Object} payload - The request payload
   * @param {string} tenantId - Tenant identifier
   * @param {number} timestamp - Request timestamp
   * @param {string} nonce - Unique request identifier
   * @returns {string} HMAC signature
   */
  generateSignature(payload, tenantId, timestamp, nonce) {
    try {
      // Create canonical string for signing
      const canonicalString = this.createCanonicalString(payload, tenantId, timestamp, nonce);
      return sign(canonicalString);
    } catch (error) {
      logger.error('Signature generation failed', { error: error.message, tenantId });
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Validate HMAC signature and request authenticity
   * @param {Object} params - Authentication parameters
   * @returns {Object} Validation result
   */
  async validateRequest({ signature, payload, tenantId, timestamp, nonce, scriptVersion }) {
    const validationStart = Date.now();

    try {
      // Basic parameter validation
      if (!signature || !payload || !tenantId || !timestamp || !nonce) {
        return this.createValidationResult(false, 'Missing required authentication parameters');
      }

      // Check tenant exists and is active
      const tenantValid = await this.validateTenant(tenantId);
      if (!tenantValid.valid) {
        return this.createValidationResult(false, tenantValid.error);
      }

      // Validate timestamp (prevent replay attacks)
      const timestampValid = this.validateTimestamp(timestamp);
      if (!timestampValid.valid) {
        return this.createValidationResult(false, timestampValid.error);
      }

      // Check nonce uniqueness (prevent replay attacks)
      const nonceValid = this.validateNonce(nonce, tenantId);
      if (!nonceValid.valid) {
        return this.createValidationResult(false, nonceValid.error);
      }

      // Validate rate limits
      const rateLimitValid = this.checkRateLimit(tenantId);
      if (!rateLimitValid.valid) {
        return this.createValidationResult(false, rateLimitValid.error);
      }

      // Validate script version compatibility
      const versionValid = this.validateScriptVersion(scriptVersion, tenantId);
      if (!versionValid.valid) {
        return this.createValidationResult(false, versionValid.error);
      }

      // Generate expected signature
      const expectedSignature = this.generateSignature(payload, tenantId, timestamp, nonce);

      // Constant-time comparison to prevent timing attacks
      const signatureValid = this.constantTimeCompare(signature, expectedSignature);

      if (signatureValid) {
        // Store nonce to prevent replay
        this.storeNonce(nonce, tenantId);

        // Record successful authentication
        this.recordSuccessfulAuth(tenantId);

        // Update rate limit counter
        this.updateRateLimit(tenantId);

        logger.info('Script authentication successful', {
          tenantId,
          scriptVersion,
          validationTime: Date.now() - validationStart
        });

        return this.createValidationResult(true, 'Authentication successful', {
          tenantId,
          scriptVersion,
          validatedAt: new Date().toISOString()
        });
      } else {
        // Record failed attempt
        this.recordFailedAuth(tenantId, 'Invalid signature');
        return this.createValidationResult(false, 'Invalid signature');
      }

    } catch (error) {
      logger.error('Script authentication error', {
        error: error.message,
        tenantId,
        validationTime: Date.now() - validationStart
      });

      this.recordFailedAuth(tenantId, error.message);
      return this.createValidationResult(false, 'Authentication error');
    }
  }

  /**
   * Create canonical string for HMAC signing
   * @private
   */
  createCanonicalString(payload, tenantId, timestamp, nonce) {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return `${tenantId}:${timestamp}:${nonce}:${payloadString}`;
  }

  /**
   * Validate tenant existence and status
   * @private
   */
  async validateTenant(tenantId) {
    try {
      const tenant = await tenantRegistry.getTenant(tenantId);

      if (!tenant) {
        return { valid: false, error: 'Tenant not found' };
      }

      if (tenant.status !== 'active') {
        return { valid: false, error: 'Tenant inactive' };
      }

      if (tenant.scriptAccess === false) {
        return { valid: false, error: 'Script access disabled' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Tenant validation failed' };
    }
  }

  /**
   * Validate request timestamp
   * @private
   */
  validateTimestamp(timestamp) {
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime)) {
      return { valid: false, error: 'Invalid timestamp format' };
    }

    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > TIMESTAMP_TOLERANCE) {
      return { valid: false, error: 'Request timestamp outside tolerance window' };
    }

    return { valid: true };
  }

  /**
   * Validate nonce uniqueness
   * @private
   */
  validateNonce(nonce, tenantId) {
    const nonceKey = `${tenantId}:${nonce}`;

    if (this.nonceCache.has(nonceKey)) {
      return { valid: false, error: 'Nonce already used (replay attack detected)' };
    }

    if (nonce.length < 16) {
      return { valid: false, error: 'Nonce too short' };
    }

    return { valid: true };
  }

  /**
   * Check rate limiting
   * @private
   */
  checkRateLimit(tenantId) {
    const now = Date.now();
    const hourWindow = 60 * 60 * 1000; // 1 hour
    const maxRequests = 100; // 100 requests per hour per tenant

    if (!this.rateLimits.has(tenantId)) {
      this.rateLimits.set(tenantId, { count: 0, windowStart: now });
      return { valid: true };
    }

    const rateLimitData = this.rateLimits.get(tenantId);

    // Reset window if expired
    if (now - rateLimitData.windowStart > hourWindow) {
      rateLimitData.count = 0;
      rateLimitData.windowStart = now;
    }

    if (rateLimitData.count >= maxRequests) {
      return {
        valid: false,
        error: 'Rate limit exceeded',
        retryAfter: hourWindow - (now - rateLimitData.windowStart)
      };
    }

    return { valid: true };
  }

  /**
   * Validate script version compatibility
   * @private
   */
  validateScriptVersion(scriptVersion, tenantId) {
    // For now, accept all versions but log for monitoring
    if (!scriptVersion) {
      logger.warn('Script version not provided', { tenantId });
      return { valid: true }; // Allow for backward compatibility
    }

    // Version format validation (semantic versioning)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(scriptVersion)) {
      logger.warn('Invalid script version format', { tenantId, scriptVersion });
      return { valid: true }; // Allow for now, but log
    }

    logger.info('Script version validated', { tenantId, scriptVersion });
    return { valid: true };
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @private
   */
  constantTimeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Store nonce to prevent replay attacks
   * @private
   */
  storeNonce(nonce, tenantId) {
    const nonceKey = `${tenantId}:${nonce}`;
    this.nonceCache.set(nonceKey, {
      timestamp: Date.now(),
      tenantId
    });

    // Prevent memory bloat by enforcing cache size limit
    if (this.nonceCache.size > NONCE_CACHE_SIZE) {
      const oldestKey = this.nonceCache.keys().next().value;
      this.nonceCache.delete(oldestKey);
    }
  }

  /**
   * Update rate limit counter
   * @private
   */
  updateRateLimit(tenantId) {
    const rateLimitData = this.rateLimits.get(tenantId);
    if (rateLimitData) {
      rateLimitData.count++;
    }
  }

  /**
   * Record successful authentication
   * @private
   */
  recordSuccessfulAuth(tenantId) {
    // Clear failed attempts on successful auth
    this.failedAttempts.delete(tenantId);

    logger.info('Script authentication success', { tenantId });
  }

  /**
   * Record failed authentication attempt
   * @private
   */
  recordFailedAuth(tenantId, reason) {
    const now = Date.now();

    if (!this.failedAttempts.has(tenantId)) {
      this.failedAttempts.set(tenantId, []);
    }

    const attempts = this.failedAttempts.get(tenantId);
    attempts.push({ timestamp: now, reason });

    // Keep only last 10 failed attempts
    if (attempts.length > 10) {
      attempts.shift();
    }

    logger.warn('Script authentication failed', { tenantId, reason });
  }

  /**
   * Clean up expired nonces
   * @private
   */
  cleanupExpiredNonces() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of this.nonceCache.entries()) {
      if (now - data.timestamp > NONCE_EXPIRY) {
        this.nonceCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up expired nonces', { count: cleaned });
    }
  }

  /**
   * Create standardized validation result
   * @private
   */
  createValidationResult(valid, message, data = null) {
    return {
      valid,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate nonce for script requests
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get authentication statistics for a tenant
   */
  getAuthStats(tenantId) {
    return {
      rateLimitInfo: this.rateLimits.get(tenantId) || { count: 0, windowStart: Date.now() },
      failedAttempts: this.failedAttempts.get(tenantId) || [],
      nonceCount: Array.from(this.nonceCache.keys()).filter(key => key.startsWith(`${tenantId}:`)).length
    };
  }

  /**
   * Reset rate limit for a tenant (admin function)
   */
  resetRateLimit(tenantId) {
    this.rateLimits.delete(tenantId);
    logger.info('Rate limit reset for tenant', { tenantId });
  }
}

// Export singleton instance
const scriptAuthService = new ScriptAuthService();
export default scriptAuthService;

// Named exports for compatibility
export {
  scriptAuthService as ScriptAuthService,
  TIMESTAMP_TOLERANCE,
  NONCE_CACHE_SIZE
};