/**
 * Customer Segmentation Service
 * Advanced RFM analysis and value-based customer segmentation
 *
 * Features:
 * - RFM (Recency, Frequency, Monetary) analysis
 * - Customer lifetime value (CLV) calculation
 * - VIP and at-risk customer identification
 * - Churn prediction and prevention
 * - Custom behavioral segments
 * - Real-time segment updates
 */

import dataStore from './data-store.js';
import { executeQuery } from './supabase-client.js';
import logger from './logger.js';

class CustomerSegmentationService {
  constructor() {
    // Segment cache
    this.segmentCache = new Map();
    this.cacheTtl = 10 * 60 * 1000; // 10 minutes

    // RFM scoring thresholds (quintiles)
    this.rfmThresholds = {
      recency: [7, 30, 90, 180], // days
      frequency: [1, 2, 5, 10], // orders
      monetary: [50, 150, 500, 1000] // dollars
    };

    // Segment definitions
    this.segmentDefinitions = {
      champions: {
        label: 'Champions',
        description: 'Best customers: bought recently, buy often, spend the most',
        rfmPattern: { R: [4, 5], F: [4, 5], M: [4, 5] },
        priority: 1,
        color: '#00C853'
      },
      loyalCustomers: {
        label: 'Loyal Customers',
        description: 'Buy regularly and spend good amounts',
        rfmPattern: { R: [3, 4, 5], F: [4, 5], M: [3, 4, 5] },
        priority: 2,
        color: '#00E676'
      },
      potentialLoyalists: {
        label: 'Potential Loyalists',
        description: 'Recent customers with average frequency and spending',
        rfmPattern: { R: [4, 5], F: [2, 3], M: [2, 3, 4] },
        priority: 3,
        color: '#76FF03'
      },
      recentCustomers: {
        label: 'Recent Customers',
        description: 'Bought recently but not frequently',
        rfmPattern: { R: [4, 5], F: [1], M: [1, 2, 3] },
        priority: 4,
        color: '#FFEB3B'
      },
      promisingCustomers: {
        label: 'Promising',
        description: 'Recent shoppers with potential',
        rfmPattern: { R: [3, 4], F: [1, 2], M: [1, 2, 3] },
        priority: 5,
        color: '#FFC107'
      },
      needsAttention: {
        label: 'Needs Attention',
        description: 'Above average recency, frequency and monetary values',
        rfmPattern: { R: [3], F: [3], M: [3] },
        priority: 6,
        color: '#FF9800'
      },
      aboutToSleep: {
        label: 'About to Sleep',
        description: 'Below average recency and frequency, spend well',
        rfmPattern: { R: [2, 3], F: [2, 3], M: [3, 4, 5] },
        priority: 7,
        color: '#FF5722'
      },
      atRisk: {
        label: 'At Risk',
        description: 'Spent big money, purchased often but long time ago',
        rfmPattern: { R: [1, 2], F: [3, 4, 5], M: [3, 4, 5] },
        priority: 8,
        color: '#F44336'
      },
      cantLoseThem: {
        label: 'Cannot Lose Them',
        description: 'Made big purchases and often, but long time ago',
        rfmPattern: { R: [1, 2], F: [4, 5], M: [4, 5] },
        priority: 9,
        color: '#E91E63'
      },
      hibernating: {
        label: 'Hibernating',
        description: 'Last purchase was long ago, low spenders, low frequency',
        rfmPattern: { R: [1, 2], F: [1, 2], M: [1, 2] },
        priority: 10,
        color: '#9E9E9E'
      },
      lost: {
        label: 'Lost',
        description: 'Lowest recency, frequency and monetary scores',
        rfmPattern: { R: [1], F: [1], M: [1, 2] },
        priority: 11,
        color: '#616161'
      }
    };

    // Metrics
    this.metrics = {
      segmentationsPerformed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgExecutionTime: 0,
      errors: 0
    };
  }

  /**
   * Perform comprehensive customer segmentation
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Configuration options
   * @returns {Promise<object>} Segmentation results
   */
  async segmentCustomers(tenantId, options = {}) {
    const {
      refreshCache = false,
      includeCustomerIds = false,
      minOrders = 0,
      customThresholds = null
    } = options;

    const startTime = Date.now();
    const cacheKey = `segment:${tenantId}:${minOrders}`;

    try {
      // Check cache
      if (!refreshCache && this.segmentCache.has(cacheKey)) {
        const cached = this.segmentCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTtl) {
          this.metrics.cacheHits++;
          logger.info('Segmentation served from cache', { tenantId });
          return { ...cached.data, fromCache: true };
        }
      }

      this.metrics.cacheMisses++;
      logger.info('Performing customer segmentation', { tenantId, minOrders });

      // Use custom thresholds if provided
      const thresholds = customThresholds || this.rfmThresholds;

      // Load customer data
      const customers = await this.loadCustomerData(tenantId, { minOrders });

      if (!customers || customers.length === 0) {
        return {
          tenantId,
          totalCustomers: 0,
          message: 'No customer data available',
          generatedAt: new Date().toISOString()
        };
      }

      // Calculate RFM scores
      const customersWithRFM = this.calculateRFMScores(customers, thresholds);

      // Assign segments
      const segmentedCustomers = this.assignSegments(customersWithRFM);

      // Aggregate segment statistics
      const segmentStats = this.aggregateSegmentStats(segmentedCustomers, includeCustomerIds);

      // Calculate CLV (Customer Lifetime Value)
      const clvAnalysis = this.calculateCLV(customers);

      // Identify special groups
      const specialGroups = this.identifySpecialGroups(segmentedCustomers);

      // Generate actionable insights
      const insights = this.generateSegmentInsights(segmentStats, specialGroups);

      const result = {
        tenantId,
        totalCustomers: customers.length,
        generatedAt: new Date().toISOString(),
        fromCache: false,

        // RFM segmentation
        rfmSegments: segmentStats,

        // CLV analysis
        lifetimeValue: clvAnalysis,

        // Special customer groups
        specialGroups,

        // Actionable insights
        insights,

        // Segment distribution summary
        distribution: this.calculateDistribution(segmentStats, customers.length),

        // Execution metrics
        executionTime: Date.now() - startTime,
        thresholdsUsed: thresholds
      };

      // Cache the result
      this.segmentCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      this.metrics.segmentationsPerformed++;
      this.updateMetrics(startTime);

      logger.info('Customer segmentation completed', {
        tenantId,
        customerCount: customers.length,
        segmentCount: Object.keys(segmentStats).length,
        executionTime: result.executionTime
      });

      return result;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to segment customers', {
        tenantId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Load customer data
   */
  async loadCustomerData(tenantId, options = {}) {
    const { minOrders = 0 } = options;

    try {
      const customers = await executeQuery(async (client) => {
        let query = client
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId);

        if (minOrders > 0) {
          query = query.gte('order_count', minOrders);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      });

      return customers;
    } catch (error) {
      logger.warn('Supabase customer load failed', { tenantId, error: error.message });
      return [];
    }
  }

  /**
   * Calculate RFM scores for all customers
   */
  calculateRFMScores(customers, thresholds) {
    const now = Date.now();

    return customers.map(customer => {
      // Calculate Recency (days since last order)
      const lastOrderDate = customer.last_order_at ? new Date(customer.last_order_at) : null;
      const recencyDays = lastOrderDate
        ? Math.floor((now - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : 9999;

      // Frequency (order count)
      const frequency = Number(customer.order_count || 0);

      // Monetary (total spent)
      const monetary = Number(customer.total_spent || 0);

      // Calculate scores (1-5 scale, 5 being best)
      const rScore = this.scoreRecency(recencyDays, thresholds.recency);
      const fScore = this.scoreFrequency(frequency, thresholds.frequency);
      const mScore = this.scoreMonetary(monetary, thresholds.monetary);

      return {
        ...customer,
        rfm: {
          recencyDays,
          frequency,
          monetary,
          rScore,
          fScore,
          mScore,
          totalScore: rScore + fScore + mScore,
          rfmString: `${rScore}${fScore}${mScore}`
        }
      };
    });
  }

  /**
   * Score recency (lower days = higher score)
   */
  scoreRecency(days, thresholds) {
    if (days <= thresholds[0]) return 5;
    if (days <= thresholds[1]) return 4;
    if (days <= thresholds[2]) return 3;
    if (days <= thresholds[3]) return 2;
    return 1;
  }

  /**
   * Score frequency (higher orders = higher score)
   */
  scoreFrequency(orders, thresholds) {
    if (orders >= thresholds[3]) return 5;
    if (orders >= thresholds[2]) return 4;
    if (orders >= thresholds[1]) return 3;
    if (orders > thresholds[0]) return 2;
    return 1;
  }

  /**
   * Score monetary (higher spend = higher score)
   */
  scoreMonetary(spent, thresholds) {
    if (spent >= thresholds[3]) return 5;
    if (spent >= thresholds[2]) return 4;
    if (spent >= thresholds[1]) return 3;
    if (spent >= thresholds[0]) return 2;
    return 1;
  }

  /**
   * Assign customers to segments based on RFM scores
   */
  assignSegments(customers) {
    return customers.map(customer => {
      const segment = this.matchSegment(customer.rfm);
      return {
        ...customer,
        segment: segment.label,
        segmentPriority: segment.priority,
        segmentColor: segment.color,
        segmentDescription: segment.description
      };
    });
  }

  /**
   * Match customer to segment based on RFM pattern
   */
  matchSegment(rfm) {
    // Try to match against defined segments
    for (const [key, segment] of Object.entries(this.segmentDefinitions)) {
      if (
        segment.rfmPattern.R.includes(rfm.rScore) &&
        segment.rfmPattern.F.includes(rfm.fScore) &&
        segment.rfmPattern.M.includes(rfm.mScore)
      ) {
        return segment;
      }
    }

    // Default segment if no match
    return {
      label: 'Other',
      description: 'Does not match predefined segments',
      priority: 99,
      color: '#BDBDBD'
    };
  }

  /**
   * Aggregate statistics by segment
   */
  aggregateSegmentStats(customers, includeCustomerIds = false) {
    const stats = {};

    customers.forEach(customer => {
      const segmentKey = customer.segment;

      if (!stats[segmentKey]) {
        stats[segmentKey] = {
          label: customer.segment,
          description: customer.segmentDescription,
          priority: customer.segmentPriority,
          color: customer.segmentColor,
          customerCount: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          avgOrderCount: 0,
          avgRecencyDays: 0,
          customers: []
        };
      }

      stats[segmentKey].customerCount++;
      stats[segmentKey].totalRevenue += customer.rfm.monetary;
      stats[segmentKey].avgOrderCount += customer.rfm.frequency;
      stats[segmentKey].avgRecencyDays += customer.rfm.recencyDays;

      if (includeCustomerIds) {
        stats[segmentKey].customers.push(customer.customer_id);
      }
    });

    // Calculate averages
    Object.keys(stats).forEach(key => {
      const segment = stats[key];
      segment.avgOrderValue = segment.customerCount > 0
        ? (segment.totalRevenue / segment.customerCount).toFixed(2)
        : 0;
      segment.avgOrderCount = segment.customerCount > 0
        ? (segment.avgOrderCount / segment.customerCount).toFixed(2)
        : 0;
      segment.avgRecencyDays = segment.customerCount > 0
        ? Math.round(segment.avgRecencyDays / segment.customerCount)
        : 0;

      if (!includeCustomerIds) {
        delete segment.customers;
      }
    });

    // Sort by priority
    return Object.fromEntries(
      Object.entries(stats).sort((a, b) => a[1].priority - b[1].priority)
    );
  }

  /**
   * Calculate Customer Lifetime Value (CLV)
   */
  calculateCLV(customers) {
    const analysis = {
      totalCustomers: customers.length,
      totalLifetimeValue: 0,
      avgLifetimeValue: 0,
      medianLifetimeValue: 0,
      topPercentile: {
        top1: { threshold: 0, count: 0, totalValue: 0 },
        top5: { threshold: 0, count: 0, totalValue: 0 },
        top10: { threshold: 0, count: 0, totalValue: 0 }
      }
    };

    if (customers.length === 0) return analysis;

    // Sort by total spent
    const sortedBySpend = [...customers].sort((a, b) =>
      Number(b.total_spent || 0) - Number(a.total_spent || 0)
    );

    // Calculate totals
    const totalSpend = sortedBySpend.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
    analysis.totalLifetimeValue = totalSpend.toFixed(2);
    analysis.avgLifetimeValue = (totalSpend / customers.length).toFixed(2);

    // Calculate median
    const midIndex = Math.floor(customers.length / 2);
    analysis.medianLifetimeValue = customers.length % 2 === 0
      ? ((Number(sortedBySpend[midIndex - 1].total_spent || 0) +
          Number(sortedBySpend[midIndex].total_spent || 0)) / 2).toFixed(2)
      : Number(sortedBySpend[midIndex].total_spent || 0).toFixed(2);

    // Top percentiles
    const top1Count = Math.max(1, Math.ceil(customers.length * 0.01));
    const top5Count = Math.max(1, Math.ceil(customers.length * 0.05));
    const top10Count = Math.max(1, Math.ceil(customers.length * 0.10));

    analysis.topPercentile.top1 = this.calculatePercentileStats(sortedBySpend.slice(0, top1Count));
    analysis.topPercentile.top5 = this.calculatePercentileStats(sortedBySpend.slice(0, top5Count));
    analysis.topPercentile.top10 = this.calculatePercentileStats(sortedBySpend.slice(0, top10Count));

    return analysis;
  }

  /**
   * Calculate stats for a percentile group
   */
  calculatePercentileStats(customers) {
    if (customers.length === 0) {
      return { threshold: 0, count: 0, totalValue: 0, avgValue: 0 };
    }

    const totalValue = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
    const minValue = Number(customers[customers.length - 1].total_spent || 0);

    return {
      threshold: minValue.toFixed(2),
      count: customers.length,
      totalValue: totalValue.toFixed(2),
      avgValue: (totalValue / customers.length).toFixed(2)
    };
  }

  /**
   * Identify special customer groups
   */
  identifySpecialGroups(customers) {
    const groups = {
      vip: {
        label: 'VIP Customers',
        description: 'Top tier customers requiring special attention',
        customers: [],
        count: 0,
        totalRevenue: 0
      },
      atRisk: {
        label: 'At Risk',
        description: 'High-value customers who might churn',
        customers: [],
        count: 0,
        potentialLostRevenue: 0
      },
      winBack: {
        label: 'Win Back',
        description: 'Previously valuable customers to re-engage',
        customers: [],
        count: 0,
        potentialRevenue: 0
      },
      newHighPotential: {
        label: 'New High Potential',
        description: 'Recent customers with strong first purchase',
        customers: [],
        count: 0,
        projectedValue: 0
      }
    };

    customers.forEach(customer => {
      // VIP: Champions and Cannot Lose Them
      if (['Champions', 'Cannot Lose Them', 'Loyal Customers'].includes(customer.segment)) {
        groups.vip.customers.push(customer.customer_id);
        groups.vip.count++;
        groups.vip.totalRevenue += customer.rfm.monetary;
      }

      // At Risk: High spenders with decreasing engagement
      if (['At Risk', 'Cannot Lose Them', 'About to Sleep'].includes(customer.segment) &&
          customer.rfm.monetary > 500) {
        groups.atRisk.customers.push(customer.customer_id);
        groups.atRisk.count++;
        groups.atRisk.potentialLostRevenue += customer.rfm.monetary;
      }

      // Win Back: Lost or hibernating high-value customers
      if (['Lost', 'Hibernating'].includes(customer.segment) &&
          customer.rfm.monetary > 200) {
        groups.winBack.customers.push(customer.customer_id);
        groups.winBack.count++;
        groups.winBack.potentialRevenue += customer.rfm.monetary * 0.3; // 30% recovery estimate
      }

      // New High Potential: Recent customers with high first order
      if (customer.segment === 'Recent Customers' &&
          customer.rfm.monetary > 100 &&
          customer.rfm.recencyDays <= 30) {
        groups.newHighPotential.customers.push(customer.customer_id);
        groups.newHighPotential.count++;
        groups.newHighPotential.projectedValue += customer.rfm.monetary * 3; // 3x lifetime estimate
      }
    });

    // Clean up customer lists if not needed
    Object.keys(groups).forEach(key => {
      groups[key].totalRevenue = groups[key].totalRevenue?.toFixed(2) || 0;
      groups[key].potentialLostRevenue = groups[key].potentialLostRevenue?.toFixed(2) || 0;
      groups[key].potentialRevenue = groups[key].potentialRevenue?.toFixed(2) || 0;
      groups[key].projectedValue = groups[key].projectedValue?.toFixed(2) || 0;
      delete groups[key].customers; // Remove IDs from summary
    });

    return groups;
  }

  /**
   * Generate actionable insights
   */
  generateSegmentInsights(segmentStats, specialGroups) {
    const insights = [];

    // Analyze each segment
    Object.entries(segmentStats).forEach(([key, segment]) => {
      if (segment.customerCount === 0) return;

      // Champions insights
      if (key === 'Champions') {
        insights.push({
          segment: key,
          priority: 'high',
          type: 'opportunity',
          message: `You have ${segment.customerCount} Champions spending an average of $${segment.avgOrderValue}. Reward their loyalty with exclusive offers and referral incentives.`,
          actionItems: [
            'Create VIP loyalty program',
            'Offer early access to new products',
            'Request testimonials and reviews',
            'Implement referral rewards'
          ]
        });
      }

      // At Risk insights
      if (key === 'At Risk' || key === 'Cannot Lose Them') {
        insights.push({
          segment: key,
          priority: 'urgent',
          type: 'risk',
          message: `${segment.customerCount} high-value customers are at risk. They spent $${segment.totalRevenue} but haven't ordered in ${segment.avgRecencyDays} days.`,
          actionItems: [
            'Send personalized win-back campaigns',
            'Offer special discounts (15-20%)',
            'Survey to understand why they stopped',
            'Provide customer success outreach'
          ]
        });
      }

      // Recent Customers insights
      if (key === 'Recent Customers' || key === 'Promising') {
        insights.push({
          segment: key,
          priority: 'medium',
          type: 'growth',
          message: `${segment.customerCount} new customers with potential. Convert them to regulars with targeted engagement.`,
          actionItems: [
            'Send post-purchase follow-up emails',
            'Offer second purchase discount',
            'Cross-sell complementary products',
            'Collect feedback to improve experience'
          ]
        });
      }

      // Lost customers insights
      if (key === 'Lost' || key === 'Hibernating') {
        insights.push({
          segment: key,
          priority: 'low',
          type: 'recovery',
          message: `${segment.customerCount} dormant customers. Consider win-back campaigns with strong incentives.`,
          actionItems: [
            'Create "We miss you" campaign',
            'Offer significant discount (25-30%)',
            'Highlight new products/features',
            'Make unsubscribe easy if not interested'
          ]
        });
      }
    });

    // Special groups insights
    if (specialGroups.vip.count > 0) {
      insights.push({
        segment: 'VIP',
        priority: 'high',
        type: 'retention',
        message: `${specialGroups.vip.count} VIP customers generating $${specialGroups.vip.totalRevenue} in revenue. Protect this revenue at all costs.`,
        actionItems: [
          'Assign dedicated account manager',
          'Provide white-glove customer service',
          'Create exclusive VIP benefits',
          'Regular check-ins and feedback sessions'
        ]
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate segment distribution
   */
  calculateDistribution(segmentStats, totalCustomers) {
    const distribution = {
      totalCustomers,
      segments: []
    };

    Object.entries(segmentStats).forEach(([key, segment]) => {
      distribution.segments.push({
        segment: segment.label,
        count: segment.customerCount,
        percentage: totalCustomers > 0
          ? ((segment.customerCount / totalCustomers) * 100).toFixed(2)
          : 0,
        revenue: segment.totalRevenue,
        revenuePercentage: 0 // Will calculate below
      });
    });

    // Calculate revenue percentages
    const totalRevenue = distribution.segments.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
    distribution.segments.forEach(segment => {
      segment.revenuePercentage = totalRevenue > 0
        ? ((Number(segment.revenue) / totalRevenue) * 100).toFixed(2)
        : 0;
    });

    return distribution;
  }

  /**
   * Update metrics
   */
  updateMetrics(startTime) {
    const duration = Date.now() - startTime;
    const total = this.metrics.segmentationsPerformed;
    this.metrics.avgExecutionTime = total > 0
      ? (this.metrics.avgExecutionTime * (total - 1) + duration) / total
      : duration;
  }

  /**
   * Clear cache
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      for (const key of this.segmentCache.keys()) {
        if (key.startsWith(`segment:${tenantId}:`)) {
          this.segmentCache.delete(key);
        }
      }
    } else {
      this.segmentCache.clear();
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.segmentCache.size,
      cacheHitRate: this.metrics.cacheMisses > 0
        ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Get segment definitions
   */
  getSegmentDefinitions() {
    return this.segmentDefinitions;
  }

  /**
   * Update RFM thresholds
   */
  updateThresholds(newThresholds) {
    this.rfmThresholds = {
      ...this.rfmThresholds,
      ...newThresholds
    };
    this.clearCache(); // Clear cache when thresholds change
    logger.info('RFM thresholds updated', { newThresholds });
  }
}

// Export singleton instance
const customerSegmentation = new CustomerSegmentationService();

export default customerSegmentation;
export { CustomerSegmentationService };