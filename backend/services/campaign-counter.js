/**
 * Campaign Counter Service
 * Tracks and enforces campaign count limits by subscription tier
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';

// In-memory campaign tracking for testing/fallback
const inMemoryCampaigns = new Map(); // tenant -> Set<campaign_name>

/**
 * Get current campaign count for a tenant from stored data
 */
export async function getCampaignCount(tenant) {
  try {
    // Check if we have in-memory data first (for testing/when external sources fail)
    if (inMemoryCampaigns.has(tenant)) {
      const campaigns = inMemoryCampaigns.get(tenant);
      const count = campaigns.size;
      console.log(`📊 Campaign count for ${tenant} from in-memory: ${count}`);
      return count;
    }

    if (isSupabaseEnabled() && supabase) {
      // Query campaign count from Supabase metrics data
      const { data, error } = await supabase
        .from('tenant_metrics')
        .select('campaign_name')
        .eq('tenant_id', tenant)
        .eq('entity_type', 'campaign')
        .gte('date', new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]); // Last 7 days
        
      if (error) {
        console.error('Error getting campaign count from Supabase:', error);
        return await getCampaignCountFromSheets(tenant);
      }
      
      // Count unique campaign names
      const uniqueCampaigns = new Set(data.map(row => row.campaign_name));
      const count = uniqueCampaigns.size;
      
      console.log(`📊 Campaign count for ${tenant} from Supabase: ${count}`);
      return count;
      
    } else {
      // Fallback to Google Sheets
      return await getCampaignCountFromSheets(tenant);
    }
    
  } catch (error) {
    console.error('Error getting campaign count:', error);
    
    // Use in-memory fallback for testing/development
    console.log(`📊 Using in-memory fallback for ${tenant}`);
    const campaigns = inMemoryCampaigns.get(tenant) || new Set();
    const count = campaigns.size;
    console.log(`📊 In-memory campaign count for ${tenant}: ${count}`);
    return count;
  }
}

/**
 * Get campaign count from Google Sheets (fallback)
 */
async function getCampaignCountFromSheets(tenant) {
  try {
    const { getDoc } = await import('../sheets.js');
    const doc = await getDoc();
    
    if (!doc) {
      console.log(`📊 No sheets doc for ${tenant}, returning 0 campaigns`);
      return 0;
    }
    
    const metricsSheetName = `METRICS_${tenant}`;
    const sheet = doc.sheetsByTitle[metricsSheetName];
    
    if (!sheet) {
      console.log(`📊 No metrics sheet for ${tenant}, returning 0 campaigns`);
      return 0;
    }
    
    const rows = await sheet.getRows();
    const campaignRows = rows.filter(row => row.level === 'campaign');
    
    // Count unique campaign names from recent data
    const uniqueCampaigns = new Set(
      campaignRows
        .filter(row => {
          const date = new Date(row.date);
          const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
          return date >= weekAgo;
        })
        .map(row => row.campaign)
    );
    
    const count = uniqueCampaigns.size;
    console.log(`📊 Campaign count for ${tenant} from Sheets: ${count}`);
    return count;
    
  } catch (error) {
    console.error('Error getting campaign count from Sheets:', error);
    
    // Use in-memory fallback
    console.log(`📊 Using in-memory fallback for ${tenant} (Sheets failed)`);
    const campaigns = inMemoryCampaigns.get(tenant) || new Set();
    const count = campaigns.size;
    console.log(`📊 In-memory campaign count for ${tenant}: ${count}`);
    return count;
  }
}

/**
 * Check if user can create a new campaign based on their tier limits
 */
export async function canCreateCampaign(tenant, userTier) {
  try {
    // Get tier limits
    const tierLimits = {
      starter: 5,
      professional: 25,
      enterprise: -1 // unlimited
    };
    
    const limit = tierLimits[userTier];
    
    // Enterprise has unlimited campaigns
    if (limit === -1) {
      return { allowed: true, reason: 'unlimited' };
    }
    
    // Get current campaign count
    const currentCount = await getCampaignCount(tenant);
    
    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: 'limit_exceeded',
        currentCount,
        limit,
        tier: userTier,
        upgradeUrl: userTier === 'starter' ? '/app/billing?upgrade=professional&feature=more_campaigns' : '/app/billing?upgrade=enterprise&feature=unlimited_campaigns'
      };
    }
    
    return {
      allowed: true,
      currentCount,
      limit,
      remaining: limit - currentCount
    };
    
  } catch (error) {
    console.error('Error checking campaign creation permission:', error);
    // Allow creation if check fails (safe default)
    return { allowed: true, reason: 'check_failed' };
  }
}

/**
 * Record a new campaign creation (for tracking)
 */
export async function recordCampaignCreation(tenant, campaignName, userTier) {
  try {
    console.log(`📝 Recording campaign creation: ${campaignName} for ${tenant} (${userTier})`);
    
    if (isSupabaseEnabled() && supabase) {
      // Record in Supabase
      const { error } = await supabase
        .from('campaign_configs')
        .upsert({
          tenant_id: tenant,
          campaign_name: campaignName,
          config_type: 'created',
          config_value: {
            created_at: new Date().toISOString(),
            tier: userTier,
            status: 'active'
          }
        });
        
      if (error) {
        console.error('Error recording campaign creation in Supabase:', error);
      } else {
        console.log(`✅ Campaign creation recorded in Supabase: ${campaignName}`);
      }
    }
    
    // Also record in metrics for counting
    const metricsRow = [
      new Date().toISOString(),
      'campaign',
      campaignName,
      '',
      `created_${Date.now()}`,
      campaignName,
      0, 0, 0, 0, 0
    ];
    
    // Use dual-write for metrics
    const { dualWriteMetrics } = await import('./dual-write.js');
    await dualWriteMetrics(tenant, [metricsRow]);
    
  } catch (error) {
    console.error('Error recording campaign creation:', error);
    
    // Always record in-memory as fallback
    if (!inMemoryCampaigns.has(tenant)) {
      inMemoryCampaigns.set(tenant, new Set());
    }
    inMemoryCampaigns.get(tenant).add(campaignName);
    console.log(`📝 In-memory campaign recorded: ${campaignName} for ${tenant}`);
  }
  
  // Always record in-memory for consistency
  if (!inMemoryCampaigns.has(tenant)) {
    inMemoryCampaigns.set(tenant, new Set());
  }
  inMemoryCampaigns.get(tenant).add(campaignName);
  console.log(`📝 In-memory campaign recorded: ${campaignName} for ${tenant}`);
}

/**
 * Middleware to enforce campaign limits on campaign creation endpoints
 */
export function enforceCampaignLimits() {
  return async (req, res, next) => {
    try {
      const tenant = req.query.tenant || req.body.tenant;
      const userTier = req.subscription?.tier || 'starter';
      
      if (!tenant) {
        return res.status(400).json({
          ok: false,
          error: 'tenant_required'
        });
      }
      
      const permission = await canCreateCampaign(tenant, userTier);
      
      if (!permission.allowed) {
        return res.status(402).json({
          ok: false,
          error: 'campaign_limit_exceeded',
          message: `Your ${userTier} plan allows up to ${permission.limit} campaigns. You currently have ${permission.currentCount}.`,
          currentCount: permission.currentCount,
          limit: permission.limit,
          tier: userTier,
          upgradeUrl: permission.upgradeUrl
        });
      }
      
      // Add campaign info to request
      req.campaignLimits = permission;
      next();
      
    } catch (error) {
      console.error('Campaign limit enforcement error:', error);
      // Allow creation if enforcement fails
      next();
    }
  };
}

/**
 * Clear in-memory campaigns for a tenant (testing utility)
 */
export function clearInMemoryCampaigns(tenant) {
  if (tenant) {
    inMemoryCampaigns.delete(tenant);
    console.log(`🧹 Cleared in-memory campaigns for ${tenant}`);
  } else {
    inMemoryCampaigns.clear();
    console.log(`🧹 Cleared all in-memory campaigns`);
  }
}

export default {
  getCampaignCount,
  canCreateCampaign,
  recordCampaignCreation,
  enforceCampaignLimits,
  clearInMemoryCampaigns
};