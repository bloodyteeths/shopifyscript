/**
 * Scheduled Reports Job System
 * Automates report delivery based on tier frequency:
 * - Starter: Monthly insights reports (1st of each month)
 * - Professional: Weekly insights reports (every Monday)
 * - Enterprise: Daily insights reports (every day at 8 AM) + custom reports
 */

import cron from 'node-cron';
import reportGenerator from '../services/report-generator.js';
import subscriptionCheck from '../middleware/subscription-check.js';

const { getCurrentSubscription } = subscriptionCheck;

class ScheduledReportsService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.tenants = new Map(); // Cache for tenant subscriptions
    this.tenantCacheTimeout = 60 * 60 * 1000; // 1 hour cache
    
    // Job execution metrics
    this.metrics = {
      jobsScheduled: 0,
      jobsExecuted: 0,
      jobsFailed: 0,
      reportsGenerated: 0,
      emailsSent: 0,
      avgExecutionTime: 0,
      lastExecution: null,
      errors: []
    };

    // Schedule configurations
    this.schedules = {
      // Daily reports for Enterprise (8 AM UTC)
      daily: '0 8 * * *',
      
      // Weekly reports for Professional (Monday 9 AM UTC)  
      weekly: '0 9 * * 1',
      
      // Monthly reports for Starter (1st of month, 10 AM UTC)
      monthly: '0 10 1 * *',
      
      // Health check (every hour)
      healthCheck: '0 * * * *'
    };

    this.initializeJobs();
  }

  /**
   * Initialize all scheduled jobs
   */
  initializeJobs() {
    try {
      console.log('Initializing scheduled report jobs...');

      // Daily reports for Enterprise customers
      this.jobs.set('daily-reports', cron.schedule(this.schedules.daily, () => {
        this.executeDailyReports();
      }, {
        scheduled: false,
        name: 'daily-reports',
        timezone: 'UTC'
      }));

      // Weekly reports for Professional customers
      this.jobs.set('weekly-reports', cron.schedule(this.schedules.weekly, () => {
        this.executeWeeklyReports();
      }, {
        scheduled: false,
        name: 'weekly-reports', 
        timezone: 'UTC'
      }));

      // Monthly reports for Starter customers
      this.jobs.set('monthly-reports', cron.schedule(this.schedules.monthly, () => {
        this.executeMonthlyReports();
      }, {
        scheduled: false,
        name: 'monthly-reports',
        timezone: 'UTC'
      }));

      // Health check job
      this.jobs.set('health-check', cron.schedule(this.schedules.healthCheck, () => {
        this.performHealthCheck();
      }, {
        scheduled: false,
        name: 'health-check',
        timezone: 'UTC'
      }));

      this.metrics.jobsScheduled = this.jobs.size;
      console.log(`${this.jobs.size} report jobs initialized successfully`);

    } catch (error) {
      console.error('Failed to initialize scheduled jobs:', error);
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: 'Job initialization failed',
        details: error.message
      });
    }
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduled reports are already running');
      return;
    }

    try {
      this.jobs.forEach((job, name) => {
        job.start();
        console.log(`Started job: ${name}`);
      });

      this.isRunning = true;
      console.log('All scheduled report jobs started successfully');

      // Log next execution times
      this.logNextExecutions();

    } catch (error) {
      console.error('Failed to start scheduled jobs:', error);
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: 'Job startup failed',
        details: error.message
      });
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('Scheduled reports are not running');
      return;
    }

    try {
      this.jobs.forEach((job, name) => {
        job.stop();
        console.log(`Stopped job: ${name}`);
      });

      this.isRunning = false;
      console.log('All scheduled report jobs stopped');

    } catch (error) {
      console.error('Failed to stop scheduled jobs:', error);
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: 'Job shutdown failed',
        details: error.message
      });
    }
  }

  /**
   * Execute daily reports for Enterprise customers
   */
  async executeDailyReports() {
    const startTime = Date.now();
    console.log('Executing daily reports for Enterprise customers...');

    try {
      const enterpriseTenants = await this.getTenantsByTier('enterprise');
      
      if (enterpriseTenants.length === 0) {
        console.log('No Enterprise customers found for daily reports');
        return;
      }

      console.log(`Found ${enterpriseTenants.length} Enterprise customers for daily reports`);

      const results = await this.processTenantReports(enterpriseTenants, 'daily', 'insights');
      
      this.updateExecutionMetrics('daily', results, startTime);
      console.log(`Daily reports completed: ${results.success} sent, ${results.failed} failed`);

    } catch (error) {
      console.error('Daily reports execution failed:', error);
      this.logExecutionError('daily', error);
    }
  }

  /**
   * Execute weekly reports for Professional customers
   */
  async executeWeeklyReports() {
    const startTime = Date.now();
    console.log('Executing weekly reports for Professional customers...');

    try {
      const professionalTenants = await this.getTenantsByTier('professional');
      
      if (professionalTenants.length === 0) {
        console.log('No Professional customers found for weekly reports');
        return;
      }

      console.log(`Found ${professionalTenants.length} Professional customers for weekly reports`);

      const results = await this.processTenantReports(professionalTenants, 'weekly', 'insights');
      
      this.updateExecutionMetrics('weekly', results, startTime);
      console.log(`Weekly reports completed: ${results.success} sent, ${results.failed} failed`);

    } catch (error) {
      console.error('Weekly reports execution failed:', error);
      this.logExecutionError('weekly', error);
    }
  }

  /**
   * Execute monthly reports for Starter customers
   */
  async executeMonthlyReports() {
    const startTime = Date.now();
    console.log('Executing monthly reports for Starter customers...');

    try {
      const starterTenants = await this.getTenantsByTier('starter');
      
      if (starterTenants.length === 0) {
        console.log('No Starter customers found for monthly reports');
        return;
      }

      console.log(`Found ${starterTenants.length} Starter customers for monthly reports`);

      const results = await this.processTenantReports(starterTenants, 'monthly', 'insights');
      
      this.updateExecutionMetrics('monthly', results, startTime);
      console.log(`Monthly reports completed: ${results.success} sent, ${results.failed} failed`);

    } catch (error) {
      console.error('Monthly reports execution failed:', error);
      this.logExecutionError('monthly', error);
    }
  }

  /**
   * Process reports for a list of tenants
   */
  async processTenantReports(tenants, frequency, reportType = 'insights') {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (tenant) => {
        try {
          await this.generateAndSendReportForTenant(tenant, frequency, reportType);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            tenantId: tenant.id,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          console.error(`Report failed for tenant ${tenant.id}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < tenants.length) {
        await this.delay(2000);
      }
    }

    return results;
  }

  /**
   * Generate and send report for a specific tenant with comprehensive error handling
   */
  async generateAndSendReportForTenant(tenant, frequency, reportType) {
    const startTime = Date.now();
    let reportData = null;
    let emailResult = null;
    
    try {
      // Input validation
      if (!tenant || !tenant.id) {
        throw new Error('Invalid tenant object - missing tenant ID');
      }
      
      if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        throw new Error(`Invalid frequency: ${frequency}`);
      }
      
      if (!['insights', 'custom', 'performance'].includes(reportType)) {
        console.warn(`Unknown report type: ${reportType}, defaulting to insights`);
        reportType = 'insights';
      }

      console.log(`📊 Generating ${frequency} ${reportType} report for tenant ${tenant.id}`);

      // Generate report with retry logic
      let reportAttempts = 0;
      const maxReportAttempts = 3;
      
      while (reportAttempts < maxReportAttempts) {
        try {
          reportData = await Promise.race([
            reportGenerator.generateReport(tenant.id, reportType, {
              frequency,
              skipCache: reportAttempts > 0 // Skip cache on retries
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Report generation timeout')), 60000)
            )
          ]);
          break; // Success, exit retry loop
          
        } catch (reportError) {
          reportAttempts++;
          console.error(`Report generation attempt ${reportAttempts}/${maxReportAttempts} failed:`, reportError);
          
          if (reportAttempts >= maxReportAttempts) {
            throw new Error(`Report generation failed after ${maxReportAttempts} attempts: ${reportError.message}`);
          }
          
          // Wait before retry with exponential backoff
          await this.delay(1000 * Math.pow(2, reportAttempts - 1));
        }
      }

      // Validate report data
      if (!reportData || typeof reportData !== 'object') {
        throw new Error('Invalid report data structure returned');
      }

      if (!reportData.tier || !reportData.frequency) {
        console.warn('Report missing tier or frequency metadata, adding defaults');
        reportData.tier = reportData.tier || 'starter';
        reportData.frequency = reportData.frequency || frequency;
      }

      // Get and validate tenant email with multiple attempts
      const userEmail = tenant.email || await this.getTenantEmailWithRetry(tenant.id);
      
      if (!userEmail) {
        throw new Error(`No email found for tenant ${tenant.id} after retry attempts`);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        throw new Error(`Invalid email format for tenant ${tenant.id}: ${userEmail}`);
      }

      console.log(`📧 Sending ${frequency} report to ${userEmail} for tenant ${tenant.id}`);

      // Send email with retry logic
      let emailAttempts = 0;
      const maxEmailAttempts = 3;
      
      while (emailAttempts < maxEmailAttempts) {
        try {
          emailResult = await Promise.race([
            reportGenerator.sendReportEmail(
              tenant.id,
              userEmail,
              reportData,
              { 
                reportType,
                frequency,
                tenantMetadata: {
                  tier: tenant.tier,
                  created: tenant.created_at,
                  lastSeen: tenant.last_seen_at
                }
              }
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Email sending timeout')), 30000)
            )
          ]);
          
          break; // Success, exit retry loop
          
        } catch (emailError) {
          emailAttempts++;
          console.error(`Email sending attempt ${emailAttempts}/${maxEmailAttempts} failed:`, emailError);
          
          if (emailAttempts >= maxEmailAttempts) {
            throw new Error(`Email delivery failed after ${maxEmailAttempts} attempts: ${emailError.message}`);
          }
          
          // Wait before retry
          await this.delay(2000 * emailAttempts);
        }
      }

      // Validate email result
      if (!emailResult || !emailResult.success) {
        const errorMsg = emailResult?.error || 'Unknown email error';
        throw new Error(`Email delivery failed: ${errorMsg}`);
      }

      // Success metrics and logging
      this.metrics.reportsGenerated++;
      this.metrics.emailsSent++;
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${frequency} report sent successfully to ${userEmail} for tenant ${tenant.id} (${processingTime}ms)`);

      // Log successful delivery for audit trail
      await this.logReportDelivery(tenant.id, {
        frequency,
        reportType,
        email: userEmail,
        processingTime,
        reportSize: JSON.stringify(reportData).length,
        success: true
      });

      return {
        success: true,
        processingTime,
        emailId: emailResult.messageId,
        reportSize: JSON.stringify(reportData).length
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Detailed error logging
      console.error(`❌ Failed to process report for tenant ${tenant?.id || 'unknown'}:`, {
        error: error.message,
        stack: error.stack,
        processingTime,
        reportGenerated: !!reportData,
        emailAttempted: !!emailResult,
        tenantInfo: {
          id: tenant?.id,
          tier: tenant?.tier,
          email: tenant?.email
        }
      });

      // Log failed delivery for audit trail
      await this.logReportDelivery(tenant?.id || 'unknown', {
        frequency,
        reportType,
        email: tenant?.email || 'unknown',
        processingTime,
        success: false,
        error: error.message,
        errorStack: error.stack?.substring(0, 500) // Truncate stack trace
      });

      // Re-throw with additional context
      const contextualError = new Error(
        `Report processing failed for tenant ${tenant?.id || 'unknown'}: ${error.message}`
      );
      contextualError.originalError = error;
      contextualError.processingTime = processingTime;
      contextualError.tenantId = tenant?.id;
      
      throw contextualError;
    }
  }

  /**
   * Get tenants by subscription tier
   */
  async getTenantsByTier(tier) {
    try {
      // Check cache first
      const cacheKey = `tenants_${tier}`;
      const cached = this.tenants.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.tenantCacheTimeout) {
        return cached.data;
      }

      // In production, this would query your tenant registry/database
      // For now, return mock data based on environment
      const mockTenants = await this.getMockTenantsByTier(tier);
      
      // Cache the result
      this.tenants.set(cacheKey, {
        data: mockTenants,
        timestamp: Date.now()
      });

      return mockTenants;

    } catch (error) {
      console.error(`Failed to get tenants for tier ${tier}:`, error);
      return [];
    }
  }

  /**
   * Mock tenant data for testing (replace with real tenant registry query)
   */
  async getMockTenantsByTier(tier) {
    // Check if we're in development/testing mode
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCK_TENANTS === 'true') {
      return [
        {
          id: `mock_${tier}_tenant_1`,
          email: process.env.TEST_EMAIL || 'test@example.com',
          tier,
          status: 'active'
        }
      ];
    }

    // In production, query actual tenant registry
    // This would integrate with your tenant management system
    return [];
  }

  /**
   * Get tenant email with retry logic (enhanced for production use)
   */
  async getTenantEmailWithRetry(tenantId, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // In production, this would query your tenant registry
        // For now, return test email if available
        const email = process.env.TEST_EMAIL || null;
        
        if (email) {
          return email;
        }
        
        // If no test email, attempt to get from tenant registry/database
        const tenantRecord = await this.getTenantFromRegistry(tenantId);
        return tenantRecord?.email || null;
        
      } catch (error) {
        console.error(`Attempt ${attempt}/${maxRetries} - Failed to get email for tenant ${tenantId}:`, error);
        
        if (attempt < maxRetries) {
          await this.delay(1000 * attempt); // Progressive delay
        } else {
          console.error(`Failed to get email for tenant ${tenantId} after ${maxRetries} attempts`);
          return null;
        }
      }
    }
  }

  /**
   * Get tenant email (placeholder for tenant registry integration)
   */
  async getTenantEmail(tenantId) {
    try {
      // In production, this would query your tenant registry
      // For now, return test email if available
      return process.env.TEST_EMAIL || null;
    } catch (error) {
      console.error(`Failed to get email for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Get tenant record from registry/database (placeholder)
   */
  async getTenantFromRegistry(tenantId) {
    try {
      // In production, this would query your tenant management system
      // Could integrate with databases, CRMs, or tenant services
      
      // Mock implementation for development
      if (process.env.NODE_ENV === 'development') {
        return {
          id: tenantId,
          email: process.env.TEST_EMAIL || 'test@example.com',
          tier: 'professional',
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get tenant ${tenantId} from registry:`, error);
      return null;
    }
  }

  /**
   * Log report delivery for audit trail
   */
  async logReportDelivery(tenantId, deliveryData) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        tenantId,
        reportType: deliveryData.reportType,
        frequency: deliveryData.frequency,
        email: deliveryData.email,
        success: deliveryData.success,
        processingTime: deliveryData.processingTime,
        reportSize: deliveryData.reportSize,
        error: deliveryData.error,
        errorStack: deliveryData.errorStack
      };

      // In production, this would write to your audit logging system
      // Options: database, CloudWatch, Datadog, etc.
      console.log('Report delivery audit log:', JSON.stringify(logEntry));
      
      // Could also write to file or external service
      if (process.env.AUDIT_LOG_FILE) {
        const fs = await import('fs/promises');
        await fs.appendFile(
          process.env.AUDIT_LOG_FILE,
          JSON.stringify(logEntry) + '\n',
          'utf8'
        );
      }
      
    } catch (error) {
      console.error('Failed to log report delivery:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const health = await reportGenerator.healthCheck();
      
      if (health.status !== 'healthy') {
        console.warn('Report generator health check failed:', health);
        this.metrics.errors.push({
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
          details: health
        });
      }

      // Cleanup old errors (keep only last 100)
      if (this.metrics.errors.length > 100) {
        this.metrics.errors = this.metrics.errors.slice(-100);
      }

      // Cleanup tenant cache if expired
      const now = Date.now();
      for (const [key, cached] of this.tenants.entries()) {
        if (now - cached.timestamp > this.tenantCacheTimeout) {
          this.tenants.delete(key);
        }
      }

    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Manually trigger reports for testing
   */
  async triggerReportsManually(tier, reportType = 'insights') {
    console.log(`Manually triggering ${tier} reports...`);

    try {
      const tenants = await this.getTenantsByTier(tier);
      const frequency = this.getFrequencyForTier(tier);
      
      const results = await this.processTenantReports(tenants, frequency, reportType);
      
      console.log(`Manual ${tier} reports completed: ${results.success} sent, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error(`Manual ${tier} reports failed:`, error);
      throw error;
    }
  }

  /**
   * Get frequency based on tier
   */
  getFrequencyForTier(tier) {
    const mapping = {
      starter: 'monthly',
      professional: 'weekly',
      enterprise: 'daily'
    };
    return mapping[tier] || 'monthly';
  }

  /**
   * Update execution metrics
   */
  updateExecutionMetrics(frequency, results, startTime) {
    const executionTime = Date.now() - startTime;
    
    this.metrics.jobsExecuted++;
    this.metrics.reportsGenerated += results.success;
    this.metrics.emailsSent += results.success;
    this.metrics.jobsFailed += results.failed > 0 ? 1 : 0;
    this.metrics.avgExecutionTime = 
      (this.metrics.avgExecutionTime + executionTime) / this.metrics.jobsExecuted;
    this.metrics.lastExecution = new Date().toISOString();
  }

  /**
   * Log execution error
   */
  logExecutionError(frequency, error) {
    this.metrics.jobsFailed++;
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      jobType: frequency,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Log next execution times
   */
  logNextExecutions() {
    console.log('\n=== Scheduled Report Jobs ===');
    
    this.jobs.forEach((job, name) => {
      if (name !== 'health-check') {
        console.log(`${name}: Next execution planned`);
      }
    });
    
    console.log('==============================\n');
  }

  /**
   * Get job status
   */
  getJobStatus() {
    const status = {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running || false,
        schedule: this.schedules[name.replace('-reports', '').replace('-', '')] || 'unknown'
      };
    });

    return status;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      cacheSize: this.tenants.size,
      avgExecutionTimeFormatted: `${Math.round(this.metrics.avgExecutionTime)}ms`,
      recentErrors: this.metrics.errors.slice(-5) // Last 5 errors
    };
  }

  /**
   * Clear tenant cache
   */
  clearTenantCache() {
    this.tenants.clear();
    console.log('Tenant cache cleared');
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    console.log('Shutting down scheduled reports service...');
    this.stop();
    this.clearTenantCache();
    console.log('Scheduled reports service shutdown complete');
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    const reporterHealth = await reportGenerator.healthCheck();
    
    return {
      status: this.isRunning && reporterHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      metrics: this.getMetrics(),
      reportGeneratorHealth: reporterHealth.status,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
const scheduledReports = new ScheduledReportsService();

export default scheduledReports;
export { ScheduledReportsService };