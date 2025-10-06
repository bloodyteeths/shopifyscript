/**
 * Audience Builder Service
 * Google Ads audience creation and Customer Match list management
 *
 * Features:
 * - Google Ads audience definitions
 * - Customer Match list creation and upload
 * - Lookalike audience generation
 * - Exclusion list management
 * - Privacy-compliant hashing (SHA-256)
 * - Automated audience syncing
 * - Performance tracking
 */

import crypto from 'crypto';
import dataStore from './data-store.js';
import demographicProfiler from './demographic-profiler.js';
import customerSegmentation from './customer-segmentation.js';
import { executeQuery } from './supabase-client.js';
import logger from './logger.js';

class AudienceBuilderService {
  constructor() {
    // Audience cache
    this.audienceCache = new Map();
    this.cacheTtl = 20 * 60 * 1000; // 20 minutes

    // Google Ads audience types
    this.audienceTypes = {
      CUSTOMER_MATCH: 'customer_match',
      SIMILAR: 'similar_audiences',
      REMARKETING: 'remarketing',
      IN_MARKET: 'in_market',
      AFFINITY: 'affinity',
      CUSTOM_INTENT: 'custom_intent'
    };

    // Minimum audience sizes for Google Ads
    this.minAudienceSizes = {
      customerMatch: 1000, // Google requires minimum 1000 for Customer Match
      similarAudiences: 1000, // Same for Similar Audiences
      remarketing: 100 // Lower threshold for remarketing
    };

    // PII hashing salt (should match shopify-sync.js)
    this.hashSalt = process.env.PII_HASH_SALT || 'adsautopilot-default-salt-change-me';

    // Metrics
    this.metrics = {
      audiencesCreated: 0,
      customersProcessed: 0,
      listsGenerated: 0,
      uploadsPrepared: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgBuildTime: 0,
      errors: 0
    };
  }

  /**
   * Build comprehensive audience definitions for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Configuration options
   * @returns {Promise<object>} Audience definitions and lists
   */
  async buildAudiences(tenantId, options = {}) {
    const {
      refreshCache = false,
      includeCustomerMatch = true,
      includeLookalikes = true,
      includeExclusions = true,
      minCustomers = 100,
      exportFormat = 'google_ads' // 'google_ads', 'facebook', 'csv'
    } = options;

    const startTime = Date.now();
    const cacheKey = `audience:${tenantId}:${minCustomers}:${exportFormat}`;

    try {
      // Check cache
      if (!refreshCache && this.audienceCache.has(cacheKey)) {
        const cached = this.audienceCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTtl) {
          this.metrics.cacheHits++;
          logger.info('Audiences served from cache', { tenantId });
          return { ...cached.data, fromCache: true };
        }
      }

      this.metrics.cacheMisses++;
      logger.info('Building audiences', { tenantId, minCustomers, exportFormat });

      // Get customer segmentation
      const segmentation = await customerSegmentation.segmentCustomers(tenantId, {
        refreshCache,
        includeCustomerIds: true,
        minOrders: 1
      });

      // Get demographic profile
      const demographics = await demographicProfiler.generateDemographicProfile(tenantId, {
        refreshCache,
        minOrders: 1,
        includeIndividuals: false
      });

      // Load full customer data with PII hashes
      const customers = await this.loadCustomersWithHashes(tenantId, { minCustomers });

      if (!customers || customers.length === 0) {
        return {
          tenantId,
          totalCustomers: 0,
          message: 'Insufficient customer data for audience building',
          generatedAt: new Date().toISOString()
        };
      }

      const result = {
        tenantId,
        totalCustomers: customers.length,
        generatedAt: new Date().toISOString(),
        fromCache: false,
        exportFormat
      };

      // Build Customer Match lists
      if (includeCustomerMatch) {
        result.customerMatchLists = await this.buildCustomerMatchLists(
          customers,
          segmentation,
          exportFormat
        );
      }

      // Build Lookalike audiences
      if (includeLookalikes) {
        result.lookalikeAudiences = await this.buildLookalikeAudiences(
          customers,
          demographics,
          segmentation,
          exportFormat
        );
      }

      // Build Exclusion lists
      if (includeExclusions) {
        result.exclusionLists = await this.buildExclusionLists(
          customers,
          segmentation,
          exportFormat
        );
      }

      // Generate audience targeting recommendations
      result.recommendations = this.generateAudienceRecommendations(
        result,
        segmentation,
        demographics
      );

      // Add execution metrics
      result.executionTime = Date.now() - startTime;
      result.metrics = {
        totalAudiences: this.countTotalAudiences(result),
        totalCustomersInAudiences: this.countTotalCustomers(result),
        avgAudienceSize: this.calculateAvgAudienceSize(result)
      };

      // Cache the result
      this.audienceCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      this.metrics.audiencesCreated++;
      this.metrics.customersProcessed += customers.length;
      this.updateMetrics(startTime);

      logger.info('Audiences built successfully', {
        tenantId,
        customerCount: customers.length,
        audienceCount: result.metrics.totalAudiences,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to build audiences', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Load customers with PII hashes for Customer Match
   */
  async loadCustomersWithHashes(tenantId, options = {}) {
    const { minCustomers = 100 } = options;

    try {
      const customers = await executeQuery(async (client) => {
        const { data, error } = await client
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('order_count', 1)
          .order('total_spent', { ascending: false });

        if (error) throw error;
        return data || [];
      });

      return customers;
    } catch (error) {
      logger.warn('Failed to load customers', { tenantId, error: error.message });
      return [];
    }
  }

  /**
   * Build Customer Match lists for Google Ads
   */
  async buildCustomerMatchLists(customers, segmentation, exportFormat) {
    const lists = {};

    // VIP Customers list
    const vipCustomers = this.filterCustomersBySegments(
      customers,
      ['Champions', 'Loyal Customers', 'Cannot Lose Them']
    );

    if (vipCustomers.length >= this.minAudienceSizes.remarketing) {
      lists.vip = {
        name: 'VIP Customers',
        description: 'High-value loyal customers for premium offers',
        size: vipCustomers.length,
        eligible: vipCustomers.length >= this.minAudienceSizes.customerMatch,
        data: this.formatCustomerMatchData(vipCustomers, exportFormat),
        targetingStrategy: {
          bidAdjustment: '+30%',
          adSchedule: 'All times',
          devices: 'All devices',
          locations: 'All',
          messaging: 'Exclusive VIP offers, early access, loyalty rewards'
        }
      };
    }

    // High-Value Prospects list
    const highValueProspects = this.filterCustomersBySegments(
      customers,
      ['Potential Loyalists', 'Promising']
    );

    if (highValueProspects.length >= this.minAudienceSizes.remarketing) {
      lists.highValueProspects = {
        name: 'High-Value Prospects',
        description: 'Customers with high potential for conversion',
        size: highValueProspects.length,
        eligible: highValueProspects.length >= this.minAudienceSizes.customerMatch,
        data: this.formatCustomerMatchData(highValueProspects, exportFormat),
        targetingStrategy: {
          bidAdjustment: '+20%',
          adSchedule: 'Peak hours',
          devices: 'All devices',
          locations: 'All',
          messaging: 'Second purchase discount, product recommendations'
        }
      };
    }

    // At-Risk Customers list
    const atRiskCustomers = this.filterCustomersBySegments(
      customers,
      ['At Risk', 'About to Sleep', 'Needs Attention']
    );

    if (atRiskCustomers.length >= this.minAudienceSizes.remarketing) {
      lists.atRisk = {
        name: 'At-Risk Customers',
        description: 'Previously engaged customers needing re-engagement',
        size: atRiskCustomers.length,
        eligible: atRiskCustomers.length >= this.minAudienceSizes.customerMatch,
        data: this.formatCustomerMatchData(atRiskCustomers, exportFormat),
        targetingStrategy: {
          bidAdjustment: '+15%',
          adSchedule: 'All times',
          devices: 'All devices',
          locations: 'All',
          messaging: 'Win-back offers, special discounts, new product highlights'
        }
      };
    }

    // Recent Buyers list
    const recentBuyers = customers.filter(c => {
      const lastOrderDate = c.last_order_at ? new Date(c.last_order_at) : null;
      const daysSinceOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSinceOrder <= 30;
    });

    if (recentBuyers.length >= this.minAudienceSizes.remarketing) {
      lists.recentBuyers = {
        name: 'Recent Buyers (30 days)',
        description: 'Customers who purchased in the last 30 days',
        size: recentBuyers.length,
        eligible: recentBuyers.length >= this.minAudienceSizes.customerMatch,
        data: this.formatCustomerMatchData(recentBuyers, exportFormat),
        targetingStrategy: {
          bidAdjustment: '+10%',
          adSchedule: 'All times',
          devices: 'All devices',
          locations: 'All',
          messaging: 'Cross-sell, upsell, repeat purchase incentives'
        }
      };
    }

    // High AOV Customers
    const highAOVCustomers = customers.filter(c => {
      const avgOrderValue = Number(c.total_spent || 0) / Number(c.order_count || 1);
      return avgOrderValue >= 150;
    });

    if (highAOVCustomers.length >= this.minAudienceSizes.remarketing) {
      lists.highAOV = {
        name: 'High Average Order Value',
        description: 'Customers with high average order value',
        size: highAOVCustomers.length,
        eligible: highAOVCustomers.length >= this.minAudienceSizes.customerMatch,
        data: this.formatCustomerMatchData(highAOVCustomers, exportFormat),
        targetingStrategy: {
          bidAdjustment: '+25%',
          adSchedule: 'Business hours',
          devices: 'All devices',
          locations: 'All',
          messaging: 'Premium products, bundle offers, value propositions'
        }
      };
    }

    this.metrics.listsGenerated += Object.keys(lists).length;

    return lists;
  }

  /**
   * Build Lookalike audience definitions
   */
  async buildLookalikeAudiences(customers, demographics, segmentation, exportFormat) {
    const lookalikes = {};

    // Top 1% Lookalike
    const top1Percent = this.getTopPercentileCustomers(customers, 0.01);
    if (top1Percent.length >= 100) {
      lookalikes.top1Percent = {
        name: 'Lookalike - Top 1% Customers',
        description: 'Find new customers similar to your best 1%',
        seedAudienceSize: top1Percent.length,
        expansionRatio: '1%', // Google Ads expansion
        data: this.formatCustomerMatchData(top1Percent, exportFormat),
        characteristics: this.analyzeAudienceCharacteristics(top1Percent),
        targetingStrategy: {
          bidAdjustment: '+35%',
          budget: 'High',
          adSchedule: 'All times',
          devices: 'All devices',
          locations: 'Expand to similar demographics',
          messaging: 'Value proposition, premium positioning'
        }
      };
    }

    // Top 5% Lookalike
    const top5Percent = this.getTopPercentileCustomers(customers, 0.05);
    if (top5Percent.length >= 100) {
      lookalikes.top5Percent = {
        name: 'Lookalike - Top 5% Customers',
        description: 'Broader audience similar to top 5%',
        seedAudienceSize: top5Percent.length,
        expansionRatio: '3%',
        data: this.formatCustomerMatchData(top5Percent, exportFormat),
        characteristics: this.analyzeAudienceCharacteristics(top5Percent),
        targetingStrategy: {
          bidAdjustment: '+25%',
          budget: 'Medium-High',
          adSchedule: 'All times',
          devices: 'All devices',
          locations: 'Expand to similar demographics',
          messaging: 'Strong value proposition, social proof'
        }
      };
    }

    // Frequent Buyers Lookalike
    const frequentBuyers = customers.filter(c => Number(c.order_count || 0) >= 3);
    if (frequentBuyers.length >= 100) {
      lookalikes.frequentBuyers = {
        name: 'Lookalike - Frequent Buyers',
        description: 'Find customers likely to make repeat purchases',
        seedAudienceSize: frequentBuyers.length,
        expansionRatio: '5%',
        data: this.formatCustomerMatchData(frequentBuyers, exportFormat),
        characteristics: this.analyzeAudienceCharacteristics(frequentBuyers),
        targetingStrategy: {
          bidAdjustment: '+20%',
          budget: 'Medium',
          adSchedule: 'All times',
          devices: 'All devices',
          locations: 'Expand to similar demographics',
          messaging: 'Product variety, subscription offers, loyalty benefits'
        }
      };
    }

    return lookalikes;
  }

  /**
   * Build exclusion lists for non-converting segments
   */
  async buildExclusionLists(customers, segmentation, exportFormat) {
    const exclusions = {};

    // Lost Customers (exclude from acquisition campaigns)
    const lostCustomers = this.filterCustomersBySegments(
      customers,
      ['Lost', 'Hibernating']
    );

    if (lostCustomers.length > 0) {
      exclusions.lostCustomers = {
        name: 'Exclusion - Lost Customers',
        description: 'Exclude from acquisition campaigns, target with win-back instead',
        size: lostCustomers.length,
        data: this.formatCustomerMatchData(lostCustomers, exportFormat),
        applyTo: ['acquisition', 'prospecting'],
        reason: 'Prevent wasted spend on customers who need different messaging'
      };
    }

    // Single Purchase Low Value (exclude from premium campaigns)
    const lowValueSinglePurchase = customers.filter(c => {
      const orders = Number(c.order_count || 0);
      const spent = Number(c.total_spent || 0);
      return orders === 1 && spent < 50;
    });

    if (lowValueSinglePurchase.length > 0) {
      exclusions.lowValueSingle = {
        name: 'Exclusion - Low Value Single Purchase',
        description: 'Exclude from premium product campaigns',
        size: lowValueSinglePurchase.length,
        data: this.formatCustomerMatchData(lowValueSinglePurchase, exportFormat),
        applyTo: ['premium', 'high-aov'],
        reason: 'Better suited for entry-level product campaigns'
      };
    }

    // Recent Converters (exclude to prevent overlap)
    const veryRecentBuyers = customers.filter(c => {
      const lastOrderDate = c.last_order_at ? new Date(c.last_order_at) : null;
      const daysSinceOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSinceOrder <= 7;
    });

    if (veryRecentBuyers.length > 0) {
      exclusions.recentConverters = {
        name: 'Exclusion - Recent Converters (7 days)',
        description: 'Exclude customers who purchased in last 7 days',
        size: veryRecentBuyers.length,
        data: this.formatCustomerMatchData(veryRecentBuyers, exportFormat),
        applyTo: ['acquisition', 'remarketing'],
        reason: 'Avoid ad fatigue and wasted spend on recent buyers'
      };
    }

    return exclusions;
  }

  /**
   * Filter customers by segment labels
   */
  filterCustomersBySegments(customers, segmentLabels) {
    // This requires segment assignment - simplified version
    return customers.filter(c => {
      // Calculate simple segment based on RFM-like logic
      const orders = Number(c.order_count || 0);
      const spent = Number(c.total_spent || 0);
      const lastOrderDate = c.last_order_at ? new Date(c.last_order_at) : null;
      const daysSinceOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Champions: high spend, high frequency, recent
      if (segmentLabels.includes('Champions')) {
        if (spent >= 500 && orders >= 5 && daysSinceOrder <= 90) return true;
      }

      // Loyal Customers: good spend and frequency
      if (segmentLabels.includes('Loyal Customers')) {
        if (spent >= 300 && orders >= 3 && daysSinceOrder <= 120) return true;
      }

      // Cannot Lose Them: high value but not recent
      if (segmentLabels.includes('Cannot Lose Them')) {
        if (spent >= 500 && orders >= 4 && daysSinceOrder > 90) return true;
      }

      // At Risk: good value but declining
      if (segmentLabels.includes('At Risk')) {
        if (spent >= 200 && orders >= 2 && daysSinceOrder > 90 && daysSinceOrder <= 180) return true;
      }

      // About to Sleep
      if (segmentLabels.includes('About to Sleep')) {
        if (spent >= 150 && daysSinceOrder > 60 && daysSinceOrder <= 120) return true;
      }

      // Needs Attention
      if (segmentLabels.includes('Needs Attention')) {
        if (spent >= 100 && daysSinceOrder > 45 && daysSinceOrder <= 90) return true;
      }

      // Potential Loyalists: recent with potential
      if (segmentLabels.includes('Potential Loyalists')) {
        if (spent >= 100 && orders >= 2 && daysSinceOrder <= 60) return true;
      }

      // Promising: recent shoppers
      if (segmentLabels.includes('Promising')) {
        if (spent >= 50 && daysSinceOrder <= 45) return true;
      }

      // Lost: long time inactive
      if (segmentLabels.includes('Lost')) {
        if (daysSinceOrder > 180) return true;
      }

      // Hibernating: inactive low value
      if (segmentLabels.includes('Hibernating')) {
        if (spent < 200 && daysSinceOrder > 120) return true;
      }

      return false;
    });
  }

  /**
   * Format customer data for Customer Match upload
   */
  formatCustomerMatchData(customers, exportFormat) {
    const formatted = {
      format: exportFormat,
      count: customers.length,
      eligible: customers.length >= this.minAudienceSizes.customerMatch,
      minRequired: this.minAudienceSizes.customerMatch
    };

    if (exportFormat === 'google_ads') {
      // Google Ads Customer Match format
      formatted.data = customers.map(c => ({
        hashedEmail: c.email_hash || null,
        hashedPhoneNumber: c.phone_hash || null,
        // Don't include raw PII - only hashes
        customerId: c.customer_id
      })).filter(c => c.hashedEmail || c.hashedPhoneNumber);

      formatted.uploadInstructions = {
        step1: 'Go to Google Ads > Tools & Settings > Audience Manager',
        step2: 'Click "+ Audience" > Customer list',
        step3: 'Upload CSV with hashed emails and/or phone numbers',
        step4: 'Wait 24-48 hours for list to populate',
        format: 'CSV with columns: Email (SHA256), Phone (SHA256)',
        requirements: 'Minimum 1000 matched customers for activation'
      };
    } else if (exportFormat === 'csv') {
      // CSV export format
      formatted.csvHeaders = ['customer_id', 'email_hash', 'phone_hash', 'total_spent', 'order_count'];
      formatted.data = customers.map(c => ({
        customer_id: c.customer_id,
        email_hash: c.email_hash || '',
        phone_hash: c.phone_hash || '',
        total_spent: c.total_spent || 0,
        order_count: c.order_count || 0
      }));
    }

    this.metrics.uploadsPrepared++;
    return formatted;
  }

  /**
   * Get top percentile customers
   */
  getTopPercentileCustomers(customers, percentile) {
    const sorted = [...customers].sort((a, b) =>
      Number(b.total_spent || 0) - Number(a.total_spent || 0)
    );
    const count = Math.max(1, Math.ceil(customers.length * percentile));
    return sorted.slice(0, count);
  }

  /**
   * Analyze audience characteristics
   */
  analyzeAudienceCharacteristics(customers) {
    if (customers.length === 0) {
      return { avgSpend: 0, avgOrders: 0, topCategories: [] };
    }

    const totalSpend = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + Number(c.order_count || 0), 0);

    const categoryCount = {};
    customers.forEach(c => {
      const category = c.top_category || 'Unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return {
      avgSpend: (totalSpend / customers.length).toFixed(2),
      avgOrders: (totalOrders / customers.length).toFixed(2),
      topCategories
    };
  }

  /**
   * Generate audience targeting recommendations
   */
  generateAudienceRecommendations(audiences, segmentation, demographics) {
    const recommendations = [];

    // Analyze customer match eligibility
    if (audiences.customerMatchLists) {
      const eligibleLists = Object.values(audiences.customerMatchLists).filter(l => l.eligible);
      const ineligibleLists = Object.values(audiences.customerMatchLists).filter(l => !l.eligible);

      if (eligibleLists.length > 0) {
        recommendations.push({
          priority: 'high',
          type: 'opportunity',
          title: 'Customer Match Ready',
          message: `${eligibleLists.length} audience list(s) meet Google Ads minimum requirements (1000+ customers). Upload immediately for best results.`,
          actionItems: [
            'Upload VIP and high-value lists first',
            'Set up automated audience syncing',
            'Create separate campaigns for each audience',
            'Implement bid adjustments based on audience value'
          ]
        });
      }

      if (ineligibleLists.length > 0) {
        recommendations.push({
          priority: 'medium',
          type: 'growth',
          title: 'Build Audience Size',
          message: `${ineligibleLists.length} audience list(s) need more customers to reach Google Ads minimum. Focus on customer acquisition.`,
          actionItems: [
            'Increase marketing spend to grow customer base',
            'Implement referral programs',
            'Run lead generation campaigns',
            'Consider Facebook Custom Audiences (lower minimums)'
          ]
        });
      }
    }

    // Lookalike opportunities
    if (audiences.lookalikeAudiences && Object.keys(audiences.lookalikeAudiences).length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'scaling',
        title: 'Lookalike Audiences Available',
        message: 'You have high-quality seed audiences for lookalike expansion. This can significantly reduce acquisition costs.',
        actionItems: [
          'Create 1% lookalike for highest ROAS',
          'Test 3-5% lookalikes for broader reach',
          'Use different messaging for each lookalike tier',
          'Monitor performance and adjust expansion ratios'
        ]
      });
    }

    // Exclusion recommendations
    if (audiences.exclusionLists && Object.keys(audiences.exclusionLists).length > 0) {
      const totalExcluded = Object.values(audiences.exclusionLists)
        .reduce((sum, list) => sum + (list.size || 0), 0);

      recommendations.push({
        priority: 'high',
        type: 'optimization',
        title: 'Apply Exclusion Lists',
        message: `Exclude ${totalExcluded} customers from campaigns to prevent wasted spend and improve efficiency.`,
        actionItems: [
          'Add exclusion lists to all acquisition campaigns',
          'Exclude recent converters from remarketing',
          'Create separate win-back campaigns for lost customers',
          'Review exclusions monthly for accuracy'
        ]
      });
    }

    // Segment-specific recommendations
    if (segmentation.specialGroups) {
      if (segmentation.specialGroups.atRisk.count > 0) {
        recommendations.push({
          priority: 'urgent',
          type: 'retention',
          title: 'At-Risk Customer Action Required',
          message: `${segmentation.specialGroups.atRisk.count} high-value customers at risk of churning. Create targeted win-back campaigns immediately.`,
          actionItems: [
            'Upload at-risk audience to Google Ads',
            'Set bid adjustment to +20-30%',
            'Create win-back ad creative with strong offers',
            'Set up email + ads coordinated campaign'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Helper: Count total audiences
   */
  countTotalAudiences(audiences) {
    let count = 0;
    if (audiences.customerMatchLists) count += Object.keys(audiences.customerMatchLists).length;
    if (audiences.lookalikeAudiences) count += Object.keys(audiences.lookalikeAudiences).length;
    if (audiences.exclusionLists) count += Object.keys(audiences.exclusionLists).length;
    return count;
  }

  /**
   * Helper: Count total unique customers
   */
  countTotalCustomers(audiences) {
    const uniqueCustomers = new Set();

    const addCustomers = (lists) => {
      if (!lists) return;
      Object.values(lists).forEach(list => {
        if (list.data && list.data.data) {
          list.data.data.forEach(c => uniqueCustomers.add(c.customerId || c.customer_id));
        }
      });
    };

    addCustomers(audiences.customerMatchLists);
    addCustomers(audiences.lookalikeAudiences);
    addCustomers(audiences.exclusionLists);

    return uniqueCustomers.size;
  }

  /**
   * Helper: Calculate average audience size
   */
  calculateAvgAudienceSize(audiences) {
    const sizes = [];

    const collectSizes = (lists) => {
      if (!lists) return;
      Object.values(lists).forEach(list => {
        if (list.size || list.seedAudienceSize) {
          sizes.push(list.size || list.seedAudienceSize);
        }
      });
    };

    collectSizes(audiences.customerMatchLists);
    collectSizes(audiences.lookalikeAudiences);
    collectSizes(audiences.exclusionLists);

    return sizes.length > 0
      ? Math.round(sizes.reduce((sum, s) => sum + s, 0) / sizes.length)
      : 0;
  }

  /**
   * Export audience to CSV format
   * @param {string} tenantId - Tenant identifier
   * @param {string} audienceType - Type of audience to export
   * @returns {Promise<string>} CSV content
   */
  async exportAudienceCSV(tenantId, audienceType = 'all') {
    const audiences = await this.buildAudiences(tenantId, {
      exportFormat: 'csv',
      includeCustomerMatch: true,
      includeLookalikes: true,
      includeExclusions: true
    });

    // Generate CSV content
    let csv = 'audience_name,customer_id,email_hash,phone_hash,total_spent,order_count\n';

    const appendAudienceData = (lists, prefix) => {
      if (!lists) return;
      Object.entries(lists).forEach(([key, list]) => {
        if (list.data && list.data.data) {
          list.data.data.forEach(customer => {
            csv += `${prefix}_${key},${customer.customer_id},${customer.email_hash || ''},${customer.phone_hash || ''},${customer.total_spent || 0},${customer.order_count || 0}\n`;
          });
        }
      });
    };

    if (audienceType === 'all' || audienceType === 'customer_match') {
      appendAudienceData(audiences.customerMatchLists, 'customer_match');
    }
    if (audienceType === 'all' || audienceType === 'lookalike') {
      appendAudienceData(audiences.lookalikeAudiences, 'lookalike');
    }
    if (audienceType === 'all' || audienceType === 'exclusion') {
      appendAudienceData(audiences.exclusionLists, 'exclusion');
    }

    return csv;
  }

  /**
   * Update metrics
   */
  updateMetrics(startTime) {
    const duration = Date.now() - startTime;
    const total = this.metrics.audiencesCreated;
    this.metrics.avgBuildTime = total > 0
      ? (this.metrics.avgBuildTime * (total - 1) + duration) / total
      : duration;
  }

  /**
   * Clear cache
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      for (const key of this.audienceCache.keys()) {
        if (key.startsWith(`audience:${tenantId}:`)) {
          this.audienceCache.delete(key);
        }
      }
    } else {
      this.audienceCache.clear();
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.audienceCache.size,
      cacheHitRate: this.metrics.cacheMisses > 0
        ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// Export singleton instance
const audienceBuilder = new AudienceBuilderService();

export default audienceBuilder;
export { AudienceBuilderService };