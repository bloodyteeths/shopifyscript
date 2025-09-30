/**
 * Opportunity Scorer Service for ProofKit SaaS
 * Advanced scoring engine for market opportunities with risk assessment and ROI modeling
 *
 * Features:
 * - Multi-factor opportunity value calculation
 * - Competition difficulty scoring with Porter's Five Forces
 * - Resource requirement estimation
 * - Success probability modeling using machine learning principles
 * - ROI projections with confidence intervals
 * - Risk assessment matrix
 * - Opportunity prioritization algorithms
 */

import { getAIProviderService } from './ai-provider.js';
import { getMarketGapService } from './market-gaps.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Opportunity Scoring Engine
 */
export class OpportunityScorerService {
  constructor() {
    this.aiService = getAIProviderService();
    this.marketGapService = getMarketGapService();
    this.competitorService = getCompetitorIntelligenceService();
    this.scoreCache = new Map(); // opportunity -> score
    this.cacheTtl = 6 * 60 * 60 * 1000; // 6 hours

    // Scoring weights for different factors
    this.scoringWeights = {
      marketSize: 0.25,        // Total addressable market
      competition: 0.20,       // Competitive intensity
      accessibility: 0.15,     // Ease of market entry
      timing: 0.15,           // Market timing and trends
      resources: 0.10,        // Required resources vs available
      risk: 0.10,             // Overall risk assessment
      alignment: 0.05         // Strategic alignment
    };

    // Risk factors matrix
    this.riskFactors = {
      market: ['volatility', 'regulation', 'saturation', 'barriers_to_entry'],
      competitive: ['incumbents', 'differentiation', 'switching_costs', 'network_effects'],
      execution: ['complexity', 'resource_requirements', 'timeline', 'dependencies'],
      financial: ['investment_size', 'payback_period', 'cash_flow', 'roi_uncertainty']
    };

    // Porter's Five Forces framework
    this.porterForces = {
      threat_of_new_entrants: ['barriers_to_entry', 'economies_of_scale', 'capital_requirements'],
      bargaining_power_of_suppliers: ['supplier_concentration', 'switching_costs', 'differentiation'],
      bargaining_power_of_buyers: ['buyer_concentration', 'price_sensitivity', 'switching_costs'],
      threat_of_substitutes: ['substitute_performance', 'switching_costs', 'buyer_propensity'],
      competitive_rivalry: ['competitor_concentration', 'growth_rate', 'differentiation']
    };

    console.log('🎯 Opportunity Scorer Service initialized');
  }

  /**
   * Score a single opportunity comprehensively
   * @param {string} tenantId - Tenant identifier
   * @param {object} opportunity - Opportunity to score
   * @param {object} options - Scoring options
   * @returns {Promise<object>} Comprehensive opportunity score
   */
  async scoreOpportunity(tenantId, opportunity, options = {}) {
    const {
      includeRiskAssessment = true,
      includeROIProjection = true,
      includeResourceEstimation = true,
      timeHorizon = 12 // months
    } = options;

    console.log(`📊 Scoring opportunity: ${opportunity.title || opportunity.name || 'Unnamed'}`);

    try {
      // Generate unique cache key
      const cacheKey = this._generateCacheKey(tenantId, opportunity);

      // Check cache first
      const cached = this.scoreCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        console.log(`♻️ Using cached score for opportunity`);
        return cached.score;
      }

      // Gather context data
      const context = await this._gatherScoringContext(tenantId, opportunity);

      // Calculate component scores
      const componentScores = await this._calculateComponentScores(tenantId, opportunity, context);

      // Calculate overall opportunity value
      const overallScore = this._calculateWeightedScore(componentScores);

      // Risk assessment
      let riskAssessment = null;
      if (includeRiskAssessment) {
        riskAssessment = await this._assessRisks(tenantId, opportunity, context);
      }

      // ROI projection
      let roiProjection = null;
      if (includeROIProjection) {
        roiProjection = await this._projectROI(tenantId, opportunity, context, timeHorizon);
      }

      // Resource estimation
      let resourceEstimation = null;
      if (includeResourceEstimation) {
        resourceEstimation = await this._estimateResources(tenantId, opportunity, context);
      }

      // Success probability modeling
      const successProbability = await this._modelSuccessProbability(tenantId, opportunity, componentScores, riskAssessment);

      // Competition difficulty assessment
      const competitionDifficulty = await this._assessCompetitionDifficulty(tenantId, opportunity, context);

      const comprehensiveScore = {
        opportunityId: opportunity.id || this._generateOpportunityId(opportunity),
        title: opportunity.title || opportunity.name || 'Unnamed Opportunity',
        overallScore: Math.round(overallScore * 10) / 10,
        confidence: this._calculateConfidence(componentScores, context),
        componentScores,
        riskAssessment,
        roiProjection,
        resourceEstimation,
        successProbability,
        competitionDifficulty,
        recommendation: this._generateRecommendation(overallScore, riskAssessment, successProbability),
        priority: this._calculatePriority(overallScore, riskAssessment?.overall_risk, successProbability?.probability),
        scoredAt: new Date(),
        validUntil: new Date(Date.now() + this.cacheTtl)
      };

      // Cache the score
      this.scoreCache.set(cacheKey, {
        score: comprehensiveScore,
        timestamp: Date.now()
      });

      // Store in database
      await this._storeOpportunityScore(tenantId, comprehensiveScore);

      console.log(`✅ Opportunity scored: ${comprehensiveScore.overallScore}/10 (${comprehensiveScore.priority} priority)`);

      return comprehensiveScore;

    } catch (error) {
      logger.error('Failed to score opportunity', {
        tenantId,
        opportunity: opportunity.title || 'unknown',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Score multiple opportunities and rank them
   * @param {string} tenantId - Tenant identifier
   * @param {Array} opportunities - Array of opportunities to score
   * @param {object} options - Scoring options
   * @returns {Promise<object>} Ranked opportunities with scores
   */
  async scoreAndRankOpportunities(tenantId, opportunities, options = {}) {
    const { sortBy = 'overallScore', includePortfolioAnalysis = true } = options;

    console.log(`📊 Scoring and ranking ${opportunities.length} opportunities`);

    try {
      // Score all opportunities
      const scoredOpportunities = [];
      for (const opportunity of opportunities) {
        try {
          const score = await this.scoreOpportunity(tenantId, opportunity, options);
          scoredOpportunities.push(score);
        } catch (error) {
          logger.warn(`Failed to score opportunity: ${opportunity.title}`, {
            error: error.message
          });
        }
      }

      // Sort by specified criteria
      const sortedOpportunities = this._sortOpportunities(scoredOpportunities, sortBy);

      // Portfolio analysis
      let portfolioAnalysis = null;
      if (includePortfolioAnalysis) {
        portfolioAnalysis = await this._analyzeOpportunityPortfolio(tenantId, sortedOpportunities);
      }

      // Generate recommendations
      const recommendations = this._generatePortfolioRecommendations(sortedOpportunities, portfolioAnalysis);

      const result = {
        summary: {
          totalOpportunities: scoredOpportunities.length,
          highPriority: scoredOpportunities.filter(op => op.priority === 'high').length,
          mediumPriority: scoredOpportunities.filter(op => op.priority === 'medium').length,
          lowPriority: scoredOpportunities.filter(op => op.priority === 'low').length,
          averageScore: scoredOpportunities.reduce((sum, op) => sum + op.overallScore, 0) / scoredOpportunities.length,
          topScore: Math.max(...scoredOpportunities.map(op => op.overallScore))
        },
        rankedOpportunities: sortedOpportunities,
        portfolioAnalysis,
        recommendations,
        scoringMetadata: {
          sortedBy: sortBy,
          scoringWeights: this.scoringWeights,
          scoredAt: new Date()
        }
      };

      // Store ranking analysis
      await this._storeRankingAnalysis(tenantId, result);

      return result;

    } catch (error) {
      logger.error('Failed to score and rank opportunities', {
        tenantId,
        opportunityCount: opportunities.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate opportunity value using multiple valuation methods
   * @param {string} tenantId - Tenant identifier
   * @param {object} opportunity - Opportunity to value
   * @returns {Promise<object>} Opportunity valuation
   */
  async calculateOpportunityValue(tenantId, opportunity) {
    console.log(`💰 Calculating opportunity value for: ${opportunity.title}`);

    try {
      const context = await this._gatherScoringContext(tenantId, opportunity);

      // Multiple valuation approaches
      const valuations = await Promise.all([
        this._calculateMarketSizeValue(opportunity, context),
        this._calculateCompetitiveAdvantageValue(opportunity, context),
        this._calculateRevenuePotentialValue(opportunity, context),
        this._calculateStrategicValue(opportunity, context),
        this._calculateNPVValue(opportunity, context)
      ]);

      const averageValue = valuations.reduce((sum, val) => sum + val.value, 0) / valuations.length;
      const confidence = this._calculateValueConfidence(valuations);

      return {
        overallValue: Math.round(averageValue * 10) / 10,
        confidence,
        valuationMethods: valuations,
        recommendation: this._generateValueRecommendation(averageValue, confidence),
        calculatedAt: new Date()
      };

    } catch (error) {
      logger.error('Failed to calculate opportunity value', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Model success probability using multiple factors
   * @param {string} tenantId - Tenant identifier
   * @param {object} opportunity - Opportunity to model
   * @param {object} componentScores - Component scores
   * @param {object} riskAssessment - Risk assessment
   * @returns {Promise<object>} Success probability model
   */
  async _modelSuccessProbability(tenantId, opportunity, componentScores, riskAssessment) {
    console.log(`🎲 Modeling success probability`);

    try {
      // Factors affecting success probability
      const factors = {
        marketReadiness: componentScores.timing * 0.25,
        competitivePosition: (10 - componentScores.competition) * 0.20,
        resourceAvailability: componentScores.resources * 0.20,
        executionComplexity: componentScores.accessibility * 0.15,
        strategicAlignment: componentScores.alignment * 0.10,
        riskLevel: riskAssessment ? (10 - riskAssessment.overall_risk) * 0.10 : 5
      };

      // Calculate base probability
      const baseProbability = Object.values(factors).reduce((sum, factor) => sum + factor, 0) / 10;

      // Apply industry and opportunity type modifiers
      const modifiers = await this._getSuccessModifiers(tenantId, opportunity);
      const adjustedProbability = Math.max(0.05, Math.min(0.95, baseProbability * modifiers.industry * modifiers.type));

      // Generate confidence intervals
      const confidenceInterval = this._calculateConfidenceInterval(adjustedProbability, factors);

      return {
        probability: Math.round(adjustedProbability * 1000) / 10, // As percentage
        confidenceInterval,
        factors,
        modifiers,
        interpretation: this._interpretProbability(adjustedProbability),
        recommendations: this._generateProbabilityRecommendations(adjustedProbability, factors)
      };

    } catch (error) {
      logger.warn('Failed to model success probability', { error: error.message });
      return {
        probability: 50,
        confidenceInterval: { lower: 30, upper: 70 },
        factors: {},
        modifiers: { industry: 1.0, type: 1.0 },
        interpretation: 'moderate',
        recommendations: []
      };
    }
  }

  /**
   * =====================================
   * PRIVATE SCORING METHODS
   * =====================================
   */

  async _gatherScoringContext(tenantId, opportunity) {
    console.log(`📊 Gathering scoring context`);

    try {
      const [
        tenantMetrics,
        competitors,
        marketGaps,
        tenantConfig
      ] = await Promise.all([
        this._getTenantMetrics(tenantId),
        this.competitorService.getIntelligenceSummary(tenantId),
        dataStore.getTenantConfig(tenantId, 'comprehensive_gap_analysis', { defaultValue: null }),
        dataStore.getAllTenantConfigs(tenantId)
      ]);

      return {
        tenantMetrics,
        competitors: competitors.competitors || [],
        marketGaps: marketGaps?.analysis || null,
        industry: tenantConfig.industry || 'general',
        businessModel: tenantConfig.business_model || 'unknown',
        currentCapabilities: tenantConfig.capabilities || [],
        budget: tenantConfig.monthly_budget || 0,
        teamSize: tenantConfig.team_size || 1,
        riskTolerance: tenantConfig.risk_tolerance || 'medium'
      };

    } catch (error) {
      logger.warn('Failed to gather complete scoring context', {
        tenantId,
        error: error.message
      });

      return {
        tenantMetrics: { avgCpa: 0, conversionRate: 0 },
        competitors: [],
        marketGaps: null,
        industry: 'general',
        businessModel: 'unknown',
        currentCapabilities: [],
        budget: 0,
        teamSize: 1,
        riskTolerance: 'medium'
      };
    }
  }

  async _calculateComponentScores(tenantId, opportunity, context) {
    console.log(`🧮 Calculating component scores`);

    const scores = {
      marketSize: await this._scoreMarketSize(opportunity, context),
      competition: await this._scoreCompetition(opportunity, context),
      accessibility: await this._scoreAccessibility(opportunity, context),
      timing: await this._scoreTiming(opportunity, context),
      resources: await this._scoreResources(opportunity, context),
      risk: await this._scoreRisk(opportunity, context),
      alignment: await this._scoreAlignment(opportunity, context)
    };

    // Validate scores are in range 0-10
    Object.keys(scores).forEach(key => {
      scores[key] = Math.max(0, Math.min(10, scores[key]));
    });

    return scores;
  }

  async _scoreMarketSize(opportunity, context) {
    // Score based on addressable market size
    const baseScore = opportunity.market_potential === 'high' ? 8 :
                     opportunity.market_potential === 'medium' ? 6 : 4;

    // Adjust based on industry growth
    const industryGrowth = context.industry === 'technology' ? 1.2 :
                          context.industry === 'healthcare' ? 1.1 : 1.0;

    return Math.min(10, baseScore * industryGrowth);
  }

  async _scoreCompetition(opportunity, context) {
    const competitorCount = context.competitors.length;
    const baseScore = competitorCount < 5 ? 8 :
                     competitorCount < 15 ? 6 :
                     competitorCount < 30 ? 4 : 2;

    // Adjust for opportunity-specific competition
    const competitionLevel = opportunity.competition_level;
    const adjustment = competitionLevel === 'low' ? 1.3 :
                      competitionLevel === 'medium' ? 1.0 : 0.7;

    return Math.min(10, baseScore * adjustment);
  }

  async _scoreAccessibility(opportunity, context) {
    // Score how easy it is to enter this market
    const barriers = opportunity.entry_barriers || 'medium';
    const baseScore = barriers === 'low' ? 8 :
                     barriers === 'medium' ? 6 : 4;

    // Adjust for current capabilities
    const capabilityMatch = context.currentCapabilities.length > 0 ? 1.2 : 1.0;

    return Math.min(10, baseScore * capabilityMatch);
  }

  async _scoreTiming(opportunity, context) {
    // Score market timing
    const trend = opportunity.trend || 'stable';
    const baseScore = trend === 'rising' ? 9 :
                     trend === 'stable' ? 6 :
                     trend === 'declining' ? 3 : 5;

    // Consider seasonal factors
    const isSeasonallyOptimal = opportunity.seasonal_timing === 'optimal';
    const seasonalAdjustment = isSeasonallyOptimal ? 1.2 : 1.0;

    return Math.min(10, baseScore * seasonalAdjustment);
  }

  async _scoreResources(opportunity, context) {
    // Score resource requirements vs availability
    const requiredInvestment = opportunity.investment_size || 'medium';
    const available = context.budget || 0;

    let baseScore = 5;
    if (requiredInvestment === 'low' || available > 10000) baseScore = 8;
    else if (requiredInvestment === 'medium' && available > 5000) baseScore = 6;
    else if (requiredInvestment === 'high') baseScore = 3;

    // Adjust for team capacity
    const teamAdjustment = context.teamSize > 3 ? 1.2 : context.teamSize > 1 ? 1.1 : 1.0;

    return Math.min(10, baseScore * teamAdjustment);
  }

  async _scoreRisk(opportunity, context) {
    // Score overall risk (higher score = lower risk)
    const riskLevel = opportunity.risk_level || context.riskTolerance || 'medium';
    const baseScore = riskLevel === 'low' ? 8 :
                     riskLevel === 'medium' ? 6 : 4;

    // Adjust for business stability
    const stability = context.tenantMetrics.conversionRate > 5 ? 1.2 : 1.0;

    return Math.min(10, baseScore * stability);
  }

  async _scoreAlignment(opportunity, context) {
    // Score strategic alignment with current business
    const industryMatch = opportunity.industry === context.industry ? 1.5 : 1.0;
    const modelMatch = opportunity.business_model === context.businessModel ? 1.3 : 1.0;

    const baseScore = 5;
    return Math.min(10, baseScore * industryMatch * modelMatch);
  }

  _calculateWeightedScore(componentScores) {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.keys(this.scoringWeights).forEach(component => {
      if (componentScores[component] !== undefined) {
        weightedSum += componentScores[component] * this.scoringWeights[component];
        totalWeight += this.scoringWeights[component];
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  async _assessRisks(tenantId, opportunity, context) {
    console.log(`⚠️  Assessing risks`);

    const risks = {
      market: await this._assessMarketRisks(opportunity, context),
      competitive: await this._assessCompetitiveRisks(opportunity, context),
      execution: await this._assessExecutionRisks(opportunity, context),
      financial: await this._assessFinancialRisks(opportunity, context)
    };

    // Calculate overall risk score
    const riskScores = Object.values(risks).map(r => r.score);
    const overallRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;

    return {
      overall_risk: Math.round(overallRisk * 10) / 10,
      category_risks: risks,
      risk_level: overallRisk > 7 ? 'high' : overallRisk > 4 ? 'medium' : 'low',
      mitigation_strategies: this._generateMitigationStrategies(risks),
      monitoring_recommendations: this._generateMonitoringRecommendations(risks)
    };
  }

  async _assessMarketRisks(opportunity, context) {
    const risks = [];
    let score = 5; // Base score

    // Market volatility
    if (context.industry === 'cryptocurrency' || context.industry === 'emerging_tech') {
      risks.push('High market volatility');
      score += 2;
    }

    // Regulatory risks
    if (context.industry === 'healthcare' || context.industry === 'finance') {
      risks.push('Regulatory compliance requirements');
      score += 1;
    }

    // Market saturation
    if (context.competitors.length > 20) {
      risks.push('Market saturation');
      score += 1.5;
    }

    return {
      score: Math.min(10, score),
      risks,
      severity: score > 7 ? 'high' : score > 4 ? 'medium' : 'low'
    };
  }

  async _assessCompetitiveRisks(opportunity, context) {
    const risks = [];
    let score = 3; // Lower base for competitive risks

    // Strong incumbents
    const hasStrongCompetitors = context.competitors.filter(c => c.position === 'leader').length > 0;
    if (hasStrongCompetitors) {
      risks.push('Strong incumbent competitors');
      score += 2;
    }

    // Network effects
    if (context.businessModel === 'platform' || context.businessModel === 'marketplace') {
      risks.push('Network effects favor incumbents');
      score += 1.5;
    }

    // Low differentiation potential
    if (opportunity.differentiation_potential === 'low') {
      risks.push('Limited differentiation opportunities');
      score += 1;
    }

    return {
      score: Math.min(10, score),
      risks,
      severity: score > 7 ? 'high' : score > 4 ? 'medium' : 'low'
    };
  }

  async _assessExecutionRisks(opportunity, context) {
    const risks = [];
    let score = 4;

    // Complexity
    if (opportunity.implementation_difficulty === 'high') {
      risks.push('High implementation complexity');
      score += 2;
    }

    // Resource constraints
    if (context.teamSize < 3 && opportunity.effort_score > 7) {
      risks.push('Limited team capacity');
      score += 1.5;
    }

    // Timeline pressure
    if (opportunity.time_to_market === 'weeks' && opportunity.effort_score > 6) {
      risks.push('Aggressive timeline');
      score += 1;
    }

    return {
      score: Math.min(10, score),
      risks,
      severity: score > 7 ? 'high' : score > 4 ? 'medium' : 'low'
    };
  }

  async _assessFinancialRisks(opportunity, context) {
    const risks = [];
    let score = 4;

    // Large investment requirement
    if (opportunity.investment_size === 'high' && context.budget < 20000) {
      risks.push('High capital requirements vs available budget');
      score += 2;
    }

    // Long payback period
    if (opportunity.payback_period === 'long') {
      risks.push('Extended payback period');
      score += 1;
    }

    // ROI uncertainty
    if (opportunity.roi_certainty === 'low') {
      risks.push('Uncertain return on investment');
      score += 1.5;
    }

    return {
      score: Math.min(10, score),
      risks,
      severity: score > 7 ? 'high' : score > 4 ? 'medium' : 'low'
    };
  }

  async _projectROI(tenantId, opportunity, context, timeHorizon) {
    console.log(`💰 Projecting ROI over ${timeHorizon} months`);

    try {
      // Estimate investment required
      const investment = this._estimateInvestment(opportunity, context);

      // Estimate revenue potential
      const revenueProjection = this._estimateRevenue(opportunity, context, timeHorizon);

      // Calculate costs
      const ongoingCosts = this._estimateOngoingCosts(opportunity, context, timeHorizon);

      // Calculate net present value
      const npv = this._calculateNPV(investment, revenueProjection, ongoingCosts);

      // Calculate various ROI metrics
      const roi = ((revenueProjection.total - ongoingCosts.total - investment.total) / investment.total) * 100;
      const paybackPeriod = this._calculatePaybackPeriod(investment.total, revenueProjection.monthly, ongoingCosts.monthly);

      return {
        investment,
        revenueProjection,
        ongoingCosts,
        npv,
        roi: Math.round(roi * 10) / 10,
        paybackPeriod,
        breakEvenMonth: paybackPeriod,
        confidenceLevel: this._calculateROIConfidence(opportunity, context),
        assumptions: this._getROIAssumptions(opportunity, context),
        scenarios: this._generateROIScenarios(investment, revenueProjection, ongoingCosts)
      };

    } catch (error) {
      logger.warn('Failed to project ROI', { error: error.message });
      return {
        roi: 0,
        paybackPeriod: null,
        confidenceLevel: 'low',
        error: 'Unable to calculate ROI projection'
      };
    }
  }

  async _estimateResources(tenantId, opportunity, context) {
    console.log(`📋 Estimating resource requirements`);

    const resources = {
      financial: {
        initial_investment: this._estimateInitialInvestment(opportunity),
        monthly_operating: this._estimateMonthlyOperating(opportunity),
        marketing_budget: this._estimateMarketingBudget(opportunity)
      },
      human: {
        team_size_required: this._estimateTeamSize(opportunity),
        skill_requirements: this._identifySkillRequirements(opportunity),
        time_commitment: this._estimateTimeCommitment(opportunity)
      },
      technology: {
        tools_required: this._identifyToolRequirements(opportunity),
        infrastructure: this._estimateInfrastructure(opportunity),
        integrations: this._identifyIntegrations(opportunity)
      },
      timeline: {
        planning_phase: '2-4 weeks',
        development_phase: opportunity.development_time || '4-8 weeks',
        launch_phase: '1-2 weeks',
        total_timeline: opportunity.time_to_market || '8-12 weeks'
      }
    };

    // Calculate resource availability score
    const availability = this._calculateResourceAvailability(resources, context);

    return {
      requirements: resources,
      availability,
      gaps: this._identifyResourceGaps(resources, context),
      recommendations: this._generateResourceRecommendations(resources, context)
    };
  }

  // Helper methods for calculations
  _estimateInvestment(opportunity, context) {
    const baseInvestment = opportunity.investment_size === 'high' ? 20000 :
                          opportunity.investment_size === 'medium' ? 10000 : 5000;

    return {
      development: baseInvestment * 0.6,
      marketing: baseInvestment * 0.3,
      operations: baseInvestment * 0.1,
      total: baseInvestment
    };
  }

  _estimateRevenue(opportunity, context, timeHorizon) {
    const monthlyPotential = opportunity.revenue_potential || context.tenantMetrics.monthlyRevenue || 5000;
    const growthRate = opportunity.growth_rate || 0.1; // 10% monthly growth

    let total = 0;
    let monthly = monthlyPotential;
    const projection = [];

    for (let month = 1; month <= timeHorizon; month++) {
      if (month > 3) { // Assume 3 months to first revenue
        total += monthly;
        projection.push({ month, revenue: monthly });
        monthly *= (1 + growthRate);
      } else {
        projection.push({ month, revenue: 0 });
      }
    }

    return { total, monthly: monthlyPotential, projection };
  }

  _estimateOngoingCosts(opportunity, context, timeHorizon) {
    const monthlyCosts = opportunity.monthly_costs || 2000;
    return {
      monthly: monthlyCosts,
      total: monthlyCosts * timeHorizon,
      breakdown: {
        personnel: monthlyCosts * 0.6,
        technology: monthlyCosts * 0.2,
        marketing: monthlyCosts * 0.15,
        overhead: monthlyCosts * 0.05
      }
    };
  }

  _calculateNPV(investment, revenue, costs, discountRate = 0.1) {
    // Simplified NPV calculation
    const netCashFlow = revenue.total - costs.total - investment.total;
    const discountFactor = 1 / Math.pow(1 + discountRate, 1); // 1 year
    return netCashFlow * discountFactor;
  }

  _calculatePaybackPeriod(investment, monthlyRevenue, monthlyCosts) {
    const netMonthlyFlow = monthlyRevenue - monthlyCosts;
    return netMonthlyFlow > 0 ? Math.ceil(investment / netMonthlyFlow) : null;
  }

  // Additional helper methods
  _generateCacheKey(tenantId, opportunity) {
    const opportunityId = opportunity.id || opportunity.title || JSON.stringify(opportunity).slice(0, 50);
    return `${tenantId}:${opportunityId}`;
  }

  _generateOpportunityId(opportunity) {
    return `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _calculateConfidence(componentScores, context) {
    const dataQuality = context.competitors.length > 0 ? 0.8 : 0.6;
    const scoreConsistency = this._calculateScoreConsistency(componentScores);
    return Math.round((dataQuality * scoreConsistency) * 100);
  }

  _calculateScoreConsistency(scores) {
    const values = Object.values(scores);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - (stdDev / 10)); // Normalize to 0-1
  }

  _generateRecommendation(overallScore, riskAssessment, successProbability) {
    if (overallScore >= 8 && (!riskAssessment || riskAssessment.risk_level !== 'high')) {
      return 'Highly recommended - Strong opportunity with manageable risk';
    } else if (overallScore >= 6 && (!riskAssessment || riskAssessment.risk_level === 'low')) {
      return 'Recommended - Good opportunity worth pursuing';
    } else if (overallScore >= 5) {
      return 'Consider carefully - Moderate opportunity requiring risk mitigation';
    } else {
      return 'Not recommended - Low opportunity score or high risk';
    }
  }

  _calculatePriority(score, riskLevel, successProbability) {
    if (score >= 8 && riskLevel !== 'high' && successProbability >= 60) {
      return 'high';
    } else if (score >= 6 && riskLevel !== 'high') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  _sortOpportunities(opportunities, sortBy) {
    const sortFunctions = {
      overallScore: (a, b) => b.overallScore - a.overallScore,
      priority: (a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      },
      successProbability: (a, b) => b.successProbability?.probability - a.successProbability?.probability,
      roi: (a, b) => (b.roiProjection?.roi || 0) - (a.roiProjection?.roi || 0)
    };

    return [...opportunities].sort(sortFunctions[sortBy] || sortFunctions.overallScore);
  }

  async _analyzeOpportunityPortfolio(tenantId, opportunities) {
    // Portfolio analysis using modern portfolio theory concepts
    const riskReturnMatrix = opportunities.map(opp => ({
      id: opp.opportunityId,
      title: opp.title,
      risk: opp.riskAssessment?.overall_risk || 5,
      return: opp.overallScore,
      correlation: 0.5 // Simplified correlation
    }));

    return {
      riskReturnMatrix,
      diversificationScore: this._calculateDiversificationScore(opportunities),
      portfolioRisk: this._calculatePortfolioRisk(riskReturnMatrix),
      portfolioReturn: this._calculatePortfolioReturn(riskReturnMatrix),
      recommendations: this._generatePortfolioOptimizationRecommendations(riskReturnMatrix)
    };
  }

  _calculateDiversificationScore(opportunities) {
    // Simple diversification based on categories
    const categories = new Set(opportunities.map(opp => opp.category || 'general'));
    return Math.min(10, (categories.size / opportunities.length) * 10);
  }

  _calculatePortfolioRisk(matrix) {
    return matrix.reduce((sum, item) => sum + item.risk, 0) / matrix.length;
  }

  _calculatePortfolioReturn(matrix) {
    return matrix.reduce((sum, item) => sum + item.return, 0) / matrix.length;
  }

  _generatePortfolioOptimizationRecommendations(matrix) {
    const recommendations = [];

    const highRiskHighReturn = matrix.filter(item => item.risk > 7 && item.return > 7);
    const lowRiskMediumReturn = matrix.filter(item => item.risk < 4 && item.return > 5);

    if (highRiskHighReturn.length > 0) {
      recommendations.push('Consider balancing high-risk/high-return opportunities with safer options');
    }

    if (lowRiskMediumReturn.length > 0) {
      recommendations.push('Prioritize low-risk opportunities for stable returns');
    }

    return recommendations;
  }

  _generatePortfolioRecommendations(opportunities, portfolioAnalysis) {
    const recommendations = [];

    const highPriorityCount = opportunities.filter(op => op.priority === 'high').length;

    if (highPriorityCount > 3) {
      recommendations.push('Focus on top 3 high-priority opportunities to avoid resource dilution');
    }

    if (portfolioAnalysis && portfolioAnalysis.portfolioRisk > 7) {
      recommendations.push('Portfolio has high overall risk - consider adding lower-risk opportunities');
    }

    recommendations.push('Implement opportunities in phases based on priority and resource availability');

    return recommendations;
  }

  async _getTenantMetrics(tenantId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return { avgCpa: 0, conversionRate: 0, monthlyRevenue: 0 };
      }

      const totalCost = metrics.reduce((sum, m) => sum + (m.cost_micros || 0) / 1000000, 0);
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

      return {
        avgCpa: totalConversions > 0 ? totalCost / totalConversions : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        monthlyRevenue: totalConversions * 50 // Estimate based on conversions
      };
    } catch {
      return { avgCpa: 0, conversionRate: 0, monthlyRevenue: 0 };
    }
  }

  async _storeOpportunityScore(tenantId, score) {
    try {
      await dataStore.setTenantConfig(tenantId, `opportunity_score_${score.opportunityId}`, {
        score,
        timestamp: new Date()
      });
    } catch (error) {
      logger.warn('Failed to store opportunity score', {
        tenantId,
        opportunityId: score.opportunityId,
        error: error.message
      });
    }
  }

  async _storeRankingAnalysis(tenantId, analysis) {
    try {
      await dataStore.setTenantConfig(tenantId, 'opportunity_ranking_analysis', {
        analysis,
        timestamp: new Date()
      });

      await dataStore.addLog(tenantId, 'info',
        `Opportunity ranking completed: ${analysis.summary.totalOpportunities} opportunities analyzed`,
        { summary: analysis.summary }
      );
    } catch (error) {
      logger.warn('Failed to store ranking analysis', {
        tenantId,
        error: error.message
      });
    }
  }

  // Additional placeholder methods for full implementation
  async _calculateMarketSizeValue(opportunity, context) {
    return { value: 7, method: 'market_size', confidence: 0.7 };
  }

  async _calculateCompetitiveAdvantageValue(opportunity, context) {
    return { value: 6, method: 'competitive_advantage', confidence: 0.6 };
  }

  async _calculateRevenuePotentialValue(opportunity, context) {
    return { value: 8, method: 'revenue_potential', confidence: 0.8 };
  }

  async _calculateStrategicValue(opportunity, context) {
    return { value: 7, method: 'strategic_value', confidence: 0.6 };
  }

  async _calculateNPVValue(opportunity, context) {
    return { value: 6, method: 'npv', confidence: 0.5 };
  }

  _calculateValueConfidence(valuations) {
    const confidences = valuations.map(v => v.confidence);
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  _generateValueRecommendation(value, confidence) {
    if (value >= 8 && confidence >= 0.7) {
      return 'High-value opportunity with strong confidence';
    } else if (value >= 6) {
      return 'Moderate-value opportunity requiring further validation';
    } else {
      return 'Low-value opportunity - not recommended';
    }
  }

  async _getSuccessModifiers(tenantId, opportunity) {
    return {
      industry: 1.0,
      type: 1.0
    };
  }

  _calculateConfidenceInterval(probability, factors) {
    const margin = 0.15; // 15% margin
    return {
      lower: Math.max(5, (probability - margin) * 100),
      upper: Math.min(95, (probability + margin) * 100)
    };
  }

  _interpretProbability(probability) {
    if (probability >= 0.8) return 'very high';
    if (probability >= 0.6) return 'high';
    if (probability >= 0.4) return 'moderate';
    if (probability >= 0.2) return 'low';
    return 'very low';
  }

  _generateProbabilityRecommendations(probability, factors) {
    const recommendations = [];

    if (probability < 0.4) {
      recommendations.push('Consider risk mitigation strategies before proceeding');
    }

    if (factors.marketReadiness < 5) {
      recommendations.push('Wait for better market conditions or focus on market development');
    }

    if (factors.resourceAvailability < 5) {
      recommendations.push('Secure additional resources before launch');
    }

    return recommendations;
  }

  async _assessCompetitionDifficulty(tenantId, opportunity, context) {
    // Porter's Five Forces analysis
    const forces = {
      threat_of_new_entrants: this._assessNewEntrantThreat(opportunity, context),
      bargaining_power_of_suppliers: this._assessSupplierPower(opportunity, context),
      bargaining_power_of_buyers: this._assessBuyerPower(opportunity, context),
      threat_of_substitutes: this._assessSubstituteThreat(opportunity, context),
      competitive_rivalry: this._assessCompetitiveRivalry(opportunity, context)
    };

    const overallDifficulty = Object.values(forces).reduce((sum, force) => sum + force.score, 0) / 5;

    return {
      overall_difficulty: overallDifficulty,
      difficulty_level: overallDifficulty > 7 ? 'high' : overallDifficulty > 4 ? 'medium' : 'low',
      porter_forces: forces,
      strategic_recommendations: this._generateCompetitiveRecommendations(forces)
    };
  }

  _assessNewEntrantThreat(opportunity, context) {
    let score = 5;

    if (opportunity.entry_barriers === 'high') score += 2;
    if (context.industry === 'technology') score -= 1;
    if (opportunity.capital_requirements === 'high') score += 1;

    return {
      score: Math.max(0, Math.min(10, score)),
      factors: ['Entry barriers', 'Capital requirements', 'Regulatory requirements']
    };
  }

  _assessSupplierPower(opportunity, context) {
    return { score: 5, factors: ['Supplier concentration', 'Switching costs'] };
  }

  _assessBuyerPower(opportunity, context) {
    return { score: 5, factors: ['Buyer concentration', 'Price sensitivity'] };
  }

  _assessSubstituteThreat(opportunity, context) {
    return { score: 5, factors: ['Substitute availability', 'Performance comparison'] };
  }

  _assessCompetitiveRivalry(opportunity, context) {
    let score = 5;

    if (context.competitors.length > 10) score += 2;
    if (opportunity.differentiation_potential === 'low') score += 1;

    return {
      score: Math.max(0, Math.min(10, score)),
      factors: ['Number of competitors', 'Differentiation potential', 'Market growth']
    };
  }

  _generateCompetitiveRecommendations(forces) {
    const recommendations = [];

    if (forces.competitive_rivalry.score > 7) {
      recommendations.push('Focus on differentiation to reduce direct competition');
    }

    if (forces.threat_of_new_entrants.score < 4) {
      recommendations.push('Move quickly to establish market position before new entrants');
    }

    return recommendations;
  }

  _generateMitigationStrategies(risks) {
    const strategies = [];

    Object.entries(risks).forEach(([category, risk]) => {
      if (risk.severity === 'high') {
        strategies.push(`Implement ${category} risk controls and monitoring`);
      }
    });

    return strategies;
  }

  _generateMonitoringRecommendations(risks) {
    return [
      'Weekly competitive intelligence monitoring',
      'Monthly market condition assessment',
      'Quarterly risk review and strategy adjustment'
    ];
  }

  _calculateROIConfidence(opportunity, context) {
    let confidence = 'medium';

    if (opportunity.revenue_model === 'proven' && context.industry === 'established') {
      confidence = 'high';
    } else if (opportunity.revenue_model === 'experimental') {
      confidence = 'low';
    }

    return confidence;
  }

  _getROIAssumptions(opportunity, context) {
    return [
      'Market conditions remain stable',
      'Competition intensity as estimated',
      'Resource availability as planned',
      'No major regulatory changes'
    ];
  }

  _generateROIScenarios(investment, revenue, costs) {
    return {
      optimistic: {
        roi: ((revenue.total * 1.3 - costs.total * 0.8 - investment.total) / investment.total) * 100,
        probability: 0.2
      },
      realistic: {
        roi: ((revenue.total - costs.total - investment.total) / investment.total) * 100,
        probability: 0.6
      },
      pessimistic: {
        roi: ((revenue.total * 0.7 - costs.total * 1.2 - investment.total) / investment.total) * 100,
        probability: 0.2
      }
    };
  }

  // Resource estimation helpers
  _estimateInitialInvestment(opportunity) {
    const size = opportunity.investment_size || 'medium';
    return size === 'high' ? 50000 : size === 'medium' ? 20000 : 5000;
  }

  _estimateMonthlyOperating(opportunity) {
    return opportunity.monthly_costs || 5000;
  }

  _estimateMarketingBudget(opportunity) {
    return opportunity.marketing_budget || 3000;
  }

  _estimateTeamSize(opportunity) {
    const complexity = opportunity.implementation_difficulty || 'medium';
    return complexity === 'high' ? 5 : complexity === 'medium' ? 3 : 2;
  }

  _identifySkillRequirements(opportunity) {
    return opportunity.skills_required || ['marketing', 'development', 'operations'];
  }

  _estimateTimeCommitment(opportunity) {
    return opportunity.time_commitment || 'full-time';
  }

  _identifyToolRequirements(opportunity) {
    return opportunity.tools_required || ['analytics', 'marketing automation', 'project management'];
  }

  _estimateInfrastructure(opportunity) {
    return opportunity.infrastructure_needs || 'cloud hosting, CDN, database';
  }

  _identifyIntegrations(opportunity) {
    return opportunity.integrations || ['CRM', 'payment processing', 'analytics'];
  }

  _calculateResourceAvailability(requirements, context) {
    const financial = context.budget >= requirements.financial.initial_investment ? 1.0 : 0.5;
    const human = context.teamSize >= requirements.human.team_size_required ? 1.0 : 0.6;
    const technology = 0.8; // Assume most technology is available

    return {
      financial,
      human,
      technology,
      overall: (financial + human + technology) / 3
    };
  }

  _identifyResourceGaps(requirements, context) {
    const gaps = [];

    if (context.budget < requirements.financial.initial_investment) {
      gaps.push(`Funding gap: $${requirements.financial.initial_investment - context.budget}`);
    }

    if (context.teamSize < requirements.human.team_size_required) {
      gaps.push(`Team gap: ${requirements.human.team_size_required - context.teamSize} additional team members needed`);
    }

    return gaps;
  }

  _generateResourceRecommendations(requirements, context) {
    const recommendations = [];

    if (context.budget < requirements.financial.initial_investment) {
      recommendations.push('Secure additional funding or reduce scope to match budget');
    }

    if (context.teamSize < requirements.human.team_size_required) {
      recommendations.push('Hire additional team members or consider outsourcing');
    }

    recommendations.push('Implement phased approach to spread resource requirements over time');

    return recommendations;
  }
}

// Singleton instance
let opportunityScorerInstance = null;

/**
 * Get singleton instance
 */
export function getOpportunityScorerService() {
  if (!opportunityScorerInstance) {
    opportunityScorerInstance = new OpportunityScorerService();
  }
  return opportunityScorerInstance;
}

export default getOpportunityScorerService;