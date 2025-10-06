/**
 * Budget Allocator Service for Ads Autopilot AI SaaS
 *
 * Intelligently reallocates budget across campaigns to maximize ROI
 * Implements budget pacing and overspend prevention
 *
 * Features:
 * - Dynamic budget reallocation to high-performing campaigns
 * - Budget pacing strategies (even, accelerated, front-loaded)
 * - Overspend prevention and alerts
 * - ROI-based budget optimization
 * - Seasonal budget adjustments
 * - Account-level budget management
 */

import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Budget allocation strategies
 */
const ALLOCATION_STRATEGIES = {
  PERFORMANCE_BASED: {
    name: 'Performance-Based',
    description: 'Allocate budget based on historical performance',
    minPerformanceScore: 50
  },
  ROAS_OPTIMIZED: {
    name: 'ROAS Optimized',
    description: 'Maximize return on ad spend',
    minROAS: 2.0
  },
  BALANCED: {
    name: 'Balanced',
    description: 'Balance between winners and testing new campaigns',
    winnerAllocation: 0.70, // 70% to winners
    testAllocation: 0.30 // 30% to test campaigns
  },
  AGGRESSIVE_SCALING: {
    name: 'Aggressive Scaling',
    description: 'Heavily favor top performers',
    winnerAllocation: 0.85, // 85% to winners
    testAllocation: 0.15 // 15% to test campaigns
  }
};

/**
 * Pacing strategies
 */
const PACING_STRATEGIES = {
  STANDARD: {
    name: 'Standard Pacing',
    description: 'Even distribution throughout the day',
    hourlyBudget: (dailyBudget) => dailyBudget / 24
  },
  ACCELERATED: {
    name: 'Accelerated Pacing',
    description: 'Spend budget as quickly as possible',
    hourlyBudget: (dailyBudget) => dailyBudget // No limit per hour
  },
  PEAK_HOURS: {
    name: 'Peak Hours Pacing',
    description: 'Concentrate budget during peak conversion hours',
    peakMultiplier: 2.0,
    offPeakMultiplier: 0.5
  },
  DAYPARTING: {
    name: 'Dayparting Pacing',
    description: 'Custom pacing based on time of day performance',
    adjustable: true
  }
};

/**
 * Budget safety limits
 */
const SAFETY_LIMITS = {
  MAX_DAILY_INCREASE: 0.50, // 50% max daily increase
  MAX_DAILY_DECREASE: 0.30, // 30% max daily decrease
  MIN_CAMPAIGN_BUDGET: 5.00, // $5 minimum daily budget
  MAX_CAMPAIGN_BUDGET: 10000.00, // $10,000 max daily budget
  OVERSPEND_THRESHOLD: 1.10, // Alert if 10% over budget
  UNDERSPEND_THRESHOLD: 0.85, // Alert if spending less than 85%
  EMERGENCY_PAUSE_THRESHOLD: 1.50 // Pause if 50% over budget
};

/**
 * Budget Allocator
 */
export class BudgetAllocator {
  constructor() {
    this.budgetHistory = new Map(); // Track budget changes
    this.spendTracking = new Map(); // Track actual spend vs budget

    // Configuration
    this.config = {
      defaultStrategy: 'PERFORMANCE_BASED',
      defaultPacing: 'PEAK_HOURS',
      enableAutoPacing: true,
      enableOverspendProtection: true,
      reallocationFrequency: 24 * 60 * 60 * 1000 // Daily
    };

    // Metrics
    this.metrics = {
      totalBudgetManaged: 0,
      reallocationCount: 0,
      budgetSaved: 0,
      roiImprovement: 0,
      overspendPrevented: 0
    };

    console.log('Budget Allocator initialized');
  }

  /**
   * Generate budget reallocation recommendations
   */
  async generateBudgetReallocation(tenantId, classification, intelligence) {
    const actions = [];

    try {
      // Get current budget allocation
      const currentBudgets = await this.getCurrentBudgets(tenantId);

      // Get total account budget
      const accountBudget = await this.getAccountBudget(tenantId);

      // Calculate optimal budget distribution
      const optimalDistribution = this.calculateOptimalDistribution(
        classification,
        currentBudgets,
        accountBudget,
        intelligence
      );

      // Generate reallocation actions
      for (const [campaignId, optimalBudget] of Object.entries(optimalDistribution)) {
        const currentBudget = currentBudgets[campaignId] || 0;

        // Only suggest changes if significant (>10%)
        const changePercent = Math.abs(optimalBudget - currentBudget) / currentBudget;
        if (changePercent > 0.10) {
          const campaign = this.findCampaign(campaignId, classification);

          actions.push({
            type: optimalBudget > currentBudget ? 'increase_budget' : 'decrease_budget',
            campaignId,
            campaignName: campaign?.campaignName || 'Unknown',
            currentValue: currentBudget,
            newValue: optimalBudget,
            change: ((optimalBudget - currentBudget) / currentBudget * 100).toFixed(1) + '%',
            reason: this.generateBudgetChangeReason(campaign, optimalBudget, currentBudget, intelligence),
            expectedImpact: this.estimateImpact(campaign, optimalBudget, currentBudget),
            confidence: this.calculateConfidence(campaign, intelligence)
          });
        }
      }

      // Generate pacing recommendations
      const pacingActions = this.generatePacingRecommendations(
        tenantId,
        classification,
        intelligence
      );
      actions.push(...pacingActions);

      // Generate overspend protection actions
      const protectionActions = await this.generateOverspendProtection(
        tenantId,
        classification,
        currentBudgets
      );
      actions.push(...protectionActions);

      logger.info('Generated budget reallocation recommendations', {
        tenantId,
        actionsGenerated: actions.length
      });

      return actions;

    } catch (error) {
      logger.error('Failed to generate budget reallocation', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Calculate optimal budget distribution
   */
  calculateOptimalDistribution(classification, currentBudgets, accountBudget, intelligence) {
    const distribution = {};

    // Get allocation strategy
    const strategy = this.config.defaultStrategy;

    // Calculate total current budget
    const totalCurrentBudget = Object.values(currentBudgets).reduce((sum, b) => sum + b, 0);

    // Use account budget if available, otherwise use current total
    const totalBudget = accountBudget || totalCurrentBudget;

    if (strategy === 'PERFORMANCE_BASED') {
      return this.performanceBasedAllocation(
        classification,
        totalBudget,
        intelligence
      );
    } else if (strategy === 'ROAS_OPTIMIZED') {
      return this.roasOptimizedAllocation(
        classification,
        totalBudget,
        intelligence
      );
    } else if (strategy === 'BALANCED') {
      return this.balancedAllocation(
        classification,
        totalBudget,
        ALLOCATION_STRATEGIES.BALANCED
      );
    } else if (strategy === 'AGGRESSIVE_SCALING') {
      return this.balancedAllocation(
        classification,
        totalBudget,
        ALLOCATION_STRATEGIES.AGGRESSIVE_SCALING
      );
    }

    // Default: equal distribution
    return this.equalDistribution(classification, totalBudget);
  }

  /**
   * Performance-based allocation
   */
  performanceBasedAllocation(classification, totalBudget, intelligence) {
    const distribution = {};

    // Score all campaigns
    const allCampaigns = [
      ...classification.winners,
      ...classification.neutral,
      ...classification.losers
    ];

    // Calculate total performance score
    const totalScore = allCampaigns.reduce((sum, c) => sum + (c.performanceScore || 0), 0);

    if (totalScore === 0) {
      return this.equalDistribution(classification, totalBudget);
    }

    // Allocate budget proportionally to performance scores
    allCampaigns.forEach(campaign => {
      const score = campaign.performanceScore || 0;
      const budgetShare = (score / totalScore) * totalBudget;

      // Apply min/max constraints
      const constrainedBudget = Math.max(
        SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET,
        Math.min(SAFETY_LIMITS.MAX_CAMPAIGN_BUDGET, budgetShare)
      );

      distribution[campaign.campaignId] = constrainedBudget;
    });

    return distribution;
  }

  /**
   * ROAS-optimized allocation
   */
  roasOptimizedAllocation(classification, totalBudget, intelligence) {
    const distribution = {};

    // Get campaigns with positive ROAS
    const profitableCampaigns = [
      ...classification.winners,
      ...classification.neutral
    ].filter(c => c.metrics.roas >= ALLOCATION_STRATEGIES.ROAS_OPTIMIZED.minROAS);

    if (profitableCampaigns.length === 0) {
      return this.equalDistribution(classification, totalBudget);
    }

    // Calculate total ROAS-weighted score
    const totalWeightedROAS = profitableCampaigns.reduce((sum, c) =>
      sum + (c.metrics.roas * c.metrics.conversions), 0
    );

    // Allocate 90% to profitable campaigns, 10% to test losers
    const profitableBudget = totalBudget * 0.90;
    const testBudget = totalBudget * 0.10;

    // Distribute profitable budget
    profitableCampaigns.forEach(campaign => {
      const weight = (campaign.metrics.roas * campaign.metrics.conversions) / totalWeightedROAS;
      const budgetShare = profitableBudget * weight;

      distribution[campaign.campaignId] = Math.max(
        SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET,
        Math.min(SAFETY_LIMITS.MAX_CAMPAIGN_BUDGET, budgetShare)
      );
    });

    // Distribute test budget among losers
    if (classification.losers.length > 0) {
      const testPerCampaign = testBudget / classification.losers.length;
      classification.losers.forEach(campaign => {
        distribution[campaign.campaignId] = Math.max(
          SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET,
          testPerCampaign
        );
      });
    }

    return distribution;
  }

  /**
   * Balanced allocation
   */
  balancedAllocation(classification, totalBudget, strategy) {
    const distribution = {};

    const winners = classification.winners || [];
    const others = [...(classification.neutral || []), ...(classification.losers || [])];

    // Allocate to winners
    const winnerBudget = totalBudget * strategy.winnerAllocation;
    if (winners.length > 0) {
      const perWinner = winnerBudget / winners.length;
      winners.forEach(campaign => {
        distribution[campaign.campaignId] = Math.max(
          SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET,
          perWinner
        );
      });
    }

    // Allocate to others
    const otherBudget = totalBudget * strategy.testAllocation;
    if (others.length > 0) {
      const perOther = otherBudget / others.length;
      others.forEach(campaign => {
        distribution[campaign.campaignId] = Math.max(
          SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET,
          perOther
        );
      });
    }

    return distribution;
  }

  /**
   * Equal distribution (fallback)
   */
  equalDistribution(classification, totalBudget) {
    const distribution = {};

    const allCampaigns = [
      ...classification.winners,
      ...classification.neutral,
      ...classification.losers,
      ...classification.newCampaigns
    ];

    if (allCampaigns.length === 0) return distribution;

    const perCampaign = totalBudget / allCampaigns.length;

    allCampaigns.forEach(campaign => {
      distribution[campaign.campaignId] = Math.max(
        SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET,
        perCampaign
      );
    });

    return distribution;
  }

  /**
   * Generate pacing recommendations
   */
  generatePacingRecommendations(tenantId, classification, intelligence) {
    const actions = [];

    if (!intelligence.trafficPatterns?.hourly) {
      return actions;
    }

    const peakHours = intelligence.trafficPatterns.hourly.peakHours || [];

    // For winning campaigns, recommend peak hours pacing
    classification.winners.forEach(campaign => {
      actions.push({
        type: 'set_budget_pacing',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        strategy: 'PEAK_HOURS',
        peakHours: peakHours.map(h => h.hour),
        reason: 'Concentrate budget during high-conversion hours',
        expectedImpact: 'medium'
      });
    });

    // For neutral campaigns, recommend standard pacing
    classification.neutral.forEach(campaign => {
      actions.push({
        type: 'set_budget_pacing',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        strategy: 'STANDARD',
        reason: 'Even budget distribution for consistent testing',
        expectedImpact: 'low'
      });
    });

    return actions;
  }

  /**
   * Generate overspend protection actions
   */
  async generateOverspendProtection(tenantId, classification, currentBudgets) {
    const actions = [];

    if (!this.config.enableOverspendProtection) {
      return actions;
    }

    // Get actual spend for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySpend = await this.getTodaySpend(tenantId);

    // Check each campaign
    for (const [campaignId, budget] of Object.entries(currentBudgets)) {
      const spent = todaySpend[campaignId] || 0;
      const spendRatio = spent / budget;

      // Emergency pause if severely over budget
      if (spendRatio >= SAFETY_LIMITS.EMERGENCY_PAUSE_THRESHOLD) {
        actions.push({
          type: 'emergency_pause',
          campaignId,
          currentSpend: spent,
          budget: budget,
          overspendPercent: ((spendRatio - 1) * 100).toFixed(1) + '%',
          reason: `EMERGENCY: Campaign spend ($${spent.toFixed(2)}) is ${(spendRatio * 100).toFixed(0)}% of daily budget`,
          priority: 10,
          expectedImpact: 'critical'
        });

        this.metrics.overspendPrevented++;
      }
      // Warning if over budget but not emergency
      else if (spendRatio >= SAFETY_LIMITS.OVERSPEND_THRESHOLD) {
        actions.push({
          type: 'overspend_warning',
          campaignId,
          currentSpend: spent,
          budget: budget,
          overspendPercent: ((spendRatio - 1) * 100).toFixed(1) + '%',
          reason: `Warning: Campaign spending ${(spendRatio * 100).toFixed(0)}% of daily budget`,
          priority: 7,
          expectedImpact: 'high'
        });
      }
      // Alert if severely underspending (might indicate issues)
      else if (spendRatio <= SAFETY_LIMITS.UNDERSPEND_THRESHOLD && spent > 0) {
        actions.push({
          type: 'underspend_alert',
          campaignId,
          currentSpend: spent,
          budget: budget,
          underspendPercent: ((1 - spendRatio) * 100).toFixed(1) + '%',
          reason: `Campaign only spending ${(spendRatio * 100).toFixed(0)}% of daily budget - may need optimization`,
          priority: 4,
          expectedImpact: 'medium'
        });
      }
    }

    return actions;
  }

  /**
   * Adjust campaign budget (would integrate with Google Ads API)
   */
  async adjustCampaignBudget(tenantId, campaignId, newBudget) {
    logger.info('Adjusting campaign budget', {
      tenantId,
      campaignId,
      newBudget
    });

    // Validate budget
    if (newBudget < SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET) {
      throw new Error(`Budget ${newBudget} below minimum ${SAFETY_LIMITS.MIN_CAMPAIGN_BUDGET}`);
    }

    if (newBudget > SAFETY_LIMITS.MAX_CAMPAIGN_BUDGET) {
      throw new Error(`Budget ${newBudget} exceeds maximum ${SAFETY_LIMITS.MAX_CAMPAIGN_BUDGET}`);
    }

    // This would integrate with Google Ads API
    // For now, log and return success

    this.metrics.reallocationCount++;
    this.metrics.totalBudgetManaged += newBudget;

    // Record in history
    this.recordBudgetChange(tenantId, campaignId, newBudget);

    return {
      success: true,
      campaignId,
      newBudget,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper functions
   */

  async getCurrentBudgets(tenantId) {
    // This would fetch from Google Ads API
    // For now, return mock data
    return {};
  }

  async getAccountBudget(tenantId) {
    try {
      const budget = await dataStore.getTenantConfig(tenantId, 'monthly_budget', {
        defaultValue: null
      });

      if (budget) {
        // Convert monthly to daily
        return parseFloat(budget) / 30;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getTodaySpend(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const metrics = await dataStore.getMetrics(tenantId, today, tomorrow);

      const spendByCampaign = {};
      metrics.forEach(m => {
        const campaignId = m.campaign_id;
        const cost = (m.cost_micros || 0) / 1000000;

        spendByCampaign[campaignId] = (spendByCampaign[campaignId] || 0) + cost;
      });

      return spendByCampaign;
    } catch (error) {
      return {};
    }
  }

  findCampaign(campaignId, classification) {
    const allCampaigns = [
      ...classification.winners,
      ...classification.neutral,
      ...classification.losers,
      ...classification.newCampaigns
    ];

    return allCampaigns.find(c => c.campaignId === campaignId);
  }

  generateBudgetChangeReason(campaign, newBudget, currentBudget, intelligence) {
    if (!campaign) {
      return 'Budget optimization';
    }

    if (newBudget > currentBudget) {
      return `Scale winning campaign (ROAS: ${campaign.metrics?.roas?.toFixed(2) || 'N/A'}, Score: ${campaign.performanceScore}/100)`;
    } else {
      return `Reduce budget on underperforming campaign (Score: ${campaign.performanceScore}/100)`;
    }
  }

  estimateImpact(campaign, newBudget, currentBudget) {
    if (!campaign) return 'unknown';

    const changePercent = Math.abs(newBudget - currentBudget) / currentBudget;

    if (changePercent > 0.3 && campaign.performanceScore > 70) {
      return 'high';
    } else if (changePercent > 0.2) {
      return 'medium';
    }
    return 'low';
  }

  calculateConfidence(campaign, intelligence) {
    let confidence = 60;

    if (campaign?.hasSignificance) confidence += 20;
    if (intelligence.trafficPatterns) confidence += 10;
    if (intelligence.demographics) confidence += 10;

    return Math.min(100, confidence);
  }

  recordBudgetChange(tenantId, campaignId, newBudget) {
    const key = `${tenantId}:${campaignId}`;
    if (!this.budgetHistory.has(key)) {
      this.budgetHistory.set(key, []);
    }

    const history = this.budgetHistory.get(key);
    history.push({
      timestamp: new Date().toISOString(),
      budget: newBudget
    });

    // Keep only last 100 changes
    if (history.length > 100) {
      history.shift();
    }
  }

  getBudgetHistory(tenantId, campaignId) {
    const key = `${tenantId}:${campaignId}`;
    return this.budgetHistory.get(key) || [];
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Singleton instance
let budgetAllocatorInstance = null;

/**
 * Get singleton budget allocator instance
 */
export function getBudgetAllocator() {
  if (!budgetAllocatorInstance) {
    budgetAllocatorInstance = new BudgetAllocator();
  }
  return budgetAllocatorInstance;
}

export default getBudgetAllocator;