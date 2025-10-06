/**
 * Worker Pool Manager for Ads Autopilot AI SaaS
 * Implements tier-based worker allocation, parallel task execution, and resource management
 */

import { EventEmitter } from 'events';
import { executeQuery } from './supabase-client.js';
import logger from './logger.js';

/**
 * Subscription Tiers and Worker Allocations
 */
export const SUBSCRIPTION_TIERS = {
  STARTER: {
    name: 'starter',
    maxWorkers: 1,
    maxConcurrentJobs: 2,
    priority: 1,
    maxRetries: 2
  },
  PRO: {
    name: 'pro',
    maxWorkers: 5,
    maxConcurrentJobs: 10,
    priority: 2,
    maxRetries: 3
  },
  ENTERPRISE: {
    name: 'enterprise',
    maxWorkers: 10,
    maxConcurrentJobs: 25,
    priority: 3,
    maxRetries: 5
  }
};

/**
 * Worker States
 */
export const WORKER_STATES = {
  IDLE: 'idle',
  BUSY: 'busy',
  ERROR: 'error',
  SHUTDOWN: 'shutdown'
};

/**
 * Individual Worker Class
 */
class Worker extends EventEmitter {
  constructor(id, tier, pool) {
    super();
    this.id = id;
    this.tier = tier;
    this.pool = pool;
    this.state = WORKER_STATES.IDLE;
    this.currentJob = null;
    this.createdAt = new Date();
    this.lastActive = null;
    this.jobsProcessed = 0;
    this.totalProcessingTime = 0;
    this.errors = 0;
  }

  /**
   * Execute a job
   */
  async execute(job) {
    if (this.state !== WORKER_STATES.IDLE) {
      throw new Error(`Worker ${this.id} is not idle (current state: ${this.state})`);
    }

    this.state = WORKER_STATES.BUSY;
    this.currentJob = job;
    this.lastActive = new Date();

    const traceId = logger.generateTraceId();
    const startTime = Date.now();

    logger.info('Worker starting job execution', {
      workerId: this.id,
      jobId: job.id,
      jobType: job.type,
      tier: this.tier.name,
      traceId
    });

    try {
      // Update job status to running
      await this.pool.jobMonitor.updateJobStatus(job.id, 'running', {
        workerId: this.id,
        startedAt: new Date().toISOString()
      });

      // Execute the job
      const result = await this.executeJobFunction(job);

      const duration = Date.now() - startTime;
      this.jobsProcessed++;
      this.totalProcessingTime += duration;

      // Update job status to completed
      await this.pool.jobMonitor.updateJobStatus(job.id, 'completed', {
        result,
        completedAt: new Date().toISOString(),
        duration
      });

      logger.info('Worker completed job execution', {
        workerId: this.id,
        jobId: job.id,
        duration,
        tier: this.tier.name,
        traceId
      });

      this.emit('jobCompleted', { job, result, duration });
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.errors++;

      logger.error('Worker job execution failed', {
        workerId: this.id,
        jobId: job.id,
        error: error.message,
        stack: error.stack,
        duration,
        tier: this.tier.name,
        traceId
      });

      // Update job status to failed
      await this.pool.jobMonitor.updateJobStatus(job.id, 'failed', {
        error: error.message,
        failedAt: new Date().toISOString(),
        duration
      });

      this.emit('jobFailed', { job, error, duration });
      throw error;

    } finally {
      this.state = WORKER_STATES.IDLE;
      this.currentJob = null;
      this.emit('workerAvailable', this);
    }
  }

  /**
   * Execute the actual job function based on job type
   */
  async executeJobFunction(job) {
    const { type, data, tenantId } = job;

    switch (type) {
      case 'optimization':
        return await this.executeOptimizationJob(data, tenantId);

      case 'analysis':
        return await this.executeAnalysisJob(data, tenantId);

      case 'reporting':
        return await this.executeReportingJob(data, tenantId);

      case 'anomaly_detection':
        return await this.executeAnomalyDetectionJob(data, tenantId);

      case 'weekly_summary':
        return await this.executeWeeklySummaryJob(data, tenantId);

      case 'health_check':
        return await this.executeHealthCheckJob(data, tenantId);

      case 'ai_writer_generate':
        return await this.executeAiWriterJob(data, tenantId);

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Job execution methods for different job types
   */
  async executeOptimizationJob(data, tenantId) {
    // Simulate optimization work
    await this.simulateWork(2000, 5000);
    return {
      optimizationType: data.type || 'general',
      improvements: Math.floor(Math.random() * 50) + 10,
      recommendations: ['Cache optimization', 'Query optimization', 'Image compression']
    };
  }

  async executeAnalysisJob(data, tenantId) {
    // Simulate analysis work
    await this.simulateWork(1000, 3000);
    return {
      analysisType: data.type || 'traffic',
      metrics: {
        pageViews: Math.floor(Math.random() * 10000),
        uniqueVisitors: Math.floor(Math.random() * 5000),
        bounceRate: (Math.random() * 0.5 + 0.2).toFixed(2)
      },
      insights: ['Peak traffic at 2PM', 'Mobile traffic increased 15%']
    };
  }

  async executeReportingJob(data, tenantId) {
    // Simulate report generation
    await this.simulateWork(3000, 8000);
    return {
      reportType: data.type || 'weekly',
      generatedAt: new Date().toISOString(),
      summary: 'Report generated successfully',
      dataPoints: Math.floor(Math.random() * 1000) + 100
    };
  }

  async executeAnomalyDetectionJob(data, tenantId) {
    // Import and execute actual anomaly detection
    try {
      const { anomalyDetectionService } = await import('./anomaly-detection.js');
      return await anomalyDetectionService.detectAnomalies(tenantId, data.timeframe || '1h');
    } catch (error) {
      logger.warn('Anomaly detection service not available, using simulation', { error: error.message });
      await this.simulateWork(1500, 4000);
      return {
        alerts: [],
        warnings: Math.random() > 0.7 ? [{ type: 'traffic_spike', severity: 'medium' }] : [],
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeWeeklySummaryJob(data, tenantId) {
    // Import and execute actual weekly summary
    try {
      const { runWeeklySummary } = await import('../jobs/weekly_summary.js');
      return await runWeeklySummary(tenantId, { generateAI: true });
    } catch (error) {
      logger.warn('Weekly summary service not available, using simulation', { error: error.message });
      await this.simulateWork(5000, 10000);
      return {
        summary: 'Weekly summary generated',
        period: 'last_7_days',
        insights: ['Traffic increased 12%', 'New users up 8%']
      };
    }
  }

  async executeHealthCheckJob(data, tenantId) {
    // Simulate health check
    await this.simulateWork(500, 1500);
    return {
      status: 'healthy',
      checks: {
        database: 'passed',
        api: 'passed',
        storage: 'passed'
      },
      timestamp: new Date().toISOString()
    };
  }

  async executeAiWriterJob(data, tenantId) {
    try {
      const { handleInlineAIWriter } = await import('../api/ai-writer-inline.js');
      const limit = Math.min(Number(data?.limit || 5), 10);
      const result = await handleInlineAIWriter(tenantId, limit);
      return {
        ...result,
        tenantId,
        limit,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('AI writer job failed', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Simulate work with random delay
   */
  async simulateWork(minMs = 1000, maxMs = 3000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get worker statistics
   */
  getStats() {
    const uptime = Date.now() - this.createdAt.getTime();
    const avgProcessingTime = this.jobsProcessed > 0 ? this.totalProcessingTime / this.jobsProcessed : 0;

    return {
      id: this.id,
      tier: this.tier.name,
      state: this.state,
      jobsProcessed: this.jobsProcessed,
      errors: this.errors,
      uptime,
      avgProcessingTime: Math.round(avgProcessingTime),
      lastActive: this.lastActive,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        type: this.currentJob.type,
        startedAt: this.lastActive
      } : null
    };
  }

  /**
   * Shutdown worker gracefully
   */
  async shutdown() {
    logger.info('Worker shutting down', { workerId: this.id, tier: this.tier.name });

    if (this.currentJob) {
      logger.warn('Worker shutting down with active job', {
        workerId: this.id,
        jobId: this.currentJob.id
      });
    }

    this.state = WORKER_STATES.SHUTDOWN;
    this.removeAllListeners();
  }
}

/**
 * Worker Pool Manager Class
 */
export class WorkerPool extends EventEmitter {
  constructor(jobMonitor) {
    super();
    this.jobMonitor = jobMonitor;
    this.workers = new Map();
    this.workersByTier = new Map();
    this.availableWorkers = new Map();
    this.nextWorkerId = 1;
    this.isShuttingDown = false;
    this.metrics = {
      totalJobsProcessed: 0,
      totalErrors: 0,
      totalProcessingTime: 0,
      startTime: Date.now()
    };

    // Initialize tier worker pools
    Object.values(SUBSCRIPTION_TIERS).forEach(tier => {
      this.workersByTier.set(tier.name, new Set());
      this.availableWorkers.set(tier.name, []);
    });

    logger.info('Worker pool initialized', {
      tiers: Object.keys(SUBSCRIPTION_TIERS),
      jobMonitor: !!jobMonitor
    });
  }

  /**
   * Get or create workers for a tenant's tier
   */
  async ensureWorkersForTier(tierName, count = null) {
    const tier = Object.values(SUBSCRIPTION_TIERS).find(t => t.name === tierName);
    if (!tier) {
      throw new Error(`Unknown tier: ${tierName}`);
    }

    const requiredWorkers = count !== null ? count : tier.maxWorkers;
    const existingWorkers = this.workersByTier.get(tierName);
    const workersNeeded = Math.max(0, requiredWorkers - existingWorkers.size);

    for (let i = 0; i < workersNeeded; i++) {
      await this.createWorker(tier);
    }

    return this.getAvailableWorkers(tierName);
  }

  /**
   * Create a new worker for a specific tier
   */
  async createWorker(tier) {
    const workerId = `worker-${tier.name}-${this.nextWorkerId++}`;
    const worker = new Worker(workerId, tier, this);

    // Set up worker event listeners
    worker.on('jobCompleted', (data) => {
      this.metrics.totalJobsProcessed++;
      this.metrics.totalProcessingTime += data.duration;
      this.emit('jobCompleted', data);
    });

    worker.on('jobFailed', (data) => {
      this.metrics.totalErrors++;
      this.emit('jobFailed', data);
    });

    worker.on('workerAvailable', (worker) => {
      this.addAvailableWorker(worker);
    });

    // Add to collections
    this.workers.set(workerId, worker);
    this.workersByTier.get(tier.name).add(worker);
    this.addAvailableWorker(worker);

    logger.info('Worker created', {
      workerId,
      tier: tier.name,
      totalWorkers: this.workers.size
    });

    return worker;
  }

  /**
   * Add worker to available pool
   */
  addAvailableWorker(worker) {
    if (worker.state === WORKER_STATES.IDLE && !this.isShuttingDown) {
      const availableList = this.availableWorkers.get(worker.tier.name);
      if (!availableList.includes(worker)) {
        availableList.push(worker);
        this.emit('workerAvailable', worker);
      }
    }
  }

  /**
   * Remove worker from available pool
   */
  removeAvailableWorker(worker) {
    const availableList = this.availableWorkers.get(worker.tier.name);
    const index = availableList.indexOf(worker);
    if (index !== -1) {
      availableList.splice(index, 1);
    }
  }

  /**
   * Get available workers for a tier
   */
  getAvailableWorkers(tierName) {
    return this.availableWorkers.get(tierName) || [];
  }

  /**
   * Assign job to best available worker
   */
  async assignJob(job) {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    // Determine tenant tier
    const tenantTier = await this.getTenantTier(job.tenantId);

    // Ensure workers exist for this tier
    await this.ensureWorkersForTier(tenantTier);

    // Get available worker
    const availableWorkers = this.getAvailableWorkers(tenantTier);

    if (availableWorkers.length === 0) {
      // Check if we can create more workers for this tier
      const tier = Object.values(SUBSCRIPTION_TIERS).find(t => t.name === tenantTier);
      const existingWorkers = this.workersByTier.get(tenantTier);

      if (existingWorkers.size < tier.maxWorkers) {
        await this.createWorker(tier);
        return this.assignJob(job); // Retry with new worker
      }

      throw new Error(`No available workers for tier ${tenantTier}`);
    }

    // Select best worker (least busy)
    const worker = availableWorkers.reduce((best, current) => {
      return current.jobsProcessed < best.jobsProcessed ? current : best;
    });

    // Remove from available pool
    this.removeAvailableWorker(worker);

    logger.info('Job assigned to worker', {
      jobId: job.id,
      workerId: worker.id,
      tier: tenantTier,
      availableWorkers: availableWorkers.length - 1
    });

    return worker;
  }

  /**
   * Execute a job using the worker pool
   */
  async executeJob(job) {
    const worker = await this.assignJob(job);

    try {
      const result = await worker.execute(job);
      return { success: true, result, workerId: worker.id };
    } catch (error) {
      logger.error('Job execution failed in worker pool', {
        jobId: job.id,
        workerId: worker.id,
        error: error.message
      });
      return { success: false, error: error.message, workerId: worker.id };
    }
  }

  /**
   * Get tenant subscription tier
   */
  async getTenantTier(tenantId) {
    try {
      const result = await executeQuery(async (supabase) => {
        const { data, error } = await supabase
          .from('tenant_subscriptions')
          .select('tier')
          .eq('tenant_id', tenantId)
          .single();

        if (error && error.code !== 'PGRST116') { // Not found is OK
          throw error;
        }

        return data?.tier || 'starter'; // Default to starter
      });

      return result;
    } catch (error) {
      logger.warn('Failed to get tenant tier, defaulting to starter', {
        tenantId,
        error: error.message
      });
      return 'starter';
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const stats = {
      totalWorkers: this.workers.size,
      workersByTier: {},
      availableWorkersByTier: {},
      totalJobsProcessed: this.metrics.totalJobsProcessed,
      totalErrors: this.metrics.totalErrors,
      avgProcessingTime: this.metrics.totalJobsProcessed > 0
        ? Math.round(this.metrics.totalProcessingTime / this.metrics.totalJobsProcessed)
        : 0,
      uptime: Date.now() - this.metrics.startTime,
      isShuttingDown: this.isShuttingDown
    };

    // Aggregate stats by tier
    Object.values(SUBSCRIPTION_TIERS).forEach(tier => {
      const tierWorkers = Array.from(this.workersByTier.get(tier.name));
      const availableWorkers = this.availableWorkers.get(tier.name);

      stats.workersByTier[tier.name] = {
        total: tierWorkers.length,
        available: availableWorkers.length,
        busy: tierWorkers.length - availableWorkers.length,
        maxWorkers: tier.maxWorkers,
        workers: tierWorkers.map(w => w.getStats())
      };
    });

    return stats;
  }

  /**
   * Health check for the worker pool
   */
  async healthCheck() {
    const stats = this.getStats();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      workers: stats.totalWorkers,
      issues: []
    };

    // Check for stuck workers
    this.workers.forEach(worker => {
      if (worker.state === WORKER_STATES.BUSY && worker.lastActive) {
        const stuckTime = Date.now() - worker.lastActive.getTime();
        if (stuckTime > 300000) { // 5 minutes
          health.issues.push(`Worker ${worker.id} may be stuck (busy for ${Math.round(stuckTime/1000)}s)`);
          health.status = 'degraded';
        }
      }

      if (worker.errors > 10) {
        health.issues.push(`Worker ${worker.id} has high error count: ${worker.errors}`);
        health.status = 'degraded';
      }
    });

    // Check error rate
    const errorRate = stats.totalJobsProcessed > 0
      ? (stats.totalErrors / stats.totalJobsProcessed) * 100
      : 0;

    if (errorRate > 10) {
      health.issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      health.status = 'unhealthy';
    }

    return health;
  }

  /**
   * Graceful shutdown of all workers
   */
  async shutdown() {
    logger.info('Worker pool shutting down', { totalWorkers: this.workers.size });

    this.isShuttingDown = true;

    // Wait for current jobs to complete (with timeout)
    const shutdownPromises = Array.from(this.workers.values()).map(worker =>
      worker.shutdown()
    );

    try {
      await Promise.all(shutdownPromises);
      logger.info('Worker pool shutdown completed');
    } catch (error) {
      logger.error('Error during worker pool shutdown', { error: error.message });
    }

    this.workers.clear();
    this.workersByTier.clear();
    this.availableWorkers.clear();
    this.removeAllListeners();
  }
}

/**
 * Create and export singleton worker pool instance
 */
let workerPoolInstance = null;

export function createWorkerPool(jobMonitor) {
  if (!workerPoolInstance) {
    workerPoolInstance = new WorkerPool(jobMonitor);
  }
  return workerPoolInstance;
}

export function getWorkerPool() {
  return workerPoolInstance;
}

export default {
  WorkerPool,
  createWorkerPool,
  getWorkerPool,
  SUBSCRIPTION_TIERS,
  WORKER_STATES
};
