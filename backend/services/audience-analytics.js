/**
 * Audience Analytics Service
 * Analytics for audience performance tracking and insights
 * Supports 1M+ customer records with real-time metrics
 */

import optimizedSheets from './sheets.js';
import segmentEngine from './segment-engine.js';

class AudienceAnalyticsService {
  constructor() {
    this.metricsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    
    // Performance tracking
    this.metrics = {
      analyticsGenerated: 0,
      avgCalculationTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0
    };

    // Predefined analytics queries
    this.analyticsQueries = {
      customerSegmentation: {
        name: 'Customer Segmentation',
        description: 'Segment customers by spending behavior',
        queries: {
          highValue: "SELECT * FROM customers WHERE total_spent >= 500",
          mediumValue: "SELECT * FROM customers WHERE total_spent >= 100 AND total_spent < 500", 
          lowValue: "SELECT * FROM customers WHERE total_spent < 100",
          newCustomers: "SELECT * FROM customers WHERE order_count = 1",
          loyalCustomers: "SELECT * FROM customers WHERE order_count >= 5"
        }
      },
      purchaseBehavior: {
        name: 'Purchase Behavior',
        description: 'Analyze customer purchase patterns',
        queries: {
          recentBuyers: "SELECT * FROM customers WHERE last_order_at >= '2024-01-01'",
          categoryLovers: "SELECT top_category, COUNT(*) as customers FROM customers GROUP BY top_category ORDER BY customers DESC",
          spendingTrends: "SELECT total_spent, COUNT(*) as customers FROM customers GROUP BY total_spent ORDER BY total_spent"
        }
      },
      audienceHealth: {
        name: 'Audience Health',
        description: 'Overall audience metrics and health indicators',
        queries: {
          totalCustomers: "SELECT COUNT(*) as total FROM customers",
          avgOrderValue: "SELECT AVG(total_spent / order_count) as aov FROM customers WHERE order_count > 0",
          totalRevenue: "SELECT SUM(total_spent) as revenue FROM customers",
          avgOrdersPerCustomer: "SELECT AVG(order_count) as avg_orders FROM customers"
        }
      }
    };
  }

  /**
   * Generate comprehensive audience analytics
   */
  async generateAudienceAnalytics(tenantId, options = {}) {
    const {
      timeframe = '30d',
      includeSegmentation = true,
      includeBehavior = true,
      includeHealth = true,
      useCache = true
    } = options;

    const startTime = Date.now();
    const cacheKey = `${tenantId}:analytics:${timeframe}:${includeSegmentation}:${includeBehavior}:${includeHealth}`;

    try {
      // Check cache first
      if (useCache && this.metricsCache.has(cacheKey)) {
        const cached = this.metricsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          this.metrics.cacheHits++;
          return {
            ...cached.data,
            fromCache: true,
            generatedAt: cached.timestamp
          };
        }
      }

      this.metrics.cacheMisses++;

      console.log(`Generating audience analytics for tenant ${tenantId}`);

      // Load base customer data
      const customers = await this.loadCustomerData(tenantId, timeframe);
      
      const analytics = {
        tenantId,
        timeframe,
        totalCustomers: customers.length,
        generatedAt: Date.now(),
        fromCache: false
      };

      // Generate different analytics modules
      if (includeHealth) {
        analytics.audienceHealth = await this.calculateAudienceHealth(tenantId, customers);
      }

      if (includeSegmentation) {
        analytics.segmentation = await this.calculateSegmentation(tenantId, customers);
      }

      if (includeBehavior) {
        analytics.behavior = await this.calculateBehaviorMetrics(tenantId, customers);
      }

      // Calculate derived metrics
      analytics.insights = this.generateInsights(analytics);
      analytics.recommendations = this.generateRecommendations(analytics);

      const executionTime = Date.now() - startTime;
      analytics.executionTime = executionTime;

      // Update metrics
      this.updateMetrics(startTime);

      // Cache the result
      if (useCache) {
        this.metricsCache.set(cacheKey, {
          data: analytics,
          timestamp: Date.now()
        });
      }

      console.log(`Audience analytics completed for tenant ${tenantId} in ${executionTime}ms`);
      return analytics;

    } catch (error) {
      this.metrics.errorCount++;
      console.error(`Audience analytics failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Load customer data with timeframe filtering
   */
  async loadCustomerData(tenantId, timeframe) {
    try {
      const customers = await optimizedSheets.getRows(tenantId, 'AUDIENCE_SEEDS', {
        limit: 1000000, // Support 1M+ records
        useCache: true
      });

      // Apply timeframe filtering
      if (timeframe && timeframe !== 'all') {
        const cutoffDate = this.calculateCutoffDate(timeframe);
        return customers.filter(customer => {
          const customerDate = new Date(customer.last_order_at || customer.created_at);
          return customerDate >= cutoffDate;
        });
      }

      return customers;
    } catch (error) {
      throw new Error(`Failed to load customer data: ${error.message}`);
    }
  }

  /**
   * Calculate audience health metrics
   */
  async calculateAudienceHealth(tenantId, customers) {
    const totalCustomers = customers.length;
    
    if (totalCustomers === 0) {
      return {
        totalCustomers: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        averageOrdersPerCustomer: 0,
        customerLifetimeValue: 0,
        activeCustomers: 0
      };
    }

    // Calculate basic metrics
    const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
    const totalOrders = customers.reduce((sum, c) => sum + Number(c.order_count || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageOrdersPerCustomer = totalOrders / totalCustomers;
    const customerLifetimeValue = totalRevenue / totalCustomers;

    // Calculate active customers (ordered in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const activeCustomers = customers.filter(c => {
      const lastOrder = new Date(c.last_order_at || 0);
      return lastOrder >= ninetyDaysAgo;
    }).length;

    // Revenue distribution
    const revenueDistribution = this.calculateRevenueDistribution(customers);

    // Customer value segments
    const valueSegments = this.calculateValueSegments(customers);

    return {
      totalCustomers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      averageOrdersPerCustomer: Number(averageOrdersPerCustomer.toFixed(2)),
      customerLifetimeValue: Number(customerLifetimeValue.toFixed(2)),
      activeCustomers,
      activeCustomerRate: Number(((activeCustomers / totalCustomers) * 100).toFixed(2)),
      revenueDistribution,
      valueSegments
    };
  }

  /**
   * Calculate customer segmentation
   */
  async calculateSegmentation(tenantId, customers) {
    const segments = {
      byValue: this.segmentByValue(customers),
      byFrequency: this.segmentByFrequency(customers),
      byRecency: this.segmentByRecency(customers),
      byCategory: this.segmentByCategory(customers),
      rfm: this.calculateRFMSegmentation(customers)
    };

    return segments;
  }

  /**
   * Calculate behavior metrics
   */
  async calculateBehaviorMetrics(tenantId, customers) {
    const behavior = {
      purchaseFrequency: this.calculatePurchaseFrequency(customers),
      categoryPreferences: this.calculateCategoryPreferences(customers),
      seasonality: this.calculateSeasonality(customers),
      churnRisk: this.calculateChurnRisk(customers),
      retentionRates: this.calculateRetentionRates(customers)
    };

    return behavior;
  }

  /**
   * Segment customers by spending value
   */
  segmentByValue(customers) {
    const segments = {
      vip: customers.filter(c => Number(c.total_spent || 0) >= 1000),
      high: customers.filter(c => Number(c.total_spent || 0) >= 500 && Number(c.total_spent || 0) < 1000),
      medium: customers.filter(c => Number(c.total_spent || 0) >= 100 && Number(c.total_spent || 0) < 500),
      low: customers.filter(c => Number(c.total_spent || 0) < 100)
    };

    return {
      vip: { count: segments.vip.length, percentage: (segments.vip.length / customers.length * 100).toFixed(1) },
      high: { count: segments.high.length, percentage: (segments.high.length / customers.length * 100).toFixed(1) },
      medium: { count: segments.medium.length, percentage: (segments.medium.length / customers.length * 100).toFixed(1) },
      low: { count: segments.low.length, percentage: (segments.low.length / customers.length * 100).toFixed(1) }
    };
  }

  /**
   * Segment customers by purchase frequency
   */
  segmentByFrequency(customers) {
    const segments = {
      loyal: customers.filter(c => Number(c.order_count || 0) >= 10),
      repeat: customers.filter(c => Number(c.order_count || 0) >= 3 && Number(c.order_count || 0) < 10),
      occasional: customers.filter(c => Number(c.order_count || 0) === 2),
      oneTime: customers.filter(c => Number(c.order_count || 0) === 1)
    };

    return {
      loyal: { count: segments.loyal.length, percentage: (segments.loyal.length / customers.length * 100).toFixed(1) },
      repeat: { count: segments.repeat.length, percentage: (segments.repeat.length / customers.length * 100).toFixed(1) },
      occasional: { count: segments.occasional.length, percentage: (segments.occasional.length / customers.length * 100).toFixed(1) },
      oneTime: { count: segments.oneTime.length, percentage: (segments.oneTime.length / customers.length * 100).toFixed(1) }
    };
  }

  /**
   * Segment customers by recency
   */
  segmentByRecency(customers) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const segments = {
      recent: customers.filter(c => new Date(c.last_order_at || 0) >= thirtyDaysAgo),
      active: customers.filter(c => {
        const date = new Date(c.last_order_at || 0);
        return date < thirtyDaysAgo && date >= ninetyDaysAgo;
      }),
      dormant: customers.filter(c => {
        const date = new Date(c.last_order_at || 0);
        return date < ninetyDaysAgo && date >= oneYearAgo;
      }),
      churned: customers.filter(c => new Date(c.last_order_at || 0) < oneYearAgo)
    };

    return {
      recent: { count: segments.recent.length, percentage: (segments.recent.length / customers.length * 100).toFixed(1) },
      active: { count: segments.active.length, percentage: (segments.active.length / customers.length * 100).toFixed(1) },
      dormant: { count: segments.dormant.length, percentage: (segments.dormant.length / customers.length * 100).toFixed(1) },
      churned: { count: segments.churned.length, percentage: (segments.churned.length / customers.length * 100).toFixed(1) }
    };
  }

  /**
   * Segment customers by category preference
   */
  segmentByCategory(customers) {
    const categoryMap = new Map();
    
    customers.forEach(customer => {
      const category = customer.top_category || 'uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const sorted = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 categories

    return sorted.map(([category, count]) => ({
      category,
      count,
      percentage: (count / customers.length * 100).toFixed(1)
    }));
  }

  /**
   * Calculate RFM (Recency, Frequency, Monetary) segmentation
   */
  calculateRFMSegmentation(customers) {
    if (customers.length === 0) return {};

    // Calculate RFM scores for each customer
    const customersWithRFM = customers.map(customer => {
      const recency = this.calculateRecencyScore(customer.last_order_at);
      const frequency = this.calculateFrequencyScore(Number(customer.order_count || 0));
      const monetary = this.calculateMonetaryScore(Number(customer.total_spent || 0));
      
      return {
        ...customer,
        rfm: { recency, frequency, monetary },
        rfmScore: `${recency}${frequency}${monetary}`
      };
    });

    // Group by RFM segments
    const segments = {
      champions: customersWithRFM.filter(c => c.rfm.recency >= 4 && c.rfm.frequency >= 4 && c.rfm.monetary >= 4),
      loyalCustomers: customersWithRFM.filter(c => c.rfm.recency >= 3 && c.rfm.frequency >= 3 && c.rfm.monetary >= 3),
      potentialLoyalists: customersWithRFM.filter(c => c.rfm.recency >= 3 && c.rfm.frequency <= 2 && c.rfm.monetary >= 2),
      newCustomers: customersWithRFM.filter(c => c.rfm.recency >= 4 && c.rfm.frequency <= 2 && c.rfm.monetary <= 2),
      promising: customersWithRFM.filter(c => c.rfm.recency >= 3 && c.rfm.frequency <= 2 && c.rfm.monetary <= 2),
      needAttention: customersWithRFM.filter(c => c.rfm.recency <= 2 && c.rfm.frequency >= 3 && c.rfm.monetary >= 3),
      aboutToSleep: customersWithRFM.filter(c => c.rfm.recency <= 2 && c.rfm.frequency <= 2 && c.rfm.monetary >= 2),
      atRisk: customersWithRFM.filter(c => c.rfm.recency <= 2 && c.rfm.frequency >= 2 && c.rfm.monetary <= 2),
      cannotLoseThem: customersWithRFM.filter(c => c.rfm.recency <= 2 && c.rfm.frequency >= 4 && c.rfm.monetary >= 4),
      hibernating: customersWithRFM.filter(c => c.rfm.recency <= 2 && c.rfm.frequency <= 2 && c.rfm.monetary <= 2)
    };

    const rfmResult = {};
    Object.keys(segments).forEach(segment => {
      rfmResult[segment] = {
        count: segments[segment].length,
        percentage: (segments[segment].length / customers.length * 100).toFixed(1)
      };
    });

    return rfmResult;
  }

  /**
   * Calculate recency score (1-5)
   */
  calculateRecencyScore(lastOrderDate) {
    if (!lastOrderDate) return 1;
    
    const daysSinceLastOrder = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastOrder <= 30) return 5;
    if (daysSinceLastOrder <= 60) return 4;
    if (daysSinceLastOrder <= 90) return 3;
    if (daysSinceLastOrder <= 180) return 2;
    return 1;
  }

  /**
   * Calculate frequency score (1-5)
   */
  calculateFrequencyScore(orderCount) {
    if (orderCount >= 20) return 5;
    if (orderCount >= 10) return 4;
    if (orderCount >= 5) return 3;
    if (orderCount >= 2) return 2;
    return 1;
  }

  /**
   * Calculate monetary score (1-5)
   */
  calculateMonetaryScore(totalSpent) {
    if (totalSpent >= 1000) return 5;
    if (totalSpent >= 500) return 4;
    if (totalSpent >= 200) return 3;
    if (totalSpent >= 50) return 2;
    return 1;
  }

  /**
   * Calculate revenue distribution
   */
  calculateRevenueDistribution(customers) {
    const buckets = {
      '0-50': 0,
      '51-100': 0,
      '101-250': 0,
      '251-500': 0,
      '501-1000': 0,
      '1000+': 0
    };

    customers.forEach(customer => {
      const spent = Number(customer.total_spent || 0);
      if (spent <= 50) buckets['0-50']++;
      else if (spent <= 100) buckets['51-100']++;
      else if (spent <= 250) buckets['101-250']++;
      else if (spent <= 500) buckets['251-500']++;
      else if (spent <= 1000) buckets['501-1000']++;
      else buckets['1000+']++;
    });

    return Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
      percentage: customers.length > 0 ? (count / customers.length * 100).toFixed(1) : '0'
    }));
  }

  /**
   * Calculate value segments
   */
  calculateValueSegments(customers) {
    const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
    
    const segments = this.segmentByValue(customers);
    
    // Calculate revenue contribution for each segment
    Object.keys(segments).forEach(segment => {
      const segmentCustomers = customers.filter(c => {
        const spent = Number(c.total_spent || 0);
        switch (segment) {
          case 'vip': return spent >= 1000;
          case 'high': return spent >= 500 && spent < 1000;
          case 'medium': return spent >= 100 && spent < 500;
          case 'low': return spent < 100;
          default: return false;
        }
      });
      
      const segmentRevenue = segmentCustomers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
      segments[segment].revenueContribution = totalRevenue > 0 ? (segmentRevenue / totalRevenue * 100).toFixed(1) : '0';
      segments[segment].avgSpending = segmentCustomers.length > 0 ? (segmentRevenue / segmentCustomers.length).toFixed(2) : '0';
    });

    return segments;
  }

  /**
   * Calculate purchase frequency distribution
   */
  calculatePurchaseFrequency(customers) {
    const frequencies = new Map();
    
    customers.forEach(customer => {
      const orders = Number(customer.order_count || 0);
      frequencies.set(orders, (frequencies.get(orders) || 0) + 1);
    });

    return Array.from(frequencies.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([orders, count]) => ({
        orders,
        customers: count,
        percentage: (count / customers.length * 100).toFixed(1)
      }));
  }

  /**
   * Calculate category preferences
   */
  calculateCategoryPreferences(customers) {
    return this.segmentByCategory(customers);
  }

  /**
   * Calculate seasonality patterns
   */
  calculateSeasonality(customers) {
    const months = new Array(12).fill(0);
    
    customers.forEach(customer => {
      if (customer.last_order_at) {
        const month = new Date(customer.last_order_at).getMonth();
        months[month]++;
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return months.map((count, index) => ({
      month: monthNames[index],
      orders: count,
      percentage: customers.length > 0 ? (count / customers.length * 100).toFixed(1) : '0'
    }));
  }

  /**
   * Calculate churn risk
   */
  calculateChurnRisk(customers) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const atRisk = customers.filter(customer => {
      const lastOrder = new Date(customer.last_order_at || 0);
      return lastOrder < ninetyDaysAgo && lastOrder >= oneEightyDaysAgo;
    });

    const highRisk = customers.filter(customer => {
      const lastOrder = new Date(customer.last_order_at || 0);
      return lastOrder < oneEightyDaysAgo;
    });

    return {
      atRisk: {
        count: atRisk.length,
        percentage: (atRisk.length / customers.length * 100).toFixed(1)
      },
      highRisk: {
        count: highRisk.length,
        percentage: (highRisk.length / customers.length * 100).toFixed(1)
      }
    };
  }

  /**
   * Calculate retention rates
   */
  calculateRetentionRates(customers) {
    // Simple retention calculation based on repeat purchases
    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter(c => Number(c.order_count || 0) > 1).length;
    const loyalCustomers = customers.filter(c => Number(c.order_count || 0) >= 5).length;

    return {
      repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100).toFixed(1) : '0',
      loyaltyRate: totalCustomers > 0 ? (loyalCustomers / totalCustomers * 100).toFixed(1) : '0'
    };
  }

  /**
   * Generate insights from analytics data
   */
  generateInsights(analytics) {
    const insights = [];

    if (analytics.audienceHealth) {
      const health = analytics.audienceHealth;
      
      // Revenue insights
      if (health.totalRevenue > 0) {
        insights.push({
          type: 'revenue',
          level: 'info',
          message: `Total revenue of $${health.totalRevenue.toLocaleString()} with an average order value of $${health.averageOrderValue}`
        });
      }

      // Active customer insights
      if (health.activeCustomerRate < 30) {
        insights.push({
          type: 'retention',
          level: 'warning',
          message: `Only ${health.activeCustomerRate}% of customers are active (ordered in last 90 days)`
        });
      }
    }

    if (analytics.segmentation) {
      const seg = analytics.segmentation;
      
      // One-time customer warning
      if (seg.byFrequency && Number(seg.byFrequency.oneTime.percentage) > 60) {
        insights.push({
          type: 'retention',
          level: 'warning',
          message: `${seg.byFrequency.oneTime.percentage}% of customers have only made one purchase`
        });
      }

      // High-value customer opportunity
      if (seg.byValue && Number(seg.byValue.vip.percentage) < 5) {
        insights.push({
          type: 'opportunity',
          level: 'info',
          message: `Only ${seg.byValue.vip.percentage}% are VIP customers - opportunity to grow high-value segment`
        });
      }
    }

    return insights;
  }

  /**
   * Generate recommendations based on analytics
   */
  generateRecommendations(analytics) {
    const recommendations = [];

    if (analytics.behavior && analytics.behavior.churnRisk) {
      const churn = analytics.behavior.churnRisk;
      
      if (Number(churn.atRisk.percentage) > 10) {
        recommendations.push({
          type: 'retention',
          priority: 'high',
          title: 'Re-engage At-Risk Customers',
          description: `${churn.atRisk.count} customers (${churn.atRisk.percentage}%) are at risk of churning`,
          action: 'Create a re-engagement campaign targeting customers who haven\'t purchased in 90+ days'
        });
      }
    }

    if (analytics.segmentation && analytics.segmentation.byFrequency) {
      const freq = analytics.segmentation.byFrequency;
      
      if (Number(freq.oneTime.percentage) > 50) {
        recommendations.push({
          type: 'acquisition',
          priority: 'medium',
          title: 'Convert One-Time Buyers',
          description: `${freq.oneTime.percentage}% of customers have only purchased once`,
          action: 'Implement a follow-up email series to encourage second purchases'
        });
      }
    }

    if (analytics.audienceHealth && analytics.audienceHealth.averageOrderValue < 50) {
      recommendations.push({
        type: 'revenue',
        priority: 'medium',
        title: 'Increase Average Order Value',
        description: `Current AOV is $${analytics.audienceHealth.averageOrderValue}`,
        action: 'Consider product bundling, upsells, or minimum order incentives'
      });
    }

    return recommendations;
  }

  /**
   * Calculate cutoff date for timeframe
   */
  calculateCutoffDate(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // Beginning of time
    }
  }

  /**
   * Get segment performance analytics
   */
  async getSegmentPerformance(tenantId, segmentKey, timeframe = '30d') {
    try {
      const segmentResult = await segmentEngine.executeSegment(
        tenantId, 
        segmentKey, 
        `SELECT * FROM customers`,
        { useCache: true }
      );

      const segmentCustomers = segmentResult.data;
      
      // Calculate performance metrics for the segment
      const performance = {
        segmentKey,
        totalCustomers: segmentCustomers.length,
        totalRevenue: segmentCustomers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0),
        averageOrderValue: 0,
        conversionRate: 0,
        retentionRate: 0
      };

      if (segmentCustomers.length > 0) {
        const totalOrders = segmentCustomers.reduce((sum, c) => sum + Number(c.order_count || 0), 0);
        performance.averageOrderValue = totalOrders > 0 ? performance.totalRevenue / totalOrders : 0;
        
        const repeatCustomers = segmentCustomers.filter(c => Number(c.order_count || 0) > 1).length;
        performance.retentionRate = (repeatCustomers / segmentCustomers.length) * 100;
      }

      return performance;
    } catch (error) {
      throw new Error(`Failed to get segment performance: ${error.message}`);
    }
  }

  /**
   * Compare segments
   */
  async compareSegments(tenantId, segmentKeys, timeframe = '30d') {
    const comparisons = [];
    
    for (const segmentKey of segmentKeys) {
      try {
        const performance = await this.getSegmentPerformance(tenantId, segmentKey, timeframe);
        comparisons.push(performance);
      } catch (error) {
        console.error(`Failed to analyze segment ${segmentKey}:`, error);
      }
    }

    return {
      segments: comparisons,
      summary: this.generateSegmentComparison(comparisons)
    };
  }

  /**
   * Generate segment comparison summary
   */
  generateSegmentComparison(segments) {
    if (segments.length === 0) return {};

    const bestRevenue = segments.reduce((max, s) => s.totalRevenue > max.totalRevenue ? s : max);
    const bestAOV = segments.reduce((max, s) => s.averageOrderValue > max.averageOrderValue ? s : max);
    const bestRetention = segments.reduce((max, s) => s.retentionRate > max.retentionRate ? s : max);

    return {
      bestRevenue: bestRevenue.segmentKey,
      bestAOV: bestAOV.segmentKey,
      bestRetention: bestRetention.segmentKey,
      totalCustomers: segments.reduce((sum, s) => sum + s.totalCustomers, 0),
      totalRevenue: segments.reduce((sum, s) => sum + s.totalRevenue, 0)
    };
  }

  /**
   * Update metrics
   */
  updateMetrics(startTime) {
    const executionTime = Date.now() - startTime;
    
    this.metrics.analyticsGenerated++;
    this.metrics.avgCalculationTime = 
      (this.metrics.avgCalculationTime + executionTime) / this.metrics.analyticsGenerated;
  }

  /**
   * Clear analytics cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.metricsCache.keys()) {
        if (key.includes(pattern)) {
          this.metricsCache.delete(key);
        }
      }
    } else {
      this.metricsCache.clear();
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cachedAnalytics: this.metricsCache.size,
      availableQueries: Object.keys(this.analyticsQueries).length
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      cacheSize: this.metricsCache.size
    };
  }
}

// Singleton instance
const audienceAnalytics = new AudienceAnalyticsService();

export default audienceAnalytics;
export { AudienceAnalyticsService };