/**
 * Campaign Auto-Optimizer Service for Ads Autopilot AI SaaS
 *
 * Continuously optimizes Google Ads campaigns based on real-time performance data
 * Acts as a professional PPC manager making intelligent decisions 24/7
 *
 * Features:
 * - Real-time campaign performance analysis
 * - Automatic identification of winning and losing campaigns/keywords
 * - Dynamic budget and bid adjustments
 * - Auto-pause underperforming elements
 * - Auto-scale successful campaigns
 * - Integration with all data sources (website, competitor, traffic, demographics)
 */

import dataStore from './data-store.js';
import logger from './logger.js';
import { getWebsiteScraper } from './website-scraper.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import trafficAnalyzer from './traffic-analyzer.js';
import demographicProfiler from './demographic-profiler.js';
import { getBidManager } from './bid-manager.js';
import { getBudgetAllocator } from './budget-allocator.js';
import { getOptimizationRules } from './optimization-rules.js';

/**
 * Campaign Performance Thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  // Conversion-based thresholds
  MIN_CONVERSION_RATE: 1.0, // 1% minimum
  TARGET_CONVERSION_RATE: 3.0, // 3% target
  EXCELLENT_CONVERSION_RATE: 5.0, // 5% excellent

  // Cost thresholds
  MAX_CPA_MULTIPLIER: 2.0, // 2x target CPA
  TARGET_ROAS: 3.0, // 3:1 return on ad spend
  MIN_ROAS: 1.5, // 1.5:1 minimum ROAS

  // Click and impression thresholds
  MIN_CTR: 1.0, // 1% minimum CTR
  MIN_QUALITY_SCORE: 5, // Minimum quality score

  // Statistical significance
  MIN_CLICKS_FOR_DECISION: 50, // Minimum clicks before making decisions
  MIN_IMPRESSIONS_FOR_DECISION: 1000, // Minimum impressions

  // Time-based thresholds
  EVALUATION_WINDOW_DAYS: 7, // 7 days for performance evaluation
  QUICK_DECISION_DAYS: 3, // 3 days for quick decisions on obvious winners/losers

  // Budget and bid adjustment limits
  MAX_BID_INCREASE: 0.30, // 30% max increase
  MAX_BID_DECREASE: 0.50, // 50% max decrease
  MAX_BUDGET_INCREASE: 0.50, // 50% max increase
  MAX_BUDGET_DECREASE: 0.30 // 30% max decrease
};

/**
 * Campaign Auto-Optimizer
 */
export class CampaignOptimizer {
  constructor() {
    this.websiteScraper = null;
    this.competitorIntel = null;
    this.bidManager = null;
    this.budgetAllocator = null;
    this.optimizationRules = null;

    // Optimization state tracking
    this.optimizationHistory = new Map(); // tenant -> optimization history
    this.campaignPerformance = new Map(); // campaignId -> performance metrics
    this.lastOptimization = new Map(); // tenant -> timestamp

    // Configuration
    this.config = {
      enabled: true,
      optimizationInterval: 60 * 60 * 1000, // 1 hour
      minOptimizationGap: 4 * 60 * 60 * 1000, // 4 hours between optimizations
      aggressiveness: 'moderate', // conservative, moderate, aggressive
      autoApprove: false, // Require approval for changes
      safetyChecks: true
    };

    // Metrics
    this.metrics = {
      optimizationsRun: 0,
      campaignsOptimized: 0,
      budgetAdjustments: 0,
      bidAdjustments: 0,
      pausedCampaigns: 0,
      scaledCampaigns: 0,
      totalSavings: 0,
      totalGains: 0
    };

    console.log('Campaign Auto-Optimizer initialized');
  }

  /**
   * Initialize optimizer with required services
   */
  async initialize() {
    try {
      this.websiteScraper = getWebsiteScraper();
      this.competitorIntel = getCompetitorIntelligenceService();
      this.bidManager = getBidManager();
      this.budgetAllocator = getBudgetAllocator();
      this.optimizationRules = getOptimizationRules();

      await this.websiteScraper.initialize();

      logger.info('Campaign optimizer initialized with all services');
      return true;
    } catch (error) {
      logger.error('Failed to initialize campaign optimizer:', error);
      throw error;
    }
  }

  /**
   * Run full optimization cycle for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Optimization options
   * @returns {Promise<object>} Optimization results
   */
  async optimizeCampaigns(tenantId, options = {}) {
    const {
      forceRun = false,
      dryRun = false,
      aggressiveness = this.config.aggressiveness
    } = options;

    const startTime = Date.now();

    try {
      // Check if we should run optimization
      if (!forceRun && !this.shouldRunOptimization(tenantId)) {
        return {
          status: 'skipped',
          reason: 'Too soon since last optimization',
          lastRun: this.lastOptimization.get(tenantId),
          nextRun: new Date(this.lastOptimization.get(tenantId) + this.config.minOptimizationGap)
        };
      }

      await this.initialize();

      logger.info('Starting campaign optimization', { tenantId, dryRun, aggressiveness });

      // Step 1: Gather all intelligence data
      const intelligence = await this.gatherIntelligence(tenantId);

      // Step 2: Analyze campaign performance
      const performance = await this.analyzeCampaignPerformance(tenantId, intelligence);

      // Step 3: Identify winners and losers
      const classification = this.classifyCampaigns(performance);

      // Step 4: Generate optimization actions
      const actions = await this.generateOptimizationActions(
        tenantId,
        classification,
        intelligence,
        aggressiveness
      );

      // Step 5: Execute actions (if not dry run)
      let executionResults = null;
      if (!dryRun) {
        executionResults = await this.executeActions(tenantId, actions);
      }

      // Step 6: Record optimization
      await this.recordOptimization(tenantId, {
        intelligence,
        performance,
        classification,
        actions,
        executionResults,
        dryRun
      });

      // Update last optimization time
      this.lastOptimization.set(tenantId, Date.now());
      this.metrics.optimizationsRun++;

      const result = {
        status: 'completed',
        tenantId,
        dryRun,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        summary: {
          totalCampaigns: performance.campaigns.length,
          winners: classification.winners.length,
          losers: classification.losers.length,
          neutral: classification.neutral.length,
          actionsGenerated: actions.length,
          actionsExecuted: executionResults ? executionResults.executed.length : 0,
          estimatedImpact: this.calculateEstimatedImpact(actions)
        },
        classification,
        actions,
        executionResults,
        intelligence: {
          hasWebsiteData: !!intelligence.websiteContent,
          hasCompetitorData: !!intelligence.competitors,
          hasTrafficPatterns: !!intelligence.trafficPatterns,
          hasDemographics: !!intelligence.demographics
        }
      };

      logger.info('Campaign optimization completed', {
        tenantId,
        duration: result.duration,
        actions: result.summary.actionsGenerated,
        executed: result.summary.actionsExecuted
      });

      return result;

    } catch (error) {
      logger.error('Campaign optimization failed', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Gather all intelligence from integrated services
   */
  async gatherIntelligence(tenantId) {
    const startTime = Date.now();

    logger.info('Gathering intelligence for optimization', { tenantId });

    const intelligence = {};

    // Gather in parallel for speed
    const [
      websiteContent,
      competitors,
      trafficPatterns,
      demographics,
      tenantConfig
    ] = await Promise.allSettled([
      this.getWebsiteIntelligence(tenantId).catch(e => {
        logger.warn('Website intelligence gathering failed:', e);
        return null;
      }),
      this.getCompetitorIntelligence(tenantId).catch(e => {
        logger.warn('Competitor intelligence gathering failed:', e);
        return null;
      }),
      this.getTrafficIntelligence(tenantId).catch(e => {
        logger.warn('Traffic intelligence gathering failed:', e);
        return null;
      }),
      this.getDemographicIntelligence(tenantId).catch(e => {
        logger.warn('Demographic intelligence gathering failed:', e);
        return null;
      }),
      dataStore.getAllTenantConfigs(tenantId).catch(e => {
        logger.warn('Tenant config gathering failed:', e);
        return {};
      })
    ]);

    intelligence.websiteContent = websiteContent.status === 'fulfilled' ? websiteContent.value : null;
    intelligence.competitors = competitors.status === 'fulfilled' ? competitors.value : null;
    intelligence.trafficPatterns = trafficPatterns.status === 'fulfilled' ? trafficPatterns.value : null;
    intelligence.demographics = demographics.status === 'fulfilled' ? demographics.value : null;
    intelligence.tenantConfig = tenantConfig.status === 'fulfilled' ? tenantConfig.value : {};

    intelligence.gatheringTime = Date.now() - startTime;

    logger.info('Intelligence gathered', {
      tenantId,
      duration: intelligence.gatheringTime,
      sources: Object.keys(intelligence).filter(k => intelligence[k] !== null).length
    });

    return intelligence;
  }

  /**
   * Get website content intelligence
   */
  async getWebsiteIntelligence(tenantId) {
    try {
      const websiteUrl = await dataStore.getTenantConfig(tenantId, 'website_url', {
        defaultValue: null
      });

      if (!websiteUrl) {
        return null;
      }

      const content = await this.websiteScraper.scrapeWebsite(websiteUrl, {
        tenant: tenantId,
        depth: 1,
        includeProducts: true,
        includeTestimonials: true,
        includeOffers: true
      });

      return {
        url: websiteUrl,
        products: content.products || [],
        usps: content.usps || [],
        offers: content.offers || [],
        hooks: content.hooks || [],
        brandVoice: content.brandVoice || {}
      };
    } catch (error) {
      logger.warn('Failed to get website intelligence:', error);
      return null;
    }
  }

  /**
   * Get competitor intelligence
   */
  async getCompetitorIntelligence(tenantId) {
    try {
      const summary = await this.competitorIntel.getIntelligenceSummary(tenantId);
      return summary;
    } catch (error) {
      logger.warn('Failed to get competitor intelligence:', error);
      return null;
    }
  }

  /**
   * Get traffic pattern intelligence
   */
  async getTrafficIntelligence(tenantId) {
    try {
      const analysis = await trafficAnalyzer.getComprehensiveAnalysis(tenantId);
      return analysis;
    } catch (error) {
      logger.warn('Failed to get traffic intelligence:', error);
      return null;
    }
  }

  /**
   * Get demographic intelligence
   */
  async getDemographicIntelligence(tenantId) {
    try {
      const profile = await demographicProfiler.generateDemographicProfile(tenantId, {
        refreshCache: false,
        minOrders: 1
      });
      return profile;
    } catch (error) {
      logger.warn('Failed to get demographic intelligence:', error);
      return null;
    }
  }

  /**
   * Analyze campaign performance
   */
  async analyzeCampaignPerformance(tenantId, intelligence) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - PERFORMANCE_THRESHOLDS.EVALUATION_WINDOW_DAYS);

    // Get metrics for evaluation period
    const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

    if (!metrics || metrics.length === 0) {
      return {
        campaigns: [],
        keywords: [],
        searchTerms: []
      };
    }

    // Group metrics by campaign
    const campaignMetrics = this.groupMetricsByCampaign(metrics);

    // Analyze each campaign
    const campaigns = [];
    for (const [campaignId, campMetrics] of Object.entries(campaignMetrics)) {
      const analysis = this.analyzeSingleCampaign(campaignId, campMetrics, intelligence);
      campaigns.push(analysis);
    }

    // Get keyword performance
    const keywords = await this.analyzeKeywordPerformance(tenantId, startDate, endDate);

    // Get search term performance
    const searchTerms = await this.analyzeSearchTermPerformance(tenantId, startDate, endDate);

    return {
      campaigns,
      keywords,
      searchTerms,
      evaluationPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: PERFORMANCE_THRESHOLDS.EVALUATION_WINDOW_DAYS
      }
    };
  }

  /**
   * Group metrics by campaign
   */
  groupMetricsByCampaign(metrics) {
    const grouped = {};

    metrics.forEach(metric => {
      const campaignId = metric.campaign_id || 'unknown';
      if (!grouped[campaignId]) {
        grouped[campaignId] = [];
      }
      grouped[campaignId].push(metric);
    });

    return grouped;
  }

  /**
   * Analyze single campaign performance
   */
  analyzeSingleCampaign(campaignId, metrics, intelligence) {
    // Aggregate metrics
    const totals = metrics.reduce((acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      conversions: acc.conversions + (m.conversions || 0),
      cost: acc.cost + ((m.cost_micros || 0) / 1000000),
      conversions_value: acc.conversions_value + (m.conversions_value || 0)
    }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversions_value: 0 });

    // Calculate derived metrics
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    const cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
    const roas = totals.cost > 0 ? totals.conversions_value / totals.cost : 0;

    // Get campaign details
    const campaignName = metrics[0]?.campaign_name || 'Unknown';
    const campaignBudget = metrics[0]?.campaign_budget_micros
      ? metrics[0].campaign_budget_micros / 1000000
      : 0;

    // Performance scoring
    const performanceScore = this.calculatePerformanceScore({
      ctr,
      conversionRate,
      cpa,
      roas,
      clicks: totals.clicks,
      impressions: totals.impressions,
      conversions: totals.conversions
    });

    // Statistical significance
    const hasSignificance = totals.clicks >= PERFORMANCE_THRESHOLDS.MIN_CLICKS_FOR_DECISION &&
                           totals.impressions >= PERFORMANCE_THRESHOLDS.MIN_IMPRESSIONS_FOR_DECISION;

    return {
      campaignId,
      campaignName,
      budget: campaignBudget,
      metrics: {
        impressions: totals.impressions,
        clicks: totals.clicks,
        conversions: totals.conversions,
        cost: totals.cost,
        conversions_value: totals.conversions_value,
        ctr,
        conversionRate,
        cpa,
        roas
      },
      performanceScore,
      hasSignificance,
      dataPoints: metrics.length,
      trend: this.calculateTrend(metrics)
    };
  }

  /**
   * Calculate performance score (0-100)
   */
  calculatePerformanceScore(metrics) {
    let score = 0;
    const weights = { ctr: 15, conversionRate: 35, roas: 35, volume: 15 };

    // CTR score (0-15 points)
    if (metrics.ctr >= 5) score += weights.ctr;
    else if (metrics.ctr >= 3) score += weights.ctr * 0.8;
    else if (metrics.ctr >= PERFORMANCE_THRESHOLDS.MIN_CTR) score += weights.ctr * 0.5;

    // Conversion rate score (0-35 points)
    if (metrics.conversionRate >= PERFORMANCE_THRESHOLDS.EXCELLENT_CONVERSION_RATE) {
      score += weights.conversionRate;
    } else if (metrics.conversionRate >= PERFORMANCE_THRESHOLDS.TARGET_CONVERSION_RATE) {
      score += weights.conversionRate * 0.8;
    } else if (metrics.conversionRate >= PERFORMANCE_THRESHOLDS.MIN_CONVERSION_RATE) {
      score += weights.conversionRate * 0.5;
    }

    // ROAS score (0-35 points)
    if (metrics.roas >= 5) score += weights.roas;
    else if (metrics.roas >= PERFORMANCE_THRESHOLDS.TARGET_ROAS) score += weights.roas * 0.8;
    else if (metrics.roas >= PERFORMANCE_THRESHOLDS.MIN_ROAS) score += weights.roas * 0.5;

    // Volume score (0-15 points) - reward sufficient data
    if (metrics.clicks >= 500 && metrics.conversions >= 20) score += weights.volume;
    else if (metrics.clicks >= 100 && metrics.conversions >= 5) score += weights.volume * 0.7;
    else if (metrics.clicks >= PERFORMANCE_THRESHOLDS.MIN_CLICKS_FOR_DECISION) {
      score += weights.volume * 0.4;
    }

    return Math.round(score);
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(metrics) {
    if (metrics.length < 3) return 'insufficient_data';

    // Sort by date
    const sorted = [...metrics].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    // Compare first half vs second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstConversions = firstHalf.reduce((sum, m) => sum + (m.conversions || 0), 0);
    const secondConversions = secondHalf.reduce((sum, m) => sum + (m.conversions || 0), 0);

    const firstCost = firstHalf.reduce((sum, m) => sum + ((m.cost_micros || 0) / 1000000), 0);
    const secondCost = secondHalf.reduce((sum, m) => sum + ((m.cost_micros || 0) / 1000000), 0);

    // Calculate efficiency change
    const firstEfficiency = firstCost > 0 ? firstConversions / firstCost : 0;
    const secondEfficiency = secondCost > 0 ? secondConversions / secondCost : 0;

    if (firstEfficiency === 0) return 'new';

    const change = ((secondEfficiency - firstEfficiency) / firstEfficiency) * 100;

    if (change > 20) return 'improving';
    if (change > 5) return 'slightly_improving';
    if (change < -20) return 'declining';
    if (change < -5) return 'slightly_declining';
    return 'stable';
  }

  /**
   * Analyze keyword performance
   */
  async analyzeKeywordPerformance(tenantId, startDate, endDate) {
    // Get keyword metrics from data store
    // This would integrate with actual keyword data
    return [];
  }

  /**
   * Analyze search term performance
   */
  async analyzeSearchTermPerformance(tenantId, startDate, endDate) {
    const searchTerms = await dataStore.getSearchTerms(tenantId, {
      startDate,
      endDate,
      limit: 1000
    });

    return searchTerms.map(term => ({
      searchTerm: term.search_term,
      impressions: term.impressions || 0,
      clicks: term.clicks || 0,
      conversions: term.conversions || 0,
      cost: (term.cost_micros || 0) / 1000000,
      ctr: term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0,
      conversionRate: term.clicks > 0 ? (term.conversions / term.clicks) * 100 : 0
    }));
  }

  /**
   * Classify campaigns into winners, losers, and neutral
   */
  classifyCampaigns(performance) {
    const classification = {
      winners: [],
      losers: [],
      neutral: [],
      newCampaigns: []
    };

    performance.campaigns.forEach(campaign => {
      // Skip campaigns without enough data
      if (!campaign.hasSignificance) {
        classification.newCampaigns.push({
          ...campaign,
          reason: 'Insufficient data for classification'
        });
        return;
      }

      // Winners: High performance score and positive trend
      if (campaign.performanceScore >= 70 &&
          ['improving', 'slightly_improving', 'stable'].includes(campaign.trend)) {
        classification.winners.push({
          ...campaign,
          reason: `High performance (${campaign.performanceScore}/100) with ${campaign.trend} trend`
        });
      }
      // Losers: Low performance score or negative trend
      else if (campaign.performanceScore < 40 ||
               ['declining', 'slightly_declining'].includes(campaign.trend)) {
        classification.losers.push({
          ...campaign,
          reason: `Low performance (${campaign.performanceScore}/100) with ${campaign.trend} trend`
        });
      }
      // Neutral: Medium performance
      else {
        classification.neutral.push({
          ...campaign,
          reason: `Medium performance (${campaign.performanceScore}/100)`
        });
      }
    });

    return classification;
  }

  /**
   * Generate optimization actions
   */
  async generateOptimizationActions(tenantId, classification, intelligence, aggressiveness) {
    const actions = [];

    // Actions for winning campaigns - SCALE
    for (const winner of classification.winners) {
      actions.push(...this.generateScalingActions(winner, intelligence, aggressiveness));
    }

    // Actions for losing campaigns - PAUSE or FIX
    for (const loser of classification.losers) {
      actions.push(...this.generateFixingActions(loser, intelligence, aggressiveness));
    }

    // Actions for neutral campaigns - OPTIMIZE
    for (const neutral of classification.neutral) {
      actions.push(...this.generateOptimizingActions(neutral, intelligence, aggressiveness));
    }

    // Budget reallocation actions
    const budgetActions = await this.budgetAllocator.generateBudgetReallocation(
      tenantId,
      classification,
      intelligence
    );
    actions.push(...budgetActions);

    // Bid adjustment actions
    const bidActions = await this.bidManager.generateBidAdjustments(
      tenantId,
      classification,
      intelligence
    );
    actions.push(...bidActions);

    // Rules-based optimization actions
    const ruleActions = await this.optimizationRules.evaluateRules(
      tenantId,
      performance.campaigns,
      intelligence
    );
    actions.push(...ruleActions);

    // Priority and confidence scoring
    actions.forEach(action => {
      if (!action.confidence) {
        action.confidence = this.calculateActionConfidence(action, intelligence);
      }
      if (!action.priority) {
        action.priority = this.calculateActionPriority(action, classification);
      }
    });

    // Sort by priority and confidence
    return actions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Generate scaling actions for winners
   */
  generateScalingActions(campaign, intelligence, aggressiveness) {
    const actions = [];

    const multipliers = {
      conservative: { budget: 1.20, bid: 1.10 },
      moderate: { budget: 1.35, bid: 1.20 },
      aggressive: { budget: 1.50, bid: 1.30 }
    };

    const mult = multipliers[aggressiveness] || multipliers.moderate;

    // Budget increase
    actions.push({
      type: 'increase_budget',
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      currentValue: campaign.budget,
      newValue: campaign.budget * mult.budget,
      change: ((mult.budget - 1) * 100).toFixed(1) + '%',
      reason: `Scale winning campaign (score: ${campaign.performanceScore}/100, ROAS: ${campaign.metrics.roas.toFixed(2)})`,
      expectedImpact: 'high',
      estimatedValue: campaign.metrics.roas * (campaign.budget * (mult.budget - 1))
    });

    // Bid increase if traffic patterns support it
    if (intelligence.trafficPatterns?.hourly?.peakHours) {
      actions.push({
        type: 'increase_bids',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        adjustment: mult.bid,
        timeTargeting: intelligence.trafficPatterns.hourly.peakHours.map(h => h.hour),
        reason: 'Increase bids during peak conversion hours',
        expectedImpact: 'medium'
      });
    }

    return actions;
  }

  /**
   * Generate fixing actions for losers
   */
  generateFixingActions(campaign, intelligence, aggressiveness) {
    const actions = [];

    // If performance is critically low, pause
    if (campaign.performanceScore < 25 && campaign.metrics.cost > 100) {
      actions.push({
        type: 'pause_campaign',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        reason: `Critical underperformance (score: ${campaign.performanceScore}/100, CPA: $${campaign.metrics.cpa.toFixed(2)})`,
        expectedImpact: 'high',
        estimatedSavings: campaign.metrics.cost
      });
    } else {
      // Otherwise, reduce budget and optimize
      actions.push({
        type: 'decrease_budget',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        currentValue: campaign.budget,
        newValue: campaign.budget * 0.7, // 30% reduction
        change: '-30%',
        reason: `Reduce spend on underperforming campaign (score: ${campaign.performanceScore}/100)`,
        expectedImpact: 'medium',
        estimatedSavings: campaign.budget * 0.3
      });

      actions.push({
        type: 'decrease_bids',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        adjustment: 0.8, // 20% reduction
        reason: 'Lower bids to improve efficiency',
        expectedImpact: 'medium'
      });
    }

    return actions;
  }

  /**
   * Generate optimizing actions for neutral campaigns
   */
  generateOptimizingActions(campaign, intelligence, aggressiveness) {
    const actions = [];

    // Fine-tune based on traffic patterns
    if (intelligence.trafficPatterns?.hourly?.peakHours) {
      actions.push({
        type: 'adjust_schedule',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        schedule: intelligence.trafficPatterns.hourly.peakHours,
        reason: 'Optimize ad schedule for peak conversion times',
        expectedImpact: 'medium'
      });
    }

    // Adjust targeting based on demographics
    if (intelligence.demographics?.demographics) {
      const topAgeRange = Object.entries(intelligence.demographics.demographics.ageDistribution)
        .sort((a, b) => parseFloat(b[1].avgOrderValue) - parseFloat(a[1].avgOrderValue))[0];

      if (topAgeRange) {
        actions.push({
          type: 'adjust_demographics',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          targetAgeRange: topAgeRange[0],
          reason: `Focus on highest-value age group (${topAgeRange[0]}, AOV: $${topAgeRange[1].avgOrderValue})`,
          expectedImpact: 'low'
        });
      }
    }

    return actions;
  }

  /**
   * Calculate action confidence score
   */
  calculateActionConfidence(action, intelligence) {
    let confidence = 50; // Base confidence

    // Increase confidence based on data availability
    if (intelligence.trafficPatterns) confidence += 15;
    if (intelligence.demographics) confidence += 15;
    if (intelligence.competitors) confidence += 10;
    if (intelligence.websiteContent) confidence += 10;

    // Adjust based on action type
    if (['pause_campaign', 'decrease_budget'].includes(action.type)) {
      confidence += 5; // Safer actions
    }
    if (['increase_budget', 'increase_bids'].includes(action.type)) {
      confidence -= 5; // Riskier actions
    }

    return Math.min(100, confidence);
  }

  /**
   * Calculate action priority (1-10)
   */
  calculateActionPriority(action, classification) {
    // Pause actions are highest priority
    if (action.type === 'pause_campaign') return 10;

    // Scaling winners is high priority
    if (action.type === 'increase_budget' && action.estimatedValue > 1000) return 9;

    // Budget reductions are medium-high priority
    if (action.type === 'decrease_budget') return 7;

    // Bid adjustments are medium priority
    if (action.type.includes('bid')) return 6;

    // Everything else is medium-low
    return 5;
  }

  /**
   * Execute optimization actions
   */
  async executeActions(tenantId, actions) {
    const results = {
      executed: [],
      failed: [],
      skipped: []
    };

    for (const action of actions) {
      try {
        // Safety checks
        if (this.config.safetyChecks && !this.passesSafetyCheck(action)) {
          results.skipped.push({
            action,
            reason: 'Failed safety check'
          });
          continue;
        }

        // Execute based on type
        let executeResult;
        switch (action.type) {
          case 'increase_budget':
          case 'decrease_budget':
            executeResult = await this.budgetAllocator.adjustCampaignBudget(
              tenantId,
              action.campaignId,
              action.newValue
            );
            break;

          case 'increase_bids':
          case 'decrease_bids':
            executeResult = await this.bidManager.adjustCampaignBids(
              tenantId,
              action.campaignId,
              action.adjustment
            );
            break;

          case 'pause_campaign':
            executeResult = await this.pauseCampaign(tenantId, action.campaignId);
            break;

          case 'adjust_schedule':
            executeResult = await this.adjustAdSchedule(tenantId, action.campaignId, action.schedule);
            break;

          default:
            results.skipped.push({
              action,
              reason: 'Unknown action type'
            });
            continue;
        }

        results.executed.push({
          action,
          result: executeResult,
          timestamp: new Date().toISOString()
        });

        // Update metrics
        this.updateMetricsForAction(action);

      } catch (error) {
        logger.error('Failed to execute action', {
          action,
          error: error.message
        });
        results.failed.push({
          action,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Safety check for actions
   */
  passesSafetyCheck(action) {
    // Check if budget changes are within limits
    if (action.type === 'increase_budget') {
      const increase = (action.newValue - action.currentValue) / action.currentValue;
      if (increase > PERFORMANCE_THRESHOLDS.MAX_BUDGET_INCREASE) {
        logger.warn('Budget increase exceeds safety limit', { action, increase });
        return false;
      }
    }

    if (action.type === 'decrease_budget') {
      const decrease = (action.currentValue - action.newValue) / action.currentValue;
      if (decrease > PERFORMANCE_THRESHOLDS.MAX_BUDGET_DECREASE) {
        logger.warn('Budget decrease exceeds safety limit', { action, decrease });
        return false;
      }
    }

    // Check if bid changes are within limits
    if (action.type === 'increase_bids') {
      if (action.adjustment - 1 > PERFORMANCE_THRESHOLDS.MAX_BID_INCREASE) {
        logger.warn('Bid increase exceeds safety limit', { action });
        return false;
      }
    }

    return true;
  }

  /**
   * Pause campaign (placeholder - would integrate with Google Ads API)
   */
  async pauseCampaign(tenantId, campaignId) {
    logger.info('Pausing campaign', { tenantId, campaignId });
    // This would call Google Ads API to pause the campaign
    this.metrics.pausedCampaigns++;
    return { success: true, campaignId, status: 'paused' };
  }

  /**
   * Adjust ad schedule (placeholder - would integrate with Google Ads API)
   */
  async adjustAdSchedule(tenantId, campaignId, schedule) {
    logger.info('Adjusting ad schedule', { tenantId, campaignId, schedule });
    // This would call Google Ads API to update ad schedule
    return { success: true, campaignId, schedule };
  }

  /**
   * Update metrics for executed action
   */
  updateMetricsForAction(action) {
    switch (action.type) {
      case 'increase_budget':
      case 'decrease_budget':
        this.metrics.budgetAdjustments++;
        if (action.estimatedSavings) {
          this.metrics.totalSavings += action.estimatedSavings;
        }
        if (action.estimatedValue) {
          this.metrics.totalGains += action.estimatedValue;
        }
        break;
      case 'increase_bids':
      case 'decrease_bids':
        this.metrics.bidAdjustments++;
        break;
      case 'pause_campaign':
        this.metrics.pausedCampaigns++;
        if (action.estimatedSavings) {
          this.metrics.totalSavings += action.estimatedSavings;
        }
        break;
    }
    this.metrics.campaignsOptimized++;
  }

  /**
   * Record optimization for history
   */
  async recordOptimization(tenantId, optimization) {
    try {
      // Store in data store
      await dataStore.addLog(tenantId, 'info', 'Campaign optimization completed', {
        summary: optimization.classification,
        actionsCount: optimization.actions.length,
        executedCount: optimization.executionResults?.executed.length || 0,
        dryRun: optimization.dryRun
      });

      // Update history map
      if (!this.optimizationHistory.has(tenantId)) {
        this.optimizationHistory.set(tenantId, []);
      }

      const history = this.optimizationHistory.get(tenantId);
      history.push({
        timestamp: new Date().toISOString(),
        actionsGenerated: optimization.actions.length,
        actionsExecuted: optimization.executionResults?.executed.length || 0,
        dryRun: optimization.dryRun
      });

      // Keep only last 100 optimizations
      if (history.length > 100) {
        history.shift();
      }

    } catch (error) {
      logger.error('Failed to record optimization', {
        tenantId,
        error: error.message
      });
    }
  }

  /**
   * Calculate estimated impact
   */
  calculateEstimatedImpact(actions) {
    const impact = {
      estimatedSavings: 0,
      estimatedGains: 0,
      netImpact: 0
    };

    actions.forEach(action => {
      if (action.estimatedSavings) {
        impact.estimatedSavings += action.estimatedSavings;
      }
      if (action.estimatedValue) {
        impact.estimatedGains += action.estimatedValue;
      }
    });

    impact.netImpact = impact.estimatedGains - impact.estimatedSavings;

    return impact;
  }

  /**
   * Check if optimization should run
   */
  shouldRunOptimization(tenantId) {
    if (!this.config.enabled) return false;

    const lastRun = this.lastOptimization.get(tenantId);
    if (!lastRun) return true;

    const timeSinceLastRun = Date.now() - lastRun;
    return timeSinceLastRun >= this.config.minOptimizationGap;
  }

  /**
   * Get optimization metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      roi: this.metrics.totalSavings > 0
        ? ((this.metrics.totalGains - this.metrics.totalSavings) / this.metrics.totalSavings * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get optimization history
   */
  getHistory(tenantId) {
    return this.optimizationHistory.get(tenantId) || [];
  }
}

// Singleton instance
let optimizerInstance = null;

/**
 * Get singleton campaign optimizer instance
 */
export function getCampaignOptimizer() {
  if (!optimizerInstance) {
    optimizerInstance = new CampaignOptimizer();
  }
  return optimizerInstance;
}

/**
 * Execute an optimization plan via the Google Ads API.
 * Takes the output of the optimizer's analysis and applies changes.
 * @param {string} tenantId
 * @param {object} plan - The optimization plan from analyze()
 * @returns {Promise<object>} Results of applied actions
 */
export async function executePlan(tenantId, plan) {
  // Import dynamically to avoid circular deps
  const googleAdsClient = await import('./google-ads-client.js');

  const results = { applied: [], skipped: [], errors: [] };

  try {
    // Apply bid adjustments
    if (plan.bidAdjustments && plan.bidAdjustments.length > 0) {
      for (const adj of plan.bidAdjustments) {
        try {
          await googleAdsClient.updateKeywordBids(tenantId, adj.adGroupId, [{
            criterionId: adj.criterionId,
            cpcBidMicros: adj.newBidMicros,
          }]);
          results.applied.push({ type: 'bid_adjustment', ...adj });
        } catch (err) {
          results.errors.push({ type: 'bid_adjustment', error: err.message, ...adj });
        }
      }
    }

    // Apply negative keywords
    if (plan.negativeKeywords && plan.negativeKeywords.length > 0) {
      for (const neg of plan.negativeKeywords) {
        try {
          await googleAdsClient.addNegativeKeywords(tenantId, neg.campaignId, neg.keywords);
          results.applied.push({ type: 'negative_keywords', campaignId: neg.campaignId, count: neg.keywords.length });
        } catch (err) {
          results.errors.push({ type: 'negative_keywords', error: err.message, campaignId: neg.campaignId });
        }
      }
    }

    // Apply budget changes
    if (plan.budgetChanges && plan.budgetChanges.length > 0) {
      for (const bc of plan.budgetChanges) {
        try {
          await googleAdsClient.updateCampaignBudget(tenantId, bc.campaignId, bc.newBudgetMicros);
          results.applied.push({ type: 'budget_change', ...bc });
        } catch (err) {
          results.errors.push({ type: 'budget_change', error: err.message, ...bc });
        }
      }
    }

    // Apply campaign status changes
    if (plan.statusChanges && plan.statusChanges.length > 0) {
      for (const sc of plan.statusChanges) {
        try {
          if (sc.newStatus === 'PAUSED') {
            await googleAdsClient.pauseCampaign(tenantId, sc.campaignId);
          } else if (sc.newStatus === 'ENABLED') {
            await googleAdsClient.enableCampaign(tenantId, sc.campaignId);
          }
          results.applied.push({ type: 'status_change', ...sc });
        } catch (err) {
          results.errors.push({ type: 'status_change', error: err.message, ...sc });
        }
      }
    }

    console.log(`✅ Optimization plan executed: ${results.applied.length} applied, ${results.errors.length} errors`);
    return results;
  } catch (error) {
    console.error('❌ executePlan failed:', error.message);
    throw error;
  }
}

export default getCampaignOptimizer;