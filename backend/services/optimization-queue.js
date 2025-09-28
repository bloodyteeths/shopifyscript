/**
 * Optimization Queue Service
 * Manages pending optimizations, priority handling, and status tracking for Google Ads Scripts
 *
 * Features:
 * - Queue management for pending optimizations
 * - Priority handling (critical, high, normal, low)
 * - Status tracking (pending, applied, failed, rolled_back)
 * - Optimization history storage
 * - Rollback tracking and management
 * - Batch processing support
 * - Performance monitoring
 */

import dataStore from './data-store.js';
import logger from './logger.js';
import tenantRegistry from './tenant-registry.js';
import { getCurrentSubscription } from '../middleware/subscription-check.js';

// Priority levels for optimizations
const PRIORITY_LEVELS = {
  CRITICAL: 'critical',    // Immediate processing (account issues, policy violations)
  HIGH: 'high',           // High-impact optimizations (budget, bidding)
  NORMAL: 'normal',       // Standard optimizations (keywords, ads)
  LOW: 'low'              // Background optimizations (reports, cleanup)
};

// Optimization statuses
const OPTIMIZATION_STATUS = {
  PENDING: 'pending',         // Queued and waiting for script
  IN_PROGRESS: 'in_progress', // Currently being processed by script
  APPLIED: 'applied',         // Successfully applied
  FAILED: 'failed',           // Failed to apply
  ROLLED_BACK: 'rolled_back', // Successfully rolled back
  ROLLBACK_FAILED: 'rollback_failed', // Rollback attempt failed
  EXPIRED: 'expired'          // Optimization expired without processing
};

// Optimization types
const OPTIMIZATION_TYPES = {
  KEYWORD_BID: 'keyword_bid',
  KEYWORD_ADD: 'keyword_add',
  KEYWORD_REMOVE: 'keyword_remove',
  AD_CREATE: 'ad_create',
  AD_UPDATE: 'ad_update',
  AD_PAUSE: 'ad_pause',
  BUDGET_ADJUST: 'budget_adjust',
  BID_STRATEGY: 'bid_strategy',
  NEGATIVE_KEYWORD: 'negative_keyword',
  AUDIENCE_ADD: 'audience_add',
  AUDIENCE_REMOVE: 'audience_remove',
  CAMPAIGN_CREATE: 'campaign_create',
  CAMPAIGN_UPDATE: 'campaign_update',
  CAMPAIGN_PAUSE: 'campaign_pause',
  EXTENSION_ADD: 'extension_add',
  EXTENSION_UPDATE: 'extension_update'
};

class OptimizationQueueService {
  constructor() {
    this.queue = new Map(); // tenant_id -> optimization queue
    this.history = new Map(); // tenant_id -> optimization history
    this.rollbackStack = new Map(); // tenant_id -> rollback stack
    this.processingStats = new Map(); // tenant_id -> processing statistics
    this.subscriptionLimits = new Map(); // tenant_id -> subscription limits

    // Queue management settings
    this.maxQueueSize = 1000;
    this.maxHistorySize = 5000;
    this.optimizationTtl = 24 * 60 * 60 * 1000; // 24 hours
    this.rollbackTtl = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Start cleanup process
    this.startCleanupProcess();

    logger.info('Optimization Queue Service initialized');
  }

  /**
   * Add optimization to queue
   * @param {string} tenantId - Tenant identifier
   * @param {Object} optimization - Optimization details
   * @returns {Promise<Object>} Queued optimization with ID
   */
  async addOptimization(tenantId, optimization) {
    try {
      // Validate tenant and subscription
      const validationResult = await this.validateTenantAccess(tenantId);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Validate optimization data
      const validatedOptimization = await this.validateOptimization(optimization);

      // Check queue limits
      await this.checkQueueLimits(tenantId);

      // Generate unique optimization ID
      const optimizationId = this.generateOptimizationId();

      // Create optimization entry
      const optimizationEntry = {
        id: optimizationId,
        tenantId,
        type: validatedOptimization.type,
        priority: validatedOptimization.priority || PRIORITY_LEVELS.NORMAL,
        status: OPTIMIZATION_STATUS.PENDING,
        data: validatedOptimization.data,
        metadata: {
          source: validatedOptimization.source || 'ai_automation',
          createdAt: new Date().toISOString(),
          createdBy: validatedOptimization.createdBy || 'system',
          estimatedImpact: validatedOptimization.estimatedImpact,
          confidence: validatedOptimization.confidence,
          tags: validatedOptimization.tags || []
        },
        retries: 0,
        maxRetries: this.getMaxRetries(validatedOptimization.priority),
        expiresAt: new Date(Date.now() + this.optimizationTtl).toISOString(),
        rollbackData: null
      };

      // Add to queue
      if (!this.queue.has(tenantId)) {
        this.queue.set(tenantId, []);
      }

      const tenantQueue = this.queue.get(tenantId);
      tenantQueue.push(optimizationEntry);

      // Sort queue by priority
      this.sortQueueByPriority(tenantQueue);

      // Store in persistent storage
      await this.persistOptimization(optimizationEntry);

      // Update statistics
      this.updateStats(tenantId, 'queued');

      logger.info('Optimization added to queue', {
        tenantId,
        optimizationId,
        type: optimizationEntry.type,
        priority: optimizationEntry.priority,
        queueSize: tenantQueue.length
      });

      return {
        success: true,
        optimizationId,
        queuePosition: this.getQueuePosition(tenantId, optimizationId),
        estimatedProcessingTime: this.estimateProcessingTime(tenantId, optimizationEntry.priority)
      };

    } catch (error) {
      logger.error('Failed to add optimization to queue', {
        tenantId,
        error: error.message,
        optimization: optimization?.type
      });

      throw new Error(`Failed to queue optimization: ${error.message}`);
    }
  }

  /**
   * Get pending optimizations for script processing
   * @param {string} tenantId - Tenant identifier
   * @param {number} limit - Maximum number of optimizations to return
   * @param {string} priority - Minimum priority level
   * @returns {Promise<Array>} Pending optimizations
   */
  async getPendingOptimizations(tenantId, limit = 10, priority = null) {
    try {
      // Validate tenant access
      const validationResult = await this.validateTenantAccess(tenantId);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Get tenant queue
      const tenantQueue = this.queue.get(tenantId) || [];

      // Filter optimizations
      let pendingOptimizations = tenantQueue.filter(opt => {
        if (opt.status !== OPTIMIZATION_STATUS.PENDING) return false;
        if (new Date(opt.expiresAt) < new Date()) return false;
        if (priority && !this.isPriorityHigherOrEqual(opt.priority, priority)) return false;
        return true;
      });

      // Sort by priority and creation time
      pendingOptimizations.sort((a, b) => {
        const priorityDiff = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.metadata.createdAt) - new Date(b.metadata.createdAt);
      });

      // Apply limit
      pendingOptimizations = pendingOptimizations.slice(0, limit);

      // Mark as in progress
      const now = new Date().toISOString();
      for (const optimization of pendingOptimizations) {
        optimization.status = OPTIMIZATION_STATUS.IN_PROGRESS;
        optimization.processingStartedAt = now;
        await this.updateOptimizationStatus(optimization.id, OPTIMIZATION_STATUS.IN_PROGRESS, {
          processingStartedAt: now
        });
      }

      logger.info('Retrieved pending optimizations', {
        tenantId,
        count: pendingOptimizations.length,
        limit,
        priority,
        queueSize: tenantQueue.length
      });

      return pendingOptimizations;

    } catch (error) {
      logger.error('Failed to get pending optimizations', {
        tenantId,
        error: error.message
      });

      throw new Error(`Failed to get pending optimizations: ${error.message}`);
    }
  }

  /**
   * Update optimization status and results
   * @param {string} optimizationId - Optimization ID
   * @param {string} status - New status
   * @param {Object} results - Processing results
   * @returns {Promise<boolean>} Success status
   */
  async updateOptimizationStatus(optimizationId, status, results = {}) {
    try {
      const optimization = await this.findOptimization(optimizationId);
      if (!optimization) {
        throw new Error('Optimization not found');
      }

      const previousStatus = optimization.status;
      optimization.status = status;
      optimization.lastUpdatedAt = new Date().toISOString();

      // Handle status-specific updates
      switch (status) {
        case OPTIMIZATION_STATUS.APPLIED:
          optimization.appliedAt = new Date().toISOString();
          optimization.results = results;

          // Store rollback data if provided
          if (results.rollbackData) {
            optimization.rollbackData = results.rollbackData;
            this.addToRollbackStack(optimization.tenantId, optimization);
          }

          this.updateStats(optimization.tenantId, 'applied');
          break;

        case OPTIMIZATION_STATUS.FAILED:
          optimization.failedAt = new Date().toISOString();
          optimization.error = results.error;
          optimization.retries = (optimization.retries || 0) + 1;

          // Check if should retry
          if (optimization.retries < optimization.maxRetries) {
            optimization.status = OPTIMIZATION_STATUS.PENDING;
            optimization.nextRetryAt = new Date(Date.now() + this.getRetryDelay(optimization.retries)).toISOString();
          }

          this.updateStats(optimization.tenantId, 'failed');
          break;

        case OPTIMIZATION_STATUS.ROLLED_BACK:
          optimization.rolledBackAt = new Date().toISOString();
          optimization.rollbackResults = results;
          this.updateStats(optimization.tenantId, 'rolled_back');
          break;

        case OPTIMIZATION_STATUS.EXPIRED:
          optimization.expiredAt = new Date().toISOString();
          this.updateStats(optimization.tenantId, 'expired');
          break;
      }

      // Move to history if final status
      if (this.isFinalStatus(status)) {
        await this.moveToHistory(optimization);
      }

      // Persist changes
      await this.persistOptimization(optimization);

      logger.info('Optimization status updated', {
        optimizationId,
        tenantId: optimization.tenantId,
        previousStatus,
        newStatus: status,
        retries: optimization.retries
      });

      return true;

    } catch (error) {
      logger.error('Failed to update optimization status', {
        optimizationId,
        status,
        error: error.message
      });

      return false;
    }
  }

  /**
   * Get optimization history for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Optimization history
   */
  async getOptimizationHistory(tenantId, filters = {}) {
    try {
      const validationResult = await this.validateTenantAccess(tenantId);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Get history from storage
      const history = await dataStore.getOptimizationHistory(tenantId, filters);

      // Apply additional filtering if needed
      let filteredHistory = history;

      if (filters.type) {
        filteredHistory = filteredHistory.filter(opt => opt.type === filters.type);
      }

      if (filters.status) {
        filteredHistory = filteredHistory.filter(opt => opt.status === filters.status);
      }

      if (filters.dateFrom) {
        filteredHistory = filteredHistory.filter(opt =>
          new Date(opt.metadata.createdAt) >= new Date(filters.dateFrom)
        );
      }

      if (filters.dateTo) {
        filteredHistory = filteredHistory.filter(opt =>
          new Date(opt.metadata.createdAt) <= new Date(filters.dateTo)
        );
      }

      // Sort by creation date (newest first)
      filteredHistory.sort((a, b) =>
        new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt)
      );

      // Apply pagination
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100);
      const startIndex = (page - 1) * limit;
      const paginatedHistory = filteredHistory.slice(startIndex, startIndex + limit);

      return {
        optimizations: paginatedHistory,
        total: filteredHistory.length,
        page,
        limit,
        hasMore: startIndex + limit < filteredHistory.length
      };

    } catch (error) {
      logger.error('Failed to get optimization history', {
        tenantId,
        error: error.message
      });

      throw new Error(`Failed to get optimization history: ${error.message}`);
    }
  }

  /**
   * Get rollback candidates for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {number} limit - Maximum number of candidates
   * @returns {Promise<Array>} Rollback candidates
   */
  async getRollbackCandidates(tenantId, limit = 20) {
    try {
      const validationResult = await this.validateTenantAccess(tenantId);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      const rollbackStack = this.rollbackStack.get(tenantId) || [];

      // Filter valid rollback candidates
      const candidates = rollbackStack.filter(opt => {
        return (
          opt.status === OPTIMIZATION_STATUS.APPLIED &&
          opt.rollbackData &&
          new Date(opt.appliedAt) > new Date(Date.now() - this.rollbackTtl)
        );
      });

      // Sort by application time (newest first)
      candidates.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

      return candidates.slice(0, limit);

    } catch (error) {
      logger.error('Failed to get rollback candidates', {
        tenantId,
        error: error.message
      });

      throw new Error(`Failed to get rollback candidates: ${error.message}`);
    }
  }

  /**
   * Queue optimization rollback
   * @param {string} tenantId - Tenant identifier
   * @param {string} optimizationId - Original optimization ID
   * @param {string} reason - Rollback reason
   * @returns {Promise<Object>} Rollback optimization
   */
  async queueRollback(tenantId, optimizationId, reason) {
    try {
      const originalOptimization = await this.findOptimization(optimizationId);
      if (!originalOptimization) {
        throw new Error('Original optimization not found');
      }

      if (!originalOptimization.rollbackData) {
        throw new Error('No rollback data available');
      }

      // Create rollback optimization
      const rollbackOptimization = {
        type: `${originalOptimization.type}_rollback`,
        priority: PRIORITY_LEVELS.HIGH,
        data: originalOptimization.rollbackData,
        source: 'rollback_system',
        createdBy: 'system',
        tags: ['rollback'],
        metadata: {
          originalOptimizationId: optimizationId,
          rollbackReason: reason
        }
      };

      const result = await this.addOptimization(tenantId, rollbackOptimization);

      logger.info('Rollback queued', {
        tenantId,
        originalOptimizationId: optimizationId,
        rollbackOptimizationId: result.optimizationId,
        reason
      });

      return result;

    } catch (error) {
      logger.error('Failed to queue rollback', {
        tenantId,
        optimizationId,
        error: error.message
      });

      throw new Error(`Failed to queue rollback: ${error.message}`);
    }
  }

  /**
   * Get queue statistics for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats(tenantId) {
    try {
      const tenantQueue = this.queue.get(tenantId) || [];
      const processingStats = this.processingStats.get(tenantId) || this.initializeStats();

      const stats = {
        queue: {
          total: tenantQueue.length,
          pending: tenantQueue.filter(opt => opt.status === OPTIMIZATION_STATUS.PENDING).length,
          inProgress: tenantQueue.filter(opt => opt.status === OPTIMIZATION_STATUS.IN_PROGRESS).length,
          byPriority: this.getQueueStatsByPriority(tenantQueue)
        },
        processing: {
          ...processingStats,
          averageProcessingTime: this.calculateAverageProcessingTime(tenantId),
          successRate: this.calculateSuccessRate(processingStats)
        },
        rollback: {
          available: (this.rollbackStack.get(tenantId) || []).length,
          executed: processingStats.rolled_back || 0
        }
      };

      return stats;

    } catch (error) {
      logger.error('Failed to get queue stats', {
        tenantId,
        error: error.message
      });

      return null;
    }
  }

  // Private helper methods

  async validateTenantAccess(tenantId) {
    try {
      const tenant = await tenantRegistry.getTenant(tenantId);
      if (!tenant || tenant.status !== 'active') {
        return { valid: false, error: 'Tenant not found or inactive' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Tenant validation failed' };
    }
  }

  async validateOptimization(optimization) {
    if (!optimization || typeof optimization !== 'object') {
      throw new Error('Invalid optimization data');
    }

    if (!optimization.type || !Object.values(OPTIMIZATION_TYPES).includes(optimization.type)) {
      throw new Error('Invalid optimization type');
    }

    if (!optimization.data) {
      throw new Error('Optimization data is required');
    }

    if (optimization.priority && !Object.values(PRIORITY_LEVELS).includes(optimization.priority)) {
      throw new Error('Invalid priority level');
    }

    return optimization;
  }

  async checkQueueLimits(tenantId) {
    const tenantQueue = this.queue.get(tenantId) || [];

    if (tenantQueue.length >= this.maxQueueSize) {
      throw new Error('Queue size limit exceeded');
    }

    // Check subscription-based limits
    const subscription = await getCurrentSubscription({ user: { tenant_id: tenantId } });
    if (subscription && subscription.optimization_limit) {
      const pendingCount = tenantQueue.filter(opt =>
        opt.status === OPTIMIZATION_STATUS.PENDING
      ).length;

      if (pendingCount >= subscription.optimization_limit) {
        throw new Error('Subscription optimization limit exceeded');
      }
    }
  }

  generateOptimizationId() {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMaxRetries(priority) {
    switch (priority) {
      case PRIORITY_LEVELS.CRITICAL: return 5;
      case PRIORITY_LEVELS.HIGH: return 3;
      case PRIORITY_LEVELS.NORMAL: return 2;
      case PRIORITY_LEVELS.LOW: return 1;
      default: return 2;
    }
  }

  sortQueueByPriority(queue) {
    queue.sort((a, b) => {
      const priorityDiff = this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.metadata.createdAt) - new Date(b.metadata.createdAt);
    });
  }

  getPriorityWeight(priority) {
    switch (priority) {
      case PRIORITY_LEVELS.CRITICAL: return 4;
      case PRIORITY_LEVELS.HIGH: return 3;
      case PRIORITY_LEVELS.NORMAL: return 2;
      case PRIORITY_LEVELS.LOW: return 1;
      default: return 2;
    }
  }

  isPriorityHigherOrEqual(priority1, priority2) {
    return this.getPriorityWeight(priority1) >= this.getPriorityWeight(priority2);
  }

  getRetryDelay(retryCount) {
    // Exponential backoff: 1min, 2min, 4min, 8min, 16min
    return Math.min(60000 * Math.pow(2, retryCount), 16 * 60000);
  }

  isFinalStatus(status) {
    return [
      OPTIMIZATION_STATUS.APPLIED,
      OPTIMIZATION_STATUS.FAILED,
      OPTIMIZATION_STATUS.ROLLED_BACK,
      OPTIMIZATION_STATUS.ROLLBACK_FAILED,
      OPTIMIZATION_STATUS.EXPIRED
    ].includes(status);
  }

  async findOptimization(optimizationId) {
    // Search in all tenant queues
    for (const [tenantId, tenantQueue] of this.queue.entries()) {
      const optimization = tenantQueue.find(opt => opt.id === optimizationId);
      if (optimization) return optimization;
    }

    // Search in history if not found in queue
    return await dataStore.getOptimizationById(optimizationId);
  }

  async moveToHistory(optimization) {
    // Remove from queue
    const tenantQueue = this.queue.get(optimization.tenantId);
    if (tenantQueue) {
      const index = tenantQueue.findIndex(opt => opt.id === optimization.id);
      if (index !== -1) {
        tenantQueue.splice(index, 1);
      }
    }

    // Add to history
    if (!this.history.has(optimization.tenantId)) {
      this.history.set(optimization.tenantId, []);
    }

    const tenantHistory = this.history.get(optimization.tenantId);
    tenantHistory.unshift(optimization);

    // Limit history size
    if (tenantHistory.length > this.maxHistorySize) {
      tenantHistory.splice(this.maxHistorySize);
    }
  }

  addToRollbackStack(tenantId, optimization) {
    if (!this.rollbackStack.has(tenantId)) {
      this.rollbackStack.set(tenantId, []);
    }

    const stack = this.rollbackStack.get(tenantId);
    stack.unshift(optimization);

    // Limit stack size (keep last 100 rollback candidates)
    if (stack.length > 100) {
      stack.splice(100);
    }
  }

  async persistOptimization(optimization) {
    try {
      await dataStore.storeOptimization(optimization);
    } catch (error) {
      logger.error('Failed to persist optimization', {
        optimizationId: optimization.id,
        error: error.message
      });
    }
  }

  updateStats(tenantId, operation) {
    if (!this.processingStats.has(tenantId)) {
      this.processingStats.set(tenantId, this.initializeStats());
    }

    const stats = this.processingStats.get(tenantId);
    stats[operation] = (stats[operation] || 0) + 1;
    stats.lastUpdated = new Date().toISOString();
  }

  initializeStats() {
    return {
      queued: 0,
      applied: 0,
      failed: 0,
      rolled_back: 0,
      expired: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  calculateSuccessRate(stats) {
    const total = stats.applied + stats.failed;
    return total > 0 ? (stats.applied / total) * 100 : 0;
  }

  getQueuePosition(tenantId, optimizationId) {
    const tenantQueue = this.queue.get(tenantId) || [];
    return tenantQueue.findIndex(opt => opt.id === optimizationId) + 1;
  }

  estimateProcessingTime(tenantId, priority, optimizationId = null) {
    const tenantQueue = this.queue.get(tenantId) || [];
    let position = 1;

    if (optimizationId) {
      position = this.getQueuePosition(tenantId, optimizationId);
    } else {
      // Estimate for new optimization
      position = tenantQueue.length + 1;
    }

    // Estimate based on priority and queue position
    const baseTime = this.getPriorityWeight(priority) * 30; // 30 seconds per priority level
    const queueDelay = position * 60; // 1 minute per position

    return baseTime + queueDelay;
  }

  getQueueStatsByPriority(queue) {
    const stats = {};

    for (const level of Object.values(PRIORITY_LEVELS)) {
      stats[level] = queue.filter(opt => opt.priority === level).length;
    }

    return stats;
  }

  calculateAverageProcessingTime(tenantId) {
    // This would typically be calculated from historical data
    // For now, return a default estimate
    return 120; // 2 minutes average
  }

  startCleanupProcess() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredOptimizations();
    }, 60 * 60 * 1000);
  }

  cleanupExpiredOptimizations() {
    let cleaned = 0;
    const now = new Date();

    for (const [tenantId, tenantQueue] of this.queue.entries()) {
      for (let i = tenantQueue.length - 1; i >= 0; i--) {
        const optimization = tenantQueue[i];

        if (new Date(optimization.expiresAt) < now) {
          optimization.status = OPTIMIZATION_STATUS.EXPIRED;
          this.moveToHistory(optimization);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up expired optimizations', { count: cleaned });
    }
  }
}

// Export singleton instance
const optimizationQueueService = new OptimizationQueueService();
export default optimizationQueueService;

// Named exports
export {
  optimizationQueueService as OptimizationQueueService,
  PRIORITY_LEVELS,
  OPTIMIZATION_STATUS,
  OPTIMIZATION_TYPES
};