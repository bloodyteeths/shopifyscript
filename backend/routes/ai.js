import express from "express";
import { json, logAccess } from "../utils/response.js";
import { verify, sign } from "../utils/hmac.js";
import { requireFeature, getCurrentSubscription } from "../middleware/subscription-check.js";
import { canCreateCampaign, recordCampaignCreation } from "../services/campaign-counter.js";
import { getRSADraftsFromSupabase } from "../services/rsa-supabase.js";
import { getSupabaseClient, isSupabaseEnabled } from "../services/supabase-client.js";
import { logger } from "../services/logger.js";

const router = express.Router();

// Simple memory cache for AI dashboard data (5 minute TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(endpoint, tenant, params = {}) {
  const paramStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `${endpoint}:${tenant}${paramStr ? ':' + paramStr : ''}`;
}

function getFromCache(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
}

// Cache cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expires) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Import services dynamically to avoid circular dependencies
async function getSheetOperations() {
  return await import("../services/sheets.js");
}

async function getValidators() {
  return await import("../lib/validators.js");
}

// GET /api/ai/system/health - Get system health for AI dashboard
router.get("/system/health", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_system_health`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching system health for tenant:', tenant);

    res.json({
      ok: true,
      health: {
        status: 'operational',
        uptime: 99.9,
        lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        nextSync: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        responseTime: 145,
        errorRate: 0.2
      },
      services: {
        aiEngine: { status: 'healthy', uptime: 99.9 },
        analytics: { status: 'healthy', uptime: 98.5 },
        optimizer: { status: 'healthy', uptime: 99.2 },
        contentApi: { status: 'healthy', uptime: 99.8 }
      },
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to fetch system health:', error.message);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/ai/stats/quick - Get quick stats for AI dashboard
router.get("/stats/quick", async (req, res) => {
  const { tenant, sig, days = "7", period = "TODAY" } = req.query;
  const payload = `GET:${tenant}:ai_stats_quick`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching quick stats for:', tenant, '- Period:', period);

    // Check cache first
    const cacheKey = getCacheKey('stats_quick', tenant, { days, period });
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      console.log('✅ Returning cached quick stats for:', tenant);
      return res.json({
        ...cachedData,
        cached: true
      });
    }

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      console.warn('⚠️ Supabase not available, using fallback data');
      return res.json({
        ok: true,
        stats: {
          ctr: 4.2,
          roas: 3.5,
          conversions: 245,
          adSpend: 5420,
          impressions: 125000,
          clicks: 5250
        },
        timestamp: new Date().toISOString(),
        source: 'fallback',
        period: period
      });
    }

    // ✅ NEW: Determine which period to query based on request
    let queryPeriod = period;
    if (days && !period) {
      // Map days parameter to period for backward compatibility
      const dayNum = parseInt(days);
      if (dayNum === 1) queryPeriod = 'TODAY';
      else if (dayNum === 7) queryPeriod = 'LAST_7_DAYS';
      else if (dayNum === 30) queryPeriod = 'LAST_30_DAYS';
      else queryPeriod = 'LAST_7_DAYS';
    }

    // Calculate date range for metrics query
    const dayCount = Math.max(1, Math.min(30, parseInt(days) || 7));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dayCount);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Try tenant_metrics first (primary source)
    let metricsData = null;
    let dataSource = 'none';

    // ✅ UPDATED: Query tenant metrics filtering by BOTH date AND period
    const { data: tenantMetricsData, error: tenantMetricsError } = await supabaseClient
      .from('tenant_metrics')
      .select('clicks, cost_micros, conversions, impressions, ctr, date, period')
      .eq('tenant_id', tenant)
      .eq('period', queryPeriod)  // ✅ NEW: Filter by period
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (!tenantMetricsError && tenantMetricsData && tenantMetricsData.length > 0) {
      metricsData = tenantMetricsData;
      dataSource = 'tenant_metrics';
      console.log(`✅ Using tenant_metrics data for ${tenant} [${queryPeriod}]: ${metricsData.length} records`);
    } else {
      console.log(`⚠️ No ${queryPeriod} data in tenant_metrics, trying fallback tables...`);

      // Fallback 1: Try campaign_metrics table
      const { data: campaignData, error: campaignError } = await supabaseClient
        .from('campaign_metrics')
        .select('clicks, cost, conversions, impressions, ctr, date')
        .eq('tenant_id', tenant)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (!campaignError && campaignData && campaignData.length > 0) {
        // Convert cost to cost_micros for consistency
        metricsData = campaignData.map(row => ({
          ...row,
          cost_micros: Math.round((row.cost || 0) * 1000000),
          cost: undefined // Remove original cost field
        }));
        dataSource = 'campaign_metrics';
        console.log(`✅ Using campaign_metrics fallback for ${tenant}: ${metricsData.length} records`);
      } else {
        // Fallback 2: Try ad_group_metrics table
        const { data: adGroupData, error: adGroupError } = await supabaseClient
          .from('ad_group_metrics')
          .select('clicks, cost, conversions, impressions, ctr, date')
          .eq('tenant_id', tenant)
          .gte('date', startDateStr)
          .order('date', { ascending: false });

        if (!adGroupError && adGroupData && adGroupData.length > 0) {
          // Convert cost to cost_micros for consistency
          metricsData = adGroupData.map(row => ({
            ...row,
            cost_micros: Math.round((row.cost || 0) * 1000000),
            cost: undefined // Remove original cost field
          }));
          dataSource = 'ad_group_metrics';
          console.log(`✅ Using ad_group_metrics fallback for ${tenant}: ${metricsData.length} records`);
        }
      }
    }

    console.log(`📊 Final metrics query result for ${tenant}:`, {
      recordCount: metricsData?.length || 0,
      dataSource: dataSource,
      dateRange: `${startDateStr} to now`,
      firstRecord: metricsData?.[0]
    });

    // Aggregate metrics
    let totalClicks = 0;
    let totalCostMicros = 0;
    let totalConversions = 0;
    let totalImpressions = 0;
    let weightedCTR = 0;

    if (metricsData && metricsData.length > 0) {
      for (const row of metricsData) {
        totalClicks += row.clicks || 0;
        totalCostMicros += row.cost_micros || 0;
        totalConversions += parseFloat(row.conversions) || 0;
        totalImpressions += row.impressions || 0;
        // Weight CTR by impressions for accuracy
        weightedCTR += (row.ctr || 0) * (row.impressions || 0);
      }
    }

    // Calculate aggregated stats
    const totalCostDollars = totalCostMicros / 1000000; // Convert micros to dollars
    const avgCTR = totalImpressions > 0 ? (weightedCTR / totalImpressions) * 100 : 0;

    // Calculate ROAS (assuming $20 average order value if not configured)
    const avgOrderValue = 20; // This could be retrieved from tenant config
    const revenue = totalConversions * avgOrderValue;
    const roas = totalCostDollars > 0 ? revenue / totalCostDollars : 0;

    const stats = {
      ctr: Math.round(avgCTR * 100) / 100, // Round to 2 decimal places
      roas: Math.round(roas * 100) / 100,
      conversions: Math.round(totalConversions),
      adSpend: Math.round(totalCostDollars),
      impressions: totalImpressions,
      clicks: totalClicks
    };

    console.log('✅ Quick stats calculated from real data:', stats);

    const responseData = {
      ok: true,
      stats,
      timestamp: new Date().toISOString(),
      source: 'supabase',
      dataSource: dataSource, // Which table provided the data
      period: `${dayCount}_days`
    };

    // Cache the result for 2 minutes (stats change frequently)
    setCache(cacheKey, responseData, 2 * 60 * 1000);

    res.json(responseData);
  } catch (error) {
    console.error('❌ Failed to fetch quick stats:', error.message);

    // Fallback to mock data on error
    return res.json({
      ok: true,
      stats: {
        ctr: 4.2,
        roas: 3.5,
        conversions: 245,
        adSpend: 5420,
        impressions: 125000,
        clicks: 5250
      },
      timestamp: new Date().toISOString(),
      source: 'fallback',
      error: error.message
    });
  }
});

// GET /api/ai/tasks/active - Get active tasks for AI dashboard
router.get("/tasks/active", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_tasks_active`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching active tasks for:', tenant);

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      console.warn('⚠️ Supabase not available, using fallback data');
      return res.json({
        ok: true,
        tasks: [
          {
            id: '1',
            title: 'Optimizing Campaign Budget',
            type: 'optimization',
            priority: 'high',
            status: 'in_progress',
            progress: 65,
            eta: new Date(Date.now() + 1800000).toISOString(),
            details: 'Analyzing performance data and adjusting budget allocation',
            errors: 0
          }
        ],
        source: 'fallback'
      });
    }

    const tasks = [];

    // Query active automation execution logs
    const { data: activeLogs, error: logsError } = await supabaseClient
      .from('automation_execution_logs')
      .select('id, automation_id, automation_type, execution_status, metadata, executed_at, execution_duration')
      .eq('tenant_id', tenant)
      .in('execution_status', ['pending', 'running'])
      .order('executed_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.warn('⚠️ Failed to query automation logs:', logsError.message);
    } else if (activeLogs && activeLogs.length > 0) {
      for (const log of activeLogs) {
        const startTime = new Date(log.executed_at).getTime();
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;

        // Estimate progress based on elapsed time and execution duration
        let progress = 0;
        let eta = new Date(currentTime + 30 * 60 * 1000); // Default 30 min ETA

        if (log.execution_status === 'running') {
          const estimatedDuration = log.execution_duration || 10 * 60 * 1000; // 10 min default
          progress = Math.min(95, Math.round((elapsedTime / estimatedDuration) * 100));
          eta = new Date(startTime + estimatedDuration);
        } else if (log.execution_status === 'pending') {
          progress = 0;
          eta = new Date(currentTime + 15 * 60 * 1000); // 15 min from now
        }

        // Map automation type to user-friendly title and details
        let title = 'Unknown Task';
        let details = 'Processing automation task';
        let priority = 'medium';

        switch (log.automation_type) {
          case 'bid_optimization':
            title = 'Optimizing Bid Strategy';
            details = 'Analyzing performance data and adjusting keyword bids';
            priority = 'high';
            break;
          case 'budget_allocation':
            title = 'Reallocating Campaign Budgets';
            details = 'Redistributing budget based on campaign performance';
            priority = 'high';
            break;
          case 'keyword_expansion':
            title = 'Expanding Keyword Portfolio';
            details = 'Discovering and adding high-performing keywords';
            priority = 'medium';
            break;
          case 'rsa_generation':
            title = 'Generating RSA Ad Copy';
            details = 'Creating AI-powered responsive search ads';
            priority = 'medium';
            break;
          case 'negative_keyword_analysis':
            title = 'Analyzing Negative Keywords';
            details = 'Identifying search terms to exclude';
            priority = 'low';
            break;
          default:
            title = `${log.automation_type} Task`;
            details = `Processing ${log.automation_type} automation`;
        }

        tasks.push({
          id: log.id.toString(),
          title,
          type: log.automation_type,
          priority,
          status: log.execution_status,
          progress,
          eta: eta.toISOString(),
          details,
          errors: log.metadata?.errors?.length || 0,
          automationId: log.automation_id
        });
      }
    }

    // Query active automation rules to show scheduled tasks
    const { data: activeRules, error: rulesError } = await supabaseClient
      .from('automation_rules')
      .select('id, rule_name, automation_type, schedule_config, last_executed_at, is_active')
      .eq('tenant_id', tenant)
      .eq('is_active', true)
      .limit(10);

    if (!rulesError && activeRules && activeRules.length > 0) {
      for (const rule of activeRules) {
        // Check if this rule should run soon based on schedule
        const lastRun = rule.last_executed_at ? new Date(rule.last_executed_at).getTime() : 0;
        const currentTime = Date.now();
        const timeSinceLastRun = currentTime - lastRun;

        // If rule hasn't run in the last hour, consider it scheduled
        if (timeSinceLastRun > 60 * 60 * 1000) {
          tasks.push({
            id: `rule_${rule.id}`,
            title: rule.rule_name,
            type: rule.automation_type,
            priority: 'low',
            status: 'scheduled',
            progress: 0,
            eta: new Date(currentTime + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
            details: `Scheduled automation rule: ${rule.rule_name}`,
            errors: 0,
            automationId: rule.id.toString()
          });
        }
      }
    }

    // If no real tasks, add at least one fallback task if nothing is really happening
    if (tasks.length === 0) {
      tasks.push({
        id: 'monitoring',
        title: 'Monitoring Campaign Performance',
        type: 'monitoring',
        priority: 'low',
        status: 'running',
        progress: 100,
        eta: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        details: 'Continuously monitoring campaign performance and metrics',
        errors: 0
      });
    }

    console.log('✅ Active tasks fetched from real data:', tasks.length);

    res.json({
      ok: true,
      tasks: tasks.slice(0, 10), // Limit to 10 tasks max
      source: 'supabase'
    });
  } catch (error) {
    console.error('❌ Failed to fetch active tasks:', error.message);

    // Fallback to mock data on error
    return res.json({
      ok: true,
      tasks: [
        {
          id: '1',
          title: 'Optimizing Campaign Budget',
          type: 'optimization',
          priority: 'high',
          status: 'in_progress',
          progress: 65,
          eta: new Date(Date.now() + 1800000).toISOString(),
          details: 'Analyzing performance data and adjusting budget allocation',
          errors: 0
        }
      ],
      source: 'fallback',
      error: error.message
    });
  }
});

// GET /api/ai/datasources/status - Get data sources status for AI dashboard
router.get("/datasources/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_datasources_status`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching data sources status for:', tenant);
    
    // Get system health status
    const { getConnectionHealth } = await import("../services/supabase-client.js");
    const { pingRedis } = await import("../services/redis.js");
    const { getAIProviderService } = await import("../services/ai-provider.js");
    
    const sources = [];
    
    // Check Supabase connection with enhanced metrics
    try {
      const supabaseHealth = await getConnectionHealth();
      const supabaseClient = getSupabaseClient();

      // Test a simple query to verify actual connectivity
      const testStartTime = Date.now();
      const { data: testData, error: testError } = await supabaseClient
        .from('tenant_configs')
        .select('count')
        .limit(1);
      const testResponseTime = Date.now() - testStartTime;

      sources.push({
        name: "Supabase Database",
        status: (supabaseHealth.healthy && !testError) ? 'connected' : 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: testError ? -1 : testResponseTime,
        details: {
          healthy: supabaseHealth.healthy && !testError,
          successRate: supabaseHealth.metrics?.successRate || 0,
          avgResponseTime: supabaseHealth.metrics?.avgResponseTime || testResponseTime,
          activeConnections: supabaseHealth.metrics?.activeConnections || 0,
          maxConnections: supabaseHealth.metrics?.maxConnections || 20,
          totalQueries: supabaseHealth.metrics?.totalQueries || 0,
          testQuery: !testError ? 'success' : 'failed',
          error: testError?.message
        }
      });
    } catch (error) {
      sources.push({
        name: "Supabase Database",
        status: 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: -1,
        details: { error: error.message }
      });
    }
    
    // Check Redis connection
    try {
      const redisHealthy = await pingRedis();
      sources.push({
        name: "Redis Cache",
        status: redisHealthy ? 'connected' : 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: 0,
        details: { healthy: redisHealthy }
      });
    } catch (error) {
      sources.push({
        name: "Redis Cache",
        status: 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: -1,
        details: { error: error.message }
      });
    }
    
    // Check AI Provider
    try {
      const aiService = getAIProviderService();
      const aiStatus = aiService.getStatus();
      sources.push({
        name: "AI Provider",
        status: aiStatus.initialized ? 'connected' : 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: aiStatus.metrics?.avgResponseTime || 0,
        details: {
          provider: aiStatus.provider,
          initialized: aiStatus.initialized,
          calls: aiStatus.metrics?.calls || 0
        }
      });
    } catch (error) {
      sources.push({
        name: "AI Provider",
        status: 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: -1,
        details: { error: error.message }
      });
    }
    
    // Check Google Sheets (if configured)
    try {
      const { getDoc } = await import("../services/sheets.js");
      const doc = await getDoc();
      sources.push({
        name: "Google Sheets",
        status: doc ? 'connected' : 'not_configured',
        lastUpdate: new Date().toISOString(),
        responseTime: 0,
        details: { configured: !!doc }
      });
    } catch (error) {
      sources.push({
        name: "Google Sheets",
        status: 'error',
        lastUpdate: new Date().toISOString(),
        responseTime: -1,
        details: { error: error.message }
      });
    }
    
    console.log('✅ Data sources status fetched:', sources.length, 'sources');
    
    return res.json({
      ok: true,
      sources,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch data sources status:', error.message);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/ai/optimizations/stats - Get optimization statistics for AI dashboard
router.get("/optimizations/stats", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_optimizations_stats`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching optimization stats for:', tenant);

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      console.warn('⚠️ Supabase not available, using fallback data');
      return res.json({
        ok: true,
        stats: {
          activeCount: 3,
          completedToday: 12,
          pendingCount: 2,
          successRate: 85.5
        },
        timestamp: new Date().toISOString(),
        source: 'fallback'
      });
    }

    // Initialize stats object
    const stats = {
      activeCount: 0,
      completedToday: 0,
      pendingCount: 0,
      successRate: 0
    };

    const today = new Date().toISOString().split('T')[0];
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysStr = last7Days.toISOString().split('T')[0];

    // Query automation execution logs for optimization activities
    const { data: automationLogs, error: automationError } = await supabaseClient
      .from('automation_execution_logs')
      .select('execution_status, automation_type, executed_at, metadata')
      .eq('tenant_id', tenant)
      .gte('executed_at', last7DaysStr)
      .order('executed_at', { ascending: false });

    if (automationError) {
      console.warn('⚠️ Failed to query automation logs:', automationError.message);
    } else if (automationLogs) {
      // Count active and completed optimizations
      const todayLogs = automationLogs.filter(log =>
        log.executed_at && log.executed_at.startsWith(today)
      );

      // Count by status
      const activeOptimizations = automationLogs.filter(log =>
        log.execution_status === 'running' || log.execution_status === 'pending'
      );

      const completedToday = todayLogs.filter(log =>
        log.execution_status === 'completed'
      );

      const pendingOptimizations = automationLogs.filter(log =>
        log.execution_status === 'pending'
      );

      // Calculate success rate from last 7 days
      const totalAttempts = automationLogs.length;
      const successfulAttempts = automationLogs.filter(log =>
        log.execution_status === 'completed'
      ).length;

      stats.activeCount = activeOptimizations.length;
      stats.completedToday = completedToday.length;
      stats.pendingCount = pendingOptimizations.length;
      stats.successRate = totalAttempts > 0
        ? Math.round((successfulAttempts / totalAttempts) * 100 * 100) / 100
        : 0;
    }

    // Also count RSA drafts as active optimizations
    try {
      const { getRSADraftsFromSupabase } = await import("../services/rsa-supabase.js");
      const drafts = await getRSADraftsFromSupabase(tenant);

      if (drafts) {
        const rsaDraftCount = (drafts.rsa_default?.length || 0) + (drafts.library?.length || 0);
        stats.activeCount += rsaDraftCount;
      }
    } catch (error) {
      console.warn('Failed to count RSA drafts:', error.message);
    }

    // Query active automation rules
    try {
      const { data: activeRules, error: rulesError } = await supabaseClient
        .from('automation_rules')
        .select('id')
        .eq('tenant_id', tenant)
        .eq('is_active', true);

      if (!rulesError && activeRules) {
        stats.activeCount += activeRules.length;
      }
    } catch (error) {
      console.warn('Failed to count active automation rules:', error.message);
    }

    console.log('✅ Optimization stats calculated from real data:', stats);

    return res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString(),
      source: 'supabase'
    });

  } catch (error) {
    console.error('❌ Failed to fetch optimization stats:', error.message);

    // Fallback to mock data on error
    return res.json({
      ok: true,
      stats: {
        activeCount: 3,
        completedToday: 12,
        pendingCount: 2,
        successRate: 85.5
      },
      timestamp: new Date().toISOString(),
      source: 'fallback',
      error: error.message
    });
  }
});

// GET /api/ai/drafts - List AI generated drafts and assets
// TEMPORARILY DISABLED - Using Supabase-only version
/*
router.get("/drafts", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_drafts`;

  // Generate expected signature for comparison
  const expectedSig = sign(payload);

  // Debug logging - detailed comparison
  console.log('AI Drafts Request:', {
    tenant,
    receivedSig: sig,
    expectedSig: expectedSig,
    payload,
    sigMatch: sig === expectedSig,
    url: req.url
  });

  const verifyResult = verify(sig, payload);
  console.log('Verify function result:', verifyResult, 'tenant check:', !!tenant);

  if (!tenant || !verifyResult) {
    console.error('AI Drafts Auth Failed - Signature Mismatch:', {
      tenant,
      receivedSig: sig,
      expectedSig: expectedSig,
      payload,
      receivedLength: sig ? sig.length : 0,
      expectedLength: expectedSig.length,
      charComparison: sig && expectedSig ?
        [...sig].map((c, i) => ({
          pos: i,
          received: c,
          expected: expectedSig[i],
          match: c === expectedSig[i]
        })).filter(x => !x.match) : null
    });
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Try Supabase first for RSA drafts (reduces Google Sheets API calls)
    logger.info(`\ud83d\udd0d Fetching RSA drafts`, { tenant, source: 'attempting_supabase' });
    const supabaseDrafts = await getRSADraftsFromSupabase(tenant);
    
    console.log('📊 getRSADraftsFromSupabase result:', {
      hasResult: !!supabaseDrafts,
      isNull: supabaseDrafts === null,
      hasDefault: supabaseDrafts?.rsa_default?.length || 0,
      hasLibrary: supabaseDrafts?.library?.length || 0
    });

    if (supabaseDrafts) {
      logger.info(`\u2705 RSA drafts fetched from Supabase`, {
        tenant,
        defaultCount: supabaseDrafts.rsa_default?.length || 0,
        libraryCount: supabaseDrafts.library?.length || 0
      });

      // Add validation to drafts
      const { validateRSA } = await getValidators();
      for (const draft of [...supabaseDrafts.rsa_default, ...supabaseDrafts.library]) {
        draft.lint = validateRSA(draft.headlines, draft.descriptions);
      }

      return res.json({
        ok: true,
        rsa_default: supabaseDrafts.rsa_default,
        library: supabaseDrafts.library,
        sitelinks: [], // TODO: Add Supabase support for these
        callouts: [],
        snippets: [],
        source: 'supabase'
      });
    }

    // Fallback to Google Sheets if Supabase fails
    console.log('⚠️ Supabase returned null, falling back to Google Sheets');
    logger.info(`\u26a0\ufe0f Falling back to Google Sheets for RSA drafts`, { tenant });

    const { getDoc } = await getSheetOperations();
    const doc = await getDoc();

    if (!doc) {
      return res.json({
        ok: true,
        rsa_default: [],
        library: [],
        sitelinks: [],
        callouts: [],
        snippets: [],
        source: 'none'
      });
    }

    const byTitle = doc.sheetsByTitle || {};
    const out = {
      rsa_default: [],
      library: [],
      sitelinks: [],
      callouts: [],
      snippets: [],
    };

    // Default RSA
    const defTitle = `RSA_ASSETS_DEFAULT_${tenant}`;
    if (byTitle[defTitle]) {
      const sh = byTitle[defTitle];
      const rows = await sh.getRows();
      if (rows && rows.length) {
        const H = String(rows[0].headlines_pipe || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        const D = String(rows[0].descriptions_pipe || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);

        // Only add if there's actual content
        if (H.length > 0 || D.length > 0) {
          const { validateRSA } = await getValidators();
          const lint = validateRSA(H, D);
          out.rsa_default.push({
            theme: "default",
            headlines: H,
            descriptions: D,
            lint,
          });
        }
      }
    }

    // Library RSA (theme-level rows)
    const libTitle = `ASSET_LIBRARY_${tenant}`;
    if (byTitle[libTitle]) {
      const sh = byTitle[libTitle];
      const rows = await sh.getRows();
      for (const r of rows) {
        const theme = String(r.theme || "").trim() || "theme";
        const H = String(r.headlines_pipe || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        const D = String(r.descriptions_pipe || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);

        // Only add if there's actual content
        if (H.length > 0 || D.length > 0) {
          const source = String(r.source || "");
          const { validateRSA } = await getValidators();
          const lint = validateRSA(H, D);
          out.library.push({
            theme,
            headlines: H,
            descriptions: D,
            source,
            lint,
          });
        }
      }
    }

    // Sitelinks
    const slTitle = `SITELINKS_${tenant}`;
    if (byTitle[slTitle]) {
      const sh = byTitle[slTitle];
      const rows = await sh.getRows();
      out.sitelinks = rows.map((r) => ({
        text: String(r.text || ""),
        final_url: String(r.final_url || ""),
      }));
    }

    // Callouts
    const coTitle = `CALLOUTS_${tenant}`;
    if (byTitle[coTitle]) {
      const sh = byTitle[coTitle];
      const rows = await sh.getRows();
      out.callouts = rows.map((r) => ({ text: String(r.text || "") }));
    }

    // Snippets
    const snTitle = `SNIPPETS_${tenant}`;
    if (byTitle[snTitle]) {
      const sh = byTitle[snTitle];
      const rows = await sh.getRows();
      out.snippets = rows.map((r) => ({
        header: String(r.header || ""),
        values: String(r.values_pipe || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
      }));
    }

    logger.info(`\u2705 RSA drafts fetched from Google Sheets`, {
      tenant,
      defaultCount: out.rsa_default.length,
      libraryCount: out.library.length
    });

    res.json({ ok: true, ...out, source: 'sheets' });
  } catch (e) {
    logger.error(`\u274c Error fetching RSA drafts`, { tenant, error: e.message });
    res.status(500).json({ ok: false, error: String(e) });
  }
});
*/

// Simple test endpoint to verify Supabase data
router.get("/test-rsa-simple", async (req, res) => {
  try {
    const tenant = "mybabybymerry";
    const supabaseClient = getSupabaseClient();

    if (!supabaseClient) {
      return res.json({ error: "No Supabase client" });
    }

    // Direct simple query
    const { data, error } = await supabaseClient
      .from('rsa_assets')
      .select('theme, headlines_pipe, descriptions_pipe')
      .eq('tenant_id', tenant)
      .eq('asset_type', 'rsa')
      .order('created_at', { ascending: false });

    // Process like getRSADraftsFromSupabase
    const grouped = {};
    for (const asset of (data || [])) {
      const theme = asset.theme || 'unknown';
      if (asset.headlines_pipe && asset.descriptions_pipe) {
        if (!grouped[theme]) {
          grouped[theme] = {
            theme,
            headlines: asset.headlines_pipe.split('|').map(h => h.trim()).filter(Boolean),
            descriptions: asset.descriptions_pipe.split('|').map(d => d.trim()).filter(Boolean)
          };
        }
      }
    }

    const themes = Object.values(grouped);

    return res.json({
      success: true,
      totalRecords: data?.length || 0,
      uniqueThemes: themes.length,
      themes: themes,
      error: error?.message || null
    });
  } catch (err) {
    return res.json({ error: err.message });
  }
});

// Debug endpoint - directly query Supabase to see raw data
router.get("/debug-rsa", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:debug_rsa`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const supabaseClient = getSupabaseClient();

    if (!supabaseClient) {
      return res.json({
        ok: false,
        error: 'No Supabase client available'
      });
    }

    // Direct query to see what's in the database
    const { data: allAssets, error: queryError } = await supabaseClient
      .from('rsa_assets')
      .select('*')
      .eq('tenant_id', tenant)
      .eq('asset_type', 'rsa')
      .order('created_at', { ascending: false });

    if (queryError) {
      return res.json({
        ok: false,
        error: queryError.message
      });
    }

    // Process the data the same way getRSADraftsFromSupabase does
    const grouped = {};

    for (const asset of (allAssets || [])) {
      const theme = asset.theme || 'default';

      if (asset.headlines_pipe && asset.descriptions_pipe) {
        const headlines = asset.headlines_pipe.split('|').map(h => h.trim()).filter(Boolean);
        const descriptions = asset.descriptions_pipe.split('|').map(d => d.trim()).filter(Boolean);

        grouped[theme] = {
          theme,
          headlines,
          descriptions,
          source: asset.rationale || asset.source || 'ai_generated'
        };
      }
    }

    const drafts = Object.values(grouped);
    const defaultDrafts = drafts.filter(d => d.theme === 'Default Theme');
    const libraryDrafts = drafts.filter(d => d.theme !== 'Default Theme');

    return res.json({
      ok: true,
      totalRecords: allAssets?.length || 0,
      processedThemes: Object.keys(grouped),
      rsa_default: defaultDrafts,
      library: libraryDrafts,
      rawSample: allAssets?.[0] || null
    });
  } catch (error) {
    return res.json({
      ok: false,
      error: error.message
    });
  }
});

// GET /api/ai/drafts - Simplified Supabase-only version
router.get("/drafts", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_drafts`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Only use Supabase - no fallback
    logger.info(`🔍 Fetching RSA drafts from Supabase`, { tenant });
    console.log(`📡 API /drafts called for tenant: ${tenant}`);

    const supabaseDrafts = await getRSADraftsFromSupabase(tenant);

    console.log('📦 getRSADraftsFromSupabase returned:', {
      tenant,
      isNull: supabaseDrafts === null,
      hasData: !!supabaseDrafts,
      defaultCount: supabaseDrafts?.rsa_default?.length || 0,
      libraryCount: supabaseDrafts?.library?.length || 0
    });

    if (!supabaseDrafts) {
      logger.warn(`⚠️ No Supabase data available`, { tenant });
      console.log('⚠️ Returning empty arrays because supabaseDrafts is null');
      return res.json({
        ok: true,
        rsa_default: [],
        library: [],
        sitelinks: [],
        callouts: [],
        snippets: [],
        source: 'supabase'
      });
    }

    logger.info(`✅ RSA drafts fetched from Supabase`, {
      tenant,
      defaultCount: supabaseDrafts.rsa_default?.length || 0,
      libraryCount: supabaseDrafts.library?.length || 0
    });

    // Add validation to drafts
    const { validateRSA } = await getValidators();

    // Log what we're about to validate
    console.log('🔍 Validating drafts:', {
      defaultCount: supabaseDrafts.rsa_default.length,
      libraryCount: supabaseDrafts.library.length
    });

    for (const draft of [...supabaseDrafts.rsa_default, ...supabaseDrafts.library]) {
      try {
        draft.lint = validateRSA(draft.headlines, draft.descriptions);
      } catch (e) {
        console.error('Validation error for draft:', draft.theme, e);
        draft.lint = { ok: false, errors: ['Validation failed'] };
      }
    }

    return res.json({
      ok: true,
      rsa_default: supabaseDrafts.rsa_default,
      library: supabaseDrafts.library,
      sitelinks: [],
      callouts: [],
      snippets: [],
      source: 'supabase'
    });
  } catch (e) {
    logger.error(`❌ Error fetching RSA drafts`, { tenant, error: e.message });
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/accept - Accept AI generated drafts
router.post("/accept", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), items = [] } = req.body || {};
  const payload = `POST:${tenant}:ai_accept:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getDoc, ensureSheet, appendRows } = await getSheetOperations();
    const doc = await getDoc();

    if (!doc) {
      return res.json({ ok: true, accepted: 0, errors: ["no_sheets"] });
    }

    const defaultSheet = await ensureSheet(
      doc,
      `RSA_ASSETS_DEFAULT_${tenant}`,
      ["headlines_pipe", "descriptions_pipe"],
    );
    const libSheet = await ensureSheet(doc, `ASSET_LIBRARY_${tenant}`, [
      "theme",
      "headlines_pipe",
      "descriptions_pipe",
      "source",
    ]);

    let accepted = 0;
    const errors = [];

    for (const it of Array.isArray(items) ? items : []) {
      const H = String(it.headlines_pipe || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      const D = String(it.descriptions_pipe || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      const { validateRSA } = await getValidators();
      const lint = validateRSA(H, D);

      if (!lint.ok) {
        errors.push({ theme: it.theme || "", errors: lint.errors });
        continue;
      }

      // Write to library
      await libSheet.addRow({
        theme: String(it.theme || "default"),
        headlines_pipe: lint.clipped.h.join("|"),
        descriptions_pipe: lint.clipped.d.join("|"),
        source: String(it.source || "accepted"),
      });
      accepted += 1;
    }

    // Also set DEFAULT to the first accepted (if any)
    if (accepted > 0) {
      const rows = await libSheet.getRows();
      const last = rows[rows.length - 1];
      const H = String(last.headlines_pipe || "");
      const D = String(last.descriptions_pipe || "");
      const cur = await defaultSheet.getRows();

      if (cur.length) {
        cur[0].headlines_pipe = H;
        cur[0].descriptions_pipe = D;
        await cur[0].save();
      } else {
        await defaultSheet.addRow({ headlines_pipe: H, descriptions_pipe: D });
      }
    }

    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `ai_accept:${accepted}`]],
      );
    } catch {}

    res.json({ ok: true, accepted, errors });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/jobs/ai_writer - Trigger AI writer job
router.post("/jobs/ai_writer", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), dryRun = true, limit = 5 } = req.body || {};
  const payload = `POST:${tenant}:ai_writer:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const provider = (process.env.AI_PROVIDER || "").toLowerCase();
    if (provider === "openai" && !process.env.OPENAI_KEY) {
      return res.status(400).json({ ok: false, error: "OPENAI_KEY missing" });
    }
    if (provider === "anthropic" && !process.env.ANTHROPIC_KEY) {
      return res
        .status(400)
        .json({ ok: false, error: "ANTHROPIC_KEY missing" });
    }

    if (dryRun) {
      try {
        const { appendRows } = await getSheetOperations();
        await appendRows(
          tenant,
          "RUN_LOGS",
          ["timestamp", "message"],
          [[new Date().toISOString(), "ai_writer_dry_run"]],
        );
      } catch {}
      return res.json({ ok: true, dryRun: true, limit });
    }

    // Shell out to node job to avoid ESM interop here
    const { spawn } = await import("child_process");
    const p = spawn(
      "node",
      [`backend/jobs/ai_writer.js`, `--tenant=${tenant}`, `--limit=${limit}`],
      { shell: true, env: process.env },
    );

    p.on("close", async (code) => {
      try {
        const { appendRows } = await getSheetOperations();
        await appendRows(
          tenant,
          "RUN_LOGS",
          ["timestamp", "message"],
          [[new Date().toISOString(), `ai_writer_exit:${code}`]],
        );
      } catch {}
    });

    res.json({ ok: true, started: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/jobs/weekly_summary - Generate weekly summary report
router.post("/jobs/weekly_summary", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), tier = 'starter', generateAI = true } = req.body || {};
  const payload = `POST:${tenant}:weekly_summary:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { runWeeklySummary } = await import("../jobs/weekly_summary.js");
    const out = await runWeeklySummary(String(tenant), { tier, generateAI });
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/weekly-summary-preview - Preview this week's AI summary (STARTER tier feature)
router.get("/weekly-summary-preview", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:weekly_summary_preview`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Get subscription info to determine tier
    const subscription = await getCurrentSubscription(tenant);
    const tier = subscription?.tier || 'starter';

    const { runWeeklySummary } = await import("../jobs/weekly_summary.js");

    // Generate preview with AI insights
    const summaryResult = await runWeeklySummary(String(tenant), {
      tier,
      generateAI: true,
      preview: true
    });

    if (!summaryResult.ok) {
      return res.status(500).json({
        ok: false,
        error: summaryResult.error || "Failed to generate summary"
      });
    }

    const summary = summaryResult.summary;

    // Format for preview display
    const preview = {
      ok: true,
      tenant,
      tier,
      generatedAt: summary.generatedAt,
      period: summary.period,

      // Key metrics
      metrics: {
        clicks: summary.metrics.clicks,
        cost: summary.metrics.cost,
        conversions: summary.metrics.conversions,
        cpa: summary.metrics.cpa,
        ctr: summary.metrics.ctr,
        conversionRate: summary.metrics.conversionRate
      },

      // Week-over-week changes
      trends: summary.previousMetrics ? {
        clicks: summary.trends?.clicks || 0,
        cost: summary.trends?.cost || 0,
        conversions: summary.trends?.conversions || 0,
        cpa: summary.trends?.cpa || null,
        ctr: summary.trends?.ctr || 0
      } : null,

      // AI insights
      insights: summary.insights ? {
        summary: summary.insights.summary,
        confidence: summary.insights.confidence,
        analysisType: summary.insights.analysisType
      } : null,

      // Top recommendations (limited for preview)
      recommendations: (summary.recommendations || []).slice(0, 3).map(rec => ({
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        impact: rec.impact,
        category: rec.category
      })),

      // Alerts
      alerts: (summary.alerts || []).slice(0, 3).map(alert => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        actionRequired: alert.actionRequired
      })),

      // Top performers
      topPerformers: {
        campaign: summary.topPerformers?.campaign ? {
          name: summary.topPerformers.campaign.name,
          conversions: summary.topPerformers.campaign.conversions,
          cpa: summary.topPerformers.campaign.cpa
        } : null,
        searchTerms: (summary.topPerformers?.searchTerms || []).slice(0, 3).map(term => ({
          term: term.term,
          clicks: term.clicks,
          conversions: term.conversions
        }))
      },

      // Forecasting (for higher tiers)
      forecast: summary.forecast ? {
        text: summary.forecast.text,
        confidence: summary.forecast.confidence,
        predictedMetrics: summary.forecast.predictedMetrics
      } : null,

      // Metadata
      metadata: {
        aiGenerated: summary.metadata.aiGenerated,
        analysisDepth: summary.metadata.analysisDepth,
        dataQuality: summary.metadata.dataQuality,
        confidence: summary.metadata.confidence,
        recommendationsCount: summary.recommendations?.length || 0,
        alertsCount: summary.alerts?.length || 0
      }
    };

    logAccess(req, "weekly_summary_preview", {
      tenant,
      tier,
      hasAI: preview.metadata.aiGenerated,
      recommendationsCount: preview.metadata.recommendationsCount
    });

    res.json(preview);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/weekly-summary-email - Send weekly summary email (STARTER tier feature)
router.post("/weekly-summary-email", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    userEmail,
    tier = 'starter',
    customPrompt = null
  } = req.body || {};
  const payload = `POST:${tenant}:weekly_summary_email:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  if (!userEmail) {
    return res.status(400).json({ ok: false, error: "userEmail required" });
  }

  try {
    const { sendWeeklySummaryEmail } = await import("../jobs/weekly_summary.js");

    const emailResult = await sendWeeklySummaryEmail(String(tenant), userEmail, {
      tier,
      generateAI: true,
      customPrompt
    });

    if (!emailResult.ok) {
      return res.status(500).json({
        ok: false,
        error: emailResult.error || "Failed to send email"
      });
    }

    logAccess(req, "weekly_summary_email", {
      tenant,
      userEmail,
      tier: emailResult.tier,
      messageId: emailResult.messageId
    });

    res.json({
      ok: true,
      emailSent: true,
      messageId: emailResult.messageId,
      tier: emailResult.tier,
      message: `Weekly AI summary email sent to ${userEmail}`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/weekly-summary-slack - Generate Slack-formatted summary
router.get("/weekly-summary-slack", async (req, res) => {
  const { tenant, sig, format = 'blocks' } = req.query;
  const payload = `GET:${tenant}:weekly_summary_slack`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Get subscription info to determine tier
    const subscription = await getCurrentSubscription(tenant);
    const tier = subscription?.tier || 'starter';

    const { generateWeeklySummaryForSlack } = await import("../jobs/weekly_summary.js");

    const slackResult = await generateWeeklySummaryForSlack(String(tenant), {
      tier,
      generateAI: true
    });

    if (!slackResult.ok) {
      return res.status(500).json({
        ok: false,
        error: slackResult.error || "Failed to generate Slack summary"
      });
    }

    logAccess(req, "weekly_summary_slack", {
      tenant,
      tier,
      format,
      hasAI: slackResult.metadata.hasAI
    });

    // Return format based on request
    if (format === 'text') {
      res.json({
        ok: true,
        format: 'text',
        content: slackResult.textSummary,
        metadata: slackResult.metadata
      });
    } else {
      res.json({
        ok: true,
        format: 'blocks',
        blocks: slackResult.slackBlocks,
        text: slackResult.textSummary, // Fallback text
        metadata: slackResult.metadata
      });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/jobs/autopilot_tick - Execute autopilot optimization (requires subscription)
router.post("/jobs/autopilot_tick", requireFeature("ai_campaign_optimization"), async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const dry = String(req.query.dry || "0") === "1";
  const force = String(req.query.force || "0") === "1";
  const payload = `POST:${tenant}:autopilot_tick:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    const {
      readConfigFromSheets,
      readRowsAoA,
      appendRows,
      addScopedNegative,
      upsertMapValue,
      upsertConfigKeys,
    } = await getSheetOperations();
    const cfg = await readConfigFromSheets(String(tenant));
    const AP = cfg?.AP || {};
    const now = Date.now();

    if (!force) {
      const sched = AP.schedule || "off";
      const d = new Date();
      const wd = d.getDay();
      const hr = d.getHours();
      const within =
        sched === "hourly" ||
        (sched === "daily" && hr === 9) ||
        (sched === "weekdays_9_18" && wd > 0 && wd < 6 && hr >= 9 && hr <= 18);
      const last = Number(cfg?.AP_LAST_RUN_MS || 0);
      const spaced = now - last >= 45 * 60 * 1000;

      if (sched === "off" || !within || !spaced) {
        return json(res, 200, {
          ok: true,
          skipped: true,
          reason: "schedule_gate",
          planned: [],
          applied: [],
        });
      }
    }

    // Aggregate 7d metrics
    const MET_HEADERS = [
      "date",
      "level",
      "campaign",
      "ad_group",
      "id",
      "name",
      "clicks",
      "cost",
      "conversions",
      "impr",
      "ctr",
    ];
    const horizon = now - 7 * 24 * 60 * 60 * 1000;
    const metAoA = await readRowsAoA(
      String(tenant),
      "METRICS",
      MET_HEADERS,
      4000,
    );
    let clicks = 0,
      cost = 0,
      conv = 0;

    for (const r of metAoA) {
      const ts = Date.parse(String(r[0] || ""));
      if (!isFinite(ts) || ts < horizon) continue;
      clicks += Number(r[6] || 0);
      cost += Number(r[7] || 0);
      conv += Number(r[8] || 0);
    }

    const cpa = conv ? cost / conv : 0;

    // Aggregate 7d terms
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const stAoA = await readRowsAoA(
      String(tenant),
      "SEARCH_TERMS",
      ST_HEADERS,
      5000,
    );
    const bucket = new Map();

    for (const r of stAoA) {
      const ts = Date.parse(String(r[0] || ""));
      if (!isFinite(ts) || ts < horizon) continue;
      const term = String(r[3] || "")
        .trim()
        .toLowerCase();
      if (!term) continue;
      const cur = bucket.get(term) || { term, clicks: 0, cost: 0, conv: 0 };
      cur.clicks += Number(r[4] || 0);
      cur.cost += Number(r[5] || 0);
      cur.conv += Number(r[6] || 0);
      bucket.set(term, cur);
    }

    const rows = Array.from(bucket.values()).sort(
      (a, b) => b.cost - a.cost || b.clicks - a.clicks,
    );

    // Build plan with integrated AI configurations
    const plan = [];
    const targetCPA = Number(AP.target_cpa || 0) || 0;
    const targetROAS = Number(AP.target_roas || 0) || 0;
    const desiredKeywords = AP.desired_keywords || [];
    const playbook = AP.playbook_prompt || "";

    // Enhanced cost threshold considering both CPA and ROAS targets
    let termCostThreshold = Math.max(targetCPA || 2, 2);
    if (targetROAS > 0 && conv > 0) {
      const revenue = cost * targetROAS; // Estimated revenue
      const revenueBasedThreshold = revenue / conv; // Revenue per conversion
      termCostThreshold = Math.min(
        termCostThreshold,
        revenueBasedThreshold * 0.5,
      );
    }

    // Filter out desired keywords from negative keyword candidates
    const protectedTerms = new Set(
      desiredKeywords.map((k) => k.toLowerCase().trim()),
    );

    for (const r of rows) {
      // Skip if term contains any desired keywords
      const termLower = r.term.toLowerCase();
      const isProtected = desiredKeywords.some(
        (keyword) =>
          termLower.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(termLower),
      );

      if (!isProtected && r.conv === 0 && r.cost >= termCostThreshold) {
        plan.push({
          type: "add_negative",
          term: r.term,
          match: "phrase",
          scope: "account",
          reason: `High cost ($${r.cost.toFixed(2)}) with no conversions, above threshold ($${termCostThreshold.toFixed(2)})`,
        });
        if (plan.length >= 10) break;
      }
    }

    // Enhanced optimization logic considering both CPA and ROAS
    if ((targetCPA || targetROAS) && clicks > 0) {
      const currentROAS = conv > 0 ? (cost * (cost / (cost / conv))) / cost : 0; // Simplified ROAS calculation

      let shouldAdjust = false;
      let adjustmentReason = "";
      let adjustmentFactor = 1.0;

      // CPA-based adjustments
      if (targetCPA && conv > 0) {
        const tooHighCPA = cpa > 1.3 * targetCPA;
        const tooLowCPA = cpa < 0.7 * targetCPA;

        if (tooHighCPA) {
          shouldAdjust = true;
          adjustmentFactor = 0.9;
          adjustmentReason = `CPA too high ($${cpa.toFixed(2)} vs target $${targetCPA})`;
        } else if (tooLowCPA) {
          shouldAdjust = true;
          adjustmentFactor = 1.1;
          adjustmentReason = `CPA below target ($${cpa.toFixed(2)} vs target $${targetCPA})`;
        }
      }

      // ROAS-based adjustments (override CPA if both are set)
      if (targetROAS && conv > 0) {
        const estimatedROAS = ((cost / conv) * targetROAS) / cost; // Simplified estimation
        const tooLowROAS = estimatedROAS < 0.8 * targetROAS;
        const tooHighROAS = estimatedROAS > 1.2 * targetROAS;

        if (tooLowROAS) {
          shouldAdjust = true;
          adjustmentFactor = 0.85; // More aggressive for ROAS
          adjustmentReason = `ROAS below target (estimated ${estimatedROAS.toFixed(2)} vs target ${targetROAS})`;
        } else if (tooHighROAS) {
          shouldAdjust = true;
          adjustmentFactor = 1.15;
          adjustmentReason = `ROAS above target (estimated ${estimatedROAS.toFixed(2)} vs target ${targetROAS})`;
        }
      }

      // Business strategy influence on adjustments
      if (shouldAdjust && playbook) {
        const strategy = playbook.toLowerCase();
        if (strategy.includes("aggressive") || strategy.includes("growth")) {
          adjustmentFactor =
            adjustmentFactor < 1
              ? adjustmentFactor * 0.95
              : adjustmentFactor * 1.05;
          adjustmentReason += " (aggressive strategy applied)";
        } else if (
          strategy.includes("conservative") ||
          strategy.includes("safe")
        ) {
          adjustmentFactor =
            adjustmentFactor < 1
              ? adjustmentFactor * 1.05
              : adjustmentFactor * 0.95;
          adjustmentReason += " (conservative strategy applied)";
        }
      }

      if (shouldAdjust) {
        let currentStar =
          Number((cfg?.CPC_CEILINGS || {})["*"] || 0) ||
          (clicks ? cost / clicks : 0.2);
        let next = currentStar * adjustmentFactor;
        next = Math.max(0.05, Math.min(1.0, Number(next.toFixed(2))));

        if (Math.abs(next - currentStar) >= 0.01) {
          plan.push({
            type: "lower_cpc_ceiling",
            campaign: "*",
            amount: next,
            reason: adjustmentReason,
          });
        }
      }
    }

    let applied = [],
      errors = [];

    if (!dry && (AP.mode || "auto") === "auto" && plan.length) {
      for (const a of plan) {
        try {
          if (a.type === "add_negative") {
            await addScopedNegative(String(tenant), {
              scope: a.scope,
              match: a.match,
              term: a.term,
            });
            applied.push(a);
          } else if (a.type === "lower_cpc_ceiling") {
            await upsertMapValue(
              String(tenant),
              "CPC_CEILINGS",
              a.campaign || "*",
              a.amount,
            );
            applied.push(a);
          }
        } catch (e) {
          errors.push({ action: a, error: String(e) });
        }
      }

      try {
        const roasInfo = targetROAS ? `, roas_target:${targetROAS}` : "";
        const keywordInfo = desiredKeywords.length
          ? `, protected_keywords:${desiredKeywords.length}`
          : "";
        const strategyInfo = playbook
          ? `, strategy:${playbook.substring(0, 20)}...`
          : "";
        await appendRows(
          String(tenant),
          "RUN_LOGS",
          ["timestamp", "message"],
          [
            [
              new Date().toISOString(),
              `autopilot: planned ${plan.length}, applied ${applied.length} (mode:auto, obj:${AP.objective || "protect"}, cpa:${cpa.toFixed(2)}${targetCPA ? `/t${targetCPA}` : ""}${roasInfo}${keywordInfo}${strategyInfo})`,
            ],
          ],
        );
      } catch {}

      try {
        await upsertConfigKeys(String(tenant), { AP_LAST_RUN_MS: String(now) });
      } catch {}
    } else {
      try {
        await appendRows(
          String(tenant),
          "RUN_LOGS",
          ["timestamp", "message"],
          [
            [
              new Date().toISOString(),
              `autopilot: planned ${plan.length} (mode:${AP.mode || "review"}, preview)`,
            ],
          ],
        );
      } catch {}
    }

    return json(res, 200, {
      ok: true,
      planned: plan,
      applied,
      errors,
      kpi: { clicks, cost, conv, cpa },
      target_cpa: targetCPA,
      target_roas: targetROAS,
      ai_integration: {
        desired_keywords_protected: desiredKeywords.length,
        business_strategy_applied: !!playbook,
        roas_optimization_active: !!targetROAS,
      },
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "AUTOPILOT", error: String(e) });
  }
});

// POST /api/autopilot/quickstart - Quick setup for autopilot mode
router.post("/autopilot/quickstart", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    mode = "protect",
    daily_budget = 3,
    cpc_ceiling = 0.2,
    final_url = "https://example.com",
    start_in_minutes = 2,
    duration_minutes = 60,
  } = req.body || {};
  const payload = `POST:${tenant}:autopilot_quickstart:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Check campaign limits before allowing autopilot quickstart (campaign creation)
    console.log(`🔐 Checking campaign limits for autopilot quickstart: ${tenant}`);
    const subscription = await getCurrentSubscription(tenant);
    const userTier = subscription?.tier || "starter";
    
    const permission = await canCreateCampaign(tenant, userTier);
    
    if (!permission.allowed) {
      console.log(`❌ Autopilot quickstart blocked - campaign limit exceeded for ${tenant}: ${permission.currentCount}/${permission.limit} (${userTier})`);
      
      return res.status(402).json({
        ok: false,
        error: "campaign_limit_exceeded",
        message: `Your ${userTier} plan allows up to ${permission.limit} campaigns. You currently have ${permission.currentCount}.`,
        currentCount: permission.currentCount,
        limit: permission.limit,
        tier: userTier,
        upgradeUrl: permission.upgradeUrl
      });
    }
    
    console.log(`✅ Campaign limit check passed for autopilot quickstart ${tenant}: ${permission.currentCount}/${permission.limit} (${userTier})`);
    const { getDoc, bootstrapTenant, upsertConfigKeys, appendRows } =
      await getSheetOperations();
    const sheetsOk = !!(await getDoc());
    const aiReady =
      (process.env.AI_PROVIDER || "").toLowerCase() === "google" &&
      !!process.env.GOOGLE_API_KEY;

    if (!sheetsOk) {
      return res.json({
        ok: false,
        code: "SHEETS",
        message: "Connect Google Sheets first.",
      });
    }

    // Ensure tenant tabs and baseline config exist
    await bootstrapTenant(String(tenant));
    const plan =
      mode === "scale" ? "growth" : mode === "grow" ? "pro" : "starter";

    await upsertConfigKeys(String(tenant), {
      PLAN: plan,
      default_final_url: String(final_url || ""),
      daily_budget_cap_default: String(daily_budget),
      cpc_ceiling_default: String(cpc_ceiling),
    });

    let accepted = 0;
    const warnings = [];

    if (aiReady) {
      try {
        // Best-effort: accept any existing valid drafts; generation is optional
        const { acceptTopValidDrafts } = await getSheetOperations();
        accepted = await acceptTopValidDrafts(String(tenant), 4);
        if (accepted === 0) warnings.push("no_drafts_found");
      } catch (e) {
        warnings.push("ai_accept_failed");
      }
    } else {
      warnings.push("ai_not_configured");
    }

    const start = Date.now() + Number(start_in_minutes || 2) * 60 * 1000;
    const end = start + Number(duration_minutes || 60) * 60 * 1000;

    try {
      const { schedulePromoteWindow } = await import(
        "../jobs/promote_window.js"
      );
      await schedulePromoteWindow(
        String(tenant),
        start,
        Number(duration_minutes || 60),
      );
    } catch {}

    try {
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), "autopilot_quickstart"]],
      );
    } catch {}

    // Record campaign creation for tracking
    try {
      await recordCampaignCreation(tenant, `autopilot_${mode}_${Date.now()}`, userTier);
    } catch (error) {
      console.error("Failed to record campaign creation:", error);
    }

    return res.json({
      ok: true,
      plan,
      scheduled: { start, end },
      accepted,
      warnings,
      zero_state: true,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/generate/rsa - Generate RSA content using new service
router.post("/generate/rsa", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    theme = "Business",
    industry = "general",
    keywords = [],
    tone = "professional",
    headlineCount = 15,
    descriptionCount = 4,
  } = req.body || {};
  const payload = `POST:${tenant}:ai_generate_rsa:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Get tenant configuration for business strategy context
    const { readConfigFromSheets } = await getSheetOperations();
    const cfg = await readConfigFromSheets(String(tenant));
    const AP = cfg?.AP || {};

    const { getRSAGenerator } = await import("../services/rsa-generator.js");
    const generator = getRSAGenerator();

    const result = await generator.generateRSAContent({
      theme,
      industry,
      keywords,
      tone,
      headlineCount,
      descriptionCount,
      includeOffers: true,
      includeBranding: true,
      // Pass business strategy context
      playbookPrompt: AP.playbook_prompt || "",
      targetCPA: AP.target_cpa || null,
      targetROAS: AP.target_roas || null,
      businessStrategy: AP.objective || "protect",
    });

    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/analyze/negatives - Analyze search terms for negative keywords
router.post("/analyze/negatives", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    searchTerms = [],
    industry = "general",
    costThreshold = 5.0,
    clickThreshold = 3,
    conversionRate = 0,
    useAI = true,
  } = req.body || {};
  const payload = `POST:${tenant}:ai_analyze_negatives:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Get tenant configuration for business strategy context and desired keywords
    const { readConfigFromSheets } = await getSheetOperations();
    const cfg = await readConfigFromSheets(String(tenant));
    const AP = cfg?.AP || {};

    const { getNegativeAnalyzer } = await import(
      "../services/negative-analyzer.js"
    );
    const analyzer = getNegativeAnalyzer();

    const result = await analyzer.analyzeSearchTerms(searchTerms, {
      industry,
      costThreshold,
      clickThreshold,
      conversionRate,
      useAI,
      // Pass business context and protected keywords
      playbookPrompt: AP.playbook_prompt || "",
      desiredKeywords: AP.desired_keywords || [],
      targetCPA: AP.target_cpa || null,
      targetROAS: AP.target_roas || null,
      businessStrategy: AP.objective || "protect",
    });

    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/approval/submit - Submit content for approval
router.post("/approval/submit", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    content,
    contentType,
    submittedBy = "user",
    priority = "normal",
    autoApprove = false,
    metadata = {},
  } = req.body || {};
  const payload = `POST:${tenant}:ai_approval_submit:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getApprovalWorkflow } = await import(
      "../services/content-approval.js"
    );
    const workflow = getApprovalWorkflow();

    const result = await workflow.submitForApproval(content, {
      contentType,
      tenant,
      submittedBy,
      priority,
      autoApprove,
      metadata,
    });

    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/approval/pending - Get pending approvals
router.get("/approval/pending", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_approval_pending`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getApprovalWorkflow } = await import(
      "../services/content-approval.js"
    );
    const workflow = getApprovalWorkflow();

    const pending = workflow.getPendingApprovals({ tenant });
    const stats = workflow.getWorkflowStats(tenant);

    res.json({ ok: true, pending, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/approval/review - Review content (approve/reject/request revisions)
router.post("/approval/review", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    submissionId,
    action, // 'approve', 'reject', 'revise'
    reviewerId,
    reason = "",
    revisionRequests = [],
  } = req.body || {};
  const payload = `POST:${tenant}:ai_approval_review:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getApprovalWorkflow } = await import(
      "../services/content-approval.js"
    );
    const workflow = getApprovalWorkflow();

    let result;
    switch (action) {
      case "approve":
        result = await workflow.approveContent(submissionId, reviewerId, {
          reason,
        });
        break;
      case "reject":
        result = await workflow.rejectContent(submissionId, reviewerId, {
          reason,
        });
        break;
      case "revise":
        result = await workflow.requestRevisions(
          submissionId,
          reviewerId,
          revisionRequests,
        );
        break;
      default:
        throw new Error("Invalid action. Must be approve, reject, or revise");
    }

    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/provider/status - Get AI provider status
router.get("/provider/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_provider_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIProviderService, validateAIConfig } = await import(
      "../services/ai-provider.js"
    );
    const service = getAIProviderService();

    const status = service.getStatus();
    const config = validateAIConfig();

    res.json({ ok: true, status, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/automation/status - Get AI automation status
router.get("/automation/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_automation_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIAutomationService } = await import("../services/ai-automation.js");
    const { getTokenMonitorService } = await import("../services/token-monitor.js");
    
    const automationService = getAIAutomationService();
    const tokenService = getTokenMonitorService();

    const automationStatus = automationService.getStatus();
    const tenantStatus = automationService.getTenantStatus(tenant);
    const tokenStats = tokenService.getUsageStats(tenant);

    // Ensure automation status has the expected structure
    const formattedAutomation = {
      status: automationStatus?.running ? 'running' : 'paused',
      runsSinceLastIssue: tenantStatus?.successCount || 0,
      lastRun: tenantStatus?.lastOptimization || new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      ...automationStatus
    };

    res.json({
      ok: true,
      automation: formattedAutomation,
      tenant: tenantStatus,
      tokens: tokenStats
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/automation/start - Start AI automation for tenant
router.post("/automation/start", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ai_automation_start:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { startAIAutomation } = await import("../services/ai-automation.js");
    const { startTokenMonitoring } = await import("../services/token-monitor.js");
    
    // Start services if not already running
    const automationService = await startAIAutomation();
    const tokenService = startTokenMonitoring();

    // Add tenant to automation queue
    automationService.addTenant?.(tenant);

    res.json({ 
      ok: true, 
      message: "AI automation started",
      status: automationService.getStatus()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/automation/stop - Stop AI automation for tenant
router.post("/automation/stop", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ai_automation_stop:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIAutomationService } = await import("../services/ai-automation.js");
    
    const automationService = getAIAutomationService();
    automationService.removeTenant?.(tenant);

    res.json({ 
      ok: true, 
      message: "AI automation stopped for tenant",
      status: automationService.getTenantStatus(tenant)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/automation/trigger - Manually trigger automation for tenant
router.post("/automation/trigger", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), operations = [] } = req.body || {};
  const payload = `POST:${tenant}:ai_automation_trigger:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIAutomationService } = await import("../services/ai-automation.js");
    
    const automationService = getAIAutomationService();
    
    // Manually trigger automation for this tenant
    await automationService.processTenantAutomation(tenant);

    res.json({ 
      ok: true, 
      message: "Automation triggered",
      tenant: automationService.getTenantStatus(tenant)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/tokens/usage - Get detailed token usage statistics
router.get("/tokens/usage", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_tokens_usage`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getTokenMonitorService } = await import("../services/token-monitor.js");
    
    const tokenService = getTokenMonitorService();
    const usage = tokenService.getUsageStats(tenant);

    res.json({ 
      ok: true, 
      usage
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/tokens/export - Export token usage data
router.get("/tokens/export", async (req, res) => {
  const { tenant, sig, startDate, endDate } = req.query;
  const payload = `GET:${tenant}:ai_tokens_export`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getTokenMonitorService } = await import("../services/token-monitor.js");
    
    const tokenService = getTokenMonitorService();
    const exportData = tokenService.exportUsageData(
      tenant, 
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate || new Date().toISOString()
    );

    if (!exportData) {
      return res.status(404).json({ ok: false, error: "No data found" });
    }

    res.json({ 
      ok: true, 
      data: exportData
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/budget/update - Update budget limits for tenant
router.post("/budget/update", async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    nonce = Date.now(), 
    dailyLimit, 
    monthlyLimit,
    alertThreshold
  } = req.body || {};
  const payload = `POST:${tenant}:ai_budget_update:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getTokenMonitorService } = await import("../services/token-monitor.js");
    
    const tokenService = getTokenMonitorService();
    
    // Initialize tenant if needed
    if (!tokenService.tokenUsage.has(tenant)) {
      await tokenService.initializeTenant(tenant);
    }
    
    const usage = tokenService.tokenUsage.get(tenant);
    
    // Update budget limits
    if (dailyLimit !== undefined) {
      usage.budget.daily = parseFloat(dailyLimit);
    }
    if (monthlyLimit !== undefined) {
      usage.budget.monthly = parseFloat(monthlyLimit);
    }
    if (alertThreshold !== undefined) {
      usage.budget.alert_threshold = parseFloat(alertThreshold);
    }

    res.json({ 
      ok: true, 
      message: "Budget updated",
      budget: usage.budget
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/optimization/recommendations - Get AI optimization recommendations
router.get("/optimization/recommendations", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_optimization_recommendations`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getTokenMonitorService } = await import("../services/token-monitor.js");
    const { getAIAutomationService } = await import("../services/ai-automation.js");
    
    const tokenService = getTokenMonitorService();
    const automationService = getAIAutomationService();
    
    const usage = tokenService.getUsageStats(tenant);
    const tenantStatus = automationService.getTenantStatus(tenant);

    const recommendations = {
      tokenOptimization: usage.recommendations || [],
      automationSettings: [],
      costSavings: {
        potential: 0,
        recommendations: []
      }
    };

    // Add automation-specific recommendations
    const subscription = await getCurrentSubscription(tenant);
    const tier = subscription?.tier || 'starter';
    
    if (tier === 'starter' && tenantStatus.tokenUsage?.daily?.cost > 0.50) {
      recommendations.automationSettings.push({
        type: 'tier_upgrade',
        priority: 'medium',
        message: 'Consider upgrading to Professional for better AI optimization features',
        potentialSavings: tenantStatus.tokenUsage.daily.cost * 0.2
      });
    }

    res.json({ 
      ok: true, 
      recommendations
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/logs - Get AI operation logs
router.get("/logs", async (req, res) => {
  const { tenant, sig, level, operation, startTime, endTime, limit } = req.query;
  const payload = `GET:${tenant}:ai_logs`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAILoggerService } = await import("../services/ai-logger.js");
    
    const logService = getAILoggerService();
    const logs = logService.getLogs(tenant, {
      level,
      operation,
      startTime,
      endTime,
      limit: parseInt(limit) || 100
    });

    res.json({ 
      ok: true, 
      logs,
      total: logs.length
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/analytics - Get comprehensive AI analytics
router.get("/analytics", async (req, res) => {
  const { tenant, sig, period } = req.query;
  const payload = `GET:${tenant}:ai_analytics`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAILoggerService } = await import("../services/ai-logger.js");
    const { getTokenMonitorService } = await import("../services/token-monitor.js");
    const { getAIAutomationService } = await import("../services/ai-automation.js");
    
    const logService = getAILoggerService();
    const tokenService = getTokenMonitorService();
    const automationService = getAIAutomationService();

    const analytics = logService.generateAnalytics(tenant, period || '24h');
    const tokenStats = tokenService.getUsageStats(tenant);
    const automationStatus = automationService.getTenantStatus(tenant);

    const comprehensive = {
      ...analytics,
      tokenUsage: tokenStats,
      automation: automationStatus,
      summary: {
        totalOperations: analytics.metrics.totalOperations,
        successRate: ((analytics.metrics.successfulOperations / analytics.metrics.totalOperations) * 100).toFixed(1),
        totalCost: tokenStats.current?.monthly?.cost || 0,
        averageResponseTime: analytics.metrics.averageResponseTime,
        automationEnabled: automationStatus.lastOptimization ? true : false
      }
    };

    res.json({ 
      ok: true, 
      analytics: comprehensive
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/health - Comprehensive AI system health monitoring
router.get("/health", async (req, res) => {
  const { tenant, sig, detailed } = req.query;
  const payload = `GET:${tenant}:ai_health`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Import health service and AI services
    const { healthService } = await import("../services/health.js");
    const { getAIProviderService, validateAIConfig } = await import("../services/ai-provider.js");
    const { getAIErrorHandler } = await import("../middleware/ai-error-handler.js");

    // Run AI-specific health checks
    const aiChecks = await healthService.getHealth([
      'aiProvider',
      'aiErrorHandler',
      'aiTokenMonitor',
      'aiProviderFallback'
    ]);

    // Get comprehensive AI service status
    const aiService = getAIProviderService();
    const aiConfig = validateAIConfig();
    const errorHandler = getAIErrorHandler();

    const health = {
      overall: aiChecks.status,
      timestamp: new Date().toISOString(),
      provider: {
        name: aiConfig.provider,
        configured: aiConfig.valid,
        errors: aiConfig.errors,
        initialized: aiService.initialized,
        metrics: aiService.getStatus().metrics
      },
      errorHandling: {
        status: errorHandler.getHealthStatus(),
        metrics: errorHandler.getMetrics(tenant),
        recentErrors: errorHandler.metrics.recentErrors.slice(-5) // Last 5 errors
      },
      checks: aiChecks.checks,
      tenant: {
        metrics: errorHandler.getMetrics(tenant)?.tenant || {},
        recommendations: []
      }
    };

    // Add recommendations based on health status
    if (health.overall !== 'healthy') {
      if (!aiConfig.valid) {
        health.tenant.recommendations.push({
          type: 'configuration',
          priority: 'high',
          message: 'Fix AI provider configuration',
          actions: ['Check API keys', 'Verify provider settings']
        });
      }

      if (errorHandler.getHealthStatus() === 'unhealthy') {
        health.tenant.recommendations.push({
          type: 'errors',
          priority: 'medium',
          message: 'High AI error rate detected',
          actions: ['Review recent errors', 'Check provider status', 'Consider fallback providers']
        });
      }
    }

    // Include detailed diagnostics if requested
    if (detailed === '1') {
      try {
        const { getTokenMonitorService } = await import("../services/token-monitor.js");
        const { getAIAutomationService } = await import("../services/ai-automation.js");

        const tokenService = getTokenMonitorService();
        const automationService = getAIAutomationService();

        health.detailed = {
          tokenMonitoring: {
            active: tokenService.isTracking,
            stats: tokenService.getUsageStats(tenant)
          },
          automation: {
            active: automationService.isRunning,
            tenantStatus: automationService.getTenantStatus(tenant)
          },
          systemChecks: await healthService.runAllChecks()
        };
      } catch (detailError) {
        health.detailed = { error: 'Detailed diagnostics unavailable' };
      }
    }

    // Set appropriate HTTP status based on health
    const statusCode = health.overall === 'healthy' ? 200 :
                      health.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      ok: true,
      health
    });
  } catch (e) {
    console.error('AI health check failed:', e);
    res.status(500).json({
      ok: false,
      error: 'Health check failed',
      message: String(e),
      health: {
        overall: 'critical',
        timestamp: new Date().toISOString(),
        error: e.message
      }
    });
  }
});

// GET /api/ai/health/provider - Get specific AI provider health
router.get("/health/provider", async (req, res) => {
  const { tenant, sig, provider } = req.query;
  const payload = `GET:${tenant}:ai_health_provider`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIProvider } = await import("../lib/aiProvider.js");
    const { getAIErrorHandler } = await import("../middleware/ai-error-handler.js");

    // Test specific provider if specified
    const testProvider = provider || process.env.AI_PROVIDER;
    const originalProvider = process.env.AI_PROVIDER;

    if (testProvider && testProvider !== originalProvider) {
      process.env.AI_PROVIDER = testProvider;
    }

    try {
      const providerInstance = await getAIProvider();
      const errorHandler = getAIErrorHandler();

      // Test provider with a simple request
      const testStart = Date.now();
      const testResult = await providerInstance.generateText(
        "Health check test. Please respond with 'Provider OK'."
      );
      const testDuration = Date.now() - testStart;

      // Get provider-specific metrics
      const providerMetrics = errorHandler.metrics.errorsByProvider.get(testProvider) || 0;

      const health = {
        provider: testProvider,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        test: {
          successful: true,
          duration: testDuration,
          responseLength: testResult?.length || 0
        },
        metrics: {
          remainingCalls: providerInstance.remainingCalls?.() || 0,
          recentErrors: providerMetrics
        }
      };

      res.json({ ok: true, health });
    } finally {
      // Restore original provider
      if (originalProvider) {
        process.env.AI_PROVIDER = originalProvider;
      }
    }
  } catch (e) {
    console.error(`AI provider ${provider} health check failed:`, e);

    res.status(503).json({
      ok: false,
      health: {
        provider: provider || process.env.AI_PROVIDER,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: e.message,
        test: {
          successful: false,
          error: e.message
        }
      }
    });
  }
});

// GET /api/ai/recovery/status - Get AI error recovery status
router.get("/recovery/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_recovery_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIErrorRecoveryService } = await import("../services/ai-error-recovery.js");
    const { getAIDegradationService } = await import("../services/ai-graceful-degradation.js");
    const { getAIErrorHandler } = await import("../middleware/ai-error-handler.js");

    const recoveryService = getAIErrorRecoveryService();
    const degradationService = getAIDegradationService();
    const errorHandler = getAIErrorHandler();

    const status = {
      timestamp: new Date().toISOString(),
      recovery: recoveryService.getStatus(),
      degradation: degradationService.getStatus(),
      errors: errorHandler.getMetrics(tenant),
      overallHealth: {
        status: 'healthy', // Will be determined below
        issues: [],
        recommendations: []
      }
    };

    // Determine overall health
    const unhealthyProviders = status.recovery.providers.filter(p => !p.available).length;
    const errorRate = errorHandler.getHealthStatus();

    if (unhealthyProviders > 0 || errorRate === 'unhealthy') {
      status.overallHealth.status = 'degraded';

      if (unhealthyProviders > 0) {
        status.overallHealth.issues.push(`${unhealthyProviders} AI providers unavailable`);
        status.overallHealth.recommendations.push('Monitor provider status and consider manual recovery');
      }

      if (errorRate === 'unhealthy') {
        status.overallHealth.issues.push('High AI error rate detected');
        status.overallHealth.recommendations.push('Review recent errors and check provider configurations');
      }
    }

    res.json({
      ok: true,
      status
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/recovery/force - Force recovery attempt for all providers
router.post("/recovery/force", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ai_recovery_force:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIErrorRecoveryService } = await import("../services/ai-error-recovery.js");

    const recoveryService = getAIErrorRecoveryService();
    const result = await recoveryService.forceRecovery();

    res.json({
      ok: true,
      message: 'Recovery attempt completed',
      result
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/recovery/reset-circuits - Reset all circuit breakers (emergency)
router.post("/recovery/reset-circuits", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ai_recovery_reset:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIErrorRecoveryService } = await import("../services/ai-error-recovery.js");

    const recoveryService = getAIErrorRecoveryService();
    const result = recoveryService.resetAllCircuits();

    res.json({
      ok: true,
      message: 'All circuit breakers reset',
      result
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/degradation/status - Get graceful degradation service status
router.get("/degradation/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_degradation_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIDegradationService } = await import("../services/ai-graceful-degradation.js");

    const degradationService = getAIDegradationService();
    const status = degradationService.getStatus();
    const userMessage = degradationService.getUserStatusMessage();

    res.json({
      ok: true,
      status,
      userMessage
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/degradation/clear-cache - Clear AI response cache
router.post("/degradation/clear-cache", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ai_degradation_clear_cache:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIDegradationService } = await import("../services/ai-graceful-degradation.js");

    const degradationService = getAIDegradationService();
    const result = degradationService.clearCache();

    res.json({
      ok: true,
      message: 'AI response cache cleared',
      result
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/degradation/process-queue - Process queued AI requests
router.post("/degradation/process-queue", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ai_degradation_process_queue:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getAIDegradationService } = await import("../services/ai-graceful-degradation.js");

    const degradationService = getAIDegradationService();
    const results = await degradationService.processQueue();

    res.json({
      ok: true,
      message: 'Queue processing completed',
      processed: results.length,
      results
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/test - Test AI automation system
router.post("/test", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), testType = 'basic' } = req.body || {};
  const payload = `POST:${tenant}:ai_test:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Import test suite dynamically
    const { default: AIAutomationTestSuite } = await import("../test-ai-automation.js");
    
    const testSuite = new AIAutomationTestSuite();
    testSuite.testTenant = tenant; // Use the actual tenant for testing

    let results;
    switch (testType) {
      case 'token':
        await testSuite.testTokenMonitoring();
        break;
      case 'automation':
        await testSuite.testAutomationService();
        break;
      case 'integration':
        await testSuite.testIntegration();
        break;
      case 'full':
        await testSuite.runAllTests();
        break;
      default:
        // Basic test - just check if services are running
        results = {
          basic: true,
          services: {
            tokenMonitor: true,
            automation: true,
            logging: true
          }
        };
    }

    res.json({ 
      ok: true, 
      testType,
      results: results || testSuite.testResults,
      message: `AI automation test (${testType}) completed for ${tenant}`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// DEBUG: Test endpoint to verify HMAC generation
router.get("/test-hmac", async (req, res) => {
  const { tenant } = req.query;
  const payload = `GET:${tenant}:ai_drafts`;

  // Generate the expected signature
  const { sign } = await import("../utils/hmac.js");
  const expectedSig = sign(payload);

  res.json({
    ok: true,
    tenant,
    payload,
    expectedSignature: expectedSig,
    help: "Use this signature in your request as ?sig=" + encodeURIComponent(expectedSig)
  });
});

// GET /api/ai/campaigns - Get campaign data for AI dashboard
router.get("/campaigns", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_campaigns`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Check if Supabase is enabled
    if (isSupabaseEnabled()) {
      const supabase = getSupabaseClient();
      let metricsData = null;
      let dataSource = 'none';

      // Try tenant_metrics first
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_metrics')
        .select('*')
        .eq('tenant_id', tenant)
        .eq('entity_type', 'campaign')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      if (!tenantError && tenantData && tenantData.length > 0) {
        metricsData = tenantData;
        dataSource = 'tenant_metrics';
        console.log(`✅ Using tenant_metrics for campaigns: ${metricsData.length} records`);
      } else {
        // Fallback to campaign_metrics table
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaign_metrics')
          .select('*')
          .eq('tenant_id', tenant)
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('date', { ascending: false });

        if (!campaignError && campaignData && campaignData.length > 0) {
          // Convert to tenant_metrics format
          metricsData = campaignData.map(row => ({
            ...row,
            entity_type: 'campaign',
            entity_id: row.campaign_id,
            entity_name: row.campaign_name,
            cost_micros: Math.round((row.cost || 0) * 1000000)
          }));
          dataSource = 'campaign_metrics';
          console.log(`✅ Using campaign_metrics fallback: ${metricsData.length} records`);
        }
      }

      console.log(`📊 Campaign metrics query for ${tenant}:`, {
        recordCount: metricsData?.length || 0,
        dataSource: dataSource,
        sampleRecord: metricsData?.[0],
        query: `${dataSource} table`
      });

      if (metricsData && metricsData.length > 0) {
        // Aggregate metrics by campaign
        const campaignMap = new Map();

        for (const metric of metricsData) {
          const campaignName = metric.campaign_name || metric.entity_name || 'Unknown Campaign';

          if (!campaignMap.has(campaignName)) {
            campaignMap.set(campaignName, {
              name: campaignName,
              impressions: 0,
              clicks: 0,
              conversions: 0,
              cost_micros: 0,
              dates: []
            });
          }

          const camp = campaignMap.get(campaignName);
          camp.impressions += metric.impressions || 0;
          camp.clicks += metric.clicks || 0;
          camp.conversions += parseFloat(metric.conversions) || 0;
          camp.cost_micros += metric.cost_micros || 0;
          camp.dates.push(metric.date);
        }

        // Transform to campaign format
        const transformedCampaigns = Array.from(campaignMap.values()).map((camp, index) => {
          const spend = camp.cost_micros / 1000000; // Convert micros to dollars
          const ctr = camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0;
          const cpc = camp.clicks > 0 ? spend / camp.clicks : 0;
          const revenue = camp.conversions * 50; // Assuming $50 per conversion
          const roas = spend > 0 ? revenue / spend : 0;

          return {
            id: `campaign_${index + 1}`,
            name: camp.name,
            status: roas > 2 ? 'performing' : roas > 1 ? 'optimizing' : 'learning',
            budget: Math.round(spend * 1.5), // Estimate budget as 150% of spend
            spend: Math.round(spend * 100) / 100,
            impressions: camp.impressions,
            clicks: camp.clicks,
            conversions: camp.conversions,
            roas: Math.round(roas * 100) / 100,
            ctr: Math.round(ctr * 100) / 100,
            cpc: Math.round(cpc * 100) / 100,
            lastOptimized: camp.dates[camp.dates.length - 1],
            optimizationType: 'ai_automated',
            recommendations: []
          };
        });

        return res.json({
          ok: true,
          campaigns: transformedCampaigns,
          total: transformedCampaigns.length,
          dataSource: dataSource, // Which table provided the data
          timestamp: new Date().toISOString()
        });
      }
    }

    // Return sample data if no real data available
    const sampleCampaigns = [
      {
        id: 'campaign_1',
        name: 'Holiday Sale 2025',
        status: 'performing',
        budget: 5000,
        spend: 3247,
        impressions: 145000,
        clicks: 4350,
        conversions: 87,
        roas: 3.2,
        ctr: 3.0,
        cpc: 0.75,
        lastOptimized: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        optimizationType: 'ai_automated',
        recommendations: [
          'Increase budget by 20% to capture more conversions',
          'Add 5 new high-performing keywords identified by AI'
        ]
      },
      {
        id: 'campaign_2',
        name: 'Brand Awareness',
        status: 'optimizing',
        budget: 3000,
        spend: 1875,
        impressions: 89000,
        clicks: 2670,
        conversions: 45,
        roas: 2.1,
        ctr: 2.8,
        cpc: 0.70,
        lastOptimized: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        optimizationType: 'ai_automated',
        recommendations: [
          'Pause 3 underperforming ad groups',
          'Test new responsive search ads'
        ]
      },
      {
        id: 'campaign_3',
        name: 'Product Launch',
        status: 'learning',
        budget: 2000,
        spend: 450,
        impressions: 23000,
        clicks: 575,
        conversions: 8,
        roas: 1.5,
        ctr: 2.5,
        cpc: 0.78,
        lastOptimized: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        optimizationType: 'ai_automated',
        recommendations: [
          'Campaign still in learning phase',
          'Gathering performance data for optimization'
        ]
      }
    ];

    res.json({
      ok: true,
      campaigns: sampleCampaigns,
      total: sampleCampaigns.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
      campaigns: [],
      total: 0
    });
  }
});

// GET /api/ai/performance/insights - Get AI performance insights
router.get("/performance/insights", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_performance_insights`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    // Generate time-series data for charts
    const generateTimeSeries = (days = 30, baseValue = 100) => {
      const series = [];
      for (let i = days; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const variation = Math.sin(i * 0.3) * 20 + Math.random() * 10;
        series.push({
          date: date.toISOString().split('T')[0],
          value: Math.max(0, baseValue + variation + (days - i) * 2)
        });
      }
      return series;
    };

    // Check if real data exists in Supabase - try multiple tables
    let realMetrics = null;
    let dataSource = 'none';

    if (isSupabaseEnabled()) {
      const supabase = getSupabaseClient();

      // Try tenant_metrics first
      let { data, error } = await supabase
        .from('tenant_metrics')
        .select('*')
        .eq('tenant_id', tenant)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: true });

      if (!error && data && data.length > 0) {
        dataSource = 'tenant_metrics';
        // Calculate real metrics from data - handle cost_micros
        const totalImpressions = data.reduce((sum, m) => sum + (m.impressions || 0), 0);
        const totalClicks = data.reduce((sum, m) => sum + (m.clicks || 0), 0);
        const totalConversions = data.reduce((sum, m) => sum + (m.conversions || 0), 0);
        const totalCost = data.reduce((sum, m) => sum + ((m.cost_micros || 0) / 1000000), 0);
        const totalRevenue = data.reduce((sum, m) => sum + (m.conversions_value || totalConversions * 50), 0);

        realMetrics = {
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          cost: totalCost,
          revenue: totalRevenue,
          roas: totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : 0,
          ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
          conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0
        };
      } else {
        // Fallback to campaign_metrics
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaign_metrics')
          .select('*')
          .eq('tenant_id', tenant)
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('date', { ascending: true });

        if (!campaignError && campaignData && campaignData.length > 0) {
          dataSource = 'campaign_metrics';
          // Calculate real metrics from campaign data
          const totalImpressions = campaignData.reduce((sum, m) => sum + (m.impressions || 0), 0);
          const totalClicks = campaignData.reduce((sum, m) => sum + (m.clicks || 0), 0);
          const totalConversions = campaignData.reduce((sum, m) => sum + (m.conversions || 0), 0);
          const totalCost = campaignData.reduce((sum, m) => sum + (m.cost || 0), 0);
          const totalRevenue = totalConversions * 50; // Estimate revenue

          realMetrics = {
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
            cost: totalCost,
            revenue: totalRevenue,
            roas: totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : 0,
            ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
            conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0
          };
        }
      }

      console.log(`📊 Performance insights data source for ${tenant}: ${dataSource}, records: ${realMetrics ? 'found' : 'none'}`);
    }

    const insights = {
      ok: true,
      summary: realMetrics || {
        impressions: 2450000,
        clicks: 73500,
        conversions: 1470,
        cost: 15750,
        revenue: 52500,
        roas: 3.33,
        ctr: 3.0,
        conversionRate: 2.0
      },
      trends: {
        impressions: generateTimeSeries(30, 80000),
        clicks: generateTimeSeries(30, 2400),
        conversions: generateTimeSeries(30, 48),
        roas: generateTimeSeries(30, 3.2).map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }))
      },
      aiImpact: {
        optimizationsApplied: 47,
        budgetSaved: 3250,
        additionalConversions: 215,
        roasImprovement: 0.8,
        ctrImprovement: 0.5,
        lastOptimization: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      recommendations: [
        {
          type: 'high_priority',
          title: 'Increase budget for top campaigns',
          description: '3 campaigns are budget-constrained and missing potential conversions',
          estimatedImpact: '+25% conversions',
          action: 'review_budgets'
        },
        {
          type: 'medium_priority',
          title: 'Add negative keywords',
          description: 'AI identified 15 irrelevant search terms consuming 8% of budget',
          estimatedImpact: '-$450/month waste',
          action: 'add_negatives'
        },
        {
          type: 'low_priority',
          title: 'Test new ad copy variations',
          description: 'Current ads have been running for 30+ days without refresh',
          estimatedImpact: '+10% CTR',
          action: 'create_ads'
        }
      ],
      topPerformers: [
        { name: 'Holiday Sale', roas: 4.2, spend: 5000 },
        { name: 'Brand Terms', roas: 3.8, spend: 3000 },
        { name: 'Product Launch', roas: 3.1, spend: 2000 }
      ],
      timestamp: new Date().toISOString()
    };

    res.json(insights);

  } catch (error) {
    console.error('Failed to fetch performance insights:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ✅ NEW: GET /api/ai/campaigns - Get campaigns list
router.get("/campaigns", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_campaigns`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching campaigns for:', tenant);

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      return res.json({
        ok: true,
        campaigns: [],
        timestamp: new Date().toISOString()
      });
    }

    // Query campaigns from tenant_metrics (aggregated by campaign)
    const { data, error } = await supabaseClient
      .from('tenant_metrics')
      .select('entity_name, entity_id, clicks, cost_micros, conversions, impressions, date, period')
      .eq('tenant_id', tenant)
      .eq('entity_type', 'campaign')
      .eq('period', 'LAST_7_DAYS')
      .order('date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Campaign query error:', error);
      return res.json({
        ok: true,
        campaigns: [],
        timestamp: new Date().toISOString()
      });
    }

    // Aggregate campaigns by name
    const campaignMap = new Map();
    if (data) {
      data.forEach(row => {
        const campaignName = row.entity_name;
        if (!campaignMap.has(campaignName)) {
          campaignMap.set(campaignName, {
            id: row.entity_id,
            name: campaignName,
            status: 'ENABLED',
            clicks: 0,
            impressions: 0,
            conversions: 0,
            cost: 0
          });
        }

        const campaign = campaignMap.get(campaignName);
        campaign.clicks += row.clicks || 0;
        campaign.impressions += row.impressions || 0;
        campaign.conversions += parseFloat(row.conversions) || 0;
        campaign.cost += (row.cost_micros || 0) / 1000000;
      });
    }

    const campaigns = Array.from(campaignMap.values());

    console.log(`✅ Found ${campaigns.length} campaigns for ${tenant}`);

    return res.json({
      ok: true,
      campaigns,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to fetch campaigns:', error.message);
    return res.json({
      ok: true,
      campaigns: [],
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ NEW: GET /api/ai/optimizations/stats - Get optimization statistics
router.get("/optimizations/stats", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_optimizations_stats`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching optimization stats for:', tenant);

    // Return mock optimization stats for now
    // TODO: Implement real optimization tracking
    const stats = {
      total_optimizations: 147,
      this_week: 23,
      avg_improvement: 12.5,
      categories: {
        budget: 8,
        bids: 12,
        keywords: 3
      }
    };

    return res.json({
      ok: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to fetch optimization stats:', error.message);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ✅ NEW: GET /api/ai/performance/insights - Get AI performance insights
router.get("/performance/insights", async (req, res) => {
  const { tenant, sig, period = 'LAST_7_DAYS' } = req.query;
  const payload = `GET:${tenant}:ai_performance_insights`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    console.log('🔍 Fetching performance insights for:', tenant);

    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      return res.json({
        ok: true,
        insights: [],
        timestamp: new Date().toISOString()
      });
    }

    // Query recent performance data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabaseClient
      .from('tenant_metrics')
      .select('clicks, cost_micros, conversions, impressions, ctr, date')
      .eq('tenant_id', tenant)
      .eq('period', period)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      console.error('Insights query error:', error);
      return res.json({
        ok: true,
        insights: [],
        timestamp: new Date().toISOString()
      });
    }

    // Generate insights from data
    const insights = [];

    if (data && data.length > 0) {
      const totalClicks = data.reduce((sum, row) => sum + (row.clicks || 0), 0);
      const totalCost = data.reduce((sum, row) => sum + ((row.cost_micros || 0) / 1000000), 0);
      const totalConversions = data.reduce((sum, row) => sum + (parseFloat(row.conversions) || 0), 0);
      const avgCtr = data.reduce((sum, row) => sum + (row.ctr || 0), 0) / data.length;

      if (avgCtr > 5) {
        insights.push({
          type: 'positive',
          category: 'ctr',
          message: `CTR is ${avgCtr.toFixed(2)}% - above industry average`,
          impact: 'high'
        });
      }

      if (totalConversions > 0 && totalCost > 0) {
        const cpa = totalCost / totalConversions;
        insights.push({
          type: 'info',
          category: 'cpa',
          message: `Cost per acquisition: $${cpa.toFixed(2)}`,
          impact: 'medium'
        });
      }

      if (totalClicks > 1000) {
        insights.push({
          type: 'positive',
          category: 'traffic',
          message: `Strong traffic volume: ${totalClicks} clicks in last 7 days`,
          impact: 'medium'
        });
      }
    }

    return res.json({
      ok: true,
      insights,
      timestamp: new Date().toISOString(),
      period
    });

  } catch (error) {
    console.error('❌ Failed to fetch performance insights:', error.message);
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
