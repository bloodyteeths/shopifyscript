/**
 * Token Usage Monitoring Service for ProofKit SaaS
 * Comprehensive token tracking, cost monitoring, and budget management
 * 
 * Features:
 * - Real-time token usage tracking per tenant and operation
 * - Cost calculation and budget management
 * - Automated alerts for cost thresholds
 * - Token optimization recommendations
 * - Usage analytics and reporting
 */

import { getCurrentSubscription } from "../middleware/subscription-check.js";

/**
 * Token monitoring and cost control service
 */
export class TokenMonitorService {
  constructor() {
    // Token usage tracking by tenant
    this.tokenUsage = new Map(); // tenant -> usage data
    this.costThresholds = new Map(); // tenant -> cost limits
    this.alerts = new Map(); // tenant -> alert history
    
    // Cost per token by provider (approximate rates)
    this.tokenCosts = {
      openai: {
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }, // per 1K tokens
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 }
      },
      anthropic: {
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-opus': { input: 0.015, output: 0.075 }
      },
      google: {
        'gemini-pro': { input: 0.0005, output: 0.0015 },
        'gemini-flash': { input: 0.000125, output: 0.000375 }
      }
    };
    
    // Default budget limits by tier (USD)
    this.defaultBudgets = {
      starter: { daily: 1.00, monthly: 20.00, alert_threshold: 0.80 },
      professional: { daily: 5.00, monthly: 100.00, alert_threshold: 0.80 },
      enterprise: { daily: 20.00, monthly: 500.00, alert_threshold: 0.90 }
    };
    
    // Performance metrics
    this.metrics = {
      totalTokens: 0,
      totalCost: 0,
      totalRequests: 0,
      averageTokensPerRequest: 0,
      mostExpensiveOperations: new Map(),
      costSavingsFromOptimization: 0
    };
    
    this.isTracking = false;
  }

  /**
   * Start token monitoring service
   */
  start() {
    if (this.isTracking) {
      console.log("Token monitoring is already running");
      return;
    }
    
    this.isTracking = true;
    console.log("📊 Token monitoring service started");
    
    // Reset daily counters at midnight
    this.startDailyReset();
    
    // Clean up old data periodically
    this.startPeriodicCleanup();
  }

  /**
   * Stop token monitoring service
   */
  stop() {
    this.isTracking = false;
    console.log("🛑 Token monitoring service stopped");
  }

  /**
   * Record token usage for a specific operation
   */
  async recordUsage(tenant, operation, tokenData) {
    if (!this.isTracking) return;

    const {
      inputTokens = 0,
      outputTokens = 0,
      totalTokens = inputTokens + outputTokens,
      provider = 'openai',
      model = 'gpt-3.5-turbo',
      prompt = '',
      response = '',
      duration = 0
    } = tokenData;

    // Initialize tenant data if needed
    if (!this.tokenUsage.has(tenant)) {
      await this.initializeTenant(tenant);
    }

    const usage = this.tokenUsage.get(tenant);
    const now = new Date();
    const today = now.toDateString();

    // Reset daily counters if needed
    if (usage.lastUpdate && new Date(usage.lastUpdate).toDateString() !== today) {
      this.resetDailyCounters(tenant);
    }

    // Calculate cost
    const cost = this.calculateCost(provider, model, inputTokens, outputTokens);

    // Record usage
    const record = {
      timestamp: now.toISOString(),
      operation,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      provider,
      model,
      duration,
      promptLength: prompt.length,
      responseLength: response.length
    };

    // Update daily totals
    usage.daily.tokens += totalTokens;
    usage.daily.cost += cost;
    usage.daily.requests += 1;

    // Update monthly totals
    usage.monthly.tokens += totalTokens;
    usage.monthly.cost += cost;
    usage.monthly.requests += 1;

    // Update operation-specific stats
    if (!usage.byOperation[operation]) {
      usage.byOperation[operation] = {
        tokens: 0,
        cost: 0,
        requests: 0,
        averageTokens: 0,
        totalDuration: 0
      };
    }

    const opStats = usage.byOperation[operation];
    opStats.tokens += totalTokens;
    opStats.cost += cost;
    opStats.requests += 1;
    opStats.averageTokens = opStats.tokens / opStats.requests;
    opStats.totalDuration += duration;

    // Add to recent history (keep last 100 requests)
    usage.recentUsage.push(record);
    if (usage.recentUsage.length > 100) {
      usage.recentUsage.shift();
    }

    usage.lastUpdate = now.toISOString();

    // Update global metrics
    this.updateGlobalMetrics(totalTokens, cost);

    // Check budget alerts
    await this.checkBudgetAlerts(tenant);

    console.log(`📊 Recorded usage for ${tenant}: ${totalTokens} tokens, $${cost.toFixed(4)} (${operation})`);
  }

  /**
   * Calculate cost based on provider and model
   */
  calculateCost(provider, model, inputTokens, outputTokens) {
    const providerCosts = this.tokenCosts[provider];
    if (!providerCosts || !providerCosts[model]) {
      // Fallback to OpenAI GPT-3.5 pricing
      return ((inputTokens / 1000) * 0.0005) + ((outputTokens / 1000) * 0.0015);
    }

    const modelCosts = providerCosts[model];
    return ((inputTokens / 1000) * modelCosts.input) + ((outputTokens / 1000) * modelCosts.output);
  }

  /**
   * Initialize tenant tracking data
   */
  async initializeTenant(tenant) {
    const subscription = await getCurrentSubscription(tenant);
    const tier = subscription?.tier || 'starter';
    const budget = this.defaultBudgets[tier];

    this.tokenUsage.set(tenant, {
      tier,
      daily: { tokens: 0, cost: 0, requests: 0 },
      monthly: { tokens: 0, cost: 0, requests: 0 },
      byOperation: {},
      recentUsage: [],
      budget,
      lastUpdate: null,
      monthlyReset: new Date().toISOString()
    });

    this.alerts.set(tenant, {
      dailyAlerts: [],
      monthlyAlerts: [],
      lastAlert: null
    });

    console.log(`📊 Initialized token tracking for ${tenant} (${tier} tier)`);
  }

  /**
   * Check if tenant is approaching or over budget limits
   */
  async checkBudgetAlerts(tenant) {
    const usage = this.tokenUsage.get(tenant);
    const alerts = this.alerts.get(tenant);
    
    if (!usage || !alerts) return;

    const { daily, monthly, budget } = usage;
    const now = new Date().toISOString();
    
    // Check daily budget
    const dailyPercentage = daily.cost / budget.daily;
    if (dailyPercentage >= budget.alert_threshold && dailyPercentage < 1.0) {
      if (!alerts.dailyAlerts.includes(new Date().toDateString())) {
        await this.sendBudgetAlert(tenant, 'daily', dailyPercentage, daily.cost, budget.daily);
        alerts.dailyAlerts.push(new Date().toDateString());
      }
    } else if (dailyPercentage >= 1.0) {
      await this.sendBudgetExceededAlert(tenant, 'daily', daily.cost, budget.daily);
    }

    // Check monthly budget
    const monthlyPercentage = monthly.cost / budget.monthly;
    if (monthlyPercentage >= budget.alert_threshold && monthlyPercentage < 1.0) {
      const monthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
      if (!alerts.monthlyAlerts.includes(monthKey)) {
        await this.sendBudgetAlert(tenant, 'monthly', monthlyPercentage, monthly.cost, budget.monthly);
        alerts.monthlyAlerts.push(monthKey);
      }
    } else if (monthlyPercentage >= 1.0) {
      await this.sendBudgetExceededAlert(tenant, 'monthly', monthly.cost, budget.monthly);
    }

    alerts.lastAlert = now;
  }

  /**
   * Send budget warning alert
   */
  async sendBudgetAlert(tenant, period, percentage, current, limit) {
    const message = `🚨 Token Budget Alert for ${tenant}:
${period.toUpperCase()} usage is at ${(percentage * 100).toFixed(1)}% of budget
Current: $${current.toFixed(2)} / $${limit.toFixed(2)}
Consider optimizing AI usage to stay within budget.`;

    console.warn(message);
    // Here you would integrate with your alerting system (email, Slack, etc.)
  }

  /**
   * Send budget exceeded alert
   */
  async sendBudgetExceededAlert(tenant, period, current, limit) {
    const message = `🛑 BUDGET EXCEEDED for ${tenant}:
${period.toUpperCase()} usage: $${current.toFixed(2)} / $${limit.toFixed(2)}
AI operations may be throttled to prevent further overages.`;

    console.error(message);
    // Here you would integrate with your alerting system
  }

  /**
   * Check if tenant can make AI request without exceeding budget
   */
  canMakeRequest(tenant, estimatedTokens = 1000) {
    const usage = this.tokenUsage.get(tenant);

    // If no tracking data exists yet, allow the request (first-time use)
    if (!usage) {
      return {
        allowed: true,
        estimatedCost: 0,
        reason: 'no_tracking_data',
        message: 'First request - no budget limits applied yet'
      };
    }

    // Use Gemini pricing for cost estimation since that's what's configured
    const estimatedCost = this.calculateCost('google', 'gemini-flash', estimatedTokens, estimatedTokens);

    // Check daily limit
    if (usage.daily.cost + estimatedCost > usage.budget.daily) {
      return {
        allowed: false,
        reason: 'daily_budget_exceeded',
        remaining: usage.budget.daily - usage.daily.cost,
        limit: usage.budget.daily
      };
    }

    // Check monthly limit
    if (usage.monthly.cost + estimatedCost > usage.budget.monthly) {
      return {
        allowed: false,
        reason: 'monthly_budget_exceeded',
        remaining: usage.budget.monthly - usage.monthly.cost,
        limit: usage.budget.monthly
      };
    }

    return {
      allowed: true,
      estimatedCost,
      remaining_daily: usage.budget.daily - usage.daily.cost,
      remaining_monthly: usage.budget.monthly - usage.monthly.cost
    };
  }

  /**
   * Get usage statistics for a tenant
   */
  getUsageStats(tenant) {
    const usage = this.tokenUsage.get(tenant);
    if (!usage) {
      return { error: 'Tenant not found' };
    }

    const alerts = this.alerts.get(tenant) || {};
    
    return {
      tenant,
      tier: usage.tier,
      current: {
        daily: {
          tokens: usage.daily.tokens,
          cost: usage.daily.cost,
          requests: usage.daily.requests,
          percentOfBudget: (usage.daily.cost / usage.budget.daily) * 100
        },
        monthly: {
          tokens: usage.monthly.tokens,
          cost: usage.monthly.cost,
          requests: usage.monthly.requests,
          percentOfBudget: (usage.monthly.cost / usage.budget.monthly) * 100
        }
      },
      budget: usage.budget,
      byOperation: usage.byOperation,
      recentUsage: usage.recentUsage.slice(-10), // Last 10 requests
      alerts: {
        dailyAlertsThisMonth: alerts.dailyAlerts?.length || 0,
        monthlyAlertsThisYear: alerts.monthlyAlerts?.length || 0,
        lastAlert: alerts.lastAlert
      },
      efficiency: this.calculateEfficiencyMetrics(usage),
      recommendations: this.generateOptimizationRecommendations(usage)
    };
  }

  /**
   * Calculate efficiency metrics for a tenant
   */
  calculateEfficiencyMetrics(usage) {
    const totalRequests = usage.daily.requests + usage.monthly.requests;
    const totalTokens = usage.daily.tokens + usage.monthly.tokens;
    const totalCost = usage.daily.cost + usage.monthly.cost;

    if (totalRequests === 0) {
      return { tokensPerRequest: 0, costPerRequest: 0, costPerToken: 0 };
    }

    return {
      tokensPerRequest: totalTokens / totalRequests,
      costPerRequest: totalCost / totalRequests,
      costPerToken: totalCost / totalTokens,
      mostExpensiveOperation: this.getMostExpensiveOperation(usage),
      leastEfficientOperation: this.getLeastEfficientOperation(usage)
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations(usage) {
    const recommendations = [];
    const efficiency = this.calculateEfficiencyMetrics(usage);

    // High cost per request
    if (efficiency.costPerRequest > 0.05) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'high',
        message: 'Consider shorter prompts or using a less expensive model',
        potential_savings: (efficiency.costPerRequest - 0.03) * usage.monthly.requests
      });
    }

    // High tokens per request
    if (efficiency.tokensPerRequest > 2000) {
      recommendations.push({
        type: 'prompt_optimization',
        priority: 'medium', 
        message: 'Prompts may be too verbose. Consider more concise wording',
        potential_savings: (efficiency.tokensPerRequest - 1500) * usage.monthly.requests * 0.0005 / 1000
      });
    }

    // Inefficient operations
    if (efficiency.leastEfficientOperation) {
      recommendations.push({
        type: 'operation_optimization',
        priority: 'medium',
        message: `Operation "${efficiency.leastEfficientOperation.name}" is using excessive tokens`,
        operation: efficiency.leastEfficientOperation.name,
        current_tokens: efficiency.leastEfficientOperation.averageTokens,
        potential_savings: efficiency.leastEfficientOperation.cost * 0.3
      });
    }

    // Budget approaching
    const monthlyPercent = (usage.monthly.cost / usage.budget.monthly) * 100;
    if (monthlyPercent > 70) {
      recommendations.push({
        type: 'budget_warning',
        priority: 'high',
        message: `Monthly budget ${monthlyPercent.toFixed(1)}% used. Consider usage optimization`,
        remaining_budget: usage.budget.monthly - usage.monthly.cost,
        days_remaining: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
      });
    }

    return recommendations;
  }

  /**
   * Get most expensive operation for a tenant
   */
  getMostExpensiveOperation(usage) {
    let maxCost = 0;
    let maxOperation = null;

    for (const [operation, stats] of Object.entries(usage.byOperation)) {
      if (stats.cost > maxCost) {
        maxCost = stats.cost;
        maxOperation = { name: operation, ...stats };
      }
    }

    return maxOperation;
  }

  /**
   * Get least efficient operation (highest tokens per request)
   */
  getLeastEfficientOperation(usage) {
    let maxTokensPerRequest = 0;
    let leastEfficient = null;

    for (const [operation, stats] of Object.entries(usage.byOperation)) {
      const tokensPerRequest = stats.tokens / stats.requests;
      if (tokensPerRequest > maxTokensPerRequest) {
        maxTokensPerRequest = tokensPerRequest;
        leastEfficient = { name: operation, averageTokens: tokensPerRequest, ...stats };
      }
    }

    return leastEfficient;
  }

  /**
   * Reset daily counters for a tenant
   */
  resetDailyCounters(tenant) {
    const usage = this.tokenUsage.get(tenant);
    if (usage) {
      usage.daily = { tokens: 0, cost: 0, requests: 0 };
      console.log(`🔄 Reset daily counters for ${tenant}`);
    }
  }

  /**
   * Reset monthly counters for a tenant
   */
  resetMonthlyCounters(tenant) {
    const usage = this.tokenUsage.get(tenant);
    if (usage) {
      usage.monthly = { tokens: 0, cost: 0, requests: 0 };
      usage.monthlyReset = new Date().toISOString();
      console.log(`🔄 Reset monthly counters for ${tenant}`);
    }

    const alerts = this.alerts.get(tenant);
    if (alerts) {
      alerts.monthlyAlerts = [];
    }
  }

  /**
   * Start daily reset scheduler
   */
  startDailyReset() {
    // Reset daily counters at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      // Reset all tenant daily counters
      for (const tenant of this.tokenUsage.keys()) {
        this.resetDailyCounters(tenant);
        
        // Reset daily alerts
        const alerts = this.alerts.get(tenant);
        if (alerts) {
          alerts.dailyAlerts = [];
        }
      }
      
      // Set up recurring daily reset
      setInterval(() => {
        for (const tenant of this.tokenUsage.keys()) {
          this.resetDailyCounters(tenant);
          const alerts = this.alerts.get(tenant);
          if (alerts) {
            alerts.dailyAlerts = [];
          }
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntilMidnight);
  }

  /**
   * Start periodic cleanup of old data
   */
  startPeriodicCleanup() {
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  cleanupOldData() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30); // Keep 30 days

    for (const [tenant, usage] of this.tokenUsage.entries()) {
      // Clean up old recent usage entries
      usage.recentUsage = usage.recentUsage.filter(entry => 
        new Date(entry.timestamp) > cutoff
      );
    }

    console.log("🧹 Cleaned up old token usage data");
  }

  /**
   * Update global metrics
   */
  updateGlobalMetrics(tokens, cost) {
    this.metrics.totalTokens += tokens;
    this.metrics.totalCost += cost;
    this.metrics.totalRequests += 1;
    this.metrics.averageTokensPerRequest = this.metrics.totalTokens / this.metrics.totalRequests;
  }

  /**
   * Get service status and global metrics
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      totalTenants: this.tokenUsage.size,
      globalMetrics: this.metrics,
      supportedProviders: Object.keys(this.tokenCosts),
      defaultBudgets: this.defaultBudgets
    };
  }

  /**
   * Export usage data for analytics
   */
  exportUsageData(tenant, startDate, endDate) {
    const usage = this.tokenUsage.get(tenant);
    if (!usage) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredUsage = usage.recentUsage.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= start && entryDate <= end;
    });

    return {
      tenant,
      period: { start: startDate, end: endDate },
      summary: {
        totalTokens: filteredUsage.reduce((sum, entry) => sum + entry.totalTokens, 0),
        totalCost: filteredUsage.reduce((sum, entry) => sum + entry.cost, 0),
        totalRequests: filteredUsage.length
      },
      usage: filteredUsage
    };
  }
}

// Export singleton instance
let tokenMonitorInstance = null;

/**
 * Get singleton token monitor service instance
 */
export function getTokenMonitorService() {
  if (!tokenMonitorInstance) {
    tokenMonitorInstance = new TokenMonitorService();
  }
  return tokenMonitorInstance;
}

/**
 * Start token monitoring service
 */
export function startTokenMonitoring() {
  const service = getTokenMonitorService();
  service.start();
  return service;
}

/**
 * Record token usage (convenience function)
 */
export async function recordTokenUsage(tenant, operation, tokenData) {
  const service = getTokenMonitorService();
  await service.recordUsage(tenant, operation, tokenData);
}

/**
 * Check if tenant can make AI request
 */
export function checkBudgetLimit(tenant, estimatedTokens) {
  const service = getTokenMonitorService();
  return service.canMakeRequest(tenant, estimatedTokens);
}

export default getTokenMonitorService;