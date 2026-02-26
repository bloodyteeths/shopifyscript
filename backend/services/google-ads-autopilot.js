/**
 * Google Ads Autopilot Engine
 *
 * Replaces the Google Ads Script's `main()` function with a server-side
 * autopilot that runs full optimization cycles for every tenant.
 *
 * The engine follows a strict priority queue:
 *   1. Safety   -- pause budget-blown campaigns
 *   2. Waste    -- apply negative keywords to cut waste spend
 *   3. Optimize -- adjust bids for better efficiency
 *   4. Growth   -- increase budgets on winning campaigns
 *
 * Every action is gated by:
 *   - Tenant-level guardrails (max % change for budgets and bids)
 *   - Global quota awareness (Google Ads API daily limit)
 *   - Subscription tier frequency limits
 *
 * Dependencies:
 *   - ./google-ads-campaign-manager.js
 *   - ./google-ads-client.js
 *   - ./google-ads-quota.js
 *   - ./supabase-client.js
 *   - ./campaign-optimizer.js
 *   - ./negative-analyzer.js
 *   - ./bid-manager.js
 */

import {
  optimizeCampaign,
  getCampaignOverview,
  adjustBudgets,
} from './google-ads-campaign-manager.js';

import {
  listCampaigns,
  pauseCampaign,
  enableCampaign,
} from './google-ads-client.js';

import {
  getRemainingQuota,
  canExecute,
  allocateForTenant,
} from './google-ads-quota.js';

import { getSupabaseClient } from './supabase-client.js';

import getCampaignOptimizer, { executePlan } from './campaign-optimizer.js';
import { applyNegatives, getNegativeAnalyzer } from './negative-analyzer.js';
import { applyBidAdjustments, getBidManager } from './bid-manager.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default options for a single autopilot cycle. */
const DEFAULT_OPTIONS = {
  autoApply: false,
  aggressiveness: 'moderate',
  maxBudgetChangePercent: 20,
  maxBidChangePercent: 30,
  excludeCampaignIds: [],
};

/** Maps subscription tier IDs to autopilot run intervals (ms). */
const TIER_INTERVALS = {
  starter: 24 * 60 * 60 * 1000,       // 24 hours
  professional: 6 * 60 * 60 * 1000,   // 6 hours
  enterprise: 4 * 60 * 60 * 1000,     // 4 hours
};

/** Priority weights for action categories (higher = execute first). */
const PRIORITY = {
  SAFETY: 100,
  WASTE: 80,
  OPTIMIZE: 60,
  GROWTH: 40,
};

/** Minimum remaining quota to even attempt a cycle. */
const MIN_QUOTA_FOR_CYCLE = 10;

/**
 * Estimated API ops per campaign when running a full optimise pass.
 * listCampaigns(1) + getCampaignDetails(3) + searchTerms(1) + keywords(1) = 6
 */
const OPS_PER_CAMPAIGN = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the Supabase client or throw if unavailable.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function requireSupabase() {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase client not available');
  return sb;
}

/**
 * Write an entry to the `google_ads_operation_log` table.
 * Non-fatal -- errors are caught and logged to console.
 */
async function logOperation(tenantId, summary) {
  try {
    const supabase = requireSupabase();
    await supabase.from('google_ads_operation_log').insert({
      tenant_id: tenantId,
      operation_type: 'autopilot_action',
      operations_count: summary.opsConsumed ?? 0,
      request_summary: JSON.stringify(summary),
      response_status: summary.error ? 'error' : 'success',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[autopilot] Failed to log operation for tenant ${tenantId}:`, err.message);
  }
}

/**
 * Upsert a row in the `autopilot_runs` table to record each cycle.
 */
async function recordAutopilotRun(tenantId, runSummary) {
  try {
    const supabase = requireSupabase();
    await supabase.from('autopilot_runs').insert({
      tenant_id: tenantId,
      started_at: runSummary.startedAt,
      finished_at: runSummary.finishedAt,
      status: runSummary.status,
      campaigns_processed: runSummary.campaignsProcessed,
      actions_taken: runSummary.actionsTaken,
      actions_skipped: runSummary.actionsSkipped,
      errors: runSummary.errors,
      summary_json: JSON.stringify(runSummary),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[autopilot] Failed to record autopilot run for tenant ${tenantId}:`, err.message);
  }
}

/**
 * Clamp a number within [min, max].
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate the constrained new budget given current budget, suggested
 * budget, and the tenant's max-change-percent guardrail.
 */
function constrainBudget(currentBudget, suggestedBudget, maxChangePercent) {
  if (currentBudget <= 0) return suggestedBudget;
  const maxDelta = currentBudget * (maxChangePercent / 100);
  const delta = suggestedBudget - currentBudget;
  const clampedDelta = clamp(delta, -maxDelta, maxDelta);
  return Math.max(1, currentBudget + clampedDelta);
}

/**
 * Assign a priority score to a suggestion based on its type.
 */
function assignPriority(suggestion) {
  const type = (suggestion.type || '').toLowerCase();

  // Safety: pause / overspend
  if (type.includes('pause') || type.includes('safety') || type.includes('overspend')) {
    return PRIORITY.SAFETY;
  }

  // Waste elimination: negatives
  if (type.includes('negative') || type.includes('add_negative') || type.includes('waste')) {
    return PRIORITY.WASTE;
  }

  // Optimization: bids
  if (type.includes('bid') || type.includes('optimize')) {
    return PRIORITY.OPTIMIZE;
  }

  // Growth: budget increase / scaling
  if (type.includes('budget') || type.includes('increase_budget') || type.includes('scale') || type.includes('growth')) {
    return PRIORITY.GROWTH;
  }

  // Default -- treat as optimise
  return PRIORITY.OPTIMIZE;
}

// ---------------------------------------------------------------------------
// 1. runAutopilotCycle
// ---------------------------------------------------------------------------

/**
 * Run a full optimisation cycle for a single tenant.
 *
 * Steps:
 *   1. Check tenant has an active Google Ads connection
 *   2. Allocate API quota for this tenant
 *   3. List active campaigns
 *   4. For each campaign (within quota):
 *      a. Run optimizeCampaign() to get suggestions
 *      b. Prioritise: safety > waste > optimise > growth
 *      c. Auto-apply allowed actions; stage others for review
 *   5. Log every action
 *   6. Return summary
 *
 * @param {string} tenantId
 * @param {object} [options]
 * @returns {Promise<object>} Cycle summary
 */
export async function runAutopilotCycle(tenantId, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  const summary = {
    tenantId,
    startedAt,
    finishedAt: null,
    status: 'running',
    campaignsProcessed: 0,
    actionsTaken: 0,
    actionsSkipped: 0,
    errors: [],
    actions: [],
    skippedActions: [],
  };

  try {
    // ---- 1. Verify tenant connection ----------------------------------------
    const supabase = requireSupabase();
    const { data: connection, error: connErr } = await supabase
      .from('google_ads_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('connection_status', 'active')
      .single();

    if (connErr || !connection) {
      summary.status = 'skipped';
      summary.errors.push('No active Google Ads connection');
      summary.finishedAt = new Date().toISOString();
      await recordAutopilotRun(tenantId, summary);
      return summary;
    }

    // ---- 2. Quota allocation ------------------------------------------------
    const allocation = await allocateForTenant(tenantId);
    if (allocation < MIN_QUOTA_FOR_CYCLE) {
      summary.status = 'skipped';
      summary.errors.push(`Insufficient quota: ${allocation} ops allocated, need at least ${MIN_QUOTA_FOR_CYCLE}`);
      summary.finishedAt = new Date().toISOString();
      await recordAutopilotRun(tenantId, summary);
      return summary;
    }

    // ---- 3. Load autopilot config -------------------------------------------
    const config = await loadAutopilotConfig(tenantId);
    const mergedOpts = {
      autoApply: opts.autoApply ?? config.autoApply ?? false,
      aggressiveness: opts.aggressiveness ?? config.aggressiveness ?? 'moderate',
      maxBudgetChangePercent: opts.maxBudgetChangePercent ?? config.maxBudgetChangePercent ?? 20,
      maxBidChangePercent: opts.maxBidChangePercent ?? config.maxBidChangePercent ?? 30,
      excludeCampaignIds: [
        ...(opts.excludeCampaignIds || []),
        ...(config.excludeCampaignIds || []),
      ],
    };

    // ---- 4. List active campaigns -------------------------------------------
    let campaigns;
    try {
      campaigns = await listCampaigns(tenantId);
    } catch (err) {
      summary.status = 'error';
      summary.errors.push(`Failed to list campaigns: ${err.message}`);
      summary.finishedAt = new Date().toISOString();
      await recordAutopilotRun(tenantId, summary);
      return summary;
    }

    const activeCampaigns = campaigns.filter((c) => {
      if (c.status !== 'ENABLED') return false;
      if (mergedOpts.excludeCampaignIds.includes(c.id)) return false;
      return true;
    });

    if (activeCampaigns.length === 0) {
      summary.status = 'completed';
      summary.finishedAt = new Date().toISOString();
      await logOperation(tenantId, { event: 'no_active_campaigns' });
      await recordAutopilotRun(tenantId, summary);
      return summary;
    }

    // How many campaigns can we afford to process?
    const maxCampaigns = Math.floor(allocation / OPS_PER_CAMPAIGN);
    const campaignsToProcess = activeCampaigns.slice(0, Math.max(1, maxCampaigns));

    console.log(
      `[autopilot] Tenant ${tenantId}: processing ${campaignsToProcess.length}/${activeCampaigns.length} campaigns (quota: ${allocation} ops)`
    );

    // ---- 5. For each campaign, gather suggestions ---------------------------
    const allSuggestions = [];

    for (const campaign of campaignsToProcess) {
      // Re-check quota before each campaign
      const quotaCheck = await canExecute(OPS_PER_CAMPAIGN);
      if (!quotaCheck.allowed) {
        console.log(`[autopilot] Quota exhausted during cycle for tenant ${tenantId}`);
        summary.errors.push('Quota exhausted mid-cycle');
        break;
      }

      try {
        const result = await optimizeCampaign(tenantId, campaign.id, {
          autoApply: false, // We handle application ourselves with guardrails
          wasteThreshold: mergedOpts.aggressiveness === 'aggressive' ? 3 : 5,
        });

        summary.campaignsProcessed++;

        // Build prioritised suggestion list
        for (const suggestion of (result.suggestions || [])) {
          allSuggestions.push({
            ...suggestion,
            campaignId: campaign.id,
            campaignName: campaign.name,
            currentBudget: result.currentBudget,
            currentCost: result.currentCost,
            currentConversions: result.currentConversions,
            priority: assignPriority(suggestion),
          });
        }

        // ---- Safety check: campaign overspend --------------------------------
        if (result.currentCost > 0 && result.currentBudget > 0) {
          const spendRatio = result.currentCost / result.currentBudget;
          if (spendRatio > 1.5) {
            allSuggestions.push({
              type: 'pause_overspend',
              campaignId: campaign.id,
              campaignName: campaign.name,
              reason: `Campaign has spent $${result.currentCost.toFixed(2)} against $${result.currentBudget.toFixed(2)} budget (${(spendRatio * 100).toFixed(0)}%)`,
              spendRatio,
              priority: PRIORITY.SAFETY,
            });
          }
        }

      } catch (err) {
        console.error(`[autopilot] Failed to optimize campaign ${campaign.id} for tenant ${tenantId}:`, err.message);
        summary.errors.push(`Campaign ${campaign.id}: ${err.message}`);
      }
    }

    // ---- 6. Sort by priority, then apply ------------------------------------
    allSuggestions.sort((a, b) => b.priority - a.priority);

    for (const suggestion of allSuggestions) {
      // Final quota check before every write operation
      const canDo = await canExecute(1);
      if (!canDo.allowed) {
        summary.actionsSkipped += allSuggestions.length - summary.actionsTaken - summary.actionsSkipped;
        summary.errors.push('Quota exhausted during action application');
        break;
      }

      const action = await applySuggestion(tenantId, suggestion, mergedOpts);

      if (action.applied) {
        summary.actionsTaken++;
        summary.actions.push(action);
        await logOperation(tenantId, {
          event: 'action_applied',
          type: suggestion.type,
          campaignId: suggestion.campaignId,
          detail: action.detail,
          opsConsumed: action.opsConsumed ?? 1,
        });
      } else {
        summary.actionsSkipped++;
        summary.skippedActions.push(action);
      }
    }

    // ---- 7. Finalise --------------------------------------------------------
    summary.status = summary.errors.length > 0 ? 'completed_with_errors' : 'completed';

  } catch (err) {
    console.error(`[autopilot] Cycle failed for tenant ${tenantId}:`, err.message);
    summary.status = 'error';
    summary.errors.push(err.message);
  }

  summary.finishedAt = new Date().toISOString();
  summary.durationMs = Date.now() - startMs;

  await recordAutopilotRun(tenantId, summary);

  console.log(
    `[autopilot] Tenant ${tenantId} cycle done in ${summary.durationMs}ms — ` +
    `${summary.campaignsProcessed} campaigns, ${summary.actionsTaken} actions, ${summary.actionsSkipped} skipped`
  );

  return summary;
}

// ---------------------------------------------------------------------------
// Action application logic
// ---------------------------------------------------------------------------

/**
 * Decide whether to apply a suggestion, enforce guardrails, and execute.
 *
 * @param {string} tenantId
 * @param {object} suggestion
 * @param {object} opts  Merged autopilot options
 * @returns {Promise<object>}
 */
async function applySuggestion(tenantId, suggestion, opts) {
  const type = (suggestion.type || '').toLowerCase();

  // ------ SAFETY: always auto-apply ----------------------------------------
  if (type === 'pause_overspend' || suggestion.priority === PRIORITY.SAFETY) {
    try {
      await pauseCampaign(tenantId, suggestion.campaignId);
      return {
        applied: true,
        type: 'safety_pause',
        campaignId: suggestion.campaignId,
        detail: suggestion.reason,
        opsConsumed: 1,
      };
    } catch (err) {
      return { applied: false, type: 'safety_pause', reason: err.message };
    }
  }

  // ------ WASTE ELIMINATION: negatives -- auto-apply if autoApply is on -----
  if (type === 'add_negative') {
    if (!opts.autoApply) {
      return {
        applied: false,
        type: 'add_negative',
        campaignId: suggestion.campaignId,
        reason: 'autoApply is off -- staged for review',
        suggestion,
      };
    }

    try {
      await applyNegatives(tenantId, suggestion.campaignId, [suggestion.term]);
      return {
        applied: true,
        type: 'add_negative',
        campaignId: suggestion.campaignId,
        detail: `Added negative: "${suggestion.term}" (spent $${(suggestion.spend ?? 0).toFixed(2)} with 0 conversions)`,
        opsConsumed: 1,
      };
    } catch (err) {
      return { applied: false, type: 'add_negative', reason: err.message };
    }
  }

  // ------ BID OPTIMIZATION: always requires review unless autoApply ---------
  if (type === 'increase_bid') {
    if (!opts.autoApply) {
      return {
        applied: false,
        type: 'increase_bid',
        campaignId: suggestion.campaignId,
        reason: 'Bid changes require review -- staged',
        suggestion,
      };
    }

    // Enforce max bid change guardrail
    const currentCpc = suggestion.currentCpc || 0;
    if (currentCpc <= 0) {
      return { applied: false, type: 'increase_bid', reason: 'Current CPC unknown' };
    }

    const maxBidIncreaseFactor = 1 + (opts.maxBidChangePercent / 100);
    const suggestedNewBid = currentCpc * 1.15; // 15% increase by default
    const constrainedBid = Math.min(suggestedNewBid, currentCpc * maxBidIncreaseFactor);
    const newBidMicros = Math.round(constrainedBid * 1_000_000);

    try {
      await applyBidAdjustments(tenantId, [{
        adGroupId: suggestion.adGroupId,
        criterionId: suggestion.keywordId,
        newBidMicros,
      }]);
      return {
        applied: true,
        type: 'increase_bid',
        campaignId: suggestion.campaignId,
        detail: `Bid for "${suggestion.keywordText}": $${currentCpc.toFixed(2)} -> $${constrainedBid.toFixed(2)}`,
        opsConsumed: 1,
      };
    } catch (err) {
      return { applied: false, type: 'increase_bid', reason: err.message };
    }
  }

  // ------ BUDGET GROWTH: auto-apply only when autoApply is on ---------------
  if (type === 'increase_budget' || type === 'decrease_budget') {
    if (!opts.autoApply) {
      return {
        applied: false,
        type,
        campaignId: suggestion.campaignId,
        reason: 'Budget changes require review -- staged',
        suggestion,
      };
    }

    const currentBudget = suggestion.currentValue ?? suggestion.currentBudget ?? 0;
    const suggestedBudget = suggestion.newValue ?? currentBudget;
    const constrainedBudgetValue = constrainBudget(currentBudget, suggestedBudget, opts.maxBudgetChangePercent);

    try {
      await adjustBudgets(tenantId, suggestion.campaignId, constrainedBudgetValue);
      return {
        applied: true,
        type,
        campaignId: suggestion.campaignId,
        detail: `Budget: $${currentBudget.toFixed(2)} -> $${constrainedBudgetValue.toFixed(2)} (capped at ${opts.maxBudgetChangePercent}% change)`,
        opsConsumed: 1,
      };
    } catch (err) {
      return { applied: false, type, reason: err.message };
    }
  }

  // ------ UNKNOWN TYPE: skip ------------------------------------------------
  return {
    applied: false,
    type: type || 'unknown',
    reason: `Unhandled suggestion type: ${type}`,
    suggestion,
  };
}

// ---------------------------------------------------------------------------
// 2. getAutopilotStatus
// ---------------------------------------------------------------------------

/**
 * Return the current autopilot configuration and status for a tenant.
 *
 * @param {string} tenantId
 * @returns {Promise<object>}
 */
export async function getAutopilotStatus(tenantId) {
  const config = await loadAutopilotConfig(tenantId);
  const lastRun = await getLastAutopilotRun(tenantId);

  return {
    tenantId,
    enabled: config.enabled ?? false,
    autoApply: config.autoApply ?? false,
    aggressiveness: config.aggressiveness ?? 'moderate',
    maxBudgetChangePercent: config.maxBudgetChangePercent ?? 20,
    maxBidChangePercent: config.maxBidChangePercent ?? 30,
    excludeCampaignIds: config.excludeCampaignIds ?? [],
    lastRun: lastRun
      ? {
          status: lastRun.status,
          startedAt: lastRun.started_at,
          finishedAt: lastRun.finished_at,
          campaignsProcessed: lastRun.campaigns_processed,
          actionsTaken: lastRun.actions_taken,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// 3. setAutopilotConfig
// ---------------------------------------------------------------------------

/**
 * Save autopilot preferences for a tenant.
 *
 * @param {string} tenantId
 * @param {object} config
 * @returns {Promise<object>} The saved config row
 */
export async function setAutopilotConfig(tenantId, config) {
  const supabase = requireSupabase();

  const allowedFields = [
    'enabled',
    'autoApply',
    'aggressiveness',
    'maxBudgetChangePercent',
    'maxBidChangePercent',
    'excludeCampaignIds',
  ];

  // Sanitise input -- only keep known fields
  const sanitised = {};
  for (const key of allowedFields) {
    if (config[key] !== undefined) {
      sanitised[key] = config[key];
    }
  }

  // Validate aggressiveness
  if (sanitised.aggressiveness && !['conservative', 'moderate', 'aggressive'].includes(sanitised.aggressiveness)) {
    sanitised.aggressiveness = 'moderate';
  }

  // Validate numeric guardrails
  if (sanitised.maxBudgetChangePercent != null) {
    sanitised.maxBudgetChangePercent = clamp(Number(sanitised.maxBudgetChangePercent) || 20, 1, 100);
  }
  if (sanitised.maxBidChangePercent != null) {
    sanitised.maxBidChangePercent = clamp(Number(sanitised.maxBidChangePercent) || 30, 1, 100);
  }

  // Upsert into tenant_configs
  const { data, error } = await supabase
    .from('tenant_configs')
    .upsert(
      {
        tenant_id: tenantId,
        config_key: 'autopilot',
        config_value: JSON.stringify(sanitised),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,config_key' }
    )
    .select()
    .single();

  if (error) {
    console.error(`[autopilot] Failed to save config for tenant ${tenantId}:`, error.message);
    throw new Error(`Failed to save autopilot config: ${error.message}`);
  }

  console.log(`[autopilot] Config saved for tenant ${tenantId}:`, sanitised);
  return sanitised;
}

// ---------------------------------------------------------------------------
// 4. getAutopilotHistory
// ---------------------------------------------------------------------------

/**
 * Return recent autopilot run summaries for a tenant.
 *
 * @param {string} tenantId
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
export async function getAutopilotHistory(tenantId, limit = 20) {
  const supabase = requireSupabase();

  // Try the dedicated autopilot_runs table first
  const { data: runs, error: runsErr } = await supabase
    .from('autopilot_runs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!runsErr && runs && runs.length > 0) {
    return runs;
  }

  // Fallback: read from operation_log
  const { data: logs, error: logsErr } = await supabase
    .from('google_ads_operation_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('operation_type', 'autopilot_action')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (logsErr) {
    console.warn(`[autopilot] Failed to fetch history for tenant ${tenantId}:`, logsErr.message);
    return [];
  }

  return logs || [];
}

// ---------------------------------------------------------------------------
// 5. runAutopilotForAllTenants
// ---------------------------------------------------------------------------

/**
 * Scheduler entry-point: run autopilot for every eligible tenant.
 *
 * Flow:
 *   1. Fetch all tenants with active Google Ads connections
 *   2. Check each tenant's subscription tier for frequency eligibility
 *   3. Fairly allocate quota across tenants
 *   4. Run cycles, collecting results
 *   5. Return aggregate summary
 *
 * @returns {Promise<object>} Aggregate summary
 */
export async function runAutopilotForAllTenants() {
  const globalStart = Date.now();
  const supabase = requireSupabase();

  console.log('[autopilot] Starting global autopilot run...');

  // ---- 1. Get tenants with active connections and autopilot enabled --------
  const { data: connections, error: connErr } = await supabase
    .from('google_ads_connections')
    .select('tenant_id')
    .eq('connection_status', 'active');

  if (connErr || !connections || connections.length === 0) {
    console.log('[autopilot] No active Google Ads connections found. Nothing to do.');
    return {
      status: 'completed',
      tenantsEligible: 0,
      tenantsProcessed: 0,
      totalActions: 0,
      durationMs: Date.now() - globalStart,
    };
  }

  const tenantIds = [...new Set(connections.map((c) => c.tenant_id))];
  console.log(`[autopilot] Found ${tenantIds.length} tenant(s) with active connections`);

  // ---- 2. Check global quota ------------------------------------------------
  const globalQuota = await getRemainingQuota();
  if (globalQuota.remaining < MIN_QUOTA_FOR_CYCLE) {
    console.log(`[autopilot] Global quota too low (${globalQuota.remaining}). Aborting.`);
    return {
      status: 'skipped',
      reason: 'Global quota exhausted',
      remaining: globalQuota.remaining,
      tenantsEligible: tenantIds.length,
      tenantsProcessed: 0,
      totalActions: 0,
      durationMs: Date.now() - globalStart,
    };
  }

  // ---- 3. Filter eligible tenants by tier frequency -------------------------
  const eligibleTenants = [];

  for (const tenantId of tenantIds) {
    const eligible = await isTenantEligible(tenantId);
    if (eligible) {
      eligibleTenants.push(tenantId);
    } else {
      console.log(`[autopilot] Tenant ${tenantId} not yet eligible for next run (tier frequency)`);
    }
  }

  if (eligibleTenants.length === 0) {
    console.log('[autopilot] No tenants eligible for autopilot at this time.');
    return {
      status: 'completed',
      tenantsEligible: 0,
      tenantsProcessed: 0,
      totalActions: 0,
      durationMs: Date.now() - globalStart,
    };
  }

  console.log(`[autopilot] ${eligibleTenants.length} tenant(s) eligible for this run`);

  // ---- 4. Run cycles sequentially (preserve quota fairness) ----------------
  const results = [];
  let totalActions = 0;
  let totalErrors = 0;

  for (const tenantId of eligibleTenants) {
    // Re-check global quota before each tenant
    const currentQuota = await getRemainingQuota();
    if (currentQuota.remaining < MIN_QUOTA_FOR_CYCLE) {
      console.log(`[autopilot] Quota exhausted after processing ${results.length} tenant(s)`);
      break;
    }

    try {
      // Load tenant-specific config for the cycle
      const tenantConfig = await loadAutopilotConfig(tenantId);
      const cycleSummary = await runAutopilotCycle(tenantId, {
        autoApply: tenantConfig.autoApply ?? false,
        aggressiveness: tenantConfig.aggressiveness ?? 'moderate',
        maxBudgetChangePercent: tenantConfig.maxBudgetChangePercent ?? 20,
        maxBidChangePercent: tenantConfig.maxBidChangePercent ?? 30,
        excludeCampaignIds: tenantConfig.excludeCampaignIds ?? [],
      });

      results.push({ tenantId, ...cycleSummary });
      totalActions += cycleSummary.actionsTaken || 0;
      totalErrors += (cycleSummary.errors || []).length;
    } catch (err) {
      console.error(`[autopilot] Unhandled error for tenant ${tenantId}:`, err.message);
      results.push({ tenantId, status: 'error', error: err.message });
      totalErrors++;
    }
  }

  const aggregateSummary = {
    status: totalErrors > 0 ? 'completed_with_errors' : 'completed',
    tenantsEligible: eligibleTenants.length,
    tenantsProcessed: results.length,
    totalActions,
    totalErrors,
    results,
    durationMs: Date.now() - globalStart,
    timestamp: new Date().toISOString(),
  };

  console.log(
    `[autopilot] Global run complete: ${results.length} tenants, ${totalActions} actions, ${totalErrors} errors, ${aggregateSummary.durationMs}ms`
  );

  return aggregateSummary;
}

// ---------------------------------------------------------------------------
// Internal: config loading and eligibility
// ---------------------------------------------------------------------------

/**
 * Load autopilot config from Supabase `tenant_configs`.
 * Returns a plain object with defaults merged.
 */
async function loadAutopilotConfig(tenantId) {
  const defaults = {
    enabled: false,
    autoApply: false,
    aggressiveness: 'moderate',
    maxBudgetChangePercent: 20,
    maxBidChangePercent: 30,
    excludeCampaignIds: [],
  };

  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('tenant_configs')
      .select('config_value')
      .eq('tenant_id', tenantId)
      .eq('config_key', 'autopilot')
      .single();

    if (error || !data) return defaults;

    const parsed = typeof data.config_value === 'string'
      ? JSON.parse(data.config_value)
      : data.config_value;

    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/**
 * Fetch the most recent autopilot run for a tenant.
 */
async function getLastAutopilotRun(tenantId) {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('autopilot_runs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Determine the tenant's subscription tier.
 * Looks up `tenant_subscriptions` in Supabase.
 * Falls back to 'starter' if not found.
 *
 * @param {string} tenantId
 * @returns {Promise<string>}  e.g. 'starter', 'professional', 'enterprise'
 */
async function getTenantTier(tenantId) {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from('tenant_subscriptions')
      .select('tier')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return 'starter';
    return (data.tier || 'starter').toLowerCase();
  } catch {
    return 'starter';
  }
}

/**
 * Check whether enough time has passed since the tenant's last autopilot run,
 * based on their subscription tier.
 *
 * @param {string} tenantId
 * @returns {Promise<boolean>}
 */
async function isTenantEligible(tenantId) {
  // Must have autopilot enabled
  const config = await loadAutopilotConfig(tenantId);
  if (!config.enabled) return false;

  const tier = await getTenantTier(tenantId);
  const intervalMs = TIER_INTERVALS[tier] ?? TIER_INTERVALS.starter;

  const lastRun = await getLastAutopilotRun(tenantId);
  if (!lastRun) return true; // Never run before

  const lastRunTime = new Date(lastRun.started_at || lastRun.created_at).getTime();
  const elapsed = Date.now() - lastRunTime;

  return elapsed >= intervalMs;
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default {
  runAutopilotCycle,
  getAutopilotStatus,
  setAutopilotConfig,
  getAutopilotHistory,
  runAutopilotForAllTenants,
};
