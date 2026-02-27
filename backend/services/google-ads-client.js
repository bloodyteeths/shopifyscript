/**
 * Google Ads API Client Service
 *
 * Core wrapper around the google-ads-api npm package that all other
 * Google Ads-related services consume.  Every outbound API call goes
 * through this module so that quota tracking, auth refresh, and error
 * handling are applied consistently.
 *
 * Dependencies:
 *   - google-ads-api  (npm)
 *   - ./google-ads-auth.js   — getConnection(), getValidAccessToken()
 *   - ./google-ads-quota.js  — canExecute(), recordUsage()
 */

import { GoogleAdsApi, enums } from 'google-ads-api';
import { getConnection, getValidAccessToken } from './google-ads-auth.js';
import { canExecute, recordUsage } from './google-ads-quota.js';

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

export class QuotaExhaustedError extends Error {
  constructor(message = 'Google Ads API quota exhausted') {
    super(message);
    this.name = 'QuotaExhaustedError';
    this.code = 'QUOTA_EXHAUSTED';
  }
}

export class GoogleAdsAuthError extends Error {
  constructor(message = 'Google Ads authentication failed') {
    super(message);
    this.name = 'GoogleAdsAuthError';
    this.code = 'AUTH_FAILURE';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert micros (e.g. 33_000_000) to dollar amount (33.00).
 * @param {number} micros
 * @returns {number}
 */
export function microsToAmount(micros) {
  if (micros == null) return 0;
  return Number((Number(micros) / 1_000_000).toFixed(2));
}

/**
 * Convert dollar amount (33.00) to micros (33_000_000).
 * @param {number} amount
 * @returns {number}
 */
export function amountToMicros(amount) {
  if (amount == null) return 0;
  return Math.round(Number(amount) * 1_000_000);
}

// ---------------------------------------------------------------------------
// Singleton GoogleAdsApi instance (keyed by developer token — there is only
// one per deployment, but we lazily create it so env vars can be loaded first)
// ---------------------------------------------------------------------------

let apiInstance = null;

function getApiInstance() {
  if (!apiInstance) {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) {
      throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set');
    }
    apiInstance = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: developerToken,
    });
    console.log('🔧 GoogleAdsApi instance created');
  }
  return apiInstance;
}

// ---------------------------------------------------------------------------
// Internal: quota gate + auth bootstrap
// ---------------------------------------------------------------------------

/**
 * Ensure we have quota, obtain fresh credentials, execute `fn(customer)`,
 * then record usage.  Retries once on auth errors after refreshing the token.
 *
 * @param {string} tenantId
 * @param {number} opsCost  — number of operations this call represents
 * @param {function} fn     — async (customer) => result
 * @returns {Promise<*>}
 */
async function withQuotaAndAuth(tenantId, opsCost, fn) {
  // 1. Quota gate
  const allowed = await canExecute(opsCost);
  if (!allowed) {
    throw new QuotaExhaustedError(
      `Quota check failed — requested ${opsCost} op(s) but limit reached`
    );
  }

  // 2. Build customer client (first attempt)
  let customer;
  try {
    customer = await buildCustomerClient(tenantId);
  } catch (err) {
    console.error('❌ Failed to build Google Ads customer client:', err.message);
    throw new GoogleAdsAuthError(err.message);
  }

  // 3. Execute — retry once on auth failure after refreshing token
  try {
    const result = await fn(customer);
    await recordUsage(opsCost);
    return result;
  } catch (err) {
    if (isAuthError(err)) {
      console.warn('🔄 Auth error detected — refreshing token and retrying…');
      try {
        customer = await buildCustomerClient(tenantId, true /* forceRefresh */);
        const result = await fn(customer);
        await recordUsage(opsCost);
        return result;
      } catch (retryErr) {
        console.error('❌ Retry after token refresh failed:', retryErr.message);
        throw new GoogleAdsAuthError(retryErr.message);
      }
    }
    throw err;
  }
}

/**
 * Build a google-ads-api Customer instance for the given tenant.
 *
 * @param {string} tenantId
 * @param {boolean} forceRefresh  — force an access-token refresh
 * @returns {Promise<import('google-ads-api').Customer>}
 */
async function buildCustomerClient(tenantId, forceRefresh = false) {
  const connection = await getConnection(tenantId);
  const accessToken = await getValidAccessToken(tenantId, forceRefresh);

  const api = getApiInstance();

  const customerOptions = {
    customer_id: connection.customerId,
    refresh_token: connection.refreshToken,
  };

  // MCC (manager) accounts require login_customer_id
  if (connection.loginCustomerId) {
    customerOptions.login_customer_id = connection.loginCustomerId;
  }

  return api.Customer(customerOptions);
}

/**
 * Determine whether an error is an authentication / authorisation error.
 */
function isAuthError(err) {
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toString();
  return (
    msg.includes('authentication') ||
    msg.includes('authorization') ||
    msg.includes('oauth') ||
    msg.includes('token') ||
    msg.includes('unauthenticated') ||
    code === '16' || // gRPC UNAUTHENTICATED
    code === '401'
  );
}

// ---------------------------------------------------------------------------
// 1. getCustomerClient
// ---------------------------------------------------------------------------

/**
 * Returns a configured google-ads-api Customer instance for the tenant.
 * Callers who need to run ad-hoc GAQL can use this directly.
 *
 * @param {string} tenantId
 * @returns {Promise<import('google-ads-api').Customer>}
 */
export async function getCustomerClient(tenantId) {
  try {
    return await buildCustomerClient(tenantId);
  } catch (err) {
    console.error('❌ getCustomerClient failed for tenant', tenantId, err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. listCampaigns
// ---------------------------------------------------------------------------

/**
 * Fetch all non-removed campaigns with basic metrics.
 *
 * @param {string} tenantId
 * @returns {Promise<Array<{
 *   id: string, name: string, status: string, type: string,
 *   budget: number, clicks: number, impressions: number,
 *   cost: number, conversions: number, ctr: number, cpc: number
 * }>>}
 */
export async function listCampaigns(tenantId) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    const query = `
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;

    try {
      const rows = await customer.query(query);

      return rows.map((row) => ({
        id: row.campaign?.id?.toString() ?? null,
        name: row.campaign?.name ?? '',
        status: row.campaign?.status ?? 'UNKNOWN',
        type: row.campaign?.advertising_channel_type ?? 'UNKNOWN',
        budget: microsToAmount(row.campaign_budget?.amount_micros),
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        cost: microsToAmount(row.metrics?.cost_micros),
        conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number((row.metrics?.ctr ?? 0).toFixed(4)),
        cpc: microsToAmount(row.metrics?.average_cpc),
      }));
    } catch (err) {
      console.error('❌ listCampaigns query failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 3. getCampaignDetails
// ---------------------------------------------------------------------------

/**
 * Detailed campaign info including ad groups and keywords.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @returns {Promise<Object>}
 */
export async function getCampaignDetails(tenantId, campaignId) {
  return withQuotaAndAuth(tenantId, 3, async (customer) => {
    // Campaign + budget query
    const campaignQuery = `
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.start_date, campaign.end_date,
        campaign_budget.amount_micros,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    // Ad group query
    const adGroupQuery = `
      SELECT
        ad_group.id, ad_group.name, ad_group.status,
        ad_group.type,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr
      FROM ad_group
      WHERE campaign.id = ${campaignId}
        AND ad_group.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `;

    // Keywords query
    const keywordQuery = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
        ad_group.id,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM keyword_view
      WHERE campaign.id = ${campaignId}
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `;

    try {
      const [campaignRows, adGroupRows, keywordRows] = await Promise.all([
        customer.query(campaignQuery),
        customer.query(adGroupQuery),
        customer.query(keywordQuery),
      ]);

      const camp = campaignRows[0] || {};

      return {
        campaign: {
          id: camp.campaign?.id?.toString() ?? campaignId,
          name: camp.campaign?.name ?? '',
          status: camp.campaign?.status ?? 'UNKNOWN',
          type: camp.campaign?.advertising_channel_type ?? 'UNKNOWN',
          biddingStrategy: camp.campaign?.bidding_strategy_type ?? 'UNKNOWN',
          startDate: camp.campaign?.start_date ?? null,
          endDate: camp.campaign?.end_date ?? null,
          budget: microsToAmount(camp.campaign_budget?.amount_micros),
          clicks: Number(camp.metrics?.clicks ?? 0),
          impressions: Number(camp.metrics?.impressions ?? 0),
          cost: microsToAmount(camp.metrics?.cost_micros),
          conversions: Number(camp.metrics?.conversions ?? 0),
          ctr: Number((camp.metrics?.ctr ?? 0).toFixed(4)),
          cpc: microsToAmount(camp.metrics?.average_cpc),
        },
        adGroups: adGroupRows.map((r) => ({
          id: r.ad_group?.id?.toString() ?? null,
          name: r.ad_group?.name ?? '',
          status: r.ad_group?.status ?? 'UNKNOWN',
          type: r.ad_group?.type ?? 'UNKNOWN',
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: microsToAmount(r.metrics?.cost_micros),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number((r.metrics?.ctr ?? 0).toFixed(4)),
        })),
        keywords: keywordRows.map((r) => ({
          id: r.ad_group_criterion?.criterion_id?.toString() ?? null,
          text: r.ad_group_criterion?.keyword?.text ?? '',
          matchType: r.ad_group_criterion?.keyword?.match_type ?? 'UNKNOWN',
          status: r.ad_group_criterion?.status ?? 'UNKNOWN',
          qualityScore: r.ad_group_criterion?.quality_info?.quality_score ?? null,
          adGroupId: r.ad_group?.id?.toString() ?? null,
          clicks: Number(r.metrics?.clicks ?? 0),
          impressions: Number(r.metrics?.impressions ?? 0),
          cost: microsToAmount(r.metrics?.cost_micros),
          conversions: Number(r.metrics?.conversions ?? 0),
          ctr: Number((r.metrics?.ctr ?? 0).toFixed(4)),
          cpc: microsToAmount(r.metrics?.average_cpc),
        })),
      };
    } catch (err) {
      console.error('❌ getCampaignDetails failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 4. getCampaignMetrics
// ---------------------------------------------------------------------------

/**
 * Performance metrics across all campaigns for the given date range.
 *
 * @param {string} tenantId
 * @param {string} dateRange  — GAQL date literal, e.g. LAST_30_DAYS
 * @returns {Promise<Object>}
 */
export async function getCampaignMetrics(tenantId, dateRange = 'LAST_30_DAYS') {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    const query = `
      SELECT
        campaign.id, campaign.name, campaign.status,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc,
        metrics.conversions_value, metrics.all_conversions,
        segments.date
      FROM campaign
      WHERE segments.date DURING ${dateRange}
        AND campaign.status != 'REMOVED'
      ORDER BY segments.date DESC
    `;

    try {
      const rows = await customer.query(query);

      // Aggregate totals
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalCostMicros = 0;
      let totalConversions = 0;
      let totalConversionsValue = 0;

      const byCampaign = {};
      const byDate = {};

      for (const row of rows) {
        const campaignId = row.campaign?.id?.toString();
        const date = row.segments?.date;
        const clicks = Number(row.metrics?.clicks ?? 0);
        const impressions = Number(row.metrics?.impressions ?? 0);
        const costMicros = Number(row.metrics?.cost_micros ?? 0);
        const conversions = Number(row.metrics?.conversions ?? 0);
        const convValue = Number(row.metrics?.conversions_value ?? 0);

        totalClicks += clicks;
        totalImpressions += impressions;
        totalCostMicros += costMicros;
        totalConversions += conversions;
        totalConversionsValue += convValue;

        // Aggregate by campaign
        if (campaignId) {
          if (!byCampaign[campaignId]) {
            byCampaign[campaignId] = {
              id: campaignId,
              name: row.campaign?.name ?? '',
              clicks: 0,
              impressions: 0,
              costMicros: 0,
              conversions: 0,
            };
          }
          byCampaign[campaignId].clicks += clicks;
          byCampaign[campaignId].impressions += impressions;
          byCampaign[campaignId].costMicros += costMicros;
          byCampaign[campaignId].conversions += conversions;
        }

        // Aggregate by date
        if (date) {
          if (!byDate[date]) {
            byDate[date] = { date, clicks: 0, impressions: 0, costMicros: 0, conversions: 0 };
          }
          byDate[date].clicks += clicks;
          byDate[date].impressions += impressions;
          byDate[date].costMicros += costMicros;
          byDate[date].conversions += conversions;
        }
      }

      return {
        dateRange,
        totals: {
          clicks: totalClicks,
          impressions: totalImpressions,
          cost: microsToAmount(totalCostMicros),
          conversions: totalConversions,
          conversionsValue: microsToAmount(totalConversionsValue),
          ctr: totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0,
          cpc: totalClicks > 0 ? microsToAmount(totalCostMicros / totalClicks) : 0,
          cpa: totalConversions > 0 ? microsToAmount(totalCostMicros / totalConversions) : 0,
          roas: totalCostMicros > 0
            ? Number((totalConversionsValue / microsToAmount(totalCostMicros)).toFixed(2))
            : 0,
        },
        byCampaign: Object.values(byCampaign).map((c) => ({
          ...c,
          cost: microsToAmount(c.costMicros),
          ctr: c.impressions > 0 ? Number((c.clicks / c.impressions).toFixed(4)) : 0,
          cpc: c.clicks > 0 ? microsToAmount(c.costMicros / c.clicks) : 0,
        })),
        byDate: Object.values(byDate)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d) => ({
            ...d,
            cost: microsToAmount(d.costMicros),
          })),
      };
    } catch (err) {
      console.error('❌ getCampaignMetrics failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 5. getSearchTermsReport
// ---------------------------------------------------------------------------

/**
 * Search terms report with metrics.
 *
 * @param {string} tenantId
 * @param {string|null} campaignId — optional filter
 * @returns {Promise<Array>}
 */
export async function getSearchTermsReport(tenantId, campaignId = null) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    const campaignFilter = campaignId
      ? `AND campaign.id = ${campaignId}`
      : '';

    const query = `
      SELECT
        search_term_view.search_term,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
        ${campaignFilter}
      ORDER BY metrics.impressions DESC
      LIMIT 200
    `;

    try {
      const rows = await customer.query(query);

      return rows.map((row) => ({
        searchTerm: row.search_term_view?.search_term ?? '',
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        cost: microsToAmount(row.metrics?.cost_micros),
        conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number((row.metrics?.ctr ?? 0).toFixed(4)),
      }));
    } catch (err) {
      console.error('❌ getSearchTermsReport failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 6. getKeywordMetrics
// ---------------------------------------------------------------------------

/**
 * Keyword performance data.
 *
 * @param {string} tenantId
 * @param {string|null} campaignId — optional filter
 * @returns {Promise<Array>}
 */
export async function getKeywordMetrics(tenantId, campaignId = null) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    const campaignFilter = campaignId
      ? `AND campaign.id = ${campaignId}`
      : '';

    const query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.quality_info.quality_score,
        ad_group.id, ad_group.name,
        campaign.id, campaign.name,
        metrics.clicks, metrics.impressions, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM keyword_view
      WHERE ad_group_criterion.status != 'REMOVED'
        ${campaignFilter}
      ORDER BY metrics.cost_micros DESC
      LIMIT 500
    `;

    try {
      const rows = await customer.query(query);

      return rows.map((row) => ({
        id: row.ad_group_criterion?.criterion_id?.toString() ?? null,
        text: row.ad_group_criterion?.keyword?.text ?? '',
        matchType: row.ad_group_criterion?.keyword?.match_type ?? 'UNKNOWN',
        status: row.ad_group_criterion?.status ?? 'UNKNOWN',
        qualityScore: row.ad_group_criterion?.quality_info?.quality_score ?? null,
        adGroupId: row.ad_group?.id?.toString() ?? null,
        adGroupName: row.ad_group?.name ?? '',
        campaignId: row.campaign?.id?.toString() ?? null,
        campaignName: row.campaign?.name ?? '',
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        cost: microsToAmount(row.metrics?.cost_micros),
        conversions: Number(row.metrics?.conversions ?? 0),
        ctr: Number((row.metrics?.ctr ?? 0).toFixed(4)),
        cpc: microsToAmount(row.metrics?.average_cpc),
      }));
    } catch (err) {
      console.error('❌ getKeywordMetrics failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 7. createCampaign
// ---------------------------------------------------------------------------

/**
 * Create a full Search campaign: budget -> campaign -> ad group -> keywords -> RSA ad.
 *
 * @param {string} tenantId
 * @param {Object} config
 * @param {string} config.name
 * @param {number} config.dailyBudget           — dollars (e.g. 50)
 * @param {string} [config.biddingStrategy]      — e.g. 'MAXIMIZE_CONVERSIONS'
 * @param {string[]} config.keywords
 * @param {string[]} [config.negativeKeywords]
 * @param {string[]} config.headlines            — up to 15
 * @param {string[]} config.descriptions         — up to 4
 * @returns {Promise<Object>}  — { campaignId, adGroupId, budgetId }
 */
export async function createCampaign(tenantId, config) {
  const {
    name,
    dailyBudget,
    biddingStrategy = 'MAXIMIZE_CONVERSIONS',
    keywords = [],
    negativeKeywords = [],
    headlines = [],
    descriptions = [],
  } = config;

  // Estimate ops: budget(1) + campaign(1) + adgroup(1) + keywords + negatives + ad ≈ 15
  const estimatedOps = 4 + keywords.length + negativeKeywords.length + 1;
  const opsCost = Math.min(estimatedOps, 15); // cap reporting at 15

  return withQuotaAndAuth(tenantId, opsCost, async (customer) => {
    try {
      // --- 1. Create Campaign Budget -------------------------------------------
      console.log('📦 Creating campaign budget…');
      const budgetResult = await customer.campaignBudgets.create([
        {
          name: `${name} Budget`,
          amount_micros: amountToMicros(dailyBudget),
          delivery_method: enums.BudgetDeliveryMethod.STANDARD,
          explicitly_shared: false,
        },
      ]);
      const budgetResourceName = budgetResult.results[0]?.resource_name;
      if (!budgetResourceName) throw new Error('Failed to create campaign budget');

      // --- 2. Create Campaign --------------------------------------------------
      console.log('📦 Creating campaign…');
      const biddingStrategyEnum = resolveBiddingStrategy(biddingStrategy);

      const campaignPayload = {
        name,
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        status: enums.CampaignStatus.PAUSED, // start paused for review
        campaign_budget: budgetResourceName,
        ...biddingStrategyEnum,
      };

      const campaignResult = await customer.campaigns.create([campaignPayload]);
      const campaignResourceName = campaignResult.results[0]?.resource_name;
      if (!campaignResourceName) throw new Error('Failed to create campaign');
      const newCampaignId = campaignResourceName.split('/').pop();

      // --- 3. Create Ad Group --------------------------------------------------
      console.log('📦 Creating ad group…');
      const adGroupResult = await customer.adGroups.create([
        {
          name: `${name} — Ad Group 1`,
          campaign: campaignResourceName,
          status: enums.AdGroupStatus.ENABLED,
          type: enums.AdGroupType.SEARCH_STANDARD,
        },
      ]);
      const adGroupResourceName = adGroupResult.results[0]?.resource_name;
      if (!adGroupResourceName) throw new Error('Failed to create ad group');
      const newAdGroupId = adGroupResourceName.split('/').pop();

      // --- 4. Add Keywords -----------------------------------------------------
      if (keywords.length > 0) {
        console.log(`📦 Adding ${keywords.length} keywords…`);
        const keywordOps = keywords.map((kw) => ({
          ad_group: adGroupResourceName,
          status: enums.AdGroupCriterionStatus.ENABLED,
          keyword: {
            text: kw,
            match_type: enums.KeywordMatchType.BROAD,
          },
        }));
        await customer.adGroupCriteria.create(keywordOps);
      }

      // --- 5. Add Negative Keywords (campaign level) ---------------------------
      if (negativeKeywords.length > 0) {
        console.log(`📦 Adding ${negativeKeywords.length} negative keywords…`);
        const negativeOps = negativeKeywords.map((kw) => ({
          campaign: campaignResourceName,
          negative: true,
          keyword: {
            text: kw,
            match_type: enums.KeywordMatchType.EXACT,
          },
        }));
        await customer.campaignCriteria.create(negativeOps);
      }

      // --- 6. Create Responsive Search Ad --------------------------------------
      if (headlines.length > 0 && descriptions.length > 0) {
        console.log('📦 Creating responsive search ad…');
        const adHeadlines = headlines.slice(0, 15).map((text, idx) => ({
          text,
          pinned_field: idx < 3 ? undefined : undefined, // no pinning by default
        }));
        const adDescriptions = descriptions.slice(0, 4).map((text) => ({
          text,
        }));

        await customer.ads.create([
          {
            ad_group: adGroupResourceName,
            status: enums.AdGroupAdStatus.ENABLED,
            ad: {
              responsive_search_ad: {
                headlines: adHeadlines,
                descriptions: adDescriptions,
              },
              final_urls: [config.finalUrl || 'https://example.com'],
            },
          },
        ]);
      }

      console.log('✅ Campaign created successfully:', { newCampaignId, newAdGroupId });

      return {
        campaignId: newCampaignId,
        campaignResourceName,
        adGroupId: newAdGroupId,
        adGroupResourceName,
        budgetResourceName,
      };
    } catch (err) {
      console.error('❌ createCampaign failed:', err.message);
      throw err;
    }
  });
}

/**
 * Map a human-readable bidding strategy string to the campaign fields
 * the google-ads-api expects.
 */
function resolveBiddingStrategy(strategy) {
  switch (strategy.toUpperCase()) {
    case 'MAXIMIZE_CONVERSIONS':
      return { maximize_conversions: { target_cpa_micros: 0 } };
    case 'MAXIMIZE_CONVERSION_VALUE':
      return { maximize_conversion_value: { target_roas: 0 } };
    case 'TARGET_CPA': {
      // Caller can override target_cpa later via mutate
      return { maximize_conversions: { target_cpa_micros: 0 } };
    }
    case 'TARGET_ROAS': {
      return { maximize_conversion_value: { target_roas: 0 } };
    }
    case 'MANUAL_CPC':
      return { manual_cpc: { enhanced_cpc_enabled: true } };
    case 'MAXIMIZE_CLICKS':
      return { maximize_clicks: { cpc_bid_ceiling_micros: 0 } };
    default:
      return { maximize_conversions: { target_cpa_micros: 0 } };
  }
}

// ---------------------------------------------------------------------------
// 8. updateCampaignBudget
// ---------------------------------------------------------------------------

/**
 * Update the daily budget for a campaign.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @param {number} newBudgetMicros — already in micros
 * @returns {Promise<Object>}
 */
export async function updateCampaignBudget(tenantId, campaignId, newBudgetMicros) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    try {
      // First fetch the campaign's budget resource name
      const rows = await customer.query(`
        SELECT campaign.id, campaign_budget.resource_name, campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.id = ${campaignId}
      `);

      if (!rows.length) throw new Error(`Campaign ${campaignId} not found`);

      const budgetResource = rows[0].campaign_budget?.resource_name;
      if (!budgetResource) throw new Error(`Budget resource not found for campaign ${campaignId}`);

      const result = await customer.campaignBudgets.update([
        {
          resource_name: budgetResource,
          amount_micros: newBudgetMicros,
        },
      ]);

      console.log('✅ Budget updated for campaign', campaignId, '→', microsToAmount(newBudgetMicros));
      return result;
    } catch (err) {
      console.error('❌ updateCampaignBudget failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 9. pauseCampaign
// ---------------------------------------------------------------------------

/**
 * Pause a campaign.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @returns {Promise<Object>}
 */
export async function pauseCampaign(tenantId, campaignId) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    try {
      const resourceName = `customers/${(await getConnection(tenantId)).customer_id}/campaigns/${campaignId}`;

      const result = await customer.campaigns.update([
        {
          resource_name: resourceName,
          status: enums.CampaignStatus.PAUSED,
        },
      ]);

      console.log('⏸️ Campaign paused:', campaignId);
      return result;
    } catch (err) {
      console.error('❌ pauseCampaign failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 10. enableCampaign
// ---------------------------------------------------------------------------

/**
 * Enable (unpause) a campaign.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @returns {Promise<Object>}
 */
export async function enableCampaign(tenantId, campaignId) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    try {
      const resourceName = `customers/${(await getConnection(tenantId)).customer_id}/campaigns/${campaignId}`;

      const result = await customer.campaigns.update([
        {
          resource_name: resourceName,
          status: enums.CampaignStatus.ENABLED,
        },
      ]);

      console.log('▶️ Campaign enabled:', campaignId);
      return result;
    } catch (err) {
      console.error('❌ enableCampaign failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 11. addNegativeKeywords
// ---------------------------------------------------------------------------

/**
 * Batch-add campaign-level negative keywords.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @param {string[]} keywords
 * @returns {Promise<Object>}
 */
export async function addNegativeKeywords(tenantId, campaignId, keywords) {
  if (!keywords || keywords.length === 0) {
    return { added: 0 };
  }

  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    try {
      const campaignResource = `customers/${(await getConnection(tenantId)).customer_id}/campaigns/${campaignId}`;

      const operations = keywords.map((kw) => ({
        campaign: campaignResource,
        negative: true,
        keyword: {
          text: kw,
          match_type: enums.KeywordMatchType.EXACT,
        },
      }));

      const result = await customer.campaignCriteria.create(operations);

      console.log('✅ Added', keywords.length, 'negative keywords to campaign', campaignId);
      return { added: keywords.length, result };
    } catch (err) {
      console.error('❌ addNegativeKeywords failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 12. updateKeywordBids
// ---------------------------------------------------------------------------

/**
 * Update CPC bids for keywords in an ad group.
 *
 * @param {string} tenantId
 * @param {string} adGroupId
 * @param {Array<{criterionId: string, cpcBidMicros: number}>} keywordBids
 * @returns {Promise<Object>}
 */
export async function updateKeywordBids(tenantId, adGroupId, keywordBids) {
  if (!keywordBids || keywordBids.length === 0) {
    return { updated: 0 };
  }

  const opsCost = keywordBids.length; // 1 op per keyword

  return withQuotaAndAuth(tenantId, opsCost, async (customer) => {
    try {
      const customerId = (await getConnection(tenantId)).customer_id;

      const operations = keywordBids.map(({ criterionId, cpcBidMicros }) => ({
        resource_name: `customers/${customerId}/adGroupCriteria/${adGroupId}~${criterionId}`,
        cpc_bid_micros: cpcBidMicros,
      }));

      const result = await customer.adGroupCriteria.update(operations);

      console.log('✅ Updated bids for', keywordBids.length, 'keywords in ad group', adGroupId);
      return { updated: keywordBids.length, result };
    } catch (err) {
      console.error('❌ updateKeywordBids failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// 13. getAuctionInsights
// ---------------------------------------------------------------------------

/**
 * Auction insights report for a campaign — competitor impression share etc.
 *
 * @param {string} tenantId
 * @param {string} campaignId
 * @returns {Promise<Array>}
 */
export async function getAuctionInsights(tenantId, campaignId) {
  return withQuotaAndAuth(tenantId, 1, async (customer) => {
    const query = `
      SELECT
        auction_insight.display_domain,
        metrics.auction_insight_search_impression_share,
        metrics.auction_insight_search_overlap_rate,
        metrics.auction_insight_search_position_above_rate,
        metrics.auction_insight_search_top_impression_percentage,
        metrics.auction_insight_search_absolute_top_impression_percentage,
        metrics.auction_insight_search_outranking_share
      FROM auction_insight
      WHERE campaign.id = ${campaignId}
        AND segments.date DURING LAST_30_DAYS
    `;

    try {
      const rows = await customer.query(query);

      return rows.map((row) => ({
        displayDomain: row.auction_insight?.display_domain ?? '',
        impressionShare: Number(row.metrics?.auction_insight_search_impression_share ?? 0),
        overlapRate: Number(row.metrics?.auction_insight_search_overlap_rate ?? 0),
        positionAboveRate: Number(row.metrics?.auction_insight_search_position_above_rate ?? 0),
        topImpressionPct: Number(row.metrics?.auction_insight_search_top_impression_percentage ?? 0),
        absTopImpressionPct: Number(
          row.metrics?.auction_insight_search_absolute_top_impression_percentage ?? 0
        ),
        outrankingShare: Number(row.metrics?.auction_insight_search_outranking_share ?? 0),
      }));
    } catch (err) {
      console.error('❌ getAuctionInsights failed:', err.message);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// Default export — convenient object with every public function
// ---------------------------------------------------------------------------

export default {
  // Helpers
  microsToAmount,
  amountToMicros,
  // Custom errors
  QuotaExhaustedError,
  GoogleAdsAuthError,
  // Core
  getCustomerClient,
  // Read operations
  listCampaigns,
  getCampaignDetails,
  getCampaignMetrics,
  getSearchTermsReport,
  getKeywordMetrics,
  getAuctionInsights,
  // Write operations
  createCampaign,
  updateCampaignBudget,
  pauseCampaign,
  enableCampaign,
  addNegativeKeywords,
  updateKeywordBids,
};
