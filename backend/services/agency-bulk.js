/**
 * Agency Bulk Operations Service
 * Handles large-scale operations across multiple clients/tenants
 * Provides queue management and parallel processing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgencyBulkService {
  constructor() {
    this.operationsDir = path.join(__dirname, '../bulk-operations');
    this.jobQueue = [];
    this.activeJobs = new Map();
    this.maxConcurrentJobs = 5;
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    if (!fs.existsSync(this.operationsDir)) {
      fs.mkdirSync(this.operationsDir, { recursive: true });
    }
  }

  /**
   * Queue bulk operation for processing
   */
  async queueBulkOperation(operation) {
    try {
      const jobId = this.generateJobId();
      
      const job = {
        id: jobId,
        type: operation.type,
        tenantIds: operation.tenantIds || [],
        parameters: operation.parameters || {},
        status: 'queued',
        progress: 0,
        results: [],
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        createdBy: operation.createdBy || 'system'
      };

      // Save job to file system
      this.saveJob(job);
      
      // Add to queue
      this.jobQueue.push(job);
      
      // Start processing if slots available
      this.processQueue();

      console.log(`Bulk operation queued: ${jobId} (${operation.type})`);
      return job;

    } catch (error) {
      console.error('Error queueing bulk operation:', error);
      throw error;
    }
  }

  /**
   * Process job queue
   */
  async processQueue() {
    while (this.jobQueue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
      const job = this.jobQueue.shift();
      
      if (job) {
        this.activeJobs.set(job.id, job);
        this.processJob(job);
      }
    }
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    try {
      console.log(`Starting bulk operation: ${job.id} (${job.type})`);
      
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      this.saveJob(job);

      // Process based on operation type
      switch (job.type) {
        case 'template_clone':
          await this.processTemplateClone(job);
          break;
        case 'config_update':
          await this.processConfigUpdate(job);
          break;
        case 'campaign_action':
          await this.processCampaignAction(job);
          break;
        case 'negative_keywords':
          await this.processNegativeKeywords(job);
          break;
        case 'report_generation':
          await this.processReportGeneration(job);
          break;
        case 'audience_sync':
          await this.processAudienceSync(job);
          break;
        default:
          throw new Error(`Unknown operation type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.progress = 100;

      console.log(`Completed bulk operation: ${job.id}`);

    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
    } finally {
      this.saveJob(job);
      this.activeJobs.delete(job.id);
      
      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Process template cloning across tenants
   */
  async processTemplateClone(job) {
    const { templateId, customizations } = job.parameters;
    const tenantIds = job.tenantIds;
    
    for (let i = 0; i < tenantIds.length; i++) {
      const tenantId = tenantIds[i];
      
      try {
        // Simulate template cloning (would integrate with actual service)
        await this.simulateOperation(`Cloning template ${templateId} to ${tenantId}`, 1000);
        
        job.results.push({
          tenantId,
          success: true,
          message: 'Template cloned successfully'
        });

      } catch (error) {
        job.results.push({
          tenantId,
          success: false,
          error: error.message
        });
      }

      // Update progress
      job.progress = Math.round(((i + 1) / tenantIds.length) * 100);
      this.saveJob(job);
    }
  }

  /**
   * Process configuration updates across tenants
   */
  async processConfigUpdate(job) {
    const { configUpdates, updateMode } = job.parameters;
    const tenantIds = job.tenantIds;
    
    for (let i = 0; i < tenantIds.length; i++) {
      const tenantId = tenantIds[i];
      
      try {
        // Simulate config update (would integrate with actual service)
        await this.simulateOperation(`Updating config for ${tenantId}`, 800);
        
        job.results.push({
          tenantId,
          success: true,
          message: 'Configuration updated successfully',
          updatedFields: Object.keys(configUpdates)
        });

      } catch (error) {
        job.results.push({
          tenantId,
          success: false,
          error: error.message
        });
      }

      job.progress = Math.round(((i + 1) / tenantIds.length) * 100);
      this.saveJob(job);
    }
  }

  /**
   * Process campaign actions across tenants
   */
  async processCampaignAction(job) {
    const { action, campaignNames } = job.parameters;
    const tenantIds = job.tenantIds;
    
    for (let i = 0; i < tenantIds.length; i++) {
      const tenantId = tenantIds[i];
      
      try {
        // Simulate campaign action (would integrate with ads script service)
        await this.simulateOperation(`${action} campaigns for ${tenantId}`, 1200);
        
        const affectedCampaigns = campaignNames || ['All campaigns'];
        
        job.results.push({
          tenantId,
          success: true,
          message: `Campaigns ${action}d successfully`,
          affectedCampaigns
        });

      } catch (error) {
        job.results.push({
          tenantId,
          success: false,
          error: error.message
        });
      }

      job.progress = Math.round(((i + 1) / tenantIds.length) * 100);
      this.saveJob(job);
    }
  }

  /**
   * Process negative keyword additions across tenants
   */
  async processNegativeKeywords(job) {
    const { negativeKeywords, targetLevel } = job.parameters;
    const tenantIds = job.tenantIds;
    
    for (let i = 0; i < tenantIds.length; i++) {
      const tenantId = tenantIds[i];
      
      try {
        // Simulate negative keyword addition (would integrate with ads script service)
        await this.simulateOperation(`Adding negative keywords for ${tenantId}`, 900);
        
        job.results.push({
          tenantId,
          success: true,
          message: `${negativeKeywords.length} negative keywords added`,
          keywordsAdded: negativeKeywords.length,
          targetLevel
        });

      } catch (error) {
        job.results.push({
          tenantId,
          success: false,
          error: error.message
        });
      }

      job.progress = Math.round(((i + 1) / tenantIds.length) * 100);
      this.saveJob(job);
    }
  }

  /**
   * Process report generation across tenants
   */
  async processReportGeneration(job) {
    const { reportType, reportOptions } = job.parameters;
    const tenantIds = job.tenantIds;
    
    for (let i = 0; i < tenantIds.length; i++) {
      const tenantId = tenantIds[i];
      
      try {
        // Simulate report generation (would integrate with PDF service)
        await this.simulateOperation(`Generating ${reportType} report for ${tenantId}`, 2000);
        
        const reportId = `${reportType}_${tenantId}_${Date.now()}`;
        
        job.results.push({
          tenantId,
          success: true,
          message: 'Report generated successfully',
          reportId,
          reportType
        });

      } catch (error) {
        job.results.push({
          tenantId,
          success: false,
          error: error.message
        });
      }

      job.progress = Math.round(((i + 1) / tenantIds.length) * 100);
      this.saveJob(job);
    }
  }

  /**
   * Process audience synchronization across tenants
   */
  async processAudienceSync(job) {
    const { audienceId, syncMode } = job.parameters;
    const tenantIds = job.tenantIds;
    
    for (let i = 0; i < tenantIds.length; i++) {
      const tenantId = tenantIds[i];
      
      try {
        // Simulate audience sync (would integrate with audience service)
        await this.simulateOperation(`Syncing audience ${audienceId} for ${tenantId}`, 1500);
        
        job.results.push({
          tenantId,
          success: true,
          message: 'Audience synchronized successfully',
          audienceId,
          syncMode
        });

      } catch (error) {
        job.results.push({
          tenantId,
          success: false,
          error: error.message
        });
      }

      job.progress = Math.round(((i + 1) / tenantIds.length) * 100);
      this.saveJob(job);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    try {
      const jobPath = path.join(this.operationsDir, `${jobId}.json`);
      
      if (!fs.existsSync(jobPath)) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
      return job;

    } catch (error) {
      console.error('Error getting job status:', error);
      throw error;
    }
  }

  /**
   * Get all jobs with optional filtering
   */
  async getJobs(filters = {}) {
    try {
      const jobFiles = fs.readdirSync(this.operationsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const jobPath = path.join(this.operationsDir, file);
          const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
          
          // Return summary info only
          return {
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            tenantCount: job.tenantIds.length,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            createdBy: job.createdBy,
            successCount: job.results.filter(r => r.success).length,
            failureCount: job.results.filter(r => !r.success).length
          };
        });

      // Apply filters
      let filteredJobs = jobFiles;

      if (filters.status) {
        filteredJobs = filteredJobs.filter(job => job.status === filters.status);
      }

      if (filters.type) {
        filteredJobs = filteredJobs.filter(job => job.type === filters.type);
      }

      if (filters.createdBy) {
        filteredJobs = filteredJobs.filter(job => job.createdBy === filters.createdBy);
      }

      // Sort by creation date (newest first)
      filteredJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return filteredJobs;

    } catch (error) {
      console.error('Error getting jobs:', error);
      throw error;
    }
  }

  /**
   * Cancel running job
   */
  async cancelJob(jobId) {
    try {
      const job = await this.getJobStatus(jobId);
      
      if (job.status === 'completed' || job.status === 'failed') {
        throw new Error('Cannot cancel completed or failed job');
      }

      if (job.status === 'running' && this.activeJobs.has(jobId)) {
        // Mark for cancellation (actual implementation would need proper cancellation)
        job.status = 'cancelled';
        job.completedAt = new Date().toISOString();
        job.error = 'Job cancelled by user';
        
        this.saveJob(job);
        this.activeJobs.delete(jobId);
        
        console.log(`Job cancelled: ${jobId}`);
        return job;
      }

      if (job.status === 'queued') {
        // Remove from queue
        const queueIndex = this.jobQueue.findIndex(j => j.id === jobId);
        if (queueIndex !== -1) {
          this.jobQueue.splice(queueIndex, 1);
        }
        
        job.status = 'cancelled';
        job.completedAt = new Date().toISOString();
        job.error = 'Job cancelled by user';
        
        this.saveJob(job);
        
        console.log(`Queued job cancelled: ${jobId}`);
        return job;
      }

      throw new Error('Job not found in queue or active jobs');

    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Get bulk operation analytics
   */
  async getBulkAnalytics(timeframe = 'last_30_days') {
    try {
      const jobs = await this.getJobs();
      
      // Filter by timeframe
      const cutoffDate = this.getTimeframeCutoff(timeframe);
      const filteredJobs = jobs.filter(job => new Date(job.createdAt) >= cutoffDate);

      const analytics = {
        totalJobs: filteredJobs.length,
        jobsByStatus: {},
        jobsByType: {},
        totalTenantsProcessed: 0,
        averageSuccessRate: 0,
        averageJobDuration: 0,
        recentActivity: []
      };

      // Calculate statistics
      filteredJobs.forEach(job => {
        analytics.jobsByStatus[job.status] = (analytics.jobsByStatus[job.status] || 0) + 1;
        analytics.jobsByType[job.type] = (analytics.jobsByType[job.type] || 0) + 1;
        analytics.totalTenantsProcessed += job.tenantCount;
      });

      // Calculate success rate
      const completedJobs = filteredJobs.filter(job => job.status === 'completed');
      if (completedJobs.length > 0) {
        const totalSuccesses = completedJobs.reduce((sum, job) => sum + job.successCount, 0);
        const totalOperations = completedJobs.reduce((sum, job) => sum + job.successCount + job.failureCount, 0);
        analytics.averageSuccessRate = totalOperations > 0 ? (totalSuccesses / totalOperations) * 100 : 0;
      }

      // Calculate average duration for completed jobs
      const jobsWithDuration = completedJobs.filter(job => job.startedAt && job.completedAt);
      if (jobsWithDuration.length > 0) {
        const totalDuration = jobsWithDuration.reduce((sum, job) => {
          const duration = new Date(job.completedAt) - new Date(job.startedAt);
          return sum + duration;
        }, 0);
        analytics.averageJobDuration = Math.round(totalDuration / jobsWithDuration.length / 1000); // seconds
      }

      // Recent activity (last 10 jobs)
      analytics.recentActivity = filteredJobs.slice(0, 10);

      return analytics;

    } catch (error) {
      console.error('Error getting bulk analytics:', error);
      throw error;
    }
  }

  /**
   * Save job to file system
   */
  saveJob(job) {
    const jobPath = path.join(this.operationsDir, `${job.id}.json`);
    fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `bulk_${timestamp}_${random}`;
  }

  /**
   * Simulate operation with delay
   */
  async simulateOperation(description, delay) {
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate random failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`Simulated failure: ${description}`);
    }
    
    return true;
  }

  /**
   * Get cutoff date for timeframe
   */
  getTimeframeCutoff(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case 'last_24_hours':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'last_7_days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_30_days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last_90_days':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queuedJobs: this.jobQueue.length,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      capacity: this.maxConcurrentJobs - this.activeJobs.size
    };
  }

  /**
   * Update queue settings
   */
  updateQueueSettings(settings) {
    if (settings.maxConcurrentJobs && settings.maxConcurrentJobs > 0) {
      this.maxConcurrentJobs = settings.maxConcurrentJobs;
      console.log(`Max concurrent jobs updated to: ${this.maxConcurrentJobs}`);
      
      // Start processing if new capacity is available
      this.processQueue();
    }
  }
}

export default AgencyBulkService;