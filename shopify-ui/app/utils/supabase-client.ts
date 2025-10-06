/**
 * Supabase Client for Frontend
 * Provides typed queries for dashboard data with proper error handling
 */

import { createClient } from '@supabase/supabase-js';

// Types for Supabase tables
export interface TenantMetric {
  tenant_id: string;
  date: string;
  period: string;
  entity_type: 'campaign' | 'ad_group' | 'keyword' | 'period_aggregate';
  entity_id?: string;
  entity_name?: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  conversions_value?: number;
  ctr?: number;
  average_cpc?: number;
  created_at?: string;
}

export interface CampaignMetric {
  tenant_id: string;
  campaign_id: string;
  campaign_name: string;
  date: string;
  period: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  average_cpc: number;
  created_at?: string;
}

export interface RSADraft {
  id: string;
  tenant_id: string;
  theme: string;
  headlines: string[];
  descriptions: string[];
  performance_score?: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client (only on client-side)
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    return null; // Don't initialize on server-side
  }

  if (!supabaseClient) {
    // These should be public env vars (SUPABASE_URL and SUPABASE_ANON_KEY)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not configured for frontend');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Query helper with error handling and retry logic
 */
async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries = 2
): Promise<{ data: T | null; error: string | null }> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await queryFn();

      if (result.error) {
        lastError = result.error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      } else {
        return { data: result.data, error: null };
      }
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  return {
    data: null,
    error: lastError?.message || 'Query failed after retries'
  };
}

/**
 * Fetch tenant metrics by period
 */
export async function fetchTenantMetrics(
  tenantId: string,
  period: string,
  entityType?: 'campaign' | 'ad_group' | 'keyword'
): Promise<{ data: TenantMetric[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client not initialized' };
  }

  return queryWithRetry(async () => {
    let query = client
      .from('tenant_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('period', period)
      .order('date', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    return await query;
  });
}

/**
 * Fetch campaign metrics
 */
export async function fetchCampaignMetrics(
  tenantId: string,
  period: string
): Promise<{ data: CampaignMetric[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client not initialized' };
  }

  return queryWithRetry(async () => {
    return await client
      .from('campaign_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('period', period)
      .order('date', { ascending: false });
  });
}

/**
 * Fetch RSA drafts
 */
export async function fetchRSADrafts(
  tenantId: string
): Promise<{ data: RSADraft[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client not initialized' };
  }

  return queryWithRetry(async () => {
    return await client
      .from('rsa_drafts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
  });
}

/**
 * Aggregate metrics helper
 */
export function aggregateMetrics(metrics: TenantMetric[] | CampaignMetric[]): {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  averageCpc: number;
  roas: number;
} {
  if (!metrics || metrics.length === 0) {
    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cost: 0,
      ctr: 0,
      averageCpc: 0,
      roas: 0,
    };
  }

  const totals = metrics.reduce(
    (acc, m) => {
      // Handle both cost_micros (tenant_metrics) and cost (campaign_metrics)
      const cost = 'cost_micros' in m ? (m as any).cost_micros / 1000000 : (m as any).cost || 0;

      return {
        impressions: acc.impressions + (m.impressions || 0),
        clicks: acc.clicks + (m.clicks || 0),
        conversions: acc.conversions + (m.conversions || 0),
        cost: acc.cost + cost,
        conversionsValue: acc.conversionsValue + ((m as any).conversions_value || 0),
      };
    },
    { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversionsValue: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const averageCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  const roas = totals.cost > 0 ? totals.conversionsValue / totals.cost : 0;

  return {
    impressions: totals.impressions,
    clicks: totals.clicks,
    conversions: totals.conversions,
    cost: totals.cost,
    ctr: parseFloat(ctr.toFixed(2)),
    averageCpc: parseFloat(averageCpc.toFixed(2)),
    roas: parseFloat(roas.toFixed(2)),
  };
}

export default {
  getSupabaseClient,
  fetchTenantMetrics,
  fetchCampaignMetrics,
  fetchRSADrafts,
  aggregateMetrics,
};
