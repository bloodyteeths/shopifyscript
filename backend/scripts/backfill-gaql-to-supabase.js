/**
 * Backfill GAQL → Supabase
 *
 * Usage:
 *   node backend/scripts/backfill-gaql-to-supabase.js \
 *     --tenant <tenant_id> \
 *     --file ./gaql_export.json \
 *     --period LAST_30_DAYS
 *
 * Input format: JSON array of GAQL rows with fields that map to campaign/ad_group metrics.
 * The script transforms the rows and upserts into campaign_metrics, ad_group_metrics,
 * and tenant_metrics (period-granular), honoring RLS via app.current_tenant_id.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../services/supabase-client.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1];
    if (!val) continue;
    if (key === '--tenant') out.tenant = val;
    if (key === '--file') out.file = val;
    if (key === '--period') out.period = val;
  }
  return out;
}

async function main() {
  const { tenant, file, period = 'LAST_30_DAYS' } = parseArgs();
  if (!tenant || !file) {
    console.error('Usage: --tenant <tenant> --file <path> [--period LAST_30_DAYS]');
    process.exit(1);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase not configured');
    process.exit(1);
  }

  const raw = fs.readFileSync(file, 'utf8');
  let rows;
  try {
    rows = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON input:', e.message);
    process.exit(1);
  }

  // Set RLS context
  await supabase.rpc('set_config', { parameter: 'app.current_tenant_id', value: String(tenant) }).catch(() => {});

  const campaignMetrics = [];
  const adGroupMetrics = [];
  const tenantMetrics = [];

  for (const r of rows) {
    // Example GAQL mapping - adjust field names as needed
    const date = r.date || r.segments_date || new Date().toISOString().split('T')[0];
    const impressions = Number(r.impressions || r.metrics_impressions || 0);
    const clicks = Number(r.clicks || r.metrics_clicks || 0);
    const conversions = Number(r.conversions || r.metrics_conversions || 0);
    const costMicros = Number(r.cost_micros || r.metrics_cost_micros || 0);

    if (r.campaign_id) {
      campaignMetrics.push({
        tenant_id: tenant,
        date,
        campaign_id: String(r.campaign_id),
        campaign_name: String(r.campaign_name || ''),
        impressions,
        clicks,
        conversions,
        cost: costMicros / 1e6,
        created_at: new Date().toISOString()
      });

      tenantMetrics.push({
        tenant_id: tenant,
        period,
        date,
        entity_type: 'campaign',
        entity_id: String(r.campaign_id),
        entity_name: String(r.campaign_name || ''),
        impressions,
        clicks,
        conversions,
        cost_micros: costMicros,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0
      });
    }

    if (r.ad_group_id) {
      adGroupMetrics.push({
        tenant_id: tenant,
        date,
        ad_group_id: String(r.ad_group_id),
        ad_group_name: String(r.ad_group_name || ''),
        campaign_name: String(r.campaign_name || ''),
        impressions,
        clicks,
        conversions,
        cost: costMicros / 1e6,
        created_at: new Date().toISOString()
      });

      tenantMetrics.push({
        tenant_id: tenant,
        period,
        date,
        entity_type: 'ad_group',
        entity_id: String(r.ad_group_id),
        entity_name: String(r.ad_group_name || ''),
        impressions,
        clicks,
        conversions,
        cost_micros: costMicros,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0
      });
    }
  }

  console.log(`Preparing to upsert:`, {
    campaignMetrics: campaignMetrics.length,
    adGroupMetrics: adGroupMetrics.length,
    tenantMetrics: tenantMetrics.length
  });

  if (campaignMetrics.length) {
    const { error } = await supabase
      .from('campaign_metrics')
      .upsert(campaignMetrics, { onConflict: 'tenant_id,campaign_id,date' });
    if (error) {
      console.error('campaign_metrics upsert error:', error.message);
    } else {
      console.log(`Upserted ${campaignMetrics.length} campaign_metrics rows.`);
    }
  }

  if (adGroupMetrics.length) {
    const { error } = await supabase
      .from('ad_group_metrics')
      .upsert(adGroupMetrics, { onConflict: 'tenant_id,ad_group_id,date' });
    if (error) {
      console.error('ad_group_metrics upsert error:', error.message);
    } else {
      console.log(`Upserted ${adGroupMetrics.length} ad_group_metrics rows.`);
    }
  }

  if (tenantMetrics.length) {
    const { error } = await supabase
      .from('tenant_metrics')
      .upsert(tenantMetrics, { onConflict: 'tenant_id,date,period,entity_type,entity_id' });
    if (error) {
      console.error('tenant_metrics upsert error:', error.message);
    } else {
      console.log(`Upserted ${tenantMetrics.length} tenant_metrics rows.`);
    }
  }

  console.log('Backfill complete.');
}

main().catch((e) => {
  console.error('Backfill script failed:', e);
  process.exit(1);
});

