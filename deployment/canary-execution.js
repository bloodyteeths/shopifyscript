#!/usr/bin/env node

/**
 * PROOFKIT CANARY EXECUTION SYSTEM
 * Time-boxed execution with comprehensive monitoring and automatic safety controls
 * P0-7 CRITICAL: Safe execution of canary deployments with real-time oversight
 */

import { createRequire } from 'module';
import { CanaryValidator } from './canary-validation.js';
import { CanaryRollbackManager } from './canary-rollback.js';
import { AudienceValidator } from './audience-validation.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

// Execution phases and timing
const EXECUTION_PHASES = {
  PREPARATION: {
    name: 'PREPARATION',
    duration: 120000,      // 2 minutes
    description: 'Pre-flight validation and setup'
  },
  ACTIVE: {
    name: 'ACTIVE', 
    duration: null,        // User-defined window
    description: 'Active canary testing'
  },
  COOLDOWN: {
    name: 'COOLDOWN',
    duration: 300000,      // 5 minutes
    description: 'Post-test monitoring and data collection'
  },
  COMPLETE: {
    name: 'COMPLETE',
    duration: 0,
    description: 'Test completed successfully'
  }
};

const MONITORING_INTERVALS = {
  VALIDATION: 10000,       // 10 seconds during prep
  ACTIVE: 15000,          // 15 seconds during test
  COOLDOWN: 30000         // 30 seconds during cooldown
};

class CanaryExecutor {
  constructor(tenant, config = {}) {
    this.tenant = tenant;
    this.config = {
      windowDuration: config.windowDuration || 3600000, // 1 hour default
      startDelay: config.startDelay || 120000,          // 2 minute delay
      autoRollback: config.autoRollback !== false,
      strictValidation: config.strictValidation || false,
      dryRun: config.dryRun || false,
      ...config
    };
    
    this.currentPhase = null;
    this.phaseStartTime = null;
    this.executionStartTime = null;
    this.windowEndTime = null;
    
    this.validator = new CanaryValidator(tenant);
    this.rollbackManager = new CanaryRollbackManager(tenant, {
      autoRollback: this.config.autoRollback,
      dryRun: this.config.dryRun
    });
    this.audienceValidator = new AudienceValidator(tenant);
    
    this.monitoringTimer = null;
    this.executionLog = [];
    this.performanceMetrics = [];
    this.alertLog = [];
    
    this.log('INFO', 'Canary executor initialized', { tenant, config: this.config });
  }

  log(level, message, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      tenant: this.tenant,
      phase: this.currentPhase,
      elapsed: this.executionStartTime ? Date.now() - this.executionStartTime : 0
    };
    
    this.executionLog.push(entry);
    
    if (level === 'ERROR' || level === 'CRITICAL') {
      this.alertLog.push(entry);
    }
    
    console.log(`[${level}] [EXECUTE-${this.tenant}] [${this.currentPhase || 'INIT'}] ${message}`, 
      Object.keys(details).length ? details : '');
  }

  // Main execution workflow
  async executeCanaryTest(testConfig) {
    this.executionStartTime = Date.now();
    this.log('INFO', 'Starting time-boxed canary execution', testConfig);
    
    try {
      // Phase 1: Preparation and Validation
      await this.runPreparationPhase(testConfig);
      
      // Phase 2: Active Testing Window
      await this.runActivePhase(testConfig);
      
      // Phase 3: Cooldown and Analysis
      await this.runCooldownPhase();
      
      // Phase 4: Completion
      await this.runCompletionPhase();
      
      return this.generateFinalReport(true);
      
    } catch (error) {
      this.log('CRITICAL', 'Canary execution failed', {
        error: error.message,
        stack: error.stack,
        phase: this.currentPhase
      });
      
      // Emergency rollback
      await this.emergencyStop('execution_error');
      return this.generateFinalReport(false);
    }
  }

  // Phase 1: Preparation and Validation (2 minutes)
  async runPreparationPhase(testConfig) {
    this.currentPhase = EXECUTION_PHASES.PREPARATION.name;
    this.phaseStartTime = Date.now();
    
    this.log('INFO', 'Entering preparation phase', {
      duration: EXECUTION_PHASES.PREPARATION.duration,
      startDelay: this.config.startDelay
    });
    
    // Start preparation monitoring
    this.startPhaseMonitoring(MONITORING_INTERVALS.VALIDATION);
    
    try {
      // Step 1: Environment validation
      await this.validateEnvironment();
      
      // Step 2: Configuration validation
      await this.validateConfiguration(testConfig);
      
      // Step 3: Audience validation (if configured)
      if (testConfig.audienceConfig) {
        await this.validateAudience(testConfig.audienceConfig);
      }
      
      // Step 4: Safety checks
      await this.performSafetyChecks(testConfig);
      
      // Step 5: Baseline collection
      await this.collectBaseline(testConfig);
      
      // Step 6: Pre-flight API test
      await this.performPreflightTest(testConfig);
      
      // Wait for scheduled start time
      await this.waitForStartTime();
      
      this.log('INFO', 'Preparation phase completed successfully');
      
    } catch (error) {
      this.log('ERROR', 'Preparation phase failed', { error: error.message });
      throw error;
    } finally {
      this.stopPhaseMonitoring();
    }
  }

  // Phase 2: Active Testing Window (user-defined duration)
  async runActivePhase(testConfig) {
    this.currentPhase = EXECUTION_PHASES.ACTIVE.name;
    this.phaseStartTime = Date.now();
    this.windowEndTime = this.phaseStartTime + this.config.windowDuration;
    
    this.log('INFO', 'Entering active testing phase', {
      duration: this.config.windowDuration,
      endTime: new Date(this.windowEndTime).toISOString()
    });
    
    // Start active monitoring with rollback detection
    this.startPhaseMonitoring(MONITORING_INTERVALS.ACTIVE);
    await this.rollbackManager.startMonitoring(this.getBaselineMetrics());
    
    try {
      // Step 1: Enable PROMOTE flag
      await this.enablePromote('window_start');
      
      // Step 2: Execute initial script run
      await this.executeInitialRun(testConfig);
      
      // Step 3: Verify changes applied
      await this.verifyChangesApplied(testConfig);
      
      // Step 4: Monitor active window
      await this.monitorActiveWindow();
      
      // Step 5: Disable PROMOTE at end
      await this.disablePromote('window_end');
      
      this.log('INFO', 'Active phase completed successfully');
      
    } catch (error) {
      this.log('ERROR', 'Active phase failed', { error: error.message });
      await this.disablePromote('error_recovery');
      throw error;
    } finally {
      this.rollbackManager.stopMonitoring();
      this.stopPhaseMonitoring();
    }
  }

  // Phase 3: Cooldown and Analysis (5 minutes)
  async runCooldownPhase() {
    this.currentPhase = EXECUTION_PHASES.COOLDOWN.name;
    this.phaseStartTime = Date.now();
    
    this.log('INFO', 'Entering cooldown phase', {
      duration: EXECUTION_PHASES.COOLDOWN.duration
    });
    
    this.startPhaseMonitoring(MONITORING_INTERVALS.COOLDOWN);
    
    try {
      // Step 1: Collect final metrics
      await this.collectFinalMetrics();
      
      // Step 2: Verify PROMOTE is disabled
      await this.verifyPromoteDisabled();
      
      // Step 3: Monitor for any delayed effects
      await this.monitorDelayedEffects();
      
      // Step 4: Generate performance analysis
      await this.analyzePerformance();
      
      // Step 5: Validate cleanup
      await this.validateCleanup();
      
      this.log('INFO', 'Cooldown phase completed successfully');
      
    } catch (error) {
      this.log('ERROR', 'Cooldown phase failed', { error: error.message });
      throw error;
    } finally {
      this.stopPhaseMonitoring();
    }
  }

  // Phase 4: Completion
  async runCompletionPhase() {
    this.currentPhase = EXECUTION_PHASES.COMPLETE.name;
    this.phaseStartTime = Date.now();
    
    this.log('INFO', 'Entering completion phase');
    
    try {
      // Generate final reports
      const finalReport = this.generateFinalReport(true);
      
      // Save execution data
      await this.saveExecutionData(finalReport);
      
      // Send notifications
      await this.sendCompletionNotifications(finalReport);
      
      this.log('INFO', 'Canary test execution completed successfully', {
        totalDuration: Date.now() - this.executionStartTime,
        phases: Object.keys(EXECUTION_PHASES).length
      });
      
    } catch (error) {
      this.log('ERROR', 'Completion phase failed', { error: error.message });
      throw error;
    }
  }

  // Monitoring and safety functions
  startPhaseMonitoring(interval) {
    this.stopPhaseMonitoring(); // Ensure no duplicate timers
    
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performPeriodicCheck();
      } catch (error) {
        this.log('ERROR', 'Monitoring check failed', { error: error.message });
      }
    }, interval);
    
    this.log('INFO', `Started phase monitoring`, { interval });
  }

  stopPhaseMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.log('INFO', 'Stopped phase monitoring');
    }
  }

  async performPeriodicCheck() {
    // Collect current metrics
    const metrics = await this.collectCurrentMetrics();
    this.performanceMetrics.push({
      timestamp: Date.now(),
      phase: this.currentPhase,
      ...metrics
    });
    
    // Check phase timeout
    if (this.phaseStartTime) {
      const phaseElapsed = Date.now() - this.phaseStartTime;
      const phaseInfo = EXECUTION_PHASES[this.currentPhase];
      
      if (phaseInfo.duration && phaseElapsed > phaseInfo.duration * 1.2) {
        this.log('WARNING', 'Phase duration exceeded expected time', {
          phase: this.currentPhase,
          elapsed: phaseElapsed,
          expected: phaseInfo.duration
        });
      }
    }
    
    // Check window timeout for active phase
    if (this.currentPhase === 'ACTIVE' && this.windowEndTime) {
      if (Date.now() > this.windowEndTime) {
        this.log('INFO', 'Active window time limit reached');
        await this.disablePromote('time_limit');
      }
    }
  }

  // Validation functions
  async validateEnvironment() {
    this.log('INFO', 'Validating execution environment');
    
    // Backend health check
    const response = await fetch('http://localhost:3001/api/diagnostics');
    if (!response.ok) {
      throw new Error('Backend health check failed');
    }
    
    const diagnostics = await response.json();
    if (!diagnostics.sheets_ok) {
      throw new Error('Sheets connection not available');
    }
  }

  async validateConfiguration(testConfig) {
    this.log('INFO', 'Validating test configuration');
    
    const validationReport = await this.validator.runFullValidation(testConfig);
    
    if (!validationReport.summary.passed) {
      throw new Error(`Configuration validation failed: ${validationReport.criticalErrors.length} critical errors`);
    }
    
    if (this.config.strictValidation && validationReport.summary.warnings > 0) {
      throw new Error(`Strict validation failed: ${validationReport.summary.warnings} warnings detected`);
    }
  }

  async validateAudience(audienceConfig) {
    this.log('INFO', 'Validating audience configuration');
    
    const audienceReport = await this.audienceValidator.validateAudienceAttachment(audienceConfig);
    
    if (!audienceReport.passed) {
      throw new Error(`Audience validation failed: ${audienceReport.summary.errors} errors`);
    }
  }

  async performSafetyChecks(testConfig) {
    this.log('INFO', 'Performing safety checks');
    
    // Check budget limits
    if (testConfig.budgetCaps) {
      const maxBudget = Math.max(...testConfig.budgetCaps.map(b => parseFloat(b)));
      if (maxBudget > 10) {
        throw new Error(`Budget cap too high for canary: $${maxBudget}`);
      }
    }
    
    // Check window duration
    if (this.config.windowDuration > 4 * 60 * 60 * 1000) { // 4 hours
      throw new Error(`Window duration too long: ${this.config.windowDuration}ms`);
    }
    
    // Verify single campaign
    if (!testConfig.campaignName || Array.isArray(testConfig.campaignName)) {
      throw new Error('Must specify exactly one canary campaign');
    }
  }

  async collectBaseline(testConfig) {
    this.log('INFO', 'Collecting baseline performance metrics');
    
    const response = await fetch(`http://localhost:3001/api/campaigns/${this.tenant}/baseline`);
    if (response.ok) {
      const baseline = await response.json();
      this.baselineMetrics = baseline;
    }
  }

  async performPreflightTest(testConfig) {
    this.log('INFO', 'Performing pre-flight script test');
    
    // Run script in preview mode (PROMOTE=false)
    const response = await fetch(`http://localhost:3001/api/scripts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: this.tenant })
    });
    
    if (!response.ok) {
      throw new Error('Pre-flight script test failed');
    }
    
    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
      throw new Error(`Pre-flight test found errors: ${result.errors.join(', ')}`);
    }
  }

  async waitForStartTime() {
    const now = Date.now();
    const startTime = now + this.config.startDelay;
    const waitTime = startTime - now;
    
    if (waitTime > 0) {
      this.log('INFO', `Waiting ${Math.round(waitTime/1000)}s for scheduled start time`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Active phase functions
  async enablePromote(reason) {
    this.log('INFO', `Enabling PROMOTE flag: ${reason}`);
    
    if (this.config.dryRun) {
      this.log('INFO', 'DRY RUN: Would enable PROMOTE flag');
      return;
    }
    
    const response = await fetch(`http://localhost:3001/api/config/${this.tenant}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'PROMOTE',
        value: 'TRUE',
        reason
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to enable PROMOTE: ${response.statusText}`);
    }
  }

  async disablePromote(reason) {
    this.log('INFO', `Disabling PROMOTE flag: ${reason}`);
    
    if (this.config.dryRun) {
      this.log('INFO', 'DRY RUN: Would disable PROMOTE flag');
      return;
    }
    
    const response = await fetch(`http://localhost:3001/api/config/${this.tenant}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'PROMOTE',
        value: 'FALSE',
        reason
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to disable PROMOTE: ${response.statusText}`);
    }
  }

  async executeInitialRun(testConfig) {
    this.log('INFO', 'Executing initial script run');
    
    if (this.config.dryRun) {
      this.log('INFO', 'DRY RUN: Would execute initial script run');
      return;
    }
    
    const response = await fetch(`http://localhost:3001/api/scripts/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant: this.tenant })
    });
    
    if (!response.ok) {
      throw new Error(`Initial script run failed: ${response.statusText}`);
    }
  }

  async verifyChangesApplied(testConfig) {
    this.log('INFO', 'Verifying changes were applied correctly');
    
    // Check Google Ads change history
    const response = await fetch(`http://localhost:3001/api/google-ads/changes/${this.tenant}`);
    if (response.ok) {
      const changes = await response.json();
      if (changes.length === 0) {
        this.log('WARNING', 'No changes detected in Google Ads change history');
      } else {
        this.log('INFO', `${changes.length} changes detected in Google Ads`);
      }
    }
  }

  async monitorActiveWindow() {
    this.log('INFO', 'Monitoring active window');
    
    // Active monitoring is handled by the periodic checks
    // This function can be used for any active-phase specific monitoring
    
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (Date.now() >= this.windowEndTime || this.currentPhase !== 'ACTIVE') {
          resolve();
        } else {
          setTimeout(checkComplete, 5000); // Check every 5 seconds
        }
      };
      checkComplete();
    });
  }

  // Utility functions
  async collectCurrentMetrics() {
    try {
      const response = await fetch(`http://localhost:3001/api/campaigns/${this.tenant}/metrics`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      this.log('ERROR', 'Failed to collect metrics', { error: error.message });
    }
    return {};
  }

  getBaselineMetrics() {
    return {
      dailyBudget: 5.0, // Default safe budget
      cpcCeiling: 0.25, // Default safe CPC
      windowStart: this.phaseStartTime,
      originalBudget: this.baselineMetrics?.budget,
      originalSchedule: this.baselineMetrics?.schedule,
      ...this.baselineMetrics
    };
  }

  async emergencyStop(reason) {
    this.log('CRITICAL', `Emergency stop triggered: ${reason}`);
    
    try {
      // Stop all monitoring
      this.stopPhaseMonitoring();
      this.rollbackManager.stopMonitoring();
      
      // Execute emergency rollback
      await this.rollbackManager.manualRollback(reason);
      
      // Disable PROMOTE
      await this.disablePromote('emergency_stop');
      
    } catch (error) {
      this.log('ERROR', 'Emergency stop failed', { error: error.message });
    }
  }

  async collectFinalMetrics() {
    this.log('INFO', 'Collecting final performance metrics');
    this.finalMetrics = await this.collectCurrentMetrics();
  }

  async verifyPromoteDisabled() {
    this.log('INFO', 'Verifying PROMOTE flag is disabled');
    
    const response = await fetch(`http://localhost:3001/api/config/${this.tenant}/PROMOTE`);
    if (response.ok) {
      const config = await response.json();
      if (config.value !== 'FALSE') {
        this.log('WARNING', 'PROMOTE flag not properly disabled', { value: config.value });
      }
    }
  }

  async monitorDelayedEffects() {
    this.log('INFO', 'Monitoring for delayed effects');
    
    // Wait and collect metrics to check for any delayed impacts
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    const delayedMetrics = await this.collectCurrentMetrics();
    
    if (delayedMetrics.spend > this.finalMetrics.spend) {
      this.log('WARNING', 'Detected additional spend after window end', {
        finalSpend: this.finalMetrics.spend,
        delayedSpend: delayedMetrics.spend
      });
    }
  }

  async analyzePerformance() {
    this.log('INFO', 'Analyzing canary performance');
    
    if (!this.baselineMetrics || !this.finalMetrics) {
      this.log('WARNING', 'Insufficient data for performance analysis');
      return;
    }
    
    const analysis = {
      spendDelta: this.finalMetrics.spend - (this.baselineMetrics.spend || 0),
      ctrDelta: this.finalMetrics.ctr - (this.baselineMetrics.ctr || 0),
      cpcDelta: this.finalMetrics.avgCPC - (this.baselineMetrics.avgCPC || 0),
      impressionsDelta: this.finalMetrics.impressions - (this.baselineMetrics.impressions || 0)
    };
    
    this.performanceAnalysis = analysis;
    this.log('INFO', 'Performance analysis completed', analysis);
  }

  async validateCleanup() {
    this.log('INFO', 'Validating proper cleanup');
    
    // Verify PROMOTE is false
    await this.verifyPromoteDisabled();
    
    // Check for any active schedules
    const response = await fetch(`http://localhost:3001/api/promote/status`);
    if (response.ok) {
      const status = await response.json();
      if (status.window?.state === 'on') {
        this.log('WARNING', 'Promote window still active after test');
      }
    }
  }

  async saveExecutionData(report) {
    const fileName = `canary-execution-${this.tenant}-${Date.now()}.json`;
    const filePath = path.join(process.cwd(), 'logs', fileName);
    
    try {
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      this.log('INFO', 'Execution data saved', { filePath });
    } catch (error) {
      this.log('ERROR', 'Failed to save execution data', { error: error.message });
    }
  }

  async sendCompletionNotifications(report) {
    this.log('INFO', 'Sending completion notifications');
    
    // Send notification to monitoring systems, Slack, etc.
    // Implementation depends on available notification channels
  }

  generateFinalReport(success) {
    const totalDuration = Date.now() - this.executionStartTime;
    
    return {
      tenant: this.tenant,
      timestamp: new Date().toISOString(),
      success,
      execution: {
        startTime: new Date(this.executionStartTime).toISOString(),
        totalDuration,
        phases: EXECUTION_PHASES,
        currentPhase: this.currentPhase
      },
      configuration: this.config,
      metrics: {
        baseline: this.baselineMetrics,
        final: this.finalMetrics,
        performance: this.performanceMetrics,
        analysis: this.performanceAnalysis
      },
      logs: {
        execution: this.executionLog,
        alerts: this.alertLog
      },
      rollback: this.rollbackManager.generateStatusReport(),
      recommendations: this.generateRecommendations(success)
    };
  }

  generateRecommendations(success) {
    if (!success) {
      return {
        immediate: ['Review error logs', 'Verify system state', 'Plan remediation'],
        next: ['Fix identified issues', 'Re-run validation', 'Consider smaller test window']
      };
    }
    
    const warningCount = this.alertLog.filter(a => a.level === 'WARNING').length;
    
    if (warningCount > 5) {
      return {
        immediate: ['Review warning messages', 'Verify all metrics'],
        next: ['Address warnings before scaling', 'Consider additional monitoring']
      };
    }
    
    return {
      immediate: ['Review performance analysis', 'Document lessons learned'],
      next: ['Consider gradual scaling', 'Plan next test phase', 'Enable additional features']
    };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tenant = process.argv[2];
  const configFile = process.argv[3];
  
  if (!tenant) {
    console.error('Usage: node canary-execution.js <tenant> [config-file]');
    process.exit(1);
  }
  
  const executor = new CanaryExecutor(tenant, {
    dryRun: process.argv.includes('--dry-run'),
    strictValidation: process.argv.includes('--strict'),
    autoRollback: !process.argv.includes('--no-rollback')
  });
  
  let testConfig = {};
  if (configFile && fs.existsSync(configFile)) {
    try {
      testConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (error) {
      console.error('Failed to parse config file:', error.message);
      process.exit(1);
    }
  }
  
  executor.executeCanaryTest(testConfig)
    .then(report => {
      console.log('\n=== CANARY EXECUTION REPORT ===');
      console.log(JSON.stringify(report, null, 2));
      
      if (report.success) {
        console.log('\n✅ CANARY TEST COMPLETED SUCCESSFULLY');
        process.exit(0);
      } else {
        console.log('\n❌ CANARY TEST FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Canary execution failed:', error);
      process.exit(1);
    });
}

export { CanaryExecutor, EXECUTION_PHASES, MONITORING_INTERVALS };