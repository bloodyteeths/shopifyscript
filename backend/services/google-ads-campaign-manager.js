/**
 * Google Ads Campaign Manager — High-Level Orchestration Service
 *
 * Wraps google-ads-client.js with business-level workflows: campaign creation
 * from user-friendly configs, full optimization cycles, budget guardrails,
 * negative-keyword application, and operation-history retrieval.
 *
 * Every public function follows the (tenantId, …) convention so the caller
 * never needs to deal with customer IDs or resource names directly.
 *
 * Dependencies:
 *   - ./google-ads-client.js   — low-level Google Ads API wrapper
 *   - ./google-ads-quota.js    — getUsageLog() for optimization history
 *   - ./supabase-client.js     — direct DB access for operation log queries
 */

import {
  listCampaigns,
  getCampaignDetails,
  getCampaignMetrics,
  getSearchTermsReport,
  getKeywordMetrics,
  createCampaign,
  updateCampaignBudget,
  addNegativeKeywords,
  microsToAmount,
  amountToMicros,
} from './google-ads-client.js';

import { getUsageLog } from './google-ads-quota.js';
import { getSupabaseClient } from './supabase-client.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum daily budget in dollars. */
const MIN_BUDGET_DOLLARS = 1;

/** Maximum multiplier for budget increases (2x the current budget). */
const MAX_BUDGET_INCREASE_FACTOR = 2;

/** Spend threshold (dollars) above which a zero-conversion search term is waste. */
const WASTE_SPEND_THRESHOLD = 5;

/** CTR threshold above which a keyword is considered high-performing. */
const OPPORTUNITY_CTR_THRESHOLD = 0.03; // 3 %

/** CPC threshold (dollars) below which a high-CTR keyword is "under-bid". */
const OPPORTUNITY_CPC_CEILING = 2;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a user-facing campaign config object.
 * Throws a descriptive error when any requirement is not met.
 *
 * @param {Object} config
 */
function validateCampaignConfig(config) {
  const errors = [];

  if (!config.name || typeof config.name !== 'string' || config.name.trim().length === 0) {
    errors.push('Campaign name is required');
  }

  if (config.dailyBudget == null || Number(config.dailyBudget) <= 0) {
    errors.push('Daily budget must be greater than $0');
  }

  if (!Array.isArray(config.keywords) || config.keywords.length < 1) {
    errors.push('At least 1 keyword is required');
  }

  if (!Array.isArray(config.headlines) || config.headlines.length < 3) {
    errors.push('At least 3 headlines are required');
  }

  if (!Array.isArray(config.descriptions) || config.descriptions.length < 2) {
    errors.push('At least 2 descriptions are required');
  }

  if (errors.length > 0) {
    const message = `Campaign config validation failed: ${errors.join('; ')}`;
    const err = new Error(message);
    err.code = 'VALIDATION_ERROR';
    err.validationErrors = errors;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 1. createCampaignFromConfig
// ---------------------------------------------------------------------------

/**
 * Create a full Google Ads Search campaign from a user-friendly config object.
 *
 * Validates the config, maps it to the shape expected by google-ads-client's
 * `createCampaign`, and returns the newly created campaign details.
 *
 * @param {string} tenantId
 * @param {Object} config
 * @param {string} config.name              — Campaign name
 * @param {number} config.dailyBudget       — Daily budget in dollars
 * @param {string} [config.biddingStrategy] — e.g. 'MAXIMIZE_CONVERSIONS'
 * @param {string} [config.websiteUrl]      — Final URL for the ads
 * @param {string[]} config.keywords        — At least 1
 * @param {string[]} [config.negativeKeywords]
 * @param {string[]} config.headlines       — At least 3 (max 15)
 * @param {string[]} config.descriptions    — At least 2 (max 4)
 * @param {string[]} [config.targetLocations] — Location targeting (future use)
 * @returns {Promise<Object>}  Created campaign details
 */
export async function createCampaignFromConfig(tenantId, config) {
  try {
    console.log('🚀 createCampaignFromConfig — validating config for tenant', tenantId);

    validateCampaignConfig(config);

    // Map user-friendly config → google-ads-client.createCampaign shape
    const clientConfig = {
      name: config.name.trim(),
      dailyBudget: Number(config.dailyBudget),
      biddingStrategy: config.biddingStrategy || 'MAXIMIZE_CONVERSIONS',
      keywords: config.keywords,
      negativeKeywords: config.negativeKeywords || [],
      headlines: config.headlines.slice(0, 15),
      descriptions: config.descriptions.slice(0, 4),
      finalUrl: config.websiteUrl || undefined,
    };

    console.log('📦 Creating campaign via google-ads-client:', {
      name: clientConfig.name,
      budget: clientConfig.dailyBudget,
      keywords: clientConfig.keywords.length,
      negatives: clientConfig.negativeKeywords.length,
      headlines: clientConfig.headlines.length,
      descriptions: clientConfig.descriptions.length,
    });

    const result = await createCampaign(tenantId, clientConfig);

    console.log('✅ Campaign created successfully:', result.campaignId);

    return {
      success: true,
      campaignId: result.campaignId,
      adGroupId: result.adGroupId,
      campaignResourceName: result.campaignResourceName,
      adGroupResourceName: result.adGroupResourceName,
      budgetResourceName: result.budgetResourceName,
      config: {
        name: clientConfig.name,
        dailyBudget: clientConfig.dailyBudget,
        biddingStrategy: clientConfig.biddingStrategy,
        keywordsCount: clientConfig.keywords.length,
        negativeKeywordsCount: clientConfig.negativeKeywords.length,
        headlinesCount: clientConfig.headlines.length,
        descriptionsCount: clientConfig.descriptions.length,
      },
    };
  } catch (err) {
    console.error('❌ createCampaignFromConfig failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. getCampaignOverview
// ---------------------------------------------------------------------------

/**
 * Return a high-level overview of every campaign in the account: individual
 * campaign rows with metrics, plus account-wide aggregates.
 *
 * @param {string} tenantId
 * @returns {Promise<Object>} — { campaigns, totals, campaignCount }
 */
export async function getCampaignOverview(tenantId) {
  try {
    console.log('📊 getCampaignOverview — fetching data for tenant', tenantId);

    // Fire both reads in parallel
    const [campaigns, metrics] = await Promise.all([
      listCampaigns(tenantId),
      getCampaignMetrics(tenantId, 'LAST_30_DAYS'),
    ]);

    console.log(`📊 Retrieved ${campaigns.length} campaigns, aggregating overview`);

    return {
      campaigns,
      totals: metrics.totals,
      byDate: metrics.byDate,
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((c) => c.status === 'ENABLED').length,
      pausedCampaignCount: campaigns.filter((c) => c.status === 'PAUSED').length,
      dateRange: metrics.dateRange,
    };
  } catch (err) {
    console.error('❌ getCampaignOverview failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 3. optimizeCampaign
// ---------------------------------------------------------------------------

/**
 * Run a full optimization cycle on a single campaign.
 *
 * Steps:
 *   1. Fetch campaign details + metrics
 *   2. Fetch search terms report
 *   3. Fetch keyword metrics
 *   4. Identify waste  (high-spend, zero-conversion search terms → negative candidates)
 *   5. Identify opportunities (high-CTR keywords with low bids → bid increase candidates)
 *   6. Optionally auto-apply the suggestions
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @param {Object}  [options]
 * @param {boolean} [options.autoApply=false]  — immediately apply suggestions
 * @param {number}  [options.wasteThreshold]   — dollars spent w/ 0 conversions
 * @param {number}  [options.ctrThreshold]     — CTR above which a keyword is "hot"
 * @returns {Promise<{ suggestions: Array, appliedActions: Array }>}
 */
export async function optimizeCampaign(tenantId, campaignId, options = {}) {
  const {
    autoApply = false,
    wasteThreshold = WASTE_SPEND_THRESHOLD,
    ctrThreshold = OPPORTUNITY_CTR_THRESHOLD,
  } = options;

  try {
    console.log('🔍 optimizeCampaign — starting cycle for campaign', campaignId);

    // --- Step 1–3: Gather data in parallel ----------------------------------
    const [details, searchTerms, keywords] = await Promise.all([
      getCampaignDetails(tenantId, campaignId),
      getSearchTermsReport(tenantId, campaignId),
      getKeywordMetrics(tenantId, campaignId),
    ]);

    console.log('📈 Data gathered:', {
      adGroups: details.adGroups.length,
      keywords: keywords.length,
      searchTerms: searchTerms.length,
    });

    const suggestions = [];
    const appliedActions = [];

    // --- Step 4: Identify waste (negative-keyword candidates) ---------------
    const wasteTerms = searchTerms.filter(
      (st) => st.cost >= wasteThreshold && st.conversions === 0
    );

    for (const term of wasteTerms) {
      suggestions.push({
        type: 'add_negative',
        reason: `Search term "${term.searchTerm}" spent $${term.cost.toFixed(2)} with 0 conversions`,
        term: term.searchTerm,
        spend: term.cost,
        clicks: term.clicks,
        impressions: term.impressions,
      });
    }

    // --- Step 5: Identify opportunities (bid-increase candidates) -----------
    const opportunityKeywords = keywords.filter(
      (kw) =>
        kw.ctr >= ctrThreshold &&
        kw.cpc < OPPORTUNITY_CPC_CEILING &&
        kw.clicks >= 5 // need some signal
    );

    for (const kw of opportunityKeywords) {
      suggestions.push({
        type: 'increase_bid',
        reason: `Keyword "${kw.text}" has ${(kw.ctr * 100).toFixed(1)}% CTR but only $${kw.cpc.toFixed(2)} CPC — bid increase may capture more volume`,
        keywordId: kw.id,
        keywordText: kw.text,
        adGroupId: kw.adGroupId,
        currentCpc: kw.cpc,
        ctr: kw.ctr,
        conversions: kw.conversions,
      });
    }

    console.log(`💡 Generated ${suggestions.length} suggestions (${wasteTerms.length} negatives, ${opportunityKeywords.length} bid increases)`);

    // --- Step 6: Auto-apply if requested ------------------------------------
    if (autoApply && suggestions.length > 0) {
      // Apply negative keywords
      const negativesToApply = suggestions
        .filter((s) => s.type === 'add_negative')
        .map((s) => s.term);

      if (negativesToApply.length > 0) {
        try {
          const negResult = await addNegativeKeywords(tenantId, campaignId, negativesToApply);
          appliedActions.push({
            action: 'added_negatives',
            count: negResult.added,
            terms: negativesToApply,
          });
          console.log(`✅ Auto-applied ${negResult.added} negative keywords`);
        } catch (negErr) {
          console.error('⚠️ Auto-apply negatives failed:', negErr.message);
          appliedActions.push({
            action: 'added_negatives',
            error: negErr.message,
          });
        }
      }

      // Note: bid increases require more nuanced logic (updateKeywordBids)
      // and are intentionally left as suggestions-only for safety.
      const bidSuggestions = suggestions.filter((s) => s.type === 'increase_bid');
      if (bidSuggestions.length > 0) {
        appliedActions.push({
          action: 'bid_increases_suggested',
          count: bidSuggestions.length,
          note: 'Bid adjustments require manual review — not auto-applied for safety',
        });
      }
    }

    // --- Log the optimization to Supabase -----------------------------------
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('google_ads_operation_log').insert({
          tenant_id: tenantId,
          operation_type: 'campaign_optimization',
          operations_count: 0, // meta-operation, actual API calls tracked separately
          request_summary: JSON.stringify({
            campaignId,
            suggestionsCount: suggestions.length,
            appliedCount: appliedActions.length,
            autoApply,
          }),
          response_status: 'success',
          created_at: new Date().toISOString(),
        });
      }
    } catch (logErr) {
      console.warn('⚠️ Failed to log optimization to operation_log:', logErr.message);
    }

    return {
      campaignId,
      campaignName: details.campaign.name,
      currentBudget: details.campaign.budget,
      currentCost: details.campaign.cost,
      currentConversions: details.campaign.conversions,
      suggestions,
      appliedActions,
      meta: {
        searchTermsAnalyzed: searchTerms.length,
        keywordsAnalyzed: keywords.length,
        wasteTermsFound: wasteTerms.length,
        opportunitiesFound: opportunityKeywords.length,
        autoApply,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('❌ optimizeCampaign failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 4. applySuggestedNegatives
// ---------------------------------------------------------------------------

/**
 * Batch-add negative keywords from optimizer suggestions.
 *
 * @param {string}   tenantId
 * @param {string}   campaignId
 * @param {string[]} terms — negative keyword texts
 * @returns {Promise<Object>}
 */
export async function applySuggestedNegatives(tenantId, campaignId, terms) {
  try {
    if (!Array.isArray(terms) || terms.length === 0) {
      console.log('⚠️ applySuggestedNegatives — no terms provided, nothing to do');
      return { added: 0, terms: [] };
    }

    console.log(`🚫 applySuggestedNegatives — adding ${terms.length} negatives to campaign ${campaignId}`);

    const result = await addNegativeKeywords(tenantId, campaignId, terms);

    console.log(`✅ Successfully added ${result.added} negative keywords`);

    return {
      added: result.added,
      terms,
      campaignId,
    };
  } catch (err) {
    console.error('❌ applySuggestedNegatives failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 5. adjustBudgets
// ---------------------------------------------------------------------------

/**
 * Safely adjust a campaign's daily budget with guardrails:
 *   - New budget must be >= $1
 *   - New budget must not exceed 2x the current budget
 *   - Converts dollars → micros before calling the API
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @param {number} newBudgetDollars — desired daily budget in dollars
 * @returns {Promise<Object>}
 */
export async function adjustBudgets(tenantId, campaignId, newBudgetDollars) {
  try {
    const amount = Number(newBudgetDollars);

    if (isNaN(amount) || amount < MIN_BUDGET_DOLLARS) {
      throw Object.assign(
        new Error(`Budget must be at least $${MIN_BUDGET_DOLLARS}. Received: $${newBudgetDollars}`),
        { code: 'VALIDATION_ERROR' }
      );
    }

    // Fetch current budget for the guardrail check
    console.log('💰 adjustBudgets — fetching current budget for campaign', campaignId);
    const details = await getCampaignDetails(tenantId, campaignId);
    const currentBudget = details.campaign.budget;

    if (currentBudget > 0 && amount > currentBudget * MAX_BUDGET_INCREASE_FACTOR) {
      throw Object.assign(
        new Error(
          `Budget increase from $${currentBudget} to $${amount} exceeds the ${MAX_BUDGET_INCREASE_FACTOR}x safety limit. ` +
          `Maximum allowed: $${(currentBudget * MAX_BUDGET_INCREASE_FACTOR).toFixed(2)}`
        ),
        { code: 'BUDGET_INCREASE_LIMIT' }
      );
    }

    const newBudgetMicros = amountToMicros(amount);
    console.log(`💰 Updating budget: $${currentBudget} → $${amount} (${newBudgetMicros} micros)`);

    const result = await updateCampaignBudget(tenantId, campaignId, newBudgetMicros);

    console.log('✅ Budget adjusted successfully');

    return {
      campaignId,
      previousBudget: currentBudget,
      newBudget: amount,
      newBudgetMicros,
      result,
    };
  } catch (err) {
    console.error('❌ adjustBudgets failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 6. generateAndDeployAds
// ---------------------------------------------------------------------------

/**
 * Generate ad copy via the RSA generator and deploy it to Google Ads.
 *
 * TODO: Wire up rsa-generator.js → google-ads-client ad creation once
 *       the full RSA pipeline is production-ready.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @param {Object} config — ad generation parameters (theme, keywords, tone, etc.)
 * @returns {Promise<Object>}
 */
export async function generateAndDeployAds(tenantId, campaignId, config = {}) {
  try {
    console.log('📝 generateAndDeployAds — stub invoked for campaign', campaignId);

    // TODO: Integration steps:
    //   1. Call RSAContentGenerator.generateRSAContent({ theme, keywords, ... })
    //   2. Validate generated headlines (≤30 chars) and descriptions (≤90 chars)
    //   3. Select the target ad group within the campaign
    //   4. Call google-ads-client to create the responsive search ad
    //   5. Return the created ad resource name and copy details

    return {
      success: false,
      campaignId,
      status: 'not_implemented',
      message:
        'Ad generation and deployment is not yet wired up. ' +
        'This function will integrate rsa-generator.js with the Google Ads API ' +
        'to create responsive search ads from AI-generated copy.',
      config,
    };
  } catch (err) {
    console.error('❌ generateAndDeployAds failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 7. getOptimizationHistory
// ---------------------------------------------------------------------------

/**
 * Retrieve recent optimization-related entries from the google_ads_operation_log.
 *
 * Filters for operation types that represent optimization actions (budget changes,
 * negative keyword additions, bid updates, full optimization cycles).
 *
 * @param {string} tenantId
 * @param {number} [limit=50] — maximum entries to return
 * @returns {Promise<Array>}
 */
export async function getOptimizationHistory(tenantId, limit = 50) {
  try {
    console.log('📜 getOptimizationHistory — fetching for tenant', tenantId);

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('⚠️ Supabase client not available — falling back to getUsageLog');
      // Fallback: return the raw usage log (unfiltered)
      return await getUsageLog(tenantId, limit);
    }

    // Query optimization-related operation types
    const optimizationTypes = [
      'campaign_optimization',
      'budget_update',
      'add_negative_keywords',
      'bid_update',
      'create_campaign',
      'pause_campaign',
      'enable_campaign',
    ];

    const { data, error } = await supabase
      .from('google_ads_operation_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('operation_type', optimizationTypes)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ getOptimizationHistory query failed:', error.message);
      // Fallback to the unfiltered log
      return await getUsageLog(tenantId, limit);
    }

    console.log(`📜 Retrieved ${(data || []).length} optimization history entries`);

    return data || [];
  } catch (err) {
    console.error('❌ getOptimizationHistory failed:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Default export — convenient object with every public function
// ---------------------------------------------------------------------------

export default {
  createCampaignFromConfig,
  getCampaignOverview,
  optimizeCampaign,
  applySuggestedNegatives,
  adjustBudgets,
  generateAndDeployAds,
  getOptimizationHistory,
};
