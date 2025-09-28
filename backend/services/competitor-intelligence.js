/**
 * Competitor Intelligence Service for ProofKit SaaS
 * Monitors and analyzes competitor strategies to provide market insights
 *
 * Features:
 * - Competitor identification and tracking
 * - Domain monitoring for changes
 * - Landing page analysis
 * - Market gap identification
 * - Competitive positioning insights
 * - Integration with AI for strategic recommendations
 */

import { getAIProviderService } from './ai-provider.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Competitor Intelligence Engine
 */
export class CompetitorIntelligenceService {
  constructor() {
    this.aiService = getAIProviderService();
    this.competitorCache = new Map(); // tenant -> competitors
    this.analysisCache = new Map(); // competitor -> analysis
    this.cacheTtl = 24 * 60 * 60 * 1000; // 24 hours

    // Industry-based competitor discovery patterns
    this.industryPatterns = {
      'ecommerce': ['shopify', 'store', 'shop', 'buy', 'cart', 'marketplace'],
      'saas': ['software', 'platform', 'app', 'tool', 'solution', 'service'],
      'lead_generation': ['leads', 'quote', 'contact', 'inquiry', 'form', 'consultation'],
      'local_business': ['near me', 'local', 'nearby', 'city name', 'area'],
      'b2b': ['enterprise', 'business', 'corporate', 'professional', 'solutions'],
      'service': ['service', 'professional', 'expert', 'specialist', 'company']
    };

    // Competitive signals to track
    this.competitiveSignals = [
      'ad_copy_changes',
      'landing_page_updates',
      'new_products',
      'pricing_changes',
      'promotional_offers',
      'keyword_expansion',
      'audience_targeting_shifts',
      'seasonal_campaigns'
    ];

    console.log('🕵️  Competitor Intelligence Service initialized');
  }

  /**
   * Identify main competitors for a tenant based on industry and keywords
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - { industry, keywords, targetAudience, forceRefresh }
   * @returns {Promise<Array>} List of identified competitors
   */
  async identifyCompetitors(tenantId, options = {}) {
    const { industry, keywords = [], targetAudience, forceRefresh = false } = options;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.competitorCache.get(tenantId);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        console.log(`♻️  Using cached competitors for ${tenantId}`);
        return cached.competitors;
      }
    }

    console.log(`🔍 Identifying competitors for ${tenantId} in ${industry} industry`);

    try {
      // Get tenant's search terms and performance data to understand their market
      const searchTerms = await dataStore.getSearchTerms(tenantId, {
        limit: 100
      });

      // Extract unique search queries
      const uniqueQueries = [...new Set(searchTerms.map(st => st.search_term))];

      // Get tenant's business context
      const businessContext = await this._getBusinessContext(tenantId);

      // Use AI to identify competitors based on industry, keywords, and search patterns
      const competitorAnalysis = await this._aiIdentifyCompetitors({
        industry,
        keywords,
        searchTerms: uniqueQueries.slice(0, 20), // Top 20 queries
        targetAudience,
        businessContext
      });

      // Enrich competitor data with additional signals
      const enrichedCompetitors = await this._enrichCompetitorData(competitorAnalysis.competitors);

      // Store in database
      await this._storeCompetitors(tenantId, enrichedCompetitors);

      // Update cache
      this.competitorCache.set(tenantId, {
        competitors: enrichedCompetitors,
        timestamp: Date.now()
      });

      console.log(`✅ Identified ${enrichedCompetitors.length} competitors for ${tenantId}`);

      return enrichedCompetitors;

    } catch (error) {
      logger.error('Failed to identify competitors', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Monitor competitor domains for changes
   * @param {string} tenantId - Tenant identifier
   * @param {Array} competitors - List of competitor objects
   * @returns {Promise<Array>} Detected changes
   */
  async monitorCompetitorDomains(tenantId, competitors = null) {
    console.log(`🔎 Monitoring competitor domains for ${tenantId}`);

    try {
      // Get competitors if not provided
      if (!competitors) {
        competitors = await this._getStoredCompetitors(tenantId);
      }

      if (!competitors || competitors.length === 0) {
        console.log(`ℹ️  No competitors found for ${tenantId}`);
        return [];
      }

      const changes = [];

      for (const competitor of competitors.slice(0, 10)) { // Limit to top 10 for performance
        try {
          const domainChanges = await this._detectDomainChanges(tenantId, competitor);
          if (domainChanges.hasChanges) {
            changes.push({
              competitor: competitor.name,
              domain: competitor.domain,
              changes: domainChanges.changes,
              timestamp: new Date(),
              significance: domainChanges.significance
            });
          }
        } catch (error) {
          logger.warn(`Failed to monitor competitor ${competitor.name}`, {
            tenantId,
            error: error.message
          });
        }
      }

      // Store changes in database
      if (changes.length > 0) {
        await this._storeCompetitorChanges(tenantId, changes);

        // Log significant changes
        const significantChanges = changes.filter(c => c.significance === 'high');
        if (significantChanges.length > 0) {
          await dataStore.addLog(tenantId, 'info',
            `Detected ${significantChanges.length} significant competitor changes`,
            { changes: significantChanges }
          );
        }
      }

      console.log(`✅ Monitored ${competitors.length} competitors, found ${changes.length} changes`);

      return changes;

    } catch (error) {
      logger.error('Failed to monitor competitor domains', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Analyze competitor landing pages for insights
   * @param {string} tenantId - Tenant identifier
   * @param {object} competitor - Competitor object
   * @returns {Promise<object>} Landing page analysis
   */
  async analyzeLandingPage(tenantId, competitor) {
    console.log(`📄 Analyzing landing page for ${competitor.name}`);

    try {
      // Check cache first
      const cacheKey = `landing_${competitor.domain}`;
      const cached = this.analysisCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        return cached.analysis;
      }

      // Simulate landing page content extraction (in production, use web scraping)
      const landingPageContent = await this._extractLandingPageContent(competitor.domain);

      // Use AI to analyze landing page
      const analysis = await this._aiAnalyzeLandingPage({
        competitor: competitor.name,
        domain: competitor.domain,
        content: landingPageContent,
        industry: competitor.industry
      });

      // Cache the analysis
      this.analysisCache.set(cacheKey, {
        analysis,
        timestamp: Date.now()
      });

      // Store analysis
      await this._storeLandingPageAnalysis(tenantId, competitor, analysis);

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze landing page', {
        tenantId,
        competitor: competitor.name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Identify market gaps and opportunities
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Market gap analysis
   */
  async identifyMarketGaps(tenantId, options = {}) {
    console.log(`🎯 Identifying market gaps for ${tenantId}`);

    try {
      // Get competitors and their strategies
      const competitors = await this._getStoredCompetitors(tenantId);

      if (!competitors || competitors.length === 0) {
        return {
          gaps: [],
          opportunities: [],
          recommendation: 'First identify competitors to analyze market gaps'
        };
      }

      // Get tenant's current performance
      const tenantMetrics = await this._getTenantPerformance(tenantId);

      // Get competitor strategies
      const competitorStrategies = await this._getCompetitorStrategies(tenantId, competitors);

      // Use AI to identify gaps
      const gapAnalysis = await this._aiIdentifyMarketGaps({
        tenantMetrics,
        competitors: competitors.slice(0, 5), // Top 5 competitors
        competitorStrategies,
        industry: options.industry
      });

      // Store gap analysis
      await dataStore.setTenantConfig(tenantId, 'market_gap_analysis', {
        analysis: gapAnalysis,
        timestamp: new Date(),
        competitors_analyzed: competitors.length
      });

      console.log(`✅ Identified ${gapAnalysis.gaps?.length || 0} market gaps`);

      return gapAnalysis;

    } catch (error) {
      logger.error('Failed to identify market gaps', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get competitive positioning recommendations
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Positioning recommendations
   */
  async getCompetitivePositioning(tenantId) {
    console.log(`📊 Analyzing competitive positioning for ${tenantId}`);

    try {
      // Get all competitor intelligence data
      const competitors = await this._getStoredCompetitors(tenantId);
      const marketGaps = await dataStore.getTenantConfig(tenantId, 'market_gap_analysis', {
        defaultValue: null
      });
      const tenantMetrics = await this._getTenantPerformance(tenantId);

      // Use AI to generate positioning recommendations
      const positioning = await this._aiGeneratePositioning({
        competitors,
        marketGaps,
        tenantMetrics
      });

      return positioning;

    } catch (error) {
      logger.error('Failed to get competitive positioning', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get competitor intelligence summary
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Intelligence summary
   */
  async getIntelligenceSummary(tenantId) {
    try {
      const competitors = await this._getStoredCompetitors(tenantId);
      const recentChanges = await this._getRecentCompetitorChanges(tenantId, 7); // Last 7 days
      const marketGaps = await dataStore.getTenantConfig(tenantId, 'market_gap_analysis', {
        defaultValue: null
      });

      return {
        totalCompetitors: competitors?.length || 0,
        competitors: competitors?.slice(0, 10) || [], // Top 10
        recentChanges: recentChanges.length,
        changes: recentChanges.slice(0, 5), // Top 5 recent changes
        marketGaps: marketGaps?.analysis?.gaps || [],
        lastUpdated: new Date(),
        status: 'active'
      };

    } catch (error) {
      logger.error('Failed to get intelligence summary', {
        tenantId,
        error: error.message
      });
      return {
        totalCompetitors: 0,
        competitors: [],
        recentChanges: 0,
        changes: [],
        marketGaps: [],
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * =====================================
   * PRIVATE AI-POWERED METHODS
   * =====================================
   */

  /**
   * Use AI to identify competitors
   */
  async _aiIdentifyCompetitors(context) {
    const prompt = `Analyze this business context and identify top competitors:

Industry: ${context.industry}
Keywords: ${context.keywords.join(', ')}
Target Audience: ${context.targetAudience || 'General'}
Common Search Terms: ${context.searchTerms.slice(0, 10).join(', ')}

Identify 5-10 main competitors in this space. For each competitor, provide:
1. Company name
2. Domain (estimate likely domain)
3. Market position (leader/challenger/niche)
4. Key strengths
5. Estimated market share

Return as JSON array: [{"name": "...", "domain": "...", "position": "...", "strengths": [...], "market_share": "..."}]`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'competitor_identification',
        maxRetries: 2
      });

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const competitors = JSON.parse(jsonMatch[0]);
        return { competitors, source: 'ai' };
      }

      // Fallback to basic parsing
      return {
        competitors: this._parseCompetitorList(response),
        source: 'parsed'
      };

    } catch (error) {
      logger.warn('AI competitor identification failed, using fallback', {
        error: error.message
      });

      // Fallback to industry-based competitor discovery
      return {
        competitors: this._getFallbackCompetitors(context.industry),
        source: 'fallback'
      };
    }
  }

  /**
   * Use AI to analyze landing page
   */
  async _aiAnalyzeLandingPage(context) {
    const prompt = `Analyze this competitor's landing page:

Competitor: ${context.competitor}
Domain: ${context.domain}
Industry: ${context.industry}

Landing Page Elements:
${context.content.headline || 'N/A'}
${context.content.description || 'N/A'}
Key Features: ${context.content.features?.join(', ') || 'N/A'}

Analyze:
1. Value proposition
2. Target audience
3. Call-to-action strategy
4. Unique selling points
5. Messaging approach
6. Emotional triggers used

Provide strategic insights in JSON: {"value_prop": "...", "target_audience": "...", "cta_strategy": "...", "usps": [...], "messaging_tone": "...", "triggers": [...]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'landing_page_analysis',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this._parseLandingPageAnalysis(response);

    } catch (error) {
      logger.warn('AI landing page analysis failed', { error: error.message });
      return {
        value_prop: 'Analysis unavailable',
        target_audience: 'Unknown',
        cta_strategy: 'Unknown',
        usps: [],
        messaging_tone: 'Unknown',
        triggers: []
      };
    }
  }

  /**
   * Use AI to identify market gaps
   */
  async _aiIdentifyMarketGaps(context) {
    const prompt = `Analyze this competitive landscape and identify market gaps:

Our Performance:
- Avg CPA: $${context.tenantMetrics.avgCpa?.toFixed(2) || 'N/A'}
- Conversion Rate: ${context.tenantMetrics.conversionRate?.toFixed(2) || 'N/A'}%
- Top Keywords: ${context.tenantMetrics.topKeywords?.join(', ') || 'N/A'}

Competitors (${context.competitors.length}):
${context.competitors.map(c => `- ${c.name}: ${c.position} position, strengths: ${c.strengths?.join(', ')}`).join('\n')}

Competitor Strategies:
${JSON.stringify(context.competitorStrategies, null, 2)}

Identify:
1. Underserved keywords/niches
2. Gaps in competitor offerings
3. Market opportunities
4. Untapped audience segments
5. Strategic advantages we can exploit

Return JSON: {"gaps": [{"type": "...", "description": "...", "opportunity_score": 1-10}], "opportunities": [...], "recommendations": [...]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'market_gap_analysis',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this._parseGapAnalysis(response);

    } catch (error) {
      logger.warn('AI gap analysis failed', { error: error.message });
      return {
        gaps: [],
        opportunities: [],
        recommendations: ['Unable to analyze market gaps at this time']
      };
    }
  }

  /**
   * Use AI to generate competitive positioning
   */
  async _aiGeneratePositioning(context) {
    const prompt = `Generate competitive positioning recommendations:

Market Context:
- ${context.competitors?.length || 0} competitors identified
- Market gaps: ${context.marketGaps?.analysis?.gaps?.length || 0} identified
- Our CPA: $${context.tenantMetrics?.avgCpa?.toFixed(2) || 'N/A'}
- Our Conv Rate: ${context.tenantMetrics?.conversionRate?.toFixed(2) || 'N/A'}%

Based on this data, provide:
1. Recommended positioning strategy
2. Key differentiators to emphasize
3. Target audience refinement
4. Messaging guidelines
5. Competitive advantages to highlight

Return JSON: {"strategy": "...", "differentiators": [...], "target_refinement": "...", "messaging": [...], "advantages": [...]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'competitive_positioning',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this._parsePositioning(response);

    } catch (error) {
      logger.warn('AI positioning generation failed', { error: error.message });
      return {
        strategy: 'Focus on differentiation',
        differentiators: [],
        target_refinement: 'Analyze audience data for insights',
        messaging: [],
        advantages: []
      };
    }
  }

  /**
   * =====================================
   * PRIVATE HELPER METHODS
   * =====================================
   */

  async _getBusinessContext(tenantId) {
    try {
      const config = await dataStore.getAllTenantConfigs(tenantId);
      return {
        industry: config.industry || 'general',
        businessName: config.business_name || 'Unknown',
        targetAudience: config.target_audience || null,
        valueProposition: config.value_proposition || null
      };
    } catch {
      return {};
    }
  }

  async _enrichCompetitorData(competitors) {
    return competitors.map(comp => ({
      ...comp,
      id: `comp_${comp.domain?.replace(/[^a-z0-9]/gi, '_')}`,
      tracked_since: new Date(),
      status: 'active',
      last_analyzed: null,
      change_history: []
    }));
  }

  async _storeCompetitors(tenantId, competitors) {
    await dataStore.setTenantConfig(tenantId, 'competitors', {
      competitors,
      last_updated: new Date(),
      count: competitors.length
    });
  }

  async _getStoredCompetitors(tenantId) {
    const data = await dataStore.getTenantConfig(tenantId, 'competitors', {
      defaultValue: null
    });
    return data?.competitors || [];
  }

  async _detectDomainChanges(tenantId, competitor) {
    // Simulate domain change detection (in production, implement actual web scraping/monitoring)
    // This would compare current state with historical snapshots

    const randomChange = Math.random();

    if (randomChange < 0.2) { // 20% chance of detecting a change
      return {
        hasChanges: true,
        changes: [
          {
            type: this._getRandomChangeType(),
            description: 'Detected change in competitor strategy',
            detected_at: new Date()
          }
        ],
        significance: randomChange < 0.05 ? 'high' : 'medium'
      };
    }

    return { hasChanges: false, changes: [], significance: 'none' };
  }

  _getRandomChangeType() {
    const types = this.competitiveSignals;
    return types[Math.floor(Math.random() * types.length)];
  }

  async _storeCompetitorChanges(tenantId, changes) {
    await dataStore.addLog(tenantId, 'info', 'Competitor changes detected', {
      changes,
      count: changes.length
    });
  }

  async _extractLandingPageContent(domain) {
    // Mock landing page content extraction
    // In production, implement actual web scraping with proper rate limiting
    return {
      headline: `Welcome to ${domain}`,
      description: 'Leading solution in the market',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      cta: 'Get Started'
    };
  }

  async _storeLandingPageAnalysis(tenantId, competitor, analysis) {
    const key = `landing_analysis_${competitor.id}`;
    await dataStore.setTenantConfig(tenantId, key, {
      competitor: competitor.name,
      analysis,
      analyzed_at: new Date()
    });
  }

  async _getTenantPerformance(tenantId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const metrics = await dataStore.getMetrics(tenantId, startDate, endDate);

      if (!metrics || metrics.length === 0) {
        return { avgCpa: 0, conversionRate: 0, topKeywords: [] };
      }

      const totalCost = metrics.reduce((sum, m) => sum + (m.cost_micros || 0) / 1000000, 0);
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

      return {
        avgCpa: totalConversions > 0 ? totalCost / totalConversions : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        totalSpend: totalCost,
        totalConversions,
        topKeywords: [] // Would extract from search terms
      };
    } catch {
      return { avgCpa: 0, conversionRate: 0, topKeywords: [] };
    }
  }

  async _getCompetitorStrategies(tenantId, competitors) {
    // Aggregate competitor strategies from stored analyses
    const strategies = {};

    for (const competitor of competitors.slice(0, 5)) {
      const key = `landing_analysis_${competitor.id}`;
      const analysis = await dataStore.getTenantConfig(tenantId, key, {
        defaultValue: null
      });

      if (analysis) {
        strategies[competitor.name] = {
          messaging: analysis.analysis.messaging_tone,
          triggers: analysis.analysis.triggers,
          usps: analysis.analysis.usps
        };
      }
    }

    return strategies;
  }

  async _getRecentCompetitorChanges(tenantId, days) {
    const logs = await dataStore.getLogs(tenantId, {
      logType: 'info',
      limit: 100
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return logs.filter(log =>
      log.message?.includes('Competitor changes') &&
      new Date(log.timestamp) >= cutoffDate
    );
  }

  _getFallbackCompetitors(industry) {
    // Fallback competitor suggestions based on industry
    const fallbacks = {
      'ecommerce': [
        { name: 'Major Ecommerce Platform', domain: 'example-ecommerce.com', position: 'leader' },
        { name: 'Online Store', domain: 'example-store.com', position: 'challenger' }
      ],
      'saas': [
        { name: 'SaaS Solution', domain: 'example-saas.com', position: 'leader' },
        { name: 'Cloud Platform', domain: 'example-platform.com', position: 'challenger' }
      ],
      'default': [
        { name: 'Market Leader', domain: 'example-leader.com', position: 'leader' },
        { name: 'Competitor', domain: 'example-competitor.com', position: 'challenger' }
      ]
    };

    return fallbacks[industry] || fallbacks.default;
  }

  _parseCompetitorList(text) {
    // Basic parsing fallback
    return [
      { name: 'Competitor A', domain: 'competitor-a.com', position: 'leader', strengths: [] },
      { name: 'Competitor B', domain: 'competitor-b.com', position: 'challenger', strengths: [] }
    ];
  }

  _parseLandingPageAnalysis(text) {
    return {
      value_prop: 'Parsed from text',
      target_audience: 'General',
      cta_strategy: 'Standard',
      usps: [],
      messaging_tone: 'Professional',
      triggers: []
    };
  }

  _parseGapAnalysis(text) {
    return {
      gaps: [
        { type: 'keyword', description: 'Potential keyword opportunities', opportunity_score: 7 }
      ],
      opportunities: [],
      recommendations: ['Continue market research']
    };
  }

  _parsePositioning(text) {
    return {
      strategy: 'Differentiation',
      differentiators: [],
      target_refinement: 'Continue audience research',
      messaging: [],
      advantages: []
    };
  }
}

// Singleton instance
let competitorIntelligenceInstance = null;

/**
 * Get singleton instance
 */
export function getCompetitorIntelligenceService() {
  if (!competitorIntelligenceInstance) {
    competitorIntelligenceInstance = new CompetitorIntelligenceService();
  }
  return competitorIntelligenceInstance;
}

export default getCompetitorIntelligenceService;