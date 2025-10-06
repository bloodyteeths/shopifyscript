/**
 * Secret Rotation Management Routes
 * Provides secure endpoints for managing HMAC secret rotation
 *
 * Security Features:
 * - Admin authentication required
 * - Audit logging of all rotation events
 * - Support for gradual rollout (both old and new secrets work)
 * - Automatic expiry of old secrets
 *
 * Routes:
 * - POST /api/secrets/rotate - Initiate secret rotation
 * - GET /api/secrets/status - Get rotation status
 * - POST /api/secrets/complete - Complete rotation and deprecate old secret
 * - POST /api/secrets/rollback - Rollback rotation in case of issues
 * - GET /api/secrets/history - Get rotation history
 */

import express from 'express';
import crypto from 'crypto';
import logger from '../services/logger.js';

const router = express.Router();

// In-memory storage for rotation state (in production, use Redis or database)
const rotationState = new Map();

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  const adminKey = req.get('X-Admin-Key') || req.body.adminKey;

  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    logger.warn('Unauthorized secret rotation attempt', {
      ip: req.ip,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'Unauthorized - Admin key required',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Apply admin authentication to all routes
router.use(requireAdmin);

/**
 * POST /api/secrets/rotate
 * Initiate secret rotation for a tenant
 */
router.post('/rotate', async (req, res) => {
  try {
    const { tenantId, expiryHours = 48 } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
        timestamp: new Date().toISOString()
      });
    }

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    const currentVersion = await getCurrentSecretVersion(tenantId);
    const newVersion = String(parseInt(currentVersion || '1') + 1);

    // Calculate expiry time for old secret
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + expiryHours);

    // Store rotation state
    const rotation = {
      tenantId,
      oldSecret: process.env.HMAC_SECRET, // Current secret
      oldVersion: currentVersion,
      newSecret,
      newVersion,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      expiryTime: expiryTime.toISOString(),
      initiatedBy: req.ip,
      scriptsMigrated: 0,
      totalScripts: 1 // Update based on actual number of scripts
    };

    rotationState.set(tenantId, rotation);

    // Log rotation initiation
    logger.info('Secret rotation initiated', {
      tenantId,
      newVersion,
      expiryTime: expiryTime.toISOString()
    });

    res.json({
      success: true,
      message: 'Secret rotation initiated',
      data: {
        tenantId,
        newVersion,
        newSecret, // Return new secret securely (only via HTTPS)
        expiryTime: expiryTime.toISOString(),
        instructions: [
          '1. Update backend environment with new secret',
          '2. Configure backend to accept both old and new secrets',
          '3. Update Google Ads Script with new secret',
          '4. Monitor script executions for 24-48 hours',
          '5. Call /api/secrets/complete to finalize rotation'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Secret rotation initiation failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to initiate secret rotation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/secrets/status
 * Get current rotation status for a tenant
 */
router.get('/status', async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
        timestamp: new Date().toISOString()
      });
    }

    const rotation = rotationState.get(tenantId);

    if (!rotation) {
      return res.json({
        success: true,
        message: 'No active rotation',
        data: {
          tenantId,
          status: 'none',
          currentVersion: await getCurrentSecretVersion(tenantId)
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if rotation has expired
    const now = new Date();
    const expiry = new Date(rotation.expiryTime);
    const isExpired = now > expiry;

    res.json({
      success: true,
      data: {
        tenantId: rotation.tenantId,
        status: rotation.status,
        currentVersion: rotation.oldVersion,
        newVersion: rotation.newVersion,
        startedAt: rotation.startedAt,
        expiryTime: rotation.expiryTime,
        isExpired,
        timeRemaining: isExpired ? '0h' : formatTimeRemaining(expiry - now),
        scriptsMigrated: rotation.scriptsMigrated,
        totalScripts: rotation.totalScripts,
        migrationProgress: `${Math.round((rotation.scriptsMigrated / rotation.totalScripts) * 100)}%`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get rotation status', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get rotation status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/secrets/complete
 * Complete rotation and deprecate old secret
 */
router.post('/complete', async (req, res) => {
  try {
    const { tenantId, confirmMigration } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!confirmMigration) {
      return res.status(400).json({
        success: false,
        error: 'confirmMigration must be true to complete rotation',
        timestamp: new Date().toISOString()
      });
    }

    const rotation = rotationState.get(tenantId);

    if (!rotation) {
      return res.status(404).json({
        success: false,
        error: 'No active rotation found for tenant',
        timestamp: new Date().toISOString()
      });
    }

    // Update rotation state
    rotation.status = 'completed';
    rotation.completedAt = new Date().toISOString();
    rotation.completedBy = req.ip;

    rotationState.set(tenantId, rotation);

    // Log completion
    logger.info('Secret rotation completed', {
      tenantId,
      oldVersion: rotation.oldVersion,
      newVersion: rotation.newVersion,
      duration: new Date() - new Date(rotation.startedAt)
    });

    res.json({
      success: true,
      message: 'Secret rotation completed successfully',
      data: {
        tenantId,
        oldVersion: rotation.oldVersion,
        newVersion: rotation.newVersion,
        completedAt: rotation.completedAt,
        nextSteps: [
          '1. Remove old secret from backend environment',
          '2. Update HMAC_SECRET to new value',
          '3. Remove HMAC_SECRET_NEW variable',
          '4. Restart backend services',
          '5. Monitor for any authentication errors'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to complete rotation', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to complete rotation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/secrets/rollback
 * Rollback rotation in case of issues
 */
router.post('/rollback', async (req, res) => {
  try {
    const { tenantId, reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
        timestamp: new Date().toISOString()
      });
    }

    const rotation = rotationState.get(tenantId);

    if (!rotation) {
      return res.status(404).json({
        success: false,
        error: 'No active rotation found for tenant',
        timestamp: new Date().toISOString()
      });
    }

    if (rotation.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot rollback completed rotation',
        timestamp: new Date().toISOString()
      });
    }

    // Update rotation state
    rotation.status = 'rolled_back';
    rotation.rolledBackAt = new Date().toISOString();
    rotation.rolledBackBy = req.ip;
    rotation.rollbackReason = reason || 'No reason provided';

    rotationState.set(tenantId, rotation);

    // Log rollback
    logger.warn('Secret rotation rolled back', {
      tenantId,
      reason: rotation.rollbackReason,
      newVersion: rotation.newVersion
    });

    res.json({
      success: true,
      message: 'Secret rotation rolled back',
      data: {
        tenantId,
        rolledBackAt: rotation.rolledBackAt,
        reason: rotation.rollbackReason,
        actions: [
          '1. Continue using old secret',
          '2. Investigate rollback reason',
          '3. Fix issues before attempting rotation again',
          '4. Old secret remains active'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to rollback rotation', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to rollback rotation',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/secrets/history
 * Get rotation history for a tenant
 */
router.get('/history', async (req, res) => {
  try {
    const { tenantId, limit = 10 } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
        timestamp: new Date().toISOString()
      });
    }

    // In production, fetch from database
    // For now, return current rotation state
    const rotation = rotationState.get(tenantId);
    const history = rotation ? [rotation] : [];

    res.json({
      success: true,
      data: {
        tenantId,
        rotations: history.map(r => ({
          oldVersion: r.oldVersion,
          newVersion: r.newVersion,
          status: r.status,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          rolledBackAt: r.rolledBackAt,
          rollbackReason: r.rollbackReason
        })),
        total: history.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get rotation history', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get rotation history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/secrets/generate
 * Generate a new secure secret (utility endpoint)
 */
router.post('/generate', async (req, res) => {
  try {
    const { length = 32 } = req.body;

    if (length < 16 || length > 128) {
      return res.status(400).json({
        success: false,
        error: 'Length must be between 16 and 128',
        timestamp: new Date().toISOString()
      });
    }

    const newSecret = crypto.randomBytes(length).toString('hex');

    logger.info('New secret generated', {
      length: newSecret.length,
      requestedBy: req.ip
    });

    res.json({
      success: true,
      data: {
        secret: newSecret,
        length: newSecret.length,
        generated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate secret', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate secret',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions

async function getCurrentSecretVersion(tenantId) {
  // In production, fetch from database or config
  // For now, return default
  const rotation = rotationState.get(tenantId);
  return rotation ? rotation.newVersion : '1';
}

function formatTimeRemaining(milliseconds) {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default router;
