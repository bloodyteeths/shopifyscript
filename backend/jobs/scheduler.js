/**
 * Job Scheduler for ProofKit SaaS
 * Manages automated execution of weekly summaries, anomaly detection, and alerting
 */

import { runWeeklySummary } from './weekly_summary.js';
import { anomalyDetectionService } from '../services/anomaly-detection.js';
import { alertsService } from '../services/alerts.js';
import logger from '../services/logger.js';

/**
 * Job Scheduler Class
 */
export class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.running = false;
    this.intervals = new Map();
    this.tenants = new Set(); // Start empty, tenants added dynamically via addTenant()
    
    this.schedules = {
      // Anomaly detection - every 15 minutes
      anomaly_detection: {
        interval: 15 * 60 * 1000, // 15 minutes
        fn: this.runAnomalyDetectionJob.bind(this),
        enabled: true,
        lastRun: null,
        runCount: 0
      },
      
      // Weekly summary - Mondays at 9 AM
      weekly_summary: {
        cron: '0 9 * * 1', // Monday 9 AM
        fn: this.runWeeklySummaryJob.bind(this),
        enabled: true,
        lastRun: null,
        runCount: 0
      },
      
      // Health check - every 5 minutes
      health_check: {
        interval: 5 * 60 * 1000, // 5 minutes
        fn: this.runHealthCheckJob.bind(this),
        enabled: true,
        lastRun: null,
        runCount: 0
      }
    };
  }

  /**
   * Start the job scheduler
   */
  start() {
    if (this.running) {
      logger.warn('Job scheduler is already running');
      return;
    }

    this.running = true;
    logger.info('Starting job scheduler');

    // Start interval-based jobs
    for (const [jobName, config] of Object.entries(this.schedules)) {
      if (config.enabled && config.interval) {
        this.startIntervalJob(jobName, config);
      }
    }

    // Start cron-based jobs
    this.startCronJobs();

    logger.info('Job scheduler started successfully', {
      jobs: Object.keys(this.schedules),
      tenants: Array.from(this.tenants)
    });
  }

  /**
   * Stop the job scheduler
   */
  stop() {
    if (!this.running) {
      logger.warn('Job scheduler is not running');
      return;
    }

    this.running = false;
    logger.info('Stopping job scheduler');

    // Clear all intervals
    for (const [jobName, intervalId] of this.intervals) {
      clearInterval(intervalId);
      logger.debug('Stopped interval job', { jobName });
    }
    this.intervals.clear();

    logger.info('Job scheduler stopped');
  }

  /**
   * Add a tenant to the scheduler
   */
  addTenant(tenantId) {
    this.tenants.add(tenantId);
    logger.info('Added tenant to scheduler', { tenantId });
  }

  /**
   * Remove a tenant from the scheduler
   */
  removeTenant(tenantId) {
    this.tenants.delete(tenantId);
    logger.info('Removed tenant from scheduler', { tenantId });
  }

  /**
   * Start an interval-based job
   */
  startIntervalJob(jobName, config) {
    const intervalId = setInterval(async () => {
      if (!this.running) return;
      
      try {
        await this.executeJob(jobName, config);
      } catch (error) {
        logger.error('Interval job execution failed', {
          jobName,
          error: error.message,
          stack: error.stack
        });
      }
    }, config.interval);

    this.intervals.set(jobName, intervalId);
    logger.debug('Started interval job', { jobName, interval: config.interval });
  }

  /**
   * Start cron-based jobs (simplified implementation)
   */
  startCronJobs() {
    // For cron jobs, we'll check every minute if they should run
    const cronInterval = setInterval(async () => {
      if (!this.running) return;

      const now = new Date();
      
      for (const [jobName, config] of Object.entries(this.schedules)) {
        if (config.enabled && config.cron && this.shouldRunCronJob(now, config)) {
          try {
            await this.executeJob(jobName, config);
          } catch (error) {
            logger.error('Cron job execution failed', {
              jobName,
              error: error.message,
              stack: error.stack
            });
          }
        }
      }
    }, 60000); // Check every minute

    this.intervals.set('cron_checker', cronInterval);
  }

  /**
   * Check if a cron job should run
   */
  shouldRunCronJob(now, config) {
    // Simple cron implementation for Monday 9 AM
    if (config.cron === '0 9 * * 1') { // Monday 9 AM
      const isMonday = now.getDay() === 1;
      const isNineAM = now.getHours() === 9 && now.getMinutes() === 0;
      const hasntRunToday = !config.lastRun || 
        new Date(config.lastRun).toDateString() !== now.toDateString();
      
      return isMonday && isNineAM && hasntRunToday;
    }
    
    return false;
  }

  /**
   * Execute a job for all tenants
   */
  async executeJob(jobName, config) {
    const startTime = Date.now();
    logger.info('Executing job', { jobName, tenantCount: this.tenants.size });

    let successCount = 0;
    let errorCount = 0;

    for (const tenantId of this.tenants) {
      try {
        await config.fn(tenantId);
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error('Job execution failed for tenant', {
          jobName,
          tenantId,
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    config.lastRun = new Date().toISOString();
    config.runCount++;

    logger.info('Job execution completed', {
      jobName,
      duration,
      successCount,
      errorCount,
      totalTenants: this.tenants.size
    });
  }

  /**
   * Anomaly Detection Job
   */
  async runAnomalyDetectionJob(tenantId) {
    logger.debug('Running anomaly detection job', { tenantId });

    const results = await anomalyDetectionService.detectAnomalies(tenantId, '1h');
    
    // Send alerts for any anomalies found
    if (results.alerts.length > 0 || results.warnings.length > 0) {
      const allAnomalies = [...results.alerts, ...results.warnings];
      
      for (const anomaly of allAnomalies) {
        try {
          await alertsService.sendAlert(tenantId, {
            ...anomaly,
            tenant: tenantId,
            timestamp: results.timestamp
          });
        } catch (alertError) {
          logger.warn('Failed to send alert for anomaly', {
            tenantId,
            anomaly: anomaly.type,
            error: alertError.message
          });
        }
      }
    }

    return {
      tenantId,
      alertsFound: results.alerts.length,
      warningsFound: results.warnings.length,
      timestamp: results.timestamp
    };
  }

  /**
   * Weekly Summary Job
   */
  async runWeeklySummaryJob(tenantId) {
    logger.debug('Running weekly summary job', { tenantId });

    const result = await runWeeklySummary(tenantId, { generateAI: true });
    
    if (result.ok) {
      // Send weekly summary via configured channels
      try {
        await alertsService.sendWeeklySummary(tenantId, result.summary, {
          dashboardUrl: `https://app.proofkit.com/dashboard/${tenantId}`,
          settingsUrl: `https://app.proofkit.com/settings/${tenantId}`
        });
      } catch (alertError) {
        logger.warn('Failed to send weekly summary alert', {
          tenantId,
          error: alertError.message
        });
      }
    } else {
      throw new Error(`Weekly summary failed: ${result.error}`);
    }

    return {
      tenantId,
      summary: result.summary,
      duration: result.duration,
      hasAI: !!result.insights
    };
  }

  /**
   * Health Check Job
   */
  async runHealthCheckJob(tenantId) {
    logger.debug('Running health check job', { tenantId });

    const health = {
      tenantId,
      timestamp: new Date().toISOString(),
      services: {},
      overall: 'healthy'
    };

    try {
      // Check anomaly detection service health
      const anomalySummary = anomalyDetectionService.getAnomalySummary(tenantId);
      health.services.anomalyDetection = {
        status: 'healthy',
        totalRuns: anomalySummary.totalRuns,
        recentAlerts: anomalySummary.totalAlerts
      };
    } catch (error) {
      health.services.anomalyDetection = {
        status: 'unhealthy',
        error: error.message
      };
      health.overall = 'degraded';
    }

    try {
      // Check alerts service health
      const alertStats = alertsService.getDeliveryStats(tenantId);
      health.services.alerts = {
        status: alertStats.successRate > 80 ? 'healthy' : 'degraded',
        successRate: alertStats.successRate,
        totalDeliveries: alertStats.totalDeliveries,
        recentFailures: alertStats.recentFailures
      };
      
      if (alertStats.successRate <= 50) {
        health.overall = 'unhealthy';
      } else if (alertStats.successRate <= 80) {
        health.overall = 'degraded';
      }
    } catch (error) {
      health.services.alerts = {
        status: 'unhealthy',
        error: error.message
      };
      health.overall = 'unhealthy';
    }

    // Log health status
    if (health.overall !== 'healthy') {
      logger.warn('Health check found issues', health);
    } else {
      logger.debug('Health check passed', { tenantId, services: Object.keys(health.services) });
    }

    return health;
  }

  /**
   * Get job status and statistics
   */
  getStatus() {
    const status = {
      running: this.running,
      tenants: Array.from(this.tenants),
      jobs: {},
      uptime: this.running ? Date.now() - this.startTime : 0
    };

    for (const [jobName, config] of Object.entries(this.schedules)) {
      status.jobs[jobName] = {
        enabled: config.enabled,
        lastRun: config.lastRun,
        runCount: config.runCount,
        schedule: config.interval ? `${config.interval}ms interval` : config.cron,
        nextRun: this.getNextRunTime(config)
      };
    }

    return status;
  }

  /**
   * Get next run time for a job
   */
  getNextRunTime(config) {
    if (config.interval && config.lastRun) {
      return new Date(Date.parse(config.lastRun) + config.interval).toISOString();
    }
    
    if (config.cron === '0 9 * * 1') { // Monday 9 AM
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
      nextMonday.setHours(9, 0, 0, 0);
      return nextMonday.toISOString();
    }
    
    return null;
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobName, enabled) {
    if (this.schedules[jobName]) {
      this.schedules[jobName].enabled = enabled;
      logger.info('Job status changed', { jobName, enabled });
      
      // Restart scheduler to apply changes
      if (this.running) {
        this.stop();
        this.start();
      }
    } else {
      throw new Error(`Job ${jobName} not found`);
    }
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(jobName, tenantId = null) {
    const config = this.schedules[jobName];
    if (!config) {
      throw new Error(`Job ${jobName} not found`);
    }

    if (tenantId) {
      // Run for specific tenant
      return await config.fn(tenantId);
    } else {
      // Run for all tenants
      await this.executeJob(jobName, config);
    }
  }
}

/**
 * Singleton instance
 */
export const jobScheduler = new JobScheduler();

/**
 * Default export
 */
export default jobScheduler;