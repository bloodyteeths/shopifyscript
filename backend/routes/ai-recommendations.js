import express from 'express';
import { verify } from '../utils/hmac.js';
import { getAIProviderService } from '../services/ai-provider.js';
import { logAccess, json } from '../utils/response.js';

const router = express.Router();

/**
 * AI Recommendations endpoint for Google Ads Script
 * Provides AI-powered optimization suggestions based on performance data
 */
router.post('/ai/recommendations', async (req, res) => {
  const tenant = String(req.query.tenant || '');
  const sig = String(req.query.sig || '');
  const { performance, context } = req.body;

  const payload = `POST:${tenant}:ai_recommendations:${req.body.nonce || Date.now()}`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'ai_recommendations auth_fail');
    return json(res, 403, { ok: false, error: 'Authentication failed' });
  }

  try {
    const aiService = getAIProviderService();
    await aiService.initialize();

    const recommendations = {
      budgets: {},
      cpcs: {},
      negatives: [],
      rsas: {},
      audiences: {},
      profitSignals: []
    };

    // Analyze campaign performance for budget recommendations
    if (performance && performance.campaigns) {
      for (const [campaignName, data] of Object.entries(performance.campaigns)) {
        const budgetRec = await analyzeBudget(aiService, tenant, campaignName, data);
        if (budgetRec) {
          recommendations.budgets[campaignName] = budgetRec;
        }

        const cpcRec = await analyzeCPC(aiService, tenant, campaignName, data);
        if (cpcRec) {
          recommendations.cpcs[campaignName] = cpcRec;
        }
      }
    }

    // Get negative keyword suggestions
    if (context && context.total_spend > 10) {
      const negatives = await suggestNegativeKeywords(aiService, tenant, performance);
      recommendations.negatives = negatives;
    }

    // Generate RSA content for top-performing ad groups
    if (performance && performance.adGroups) {
      const rsaSuggestions = await generateRSASuggestions(aiService, tenant, performance.adGroups);
      recommendations.rsas = rsaSuggestions;
    }

    // Profit-based optimization signals
    if (context && context.conversion_rate > 0) {
      const profitSignals = generateProfitSignals(performance, context);
      recommendations.profitSignals = profitSignals;
    }

    await logAccess(req, 200, `ai_recommendations success ${Object.keys(recommendations.budgets).length} budgets`);
    return json(res, 200, recommendations);

  } catch (error) {
    console.error('AI recommendations error:', error);
    await logAccess(req, 500, 'ai_recommendations error');
    return json(res, 500, { ok: false, error: 'Failed to generate recommendations' });
  }
});

/**
 * Analyze search terms with AI
 */
router.post('/ai/analyze-search-terms', async (req, res) => {
  const tenant = String(req.query.tenant || '');
  const sig = String(req.query.sig || '');
  const { search_terms } = req.body;

  const payload = `POST:${tenant}:ai_search_terms:${req.body.nonce || Date.now()}`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'ai_search_terms auth_fail');
    return json(res, 403, { ok: false, error: 'Authentication failed' });
  }

  try {
    const aiService = getAIProviderService();
    await aiService.initialize();

    // Analyze search terms for patterns and opportunities
    const analysis = await analyzeSearchTermPatterns(aiService, tenant, search_terms);

    // Store insights for future use
    await storeSearchTermInsights(tenant, analysis);

    await logAccess(req, 200, `ai_search_terms analyzed ${search_terms.length} terms`);
    return json(res, 200, { ok: true, analysis });

  } catch (error) {
    console.error('Search term analysis error:', error);
    await logAccess(req, 500, 'ai_search_terms error');
    return json(res, 500, { ok: false, error: 'Analysis failed' });
  }
});

/**
 * Generate AI-powered keyword suggestions
 */
router.post('/ai/keyword-suggestions', async (req, res) => {
  const tenant = String(req.query.tenant || '');
  const sig = String(req.query.sig || '');
  const { seed_keywords, campaign_context } = req.body;

  const payload = `POST:${tenant}:ai_keywords:${req.body.nonce || Date.now()}`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'ai_keywords auth_fail');
    return json(res, 403, { ok: false, error: 'Authentication failed' });
  }

  try {
    const aiService = getAIProviderService();
    await aiService.initialize();

    const prompt = `Generate 20 highly relevant keyword suggestions for a Google Ads campaign.

    Seed keywords: ${seed_keywords.join(', ')}
    Business context: ${campaign_context}

    Provide keywords that are:
    1. Relevant to the business
    2. Likely to have commercial intent
    3. Mix of broad, phrase, and exact match types
    4. Include both short-tail and long-tail keywords

    Format: Return as JSON array of strings`;

    const response = await aiService.generateText(prompt, {
      tenant,
      operation: 'keyword_suggestions',
      temperature: 0.7
    });

    let suggestions = [];
    try {
      suggestions = JSON.parse(response);
    } catch (e) {
      // Fallback: extract keywords from text response
      suggestions = response.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-*\d.)\s]+/, '').trim())
        .filter(keyword => keyword.length > 0);
    }

    await logAccess(req, 200, `ai_keywords generated ${suggestions.length} suggestions`);
    return json(res, 200, { ok: true, suggestions });

  } catch (error) {
    console.error('Keyword suggestion error:', error);
    await logAccess(req, 500, 'ai_keywords error');
    return json(res, 500, { ok: false, error: 'Generation failed' });
  }
});

// Helper functions
async function analyzeBudget(aiService, tenant, campaignName, data) {
  if (!data || data.cost === 0) return null;

  const conversionRate = data.clicks > 0 ? (data.conversions / data.clicks) : 0;
  const cpa = data.conversions > 0 ? (data.cost / data.conversions) : 999;

  // Simple rule-based optimization (can be enhanced with AI)
  let recommendedBudget = null;

  if (conversionRate > 0.05 && cpa < 50) {
    // High-performing campaign - increase budget
    recommendedBudget = Math.min(data.cost * 1.3, 100);
  } else if (conversionRate < 0.01 || cpa > 100) {
    // Poor performing - reduce budget
    recommendedBudget = Math.max(data.cost * 0.7, 3);
  }

  return recommendedBudget ? Math.round(recommendedBudget * 100) / 100 : null;
}

async function analyzeCPC(aiService, tenant, campaignName, data) {
  if (!data || data.clicks === 0) return null;

  const avgCpc = data.cost / data.clicks;
  const conversionRate = data.conversions / data.clicks;

  // Calculate optimal CPC based on conversion value
  let recommendedCPC = null;

  if (conversionRate > 0) {
    const targetCPA = 50; // This should come from configuration
    recommendedCPC = targetCPA * conversionRate;
    recommendedCPC = Math.min(recommendedCPC, avgCpc * 1.2); // Don't increase too much
    recommendedCPC = Math.max(recommendedCPC, 0.20); // Minimum CPC
  }

  return recommendedCPC ? Math.round(recommendedCPC * 100) / 100 : null;
}

async function suggestNegativeKeywords(aiService, tenant, performance) {
  // Extract poorly performing search terms from the data
  const negatives = [];

  // This would analyze the performance data and use AI to identify
  // patterns of non-converting or expensive keywords
  const prompt = `Based on campaign performance data, suggest negative keywords to exclude.
  Focus on terms that indicate:
  1. Non-commercial intent
  2. Informational searches
  3. Competitor brands
  4. Irrelevant products/services

  Limit to 10 most impactful negative keywords.`;

  try {
    const response = await aiService.generateText(prompt, {
      tenant,
      operation: 'negative_keywords',
      temperature: 0.3
    });

    // Parse AI response
    const suggestions = response.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(keyword => keyword.length > 0)
      .slice(0, 10);

    return suggestions;
  } catch (e) {
    console.error('Negative keyword suggestion error:', e);
    return [];
  }
}

async function generateRSASuggestions(aiService, tenant, adGroups) {
  const rsaSuggestions = {};

  // Generate RSAs for top 3 campaigns by spend
  const topCampaigns = Object.entries(adGroups)
    .sort((a, b) => {
      const totalA = Object.values(a[1]).reduce((sum, ag) => sum + ag.cost, 0);
      const totalB = Object.values(b[1]).reduce((sum, ag) => sum + ag.cost, 0);
      return totalB - totalA;
    })
    .slice(0, 3);

  for (const [campaignName, agData] of topCampaigns) {
    rsaSuggestions[campaignName] = {};

    // Get top ad group in this campaign
    const topAdGroup = Object.entries(agData)
      .sort((a, b) => b[1].cost - a[1].cost)[0];

    if (topAdGroup) {
      const [agName] = topAdGroup;

      try {
        const prompt = `Generate compelling RSA (Responsive Search Ad) content.
        Campaign: ${campaignName}
        Ad Group: ${agName}

        Create:
        - 10 headlines (max 30 characters each)
        - 4 descriptions (max 90 characters each)

        Focus on: benefits, urgency, trust signals, and clear CTAs.
        Format as JSON: { "headlines": [...], "descriptions": [...] }`;

        const response = await aiService.generateText(prompt, {
          tenant,
          operation: 'rsa_generation',
          temperature: 0.8
        });

        try {
          const content = JSON.parse(response);
          rsaSuggestions[campaignName][agName] = content;
        } catch (e) {
          // Fallback to default content
          rsaSuggestions[campaignName][agName] = {
            headlines: [
              "Get Started Today",
              "Limited Time Offer",
              "Free Shipping Available",
              "Trusted by Thousands",
              "Best Prices Guaranteed"
            ],
            descriptions: [
              "Shop our collection and save. Fast delivery available.",
              "Quality products at unbeatable prices. Order now!"
            ]
          };
        }
      } catch (e) {
        console.error('RSA generation error:', e);
      }
    }
  }

  return rsaSuggestions;
}

function generateProfitSignals(performance, context) {
  const signals = [];

  // Analyze each campaign for profitability
  if (performance.campaigns) {
    for (const [campaignName, data] of Object.entries(performance.campaigns)) {
      const roi = data.cost > 0 ? ((data.conversions * 50 - data.cost) / data.cost) : 0;

      if (roi < -0.2) {
        signals.push({
          campaign: campaignName,
          action: 'REDUCE_BUDGET',
          pace_signal: 0.7,
          reason: `Low ROI: ${(roi * 100).toFixed(1)}%`
        });
      } else if (roi > 0.5) {
        signals.push({
          campaign: campaignName,
          action: 'INCREASE_BUDGET',
          pace_signal: 1.3,
          reason: `High ROI: ${(roi * 100).toFixed(1)}%`
        });
      }
    }
  }

  return signals;
}

async function analyzeSearchTermPatterns(aiService, tenant, searchTerms) {
  // Group search terms by performance
  const highPerformers = [];
  const lowPerformers = [];
  const opportunities = [];

  searchTerms.forEach(term => {
    const [, campaign, adGroup, keyword, clicks, cost, conversions] = term;
    const conversionRate = clicks > 0 ? (conversions / clicks) : 0;
    const cpa = conversions > 0 ? (cost / conversions) : 999;

    if (conversionRate > 0.05 && cpa < 50) {
      highPerformers.push(keyword);
    } else if (conversions === 0 && cost > 10) {
      lowPerformers.push(keyword);
    } else if (clicks > 5 && conversionRate > 0.02) {
      opportunities.push(keyword);
    }
  });

  return {
    highPerformers: highPerformers.slice(0, 10),
    lowPerformers: lowPerformers.slice(0, 10),
    opportunities: opportunities.slice(0, 10),
    patterns: {
      avgConversionRate: searchTerms.reduce((sum, t) => sum + (t[6] / Math.max(t[4], 1)), 0) / searchTerms.length,
      totalSpend: searchTerms.reduce((sum, t) => sum + t[5], 0),
      totalConversions: searchTerms.reduce((sum, t) => sum + t[6], 0)
    }
  };
}

async function storeSearchTermInsights(tenant, analysis) {
  // Store insights in database for future reference
  // This could be stored in Supabase or Google Sheets
  console.log(`Storing search term insights for ${tenant}:`, {
    highPerformers: analysis.highPerformers.length,
    lowPerformers: analysis.lowPerformers.length,
    opportunities: analysis.opportunities.length
  });
}

export default router;