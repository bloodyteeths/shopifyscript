/**
 * Dual Write Service
 * Writes data to both Google Sheets and Supabase during migration period
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';

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
 * Helper functions for writing to Supabase
 */

async function writeConfigToSupabase(tenant, configData) {
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
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Set tenant context for RLS
  await supabase.rpc('set_config', {
    parameter: 'app.current_tenant_id', 
    value: tenant
  });

  // Transform metrics data to match Supabase schema
  const metricsEntries = metricsData.map(row => ({
    tenant_id: tenant,
    date: new Date(row[0]),
    entity_type: row[1] || 'campaign',
    campaign_name: row[2] || '',
    ad_group_name: row[3] || '',
    entity_id: row[4] || '',
    entity_name: row[5] || '',
    clicks: parseInt(row[6]) || 0,
    cost_micros: Math.round((parseFloat(row[7]) || 0) * 1000000),
    conversions: parseFloat(row[8]) || 0,
    impressions: parseInt(row[9]) || 0,
    ctr: parseFloat(row[10]) || 0
  }));

  const { error } = await supabase
    .from('tenant_metrics')
    .upsert(metricsEntries, { onConflict: 'tenant_id,date,entity_type,entity_id' });

  if (error) {
    throw new Error(`Supabase metrics write error: ${error.message}`);
  }
}

async function writeSearchTermsToSupabase(tenant, searchTermsData) {
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
  readFromPreferredSource
};