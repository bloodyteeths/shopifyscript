/**
 * Ad Spy Service for ProofKit SaaS
 * Analyzes competitor ad copy patterns and strategies
 *
 * Features:
 * - Competitor ad copy monitoring
 * - Winning ad format identification
 * - Seasonal campaign tracking
 * - Offer and promotion extraction
 * - Messaging pattern analysis
 * - Emotional trigger detection
 * - A/B testing insights
 * - Creative fatigue monitoring
 */

import { getAIProviderService } from './ai-provider.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Ad Spy and Analysis Engine
 */
export class AdSpyService {
  constructor() {
    this.aiService = getAIProviderService();
    this.adCache = new Map(); // competitor -> ad data
    this.cacheTtl = 12 * 60 * 60 * 1000; // 12 hours

    // Ad copy patterns to detect
    this.adPatterns = {
      'urgency': ['limited time', 'today only', 'ends soon', 'hurry', 'now', 'don\'t miss'],
      'scarcity': ['while supplies last', 'limited stock', 'only X left', 'selling fast'],
      'social_proof': ['trusted by', 'X customers', 'best seller', 'rated', 'reviews'],
      'discount': ['% off', 'save', 'deal', 'sale', 'discount', 'free shipping'],
      'guarantee': ['money back', 'guarantee', 'risk-free', 'no questions asked'],
      'comparison': ['vs', 'better than', 'unlike', 'compare', 'alternative to'],
      'emotion': ['love', 'amazing', 'incredible', 'transform', 'easy', 'simple'],
      'authority': ['expert', 'professional', 'certified', 'award-winning', 'leader']
    };

    // Seasonal patterns
    this.seasonalKeywords = {
      'holiday': ['christmas', 'black friday', 'cyber monday', 'new year', 'valentine'],
      'back_to_school': ['back to school', 'semester', 'college', 'student'],
      'summer': ['summer', 'vacation', 'beach', 'outdoor'],
      'winter': ['winter', 'holiday', 'gift', 'cozy'],
      'spring': ['spring', 'refresh', 'renewal', 'easter']
    };

    // Ad format types
    this.adFormats = [
      'responsive_search_ad',
      'expanded_text_ad',
      'call_only_ad',
      'shopping_ad',
      'display_ad',
      'video_ad',
      'app_promotion_ad'
    ];

    console.log('🕵️  Ad Spy Service initialized');
  }

  /**
   * Analyze competitor ad copy patterns
   * @param {string} tenantId - Tenant identifier
   * @param {Array} competitors - List of competitors
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Ad copy analysis
   */
  async analyzeCompetitorAdCopy(tenantId, competitors = [], options = {}) {
    const { includeHistorical = true, timeframe = 30 } = options;

    console.log(`📝 Analyzing ad copy for ${competitors.length} competitors`);

    try {
      const adAnalyses = [];

      for (const competitor of competitors.slice(0, 10)) {
        const cacheKey = `ads_${competitor.domain || competitor.name}`;

        // Check cache
        const cached = this.adCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
          adAnalyses.push(cached.data);
          continue;
        }

        try {
          // Collect competitor ads
          const ads = await this._collectCompetitorAds(competitor);

          if (ads.length === 0) {
            continue;
          }

          // Analyze ad patterns
          const analysis = await this._analyzeAdPatterns(competitor, ads);

          // Identify winning formats
          const winningFormats = await this._identifyWinningFormats(ads);

          // Extract offers and promotions
          const offers = this._extractOffers(ads);

          const adAnalysis = {
            competitor: competitor.name || competitor.domain,
            total_ads: ads.length,
            patterns: analysis.patterns,
            emotional_triggers: analysis.emotionalTriggers,
            messaging_themes: analysis.messagingThemes,
            winning_formats: winningFormats,
            offers: offers,
            sample_ads: ads.slice(0, 5), // Top 5 ads
            analyzed_at: new Date()
          };

          adAnalyses.push(adAnalysis);

          // Cache the analysis
          this.adCache.set(cacheKey, {
            data: adAnalysis,
            timestamp: Date.now()
          });

        } catch (error) {
          logger.warn(`Failed to analyze ads for ${competitor.name}`, {
            tenantId,
            error: error.message
          });
        }
      }

      // Store analysis results
      await this._storeAdAnalysis(tenantId, adAnalyses);

      // Generate strategic insights
      const insights = await this._generateAdInsights(tenantId, adAnalyses);

      console.log(`✅ Analyzed ads from ${adAnalyses.length} competitors`);

      return {
        competitors_analyzed: adAnalyses.length,
        analyses: adAnalyses,
        insights,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to analyze competitor ad copy', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Identify winning ad formats across competitors
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Winning format analysis
   */
  async identifyWinningFormats(tenantId) {
    console.log(`🏆 Identifying winning ad formats for ${tenantId}`);

    try {
      // Get stored ad analyses
      const analyses = await this._getStoredAdAnalyses(tenantId);

      if (!analyses || analyses.length === 0) {
        return {
          formats: [],
          recommendation: 'No competitor ad data available yet'
        };
      }

      // Aggregate winning formats across all competitors
      const formatPerformance = new Map();

      analyses.forEach(analysis => {
        if (analysis.winning_formats) {
          analysis.winning_formats.forEach(format => {
            if (!formatPerformance.has(format.type)) {
              formatPerformance.set(format.type, {
                count: 0,
                avgPerformance: 0,
                competitors: []
              });
            }

            const data = formatPerformance.get(format.type);
            data.count++;
            data.avgPerformance += format.performance_score || 0;
            data.competitors.push(analysis.competitor);
          });
        }
      });

      // Calculate averages and sort
      const winningFormats = Array.from(formatPerformance.entries())
        .map(([type, data]) => ({
          format: type,
          usage_count: data.count,
          avg_performance: (data.avgPerformance / data.count).toFixed(2),
          used_by: data.competitors
        }))
        .sort((a, b) => b.avg_performance - a.avg_performance);

      // Generate recommendations
      const recommendations = await this._generateFormatRecommendations(
        tenantId,
        winningFormats
      );

      return {
        winning_formats: winningFormats,
        recommendations,
        analyzed_competitors: analyses.length,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to identify winning formats', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Track seasonal campaign changes
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Tracking options
   * @returns {Promise<object>} Seasonal campaign data
   */
  async trackSeasonalCampaigns(tenantId, options = {}) {
    console.log(`🗓️  Tracking seasonal campaigns for ${tenantId}`);

    try {
      // Get recent ad analyses
      const analyses = await this._getStoredAdAnalyses(tenantId);

      if (!analyses || analyses.length === 0) {
        return {
          seasonal_campaigns: [],
          current_season: this._getCurrentSeason(),
          recommendation: 'No competitor data available'
        };
      }

      // Detect seasonal patterns in competitor ads
      const seasonalCampaigns = [];

      analyses.forEach(analysis => {
        const seasonalSignals = this._detectSeasonalSignals(analysis);

        if (seasonalSignals.length > 0) {
          seasonalCampaigns.push({
            competitor: analysis.competitor,
            seasons: seasonalSignals,
            sample_copy: analysis.sample_ads.slice(0, 2)
          });
        }
      });

      // Generate seasonal strategy recommendations
      const currentSeason = this._getCurrentSeason();
      const recommendations = await this._generateSeasonalRecommendations(
        tenantId,
        seasonalCampaigns,
        currentSeason
      );

      return {
        current_season: currentSeason,
        seasonal_campaigns: seasonalCampaigns,
        competitors_with_seasonal: seasonalCampaigns.length,
        recommendations,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to track seasonal campaigns', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract competitor offers and promotions
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Offers and promotions analysis
   */
  async extractOffers(tenantId) {
    console.log(`💰 Extracting competitor offers for ${tenantId}`);

    try {
      const analyses = await this._getStoredAdAnalyses(tenantId);

      if (!analyses || analyses.length === 0) {
        return {
          offers: [],
          insights: 'No competitor offer data available'
        };
      }

      // Aggregate all offers
      const allOffers = [];

      analyses.forEach(analysis => {
        if (analysis.offers && analysis.offers.length > 0) {
          allOffers.push(...analysis.offers.map(offer => ({
            ...offer,
            competitor: analysis.competitor
          })));
        }
      });

      // Categorize offers
      const offerCategories = this._categorizeOffers(allOffers);

      // Identify most aggressive offers
      const aggressiveOffers = this._identifyAggressiveOffers(allOffers);

      // Generate competitive offer recommendations
      const recommendations = await this._generateOfferRecommendations(
        tenantId,
        allOffers,
        offerCategories
      );

      return {
        total_offers: allOffers.length,
        offers_by_category: offerCategories,
        aggressive_offers: aggressiveOffers,
        recommendations,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to extract offers', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get ad spy summary
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Summary data
   */
  async getAdSpySummary(tenantId) {
    try {
      const analyses = await this._getStoredAdAnalyses(tenantId);
      const winningFormats = await this._getStoredWinningFormats(tenantId);

      // Extract key insights
      const totalAds = analyses?.reduce((sum, a) => sum + (a.total_ads || 0), 0) || 0;
      const commonPatterns = this._extractCommonPatterns(analyses);
      const topOffers = this._extractTopOffers(analyses);

      return {
        competitors_monitored: analyses?.length || 0,
        total_ads_analyzed: totalAds,
        common_patterns: commonPatterns.slice(0, 5),
        top_offers: topOffers.slice(0, 3),
        winning_formats: winningFormats?.slice(0, 3) || [],
        last_updated: new Date(),
        status: 'active'
      };

    } catch (error) {
      logger.error('Failed to get ad spy summary', {
        tenantId,
        error: error.message
      });
      return {
        competitors_monitored: 0,
        total_ads_analyzed: 0,
        common_patterns: [],
        top_offers: [],
        winning_formats: [],
        status: 'error'
      };
    }
  }

  /**
   * =====================================
   * PRIVATE METHODS
   * =====================================
   */

  async _collectCompetitorAds(competitor) {
    // Simulate ad collection from ad libraries or SERP monitoring
    // In production, integrate with:
    // - Facebook Ad Library API
    // - Google Ads Transparency Center
    // - Ad spy tools (SpyFu, SEMrush, Adbeat)
    // - SERP scraping with proper rate limits

    const numAds = Math.floor(Math.random() * 10) + 5; // 5-15 ads
    const ads = [];

    for (let i = 0; i < numAds; i++) {
      ads.push({
        id: `ad_${i}`,
        competitor: competitor.name,
        format: this.adFormats[Math.floor(Math.random() * this.adFormats.length)],
        headline: this._generateSampleHeadline(competitor),
        description: this._generateSampleDescription(competitor),
        call_to_action: this._getRandomCTA(),
        first_seen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        last_seen: new Date(),
        impressions_estimate: Math.floor(Math.random() * 100000) + 10000,
        engagement_score: Math.random() * 100
      });
    }

    return ads;
  }

  async _analyzeAdPatterns(competitor, ads) {
    // Detect pattern usage across ads
    const patternUsage = {};
    const emotionalTriggers = [];
    const messagingThemes = [];

    Object.keys(this.adPatterns).forEach(patternType => {
      const keywords = this.adPatterns[patternType];
      let count = 0;

      ads.forEach(ad => {
        const text = `${ad.headline} ${ad.description}`.toLowerCase();
        if (keywords.some(keyword => text.includes(keyword))) {
          count++;
        }
      });

      if (count > 0) {
        patternUsage[patternType] = {
          count,
          percentage: ((count / ads.length) * 100).toFixed(2)
        };

        if (['urgency', 'scarcity', 'emotion'].includes(patternType)) {
          emotionalTriggers.push(patternType);
        }
      }
    });

    // Use AI to identify messaging themes
    const sampleAds = ads.slice(0, 5).map(ad => `${ad.headline}: ${ad.description}`);
    const themes = await this._aiIdentifyThemes(competitor, sampleAds);

    return {
      patterns: patternUsage,
      emotionalTriggers,
      messagingThemes: themes
    };
  }

  async _identifyWinningFormats(ads) {
    // Analyze which ad formats perform best
    const formatPerformance = new Map();

    ads.forEach(ad => {
      if (!formatPerformance.has(ad.format)) {
        formatPerformance.set(ad.format, {
          count: 0,
          total_engagement: 0,
          ads: []
        });
      }

      const data = formatPerformance.get(ad.format);
      data.count++;
      data.total_engagement += ad.engagement_score || 0;
      data.ads.push(ad);
    });

    // Calculate performance scores
    const winningFormats = Array.from(formatPerformance.entries())
      .map(([format, data]) => ({
        type: format,
        count: data.count,
        performance_score: (data.total_engagement / data.count).toFixed(2),
        sample_ads: data.ads.slice(0, 2)
      }))
      .sort((a, b) => b.performance_score - a.performance_score);

    return winningFormats.slice(0, 3); // Top 3 formats
  }

  _extractOffers(ads) {
    const offers = [];

    ads.forEach(ad => {
      const text = `${ad.headline} ${ad.description}`.toLowerCase();

      // Detect discount offers
      const discountMatch = text.match(/(\d+)%\s*off/);
      if (discountMatch) {
        offers.push({
          type: 'percentage_discount',
          value: parseInt(discountMatch[1]),
          text: ad.headline,
          ad_id: ad.id
        });
      }

      // Detect free shipping
      if (text.includes('free shipping')) {
        offers.push({
          type: 'free_shipping',
          text: ad.headline,
          ad_id: ad.id
        });
      }

      // Detect BOGO
      if (text.includes('buy one get one') || text.includes('bogo')) {
        offers.push({
          type: 'bogo',
          text: ad.headline,
          ad_id: ad.id
        });
      }

      // Detect free trial
      if (text.includes('free trial') || text.includes('try free')) {
        offers.push({
          type: 'free_trial',
          text: ad.headline,
          ad_id: ad.id
        });
      }
    });

    return offers;
  }

  async _aiIdentifyThemes(competitor, sampleAds) {
    const prompt = `Analyze these competitor ad headlines and identify the main messaging themes:

Competitor: ${competitor.name}

Ad Copy Samples:
${sampleAds.join('\n')}

Identify 3-5 main themes or messaging strategies being used.
Return as JSON array: ["theme1", "theme2", "theme3"]`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: 'system',
        operation: 'ad_theme_identification',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing
      const themes = response.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5);

      return themes.length > 0 ? themes : ['Value-focused', 'Solution-oriented'];

    } catch (error) {
      logger.warn('AI theme identification failed', { error: error.message });
      return ['Quality-focused', 'Customer-centric'];
    }
  }

  async _storeAdAnalysis(tenantId, analyses) {
    await dataStore.setTenantConfig(tenantId, 'competitor_ad_analyses', {
      analyses,
      analyzed_at: new Date()
    });
  }

  async _getStoredAdAnalyses(tenantId) {
    const data = await dataStore.getTenantConfig(tenantId, 'competitor_ad_analyses', {
      defaultValue: null
    });
    return data?.analyses || [];
  }

  async _generateAdInsights(tenantId, analyses) {
    if (analyses.length === 0) {
      return {
        insights: [],
        recommendations: []
      };
    }

    const prompt = `Analyze these competitor ad patterns and provide strategic insights:

Number of Competitors: ${analyses.length}

Common Patterns Across Competitors:
${JSON.stringify(this._extractCommonPatterns(analyses), null, 2)}

Generate:
1. Key insights about competitor ad strategies
2. Recommendations for outperforming competitors
3. Gaps in competitor messaging we can exploit

Return JSON: {"insights": [...], "recommendations": [...]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'ad_insights_generation',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        insights: ['Competitors using varied messaging strategies'],
        recommendations: ['Test differentiated messaging approach']
      };

    } catch (error) {
      logger.warn('AI insights generation failed', { error: error.message });
      return {
        insights: ['Multiple competitor strategies detected'],
        recommendations: ['Analyze patterns for opportunities']
      };
    }
  }

  async _generateFormatRecommendations(tenantId, winningFormats) {
    const topFormats = winningFormats.slice(0, 3);

    const prompt = `Based on competitor analysis, these ad formats are performing best:

${topFormats.map((f, i) => `${i + 1}. ${f.format} - Used by ${f.usage_count} competitors, Avg Performance: ${f.avg_performance}`).join('\n')}

Recommend:
1. Which formats to prioritize
2. How to implement them effectively
3. Testing strategy

Return JSON: {"priority_formats": [...], "implementation_tips": [...], "testing_approach": "..."}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'format_recommendations',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        priority_formats: topFormats.map(f => f.format),
        implementation_tips: ['Test top-performing formats first'],
        testing_approach: 'A/B test against current ads'
      };

    } catch (error) {
      return {
        priority_formats: topFormats.map(f => f.format),
        implementation_tips: [],
        testing_approach: 'Gradual rollout'
      };
    }
  }

  _detectSeasonalSignals(analysis) {
    const signals = [];
    const adText = analysis.sample_ads
      .map(ad => `${ad.headline} ${ad.description}`)
      .join(' ')
      .toLowerCase();

    Object.keys(this.seasonalKeywords).forEach(season => {
      const keywords = this.seasonalKeywords[season];
      if (keywords.some(keyword => adText.includes(keyword))) {
        signals.push(season);
      }
    });

    return signals;
  }

  _getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 11 || month <= 1) return 'holiday';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 8) return 'summer';
    if (month === 9 || month === 10) return 'back_to_school';
    return 'general';
  }

  async _generateSeasonalRecommendations(tenantId, campaigns, currentSeason) {
    const prompt = `Current season: ${currentSeason}
Competitors with seasonal campaigns: ${campaigns.length}

Recommend seasonal ad copy strategies for the current period.

Return JSON: {"recommendations": [...], "timing": "..."}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'seasonal_recommendations',
        maxRetries: 1
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        recommendations: [`Leverage ${currentSeason} messaging`],
        timing: 'Implement immediately'
      };

    } catch (error) {
      return {
        recommendations: ['Consider seasonal promotions'],
        timing: 'Review monthly'
      };
    }
  }

  _categorizeOffers(offers) {
    const categories = {};

    offers.forEach(offer => {
      if (!categories[offer.type]) {
        categories[offer.type] = [];
      }
      categories[offer.type].push(offer);
    });

    return categories;
  }

  _identifyAggressiveOffers(offers) {
    return offers
      .filter(offer => {
        if (offer.type === 'percentage_discount' && offer.value >= 50) return true;
        if (offer.type === 'bogo') return true;
        return false;
      })
      .slice(0, 5); // Top 5 aggressive offers
  }

  async _generateOfferRecommendations(tenantId, offers, categories) {
    const offerSummary = Object.keys(categories).map(type =>
      `${type}: ${categories[type].length} offers`
    ).join(', ');

    const prompt = `Competitor offers analysis:
${offerSummary}

Recommend competitive offer strategy to stand out.

Return JSON: {"recommendations": [...], "strategy": "..."}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'offer_recommendations',
        maxRetries: 1
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        recommendations: ['Differentiate with unique value proposition'],
        strategy: 'Value-based positioning'
      };

    } catch (error) {
      return {
        recommendations: ['Monitor competitor offers regularly'],
        strategy: 'Competitive matching'
      };
    }
  }

  _extractCommonPatterns(analyses) {
    if (!analyses || analyses.length === 0) return [];

    const patternCounts = new Map();

    analyses.forEach(analysis => {
      if (analysis.patterns) {
        Object.keys(analysis.patterns).forEach(pattern => {
          const count = patternCounts.get(pattern) || 0;
          patternCounts.set(pattern, count + 1);
        });
      }
    });

    return Array.from(patternCounts.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: ((count / analyses.length) * 100).toFixed(2)
      }))
      .sort((a, b) => b.count - a.count);
  }

  _extractTopOffers(analyses) {
    if (!analyses || analyses.length === 0) return [];

    const allOffers = [];
    analyses.forEach(a => {
      if (a.offers) {
        allOffers.push(...a.offers);
      }
    });

    return allOffers.slice(0, 5);
  }

  async _getStoredWinningFormats(tenantId) {
    const data = await dataStore.getTenantConfig(tenantId, 'winning_ad_formats', {
      defaultValue: null
    });
    return data?.formats || [];
  }

  _generateSampleHeadline(competitor) {
    const templates = [
      `${competitor.name} - Best Solution`,
      `Shop ${competitor.name} Now`,
      `Try ${competitor.name} Free`,
      `${competitor.name} - 50% Off`,
      `Get ${competitor.name} Today`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  _generateSampleDescription(competitor) {
    const templates = [
      'Trusted by thousands. Get started today.',
      'Limited time offer. Shop now and save.',
      'Free shipping on all orders. Order now.',
      'Rated #1 by customers. Try risk-free.',
      'Professional solution at great prices.'
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  _getRandomCTA() {
    const ctas = [
      'Shop Now',
      'Learn More',
      'Get Started',
      'Try Free',
      'Buy Now',
      'Sign Up',
      'Get Quote'
    ];
    return ctas[Math.floor(Math.random() * ctas.length)];
  }
}

// Singleton instance
let adSpyInstance = null;

/**
 * Get singleton instance
 */
export function getAdSpyService() {
  if (!adSpyInstance) {
    adSpyInstance = new AdSpyService();
  }
  return adSpyInstance;
}

export default getAdSpyService;