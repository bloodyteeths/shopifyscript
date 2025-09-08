/**
 * AI Automation Logging and Monitoring Service for ProofKit SaaS
 * Comprehensive logging, monitoring, and alerting for AI operations
 * 
 * Features:
 * - Detailed operation logging with performance metrics
 * - Real-time monitoring and health checks
 * - Automated alert generation for issues
 * - Performance analytics and reporting
 * - Cost analysis and optimization tracking
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * AI Logger Service for comprehensive monitoring
 */
export class AILoggerService {
  constructor() {
    this.logs = new Map(); // tenant -> log entries
    this.alerts = new Map(); // tenant -> active alerts
    this.metrics = new Map(); // tenant -> performance metrics
    this.healthStatus = new Map(); // tenant -> health status
    
    // Logging configuration
    this.config = {
      logLevel: process.env.AI_LOG_LEVEL || 'info',
      maxLogsPerTenant: 1000,
      retentionDays: 30,
      alertThresholds: {
        errorRate: 0.1,        // 10% error rate
        avgResponseTime: 5000,  // 5 seconds
        costSpike: 2.0,        // 2x normal cost
        tokenSpike: 3.0        // 3x normal token usage
      }
    };
    
    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.isLogging = false;
    this.logDir = path.join(process.cwd(), 'logs', 'ai-automation');
  }

  /**
   * Start the logging service
   */
  async start() {
    if (this.isLogging) {
      console.log("AI logging service is already running");
      return;
    }

    this.isLogging = true;
    console.log("📋 Starting AI logging service...");

    // Ensure log directory exists
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create log directory:", error);
    }

    // Start periodic cleanup
    this.startPeriodicCleanup();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log("✅ AI logging service started");
  }

  /**
   * Stop the logging service
   */
  stop() {
    this.isLogging = false;
    console.log("🛑 AI logging service stopped");
  }

  /**
   * Log AI operation with detailed context
   */
  async logOperation(tenant, operation, data) {
    if (!this.isLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      tenant,
      operation,
      level: data.level || 'info',
      ...data
    };

    // Add to memory logs
    if (!this.logs.has(tenant)) {
      this.logs.set(tenant, []);
    }

    const tenantLogs = this.logs.get(tenant);
    tenantLogs.push(logEntry);

    // Keep only recent logs in memory
    if (tenantLogs.length > this.config.maxLogsPerTenant) {
      tenantLogs.shift();
    }

    // Write to file if significant event
    if (this.shouldWriteToFile(logEntry)) {
      await this.writeToFile(logEntry);
    }

    // Update metrics
    await this.updateMetrics(tenant, operation, data);

    // Check for alerts
    await this.checkAlerts(tenant, logEntry);

    // Console output for debugging
    if (this.shouldLog(data.level || 'info')) {
      this.consoleLog(logEntry);
    }
  }

  /**
   * Log automation cycle start
   */
  async logAutomationStart(tenant, tier, operations = []) {
    await this.logOperation(tenant, 'automation_start', {
      level: 'info',
      tier,
      operations,
      message: `Starting AI automation cycle for ${tenant} (${tier} tier)`
    });
  }

  /**
   * Log automation cycle completion
   */
  async logAutomationComplete(tenant, results) {
    const { duration, tasksCompleted, tasksErrored, operations = [] } = results;
    
    await this.logOperation(tenant, 'automation_complete', {
      level: tasksErrored > 0 ? 'warn' : 'info',
      duration,
      tasksCompleted,
      tasksErrored,
      operations,
      successRate: tasksCompleted / (tasksCompleted + tasksErrored),
      message: `Automation completed: ${tasksCompleted} success, ${tasksErrored} errors, ${duration}ms`
    });
  }

  /**
   * Log AI generation operation
   */
  async logAIGeneration(tenant, operation, params) {
    const { 
      tokens, 
      cost, 
      duration, 
      success, 
      error, 
      model, 
      promptLength,
      responseLength
    } = params;

    await this.logOperation(tenant, operation, {
      level: success ? 'info' : 'error',
      tokens,
      cost,
      duration,
      model,
      promptLength,
      responseLength,
      success,
      error: error?.message,
      efficiency: {
        tokensPerSecond: duration > 0 ? tokens / (duration / 1000) : 0,
        costPerToken: tokens > 0 ? cost / tokens : 0,
        compressionRatio: promptLength > 0 ? responseLength / promptLength : 0
      },
      message: success ? 
        `AI generation successful: ${tokens} tokens, $${cost?.toFixed(4)}, ${duration}ms` :
        `AI generation failed: ${error?.message}`
    });
  }

  /**
   * Log budget alerts
   */
  async logBudgetAlert(tenant, alertType, details) {
    await this.logOperation(tenant, 'budget_alert', {
      level: 'warn',
      alertType,
      currentUsage: details.currentUsage,
      limit: details.limit,
      percentage: details.percentage,
      message: `Budget alert: ${alertType} usage at ${(details.percentage * 100).toFixed(1)}%`
    });

    // Add to active alerts
    if (!this.alerts.has(tenant)) {
      this.alerts.set(tenant, []);
    }

    this.alerts.get(tenant).push({
      type: 'budget',
      subtype: alertType,
      timestamp: new Date().toISOString(),
      details,
      active: true
    });
  }

  /**
   * Log performance degradation
   */
  async logPerformanceDegradation(tenant, metric, details) {
    await this.logOperation(tenant, 'performance_degradation', {
      level: 'warn',
      metric,
      current: details.current,
      baseline: details.baseline,
      degradation: details.degradation,
      threshold: details.threshold,
      message: `Performance degradation in ${metric}: ${details.current} vs baseline ${details.baseline}`
    });
  }

  /**
   * Log cost optimization
   */
  async logCostOptimization(tenant, optimization) {
    await this.logOperation(tenant, 'cost_optimization', {
      level: 'info',
      optimization: optimization.type,
      savings: optimization.savings,
      before: optimization.before,
      after: optimization.after,
      message: `Cost optimization applied: ${optimization.type} saved $${optimization.savings?.toFixed(4)}`
    });
  }

  /**
   * Get logs for a tenant
   */
  getLogs(tenant, options = {}) {
    const { 
      level, 
      operation, 
      startTime, 
      endTime, 
      limit = 100 
    } = options;

    let logs = this.logs.get(tenant) || [];

    // Apply filters
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (operation) {
      logs = logs.filter(log => log.operation === operation);
    }

    if (startTime) {
      const start = new Date(startTime);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }

    if (endTime) {
      const end = new Date(endTime);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }

    // Sort by timestamp (newest first) and limit
    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get performance metrics for a tenant
   */
  getMetrics(tenant) {
    return this.metrics.get(tenant) || {
      totalOperations: 0,
      successfulOperations: 0,
      errorRate: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      costPerOperation: 0,
      tokensPerOperation: 0,
      lastUpdated: null
    };
  }

  /**
   * Get active alerts for a tenant
   */
  getAlerts(tenant) {
    return this.alerts.get(tenant) || [];
  }

  /**
   * Get health status for a tenant
   */
  getHealthStatus(tenant) {
    return this.healthStatus.get(tenant) || {
      overall: 'unknown',
      services: {},
      lastCheck: null,
      uptime: 0
    };
  }

  /**
   * Generate analytics report
   */
  generateAnalytics(tenant, period = '24h') {
    const logs = this.getLogs(tenant, { 
      startTime: this.getPeriodStart(period) 
    });

    const metrics = this.getMetrics(tenant);
    const alerts = this.getAlerts(tenant);

    // Calculate period-specific metrics
    const periodMetrics = this.calculatePeriodMetrics(logs);

    return {
      tenant,
      period,
      totalLogs: logs.length,
      metrics: {
        ...metrics,
        period: periodMetrics
      },
      alerts: {
        total: alerts.length,
        active: alerts.filter(a => a.active).length,
        byType: this.groupAlertsByType(alerts)
      },
      health: this.getHealthStatus(tenant),
      recommendations: this.generateRecommendations(tenant, logs, metrics)
    };
  }

  /**
   * Update performance metrics
   */
  async updateMetrics(tenant, operation, data) {
    if (!this.metrics.has(tenant)) {
      this.metrics.set(tenant, {
        totalOperations: 0,
        successfulOperations: 0,
        errorRate: 0,
        averageResponseTime: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        costPerOperation: 0,
        tokensPerOperation: 0,
        lastUpdated: null
      });
    }

    const metrics = this.metrics.get(tenant);
    
    metrics.totalOperations++;
    if (data.success !== false) {
      metrics.successfulOperations++;
    }

    metrics.errorRate = 1 - (metrics.successfulOperations / metrics.totalOperations);

    if (data.duration) {
      metrics.averageResponseTime = (
        (metrics.averageResponseTime * (metrics.totalOperations - 1) + data.duration) / 
        metrics.totalOperations
      );
    }

    if (data.tokens) {
      metrics.totalTokensUsed += data.tokens;
      metrics.tokensPerOperation = metrics.totalTokensUsed / metrics.totalOperations;
    }

    if (data.cost) {
      metrics.totalCost += data.cost;
      metrics.costPerOperation = metrics.totalCost / metrics.totalOperations;
    }

    metrics.lastUpdated = new Date().toISOString();
  }

  /**
   * Check for alerts based on metrics and thresholds
   */
  async checkAlerts(tenant, logEntry) {
    const metrics = this.getMetrics(tenant);
    const thresholds = this.config.alertThresholds;

    // Error rate alert
    if (metrics.errorRate > thresholds.errorRate) {
      await this.generateAlert(tenant, 'error_rate', {
        current: metrics.errorRate,
        threshold: thresholds.errorRate,
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`
      });
    }

    // Response time alert
    if (metrics.averageResponseTime > thresholds.avgResponseTime) {
      await this.generateAlert(tenant, 'response_time', {
        current: metrics.averageResponseTime,
        threshold: thresholds.avgResponseTime,
        message: `Slow response time: ${metrics.averageResponseTime.toFixed(0)}ms`
      });
    }

    // Cost spike alert
    if (logEntry.cost && logEntry.cost > (metrics.costPerOperation * thresholds.costSpike)) {
      await this.generateAlert(tenant, 'cost_spike', {
        current: logEntry.cost,
        baseline: metrics.costPerOperation,
        message: `Cost spike detected: $${logEntry.cost.toFixed(4)} vs avg $${metrics.costPerOperation.toFixed(4)}`
      });
    }

    // Token spike alert
    if (logEntry.tokens && logEntry.tokens > (metrics.tokensPerOperation * thresholds.tokenSpike)) {
      await this.generateAlert(tenant, 'token_spike', {
        current: logEntry.tokens,
        baseline: metrics.tokensPerOperation,
        message: `Token spike detected: ${logEntry.tokens} vs avg ${metrics.tokensPerOperation.toFixed(0)}`
      });
    }
  }

  /**
   * Generate an alert
   */
  async generateAlert(tenant, type, details) {
    if (!this.alerts.has(tenant)) {
      this.alerts.set(tenant, []);
    }

    // Check if similar alert already exists
    const alerts = this.alerts.get(tenant);
    const existingAlert = alerts.find(a => a.type === type && a.active);
    
    if (existingAlert) {
      existingAlert.count = (existingAlert.count || 1) + 1;
      existingAlert.lastOccurrence = new Date().toISOString();
      return;
    }

    // Create new alert
    alerts.push({
      type,
      timestamp: new Date().toISOString(),
      details,
      active: true,
      count: 1
    });

    // Log the alert
    await this.logOperation(tenant, 'alert_generated', {
      level: 'warn',
      alertType: type,
      details,
      message: `Alert generated: ${type} - ${details.message}`
    });

    console.warn(`🚨 Alert for ${tenant}: ${type} - ${details.message}`);
  }

  /**
   * Calculate period-specific metrics
   */
  calculatePeriodMetrics(logs) {
    if (logs.length === 0) {
      return {
        operations: 0,
        successRate: 0,
        averageResponseTime: 0,
        totalTokens: 0,
        totalCost: 0
      };
    }

    const successful = logs.filter(log => log.success !== false).length;
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalTokens = logs.reduce((sum, log) => sum + (log.tokens || 0), 0);
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);

    return {
      operations: logs.length,
      successRate: successful / logs.length,
      averageResponseTime: totalDuration / logs.length,
      totalTokens,
      totalCost,
      costEfficiency: totalTokens > 0 ? totalCost / totalTokens : 0,
      timeRange: {
        start: logs[logs.length - 1]?.timestamp,
        end: logs[0]?.timestamp
      }
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(tenant, logs, metrics) {
    const recommendations = [];

    // High error rate
    if (metrics.errorRate > 0.05) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: 'High error rate detected. Check AI provider configuration and prompts.',
        action: 'Review recent failed operations and optimize prompts'
      });
    }

    // Slow response times
    if (metrics.averageResponseTime > 3000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium', 
        message: 'Response times are slower than optimal.',
        action: 'Consider using faster models or optimizing prompt complexity'
      });
    }

    // High cost per operation
    if (metrics.costPerOperation > 0.10) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        message: 'Cost per operation is high.',
        action: 'Review prompt optimization and consider using more efficient models'
      });
    }

    // Low token efficiency
    if (metrics.tokensPerOperation > 2000) {
      recommendations.push({
        type: 'token_efficiency',
        priority: 'low',
        message: 'Token usage per operation is high.',
        action: 'Optimize prompts to reduce token usage while maintaining quality'
      });
    }

    return recommendations;
  }

  /**
   * Start periodic cleanup of old logs and alerts
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(async () => {
      await this.updateHealthStatus();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Update health status for all tenants
   */
  async updateHealthStatus() {
    for (const tenant of this.logs.keys()) {
      const metrics = this.getMetrics(tenant);
      const alerts = this.getAlerts(tenant).filter(a => a.active);
      
      let status = 'healthy';
      if (alerts.length > 0) {
        const hasHighPriorityAlerts = alerts.some(a => 
          a.type === 'error_rate' || a.type === 'cost_spike'
        );
        status = hasHighPriorityAlerts ? 'unhealthy' : 'degraded';
      }

      this.healthStatus.set(tenant, {
        overall: status,
        services: {
          aiProvider: metrics.errorRate < 0.1 ? 'healthy' : 'degraded',
          tokenMonitor: 'healthy', // Assume healthy for now
          automation: metrics.totalOperations > 0 ? 'active' : 'idle'
        },
        lastCheck: new Date().toISOString(),
        uptime: Date.now() - (new Date(metrics.lastUpdated || Date.now()) - 24 * 60 * 60 * 1000)
      });
    }
  }

  /**
   * Cleanup old data
   */
  cleanupOldData() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.retentionDays);

    for (const [tenant, logs] of this.logs.entries()) {
      this.logs.set(tenant, logs.filter(log => 
        new Date(log.timestamp) > cutoff
      ));
    }

    for (const [tenant, alerts] of this.alerts.entries()) {
      this.alerts.set(tenant, alerts.filter(alert => 
        new Date(alert.timestamp) > cutoff
      ));
    }

    console.log("🧹 Cleaned up old AI logs and alerts");
  }

  /**
   * Helper methods
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.config.logLevel];
  }

  shouldWriteToFile(logEntry) {
    return logEntry.level === 'error' || logEntry.level === 'warn';
  }

  async writeToFile(logEntry) {
    try {
      const fileName = `${logEntry.tenant}-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(this.logDir, fileName);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      await fs.appendFile(filePath, logLine);
    } catch (error) {
      console.error("Failed to write log to file:", error);
    }
  }

  consoleLog(logEntry) {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const level = logEntry.level.toUpperCase().padEnd(5);
    const operation = logEntry.operation.padEnd(20);
    
    console.log(`${timestamp} ${level} [${logEntry.tenant}] ${operation} ${logEntry.message || ''}`);
  }

  getPeriodStart(period) {
    const now = new Date();
    switch (period) {
      case '1h': return new Date(now - 60 * 60 * 1000);
      case '24h': return new Date(now - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now - 24 * 60 * 60 * 1000);
    }
  }

  groupAlertsByType(alerts) {
    return alerts.reduce((groups, alert) => {
      groups[alert.type] = (groups[alert.type] || 0) + 1;
      return groups;
    }, {});
  }
}

// Export singleton instance
let aiLoggerInstance = null;

/**
 * Get singleton AI logger service instance
 */
export function getAILoggerService() {
  if (!aiLoggerInstance) {
    aiLoggerInstance = new AILoggerService();
  }
  return aiLoggerInstance;
}

/**
 * Start AI logging service
 */
export async function startAILogging() {
  const service = getAILoggerService();
  await service.start();
  return service;
}

/**
 * Convenience logging functions
 */
export async function logAIOperation(tenant, operation, data) {
  const service = getAILoggerService();
  await service.logOperation(tenant, operation, data);
}

export async function logAutomationStart(tenant, tier, operations) {
  const service = getAILoggerService();
  await service.logAutomationStart(tenant, tier, operations);
}

export async function logAutomationComplete(tenant, results) {
  const service = getAILoggerService();
  await service.logAutomationComplete(tenant, results);
}

export default getAILoggerService;