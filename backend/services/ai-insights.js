/**
 * AI-Powered Insights Service
 * Generates actionable recommendations based on Google Ads performance data
 * Analyzes trends, identifies optimization opportunities, and provides cost optimization suggestions
 */

import { getJson, setJson } from './redis.js';
import logger from './logger.js';
import InsightTemplateGenerator from './ai-insight-templates.js';

class AIInsightsService {
  constructor() {
    this.cachePrefix = 'ai-insights:';
    this.cacheTTL = 300; // 5 minutes cache
  }

  /**
   * Generate comprehensive AI insights from metrics data
   * @param {Object} metricsData - Raw metrics data from analytics
   * @param {string} period - Time period (24h, 7d, 30d, 90d)
   * @param {string} tenant - Tenant identifier
   * @returns {Object} AI-generated insights and recommendations
   */
  async generateInsights(metricsData, period = '7d', tenant = '') {
    try {
      // Check cache first
      const cacheKey = `${this.cachePrefix}${tenant}:${period}`;
      const cached = await getJson(cacheKey);
      if (cached) {
        logger.info('AI insights served from cache', { tenant, period });
        return cached;
      }

      logger.info('Generating AI insights', { tenant, period, campaignCount: metricsData?.campaigns?.length || 0 });

      if (!metricsData || !metricsData.campaigns || metricsData.campaigns.length === 0) {
        return this._generateEmptyStateInsights(period);
      }

      // Analyze data and generate insights
      const insights = {
        overview: this._generateOverviewInsights(metricsData, period),
        performance: this._analyzePerformanceMetrics(metricsData, period),
        trends: this._analyzeTrends(metricsData, period),
        recommendations: this._generateRecommendations(metricsData, period),
        costOptimization: this._analyzeCostOptimization(metricsData, period),
        negativeKeywords: this._suggestNegativeKeywords(metricsData),
        budgetInsights: this._analyzeBudgetAllocation(metricsData, period),
        competitiveInsights: this._generateCompetitiveInsights(metricsData, period),
        timestamp: new Date().toISOString(),
        period,
        tenant,
        dataSource: metricsData.source || 'unknown'
      };

      // Cache the results
      await setJson(cacheKey, insights, this.cacheTTL);

      logger.info('AI insights generated successfully', {
        tenant,
        period,
        recommendationCount: insights.recommendations.length,
        costOptimizationCount: insights.costOptimization.suggestions.length
      });

      return insights;

    } catch (error) {
      logger.error('Failed to generate AI insights', {
        error: error.message,
        tenant,
        period,
        stack: error.stack
      });

      return this._generateErrorInsights(error.message, period);
    }
  }

  /**
   * Generate overview insights from summary data
   */
  _generateOverviewInsights(metricsData, period) {
    const summary = metricsData.summary || {};
    const { totalCost, totalClicks, totalConversions, totalImpressions, avgCpc, avgCtr } = summary;

    const insights = [];

    // Performance summary
    if (totalConversions > 0) {
      const cpa = totalCost / totalConversions;
      const conversionRate = totalConversions / totalClicks;

      insights.push({
        type: 'overview',
        title: 'Campaign Performance Summary',
        description: `In the last ${period}, your campaigns generated ${totalConversions} conversions from ${totalClicks} clicks, with an average CPA of $${cpa.toFixed(2)}.`,
        metric: `${totalConversions} conversions`,
        trend: conversionRate > 0.02 ? 'positive' : conversionRate > 0.01 ? 'neutral' : 'negative',
        priority: 'high'
      });
    }

    // CTR analysis
    if (avgCtr !== undefined) {
      const ctrPercentage = avgCtr * 100;
      let ctrInsight = '';
      let trend = 'neutral';

      if (ctrPercentage > 2.0) {
        ctrInsight = `Excellent CTR of ${ctrPercentage.toFixed(2)}% indicates strong ad relevance.`;
        trend = 'positive';
      } else if (ctrPercentage > 1.0) {
        ctrInsight = `Average CTR of ${ctrPercentage.toFixed(2)}% is within normal range.`;
        trend = 'neutral';
      } else {
        ctrInsight = `Low CTR of ${ctrPercentage.toFixed(2)}% suggests ads may need optimization.`;
        trend = 'negative';
      }

      insights.push({
        type: 'overview',
        title: 'Click-Through Rate Analysis',
        description: ctrInsight,
        metric: `${ctrPercentage.toFixed(2)}% CTR`,
        trend,
        priority: trend === 'negative' ? 'high' : 'medium'
      });
    }

    // Cost efficiency
    if (avgCpc !== undefined) {
      let costInsight = '';
      let trend = 'neutral';

      if (avgCpc > 2.0) {
        costInsight = `High average CPC of $${avgCpc.toFixed(2)} may indicate competitive keywords or poor Quality Scores.`;
        trend = 'negative';
      } else if (avgCpc > 1.0) {
        costInsight = `Moderate average CPC of $${avgCpc.toFixed(2)} is reasonable for most industries.`;
        trend = 'neutral';
      } else {
        costInsight = `Low average CPC of $${avgCpc.toFixed(2)} suggests good keyword targeting efficiency.`;
        trend = 'positive';
      }

      insights.push({
        type: 'overview',
        title: 'Cost Per Click Analysis',
        description: costInsight,
        metric: `$${avgCpc.toFixed(2)} avg CPC`,
        trend,
        priority: trend === 'negative' ? 'high' : 'low'
      });
    }

    return insights;
  }

  /**
   * Analyze performance metrics for insights
   */
  _analyzePerformanceMetrics(metricsData, period) {
    const campaigns = metricsData.campaigns || [];
    const summary = metricsData.summary || {};

    const analysis = {
      topPerformers: [],
      underperformers: [],
      insights: []
    };

    // Group campaigns by performance
    const campaignPerformance = campaigns.map(campaign => ({
      ...campaign,
      cpa: campaign.conversions > 0 ? campaign.cost / campaign.conversions : null,
      roas: campaign.revenue > 0 ? campaign.revenue / campaign.cost : null,
      ctr: campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0,
      conversionRate: campaign.clicks > 0 ? campaign.conversions / campaign.clicks : 0
    })).sort((a, b) => (b.conversions || 0) - (a.conversions || 0));

    // Top performers (campaigns with most conversions)
    analysis.topPerformers = campaignPerformance.slice(0, 3).filter(c => c.conversions > 0);

    // Underperformers (high spend, low conversions)
    analysis.underperformers = campaignPerformance
      .filter(c => c.cost > 50 && (c.conversions === 0 || c.cpa > 100))
      .slice(0, 3);

    // Generate performance insights
    if (analysis.topPerformers.length > 0) {
      const topCampaign = analysis.topPerformers[0];
      analysis.insights.push({
        type: 'performance',
        title: `Top Performer: ${topCampaign.campaign_name}`,
        description: `Generated ${topCampaign.conversions} conversions with a CPA of $${topCampaign.cpa?.toFixed(2) || 'N/A'}.`,
        action: 'Consider increasing budget for this high-performing campaign',
        priority: 'medium',
        campaign: topCampaign.campaign_name
      });
    }

    if (analysis.underperformers.length > 0) {
      const worstCampaign = analysis.underperformers[0];
      analysis.insights.push({
        type: 'performance',
        title: `Underperformer: ${worstCampaign.campaign_name}`,
        description: `Spent $${worstCampaign.cost.toFixed(2)} with ${worstCampaign.conversions || 0} conversions.`,
        action: 'Review keywords, ad copy, and landing pages for this campaign',
        priority: 'high',
        campaign: worstCampaign.campaign_name
      });
    }

    return analysis;
  }

  /**
   * Analyze trends in the data
   */
  _analyzeTrends(metricsData, period) {
    const campaigns = metricsData.campaigns || [];
    const trends = {
      costTrend: 'stable',
      conversionTrend: 'stable',
      insights: []
    };

    if (campaigns.length < 2) {
      return trends;
    }

    // Group by date to analyze trends
    const dailyData = {};
    campaigns.forEach(campaign => {
      const date = campaign.date?.split('T')[0] || new Date().toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { cost: 0, conversions: 0, clicks: 0 };
      }
      dailyData[date].cost += campaign.cost || 0;
      dailyData[date].conversions += campaign.conversions || 0;
      dailyData[date].clicks += campaign.clicks || 0;
    });

    const days = Object.keys(dailyData).sort();
    if (days.length >= 3) {
      // Analyze cost trend
      const recentDays = days.slice(-3);
      const costTrend = this._calculateTrend(recentDays.map(date => dailyData[date].cost));

      if (costTrend > 0.1) {
        trends.costTrend = 'increasing';
        trends.insights.push({
          type: 'trend',
          title: 'Rising Costs Detected',
          description: 'Your daily ad spend has increased significantly over the last 3 days.',
          action: 'Monitor CPC increases and review budget allocation',
          priority: 'medium'
        });
      } else if (costTrend < -0.1) {
        trends.costTrend = 'decreasing';
        trends.insights.push({
          type: 'trend',
          title: 'Decreasing Spend Trend',
          description: 'Your daily ad spend has decreased over the last 3 days.',
          action: 'Check if campaigns are reaching their daily budgets',
          priority: 'medium'
        });
      }

      // Analyze conversion trend
      const conversionTrend = this._calculateTrend(recentDays.map(date => dailyData[date].conversions));

      if (conversionTrend > 0.2) {
        trends.conversionTrend = 'improving';
        trends.insights.push({
          type: 'trend',
          title: 'Conversion Rate Improving',
          description: 'Your conversion rate has improved over the last 3 days.',
          action: 'Consider scaling successful campaigns',
          priority: 'low'
        });
      } else if (conversionTrend < -0.2) {
        trends.conversionTrend = 'declining';
        trends.insights.push({
          type: 'trend',
          title: 'Conversion Rate Declining',
          description: 'Your conversion rate has declined over the last 3 days.',
          action: 'Review recent changes to campaigns, ads, or landing pages',
          priority: 'high'
        });
      }
    }

    return trends;
  }

  /**
   * Generate actionable recommendations
   */
  _generateRecommendations(metricsData, period) {
    // Use template generator for structured recommendations
    const templateRecommendations = InsightTemplateGenerator.generateRecommendations(metricsData);
    const recommendations = [...templateRecommendations];

    const summary = metricsData.summary || {};
    const campaigns = metricsData.campaigns || [];

    // High CPC recommendations
    if (summary.avgCpc > 2.0) {
      recommendations.push({
        id: 'high-cpc',
        type: 'cost-optimization',
        title: 'Reduce High Cost Per Click',
        description: `Your average CPC of $${summary.avgCpc.toFixed(2)} is above the recommended range.`,
        actions: [
          'Review and improve Quality Scores',
          'Add negative keywords to filter irrelevant traffic',
          'Optimize ad relevance and landing page experience',
          'Consider lower bid adjustments for underperforming keywords'
        ],
        priority: 'high',
        impact: 'medium',
        effort: 'medium',
        expectedSavings: `$${(summary.totalCost * 0.15).toFixed(2)}/month`
      });
    }

    // Low CTR recommendations
    if (summary.avgCtr < 0.01) {
      recommendations.push({
        id: 'low-ctr',
        type: 'performance-improvement',
        title: 'Improve Click-Through Rate',
        description: `Your average CTR of ${(summary.avgCtr * 100).toFixed(2)}% is below the recommended 1%+.`,
        actions: [
          'Rewrite ad headlines to be more compelling',
          'Include relevant keywords in ad copy',
          'Add ad extensions (sitelinks, callouts, structured snippets)',
          'Test different ad formats and messaging'
        ],
        priority: 'high',
        impact: 'high',
        effort: 'medium',
        expectedSavings: 'Improved Quality Score can reduce CPC by 20-30%'
      });
    }

    // Budget allocation recommendations
    const topPerformer = campaigns
      .filter(c => c.conversions > 0)
      .sort((a, b) => (b.conversions / b.cost) - (a.conversions / a.cost))[0];

    if (topPerformer) {
      recommendations.push({
        id: 'budget-reallocation',
        type: 'budget-optimization',
        title: 'Optimize Budget Allocation',
        description: `Campaign "${topPerformer.campaign_name}" shows strong performance with efficient cost per conversion.`,
        actions: [
          `Increase budget for "${topPerformer.campaign_name}"`,
          'Reduce budget for underperforming campaigns',
          'Monitor performance after budget changes',
          'Consider duplicating successful campaign structure'
        ],
        priority: 'medium',
        impact: 'high',
        effort: 'low',
        expectedSavings: 'Potential 25-40% improvement in ROAS'
      });
    }

    // Search terms recommendations
    if (metricsData.searchTerms && metricsData.searchTerms.length > 0) {
      const expensiveTerms = metricsData.searchTerms
        .filter(term => term.cost > 10 && term.conversions === 0)
        .slice(0, 5);

      if (expensiveTerms.length > 0) {
        recommendations.push({
          id: 'negative-keywords',
          type: 'waste-reduction',
          title: 'Add Negative Keywords',
          description: `Found ${expensiveTerms.length} expensive search terms with no conversions.`,
          actions: [
            'Add identified terms as negative keywords',
            'Review search term reports regularly',
            'Implement broad negative keywords for irrelevant categories',
            'Set up automated rules for consistent negative keyword management'
          ],
          priority: 'high',
          impact: 'medium',
          effort: 'low',
          expectedSavings: `$${expensiveTerms.reduce((sum, term) => sum + term.cost, 0).toFixed(2)}/week`,
          data: expensiveTerms
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze cost optimization opportunities
   */
  _analyzeCostOptimization(metricsData, period) {
    const campaigns = metricsData.campaigns || [];
    const summary = metricsData.summary || {};

    const analysis = {
      totalWaste: 0,
      suggestions: [],
      quickWins: InsightTemplateGenerator.generateQuickWins(metricsData)
    };

    // Find high-spend, zero-conversion campaigns
    const wastefulCampaigns = campaigns.filter(c => c.cost > 20 && c.conversions === 0);
    const wastedAmount = wastefulCampaigns.reduce((sum, c) => sum + c.cost, 0);

    if (wastedAmount > 0) {
      analysis.totalWaste += wastedAmount;
      analysis.suggestions.push({
        type: 'campaign-pause',
        title: 'Pause Non-Converting Campaigns',
        description: `${wastefulCampaigns.length} campaigns spent $${wastedAmount.toFixed(2)} without conversions.`,
        action: 'Pause or optimize these campaigns',
        potentialSavings: wastedAmount,
        campaigns: wastefulCampaigns.map(c => c.campaign_name)
      });
    }

    // Find expensive keywords
    if (metricsData.searchTerms) {
      const expensiveTerms = metricsData.searchTerms
        .filter(term => term.cost > summary.avgCpc * 2 && term.conversions === 0);

      if (expensiveTerms.length > 0) {
        const termWaste = expensiveTerms.reduce((sum, term) => sum + term.cost, 0);
        analysis.totalWaste += termWaste;

        analysis.suggestions.push({
          type: 'keyword-optimization',
          title: 'Optimize Expensive Keywords',
          description: `${expensiveTerms.length} keywords are driving high costs with no conversions.`,
          action: 'Lower bids or add as negative keywords',
          potentialSavings: termWaste,
          keywords: expensiveTerms.slice(0, 10)
        });
      }
    }

    // Quick wins (easy optimizations)
    if (summary.avgCpc > 1.5) {
      analysis.quickWins.push({
        title: 'Reduce Maximum CPC',
        description: 'Lower max CPC by 10-15% to reduce costs while maintaining traffic',
        effort: 'low',
        impact: 'medium',
        timeToImplement: '5 minutes'
      });
    }

    if (summary.avgCtr < 0.02) {
      analysis.quickWins.push({
        title: 'Add Ad Extensions',
        description: 'Add sitelink and callout extensions to improve CTR and Quality Score',
        effort: 'low',
        impact: 'high',
        timeToImplement: '15 minutes'
      });
    }

    return analysis;
  }

  /**
   * Suggest negative keywords based on search terms
   */
  _suggestNegativeKeywords(metricsData) {
    const suggestions = [];

    if (!metricsData.searchTerms || metricsData.searchTerms.length === 0) {
      return suggestions;
    }

    // Common negative keyword patterns
    const negativePatterns = [
      { pattern: /free|gratis|kostenlos/i, reason: 'Users looking for free products' },
      { pattern: /job|career|hiring|employment/i, reason: 'Job-related searches' },
      { pattern: /review|reviews|rating/i, reason: 'Information seekers, not buyers' },
      { pattern: /how to|tutorial|guide/i, reason: 'Educational content seekers' },
      { pattern: /cheap|cheapest|discount/i, reason: 'Price-focused searchers' },
      { pattern: /used|second hand|refurbished/i, reason: 'Used product seekers' },
    ];

    // Expensive terms with no conversions
    const problematicTerms = metricsData.searchTerms
      .filter(term => term.cost > 5 && term.conversions === 0)
      .slice(0, 20);

    problematicTerms.forEach(term => {
      const matchedPattern = negativePatterns.find(pattern =>
        pattern.pattern.test(term.search_term)
      );

      if (matchedPattern) {
        suggestions.push({
          keyword: term.search_term,
          type: 'exact',
          reason: matchedPattern.reason,
          cost: term.cost,
          clicks: term.clicks,
          priority: 'high'
        });
      } else if (term.cost > 20) {
        suggestions.push({
          keyword: term.search_term,
          type: 'exact',
          reason: `High cost ($${term.cost.toFixed(2)}) with no conversions`,
          cost: term.cost,
          clicks: term.clicks,
          priority: 'medium'
        });
      }
    });

    return suggestions.slice(0, 15); // Limit to top 15 suggestions
  }

  /**
   * Analyze budget allocation
   */
  _analyzeBudgetAllocation(metricsData, period) {
    const campaigns = metricsData.campaigns || [];

    if (campaigns.length === 0) {
      return { recommendations: [], analysis: 'No campaign data available' };
    }

    const campaignMetrics = campaigns.map(campaign => ({
      name: campaign.campaign_name,
      cost: campaign.cost || 0,
      conversions: campaign.conversions || 0,
      revenue: campaign.revenue || 0,
      cpa: campaign.conversions > 0 ? campaign.cost / campaign.conversions : null,
      roas: campaign.revenue > 0 ? campaign.revenue / campaign.cost : null,
      efficiency: campaign.conversions > 0 ? campaign.conversions / campaign.cost : 0
    }));

    // Sort by efficiency (conversions per dollar spent)
    const sortedCampaigns = campaignMetrics.sort((a, b) => b.efficiency - a.efficiency);

    const recommendations = [];

    // Top performers that could use more budget
    const topPerformers = sortedCampaigns.slice(0, 3).filter(c => c.efficiency > 0);
    if (topPerformers.length > 0) {
      recommendations.push({
        type: 'increase-budget',
        title: 'Scale High-Performing Campaigns',
        campaigns: topPerformers.map(c => c.name),
        reason: 'These campaigns show strong conversion efficiency',
        priority: 'high'
      });
    }

    // Poor performers that need budget reduction
    const poorPerformers = sortedCampaigns.filter(c => c.cost > 50 && c.efficiency === 0);
    if (poorPerformers.length > 0) {
      recommendations.push({
        type: 'reduce-budget',
        title: 'Reduce Budget for Non-Performing Campaigns',
        campaigns: poorPerformers.map(c => c.name),
        reason: 'These campaigns are spending without generating conversions',
        priority: 'high'
      });
    }

    return {
      recommendations,
      topPerformers,
      poorPerformers,
      analysis: `Analyzed ${campaigns.length} campaigns for budget optimization opportunities`
    };
  }

  /**
   * Generate competitive insights
   */
  _generateCompetitiveInsights(metricsData, period) {
    const summary = metricsData.summary || {};

    // Industry benchmark estimates (these would ideally come from external data)
    const benchmarks = {
      avgCpc: 1.50,
      avgCtr: 0.02, // 2%
      avgConversionRate: 0.025, // 2.5%
    };

    const insights = [];

    // CPC comparison
    if (summary.avgCpc !== undefined) {
      const cpcDiff = ((summary.avgCpc - benchmarks.avgCpc) / benchmarks.avgCpc) * 100;
      insights.push({
        metric: 'Cost Per Click',
        yourValue: `$${summary.avgCpc.toFixed(2)}`,
        benchmark: `$${benchmarks.avgCpc.toFixed(2)}`,
        performance: cpcDiff > 10 ? 'above' : cpcDiff < -10 ? 'below' : 'similar',
        difference: `${cpcDiff > 0 ? '+' : ''}${cpcDiff.toFixed(1)}%`
      });
    }

    // CTR comparison
    if (summary.avgCtr !== undefined) {
      const ctrDiff = ((summary.avgCtr - benchmarks.avgCtr) / benchmarks.avgCtr) * 100;
      insights.push({
        metric: 'Click-Through Rate',
        yourValue: `${(summary.avgCtr * 100).toFixed(2)}%`,
        benchmark: `${(benchmarks.avgCtr * 100).toFixed(2)}%`,
        performance: ctrDiff > 10 ? 'above' : ctrDiff < -10 ? 'below' : 'similar',
        difference: `${ctrDiff > 0 ? '+' : ''}${ctrDiff.toFixed(1)}%`
      });
    }

    return {
      insights,
      summary: insights.length > 0 ?
        `Your performance is ${insights.filter(i => i.performance === 'above').length > insights.filter(i => i.performance === 'below').length ? 'above' : 'below'} industry averages overall.` :
        'Insufficient data for competitive analysis'
    };
  }

  /**
   * Calculate trend direction from array of values
   */
  _calculateTrend(values) {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) return last > 0 ? 1 : 0;
    return (last - first) / first;
  }

  /**
   * Generate insights for empty state
   */
  _generateEmptyStateInsights(period) {
    return {
      overview: [{
        type: 'empty',
        title: 'No Data Available',
        description: `No campaign data found for the ${period} period.`,
        metric: '0 campaigns',
        trend: 'neutral',
        priority: 'low'
      }],
      performance: { insights: [], topPerformers: [], underperformers: [] },
      trends: { insights: [] },
      recommendations: [{
        id: 'setup-tracking',
        type: 'setup',
        title: 'Set Up Campaign Tracking',
        description: 'Start by running the Google Ads script to collect performance data.',
        actions: [
          'Copy the Google Ads script from the Setup page',
          'Add it to your Google Ads account',
          'Run the script or schedule it to run daily',
          'Check back in a few hours for insights'
        ],
        priority: 'high',
        impact: 'high',
        effort: 'low'
      }],
      costOptimization: { suggestions: [], quickWins: [] },
      negativeKeywords: [],
      budgetInsights: { recommendations: [] },
      competitiveInsights: { insights: [] },
      timestamp: new Date().toISOString(),
      period,
      dataSource: 'none'
    };
  }

  /**
   * Generate error state insights
   */
  _generateErrorInsights(errorMessage, period) {
    return {
      overview: [{
        type: 'error',
        title: 'Analysis Error',
        description: `Unable to generate insights: ${errorMessage}`,
        metric: 'Error',
        trend: 'neutral',
        priority: 'high'
      }],
      performance: { insights: [], topPerformers: [], underperformers: [] },
      trends: { insights: [] },
      recommendations: [{
        id: 'troubleshoot',
        type: 'technical',
        title: 'Troubleshoot Data Issues',
        description: 'There was an error analyzing your campaign data.',
        actions: [
          'Check if the Google Ads script is running properly',
          'Verify your Google Ads account connection',
          'Contact support if the issue persists'
        ],
        priority: 'high',
        impact: 'high',
        effort: 'medium'
      }],
      costOptimization: { suggestions: [], quickWins: [] },
      negativeKeywords: [],
      budgetInsights: { recommendations: [] },
      competitiveInsights: { insights: [] },
      timestamp: new Date().toISOString(),
      period,
      error: errorMessage,
      dataSource: 'error'
    };
  }

  /**
   * Clear cache for specific tenant and period
   */
  async clearCache(tenant, period = null) {
    try {
      if (period) {
        const cacheKey = `${this.cachePrefix}${tenant}:${period}`;
        await setJson(cacheKey, null, 0); // Set with 0 TTL to delete
      } else {
        // Clear all periods for tenant (would need Redis SCAN in production)
        const periods = ['24h', '7d', '30d', '90d'];
        for (const p of periods) {
          const cacheKey = `${this.cachePrefix}${tenant}:${p}`;
          await setJson(cacheKey, null, 0);
        }
      }

      logger.info('AI insights cache cleared', { tenant, period });
    } catch (error) {
      logger.error('Failed to clear AI insights cache', { error: error.message, tenant, period });
    }
  }
}

// Export singleton instance
const aiInsightsService = new AIInsightsService();
export default aiInsightsService;