/**
 * Message Adapter Service for Ads Autopilot AI SaaS
 * Adapts messaging by customer segment, time, location, and emotional triggers
 *
 * Features:
 * - Segment-specific messaging (RFM-based)
 * - Time-of-day adaptations (morning, afternoon, evening)
 * - Day-of-week variations
 * - Urgency and scarcity messaging
 * - Geographic/regional localization
 * - Emotional trigger variations
 * - Behavioral targeting messaging
 * - Seasonal adaptations
 */

import { getAIProviderService } from './ai-provider.js';
import customerSegmentation from './customer-segmentation.js';
import trafficAnalyzer from './traffic-analyzer.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Message Adapter - Personalizes messaging for different contexts
 */
export class MessageAdapterService {
  constructor() {
    this.aiService = getAIProviderService();

    // Segment-specific messaging strategies
    this.segmentStrategies = {
      champions: {
        tone: 'exclusive',
        focus: 'premium benefits',
        approach: 'reward loyalty',
        keywords: ['exclusive', 'VIP', 'elite', 'premium', 'special'],
        ctaStyle: 'soft sell',
        emotionalTrigger: 'belonging',
        examples: [
          'Exclusive Access for Our Top Customers',
          'VIP Benefits Just for You',
          'Premium Members Get First Access'
        ]
      },
      loyalCustomers: {
        tone: 'appreciative',
        focus: 'continued value',
        approach: 'reinforce relationship',
        keywords: ['trusted', 'proven', 'favorite', 'always', 'reliable'],
        ctaStyle: 'relationship-based',
        emotionalTrigger: 'trust',
        examples: [
          'Trusted by Thousands Like You',
          'Your Favorite {Product} is Back',
          'Another Great Deal for Loyal Customers'
        ]
      },
      potentialLoyalists: {
        tone: 'encouraging',
        focus: 'value demonstration',
        approach: 'build loyalty',
        keywords: ['discover', 'explore', 'more', 'next', 'continue'],
        ctaStyle: 'educational',
        emotionalTrigger: 'curiosity',
        examples: [
          'Discover What Else We Offer',
          'See Why Customers Keep Coming Back',
          'Explore Our Full Range'
        ]
      },
      recentCustomers: {
        tone: 'welcoming',
        focus: 'second purchase',
        approach: 'convert to repeat',
        keywords: ['welcome', 'first', 'new', 'starter', 'begin'],
        ctaStyle: 'gentle nudge',
        emotionalTrigger: 'excitement',
        examples: [
          'Welcome! Here\'s Your Next Great Find',
          'New Customer Special: 15% Off',
          'Continue Your Journey With Us'
        ]
      },
      promisingCustomers: {
        tone: 'enthusiastic',
        focus: 'frequency increase',
        approach: 'encourage repeat',
        keywords: ['trending', 'popular', 'best-seller', 'must-have', 'hot'],
        ctaStyle: 'social proof',
        emotionalTrigger: 'FOMO',
        examples: [
          'Trending Now: What Everyone\'s Buying',
          'Don\'t Miss Our Most Popular Items',
          'Join Thousands of Happy Customers'
        ]
      },
      needsAttention: {
        tone: 'concerned',
        focus: 're-engagement',
        approach: 'win back',
        keywords: ['miss', 'back', 'return', 'again', 'remember'],
        ctaStyle: 'incentive-based',
        emotionalTrigger: 'nostalgia',
        examples: [
          'We Miss You! Come Back for 20% Off',
          'It\'s Been a While - Special Offer Inside',
          'Remember Why You Loved Us'
        ]
      },
      aboutToSleep: {
        tone: 'urgent',
        focus: 'immediate action',
        approach: 'prevent churn',
        keywords: ['now', 'today', 'limited', 'last chance', 'hurry'],
        ctaStyle: 'urgent',
        emotionalTrigger: 'urgency',
        examples: [
          'Last Chance: Don\'t Let This Slip Away',
          'Act Now - Limited Time Offer',
          'Today Only: Special Comeback Deal'
        ]
      },
      atRisk: {
        tone: 'empathetic',
        focus: 'value reminder',
        approach: 'retention',
        keywords: ['value', 'special', 'just for you', 'exclusive', 'save'],
        ctaStyle: 'high incentive',
        emotionalTrigger: 'regret avoidance',
        examples: [
          'Special Offer Just for You - 30% Off',
          'We Value Your Business - Here\'s Proof',
          'Your Exclusive Comeback Bonus'
        ]
      },
      cantLoseThem: {
        tone: 'desperate',
        focus: 'save relationship',
        approach: 'maximum effort',
        keywords: ['please', 'one more', 'final', 'biggest', 'best ever'],
        ctaStyle: 'maximum incentive',
        emotionalTrigger: 'loss aversion',
        examples: [
          'Our Biggest Offer Ever - Just for You',
          'One Last Chance: 40% Off Everything',
          'Please Come Back - We\'ve Improved'
        ]
      },
      hibernating: {
        tone: 'tempting',
        focus: 'reactivation',
        approach: 'win back with value',
        keywords: ['new', 'improved', 'changed', 'better', 'fresh'],
        ctaStyle: 'curiosity + incentive',
        emotionalTrigger: 'curiosity',
        examples: [
          'See What\'s New Since You Left',
          'We\'ve Changed - Come See',
          'Fresh Start: 25% Welcome Back'
        ]
      },
      lost: {
        tone: 'final attempt',
        focus: 'last touch',
        approach: 'hail mary',
        keywords: ['goodbye', 'final', 'last', 'one more', 'please'],
        ctaStyle: 'last resort',
        emotionalTrigger: 'guilt',
        examples: [
          'Before You Go: One Final Offer',
          'Last Call: 50% Off Everything',
          'Goodbye Gift - No Strings Attached'
        ]
      }
    };

    // Time-of-day messaging
    this.timeAdaptations = {
      earlyMorning: { // 6am-9am
        tone: 'energetic',
        focus: 'start your day',
        keywords: ['morning', 'start', 'begin', 'fresh', 'new day'],
        examples: [
          'Start Your Day Right',
          'Morning Special - Fresh Deals',
          'Wake Up to Savings'
        ]
      },
      midMorning: { // 9am-12pm
        tone: 'productive',
        focus: 'get things done',
        keywords: ['quick', 'easy', 'efficient', 'smart', 'productive'],
        examples: [
          'Quick Solution for Busy Mornings',
          'Get It Done Today',
          'Smart Shopping in Minutes'
        ]
      },
      lunchtime: { // 12pm-2pm
        tone: 'casual',
        focus: 'lunch break',
        keywords: ['break', 'lunch', 'quick', 'while you eat', 'midday'],
        examples: [
          'Lunch Break Deal',
          'Shop Quick During Lunch',
          'Midday Special Offer'
        ]
      },
      afternoon: { // 2pm-5pm
        tone: 'steady',
        focus: 'power through',
        keywords: ['afternoon', 'keep going', 'almost there', 'finish strong'],
        examples: [
          'Afternoon Pick-Me-Up',
          'Power Through With This Deal',
          'Finish Your Day Right'
        ]
      },
      evening: { // 5pm-9pm
        tone: 'relaxed',
        focus: 'unwind',
        keywords: ['evening', 'relax', 'unwind', 'end your day', 'tonight'],
        examples: [
          'Unwind With Evening Savings',
          'Tonight Only Special',
          'End Your Day With a Deal'
        ]
      },
      lateEvening: { // 9pm-12am
        tone: 'intimate',
        focus: 'late night',
        keywords: ['tonight', 'late night', 'midnight', 'while you can', 'before bed'],
        examples: [
          'Late Night Deal - Ending Soon',
          'Midnight Special',
          'Before You Sleep - Check This Out'
        ]
      }
    };

    // Day-of-week messaging
    this.dayAdaptations = {
      monday: {
        tone: 'motivational',
        keywords: ['new week', 'fresh start', 'monday', 'begin'],
        examples: ['New Week, New Deals', 'Monday Motivation Sale']
      },
      tuesday: {
        tone: 'steady',
        keywords: ['tuesday', 'midweek prep', 'getting there'],
        examples: ['Tuesday Special', 'Keep the Week Going']
      },
      wednesday: {
        tone: 'encouraging',
        keywords: ['hump day', 'halfway', 'wednesday'],
        examples: ['Hump Day Deals', 'Halfway There Sale']
      },
      thursday: {
        tone: 'anticipatory',
        keywords: ['almost weekend', 'thursday', 'one more day'],
        examples: ['Almost Weekend Sale', 'Thursday Thrill']
      },
      friday: {
        tone: 'excited',
        keywords: ['friday', 'weekend', 'celebrate', 'TGIF'],
        examples: ['TGIF Sale', 'Weekend Starts Now', 'Friday Fever']
      },
      saturday: {
        tone: 'leisurely',
        keywords: ['saturday', 'weekend', 'enjoy', 'relax'],
        examples: ['Saturday Special', 'Weekend Warrior Deals']
      },
      sunday: {
        tone: 'peaceful',
        keywords: ['sunday', 'rest', 'recharge', 'prepare'],
        examples: ['Sunday Savings', 'Prepare for the Week']
      }
    };

    // Urgency and scarcity templates
    this.urgencyTemplates = {
      time: [
        'Only {n} Hours Left',
        'Ending at {time}',
        'Today Only',
        'Last Chance',
        'Expires {time}',
        '{n} Hours Remaining'
      ],
      quantity: [
        'Only {n} Left',
        'Almost Sold Out',
        '{n} Remaining',
        'Low Stock Alert',
        'Limited Quantity',
        'Few Items Left'
      ],
      demand: [
        '{n} People Viewing',
        'High Demand Item',
        'Trending Now',
        'Selling Fast',
        '{n} Bought Today',
        'Popular Item'
      ]
    };

    // Regional/location adaptations
    this.regionalAdaptations = {
      US: {
        currency: '$',
        dateFormat: 'MM/DD/YYYY',
        keywords: ['nationwide', 'across America', 'US-wide'],
        holidays: ['Memorial Day', 'July 4th', 'Labor Day', 'Thanksgiving', 'Black Friday']
      },
      UK: {
        currency: '£',
        dateFormat: 'DD/MM/YYYY',
        keywords: ['nationwide', 'across the UK', 'UK-wide'],
        holidays: ['Boxing Day', 'Bank Holiday', 'Spring Sale']
      },
      CA: {
        currency: '$',
        dateFormat: 'YYYY-MM-DD',
        keywords: ['coast to coast', 'across Canada', 'Canada-wide'],
        holidays: ['Canada Day', 'Victoria Day', 'Thanksgiving']
      }
    };

    // Performance metrics
    this.metrics = {
      adaptationsGenerated: 0,
      bySegment: {},
      byTime: {},
      byEmotion: {},
      avgGenerationTime: 0
    };

    console.log('🎯 Message Adapter Service initialized');
  }

  /**
   * Adapt message for specific segment
   * @param {string} segment - Customer segment
   * @param {object} baseMessage - Base message to adapt
   * @param {object} options - Adaptation options
   * @returns {Promise<object>} Adapted message
   */
  async adaptForSegment(segment, baseMessage, options = {}) {
    const startTime = Date.now();

    logger.info('Adapting message for segment', { segment });

    try {
      const strategy = this.segmentStrategies[segment] || this.segmentStrategies.recentCustomers;

      const adapted = {
        segment,
        strategy,
        original: baseMessage,
        adapted: await this._applySegmentStrategy(baseMessage, strategy, options)
      };

      // Update metrics
      this.metrics.adaptationsGenerated++;
      this.metrics.bySegment[segment] = (this.metrics.bySegment[segment] || 0) + 1;
      this._updateAvgTime(Date.now() - startTime);

      return adapted;

    } catch (error) {
      logger.error('Failed to adapt message for segment', {
        segment,
        error: error.message
      });
      return {
        segment,
        original: baseMessage,
        adapted: baseMessage,
        error: error.message
      };
    }
  }

  /**
   * Adapt message for time of day
   * @param {object} baseMessage - Base message
   * @param {object} options - Time options
   * @returns {Promise<object>} Time-adapted message
   */
  async adaptForTime(baseMessage, options = {}) {
    const { hour, day } = options;

    const currentHour = hour || new Date().getHours();
    const currentDay = day || new Date().getDay();

    logger.info('Adapting message for time', { hour: currentHour, day: currentDay });

    try {
      // Get time period
      const timePeriod = this._getTimePeriod(currentHour);
      const timeContext = this.timeAdaptations[timePeriod];

      // Get day context
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayContext = this.dayAdaptations[dayNames[currentDay]];

      const adapted = await this._applyTimeContext(baseMessage, {
        time: timeContext,
        day: dayContext,
        hour: currentHour
      });

      // Update metrics
      this.metrics.byTime[timePeriod] = (this.metrics.byTime[timePeriod] || 0) + 1;

      return {
        timePeriod,
        hour: currentHour,
        day: dayNames[currentDay],
        original: baseMessage,
        adapted,
        timeContext,
        dayContext
      };

    } catch (error) {
      logger.error('Failed to adapt message for time', {
        hour: currentHour,
        error: error.message
      });
      return {
        original: baseMessage,
        adapted: baseMessage,
        error: error.message
      };
    }
  }

  /**
   * Add urgency messaging
   * @param {object} baseMessage - Base message
   * @param {string} urgencyType - Type: 'time', 'quantity', 'demand'
   * @param {object} params - Parameters (n, time, etc.)
   * @returns {object} Message with urgency
   */
  addUrgency(baseMessage, urgencyType = 'time', params = {}) {
    try {
      const templates = this.urgencyTemplates[urgencyType] || this.urgencyTemplates.time;
      const template = templates[Math.floor(Math.random() * templates.length)];

      // Replace placeholders
      let urgencyText = template;
      Object.keys(params).forEach(key => {
        urgencyText = urgencyText.replace(`{${key}}`, params[key]);
      });

      // Add urgency to headlines
      const urgentHeadlines = (baseMessage.headlines || []).map(h => {
        if (h.length + urgencyText.length + 3 <= 30) {
          return `${urgencyText} - ${h}`.substring(0, 30);
        }
        return urgencyText.substring(0, 30);
      });

      // Add urgency to descriptions
      const urgentDescriptions = (baseMessage.descriptions || []).map(d => {
        if (d.length + urgencyText.length + 2 <= 90) {
          return `${urgencyText}. ${d}`.substring(0, 90);
        }
        return d;
      });

      return {
        headlines: urgentHeadlines,
        descriptions: urgentDescriptions,
        urgencyType,
        urgencyText
      };

    } catch (error) {
      logger.error('Failed to add urgency', {
        urgencyType,
        error: error.message
      });
      return baseMessage;
    }
  }

  /**
   * Add scarcity messaging
   * @param {object} baseMessage - Base message
   * @param {object} scarcityData - Scarcity information
   * @returns {object} Message with scarcity
   */
  addScarcity(baseMessage, scarcityData = {}) {
    const { remaining, total, percentRemaining } = scarcityData;

    try {
      let scarcityText;

      if (remaining) {
        if (remaining <= 5) {
          scarcityText = `Only ${remaining} Left`;
        } else if (remaining <= 20) {
          scarcityText = `Low Stock: ${remaining} Left`;
        } else if (percentRemaining && percentRemaining <= 20) {
          scarcityText = 'Almost Gone';
        }
      }

      if (!scarcityText) {
        scarcityText = 'Limited Availability';
      }

      // Apply to messages
      const scarcityHeadlines = (baseMessage.headlines || []).map(h => {
        if (h.length + scarcityText.length + 3 <= 30) {
          return `${scarcityText} - ${h}`.substring(0, 30);
        }
        return h;
      });

      return {
        headlines: scarcityHeadlines,
        descriptions: baseMessage.descriptions,
        scarcityText,
        scarcityData
      };

    } catch (error) {
      logger.error('Failed to add scarcity', {
        error: error.message
      });
      return baseMessage;
    }
  }

  /**
   * Localize message for region
   * @param {object} baseMessage - Base message
   * @param {string} region - Region code (US, UK, CA, etc.)
   * @returns {object} Localized message
   */
  localizeForRegion(baseMessage, region = 'US') {
    try {
      const regional = this.regionalAdaptations[region] || this.regionalAdaptations.US;

      // Update currency symbols
      const localizedHeadlines = (baseMessage.headlines || []).map(h =>
        h.replace(/\$/g, regional.currency)
      );

      const localizedDescriptions = (baseMessage.descriptions || []).map(d =>
        d.replace(/\$/g, regional.currency)
      );

      return {
        headlines: localizedHeadlines,
        descriptions: localizedDescriptions,
        region,
        currency: regional.currency,
        dateFormat: regional.dateFormat
      };

    } catch (error) {
      logger.error('Failed to localize message', {
        region,
        error: error.message
      });
      return baseMessage;
    }
  }

  /**
   * Create emotional variation
   * @param {object} baseMessage - Base message
   * @param {string} emotion - Emotion type
   * @returns {Promise<object>} Emotional variant
   */
  async createEmotionalVariation(baseMessage, emotion) {
    const emotionalKeywords = {
      excitement: ['amazing', 'incredible', 'wow', 'exciting', 'fantastic'],
      trust: ['proven', 'trusted', 'reliable', 'guaranteed', 'certified'],
      urgency: ['now', 'today', 'hurry', 'fast', 'quick'],
      curiosity: ['discover', 'explore', 'find out', 'see', 'reveal'],
      belonging: ['join', 'member', 'community', 'exclusive', 'insider'],
      security: ['safe', 'secure', 'protected', 'guaranteed', 'risk-free']
    };

    const keywords = emotionalKeywords[emotion] || emotionalKeywords.trust;

    try {
      const prompt = `Enhance these ad messages with ${emotion} emotional triggers:

Headlines: ${(baseMessage.headlines || []).join(', ')}
Descriptions: ${(baseMessage.descriptions || []).join(', ')}

Use these keywords naturally: ${keywords.join(', ')}

Keep character limits: 30 for headlines, 90 for descriptions.

Return JSON:
{
  "headlines": [...],
  "descriptions": [...]
}`;

      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      // Update metrics
      this.metrics.byEmotion[emotion] = (this.metrics.byEmotion[emotion] || 0) + 1;

      return {
        headlines: (response.headlines || []).filter(h => h.length <= 30),
        descriptions: (response.descriptions || []).filter(d => d.length <= 90),
        emotion,
        keywords
      };

    } catch (error) {
      logger.error('Failed to create emotional variation', {
        emotion,
        error: error.message
      });
      return baseMessage;
    }
  }

  /**
   * Generate complete adaptive message set
   * @param {string} tenantId - Tenant identifier
   * @param {object} baseMessage - Base message
   * @param {object} options - Generation options
   * @returns {Promise<object>} Complete adaptive message set
   */
  async generateAdaptiveMessageSet(tenantId, baseMessage, options = {}) {
    const startTime = Date.now();

    logger.info('Generating adaptive message set', { tenantId });

    try {
      // Get customer segments
      const segmentation = await customerSegmentation.segmentCustomers(tenantId, {
        refreshCache: false
      });

      // Generate segment variations
      const segmentVariations = {};
      const topSegments = Object.keys(segmentation.rfmSegments || {}).slice(0, 5);

      for (const segment of topSegments) {
        if (this.segmentStrategies[segment]) {
          segmentVariations[segment] = await this.adaptForSegment(segment, baseMessage, options);
        }
      }

      // Generate time variations
      const timeVariations = {};
      const timePeriods = ['earlyMorning', 'midMorning', 'afternoon', 'evening'];

      for (const period of timePeriods) {
        const mockHour = this._getMockHourForPeriod(period);
        timeVariations[period] = await this.adaptForTime(baseMessage, { hour: mockHour });
      }

      // Generate emotional variations
      const emotions = ['excitement', 'trust', 'urgency'];
      const emotionalVariations = {};

      for (const emotion of emotions) {
        emotionalVariations[emotion] = await this.createEmotionalVariation(baseMessage, emotion);
      }

      // Generate urgency variations
      const urgencyVariations = {
        time: this.addUrgency(baseMessage, 'time', { n: 24, time: 'midnight' }),
        quantity: this.addUrgency(baseMessage, 'quantity', { n: 10 }),
        demand: this.addUrgency(baseMessage, 'demand', { n: 50 })
      };

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        tenantId,
        base: baseMessage,

        variations: {
          bySegment: segmentVariations,
          byTime: timeVariations,
          byEmotion: emotionalVariations,
          byUrgency: urgencyVariations
        },

        metadata: {
          generatedAt: new Date().toISOString(),
          totalVariations: Object.keys(segmentVariations).length +
                          Object.keys(timeVariations).length +
                          Object.keys(emotionalVariations).length,
          generationTime: totalTime
        },

        recommendations: this._generateAdaptiveRecommendations({
          segmentation,
          segmentVariations,
          timeVariations
        })
      };

    } catch (error) {
      logger.error('Failed to generate adaptive message set', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * =====================================
   * PRIVATE HELPER METHODS
   * =====================================
   */

  async _applySegmentStrategy(baseMessage, strategy, options) {
    const prompt = `Adapt this ad copy for ${strategy.tone} tone, focusing on ${strategy.focus}:

Original Headlines: ${(baseMessage.headlines || []).join(', ')}
Original Descriptions: ${(baseMessage.descriptions || []).join(', ')}

Strategy:
- Tone: ${strategy.tone}
- Focus: ${strategy.focus}
- Approach: ${strategy.approach}
- Keywords: ${strategy.keywords.join(', ')}
- CTA Style: ${strategy.ctaStyle}
- Emotional Trigger: ${strategy.emotionalTrigger}

Examples:
${strategy.examples.join('\n')}

Create adapted versions maintaining 30/90 character limits.

Return JSON:
{
  "headlines": [...],
  "descriptions": [...]
}`;

    try {
      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      return {
        headlines: (response.headlines || []).filter(h => h.length <= 30),
        descriptions: (response.descriptions || []).filter(d => d.length <= 90),
        strategy
      };

    } catch (error) {
      return {
        headlines: baseMessage.headlines,
        descriptions: baseMessage.descriptions,
        strategy,
        error: error.message
      };
    }
  }

  async _applyTimeContext(baseMessage, context) {
    const { time, day } = context;

    const timeKeywords = time.keywords.join(', ');
    const dayKeywords = day.keywords.join(', ');

    const prompt = `Adapt this ad copy for ${time.focus} (${time.tone} tone):

Original: ${JSON.stringify(baseMessage)}

Time Context: ${time.focus}
Time Keywords: ${timeKeywords}
Day Context: ${day.tone}
Day Keywords: ${dayKeywords}

Create time-appropriate versions. Keep 30/90 character limits.

Return JSON:
{
  "headlines": [...],
  "descriptions": [...]
}`;

    try {
      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      return {
        headlines: (response.headlines || []).filter(h => h.length <= 30),
        descriptions: (response.descriptions || []).filter(d => d.length <= 90)
      };

    } catch (error) {
      return baseMessage;
    }
  }

  _getTimePeriod(hour) {
    if (hour >= 6 && hour < 9) return 'earlyMorning';
    if (hour >= 9 && hour < 12) return 'midMorning';
    if (hour >= 12 && hour < 14) return 'lunchtime';
    if (hour >= 14 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'lateEvening';
  }

  _getMockHourForPeriod(period) {
    const mockHours = {
      earlyMorning: 7,
      midMorning: 10,
      lunchtime: 13,
      afternoon: 15,
      evening: 19,
      lateEvening: 22
    };
    return mockHours[period] || 12;
  }

  _generateAdaptiveRecommendations(data) {
    const recommendations = [];

    // Segment recommendations
    if (data.segmentation && data.segmentation.topSegments) {
      const topSegment = data.segmentation.topSegments[0];
      if (topSegment) {
        recommendations.push({
          priority: 'high',
          type: 'segmentation',
          message: `Use ${topSegment.segment}-adapted copy for ${topSegment.customerCount} customers`,
          action: 'Implement segment-based ad groups'
        });
      }
    }

    // Time recommendations
    if (data.timeVariations && Object.keys(data.timeVariations).length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'time-adaptation',
        message: 'Time-based variations available',
        action: 'Implement ad scheduling with time-specific copy'
      });
    }

    return recommendations;
  }

  _updateAvgTime(time) {
    const count = this.metrics.adaptationsGenerated;
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
      topSegments: Object.entries(this.metrics.bySegment)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([segment, count]) => ({ segment, count })),
      topTimeSlots: Object.entries(this.metrics.byTime)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([time, count]) => ({ time, count }))
    };
  }
}

// Export singleton instance
let messageAdapterInstance = null;

/**
 * Get singleton instance
 */
export function getMessageAdapter() {
  if (!messageAdapterInstance) {
    messageAdapterInstance = new MessageAdapterService();
  }
  return messageAdapterInstance;
}

export default getMessageAdapter;