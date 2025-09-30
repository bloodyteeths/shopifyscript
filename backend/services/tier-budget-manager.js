/**
 * Tier-Based Budget and Rate Management for Multi-Tenant SaaS
 * Manages AI quotas, budgets, and rate limits per subscription tier
 */

import { getAIRateLimiter } from './ai-rate-limiter.js';
import tenantRegistry from './tenant-registry.js';

export class TierBudgetManager {
  constructor() {
    this.rateLimiter = getAIRateLimiter();

    // Comprehensive tier definitions
    this.tierDefinitions = {
      starter: {
        name: 'Starter',
        price: 29,
        ai: {
          callsPerHour: 5,
          callsPerDay: 50,
          maxTokensPerCall: 1000,
          maxTokensPerDay: 50000,
          processingInterval: 6, // hours between heavy AI processing
          allowedAgents: ['basic_optimization', 'keyword_analysis'],
          priority: 1 // Lower priority in queue
        },
        budget: {
          dailyUSD: 0.50,
          monthlyUSD: 10.00,
          alertThreshold: 0.8
        },
        features: {
          campaigns: 3,
          keywords: 100,
          adGroups: 10,
          negativeKeywords: 50,
          competitorTracking: false,
          marketGapAnalysis: false,
          dynamicCopyGeneration: false,
          predictiveAnalytics: false
        }
      },

      pro: {
        name: 'Professional',
        price: 99,
        ai: {
          callsPerHour: 20,
          callsPerDay: 200,
          maxTokensPerCall: 2000,
          maxTokensPerDay: 200000,
          processingInterval: 2, // hours
          allowedAgents: [
            'basic_optimization',
            'keyword_analysis',
            'competitor_analysis',
            'content_intelligence',
            'campaign_optimizer'
          ],
          priority: 5
        },
        budget: {
          dailyUSD: 2.00,
          monthlyUSD: 40.00,
          alertThreshold: 0.8
        },
        features: {
          campaigns: 10,
          keywords: 500,
          adGroups: 50,
          negativeKeywords: 200,
          competitorTracking: true,
          marketGapAnalysis: true,
          dynamicCopyGeneration: true,
          predictiveAnalytics: false
        }
      },

      enterprise: {
        name: 'Enterprise',
        price: 299,
        ai: {
          callsPerHour: 100,
          callsPerDay: 1000,
          maxTokensPerCall: 5000,
          maxTokensPerDay: 1000000,
          processingInterval: 1, // hour
          allowedAgents: 'all', // All agents available
          priority: 10 // Highest priority
        },
        budget: {
          dailyUSD: 10.00,
          monthlyUSD: 200.00,
          alertThreshold: 0.9
        },
        features: {
          campaigns: 'unlimited',
          keywords: 'unlimited',
          adGroups: 'unlimited',
          negativeKeywords: 'unlimited',
          competitorTracking: true,
          marketGapAnalysis: true,
          dynamicCopyGeneration: true,
          predictiveAnalytics: true
        }
      },

      // Special tier for testing
      trial: {
        name: 'Trial',
        price: 0,
        ai: {
          callsPerHour: 2,
          callsPerDay: 10,
          maxTokensPerCall: 500,
          maxTokensPerDay: 5000,
          processingInterval: 12, // hours
          allowedAgents: ['basic_optimization'],
          priority: 0
        },
        budget: {
          dailyUSD: 0.10,
          monthlyUSD: 2.00,
          alertThreshold: 0.5
        },
        features: {
          campaigns: 1,
          keywords: 20,
          adGroups: 3,
          negativeKeywords: 10,
          competitorTracking: false,
          marketGapAnalysis: false,
          dynamicCopyGeneration: false,
          predictiveAnalytics: false
        }
      }
    };

    // Track usage per tenant
    this.tenantUsage = new Map();

    // Cache tenant tiers
    this.tenantTiers = new Map();

    // Initialize monitoring
    this.startMonitoring();
  }

  /**
   * Get tenant's current tier
   */
  async getTenantTier(tenantId) {
    // Check cache first
    if (this.tenantTiers.has(tenantId)) {
      const cached = this.tenantTiers.get(tenantId);
      if (cached.expires > Date.now()) {
        return cached.tier;
      }
    }

    // Get from registry
    const tenant = tenantRegistry.getTenant(tenantId);
    const tier = tenant?.plan || 'starter';

    // Cache for 5 minutes
    this.tenantTiers.set(tenantId, {
      tier,
      expires: Date.now() + 300000
    });

    return tier;
  }

  /**
   * Check if tenant can make an AI call
   */
  async canMakeAICall(tenantId, agentType = 'basic_optimization', estimatedTokens = 100) {
    const tier = await this.getTenantTier(tenantId);
    const tierConfig = this.tierDefinitions[tier];

    if (!tierConfig) {
      console.error(`Unknown tier for tenant ${tenantId}: ${tier}`);
      return { allowed: false, reason: 'Invalid subscription tier' };
    }

    // Check if agent is allowed for this tier
    if (!this.isAgentAllowed(agentType, tierConfig)) {
      return {
        allowed: false,
        reason: `${agentType} not available in ${tierConfig.name} plan`,
        upgrade: this.getSuggestedUpgrade(agentType)
      };
    }

    // Get current usage
    const usage = this.getOrCreateUsage(tenantId);

    // Check rate limits
    if (usage.hourly >= tierConfig.ai.callsPerHour) {
      return {
        allowed: false,
        reason: `Hourly AI limit reached (${tierConfig.ai.callsPerHour} calls)`,
        resetIn: this.getTimeUntilReset('hour', usage.hourReset)
      };
    }

    if (usage.daily >= tierConfig.ai.callsPerDay) {
      return {
        allowed: false,
        reason: `Daily AI limit reached (${tierConfig.ai.callsPerDay} calls)`,
        resetIn: this.getTimeUntilReset('day', usage.dayReset)
      };
    }

    // Check token limits
    if (estimatedTokens > tierConfig.ai.maxTokensPerCall) {
      return {
        allowed: false,
        reason: `Request too large (${estimatedTokens} tokens > ${tierConfig.ai.maxTokensPerCall} max)`,
        suggestion: 'Split into smaller requests or upgrade plan'
      };
    }

    if (usage.dailyTokens + estimatedTokens > tierConfig.ai.maxTokensPerDay) {
      return {
        allowed: false,
        reason: `Daily token limit would be exceeded`,
        remaining: tierConfig.ai.maxTokensPerDay - usage.dailyTokens
      };
    }

    // Check budget limits
    const estimatedCost = this.estimateCallCost(estimatedTokens);
    if (usage.dailyCost + estimatedCost > tierConfig.budget.dailyUSD) {
      return {
        allowed: false,
        reason: `Daily budget would be exceeded ($${tierConfig.budget.dailyUSD})`,
        remainingBudget: tierConfig.budget.dailyUSD - usage.dailyCost
      };
    }

    // Check with global rate limiter
    const globalCheck = await this.rateLimiter.canMakeAICall(tenantId, agentType);
    if (!globalCheck) {
      return {
        allowed: false,
        reason: 'System-wide rate limit reached. Please try again in a few minutes.'
      };
    }

    return {
      allowed: true,
      tier: tierConfig.name,
      priority: tierConfig.ai.priority
    };
  }

  /**
   * Record an AI call
   */
  async recordAICall(tenantId, agentType, actualTokens, actualCost) {
    const usage = this.getOrCreateUsage(tenantId);

    // Update counters
    usage.hourly++;
    usage.daily++;
    usage.dailyTokens += actualTokens;
    usage.dailyCost += actualCost;
    usage.totalCalls++;
    usage.totalTokens += actualTokens;
    usage.totalCost += actualCost;

    // Track by agent
    if (!usage.byAgent[agentType]) {
      usage.byAgent[agentType] = { calls: 0, tokens: 0, cost: 0 };
    }
    usage.byAgent[agentType].calls++;
    usage.byAgent[agentType].tokens += actualTokens;
    usage.byAgent[agentType].cost += actualCost;

    // Update last activity
    usage.lastActivity = Date.now();

    // Check for alerts
    await this.checkUsageAlerts(tenantId);
  }

  /**
   * Check if agent is allowed for tier
   */
  isAgentAllowed(agentType, tierConfig) {
    if (tierConfig.ai.allowedAgents === 'all') {
      return true;
    }
    return tierConfig.ai.allowedAgents.includes(agentType);
  }

  /**
   * Get or create usage tracking for tenant
   */
  getOrCreateUsage(tenantId) {
    if (!this.tenantUsage.has(tenantId)) {
      const now = Date.now();
      this.tenantUsage.set(tenantId, {
        hourly: 0,
        daily: 0,
        dailyTokens: 0,
        dailyCost: 0,
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        byAgent: {},
        hourReset: now + 3600000,
        dayReset: now + 86400000,
        lastActivity: now
      });
    }

    const usage = this.tenantUsage.get(tenantId);

    // Reset counters if needed
    const now = Date.now();
    if (now > usage.hourReset) {
      usage.hourly = 0;
      usage.hourReset = now + 3600000;
    }
    if (now > usage.dayReset) {
      usage.daily = 0;
      usage.dailyTokens = 0;
      usage.dailyCost = 0;
      usage.dayReset = now + 86400000;
    }

    return usage;
  }

  /**
   * Estimate cost for tokens (using Gemini pricing)
   */
  estimateCallCost(tokens) {
    // Gemini Flash pricing (very cheap)
    const costPer1000Tokens = 0.000375; // output pricing (conservative)
    return (tokens / 1000) * costPer1000Tokens;
  }

  /**
   * Get suggested upgrade for feature
   */
  getSuggestedUpgrade(agentType) {
    for (const [tierName, config] of Object.entries(this.tierDefinitions)) {
      if (config.ai.allowedAgents === 'all' || config.ai.allowedAgents.includes(agentType)) {
        return {
          tier: tierName,
          price: config.price,
          benefit: `Unlock ${agentType} with ${config.name} plan`
        };
      }
    }
    return null;
  }

  /**
   * Get time until reset
   */
  getTimeUntilReset(period, resetTime) {
    const now = Date.now();
    const diff = resetTime - now;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (period === 'hour') {
      return `${minutes} minutes`;
    } else {
      return `${hours} hours ${minutes % 60} minutes`;
    }
  }

  /**
   * Check usage alerts
   */
  async checkUsageAlerts(tenantId) {
    const tier = await this.getTenantTier(tenantId);
    const tierConfig = this.tierDefinitions[tier];
    const usage = this.getOrCreateUsage(tenantId);

    // Check budget threshold
    const budgetUsage = usage.dailyCost / tierConfig.budget.dailyUSD;
    if (budgetUsage > tierConfig.budget.alertThreshold) {
      console.warn(`⚠️ Tenant ${tenantId} at ${Math.round(budgetUsage * 100)}% of daily budget`);
      // In production: Send alert email/notification
    }

    // Check rate limit threshold
    const rateUsage = usage.daily / tierConfig.ai.callsPerDay;
    if (rateUsage > 0.8) {
      console.warn(`⚠️ Tenant ${tenantId} at ${Math.round(rateUsage * 100)}% of daily AI calls`);
    }
  }

  /**
   * Get usage statistics for tenant
   */
  getTenantStats(tenantId) {
    const usage = this.getOrCreateUsage(tenantId);
    const tier = this.getTenantTier(tenantId);
    const tierConfig = this.tierDefinitions[tier];

    return {
      tier: tierConfig.name,
      usage: {
        hourly: `${usage.hourly}/${tierConfig.ai.callsPerHour}`,
        daily: `${usage.daily}/${tierConfig.ai.callsPerDay}`,
        dailyTokens: `${usage.dailyTokens}/${tierConfig.ai.maxTokensPerDay}`,
        dailyBudget: `$${usage.dailyCost.toFixed(2)}/$${tierConfig.budget.dailyUSD}`,
        totalCalls: usage.totalCalls,
        totalCost: `$${usage.totalCost.toFixed(2)}`
      },
      byAgent: usage.byAgent,
      resets: {
        hourly: this.getTimeUntilReset('hour', usage.hourReset),
        daily: this.getTimeUntilReset('day', usage.dayReset)
      }
    };
  }

  /**
   * Start monitoring and cleanup
   */
  startMonitoring() {
    // Clean up old usage data every hour
    setInterval(() => {
      const now = Date.now();
      const staleTime = 24 * 3600000; // 24 hours

      for (const [tenantId, usage] of this.tenantUsage) {
        if (now - usage.lastActivity > staleTime) {
          this.tenantUsage.delete(tenantId);
          console.log(`Cleaned up stale usage data for ${tenantId}`);
        }
      }
    }, 3600000); // Every hour
  }

  /**
   * Process AI request with tier management
   */
  async processAIRequest(tenantId, agentType, requestFunction, estimatedTokens = 100) {
    // Check if allowed
    const canProceed = await this.canMakeAICall(tenantId, agentType, estimatedTokens);

    if (!canProceed.allowed) {
      console.warn(`🚫 AI request blocked for ${tenantId}: ${canProceed.reason}`);

      // Return graceful degradation response
      return {
        success: false,
        reason: canProceed.reason,
        fallback: true,
        upgrade: canProceed.upgrade,
        resetIn: canProceed.resetIn
      };
    }

    try {
      // Execute with priority
      const startTime = Date.now();
      const result = await this.rateLimiter.queueAICall(
        tenantId,
        requestFunction,
        canProceed.priority
      );

      // Calculate actual usage (mock for now)
      const executionTime = Date.now() - startTime;
      const actualTokens = estimatedTokens; // In production: get from response
      const actualCost = this.estimateCallCost(actualTokens);

      // Record the usage
      await this.recordAICall(tenantId, agentType, actualTokens, actualCost);

      console.log(`✅ AI call for ${tenantId} completed in ${executionTime}ms`);

      return {
        success: true,
        result,
        usage: {
          tokens: actualTokens,
          cost: actualCost,
          executionTime
        }
      };

    } catch (error) {
      console.error(`❌ AI call failed for ${tenantId}:`, error.message);

      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }
}

// Singleton instance
let instance = null;

export function getTierBudgetManager() {
  if (!instance) {
    instance = new TierBudgetManager();
  }
  return instance;
}

export default { getTierBudgetManager };