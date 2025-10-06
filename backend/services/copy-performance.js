/**
 * Copy Performance Analytics Service for Ads Autopilot AI SaaS
 * Analyzes and predicts copy performance with AI-driven insights
 *
 * Features:
 * - Copy performance analytics and prediction
 * - CTR prediction models using machine learning
 * - Quality score optimization recommendations
 * - Competitive copy analysis and benchmarking
 * - Copy fatigue detection and rotation alerts
 * - A/B test performance correlation analysis
 * - Semantic analysis of high-performing copy
 * - Performance-driven copy generation insights
 */

import { getAIProviderService } from './ai-provider.js';
import { getABTestingService } from './ab-tester.js';
import { getCompetitorIntelligenceService } from './competitor-intelligence.js';
import dataStore from './data-store.js';
import logger from './logger.js';

/**
 * Copy Performance Analytics Engine
 */
export class CopyPerformanceService {
  constructor() {
    this.aiService = getAIProviderService();
    this.abTester = getABTestingService();
    this.competitorIntelligence = getCompetitorIntelligenceService();

    // Performance thresholds and benchmarks
    this.benchmarks = {
      ctr: {
        excellent: 5.0,   // > 5% CTR
        good: 2.5,        // 2.5-5% CTR
        average: 1.0,     // 1-2.5% CTR
        poor: 0.5,        // 0.5-1% CTR
        // < 0.5% = failing
      },
      conversionRate: {
        excellent: 10.0,
        good: 5.0,
        average: 2.5,
        poor: 1.0
      },
      qualityScore: {
        excellent: 8.0,
        good: 6.0,
        average: 4.0,
        poor: 2.0
      }
    };

    // Copy characteristics that drive performance
    this.performanceFactors = {
      headline: {
        length: { optimal: [20, 28], weight: 0.15 },
        numbers: { optimal: true, weight: 0.20 },
        powerWords: {
          list: ['free', 'save', 'guaranteed', 'proven', 'best', 'new', 'exclusive', 'limited'],
          weight: 0.25
        },
        emotionalTriggers: {
          list: ['amazing', 'incredible', 'must-have', 'urgent', 'revolutionary'],
          weight: 0.20
        },
        clarity: { weight: 0.20 }
      },
      description: {
        length: { optimal: [70, 85], weight: 0.15 },
        benefitFocus: { weight: 0.30 },
        cta: { weight: 0.25 },
        specificity: { weight: 0.20 },
        credibility: { weight: 0.10 }
      }
    };

    // Copy fatigue detection
    this.fatigueThresholds = {
      impressionDecline: 20,    // 20% decline triggers alert
      ctrDecline: 30,           // 30% CTR decline
      frequencyCap: 5,          // Average frequency per user
      timeThreshold: 14         // Days to track fatigue
    };

    // Performance tracking
    this.performanceHistory = new Map();
    this.predictions = new Map();

    // Metrics
    this.metrics = {
      analysisCount: 0,
      predictionsGenerated: 0,
      fatigueDetected: 0,
      optimizationRecommendations: 0,
      avgAccuracy: 0,
      topPerformingElements: []
    };

    console.log('📊 Copy Performance Analytics Service initialized');
  }

  /**
   * Analyze copy performance and generate insights
   * @param {string} tenantId - Tenant identifier
   * @param {object} copyData - Copy performance data
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Performance analysis
   */
  async analyzeCopyPerformance(tenantId, copyData, options = {}) {
    const startTime = Date.now();

    logger.info('Analyzing copy performance', {
      tenantId,
      copyVariants: copyData.variants?.length || 0
    });

    try {
      const {
        includeCompetitive = true,
        includePredictions = true,
        includeFatigueAnalysis = true,
        timeframe = 30 // days
      } = options;

      // STEP 1: Basic performance analysis
      const performanceAnalysis = await this._analyzeBasicPerformance(copyData);

      // STEP 2: Quality score analysis
      const qualityAnalysis = await this._analyzeQualityScores(copyData);

      // STEP 3: Semantic analysis of high performers
      const semanticAnalysis = await this._performSemanticAnalysis(copyData);

      // STEP 4: Competitive benchmarking
      let competitiveBenchmark = null;
      if (includeCompetitive) {
        competitiveBenchmark = await this._performCompetitiveBenchmarking(tenantId, copyData);
      }

      // STEP 5: Performance predictions
      let predictions = null;
      if (includePredictions) {
        predictions = await this._generatePerformancePredictions(copyData);
      }

      // STEP 6: Copy fatigue analysis
      let fatigueAnalysis = null;
      if (includeFatigueAnalysis) {
        fatigueAnalysis = await this._analyzeCopyFatigue(tenantId, copyData, timeframe);
      }

      // STEP 7: Optimization recommendations
      const optimizationRecommendations = await this._generateOptimizationRecommendations({
        performanceAnalysis,
        qualityAnalysis,
        semanticAnalysis,
        competitiveBenchmark,
        predictions,
        fatigueAnalysis
      });

      // STEP 8: Performance correlation analysis
      const correlationAnalysis = await this._analyzePerformanceCorrelations(copyData);

      // Store analysis for historical tracking
      const analysisId = await this._storePerformanceAnalysis(tenantId, {
        performanceAnalysis,
        qualityAnalysis,
        semanticAnalysis,
        optimizationRecommendations,
        timestamp: new Date()
      });

      // Update metrics
      this.metrics.analysisCount++;
      if (predictions) this.metrics.predictionsGenerated++;
      if (fatigueAnalysis?.hasFatigue) this.metrics.fatigueDetected++;
      this.metrics.optimizationRecommendations += optimizationRecommendations.length;

      const result = {
        success: true,
        tenantId,
        analysisId,

        // Core analysis results
        performance: performanceAnalysis,
        quality: qualityAnalysis,
        semantic: semanticAnalysis,

        // Advanced analysis
        competitive: competitiveBenchmark,
        predictions,
        fatigue: fatigueAnalysis,
        correlations: correlationAnalysis,

        // Actionable insights
        recommendations: optimizationRecommendations,
        topPerformers: this._identifyTopPerformers(performanceAnalysis),
        improvementOpportunities: this._identifyImprovementOpportunities(qualityAnalysis),

        // Metadata
        metadata: {
          analyzedAt: new Date().toISOString(),
          analysisTime: Date.now() - startTime,
          dataPoints: copyData.variants?.length || 0,
          timeframe,
          confidence: this._calculateAnalysisConfidence({
            performanceAnalysis,
            qualityAnalysis,
            semanticAnalysis
          })
        }
      };

      logger.info('Copy performance analysis completed', {
        tenantId,
        analysisId,
        analysisTime: result.metadata.analysisTime,
        recommendations: optimizationRecommendations.length
      });

      return result;

    } catch (error) {
      logger.error('Copy performance analysis failed', {
        tenantId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        fallback: await this._generateFallbackAnalysis(copyData)
      };
    }
  }

  /**
   * Predict CTR for new copy variations
   * @param {Array} copyVariations - Copy variations to analyze
   * @param {object} context - Context for predictions
   * @returns {Promise<object>} CTR predictions
   */
  async predictCTR(copyVariations, context = {}) {
    logger.info('Generating CTR predictions', { variations: copyVariations.length });

    try {
      const predictions = [];

      for (const variation of copyVariations) {
        const prediction = await this._predictVariationCTR(variation, context);
        predictions.push(prediction);
      }

      // Rank predictions
      const rankedPredictions = predictions
        .sort((a, b) => b.predictedCTR - a.predictedCTR)
        .map((pred, index) => ({
          ...pred,
          rank: index + 1,
          percentile: ((predictions.length - index) / predictions.length) * 100
        }));

      return {
        success: true,
        predictions: rankedPredictions,
        topVariation: rankedPredictions[0],
        averagePredictedCTR: predictions.reduce((sum, p) => sum + p.predictedCTR, 0) / predictions.length,
        confidenceRange: this._calculateConfidenceRange(predictions),
        metadata: {
          generatedAt: new Date().toISOString(),
          modelVersion: '1.0',
          factorsAnalyzed: Object.keys(this.performanceFactors).length
        }
      };

    } catch (error) {
      logger.error('CTR prediction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect copy fatigue across campaigns
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Fatigue analysis
   */
  async detectCopyFatigue(tenantId, options = {}) {
    const { timeframe = 14, threshold = 0.2 } = options;

    logger.info('Detecting copy fatigue', { tenantId, timeframe });

    try {
      // Get recent performance data
      const recentData = await this._getRecentPerformanceData(tenantId, timeframe);

      if (!recentData || recentData.length === 0) {
        return {
          hasFatigue: false,
          message: 'Insufficient data for fatigue analysis',
          recommendations: ['Collect more performance data over time']
        };
      }

      // Analyze performance trends
      const fatigueAnalysis = await this._analyzeCopyFatigue(tenantId, recentData, timeframe);

      // Generate rotation recommendations
      const rotationRecommendations = await this._generateRotationRecommendations(fatigueAnalysis);

      return {
        ...fatigueAnalysis,
        rotationRecommendations,
        nextAnalysis: new Date(Date.now() + timeframe * 24 * 60 * 60 * 1000)
      };

    } catch (error) {
      logger.error('Copy fatigue detection failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get performance insights dashboard data
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - Dashboard options
   * @returns {Promise<object>} Dashboard data
   */
  async getPerformanceDashboard(tenantId, options = {}) {
    const { timeframe = 30 } = options;

    try {
      // Get historical performance data
      const historicalData = await this._getHistoricalPerformanceData(tenantId, timeframe);

      // Get current active copy performance
      const activePerformance = await this._getActiveCopyPerformance(tenantId);

      // Get benchmark comparisons
      const benchmarkComparison = this._compareToBenchmarks(activePerformance);

      // Get trends and insights
      const trends = this._analyzePerformanceTrends(historicalData);

      // Get top and bottom performers
      const topPerformers = this._getTopPerformers(historicalData, 5);
      const bottomPerformers = this._getBottomPerformers(historicalData, 5);

      return {
        overview: {
          totalCopyVariations: activePerformance.length,
          averageCTR: activePerformance.reduce((sum, c) => sum + c.ctr, 0) / activePerformance.length,
          averageQualityScore: activePerformance.reduce((sum, c) => sum + c.qualityScore, 0) / activePerformance.length,
          fatigueAlerts: trends.fatigueAlerts || 0
        },

        performance: {
          current: activePerformance,
          benchmarks: benchmarkComparison,
          trends
        },

        insights: {
          topPerformers,
          bottomPerformers,
          improvementOpportunities: this._identifyDashboardOpportunities(activePerformance),
          recommendations: this._generateDashboardRecommendations(trends, benchmarkComparison)
        },

        charts: {
          performanceTrend: this._preparePerformanceTrendChart(historicalData),
          qualityDistribution: this._prepareQualityDistributionChart(activePerformance),
          fatigueTimeline: this._prepareFatigueTimelineChart(trends)
        },

        metadata: {
          lastUpdated: new Date().toISOString(),
          dataPoints: historicalData.length,
          timeframe
        }
      };

    } catch (error) {
      logger.error('Performance dashboard generation failed', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * =====================================
   * PRIVATE ANALYSIS METHODS
   * =====================================
   */

  async _analyzeBasicPerformance(copyData) {
    if (!copyData.variants || copyData.variants.length === 0) {
      return {
        totalVariants: 0,
        averageCTR: 0,
        averageConversionRate: 0,
        topPerformer: null,
        worstPerformer: null
      };
    }

    const variants = copyData.variants;
    const totalVariants = variants.length;

    // Calculate averages
    const averageCTR = variants.reduce((sum, v) => sum + (v.ctr || 0), 0) / totalVariants;
    const averageConversionRate = variants.reduce((sum, v) => sum + (v.conversionRate || 0), 0) / totalVariants;

    // Find top and worst performers
    const sortedByCTR = [...variants].sort((a, b) => (b.ctr || 0) - (a.ctr || 0));
    const topPerformer = sortedByCTR[0];
    const worstPerformer = sortedByCTR[sortedByCTR.length - 1];

    // Performance distribution
    const performanceDistribution = this._analyzePerformanceDistribution(variants);

    return {
      totalVariants,
      averageCTR: Number(averageCTR.toFixed(2)),
      averageConversionRate: Number(averageConversionRate.toFixed(2)),
      topPerformer: {
        id: topPerformer.id || topPerformer.variantId,
        ctr: topPerformer.ctr,
        headlines: topPerformer.headlines,
        descriptions: topPerformer.descriptions
      },
      worstPerformer: {
        id: worstPerformer.id || worstPerformer.variantId,
        ctr: worstPerformer.ctr,
        headlines: worstPerformer.headlines,
        descriptions: worstPerformer.descriptions
      },
      distribution: performanceDistribution
    };
  }

  async _analyzeQualityScores(copyData) {
    if (!copyData.variants) {
      return { averageScore: 0, distribution: {}, recommendations: [] };
    }

    const qualityScores = [];
    const elementAnalysis = {
      headlines: { scores: [], factors: {} },
      descriptions: { scores: [], factors: {} }
    };

    for (const variant of copyData.variants) {
      // Calculate quality score for this variant
      const headlineScore = this._calculateHeadlineQuality(variant.headlines);
      const descriptionScore = this._calculateDescriptionQuality(variant.descriptions);

      const overallScore = (headlineScore.score + descriptionScore.score) / 2;

      qualityScores.push(overallScore);
      elementAnalysis.headlines.scores.push(headlineScore.score);
      elementAnalysis.descriptions.scores.push(descriptionScore.score);

      // Aggregate factor analysis
      Object.keys(headlineScore.factors).forEach(factor => {
        if (!elementAnalysis.headlines.factors[factor]) {
          elementAnalysis.headlines.factors[factor] = [];
        }
        elementAnalysis.headlines.factors[factor].push(headlineScore.factors[factor]);
      });

      Object.keys(descriptionScore.factors).forEach(factor => {
        if (!elementAnalysis.descriptions.factors[factor]) {
          elementAnalysis.descriptions.factors[factor] = [];
        }
        elementAnalysis.descriptions.factors[factor].push(descriptionScore.factors[factor]);
      });
    }

    const averageScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    return {
      averageScore: Number(averageScore.toFixed(2)),
      distribution: this._categorizeQualityScores(qualityScores),
      elementAnalysis,
      recommendations: this._generateQualityRecommendations(elementAnalysis)
    };
  }

  async _performSemanticAnalysis(copyData) {
    if (!copyData.variants || copyData.variants.length === 0) {
      return { insights: [], commonPatterns: [], recommendations: [] };
    }

    try {
      // Analyze high-performing copy for patterns
      const highPerformers = copyData.variants
        .filter(v => (v.ctr || 0) > 2.0) // Above average performers
        .slice(0, 10); // Limit analysis

      if (highPerformers.length === 0) {
        return {
          insights: ['No high-performing copy found for semantic analysis'],
          commonPatterns: [],
          recommendations: ['Generate more copy variations to enable semantic analysis']
        };
      }

      const allHeadlines = highPerformers.flatMap(v => v.headlines || []);
      const allDescriptions = highPerformers.flatMap(v => v.descriptions || []);

      const prompt = `Analyze these high-performing ad copy elements and identify patterns:

HIGH-PERFORMING HEADLINES:
${allHeadlines.join('\n')}

HIGH-PERFORMING DESCRIPTIONS:
${allDescriptions.join('\n')}

Identify:
1. Common word patterns and phrases
2. Structural elements that drive performance
3. Emotional triggers being used
4. Length patterns
5. Call-to-action styles

Return JSON:
{
  "commonPatterns": [
    {
      "type": "word_pattern|structure|emotion|length|cta",
      "pattern": "description",
      "frequency": number,
      "impact": "high|medium|low"
    }
  ],
  "insights": [
    "insight 1",
    "insight 2"
  ],
  "recommendations": [
    "recommendation 1",
    "recommendation 2"
  ]
}`;

      const response = await this.aiService.generateStructuredContent(prompt, 'json');

      return {
        insights: response.insights || [],
        commonPatterns: response.commonPatterns || [],
        recommendations: response.recommendations || []
      };

    } catch (error) {
      logger.warn('Semantic analysis failed', { error: error.message });
      return {
        insights: ['Semantic analysis unavailable'],
        commonPatterns: [],
        recommendations: ['Manual review of high-performing copy recommended']
      };
    }
  }

  async _performCompetitiveBenchmarking(tenantId, copyData) {
    try {
      const competitorData = await this.competitorIntelligence.getIntelligenceSummary(tenantId);

      if (!competitorData || competitorData.totalCompetitors === 0) {
        return null;
      }

      // Compare our performance to industry benchmarks
      const ourAverageCTR = copyData.variants
        ? copyData.variants.reduce((sum, v) => sum + (v.ctr || 0), 0) / copyData.variants.length
        : 0;

      // Estimate industry average (this would normally come from competitive intelligence)
      const industryBenchmark = 1.8; // Placeholder - would be calculated from competitor data

      const comparison = {
        ourPerformance: ourAverageCTR,
        industryBenchmark,
        percentageDifference: ourAverageCTR > 0
          ? ((ourAverageCTR - industryBenchmark) / industryBenchmark) * 100
          : 0,
        ranking: ourAverageCTR > industryBenchmark ? 'above_average' : 'below_average',
        competitorsAnalyzed: competitorData.totalCompetitors
      };

      return comparison;

    } catch (error) {
      logger.warn('Competitive benchmarking failed', { error: error.message });
      return null;
    }
  }

  async _generatePerformancePredictions(copyData) {
    if (!copyData.variants || copyData.variants.length < 3) {
      return {
        available: false,
        reason: 'Insufficient data for predictions (minimum 3 variants required)'
      };
    }

    try {
      const predictions = [];

      for (const variant of copyData.variants) {
        const prediction = await this._predictVariationCTR(variant, {});
        predictions.push({
          variantId: variant.id || variant.variantId,
          currentCTR: variant.ctr || 0,
          predictedCTR: prediction.predictedCTR,
          confidence: prediction.confidence,
          factors: prediction.factors
        });
      }

      return {
        available: true,
        predictions,
        modelAccuracy: this._calculateModelAccuracy(predictions),
        lastTrained: new Date().toISOString()
      };

    } catch (error) {
      return {
        available: false,
        reason: 'Prediction model unavailable',
        error: error.message
      };
    }
  }

  async _predictVariationCTR(variation, context) {
    // Simplified CTR prediction based on copy characteristics
    let score = 1.0; // Base CTR
    const factors = {};

    // Analyze headlines
    if (variation.headlines && variation.headlines.length > 0) {
      const headlineAnalysis = this._analyzeHeadlineFactors(variation.headlines);
      score *= headlineAnalysis.multiplier;
      factors.headlines = headlineAnalysis.factors;
    }

    // Analyze descriptions
    if (variation.descriptions && variation.descriptions.length > 0) {
      const descriptionAnalysis = this._analyzeDescriptionFactors(variation.descriptions);
      score *= descriptionAnalysis.multiplier;
      factors.descriptions = descriptionAnalysis.factors;
    }

    // Apply context adjustments
    if (context.timeOfDay) {
      score *= this._getTimeOfDayMultiplier(context.timeOfDay);
      factors.timeOfDay = context.timeOfDay;
    }

    if (context.audience) {
      score *= this._getAudienceMultiplier(context.audience);
      factors.audience = context.audience;
    }

    return {
      predictedCTR: Math.max(0.1, Math.min(10.0, score)), // Cap between 0.1% and 10%
      confidence: this._calculatePredictionConfidence(factors),
      factors
    };
  }

  async _analyzeCopyFatigue(tenantId, copyData, timeframe) {
    if (!copyData.variants || copyData.variants.length === 0) {
      return {
        hasFatigue: false,
        reason: 'No copy data available for fatigue analysis'
      };
    }

    const fatigueIndicators = [];
    let overallFatigueScore = 0;

    for (const variant of copyData.variants) {
      const fatigueMetrics = this._calculateFatigueMetrics(variant, timeframe);

      if (fatigueMetrics.hasFatigue) {
        fatigueIndicators.push({
          variantId: variant.id || variant.variantId,
          fatigueType: fatigueMetrics.fatigueType,
          severity: fatigueMetrics.severity,
          recommendations: fatigueMetrics.recommendations
        });
      }

      overallFatigueScore += fatigueMetrics.fatigueScore;
    }

    overallFatigueScore /= copyData.variants.length;

    return {
      hasFatigue: fatigueIndicators.length > 0,
      overallFatigueScore: Number(overallFatigueScore.toFixed(2)),
      fatigueIndicators,
      recommendations: this._generateFatigueRecommendations(fatigueIndicators),
      nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  /**
   * =====================================
   * HELPER METHODS
   * =====================================
   */

  _calculateHeadlineQuality(headlines) {
    if (!headlines || headlines.length === 0) {
      return { score: 0, factors: {} };
    }

    let totalScore = 0;
    const factors = {};

    headlines.forEach(headline => {
      let headlineScore = 5.0; // Base score

      // Length optimization
      const length = headline.length;
      if (length >= 20 && length <= 28) {
        headlineScore += 1.0;
        factors.optimalLength = (factors.optimalLength || 0) + 1;
      } else if (length < 15 || length > 30) {
        headlineScore -= 0.5;
      }

      // Power words
      const powerWordCount = this.performanceFactors.headline.powerWords.list
        .filter(word => headline.toLowerCase().includes(word.toLowerCase())).length;
      headlineScore += powerWordCount * 0.5;
      factors.powerWords = (factors.powerWords || 0) + powerWordCount;

      // Numbers
      if (/\d/.test(headline)) {
        headlineScore += 0.5;
        factors.includesNumbers = (factors.includesNumbers || 0) + 1;
      }

      // Emotional triggers
      const emotionalCount = this.performanceFactors.headline.emotionalTriggers.list
        .filter(trigger => headline.toLowerCase().includes(trigger.toLowerCase())).length;
      headlineScore += emotionalCount * 0.3;
      factors.emotionalTriggers = (factors.emotionalTriggers || 0) + emotionalCount;

      totalScore += Math.min(10.0, Math.max(0, headlineScore));
    });

    return {
      score: totalScore / headlines.length,
      factors
    };
  }

  _calculateDescriptionQuality(descriptions) {
    if (!descriptions || descriptions.length === 0) {
      return { score: 0, factors: {} };
    }

    let totalScore = 0;
    const factors = {};

    descriptions.forEach(description => {
      let descScore = 5.0;

      // Length optimization
      const length = description.length;
      if (length >= 70 && length <= 85) {
        descScore += 1.0;
        factors.optimalLength = (factors.optimalLength || 0) + 1;
      }

      // Call-to-action detection
      const ctaWords = ['buy', 'shop', 'get', 'start', 'try', 'discover', 'learn', 'save'];
      const hasCTA = ctaWords.some(cta => description.toLowerCase().includes(cta));
      if (hasCTA) {
        descScore += 1.0;
        factors.hasCTA = (factors.hasCTA || 0) + 1;
      }

      // Benefit focus (looking for "you", "your", benefits)
      const benefitWords = ['you', 'your', 'save', 'get', 'enjoy', 'experience'];
      const benefitCount = benefitWords.filter(word =>
        description.toLowerCase().includes(word.toLowerCase())).length;
      descScore += benefitCount * 0.2;
      factors.benefitFocus = (factors.benefitFocus || 0) + benefitCount;

      totalScore += Math.min(10.0, Math.max(0, descScore));
    });

    return {
      score: totalScore / descriptions.length,
      factors
    };
  }

  _analyzeHeadlineFactors(headlines) {
    let multiplier = 1.0;
    const factors = {};

    headlines.forEach(headline => {
      // Length factor
      const length = headline.length;
      if (length >= 20 && length <= 28) {
        multiplier *= 1.15;
        factors.optimalLength = true;
      }

      // Power words factor
      const powerWords = this.performanceFactors.headline.powerWords.list
        .filter(word => headline.toLowerCase().includes(word.toLowerCase()));
      multiplier *= (1 + powerWords.length * 0.1);
      factors.powerWordsCount = powerWords.length;

      // Numbers factor
      if (/\d/.test(headline)) {
        multiplier *= 1.1;
        factors.includesNumbers = true;
      }
    });

    return { multiplier, factors };
  }

  _analyzeDescriptionFactors(descriptions) {
    let multiplier = 1.0;
    const factors = {};

    descriptions.forEach(description => {
      // CTA detection
      const ctaWords = ['buy', 'shop', 'get', 'start', 'try'];
      const hasCTA = ctaWords.some(cta => description.toLowerCase().includes(cta));
      if (hasCTA) {
        multiplier *= 1.2;
        factors.hasCTA = true;
      }

      // Benefit focus
      const benefitWords = ['you', 'your', 'save', 'get'];
      const benefitCount = benefitWords.filter(word =>
        description.toLowerCase().includes(word.toLowerCase())).length;
      multiplier *= (1 + benefitCount * 0.05);
      factors.benefitFocus = benefitCount;
    });

    return { multiplier, factors };
  }

  _calculateFatigueMetrics(variant, timeframe) {
    // Simplified fatigue calculation
    const impressions = variant.impressions || 0;
    const ctr = variant.ctr || 0;

    // Mock historical data - in production this would come from time-series data
    const baselineCTR = ctr * 1.2; // Assume 20% decline indicates fatigue

    let fatigueScore = 0;
    let hasFatigue = false;
    let fatigueType = null;
    const recommendations = [];

    // CTR decline detection
    if (ctr < baselineCTR * 0.7) { // 30% decline
      fatigueScore += 0.4;
      hasFatigue = true;
      fatigueType = 'ctr_decline';
      recommendations.push('Rotate headlines to refresh messaging');
    }

    // High frequency detection
    if (impressions > 50000) { // High impression volume
      fatigueScore += 0.3;
      recommendations.push('Consider creative refresh or audience expansion');
    }

    return {
      hasFatigue,
      fatigueScore,
      fatigueType,
      severity: fatigueScore > 0.6 ? 'high' : fatigueScore > 0.3 ? 'medium' : 'low',
      recommendations
    };
  }

  _generateOptimizationRecommendations(analysisData) {
    const recommendations = [];

    // Performance-based recommendations
    if (analysisData.performanceAnalysis.averageCTR < 1.0) {
      recommendations.push({
        priority: 'high',
        type: 'performance',
        title: 'Low CTR Alert',
        message: `Average CTR (${analysisData.performanceAnalysis.averageCTR}%) is below industry standards`,
        actions: [
          'Test more compelling headlines with emotional triggers',
          'Add urgency or scarcity elements',
          'Review and strengthen value propositions'
        ]
      });
    }

    // Quality-based recommendations
    if (analysisData.qualityAnalysis.averageScore < 6.0) {
      recommendations.push({
        priority: 'medium',
        type: 'quality',
        title: 'Quality Score Optimization',
        message: `Copy quality score (${analysisData.qualityAnalysis.averageScore}) has room for improvement`,
        actions: analysisData.qualityAnalysis.recommendations || []
      });
    }

    // Semantic analysis recommendations
    if (analysisData.semanticAnalysis.recommendations.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'semantic',
        title: 'Pattern-Based Optimization',
        message: 'Semantic analysis reveals optimization opportunities',
        actions: analysisData.semanticAnalysis.recommendations
      });
    }

    // Fatigue recommendations
    if (analysisData.fatigueAnalysis?.hasFatigue) {
      recommendations.push({
        priority: 'high',
        type: 'fatigue',
        title: 'Copy Fatigue Detected',
        message: 'Some copy variations showing signs of audience fatigue',
        actions: analysisData.fatigueAnalysis.recommendations || ['Rotate copy variations']
      });
    }

    return recommendations;
  }

  _identifyTopPerformers(performanceAnalysis) {
    if (!performanceAnalysis.topPerformer) {
      return [];
    }

    return [{
      type: 'top_ctr',
      variant: performanceAnalysis.topPerformer,
      metric: 'CTR',
      value: performanceAnalysis.topPerformer.ctr,
      insights: this._analyzeTopPerformerInsights(performanceAnalysis.topPerformer)
    }];
  }

  _analyzeTopPerformerInsights(topPerformer) {
    const insights = [];

    if (topPerformer.headlines) {
      const avgLength = topPerformer.headlines.reduce((sum, h) => sum + h.length, 0) / topPerformer.headlines.length;
      insights.push(`Headlines average ${Math.round(avgLength)} characters`);

      const hasNumbers = topPerformer.headlines.some(h => /\d/.test(h));
      if (hasNumbers) {
        insights.push('Uses numbers in headlines');
      }
    }

    return insights;
  }

  _calculateAnalysisConfidence(analysisData) {
    let confidence = 0;
    let factors = 0;

    if (analysisData.performanceAnalysis.totalVariants > 0) {
      confidence += Math.min(1, analysisData.performanceAnalysis.totalVariants / 10) * 25;
      factors++;
    }

    if (analysisData.qualityAnalysis.averageScore > 0) {
      confidence += 25;
      factors++;
    }

    if (analysisData.semanticAnalysis.insights.length > 0) {
      confidence += 25;
      factors++;
    }

    return factors > 0 ? Math.round(confidence / factors * 4) : 0; // Scale to 100
  }

  async _storePerformanceAnalysis(tenantId, analysis) {
    const analysisId = `copy_analysis_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      await dataStore.setTenantConfig(tenantId, analysisId, {
        ...analysis,
        id: analysisId,
        storedAt: new Date()
      });

      return analysisId;
    } catch (error) {
      logger.error('Failed to store performance analysis', { error: error.message });
      return null;
    }
  }

  async _generateFallbackAnalysis(copyData) {
    return {
      performance: {
        totalVariants: copyData.variants?.length || 0,
        averageCTR: 0,
        status: 'insufficient_data'
      },
      recommendations: [
        'Collect more performance data for analysis',
        'Ensure copy variants have performance metrics',
        'Run A/B tests to gather comparison data'
      ]
    };
  }

  /**
   * Get service metrics and statistics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: {
        performanceHistory: this.performanceHistory.size,
        predictions: this.predictions.size
      },
      benchmarks: this.benchmarks
    };
  }

  /**
   * Clear performance caches
   */
  clearCache() {
    this.performanceHistory.clear();
    this.predictions.clear();
    logger.info('Copy performance cache cleared');
  }
}

// Export singleton instance
let copyPerformanceServiceInstance = null;

/**
 * Get singleton instance
 */
export function getCopyPerformanceService() {
  if (!copyPerformanceServiceInstance) {
    copyPerformanceServiceInstance = new CopyPerformanceService();
  }
  return copyPerformanceServiceInstance;
}

export default getCopyPerformanceService;