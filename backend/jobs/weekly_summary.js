import { getDoc, ensureSheet } from '../sheets.js';
import { AIProviderService } from '../services/ai-provider.js';
import logger from '../services/logger.js';

const aiProvider = new AIProviderService();

/**
 * Enhanced Weekly Summary Job with AI Insights
 * Generates comprehensive weekly reports with plain-English insights,
 * trend analysis, and actionable recommendations for merchants
 */
export async function runWeeklySummary(tenant, options = {}) {
  const startTime = Date.now();
  logger.info('Starting weekly summary generation', { tenant });
  
  try {
    const doc = await getDoc();
    if (!doc) {
      logger.error('Failed to connect to Google Sheets', { tenant });
      return { ok: false, error: 'no_sheets' };
    }

    // Get data from sheets
    const { weeklyData, previousWeekData, insights } = await extractWeeklyData(doc, tenant);
    
    // Generate AI insights if available
    let aiInsights = null;
    if (options.generateAI !== false) {
      try {
        aiInsights = await generateAIInsights(weeklyData, previousWeekData, tenant);
      } catch (error) {
        logger.warn('Failed to generate AI insights', { error: error.message, tenant });
      }
    }

    // Create comprehensive summary
    const summary = createComprehensiveSummary(weeklyData, previousWeekData, insights, aiInsights);
    
    // Log to run logs
    const runLogs = await ensureSheet(doc, `RUN_LOGS_${tenant}`, ['timestamp', 'type', 'message', 'data']);
    await runLogs.addRow({
      timestamp: new Date().toISOString(),
      type: 'weekly_summary',
      message: summary.plainText,
      data: JSON.stringify(summary.structured)
    });

    const duration = Date.now() - startTime;
    logger.info('Weekly summary completed', { 
      tenant, 
      duration, 
      hasAI: !!aiInsights,
      metrics: summary.structured.metrics
    });

    return { 
      ok: true, 
      summary: summary.structured,
      insights: aiInsights,
      duration 
    };
    
  } catch (error) {
    logger.error('Weekly summary failed', { error: error.message, tenant, stack: error.stack });
    return { ok: false, error: error.message };
  }
}

/**
 * Extract and analyze weekly data from Google Sheets
 */
async function extractWeeklyData(doc, tenant) {
  const currentWeekStart = Date.now() - 7 * 24 * 3600 * 1000;
  const previousWeekStart = Date.now() - 14 * 24 * 3600 * 1000;
  
  // Get sheets
  const metricsSheet = await ensureSheet(doc, `METRICS_${tenant}`, [
    'date', 'level', 'campaign', 'ad_group', 'id', 'name', 'clicks', 'cost', 'conversions', 'impr', 'ctr'
  ]);
  const searchTermsSheet = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, [
    'date', 'campaign', 'ad_group', 'search_term', 'clicks', 'cost', 'conversions'
  ]);
  
  const metricsRows = await metricsSheet.getRows();
  const searchTermsRows = await searchTermsSheet.getRows();
  
  // Process current week data
  const weeklyData = processWeekData(metricsRows, searchTermsRows, currentWeekStart, Date.now());
  
  // Process previous week data for comparison
  const previousWeekData = processWeekData(metricsRows, searchTermsRows, previousWeekStart, currentWeekStart);
  
  // Calculate insights and trends
  const insights = calculateInsights(weeklyData, previousWeekData);
  
  return { weeklyData, previousWeekData, insights };
}

/**
 * Process data for a specific time period
 */
function processWeekData(metricsRows, searchTermsRows, startTime, endTime) {
  let totalClicks = 0, totalCost = 0, totalConversions = 0, totalImpressions = 0;
  const campaigns = new Map();
  const searchTerms = new Map();
  const dailyMetrics = new Map();
  
  // Process metrics data
  metricsRows.forEach(row => {
    const rowDate = Date.parse(row.date || '');
    if (!isFinite(rowDate) || rowDate < startTime || rowDate >= endTime) return;
    
    const clicks = Number(row.clicks || 0);
    const cost = Number(row.cost || 0);
    const conversions = Number(row.conversions || 0);
    const impressions = Number(row.impr || 0);
    
    totalClicks += clicks;
    totalCost += cost;
    totalConversions += conversions;
    totalImpressions += impressions;
    
    // Campaign-level aggregation
    const campaign = row.campaign || 'Unknown';
    if (!campaigns.has(campaign)) {
      campaigns.set(campaign, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });
    }
    const campaignData = campaigns.get(campaign);
    campaignData.clicks += clicks;
    campaignData.cost += cost;
    campaignData.conversions += conversions;
    campaignData.impressions += impressions;
    
    // Daily metrics
    const dateKey = new Date(rowDate).toISOString().split('T')[0];
    if (!dailyMetrics.has(dateKey)) {
      dailyMetrics.set(dateKey, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });
    }
    const dayData = dailyMetrics.get(dateKey);
    dayData.clicks += clicks;
    dayData.cost += cost;
    dayData.conversions += conversions;
    dayData.impressions += impressions;
  });
  
  // Process search terms data
  searchTermsRows.forEach(row => {
    const rowDate = Date.parse(row.date || '');
    if (!isFinite(rowDate) || rowDate < startTime || rowDate >= endTime) return;
    
    const term = String(row.search_term || '').toLowerCase().trim();
    if (!term) return;
    
    const clicks = Number(row.clicks || 0);
    const cost = Number(row.cost || 0);
    const conversions = Number(row.conversions || 0);
    
    if (!searchTerms.has(term)) {
      searchTerms.set(term, { clicks: 0, cost: 0, conversions: 0 });
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
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0,
      cpa: totalConversions > 0 ? (totalCost / totalConversions) : null,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks * 100) : 0
    },
    campaigns: Array.from(campaigns.entries()).map(([name, data]) => ({
      name,
      ...data,
      cpa: data.conversions > 0 ? (data.cost / data.conversions) : null,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions * 100) : 0
    })),
    searchTerms: Array.from(searchTerms.entries()).map(([term, data]) => ({
      term,
      ...data,
      cpa: data.conversions > 0 ? (data.cost / data.conversions) : null
    })),
    dailyMetrics: Array.from(dailyMetrics.entries()).map(([date, data]) => ({
      date,
      ...data,
      cpa: data.conversions > 0 ? (data.cost / data.conversions) : null,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions * 100) : 0
    }))
  };
}

/**
 * Calculate insights and trends between two periods
 */
function calculateInsights(current, previous) {
  const insights = {
    trends: {},
    alerts: [],
    opportunities: [],
    topPerformers: {},
    concerning: []
  };
  
  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  // Overall trends
  insights.trends = {
    clicks: calculateChange(current.totals.clicks, previous.totals.clicks),
    cost: calculateChange(current.totals.cost, previous.totals.cost),
    conversions: calculateChange(current.totals.conversions, previous.totals.conversions),
    cpa: current.totals.cpa && previous.totals.cpa ? 
      calculateChange(current.totals.cpa, previous.totals.cpa) : null,
    ctr: calculateChange(current.totals.ctr, previous.totals.ctr)
  };
  
  // Identify alerts (significant negative changes)
  if (insights.trends.conversions < -20) {
    insights.alerts.push({
      type: 'conversion_drop',
      severity: 'high',
      message: `Conversions dropped by ${Math.abs(insights.trends.conversions).toFixed(1)}%`
    });
  }
  
  if (insights.trends.cpa && insights.trends.cpa > 30) {
    insights.alerts.push({
      type: 'cpa_spike',
      severity: 'medium',
      message: `Cost per acquisition increased by ${insights.trends.cpa.toFixed(1)}%`
    });
  }
  
  if (insights.trends.ctr < -15) {
    insights.alerts.push({
      type: 'ctr_drop',
      severity: 'medium',
      message: `Click-through rate dropped by ${Math.abs(insights.trends.ctr).toFixed(1)}%`
    });
  }
  
  // Top performing campaigns
  const sortedCampaigns = current.campaigns
    .filter(c => c.conversions > 0)
    .sort((a, b) => (b.conversions / b.cost) - (a.conversions / a.cost));
  
  if (sortedCampaigns.length > 0) {
    insights.topPerformers.campaign = sortedCampaigns[0];
  }
  
  // Top performing search terms
  const sortedTerms = current.searchTerms
    .filter(t => t.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 5);
  
  insights.topPerformers.searchTerms = sortedTerms;
  
  // Identify opportunities
  const highClickLowConversionTerms = current.searchTerms
    .filter(t => t.clicks > 10 && t.conversions === 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 3);
  
  if (highClickLowConversionTerms.length > 0) {
    insights.opportunities.push({
      type: 'low_conversion_terms',
      message: 'High-click search terms with no conversions detected',
      data: highClickLowConversionTerms
    });
  }
  
  return insights;
}

/**
 * Generate AI-powered insights and recommendations
 */
async function generateAIInsights(currentData, previousData, tenant) {
  try {
    const prompt = createInsightPrompt(currentData, previousData, tenant);
    
    const aiResult = await aiProvider.generateText(prompt, {
      maxTokens: 1000,
      temperature: 0.3
    });
    
    return {
      summary: aiResult.text,
      confidence: aiResult.confidence || 0.8,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('AI insight generation failed', { error: error.message, tenant });
    return null;
  }
}

/**
 * Create prompt for AI insight generation
 */
function createInsightPrompt(current, previous, tenant) {
  const trends = {
    clicks: previous.totals.clicks > 0 ? 
      ((current.totals.clicks - previous.totals.clicks) / previous.totals.clicks * 100) : 0,
    cost: previous.totals.cost > 0 ? 
      ((current.totals.cost - previous.totals.cost) / previous.totals.cost * 100) : 0,
    conversions: previous.totals.conversions > 0 ? 
      ((current.totals.conversions - previous.totals.conversions) / previous.totals.conversions * 100) : 0
  };
  
  return `As a Google Ads performance analyst, provide insights for this weekly performance summary:

CURRENT WEEK:
- Clicks: ${current.totals.clicks.toLocaleString()}
- Cost: $${current.totals.cost.toFixed(2)}
- Conversions: ${current.totals.conversions}
- CPA: $${current.totals.cpa?.toFixed(2) || 'N/A'}
- CTR: ${current.totals.ctr.toFixed(2)}%

VS PREVIOUS WEEK:
- Clicks: ${trends.clicks >= 0 ? '+' : ''}${trends.clicks.toFixed(1)}%
- Cost: ${trends.cost >= 0 ? '+' : ''}${trends.cost.toFixed(1)}%
- Conversions: ${trends.conversions >= 0 ? '+' : ''}${trends.conversions.toFixed(1)}%

TOP SEARCH TERMS: ${current.searchTerms.slice(0, 5).map(t => t.term).join(', ')}

Provide a concise, actionable analysis in plain English covering:
1. Key performance highlights or concerns
2. What these trends indicate about campaign health
3. 2-3 specific actionable recommendations
4. One key metric to watch next week

Keep response under 300 words, business-focused, and avoid technical jargon.`;
}

/**
 * Create comprehensive summary combining all insights
 */
function createComprehensiveSummary(current, previous, insights, aiInsights) {
  const formatCurrency = (amount) => `$${amount.toFixed(2)}`;
  const formatPercent = (percent) => `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  
  // Plain text summary for logging
  const plainTextLines = [
    `=== WEEKLY PERFORMANCE SUMMARY ===`,
    `Period: ${new Date(Date.now() - 7*24*3600*1000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
    ``,
    `📊 KEY METRICS:`,
    `• Clicks: ${current.totals.clicks.toLocaleString()} (${formatPercent(insights.trends.clicks)})`,
    `• Cost: ${formatCurrency(current.totals.cost)} (${formatPercent(insights.trends.cost)})`,
    `• Conversions: ${current.totals.conversions} (${formatPercent(insights.trends.conversions)})`,
    `• CPA: ${current.totals.cpa ? formatCurrency(current.totals.cpa) : 'N/A'} (${insights.trends.cpa ? formatPercent(insights.trends.cpa) : 'N/A'})`,
    `• CTR: ${current.totals.ctr.toFixed(2)}% (${formatPercent(insights.trends.ctr)})`,
    ``
  ];
  
  // Add alerts if any
  if (insights.alerts.length > 0) {
    plainTextLines.push(`🚨 ALERTS:`);
    insights.alerts.forEach(alert => {
      plainTextLines.push(`• [${alert.severity.toUpperCase()}] ${alert.message}`);
    });
    plainTextLines.push(``);
  }
  
  // Add top performers
  if (insights.topPerformers.campaign) {
    plainTextLines.push(`🏆 TOP PERFORMING CAMPAIGN:`);
    const camp = insights.topPerformers.campaign;
    plainTextLines.push(`• ${camp.name}: ${camp.conversions} conversions at ${formatCurrency(camp.cpa)} CPA`);
    plainTextLines.push(``);
  }
  
  if (insights.topPerformers.searchTerms.length > 0) {
    plainTextLines.push(`🔍 TOP SEARCH TERMS:`);
    insights.topPerformers.searchTerms.slice(0, 3).forEach(term => {
      plainTextLines.push(`• "${term.term}": ${term.conversions} conversions, ${term.clicks} clicks`);
    });
    plainTextLines.push(``);
  }
  
  // Add AI insights if available
  if (aiInsights) {
    plainTextLines.push(`🤖 AI INSIGHTS:`);
    plainTextLines.push(aiInsights.summary);
    plainTextLines.push(``);
  }
  
  // Add opportunities
  if (insights.opportunities.length > 0) {
    plainTextLines.push(`💡 OPPORTUNITIES:`);
    insights.opportunities.forEach(opp => {
      plainTextLines.push(`• ${opp.message}`);
    });
  }
  
  return {
    plainText: plainTextLines.join('\n'),
    structured: {
      timestamp: new Date().toISOString(),
      period: {
        start: new Date(Date.now() - 7*24*3600*1000).toISOString(),
        end: new Date().toISOString()
      },
      metrics: current.totals,
      trends: insights.trends,
      alerts: insights.alerts,
      topPerformers: insights.topPerformers,
      opportunities: insights.opportunities,
      campaigns: current.campaigns,
      searchTerms: current.searchTerms.slice(0, 10),
      aiInsights: aiInsights
    }
  };
}




