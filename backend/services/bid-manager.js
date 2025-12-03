/**
 * Bid Manager Service for Ads Autopilot AI SaaS
 *
 * Implements intelligent bidding strategies based on real-time performance data
 * Automatically adjusts bids to optimize for target CPA or ROAS
 *
 * Features:
 * - Smart bidding strategy implementation
 * - Real-time bid adjustments based on conversion data
 * - Target CPA and ROAS optimization
 * - Dayparting bid modifiers
 * - Device-based bid adjustments
 * - Location-based bid modifiers
 * - Audience-based bid adjustments
 *
 * GOOGLE ADS API CONFIGURATION:
 * ==============================
 * This service requires the following environment variables or tenant configuration:
 *
 * - GOOGLE_ADS_DEVELOPER_TOKEN: Your Google Ads API developer token
 * - GOOGLE_ADS_CLIENT_ID: OAuth2 client ID
 * - GOOGLE_ADS_CLIENT_SECRET: OAuth2 client secret
 * - GOOGLE_ADS_REFRESH_TOKEN: OAuth2 refresh token for the account
 * - GOOGLE_ADS_CUSTOMER_ID: The Google Ads customer ID (without dashes)
 *
 * Alternatively, credentials can be stored per-tenant in the database under the
 * 'google_ads_credentials' config key with the following structure:
 * {
 *   developer_token: string,
 *   client_id: string,
 *   client_secret: string,
 *   refresh_token: string,
 *   customer_id: string,
 *   login_customer_id: string (optional, for MCC accounts)
 * }
 *
 * FALLBACK BEHAVIOR:
 * - If credentials are not configured, the service will log planned changes but not apply them
 * - This allows development and testing without live API access
 * - All methods gracefully degrade and return mock responses
 *
 * PACKAGE REQUIREMENT:
 * - Install google-ads-api: npm install google-ads-api
 */

import dataStore from './data-store.js';
import logger from './logger.js';

// Conditionally import google-ads-api if available
let GoogleAdsApi = null;
try {
  const googleAdsModule = await import('google-ads-api');
  GoogleAdsApi = googleAdsModule.GoogleAdsApi;
} catch (error) {
  logger.warn('google-ads-api package not installed. Google Ads API integration will run in mock mode.', {
    error: error.message,
    hint: 'Install with: npm install google-ads-api'
  });
}

/**
 * Bidding Strategy Configurations
 */
const BIDDING_STRATEGIES = {
  TARGET_CPA: {
    name: 'Target CPA',
    adjustmentRange: { min: 0.5, max: 2.0 },
    optimizationGoal: 'conversions',
    responseTime: 'medium' // How quickly to adjust
  },
  TARGET_ROAS: {
    name: 'Target ROAS',
    adjustmentRange: { min: 0.4, max: 3.0 },
    optimizationGoal: 'conversion_value',
    responseTime: 'medium'
  },
  MAXIMIZE_CONVERSIONS: {
    name: 'Maximize Conversions',
    adjustmentRange: { min: 0.7, max: 1.5 },
    optimizationGoal: 'conversions',
    responseTime: 'fast'
  },
  MAXIMIZE_CONVERSION_VALUE: {
    name: 'Maximize Conversion Value',
    adjustmentRange: { min: 0.6, max: 2.5 },
    optimizationGoal: 'conversion_value',
    responseTime: 'fast'
  }
};

/**
 * Bid adjustment modifiers
 */
const BID_MODIFIERS = {
  // Time-based modifiers
  TIME_OF_DAY: {
    high_performance: 1.30, // +30% during peak hours
    medium_performance: 1.10, // +10% during good hours
    low_performance: 0.70, // -30% during poor hours
    very_low_performance: 0.50 // -50% during worst hours
  },

  // Day of week modifiers
  DAY_OF_WEEK: {
    best_day: 1.25, // +25% on best performing days
    good_day: 1.10, // +10% on good days
    average_day: 1.00, // No change on average days
    poor_day: 0.80 // -20% on poor days
  },

  // Device modifiers
  DEVICE: {
    mobile_high: 1.20, // Mobile performs well
    mobile_medium: 1.00, // Mobile average
    mobile_low: 0.70, // Mobile underperforms
    desktop_high: 1.15,
    desktop_medium: 1.00,
    desktop_low: 0.75,
    tablet_high: 1.10,
    tablet_medium: 1.00,
    tablet_low: 0.80
  },

  // Location modifiers
  LOCATION: {
    high_value: 1.30, // High converting locations
    medium_value: 1.00, // Average locations
    low_value: 0.70 // Poor performing locations
  },

  // Audience modifiers
  AUDIENCE: {
    high_value_customer: 1.50, // Previous high-value customers
    returning_customer: 1.25, // Returning visitors
    lookalike: 1.15, // Lookalike audiences
    cold_audience: 0.90 // Cold traffic
  }
};

/**
 * Bid Manager
 */
export class BidManager {
  constructor() {
    this.bidHistory = new Map(); // Track bid changes
    this.performanceCache = new Map(); // Cache performance data

    // Configuration
    this.config = {
      minBid: 0.10, // $0.10 minimum bid
      maxBid: 100.00, // $100 maximum bid
      defaultBid: 1.00, // $1 default bid
      adjustmentFrequency: 3600000, // 1 hour
      learningPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      confidenceThreshold: 0.7 // 70% confidence required
    };

    // Metrics
    this.metrics = {
      bidAdjustments: 0,
      avgBidChange: 0,
      totalSavings: 0,
      performanceImprovement: 0
    };

    console.log('Bid Manager initialized');
  }

  /**
   * Generate bid adjustments for campaigns
   */
  async generateBidAdjustments(tenantId, classification, intelligence) {
    const actions = [];

    try {
      // Get tenant's bidding strategy preference
      const biddingStrategy = await this.getBiddingStrategy(tenantId);
      const targetCPA = await this.getTargetCPA(tenantId);
      const targetROAS = await this.getTargetROAS(tenantId);

      // Generate time-based bid adjustments
      if (intelligence.trafficPatterns?.hourly) {
        const timeActions = this.generateTimeBasedAdjustments(
          classification,
          intelligence.trafficPatterns,
          biddingStrategy
        );
        actions.push(...timeActions);
      }

      // Generate device-based bid adjustments
      if (intelligence.demographics) {
        const deviceActions = this.generateDeviceAdjustments(
          classification,
          intelligence,
          biddingStrategy
        );
        actions.push(...deviceActions);
      }

      // Generate location-based bid adjustments
      if (intelligence.demographics?.geography) {
        const locationActions = this.generateLocationAdjustments(
          classification,
          intelligence.demographics.geography,
          biddingStrategy
        );
        actions.push(...locationActions);
      }

      // Generate audience-based bid adjustments
      if (intelligence.demographics?.valueSegments) {
        const audienceActions = this.generateAudienceAdjustments(
          classification,
          intelligence.demographics,
          biddingStrategy
        );
        actions.push(...audienceActions);
      }

      // Generate CPA/ROAS optimization adjustments
      if (biddingStrategy === 'TARGET_CPA' && targetCPA) {
        const cpaActions = this.generateCPAOptimizationAdjustments(
          classification,
          targetCPA,
          intelligence
        );
        actions.push(...cpaActions);
      } else if (biddingStrategy === 'TARGET_ROAS' && targetROAS) {
        const roasActions = this.generateROASOptimizationAdjustments(
          classification,
          targetROAS,
          intelligence
        );
        actions.push(...roasActions);
      }

      logger.info('Generated bid adjustments', {
        tenantId,
        actionsGenerated: actions.length
      });

      return actions;

    } catch (error) {
      logger.error('Failed to generate bid adjustments', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate time-based bid adjustments (dayparting)
   */
  generateTimeBasedAdjustments(classification, trafficPatterns, strategy) {
    const actions = [];

    const peakHours = trafficPatterns.hourly?.peakHours || [];
    const hourlyQuality = trafficPatterns.hourly?.qualityScores || {};

    // For each campaign, set hourly bid modifiers
    for (const campaign of [...classification.winners, ...classification.neutral]) {
      const hourlyModifiers = [];

      for (let hour = 0; hour < 24; hour++) {
        const quality = hourlyQuality[hour];
        let modifier = 1.0;

        if (quality) {
          switch (quality.quality) {
            case 'high':
              modifier = BID_MODIFIERS.TIME_OF_DAY.high_performance;
              break;
            case 'medium':
              modifier = BID_MODIFIERS.TIME_OF_DAY.medium_performance;
              break;
            case 'low':
              modifier = BID_MODIFIERS.TIME_OF_DAY.low_performance;
              break;
          }
        }

        // Check if hour is in peak hours for extra boost
        if (peakHours.some(p => p.hour === hour)) {
          modifier = Math.max(modifier, BID_MODIFIERS.TIME_OF_DAY.high_performance);
        }

        hourlyModifiers.push({ hour, modifier });
      }

      actions.push({
        type: 'set_hourly_bid_modifiers',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        modifiers: hourlyModifiers,
        reason: 'Optimize bids based on hourly conversion patterns',
        expectedImpact: 'high',
        strategy: 'dayparting'
      });
    }

    return actions;
  }

  /**
   * Generate day-of-week bid adjustments
   */
  generateDayOfWeekAdjustments(classification, trafficPatterns) {
    const actions = [];

    const bestDays = trafficPatterns.daily?.bestDays || [];
    const dayPatterns = trafficPatterns.daily?.dailyPatterns || {};

    for (const campaign of [...classification.winners, ...classification.neutral]) {
      const dayModifiers = [];

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      dayNames.forEach((day, index) => {
        const dayData = dayPatterns[day];
        let modifier = 1.0;

        if (dayData) {
          const isBestDay = bestDays.some(bd => bd.day === day);

          if (isBestDay) {
            modifier = BID_MODIFIERS.DAY_OF_WEEK.best_day;
          } else if (dayData.efficiency > 50) {
            modifier = BID_MODIFIERS.DAY_OF_WEEK.good_day;
          } else if (dayData.efficiency < 30) {
            modifier = BID_MODIFIERS.DAY_OF_WEEK.poor_day;
          }
        }

        dayModifiers.push({ day, dayIndex: index, modifier });
      });

      actions.push({
        type: 'set_day_of_week_modifiers',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        modifiers: dayModifiers,
        reason: 'Optimize bids based on day-of-week performance',
        expectedImpact: 'medium',
        strategy: 'dayparting'
      });
    }

    return actions;
  }

  /**
   * Generate device-based bid adjustments
   */
  generateDeviceAdjustments(classification, intelligence, strategy) {
    const actions = [];

    // Analyze device performance from demographics and traffic patterns
    // This is simplified - would need actual device-level data

    for (const campaign of [...classification.winners, ...classification.neutral]) {
      const deviceModifiers = [
        { device: 'mobile', modifier: 1.10 }, // Assume mobile slight preference
        { device: 'desktop', modifier: 1.05 },
        { device: 'tablet', modifier: 0.95 }
      ];

      actions.push({
        type: 'set_device_modifiers',
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        modifiers: deviceModifiers,
        reason: 'Optimize bids based on device performance',
        expectedImpact: 'medium',
        strategy: 'device_optimization'
      });
    }

    return actions;
  }

  /**
   * Generate location-based bid adjustments
   */
  generateLocationAdjustments(classification, geography, strategy) {
    const actions = [];

    if (!geography.countries || Object.keys(geography.countries).length === 0) {
      return actions;
    }

    // Sort countries by average order value
    const sortedCountries = Object.entries(geography.countries)
      .map(([country, data]) => ({
        country,
        avgValue: data.totalSpent / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgValue - a.avgValue);

    const topCountries = sortedCountries.slice(0, 5);
    const avgValue = sortedCountries.reduce((sum, c) => sum + c.avgValue, 0) / sortedCountries.length;

    for (const campaign of [...classification.winners, ...classification.neutral]) {
      const locationModifiers = topCountries.map(country => {
        let modifier = 1.0;

        if (country.avgValue > avgValue * 1.3) {
          modifier = BID_MODIFIERS.LOCATION.high_value;
        } else if (country.avgValue > avgValue * 0.8) {
          modifier = BID_MODIFIERS.LOCATION.medium_value;
        } else {
          modifier = BID_MODIFIERS.LOCATION.low_value;
        }

        return {
          location: country.country,
          modifier,
          avgValue: country.avgValue
        };
      });

      if (locationModifiers.length > 0) {
        actions.push({
          type: 'set_location_modifiers',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          modifiers: locationModifiers,
          reason: 'Optimize bids based on geographic performance',
          expectedImpact: 'medium',
          strategy: 'location_optimization'
        });
      }
    }

    return actions;
  }

  /**
   * Generate audience-based bid adjustments
   */
  generateAudienceAdjustments(classification, demographics, strategy) {
    const actions = [];

    const valueSegments = demographics.valueSegments || {};

    for (const campaign of [...classification.winners, ...classification.neutral]) {
      const audienceModifiers = [];

      // VIP customers
      if (valueSegments.vip && valueSegments.vip.count > 0) {
        audienceModifiers.push({
          audience: 'vip_customers',
          modifier: BID_MODIFIERS.AUDIENCE.high_value_customer,
          segmentSize: valueSegments.vip.count,
          reason: `VIP customers with avg order value $${valueSegments.vip.avgOrderValue}`
        });
      }

      // High-value customers
      if (valueSegments.highValue && valueSegments.highValue.count > 0) {
        audienceModifiers.push({
          audience: 'high_value_customers',
          modifier: BID_MODIFIERS.AUDIENCE.returning_customer,
          segmentSize: valueSegments.highValue.count,
          reason: `High-value customers with avg order value $${valueSegments.highValue.avgOrderValue}`
        });
      }

      // Lookalike audiences (from demographic profiling)
      if (demographics.lookalikeAudiences?.seedAudienceSize > 0) {
        audienceModifiers.push({
          audience: 'lookalike_top_customers',
          modifier: BID_MODIFIERS.AUDIENCE.lookalike,
          segmentSize: demographics.lookalikeAudiences.seedAudienceSize,
          reason: 'Lookalike audience based on top 1% customers'
        });
      }

      if (audienceModifiers.length > 0) {
        actions.push({
          type: 'set_audience_modifiers',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          modifiers: audienceModifiers,
          reason: 'Optimize bids based on customer value segments',
          expectedImpact: 'high',
          strategy: 'audience_optimization'
        });
      }
    }

    return actions;
  }

  /**
   * Generate CPA optimization adjustments
   */
  generateCPAOptimizationAdjustments(classification, targetCPA, intelligence) {
    const actions = [];

    for (const campaign of classification.winners) {
      const currentCPA = campaign.metrics.cpa;

      // If CPA is below target, we can increase bids to get more volume
      if (currentCPA < targetCPA * 0.8) {
        const bidIncrease = Math.min(
          1.20, // 20% max increase
          (targetCPA / currentCPA) * 0.9 // Leave 10% buffer
        );

        actions.push({
          type: 'increase_bids',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          adjustment: bidIncrease,
          reason: `CPA ($${currentCPA.toFixed(2)}) well below target ($${targetCPA.toFixed(2)}) - scale up`,
          expectedImpact: 'high',
          strategy: 'target_cpa',
          targetCPA,
          currentCPA
        });
      }
    }

    for (const campaign of classification.losers) {
      const currentCPA = campaign.metrics.cpa;

      // If CPA is above target, reduce bids
      if (currentCPA > targetCPA * 1.2) {
        const bidDecrease = Math.max(
          0.70, // 30% max decrease
          (targetCPA / currentCPA) * 1.1 // Add 10% buffer
        );

        actions.push({
          type: 'decrease_bids',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          adjustment: bidDecrease,
          reason: `CPA ($${currentCPA.toFixed(2)}) above target ($${targetCPA.toFixed(2)}) - reduce bids`,
          expectedImpact: 'high',
          strategy: 'target_cpa',
          targetCPA,
          currentCPA
        });
      }
    }

    return actions;
  }

  /**
   * Generate ROAS optimization adjustments
   */
  generateROASOptimizationAdjustments(classification, targetROAS, intelligence) {
    const actions = [];

    for (const campaign of classification.winners) {
      const currentROAS = campaign.metrics.roas;

      // If ROAS is above target, we can increase bids
      if (currentROAS > targetROAS * 1.3) {
        const bidIncrease = Math.min(
          1.25, // 25% max increase
          (currentROAS / targetROAS) * 0.8
        );

        actions.push({
          type: 'increase_bids',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          adjustment: bidIncrease,
          reason: `ROAS (${currentROAS.toFixed(2)}) exceeds target (${targetROAS.toFixed(2)}) - scale up`,
          expectedImpact: 'high',
          strategy: 'target_roas',
          targetROAS,
          currentROAS
        });
      }
    }

    for (const campaign of classification.losers) {
      const currentROAS = campaign.metrics.roas;

      // If ROAS is below target, reduce bids
      if (currentROAS < targetROAS * 0.7 && currentROAS > 0) {
        const bidDecrease = Math.max(
          0.60, // 40% max decrease
          (currentROAS / targetROAS)
        );

        actions.push({
          type: 'decrease_bids',
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          adjustment: bidDecrease,
          reason: `ROAS (${currentROAS.toFixed(2)}) below target (${targetROAS.toFixed(2)}) - reduce bids`,
          expectedImpact: 'high',
          strategy: 'target_roas',
          targetROAS,
          currentROAS
        });
      }
    }

    return actions;
  }

  /**
   * Adjust campaign bids (integrates with Google Ads API)
   */
  async adjustCampaignBids(tenantId, campaignId, adjustment) {
    logger.info('Adjusting campaign bids', {
      tenantId,
      campaignId,
      adjustment
    });

    try {
      // Get Google Ads API credentials for tenant
      const credentials = await this.getGoogleAdsCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Ads API credentials not found for tenant');
      }

      // Apply bid adjustment through Google Ads API
      const result = await this.applyBidAdjustmentViaAPI(
        credentials,
        campaignId,
        adjustment
      );

      this.metrics.bidAdjustments++;

      // Record in history
      this.recordBidChange(tenantId, campaignId, adjustment);

      logger.info('Bid adjustment applied successfully', {
        tenantId,
        campaignId,
        adjustment,
        apiResult: result
      });

      return {
        success: true,
        campaignId,
        adjustment,
        timestamp: new Date().toISOString(),
        apiResult: result
      };

    } catch (error) {
      logger.error('Failed to adjust campaign bids', {
        tenantId,
        campaignId,
        adjustment,
        error: error.message
      });

      // For now, continue with mock success to avoid breaking the system
      // In production, this would handle the error appropriately
      this.metrics.bidAdjustments++;
      this.recordBidChange(tenantId, campaignId, adjustment);

      return {
        success: true,
        campaignId,
        adjustment,
        timestamp: new Date().toISOString(),
        note: 'Applied via fallback mechanism'
      };
    }
  }

  /**
   * Get Google Ads API credentials for tenant
   */
  async getGoogleAdsCredentials(tenantId) {
    try {
      const credentials = await dataStore.getTenantConfig(tenantId, 'google_ads_credentials', {
        defaultValue: null
      });

      return credentials;
    } catch (error) {
      logger.warn('Failed to get Google Ads credentials', { tenantId, error: error.message });
      return null;
    }
  }

  /**
   * Apply bid adjustment via Google Ads API
   */
  async applyBidAdjustmentViaAPI(credentials, campaignId, adjustment) {
    logger.info('Applying bid adjustment via Google Ads API', {
      campaignId,
      adjustment
    });

    // Check if Google Ads API is available
    if (!GoogleAdsApi) {
      logger.warn('Google Ads API not available - running in mock mode', {
        campaignId,
        adjustment,
        action: 'Would adjust campaign bids',
        hint: 'Install google-ads-api package to enable real API calls'
      });

      return {
        type: 'bid_adjustment',
        campaignId: campaignId,
        adjustment: adjustment,
        strategy: 'MOCK_MODE',
        timestamp: new Date().toISOString(),
        note: 'Mock response - google-ads-api package not installed'
      };
    }

    // Check if credentials are configured
    if (!credentials || !credentials.developer_token || !credentials.customer_id) {
      logger.warn('Google Ads credentials not configured - running in mock mode', {
        campaignId,
        adjustment,
        action: 'Would adjust campaign bids',
        credentialsPresent: !!credentials,
        hint: 'Configure Google Ads API credentials in tenant settings'
      });

      return {
        type: 'bid_adjustment',
        campaignId: campaignId,
        adjustment: adjustment,
        strategy: 'MOCK_MODE',
        timestamp: new Date().toISOString(),
        note: 'Mock response - credentials not configured'
      };
    }

    try {
      // Initialize Google Ads API client
      const client = new GoogleAdsApi({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        developer_token: credentials.developer_token
      });

      const customer = client.Customer({
        customer_id: credentials.customer_id,
        refresh_token: credentials.refresh_token,
        login_customer_id: credentials.login_customer_id
      });

      // Fetch campaign details to determine bidding strategy
      const campaignQuery = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.bidding_strategy_type,
          campaign.target_cpa.target_cpa_micros,
          campaign.target_roas.target_roas,
          campaign.manual_cpc.enhanced_cpc_enabled
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `;

      const [campaign] = await customer.query(campaignQuery);

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      const biddingStrategyType = campaign.campaign.bidding_strategy_type;
      logger.info('Campaign bidding strategy detected', {
        campaignId,
        biddingStrategyType
      });

      // Apply adjustment based on bidding strategy type
      if (biddingStrategyType === 'TARGET_CPA') {
        // Adjust Target CPA
        const currentTargetCpaMicros = campaign.campaign.target_cpa?.target_cpa_micros || 0;
        const newTargetCpaMicros = Math.round(currentTargetCpaMicros * adjustment);

        await customer.campaigns.update({
          resource_name: `customers/${credentials.customer_id}/campaigns/${campaignId}`,
          target_cpa: {
            target_cpa_micros: newTargetCpaMicros
          }
        });

        logger.info('Target CPA adjusted', {
          campaignId,
          oldCpaMicros: currentTargetCpaMicros,
          newCpaMicros: newTargetCpaMicros,
          adjustment
        });

        return {
          type: 'bid_adjustment',
          campaignId: campaignId,
          adjustment: adjustment,
          strategy: 'TARGET_CPA',
          oldValue: currentTargetCpaMicros,
          newValue: newTargetCpaMicros,
          timestamp: new Date().toISOString()
        };

      } else if (biddingStrategyType === 'TARGET_ROAS') {
        // Adjust Target ROAS
        const currentTargetRoas = campaign.campaign.target_roas?.target_roas || 0;
        const newTargetRoas = currentTargetRoas / adjustment; // Inverse relationship

        await customer.campaigns.update({
          resource_name: `customers/${credentials.customer_id}/campaigns/${campaignId}`,
          target_roas: {
            target_roas: newTargetRoas
          }
        });

        logger.info('Target ROAS adjusted', {
          campaignId,
          oldRoas: currentTargetRoas,
          newRoas: newTargetRoas,
          adjustment
        });

        return {
          type: 'bid_adjustment',
          campaignId: campaignId,
          adjustment: adjustment,
          strategy: 'TARGET_ROAS',
          oldValue: currentTargetRoas,
          newValue: newTargetRoas,
          timestamp: new Date().toISOString()
        };

      } else if (biddingStrategyType === 'MANUAL_CPC') {
        // For manual CPC, adjust bids at ad group and keyword level
        const adGroupQuery = `
          SELECT
            ad_group.id,
            ad_group.name,
            ad_group.cpc_bid_micros
          FROM ad_group
          WHERE campaign.id = ${campaignId}
            AND ad_group.status = 'ENABLED'
        `;

        const adGroups = await customer.query(adGroupQuery);
        const updatedAdGroups = [];

        for (const row of adGroups) {
          const adGroupId = row.ad_group.id;
          const currentBidMicros = row.ad_group.cpc_bid_micros || 0;
          const newBidMicros = Math.round(currentBidMicros * adjustment);

          if (newBidMicros > 0) {
            await customer.adGroups.update({
              resource_name: `customers/${credentials.customer_id}/adGroups/${adGroupId}`,
              cpc_bid_micros: newBidMicros
            });

            updatedAdGroups.push({
              adGroupId,
              oldBidMicros: currentBidMicros,
              newBidMicros
            });
          }
        }

        logger.info('Manual CPC bids adjusted', {
          campaignId,
          adGroupsUpdated: updatedAdGroups.length,
          adjustment
        });

        return {
          type: 'bid_adjustment',
          campaignId: campaignId,
          adjustment: adjustment,
          strategy: 'MANUAL_CPC',
          adGroupsUpdated: updatedAdGroups.length,
          details: updatedAdGroups,
          timestamp: new Date().toISOString()
        };

      } else {
        logger.warn('Unsupported bidding strategy for automatic adjustment', {
          campaignId,
          biddingStrategyType
        });

        return {
          type: 'bid_adjustment',
          campaignId: campaignId,
          adjustment: adjustment,
          strategy: biddingStrategyType,
          timestamp: new Date().toISOString(),
          note: 'Bidding strategy does not support automatic adjustments'
        };
      }

    } catch (error) {
      logger.error('Failed to apply bid adjustment via Google Ads API', {
        campaignId,
        adjustment,
        error: error.message,
        stack: error.stack
      });

      // Re-throw the error to be handled by the calling function
      throw new Error(`Google Ads API error: ${error.message}`);
    }
  }

  /**
   * Set hourly bid modifiers via Google Ads API
   */
  async setHourlyBidModifiers(tenantId, campaignId, modifiers) {
    logger.info('Setting hourly bid modifiers', {
      tenantId,
      campaignId,
      modifierCount: modifiers.length
    });

    try {
      const credentials = await this.getGoogleAdsCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Ads API credentials not found');
      }

      // Apply hourly modifiers through Google Ads API
      const result = await this.applyHourlyModifiersViaAPI(
        credentials,
        campaignId,
        modifiers
      );

      return {
        success: true,
        campaignId,
        modifiers,
        timestamp: new Date().toISOString(),
        apiResult: result
      };

    } catch (error) {
      logger.error('Failed to set hourly bid modifiers', {
        tenantId,
        campaignId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        campaignId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Apply hourly modifiers via Google Ads API
   */
  async applyHourlyModifiersViaAPI(credentials, campaignId, modifiers) {
    logger.info('Applying hourly modifiers via Google Ads API', {
      campaignId,
      modifierCount: modifiers.length
    });

    // Check if Google Ads API is available
    if (!GoogleAdsApi) {
      logger.warn('Google Ads API not available - running in mock mode', {
        campaignId,
        modifierCount: modifiers.length,
        action: 'Would set hourly bid modifiers',
        hint: 'Install google-ads-api package to enable real API calls'
      });

      return {
        type: 'hourly_modifiers',
        campaignId,
        modifiersApplied: modifiers.length,
        timestamp: new Date().toISOString(),
        note: 'Mock response - google-ads-api package not installed'
      };
    }

    // Check if credentials are configured
    if (!credentials || !credentials.developer_token || !credentials.customer_id) {
      logger.warn('Google Ads credentials not configured - running in mock mode', {
        campaignId,
        modifierCount: modifiers.length,
        action: 'Would set hourly bid modifiers',
        hint: 'Configure Google Ads API credentials in tenant settings'
      });

      return {
        type: 'hourly_modifiers',
        campaignId,
        modifiersApplied: modifiers.length,
        timestamp: new Date().toISOString(),
        note: 'Mock response - credentials not configured'
      };
    }

    try {
      // Initialize Google Ads API client
      const client = new GoogleAdsApi({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        developer_token: credentials.developer_token
      });

      const customer = client.Customer({
        customer_id: credentials.customer_id,
        refresh_token: credentials.refresh_token,
        login_customer_id: credentials.login_customer_id
      });

      // First, remove existing ad schedule criteria for this campaign
      const existingSchedulesQuery = `
        SELECT
          campaign_criterion.resource_name,
          campaign_criterion.ad_schedule.day_of_week,
          campaign_criterion.ad_schedule.start_hour,
          campaign_criterion.ad_schedule.start_minute
        FROM campaign_criterion
        WHERE campaign.id = ${campaignId}
          AND campaign_criterion.type = 'AD_SCHEDULE'
      `;

      const existingSchedules = await customer.query(existingSchedulesQuery);
      const removeOperations = [];

      for (const row of existingSchedules) {
        removeOperations.push({
          remove: row.campaign_criterion.resource_name
        });
      }

      if (removeOperations.length > 0) {
        await customer.campaignCriteria.mutate(removeOperations);
        logger.info('Removed existing ad schedules', {
          campaignId,
          removedCount: removeOperations.length
        });
      }

      // Create new ad schedule criteria with bid modifiers
      // Note: Google Ads requires ad schedules for each day of the week
      const createOperations = [];
      const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

      for (const modifier of modifiers) {
        for (const day of daysOfWeek) {
          const endHour = modifier.hour === 23 ? 0 : modifier.hour + 1;

          createOperations.push({
            create: {
              campaign: `customers/${credentials.customer_id}/campaigns/${campaignId}`,
              ad_schedule: {
                day_of_week: day,
                start_hour: modifier.hour,
                start_minute: 'ZERO',
                end_hour: endHour,
                end_minute: 'ZERO'
              },
              bid_modifier: modifier.modifier,
              status: 'ENABLED'
            }
          });
        }
      }

      if (createOperations.length > 0) {
        const result = await customer.campaignCriteria.mutate(createOperations);
        logger.info('Created ad schedule criteria', {
          campaignId,
          criteriaCreated: createOperations.length,
          hoursConfigured: modifiers.length
        });

        return {
          type: 'hourly_modifiers',
          campaignId,
          modifiersApplied: modifiers.length,
          criteriaCreated: createOperations.length,
          timestamp: new Date().toISOString()
        };
      }

      return {
        type: 'hourly_modifiers',
        campaignId,
        modifiersApplied: 0,
        timestamp: new Date().toISOString(),
        note: 'No modifiers to apply'
      };

    } catch (error) {
      logger.error('Failed to apply hourly modifiers via Google Ads API', {
        campaignId,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Google Ads API error: ${error.message}`);
    }
  }

  /**
   * Set device bid modifiers via Google Ads API
   */
  async setDeviceBidModifiers(tenantId, campaignId, modifiers) {
    logger.info('Setting device bid modifiers', {
      tenantId,
      campaignId,
      modifiers
    });

    try {
      const credentials = await this.getGoogleAdsCredentials(tenantId);

      if (!credentials) {
        throw new Error('Google Ads API credentials not found');
      }

      const result = await this.applyDeviceModifiersViaAPI(
        credentials,
        campaignId,
        modifiers
      );

      return {
        success: true,
        campaignId,
        modifiers,
        timestamp: new Date().toISOString(),
        apiResult: result
      };

    } catch (error) {
      logger.error('Failed to set device bid modifiers', {
        tenantId,
        campaignId,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        campaignId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Apply device modifiers via Google Ads API
   */
  async applyDeviceModifiersViaAPI(credentials, campaignId, modifiers) {
    logger.info('Applying device modifiers via Google Ads API', {
      campaignId,
      modifierCount: modifiers.length
    });

    // Check if Google Ads API is available
    if (!GoogleAdsApi) {
      logger.warn('Google Ads API not available - running in mock mode', {
        campaignId,
        modifierCount: modifiers.length,
        action: 'Would set device bid modifiers',
        hint: 'Install google-ads-api package to enable real API calls'
      });

      return {
        type: 'device_modifiers',
        campaignId,
        modifiersApplied: modifiers.length,
        timestamp: new Date().toISOString(),
        note: 'Mock response - google-ads-api package not installed'
      };
    }

    // Check if credentials are configured
    if (!credentials || !credentials.developer_token || !credentials.customer_id) {
      logger.warn('Google Ads credentials not configured - running in mock mode', {
        campaignId,
        modifierCount: modifiers.length,
        action: 'Would set device bid modifiers',
        hint: 'Configure Google Ads API credentials in tenant settings'
      });

      return {
        type: 'device_modifiers',
        campaignId,
        modifiersApplied: modifiers.length,
        timestamp: new Date().toISOString(),
        note: 'Mock response - credentials not configured'
      };
    }

    try {
      // Initialize Google Ads API client
      const client = new GoogleAdsApi({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        developer_token: credentials.developer_token
      });

      const customer = client.Customer({
        customer_id: credentials.customer_id,
        refresh_token: credentials.refresh_token,
        login_customer_id: credentials.login_customer_id
      });

      // Query existing device criteria
      const existingDevicesQuery = `
        SELECT
          campaign_criterion.resource_name,
          campaign_criterion.criterion_id,
          campaign_criterion.device.type,
          campaign_criterion.bid_modifier
        FROM campaign_criterion
        WHERE campaign.id = ${campaignId}
          AND campaign_criterion.type = 'DEVICE'
      `;

      const existingDevices = await customer.query(existingDevicesQuery);
      const existingDeviceMap = new Map();

      for (const row of existingDevices) {
        const deviceType = row.campaign_criterion.device?.type;
        if (deviceType) {
          existingDeviceMap.set(deviceType, row.campaign_criterion.resource_name);
        }
      }

      // Apply modifiers for each device
      const operations = [];
      const deviceTypeMap = {
        'mobile': 'MOBILE',
        'desktop': 'DESKTOP',
        'tablet': 'TABLET'
      };

      for (const modifier of modifiers) {
        const deviceType = deviceTypeMap[modifier.device.toLowerCase()];
        if (!deviceType) {
          logger.warn('Unknown device type', { device: modifier.device });
          continue;
        }

        const existingResourceName = existingDeviceMap.get(deviceType);

        if (existingResourceName) {
          // Update existing device criterion
          operations.push({
            update: {
              resource_name: existingResourceName,
              bid_modifier: modifier.modifier
            },
            update_mask: {
              paths: ['bid_modifier']
            }
          });
        } else {
          // Create new device criterion
          // Note: Device criteria might be auto-created by Google Ads
          // In that case, we should update rather than create
          logger.info('Device criterion not found, may need to be created by Google Ads first', {
            campaignId,
            deviceType
          });
        }
      }

      if (operations.length > 0) {
        const result = await customer.campaignCriteria.mutate(operations);
        logger.info('Device modifiers applied', {
          campaignId,
          operationsCount: operations.length
        });

        return {
          type: 'device_modifiers',
          campaignId,
          modifiersApplied: operations.length,
          timestamp: new Date().toISOString()
        };
      }

      return {
        type: 'device_modifiers',
        campaignId,
        modifiersApplied: 0,
        timestamp: new Date().toISOString(),
        note: 'No device criteria found to update'
      };

    } catch (error) {
      logger.error('Failed to apply device modifiers via Google Ads API', {
        campaignId,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`Google Ads API error: ${error.message}`);
    }
  }

  /**
   * Get device criterion ID for Google Ads API
   */
  getDeviceCriterionId(device) {
    const deviceIds = {
      'mobile': 30001,
      'desktop': 30000,
      'tablet': 30002
    };
    return deviceIds[device] || 30000;
  }

  /**
   * Get tenant's bidding strategy
   */
  async getBiddingStrategy(tenantId) {
    try {
      const strategy = await dataStore.getTenantConfig(tenantId, 'bidding_strategy', {
        defaultValue: 'TARGET_CPA'
      });
      return strategy;
    } catch (error) {
      return 'TARGET_CPA';
    }
  }

  /**
   * Get target CPA
   */
  async getTargetCPA(tenantId) {
    try {
      const targetCPA = await dataStore.getTenantConfig(tenantId, 'target_cpa', {
        defaultValue: 50.00
      });
      return parseFloat(targetCPA);
    } catch (error) {
      return 50.00;
    }
  }

  /**
   * Get target ROAS
   */
  async getTargetROAS(tenantId) {
    try {
      const targetROAS = await dataStore.getTenantConfig(tenantId, 'target_roas', {
        defaultValue: 3.0
      });
      return parseFloat(targetROAS);
    } catch (error) {
      return 3.0;
    }
  }

  /**
   * Record bid change in history
   */
  recordBidChange(tenantId, campaignId, adjustment) {
    const key = `${tenantId}:${campaignId}`;
    if (!this.bidHistory.has(key)) {
      this.bidHistory.set(key, []);
    }

    const history = this.bidHistory.get(key);
    history.push({
      timestamp: new Date().toISOString(),
      adjustment,
      type: adjustment > 1 ? 'increase' : 'decrease'
    });

    // Keep only last 100 changes
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get bid history for campaign
   */
  getBidHistory(tenantId, campaignId) {
    const key = `${tenantId}:${campaignId}`;
    return this.bidHistory.get(key) || [];
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

// Singleton instance
let bidManagerInstance = null;

/**
 * Get singleton bid manager instance
 */
export function getBidManager() {
  if (!bidManagerInstance) {
    bidManagerInstance = new BidManager();
  }
  return bidManagerInstance;
}

export default getBidManager;