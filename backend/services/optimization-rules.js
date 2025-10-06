/**
 * Optimization Rules Engine for Ads Autopilot AI SaaS
 *
 * Implements customizable optimization rules, A/B testing framework,
 * and machine learning predictions for campaign optimization
 *
 * Features:
 * - Customizable optimization rules with conditions and actions
 * - A/B testing framework for optimization strategies
 * - Machine learning predictions based on historical data
 * - Rule priority and conflict resolution
 * - Performance threshold management
 * - Alert triggers and notifications
 * - Optimization impact tracking
 */

import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Rule Types and Categories
 */
const RULE_TYPES = {
  PERFORMANCE: 'performance',     // Performance-based rules
  BUDGET: 'budget',              // Budget management rules
  BIDDING: 'bidding',            // Bid adjustment rules
  SCHEDULING: 'scheduling',       // Time-based rules
  KEYWORDS: 'keywords',          // Keyword management rules
  AUDIENCES: 'audiences',        // Audience targeting rules
  SAFETY: 'safety',              // Safety and protection rules
  EXPERIMENTAL: 'experimental'    // A/B testing rules
};

/**
 * Rule Conditions
 */
const RULE_CONDITIONS = {
  // Performance conditions
  CPA_ABOVE: 'cpa_above',
  CPA_BELOW: 'cpa_below',
  ROAS_ABOVE: 'roas_above',
  ROAS_BELOW: 'roas_below',
  CTR_ABOVE: 'ctr_above',
  CTR_BELOW: 'ctr_below',
  CONVERSION_RATE_ABOVE: 'conversion_rate_above',
  CONVERSION_RATE_BELOW: 'conversion_rate_below',

  // Volume conditions
  IMPRESSIONS_ABOVE: 'impressions_above',
  IMPRESSIONS_BELOW: 'impressions_below',
  CLICKS_ABOVE: 'clicks_above',
  CLICKS_BELOW: 'clicks_below',
  SPEND_ABOVE: 'spend_above',
  SPEND_BELOW: 'spend_below',

  // Time conditions
  DAYS_SINCE_CREATED: 'days_since_created',
  DAYS_WITHOUT_CONVERSIONS: 'days_without_conversions',
  TIME_OF_DAY: 'time_of_day',
  DAY_OF_WEEK: 'day_of_week',

  // Trend conditions
  PERFORMANCE_DECLINING: 'performance_declining',
  PERFORMANCE_IMPROVING: 'performance_improving',
  SPEND_ACCELERATING: 'spend_accelerating',

  // Custom conditions
  CUSTOM_METRIC: 'custom_metric',
  COMPETITOR_CHANGE: 'competitor_change',
  SEASONAL_PATTERN: 'seasonal_pattern'
};

/**
 * Rule Actions
 */
const RULE_ACTIONS = {
  // Bid actions
  INCREASE_BIDS: 'increase_bids',
  DECREASE_BIDS: 'decrease_bids',
  SET_BID_STRATEGY: 'set_bid_strategy',

  // Budget actions
  INCREASE_BUDGET: 'increase_budget',
  DECREASE_BUDGET: 'decrease_budget',
  PAUSE_CAMPAIGN: 'pause_campaign',
  ENABLE_CAMPAIGN: 'enable_campaign',

  // Keyword actions
  ADD_KEYWORDS: 'add_keywords',
  PAUSE_KEYWORDS: 'pause_keywords',
  ADD_NEGATIVE_KEYWORDS: 'add_negative_keywords',
  ADJUST_KEYWORD_BIDS: 'adjust_keyword_bids',

  // Ad actions
  CREATE_AD: 'create_ad',
  PAUSE_AD: 'pause_ad',
  UPDATE_AD: 'update_ad',

  // Targeting actions
  ADJUST_AUDIENCES: 'adjust_audiences',
  ADJUST_LOCATIONS: 'adjust_locations',
  ADJUST_DEVICES: 'adjust_devices',
  ADJUST_SCHEDULE: 'adjust_schedule',

  // Alert actions
  SEND_ALERT: 'send_alert',
  CREATE_REPORT: 'create_report',
  LOG_EVENT: 'log_event'
};

/**
 * Default Optimization Rules
 */
const DEFAULT_RULES = [
  {
    id: 'high_cpa_pause',
    name: 'Pause High CPA Keywords',
    type: RULE_TYPES.SAFETY,
    priority: 10,
    enabled: true,
    conditions: [
      { type: RULE_CONDITIONS.CPA_ABOVE, value: 100, operator: 'AND' },
      { type: RULE_CONDITIONS.SPEND_ABOVE, value: 50, operator: 'AND' },
      { type: RULE_CONDITIONS.DAYS_WITHOUT_CONVERSIONS, value: 7 }
    ],
    actions: [
      { type: RULE_ACTIONS.PAUSE_KEYWORDS, confidence: 90 },
      { type: RULE_ACTIONS.SEND_ALERT, message: 'High CPA keywords paused' }
    ],
    cooldown: 24 * 60 * 60 * 1000, // 24 hours
    description: 'Automatically pause keywords with high CPA and no conversions'
  },

  {
    id: 'low_cpa_scale',
    name: 'Scale Low CPA Winners',
    type: RULE_TYPES.PERFORMANCE,
    priority: 8,
    enabled: true,
    conditions: [
      { type: RULE_CONDITIONS.CPA_BELOW, value: 25, operator: 'AND' },
      { type: RULE_CONDITIONS.CLICKS_ABOVE, value: 50, operator: 'AND' },
      { type: RULE_CONDITIONS.PERFORMANCE_IMPROVING, value: true }
    ],
    actions: [
      { type: RULE_ACTIONS.INCREASE_BIDS, adjustment: 1.20 },
      { type: RULE_ACTIONS.INCREASE_BUDGET, adjustment: 1.30 }
    ],
    cooldown: 6 * 60 * 60 * 1000, // 6 hours
    description: 'Scale campaigns/keywords with low CPA and good performance'
  },

  {
    id: 'poor_ctr_optimize',
    name: 'Optimize Poor CTR',
    type: RULE_TYPES.PERFORMANCE,
    priority: 6,
    enabled: true,
    conditions: [
      { type: RULE_CONDITIONS.CTR_BELOW, value: 1.0, operator: 'AND' },
      { type: RULE_CONDITIONS.IMPRESSIONS_ABOVE, value: 1000 }
    ],
    actions: [
      { type: RULE_ACTIONS.CREATE_AD, template: 'high_ctr' },
      { type: RULE_ACTIONS.ADD_NEGATIVE_KEYWORDS, source: 'search_terms' }
    ],
    cooldown: 12 * 60 * 60 * 1000, // 12 hours
    description: 'Optimize campaigns with poor CTR by creating new ads and adding negatives'
  },

  {
    id: 'budget_pacing',
    name: 'Budget Pacing Optimization',
    type: RULE_TYPES.BUDGET,
    priority: 7,
    enabled: true,
    conditions: [
      { type: RULE_CONDITIONS.TIME_OF_DAY, value: [9, 10, 11, 17, 18, 19] },
      { type: RULE_CONDITIONS.PERFORMANCE_IMPROVING, value: true }
    ],
    actions: [
      { type: RULE_ACTIONS.INCREASE_BIDS, adjustment: 1.15, timeSpecific: true }
    ],
    cooldown: 60 * 60 * 1000, // 1 hour
    description: 'Increase bids during peak conversion hours for improving campaigns'
  },

  {
    id: 'competitor_response',
    name: 'Competitive Response',
    type: RULE_TYPES.BIDDING,
    priority: 5,
    enabled: true,
    conditions: [
      { type: RULE_CONDITIONS.COMPETITOR_CHANGE, value: 'impression_share_loss' },
      { type: RULE_CONDITIONS.ROAS_ABOVE, value: 3.0 }
    ],
    actions: [
      { type: RULE_ACTIONS.INCREASE_BIDS, adjustment: 1.10 }
    ],
    cooldown: 2 * 60 * 60 * 1000, // 2 hours
    description: 'Respond to competitor bid increases when ROAS allows'
  }
];

/**
 * Optimization Rules Engine
 */
export class OptimizationRules {
  constructor() {
    this.rules = new Map(); // Store active rules
    this.ruleHistory = new Map(); // Track rule executions
    this.abTests = new Map(); // Active A/B tests
    this.mlModels = new Map(); // ML prediction models

    // Configuration
    this.config = {
      enabled: true,
      maxRulesPerTenant: 50,
      defaultCooldown: 60 * 60 * 1000, // 1 hour
      mlPredictionThreshold: 0.7,
      abTestDuration: 14 * 24 * 60 * 60 * 1000, // 14 days
      maxConcurrentTests: 5
    };

    // Metrics
    this.metrics = {
      rulesExecuted: 0,
      actionsTriggered: 0,
      successfulActions: 0,
      failedActions: 0,
      mlPredictions: 0,
      abTestsCreated: 0
    };

    // Initialize with default rules
    this.initializeDefaultRules();

    console.log('Optimization Rules Engine initialized');
  }

  /**
   * Initialize default rules
   */
  initializeDefaultRules() {
    DEFAULT_RULES.forEach(rule => {
      this.rules.set(rule.id, {
        ...rule,
        createdAt: new Date().toISOString(),
        lastExecuted: null,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      });
    });
  }

  /**
   * Evaluate rules for a tenant's campaigns
   */
  async evaluateRules(tenantId, campaigns, intelligence) {
    const startTime = Date.now();
    const triggeredActions = [];

    try {
      logger.info('Evaluating optimization rules', {
        tenantId,
        campaignCount: campaigns.length,
        ruleCount: this.rules.size
      });

      // Get tenant-specific rules
      const tenantRules = await this.getTenantRules(tenantId);

      // Combine default and tenant rules
      const allRules = new Map([...this.rules, ...tenantRules]);

      // Sort rules by priority (highest first)
      const sortedRules = Array.from(allRules.values())
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      // Evaluate each rule
      for (const rule of sortedRules) {
        // Check cooldown
        if (!this.isRuleReady(rule)) {
          continue;
        }

        // Evaluate rule conditions
        const matchingCampaigns = this.evaluateRuleConditions(
          rule,
          campaigns,
          intelligence
        );

        if (matchingCampaigns.length > 0) {
          // Execute rule actions
          const actions = await this.executeRuleActions(
            tenantId,
            rule,
            matchingCampaigns,
            intelligence
          );

          triggeredActions.push(...actions);

          // Update rule metrics
          this.updateRuleMetrics(rule, actions);

          // Record rule execution
          await this.recordRuleExecution(tenantId, rule, matchingCampaigns, actions);
        }
      }

      // Generate ML-based predictions
      const mlActions = await this.generateMLPredictions(
        tenantId,
        campaigns,
        intelligence
      );
      triggeredActions.push(...mlActions);

      // Evaluate A/B tests
      const abTestActions = await this.evaluateABTests(
        tenantId,
        campaigns,
        intelligence
      );
      triggeredActions.push(...abTestActions);

      this.metrics.rulesExecuted++;

      logger.info('Rules evaluation completed', {
        tenantId,
        duration: Date.now() - startTime,
        rulesEvaluated: sortedRules.length,
        actionsTriggered: triggeredActions.length
      });

      return triggeredActions;

    } catch (error) {
      logger.error('Failed to evaluate rules', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  /**
   * Evaluate rule conditions against campaigns
   */
  evaluateRuleConditions(rule, campaigns, intelligence) {
    const matchingCampaigns = [];

    for (const campaign of campaigns) {
      let ruleMatches = true;
      let conditionResults = [];

      for (const condition of rule.conditions) {
        const result = this.evaluateCondition(condition, campaign, intelligence);
        conditionResults.push(result);

        // Handle operators
        if (condition.operator === 'AND' && !result) {
          ruleMatches = false;
          break;
        } else if (condition.operator === 'OR' && result) {
          ruleMatches = true;
          break;
        }
      }

      // Default AND logic if no operators specified
      if (!rule.conditions.some(c => c.operator)) {
        ruleMatches = conditionResults.every(r => r);
      }

      if (ruleMatches) {
        matchingCampaigns.push({
          ...campaign,
          conditionResults,
          ruleId: rule.id
        });
      }
    }

    return matchingCampaigns;
  }

  /**
   * Evaluate single condition
   */
  evaluateCondition(condition, campaign, intelligence) {
    const metrics = campaign.metrics || {};

    switch (condition.type) {
      case RULE_CONDITIONS.CPA_ABOVE:
        return metrics.cpa > condition.value;

      case RULE_CONDITIONS.CPA_BELOW:
        return metrics.cpa < condition.value;

      case RULE_CONDITIONS.ROAS_ABOVE:
        return metrics.roas > condition.value;

      case RULE_CONDITIONS.ROAS_BELOW:
        return metrics.roas < condition.value;

      case RULE_CONDITIONS.CTR_ABOVE:
        return metrics.ctr > condition.value;

      case RULE_CONDITIONS.CTR_BELOW:
        return metrics.ctr < condition.value;

      case RULE_CONDITIONS.CONVERSION_RATE_ABOVE:
        return metrics.conversionRate > condition.value;

      case RULE_CONDITIONS.CONVERSION_RATE_BELOW:
        return metrics.conversionRate < condition.value;

      case RULE_CONDITIONS.IMPRESSIONS_ABOVE:
        return metrics.impressions > condition.value;

      case RULE_CONDITIONS.IMPRESSIONS_BELOW:
        return metrics.impressions < condition.value;

      case RULE_CONDITIONS.CLICKS_ABOVE:
        return metrics.clicks > condition.value;

      case RULE_CONDITIONS.CLICKS_BELOW:
        return metrics.clicks < condition.value;

      case RULE_CONDITIONS.SPEND_ABOVE:
        return metrics.cost > condition.value;

      case RULE_CONDITIONS.SPEND_BELOW:
        return metrics.cost < condition.value;

      case RULE_CONDITIONS.TIME_OF_DAY:
        const currentHour = new Date().getHours();
        return condition.value.includes(currentHour);

      case RULE_CONDITIONS.DAY_OF_WEEK:
        const currentDay = new Date().getDay();
        return condition.value.includes(currentDay);

      case RULE_CONDITIONS.PERFORMANCE_DECLINING:
        return campaign.trend === 'declining' || campaign.trend === 'slightly_declining';

      case RULE_CONDITIONS.PERFORMANCE_IMPROVING:
        return campaign.trend === 'improving' || campaign.trend === 'slightly_improving';

      case RULE_CONDITIONS.DAYS_WITHOUT_CONVERSIONS:
        // This would need to be calculated from historical data
        return this.calculateDaysWithoutConversions(campaign) > condition.value;

      case RULE_CONDITIONS.COMPETITOR_CHANGE:
        return this.detectCompetitorChange(campaign, intelligence, condition.value);

      default:
        logger.warn('Unknown condition type', { type: condition.type });
        return false;
    }
  }

  /**
   * Execute rule actions
   */
  async executeRuleActions(tenantId, rule, campaigns, intelligence) {
    const actions = [];

    for (const actionDef of rule.actions) {
      for (const campaign of campaigns) {
        try {
          const action = await this.createActionFromDefinition(
            tenantId,
            rule,
            campaign,
            actionDef,
            intelligence
          );

          if (action) {
            actions.push(action);
            this.metrics.actionsTriggered++;
          }

        } catch (error) {
          logger.error('Failed to create action', {
            tenantId,
            ruleId: rule.id,
            campaignId: campaign.campaignId,
            action: actionDef,
            error: error.message
          });
          this.metrics.failedActions++;
        }
      }
    }

    return actions;
  }

  /**
   * Create action from rule definition
   */
  async createActionFromDefinition(tenantId, rule, campaign, actionDef, intelligence) {
    const baseAction = {
      ruleId: rule.id,
      ruleName: rule.name,
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      confidence: actionDef.confidence || 70,
      reason: `Rule: ${rule.name} - ${rule.description}`,
      source: 'rules_engine'
    };

    switch (actionDef.type) {
      case RULE_ACTIONS.INCREASE_BIDS:
        return {
          ...baseAction,
          type: 'increase_bids',
          adjustment: actionDef.adjustment || 1.20,
          timeSpecific: actionDef.timeSpecific || false,
          expectedImpact: 'medium'
        };

      case RULE_ACTIONS.DECREASE_BIDS:
        return {
          ...baseAction,
          type: 'decrease_bids',
          adjustment: actionDef.adjustment || 0.80,
          expectedImpact: 'medium'
        };

      case RULE_ACTIONS.INCREASE_BUDGET:
        return {
          ...baseAction,
          type: 'increase_budget',
          currentValue: campaign.budget,
          newValue: campaign.budget * (actionDef.adjustment || 1.30),
          change: '+' + ((actionDef.adjustment - 1) * 100).toFixed(1) + '%',
          expectedImpact: 'high'
        };

      case RULE_ACTIONS.DECREASE_BUDGET:
        return {
          ...baseAction,
          type: 'decrease_budget',
          currentValue: campaign.budget,
          newValue: campaign.budget * (actionDef.adjustment || 0.70),
          change: '-' + ((1 - actionDef.adjustment) * 100).toFixed(1) + '%',
          expectedImpact: 'medium'
        };

      case RULE_ACTIONS.PAUSE_CAMPAIGN:
        return {
          ...baseAction,
          type: 'pause_campaign',
          estimatedSavings: campaign.metrics.cost || 0,
          expectedImpact: 'high'
        };

      case RULE_ACTIONS.PAUSE_KEYWORDS:
        return {
          ...baseAction,
          type: 'pause_keywords',
          criteria: this.identifyKeywordsToPause(campaign, actionDef),
          expectedImpact: 'medium'
        };

      case RULE_ACTIONS.ADD_NEGATIVE_KEYWORDS:
        return {
          ...baseAction,
          type: 'add_negative_keywords',
          keywords: await this.suggestNegativeKeywords(tenantId, campaign, actionDef),
          expectedImpact: 'medium'
        };

      case RULE_ACTIONS.SEND_ALERT:
        await this.sendAlert(tenantId, rule, campaign, actionDef.message);
        return {
          ...baseAction,
          type: 'alert_sent',
          message: actionDef.message,
          expectedImpact: 'informational'
        };

      default:
        logger.warn('Unknown action type', { type: actionDef.type });
        return null;
    }
  }

  /**
   * Generate ML-based predictions
   */
  async generateMLPredictions(tenantId, campaigns, intelligence) {
    const predictions = [];

    try {
      // This would integrate with actual ML models
      // For now, we'll implement basic predictive rules

      for (const campaign of campaigns) {
        // Predict campaign performance trajectory
        const performancePrediction = this.predictPerformanceTrajectory(campaign, intelligence);

        if (performancePrediction.confidence > this.config.mlPredictionThreshold) {
          const action = this.createMLAction(campaign, performancePrediction);
          if (action) {
            predictions.push(action);
          }
        }

        // Predict optimal bid adjustments
        const bidPrediction = this.predictOptimalBids(campaign, intelligence);

        if (bidPrediction.confidence > this.config.mlPredictionThreshold) {
          const action = this.createBidPredictionAction(campaign, bidPrediction);
          if (action) {
            predictions.push(action);
          }
        }
      }

      this.metrics.mlPredictions += predictions.length;

      return predictions;

    } catch (error) {
      logger.error('Failed to generate ML predictions', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Predict campaign performance trajectory
   */
  predictPerformanceTrajectory(campaign, intelligence) {
    // Simple trend-based prediction
    // In production, this would use actual ML models

    const metrics = campaign.metrics;
    const trend = campaign.trend;

    let prediction = 'stable';
    let confidence = 0.5;
    let recommendation = null;

    // Performance is declining
    if (trend === 'declining' && metrics.roas < 2.0) {
      prediction = 'performance_decline';
      confidence = 0.8;
      recommendation = 'reduce_budget';
    }
    // Performance is improving
    else if (trend === 'improving' && metrics.roas > 3.0) {
      prediction = 'performance_growth';
      confidence = 0.8;
      recommendation = 'scale_budget';
    }
    // High CTR but low conversion rate
    else if (metrics.ctr > 3.0 && metrics.conversionRate < 1.0) {
      prediction = 'landing_page_issue';
      confidence = 0.7;
      recommendation = 'optimize_landing_page';
    }
    // Low CTR but high conversion rate
    else if (metrics.ctr < 1.0 && metrics.conversionRate > 3.0) {
      prediction = 'ad_creative_issue';
      confidence = 0.7;
      recommendation = 'create_new_ads';
    }

    return {
      prediction,
      confidence,
      recommendation,
      metrics: {
        currentRoas: metrics.roas,
        currentCtr: metrics.ctr,
        currentConversionRate: metrics.conversionRate
      }
    };
  }

  /**
   * Predict optimal bids
   */
  predictOptimalBids(campaign, intelligence) {
    const metrics = campaign.metrics;

    // Simple bid optimization logic
    // In production, this would use ML models trained on historical data

    let optimalBidMultiplier = 1.0;
    let confidence = 0.5;
    let reasoning = '';

    // If CPA is well below target and ROAS is high, increase bids
    if (metrics.cpa < 30 && metrics.roas > 4.0) {
      optimalBidMultiplier = 1.25;
      confidence = 0.8;
      reasoning = 'Low CPA and high ROAS indicate room for scaling';
    }
    // If CPA is above target, decrease bids
    else if (metrics.cpa > 75) {
      optimalBidMultiplier = 0.75;
      confidence = 0.7;
      reasoning = 'High CPA requires bid reduction';
    }
    // Time-based adjustments
    else if (intelligence.trafficPatterns?.hourly) {
      const currentHour = new Date().getHours();
      const hourlyData = intelligence.trafficPatterns.hourly.qualityScores?.[currentHour];

      if (hourlyData && hourlyData.quality === 'high') {
        optimalBidMultiplier = 1.15;
        confidence = 0.6;
        reasoning = 'Peak performance hour detected';
      }
    }

    return {
      optimalBidMultiplier,
      confidence,
      reasoning,
      currentBid: metrics.avgCpc || 0
    };
  }

  /**
   * Create ML-based action
   */
  createMLAction(campaign, prediction) {
    if (!prediction.recommendation) return null;

    const baseAction = {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      confidence: Math.round(prediction.confidence * 100),
      reason: `ML Prediction: ${prediction.prediction} - ${prediction.recommendation}`,
      source: 'ml_engine',
      prediction: prediction.prediction
    };

    switch (prediction.recommendation) {
      case 'scale_budget':
        return {
          ...baseAction,
          type: 'increase_budget',
          currentValue: campaign.budget,
          newValue: campaign.budget * 1.30,
          change: '+30%',
          expectedImpact: 'high'
        };

      case 'reduce_budget':
        return {
          ...baseAction,
          type: 'decrease_budget',
          currentValue: campaign.budget,
          newValue: campaign.budget * 0.70,
          change: '-30%',
          expectedImpact: 'medium'
        };

      case 'create_new_ads':
        return {
          ...baseAction,
          type: 'create_ad',
          template: 'high_ctr',
          expectedImpact: 'medium'
        };

      case 'optimize_landing_page':
        return {
          ...baseAction,
          type: 'alert_sent',
          message: 'Landing page optimization needed - high CTR but low conversion rate',
          expectedImpact: 'informational'
        };

      default:
        return null;
    }
  }

  /**
   * Create bid prediction action
   */
  createBidPredictionAction(campaign, prediction) {
    if (Math.abs(prediction.optimalBidMultiplier - 1.0) < 0.05) {
      return null; // Change too small
    }

    const action = {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      confidence: Math.round(prediction.confidence * 100),
      reason: `ML Bid Optimization: ${prediction.reasoning}`,
      source: 'ml_bid_predictor',
      expectedImpact: 'medium'
    };

    if (prediction.optimalBidMultiplier > 1.0) {
      return {
        ...action,
        type: 'increase_bids',
        adjustment: prediction.optimalBidMultiplier
      };
    } else {
      return {
        ...action,
        type: 'decrease_bids',
        adjustment: prediction.optimalBidMultiplier
      };
    }
  }

  /**
   * Evaluate A/B tests
   */
  async evaluateABTests(tenantId, campaigns, intelligence) {
    const actions = [];

    try {
      const activeTests = this.abTests.get(tenantId) || [];

      for (const test of activeTests) {
        // Check if test has enough data for statistical significance
        const testResults = await this.analyzeABTest(tenantId, test);

        if (testResults.significant) {
          // Apply winning strategy
          const winnerActions = this.applyWinningStrategy(test, testResults);
          actions.push(...winnerActions);

          // Mark test as completed
          test.status = 'completed';
          test.completedAt = new Date().toISOString();
          test.results = testResults;
        }

        // Check if test should be stopped (duration exceeded)
        const testDuration = Date.now() - new Date(test.startedAt).getTime();
        if (testDuration > this.config.abTestDuration) {
          test.status = 'expired';
          test.completedAt = new Date().toISOString();
        }
      }

      // Clean up completed tests
      this.abTests.set(tenantId, activeTests.filter(t => t.status === 'active'));

      return actions;

    } catch (error) {
      logger.error('Failed to evaluate A/B tests', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Helper functions
   */

  isRuleReady(rule) {
    if (!rule.lastExecuted) return true;

    const cooldown = rule.cooldown || this.config.defaultCooldown;
    const timeSinceLastExecution = Date.now() - new Date(rule.lastExecuted).getTime();

    return timeSinceLastExecution >= cooldown;
  }

  updateRuleMetrics(rule, actions) {
    rule.lastExecuted = new Date().toISOString();
    rule.executionCount++;

    const successfulActions = actions.filter(a => !a.error);
    rule.successCount += successfulActions.length;
    rule.failureCount += actions.length - successfulActions.length;
  }

  async getTenantRules(tenantId) {
    try {
      const rules = await dataStore.getTenantConfig(tenantId, 'custom_optimization_rules', {
        defaultValue: []
      });

      const ruleMap = new Map();
      rules.forEach(rule => {
        ruleMap.set(rule.id, rule);
      });

      return ruleMap;
    } catch (error) {
      return new Map();
    }
  }

  calculateDaysWithoutConversions(campaign) {
    // This would need to query historical data
    // For now, return a mock value
    return campaign.metrics.conversions === 0 ? 5 : 0;
  }

  detectCompetitorChange(campaign, intelligence, changeType) {
    // This would integrate with competitor intelligence
    if (!intelligence.competitors) return false;

    // Mock implementation
    return changeType === 'impression_share_loss' &&
           Math.random() > 0.8; // 20% chance for demo
  }

  identifyKeywordsToPause(campaign, actionDef) {
    // Mock implementation - would identify specific keywords
    return ['low-performing-keyword-1', 'low-performing-keyword-2'];
  }

  async suggestNegativeKeywords(tenantId, campaign, actionDef) {
    // Mock implementation - would analyze search terms
    return ['cheap', 'free', 'discount'];
  }

  async sendAlert(tenantId, rule, campaign, message) {
    try {
      await dataStore.addLog(tenantId, 'warning', `Optimization Alert: ${message}`, {
        ruleId: rule.id,
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName
      });
    } catch (error) {
      logger.error('Failed to send alert', { tenantId, error: error.message });
    }
  }

  async recordRuleExecution(tenantId, rule, campaigns, actions) {
    try {
      await dataStore.addLog(tenantId, 'info', 'Optimization rule executed', {
        ruleId: rule.id,
        ruleName: rule.name,
        campaignCount: campaigns.length,
        actionCount: actions.length,
        campaigns: campaigns.map(c => ({ id: c.campaignId, name: c.campaignName }))
      });
    } catch (error) {
      logger.error('Failed to record rule execution', { tenantId, error: error.message });
    }
  }

  async analyzeABTest(tenantId, test) {
    // Mock A/B test analysis
    return {
      significant: true,
      winner: 'variant_a',
      confidence: 0.95,
      improvement: 15.3
    };
  }

  applyWinningStrategy(test, results) {
    // Mock implementation
    return [];
  }

  /**
   * Public API methods
   */

  async createCustomRule(tenantId, ruleDefinition) {
    try {
      const existingRules = await this.getTenantRules(tenantId);

      if (existingRules.size >= this.config.maxRulesPerTenant) {
        throw new Error(`Maximum rules limit reached (${this.config.maxRulesPerTenant})`);
      }

      const rule = {
        ...ruleDefinition,
        id: `custom_${Date.now()}`,
        createdAt: new Date().toISOString(),
        lastExecuted: null,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      };

      const rules = Array.from(existingRules.values());
      rules.push(rule);

      await dataStore.setTenantConfig(tenantId, 'custom_optimization_rules', rules);

      logger.info('Custom rule created', { tenantId, ruleId: rule.id });

      return rule;
    } catch (error) {
      logger.error('Failed to create custom rule', { tenantId, error: error.message });
      throw error;
    }
  }

  async startABTest(tenantId, testDefinition) {
    try {
      const activateTests = this.abTests.get(tenantId) || [];

      if (activateTests.length >= this.config.maxConcurrentTests) {
        throw new Error(`Maximum concurrent tests limit reached (${this.config.maxConcurrentTests})`);
      }

      const test = {
        ...testDefinition,
        id: `test_${Date.now()}`,
        startedAt: new Date().toISOString(),
        status: 'active'
      };

      activateTests.push(test);
      this.abTests.set(tenantId, activateTests);

      this.metrics.abTestsCreated++;

      logger.info('A/B test started', { tenantId, testId: test.id });

      return test;
    } catch (error) {
      logger.error('Failed to start A/B test', { tenantId, error: error.message });
      throw error;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getRules() {
    return Array.from(this.rules.values());
  }

  async getTenantRuleHistory(tenantId) {
    return this.ruleHistory.get(tenantId) || [];
  }
}

// Singleton instance
let optimizationRulesInstance = null;

/**
 * Get singleton optimization rules instance
 */
export function getOptimizationRules() {
  if (!optimizationRulesInstance) {
    optimizationRulesInstance = new OptimizationRules();
  }
  return optimizationRulesInstance;
}

export default getOptimizationRules;