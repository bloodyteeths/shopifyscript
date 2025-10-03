/**
 * Dual Write Service
 * Writes data to both Google Sheets and Supabase during migration period
 */

import { getSupabase, isSupabaseEnabled } from './supabase-client.js';

/**
 * Dual write configuration data
 */
export async function dualWriteConfig(tenant, configData) {
  const results = {
    sheets: { success: false, error: null },
    supabase: { success: false, error: null }
  };

  // Always write to Google Sheets (primary source during migration)
  try {
    // Use direct sheets write to avoid TenantRegistry dependency issues
    const { sheets } = await import('../sheets.js');

    // Convert config object to rows format for sheets
    const configRows = Object.entries(configData).map(([key, value]) => [
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    ]);

    // Write config directly to sheets
    await sheets.setRows(tenant, 'CONFIG', ['config_key', 'config_value'], configRows);
    results.sheets.success = true;
    console.log(`✅ Sheets write successful for tenant: ${tenant}`);
  } catch (error) {
    results.sheets.error = error.message;
    console.error(`❌ Sheets write failed for tenant: ${tenant}`, error);
  }

  // Conditionally write to Supabase
  if (isSupabaseEnabled()) {
    try {
      await writeConfigToSupabase(tenant, configData);
      results.supabase.success = true;
      console.log(`✅ Supabase write successful for tenant: ${tenant}`);
    } catch (error) {
      results.supabase.error = error.message;
      console.error(`⚠️ Supabase write failed for tenant: ${tenant}`, error);
    }
  } else {
    results.supabase.error = 'Supabase not enabled';
  }

  return results;
}

/**
 * Dual write metrics data
 */
export async function dualWriteMetrics(tenant, metricsData) {
  const results = {
    sheets: { success: false, error: null },
    supabase: { success: false, error: null }
  };

  // Always write to Google Sheets
  try {
    const { sheets } = await import('../sheets.js');
    await sheets.addRows(tenant, "METRICS", metricsData);
    results.sheets.success = true;
  } catch (error) {
    results.sheets.error = error.message;
    console.error(`❌ Metrics sheets write failed for tenant: ${tenant}`, error);
  }

  // Conditionally write to Supabase
  if (isSupabaseEnabled()) {
    try {
      await writeMetricsToSupabase(tenant, metricsData);
      results.supabase.success = true;
    } catch (error) {
      results.supabase.error = error.message;
      console.error(`⚠️ Metrics supabase write failed for tenant: ${tenant}`, error);
    }
  }

  return results;
}

/**
 * Dual write search terms data
 */
export async function dualWriteSearchTerms(tenant, searchTermsData) {
  const results = {
    sheets: { success: false, error: null },
    supabase: { success: false, error: null }
  };

  // Always write to Google Sheets
  try {
    const { sheets } = await import('../sheets.js');
    await sheets.addRows(tenant, "SEARCH_TERMS", searchTermsData);
    results.sheets.success = true;
  } catch (error) {
    results.sheets.error = error.message;
    console.error(`❌ Search terms sheets write failed for tenant: ${tenant}`, error);
  }

  // Conditionally write to Supabase
  if (isSupabaseEnabled()) {
    try {
      await writeSearchTermsToSupabase(tenant, searchTermsData);
      results.supabase.success = true;
    } catch (error) {
      results.supabase.error = error.message;
      console.error(`⚠️ Search terms supabase write failed for tenant: ${tenant}`, error);
    }
  }

  return results;
}

/**
 * Dual write run logs
 */
export async function dualWriteRunLogs(tenant, runLogsData) {
  const results = {
    sheets: { success: false, error: null },
    supabase: { success: false, error: null }
  };

  // Always write to Google Sheets
  try {
    const { sheets } = await import('../sheets.js');
    await sheets.addRows(tenant, "RUN_LOGS", runLogsData);
    results.sheets.success = true;
  } catch (error) {
    results.sheets.error = error.message;
    console.error(`❌ Run logs sheets write failed for tenant: ${tenant}`, error);
  }

  // Conditionally write to Supabase
  if (isSupabaseEnabled()) {
    try {
      await writeRunLogsToSupabase(tenant, runLogsData);
      results.supabase.success = true;
    } catch (error) {
      results.supabase.error = error.message;
      console.error(`⚠️ Run logs supabase write failed for tenant: ${tenant}`, error);
    }
  }

  return results;
}

/**
 * Dual write n-gram negatives data
 */
export async function dualWriteNgramNegatives(tenant, ngramData) {
  const results = {
    sheets: { success: false, error: null },
    supabase: { success: false, error: null }
  };

  // Always write to Google Sheets
  try {
    const { sheets } = await import('../sheets.js');
    await sheets.addRows(tenant, "NGRAM_NEGATIVES", ngramData);
    results.sheets.success = true;
  } catch (error) {
    results.sheets.error = error.message;
    console.error(`❌ N-gram negatives sheets write failed for tenant: ${tenant}`, error);
  }

  // Conditionally write to Supabase
  if (isSupabaseEnabled()) {
    try {
      await writeNgramNegativesToSupabase(tenant, ngramData);
      results.supabase.success = true;
    } catch (error) {
      results.supabase.error = error.message;
      console.error(`⚠️ N-gram negatives supabase write failed for tenant: ${tenant}`, error);
    }
  }

  return results;
}

/**
 * Helper functions for writing to Supabase
 */

async function writeConfigToSupabase(tenant, configData) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenant
  });

  const configEntries = Object.entries(configData).map(([key, value]) => ({
    tenant_id: tenant,
    config_key: key,
    config_value: value
  }));

  const { error } = await supabase
    .from('tenant_configs')
    .upsert(configEntries, { onConflict: 'tenant_id,config_key' });

  if (error) {
    throw new Error(`Supabase config write error: ${error.message}`);
  }
}

async function writeMetricsToSupabase(tenant, metricsData) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id', 
    value: tenant
  });

  // Transform metrics data to match Supabase schema
  // ✅ UPDATED: Handle new period field at index 0
  const metricsEntries = metricsData.map(row => ({
    tenant_id: tenant,
    period: row[0] || 'UNKNOWN',           // NEW: period field
    date: new Date(row[1]),                 // Shifted from index 0 to 1
    entity_type: row[2] || 'campaign',      // Shifted from index 1 to 2
    campaign_name: row[3] || '',            // Shifted from index 2 to 3
    ad_group_name: row[4] || '',            // Shifted from index 3 to 4
    entity_id: row[5] || '',                // Shifted from index 4 to 5
    entity_name: row[6] || '',              // Shifted from index 5 to 6
    clicks: parseInt(row[7]) || 0,          // Shifted from index 6 to 7
    cost_micros: Math.round((parseFloat(row[8]) || 0) * 1000000), // Shifted from index 7 to 8
    conversions: parseFloat(row[9]) || 0,   // Shifted from index 8 to 9
    impressions: parseInt(row[10]) || 0,    // Shifted from index 9 to 10
    ctr: parseFloat(row[11]) || 0           // Shifted from index 10 to 11
  }));

  // 🔍 DEBUG: Log what we're about to write to Supabase
  console.log(`💾 Writing ${metricsEntries.length} metrics to Supabase for tenant: ${tenant}`);
  if (metricsEntries.length > 0) {
    console.log('🔍 First 3 entries to write:');
    metricsEntries.slice(0, 3).forEach((entry, i) => {
      console.log(`  Entry ${i}: period="${entry.period}", date="${entry.date.toISOString()}", entity_type="${entry.entity_type}", entity_name="${entry.entity_name}", impressions=${entry.impressions}, clicks=${entry.clicks}`);
    });
  }

  const { error } = await supabase
    .from('tenant_metrics')
    .upsert(metricsEntries, { onConflict: 'tenant_id,date,period,entity_type,entity_id' });

  if (error) {
    console.error(`❌ Supabase metrics write error for tenant ${tenant}:`, error);
    throw new Error(`Supabase metrics write error: ${error.message}`);
  } else {
    console.log(`✅ Successfully wrote ${metricsEntries.length} metrics to Supabase for tenant: ${tenant}`);
  }
}

async function writeSearchTermsToSupabase(tenant, searchTermsData) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenant
  });

  // Transform search terms data
  const searchTermsEntries = searchTermsData.map(row => ({
    tenant_id: tenant,
    date: new Date(row[0]),
    campaign_name: row[1] || '',
    ad_group_name: row[2] || '',
    search_term: row[3] || '',
    clicks: parseInt(row[4]) || 0,
    cost_micros: Math.round((parseFloat(row[5]) || 0) * 1000000),
    conversions: parseFloat(row[6]) || 0
  }));

  const { error } = await supabase
    .from('search_terms')
    .upsert(searchTermsEntries, { 
      onConflict: 'tenant_id,date,campaign_name,ad_group_name,search_term' 
    });

  if (error) {
    throw new Error(`Supabase search terms write error: ${error.message}`);
  }
}

async function writeRunLogsToSupabase(tenant, runLogsData) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenant
  });

  // Transform run logs data
  const runLogEntries = runLogsData.map(row => ({
    tenant_id: tenant,
    timestamp: new Date(row[0]),
    log_type: 'info',
    message: row[1] || '',
    details: row.length > 2 ? { raw_data: row.slice(2) } : null
  }));

  const { error } = await supabase
    .from('run_logs')
    .insert(runLogEntries);

  if (error) {
    throw new Error(`Supabase run logs write error: ${error.message}`);
  }
}

async function writeNgramNegativesToSupabase(tenant, ngramData) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenant
  });

  // Transform n-gram data to match Supabase schema
  const ngramEntries = ngramData.map(row => ({
    tenant_id: tenant,
    phrase: row.phrase || '',
    ngram_length: parseInt(row.ngram_length) || 2,
    waste_score: parseFloat(row.waste_score) || 0,
    confidence: parseFloat(row.confidence) || 0,
    occurrences: parseInt(row.occurrences) || 0,
    total_cost: parseFloat(row.total_cost) || 0,
    total_clicks: parseInt(row.total_clicks) || 0,
    total_conversions: parseInt(row.total_conversions) || 0,
    conversion_rate: parseFloat(row.conversion_rate) || 0,
    pattern_type: row.pattern_type || null,
    match_type: row.match_type || 'phrase',
    status: row.status || 'PENDING',
    approved_by: row.approved_by || null,
    applied_campaigns: row.applied_campaigns ? JSON.parse(row.applied_campaigns) : [],
    sample_search_terms: row.sample_search_terms ? JSON.parse(row.sample_search_terms) : [],
    ai_reason: row.ai_reason || null,
    business_impact: row.business_impact || 'medium',
    estimated_monthly_savings: parseFloat(row.estimated_monthly_savings) || 0,
    last_analyzed: row.last_analyzed ? new Date(row.last_analyzed) : null
  }));

  const { error } = await supabase
    .from('ngram_negatives')
    .upsert(ngramEntries, { onConflict: 'tenant_id,phrase' });

  if (error) {
    throw new Error(`Supabase n-gram negatives write error: ${error.message}`);
  }
}

/**
 * Read from preferred source (Supabase if available, otherwise Sheets)
 */
export async function readFromPreferredSource(tenant, dataType) {
  if (isSupabaseEnabled()) {
    try {
      return await readFromSupabase(tenant, dataType);
    } catch (error) {
      console.warn(`⚠️ Supabase read failed, falling back to Sheets for ${dataType}:`, error.message);
    }
  }

  // Fallback to Google Sheets
  return await readFromSheets(tenant, dataType);
}

async function readFromSupabase(tenant, dataType) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id',
    value: tenant
  });

  switch (dataType) {
    case 'config':
      const { data: configData, error: configError } = await supabase
        .from('tenant_configs')
        .select('config_key, config_value')
        .eq('tenant_id', tenant);
      
      if (configError) throw configError;
      
      // Transform to object format
      const config = {};
      configData.forEach(row => {
        config[row.config_key] = row.config_value;
      });
      return config;

    case 'metrics':
      const { data: metricsData, error: metricsError } = await supabase
        .from('tenant_metrics')
        .select('*')
        .eq('tenant_id', tenant)
        .order('date', { ascending: false })
        .limit(1000);
      
      if (metricsError) throw metricsError;
      return metricsData;

    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

async function readFromSheets(tenant, dataType) {
  const { readConfigFromSheets } = await import('../sheets.js');
  
  switch (dataType) {
    case 'config':
      return await readConfigFromSheets(tenant);
    default:
      throw new Error(`Unsupported data type for sheets: ${dataType}`);
  }
}

export default {
  dualWriteConfig,
  dualWriteMetrics,
  dualWriteSearchTerms,
  dualWriteRunLogs,
  dualWriteNgramNegatives,
  readFromPreferredSource
};