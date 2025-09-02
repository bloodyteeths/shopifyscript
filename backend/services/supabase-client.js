/**
 * Supabase Client Service
 * Handles connection and operations for Supabase database
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not configured - running in Sheets-only mode');
}

export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Check if Supabase is enabled and configured
 */
export function isSupabaseEnabled() {
  const enabled = process.env.SUPABASE_ENABLED === 'true';
  const configured = supabase !== null;
  
  return enabled && configured;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection() {
  if (!supabase) {
    return { connected: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('tenant_configs')
      .select('count')
      .limit(1);

    return { 
      connected: !error, 
      error: error?.message || null 
    };
  } catch (error) {
    return { 
      connected: false, 
      error: error.message 
    };
  }
}

/**
 * Create tables if they don't exist
 */
export async function ensureSupabaseTables() {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Table creation is handled by migrations
  // This function can be used for runtime checks
  
  const tables = [
    'tenant_configs',
    'tenant_metrics', 
    'search_terms',
    'run_logs',
    'tenant_subscriptions'
  ];
  
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
        
      results[table] = !error;
    } catch (error) {
      results[table] = false;
    }
  }
  
  return results;
}

export default {
  supabase,
  isSupabaseEnabled,
  testSupabaseConnection,
  ensureSupabaseTables
};