/**
 * ROAS Calculator Service
 * Provides tier-differentiated ROAS calculations
 * 
 * Tier Differentiation:
 * - Starter: Basic ROAS tracking (simple revenue/ad_spend)
 * - Professional: Advanced ROAS analytics (segmented, attribution, LTV)
 * - Enterprise: Custom ROAS modeling (custom formulas, multi-touch attribution)
 */

import analyticsTiers from "./analytics-tiers.js";

// ROAS calculation methods by tier
const ROAS_METHODS = {
  starter: {
    basic: true,
    segmented: false,
    attributed: false,
    ltv: false,
    custom: false
  },
  professional: {
    basic: true,
    segmented: true,
    attributed: true,
    ltv: true,
    custom: false
  },
  enterprise: {
    basic: true,
    segmented: true,
    attributed: true,
    ltv: true,
    custom: true
  }
};

// Attribution models by tier
const ATTRIBUTION_MODELS = {
  starter: ["last_click"],
  professional: ["last_click", "first_click", "linear"],
  enterprise: ["last_click", "first_click", "linear", "time_decay", "position_based", "custom"]
};

// Default industry values
const INDUSTRY_DEFAULTS = {
  avgOrderValue: 50,
  avgMargin: 0.3, // 30% margin
  customerLifetimeValue: 150,
  repeatPurchaseRate: 0.27,
  avgOrdersPerCustomer: 2.4
};

class ROASCalculatorService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minute cache
    this.customModels = new Map(); // Store custom ROAS models for Enterprise
  }

  /**
   * Calculate ROAS based on tenant's tier
   */
  async calculateROAS(tenant, data, options = {}) {
    try {
      const features = await analyticsTiers.getTierFeatures(tenant);
      const cacheKey = `roas:${tenant}:${JSON.stringify(data)}:${JSON.stringify(options)}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      let roasData = {};

      // Basic ROAS (all tiers)
      if (features.basicRoas) {
        roasData.basic = this.calculateBasicROAS(data);
      }

      // Advanced ROAS (Professional+)
      if (features.advancedRoas) {
        roasData.advanced = await this.calculateAdvancedROAS(tenant, data, options);
      }

      // Segmented ROAS (Professional+)
      if (features.segmentedRoas) {
        roasData.segmented = await this.calculateSegmentedROAS(tenant, data, options);
      }

      // Custom ROAS Models (Enterprise only)
      if (features.customRoasModels) {
        roasData.custom = await this.calculateCustomROAS(tenant, data, options);
      }

      // Add tier info and recommendations
      roasData.tierInfo = {
        tier: features.tier,
        availableMethods: ROAS_METHODS[features.tier],
        attributionModels: ATTRIBUTION_MODELS[features.tier]
      };

      roasData.recommendations = this.generateROASRecommendations(roasData, features.tier);

      // Cache result
      this.cache.set(cacheKey, {
        data: roasData,
        timestamp: Date.now()
      });

      return roasData;
    } catch (error) {
      console.error("ROAS calculation error:", error);
      return this.getErrorResponse(error);
    }
  }

  /**
   * Basic ROAS calculation (all tiers)
   */
  calculateBasicROAS(data) {
    const { cost = 0, conversions = 0, revenue } = data;
    
    if (cost === 0) return { roas: 0, revenue: 0, cost: 0, conversions: 0 };

    // Calculate revenue if not provided
    let calculatedRevenue = revenue;
    if (!calculatedRevenue && conversions > 0) {
      calculatedRevenue = conversions * INDUSTRY_DEFAULTS.avgOrderValue;
    }

    const roas = calculatedRevenue > 0 ? calculatedRevenue / cost : 0;

    return {
      roas: Number(roas.toFixed(2)),
      revenue: Number(calculatedRevenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      conversions: Number(conversions),
      profit: Number((calculatedRevenue - cost).toFixed(2)),
      profitMargin: calculatedRevenue > 0 ? Number((((calculatedRevenue - cost) / calculatedRevenue) * 100).toFixed(1)) : 0
    };
  }

  /**
   * Advanced ROAS calculation (Professional+)
   */
  async calculateAdvancedROAS(tenant, data, options = {}) {
    const basic = this.calculateBasicROAS(data);
    const { attributionModel = "last_click", includeLTV = true } = options;

    const advanced = {
      ...basic,
      attributionModel,
      metrics: {}
    };

    // LTV-based ROAS
    if (includeLTV) {
      const ltvRevenue = data.conversions * INDUSTRY_DEFAULTS.customerLifetimeValue;
      advanced.metrics.ltvRoas = data.cost > 0 ? Number((ltvRevenue / data.cost).toFixed(2)) : 0;
      advanced.metrics.ltvRevenue = Number(ltvRevenue.toFixed(2));
    }

    // Attribution-adjusted ROAS
    advanced.metrics.attributedRoas = this.applyAttributionModel(basic.roas, attributionModel);

    // Margin-adjusted ROAS
    const marginRevenue = basic.revenue * INDUSTRY_DEFAULTS.avgMargin;
    advanced.metrics.marginRoas = data.cost > 0 ? Number((marginRevenue / data.cost).toFixed(2)) : 0;

    // Efficiency metrics
    advanced.metrics.costPerAcquisition = data.conversions > 0 ? Number((data.cost / data.conversions).toFixed(2)) : 0;
    advanced.metrics.revenuePerClick = data.clicks > 0 ? Number((basic.revenue / data.clicks).toFixed(2)) : 0;

    // Performance indicators
    advanced.performance = this.calculateROASPerformance(advanced);

    return advanced;
  }

  /**
   * Segmented ROAS calculation (Professional+)
   */
  async calculateSegmentedROAS(tenant, data, options = {}) {
    const { segments = [] } = options;
    
    if (segments.length === 0) {
      // Default segments if none provided
      return this.calculateDefaultSegments(data);
    }

    const segmentedResults = {};
    
    for (const segment of segments) {
      if (segment.data) {
        segmentedResults[segment.name] = {
          ...this.calculateBasicROAS(segment.data),
          segmentInfo: {
            name: segment.name,
            type: segment.type || 'custom',
            criteria: segment.criteria || {}
          }
        };
      }
    }

    return {
      segments: segmentedResults,
      comparison: this.compareSegments(segmentedResults),
      insights: this.generateSegmentInsights(segmentedResults)
    };
  }

  /**
   * Custom ROAS calculation (Enterprise only)
   */
  async calculateCustomROAS(tenant, data, options = {}) {
    const { customModel } = options;
    
    if (customModel && this.customModels.has(`${tenant}:${customModel}`)) {
      return this.executeCustomModel(tenant, customModel, data);
    }

    // Default custom calculations for Enterprise
    return {
      multiTouchAttribution: this.calculateMultiTouchAttribution(data),
      incrementalROAS: this.calculateIncrementalROAS(data),
      crossChannelROAS: this.calculateCrossChannelROAS(data),
      cohortROAS: this.calculateCohortROAS(data)
    };
  }

  /**
   * Apply attribution model adjustments
   */
  applyAttributionModel(baseRoas, model) {
    const adjustmentFactors = {
      last_click: 1.0,
      first_click: 0.85,
      linear: 0.92,
      time_decay: 0.95,
      position_based: 0.90,
      custom: 1.0
    };

    return Number((baseRoas * (adjustmentFactors[model] || 1.0)).toFixed(2));
  }

  /**
   * Calculate default segments
   */
  calculateDefaultSegments(data) {
    const total = this.calculateBasicROAS(data);
    
    // Simulate device segments
    const mobileData = { ...data, cost: data.cost * 0.6, conversions: data.conversions * 0.5 };
    const desktopData = { ...data, cost: data.cost * 0.4, conversions: data.conversions * 0.5 };

    return {
      segments: {
        mobile: {
          ...this.calculateBasicROAS(mobileData),
          segmentInfo: { name: 'Mobile', type: 'device' }
        },
        desktop: {
          ...this.calculateBasicROAS(desktopData),
          segmentInfo: { name: 'Desktop', type: 'device' }
        }
      },
      total: total
    };
  }

  /**
   * Compare segments performance
   */
  compareSegments(segments) {
    const segmentArray = Object.entries(segments).map(([name, data]) => ({
      name,
      ...data
    }));

    if (segmentArray.length === 0) return {};

    const bestRoas = segmentArray.reduce((max, seg) => seg.roas > max.roas ? seg : max);
    const worstRoas = segmentArray.reduce((min, seg) => seg.roas < min.roas ? seg : min);

    return {
      bestPerforming: bestRoas.name,
      worstPerforming: worstRoas.name,
      roasSpread: Number((bestRoas.roas - worstRoas.roas).toFixed(2)),
      avgRoas: Number((segmentArray.reduce((sum, seg) => sum + seg.roas, 0) / segmentArray.length).toFixed(2))
    };
  }

  /**
   * Generate segment insights
   */
  generateSegmentInsights(segments) {
    const insights = [];
    const segmentArray = Object.values(segments);

    if (segmentArray.length < 2) return insights;

    // Find performance gaps
    const maxRoas = Math.max(...segmentArray.map(s => s.roas));
    const minRoas = Math.min(...segmentArray.map(s => s.roas));

    if (maxRoas - minRoas > 1.0) {
      insights.push({
        type: "performance_gap",
        message: `Significant ROAS variation detected (${minRoas.toFixed(2)} - ${maxRoas.toFixed(2)}). Consider reallocating budget to better performing segments.`
      });
    }

    // Find underperforming segments
    const avgRoas = segmentArray.reduce((sum, s) => sum + s.roas, 0) / segmentArray.length;
    const underperforming = segmentArray.filter(s => s.roas < avgRoas * 0.7);

    if (underperforming.length > 0) {
      insights.push({
        type: "underperforming",
        message: `${underperforming.length} segment(s) performing significantly below average. Review targeting and creative.`
      });
    }

    return insights;
  }

  /**
   * Calculate multi-touch attribution (Enterprise)
   */
  calculateMultiTouchAttribution(data) {
    // Simulate multi-touch attribution
    const touchPoints = 3.2; // Average touchpoints
    const distributedRevenue = (data.conversions * INDUSTRY_DEFAULTS.avgOrderValue) / touchPoints;
    
    return {
      averageTouchPoints: touchPoints,
      distributedRevenue: Number(distributedRevenue.toFixed(2)),
      attributedRoas: data.cost > 0 ? Number((distributedRevenue / data.cost).toFixed(2)) : 0,
      touchPointValue: Number((distributedRevenue / touchPoints).toFixed(2))
    };
  }

  /**
   * Calculate incremental ROAS (Enterprise)
   */
  calculateIncrementalROAS(data) {
    // Simulate incremental lift calculation
    const baselineConversions = data.conversions * 0.15; // 15% baseline
    const incrementalConversions = data.conversions - baselineConversions;
    const incrementalRevenue = incrementalConversions * INDUSTRY_DEFAULTS.avgOrderValue;
    
    return {
      baselineConversions: Number(baselineConversions.toFixed(2)),
      incrementalConversions: Number(incrementalConversions.toFixed(2)),
      incrementalRevenue: Number(incrementalRevenue.toFixed(2)),
      incrementalRoas: data.cost > 0 ? Number((incrementalRevenue / data.cost).toFixed(2)) : 0,
      lift: data.conversions > 0 ? Number(((incrementalConversions / baselineConversions) * 100).toFixed(1)) : 0
    };
  }

  /**
   * Calculate cross-channel ROAS (Enterprise)
   */
  calculateCrossChannelROAS(data) {
    // Simulate cross-channel attribution
    return {
      searchContribution: 0.65,
      displayContribution: 0.25,
      socialContribution: 0.10,
      totalRoas: this.calculateBasicROAS(data).roas,
      searchRoas: this.calculateBasicROAS(data).roas * 1.2,
      displayRoas: this.calculateBasicROAS(data).roas * 0.8,
      socialRoas: this.calculateBasicROAS(data).roas * 0.6
    };
  }

  /**
   * Calculate cohort ROAS (Enterprise)
   */
  calculateCohortROAS(data) {
    // Simulate cohort analysis
    return {
      newCustomerRoas: this.calculateBasicROAS(data).roas * 0.8,
      returningCustomerRoas: this.calculateBasicROAS(data).roas * 1.4,
      cohortBreakdown: {
        "0-30 days": this.calculateBasicROAS(data).roas * 0.7,
        "31-90 days": this.calculateBasicROAS(data).roas * 1.1,
        "91+ days": this.calculateBasicROAS(data).roas * 1.6
      }
    };
  }

  /**
   * Calculate ROAS performance indicators
   */
  calculateROASPerformance(roasData) {
    const { roas } = roasData;
    
    // Industry benchmarks
    const benchmarks = {
      excellent: 4.0,
      good: 3.0,
      average: 2.0,
      poor: 1.0
    };

    let performance = "poor";
    if (roas >= benchmarks.excellent) performance = "excellent";
    else if (roas >= benchmarks.good) performance = "good";
    else if (roas >= benchmarks.average) performance = "average";

    return {
      rating: performance,
      score: Math.min(100, Math.round((roas / benchmarks.excellent) * 100)),
      benchmark: benchmarks,
      vsIndustry: roas >= 2.87 ? "above" : "below" // Industry avg ROAS
    };
  }

  /**
   * Generate ROAS recommendations
   */
  generateROASRecommendations(roasData, tier) {
    const recommendations = [];
    const { basic } = roasData;

    if (!basic) return recommendations;

    // Low ROAS recommendations
    if (basic.roas < 2.0) {
      recommendations.push({
        priority: "high",
        type: "performance",
        title: "Improve ROAS Performance",
        message: `Current ROAS of ${basic.roas} is below industry average. Consider optimizing targeting and creative.`,
        actions: ["Review keyword targeting", "Test new ad creative", "Adjust bidding strategy"]
      });
    }

    // High cost recommendations
    if (basic.cost > 1000 && basic.roas < 3.0) {
      recommendations.push({
        priority: "medium",
        type: "budget",
        title: "Budget Optimization",
        message: "High spend with moderate ROAS. Consider budget reallocation.",
        actions: ["Analyze top performing campaigns", "Reduce spend on low ROAS segments"]
      });
    }

    // Tier-specific recommendations
    if (tier === "starter" && basic.roas > 3.0) {
      recommendations.push({
        priority: "low",
        type: "upgrade",
        title: "Unlock Advanced ROAS Analytics",
        message: "Your campaigns are performing well! Upgrade to Professional for advanced ROAS insights.",
        actions: ["View LTV-based ROAS", "Analyze attribution models", "Get segmented performance"]
      });
    }

    return recommendations;
  }

  /**
   * Save custom ROAS model (Enterprise only)
   */
  async saveCustomModel(tenant, modelName, modelConfig) {
    const key = `${tenant}:${modelName}`;
    this.customModels.set(key, {
      ...modelConfig,
      createdAt: Date.now(),
      tenant
    });

    return { success: true, modelKey: key };
  }

  /**
   * Execute custom ROAS model (Enterprise only)
   */
  executeCustomModel(tenant, modelName, data) {
    const key = `${tenant}:${modelName}`;
    const model = this.customModels.get(key);

    if (!model) {
      throw new Error(`Custom model ${modelName} not found`);
    }

    // Execute custom formula (simplified)
    // In production, this would use a secure formula engine
    const result = this.calculateBasicROAS(data);
    result.customModelApplied = modelName;
    result.customFormula = model.formula || "revenue / cost";

    return result;
  }

  /**
   * Get error response
   */
  getErrorResponse(error) {
    return {
      error: true,
      message: error.message || "ROAS calculation failed",
      basic: { roas: 0, revenue: 0, cost: 0, conversions: 0 },
      tierInfo: { tier: "unknown" }
    };
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
   * Get service health
   */
  getHealthStatus() {
    return {
      status: "healthy",
      cacheSize: this.cache.size,
      customModels: this.customModels.size,
      supportedTiers: Object.keys(ROAS_METHODS),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const roasCalculator = new ROASCalculatorService();
export default roasCalculator;
export { ROASCalculatorService, ROAS_METHODS, ATTRIBUTION_MODELS, INDUSTRY_DEFAULTS };