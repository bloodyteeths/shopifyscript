/**
 * Google Ads API Quota Tracker Service
 * Manages the global daily quota for Google Ads API Basic access (15,000 ops/day).
 *
 * Tracks usage in the `google_ads_daily_quotas` table (single row, id=1)
 * and logs individual operations to `google_ads_operation_log`.
 *
 * Includes in-memory caching (10s TTL) to minimize DB reads on hot paths.
 */

import { getSupabaseClient } from './supabase-client.js';

const DAILY_QUOTA_LIMIT = 15_000;
const QUOTA_ROW_ID = 1;
const CACHE_TTL_MS = 10_000; // 10 seconds
const WARNING_THRESHOLD_80 = 0.80;
const WARNING_THRESHOLD_95 = 0.95;

// ── In-memory cache ──────────────────────────────────────────────────────────
let quotaCache = null;
let quotaCacheTimestamp = 0;

function isCacheValid() {
  return quotaCache !== null && (Date.now() - quotaCacheTimestamp) < CACHE_TTL_MS;
}

function setCache(data) {
  quotaCache = { ...data };
  quotaCacheTimestamp = Date.now();
}

function invalidateCache() {
  quotaCache = null;
  quotaCacheTimestamp = 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return today's date string in YYYY-MM-DD (UTC).
 */
function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Log quota threshold warnings when usage crosses 80% or 95%.
 */
function checkThresholdWarnings(used, limit) {
  const pct = used / limit;
  if (pct >= WARNING_THRESHOLD_95) {
    console.log(`\u26A0\uFE0F  Google Ads quota CRITICAL: ${used}/${limit} ops used (${(pct * 100).toFixed(1)}%) \u2014 approaching daily limit`);
  } else if (pct >= WARNING_THRESHOLD_80) {
    console.log(`\u26A0\uFE0F  Google Ads quota WARNING: ${used}/${limit} ops used (${(pct * 100).toFixed(1)}%)`);
  }
}

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Internal: reset the daily counter if the stored date is stale.
 * Returns the (possibly refreshed) quota row.
 */
export async function resetIfNewDay() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const today = getTodayDateString();

    // Fetch the current quota row
    const { data: row, error: fetchError } = await supabase
      .from('google_ads_daily_quotas')
      .select('*')
      .eq('id', QUOTA_ROW_ID)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch quota row: ${fetchError.message}`);
    }

    // If no row exists yet, create the initial record
    if (!row) {
      const { data: newRow, error: insertError } = await supabase
        .from('google_ads_daily_quotas')
        .upsert({
          id: QUOTA_ROW_ID,
          date: today,
          operations_used: 0,
          max_operations: DAILY_QUOTA_LIMIT,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to initialise quota row: ${insertError.message}`);
      }

      console.log(`\u2705 Google Ads quota row initialised for ${today}`);
      const result = newRow;
      setCache(result);
      return result;
    }

    // Reset if the stored date is in the past
    if (row.date !== today) {
      console.log(`\uD83D\uDCCA Google Ads quota reset: new day detected (${row.date} \u2192 ${today})`);

      const { data: updated, error: updateError } = await supabase
        .from('google_ads_daily_quotas')
        .update({
          date: today,
          operations_used: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', QUOTA_ROW_ID)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to reset quota for new day: ${updateError.message}`);
      }

      invalidateCache();
      setCache(updated);
      return updated;
    }

    // Date is current; return existing row as-is
    setCache(row);
    return row;
  } catch (error) {
    console.log(`\u274C Google Ads quota resetIfNewDay error: ${error.message}`);
    throw error;
  }
}

/**
 * Check whether `opsCount` operations can be executed within the remaining
 * daily quota.  Auto-resets the counter when the date rolls over.
 *
 * @param {number} opsCount - Number of operations to check for (default 1).
 * @returns {Promise<{ allowed: boolean, remaining: number, used: number, limit: number }>}
 */
export async function canExecute(opsCount = 1) {
  try {
    // Use cache if still fresh
    let quotaRow;
    if (isCacheValid()) {
      quotaRow = quotaCache;
      // Even with cache, make sure the date hasn't rolled over
      if (quotaRow.date !== getTodayDateString()) {
        quotaRow = await resetIfNewDay();
      }
    } else {
      quotaRow = await resetIfNewDay();
    }

    const used = quotaRow.operations_used || 0;
    const limit = quotaRow.max_operations || DAILY_QUOTA_LIMIT;
    const remaining = Math.max(0, limit - used);
    const allowed = remaining >= opsCount;

    if (!allowed) {
      console.log(`\u274C Google Ads quota exhausted: requested ${opsCount} ops but only ${remaining} remaining`);
    }

    return { allowed, remaining, used, limit };
  } catch (error) {
    console.log(`\u274C Google Ads canExecute error: ${error.message}`);
    // Fail-open: deny operations when quota state is unknown to protect the limit
    return { allowed: false, remaining: 0, used: 0, limit: DAILY_QUOTA_LIMIT };
  }
}

/**
 * Record that operations were consumed. Increments the global counter and
 * writes a row to `google_ads_operation_log`.
 *
 * @param {string} tenantId
 * @param {string} operationType - e.g. "search_terms_report", "bid_update"
 * @param {number} opsCount
 * @param {object} details - Arbitrary JSON metadata to attach to the log entry
 * @returns {Promise<{ success: boolean, remaining: number }>}
 */
export async function recordUsage(tenantId, operationType, opsCount = 1, details = {}) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Ensure the counter is up-to-date (handles day rollover)
    const quotaRow = await resetIfNewDay();
    const currentUsed = quotaRow.operations_used || 0;
    const limit = quotaRow.max_operations || DAILY_QUOTA_LIMIT;
    const newUsed = currentUsed + opsCount;

    // Increment the global counter
    const { error: updateError } = await supabase
      .from('google_ads_daily_quotas')
      .update({
        operations_used: newUsed,
        updated_at: new Date().toISOString()
      })
      .eq('id', QUOTA_ROW_ID);

    if (updateError) {
      throw new Error(`Failed to update quota counter: ${updateError.message}`);
    }

    // Write to the operation log
    const { error: logError } = await supabase
      .from('google_ads_operation_log')
      .insert({
        tenant_id: tenantId,
        operation_type: operationType,
        operations_count: opsCount,
        request_summary: typeof details === 'object' ? JSON.stringify(details) : String(details),
        created_at: new Date().toISOString()
      });

    if (logError) {
      // Non-fatal: counter was already updated, just warn about the log failure
      console.log(`\u26A0\uFE0F  Failed to write operation log entry: ${logError.message}`);
    }

    // Refresh the cache with the new used count
    invalidateCache();
    setCache({ ...quotaRow, operations_used: newUsed });

    const remaining = Math.max(0, limit - newUsed);

    // Emit threshold warnings
    checkThresholdWarnings(newUsed, limit);

    console.log(`\uD83D\uDCCA Google Ads usage recorded: +${opsCount} ops for tenant ${tenantId} (${operationType}) \u2014 ${newUsed}/${limit} used`);

    return { success: true, remaining };
  } catch (error) {
    console.log(`\u274C Google Ads recordUsage error: ${error.message}`);
    return { success: false, remaining: 0 };
  }
}

/**
 * Get the current quota status.
 *
 * @returns {Promise<{ remaining: number, used: number, limit: number, date: string, percentUsed: number }>}
 */
export async function getRemainingQuota() {
  try {
    let quotaRow;
    if (isCacheValid()) {
      quotaRow = quotaCache;
      if (quotaRow.date !== getTodayDateString()) {
        quotaRow = await resetIfNewDay();
      }
    } else {
      quotaRow = await resetIfNewDay();
    }

    const used = quotaRow.operations_used || 0;
    const limit = quotaRow.max_operations || DAILY_QUOTA_LIMIT;
    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? parseFloat(((used / limit) * 100).toFixed(1)) : 0;

    return { remaining, used, limit, date: quotaRow.date, percentUsed };
  } catch (error) {
    console.log(`\u274C Google Ads getRemainingQuota error: ${error.message}`);
    return { remaining: 0, used: 0, limit: DAILY_QUOTA_LIMIT, date: getTodayDateString(), percentUsed: 0 };
  }
}

/**
 * Count tenants that have an active Google Ads connection.
 *
 * @returns {Promise<number>}
 */
export async function getActiveTenantsCount() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { count, error } = await supabase
      .from('google_ads_connections')
      .select('*', { count: 'exact', head: true })
      .eq('connection_status', 'active');

    if (error) {
      throw new Error(`Failed to count active tenants: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.log(`\u274C Google Ads getActiveTenantsCount error: ${error.message}`);
    return 0;
  }
}

/**
 * Determine how many operations a single tenant may consume right now.
 * Strategy: divide the remaining quota evenly across active tenants, with a
 * floor of 5 ops to ensure every tenant can do at least *something*.
 *
 * @param {string} tenantId
 * @returns {Promise<number>} Allowed ops for this tenant
 */
export async function allocateForTenant(tenantId) {
  try {
    const [quota, activeTenants] = await Promise.all([
      getRemainingQuota(),
      getActiveTenantsCount()
    ]);

    const tenantCount = Math.max(activeTenants, 1); // avoid division by zero
    const fairShare = Math.floor(quota.remaining / tenantCount);
    const allocation = Math.max(fairShare, 5);

    // Don't allocate more than what is actually remaining
    const finalAllocation = Math.min(allocation, quota.remaining);

    console.log(`\uD83D\uDCCA Google Ads allocation for tenant ${tenantId}: ${finalAllocation} ops (${quota.remaining} remaining / ${tenantCount} tenants)`);

    return finalAllocation;
  } catch (error) {
    console.log(`\u274C Google Ads allocateForTenant error: ${error.message}`);
    // Return a conservative minimum on failure
    return 5;
  }
}

/**
 * Retrieve recent operation log entries for a given tenant.
 *
 * @param {string} tenantId
 * @param {number} limit - Max rows to return (default 50)
 * @returns {Promise<Array>}
 */
export async function getUsageLog(tenantId, limit = 50) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await supabase
      .from('google_ads_operation_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch usage log: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.log(`\u274C Google Ads getUsageLog error: ${error.message}`);
    return [];
  }
}

// ── Default export ───────────────────────────────────────────────────────────

export default {
  canExecute,
  recordUsage,
  getRemainingQuota,
  allocateForTenant,
  getActiveTenantsCount,
  resetIfNewDay,
  getUsageLog
};
