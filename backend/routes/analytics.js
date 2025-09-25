import express from 'express';
import { supabase, isSupabaseEnabled } from '../services/supabase-client.js';
import { getDoc, ensureSheet } from '../sheets.js';

const router = express.Router();

/**
 * Get real metrics data from Supabase (primary) or Google Sheets (fallback)
 * Returns campaign performance data for the insights dashboard
 */
router.get('/metrics/:tenant', async (req, res) => {
  try {
    const { tenant } = req.params;
    const { period = '7d', type = 'campaigns' } = req.query;

    if (!tenant) {
      return res.status(400).json({
        error: 'Tenant ID required',
        code: 'MISSING_TENANT'
      });
    }

    console.log(`📊 Fetching metrics for ${tenant} - period: ${period}, type: ${type}`);

    // Calculate date range based on period
    const now = new Date();
    const daysMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const days = daysMap[period] || 7;
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    let metricsData = null;

    // Try Supabase first if enabled
    if (isSupabaseEnabled()) {
      try {
        console.log(`🔍 Attempting to fetch from Supabase for ${tenant}`);

        // Set tenant context for RLS
        await supabase.rpc('set_config', {
          parameter: 'app.current_tenant_id',
          value: tenant
        });

        // Fetch campaign metrics
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaign_metrics')
          .select('*')
          .eq('tenant_id', tenant)
          .gte('date', startDate.toISOString())
          .order('date', { ascending: true });

        if (!campaignError && campaignData) {
          console.log(`✅ Found ${campaignData.length} campaign records in Supabase`);

          // Fetch ad group metrics if requested
          let adGroupData = [];
          if (type === 'adgroups' || type === 'all') {
            const { data: agData, error: agError } = await supabase
              .from('ad_group_metrics')
              .select('*')
              .eq('tenant_id', tenant)
              .gte('date', startDate.toISOString())
              .order('date', { ascending: true });

            if (!agError && agData) {
              adGroupData = agData;
              console.log(`✅ Found ${adGroupData.length} ad group records in Supabase`);
            }
          }

          // Fetch search terms if requested
          let searchTerms = [];
          if (type === 'terms' || type === 'all') {
            const { data: termData, error: termError } = await supabase
              .from('search_terms')
              .select('*')
              .eq('tenant_id', tenant)
              .gte('date', startDate.toISOString())
              .order('cost', { ascending: false })
              .limit(50);

            if (!termError && termData) {
              searchTerms = termData;
              console.log(`✅ Found ${searchTerms.length} search terms in Supabase`);
            }
          }

          metricsData = {
            campaigns: campaignData || [],
            adGroups: adGroupData,
            searchTerms: searchTerms,
            source: 'supabase',
            period: period,
            tenant: tenant
          };
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase fetch failed, falling back to Sheets:', supabaseError.message);
      }
    }

    // Fallback to Google Sheets if Supabase failed or is disabled
    if (!metricsData) {
      try {
        console.log(`📄 Fetching from Google Sheets for ${tenant}`);
        const doc = await getDoc();

        if (!doc) {
          throw new Error('Google Sheets not configured');
        }

        // Get metrics sheet
        const metricsSheet = await ensureSheet(doc, `METRICS_${tenant}`, [
          'date', 'level', 'campaign', 'ad_group', 'id', 'name',
          'clicks', 'cost', 'conversions', 'impr', 'ctr'
        ]);

        const rows = await metricsSheet.getRows();
        console.log(`📊 Found ${rows.length} rows in Google Sheets`);

        // Process and filter rows
        const campaigns = [];
        const adGroups = [];

        rows.forEach(row => {
          const rowDate = new Date(row.date);
          if (rowDate < startDate) return;

          const record = {
            date: row.date,
            campaign_name: row.campaign,
            ad_group_name: row.ad_group || '',
            clicks: parseInt(row.clicks) || 0,
            cost: parseFloat(row.cost) || 0,
            conversions: parseFloat(row.conversions) || 0,
            impressions: parseInt(row.impr) || 0,
            ctr: parseFloat(row.ctr) || 0
          };

          if (row.level === 'campaign') {
            campaigns.push({
              ...record,
              campaign_id: row.id,
              name: row.name
            });
          } else if (row.level === 'ad_group') {
            adGroups.push({
              ...record,
              ad_group_id: row.id,
              name: row.name
            });
          }
        });

        // Get search terms if available
        let searchTerms = [];
        try {
          const termsSheet = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, [
            'date', 'campaign', 'ad_group', 'search_term',
            'clicks', 'cost', 'conversions'
          ]);

          const termRows = await termsSheet.getRows();
          searchTerms = termRows
            .filter(row => new Date(row.date) >= startDate)
            .map(row => ({
              date: row.date,
              campaign_name: row.campaign,
              ad_group_name: row.ad_group,
              search_term: row.search_term,
              clicks: parseInt(row.clicks) || 0,
              cost: parseFloat(row.cost) || 0,
              conversions: parseFloat(row.conversions) || 0
            }))
            .slice(0, 50);
        } catch (termsError) {
          console.log('No search terms sheet found');
        }

        metricsData = {
          campaigns: campaigns,
          adGroups: type === 'adgroups' || type === 'all' ? adGroups : [],
          searchTerms: type === 'terms' || type === 'all' ? searchTerms : [],
          source: 'sheets',
          period: period,
          tenant: tenant
        };

        console.log(`✅ Processed ${campaigns.length} campaigns, ${adGroups.length} ad groups from Sheets`);
      } catch (sheetsError) {
        console.error('❌ Google Sheets fetch failed:', sheetsError.message);
        throw sheetsError;
      }
    }

    // Calculate summary statistics
    const summary = calculateSummaryStats(metricsData);

    return res.json({
      ok: true,
      data: metricsData,
      summary: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analytics metrics error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message,
      code: 'METRICS_ERROR'
    });
  }
});

/**
 * Calculate summary statistics from metrics data
 */
function calculateSummaryStats(metricsData) {
  const campaigns = metricsData.campaigns || [];

  if (campaigns.length === 0) {
    return {
      totalClicks: 0,
      totalCost: 0,
      totalConversions: 0,
      totalImpressions: 0,
      avgCtr: 0,
      avgCpc: 0,
      conversionRate: 0,
      campaignCount: 0
    };
  }

  const totals = campaigns.reduce((acc, campaign) => {
    acc.clicks += campaign.clicks || 0;
    acc.cost += campaign.cost || 0;
    acc.conversions += campaign.conversions || 0;
    acc.impressions += campaign.impressions || 0;
    return acc;
  }, { clicks: 0, cost: 0, conversions: 0, impressions: 0 });

  return {
    totalClicks: totals.clicks,
    totalCost: totals.cost,
    totalConversions: totals.conversions,
    totalImpressions: totals.impressions,
    avgCtr: totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0,
    avgCpc: totals.clicks > 0 ? (totals.cost / totals.clicks) : 0,
    conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0,
    campaignCount: campaigns.length
  };
}

export default router;