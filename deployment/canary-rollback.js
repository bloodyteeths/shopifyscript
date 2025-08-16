#!/usr/bin/env node

/**
 * PROOFKIT CANARY ROLLBACK SYSTEM
 * Automatic safety rollback mechanisms with monitoring triggers
 * P0-7 CRITICAL: Immediate rollback for safety violations
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

// Rollback trigger thresholds
const ROLLBACK_TRIGGERS = {
  BUDGET_BREACH: {
    threshold: 1.1,           // 110% of daily cap
    description: 'Budget exceeded safety threshold'
  },
  CPC_SPIKE: {
    threshold: 1.2,           // 120% of CPC ceiling  
    description: 'CPC exceeded safety ceiling'
  },
  ERROR_FLOOD: {
    threshold: 3,             // 3 errors in 5 minutes
    windowMinutes: 5,
    description: 'Multiple script errors detected'
  },
  PERFORMANCE_DROP: {
    threshold: 0.5,           // 50% of baseline CTR
    description: 'Performance dropped below threshold'
  },
  SPEND_PACE: {
    threshold: 0.5,           // 50% of daily budget in 1 hour
    windowHours: 1,
    description: 'Budget consuming too rapidly'
  },
  QUALITY_SCORE_DROP: {
    threshold: 2,             // Drop of 2+ points
    description: 'Quality score degradation'
  }
};

const ROLLBACK_ACTIONS = {
  IMMEDIATE: 'IMMEDIATE',      // <30 seconds
  URGENT: 'URGENT',           // <2 minutes  
  SCHEDULED: 'SCHEDULED'      // End of window
};

class CanaryRollbackManager {
  constructor(tenant, options = {}) {
    this.tenant = tenant;
    this.options = {
      dryRun: options.dryRun || false,
      autoRollback: options.autoRollback !== false, // Default true
      monitoringInterval: options.monitoringInterval || 30000, // 30 seconds
      ...options
    };
    
    this.isMonitoring = false;
    this.monitoringTimer = null;
    this.rollbackHistory = [];
    this.currentMetrics = {};
    this.baselineMetrics = {};
    this.alerts = [];
    
    this.log('INFO', 'Rollback manager initialized', { tenant, options: this.options });
  }

  log(level, message, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      tenant: this.tenant
    };
    
    console.log(`[${level}] [ROLLBACK-${this.tenant}] ${message}`, 
      Object.keys(details).length ? details : '');
    
    // Store alerts for reporting
    if (level === 'ERROR' || level === 'CRITICAL') {
      this.alerts.push(entry);
    }
  }

  // Start continuous monitoring
  async startMonitoring(baselineMetrics = {}) {
    if (this.isMonitoring) {
      this.log('WARN', 'Monitoring already active');
      return;
    }
    
    this.baselineMetrics = { ...baselineMetrics };
    this.isMonitoring = true;
    
    this.log('INFO', 'Starting canary monitoring', { 
      interval: this.options.monitoringInterval,
      autoRollback: this.options.autoRollback
    });
    
    // Start monitoring loop
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.checkTriggers();
      } catch (error) {
        this.log('ERROR', 'Monitoring check failed', { error: error.message });
      }
    }, this.options.monitoringInterval);
    
    // Initial baseline collection
    await this.updateCurrentMetrics();
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.isMonitoring = false;
    this.log('INFO', 'Monitoring stopped');
  }

  // Check all rollback triggers
  async checkTriggers() {
    await this.updateCurrentMetrics();
    
    const triggers = [
      this.checkBudgetBreach(),
      this.checkCPCSpike(),
      this.checkErrorFlood(),
      this.checkPerformanceDrop(),
      this.checkSpendPace(),
      this.checkQualityScoreDrop()
    ];
    
    for (const trigger of triggers) {
      if (trigger.triggered) {
        await this.handleTrigger(trigger);
      }
    }
  }

  // Update current performance metrics
  async updateCurrentMetrics() {
    try {
      // Fetch current campaign metrics
      const response = await fetch(`http://localhost:3001/api/campaigns/${this.tenant}/metrics`);
      if (response.ok) {
        const data = await response.json();
        this.currentMetrics = {
          ...data,
          timestamp: Date.now(),
          spend: parseFloat(data.spend || '0'),
          clicks: parseInt(data.clicks || '0'),
          impressions: parseInt(data.impressions || '0'),
          avgCPC: parseFloat(data.avgCPC || '0'),
          ctr: parseFloat(data.ctr || '0'),
          qualityScore: parseFloat(data.qualityScore || '0')
        };
      }
      
      // Fetch error logs
      const errorResponse = await fetch(`http://localhost:3001/api/logs/${this.tenant}/errors`);
      if (errorResponse.ok) {
        const errorData = await errorResponse.json();
        this.currentMetrics.recentErrors = errorData.errors || [];
      }
      
    } catch (error) {
      this.log('ERROR', 'Failed to update metrics', { error: error.message });
    }
  }

  // Check budget breach trigger
  checkBudgetBreach() {
    const dailyBudget = this.baselineMetrics.dailyBudget || 0;
    const currentSpend = this.currentMetrics.spend || 0;
    const threshold = dailyBudget * ROLLBACK_TRIGGERS.BUDGET_BREACH.threshold;
    
    const triggered = currentSpend > threshold;
    
    return {
      name: 'BUDGET_BREACH',
      triggered,
      severity: ROLLBACK_ACTIONS.IMMEDIATE,
      details: {
        currentSpend,
        dailyBudget,
        threshold,
        breachPercentage: dailyBudget > 0 ? (currentSpend / dailyBudget) * 100 : 0
      },
      message: `Budget breach: $${currentSpend.toFixed(2)} exceeds $${threshold.toFixed(2)} threshold`
    };
  }

  // Check CPC spike trigger
  checkCPCSpike() {
    const cpcCeiling = this.baselineMetrics.cpcCeiling || 0;
    const currentCPC = this.currentMetrics.avgCPC || 0;
    const threshold = cpcCeiling * ROLLBACK_TRIGGERS.CPC_SPIKE.threshold;
    
    const triggered = currentCPC > threshold;
    
    return {
      name: 'CPC_SPIKE',
      triggered,
      severity: ROLLBACK_ACTIONS.IMMEDIATE,
      details: {
        currentCPC,
        cpcCeiling,
        threshold,
        spikePercentage: cpcCeiling > 0 ? (currentCPC / cpcCeiling) * 100 : 0
      },
      message: `CPC spike: $${currentCPC.toFixed(2)} exceeds $${threshold.toFixed(2)} threshold`
    };
  }

  // Check error flood trigger
  checkErrorFlood() {
    const recentErrors = this.currentMetrics.recentErrors || [];
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentErrorCount = recentErrors.filter(error => 
      new Date(error.timestamp).getTime() > fiveMinutesAgo
    ).length;
    
    const triggered = recentErrorCount >= ROLLBACK_TRIGGERS.ERROR_FLOOD.threshold;
    
    return {
      name: 'ERROR_FLOOD',
      triggered,
      severity: ROLLBACK_ACTIONS.URGENT,
      details: {
        recentErrorCount,
        threshold: ROLLBACK_TRIGGERS.ERROR_FLOOD.threshold,
        windowMinutes: ROLLBACK_TRIGGERS.ERROR_FLOOD.windowMinutes,
        errors: recentErrors.slice(0, 5) // Last 5 errors for context
      },
      message: `Error flood: ${recentErrorCount} errors in 5 minutes`
    };
  }

  // Check performance drop trigger
  checkPerformanceDrop() {
    const baselineCTR = this.baselineMetrics.ctr || 0;
    const currentCTR = this.currentMetrics.ctr || 0;
    const threshold = baselineCTR * ROLLBACK_TRIGGERS.PERFORMANCE_DROP.threshold;
    
    const triggered = baselineCTR > 0 && currentCTR < threshold;
    
    return {
      name: 'PERFORMANCE_DROP',
      triggered,
      severity: ROLLBACK_ACTIONS.URGENT,
      details: {
        currentCTR,
        baselineCTR,
        threshold,
        dropPercentage: baselineCTR > 0 ? ((baselineCTR - currentCTR) / baselineCTR) * 100 : 0
      },
      message: `Performance drop: CTR ${(currentCTR * 100).toFixed(2)}% below ${(threshold * 100).toFixed(2)}% threshold`
    };
  }

  // Check spend pace trigger
  checkSpendPace() {
    const dailyBudget = this.baselineMetrics.dailyBudget || 0;
    const currentSpend = this.currentMetrics.spend || 0;
    const threshold = dailyBudget * ROLLBACK_TRIGGERS.SPEND_PACE.threshold;
    
    // Check if we're in the first hour (this is a simplified check)
    const windowStart = this.baselineMetrics.windowStart || Date.now();
    const hoursSinceStart = (Date.now() - windowStart) / (1000 * 60 * 60);
    
    const triggered = hoursSinceStart <= 1 && currentSpend > threshold;
    
    return {
      name: 'SPEND_PACE',
      triggered,
      severity: ROLLBACK_ACTIONS.URGENT,
      details: {
        currentSpend,
        dailyBudget,
        threshold,
        hoursSinceStart,
        pacePercentage: dailyBudget > 0 ? (currentSpend / dailyBudget) * 100 : 0
      },
      message: `Rapid spend pace: $${currentSpend.toFixed(2)} in ${hoursSinceStart.toFixed(1)} hours`
    };
  }

  // Check quality score drop trigger
  checkQualityScoreDrop() {
    const baselineQS = this.baselineMetrics.qualityScore || 0;
    const currentQS = this.currentMetrics.qualityScore || 0;
    const drop = baselineQS - currentQS;
    
    const triggered = drop >= ROLLBACK_TRIGGERS.QUALITY_SCORE_DROP.threshold;
    
    return {
      name: 'QUALITY_SCORE_DROP',
      triggered,
      severity: ROLLBACK_ACTIONS.SCHEDULED,
      details: {
        currentQS,
        baselineQS,
        drop,
        threshold: ROLLBACK_TRIGGERS.QUALITY_SCORE_DROP.threshold
      },
      message: `Quality score drop: ${drop.toFixed(1)} point decrease`
    };
  }

  // Handle triggered rollback
  async handleTrigger(trigger) {
    this.log('CRITICAL', `Rollback trigger activated: ${trigger.name}`, trigger.details);
    
    if (!this.options.autoRollback) {
      this.log('WARN', 'Auto-rollback disabled - manual intervention required');
      return;
    }
    
    if (this.options.dryRun) {
      this.log('INFO', 'DRY RUN: Would execute rollback', trigger);
      return;
    }
    
    // Execute rollback based on severity
    switch (trigger.severity) {
      case ROLLBACK_ACTIONS.IMMEDIATE:
        await this.executeImmediateRollback(trigger);
        break;
      case ROLLBACK_ACTIONS.URGENT:
        await this.executeUrgentRollback(trigger);
        break;
      case ROLLBACK_ACTIONS.SCHEDULED:
        await this.scheduleRollback(trigger);
        break;
    }
  }

  // Execute immediate rollback (<30 seconds)
  async executeImmediateRollback(trigger) {
    this.log('CRITICAL', 'Executing IMMEDIATE rollback', trigger);
    
    const rollbackStart = Date.now();
    const rollbackId = `immediate_${rollbackStart}`;
    
    try {
      // 1. Disable PROMOTE immediately
      await this.setPromoteFlag(false, 'immediate_safety_trigger');
      
      // 2. Pause campaign in Google Ads
      await this.pauseCampaign();
      
      // 3. Clear audience mappings
      await this.clearAudienceMappings();
      
      // 4. Stop monitoring
      this.stopMonitoring();
      
      const rollbackTime = Date.now() - rollbackStart;
      
      this.rollbackHistory.push({
        id: rollbackId,
        trigger: trigger.name,
        severity: trigger.severity,
        executionTimeMs: rollbackTime,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      this.log('INFO', `Immediate rollback completed in ${rollbackTime}ms`, { rollbackId });
      
    } catch (error) {
      this.log('ERROR', 'Immediate rollback failed', { error: error.message, rollbackId });
      throw error;
    }
  }

  // Execute urgent rollback (<2 minutes)
  async executeUrgentRollback(trigger) {
    this.log('CRITICAL', 'Executing URGENT rollback', trigger);
    
    const rollbackStart = Date.now();
    const rollbackId = `urgent_${rollbackStart}`;
    
    try {
      // 1. Disable PROMOTE
      await this.setPromoteFlag(false, 'urgent_safety_trigger');
      
      // 2. Reset budget to original limits
      await this.resetBudgetLimits();
      
      // 3. Clear audience mappings
      await this.clearAudienceMappings();
      
      // 4. Revert schedule changes
      await this.revertScheduleChanges();
      
      // 5. Pause campaign if needed
      if (trigger.name === 'ERROR_FLOOD') {
        await this.pauseCampaign();
      }
      
      const rollbackTime = Date.now() - rollbackStart;
      
      this.rollbackHistory.push({
        id: rollbackId,
        trigger: trigger.name,
        severity: trigger.severity,
        executionTimeMs: rollbackTime,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      this.log('INFO', `Urgent rollback completed in ${rollbackTime}ms`, { rollbackId });
      
    } catch (error) {
      this.log('ERROR', 'Urgent rollback failed', { error: error.message, rollbackId });
      throw error;
    }
  }

  // Schedule rollback for end of window
  async scheduleRollback(trigger) {
    this.log('WARN', 'Scheduling end-of-window rollback', trigger);
    
    // Set flag to disable PROMOTE at end of window
    await this.setPromoteFlag(false, 'scheduled_rollback');
    
    this.rollbackHistory.push({
      id: `scheduled_${Date.now()}`,
      trigger: trigger.name,
      severity: trigger.severity,
      timestamp: new Date().toISOString(),
      scheduled: true
    });
  }

  // Core rollback actions
  async setPromoteFlag(value, reason) {
    try {
      const response = await fetch(`http://localhost:3001/api/config/${this.tenant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'PROMOTE',
          value: String(value).toUpperCase(),
          reason
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to set PROMOTE flag: ${response.statusText}`);
      }
      
      this.log('INFO', `PROMOTE flag set to ${value}`, { reason });
      
    } catch (error) {
      this.log('ERROR', 'Failed to set PROMOTE flag', { error: error.message });
      throw error;
    }
  }

  async pauseCampaign() {
    try {
      const response = await fetch(`http://localhost:3001/api/campaigns/${this.tenant}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'safety_rollback' })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to pause campaign: ${response.statusText}`);
      }
      
      this.log('INFO', 'Campaign paused for safety');
      
    } catch (error) {
      this.log('ERROR', 'Failed to pause campaign', { error: error.message });
      throw error;
    }
  }

  async clearAudienceMappings() {
    try {
      const response = await fetch(`http://localhost:3001/api/audiences/${this.tenant}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'safety_rollback' })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear audience mappings: ${response.statusText}`);
      }
      
      this.log('INFO', 'Audience mappings cleared');
      
    } catch (error) {
      this.log('ERROR', 'Failed to clear audience mappings', { error: error.message });
      throw error;
    }
  }

  async resetBudgetLimits() {
    try {
      const response = await fetch(`http://localhost:3001/api/campaigns/${this.tenant}/reset-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: 'safety_rollback',
          originalBudget: this.baselineMetrics.originalBudget 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset budget: ${response.statusText}`);
      }
      
      this.log('INFO', 'Budget limits reset to original values');
      
    } catch (error) {
      this.log('ERROR', 'Failed to reset budget limits', { error: error.message });
      throw error;
    }
  }

  async revertScheduleChanges() {
    try {
      const response = await fetch(`http://localhost:3001/api/campaigns/${this.tenant}/reset-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: 'safety_rollback',
          originalSchedule: this.baselineMetrics.originalSchedule 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset schedule: ${response.statusText}`);
      }
      
      this.log('INFO', 'Schedule reverted to original settings');
      
    } catch (error) {
      this.log('ERROR', 'Failed to revert schedule', { error: error.message });
      throw error;
    }
  }

  // Manual rollback trigger
  async manualRollback(reason = 'manual_trigger') {
    this.log('WARN', `Manual rollback triggered: ${reason}`);
    
    const trigger = {
      name: 'MANUAL',
      severity: ROLLBACK_ACTIONS.URGENT,
      details: { reason },
      message: `Manual rollback: ${reason}`
    };
    
    await this.executeUrgentRollback(trigger);
  }

  // Generate rollback status report
  generateStatusReport() {
    return {
      tenant: this.tenant,
      timestamp: new Date().toISOString(),
      monitoring: {
        active: this.isMonitoring,
        interval: this.options.monitoringInterval,
        autoRollback: this.options.autoRollback
      },
      currentMetrics: this.currentMetrics,
      baselineMetrics: this.baselineMetrics,
      rollbackHistory: this.rollbackHistory,
      alerts: this.alerts,
      triggers: Object.keys(ROLLBACK_TRIGGERS).map(key => ({
        name: key,
        threshold: ROLLBACK_TRIGGERS[key].threshold,
        description: ROLLBACK_TRIGGERS[key].description
      }))
    };
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const tenant = process.argv[3];
  
  if (!command || !tenant) {
    console.error('Usage: node canary-rollback.js <command> <tenant> [options]');
    console.error('Commands: start, stop, status, manual-rollback');
    process.exit(1);
  }
  
  const manager = new CanaryRollbackManager(tenant, {
    dryRun: process.argv.includes('--dry-run'),
    autoRollback: !process.argv.includes('--no-auto')
  });
  
  switch (command) {
    case 'start':
      manager.startMonitoring({
        dailyBudget: parseFloat(process.argv[4]) || 5.0,
        cpcCeiling: parseFloat(process.argv[5]) || 0.25,
        windowStart: Date.now()
      });
      break;
      
    case 'stop':
      manager.stopMonitoring();
      break;
      
    case 'status':
      console.log(JSON.stringify(manager.generateStatusReport(), null, 2));
      break;
      
    case 'manual-rollback':
      const reason = process.argv[4] || 'manual_intervention';
      manager.manualRollback(reason);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

export { CanaryRollbackManager, ROLLBACK_TRIGGERS, ROLLBACK_ACTIONS };