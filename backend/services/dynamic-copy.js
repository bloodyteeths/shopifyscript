/**
 * Dynamic Copy Generator Service for Ads Autopilot AI SaaS
 * Creates compelling, personalized ad copy using ALL available data sources
 *
 * Features:
 * - Uses website content (products, USPs, testimonials)
 * - Competitor-differentiated messaging
 * - Segment-specific copy variations
 * - Seasonal/promotional adaptation
 * - Time-based messaging (hourly, daily patterns)
 * - Traffic pattern optimization
 * - Emotional trigger variations
 * - Performance-driven copy evolution
 *
 * DATA SOURCES INTEGRATED:
 * 1. Website content (products, offers, testimonials, USPs)
 * 2. Competitor intelligence (differentiation points)
 * 3. Customer segments (RFM-based messaging)
 * 4. Traffic patterns (time-optimized copy)
 * 5. SERP monitoring (keyword-specific copy)
 */

import { getAIProviderService } from './ai-provider.js';
import { getContentIndexer } from './content-indexer.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import customerSegmentation from './customer-segmentation.js';
import trafficAnalyzer from './traffic-analyzer.js';
import { getSERPMonitorService } from './serp-monitor.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Dynamic Copy Generator - Creates hyper-specific, data-driven ad copy
 */
export class DynamicCopyGenerator {
  constructor() {
    this.aiService = getAIProviderService();
    this.contentIndexer = getContentIndexer();
    this.competitorIntelligence = getCompetitorIntelligenceService();
    this.serpMonitor = getSERPMonitorService();

    // Copy templates by type
    this.copyTemplates = {
      urgency: [
        'Limited Time', 'Today Only', 'Ending Soon', 'Last Chance',
        'While Supplies Last', 'Don\'t Miss Out', 'Act Now', 'Hurry'
      ],
      scarcity: [
        'Only {n} Left', 'Limited Stock', 'Almost Gone', 'Low Inventory',
        'Few Remaining', 'Nearly Sold Out'
      ],
      social_proof: [
        '{n}+ Customers', 'Trusted by {n}', 'Join {n} Happy Customers',
        '{n} 5-Star Reviews', 'Rated {rating}/5 Stars'
      ],
      value: [
        'Save {percent}%', '{percent}% Off', 'Best Price', 'Lowest Price',
        'Free Shipping', 'Free Trial', 'Money Back Guarantee'
      ],
      authority: [
        'Industry Leader', 'Award Winning', '#1 Rated', 'Expert Solution',
        'Certified', 'Professional', 'Premium Quality'
      ]
    };

    // Emotional triggers by segment
    this.emotionalTriggers = {
      champions: ['exclusive', 'premium', 'elite', 'VIP', 'special access'],
      loyalCustomers: ['trusted', 'proven', 'reliable', 'favorite', 'loyalty'],
      atRisk: ['miss you', 'come back', 'special offer', 'just for you', 'we\'ve improved'],
      recentCustomers: ['welcome', 'explore', 'discover', 'more', 'next step'],
      promisingCustomers: ['trending', 'popular', 'best seller', 'everyone loves', 'must-have']
    };

    // Time-based messaging
    this.timeBasedMessages = {
      morning: {
        tone: 'energetic',
        keywords: ['Start Your Day', 'Morning Deal', 'Wake Up to', 'Begin With', 'Fresh Start']
      },
      afternoon: {
        tone: 'productive',
        keywords: ['Midday Special', 'Lunch Break', 'Power Through', 'Keep Going', 'Stay Productive']
      },
      evening: {
        tone: 'relaxed',
        keywords: ['Unwind', 'Evening Special', 'End Your Day', 'Relax With', 'Tonight Only']
      },
      weekend: {
        tone: 'leisurely',
        keywords: ['Weekend Deal', 'Enjoy Your Weekend', 'Saturday Special', 'Sunday Savings', 'Weekend Only']
      }
    };

    // Seasonal themes
    this.seasonalThemes = {
      holiday: ['Holiday Sale', 'Festive Offer', 'Celebrate', 'Gift Ideas', 'Special Occasion'],
      newYear: ['New Year', 'Fresh Start', 'Resolution', 'Transform', 'New You'],
      summer: ['Summer Sale', 'Beat the Heat', 'Sunny Savings', 'Hot Deal', 'Summer Special'],
      backToSchool: ['Back to School', 'Student Discount', 'Study Smart', 'Learn More', 'Academic'],
      blackFriday: ['Black Friday', 'Cyber Monday', 'Biggest Sale', 'Massive Savings', 'Doorbuster']
    };

    // Performance metrics
    this.metrics = {
      copyGenerated: 0,
      withWebsiteContent: 0,
      withCompetitorData: 0,
      withSegmentation: 0,
      withTrafficData: 0,
      avgGenerationTime: 0
    };

    console.log('📝 Dynamic Copy Generator initialized');
  }

  /**
   * Generate comprehensive ad copy using ALL data sources
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generated copy with variations
   */
  async generateComprehensiveCopy(tenantId, options = {}) {
    const startTime = Date.now();

    const {
      theme = 'Business',
      industry = 'general',
      keywords = [],
      headlineCount = 15,
      descriptionCount = 4,
      generateVariations = true,
      includeAllSegments = true,
      includeTimeVariations = true,
      targetSegment = null
    } = options;

    logger.info('Generating comprehensive copy', { tenantId, theme, industry });

    try {
      // STEP 1: Gather ALL data sources in parallel
      const dataGatheringStart = Date.now();
      const [
        websiteContent,
        competitorData,
        segmentData,
        trafficData,
        serpData
      ] = await Promise.allSettled([
        this._gatherWebsiteContent(tenantId),
        this._gatherCompetitorData(tenantId),
        this._gatherSegmentData(tenantId),
        this._gatherTrafficData(tenantId),
        this._gatherSERPData(tenantId, keywords)
      ]);

      const dataGatheringTime = Date.now() - dataGatheringStart;
      logger.info('Data gathering completed', {
        tenantId,
        time: dataGatheringTime,
        sources: {
          website: websiteContent.status === 'fulfilled',
          competitor: competitorData.status === 'fulfilled',
          segment: segmentData.status === 'fulfilled',
          traffic: trafficData.status === 'fulfilled',
          serp: serpData.status === 'fulfilled'
        }
      });

      // Extract successful data
      const data = {
        website: websiteContent.status === 'fulfilled' ? websiteContent.value : null,
        competitor: competitorData.status === 'fulfilled' ? competitorData.value : null,
        segments: segmentData.status === 'fulfilled' ? segmentData.value : null,
        traffic: trafficData.status === 'fulfilled' ? trafficData.value : null,
        serp: serpData.status === 'fulfilled' ? serpData.value : null
      };

      // STEP 2: Build comprehensive context for AI
      const copyContext = this._buildComprehensiveContext({
        theme,
        industry,
        keywords,
        tenantId,
        ...data
      });

      // STEP 3: Generate base copy set using AI
      const baseCopy = await this._generateBaseCopy(copyContext, {
        headlineCount,
        descriptionCount
      });

      // STEP 4: Generate segment-specific variations
      let segmentVariations = {};
      if (includeAllSegments && data.segments) {
        segmentVariations = await this._generateSegmentVariations(baseCopy, data.segments, copyContext);
      } else if (targetSegment) {
        segmentVariations[targetSegment] = await this._generateSegmentSpecificCopy(
          baseCopy,
          targetSegment,
          copyContext
        );
      }

      // STEP 5: Generate time-based variations
      let timeVariations = {};
      if (includeTimeVariations && data.traffic) {
        timeVariations = await this._generateTimeBasedVariations(baseCopy, data.traffic, copyContext);
      }

      // STEP 6: Generate competitor-differentiated copy
      let competitorDifferentiated = {};
      if (data.competitor) {
        competitorDifferentiated = await this._generateCompetitorDifferentiatedCopy(
          baseCopy,
          data.competitor,
          copyContext
        );
      }

      // STEP 7: Generate emotional trigger variations
      const emotionalVariations = await this._generateEmotionalVariations(baseCopy, copyContext);

      // STEP 8: Calculate quality scores
      const qualityScores = this._calculateQualityScores({
        baseCopy,
        segmentVariations,
        timeVariations,
        competitorDifferentiated,
        emotionalVariations
      });

      // Update metrics
      this.metrics.copyGenerated++;
      if (data.website) this.metrics.withWebsiteContent++;
      if (data.competitor) this.metrics.withCompetitorData++;
      if (data.segments) this.metrics.withSegmentation++;
      if (data.traffic) this.metrics.withTrafficData++;

      const totalTime = Date.now() - startTime;
      this._updateAvgTime(totalTime);

      const result = {
        success: true,
        tenantId,
        theme,
        industry,

        // Base copy set
        baseCopy: {
          headlines: baseCopy.headlines,
          descriptions: baseCopy.descriptions,
          quality: qualityScores.base
        },

        // All variations
        variations: {
          bySegment: segmentVariations,
          byTime: timeVariations,
          byCompetitor: competitorDifferentiated,
          byEmotion: emotionalVariations
        },

        // Data sources used
        dataSources: {
          websiteContent: !!data.website,
          competitorIntelligence: !!data.competitor,
          customerSegmentation: !!data.segments,
          trafficPatterns: !!data.traffic,
          serpMonitoring: !!data.serp,
          totalSources: [data.website, data.competitor, data.segments, data.traffic, data.serp]
            .filter(Boolean).length
        },

        // Quality metrics
        qualityScores,

        // Generation metadata
        metadata: {
          generatedAt: new Date().toISOString(),
          totalGenerationTime: totalTime,
          dataGatheringTime,
          variationsGenerated: Object.keys(segmentVariations).length +
                               Object.keys(timeVariations).length +
                               Object.keys(emotionalVariations).length,
          confidence: this._calculateConfidence(data)
        },

        // Recommendations for usage
        recommendations: this._generateUsageRecommendations({
          data,
          qualityScores,
          segmentVariations,
          timeVariations
        })
      };

      logger.info('Copy generation completed', {
        tenantId,
        totalTime,
        variationsGenerated: result.metadata.variationsGenerated,
        dataSources: result.dataSources.totalSources
      });

      return result;

    } catch (error) {
      logger.error('Copy generation failed', {
        tenantId,
        theme,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        fallback: await this._generateFallbackCopy({ theme, industry, keywords })
      };
    }
  }

  /**
   * Generate copy optimized for specific segment
   */
  async generateSegmentOptimizedCopy(tenantId, segment, options = {}) {
    return await this.generateComprehensiveCopy(tenantId, {
      ...options,
      targetSegment: segment,
      includeAllSegments: false,
      generateVariations: true
    });
  }

  /**
   * Generate copy for specific time period
   */
  async generateTimeOptimizedCopy(tenantId, timeOfDay, options = {}) {
    const result = await this.generateComprehensiveCopy(tenantId, {
      ...options,
      includeTimeVariations: true
    });

    return {
      ...result,
      recommendedCopy: result.variations?.byTime?.[timeOfDay] || result.baseCopy
    };
  }

  /**
   * =====================================
   * DATA GATHERING METHODS
   * =====================================
   */

  async _gatherWebsiteContent(tenantId) {
    try {
      const content = await this.contentIndexer.getAllContentForAds(tenantId);

      if (!content || content.totalItems === 0) {
        logger.warn('No website content available', { tenantId });
        return null;
      }

      return {
        products: content.products || [],
        usps: content.usps || [],
        offers: content.offers || [],
        testimonials: content.testimonials || [],
        guarantees: content.guarantees || [],
        hooks: content.hooks || [],
        ctas: content.ctas || [],
        brandVoice: content.brandVoice || null,
        totalItems: content.totalItems
      };
    } catch (error) {
      logger.warn('Failed to gather website content', { tenantId, error: error.message });
      return null;
    }
  }

  async _gatherCompetitorData(tenantId) {
    try {
      const summary = await this.competitorIntelligence.getIntelligenceSummary(tenantId);

      if (!summary || summary.totalCompetitors === 0) {
        logger.warn('No competitor data available', { tenantId });
        return null;
      }

      // Get market gaps for differentiation
      const marketGaps = await dataStore.getTenantConfig(tenantId, 'market_gap_analysis', {
        defaultValue: null
      });

      return {
        competitors: summary.competitors || [],
        totalCompetitors: summary.totalCompetitors,
        marketGaps: marketGaps?.analysis?.gaps || [],
        opportunities: marketGaps?.analysis?.opportunities || [],
        recentChanges: summary.changes || []
      };
    } catch (error) {
      logger.warn('Failed to gather competitor data', { tenantId, error: error.message });
      return null;
    }
  }

  async _gatherSegmentData(tenantId) {
    try {
      const segmentation = await customerSegmentation.segmentCustomers(tenantId);

      if (!segmentation || segmentation.totalCustomers === 0) {
        logger.warn('No segment data available', { tenantId });
        return null;
      }

      // Identify top segments by revenue
      const topSegments = Object.entries(segmentation.rfmSegments || {})
        .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
        .slice(0, 5)
        .map(([key, data]) => ({
          segment: key,
          ...data
        }));

      return {
        totalCustomers: segmentation.totalCustomers,
        topSegments,
        specialGroups: segmentation.specialGroups || {},
        insights: segmentation.insights || []
      };
    } catch (error) {
      logger.warn('Failed to gather segment data', { tenantId, error: error.message });
      return null;
    }
  }

  async _gatherTrafficData(tenantId) {
    try {
      const analysis = await trafficAnalyzer.getComprehensiveAnalysis(tenantId);

      if (!analysis || analysis.hourly?.dataPoints === 0) {
        logger.warn('No traffic data available', { tenantId });
        return null;
      }

      return {
        peakHours: analysis.hourly?.peakHours || [],
        bestDays: analysis.daily?.bestDays || [],
        seasonalTrends: analysis.seasonal?.trends || {},
        optimalSchedule: analysis.optimalSchedule || {},
        currentTimeOptimization: this._getCurrentTimeContext()
      };
    } catch (error) {
      logger.warn('Failed to gather traffic data', { tenantId, error: error.message });
      return null;
    }
  }

  async _gatherSERPData(tenantId, keywords) {
    try {
      if (!keywords || keywords.length === 0) {
        return null;
      }

      const positionData = await this.serpMonitor.trackKeywordPositions(
        tenantId,
        keywords.slice(0, 10)
      );

      if (!positionData || positionData.tracked === 0) {
        logger.warn('No SERP data available', { tenantId });
        return null;
      }

      return {
        keywords: positionData.keywords || [],
        avgPosition: positionData.keywords.reduce((sum, k) =>
          sum + (k.our_position || 0), 0) / positionData.keywords.length,
        competitorCount: new Set(
          positionData.keywords.flatMap(k =>
            k.competitor_positions?.map(cp => cp.advertiser) || []
          )
        ).size
      };
    } catch (error) {
      logger.warn('Failed to gather SERP data', { tenantId, error: error.message });
      return null;
    }
  }

  /**
   * =====================================
   * COPY GENERATION METHODS
   * =====================================
   */

  _buildComprehensiveContext(data) {
    const {
      theme,
      industry,
      keywords,
      website,
      competitor,
      segments,
      traffic,
      serp
    } = data;

    let context = `Generate Google Ads copy for: ${theme} in ${industry} industry\n\n`;

    // Add keywords
    if (keywords && keywords.length > 0) {
      context += `TARGET KEYWORDS: ${keywords.join(', ')}\n\n`;
    }

    // Add website content (MOST IMPORTANT SOURCE)
    if (website && website.totalItems > 0) {
      context += `=== WEBSITE CONTENT (Use this real business data) ===\n`;

      if (website.products.length > 0) {
        context += `\nProducts/Services:\n`;
        website.products.slice(0, 5).forEach(product => {
          context += `- ${product.title}`;
          if (product.metadata?.price) context += ` ($${product.metadata.price})`;
          if (product.content) context += ` - ${product.content.substring(0, 100)}`;
          context += `\n`;
        });
      }

      if (website.usps.length > 0) {
        context += `\nUnique Selling Points:\n`;
        website.usps.slice(0, 5).forEach(usp => {
          context += `- ${usp.title || usp.content}\n`;
        });
      }

      if (website.offers.length > 0) {
        context += `\nCurrent Offers:\n`;
        website.offers.slice(0, 3).forEach(offer => {
          context += `- ${offer.title || offer.content}\n`;
        });
      }

      if (website.testimonials.length > 0) {
        context += `\nCustomer Testimonials:\n`;
        website.testimonials.slice(0, 2).forEach(testimonial => {
          const snippet = (testimonial.content || testimonial.title).substring(0, 80);
          context += `- "${snippet}..." - ${testimonial.metadata?.author || 'Customer'}\n`;
        });
      }

      if (website.ctas.length > 0) {
        context += `\nEffective CTAs: ${website.ctas.slice(0, 5).join(', ')}\n`;
      }

      if (website.brandVoice && website.brandVoice.primaryTone) {
        context += `\nBrand Voice: ${website.brandVoice.primaryTone}\n`;
      }

      context += `\n`;
    }

    // Add competitor differentiation
    if (competitor && competitor.totalCompetitors > 0) {
      context += `=== COMPETITIVE DIFFERENTIATION ===\n`;
      context += `Competitors in market: ${competitor.totalCompetitors}\n`;

      if (competitor.marketGaps.length > 0) {
        context += `\nMarket Gaps to Exploit:\n`;
        competitor.marketGaps.slice(0, 3).forEach(gap => {
          context += `- ${gap.description} (Score: ${gap.opportunity_score}/10)\n`;
        });
      }

      if (competitor.opportunities.length > 0) {
        context += `\nOpportunities: ${competitor.opportunities.slice(0, 3).join(', ')}\n`;
      }

      context += `\nDifferentiation Strategy: Emphasize unique aspects not covered by competitors\n\n`;
    }

    // Add customer segment insights
    if (segments && segments.topSegments.length > 0) {
      context += `=== CUSTOMER SEGMENTS ===\n`;
      context += `Total Customers: ${segments.totalCustomers}\n`;
      context += `\nTop Segments:\n`;
      segments.topSegments.slice(0, 3).forEach(segment => {
        context += `- ${segment.label}: ${segment.customerCount} customers, $${segment.totalRevenue} revenue\n`;
      });

      if (segments.specialGroups.vip?.count > 0) {
        context += `\nVIP Customers: ${segments.specialGroups.vip.count} (High-value segment)\n`;
      }

      context += `\n`;
    }

    // Add traffic patterns
    if (traffic && traffic.peakHours.length > 0) {
      context += `=== TRAFFIC PATTERNS ===\n`;
      context += `Peak Hours: ${traffic.peakHours.map(h => h.hourLabel).join(', ')}\n`;
      context += `Best Days: ${traffic.bestDays.map(d => d.day).join(', ')}\n`;

      if (traffic.seasonalTrends.trend) {
        context += `Trend: ${traffic.seasonalTrends.trend}\n`;
      }

      context += `\n`;
    }

    // Add SERP positioning
    if (serp && serp.keywords.length > 0) {
      context += `=== SERP POSITIONING ===\n`;
      context += `Tracking ${serp.keywords.length} keywords\n`;
      context += `Average Position: ${serp.avgPosition.toFixed(1)}\n`;
      context += `Competitors: ${serp.competitorCount}\n\n`;
    }

    return context;
  }

  async _generateBaseCopy(context, options) {
    const { headlineCount, descriptionCount } = options;

    const prompt = `${context}

REQUIREMENTS:
- Generate ${headlineCount} unique headlines (each 30 characters or less)
- Generate ${descriptionCount} unique descriptions (each 90 characters or less)
- Use SPECIFIC data from the context above (products, offers, USPs)
- Create compelling, benefit-driven copy
- Include strong calls-to-action
- Vary messaging approaches (features, benefits, social proof, urgency)
- Reference REAL business data when available

IMPORTANT:
- Headlines MUST be under 30 characters
- Descriptions MUST be under 90 characters
- Use actual product names, offers, and USPs from the context
- Create copy that differentiates from competitors

Return ONLY valid JSON:
{
  "headlines": ["headline 1", "headline 2", ...],
  "descriptions": ["description 1", "description 2", ...]
}`;

    try {
      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      if (!response || !response.headlines || !response.descriptions) {
        throw new Error('Invalid AI response format');
      }

      // Validate and clean
      const headlines = response.headlines
        .filter(h => typeof h === 'string' && h.trim().length > 0 && h.length <= 30)
        .slice(0, headlineCount);

      const descriptions = response.descriptions
        .filter(d => typeof d === 'string' && d.trim().length > 0 && d.length <= 90)
        .slice(0, descriptionCount);

      return { headlines, descriptions };

    } catch (error) {
      logger.error('Base copy generation failed', { error: error.message });
      throw error;
    }
  }

  async _generateSegmentVariations(baseCopy, segmentData, context) {
    const variations = {};

    // Generate for top 3 segments
    const topSegments = segmentData.topSegments.slice(0, 3);

    for (const segment of topSegments) {
      try {
        const segmentCopy = await this._generateSegmentSpecificCopy(
          baseCopy,
          segment.segment,
          context
        );
        variations[segment.segment] = segmentCopy;
      } catch (error) {
        logger.warn(`Failed to generate copy for segment ${segment.segment}`, {
          error: error.message
        });
      }
    }

    return variations;
  }

  async _generateSegmentSpecificCopy(baseCopy, segmentName, context) {
    const triggers = this.emotionalTriggers[segmentName] || this.emotionalTriggers.recentCustomers;

    const prompt = `Adapt this ad copy for the "${segmentName}" customer segment.

Base Headlines: ${baseCopy.headlines.join(', ')}
Base Descriptions: ${baseCopy.descriptions.join(', ')}

Segment Context: ${context}

Emotional Triggers for this segment: ${triggers.join(', ')}

Create 5 headlines and 2 descriptions specifically tailored for this segment.
Maintain character limits (30 for headlines, 90 for descriptions).

Return JSON:
{
  "headlines": [...],
  "descriptions": [...]
}`;

    try {
      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      return {
        headlines: (response.headlines || []).filter(h => h.length <= 30).slice(0, 5),
        descriptions: (response.descriptions || []).filter(d => d.length <= 90).slice(0, 2),
        triggers,
        segmentName
      };
    } catch (error) {
      return {
        headlines: baseCopy.headlines.slice(0, 5),
        descriptions: baseCopy.descriptions.slice(0, 2),
        triggers,
        segmentName
      };
    }
  }

  async _generateTimeBasedVariations(baseCopy, trafficData, context) {
    const variations = {};
    const currentTime = new Date().getHours();

    // Determine time period
    let timePeriod;
    if (currentTime >= 6 && currentTime < 12) timePeriod = 'morning';
    else if (currentTime >= 12 && currentTime < 17) timePeriod = 'afternoon';
    else if (currentTime >= 17 && currentTime < 22) timePeriod = 'evening';
    else timePeriod = 'night';

    const timeContext = this.timeBasedMessages[timePeriod];

    const prompt = `Create time-optimized ad copy for ${timePeriod}.

Base Copy: ${JSON.stringify(baseCopy)}

Time Context:
- Tone: ${timeContext.tone}
- Keywords: ${timeContext.keywords.join(', ')}
- Peak Hours: ${trafficData.peakHours.map(h => h.hourLabel).join(', ')}

Create 5 headlines and 2 descriptions optimized for ${timePeriod} traffic.
Keep under 30 and 90 characters respectively.

Return JSON:
{
  "headlines": [...],
  "descriptions": [...]
}`;

    try {
      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      variations[timePeriod] = {
        headlines: (response.headlines || []).filter(h => h.length <= 30).slice(0, 5),
        descriptions: (response.descriptions || []).filter(d => d.length <= 90).slice(0, 2),
        timeContext,
        timePeriod
      };
    } catch (error) {
      variations[timePeriod] = {
        headlines: baseCopy.headlines.slice(0, 5),
        descriptions: baseCopy.descriptions.slice(0, 2),
        timeContext,
        timePeriod
      };
    }

    return variations;
  }

  async _generateCompetitorDifferentiatedCopy(baseCopy, competitorData, context) {
    if (!competitorData.marketGaps || competitorData.marketGaps.length === 0) {
      return { headlines: [], descriptions: [], gaps: [] };
    }

    const topGaps = competitorData.marketGaps.slice(0, 3);

    const prompt = `Create competitor-differentiated ad copy that exploits these market gaps:

${topGaps.map(gap => `- ${gap.description} (Opportunity Score: ${gap.opportunity_score}/10)`).join('\n')}

Base Copy: ${JSON.stringify(baseCopy)}

Create 5 headlines and 2 descriptions that highlight our unique advantages.
Keep under 30 and 90 characters respectively.

Return JSON:
{
  "headlines": [...],
  "descriptions": [...]
}`;

    try {
      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      return {
        headlines: (response.headlines || []).filter(h => h.length <= 30).slice(0, 5),
        descriptions: (response.descriptions || []).filter(d => d.length <= 90).slice(0, 2),
        gaps: topGaps
      };
    } catch (error) {
      return {
        headlines: baseCopy.headlines.slice(0, 5),
        descriptions: baseCopy.descriptions.slice(0, 2),
        gaps: topGaps
      };
    }
  }

  async _generateEmotionalVariations(baseCopy, context) {
    const variations = {};

    // Generate variations for key emotional triggers
    const emotions = ['urgency', 'value', 'social_proof'];

    for (const emotion of emotions) {
      const templates = this.copyTemplates[emotion];

      variations[emotion] = {
        headlines: this._applyEmotionalTemplate(baseCopy.headlines, templates, emotion).slice(0, 5),
        descriptions: this._applyEmotionalTemplate(baseCopy.descriptions, templates, emotion).slice(0, 2),
        emotion,
        templates
      };
    }

    return variations;
  }

  _applyEmotionalTemplate(copy, templates, emotion) {
    // Intelligently inject emotional triggers into existing copy
    const enhanced = [];

    copy.forEach(line => {
      // Try to add template elements
      const template = templates[Math.floor(Math.random() * templates.length)];

      // For headlines (short), prepend or replace
      if (line.length <= 30) {
        if (line.length + template.length + 3 <= 30) {
          enhanced.push(`${template} - ${line}`.substring(0, 30));
        } else {
          enhanced.push(template.substring(0, 30));
        }
      } else {
        // For descriptions, try to insert
        if (line.length + template.length + 3 <= 90) {
          enhanced.push(`${template}. ${line}`.substring(0, 90));
        } else {
          enhanced.push(line);
        }
      }
    });

    return enhanced;
  }

  /**
   * =====================================
   * QUALITY & ANALYSIS METHODS
   * =====================================
   */

  _calculateQualityScores(allCopy) {
    const scores = {
      base: this._scoreCopySet(allCopy.baseCopy),
      segments: {},
      time: {},
      competitor: this._scoreCopySet(allCopy.competitorDifferentiated),
      emotional: {}
    };

    // Score segment variations
    Object.entries(allCopy.segmentVariations).forEach(([segment, copy]) => {
      scores.segments[segment] = this._scoreCopySet(copy);
    });

    // Score time variations
    Object.entries(allCopy.timeVariations).forEach(([time, copy]) => {
      scores.time[time] = this._scoreCopySet(copy);
    });

    // Score emotional variations
    Object.entries(allCopy.emotionalVariations).forEach(([emotion, copy]) => {
      scores.emotional[emotion] = this._scoreCopySet(copy);
    });

    return scores;
  }

  _scoreCopySet(copySet) {
    if (!copySet || !copySet.headlines) {
      return { overall: 0, variety: 0, length: 0, impact: 0 };
    }

    const headlines = copySet.headlines || [];
    const descriptions = copySet.descriptions || [];

    // Variety score (uniqueness)
    const uniqueHeadlines = new Set(headlines.map(h => h.toLowerCase())).size;
    const varietyScore = headlines.length > 0 ? (uniqueHeadlines / headlines.length) * 100 : 0;

    // Length optimization score
    const avgHeadlineLength = headlines.reduce((sum, h) => sum + h.length, 0) / headlines.length || 0;
    const avgDescLength = descriptions.reduce((sum, d) => sum + d.length, 0) / descriptions.length || 0;
    const lengthScore = ((avgHeadlineLength / 30) + (avgDescLength / 90)) * 50;

    // Impact score (power words, CTAs, numbers)
    const powerWords = ['save', 'free', 'guaranteed', 'proven', 'best', 'new', 'exclusive', 'limited'];
    const impactCount = [...headlines, ...descriptions].filter(text =>
      powerWords.some(word => text.toLowerCase().includes(word))
    ).length;
    const impactScore = Math.min(100, (impactCount / (headlines.length + descriptions.length)) * 100);

    const overall = (varietyScore + lengthScore + impactScore) / 3;

    return {
      overall: Math.round(overall),
      variety: Math.round(varietyScore),
      length: Math.round(lengthScore),
      impact: Math.round(impactScore)
    };
  }

  _calculateConfidence(data) {
    let score = 0;
    const maxScore = 5;

    if (data.website) score++;
    if (data.competitor) score++;
    if (data.segments) score++;
    if (data.traffic) score++;
    if (data.serp) score++;

    const percentage = (score / maxScore) * 100;

    if (percentage >= 80) return 'high';
    if (percentage >= 60) return 'medium';
    return 'low';
  }

  _generateUsageRecommendations(options) {
    const { data, qualityScores, segmentVariations, timeVariations } = options;
    const recommendations = [];

    // Data source recommendations
    if (data.website) {
      recommendations.push({
        priority: 'high',
        type: 'data_usage',
        message: 'Use website-content-based copy for highest relevance and specificity',
        action: 'Deploy base copy set first'
      });
    }

    // Segment recommendations
    if (Object.keys(segmentVariations).length > 0) {
      const topSegment = Object.entries(qualityScores.segments || {})
        .sort((a, b) => b[1].overall - a[1].overall)[0];

      if (topSegment) {
        recommendations.push({
          priority: 'high',
          type: 'segmentation',
          message: `${topSegment[0]} segment copy scored highest (${topSegment[1].overall}/100)`,
          action: `Use ${topSegment[0]} variations for that audience`
        });
      }
    }

    // Time-based recommendations
    if (Object.keys(timeVariations).length > 0 && data.traffic) {
      recommendations.push({
        priority: 'medium',
        type: 'scheduling',
        message: 'Time-based variations available for dayparting',
        action: 'Implement ad scheduling with time-specific copy'
      });
    }

    // Competitor differentiation
    if (data.competitor && data.competitor.marketGaps.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'differentiation',
        message: `${data.competitor.marketGaps.length} market gaps identified`,
        action: 'Use competitor-differentiated copy to stand out'
      });
    }

    return recommendations;
  }

  _getCurrentTimeContext() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    let period;
    if (hour >= 6 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 22) period = 'evening';
    else period = 'night';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const isWeekend = day === 0 || day === 6;

    return {
      hour,
      period,
      day: dayNames[day],
      isWeekend
    };
  }

  async _generateFallbackCopy(options) {
    const { theme, industry, keywords } = options;

    return {
      headlines: [
        `${theme} Solutions`,
        `Best ${theme} Service`,
        `${theme} Experts`,
        `Quality ${theme}`,
        `${theme} Specialists`,
        `Trusted ${theme}`,
        `Professional ${theme}`,
        `Top ${theme} Choice`,
        `${theme} Pros`,
        `${theme} Today`
      ].slice(0, 10),
      descriptions: [
        `Professional ${theme.toLowerCase()} services for your needs. Get started today.`,
        `Quality ${theme.toLowerCase()} solutions with expert support. Contact us now.`,
        `Trusted ${theme.toLowerCase()} provider with proven results. Learn more.`,
        `${theme} services backed by excellence. Free consultation available.`
      ]
    };
  }

  _updateAvgTime(time) {
    const count = this.metrics.copyGenerated;
    this.metrics.avgGenerationTime = count > 0
      ? (this.metrics.avgGenerationTime * (count - 1) + time) / count
      : time;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      dataSourceUsage: {
        websiteContent: `${((this.metrics.withWebsiteContent / this.metrics.copyGenerated) * 100).toFixed(1)}%`,
        competitorData: `${((this.metrics.withCompetitorData / this.metrics.copyGenerated) * 100).toFixed(1)}%`,
        segmentation: `${((this.metrics.withSegmentation / this.metrics.copyGenerated) * 100).toFixed(1)}%`,
        trafficData: `${((this.metrics.withTrafficData / this.metrics.copyGenerated) * 100).toFixed(1)}%`
      }
    };
  }

  /**
   * Clear any caches
   */
  clearCache() {
    logger.info('Dynamic copy generator cache cleared');
  }
}

// Export singleton instance
let dynamicCopyGeneratorInstance = null;

/**
 * Get singleton instance
 */
export function getDynamicCopyGenerator() {
  if (!dynamicCopyGeneratorInstance) {
    dynamicCopyGeneratorInstance = new DynamicCopyGenerator();
  }
  return dynamicCopyGeneratorInstance;
}

export default getDynamicCopyGenerator;