/**
 * Queue Manager for Ads Autopilot AI SaaS
 * Implements priority queues, job persistence, retry logic, and dead letter queue
 */

import { EventEmitter } from 'events';
import { executeQuery } from './supabase-client.js';
import logger from './logger.js';
import { SUBSCRIPTION_TIERS } from './worker-pool.js';

/**
 * Job States
 */
export const JOB_STATES = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
  DEAD: 'dead'
};

/**
 * Job Priority Levels
 */
export const JOB_PRIORITIES = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5
};

/**
 * Job Types
 */
export const JOB_TYPES = {
  OPTIMIZATION: 'optimization',
  ANALYSIS: 'analysis',
  REPORTING: 'reporting',
  ANOMALY_DETECTION: 'anomaly_detection',
  WEEKLY_SUMMARY: 'weekly_summary',
  HEALTH_CHECK: 'health_check',
  DATA_EXPORT: 'data_export',
  BACKUP: 'backup'
};

/**
 * Priority Queue Implementation
 */
class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  parent(index) {
    return Math.floor((index - 1) / 2);
  }

  leftChild(index) {
    return 2 * index + 1;
  }

  rightChild(index) {
    return 2 * index + 2;
  }

  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  compare(a, b) {
    // Higher priority first, then earlier created_at
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return new Date(a.created_at) - new Date(b.created_at);
  }

  enqueue(job) {
    this.heap.push(job);
    this.heapifyUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.isEmpty()) return null;

    const job = this.heap[0];
    const last = this.heap.pop();

    if (!this.isEmpty()) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }

    return job;
  }

  heapifyUp(index) {
    while (index > 0) {
      const parentIndex = this.parent(index);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  heapifyDown(index) {
    while (this.leftChild(index) < this.heap.length) {
      let smallestChild = this.leftChild(index);

      if (
        this.rightChild(index) < this.heap.length &&
        this.compare(this.heap[this.rightChild(index)], this.heap[smallestChild]) < 0
      ) {
        smallestChild = this.rightChild(index);
      }

      if (this.compare(this.heap[index], this.heap[smallestChild]) <= 0) break;

      this.swap(index, smallestChild);
      index = smallestChild;
    }
  }

  peek() {
    return this.heap[0] || null;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  clear() {
    this.heap = [];
  }

  toArray() {
    return [...this.heap];
  }
}

/**
 * Queue Manager Class
 */
export class QueueManager extends EventEmitter {
  constructor() {
    super();

    // Priority queues for each tier
    this.queues = new Map();
    Object.values(SUBSCRIPTION_TIERS).forEach(tier => {
      this.queues.set(tier.name, new PriorityQueue());
    });

    // Dead letter queue for failed jobs
    this.deadLetterQueue = new PriorityQueue();

    // Processing state
    this.isProcessing = false;
    this.processingInterval = null;
    this.processingIntervalMs = 1000; // Check for jobs every second

    // Metrics
    this.metrics = {
      totalJobsQueued: 0,
      totalJobsProcessed: 0,
      totalJobsFailed: 0,
      totalJobsRetried: 0,
      totalJobsDead: 0,
      queueSizes: {},
      startTime: Date.now()
    };

    // Retry configuration
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 300000, // 5 minutes
      backoffMultiplier: 2
    };

    logger.info('Queue manager initialized', {
      tiers: Array.from(this.queues.keys()),
      processingInterval: this.processingIntervalMs
    });

    // Ensure database tables exist
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for job persistence
   */
  async initializeDatabase() {
    try {
      await executeQuery(async (supabase) => {
        // Create jobs table if it doesn't exist
        const { error } = await supabase.rpc('create_jobs_table_if_not_exists');
        if (error && !error.message.includes('already exists')) {
          throw error;
        }
      });

      logger.info('Database tables initialized for queue manager');
    } catch (error) {
      logger.error('Failed to initialize database tables', { error: error.message });
    }
  }

  /**
   * Add a job to the queue
   */
  async addJob(jobData) {
    const job = {
      id: this.generateJobId(),
      type: jobData.type,
      data: jobData.data || {},
      tenantId: jobData.tenantId,
      priority: jobData.priority || JOB_PRIORITIES.NORMAL,
      state: JOB_STATES.PENDING,
      created_at: new Date().toISOString(),
      scheduled_for: jobData.scheduledFor || new Date().toISOString(),
      dependencies: jobData.dependencies || [],
      retries: 0,
      max_retries: jobData.maxRetries || this.retryConfig.maxRetries,
      metadata: jobData.metadata || {}
    };

    // Validate job data
    this.validateJob(job);

    // Get tenant tier for queue assignment
    const tier = await this.getTenantTier(job.tenantId);

    try {
      // Persist job to database
      await this.persistJob(job);

      // Add to appropriate priority queue
      const queue = this.queues.get(tier);
      if (!queue) {
        throw new Error(`Unknown tier: ${tier}`);
      }

      job.state = JOB_STATES.QUEUED;
      queue.enqueue(job);

      // Update metrics
      this.metrics.totalJobsQueued++;
      this.updateQueueMetrics();

      logger.info('Job added to queue', {
        jobId: job.id,
        type: job.type,
        tier,
        priority: job.priority,
        queueSize: queue.size()
      });

      this.emit('jobQueued', { job, tier });

      return job;

    } catch (error) {
      logger.error('Failed to add job to queue', {
        jobId: job.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate job data
   */
  validateJob(job) {
    if (!job.type || !Object.values(JOB_TYPES).includes(job.type)) {
      throw new Error(`Invalid job type: ${job.type}`);
    }

    if (!job.tenantId) {
      throw new Error('Job must have a tenantId');
    }

    if (!Object.values(JOB_PRIORITIES).includes(job.priority)) {
      throw new Error(`Invalid job priority: ${job.priority}`);
    }

    // Check dependencies exist
    if (job.dependencies.length > 0) {
      // TODO: Validate dependencies exist and are in valid states
    }
  }

  /**
   * Get next job from queues (prioritizing by tier and priority)
   */
  async getNextJob() {
    // Process tiers in priority order (Enterprise -> Pro -> Starter)
    const tierOrder = ['enterprise', 'pro', 'starter'];

    for (const tierName of tierOrder) {
      const queue = this.queues.get(tierName);
      if (!queue.isEmpty()) {
        const job = queue.dequeue();

        // Check if job is ready to run
        if (await this.isJobReady(job)) {
          logger.debug('Retrieved job from queue', {
            jobId: job.id,
            tier: tierName,
            type: job.type,
            priority: job.priority
          });

          return { job, tier: tierName };
        } else {
          // Put job back if not ready
          queue.enqueue(job);
        }
      }
    }

    return null;
  }

  /**
   * Check if job is ready to run
   */
  async isJobReady(job) {
    // Check if scheduled time has passed
    if (new Date(job.scheduled_for) > new Date()) {
      return false;
    }

    // Check dependencies
    if (job.dependencies.length > 0) {
      const dependenciesReady = await this.checkDependencies(job.dependencies);
      if (!dependenciesReady) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if job dependencies are satisfied
   */
  async checkDependencies(dependencies) {
    try {
      const result = await executeQuery(async (supabase) => {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, state')
          .in('id', dependencies);

        if (error) throw error;

        // All dependencies must be completed
        return data.every(dep => dep.state === JOB_STATES.COMPLETED);
      });

      return result;
    } catch (error) {
      logger.error('Failed to check job dependencies', {
        dependencies,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Mark job as failed and handle retries
   */
  async handleJobFailure(jobId, error, workerId = null) {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        logger.error('Job not found for failure handling', { jobId });
        return;
      }

      job.retries = (job.retries || 0) + 1;
      job.last_error = error.message || error;
      job.failed_at = new Date().toISOString();

      if (job.retries < job.max_retries) {
        // Schedule retry with exponential backoff
        const delay = this.calculateRetryDelay(job.retries);
        job.scheduled_for = new Date(Date.now() + delay).toISOString();
        job.state = JOB_STATES.RETRYING;

        // Get tier and re-queue
        const tier = await this.getTenantTier(job.tenantId);
        this.queues.get(tier).enqueue(job);

        this.metrics.totalJobsRetried++;

        logger.info('Job scheduled for retry', {
          jobId,
          attempt: job.retries,
          maxRetries: job.max_retries,
          retryIn: delay,
          tier
        });

        this.emit('jobRetrying', { job, attempt: job.retries, delay });

      } else {
        // Move to dead letter queue
        job.state = JOB_STATES.DEAD;
        this.deadLetterQueue.enqueue(job);

        this.metrics.totalJobsDead++;

        logger.error('Job moved to dead letter queue', {
          jobId,
          retries: job.retries,
          maxRetries: job.max_retries,
          finalError: job.last_error
        });

        this.emit('jobDead', { job });
      }

      // Update job in database
      await this.updateJobInDatabase(job);

    } catch (dbError) {
      logger.error('Failed to handle job failure', {
        jobId,
        error: dbError.message
      });
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId, result = null) {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        logger.error('Job not found for completion', { jobId });
        return;
      }

      job.state = JOB_STATES.COMPLETED;
      job.completed_at = new Date().toISOString();
      job.result = result;

      await this.updateJobInDatabase(job);

      this.metrics.totalJobsProcessed++;

      logger.info('Job completed', {
        jobId,
        type: job.type,
        duration: job.completed_at && job.started_at
          ? new Date(job.completed_at) - new Date(job.started_at)
          : null
      });

      this.emit('jobCompleted', { job, result });

    } catch (error) {
      logger.error('Failed to complete job', {
        jobId,
        error: error.message
      });
    }
  }

  /**
   * Start processing jobs
   */
  startProcessing() {
    if (this.isProcessing) {
      logger.warn('Queue processing is already running');
      return;
    }

    this.isProcessing = true;

    logger.info('Starting queue processing', {
      interval: this.processingIntervalMs
    });

    // Load existing jobs from database
    this.loadPersistedJobs();

    // Start processing interval
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, this.processingIntervalMs);

    this.emit('processingStarted');
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    if (!this.isProcessing) {
      logger.warn('Queue processing is not running');
      return;
    }

    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('Stopped queue processing');
    this.emit('processingStopped');
  }

  /**
   * Process jobs from queues
   */
  async processJobs() {
    if (!this.isProcessing) return;

    try {
      const nextJob = await this.getNextJob();
      if (nextJob) {
        this.emit('jobDequeued', nextJob);
      }
    } catch (error) {
      logger.error('Error processing jobs', { error: error.message });
    }
  }

  /**
   * Load persisted jobs from database
   */
  async loadPersistedJobs() {
    try {
      const jobs = await executeQuery(async (supabase) => {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .in('state', [JOB_STATES.QUEUED, JOB_STATES.RETRYING])
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
      });

      for (const job of jobs) {
        const tier = await this.getTenantTier(job.tenantId);
        const queue = this.queues.get(tier);

        if (queue) {
          queue.enqueue(job);
        }
      }

      logger.info('Loaded persisted jobs from database', {
        count: jobs.length
      });

    } catch (error) {
      logger.error('Failed to load persisted jobs', {
        error: error.message
      });
    }
  }

  /**
   * Persist job to database
   */
  async persistJob(job) {
    return executeQuery(async (supabase) => {
      const { error } = await supabase
        .from('jobs')
        .insert([{
          id: job.id,
          type: job.type,
          tenant_id: job.tenantId,
          data: job.data,
          state: job.state,
          priority: job.priority,
          created_at: job.created_at,
          scheduled_for: job.scheduled_for,
          dependencies: job.dependencies,
          retries: job.retries,
          max_retries: job.max_retries,
          metadata: job.metadata
        }]);

      if (error) throw error;
    });
  }

  /**
   * Update job in database
   */
  async updateJobInDatabase(job) {
    return executeQuery(async (supabase) => {
      const { error } = await supabase
        .from('jobs')
        .update({
          state: job.state,
          retries: job.retries,
          scheduled_for: job.scheduled_for,
          started_at: job.started_at,
          completed_at: job.completed_at,
          failed_at: job.failed_at,
          last_error: job.last_error,
          result: job.result,
          metadata: job.metadata
        })
        .eq('id', job.id);

      if (error) throw error;
    });
  }

  /**
   * Get job by ID from database
   */
  async getJobById(jobId) {
    return executeQuery(async (supabase) => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    });
  }

  /**
   * Get tenant tier
   */
  async getTenantTier(tenantId) {
    try {
      return await executeQuery(async (supabase) => {
        const { data, error } = await supabase
          .from('tenant_subscriptions')
          .select('tier')
          .eq('tenant_id', tenantId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return data?.tier || 'starter';
      });
    } catch (error) {
      logger.warn('Failed to get tenant tier, defaulting to starter', {
        tenantId,
        error: error.message
      });
      return 'starter';
    }
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `job_${timestamp}_${random}`;
  }

  /**
   * Update queue size metrics
   */
  updateQueueMetrics() {
    this.queues.forEach((queue, tier) => {
      this.metrics.queueSizes[tier] = queue.size();
    });
    this.metrics.queueSizes.dead = this.deadLetterQueue.size();
  }

  /**
   * Get queue statistics
   */
  getStats() {
    this.updateQueueMetrics();

    return {
      isProcessing: this.isProcessing,
      metrics: {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime
      },
      queueSizes: { ...this.metrics.queueSizes },
      deadLetterQueueSize: this.deadLetterQueue.size(),
      totalQueuedJobs: Object.values(this.metrics.queueSizes).reduce((sum, size) => sum + size, 0)
    };
  }

  /**
   * Get jobs by state
   */
  async getJobsByState(state, limit = 100) {
    return executeQuery(async (supabase) => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('state', state)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId) {
    try {
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if ([JOB_STATES.COMPLETED, JOB_STATES.DEAD].includes(job.state)) {
        throw new Error(`Cannot cancel job in state: ${job.state}`);
      }

      job.state = JOB_STATES.DEAD;
      job.cancelled_at = new Date().toISOString();

      await this.updateJobInDatabase(job);

      // Remove from queues
      const tier = await this.getTenantTier(job.tenantId);
      const queue = this.queues.get(tier);

      // Note: This is inefficient for large queues, consider optimization
      const jobs = queue.toArray();
      queue.clear();
      jobs.filter(j => j.id !== jobId).forEach(j => queue.enqueue(j));

      logger.info('Job cancelled', { jobId, tier });
      this.emit('jobCancelled', { job });

      return job;

    } catch (error) {
      logger.error('Failed to cancel job', {
        jobId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Queue manager shutting down');

    this.stopProcessing();

    // Wait for any pending database operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.removeAllListeners();

    logger.info('Queue manager shutdown completed');
  }
}

/**
 * Create and export singleton queue manager instance
 */
let queueManagerInstance = null;

export function createQueueManager() {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager();
  }
  return queueManagerInstance;
}

export function getQueueManager() {
  return queueManagerInstance;
}

export default {
  QueueManager,
  createQueueManager,
  getQueueManager,
  JOB_STATES,
  JOB_PRIORITIES,
  JOB_TYPES
};