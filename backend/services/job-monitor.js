/**
 * Job Monitor Service for Ads Autopilot AI SaaS
 * Real-time job status monitoring, performance metrics, and alerting
 */

import { EventEmitter } from 'events';
import { executeQuery } from './supabase-client.js';
import logger from './logger.js';
import { JOB_STATES, JOB_PRIORITIES, JOB_TYPES } from './queue-manager.js';

/**
 * Alert Types
 */
export const ALERT_TYPES = {
  JOB_FAILED: 'job_failed',
  JOB_STUCK: 'job_stuck',
  HIGH_ERROR_RATE: 'high_error_rate',
  QUEUE_BACKUP: 'queue_backup',
  WORKER_DOWN: 'worker_down',
  PERFORMANCE_DEGRADATION: 'performance_degradation'
};

/**
 * Metric Types
 */
export const METRIC_TYPES = {
  JOB_DURATION: 'job_duration',
  QUEUE_SIZE: 'queue_size',
  ERROR_RATE: 'error_rate',
  THROUGHPUT: 'throughput',
  WORKER_UTILIZATION: 'worker_utilization'
};

/**
 * Job Monitor Class
 */
export class JobMonitor extends EventEmitter {
  constructor() {
    super();

    // Real-time job tracking
    this.activeJobs = new Map();
    this.completedJobs = new Map(); // Keep recent completed jobs for analysis
    this.failedJobs = new Map(); // Keep recent failed jobs for analysis

    // Performance metrics
    this.metrics = {
      totalJobsStarted: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      jobsPerMinute: 0,
      errorRate: 0,
      startTime: Date.now(),
      lastMetricsUpdate: Date.now()
    };

    // Monitoring configuration
    this.config = {
      alertThresholds: {
        errorRate: 0.1, // 10%
        stuckJobTimeout: 300000, // 5 minutes
        queueBackupSize: 100,
        averageProcessingTimeIncrease: 2.0 // 2x normal
      },
      metricsInterval: 60000, // 1 minute
      cleanupInterval: 3600000, // 1 hour
      maxHistorySize: 1000
    };

    // Alerting state
    this.alerts = new Map();
    this.alertCooldowns = new Map();

    // Performance history for trend analysis
    this.performanceHistory = [];
    this.maxHistoryPoints = 144; // 24 hours of 10-minute intervals

    // Start monitoring
    this.startMonitoring();

    logger.info('Job monitor initialized', {
      alertThresholds: this.config.alertThresholds,
      metricsInterval: this.config.metricsInterval
    });
  }

  /**
   * Start monitoring processes
   */
  startMonitoring() {
    // Metrics collection interval
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Job health check interval
    this.healthCheckInterval = setInterval(() => {
      this.checkJobHealth();
    }, 30000); // Check every 30 seconds

    logger.info('Job monitoring started');
  }

  /**
   * Stop monitoring processes
   */
  stopMonitoring() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Job monitoring stopped');
  }

  /**
   * Track job start
   */
  startJob(jobId, jobData) {
    const jobInfo = {
      id: jobId,
      type: jobData.type,
      tenantId: jobData.tenantId,
      priority: jobData.priority || JOB_PRIORITIES.NORMAL,
      startedAt: new Date(),
      workerId: jobData.workerId,
      state: JOB_STATES.RUNNING,
      metadata: jobData.metadata || {}
    };

    this.activeJobs.set(jobId, jobInfo);
    this.metrics.totalJobsStarted++;

    logger.info('Job monitoring started', {
      jobId,
      type: jobInfo.type,
      tenantId: jobInfo.tenantId,
      workerId: jobInfo.workerId
    });

    this.emit('jobStarted', jobInfo);
    return jobInfo;
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, status, updateData = {}) {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      logger.warn('Attempted to update unknown job', { jobId, status });
      return;
    }

    const previousState = job.state;
    job.state = status;
    job.lastUpdated = new Date();

    // Merge update data
    Object.assign(job, updateData);

    // Handle specific state transitions
    switch (status) {
      case JOB_STATES.COMPLETED:
        await this.completeJob(jobId, updateData.result);
        break;

      case JOB_STATES.FAILED:
        await this.failJob(jobId, updateData.error);
        break;

      case JOB_STATES.RUNNING:
        job.startedAt = job.startedAt || new Date();
        if (updateData.workerId) {
          job.workerId = updateData.workerId;
        }
        break;
    }

    logger.debug('Job status updated', {
      jobId,
      previousState,
      newState: status,
      updateData
    });

    this.emit('jobStatusChanged', { job, previousState, newState: status });

    // Persist status change
    await this.persistJobStatus(job);
  }

  /**
   * Complete job tracking
   */
  async completeJob(jobId, result = null) {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    const completedAt = new Date();
    const duration = completedAt - job.startedAt;

    job.completedAt = completedAt;
    job.duration = duration;
    job.result = result;
    job.state = JOB_STATES.COMPLETED;

    // Update metrics
    this.metrics.totalJobsCompleted++;
    this.metrics.totalProcessingTime += duration;
    this.metrics.averageProcessingTime =
      this.metrics.totalProcessingTime / this.metrics.totalJobsCompleted;

    // Move to completed jobs tracking
    this.completedJobs.set(jobId, job);
    this.activeJobs.delete(jobId);

    // Limit completed jobs size
    if (this.completedJobs.size > this.config.maxHistorySize) {
      const firstKey = this.completedJobs.keys().next().value;
      this.completedJobs.delete(firstKey);
    }

    logger.info('Job completed', {
      jobId,
      type: job.type,
      duration,
      tenantId: job.tenantId
    });

    this.emit('jobCompleted', job);
  }

  /**
   * Handle job failure
   */
  async failJob(jobId, error) {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    const failedAt = new Date();
    const duration = failedAt - job.startedAt;

    job.failedAt = failedAt;
    job.duration = duration;
    job.error = error;
    job.state = JOB_STATES.FAILED;

    // Update metrics
    this.metrics.totalJobsFailed++;

    // Move to failed jobs tracking
    this.failedJobs.set(jobId, job);
    this.activeJobs.delete(jobId);

    // Limit failed jobs size
    if (this.failedJobs.size > this.config.maxHistorySize) {
      const firstKey = this.failedJobs.keys().next().value;
      this.failedJobs.delete(firstKey);
    }

    logger.error('Job failed', {
      jobId,
      type: job.type,
      error: error.message || error,
      duration,
      tenantId: job.tenantId
    });

    // Check if alert is needed
    await this.checkErrorRateAlert();

    this.emit('jobFailed', job);
  }

  /**
   * Collect performance metrics
   */
  async collectMetrics() {
    const now = Date.now();
    const timeDiff = now - this.metrics.lastMetricsUpdate;

    // Calculate jobs per minute
    const jobsInInterval = this.metrics.totalJobsCompleted -
      (this.previousTotalCompleted || 0);
    this.metrics.jobsPerMinute = (jobsInInterval / timeDiff) * 60000;

    // Calculate error rate
    const totalJobs = this.metrics.totalJobsCompleted + this.metrics.totalJobsFailed;
    this.metrics.errorRate = totalJobs > 0 ? this.metrics.totalJobsFailed / totalJobs : 0;

    // Store performance snapshot
    const snapshot = {
      timestamp: now,
      activeJobs: this.activeJobs.size,
      jobsPerMinute: this.metrics.jobsPerMinute,
      errorRate: this.metrics.errorRate,
      averageProcessingTime: this.metrics.averageProcessingTime,
      totalJobsCompleted: this.metrics.totalJobsCompleted,
      totalJobsFailed: this.metrics.totalJobsFailed
    };

    this.performanceHistory.push(snapshot);

    // Limit history size
    if (this.performanceHistory.length > this.maxHistoryPoints) {
      this.performanceHistory.shift();
    }

    // Update tracking
    this.previousTotalCompleted = this.metrics.totalJobsCompleted;
    this.metrics.lastMetricsUpdate = now;

    // Persist metrics to database
    await this.persistMetrics(snapshot);

    // Check for alerts
    await this.checkAlerts();

    logger.debug('Metrics collected', snapshot);
    this.emit('metricsCollected', snapshot);
  }

  /**
   * Check job health and detect stuck jobs
   */
  async checkJobHealth() {
    const now = Date.now();
    const stuckJobs = [];

    for (const [jobId, job] of this.activeJobs) {
      const runningTime = now - job.startedAt.getTime();

      // Check for stuck jobs
      if (runningTime > this.config.alertThresholds.stuckJobTimeout) {
        stuckJobs.push({ jobId, job, runningTime });
      }
    }

    if (stuckJobs.length > 0) {
      await this.handleStuckJobs(stuckJobs);
    }
  }

  /**
   * Handle stuck jobs
   */
  async handleStuckJobs(stuckJobs) {
    for (const { jobId, job, runningTime } of stuckJobs) {
      logger.warn('Stuck job detected', {
        jobId,
        type: job.type,
        runningTime,
        workerId: job.workerId
      });

      // Send alert
      await this.sendAlert(ALERT_TYPES.JOB_STUCK, {
        jobId,
        type: job.type,
        runningTime,
        workerId: job.workerId,
        tenantId: job.tenantId
      });

      this.emit('jobStuck', { jobId, job, runningTime });
    }
  }

  /**
   * Check for various alerts
   */
  async checkAlerts() {
    await this.checkErrorRateAlert();
    await this.checkQueueBackupAlert();
    await this.checkPerformanceDegradationAlert();
  }

  /**
   * Check error rate alert
   */
  async checkErrorRateAlert() {
    if (this.metrics.errorRate > this.config.alertThresholds.errorRate) {
      await this.sendAlert(ALERT_TYPES.HIGH_ERROR_RATE, {
        errorRate: this.metrics.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        totalJobs: this.metrics.totalJobsCompleted + this.metrics.totalJobsFailed
      });
    }
  }

  /**
   * Check queue backup alert
   */
  async checkQueueBackupAlert() {
    // This would need access to queue manager
    // Implementation depends on integration
  }

  /**
   * Check performance degradation alert
   */
  async checkPerformanceDegradationAlert() {
    if (this.performanceHistory.length < 10) return;

    // Compare recent average with historical average
    const recent = this.performanceHistory.slice(-5);
    const historical = this.performanceHistory.slice(-20, -5);

    const recentAvgTime = recent.reduce((sum, p) => sum + p.averageProcessingTime, 0) / recent.length;
    const historicalAvgTime = historical.reduce((sum, p) => sum + p.averageProcessingTime, 0) / historical.length;

    if (recentAvgTime > historicalAvgTime * this.config.alertThresholds.averageProcessingTimeIncrease) {
      await this.sendAlert(ALERT_TYPES.PERFORMANCE_DEGRADATION, {
        recentAvgTime,
        historicalAvgTime,
        degradationFactor: recentAvgTime / historicalAvgTime
      });
    }
  }

  /**
   * Send alert with cooldown
   */
  async sendAlert(alertType, data) {
    const alertKey = `${alertType}_${JSON.stringify(data)}`;
    const now = Date.now();

    // Check cooldown
    const lastAlert = this.alertCooldowns.get(alertType);
    const cooldownPeriod = 300000; // 5 minutes

    if (lastAlert && (now - lastAlert) < cooldownPeriod) {
      return; // Skip alert due to cooldown
    }

    const alert = {
      id: this.generateAlertId(),
      type: alertType,
      data,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(alertType)
    };

    this.alerts.set(alert.id, alert);
    this.alertCooldowns.set(alertType, now);

    logger.warn('Alert generated', alert);

    // Persist alert
    await this.persistAlert(alert);

    this.emit('alert', alert);

    // Integration with external alerting systems would go here
    // e.g., send to Slack, email, PagerDuty, etc.
  }

  /**
   * Get alert severity level
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      [ALERT_TYPES.JOB_FAILED]: 'medium',
      [ALERT_TYPES.JOB_STUCK]: 'high',
      [ALERT_TYPES.HIGH_ERROR_RATE]: 'high',
      [ALERT_TYPES.QUEUE_BACKUP]: 'medium',
      [ALERT_TYPES.WORKER_DOWN]: 'high',
      [ALERT_TYPES.PERFORMANCE_DEGRADATION]: 'medium'
    };

    return severityMap[alertType] || 'low';
  }

  /**
   * Get job statistics
   */
  getJobStats(timeframe = '1h') {
    const now = Date.now();
    const timeframes = {
      '1h': 3600000,
      '6h': 6 * 3600000,
      '24h': 24 * 3600000,
      '7d': 7 * 24 * 3600000
    };

    const cutoff = now - (timeframes[timeframe] || timeframes['1h']);

    // Filter performance history for timeframe
    const relevantHistory = this.performanceHistory.filter(p => p.timestamp >= cutoff);

    // Calculate stats from relevant history
    const stats = {
      timeframe,
      currentMetrics: { ...this.metrics },
      activeJobs: this.activeJobs.size,
      recentHistory: relevantHistory,
      jobsByType: this.getJobsByType(),
      jobsByTenant: this.getJobsByTenant(),
      performanceTrends: this.calculateTrends(relevantHistory)
    };

    return stats;
  }

  /**
   * Get jobs by type breakdown
   */
  getJobsByType() {
    const breakdown = {};

    // Count active jobs
    for (const job of this.activeJobs.values()) {
      breakdown[job.type] = (breakdown[job.type] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Get jobs by tenant breakdown
   */
  getJobsByTenant() {
    const breakdown = {};

    // Count active jobs
    for (const job of this.activeJobs.values()) {
      breakdown[job.tenantId] = (breakdown[job.tenantId] || 0) + 1;
    }

    return breakdown;
  }

  /**
   * Calculate performance trends
   */
  calculateTrends(history) {
    if (history.length < 2) return null;

    const first = history[0];
    const last = history[history.length - 1];

    return {
      throughputTrend: last.jobsPerMinute - first.jobsPerMinute,
      errorRateTrend: last.errorRate - first.errorRate,
      processingTimeTrend: last.averageProcessingTime - first.averageProcessingTime,
      period: last.timestamp - first.timestamp
    };
  }

  /**
   * Get job history
   */
  async getJobHistory(filters = {}) {
    const { tenantId, type, state, limit = 100, offset = 0 } = filters;

    try {
      return await executeQuery(async (supabase) => {
        let query = supabase
          .from('job_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        if (type) {
          query = query.eq('type', type);
        }

        if (state) {
          query = query.eq('state', state);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
      });

    } catch (error) {
      logger.error('Failed to get job history', {
        filters,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Persist job status to database
   */
  async persistJobStatus(job) {
    try {
      await executeQuery(async (supabase) => {
        const { error } = await supabase
          .from('job_logs')
          .insert([{
            job_id: job.id,
            tenant_id: job.tenantId,
            type: job.type,
            state: job.state,
            worker_id: job.workerId,
            started_at: job.startedAt?.toISOString(),
            completed_at: job.completedAt?.toISOString(),
            failed_at: job.failedAt?.toISOString(),
            duration: job.duration,
            error_message: job.error?.message || job.error,
            result: job.result,
            metadata: job.metadata
          }]);

        if (error) throw error;
      });

    } catch (error) {
      logger.error('Failed to persist job status', {
        jobId: job.id,
        error: error.message
      });
    }
  }

  /**
   * Persist performance metrics
   */
  async persistMetrics(snapshot) {
    try {
      await executeQuery(async (supabase) => {
        const { error } = await supabase
          .from('performance_metrics')
          .insert([{
            timestamp: new Date(snapshot.timestamp).toISOString(),
            active_jobs: snapshot.activeJobs,
            jobs_per_minute: snapshot.jobsPerMinute,
            error_rate: snapshot.errorRate,
            average_processing_time: snapshot.averageProcessingTime,
            total_jobs_completed: snapshot.totalJobsCompleted,
            total_jobs_failed: snapshot.totalJobsFailed
          }]);

        if (error) throw error;
      });

    } catch (error) {
      logger.error('Failed to persist metrics', {
        error: error.message
      });
    }
  }

  /**
   * Persist alert
   */
  async persistAlert(alert) {
    try {
      await executeQuery(async (supabase) => {
        const { error } = await supabase
          .from('job_alerts')
          .insert([{
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            data: alert.data,
            created_at: alert.timestamp
          }]);

        if (error) throw error;
      });

    } catch (error) {
      logger.error('Failed to persist alert', {
        alertId: alert.id,
        error: error.message
      });
    }
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    const cutoff = Date.now() - (24 * 3600000); // 24 hours

    // Clean up completed jobs
    for (const [jobId, job] of this.completedJobs) {
      if (job.completedAt.getTime() < cutoff) {
        this.completedJobs.delete(jobId);
      }
    }

    // Clean up failed jobs
    for (const [jobId, job] of this.failedJobs) {
      if (job.failedAt.getTime() < cutoff) {
        this.failedJobs.delete(jobId);
      }
    }

    // Clean up alerts
    for (const [alertId, alert] of this.alerts) {
      if (new Date(alert.timestamp).getTime() < cutoff) {
        this.alerts.delete(alertId);
      }
    }

    logger.debug('Cleanup completed', {
      completedJobs: this.completedJobs.size,
      failedJobs: this.failedJobs.size,
      alerts: this.alerts.size
    });
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `alert_${timestamp}_${random}`;
  }

  /**
   * Health check for monitoring system
   */
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeJobs: this.activeJobs.size,
      metrics: this.metrics,
      alerts: this.alerts.size,
      monitoring: {
        metricsInterval: !!this.metricsInterval,
        cleanupInterval: !!this.cleanupInterval,
        healthCheckInterval: !!this.healthCheckInterval
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Job monitor shutting down');

    this.stopMonitoring();

    // Final metrics collection
    await this.collectMetrics();

    this.removeAllListeners();

    logger.info('Job monitor shutdown completed');
  }
}

/**
 * Create and export singleton job monitor instance
 */
let jobMonitorInstance = null;

export function createJobMonitor() {
  if (!jobMonitorInstance) {
    jobMonitorInstance = new JobMonitor();
  }
  return jobMonitorInstance;
}

export function getJobMonitor() {
  return jobMonitorInstance;
}

export default {
  JobMonitor,
  createJobMonitor,
  getJobMonitor,
  ALERT_TYPES,
  METRIC_TYPES
};