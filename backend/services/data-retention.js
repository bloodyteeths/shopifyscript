/**
 * Data Retention Service
 * Enforces tier-based data retention by cleaning up old metrics and search terms.
 * Runs daily via cron (see server.js).
 *
 * Retention limits:
 *   starter:      7 days
 *   professional: 30 days
 *   enterprise:   90 days
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';

const RETENTION_DAYS = {
  starter: 7,
  professional: 30,
  enterprise: 90,
};

const DEFAULT_RETENTION_DAYS = 7;

/**
 * Run data retention cleanup for all tenants.
 * Deletes tenant_metrics and search_terms rows older than the tenant's tier allows.
 */
export async function runDataRetention() {
  if (!isSupabaseEnabled() || !supabase) {
    console.log('[DataRetention] Supabase not enabled, skipping cleanup');
    return { skipped: true };
  }

  console.log('[DataRetention] Starting daily cleanup...');
  const results = { processed: 0, metricsDeleted: 0, searchTermsDeleted: 0, errors: [] };

  try {
    // Get all tenants with their tier
    const { data: tenants, error } = await supabase
      .from('tenant_subscriptions')
      .select('tenant_id, tier');

    if (error) {
      console.error('[DataRetention] Failed to fetch tenants:', error.message);
      results.errors.push(error.message);
      return results;
    }

    if (!tenants || tenants.length === 0) {
      console.log('[DataRetention] No tenants found, nothing to clean');
      return results;
    }

    for (const tenant of tenants) {
      try {
        const tier = tenant.tier || 'starter';
        const retentionDays = RETENTION_DAYS[tier] || DEFAULT_RETENTION_DAYS;
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]; // YYYY-MM-DD

        // Delete old tenant_metrics rows
        const { count: metricsCount, error: metricsError } = await supabase
          .from('tenant_metrics')
          .delete({ count: 'exact' })
          .eq('tenant_id', tenant.tenant_id)
          .lt('date', cutoffDate);

        if (metricsError) {
          console.error(`[DataRetention] Metrics cleanup failed for ${tenant.tenant_id}:`, metricsError.message);
          results.errors.push(`${tenant.tenant_id}/metrics: ${metricsError.message}`);
        } else {
          results.metricsDeleted += metricsCount || 0;
        }

        // Delete old search_terms rows
        const { count: searchCount, error: searchError } = await supabase
          .from('search_terms')
          .delete({ count: 'exact' })
          .eq('tenant_id', tenant.tenant_id)
          .lt('date', cutoffDate);

        if (searchError) {
          console.error(`[DataRetention] Search terms cleanup failed for ${tenant.tenant_id}:`, searchError.message);
          results.errors.push(`${tenant.tenant_id}/search_terms: ${searchError.message}`);
        } else {
          results.searchTermsDeleted += searchCount || 0;
        }

        results.processed++;
      } catch (tenantError) {
        console.error(`[DataRetention] Error processing tenant ${tenant.tenant_id}:`, tenantError.message);
        results.errors.push(`${tenant.tenant_id}: ${tenantError.message}`);
      }
    }

    console.log(`[DataRetention] Cleanup complete: ${results.processed} tenants processed, ${results.metricsDeleted} metrics rows + ${results.searchTermsDeleted} search term rows deleted`);
    return results;

  } catch (error) {
    console.error('[DataRetention] Unexpected error:', error.message);
    results.errors.push(error.message);
    return results;
  }
}

/**
 * Get the maximum number of days a tier can view data.
 */
export function getRetentionDays(tier) {
  return RETENTION_DAYS[tier] || DEFAULT_RETENTION_DAYS;
}

export default { runDataRetention, getRetentionDays, RETENTION_DAYS };
