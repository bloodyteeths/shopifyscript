/**
 * AI Insight Templates
 * Pre-defined templates for common Google Ads optimization scenarios
 * These templates help generate consistent, actionable recommendations
 */

/**
 * Template for high CPC recommendations
 */
export const highCpcTemplate = {
  id: 'high-cpc-optimization',
  type: 'cost-optimization',
  title: 'Reduce High Cost Per Click',
  priority: 'high',
  impact: 'high',
  effort: 'medium',

  generateRecommendation: (avgCpc, totalCost, benchmarkCpc = 1.5) => ({
    description: `Your average CPC of $${avgCpc.toFixed(2)} is ${((avgCpc - benchmarkCpc) / benchmarkCpc * 100).toFixed(0)}% above the recommended range of $${benchmarkCpc.toFixed(2)}.`,
    actions: [
      'Review and optimize Quality Scores for underperforming keywords',
      'Add negative keywords to filter out irrelevant traffic',
      'Improve ad relevance by including target keywords in ad copy',
      'Enhance landing page experience and loading speed',
      'Consider lowering bids on keywords with consistently high CPC and low conversion rates',
      'Use bid adjustments to reduce costs during low-performing time periods'
    ],
    expectedSavings: `$${(totalCost * 0.15).toFixed(2)}/month (15-20% reduction expected)`,
    timeline: '2-4 weeks',
    kpis: ['Average CPC', 'Quality Score', 'Cost per Conversion']
  })
};

/**
 * Template for low CTR improvements
 */
export const lowCtrTemplate = {
  id: 'low-ctr-improvement',
  type: 'performance-improvement',
  title: 'Improve Click-Through Rate',
  priority: 'high',
  impact: 'high',
  effort: 'medium',

  generateRecommendation: (avgCtr, impressions, benchmarkCtr = 0.02) => ({
    description: `Your average CTR of ${(avgCtr * 100).toFixed(2)}% is below the recommended ${(benchmarkCtr * 100)}%+. This affects Quality Score and ad costs.`,
    actions: [
      'Rewrite ad headlines to be more compelling and include emotional triggers',
      'Include relevant keywords in ad headlines and descriptions',
      'Add ad extensions: sitelinks, callouts, structured snippets, and site reviews',
      'Test different ad formats and messaging approaches',
      'Use dynamic keyword insertion where appropriate',
      'Create urgency with limited-time offers or calls-to-action',
      'A/B test different value propositions'
    ],
    expectedSavings: 'Improved Quality Score can reduce CPC by 20-30%',
    timeline: '1-3 weeks',
    kpis: ['Click-Through Rate', 'Quality Score', 'Impression Share']
  })
};

/**
 * Template for budget optimization
 */
export const budgetOptimizationTemplate = {
  id: 'budget-reallocation',
  type: 'budget-optimization',
  title: 'Optimize Budget Allocation',
  priority: 'medium',
  impact: 'high',
  effort: 'low',

  generateRecommendation: (topPerformer, worstPerformer, totalBudget) => ({
    description: `Campaign "${topPerformer.campaign_name}" shows strong performance with efficient conversions, while "${worstPerformer.campaign_name}" is underperforming.`,
    actions: [
      `Increase budget for "${topPerformer.campaign_name}" by 25-50%`,
      `Reduce budget for "${worstPerformer.campaign_name}" by 30-40%`,
      'Monitor performance closely after budget changes',
      'Consider pausing or restructuring underperforming campaigns',
      'Duplicate successful campaign structures for similar products',
      'Set up automated rules for budget management based on performance'
    ],
    expectedSavings: 'Potential 25-40% improvement in ROAS',
    timeline: '1 week',
    kpis: ['ROAS', 'Cost per Conversion', 'Conversion Rate']
  })
};

/**
 * Template for negative keyword suggestions
 */
export const negativeKeywordsTemplate = {
  id: 'negative-keywords-cleanup',
  type: 'waste-reduction',
  title: 'Add Negative Keywords to Reduce Waste',
  priority: 'high',
  impact: 'medium',
  effort: 'low',

  generateRecommendation: (expensiveTerms, wastedSpend) => ({
    description: `Found ${expensiveTerms.length} expensive search terms with no conversions, wasting $${wastedSpend.toFixed(2)} in spend.`,
    actions: [
      'Add identified non-converting terms as exact match negative keywords',
      'Implement broad match negative keywords for irrelevant categories',
      'Set up weekly search term report reviews',
      'Create shared negative keyword lists across campaigns',
      'Use automated rules for consistent negative keyword management',
      'Monitor search terms for brand protection opportunities'
    ],
    expectedSavings: `$${wastedSpend.toFixed(2)}/week in reduced waste`,
    timeline: '1-2 days',
    kpis: ['Wasted Spend', 'Search Term Relevance', 'Conversion Rate'],
    data: expensiveTerms.slice(0, 10) // Top 10 terms to review
  })
};

/**
 * Template for conversion rate optimization
 */
export const conversionOptimizationTemplate = {
  id: 'conversion-rate-optimization',
  type: 'performance-improvement',
  title: 'Improve Conversion Rate',
  priority: 'high',
  impact: 'high',
  effort: 'high',

  generateRecommendation: (conversionRate, clicks, benchmarkRate = 0.025) => ({
    description: `Your conversion rate of ${(conversionRate * 100).toFixed(2)}% is below the industry average of ${(benchmarkRate * 100)}%.`,
    actions: [
      'Review and optimize landing page experience',
      'Ensure message match between ads and landing pages',
      'Simplify conversion process and reduce form fields',
      'Add trust signals: testimonials, reviews, security badges',
      'Implement remarketing campaigns for cart abandoners',
      'Test different offers and value propositions',
      'Optimize for mobile user experience'
    ],
    expectedSavings: `${((benchmarkRate - conversionRate) * clicks * 50).toFixed(0)} additional conversions/month`,
    timeline: '4-8 weeks',
    kpis: ['Conversion Rate', 'Cost per Conversion', 'Landing Page Experience']
  })
};

/**
 * Template for seasonal optimization
 */
export const seasonalOptimizationTemplate = {
  id: 'seasonal-optimization',
  type: 'strategic-planning',
  title: 'Optimize for Seasonal Trends',
  priority: 'medium',
  impact: 'medium',
  effort: 'medium',

  generateRecommendation: (seasonalData, currentPeriod) => ({
    description: `Performance data shows seasonal patterns that can be leveraged for better campaign optimization.`,
    actions: [
      'Increase budgets during high-performing seasonal periods',
      'Create seasonal ad copy and landing pages',
      'Adjust bid strategies based on historical performance',
      'Plan inventory and promotions around peak periods',
      'Set up automated rules for seasonal budget adjustments',
      'Prepare remarketing audiences for post-seasonal follow-up'
    ],
    expectedSavings: '15-25% improvement in seasonal ROAS',
    timeline: 'Ongoing/Seasonal',
    kpis: ['Seasonal ROAS', 'Market Share', 'Conversion Volume']
  })
};

/**
 * Template for competitor analysis insights
 */
export const competitorAnalysisTemplate = {
  id: 'competitor-analysis',
  type: 'competitive-intelligence',
  title: 'Competitive Positioning Insights',
  priority: 'medium',
  impact: 'medium',
  effort: 'low',

  generateRecommendation: (competitorData, yourMetrics) => ({
    description: `Analysis shows opportunities to improve competitive positioning based on market benchmarks.`,
    actions: [
      'Review competitor ad copy and messaging strategies',
      'Analyze competitor landing page experiences',
      'Identify gaps in competitor keyword coverage',
      'Develop unique value propositions',
      'Adjust bidding strategies for competitive keywords',
      'Monitor competitor promotional activities'
    ],
    expectedSavings: 'Potential market share gains and improved positioning',
    timeline: '2-4 weeks',
    kpis: ['Impression Share', 'Average Position', 'Competitive CTR']
  })
};

/**
 * Template for mobile optimization
 */
export const mobileOptimizationTemplate = {
  id: 'mobile-optimization',
  type: 'device-optimization',
  title: 'Optimize Mobile Performance',
  priority: 'high',
  impact: 'high',
  effort: 'medium',

  generateRecommendation: (mobileMetrics, desktopMetrics) => {
    const mobileCtr = mobileMetrics.ctr || 0;
    const desktopCtr = desktopMetrics.ctr || 0;
    const mobileConvRate = mobileMetrics.conversionRate || 0;

    return {
      description: `Mobile performance shows ${mobileCtr < desktopCtr ? 'lower CTR' : 'optimization opportunities'} compared to desktop.`,
      actions: [
        'Optimize landing pages for mobile experience',
        'Use mobile-preferred ads with shorter headlines',
        'Implement click-to-call extensions for mobile',
        'Adjust mobile bid modifiers based on performance',
        'Simplify mobile conversion process',
        'Test app download campaigns if applicable',
        'Use location extensions for local mobile searches'
      ],
      expectedSavings: `${mobileConvRate < 0.02 ? '30-50%' : '15-25%'} improvement in mobile conversions`,
      timeline: '3-6 weeks',
      kpis: ['Mobile CTR', 'Mobile Conversion Rate', 'Mobile CPC']
    };
  }
};

/**
 * Template generator utility
 * Selects and applies appropriate templates based on campaign data
 */
export class InsightTemplateGenerator {
  /**
   * Generate recommendations based on campaign metrics
   */
  static generateRecommendations(metricsData) {
    const recommendations = [];
    const summary = metricsData.summary || {};
    const campaigns = metricsData.campaigns || [];

    // High CPC recommendation
    if (summary.avgCpc > 2.0) {
      const recommendation = highCpcTemplate.generateRecommendation(
        summary.avgCpc,
        summary.totalCost
      );
      recommendations.push({
        ...highCpcTemplate,
        ...recommendation
      });
    }

    // Low CTR recommendation
    if (summary.avgCtr < 0.015) {
      const recommendation = lowCtrTemplate.generateRecommendation(
        summary.avgCtr,
        summary.totalImpressions
      );
      recommendations.push({
        ...lowCtrTemplate,
        ...recommendation
      });
    }

    // Budget optimization
    if (campaigns.length > 1) {
      const sortedByPerformance = campaigns
        .filter(c => c.conversions > 0)
        .sort((a, b) => (b.conversions / b.cost) - (a.conversions / a.cost));

      const worstPerformers = campaigns
        .filter(c => c.cost > 50 && c.conversions === 0);

      if (sortedByPerformance.length > 0 && worstPerformers.length > 0) {
        const recommendation = budgetOptimizationTemplate.generateRecommendation(
          sortedByPerformance[0],
          worstPerformers[0],
          summary.totalCost
        );
        recommendations.push({
          ...budgetOptimizationTemplate,
          ...recommendation
        });
      }
    }

    // Negative keywords
    if (metricsData.searchTerms) {
      const expensiveTerms = metricsData.searchTerms
        .filter(term => term.cost > 5 && term.conversions === 0)
        .slice(0, 15);

      if (expensiveTerms.length > 0) {
        const wastedSpend = expensiveTerms.reduce((sum, term) => sum + term.cost, 0);
        const recommendation = negativeKeywordsTemplate.generateRecommendation(
          expensiveTerms,
          wastedSpend
        );
        recommendations.push({
          ...negativeKeywordsTemplate,
          ...recommendation
        });
      }
    }

    // Conversion optimization
    const totalConversions = summary.totalConversions || 0;
    const totalClicks = summary.totalClicks || 0;
    if (totalClicks > 0) {
      const conversionRate = totalConversions / totalClicks;
      if (conversionRate < 0.02) {
        const recommendation = conversionOptimizationTemplate.generateRecommendation(
          conversionRate,
          totalClicks
        );
        recommendations.push({
          ...conversionOptimizationTemplate,
          ...recommendation
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate quick wins based on easy optimization opportunities
   */
  static generateQuickWins(metricsData) {
    const quickWins = [];
    const summary = metricsData.summary || {};

    // Quick win: Reduce high CPCs
    if (summary.avgCpc > 1.5) {
      quickWins.push({
        title: 'Lower Maximum CPC Bids',
        description: 'Reduce max CPC by 10-15% to lower costs while maintaining traffic volume',
        effort: 'low',
        impact: 'medium',
        timeToImplement: '5 minutes',
        expectedSavings: `$${(summary.totalCost * 0.12).toFixed(2)}/month`
      });
    }

    // Quick win: Add extensions
    if (summary.avgCtr < 0.02) {
      quickWins.push({
        title: 'Add Ad Extensions',
        description: 'Add sitelink, callout, and structured snippet extensions to improve CTR and Quality Score',
        effort: 'low',
        impact: 'high',
        timeToImplement: '15 minutes',
        expectedSavings: '15-25% CTR improvement'
      });
    }

    // Quick win: Pause non-performers
    if (metricsData.campaigns) {
      const nonPerformers = metricsData.campaigns.filter(c => c.cost > 20 && c.conversions === 0);
      if (nonPerformers.length > 0) {
        const wastedSpend = nonPerformers.reduce((sum, c) => sum + c.cost, 0);
        quickWins.push({
          title: 'Pause Non-Converting Campaigns',
          description: `${nonPerformers.length} campaigns are spending without conversions`,
          effort: 'low',
          impact: 'high',
          timeToImplement: '10 minutes',
          expectedSavings: `$${wastedSpend.toFixed(2)} immediate savings`
        });
      }
    }

    return quickWins;
  }
}

export default InsightTemplateGenerator;