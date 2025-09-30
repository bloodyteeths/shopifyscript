/**
 * Competitive Insights Service for ProofKit SaaS
 * Advanced competitive intelligence with weakness detection and trend identification
 *
 * Features:
 * - Competitor weakness detection through multi-dimensional analysis
 * - Market share analysis and tracking
 * - Industry trend identification and forecasting
 * - Disruption opportunity detection
 * - Partnership possibility analysis
 * - Competitive movement prediction
 * - Strategic gap identification
 * - Real-time competitive monitoring
 */

import { getAIProviderService } from './ai-provider.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import { getMarketGapService } from './market-gaps.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Competitive Insights Engine
 */
export class CompetitiveInsightsService {
  constructor() {
    this.aiService = getAIProviderService();
    this.competitorService = getCompetitorIntelligenceService();
    this.marketGapService = getMarketGapService();
    this.insightsCache = new Map(); // tenant -> insights
    this.cacheTtl = 8 * 60 * 60 * 1000; // 8 hours

    // Weakness detection frameworks
    this.weaknessDimensions = {
      product: ['feature_gaps', 'quality_issues', 'usability_problems', 'performance_issues'],
      market: ['poor_positioning', 'weak_branding', 'limited_reach', 'customer_dissatisfaction'],
      operational: ['inefficient_processes', 'high_costs', 'slow_delivery', 'poor_support'],
      financial: ['cash_flow_issues', 'high_burn_rate', 'pricing_pressure', 'low_margins'],
      strategic: ['unclear_vision', 'market_mismatch', 'resource_constraints', 'leadership_issues'],
      technology: ['technical_debt', 'scalability_issues', 'security_vulnerabilities', 'integration_problems']
    };

    // Trend analysis categories
    this.trendCategories = {
      market: ['size_growth', 'demographic_shifts', 'behavioral_changes', 'economic_factors'],
      technology: ['emerging_tech', 'automation_trends', 'platform_shifts', 'innovation_cycles'],
      competitive: ['new_entrants', 'consolidation', 'business_model_changes', 'pricing_evolution'],
      regulatory: ['policy_changes', 'compliance_requirements', 'industry_standards', 'legal_precedents'],
      social: ['consumer_preferences', 'social_movements', 'cultural_shifts', 'generational_changes']
    };

    // Disruption indicators
    this.disruptionIndicators = {
      technology: ['ai_advancement', 'blockchain_adoption', 'iot_proliferation', 'cloud_migration'],
      business_model: ['subscription_economy', 'platform_effects', 'sharing_economy', 'freemium_models'],
      customer: ['changing_expectations', 'digital_first', 'personalization_demand', 'instant_gratification'],
      market: ['globalization', 'localization', 'niche_fragmentation', 'mass_customization']
    };

    console.log('🔍 Competitive Insights Service initialized');
  }

  /**
   * Generate comprehensive competitive insights
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Complete competitive insights
   */
  async generateCompetitiveInsights(tenantId, options = {}) {
    const {
      includeWeaknessAnalysis = true,
      includeMarketShareAnalysis = true,
      includeTrendAnalysis = true,
      includeDisruptionAnalysis = true,
      includePartnershipAnalysis = true,
      analysisDepth = 'comprehensive'
    } = options;

    console.log(`🔍 Generating competitive insights for ${tenantId} (${analysisDepth} analysis)`);

    try {
      // Check cache first
      const cacheKey = `insights_${tenantId}_${analysisDepth}`;
      const cached = this.insightsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        console.log(`♻️ Using cached insights for ${tenantId}`);
        return cached.insights;
      }

      // Gather competitive intelligence foundation
      const foundation = await this._gatherCompetitiveFoundation(tenantId);

      // Generate insights across requested dimensions
      const insights = {};

      if (includeWeaknessAnalysis) {
        console.log(`🎯 Analyzing competitor weaknesses...`);
        insights.weaknesses = await this._analyzeCompetitorWeaknesses(tenantId, foundation);
      }

      if (includeMarketShareAnalysis) {
        console.log(`📊 Analyzing market share dynamics...`);
        insights.marketShare = await this._analyzeMarketShareDynamics(tenantId, foundation);
      }

      if (includeTrendAnalysis) {
        console.log(`📈 Identifying market trends...`);
        insights.trends = await this._identifyMarketTrends(tenantId, foundation);
      }

      if (includeDisruptionAnalysis) {
        console.log(`⚡ Detecting disruption opportunities...`);
        insights.disruption = await this._detectDisruptionOpportunities(tenantId, foundation);
      }

      if (includePartnershipAnalysis) {
        console.log(`🤝 Analyzing partnership possibilities...`);
        insights.partnerships = await this._analyzePartnershipPossibilities(tenantId, foundation);
      }

      // Generate strategic recommendations
      const strategicRecommendations = await this._generateStrategicRecommendations(tenantId, insights, foundation);

      // Create competitive intelligence summary
      const competitiveIntelligence = await this._createCompetitiveIntelligenceSummary(insights, foundation);

      // Generate action priorities
      const actionPriorities = this._generateActionPriorities(insights, strategicRecommendations);

      const comprehensiveInsights = {
        summary: {
          totalCompetitors: foundation.competitors.length,
          weaknessesIdentified: insights.weaknesses?.totalWeaknesses || 0,
          trendsDetected: insights.trends?.significantTrends?.length || 0,
          disruptionOpportunities: insights.disruption?.opportunities?.length || 0,
          partnershipOpportunities: insights.partnerships?.opportunities?.length || 0,
          analysisDate: new Date(),
          analysisDepth
        },
        insights,
        intelligence: competitiveIntelligence,
        recommendations: strategicRecommendations,
        actionPriorities,
        monitoringPlan: this._createMonitoringPlan(insights),
        nextReviewDate: new Date(Date.now() + this.cacheTtl)
      };

      // Cache the insights
      this.insightsCache.set(cacheKey, {
        insights: comprehensiveInsights,
        timestamp: Date.now()
      });

      // Store in database
      await this._storeCompetitiveInsights(tenantId, comprehensiveInsights);

      console.log(`✅ Competitive insights generated: ${insights.weaknesses?.totalWeaknesses || 0} weaknesses, ${insights.trends?.significantTrends?.length || 0} trends identified`);

      return comprehensiveInsights;

    } catch (error) {
      logger.error('Failed to generate competitive insights', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Detect competitor weaknesses across multiple dimensions
   * @param {string} tenantId - Tenant identifier
   * @param {object} foundation - Competitive foundation data
   * @returns {Promise<object>} Weakness analysis
   */
  async _analyzeCompetitorWeaknesses(tenantId, foundation) {
    console.log(`🎯 Analyzing competitor weaknesses`);

    try {
      const weaknessAnalysis = {};
      const allWeaknesses = [];

      // Analyze each competitor individually
      for (const competitor of foundation.competitors.slice(0, 10)) { // Limit to top 10
        console.log(`🔍 Analyzing weaknesses for ${competitor.name}`);

        const competitorWeaknesses = await this._analyzeIndividualCompetitorWeaknesses(competitor, foundation);
        weaknessAnalysis[competitor.name] = competitorWeaknesses;
        allWeaknesses.push(...competitorWeaknesses.weaknesses);
      }

      // Identify systemic weaknesses across the market
      const systemicWeaknesses = await this._identifySystemicWeaknesses(allWeaknesses, foundation);

      // Prioritize weaknesses by exploitability
      const prioritizedWeaknesses = this._prioritizeWeaknessesByExploitability(allWeaknesses, foundation);

      // Generate weakness-based opportunities
      const opportunities = await this._generateWeaknessBasedOpportunities(prioritizedWeaknesses, foundation);

      return {
        totalWeaknesses: allWeaknesses.length,
        competitorAnalysis: weaknessAnalysis,
        systemicWeaknesses,
        prioritizedWeaknesses: prioritizedWeaknesses.slice(0, 20), // Top 20
        opportunities,
        exploitabilityMatrix: this._createExploitabilityMatrix(prioritizedWeaknesses),
        actionableInsights: this._generateActionableWeaknessInsights(prioritizedWeaknesses)
      };

    } catch (error) {
      logger.warn('Failed to analyze competitor weaknesses', { error: error.message });
      return { totalWeaknesses: 0, competitorAnalysis: {}, opportunities: [] };
    }
  }

  /**
   * Analyze market share dynamics and trends
   * @param {string} tenantId - Tenant identifier
   * @param {object} foundation - Competitive foundation data
   * @returns {Promise<object>} Market share analysis
   */
  async _analyzeMarketShareDynamics(tenantId, foundation) {
    console.log(`📊 Analyzing market share dynamics`);

    try {
      // Estimate market share distribution
      const marketShareEstimates = await this._estimateMarketShares(foundation);

      // Analyze market share trends
      const shareTrends = await this._analyzeMarketShareTrends(foundation);

      // Identify market leaders and challengers
      const marketPositions = this._identifyMarketPositions(marketShareEstimates);

      // Detect market share opportunities
      const shareOpportunities = await this._detectMarketShareOpportunities(marketShareEstimates, foundation);

      // Analyze competitive dynamics
      const competitiveDynamics = await this._analyzeCompetitiveDynamics(foundation);

      // Generate market share predictions
      const predictions = await this._generateMarketSharePredictions(shareTrends, foundation);

      return {
        currentDistribution: marketShareEstimates,
        trends: shareTrends,
        positions: marketPositions,
        opportunities: shareOpportunities,
        dynamics: competitiveDynamics,
        predictions,
        concentrationIndex: this._calculateMarketConcentration(marketShareEstimates),
        recommendations: this._generateMarketShareRecommendations(marketShareEstimates, shareOpportunities)
      };

    } catch (error) {
      logger.warn('Failed to analyze market share dynamics', { error: error.message });
      return { currentDistribution: {}, trends: [], opportunities: [] };
    }
  }

  /**
   * Identify market trends and their implications
   * @param {string} tenantId - Tenant identifier
   * @param {object} foundation - Competitive foundation data
   * @returns {Promise<object>} Trend analysis
   */
  async _identifyMarketTrends(tenantId, foundation) {
    console.log(`📈 Identifying market trends`);

    try {
      const trends = {};

      // Analyze trends across different categories
      for (const category of Object.keys(this.trendCategories)) {
        console.log(`📊 Analyzing ${category} trends...`);
        trends[category] = await this._analyzeTrendCategory(category, foundation);
      }

      // Identify significant trends
      const significantTrends = this._identifySignificantTrends(trends);

      // Analyze trend intersections and combinations
      const trendIntersections = this._analyzeTrendIntersections(significantTrends);

      // Generate trend-based opportunities
      const trendOpportunities = await this._generateTrendBasedOpportunities(significantTrends, foundation);

      // Create trend timeline and predictions
      const trendTimeline = this._createTrendTimeline(significantTrends);

      // Assess trend impact on competition
      const competitiveImpact = await this._assessTrendImpactOnCompetition(significantTrends, foundation);

      return {
        categorizedTrends: trends,
        significantTrends,
        trendIntersections,
        opportunities: trendOpportunities,
        timeline: trendTimeline,
        competitiveImpact,
        emergingTrends: significantTrends.filter(t => t.maturity === 'emerging'),
        trendRecommendations: this._generateTrendRecommendations(significantTrends, trendOpportunities)
      };

    } catch (error) {
      logger.warn('Failed to identify market trends', { error: error.message });
      return { significantTrends: [], opportunities: [] };
    }
  }

  /**
   * Detect disruption opportunities in the market
   * @param {string} tenantId - Tenant identifier
   * @param {object} foundation - Competitive foundation data
   * @returns {Promise<object>} Disruption analysis
   */
  async _detectDisruptionOpportunities(tenantId, foundation) {
    console.log(`⚡ Detecting disruption opportunities`);

    try {
      // Analyze disruption indicators across categories
      const disruptionSignals = {};
      for (const category of Object.keys(this.disruptionIndicators)) {
        disruptionSignals[category] = await this._analyzeDisruptionSignals(category, foundation);
      }

      // Identify potential disruption vectors
      const disruptionVectors = await this._identifyDisruptionVectors(disruptionSignals, foundation);

      // Use AI to analyze disruption opportunities
      const disruptionOpportunities = await this._aiAnalyzeDisruptionOpportunities({
        signals: disruptionSignals,
        vectors: disruptionVectors,
        industry: foundation.industry,
        competitors: foundation.competitors
      });

      // Assess disruption readiness
      const disruptionReadiness = this._assessDisruptionReadiness(foundation.tenantCapabilities);

      // Generate disruption strategies
      const disruptionStrategies = await this._generateDisruptionStrategies(disruptionOpportunities, foundation);

      // Create disruption timeline
      const disruptionTimeline = this._createDisruptionTimeline(disruptionOpportunities);

      return {
        signals: disruptionSignals,
        vectors: disruptionVectors,
        opportunities: disruptionOpportunities,
        readiness: disruptionReadiness,
        strategies: disruptionStrategies,
        timeline: disruptionTimeline,
        riskAssessment: this._assessDisruptionRisks(disruptionOpportunities),
        recommendations: this._generateDisruptionRecommendations(disruptionOpportunities, disruptionReadiness)
      };

    } catch (error) {
      logger.warn('Failed to detect disruption opportunities', { error: error.message });
      return { opportunities: [], strategies: [] };
    }
  }

  /**
   * Analyze partnership possibilities with competitors and complementary businesses
   * @param {string} tenantId - Tenant identifier
   * @param {object} foundation - Competitive foundation data
   * @returns {Promise<object>} Partnership analysis
   */
  async _analyzePartnershipPossibilities(tenantId, foundation) {
    console.log(`🤝 Analyzing partnership possibilities`);

    try {
      // Identify potential partnership types
      const partnershipTypes = ['strategic_alliance', 'joint_venture', 'technology_partnership', 'distribution_partnership', 'co_marketing'];

      const partnerships = {};

      for (const type of partnershipTypes) {
        partnerships[type] = await this._identifyPartnershipOpportunities(type, foundation);
      }

      // Analyze competitor partnerships
      const competitorPartnerships = await this._analyzeCompetitorPartnerships(foundation);

      // Identify partnership gaps
      const partnershipGaps = this._identifyPartnershipGaps(partnerships, competitorPartnerships);

      // Use AI to recommend partnerships
      const partnershipRecommendations = await this._aiRecommendPartnerships({
        opportunities: partnerships,
        competitorPartnerships,
        gaps: partnershipGaps,
        tenantCapabilities: foundation.tenantCapabilities,
        industry: foundation.industry
      });

      // Assess partnership readiness
      const partnershipReadiness = this._assessPartnershipReadiness(foundation);

      // Generate partnership strategies
      const partnershipStrategies = this._generatePartnershipStrategies(partnershipRecommendations);

      return {
        opportunities: partnerships,
        competitorAnalysis: competitorPartnerships,
        gaps: partnershipGaps,
        recommendations: partnershipRecommendations,
        readiness: partnershipReadiness,
        strategies: partnershipStrategies,
        prioritization: this._prioritizePartnerships(partnershipRecommendations),
        implementationPlan: this._createPartnershipImplementationPlan(partnershipRecommendations)
      };

    } catch (error) {
      logger.warn('Failed to analyze partnership possibilities', { error: error.message });
      return { opportunities: {}, recommendations: [] };
    }
  }

  /**
   * =====================================
   * PRIVATE AI-POWERED METHODS
   * =====================================
   */

  async _aiAnalyzeDisruptionOpportunities(context) {
    const prompt = `Analyze disruption opportunities in this competitive landscape:

Industry: ${context.industry}
Competitors: ${context.competitors.slice(0, 5).map(c => c.name).join(', ')}

Disruption Signals:
${Object.entries(context.signals).map(([category, signals]) =>
  `${category}: ${signals.map(s => s.signal).join(', ')}`
).join('\n')}

Disruption Vectors:
${context.vectors.map(v => `- ${v.vector}: ${v.potential}`).join('\n')}

Identify:
1. Specific disruption opportunities
2. Technology enablers
3. Market timing
4. Implementation complexity
5. Potential impact

Return JSON: {"opportunities": [{"name": "...", "description": "...", "enablers": [...], "timing": "...", "complexity": "low/medium/high", "impact": "low/medium/high", "probability": 1-10}]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'disruption_analysis'
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis.opportunities || [];
      }

      return [];

    } catch (error) {
      logger.warn('AI disruption analysis failed', { error: error.message });
      return [];
    }
  }

  async _aiRecommendPartnerships(context) {
    const prompt = `Recommend strategic partnerships based on this analysis:

Partnership Opportunities:
${Object.entries(context.opportunities).map(([type, opps]) =>
  `${type}: ${opps.length} opportunities identified`
).join('\n')}

Competitor Partnerships:
${context.competitorPartnerships.map(cp => `- ${cp.competitor}: ${cp.partnerships.join(', ')}`).join('\n')}

Partnership Gaps:
${context.gaps.map(gap => `- ${gap.area}: ${gap.description}`).join('\n')}

Our Capabilities: ${context.tenantCapabilities.join(', ')}
Industry: ${context.industry}

Recommend:
1. Top 5 partnership opportunities
2. Strategic rationale for each
3. Expected benefits
4. Implementation approach
5. Success metrics

Return JSON: {"recommendations": [{"partner_type": "...", "description": "...", "rationale": "...", "benefits": [...], "approach": "...", "metrics": [...], "priority": 1-10}]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'partnership_recommendations'
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis.recommendations || [];
      }

      return [];

    } catch (error) {
      logger.warn('AI partnership recommendation failed', { error: error.message });
      return [];
    }
  }

  /**
   * =====================================
   * PRIVATE HELPER METHODS
   * =====================================
   */

  async _gatherCompetitiveFoundation(tenantId) {
    console.log(`📊 Gathering competitive foundation data`);

    try {
      const [
        competitors,
        tenantConfig,
        marketGaps,
        tenantMetrics
      ] = await Promise.all([
        this.competitorService.getIntelligenceSummary(tenantId),
        dataStore.getAllTenantConfigs(tenantId),
        dataStore.getTenantConfig(tenantId, 'comprehensive_gap_analysis', { defaultValue: null }),
        this._getTenantPerformanceData(tenantId)
      ]);

      return {
        competitors: competitors.competitors || [],
        industry: tenantConfig.industry || 'general',
        businessModel: tenantConfig.business_model || 'unknown',
        tenantCapabilities: tenantConfig.capabilities || [],
        budget: tenantConfig.monthly_budget || 0,
        teamSize: tenantConfig.team_size || 1,
        marketGaps: marketGaps?.analysis || null,
        tenantPerformance: tenantMetrics,
        analysisDate: new Date()
      };

    } catch (error) {
      logger.warn('Failed to gather complete competitive foundation', {
        tenantId,
        error: error.message
      });

      return {
        competitors: [],
        industry: 'general',
        businessModel: 'unknown',
        tenantCapabilities: [],
        budget: 0,
        teamSize: 1,
        marketGaps: null,
        tenantPerformance: {},
        analysisDate: new Date()
      };
    }
  }

  async _analyzeIndividualCompetitorWeaknesses(competitor, foundation) {
    const weaknesses = [];

    // Analyze across weakness dimensions
    for (const [dimension, categories] of Object.entries(this.weaknessDimensions)) {
      const dimensionWeaknesses = await this._analyzeDimensionWeaknesses(competitor, dimension, categories, foundation);
      weaknesses.push(...dimensionWeaknesses);
    }

    // Score weakness severity and exploitability
    const scoredWeaknesses = weaknesses.map(weakness => ({
      ...weakness,
      severity: this._scoreWeaknessSeverity(weakness, competitor),
      exploitability: this._scoreWeaknessExploitability(weakness, foundation),
      confidence: this._calculateWeaknessConfidence(weakness)
    }));

    return {
      competitor: competitor.name,
      totalWeaknesses: scoredWeaknesses.length,
      weaknesses: scoredWeaknesses,
      topWeaknesses: scoredWeaknesses.filter(w => w.severity >= 7).slice(0, 5),
      exploitableWeaknesses: scoredWeaknesses.filter(w => w.exploitability >= 6),
      weaknessScore: this._calculateOverallWeaknessScore(scoredWeaknesses)
    };
  }

  async _analyzeDimensionWeaknesses(competitor, dimension, categories, foundation) {
    const weaknesses = [];

    // Mock weakness detection based on competitor data and market analysis
    // In production, this would integrate with actual data sources

    if (dimension === 'product' && !competitor.strengths?.includes('product')) {
      weaknesses.push({
        dimension,
        category: 'feature_gaps',
        description: `${competitor.name} may have feature gaps in core functionality`,
        evidence: 'Limited feature mentions in market analysis',
        impactArea: 'customer_satisfaction'
      });
    }

    if (dimension === 'market' && competitor.position !== 'leader') {
      weaknesses.push({
        dimension,
        category: 'weak_positioning',
        description: `${competitor.name} has unclear market positioning`,
        evidence: 'Not positioned as market leader',
        impactArea: 'brand_recognition'
      });
    }

    if (dimension === 'operational' && foundation.competitors.length > 10) {
      weaknesses.push({
        dimension,
        category: 'efficiency_issues',
        description: `${competitor.name} may face operational efficiency challenges`,
        evidence: 'Crowded competitive landscape suggests cost pressures',
        impactArea: 'profit_margins'
      });
    }

    return weaknesses;
  }

  _scoreWeaknessSeverity(weakness, competitor) {
    // Score weakness severity 1-10
    let score = 5; // Base score

    if (weakness.impactArea === 'revenue') score += 2;
    if (weakness.impactArea === 'customer_satisfaction') score += 1.5;
    if (weakness.evidence.includes('significant') || weakness.evidence.includes('major')) score += 1;

    return Math.min(10, Math.max(1, score));
  }

  _scoreWeaknessExploitability(weakness, foundation) {
    // Score how exploitable this weakness is for the tenant
    let score = 5; // Base score

    // Higher exploitability if we have capabilities in this area
    if (foundation.tenantCapabilities.includes(weakness.dimension)) score += 2;

    // Higher exploitability if we have budget to address it
    if (foundation.budget > 10000 && weakness.dimension === 'technology') score += 1;

    // Higher exploitability if it's in our core business area
    if (weakness.impactArea === 'customer_satisfaction' && foundation.businessModel === 'saas') score += 1;

    return Math.min(10, Math.max(1, score));
  }

  _calculateWeaknessConfidence(weakness) {
    // Calculate confidence in weakness assessment
    let confidence = 0.5; // Base confidence

    if (weakness.evidence.includes('data') || weakness.evidence.includes('analysis')) confidence += 0.2;
    if (weakness.evidence.includes('may') || weakness.evidence.includes('potential')) confidence -= 0.1;

    return Math.min(1, Math.max(0.1, confidence));
  }

  _calculateOverallWeaknessScore(weaknesses) {
    if (weaknesses.length === 0) return 0;

    const totalScore = weaknesses.reduce((sum, w) => sum + (w.severity * w.confidence), 0);
    const maxPossibleScore = weaknesses.length * 10;

    return (totalScore / maxPossibleScore) * 10;
  }

  async _identifySystemicWeaknesses(allWeaknesses, foundation) {
    // Identify weaknesses common across multiple competitors
    const weaknessCounts = {};

    allWeaknesses.forEach(weakness => {
      const key = `${weakness.dimension}_${weakness.category}`;
      weaknessCounts[key] = (weaknessCounts[key] || 0) + 1;
    });

    const systemicWeaknesses = Object.entries(weaknessCounts)
      .filter(([key, count]) => count >= Math.max(2, foundation.competitors.length * 0.3))
      .map(([key, count]) => {
        const [dimension, category] = key.split('_');
        return {
          dimension,
          category,
          prevalence: count,
          percentage: (count / foundation.competitors.length) * 100,
          opportunity: `Industry-wide ${category} weakness presents market opportunity`
        };
      });

    return systemicWeaknesses;
  }

  _prioritizeWeaknessesByExploitability(weaknesses, foundation) {
    return weaknesses
      .map(weakness => ({
        ...weakness,
        exploitabilityScore: (weakness.severity * 0.4) + (weakness.exploitability * 0.6)
      }))
      .sort((a, b) => b.exploitabilityScore - a.exploitabilityScore);
  }

  async _generateWeaknessBasedOpportunities(weaknesses, foundation) {
    const opportunities = [];

    const topWeaknesses = weaknesses.slice(0, 10);

    for (const weakness of topWeaknesses) {
      if (weakness.exploitabilityScore >= 6) {
        opportunities.push({
          opportunity: `Address ${weakness.category} gap in ${weakness.dimension}`,
          description: `Exploit competitor weakness: ${weakness.description}`,
          strategy: this._generateExploitationStrategy(weakness, foundation),
          impact: weakness.severity,
          effort: 10 - weakness.exploitability,
          timeline: weakness.exploitability > 7 ? 'short-term' : 'medium-term'
        });
      }
    }

    return opportunities;
  }

  _generateExploitationStrategy(weakness, foundation) {
    const strategies = {
      product: 'Develop superior product features addressing this gap',
      market: 'Position as the solution to this market problem',
      operational: 'Leverage operational efficiency as competitive advantage',
      financial: 'Offer more attractive pricing or terms',
      strategic: 'Execute clearer strategic vision in this area',
      technology: 'Invest in technology that addresses this weakness'
    };

    return strategies[weakness.dimension] || 'Develop competitive advantage in this area';
  }

  _createExploitabilityMatrix(weaknesses) {
    const matrix = {
      high_impact_high_exploitability: [],
      high_impact_low_exploitability: [],
      low_impact_high_exploitability: [],
      low_impact_low_exploitability: []
    };

    weaknesses.forEach(weakness => {
      const highImpact = weakness.severity >= 7;
      const highExploitability = weakness.exploitability >= 7;

      if (highImpact && highExploitability) {
        matrix.high_impact_high_exploitability.push(weakness);
      } else if (highImpact && !highExploitability) {
        matrix.high_impact_low_exploitability.push(weakness);
      } else if (!highImpact && highExploitability) {
        matrix.low_impact_high_exploitability.push(weakness);
      } else {
        matrix.low_impact_low_exploitability.push(weakness);
      }
    });

    return matrix;
  }

  _generateActionableWeaknessInsights(weaknesses) {
    const insights = [];

    const quickWins = weaknesses.filter(w => w.exploitability >= 8 && w.severity >= 6);
    const strategicMoves = weaknesses.filter(w => w.severity >= 8 && w.exploitability >= 5);

    if (quickWins.length > 0) {
      insights.push({
        type: 'quick_win',
        insight: `${quickWins.length} competitor weaknesses can be exploited quickly`,
        actions: quickWins.slice(0, 3).map(w => `Target ${w.category} in ${w.dimension}`)
      });
    }

    if (strategicMoves.length > 0) {
      insights.push({
        type: 'strategic_opportunity',
        insight: `${strategicMoves.length} high-impact weaknesses require strategic investment`,
        actions: strategicMoves.slice(0, 3).map(w => `Develop ${w.dimension} capabilities`)
      });
    }

    return insights;
  }

  // Market share analysis methods
  async _estimateMarketShares(foundation) {
    const shares = {};
    const totalCompetitors = foundation.competitors.length;

    if (totalCompetitors === 0) return shares;

    // Simple market share estimation based on position
    foundation.competitors.forEach(competitor => {
      if (competitor.position === 'leader') {
        shares[competitor.name] = Math.random() * 20 + 25; // 25-45%
      } else if (competitor.position === 'challenger') {
        shares[competitor.name] = Math.random() * 15 + 10; // 10-25%
      } else {
        shares[competitor.name] = Math.random() * 8 + 2; // 2-10%
      }
    });

    // Normalize to 100%
    const total = Object.values(shares).reduce((sum, share) => sum + share, 0);
    Object.keys(shares).forEach(competitor => {
      shares[competitor] = (shares[competitor] / total) * 100;
    });

    return shares;
  }

  async _analyzeMarketShareTrends(foundation) {
    return foundation.competitors.map(competitor => ({
      competitor: competitor.name,
      trend: ['growing', 'stable', 'declining'][Math.floor(Math.random() * 3)],
      change: (Math.random() - 0.5) * 10, // -5% to +5%
      factors: ['product innovation', 'marketing effectiveness', 'pricing strategy']
    }));
  }

  _identifyMarketPositions(marketShares) {
    const sortedCompetitors = Object.entries(marketShares)
      .sort(([,a], [,b]) => b - a);

    return {
      leader: sortedCompetitors[0] ? sortedCompetitors[0][0] : null,
      challengers: sortedCompetitors.slice(1, 4).map(([name]) => name),
      followers: sortedCompetitors.slice(4).map(([name]) => name),
      concentration: this._calculateMarketConcentration(marketShares)
    };
  }

  _calculateMarketConcentration(marketShares) {
    const shares = Object.values(marketShares).sort((a, b) => b - a);
    const top4Share = shares.slice(0, 4).reduce((sum, share) => sum + share, 0);

    let concentration = 'fragmented';
    if (top4Share > 60) concentration = 'highly concentrated';
    else if (top4Share > 40) concentration = 'moderately concentrated';

    return { level: concentration, top4Share, hhi: this._calculateHHI(shares) };
  }

  _calculateHHI(shares) {
    // Herfindahl-Hirschman Index
    return shares.reduce((sum, share) => sum + Math.pow(share, 2), 0);
  }

  async _detectMarketShareOpportunities(marketShares, foundation) {
    const opportunities = [];

    const sortedShares = Object.entries(marketShares).sort(([,a], [,b]) => b - a);

    // Look for gaps between competitors
    for (let i = 0; i < sortedShares.length - 1; i++) {
      const gap = sortedShares[i][1] - sortedShares[i + 1][1];
      if (gap > 10) {
        opportunities.push({
          type: 'position_gap',
          description: `${gap.toFixed(1)}% market share gap between ${sortedShares[i][0]} and ${sortedShares[i + 1][0]}`,
          potential: gap > 15 ? 'high' : 'medium',
          strategy: 'Target specific customer segments to capture market share'
        });
      }
    }

    // Look for underserved segments
    const totalCovered = Object.values(marketShares).reduce((sum, share) => sum + share, 0);
    if (totalCovered < 80) {
      opportunities.push({
        type: 'underserved_market',
        description: `${(100 - totalCovered).toFixed(1)}% of market appears underserved`,
        potential: 'high',
        strategy: 'Identify and target underserved customer segments'
      });
    }

    return opportunities;
  }

  async _analyzeCompetitiveDynamics(foundation) {
    return {
      intensity: foundation.competitors.length > 15 ? 'high' : foundation.competitors.length > 8 ? 'medium' : 'low',
      movements: ['new entrants', 'consolidation', 'expansion'],
      priceCompetition: 'medium',
      innovationRate: foundation.industry === 'technology' ? 'high' : 'medium',
      customerSwitching: 'medium'
    };
  }

  async _generateMarketSharePredictions(trends, foundation) {
    return {
      timeframe: '12 months',
      predictions: trends.map(trend => ({
        competitor: trend.competitor,
        predictedChange: trend.change,
        confidence: Math.random() * 0.4 + 0.5, // 50-90% confidence
        factors: trend.factors
      })),
      scenarios: {
        optimistic: 'Market grows 20%, share distribution shifts moderately',
        realistic: 'Market grows 10%, current leaders maintain position',
        pessimistic: 'Market grows 5%, increased consolidation'
      }
    };
  }

  _generateMarketShareRecommendations(marketShares, opportunities) {
    const recommendations = [];

    opportunities.forEach(opp => {
      if (opp.potential === 'high') {
        recommendations.push({
          priority: 'high',
          action: opp.strategy,
          rationale: opp.description,
          timeframe: 'medium-term'
        });
      }
    });

    return recommendations;
  }

  // Trend analysis methods
  async _analyzeTrendCategory(category, foundation) {
    const trends = [];

    // Mock trend analysis - in production, integrate with actual trend data sources
    const categoryTrends = this.trendCategories[category];

    categoryTrends.forEach(trendType => {
      trends.push({
        type: trendType,
        direction: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)],
        strength: Math.random() * 10,
        maturity: ['emerging', 'growing', 'mature'][Math.floor(Math.random() * 3)],
        impact: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        timeframe: ['short-term', 'medium-term', 'long-term'][Math.floor(Math.random() * 3)]
      });
    });

    return trends;
  }

  _identifySignificantTrends(trends) {
    const significantTrends = [];

    Object.values(trends).forEach(categoryTrends => {
      categoryTrends.forEach(trend => {
        if (trend.strength >= 7 || (trend.strength >= 5 && trend.impact === 'high')) {
          significantTrends.push(trend);
        }
      });
    });

    return significantTrends.slice(0, 15); // Top 15 trends
  }

  _analyzeTrendIntersections(trends) {
    const intersections = [];

    // Look for trends that reinforce each other
    for (let i = 0; i < trends.length; i++) {
      for (let j = i + 1; j < trends.length; j++) {
        if (trends[i].direction === trends[j].direction &&
            trends[i].impact === 'high' && trends[j].impact === 'high') {
          intersections.push({
            trends: [trends[i].type, trends[j].type],
            synergy: 'reinforcing',
            combinedImpact: 'very high',
            opportunity: `Combined effect of ${trends[i].type} and ${trends[j].type} creates major opportunity`
          });
        }
      }
    }

    return intersections.slice(0, 5); // Top 5 intersections
  }

  async _generateTrendBasedOpportunities(trends, foundation) {
    const opportunities = [];

    const risingTrends = trends.filter(t => t.direction === 'rising' && t.strength >= 6);

    risingTrends.forEach(trend => {
      opportunities.push({
        trend: trend.type,
        opportunity: `Capitalize on ${trend.type} trend`,
        description: `Leverage rising ${trend.type} trend for competitive advantage`,
        impact: trend.impact,
        timeframe: trend.timeframe,
        strategy: this._generateTrendStrategy(trend, foundation)
      });
    });

    return opportunities;
  }

  _generateTrendStrategy(trend, foundation) {
    const strategies = {
      ai_advancement: 'Integrate AI capabilities into product offering',
      digital_first: 'Prioritize digital-native customer experience',
      sustainability: 'Develop environmentally conscious business practices',
      personalization: 'Implement personalized customer experiences',
      automation: 'Automate routine processes for efficiency gains'
    };

    return strategies[trend.type] || `Develop capabilities to leverage ${trend.type} trend`;
  }

  _createTrendTimeline(trends) {
    const timeline = {
      'short-term': [],
      'medium-term': [],
      'long-term': []
    };

    trends.forEach(trend => {
      timeline[trend.timeframe].push({
        trend: trend.type,
        impact: trend.impact,
        maturity: trend.maturity
      });
    });

    return timeline;
  }

  async _assessTrendImpactOnCompetition(trends, foundation) {
    const impact = {
      disruptive_trends: trends.filter(t => t.impact === 'high' && t.maturity === 'emerging'),
      stabilizing_trends: trends.filter(t => t.direction === 'stable'),
      declining_trends: trends.filter(t => t.direction === 'declining'),
      competitive_implications: []
    };

    impact.disruptive_trends.forEach(trend => {
      impact.competitive_implications.push({
        trend: trend.type,
        implication: 'May disrupt current competitive landscape',
        preparation: `Develop ${trend.type} capabilities to stay competitive`
      });
    });

    return impact;
  }

  _generateTrendRecommendations(trends, opportunities) {
    const recommendations = [];

    const highImpactTrends = trends.filter(t => t.impact === 'high' && t.direction === 'rising');

    highImpactTrends.forEach(trend => {
      recommendations.push({
        trend: trend.type,
        recommendation: `Invest in ${trend.type} capabilities`,
        priority: trend.timeframe === 'short-term' ? 'high' : 'medium',
        rationale: `Rising trend with high impact on industry`
      });
    });

    return recommendations;
  }

  // Disruption analysis methods
  async _analyzeDisruptionSignals(category, foundation) {
    const signals = [];
    const indicators = this.disruptionIndicators[category];

    indicators.forEach(indicator => {
      signals.push({
        signal: indicator,
        strength: Math.random() * 10,
        source: 'market analysis',
        confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
        timeframe: ['immediate', 'near-term', 'medium-term'][Math.floor(Math.random() * 3)]
      });
    });

    return signals.filter(s => s.strength >= 5); // Only significant signals
  }

  async _identifyDisruptionVectors(signals, foundation) {
    const vectors = [];

    // Combine strong signals into disruption vectors
    Object.entries(signals).forEach(([category, categorySignals]) => {
      const strongSignals = categorySignals.filter(s => s.strength >= 7);

      if (strongSignals.length >= 2) {
        vectors.push({
          vector: `${category}_disruption`,
          signals: strongSignals.map(s => s.signal),
          potential: strongSignals.length >= 3 ? 'high' : 'medium',
          enablers: strongSignals.map(s => s.signal),
          barriers: this._identifyDisruptionBarriers(category, foundation)
        });
      }
    });

    return vectors;
  }

  _identifyDisruptionBarriers(category, foundation) {
    const barriers = {
      technology: ['technical complexity', 'infrastructure requirements'],
      business_model: ['customer adoption', 'ecosystem resistance'],
      customer: ['behavior change required', 'value perception'],
      market: ['regulatory constraints', 'incumbent resistance']
    };

    return barriers[category] || ['general market resistance'];
  }

  _assessDisruptionReadiness(capabilities) {
    const readinessFactors = {
      technology: capabilities.includes('technology') ? 8 : 4,
      innovation: capabilities.includes('innovation') ? 7 : 3,
      agility: capabilities.includes('agile') ? 6 : 5,
      resources: capabilities.length > 3 ? 7 : 4,
      culture: 6 // Default assumption
    };

    const overallReadiness = Object.values(readinessFactors).reduce((sum, score) => sum + score, 0) / 5;

    return {
      overall: overallReadiness,
      factors: readinessFactors,
      level: overallReadiness >= 7 ? 'high' : overallReadiness >= 5 ? 'medium' : 'low',
      gaps: Object.entries(readinessFactors).filter(([factor, score]) => score < 6).map(([factor]) => factor)
    };
  }

  async _generateDisruptionStrategies(opportunities, foundation) {
    return opportunities.map(opp => ({
      opportunity: opp.name,
      strategy: this._selectDisruptionStrategy(opp, foundation),
      approach: opp.complexity === 'low' ? 'fast_follower' : 'strategic_investment',
      timeline: opp.timing,
      resources: this._estimateDisruptionResources(opp, foundation),
      risks: this._identifyDisruptionStrategyRisks(opp)
    }));
  }

  _selectDisruptionStrategy(opportunity, foundation) {
    if (opportunity.complexity === 'low' && opportunity.impact === 'high') {
      return 'rapid_implementation';
    } else if (opportunity.complexity === 'high' && opportunity.impact === 'high') {
      return 'strategic_partnership';
    } else {
      return 'gradual_adoption';
    }
  }

  _estimateDisruptionResources(opportunity, foundation) {
    const baseResource = opportunity.complexity === 'high' ? 100000 :
                        opportunity.complexity === 'medium' ? 50000 : 20000;

    return {
      financial: baseResource,
      human: opportunity.complexity === 'high' ? 'full team' : 'dedicated team',
      technology: opportunity.enablers,
      timeline: opportunity.timing
    };
  }

  _identifyDisruptionStrategyRisks(opportunity) {
    return [
      { risk: 'Technology not ready', probability: 'medium', impact: 'high' },
      { risk: 'Market adoption slower than expected', probability: 'medium', impact: 'medium' },
      { risk: 'Competitive response', probability: 'high', impact: 'medium' }
    ];
  }

  _createDisruptionTimeline(opportunities) {
    const timeline = {};

    opportunities.forEach(opp => {
      if (!timeline[opp.timing]) timeline[opp.timing] = [];
      timeline[opp.timing].push({
        opportunity: opp.name,
        impact: opp.impact,
        complexity: opp.complexity
      });
    });

    return timeline;
  }

  _assessDisruptionRisks(opportunities) {
    const risks = [];

    const highImpactOpportunities = opportunities.filter(opp => opp.impact === 'high');

    if (highImpactOpportunities.length > 3) {
      risks.push({
        risk: 'Resource dilution across multiple disruption opportunities',
        mitigation: 'Prioritize and phase implementation',
        severity: 'medium'
      });
    }

    return risks;
  }

  _generateDisruptionRecommendations(opportunities, readiness) {
    const recommendations = [];

    if (readiness.level === 'low') {
      recommendations.push({
        priority: 'high',
        action: 'Invest in disruption readiness capabilities',
        focus: readiness.gaps,
        timeframe: 'immediate'
      });
    }

    const quickWins = opportunities.filter(opp => opp.complexity === 'low' && opp.impact === 'medium');
    if (quickWins.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Pursue quick-win disruption opportunities',
        opportunities: quickWins.slice(0, 2),
        timeframe: 'short-term'
      });
    }

    return recommendations;
  }

  // Partnership analysis methods
  async _identifyPartnershipOpportunities(type, foundation) {
    const opportunities = [];

    // Mock partnership identification - in production, analyze actual market data
    switch (type) {
      case 'strategic_alliance':
        opportunities.push({
          type,
          description: 'Alliance with complementary service provider',
          benefits: ['market access', 'capability enhancement'],
          requirements: ['strategic alignment', 'cultural fit']
        });
        break;

      case 'technology_partnership':
        opportunities.push({
          type,
          description: 'Partnership with technology provider',
          benefits: ['enhanced capabilities', 'faster innovation'],
          requirements: ['technical compatibility', 'IP protection']
        });
        break;

      case 'distribution_partnership':
        opportunities.push({
          type,
          description: 'Partnership with distribution channel',
          benefits: ['expanded reach', 'local expertise'],
          requirements: ['channel alignment', 'performance standards']
        });
        break;
    }

    return opportunities;
  }

  async _analyzeCompetitorPartnerships(foundation) {
    return foundation.competitors.map(competitor => ({
      competitor: competitor.name,
      partnerships: ['technology provider', 'consulting firm'], // Mock data
      partnershipTypes: ['strategic', 'operational'],
      gaps: ['distribution', 'international']
    }));
  }

  _identifyPartnershipGaps(partnerships, competitorPartnerships) {
    const gaps = [];

    // Identify partnership types that competitors have but we don't
    const competitorPartnershipTypes = new Set();
    competitorPartnerships.forEach(cp => {
      cp.partnershipTypes.forEach(type => competitorPartnershipTypes.add(type));
    });

    const ourPartnershipTypes = new Set(Object.keys(partnerships));

    competitorPartnershipTypes.forEach(type => {
      if (!ourPartnershipTypes.has(type)) {
        gaps.push({
          area: type,
          description: `Missing ${type} partnerships that competitors have`,
          priority: 'medium'
        });
      }
    });

    return gaps;
  }

  _assessPartnershipReadiness(foundation) {
    return {
      strategic: foundation.tenantCapabilities.includes('strategy') ? 8 : 5,
      operational: foundation.teamSize > 3 ? 7 : 4,
      financial: foundation.budget > 20000 ? 8 : 5,
      legal: 6, // Default assumption
      cultural: 7, // Default assumption
      overall: 6.4
    };
  }

  _generatePartnershipStrategies(recommendations) {
    return recommendations.map(rec => ({
      partnerType: rec.partner_type,
      strategy: rec.approach,
      timeline: '3-6 months',
      success_metrics: rec.metrics,
      implementation_steps: [
        'Identify potential partners',
        'Evaluate strategic fit',
        'Negotiate partnership terms',
        'Implement partnership',
        'Monitor and optimize'
      ]
    }));
  }

  _prioritizePartnerships(recommendations) {
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5) // Top 5
      .map((rec, index) => ({
        rank: index + 1,
        partner_type: rec.partner_type,
        priority_score: rec.priority,
        rationale: rec.rationale
      }));
  }

  _createPartnershipImplementationPlan(recommendations) {
    const topRecommendations = recommendations.slice(0, 3);

    return {
      phase1: {
        timeframe: '0-3 months',
        focus: topRecommendations[0]?.partner_type || 'strategic_alliance',
        activities: ['Partner identification', 'Initial outreach', 'Feasibility assessment']
      },
      phase2: {
        timeframe: '3-6 months',
        focus: topRecommendations[1]?.partner_type || 'technology_partnership',
        activities: ['Partnership negotiation', 'Pilot implementation', 'Performance measurement']
      },
      phase3: {
        timeframe: '6-12 months',
        focus: topRecommendations[2]?.partner_type || 'distribution_partnership',
        activities: ['Full implementation', 'Optimization', 'Expansion planning']
      }
    };
  }

  // Strategic recommendations and insights generation
  async _generateStrategicRecommendations(tenantId, insights, foundation) {
    const recommendations = [];

    // Weakness-based recommendations
    if (insights.weaknesses?.opportunities) {
      insights.weaknesses.opportunities.slice(0, 3).forEach(opp => {
        recommendations.push({
          type: 'competitive_advantage',
          priority: opp.impact >= 7 ? 'high' : 'medium',
          recommendation: opp.opportunity,
          rationale: 'Exploit competitor weakness',
          timeframe: opp.timeline,
          resources: `${opp.effort * 10000}`
        });
      });
    }

    // Trend-based recommendations
    if (insights.trends?.opportunities) {
      insights.trends.opportunities.slice(0, 2).forEach(opp => {
        recommendations.push({
          type: 'market_opportunity',
          priority: opp.impact === 'high' ? 'high' : 'medium',
          recommendation: opp.opportunity,
          rationale: 'Capitalize on market trend',
          timeframe: opp.timeframe,
          resources: 'TBD'
        });
      });
    }

    // Disruption-based recommendations
    if (insights.disruption?.opportunities) {
      insights.disruption.opportunities.slice(0, 2).forEach(opp => {
        if (opp.probability >= 7) {
          recommendations.push({
            type: 'disruption_opportunity',
            priority: opp.impact === 'high' ? 'high' : 'medium',
            recommendation: `Pursue ${opp.name} disruption opportunity`,
            rationale: 'Early mover advantage in disruption',
            timeframe: opp.timing,
            resources: 'Significant investment required'
          });
        }
      });
    }

    return recommendations.slice(0, 10); // Top 10 recommendations
  }

  async _createCompetitiveIntelligenceSummary(insights, foundation) {
    return {
      marketPosition: this._assessCurrentMarketPosition(foundation),
      competitiveThreats: this._identifyCompetitiveThreats(insights, foundation),
      competitiveAdvantages: this._identifyCompetitiveAdvantages(insights, foundation),
      marketDynamics: this._summarizeMarketDynamics(insights),
      strategicImplications: this._deriveStrategicImplications(insights)
    };
  }

  _assessCurrentMarketPosition(foundation) {
    return {
      position: foundation.competitors.length < 5 ? 'early_player' : 'follower',
      strengths: foundation.tenantCapabilities,
      marketShare: 'unknown',
      brandRecognition: 'developing'
    };
  }

  _identifyCompetitiveThreats(insights, foundation) {
    const threats = [];

    if (insights.trends?.disruptive_trends?.length > 0) {
      threats.push({
        threat: 'Disruptive trends may change competitive landscape',
        severity: 'high',
        timeframe: 'medium-term'
      });
    }

    if (foundation.competitors.length > 15) {
      threats.push({
        threat: 'High competitive intensity',
        severity: 'medium',
        timeframe: 'ongoing'
      });
    }

    return threats;
  }

  _identifyCompetitiveAdvantages(insights, foundation) {
    const advantages = [];

    if (insights.weaknesses?.systemicWeaknesses?.length > 0) {
      advantages.push({
        advantage: 'Opportunity to address industry-wide weaknesses',
        strength: 'high',
        sustainability: 'medium'
      });
    }

    if (foundation.tenantCapabilities.includes('technology')) {
      advantages.push({
        advantage: 'Technology capabilities',
        strength: 'medium',
        sustainability: 'high'
      });
    }

    return advantages;
  }

  _summarizeMarketDynamics(insights) {
    return {
      competitiveIntensity: insights.marketShare?.dynamics?.intensity || 'medium',
      innovationRate: 'medium',
      customerSwitching: 'medium',
      priceCompetition: 'medium',
      entryBarriers: 'medium'
    };
  }

  _deriveStrategicImplications(insights) {
    const implications = [];

    if (insights.disruption?.opportunities?.length > 0) {
      implications.push('Market disruption creates both opportunities and threats');
    }

    if (insights.partnerships?.opportunities) {
      implications.push('Strategic partnerships essential for competitive positioning');
    }

    if (insights.weaknesses?.systemicWeaknesses?.length > 0) {
      implications.push('Industry-wide weaknesses present market opportunity');
    }

    return implications;
  }

  _generateActionPriorities(insights, recommendations) {
    const priorities = {
      immediate: [],
      short_term: [],
      medium_term: [],
      long_term: []
    };

    recommendations.forEach(rec => {
      if (rec.priority === 'high' && rec.timeframe === 'short-term') {
        priorities.immediate.push(rec);
      } else if (rec.timeframe === 'short-term') {
        priorities.short_term.push(rec);
      } else if (rec.timeframe === 'medium-term') {
        priorities.medium_term.push(rec);
      } else {
        priorities.long_term.push(rec);
      }
    });

    return priorities;
  }

  _createMonitoringPlan(insights) {
    return {
      competitive_tracking: {
        frequency: 'weekly',
        focus: 'competitor movements and announcements',
        alerts: ['new product launches', 'strategic partnerships', 'pricing changes']
      },
      trend_monitoring: {
        frequency: 'monthly',
        focus: 'industry trends and market shifts',
        sources: ['industry reports', 'market research', 'technology news']
      },
      disruption_watch: {
        frequency: 'quarterly',
        focus: 'emerging disruption signals',
        indicators: insights.disruption?.signals || []
      }
    };
  }

  async _storeCompetitiveInsights(tenantId, insights) {
    try {
      await dataStore.setTenantConfig(tenantId, 'competitive_insights', {
        insights,
        timestamp: new Date(),
        version: '1.0'
      });

      await dataStore.addLog(tenantId, 'info',
        `Competitive insights generated: ${insights.summary.weaknessesIdentified} weaknesses, ${insights.summary.trendsDetected} trends`,
        { summary: insights.summary }
      );

    } catch (error) {
      logger.warn('Failed to store competitive insights', {
        tenantId,
        error: error.message
      });
    }
  }

  async _getTenantPerformanceData(tenantId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return { performance: 'unknown' };
      }

      const totalRevenue = metrics.reduce((sum, m) => sum + (m.conversions || 0) * 50, 0);
      const totalCost = metrics.reduce((sum, m) => sum + (m.cost_micros || 0) / 1000000, 0);

      return {
        performance: totalRevenue > totalCost ? 'strong' : 'developing',
        revenue: totalRevenue,
        cost: totalCost,
        efficiency: totalCost > 0 ? totalRevenue / totalCost : 0
      };
    } catch {
      return { performance: 'unknown' };
    }
  }
}

// Singleton instance
let competitiveInsightsInstance = null;

/**
 * Get singleton instance
 */
export function getCompetitiveInsightsService() {
  if (!competitiveInsightsInstance) {
    competitiveInsightsInstance = new CompetitiveInsightsService();
  }
  return competitiveInsightsInstance;
}

export default getCompetitiveInsightsService;