/**
 * Google Ads Data Sync Service
 *
 * Pulls data from Google Ads API and stores it in Supabase.
 * All API calls are quota-aware and idempotent (upserts).
 *
 * Dependencies:
 *   - ./google-ads-client.js   — listCampaigns, getCampaignMetrics, etc.
 *   - ./supabase-client.js     — getSupabaseClient()
 *   - ./google-ads-quota.js    — canExecute(), getRemainingQuota()
 */

import {
  listCampaigns,
  getCampaignMetrics,
  getSearchTermsReport,
  getKeywordMetrics,
} from './google-ads-client.js';
import { getSupabaseClient } from './supabase-client.js';
import { canExecute, getRemainingQuota } from './google-ads-quota.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return today's date string in YYYY-MM-DD (UTC).
 */
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get the Supabase client or throw if unavailable.
 */
function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available — cannot sync');
  }
  return client;
}

/**
 * Check quota and return true if `opsNeeded` operations are available.
 * Logs a warning and returns false when quota is insufficient.
 *
 * @param {number} opsNeeded
 * @param {string} label — human-readable description for logs
 * @returns {Promise<boolean>}
 */
async function ensureQuota(opsNeeded, label) {
  try {
    const { allowed, remaining } = await canExecute(opsNeeded);
    if (!allowed) {
      console.log(
        `⚠️  Quota insufficient for ${label}: need ${opsNeeded} ops but only ${remaining} remaining — skipping`
      );
      return false;
    }
    return true;
  } catch (err) {
    console.log(`❌ Quota check failed for ${label}: ${err.message} — skipping`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. syncCampaignMetrics
// ---------------------------------------------------------------------------

/**
 * Fetch campaign list + metrics (LAST_30_DAYS) from Google Ads and upsert
 * aggregated metrics into the Supabase `tenant_metrics` table.
 *
 * Stored metric types:
 *   total_spend, total_clicks, total_conversions, total_impressions,
 *   ctr, cpc, cpa, roas
 *
 * Per-campaign breakdown is stored in the `metadata` JSON column.
 *
 * ~2 API operations (listCampaigns + getCampaignMetrics).
 *
 * @param {string} tenantId
 * @returns {Promise<{ synced: boolean, campaignCount: number, metrics: object|null, error?: string }>}
 */
export async function syncCampaignMetrics(tenantId) {
  const label = `syncCampaignMetrics(${tenantId})`;
  console.log(`📊 ${label} — starting`);

  try {
    // Quota gate — we need ~2 ops (listCampaigns + getCampaignMetrics)
    if (!(await ensureQuota(2, label))) {
      return { synced: false, campaignCount: 0, metrics: null, error: 'quota_insufficient' };
    }

    const supabase = requireSupabase();

    // Fetch data from Google Ads
    const [campaigns, metricsResult] = await Promise.all([
      listCampaigns(tenantId),
      getCampaignMetrics(tenantId, 'LAST_30_DAYS'),
    ]);

    const { totals, byCampaign, byDate } = metricsResult;
    const today = getTodayDateString();
    const now = new Date().toISOString();

    // Build upsert rows — one per campaign, matching tenant_metrics schema
    const metricRows = (byCampaign || []).map((c) => ({
      tenant_id: tenantId,
      date: today,
      entity_type: 'campaign',
      entity_id: String(c.id || c.campaignId || ''),
      entity_name: c.name || c.campaignName || '',
      campaign_name: c.name || c.campaignName || '',
      ad_group_name: null,
      clicks: c.clicks || 0,
      cost_micros: c.costMicros || Math.round((c.cost || 0) * 1_000_000),
      conversions: c.conversions || 0,
      impressions: c.impressions || 0,
      ctr: c.ctr || 0,
    }));

    // Also store an account-level summary row
    metricRows.push({
      tenant_id: tenantId,
      date: today,
      entity_type: 'account',
      entity_id: 'summary',
      entity_name: 'Account Summary',
      campaign_name: null,
      ad_group_name: null,
      clicks: totals.clicks || 0,
      cost_micros: totals.costMicros || Math.round((totals.cost || 0) * 1_000_000),
      conversions: totals.conversions || 0,
      impressions: totals.impressions || 0,
      ctr: totals.ctr || 0,
    });

    // Upsert — relies on unique constraint on (tenant_id, date, entity_type, entity_id)
    const { error: upsertError } = await supabase
      .from('tenant_metrics')
      .upsert(metricRows, { onConflict: 'tenant_id,date,entity_type,entity_id' });

    if (upsertError) {
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
    }

    console.log(
      `✅ ${label} — synced ${metricRows.length} metric types for ${campaigns.length} campaigns`
    );

    return {
      synced: true,
      campaignCount: campaigns.length,
      metrics: totals,
    };
  } catch (err) {
    console.log(`❌ ${label} — error: ${err.message}`);
    return { synced: false, campaignCount: 0, metrics: null, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 2. syncSearchTerms
// ---------------------------------------------------------------------------

/**
 * Fetch search terms for every active campaign and upsert them into the
 * Supabase `search_terms` table.
 *
 * ~1 + N API operations (1 for listCampaigns, N for each active campaign's
 * search terms report).
 *
 * @param {string} tenantId
 * @returns {Promise<{ synced: boolean, termsCount: number, error?: string }>}
 */
export async function syncSearchTerms(tenantId) {
  const label = `syncSearchTerms(${tenantId})`;
  console.log(`📊 ${label} — starting`);

  try {
    // We need at least 1 op to list campaigns; we'll check per-campaign later
    if (!(await ensureQuota(1, `${label} — listCampaigns`))) {
      return { synced: false, termsCount: 0, error: 'quota_insufficient' };
    }

    const supabase = requireSupabase();
    const today = getTodayDateString();

    // List campaigns to find active ones
    const campaigns = await listCampaigns(tenantId);
    const activeCampaigns = campaigns.filter(
      (c) => c.status === 'ENABLED' || c.status === 2 /* enum fallback */
    );

    if (activeCampaigns.length === 0) {
      console.log(`⚠️  ${label} — no active campaigns found, nothing to sync`);
      return { synced: true, termsCount: 0 };
    }

    // Check quota for all campaign-level fetches
    if (!(await ensureQuota(activeCampaigns.length, `${label} — search term reports`))) {
      return { synced: false, termsCount: 0, error: 'quota_insufficient' };
    }

    const now = new Date().toISOString();
    let totalTerms = 0;

    // Fetch search terms per campaign
    for (const campaign of activeCampaigns) {
      try {
        const terms = await getSearchTermsReport(tenantId, campaign.id);

        if (!terms || terms.length === 0) {
          continue;
        }

        const rows = terms.map((term) => ({
          tenant_id: tenantId,
          date: today,
          campaign_name: campaign.name || String(campaign.id),
          ad_group_name: term.adGroupName || '',
          search_term: term.searchTerm,
          clicks: term.clicks || 0,
          cost_micros: term.costMicros || Math.round((term.cost || 0) * 1_000_000),
          conversions: term.conversions || 0,
        }));

        // Upsert — relies on unique constraint on (tenant_id, date, campaign_name, ad_group_name, search_term)
        const { error: upsertError } = await supabase
          .from('search_terms')
          .upsert(rows, { onConflict: 'tenant_id,date,campaign_name,ad_group_name,search_term' });

        if (upsertError) {
          console.log(
            `⚠️  ${label} — upsert failed for campaign ${campaign.id}: ${upsertError.message}`
          );
          continue; // partial failure — keep going
        }

        totalTerms += rows.length;
      } catch (campaignErr) {
        console.log(
          `⚠️  ${label} — failed for campaign ${campaign.id}: ${campaignErr.message}`
        );
        // Continue with remaining campaigns
      }
    }

    console.log(
      `✅ ${label} — synced ${totalTerms} search terms across ${activeCampaigns.length} campaigns`
    );

    return { synced: true, termsCount: totalTerms };
  } catch (err) {
    console.log(`❌ ${label} — error: ${err.message}`);
    return { synced: false, termsCount: 0, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 3. syncKeywordMetrics
// ---------------------------------------------------------------------------

/**
 * Fetch keyword metrics for each campaign and store them in the Supabase
 * `tenant_metrics` table as a JSON blob (metric_type = 'keyword_metrics').
 *
 * ~1 + N API operations.
 *
 * @param {string} tenantId
 * @returns {Promise<{ synced: boolean, keywordCount: number, error?: string }>}
 */
export async function syncKeywordMetrics(tenantId) {
  const label = `syncKeywordMetrics(${tenantId})`;
  console.log(`📊 ${label} — starting`);

  try {
    if (!(await ensureQuota(1, `${label} — listCampaigns`))) {
      return { synced: false, keywordCount: 0, error: 'quota_insufficient' };
    }

    const supabase = requireSupabase();

    const campaigns = await listCampaigns(tenantId);
    const activeCampaigns = campaigns.filter(
      (c) => c.status === 'ENABLED' || c.status === 2
    );

    if (activeCampaigns.length === 0) {
      console.log(`⚠️  ${label} — no active campaigns found, nothing to sync`);
      return { synced: true, keywordCount: 0 };
    }

    if (!(await ensureQuota(activeCampaigns.length, `${label} — keyword reports`))) {
      return { synced: false, keywordCount: 0, error: 'quota_insufficient' };
    }

    const today = getTodayDateString();
    const now = new Date().toISOString();
    const allKeywords = [];

    for (const campaign of activeCampaigns) {
      try {
        const keywords = await getKeywordMetrics(tenantId, campaign.id);

        if (keywords && keywords.length > 0) {
          allKeywords.push(
            ...keywords.map((kw) => ({
              ...kw,
              campaignId: campaign.id,
              campaignName: campaign.name,
            }))
          );
        }
      } catch (campaignErr) {
        console.log(
          `⚠️  ${label} — failed for campaign ${campaign.id}: ${campaignErr.message}`
        );
        // Continue with remaining campaigns
      }
    }

    // Store one row per keyword in tenant_metrics
    const keywordRows = allKeywords.map((kw) => ({
      tenant_id: tenantId,
      date: today,
      entity_type: 'keyword',
      entity_id: String(kw.id || kw.criterionId || kw.keyword || ''),
      entity_name: kw.keyword || kw.text || '',
      campaign_name: kw.campaignName || '',
      ad_group_name: kw.adGroupName || '',
      clicks: kw.clicks || 0,
      cost_micros: kw.costMicros || Math.round((kw.cost || 0) * 1_000_000),
      conversions: kw.conversions || 0,
      impressions: kw.impressions || 0,
      ctr: kw.ctr || 0,
    }));

    if (keywordRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('tenant_metrics')
        .upsert(keywordRows, { onConflict: 'tenant_id,date,entity_type,entity_id' });

      if (upsertError) {
        throw new Error(`Supabase upsert failed: ${upsertError.message}`);
      }
    }

    console.log(
      `✅ ${label} — synced ${allKeywords.length} keywords across ${activeCampaigns.length} campaigns`
    );

    return { synced: true, keywordCount: allKeywords.length };
  } catch (err) {
    console.log(`❌ ${label} — error: ${err.message}`);
    return { synced: false, keywordCount: 0, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 4. runFullSync
// ---------------------------------------------------------------------------

/**
 * Run all three sync operations in sequence. Checks quota before each step
 * and skips if insufficient. Returns an aggregate result.
 *
 * @param {string} tenantId
 * @returns {Promise<{
 *   campaignMetrics: object,
 *   searchTerms: object,
 *   keywords: object,
 *   totalApiOps: number,
 *   quota: object
 * }>}
 */
export async function runFullSync(tenantId) {
  const label = `runFullSync(${tenantId})`;
  console.log(`📊 ${label} — starting full data sync`);
  const startTime = Date.now();

  // Grab initial quota snapshot
  const quotaBefore = await getRemainingQuota();
  console.log(
    `📊 ${label} — quota before sync: ${quotaBefore.remaining}/${quotaBefore.limit} remaining (${quotaBefore.percentUsed}% used)`
  );

  // Step 1: Campaign metrics (~2 ops)
  const campaignMetrics = await syncCampaignMetrics(tenantId);

  // Step 2: Search terms (~1 + N ops) — skip if already low on quota
  const searchTerms = await syncSearchTerms(tenantId);

  // Step 3: Keyword metrics (~1 + N ops) — lowest priority
  const keywords = await syncKeywordMetrics(tenantId);

  // Grab final quota snapshot to compute total ops consumed
  const quotaAfter = await getRemainingQuota();
  const totalApiOps = Math.max(0, quotaBefore.remaining - quotaAfter.remaining);
  const elapsed = Date.now() - startTime;

  console.log(
    `✅ ${label} — full sync complete in ${elapsed}ms | ${totalApiOps} API ops consumed | ` +
      `campaigns=${campaignMetrics.synced}, searchTerms=${searchTerms.synced}, keywords=${keywords.synced}`
  );

  return {
    campaignMetrics,
    searchTerms,
    keywords,
    totalApiOps,
    quota: quotaAfter,
  };
}

// ---------------------------------------------------------------------------
// 5. getLastSyncTime
// ---------------------------------------------------------------------------

/**
 * Return the most recent sync timestamp from `tenant_metrics` for this tenant.
 *
 * @param {string} tenantId
 * @returns {Promise<string|null>} ISO timestamp or null if never synced
 */
export async function getLastSyncTime(tenantId) {
  try {
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from('tenant_metrics')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = "no rows returned" which is expected for first-time tenants
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data?.created_at ?? null;
  } catch (err) {
    console.log(`⚠️  getLastSyncTime(${tenantId}) — error: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 6. shouldSync
// ---------------------------------------------------------------------------

/**
 * Determine whether enough time has passed since the last sync to warrant
 * a new one.
 *
 * @param {string} tenantId
 * @param {number} minIntervalMs — minimum interval between syncs (default 1 hour)
 * @returns {Promise<boolean>}
 */
export async function shouldSync(tenantId, minIntervalMs = 3_600_000) {
  const lastSync = await getLastSyncTime(tenantId);

  if (!lastSync) {
    // Never synced — definitely should sync
    return true;
  }

  const elapsed = Date.now() - new Date(lastSync).getTime();
  const should = elapsed >= minIntervalMs;

  if (!should) {
    const remainingMin = Math.ceil((minIntervalMs - elapsed) / 60_000);
    console.log(
      `⏳ shouldSync(${tenantId}) — last sync was ${Math.floor(elapsed / 60_000)}min ago, ` +
        `next sync in ~${remainingMin}min`
    );
  }

  return should;
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  syncCampaignMetrics,
  syncSearchTerms,
  syncKeywordMetrics,
  runFullSync,
  getLastSyncTime,
  shouldSync,
};
