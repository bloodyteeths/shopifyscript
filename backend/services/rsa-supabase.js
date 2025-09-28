/**
 * RSA Assets Supabase Service
 * Handles reading and writing RSA assets to Supabase
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';
import { logger } from './logger.js';

/**
 * Get RSA assets from Supabase (headlines and descriptions)
 * @param {string} tenant - Tenant identifier
 * @param {Object} options - Query options
 * @returns {Promise<Object>} RSA assets grouped by type
 */
export async function getRSAAssetsFromSupabase(tenant, options = {}) {
  if (!isSupabaseEnabled()) {
    logger.warn('Supabase not enabled, skipping RSA asset read');
    return null;
  }

  try {
    const {
      theme = null,
      source = null,
      activeOnly = true,
      limit = null
    } = options;

    // Build query
    let query = supabase
      .from('rsa_assets')
      .select('*')
      .eq('tenant_id', tenant);

    if (activeOnly) {
      query = query.eq('active', true);
    }

    if (theme) {
      query = query.eq('theme', theme);
    }

    if (source) {
      query = query.eq('source', source);
    }

    if (limit) {
      query = query.limit(limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch RSA assets from Supabase', { tenant, error: error.message });
      return null;
    }

    // Group assets by type
    const grouped = {
      headlines: data.filter(a => a.asset_type === 'headline'),
      descriptions: data.filter(a => a.asset_type === 'description')
    };

    logger.info('✅ RSA assets fetched from Supabase', {
      tenant,
      headlines: grouped.headlines.length,
      descriptions: grouped.descriptions.length
    });

    return grouped;
  } catch (error) {
    logger.error('Error fetching RSA assets from Supabase', { tenant, error: error.message });
    return null;
  }
}

/**
 * Get RSA drafts from Supabase (default and library assets)
 * Returns data in the same format as Google Sheets for compatibility
 * @param {string} tenant - Tenant identifier
 * @returns {Promise<Object|null>} RSA drafts or null if error
 */
export async function getRSADraftsFromSupabase(tenant) {
  if (!isSupabaseEnabled()) {
    logger.warn('Supabase not enabled for getRSADraftsFromSupabase', {
      SUPABASE_ENABLED: process.env.SUPABASE_ENABLED,
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    return null;
  }

  try {
    logger.info('🔍 Fetching RSA drafts from Supabase', { tenant });

    // Fetch all RSA assets for this tenant
    const { data: assets, error } = await supabase
      .from('rsa_assets')
      .select('*')
      .eq('tenant_id', tenant)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch RSA drafts from Supabase', { tenant, error: error.message });
      return null;
    }

    // Separate assets by type first
    const rsaAssets = assets.filter(a => a.asset_type === 'rsa');
    const individualAssets = assets.filter(a => a.asset_type === 'headline' || a.asset_type === 'description');

    // Group by theme and format like Google Sheets response
    const grouped = {};

    // Process RSA format first (these are complete and should take priority)
    for (const asset of rsaAssets) {
      const theme = asset.theme || 'default';

      if (asset.headlines_pipe && asset.descriptions_pipe) {
        grouped[theme] = {
          theme,
          headlines: asset.headlines_pipe.split('|').map(h => h.trim()).filter(Boolean),
          descriptions: asset.descriptions_pipe.split('|').map(d => d.trim()).filter(Boolean),
          source: asset.rationale || asset.source || 'ai_generated'
        };
      }
    }

    // Only process individual assets for themes not already handled by RSA format
    for (const asset of individualAssets) {
      const theme = asset.theme || 'default';

      // Skip if we already have this theme from RSA format
      if (grouped[theme]) continue;

      if (!grouped[theme]) {
        grouped[theme] = {
          theme,
          headlines: [],
          descriptions: [],
          source: asset.source || 'ai_generated'
        };
      }

      if (asset.asset_type === 'headline') {
        grouped[theme].headlines.push(asset.asset_text);
      } else if (asset.asset_type === 'description') {
        grouped[theme].descriptions.push(asset.asset_text);
      }
    }

    // Convert to array format
    const drafts = Object.values(grouped);

    logger.info('✅ RSA drafts fetched from Supabase', {
      tenant,
      draftCount: drafts.length,
      themes: drafts.map(d => ({
        theme: d.theme,
        headlines: d.headlines.length,
        descriptions: d.descriptions.length
      })),
      rsaAssets: rsaAssets.length,
      individualAssets: individualAssets.length,
      totalAssets: assets.length
    });

    // For compatibility, return all drafts in library if none are marked as default
    // Most themes like "Best Sellers", "New Arrivals" should be in library
    const defaultDrafts = drafts.filter(d => d.theme === 'default' || d.theme === 'Default Theme');
    const libraryDrafts = drafts.filter(d => d.theme !== 'default' && d.theme !== 'Default Theme');

    return {
      rsa_default: defaultDrafts,
      library: libraryDrafts
    };
  } catch (error) {
    logger.error('Error fetching RSA drafts from Supabase', { tenant, error: error.message });
    return null;
  }
}

/**
 * Write RSA assets to Supabase
 * @param {string} tenant - Tenant identifier
 * @param {Array<Object>} assets - Array of asset objects
 * @returns {Promise<boolean>} Success status
 */
export async function writeRSAAssetsToSupabase(tenant, assets) {
  if (!isSupabaseEnabled()) {
    logger.warn('Supabase not enabled, skipping RSA asset write');
    return false;
  }

  try {
    // Transform assets to Supabase format
    const records = assets.map(asset => ({
      tenant_id: tenant,
      asset_type: asset.type || asset.asset_type,
      asset_text: asset.text || asset.asset_text,
      theme: asset.theme || 'default',
      source: asset.source || 'ai_generated',
      campaign_name: asset.campaign_name || null,
      ad_group_name: asset.ad_group_name || null,
      performance_score: asset.performance_score || null,
      active: asset.active !== false
    }));

    const { data, error } = await supabase
      .from('rsa_assets')
      .insert(records)
      .select();

    if (error) {
      logger.error('Failed to write RSA assets to Supabase', {
        tenant,
        count: records.length,
        error: error.message
      });
      return false;
    }

    logger.info('✅ RSA assets written to Supabase', {
      tenant,
      count: data.length
    });

    return true;
  } catch (error) {
    logger.error('Error writing RSA assets to Supabase', {
      tenant,
      error: error.message
    });
    return false;
  }
}

/**
 * Dual write RSA content to both Supabase and Google Sheets
 * @param {string} tenant - Tenant identifier
 * @param {Object} rsaContent - RSA content with headlines and descriptions
 * @param {string} theme - Theme name
 * @param {Object} sheetsWrite - Google Sheets write result
 * @returns {Promise<Object>} Write results
 */
export async function dualWriteRSAContent(tenant, rsaContent, theme, sheetsWrite) {
  const results = {
    sheets: sheetsWrite,
    supabase: { success: false, error: null, count: 0 }
  };

  if (!isSupabaseEnabled()) {
    results.supabase.error = 'Supabase not enabled';
    return results;
  }

  try {
    const assets = [];

    // Add headlines
    for (const headline of rsaContent.headlines) {
      assets.push({
        type: 'headline',
        text: headline,
        theme,
        source: rsaContent.source || 'ai_generated'
      });
    }

    // Add descriptions
    for (const description of rsaContent.descriptions) {
      assets.push({
        type: 'description',
        text: description,
        theme,
        source: rsaContent.source || 'ai_generated'
      });
    }

    const success = await writeRSAAssetsToSupabase(tenant, assets);

    results.supabase.success = success;
    results.supabase.count = assets.length;

    if (!success) {
      results.supabase.error = 'Write failed';
    }
  } catch (error) {
    results.supabase.error = error.message;
    logger.error('Error in dual write RSA content', { tenant, theme, error: error.message });
  }

  return results;
}

/**
 * Read existing product/business data from Supabase to inform AI generation
 * This reduces Google Sheets API calls significantly
 * @param {string} tenant - Tenant identifier
 * @returns {Promise<Object|null>} Business context data
 */
export async function getBusinessContextFromSupabase(tenant) {
  if (!isSupabaseEnabled()) {
    return null;
  }

  try {
    // Get tenant config
    const { data: config, error: configError } = await supabase
      .from('tenant_configs')
      .select('*')
      .eq('tenant_id', tenant)
      .single();

    if (configError && configError.code !== 'PGRST116') { // PGRST116 = no rows
      logger.error('Failed to fetch tenant config from Supabase', { tenant, error: configError.message });
      return null;
    }

    // Get recent campaign performance for context
    const { data: metrics, error: metricsError } = await supabase
      .from('tenant_metrics')
      .select('campaign_name, clicks, conversions, cost')
      .eq('tenant_id', tenant)
      .order('date', { ascending: false })
      .limit(100);

    if (metricsError) {
      logger.error('Failed to fetch metrics from Supabase', { tenant, error: metricsError.message });
    }

    // Get top performing search terms for keyword ideas
    const { data: searchTerms, error: searchTermsError } = await supabase
      .from('search_terms')
      .select('search_term, clicks, conversions')
      .eq('tenant_id', tenant)
      .gt('conversions', 0)
      .order('conversions', { ascending: false })
      .limit(50);

    if (searchTermsError) {
      logger.error('Failed to fetch search terms from Supabase', { tenant, error: searchTermsError.message });
    }

    logger.info('✅ Business context fetched from Supabase', {
      tenant,
      hasConfig: !!config,
      metricsCount: metrics?.length || 0,
      searchTermsCount: searchTerms?.length || 0
    });

    return {
      config: config || {},
      topCampaigns: metrics || [],
      topSearchTerms: searchTerms || []
    };
  } catch (error) {
    logger.error('Error fetching business context from Supabase', { tenant, error: error.message });
    return null;
  }
}