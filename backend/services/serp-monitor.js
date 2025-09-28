/**
 * SERP Monitor Service for ProofKit SaaS
 * Tracks search engine results page positions and competitor visibility
 *
 * Features:
 * - Keyword position tracking
 * - Competitor ad monitoring
 * - SERP feature detection (shopping, local pack, etc.)
 * - Bid strategy insights
 * - Market entry detection (new competitors)
 * - Ad visibility scoring
 * - Historical trend analysis
 */

import { getAIProviderService } from './ai-provider.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * SERP Monitoring Engine
 */
export class SERPMonitorService {
  constructor() {
    this.aiService = getAIProviderService();
    this.serpCache = new Map(); // keyword -> SERP data
    this.cacheTtl = 4 * 60 * 60 * 1000; // 4 hours

    // SERP features to track
    this.serpFeatures = [
      'text_ads',
      'shopping_ads',
      'local_pack',
      'knowledge_panel',
      'featured_snippet',
      'people_also_ask',
      'related_searches',
      'image_pack',
      'video_carousel'
    ];

    // Position scoring (higher is better)
    this.positionScores = {
      1: 100,
      2: 85,
      3: 70,
      4: 60,
      5: 50,
      6: 40,
      7: 30,
      8: 20
    };

    console.log('📊 SERP Monitor Service initialized');
  }

  /**
   * Track SERP positions for target keywords
   * @param {string} tenantId - Tenant identifier
   * @param {Array} keywords - Keywords to track
   * @param {object} options - Tracking options
   * @returns {Promise<object>} Position tracking data
   */
  async trackKeywordPositions(tenantId, keywords = [], options = {}) {
    const { location = 'US', device = 'mobile', forceRefresh = false } = options;

    console.log(`🔍 Tracking ${keywords.length} keywords for ${tenantId}`);

    try {
      // If no keywords provided, get from search terms
      if (keywords.length === 0) {
        keywords = await this._getTopKeywords(tenantId);
      }

      const positionData = [];

      for (const keyword of keywords.slice(0, 50)) { // Limit to 50 keywords per run
        const cacheKey = `${keyword}_${location}_${device}`;

        // Check cache
        if (!forceRefresh) {
          const cached = this.serpCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
            positionData.push(cached.data);
            continue;
          }
        }

        try {
          // Simulate SERP data collection
          // In production, integrate with real SERP API (SEMrush, Ahrefs, etc.)
          const serpData = await this._collectSERPData(keyword, location, device);

          // Analyze positions
          const analysis = await this._analyzeSERPPositions(tenantId, keyword, serpData);

          const positionRecord = {
            keyword,
            location,
            device,
            timestamp: new Date(),
            our_position: analysis.ourPosition,
            total_ads: serpData.ads?.length || 0,
            competitor_positions: analysis.competitorPositions,
            serp_features: serpData.features,
            visibility_score: analysis.visibilityScore,
            bid_estimate: serpData.bidEstimate
          };

          positionData.push(positionRecord);

          // Cache the result
          this.serpCache.set(cacheKey, {
            data: positionRecord,
            timestamp: Date.now()
          });

          // Small delay to avoid rate limits
          await this._delay(100);

        } catch (error) {
          logger.warn(`Failed to track keyword ${keyword}`, {
            tenantId,
            error: error.message
          });
        }
      }

      // Store position data
      await this._storePositionData(tenantId, positionData);

      // Detect significant changes
      const changes = await this._detectPositionChanges(tenantId, positionData);

      console.log(`✅ Tracked ${positionData.length} keywords, detected ${changes.length} changes`);

      return {
        tracked: positionData.length,
        keywords: positionData,
        changes,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to track keyword positions', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Identify new competitors entering the market
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Detection options
   * @returns {Promise<Array>} New competitors detected
   */
  async detectNewCompetitors(tenantId, options = {}) {
    const { lookbackDays = 7, minKeywordOverlap = 3 } = options;

    console.log(`🆕 Detecting new competitors for ${tenantId}`);

    try {
      // Get historical SERP data
      const currentData = await this._getRecentPositionData(tenantId, 1);
      const historicalData = await this._getRecentPositionData(tenantId, lookbackDays);

      // Extract current advertisers
      const currentAdvertisers = this._extractAdvertisers(currentData);
      const historicalAdvertisers = this._extractAdvertisers(historicalData);

      // Find new entrants
      const newCompetitors = currentAdvertisers.filter(
        advertiser => !historicalAdvertisers.includes(advertiser)
      );

      if (newCompetitors.length === 0) {
        return [];
      }

      // Analyze new competitors
      const competitorAnalysis = [];

      for (const competitor of newCompetitors) {
        const analysis = await this._analyzeNewCompetitor(tenantId, competitor, currentData);

        if (analysis.keywordOverlap >= minKeywordOverlap) {
          competitorAnalysis.push({
            competitor,
            first_seen: new Date(),
            keyword_overlap: analysis.keywordOverlap,
            avg_position: analysis.avgPosition,
            threat_level: analysis.threatLevel,
            keywords: analysis.keywords
          });
        }
      }

      // Store new competitor alerts
      if (competitorAnalysis.length > 0) {
        await this._storeNewCompetitorAlerts(tenantId, competitorAnalysis);

        await dataStore.addLog(tenantId, 'warning',
          `${competitorAnalysis.length} new competitors detected in market`,
          { competitors: competitorAnalysis }
        );
      }

      console.log(`✅ Detected ${competitorAnalysis.length} new competitors`);

      return competitorAnalysis;

    } catch (error) {
      logger.error('Failed to detect new competitors', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Monitor competitor ad positions and visibility
   * @param {string} tenantId - Tenant identifier
   * @param {Array} competitors - Competitor list
   * @returns {Promise<object>} Visibility analysis
   */
  async monitorAdVisibility(tenantId, competitors = []) {
    console.log(`👁️  Monitoring ad visibility for ${tenantId}`);

    try {
      // Get recent position data
      const positionData = await this._getRecentPositionData(tenantId, 1);

      if (!positionData || positionData.length === 0) {
        return {
          visibility: [],
          summary: 'No position data available'
        };
      }

      // Calculate visibility metrics
      const visibilityMetrics = [];

      // Analyze our visibility
      const ourVisibility = this._calculateVisibilityMetrics(
        positionData,
        null, // null for our ads
        'our_position'
      );

      visibilityMetrics.push({
        advertiser: 'Our Ads',
        avg_position: ourVisibility.avgPosition,
        visibility_score: ourVisibility.visibilityScore,
        impression_share: ourVisibility.impressionShare,
        top_positions: ourVisibility.topPositions,
        keywords_visible: ourVisibility.keywordsVisible
      });

      // Analyze competitor visibility
      for (const competitor of competitors.slice(0, 10)) {
        const compVisibility = this._calculateVisibilityMetrics(
          positionData,
          competitor.name || competitor.domain,
          'competitor_positions'
        );

        visibilityMetrics.push({
          advertiser: competitor.name || competitor.domain,
          avg_position: compVisibility.avgPosition,
          visibility_score: compVisibility.visibilityScore,
          impression_share: compVisibility.impressionShare,
          top_positions: compVisibility.topPositions,
          keywords_visible: compVisibility.keywordsVisible
        });
      }

      // Store visibility data
      await dataStore.setTenantConfig(tenantId, 'ad_visibility_metrics', {
        metrics: visibilityMetrics,
        timestamp: new Date()
      });

      console.log(`✅ Monitored visibility for ${visibilityMetrics.length} advertisers`);

      return {
        visibility: visibilityMetrics,
        timestamp: new Date(),
        keywords_analyzed: positionData.length
      };

    } catch (error) {
      logger.error('Failed to monitor ad visibility', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Track competitor bid strategies
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Bid strategy insights
   */
  async trackBidStrategies(tenantId) {
    console.log(`💰 Tracking bid strategies for ${tenantId}`);

    try {
      const positionData = await this._getRecentPositionData(tenantId, 7);

      if (!positionData || positionData.length === 0) {
        return {
          strategies: [],
          insights: 'Insufficient data for bid analysis'
        };
      }

      // Analyze bid patterns
      const bidAnalysis = await this._analyzeBidPatterns(positionData);

      // Use AI to generate strategic insights
      const aiInsights = await this._generateBidInsights(tenantId, bidAnalysis);

      const result = {
        avg_bid_estimate: bidAnalysis.avgBid,
        bid_range: bidAnalysis.bidRange,
        competitive_intensity: bidAnalysis.intensity,
        peak_hours: bidAnalysis.peakHours,
        strategies: aiInsights.strategies,
        recommendations: aiInsights.recommendations,
        timestamp: new Date()
      };

      // Store bid insights
      await dataStore.setTenantConfig(tenantId, 'bid_strategy_insights', result);

      return result;

    } catch (error) {
      logger.error('Failed to track bid strategies', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get SERP monitoring summary
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} Monitoring summary
   */
  async getMonitoringSummary(tenantId) {
    try {
      const positionData = await this._getRecentPositionData(tenantId, 1);
      const newCompetitors = await this._getNewCompetitorAlerts(tenantId, 7);
      const visibilityData = await dataStore.getTenantConfig(tenantId, 'ad_visibility_metrics', {
        defaultValue: null
      });

      const ourData = positionData.filter(p => p.our_position);
      const avgPosition = ourData.length > 0
        ? ourData.reduce((sum, p) => sum + (p.our_position || 0), 0) / ourData.length
        : 0;

      return {
        keywords_tracked: positionData.length,
        avg_position: avgPosition.toFixed(2),
        new_competitors: newCompetitors.length,
        visibility_score: visibilityData?.metrics?.[0]?.visibility_score || 0,
        last_updated: new Date(),
        status: 'active'
      };

    } catch (error) {
      logger.error('Failed to get monitoring summary', {
        tenantId,
        error: error.message
      });
      return {
        keywords_tracked: 0,
        avg_position: 0,
        new_competitors: 0,
        visibility_score: 0,
        status: 'error'
      };
    }
  }

  /**
   * =====================================
   * PRIVATE METHODS
   * =====================================
   */

  async _getTopKeywords(tenantId) {
    const searchTerms = await dataStore.getSearchTerms(tenantId, {
      limit: 50
    });

    // Get unique keywords sorted by volume
    const keywordMap = new Map();

    searchTerms.forEach(st => {
      const keyword = st.search_term;
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, {
          clicks: 0,
          impressions: 0
        });
      }
      const data = keywordMap.get(keyword);
      data.clicks += st.clicks || 0;
    });

    return Array.from(keywordMap.keys()).slice(0, 20);
  }

  async _collectSERPData(keyword, location, device) {
    // Simulate SERP data collection
    // In production, integrate with SEMrush, Ahrefs, DataForSEO, or similar API

    const numAds = Math.floor(Math.random() * 4) + 2; // 2-5 ads
    const ads = [];

    for (let i = 0; i < numAds; i++) {
      ads.push({
        position: i + 1,
        advertiser: `Advertiser ${String.fromCharCode(65 + i)}`,
        domain: `advertiser-${String.fromCharCode(97 + i)}.com`,
        headline: `${keyword} - Best Solution`,
        description: 'Great product with excellent features'
      });
    }

    // Simulate SERP features
    const features = [];
    this.serpFeatures.forEach(feature => {
      if (Math.random() > 0.7) {
        features.push(feature);
      }
    });

    // Estimate bid (simplified)
    const baseBid = 0.50;
    const bidMultiplier = 1 + Math.random() * 3;
    const bidEstimate = (baseBid * bidMultiplier).toFixed(2);

    return {
      keyword,
      location,
      device,
      ads,
      features,
      bidEstimate: parseFloat(bidEstimate),
      organic_results: 10,
      timestamp: new Date()
    };
  }

  async _analyzeSERPPositions(tenantId, keyword, serpData) {
    // Find our position (simplified - would need actual domain matching)
    const ourPosition = Math.random() > 0.5
      ? Math.floor(Math.random() * 4) + 1
      : null;

    // Extract competitor positions
    const competitorPositions = serpData.ads.map(ad => ({
      advertiser: ad.advertiser,
      domain: ad.domain,
      position: ad.position
    }));

    // Calculate visibility score
    const visibilityScore = ourPosition
      ? this.positionScores[ourPosition] || 10
      : 0;

    return {
      ourPosition,
      competitorPositions,
      visibilityScore,
      totalAds: serpData.ads.length
    };
  }

  async _storePositionData(tenantId, positionData) {
    const key = `serp_positions_${Date.now()}`;
    await dataStore.setTenantConfig(tenantId, key, {
      positions: positionData,
      timestamp: new Date()
    });
  }

  async _detectPositionChanges(tenantId, currentData) {
    // Get previous position data
    const previousData = await this._getRecentPositionData(tenantId, 1, 1);

    if (!previousData || previousData.length === 0) {
      return [];
    }

    const changes = [];

    currentData.forEach(current => {
      const previous = previousData.find(p => p.keyword === current.keyword);

      if (previous && previous.our_position && current.our_position) {
        const positionChange = previous.our_position - current.our_position;

        if (Math.abs(positionChange) >= 2) { // Significant change
          changes.push({
            keyword: current.keyword,
            previous_position: previous.our_position,
            current_position: current.our_position,
            change: positionChange,
            direction: positionChange > 0 ? 'improved' : 'declined',
            significance: Math.abs(positionChange) >= 3 ? 'high' : 'medium'
          });
        }
      }
    });

    return changes;
  }

  async _getRecentPositionData(tenantId, days, offset = 0) {
    // Get stored position data
    const allConfigs = await dataStore.getAllTenantConfigs(tenantId);
    const positionKeys = Object.keys(allConfigs).filter(k => k.startsWith('serp_positions_'));

    if (positionKeys.length === 0) {
      return [];
    }

    // Sort by timestamp (newest first)
    positionKeys.sort((a, b) => {
      const tsA = parseInt(a.split('_')[2]);
      const tsB = parseInt(b.split('_')[2]);
      return tsB - tsA;
    });

    // Get the appropriate data set based on offset
    const targetKey = positionKeys[offset];
    if (!targetKey) {
      return [];
    }

    const data = allConfigs[targetKey];
    return data?.positions || [];
  }

  _extractAdvertisers(positionData) {
    const advertisers = new Set();

    positionData.forEach(data => {
      if (data.competitor_positions) {
        data.competitor_positions.forEach(comp => {
          advertisers.add(comp.advertiser || comp.domain);
        });
      }
    });

    return Array.from(advertisers);
  }

  async _analyzeNewCompetitor(tenantId, competitor, positionData) {
    const competitorData = positionData.filter(data =>
      data.competitor_positions?.some(cp =>
        cp.advertiser === competitor || cp.domain === competitor
      )
    );

    const keywordOverlap = competitorData.length;
    const positions = [];

    competitorData.forEach(data => {
      const comp = data.competitor_positions.find(cp =>
        cp.advertiser === competitor || cp.domain === competitor
      );
      if (comp) {
        positions.push(comp.position);
      }
    });

    const avgPosition = positions.length > 0
      ? positions.reduce((sum, p) => sum + p, 0) / positions.length
      : 0;

    // Determine threat level
    let threatLevel = 'low';
    if (keywordOverlap >= 10 && avgPosition <= 3) {
      threatLevel = 'high';
    } else if (keywordOverlap >= 5 || avgPosition <= 4) {
      threatLevel = 'medium';
    }

    return {
      keywordOverlap,
      avgPosition,
      threatLevel,
      keywords: competitorData.map(d => d.keyword)
    };
  }

  async _storeNewCompetitorAlerts(tenantId, competitors) {
    await dataStore.addLog(tenantId, 'info', 'New competitors detected', {
      competitors,
      detected_at: new Date()
    });
  }

  async _getNewCompetitorAlerts(tenantId, days) {
    const logs = await dataStore.getLogs(tenantId, {
      limit: 100
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return logs.filter(log =>
      log.message?.includes('New competitors detected') &&
      new Date(log.timestamp) >= cutoffDate
    );
  }

  _calculateVisibilityMetrics(positionData, advertiserName, field) {
    let totalScore = 0;
    let totalImpressions = 0;
    let topPositions = 0;
    let keywordsVisible = 0;
    const positions = [];

    positionData.forEach(data => {
      if (field === 'our_position') {
        if (data.our_position) {
          keywordsVisible++;
          positions.push(data.our_position);
          totalScore += this.positionScores[data.our_position] || 10;
          if (data.our_position <= 3) topPositions++;
        }
      } else if (field === 'competitor_positions' && advertiserName) {
        const comp = data.competitor_positions?.find(cp =>
          cp.advertiser === advertiserName || cp.domain === advertiserName
        );
        if (comp) {
          keywordsVisible++;
          positions.push(comp.position);
          totalScore += this.positionScores[comp.position] || 10;
          if (comp.position <= 3) topPositions++;
        }
      }
    });

    const avgPosition = positions.length > 0
      ? positions.reduce((sum, p) => sum + p, 0) / positions.length
      : 0;

    const visibilityScore = positionData.length > 0
      ? (totalScore / (positionData.length * 100)) * 100
      : 0;

    const impressionShare = positionData.length > 0
      ? (keywordsVisible / positionData.length) * 100
      : 0;

    return {
      avgPosition: avgPosition.toFixed(2),
      visibilityScore: visibilityScore.toFixed(2),
      impressionShare: impressionShare.toFixed(2),
      topPositions,
      keywordsVisible
    };
  }

  async _analyzeBidPatterns(positionData) {
    const bids = positionData.map(p => p.bid_estimate).filter(b => b);

    if (bids.length === 0) {
      return {
        avgBid: 0,
        bidRange: { min: 0, max: 0 },
        intensity: 'low',
        peakHours: []
      };
    }

    const avgBid = bids.reduce((sum, b) => sum + b, 0) / bids.length;
    const minBid = Math.min(...bids);
    const maxBid = Math.max(...bids);

    // Determine competitive intensity
    let intensity = 'low';
    if (avgBid > 5.0) {
      intensity = 'high';
    } else if (avgBid > 2.0) {
      intensity = 'medium';
    }

    return {
      avgBid: avgBid.toFixed(2),
      bidRange: { min: minBid.toFixed(2), max: maxBid.toFixed(2) },
      intensity,
      peakHours: ['9am-11am', '2pm-5pm'] // Simplified
    };
  }

  async _generateBidInsights(tenantId, bidAnalysis) {
    const prompt = `Analyze this bid landscape and provide strategic recommendations:

Average Bid: $${bidAnalysis.avgBid}
Bid Range: $${bidAnalysis.bidRange.min} - $${bidAnalysis.bidRange.max}
Competitive Intensity: ${bidAnalysis.intensity}

Provide:
1. Recommended bidding strategies
2. Optimization opportunities
3. Budget allocation suggestions

Return JSON: {"strategies": [...], "recommendations": [...]}`;

    try {
      const response = await this.aiService.generateText(prompt, {
        tenant: tenantId,
        operation: 'bid_strategy_analysis',
        maxRetries: 2
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        strategies: ['Automated bidding based on target CPA'],
        recommendations: ['Monitor competitor bids closely']
      };

    } catch (error) {
      logger.warn('AI bid insights generation failed', { error: error.message });
      return {
        strategies: ['Target CPA bidding'],
        recommendations: ['Review bid strategy weekly']
      };
    }
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let serpMonitorInstance = null;

/**
 * Get singleton instance
 */
export function getSERPMonitorService() {
  if (!serpMonitorInstance) {
    serpMonitorInstance = new SERPMonitorService();
  }
  return serpMonitorInstance;
}

export default getSERPMonitorService;