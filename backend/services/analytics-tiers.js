/**
 * Analytics Tiers Service
 * Provides tier-specific analytics features matching Shopify plan promises
 * 
 * Tier Differentiation:
 * - Starter: Basic performance analytics, Basic ROAS tracking
 * - Professional: Real-time performance analytics, Advanced ROAS analytics
 * - Enterprise: Custom performance dashboards, Custom ROAS modeling
 */

import subscriptionCheck from "../middleware/subscription-check.js";

const { getCurrentSubscription } = subscriptionCheck;

// Analytics feature definitions by tier
const ANALYTICS_FEATURES = {
  starter: {
    // Basic performance analytics
    basicMetrics: true,
    basicCharts: true,
    summaryKpis: true,
    basicRoas: true,
    weeklyReports: false, // Monthly only
    realTimeUpdates: false,
    advancedSegmentation: false,
    customDashboards: false,
    exportFormats: ["csv"],
    dataPeriods: ["7d", "30d"],
    maxDataPoints: 100,
    refreshInterval: 300000, // 5 minutes
  },
  professional: {
    // Real-time performance analytics + Advanced ROAS analytics
    basicMetrics: true,
    basicCharts: true,
    advancedCharts: true,
    summaryKpis: true,
    detailedKpis: true,
    basicRoas: true,
    advancedRoas: true,
    segmentedRoas: true,
    weeklyReports: true,
    realTimeUpdates: true,
    advancedSegmentation: true,
    customDashboards: false,
    exportFormats: ["csv", "excel"],
    dataPeriods: ["24h", "7d", "30d", "90d"],
    maxDataPoints: 500,
    refreshInterval: 30000, // 30 seconds
  },
  enterprise: {
    // Custom performance dashboards + Custom ROAS modeling + Full AI automation suite
    basicMetrics: true,
    basicCharts: true,
    advancedCharts: true,
    customCharts: true,
    summaryKpis: true,
    detailedKpis: true,
    customKpis: true,
    basicRoas: true,
    advancedRoas: true,
    segmentedRoas: true,
    customRoasModels: true,
    weeklyReports: true,
    dailyReports: true,
    realTimeUpdates: true,
    advancedSegmentation: true,
    customDashboards: true,
    customFilters: true,
    // Advanced AI automation features
    advancedAutomation: true,
    fullAiAutomationSuite: true,
    automatedBidManagement: true,
    customBidStrategies: true,
    automationRules: true,
    performanceOptimization: true,
    budgetReallocation: true,
    keywordExpansion: true,
    negativeKeywordMining: true,
    automationAlerts: true,
    customOptimizationAlgorithms: true,
    exportFormats: ["csv", "excel", "pdf", "json"],
    dataPeriods: ["24h", "7d", "30d", "90d", "1y", "all"],
    maxDataPoints: -1, // unlimited
    refreshInterval: 10000, // 10 seconds
  }
};

// Chart types by tier
const CHART_TYPES = {
  starter: ["line", "bar"],
  professional: ["line", "bar", "area", "pie", "scatter"],
  enterprise: ["line", "bar", "area", "pie", "scatter", "heatmap", "funnel", "custom"]
};

// KPI definitions by tier
const KPI_DEFINITIONS = {
  starter: {
    basic: ["clicks", "cost", "conversions", "impressions", "ctr", "cpc", "cpa"]
  },
  professional: {
    basic: ["clicks", "cost", "conversions", "impressions", "ctr", "cpc", "cpa"],
    detailed: ["roas", "profit", "revenue", "margin", "ltv", "conversion_rate", "quality_score"]
  },
  enterprise: {
    basic: ["clicks", "cost", "conversions", "impressions", "ctr", "cpc", "cpa"],
    detailed: ["roas", "profit", "revenue", "margin", "ltv", "conversion_rate", "quality_score"],
    custom: [] // User-defined KPIs
  }
};

class AnalyticsTiersService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Get analytics features for a specific tenant
   */
  async getTierFeatures(tenant) {
    try {
      const cacheKey = `tier-features:${tenant}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const subscription = await getCurrentSubscription(tenant);
      const tier = subscription.tier || "starter";
      
      const features = {
        tier,
        ...ANALYTICS_FEATURES[tier],
        chartTypes: CHART_TYPES[tier],
        kpis: KPI_DEFINITIONS[tier],
        subscription
      };

      this.cache.set(cacheKey, {
        data: features,
        timestamp: Date.now()
      });

      return features;
    } catch (error) {
      console.error("Error getting tier features:", error);
      // Default to starter features on error
      return {
        tier: "starter",
        ...ANALYTICS_FEATURES.starter,
        chartTypes: CHART_TYPES.starter,
        kpis: KPI_DEFINITIONS.starter,
        subscription: { tier: "starter", status: "active" }
      };
    }
  }

  /**
   * Filter analytics data based on tier limitations
   */
  async filterAnalyticsData(tenant, data) {
    const features = await this.getTierFeatures(tenant);
    const startTime = Date.now();
    
    // Apply data point limits
    let dataPointsFiltered = 0;
    if (features.maxDataPoints > 0 && data.series) {
      const originalLength = data.series.length;
      data.series = data.series.slice(0, features.maxDataPoints);
      dataPointsFiltered = originalLength - data.series.length;
    }
    
    // Filter KPIs based on tier
    const filteredKpis = [];
    if (data.kpi && features.kpis) {
      const allowedKpis = [
        ...(features.kpis.basic || []),
        ...(features.kpis.detailed || []),
        ...(features.kpis.custom || [])
      ];
      
      const filteredKpi = {};
      for (const [key, value] of Object.entries(data.kpi)) {
        if (allowedKpis.includes(key)) {
          filteredKpi[key] = value;
        } else {
          filteredKpis.push(key);
        }
      }
      data.kpi = filteredKpi;
    }

    // Filter chart types
    if (data.chartConfig) {
      data.chartConfig.availableTypes = features.chartTypes;
    }

    // Add export format restrictions
    if (data.exportOptions) {
      data.exportOptions = data.exportOptions.filter(format => 
        features.exportFormats.includes(format)
      );
    }

    // Add tier-specific metadata with filtering info
    data.tierInfo = {
      tier: features.tier,
      refreshInterval: features.refreshInterval,
      realTimeEnabled: features.realTimeUpdates,
      upgradeRequired: dataPointsFiltered > 0 || filteredKpis.length > 0,
      limitations: {
        dataPointsFiltered,
        kpisFiltered: filteredKpis,
        maxDataPoints: features.maxDataPoints,
        availableCharts: features.chartTypes.length,
        exportFormats: features.exportFormats.length
      },
      processingTime: Date.now() - startTime
    };

    return data;
  }

  /**
   * Check if feature is available for tenant's tier
   */
  async hasFeature(tenant, featureName) {
    const features = await this.getTierFeatures(tenant);
    return features[featureName] === true;
  }

  /**
   * Get upgrade prompts for restricted features
   */
  async getUpgradePrompts(tenant, requestedFeatures = []) {
    const features = await this.getTierFeatures(tenant);
    const prompts = [];

    for (const feature of requestedFeatures) {
      if (!features[feature]) {
        const requiredTier = this.getRequiredTierForFeature(feature);
        if (requiredTier && requiredTier !== features.tier) {
          prompts.push({
            feature,
            currentTier: features.tier,
            requiredTier,
            message: this.getUpgradeMessage(feature, requiredTier),
            upgradeUrl: `/app/billing`
          });
        }
      }
    }

    return prompts;
  }

  /**
   * Get required tier for a specific feature
   */
  getRequiredTierForFeature(feature) {
    for (const [tier, tierFeatures] of Object.entries(ANALYTICS_FEATURES)) {
      if (tierFeatures[feature] === true) {
        return tier;
      }
    }
    return null;
  }

  /**
   * Get upgrade message for a feature
   */
  getUpgradeMessage(feature, requiredTier) {
    const messages = {
      realTimeUpdates: `Real-time updates require ${requiredTier} plan. Upgrade to see live performance data.`,
      advancedRoas: `Advanced ROAS analytics are available with ${requiredTier} plan. Get deeper insights into your campaign profitability.`,
      customDashboards: `Custom dashboards are an ${requiredTier} feature. Create personalized analytics views.`,
      customRoasModels: `Custom ROAS modeling is exclusive to ${requiredTier}. Build your own profitability calculations.`,
      advancedSegmentation: `Advanced segmentation requires ${requiredTier} plan. Analyze performance by custom segments.`,
      weeklyReports: `Weekly automated reports are available with ${requiredTier} plan or higher.`,
      dailyReports: `Daily automated reports are exclusive to ${requiredTier} plan.`
    };

    return messages[feature] || `This feature requires ${requiredTier} plan or higher.`;
  }

  /**
   * Get analytics configuration for tier
   */
  async getAnalyticsConfig(tenant) {
    const features = await this.getTierFeatures(tenant);

    return {
      tier: features.tier,
      refreshInterval: features.refreshInterval,
      maxDataPoints: features.maxDataPoints,
      availableCharts: features.chartTypes,
      availableExports: features.exportFormats,
      availablePeriods: features.dataPeriods,
      realTimeEnabled: features.realTimeUpdates,
      customDashboardsEnabled: features.customDashboards,
      advancedFeaturesEnabled: features.advancedSegmentation
    };
  }

  /**
   * Apply tier-specific data transformations
   */
  async transformDataForTier(tenant, rawData) {
    const features = await this.getTierFeatures(tenant);

    // Starter tier: Basic transformations only
    if (features.tier === "starter") {
      return {
        ...rawData,
        // Simplify data structure
        kpi: this.simplifyKpis(rawData.kpi),
        // Limit series data
        series: rawData.series?.slice(0, features.maxDataPoints),
        // Remove advanced features
        explain: undefined,
        advanced_metrics: undefined
      };
    }

    // Professional tier: Add advanced calculations
    if (features.tier === "professional") {
      return {
        ...rawData,
        // Add advanced KPIs
        advanced_kpi: this.calculateAdvancedKpis(rawData),
        // Add trend analysis
        trends: this.calculateTrends(rawData.series),
        // Keep explain but enhance it
        explain: rawData.explain
      };
    }

    // Enterprise tier: Full feature set
    if (features.tier === "enterprise") {
      return {
        ...rawData,
        // Add all advanced features
        advanced_kpi: this.calculateAdvancedKpis(rawData),
        custom_kpi: this.calculateCustomKpis(rawData),
        trends: this.calculateTrends(rawData.series),
        forecasting: this.calculateForecasting(rawData.series),
        benchmarks: this.calculateBenchmarks(rawData),
        explain: rawData.explain
      };
    }

    return rawData;
  }

  /**
   * Simplify KPIs for Starter tier
   */
  simplifyKpis(kpi) {
    if (!kpi) return {};
    
    const basicKpis = KPI_DEFINITIONS.starter.basic;
    const simplified = {};
    
    for (const key of basicKpis) {
      if (kpi[key] !== undefined) {
        simplified[key] = kpi[key];
      }
    }
    
    return simplified;
  }

  /**
   * Calculate advanced KPIs for Professional/Enterprise tiers
   */
  calculateAdvancedKpis(data) {
    if (!data.kpi) return {};

    const advanced = {};
    const kpi = data.kpi;

    // Calculate ROAS
    if (kpi.conversions && kpi.cost) {
      advanced.roas = kpi.conversions > 0 ? (kpi.conversions / kpi.cost).toFixed(2) : 0;
    }

    // Calculate conversion rate
    if (kpi.conversions && kpi.clicks) {
      advanced.conversion_rate = kpi.clicks > 0 ? ((kpi.conversions / kpi.clicks) * 100).toFixed(2) : 0;
    }

    // Calculate profit margin (assuming avg order value)
    const avgOrderValue = 50; // This would come from actual data
    if (kpi.conversions && kpi.cost) {
      const revenue = kpi.conversions * avgOrderValue;
      advanced.profit = (revenue - kpi.cost).toFixed(2);
      advanced.profit_margin = revenue > 0 ? (((revenue - kpi.cost) / revenue) * 100).toFixed(2) : 0;
    }

    return advanced;
  }

  /**
   * Calculate custom KPIs for Enterprise tier
   */
  calculateCustomKpis(data) {
    // Enterprise customers can define custom KPI calculations
    // This would integrate with a custom KPI builder
    return {
      // Placeholder for custom KPIs
      custom_metric_1: 0,
      custom_metric_2: 0
    };
  }

  /**
   * Calculate trends for Professional/Enterprise tiers
   */
  calculateTrends(series) {
    if (!series || series.length < 2) return {};

    const latest = series[series.length - 1];
    const previous = series[series.length - 2];

    if (!latest || !previous) return {};

    const trends = {};
    const metrics = ['clicks', 'cost', 'conv', 'impr'];

    for (const metric of metrics) {
      const currentValue = latest[metric] || 0;
      const previousValue = previous[metric] || 0;
      
      if (previousValue > 0) {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        trends[`${metric}_trend`] = {
          value: change.toFixed(2),
          direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
        };
      }
    }

    return trends;
  }

  /**
   * Calculate forecasting for Enterprise tier
   */
  calculateForecasting(series) {
    if (!series || series.length < 3) return {};

    // Simple linear regression for forecasting
    // In production, this would use more sophisticated algorithms
    const forecast = {};
    const metrics = ['clicks', 'cost', 'conv'];

    for (const metric of metrics) {
      const values = series.map(s => s[metric] || 0);
      const n = values.length;
      
      if (n >= 3) {
        // Calculate trend
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, val, idx) => sum + (val * idx), 0);
        const sumX2 = values.reduce((sum, _, idx) => sum + (idx * idx), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Forecast next value
        forecast[`${metric}_forecast`] = (slope * n + intercept).toFixed(2);
      }
    }

    return forecast;
  }

  /**
   * Calculate benchmarks for Enterprise tier
   */
  calculateBenchmarks(data) {
    // Industry benchmarks - would come from external data source
    return {
      industry_ctr: 2.41,
      industry_cpc: 1.16,
      industry_conversion_rate: 3.75,
      performance_score: this.calculatePerformanceScore(data.kpi)
    };
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(kpi) {
    if (!kpi) return 0;

    let score = 0;
    let factors = 0;

    // CTR score (industry avg: 2.41%)
    if (kpi.ctr) {
      const ctrScore = Math.min(100, (kpi.ctr / 2.41) * 100);
      score += ctrScore;
      factors++;
    }

    // Conversion rate score (industry avg: 3.75%)
    if (kpi.conversions && kpi.clicks) {
      const convRate = (kpi.conversions / kpi.clicks) * 100;
      const convScore = Math.min(100, (convRate / 3.75) * 100);
      score += convScore;
      factors++;
    }

    // CPC efficiency score (lower is better, industry avg: $1.16)
    if (kpi.cpc) {
      const cpcScore = Math.min(100, (1.16 / kpi.cpc) * 100);
      score += cpcScore;
      factors++;
    }

    return factors > 0 ? Math.round(score / factors) : 0;
  }

  /**
   * Clear cache for tenant
   */
  clearCache(tenant) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(tenant)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get query optimization recommendations
   */
  async getQueryOptimizations(tenant, queryType = 'insights') {
    const features = await this.getTierFeatures(tenant);
    const optimizations = [];
    
    // Tier-specific optimizations
    if (features.tier === 'starter') {
      optimizations.push({
        type: 'limit',
        title: 'Data Point Limitation',
        description: `Queries limited to ${features.maxDataPoints} data points for optimal performance`,
        impact: 'medium',
        implementation: 'automatic'
      });
      
      optimizations.push({
        type: 'caching',
        title: 'Extended Caching',
        description: '5-minute cache intervals reduce database load',
        impact: 'high',
        implementation: 'automatic'
      });
    }
    
    if (features.tier === 'professional') {
      optimizations.push({
        type: 'realtime',
        title: 'Real-time Updates',
        description: '30-second cache for near real-time performance',
        impact: 'high',
        implementation: 'automatic'
      });
      
      optimizations.push({
        type: 'indexing',
        title: 'Advanced Indexing',
        description: 'Optimized indexes for segmented queries',
        impact: 'medium',
        implementation: 'recommended'
      });
    }
    
    if (features.tier === 'enterprise') {
      optimizations.push({
        type: 'realtime',
        title: 'Ultra Real-time',
        description: '10-second cache for maximum freshness',
        impact: 'high',
        implementation: 'automatic'
      });
      
      optimizations.push({
        type: 'partitioning',
        title: 'Data Partitioning',
        description: 'Partitioned tables for unlimited data points',
        impact: 'high',
        implementation: 'recommended'
      });
      
      optimizations.push({
        type: 'precomputing',
        title: 'Pre-computed Metrics',
        description: 'Background metric calculation for instant dashboards',
        impact: 'very_high',
        implementation: 'available'
      });
    }
    
    return {
      tenant,
      tier: features.tier,
      queryType,
      optimizations,
      recommendedIndexes: this.getRecommendedIndexes(features.tier),
      estimatedPerformanceGain: this.calculatePerformanceGain(optimizations)
    };
  }
  
  /**
   * Get recommended database indexes for tier
   */
  getRecommendedIndexes(tier) {
    const baseIndexes = [
      { table: 'METRICS', columns: ['date', 'campaign'], type: 'composite' },
      { table: 'SEARCH_TERMS', columns: ['date', 'search_term'], type: 'composite' }
    ];
    
    const professionalIndexes = [
      ...baseIndexes,
      { table: 'METRICS', columns: ['conversions', 'cost'], type: 'composite' },
      { table: 'SEARCH_TERMS', columns: ['clicks', 'cost', 'conversions'], type: 'covering' }
    ];
    
    const enterpriseIndexes = [
      ...professionalIndexes,
      { table: 'METRICS', columns: ['date'], type: 'partitioned' },
      { table: 'SEARCH_TERMS', columns: ['campaign', 'ad_group', 'search_term'], type: 'covering' },
      { table: 'CUSTOM_METRICS', columns: ['tenant', 'metric_name', 'date'], type: 'composite' }
    ];
    
    switch (tier) {
      case 'enterprise': return enterpriseIndexes;
      case 'professional': return professionalIndexes;
      default: return baseIndexes;
    }
  }
  
  /**
   * Calculate estimated performance gain
   */
  calculatePerformanceGain(optimizations) {
    const impactScores = {
      'very_high': 50,
      'high': 30,
      'medium': 15,
      'low': 5
    };
    
    const totalGain = optimizations.reduce((sum, opt) => {
      return sum + (impactScores[opt.impact] || 0);
    }, 0);
    
    return {
      estimatedSpeedupPercent: Math.min(totalGain, 80), // Cap at 80%
      optimizationCount: optimizations.length,
      highImpactCount: optimizations.filter(o => ['very_high', 'high'].includes(o.impact)).length
    };
  }

  /**
   * Validate tier access to specific analytics feature
   */
  async validateFeatureAccess(tenant, feature, throwOnDenied = false) {
    const features = await this.getTierFeatures(tenant);
    const hasAccess = features[feature] === true;
    
    if (!hasAccess && throwOnDenied) {
      const requiredTier = this.getRequiredTierForFeature(feature);
      throw new Error(`Feature '${feature}' requires ${requiredTier} tier. Current tier: ${features.tier}`);
    }
    
    return {
      hasAccess,
      currentTier: features.tier,
      requiredTier: hasAccess ? features.tier : this.getRequiredTierForFeature(feature),
      upgradeRequired: !hasAccess
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      status: "healthy",
      cacheSize: this.cache.size,
      supportedTiers: Object.keys(ANALYTICS_FEATURES),
      featureMatrix: {
        starter: Object.keys(ANALYTICS_FEATURES.starter).filter(k => ANALYTICS_FEATURES.starter[k] === true).length,
        professional: Object.keys(ANALYTICS_FEATURES.professional).filter(k => ANALYTICS_FEATURES.professional[k] === true).length,
        enterprise: Object.keys(ANALYTICS_FEATURES.enterprise).filter(k => ANALYTICS_FEATURES.enterprise[k] === true).length
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const analyticsTiers = new AnalyticsTiersService();
export default analyticsTiers;
export { AnalyticsTiersService, ANALYTICS_FEATURES, CHART_TYPES, KPI_DEFINITIONS };