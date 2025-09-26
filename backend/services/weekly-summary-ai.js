/**
 * Weekly AI Summary Generator Service
 * Part of STARTER tier ($29/mo) benefits
 *
 * Features:
 * - Weekly performance analysis with AI insights
 * - Trend identification and pattern recognition
 * - Actionable recommendations generation
 * - Performance comparisons and forecasting
 * - Email formatting with rich insights
 */

import { AIProviderService } from "./ai-provider.js";
import { getDoc, ensureSheet } from "../sheets.js";
import emailService from "./email-service.js";
import logger from "./logger.js";

class WeeklySummaryAIService {
  constructor() {
    this.aiProvider = new AIProviderService();
    this.initialized = false;

    // Template configurations for different tiers
    this.tierTemplates = {
      starter: {
        maxRecommendations: 3,
        analysisDepth: 'basic',
        includeForecasting: false,
        includeTrends: true
      },
      professional: {
        maxRecommendations: 5,
        analysisDepth: 'detailed',
        includeForecasting: true,
        includeTrends: true
      },
      enterprise: {
        maxRecommendations: 8,
        analysisDepth: 'comprehensive',
        includeForecasting: true,
        includeTrends: true,
        customAnalysis: true
      }
    };
  }

  /**
   * Initialize the AI service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.aiProvider.initialize();
      this.initialized = true;
      logger.info("Weekly Summary AI Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Weekly Summary AI Service:", error);
      throw error;
    }
  }

  /**
   * Generate comprehensive weekly AI summary
   */
  async generateWeeklySummary(tenant, options = {}) {
    await this.initialize();

    const {
      tier = 'starter',
      includePreviousWeek = true,
      includeRecommendations = true,
      customPrompt = null
    } = options;

    try {
      // Get performance data
      const weeklyData = await this.extractPerformanceData(tenant, includePreviousWeek);

      // Generate AI insights
      const aiAnalysis = await this.generateAIAnalysis(weeklyData, tier, customPrompt);

      // Generate recommendations
      const recommendations = includeRecommendations
        ? await this.generateRecommendations(weeklyData, aiAnalysis, tier)
        : [];

      // Create summary structure
      const summary = {
        tenant,
        generatedAt: new Date().toISOString(),
        period: weeklyData.period,
        tier,

        // Performance metrics
        metrics: weeklyData.current.totals,
        previousMetrics: weeklyData.previous?.totals || null,

        // AI-generated content
        insights: aiAnalysis,
        recommendations: recommendations.slice(0, this.tierTemplates[tier].maxRecommendations),

        // Trend analysis
        trends: weeklyData.trends,
        alerts: weeklyData.alerts,

        // Additional data
        topPerformers: weeklyData.topPerformers,
        opportunities: weeklyData.opportunities,

        // Metadata
        metadata: {
          aiGenerated: true,
          analysisDepth: this.tierTemplates[tier].analysisDepth,
          dataQuality: this.assessDataQuality(weeklyData),
          confidence: aiAnalysis.confidence || 0.8
        }
      };

      // Add forecasting for higher tiers
      if (this.tierTemplates[tier].includeForecasting) {
        summary.forecast = await this.generateForecast(weeklyData, tier);
      }

      logger.info("Weekly AI summary generated successfully", {
        tenant,
        tier,
        recommendationsCount: recommendations.length,
        confidence: summary.metadata.confidence
      });

      return summary;
    } catch (error) {
      logger.error("Failed to generate weekly AI summary", {
        tenant,
        tier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extract and process performance data from sheets
   */
  async extractPerformanceData(tenant, includePreviousWeek = true) {
    const doc = await getDoc();
    if (!doc) {
      throw new Error("Google Sheets not accessible");
    }

    const currentWeekStart = Date.now() - 7 * 24 * 3600 * 1000;
    const previousWeekStart = Date.now() - 14 * 24 * 3600 * 1000;

    // Get sheets
    const metricsSheet = await ensureSheet(doc, `METRICS_${tenant}`, [
      "date", "level", "campaign", "ad_group", "id", "name",
      "clicks", "cost", "conversions", "impr", "ctr"
    ]);

    const searchTermsSheet = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, [
      "date", "campaign", "ad_group", "search_term",
      "clicks", "cost", "conversions"
    ]);

    const metricsRows = await metricsSheet.getRows();
    const searchTermsRows = await searchTermsSheet.getRows();

    // Process current week
    const currentData = this.processWeekData(
      metricsRows,
      searchTermsRows,
      currentWeekStart,
      Date.now()
    );

    // Process previous week for comparison
    let previousData = null;
    if (includePreviousWeek) {
      previousData = this.processWeekData(
        metricsRows,
        searchTermsRows,
        previousWeekStart,
        currentWeekStart
      );
    }

    // Calculate trends and insights
    const trends = this.calculateTrends(currentData, previousData);
    const alerts = this.identifyAlerts(currentData, previousData, trends);
    const topPerformers = this.identifyTopPerformers(currentData);
    const opportunities = this.identifyOpportunities(currentData, previousData);

    return {
      period: {
        start: new Date(currentWeekStart).toISOString(),
        end: new Date().toISOString(),
        daysIncluded: 7
      },
      current: currentData,
      previous: previousData,
      trends,
      alerts,
      topPerformers,
      opportunities
    };
  }

  /**
   * Process performance data for a specific time period
   */
  processWeekData(metricsRows, searchTermsRows, startTime, endTime) {
    let totalClicks = 0, totalCost = 0, totalConversions = 0, totalImpressions = 0;
    const campaigns = new Map();
    const searchTerms = new Map();
    const dailyMetrics = new Map();

    // Process metrics data
    metricsRows.forEach(row => {
      const rowDate = Date.parse(row.date || "");
      if (!isFinite(rowDate) || rowDate < startTime || rowDate >= endTime) return;

      const clicks = Number(row.clicks || 0);
      const cost = Number(row.cost || 0);
      const conversions = Number(row.conversions || 0);
      const impressions = Number(row.impr || 0);

      totalClicks += clicks;
      totalCost += cost;
      totalConversions += conversions;
      totalImpressions += impressions;

      // Campaign aggregation
      const campaign = row.campaign || "Unknown";
      if (!campaigns.has(campaign)) {
        campaigns.set(campaign, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });
      }
      const campaignData = campaigns.get(campaign);
      campaignData.clicks += clicks;
      campaignData.cost += cost;
      campaignData.conversions += conversions;
      campaignData.impressions += impressions;

      // Daily metrics
      const dateKey = new Date(rowDate).toISOString().split("T")[0];
      if (!dailyMetrics.has(dateKey)) {
        dailyMetrics.set(dateKey, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });
      }
      const dayData = dailyMetrics.get(dateKey);
      dayData.clicks += clicks;
      dayData.cost += cost;
      dayData.conversions += conversions;
      dayData.impressions += impressions;
    });

    // Process search terms
    searchTermsRows.forEach(row => {
      const rowDate = Date.parse(row.date || "");
      if (!isFinite(rowDate) || rowDate < startTime || rowDate >= endTime) return;

      const term = String(row.search_term || "").toLowerCase().trim();
      if (!term) return;

      const clicks = Number(row.clicks || 0);
      const cost = Number(row.cost || 0);
      const conversions = Number(row.conversions || 0);

      if (!searchTerms.has(term)) {
        searchTerms.set(term, { term, clicks: 0, cost: 0, conversions: 0 });
      }
      const termData = searchTerms.get(term);
      termData.clicks += clicks;
      termData.cost += cost;
      termData.conversions += conversions;
    });

    return {
      totals: {
        clicks: totalClicks,
        cost: totalCost,
        conversions: totalConversions,
        impressions: totalImpressions,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpa: totalConversions > 0 ? totalCost / totalConversions : null,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
      },
      campaigns: Array.from(campaigns.entries()).map(([name, data]) => ({
        name,
        ...data,
        cpa: data.conversions > 0 ? data.cost / data.conversions : null,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
      })),
      searchTerms: Array.from(searchTerms.entries()).map(([term, data]) => ({
        ...data,
        cpa: data.conversions > 0 ? data.cost / data.conversions : null
      })),
      dailyMetrics: Array.from(dailyMetrics.entries()).map(([date, data]) => ({
        date,
        ...data,
        cpa: data.conversions > 0 ? data.cost / data.conversions : null,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
      }))
    };
  }

  /**
   * Calculate trends between current and previous periods
   */
  calculateTrends(current, previous) {
    if (!previous) return {};

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      clicks: calculateChange(current.totals.clicks, previous.totals.clicks),
      cost: calculateChange(current.totals.cost, previous.totals.cost),
      conversions: calculateChange(current.totals.conversions, previous.totals.conversions),
      cpa: current.totals.cpa && previous.totals.cpa
        ? calculateChange(current.totals.cpa, previous.totals.cpa)
        : null,
      ctr: calculateChange(current.totals.ctr, previous.totals.ctr),
      conversionRate: calculateChange(current.totals.conversionRate, previous.totals.conversionRate)
    };
  }

  /**
   * Identify performance alerts
   */
  identifyAlerts(current, previous, trends) {
    const alerts = [];

    // Conversion drop alert
    if (trends.conversions && trends.conversions < -20) {
      alerts.push({
        type: "conversion_drop",
        severity: "high",
        message: `Conversions dropped by ${Math.abs(trends.conversions).toFixed(1)}%`,
        impact: "high",
        actionRequired: true
      });
    }

    // CPA spike alert
    if (trends.cpa && trends.cpa > 30) {
      alerts.push({
        type: "cpa_spike",
        severity: "medium",
        message: `Cost per acquisition increased by ${trends.cpa.toFixed(1)}%`,
        impact: "medium",
        actionRequired: true
      });
    }

    // CTR drop alert
    if (trends.ctr && trends.ctr < -15) {
      alerts.push({
        type: "ctr_drop",
        severity: "medium",
        message: `Click-through rate dropped by ${Math.abs(trends.ctr).toFixed(1)}%`,
        impact: "medium",
        actionRequired: false
      });
    }

    // Budget efficiency alert
    if (current.totals.cost > 0 && current.totals.conversions === 0) {
      alerts.push({
        type: "no_conversions",
        severity: "high",
        message: `Spent $${current.totals.cost.toFixed(2)} with no conversions this week`,
        impact: "high",
        actionRequired: true
      });
    }

    return alerts;
  }

  /**
   * Identify top performing elements
   */
  identifyTopPerformers(current) {
    const topCampaign = current.campaigns
      .filter(c => c.conversions > 0)
      .sort((a, b) => (b.conversions / b.cost) - (a.conversions / a.cost))[0];

    const topSearchTerms = current.searchTerms
      .filter(t => t.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    return {
      campaign: topCampaign || null,
      searchTerms: topSearchTerms,
      bestDay: current.dailyMetrics
        .sort((a, b) => b.conversions - a.conversions)[0] || null
    };
  }

  /**
   * Identify growth opportunities
   */
  identifyOpportunities(current, previous) {
    const opportunities = [];

    // High-click, low-conversion terms
    const lowConversionTerms = current.searchTerms
      .filter(t => t.clicks > 10 && t.conversions === 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 3);

    if (lowConversionTerms.length > 0) {
      opportunities.push({
        type: "low_conversion_terms",
        title: "Optimize High-Click Terms",
        description: "High-click search terms with no conversions detected",
        impact: "medium",
        data: lowConversionTerms
      });
    }

    // Campaign budget reallocation
    if (current.campaigns.length > 1) {
      const bestPerformer = current.campaigns
        .filter(c => c.conversions > 0)
        .sort((a, b) => (b.conversions / b.cost) - (a.conversions / a.cost))[0];

      if (bestPerformer) {
        opportunities.push({
          type: "budget_reallocation",
          title: "Reallocate Budget to Top Campaign",
          description: `${bestPerformer.name} shows strong performance with ${bestPerformer.conversions} conversions`,
          impact: "high",
          data: { campaign: bestPerformer.name, efficiency: bestPerformer.conversions / bestPerformer.cost }
        });
      }
    }

    // Bidding opportunities
    if (current.totals.ctr > 5 && current.totals.conversionRate > 2) {
      opportunities.push({
        type: "bid_increase",
        title: "Consider Increasing Bids",
        description: "High CTR and conversion rate suggest room for bid increases",
        impact: "medium",
        data: { ctr: current.totals.ctr, conversionRate: current.totals.conversionRate }
      });
    }

    return opportunities;
  }

  /**
   * Generate AI-powered analysis and insights
   */
  async generateAIAnalysis(weeklyData, tier, customPrompt = null) {
    const template = this.tierTemplates[tier];

    const prompt = customPrompt || this.createAnalysisPrompt(weeklyData, template);

    try {
      const aiResult = await this.aiProvider.generateText(prompt, {
        maxTokens: template.analysisDepth === 'basic' ? 500 :
                   template.analysisDepth === 'detailed' ? 800 : 1200,
        temperature: 0.3,
        tenant: weeklyData.tenant,
        operation: 'weekly_summary_analysis'
      });

      return {
        summary: aiResult || "AI analysis temporarily unavailable",
        confidence: aiResult ? 0.85 : 0.0,
        analysisType: template.analysisDepth,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.warn("AI analysis generation failed", { error: error.message });
      return {
        summary: "AI analysis temporarily unavailable. Manual insights available in trends section.",
        confidence: 0.0,
        analysisType: "fallback",
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Create analysis prompt based on tier and data
   */
  createAnalysisPrompt(weeklyData, template) {
    const { current, previous, trends, alerts } = weeklyData;

    let prompt = `As a digital marketing analyst, provide ${template.analysisDepth} insights for this weekly performance summary:

CURRENT WEEK PERFORMANCE:
- Clicks: ${current.totals.clicks.toLocaleString()}
- Cost: $${current.totals.cost.toFixed(2)}
- Conversions: ${current.totals.conversions}
- CPA: ${current.totals.cpa ? `$${current.totals.cpa.toFixed(2)}` : 'N/A'}
- CTR: ${current.totals.ctr.toFixed(2)}%
- Conversion Rate: ${current.totals.conversionRate.toFixed(2)}%`;

    if (previous && trends) {
      prompt += `

WEEK-OVER-WEEK CHANGES:
- Clicks: ${trends.clicks >= 0 ? '+' : ''}${trends.clicks.toFixed(1)}%
- Cost: ${trends.cost >= 0 ? '+' : ''}${trends.cost.toFixed(1)}%
- Conversions: ${trends.conversions >= 0 ? '+' : ''}${trends.conversions.toFixed(1)}%
- CPA: ${trends.cpa ? `${trends.cpa >= 0 ? '+' : ''}${trends.cpa.toFixed(1)}%` : 'N/A'}`;
    }

    if (alerts.length > 0) {
      prompt += `

ALERTS DETECTED:
${alerts.map(alert => `- ${alert.message}`).join('\n')}`;
    }

    if (template.analysisDepth === 'basic') {
      prompt += `

Provide a concise analysis covering:
1. Overall performance assessment
2. Key trend explanation
3. One primary concern or opportunity
Keep response under 200 words.`;
    } else if (template.analysisDepth === 'detailed') {
      prompt += `

Provide detailed analysis covering:
1. Performance assessment with context
2. Trend analysis and implications
3. Risk identification and mitigation
4. Growth opportunities
Keep response under 400 words.`;
    } else {
      prompt += `

Provide comprehensive analysis covering:
1. Strategic performance assessment
2. Deep trend analysis with market context
3. Risk assessment and mitigation strategies
4. Growth opportunities and scaling potential
5. Competitive positioning insights
Keep response under 600 words.`;
    }

    return prompt;
  }

  /**
   * Generate actionable recommendations
   */
  async generateRecommendations(weeklyData, aiAnalysis, tier) {
    const template = this.tierTemplates[tier];
    const { current, trends, alerts, opportunities } = weeklyData;

    const recommendations = [];

    // Alert-based recommendations
    for (const alert of alerts) {
      if (alert.actionRequired) {
        recommendations.push(await this.createAlertRecommendation(alert, current));
      }
    }

    // Opportunity-based recommendations
    for (const opportunity of opportunities.slice(0, 2)) {
      recommendations.push(await this.createOpportunityRecommendation(opportunity, current));
    }

    // Performance-based recommendations
    if (current.totals.conversions === 0 && current.totals.cost > 10) {
      recommendations.push({
        title: "Immediate Action Required",
        description: "No conversions despite significant spend. Review targeting and landing page experience.",
        priority: "high",
        effort: "medium",
        impact: "high",
        category: "optimization",
        actionItems: [
          "Review search terms for relevance",
          "Audit landing page conversion path",
          "Check campaign targeting settings"
        ]
      });
    }

    // Trend-based recommendations
    if (trends.ctr && trends.ctr < -10) {
      recommendations.push({
        title: "Improve Ad Relevance",
        description: "Declining click-through rates suggest ad fatigue or poor relevance.",
        priority: "medium",
        effort: "medium",
        impact: "medium",
        category: "creative",
        actionItems: [
          "Test new ad copy variations",
          "Update headlines with current offers",
          "Review keyword-ad relevance"
        ]
      });
    }

    // Budget optimization recommendations
    if (current.totals.cpa && current.totals.cpa > 50) {
      recommendations.push({
        title: "Optimize Cost Efficiency",
        description: "High cost per acquisition requires immediate attention to maintain profitability.",
        priority: "high",
        effort: "low",
        impact: "high",
        category: "bidding",
        actionItems: [
          "Reduce bids on underperforming keywords",
          "Add negative keywords for irrelevant terms",
          "Focus budget on best-performing campaigns"
        ]
      });
    }

    return recommendations.slice(0, template.maxRecommendations);
  }

  /**
   * Create recommendation from alert
   */
  async createAlertRecommendation(alert, currentData) {
    const recommendations = {
      conversion_drop: {
        title: "Address Conversion Decline",
        description: "Investigate and resolve factors causing conversion rate drop.",
        priority: "high",
        effort: "medium",
        impact: "high",
        category: "optimization",
        actionItems: [
          "Review recent campaign changes",
          "Check website analytics for issues",
          "Analyze competitor activity"
        ]
      },
      cpa_spike: {
        title: "Control Rising Costs",
        description: "Implement cost control measures to improve efficiency.",
        priority: "medium",
        effort: "low",
        impact: "medium",
        category: "bidding",
        actionItems: [
          "Review and adjust bid strategies",
          "Pause underperforming ad groups",
          "Implement stricter negative keyword lists"
        ]
      },
      no_conversions: {
        title: "Emergency Optimization",
        description: "Zero conversions require immediate campaign review and optimization.",
        priority: "critical",
        effort: "high",
        impact: "critical",
        category: "emergency",
        actionItems: [
          "Pause all non-converting campaigns",
          "Review tracking implementation",
          "Audit entire funnel for issues"
        ]
      }
    };

    return recommendations[alert.type] || {
      title: "Address Performance Alert",
      description: alert.message,
      priority: alert.severity,
      effort: "medium",
      impact: alert.impact,
      category: "general",
      actionItems: ["Investigate alert cause", "Implement corrective measures"]
    };
  }

  /**
   * Create recommendation from opportunity
   */
  async createOpportunityRecommendation(opportunity, currentData) {
    const recommendations = {
      low_conversion_terms: {
        title: "Optimize High-Traffic Terms",
        description: "Convert high-click, non-converting terms into conversions.",
        priority: "medium",
        effort: "medium",
        impact: "medium",
        category: "keywords",
        actionItems: [
          "Create dedicated landing pages for top terms",
          "Adjust ad copy to better match search intent",
          "Review and improve keyword quality scores"
        ]
      },
      budget_reallocation: {
        title: "Reallocate Budget to Winners",
        description: "Shift spend from underperforming to high-performing campaigns.",
        priority: "medium",
        effort: "low",
        impact: "high",
        category: "budget",
        actionItems: [
          `Increase budget for ${opportunity.data?.campaign || 'top campaign'}`,
          "Reduce spend on underperforming campaigns",
          "Monitor performance impact closely"
        ]
      },
      bid_increase: {
        title: "Scale Successful Campaigns",
        description: "Strong performance metrics indicate opportunity for increased investment.",
        priority: "low",
        effort: "low",
        impact: "medium",
        category: "scaling",
        actionItems: [
          "Gradually increase bids by 10-15%",
          "Monitor CPA and ROAS impact",
          "Expand successful keyword themes"
        ]
      }
    };

    return recommendations[opportunity.type] || {
      title: opportunity.title,
      description: opportunity.description,
      priority: "medium",
      effort: "medium",
      impact: opportunity.impact,
      category: "opportunity",
      actionItems: ["Implement optimization", "Monitor results"]
    };
  }

  /**
   * Generate forecast for higher tiers
   */
  async generateForecast(weeklyData, tier) {
    if (!this.tierTemplates[tier].includeForecasting) return null;

    const { current, trends } = weeklyData;

    try {
      const prompt = `Based on current performance and trends, provide a brief forecast for next week:

Current metrics: ${current.totals.clicks} clicks, $${current.totals.cost} cost, ${current.totals.conversions} conversions
Recent trends: Clicks ${trends.clicks >= 0 ? '+' : ''}${trends.clicks?.toFixed(1) || 0}%, Conversions ${trends.conversions >= 0 ? '+' : ''}${trends.conversions?.toFixed(1) || 0}%

Predict next week's performance ranges and one key recommendation. Keep under 150 words.`;

      const forecastText = await this.aiProvider.generateText(prompt, {
        maxTokens: 300,
        temperature: 0.4,
        tenant: weeklyData.tenant,
        operation: 'weekly_forecast'
      });

      return {
        text: forecastText || "Forecast unavailable",
        confidence: forecastText ? 0.7 : 0.0,
        generatedAt: new Date().toISOString(),
        predictedMetrics: {
          clicks: this.calculatePrediction(current.totals.clicks, trends.clicks),
          cost: this.calculatePrediction(current.totals.cost, trends.cost),
          conversions: this.calculatePrediction(current.totals.conversions, trends.conversions)
        }
      };
    } catch (error) {
      logger.warn("Forecast generation failed", { error: error.message });
      return null;
    }
  }

  /**
   * Calculate simple prediction based on current value and trend
   */
  calculatePrediction(currentValue, trendPercent) {
    if (!trendPercent || !currentValue) return currentValue;

    const trendMultiplier = 1 + (trendPercent / 100);
    const predicted = currentValue * trendMultiplier;

    return {
      value: Math.round(predicted * 100) / 100,
      range: {
        min: Math.round(predicted * 0.8 * 100) / 100,
        max: Math.round(predicted * 1.2 * 100) / 100
      }
    };
  }

  /**
   * Assess data quality for confidence scoring
   */
  assessDataQuality(weeklyData) {
    const { current } = weeklyData;
    let score = 100;
    const issues = [];

    // Check data completeness
    if (current.totals.clicks === 0) {
      score -= 30;
      issues.push("No click data");
    }

    if (current.totals.cost === 0) {
      score -= 20;
      issues.push("No cost data");
    }

    if (current.campaigns.length === 0) {
      score -= 25;
      issues.push("No campaign data");
    }

    if (current.searchTerms.length === 0) {
      score -= 15;
      issues.push("No search term data");
    }

    // Check data recency (should have data from last 3 days)
    const recentDays = current.dailyMetrics.filter(day => {
      const dayDate = new Date(day.date);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      return dayDate >= threeDaysAgo;
    });

    if (recentDays.length < 2) {
      score -= 20;
      issues.push("Stale data");
    }

    return {
      score: Math.max(0, score),
      quality: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
      issues
    };
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummaryEmail(tenant, userEmail, summary, options = {}) {
    try {
      const reportData = {
        // Basic metrics
        totalRevenue: summary.metrics.cost * 3, // Estimated revenue
        totalCustomers: summary.metrics.conversions,
        averageOrderValue: summary.metrics.cpa || 0,
        conversionRate: summary.metrics.conversionRate,

        // Performance data
        clicks: summary.metrics.clicks,
        cost: summary.metrics.cost,
        conversions: summary.metrics.conversions,
        cpa: summary.metrics.cpa,
        ctr: summary.metrics.ctr,

        // AI insights
        insights: summary.insights ? [{
          type: 'AI Analysis',
          message: summary.insights.summary
        }] : [],

        // Recommendations
        recommendations: summary.recommendations.map(rec => ({
          title: rec.title,
          description: rec.description,
          priority: rec.priority
        })),

        // Trends
        clicksChange: summary.trends?.clicks || 0,
        costChange: summary.trends?.cost || 0,
        conversionsChange: summary.trends?.conversions || 0,

        // Metadata
        tier: summary.tier,
        frequency: 'Weekly',
        timeframe: 'weekly',
        timeframeSummary: `Week of ${new Date(summary.period.start).toLocaleDateString()} - ${new Date(summary.period.end).toLocaleDateString()}`,

        // URLs
        viewOnlineUrl: `${process.env.APP_URL}/insights?tenant=${tenant}`,
        upgradeUrl: summary.tier === 'starter' ? `${process.env.APP_URL}/billing?upgrade=professional` : null
      };

      const result = await emailService.sendReportEmail(
        tenant,
        userEmail,
        reportData,
        'insights'
      );

      logger.info("Weekly summary email sent successfully", {
        tenant,
        userEmail,
        tier: summary.tier,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error("Failed to send weekly summary email", {
        tenant,
        userEmail,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service status and metrics
   */
  getStatus() {
    return {
      initialized: this.initialized,
      aiProvider: this.aiProvider.getStatus(),
      tierTemplates: Object.keys(this.tierTemplates),
      lastGenerated: this.lastGenerated || null
    };
  }
}

// Singleton instance
let weeklySummaryAIInstance = null;

/**
 * Get singleton Weekly Summary AI service instance
 */
export function getWeeklySummaryAI() {
  if (!weeklySummaryAIInstance) {
    weeklySummaryAIInstance = new WeeklySummaryAIService();
  }
  return weeklySummaryAIInstance;
}

/**
 * Quick generation function
 */
export async function generateWeeklySummary(tenant, options = {}) {
  const service = getWeeklySummaryAI();
  return await service.generateWeeklySummary(tenant, options);
}

export default WeeklySummaryAIService;