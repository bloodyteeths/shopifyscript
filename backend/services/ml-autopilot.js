/**
 * ML-Enhanced Autopilot Service
 *
 * Provides intelligent optimization based on historical patterns and performance data.
 * Learns from past optimizations to make better decisions over time.
 */

import { getJson, setJson } from './redis.js';

class MLAutopilotService {
  constructor() {
    this.initialized = false;
    this.patterns = new Map();
    this.models = {
      timeOfDay: new TimeOfDayModel(),
      dayOfWeek: new DayOfWeekModel(),
      seasonality: new SeasonalityModel(),
      conversionPredictor: new ConversionPredictor(),
      bidOptimizer: new BidOptimizer()
    };
  }

  /**
   * Initialize ML models with historical data
   */
  async initialize(tenant) {
    try {
      // Load existing ML state from Redis
      const mlState = await getJson(`ml_autopilot_state:${tenant}`);
      if (mlState) {
        this.loadState(mlState);
      }

      this.initialized = true;
      console.log(`ML Autopilot initialized for tenant: ${tenant}`);
    } catch (error) {
      console.error('ML Autopilot initialization failed:', error);
    }
  }

  /**
   * Analyze historical performance data to identify patterns
   */
  analyzeHistoricalPatterns(metricsData, searchTermsData) {
    const patterns = {
      timeOfDay: this.models.timeOfDay.analyze(metricsData),
      dayOfWeek: this.models.dayOfWeek.analyze(metricsData),
      seasonality: this.models.seasonality.analyze(metricsData),
      termPerformance: this.analyzeTermPerformance(searchTermsData),
      conversionTrends: this.models.conversionPredictor.analyze(metricsData)
    };

    return patterns;
  }

  /**
   * Generate intelligent optimization plan based on ML insights
   */
  async generateOptimizationPlan(tenant, currentMetrics, config) {
    if (!this.initialized) {
      await this.initialize(tenant);
    }

    const plan = [];
    const insights = await this.getMLInsights(tenant, currentMetrics);

    // ML-enhanced negative keyword suggestions
    const negativeKeywords = this.generateIntelligentNegatives(
      currentMetrics.searchTerms,
      insights
    );
    plan.push(...negativeKeywords);

    // Predictive bid adjustments
    const bidAdjustments = this.generatePredictiveBidAdjustments(
      currentMetrics,
      insights,
      config
    );
    plan.push(...bidAdjustments);

    // Budget allocation optimization
    const budgetOptimizations = this.generateBudgetOptimizations(
      currentMetrics,
      insights,
      config
    );
    plan.push(...budgetOptimizations);

    // Time-based schedule adjustments
    const scheduleOptimizations = this.generateScheduleOptimizations(insights);
    plan.push(...scheduleOptimizations);

    // Add confidence scores to each action
    plan.forEach(action => {
      action.confidence = this.calculateConfidence(action, insights);
      action.reasoning = this.generateReasoning(action, insights);
    });

    return {
      plan,
      insights,
      confidence: this.calculateOverallConfidence(plan),
      learningState: this.getCurrentLearningState()
    };
  }

  /**
   * Generate ML insights from current data and patterns
   */
  async getMLInsights(tenant, currentMetrics) {
    const insights = {
      timeOfDayTrends: this.models.timeOfDay.predict(),
      dayOfWeekTrends: this.models.dayOfWeek.predict(),
      seasonalTrends: this.models.seasonality.predict(),
      conversionPrediction: this.models.conversionPredictor.predict(currentMetrics),
      optimalBidRange: this.models.bidOptimizer.getOptimalRange(currentMetrics),
      performanceForecasts: this.generatePerformanceForecasts(currentMetrics),
      riskAssessment: this.assessOptimizationRisk(currentMetrics)
    };

    return insights;
  }

  /**
   * Generate intelligent negative keyword suggestions
   */
  generateIntelligentNegatives(searchTerms, insights) {
    const negatives = [];
    const riskThreshold = insights.riskAssessment.threshold;

    searchTerms.forEach(term => {
      if (term.conversions === 0 && term.cost > 0) {
        const riskScore = this.calculateTermRisk(term, insights);

        if (riskScore > riskThreshold) {
          negatives.push({
            type: "add_negative",
            term: term.term,
            match: this.selectOptimalMatch(term, insights),
            scope: this.selectOptimalScope(term, insights),
            confidence: riskScore,
            reasoning: `High-risk term based on ML analysis (risk: ${riskScore.toFixed(2)})`
          });
        }
      }
    });

    return negatives.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Generate predictive bid adjustments
   */
  generatePredictiveBidAdjustments(currentMetrics, insights, config) {
    const adjustments = [];
    const { optimalBidRange, conversionPrediction } = insights;

    if (config.targetCPA && currentMetrics.cpa) {
      const predictedCPA = conversionPrediction.predictedCPA;
      const currentCPA = currentMetrics.cpa;

      // ML-enhanced bid adjustment logic
      if (predictedCPA > config.targetCPA * 1.2) {
        const adjustment = this.models.bidOptimizer.calculateOptimalAdjustment(
          currentMetrics,
          config.targetCPA,
          insights
        );

        adjustments.push({
          type: "predictive_bid_adjustment",
          campaign: "*",
          adjustment: adjustment.factor,
          reasoning: `ML predicts CPA increase to ${predictedCPA.toFixed(2)}, adjusting bids by ${(adjustment.factor * 100).toFixed(1)}%`,
          confidence: adjustment.confidence
        });
      }
    }

    return adjustments;
  }

  /**
   * Generate budget allocation optimizations
   */
  generateBudgetOptimizations(currentMetrics, insights, config) {
    const optimizations = [];
    const { timeOfDayTrends, dayOfWeekTrends } = insights;

    // Identify optimal time periods for budget allocation
    const optimalHours = timeOfDayTrends.highPerformanceHours || [];
    const optimalDays = dayOfWeekTrends.highPerformanceDays || [];

    if (optimalHours.length > 0) {
      optimizations.push({
        type: "time_based_budget_allocation",
        schedule: optimalHours,
        allocation: "increased",
        reasoning: "ML identified high-performance time periods",
        confidence: timeOfDayTrends.confidence || 0.7
      });
    }

    return optimizations;
  }

  /**
   * Generate schedule optimizations based on time patterns
   */
  generateScheduleOptimizations(insights) {
    const optimizations = [];
    const { timeOfDayTrends, dayOfWeekTrends } = insights;

    // Suggest optimal scheduling based on historical patterns
    if (timeOfDayTrends.optimalSchedule) {
      optimizations.push({
        type: "schedule_optimization",
        schedule: timeOfDayTrends.optimalSchedule,
        reasoning: "ML-optimized schedule based on historical performance",
        confidence: timeOfDayTrends.confidence || 0.7
      });
    }

    return optimizations;
  }

  /**
   * Learn from optimization results
   */
  async recordOptimizationResult(tenant, action, result) {
    try {
      const learningData = {
        timestamp: Date.now(),
        action,
        result,
        success: result.success || false,
        impact: result.impact || {},
        tenant
      };

      // Store learning data
      const key = `ml_learning:${tenant}:${Date.now()}`;
      await setJson(key, learningData);

      // Update models with new data
      this.updateModelsWithResult(action, result);

      // Save updated ML state
      await this.saveState(tenant);

      console.log(`Recorded optimization result for ${tenant}:`, learningData);
    } catch (error) {
      console.error('Failed to record optimization result:', error);
    }
  }

  /**
   * Update ML models with optimization results
   */
  updateModelsWithResult(action, result) {
    Object.values(this.models).forEach(model => {
      if (model.updateWithResult) {
        model.updateWithResult(action, result);
      }
    });
  }

  /**
   * Calculate confidence score for an action
   */
  calculateConfidence(action, insights) {
    let confidence = 0.5; // Base confidence

    // Adjust based on historical data quality
    if (insights.dataQuality > 0.8) confidence += 0.2;

    // Adjust based on pattern strength
    if (insights.patternStrength > 0.7) confidence += 0.2;

    // Adjust based on action type reliability
    const actionReliability = this.getActionTypeReliability(action.type);
    confidence += actionReliability * 0.3;

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Generate reasoning for an action
   */
  generateReasoning(action, insights) {
    const reasons = [];

    if (action.type === "add_negative") {
      reasons.push(`Term shows ${action.riskScore?.toFixed(2) || 'high'} risk score`);
      if (insights.termPatterns) {
        reasons.push("Similar terms have poor historical performance");
      }
    }

    if (action.type === "predictive_bid_adjustment") {
      reasons.push(`ML predicts performance change`);
      if (insights.conversionPrediction) {
        reasons.push(`Forecasted CPA: ${insights.conversionPrediction.predictedCPA?.toFixed(2)}`);
      }
    }

    return reasons.join(". ");
  }

  /**
   * Calculate overall confidence for the entire plan
   */
  calculateOverallConfidence(plan) {
    if (plan.length === 0) return 0;

    const totalConfidence = plan.reduce((sum, action) => sum + (action.confidence || 0), 0);
    return totalConfidence / plan.length;
  }

  /**
   * Get current learning state
   */
  getCurrentLearningState() {
    return {
      modelsInitialized: this.initialized,
      dataPoints: this.getTotalDataPoints(),
      learningMaturity: this.calculateLearningMaturity(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Helper methods
   */
  analyzeTermPerformance(searchTermsData) {
    const termMap = new Map();

    searchTermsData.forEach(term => {
      const existing = termMap.get(term.term) || {
        clicks: 0, cost: 0, conversions: 0, frequency: 0
      };

      existing.clicks += term.clicks;
      existing.cost += term.cost;
      existing.conversions += term.conversions;
      existing.frequency += 1;

      termMap.set(term.term, existing);
    });

    return Array.from(termMap.entries()).map(([term, data]) => ({
      term,
      ...data,
      cpa: data.conversions > 0 ? data.cost / data.conversions : Infinity,
      ctr: data.clicks > 0 ? data.clicks / (data.clicks * 100) : 0 // Approximate
    }));
  }

  calculateTermRisk(term, insights) {
    let risk = 0;

    // Base risk from cost without conversions
    if (term.conversions === 0 && term.cost > 0) {
      risk += 0.6;
    }

    // Historical pattern risk
    if (insights.termPatterns) {
      const pattern = insights.termPatterns.find(p => p.term === term.term);
      if (pattern && pattern.historicalCPA > insights.averageCPA * 2) {
        risk += 0.3;
      }
    }

    // Frequency risk (appearing often but not converting)
    if (term.frequency > 5 && term.conversions === 0) {
      risk += 0.1;
    }

    return Math.min(1.0, risk);
  }

  selectOptimalMatch(term, insights) {
    // ML logic to select best match type
    if (term.term.split(' ').length > 3) return "phrase";
    if (insights.broadMatchPerformance < 0.3) return "exact";
    return "phrase";
  }

  selectOptimalScope(term, insights) {
    // ML logic to select best scope
    if (term.cost > insights.averageTermCost * 3) return "account";
    return "campaign";
  }

  generatePerformanceForecasts(currentMetrics) {
    return {
      next7Days: this.models.conversionPredictor.forecast(currentMetrics, 7),
      next30Days: this.models.conversionPredictor.forecast(currentMetrics, 30),
      confidence: 0.7
    };
  }

  assessOptimizationRisk(currentMetrics) {
    return {
      level: currentMetrics.conversions < 10 ? "high" : "medium",
      threshold: currentMetrics.averageCPA || 10,
      factors: ["low_conversion_volume", "recent_changes"]
    };
  }

  getActionTypeReliability(actionType) {
    const reliability = {
      "add_negative": 0.8,
      "predictive_bid_adjustment": 0.6,
      "schedule_optimization": 0.7,
      "budget_allocation": 0.5
    };

    return reliability[actionType] || 0.5;
  }

  getTotalDataPoints() {
    return Object.values(this.models).reduce((total, model) => {
      return total + (model.dataPoints || 0);
    }, 0);
  }

  calculateLearningMaturity() {
    const totalDataPoints = this.getTotalDataPoints();
    if (totalDataPoints < 100) return "beginner";
    if (totalDataPoints < 1000) return "intermediate";
    return "advanced";
  }

  async saveState(tenant) {
    const state = {
      patterns: Array.from(this.patterns.entries()),
      models: this.serializeModels(),
      timestamp: Date.now()
    };

    await setJson(`ml_autopilot_state:${tenant}`, state);
  }

  loadState(state) {
    if (state.patterns) {
      this.patterns = new Map(state.patterns);
    }

    if (state.models) {
      this.deserializeModels(state.models);
    }
  }

  serializeModels() {
    const serialized = {};
    Object.entries(this.models).forEach(([key, model]) => {
      if (model.serialize) {
        serialized[key] = model.serialize();
      }
    });
    return serialized;
  }

  deserializeModels(serializedModels) {
    Object.entries(serializedModels).forEach(([key, data]) => {
      if (this.models[key] && this.models[key].deserialize) {
        this.models[key].deserialize(data);
      }
    });
  }
}

/**
 * Time of Day Performance Model
 */
class TimeOfDayModel {
  constructor() {
    this.hourlyData = new Array(24).fill(null).map(() => ({
      clicks: 0,
      conversions: 0,
      cost: 0,
      samples: 0
    }));
    this.dataPoints = 0;
  }

  analyze(metricsData) {
    metricsData.forEach(metric => {
      if (metric.date) {
        const hour = new Date(metric.date).getHours();
        if (hour >= 0 && hour < 24) {
          this.hourlyData[hour].clicks += metric.clicks || 0;
          this.hourlyData[hour].conversions += metric.conversions || 0;
          this.hourlyData[hour].cost += metric.cost || 0;
          this.hourlyData[hour].samples += 1;
          this.dataPoints++;
        }
      }
    });

    return this.predict();
  }

  predict() {
    const performance = this.hourlyData.map((data, hour) => ({
      hour,
      conversionRate: data.clicks > 0 ? data.conversions / data.clicks : 0,
      cpa: data.conversions > 0 ? data.cost / data.conversions : Infinity,
      volume: data.clicks,
      samples: data.samples
    }));

    const avgConversionRate = performance.reduce((sum, p) => sum + p.conversionRate, 0) / 24;

    const highPerformanceHours = performance
      .filter(p => p.conversionRate > avgConversionRate * 1.2 && p.samples > 5)
      .map(p => p.hour);

    return {
      hourlyPerformance: performance,
      highPerformanceHours,
      optimalSchedule: this.generateOptimalSchedule(performance),
      confidence: Math.min(this.dataPoints / 1000, 1.0)
    };
  }

  generateOptimalSchedule(performance) {
    const sorted = performance
      .filter(p => p.samples > 3)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    return {
      priority: sorted.slice(0, 8).map(p => p.hour),
      avoid: sorted.slice(-4).map(p => p.hour)
    };
  }

  serialize() {
    return {
      hourlyData: this.hourlyData,
      dataPoints: this.dataPoints
    };
  }

  deserialize(data) {
    this.hourlyData = data.hourlyData || this.hourlyData;
    this.dataPoints = data.dataPoints || 0;
  }

  updateWithResult(action, result) {
    if (action.type === "schedule_optimization" && result.success) {
      // Update confidence based on results
      this.dataPoints += 10; // Boost learning from successful optimizations
    }
  }
}

/**
 * Day of Week Performance Model
 */
class DayOfWeekModel {
  constructor() {
    this.weeklyData = new Array(7).fill(null).map(() => ({
      clicks: 0,
      conversions: 0,
      cost: 0,
      samples: 0
    }));
    this.dataPoints = 0;
  }

  analyze(metricsData) {
    metricsData.forEach(metric => {
      if (metric.date) {
        const dayOfWeek = new Date(metric.date).getDay();
        this.weeklyData[dayOfWeek].clicks += metric.clicks || 0;
        this.weeklyData[dayOfWeek].conversions += metric.conversions || 0;
        this.weeklyData[dayOfWeek].cost += metric.cost || 0;
        this.weeklyData[dayOfWeek].samples += 1;
        this.dataPoints++;
      }
    });

    return this.predict();
  }

  predict() {
    const performance = this.weeklyData.map((data, day) => ({
      day,
      conversionRate: data.clicks > 0 ? data.conversions / data.clicks : 0,
      cpa: data.conversions > 0 ? data.cost / data.conversions : Infinity,
      volume: data.clicks,
      samples: data.samples
    }));

    const avgConversionRate = performance.reduce((sum, p) => sum + p.conversionRate, 0) / 7;

    const highPerformanceDays = performance
      .filter(p => p.conversionRate > avgConversionRate * 1.1 && p.samples > 2)
      .map(p => p.day);

    return {
      dailyPerformance: performance,
      highPerformanceDays,
      confidence: Math.min(this.dataPoints / 500, 1.0)
    };
  }

  serialize() {
    return {
      weeklyData: this.weeklyData,
      dataPoints: this.dataPoints
    };
  }

  deserialize(data) {
    this.weeklyData = data.weeklyData || this.weeklyData;
    this.dataPoints = data.dataPoints || 0;
  }

  updateWithResult(action, result) {
    if (result.success) {
      this.dataPoints += 5;
    }
  }
}

/**
 * Seasonality Model
 */
class SeasonalityModel {
  constructor() {
    this.monthlyData = new Array(12).fill(null).map(() => ({
      clicks: 0,
      conversions: 0,
      cost: 0,
      samples: 0
    }));
    this.dataPoints = 0;
  }

  analyze(metricsData) {
    metricsData.forEach(metric => {
      if (metric.date) {
        const month = new Date(metric.date).getMonth();
        this.monthlyData[month].clicks += metric.clicks || 0;
        this.monthlyData[month].conversions += metric.conversions || 0;
        this.monthlyData[month].cost += metric.cost || 0;
        this.monthlyData[month].samples += 1;
        this.dataPoints++;
      }
    });

    return this.predict();
  }

  predict() {
    const performance = this.monthlyData.map((data, month) => ({
      month,
      conversionRate: data.clicks > 0 ? data.conversions / data.clicks : 0,
      cpa: data.conversions > 0 ? data.cost / data.conversions : Infinity,
      volume: data.clicks,
      samples: data.samples
    }));

    return {
      monthlyPerformance: performance,
      currentTrend: this.calculateTrend(performance),
      confidence: Math.min(this.dataPoints / 200, 1.0)
    };
  }

  calculateTrend(performance) {
    const currentMonth = new Date().getMonth();
    const currentData = performance[currentMonth];
    const avgPerformance = performance.reduce((sum, p) => sum + p.conversionRate, 0) / 12;

    return {
      direction: currentData.conversionRate > avgPerformance ? "increasing" : "decreasing",
      strength: Math.abs(currentData.conversionRate - avgPerformance) / avgPerformance
    };
  }

  serialize() {
    return {
      monthlyData: this.monthlyData,
      dataPoints: this.dataPoints
    };
  }

  deserialize(data) {
    this.monthlyData = data.monthlyData || this.monthlyData;
    this.dataPoints = data.dataPoints || 0;
  }

  updateWithResult(action, result) {
    if (result.success) {
      this.dataPoints += 3;
    }
  }
}

/**
 * Conversion Predictor Model
 */
class ConversionPredictor {
  constructor() {
    this.historicalData = [];
    this.dataPoints = 0;
  }

  analyze(metricsData) {
    this.historicalData = metricsData.slice(-100); // Keep last 100 data points
    this.dataPoints = this.historicalData.length;
    return this.predict();
  }

  predict(currentMetrics = {}) {
    if (this.historicalData.length < 10) {
      return {
        predictedCPA: currentMetrics.cpa || 0,
        confidence: 0.3,
        trend: "unknown"
      };
    }

    const recentData = this.historicalData.slice(-30);
    const avgCPA = recentData.reduce((sum, d) => sum + (d.conversions > 0 ? d.cost / d.conversions : 0), 0) / recentData.length;
    const avgConversions = recentData.reduce((sum, d) => sum + (d.conversions || 0), 0) / recentData.length;

    // Simple trend analysis
    const firstHalf = recentData.slice(0, 15);
    const secondHalf = recentData.slice(15);

    const firstHalfAvgCPA = firstHalf.reduce((sum, d) => sum + (d.conversions > 0 ? d.cost / d.conversions : 0), 0) / firstHalf.length;
    const secondHalfAvgCPA = secondHalf.reduce((sum, d) => sum + (d.conversions > 0 ? d.cost / d.conversions : 0), 0) / secondHalf.length;

    const trend = secondHalfAvgCPA > firstHalfAvgCPA ? "increasing" : "decreasing";

    return {
      predictedCPA: avgCPA,
      predictedConversions: avgConversions,
      trend,
      confidence: Math.min(this.dataPoints / 100, 0.9)
    };
  }

  forecast(currentMetrics, days) {
    const trend = this.predict(currentMetrics);
    const multiplier = trend.trend === "increasing" ? 1.1 : 0.9;

    return {
      cpa: trend.predictedCPA * Math.pow(multiplier, days / 7),
      conversions: trend.predictedConversions * days,
      confidence: trend.confidence * 0.8 // Reduce confidence for longer forecasts
    };
  }

  serialize() {
    return {
      historicalData: this.historicalData.slice(-50), // Save last 50 points
      dataPoints: this.dataPoints
    };
  }

  deserialize(data) {
    this.historicalData = data.historicalData || [];
    this.dataPoints = data.dataPoints || 0;
  }

  updateWithResult(action, result) {
    if (result.impact && result.impact.cpa) {
      this.dataPoints += 1;
    }
  }
}

/**
 * Bid Optimizer Model
 */
class BidOptimizer {
  constructor() {
    this.bidHistory = [];
    this.dataPoints = 0;
  }

  getOptimalRange(currentMetrics) {
    const currentCPC = currentMetrics.clicks > 0 ? currentMetrics.cost / currentMetrics.clicks : 0.2;

    return {
      min: currentCPC * 0.7,
      max: currentCPC * 1.3,
      recommended: currentCPC,
      confidence: Math.min(this.dataPoints / 50, 0.8)
    };
  }

  calculateOptimalAdjustment(currentMetrics, targetCPA, insights) {
    const currentCPA = currentMetrics.cpa || 0;
    const predictedCPA = insights.conversionPrediction?.predictedCPA || currentCPA;

    if (predictedCPA > targetCPA) {
      const adjustment = Math.min(0.8, targetCPA / predictedCPA);
      return {
        factor: adjustment,
        confidence: 0.7,
        reasoning: `Reducing bids to target CPA of ${targetCPA}`
      };
    }

    return {
      factor: 1.0,
      confidence: 0.5,
      reasoning: "No bid adjustment needed"
    };
  }

  serialize() {
    return {
      bidHistory: this.bidHistory.slice(-20),
      dataPoints: this.dataPoints
    };
  }

  deserialize(data) {
    this.bidHistory = data.bidHistory || [];
    this.dataPoints = data.dataPoints || 0;
  }

  updateWithResult(action, result) {
    if (action.type === "predictive_bid_adjustment" && result.success) {
      this.bidHistory.push({
        adjustment: action.adjustment,
        result: result.impact,
        timestamp: Date.now()
      });
      this.dataPoints += 1;
    }
  }
}

// Export singleton instance
export default new MLAutopilotService();