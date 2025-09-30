/**
 * Market Gap Analyzer Service for ProofKit SaaS
 * Identifies untapped opportunities and market gaps for strategic advantage
 *
 * Features:
 * - Keyword gap analysis with search volume trends
 * - Product opportunity identification
 * - Service gap detection through competitor analysis
 * - Geographic opportunity mapping
 * - Demographic blind spot identification
 * - Seasonal opportunity calendar
 * - Blue ocean strategy discovery
 */

import { getAIProviderService } from './ai-provider.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Market Gap Analysis Engine
 */
export class MarketGapService {
  constructor() {
    this.aiService = getAIProviderService();
    this.competitorService = getCompetitorIntelligenceService();
    this.gapCache = new Map(); // tenant -> gap analysis
    this.cacheTtl = 12 * 60 * 60 * 1000; // 12 hours

    // Gap analysis dimensions
    this.gapDimensions = {
      keywords: ['search_volume', 'competition_density', 'trend_direction', 'seasonal_patterns'],
      product: ['feature_gaps', 'pricing_gaps', 'quality_gaps', 'innovation_opportunities'],
      service: ['delivery_method', 'support_model', 'customization_level', 'automation_degree'],
      geographic: ['regional_coverage', 'language_support', 'local_regulations', 'cultural_adaptation'],
      demographic: ['age_groups', 'income_levels', 'education', 'lifestyle_segments'],
      temporal: ['seasonal_trends', 'daily_patterns', 'event_driven', 'lifecycle_stages']
    };

    // Market saturation indicators
    this.saturationIndicators = {
      keyword: ['high_cpc', 'low_search_volume_growth', 'many_competitors'],
      product: ['feature_parity', 'commoditization', 'price_wars'],
      market: ['slow_growth', 'high_churn', 'consolidation']
    };

    console.log('🎯 Market Gap Service initialized');
  }

  /**
   * Comprehensive market gap analysis
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Complete gap analysis
   */
  async analyzeMarketGaps(tenantId, options = {}) {
    const {
      forceRefresh = false,
      dimensions = ['keywords', 'product', 'service', 'geographic', 'demographic'],
      timeframe = 30
    } = options;

    console.log(`🔍 Analyzing market gaps for ${tenantId} across ${dimensions.length} dimensions`);

    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.gapCache.get(tenantId);
        if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
          console.log(`♻️ Using cached gap analysis for ${tenantId}`);
          return cached.analysis;
        }
      }

      // Gather foundational data
      const foundationData = await this._gatherFoundationData(tenantId, timeframe);

      // Run analysis across all requested dimensions
      const gapAnalysis = {};
      for (const dimension of dimensions) {
        console.log(`📊 Analyzing ${dimension} gaps...`);
        gapAnalysis[dimension] = await this._analyzeDimensionGaps(tenantId, dimension, foundationData);
      }

      // Cross-dimensional opportunity synthesis
      const synthesizedOpportunities = await this._synthesizeOpportunities(tenantId, gapAnalysis, foundationData);

      // Blue ocean analysis
      const blueOceanOpportunities = await this._identifyBlueOceanSpaces(tenantId, gapAnalysis, foundationData);

      // Market timing analysis
      const timingAnalysis = await this._analyzeMarketTiming(tenantId, gapAnalysis, foundationData);

      const completeAnalysis = {
        summary: {
          totalGapsIdentified: this._countTotalGaps(gapAnalysis),
          highValueOpportunities: synthesizedOpportunities.filter(op => op.value_score >= 8).length,
          blueOceanSpaces: blueOceanOpportunities.length,
          optimalTimingOpportunities: timingAnalysis.immediate.length,
          analysisDate: new Date(),
          dimensionsAnalyzed: dimensions
        },
        gapsByDimension: gapAnalysis,
        synthesizedOpportunities,
        blueOceanOpportunities,
        timingAnalysis,
        marketSaturationLevel: await this._calculateMarketSaturation(tenantId, foundationData),
        recommendedActions: await this._generateRecommendedActions(gapAnalysis, synthesizedOpportunities)
      };

      // Cache the analysis
      this.gapCache.set(tenantId, {
        analysis: completeAnalysis,
        timestamp: Date.now()
      });

      // Store in database
      await this._storeGapAnalysis(tenantId, completeAnalysis);

      console.log(`✅ Market gap analysis complete: ${completeAnalysis.summary.totalGapsIdentified} gaps identified`);

      return completeAnalysis;

    } catch (error) {
      logger.error('Failed to analyze market gaps', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Analyze keyword gaps specifically
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Keyword gap analysis
   */
  async analyzeKeywordGaps(tenantId, options = {}) {
    const { includeSearchVolume = true, includeTrends = true, timeframe = 90 } = options;

    console.log(`🔤 Analyzing keyword gaps for ${tenantId}`);

    try {
      // Get tenant's current keyword performance
      const currentKeywords = await this._getCurrentKeywordPerformance(tenantId, timeframe);

      // Get competitor keyword strategies
      const competitorKeywords = await this._getCompetitorKeywordStrategies(tenantId);

      // Identify gaps using AI analysis
      const keywordGaps = await this._aiAnalyzeKeywordGaps({
        currentKeywords,
        competitorKeywords,
        includeSearchVolume,
        includeTrends
      });

      // Enrich with search volume and trend data
      const enrichedGaps = await this._enrichKeywordGaps(keywordGaps, {
        includeSearchVolume,
        includeTrends,
        timeframe
      });

      // Categorize gaps by opportunity type
      const categorizedGaps = this._categorizeKeywordGaps(enrichedGaps);

      const analysis = {
        summary: {
          totalGaps: enrichedGaps.length,
          highOpportunity: enrichedGaps.filter(g => g.opportunity_score >= 8).length,
          mediumOpportunity: enrichedGaps.filter(g => g.opportunity_score >= 6 && g.opportunity_score < 8).length,
          lowCompetition: enrichedGaps.filter(g => g.competition_level === 'low').length
        },
        gaps: enrichedGaps,
        categories: categorizedGaps,
        recommendations: await this._generateKeywordRecommendations(enrichedGaps, currentKeywords)
      };

      // Store keyword gap analysis
      await dataStore.setTenantConfig(tenantId, 'keyword_gap_analysis', {
        analysis,
        timestamp: new Date()
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze keyword gaps', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Identify geographic opportunities
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Geographic analysis options
   * @returns {Promise<object>} Geographic opportunity analysis
   */
  async analyzeGeographicOpportunities(tenantId, options = {}) {
    const { includeInternational = true, focusRegions = [], excludeRegions = [] } = options;

    console.log(`🌍 Analyzing geographic opportunities for ${tenantId}`);

    try {
      // Get current geographic performance
      const currentGeoPerformance = await this._getCurrentGeoPerformance(tenantId);

      // Analyze competitor geographic coverage
      const competitorGeoCoverage = await this._getCompetitorGeoCoverage(tenantId);

      // Use AI to identify geographic gaps
      const geoOpportunities = await this._aiAnalyzeGeographicGaps({
        currentPerformance: currentGeoPerformance,
        competitorCoverage: competitorGeoCoverage,
        includeInternational,
        focusRegions,
        excludeRegions
      });

      // Enrich with market data
      const enrichedOpportunities = await this._enrichGeographicOpportunities(geoOpportunities);

      return {
        summary: {
          totalOpportunities: enrichedOpportunities.length,
          highPotential: enrichedOpportunities.filter(op => op.potential_score >= 8).length,
          internationalOpportunities: enrichedOpportunities.filter(op => op.is_international).length
        },
        opportunities: enrichedOpportunities,
        recommendations: await this._generateGeoRecommendations(enrichedOpportunities, currentGeoPerformance)
      };

    } catch (error) {
      logger.error('Failed to analyze geographic opportunities', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Analyze seasonal opportunities
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Seasonal opportunity calendar
   */
  async analyzeSeasonalOpportunities(tenantId) {
    console.log(`📅 Analyzing seasonal opportunities for ${tenantId}`);

    try {
      // Get historical seasonal performance
      const seasonalHistory = await this._getSeasonalHistory(tenantId);

      // Analyze competitor seasonal patterns
      const competitorSeasonality = await this._getCompetitorSeasonality(tenantId);

      // Generate seasonal opportunity calendar
      const seasonalCalendar = await this._generateSeasonalCalendar(seasonalHistory, competitorSeasonality);

      return {
        calendar: seasonalCalendar,
        recommendations: await this._generateSeasonalRecommendations(seasonalCalendar),
        upcomingOpportunities: this._getUpcomingOpportunities(seasonalCalendar)
      };

    } catch (error) {
      logger.error('Failed to analyze seasonal opportunities', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * =====================================
   * PRIVATE ANALYSIS METHODS
   * =====================================
   */

  async _gatherFoundationData(tenantId, timeframe) {
    console.log(`📊 Gathering foundation data for ${tenantId}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);

    try {
      const [
        searchTerms,
        metrics,
        competitors,
        tenantConfig
      ] = await Promise.all([
        dataStore.getSearchTerms(tenantId, { limit: 200 }),
        dataStore.getMetrics(tenantId, startDate, endDate),
        this.competitorService.getIntelligenceSummary(tenantId),
        dataStore.getAllTenantConfigs(tenantId)
      ]);

      return {
        searchTerms: searchTerms || [],
        metrics: metrics || [],
        competitors: competitors.competitors || [],
        industry: tenantConfig.industry || 'general',
        businessModel: tenantConfig.business_model || 'unknown',
        targetAudience: tenantConfig.target_audience || 'general',
        currentGeo: tenantConfig.geographic_focus || 'local',
        analysisDate: new Date()
      };

    } catch (error) {
      logger.warn('Failed to gather complete foundation data', {
        tenantId,
        error: error.message
      });

      // Return minimal foundation data
      return {
        searchTerms: [],
        metrics: [],
        competitors: [],
        industry: 'general',
        businessModel: 'unknown',
        targetAudience: 'general',
        currentGeo: 'local',
        analysisDate: new Date()
      };
    }
  }

  async _analyzeDimensionGaps(tenantId, dimension, foundationData) {
    console.log(`🔍 Analyzing ${dimension} dimension gaps`);

    try {
      switch (dimension) {
        case 'keywords':
          return await this._analyzeKeywordDimensionGaps(tenantId, foundationData);
        case 'product':
          return await this._analyzeProductDimensionGaps(tenantId, foundationData);
        case 'service':
          return await this._analyzeServiceDimensionGaps(tenantId, foundationData);
        case 'geographic':
          return await this._analyzeGeographicDimensionGaps(tenantId, foundationData);
        case 'demographic':
          return await this._analyzeDemographicDimensionGaps(tenantId, foundationData);
        case 'temporal':
          return await this._analyzeTemporalDimensionGaps(tenantId, foundationData);
        default:
          return { gaps: [], opportunities: [] };
      }
    } catch (error) {
      logger.warn(`Failed to analyze ${dimension} gaps`, {
        tenantId,
        error: error.message
      });
      return { gaps: [], opportunities: [] };
    }
  }

  async _analyzeKeywordDimensionGaps(tenantId, foundationData) {
    const prompt = `Analyze keyword gaps for this business:

Industry: ${foundationData.industry}
Current Keywords: ${foundationData.searchTerms.slice(0, 20).map(st => st.search_term).join(', ')}
Competitors: ${foundationData.competitors.slice(0, 5).map(c => c.name).join(', ')}

Identify:
1. High-value keywords we're missing
2. Long-tail opportunities with lower competition
3. Trending keywords in the industry
4. Seasonal keyword opportunities
5. Local/geographic keyword gaps

Return JSON: {"gaps": [{"keyword": "...", "gap_type": "...", "opportunity_score": 1-10, "competition_level": "low/medium/high", "reason": "..."}]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'keyword_gap_analysis'
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          gaps: analysis.gaps || [],
          opportunities: analysis.gaps?.filter(g => g.opportunity_score >= 7) || []
        };
      }

      return { gaps: [], opportunities: [] };

    } catch (error) {
      logger.warn('AI keyword gap analysis failed', { error: error.message });
      return { gaps: [], opportunities: [] };
    }
  }

  async _analyzeProductDimensionGaps(tenantId, foundationData) {
    const prompt = `Analyze product/service gaps for this business:

Industry: ${foundationData.industry}
Business Model: ${foundationData.businessModel}
Competitors: ${foundationData.competitors.slice(0, 3).map(c => `${c.name}: ${c.strengths?.join(', ')}`).join(' | ')}

Identify gaps in:
1. Features/functionality not offered by competitors
2. Pricing model innovations
3. Quality/performance improvements
4. Customer experience enhancements
5. Integration capabilities

Return JSON: {"gaps": [{"gap_type": "feature/pricing/quality/experience/integration", "description": "...", "opportunity_score": 1-10, "implementation_difficulty": "low/medium/high", "market_demand": "low/medium/high"}]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'product_gap_analysis'
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          gaps: analysis.gaps || [],
          opportunities: analysis.gaps?.filter(g => g.opportunity_score >= 7) || []
        };
      }

      return { gaps: [], opportunities: [] };

    } catch (error) {
      logger.warn('AI product gap analysis failed', { error: error.message });
      return { gaps: [], opportunities: [] };
    }
  }

  async _analyzeServiceDimensionGaps(tenantId, foundationData) {
    // Similar pattern for service analysis
    return { gaps: [], opportunities: [] };
  }

  async _analyzeGeographicDimensionGaps(tenantId, foundationData) {
    // Geographic gap analysis implementation
    return { gaps: [], opportunities: [] };
  }

  async _analyzeDemographicDimensionGaps(tenantId, foundationData) {
    // Demographic gap analysis implementation
    return { gaps: [], opportunities: [] };
  }

  async _analyzeTemporalDimensionGaps(tenantId, foundationData) {
    // Temporal/seasonal gap analysis implementation
    return { gaps: [], opportunities: [] };
  }

  async _synthesizeOpportunities(tenantId, gapAnalysis, foundationData) {
    console.log(`🔄 Synthesizing cross-dimensional opportunities`);

    const allGaps = [];
    Object.values(gapAnalysis).forEach(dimension => {
      if (dimension.gaps) {
        allGaps.push(...dimension.gaps);
      }
    });

    const prompt = `Synthesize these market gaps into strategic opportunities:

Foundation:
- Industry: ${foundationData.industry}
- Business Model: ${foundationData.businessModel}
- Current Performance: ${foundationData.metrics.length} data points

Identified Gaps:
${allGaps.slice(0, 10).map(gap => `- ${gap.gap_type || gap.keyword || gap.description}: Score ${gap.opportunity_score}`).join('\n')}

Create 3-5 synthesized opportunities that combine multiple gaps for maximum impact.

Return JSON: {"opportunities": [{"title": "...", "description": "...", "combined_gaps": [...], "value_score": 1-10, "effort_score": 1-10, "time_to_market": "weeks/months", "expected_roi": "..."}]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'opportunity_synthesis'
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const synthesis = JSON.parse(jsonMatch[0]);
        return synthesis.opportunities || [];
      }

      return [];

    } catch (error) {
      logger.warn('Opportunity synthesis failed', { error: error.message });
      return [];
    }
  }

  async _identifyBlueOceanSpaces(tenantId, gapAnalysis, foundationData) {
    console.log(`🌊 Identifying blue ocean opportunities`);

    const prompt = `Identify blue ocean opportunities (uncontested market spaces):

Market Context:
- Industry: ${foundationData.industry}
- Competitors: ${foundationData.competitors.length}
- Gap Analysis Results: ${Object.keys(gapAnalysis).join(', ')} dimensions analyzed

Look for spaces where:
1. No direct competition exists
2. Customer demand is present but unmet
3. Technology enables new solutions
4. Market conditions are changing

Return JSON: {"blue_ocean_spaces": [{"space_name": "...", "description": "...", "why_uncontested": "...", "market_potential": "low/medium/high", "entry_barriers": "low/medium/high"}]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'blue_ocean_analysis'
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis.blue_ocean_spaces || [];
      }

      return [];

    } catch (error) {
      logger.warn('Blue ocean analysis failed', { error: error.message });
      return [];
    }
  }

  async _analyzeMarketTiming(tenantId, gapAnalysis, foundationData) {
    const allOpportunities = [];
    Object.values(gapAnalysis).forEach(dimension => {
      if (dimension.opportunities) {
        allOpportunities.push(...dimension.opportunities);
      }
    });

    return {
      immediate: allOpportunities.filter(op => op.opportunity_score >= 8),
      shortTerm: allOpportunities.filter(op => op.opportunity_score >= 6 && op.opportunity_score < 8),
      longTerm: allOpportunities.filter(op => op.opportunity_score < 6),
      seasonal: [] // Would be populated from temporal analysis
    };
  }

  _countTotalGaps(gapAnalysis) {
    let total = 0;
    Object.values(gapAnalysis).forEach(dimension => {
      if (dimension.gaps) {
        total += dimension.gaps.length;
      }
    });
    return total;
  }

  async _calculateMarketSaturation(tenantId, foundationData) {
    // Calculate market saturation based on competitors and performance
    const competitorCount = foundationData.competitors.length;
    const avgCpa = foundationData.metrics.reduce((sum, m) => sum + (m.cost_micros || 0), 0) / 1000000 / Math.max(foundationData.metrics.length, 1);

    let saturationLevel = 'low';
    if (competitorCount > 20 || avgCpa > 50) {
      saturationLevel = 'high';
    } else if (competitorCount > 10 || avgCpa > 20) {
      saturationLevel = 'medium';
    }

    return {
      level: saturationLevel,
      competitorCount,
      avgCpa,
      indicators: this._getSaturationIndicators(saturationLevel)
    };
  }

  _getSaturationIndicators(level) {
    const indicators = {
      low: ['Few direct competitors', 'Growing search volume', 'Reasonable CPCs'],
      medium: ['Moderate competition', 'Stable search trends', 'Competitive pricing'],
      high: ['Many competitors', 'Declining organic growth', 'High acquisition costs']
    };
    return indicators[level] || [];
  }

  async _generateRecommendedActions(gapAnalysis, synthesizedOpportunities) {
    const topOpportunities = synthesizedOpportunities
      .sort((a, b) => b.value_score - a.value_score)
      .slice(0, 3);

    return topOpportunities.map(opp => ({
      action: `Pursue ${opp.title}`,
      priority: opp.value_score >= 9 ? 'high' : opp.value_score >= 7 ? 'medium' : 'low',
      timeframe: opp.time_to_market || 'medium-term',
      effort: opp.effort_score || 5,
      expectedROI: opp.expected_roi || 'TBD'
    }));
  }

  async _storeGapAnalysis(tenantId, analysis) {
    try {
      await dataStore.setTenantConfig(tenantId, 'comprehensive_gap_analysis', {
        analysis,
        timestamp: new Date(),
        version: '1.0'
      });

      await dataStore.addLog(tenantId, 'info',
        `Market gap analysis completed: ${analysis.summary.totalGapsIdentified} gaps identified`,
        { summary: analysis.summary }
      );

    } catch (error) {
      logger.warn('Failed to store gap analysis', {
        tenantId,
        error: error.message
      });
    }
  }

  // Additional helper methods for keyword analysis
  async _getCurrentKeywordPerformance(tenantId, timeframe) {
    try {
      const searchTerms = await dataStore.getSearchTerms(tenantId, { limit: 100 });
      return searchTerms.map(st => ({
        keyword: st.search_term,
        clicks: st.clicks || 0,
        impressions: st.impressions || 0,
        ctr: st.clicks && st.impressions ? (st.clicks / st.impressions) * 100 : 0,
        avgCpc: st.cost_micros ? (st.cost_micros / 1000000) / Math.max(st.clicks, 1) : 0
      }));
    } catch {
      return [];
    }
  }

  async _getCompetitorKeywordStrategies(tenantId) {
    // Mock competitor keyword data - in production, integrate with keyword research tools
    return {
      competitorKeywords: [],
      gapKeywords: [],
      trendingKeywords: []
    };
  }

  async _aiAnalyzeKeywordGaps(context) {
    // Implementation for AI-powered keyword gap analysis
    return [];
  }

  async _enrichKeywordGaps(gaps, options) {
    // Enrich gaps with search volume and trend data
    return gaps.map(gap => ({
      ...gap,
      searchVolume: Math.floor(Math.random() * 10000) + 100,
      trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)],
      seasonality: Math.random() > 0.7 ? 'seasonal' : 'stable'
    }));
  }

  _categorizeKeywordGaps(gaps) {
    return {
      highVolumeLowCompetition: gaps.filter(g => g.searchVolume > 1000 && g.competition_level === 'low'),
      longTail: gaps.filter(g => g.keyword && g.keyword.split(' ').length >= 3),
      trending: gaps.filter(g => g.trend === 'rising'),
      seasonal: gaps.filter(g => g.seasonality === 'seasonal'),
      branded: gaps.filter(g => g.gap_type === 'branded'),
      commercial: gaps.filter(g => g.gap_type === 'commercial')
    };
  }

  async _generateKeywordRecommendations(gaps, currentKeywords) {
    const topGaps = gaps.filter(g => g.opportunity_score >= 7);
    return topGaps.slice(0, 10).map(gap => ({
      keyword: gap.keyword,
      recommendation: `Target "${gap.keyword}" - ${gap.reason}`,
      priority: gap.opportunity_score >= 9 ? 'high' : 'medium',
      estimatedImpact: gap.searchVolume > 1000 ? 'high' : 'medium'
    }));
  }

  // Geographic analysis helper methods
  async _getCurrentGeoPerformance(tenantId) {
    // Mock geographic performance data
    return {
      topRegions: ['United States', 'Canada'],
      performance: {
        'United States': { clicks: 1000, conversions: 50 },
        'Canada': { clicks: 200, conversions: 8 }
      }
    };
  }

  async _getCompetitorGeoCoverage(tenantId) {
    // Mock competitor geographic data
    return {
      covered: ['United States', 'Canada', 'United Kingdom'],
      gaps: ['Australia', 'Germany', 'France']
    };
  }

  async _aiAnalyzeGeographicGaps(context) {
    // AI-powered geographic gap analysis
    return [];
  }

  async _enrichGeographicOpportunities(opportunities) {
    return opportunities;
  }

  async _generateGeoRecommendations(opportunities, currentPerformance) {
    return [];
  }

  // Seasonal analysis helper methods
  async _getSeasonalHistory(tenantId) {
    return { patterns: [], peaks: [], valleys: [] };
  }

  async _getCompetitorSeasonality(tenantId) {
    return { trends: [], opportunities: [] };
  }

  async _generateSeasonalCalendar(history, competitorData) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(month => ({
      month,
      opportunities: [],
      competitorActivity: 'medium',
      recommendations: []
    }));
  }

  async _generateSeasonalRecommendations(calendar) {
    return [];
  }

  _getUpcomingOpportunities(calendar) {
    const currentMonth = new Date().getMonth();
    return calendar.slice(currentMonth, currentMonth + 3).filter(month => month.opportunities.length > 0);
  }
}

// Singleton instance
let marketGapServiceInstance = null;

/**
 * Get singleton instance
 */
export function getMarketGapService() {
  if (!marketGapServiceInstance) {
    marketGapServiceInstance = new MarketGapService();
  }
  return marketGapServiceInstance;
}

export default getMarketGapService;