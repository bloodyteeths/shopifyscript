/**
 * Google Ads API Integration Routes
 * Handles OAuth connection, account selection, and quota management
 */

import express from "express";
import { verify } from "../utils/hmac.js";
import * as googleAdsAuth from "../services/google-ads-auth.js";
import * as googleAdsQuota from "../services/google-ads-quota.js";

// ==== CAMPAIGN MANAGEMENT ROUTES ====
import * as googleAdsClient from "../services/google-ads-client.js";
import * as googleAdsCampaignManager from "../services/google-ads-campaign-manager.js";
import { requireActiveSubscription, requireFeature } from '../middleware/subscription-check.js';
import { enforceCampaignLimits, recordCampaignCreation } from '../services/campaign-counter.js';

/**
 * Return a safe error message for client responses.
 * Hides internal details while logging the full error server-side.
 */
function safeError(error, context) {
  console.error(`google-ads ${context} error:`, error.message);
  // Don't leak internal error details to clients
  if (error.message?.includes('quota')) return 'API quota limit reached. Please try again later.';
  if (error.message?.includes('token')) return 'Authentication error. Please reconnect your Google Ads account.';
  if (error.message?.includes('not found')) return error.message;
  return 'An unexpected error occurred. Please try again.';
}

const router = express.Router();

// ---------------------------------------------------------------------------
// Mapping from route path pattern to opKey used in HMAC payload construction.
// Keys use Express-style paths (after the /api/google-ads prefix is stripped).
// ---------------------------------------------------------------------------
const OP_KEY_MAP = {
  "/auth/url":                     "gads_auth_url",
  "/connection-status":            "gads_connection_status",
  "/accounts":                     "gads_accounts",
  "/accounts/select":              "gads_accounts_select",
  "/disconnect":                   "gads_disconnect",
  "/quota":                        "gads_quota",
  "/campaigns":                    "gads_campaigns",
  "/campaigns/create":             "gads_campaigns_create",
  "/sync":                         "gads_sync",
  "/optimize":                     "gads_optimize",
  "/autopilot/status":             "gads_autopilot_status",
  "/autopilot/config":             "gads_autopilot_config",
  "/autopilot/history":            "gads_autopilot_history",
  "/sync/status":                  "gads_sync_status",
  "/metrics":                      "gads_metrics",
};

// Patterns with :id parameter — matched by prefix
const PARAM_OP_KEY_MAP = [
  { prefix: "/campaigns/", suffix: "/details",         opKey: "gads_campaign_details" },
  { prefix: "/campaigns/", suffix: "/pause",            opKey: "gads_campaign_pause" },
  { prefix: "/campaigns/", suffix: "/enable",           opKey: "gads_campaign_enable" },
  { prefix: "/campaigns/", suffix: "/budget",           opKey: "gads_campaign_budget" },
  { prefix: "/campaigns/", suffix: "/negatives",        opKey: "gads_campaign_negatives" },
  { prefix: "/campaigns/", suffix: "/search-terms",     opKey: "gads_campaign_search_terms" },
  { prefix: "/campaigns/", suffix: "/keywords",         opKey: "gads_campaign_keywords" },
  { prefix: "/campaigns/", suffix: "/auction-insights",  opKey: "gads_campaign_auction_insights" },
];

/**
 * Resolve the opKey for a given request path.
 * Returns null if no mapping is found (which will cause the request to fail HMAC).
 */
function resolveOpKey(path) {
  // Exact match first
  if (OP_KEY_MAP[path]) return OP_KEY_MAP[path];

  // Parameterised routes (e.g. /campaigns/123/pause)
  for (const { prefix, suffix, opKey } of PARAM_OP_KEY_MAP) {
    if (path.startsWith(prefix) && path.endsWith(suffix)) {
      return opKey;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HMAC verification middleware — applied to every route except /auth/callback
// ---------------------------------------------------------------------------
router.use((req, res, next) => {
  // Google's OAuth redirect — no HMAC possible
  if (req.path === "/auth/callback") return next();

  const tenant = req.query.tenant || (req.body && req.body.tenantId) || "";
  const sig = req.query.sig || "";
  const opKey = resolveOpKey(req.path);

  if (!tenant || !sig || !opKey) {
    return res.status(401).json({ ok: false, code: "AUTH", error: "invalid signature" });
  }

  // Build payload: POST requests append a nonce from the body
  let payload = `${req.method}:${tenant}:${opKey}`;
  if (req.method === "POST") {
    const nonce = (req.body && req.body.nonce) || Date.now();
    payload += `:${nonce}`;
  }

  if (!verify(sig, payload)) {
    return res.status(401).json({ ok: false, code: "AUTH", error: "invalid signature" });
  }

  next();
});

// ---------------------------------------------------------------------------
// Subscription check — require active subscription for most routes
// Auth/connection routes are exempt (needed before subscription exists)
// ---------------------------------------------------------------------------
router.use((req, res, next) => {
  // These routes don't require a subscription
  if (req.path === "/auth/callback" || req.path === "/auth/url" || req.path === "/connection-status" || req.path === "/disconnect") {
    return next();
  }
  return requireActiveSubscription()(req, res, next);
});

// ---------------------------------------------------------------------------
// Helper: validate tenant is present in query params
// ---------------------------------------------------------------------------
function requireTenant(req, res) {
  const tenant = String(req.query.tenant || "").trim();
  if (!tenant) {
    res.status(400).json({ ok: false, error: "Missing required parameter: tenant" });
    return null;
  }
  return tenant;
}

// ---------------------------------------------------------------------------
// POST /auth/url  - Generate Google OAuth consent URL
// ---------------------------------------------------------------------------
router.post("/auth/url", async (req, res) => {
  try {
    const tenantId = req.body.tenantId || req.query.tenant;
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: "Missing required parameter: tenantId" });
    }

    const authUrl = await googleAdsAuth.generateAuthUrl(tenantId);
    return res.json({ ok: true, url: authUrl });
  } catch (error) {
    console.error("google-ads /auth/url error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/callback  - Google OAuth redirect target
// This is hit directly by Google's redirect (not via HMAC).
// ---------------------------------------------------------------------------
router.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  const appHandle = process.env.SHOPIFY_APP_HANDLE || "adsautopilot-autopilot";

  try {
    if (!code) {
      throw new Error("Missing authorization code from Google");
    }

    // state carries a signed tenantId (shop name)
    const tenantId = googleAdsAuth.verifySignedState(state);
    if (!tenantId) {
      throw new Error("Invalid or expired OAuth state parameter");
    }

    // Exchange the authorization code for tokens
    const tokens = await googleAdsAuth.exchangeCodeForTokens(code);

    // Persist the connection for this tenant
    const connection = await googleAdsAuth.saveConnection(tenantId, tokens);
    const customerId = connection?.customerId || "";

    // Redirect back into the Shopify embedded app via admin URL
    const successUrl =
      `https://admin.shopify.com/store/${tenantId}/apps/${appHandle}/connect-google?connected=true&customerId=${encodeURIComponent(customerId)}`;
    console.log("OAuth success, redirecting to:", successUrl);
    return res.redirect(successUrl);
  } catch (error) {
    console.error("google-ads /auth/callback error:", error.message);
    // Try to extract tenantId for redirect even on error
    let tenantId = "";
    try { tenantId = googleAdsAuth.verifySignedState(state) || ""; } catch {}
    const errorBase = tenantId
      ? `https://admin.shopify.com/store/${tenantId}/apps/${appHandle}/connect-google`
      : (process.env.SHOPIFY_APP_URL || "") + "/app/connect-google";
    const errorUrl =
      `${errorBase}?error=auth_failed&message=${encodeURIComponent('Authorization failed. Please try again.')}`;
    return res.redirect(errorUrl);
  }
});

// ---------------------------------------------------------------------------
// GET /connection-status  - Check whether the tenant is connected
// ---------------------------------------------------------------------------
router.get("/connection-status", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return; // response already sent

    const connection = await googleAdsAuth.getConnection(tenantId);

    if (!connection) {
      return res.json({
        ok: true,
        connected: false,
        customerId: null,
        googleEmail: null,
        connectionStatus: "not_connected",
        connectedAt: null,
      });
    }

    return res.json({
      ok: true,
      connected: true,
      customerId: connection.customerId || null,
      email: connection.googleEmail || null,
      googleEmail: connection.googleEmail || null,
      accountId: connection.customerId || null,
      connectionStatus: connection.connectionStatus || "active",
      connectedAt: connection.connectedAt || null,
    });
  } catch (error) {
    console.error("google-ads /connection-status error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /accounts  - List accessible Google Ads accounts
// ---------------------------------------------------------------------------
router.get("/accounts", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const connection = await googleAdsAuth.getConnection(tenantId);
    if (!connection) {
      return res.status(404).json({ ok: false, error: "No Google Ads connection found for this tenant" });
    }

    const accounts = await googleAdsAuth.listAccessibleAccounts(tenantId);
    return res.json({
      ok: true,
      accounts: (accounts || []).map((a) => ({
        customerId: a.customerId,
        name: a.name,
        isManager: !!a.isManager,
      })),
    });
  } catch (error) {
    console.error("google-ads /accounts error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /accounts/select  - Select a specific Google Ads account
// ---------------------------------------------------------------------------
router.post("/accounts/select", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { customerId, accountId, loginCustomerId } = req.body || {};
    const resolvedCustomerId = customerId || accountId;
    if (!resolvedCustomerId) {
      return res.status(400).json({ ok: false, error: "Missing required parameter: customerId" });
    }

    await googleAdsAuth.selectAccount(tenantId, resolvedCustomerId, loginCustomerId);
    return res.json({ ok: true });
  } catch (error) {
    console.error("google-ads /accounts/select error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /disconnect  - Remove the Google Ads connection
// ---------------------------------------------------------------------------
router.post("/disconnect", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    await googleAdsAuth.disconnect(tenantId);
    return res.json({ ok: true });
  } catch (error) {
    console.error("google-ads /disconnect error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /quota  - Return current API quota status
// ---------------------------------------------------------------------------
router.get("/quota", async (req, res) => {
  try {
    const quota = await googleAdsQuota.getRemainingQuota();
    return res.json({
      ok: true,
      remaining: quota.remaining,
      used: quota.used,
      limit: quota.limit,
      percentUsed: quota.percentUsed,
    });
  } catch (error) {
    console.error("google-ads /quota error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ===========================================================================
// CAMPAIGN MANAGEMENT ROUTES
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /campaigns  - List all campaigns with metrics
// ---------------------------------------------------------------------------
router.get("/campaigns", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const campaigns = await googleAdsClient.listCampaigns(tenantId);
    return res.json({ ok: true, campaigns });
  } catch (error) {
    console.error("google-ads /campaigns error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /campaigns/create  - Create a full campaign
// ---------------------------------------------------------------------------
router.post("/campaigns/create", enforceCampaignLimits(), async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const body = req.body || {};
    const name = body.name || body.campaignName;
    const dailyBudget = body.dailyBudget;
    const biddingStrategy = body.biddingStrategy || (body.targetCpc ? 'TARGET_CPA' : 'MAXIMIZE_CONVERSIONS');
    const websiteUrl = body.websiteUrl || body.landingUrl;
    const keywords = body.keywords;
    const negativeKeywords = body.negativeKeywords;
    const headlines = body.headlines;
    const descriptions = body.descriptions;

    const result = await googleAdsCampaignManager.createCampaignFromConfig(tenantId, {
      name,
      dailyBudget,
      biddingStrategy,
      websiteUrl,
      keywords,
      negativeKeywords,
      headlines,
      descriptions,
    });

    // Record campaign creation for tier limit tracking
    try {
      await recordCampaignCreation(tenantId, name, req.subscription?.tier || 'starter');
    } catch (trackingErr) {
      console.error("Failed to record campaign creation:", trackingErr.message);
    }

    return res.json({ ok: true, campaign: result, campaignId: result?.campaignId || result?.id || null });
  } catch (error) {
    console.error("google-ads /campaigns/create error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /campaigns/:id/details  - Full campaign detail
// ---------------------------------------------------------------------------
router.get("/campaigns/:id/details", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const result = await googleAdsClient.getCampaignDetails(tenantId, req.params.id);
    return res.json({ ok: true, campaign: result });
  } catch (error) {
    console.error("google-ads /campaigns/:id/details error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /campaigns/:id/pause  - Pause campaign
// ---------------------------------------------------------------------------
router.post("/campaigns/:id/pause", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    await googleAdsClient.pauseCampaign(tenantId, req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    console.error("google-ads /campaigns/:id/pause error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /campaigns/:id/enable  - Enable campaign
// ---------------------------------------------------------------------------
router.post("/campaigns/:id/enable", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    await googleAdsClient.enableCampaign(tenantId, req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    console.error("google-ads /campaigns/:id/enable error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /campaigns/:id/budget  - Update budget
// ---------------------------------------------------------------------------
router.post("/campaigns/:id/budget", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { dailyBudget } = req.body || {};
    const micros = dailyBudget * 1_000_000;

    await googleAdsClient.updateCampaignBudget(tenantId, req.params.id, micros);
    return res.json({ ok: true });
  } catch (error) {
    console.error("google-ads /campaigns/:id/budget error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /campaigns/:id/negatives  - Add negative keywords
// ---------------------------------------------------------------------------
router.post("/campaigns/:id/negatives", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { keywords } = req.body || {};
    await googleAdsClient.addNegativeKeywords(tenantId, req.params.id, keywords);
    return res.json({ ok: true, added: keywords.length });
  } catch (error) {
    console.error("google-ads /campaigns/:id/negatives error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /campaigns/:id/search-terms  - Search terms report
// ---------------------------------------------------------------------------
router.get("/campaigns/:id/search-terms", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const result = await googleAdsClient.getSearchTermsReport(tenantId, req.params.id);
    return res.json({ ok: true, searchTerms: result });
  } catch (error) {
    console.error("google-ads /campaigns/:id/search-terms error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /campaigns/:id/keywords  - Keyword metrics
// ---------------------------------------------------------------------------
router.get("/campaigns/:id/keywords", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const result = await googleAdsClient.getKeywordMetrics(tenantId, req.params.id);
    return res.json({ ok: true, keywords: result });
  } catch (error) {
    console.error("google-ads /campaigns/:id/keywords error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /metrics  - Account-level metrics
// ---------------------------------------------------------------------------
router.get("/metrics", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    let dateRange = req.query.dateRange || "LAST_30_DAYS";

    // Clamp date range based on tier's data retention limit
    const retentionDays = { starter: 7, professional: 30, enterprise: 90 };
    const maxDays = retentionDays[req.subscription?.tier] || 7;
    const dateRangeDays = {
      LAST_7_DAYS: 7,
      LAST_14_DAYS: 14,
      LAST_30_DAYS: 30,
      LAST_90_DAYS: 90,
    };
    const requestedDays = dateRangeDays[dateRange] || 30;
    if (requestedDays > maxDays) {
      // Find the largest allowed range
      const allowedRanges = Object.entries(dateRangeDays)
        .filter(([, days]) => days <= maxDays)
        .sort(([, a], [, b]) => b - a);
      dateRange = allowedRanges.length > 0 ? allowedRanges[0][0] : "LAST_7_DAYS";
    }

    const result = await googleAdsClient.getCampaignMetrics(tenantId, dateRange);
    return res.json({ ok: true, metrics: result });
  } catch (error) {
    console.error("google-ads /metrics error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /campaigns/:id/auction-insights  - Competitor data
// ---------------------------------------------------------------------------
router.get("/campaigns/:id/auction-insights", requireFeature("advanced_ai_optimization"), async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const result = await googleAdsClient.getAuctionInsights(tenantId, req.params.id);
    return res.json({ ok: true, insights: result });
  } catch (error) {
    console.error("google-ads /campaigns/:id/auction-insights error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ===========================================================================
// SYNC & AUTOPILOT ROUTES
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /sync  - Manual trigger for data sync
// ---------------------------------------------------------------------------
router.post("/sync", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { runFullSync } = await import("../services/google-ads-sync.js");
    const result = await runFullSync(tenantId);
    return res.json({ ok: true, result });
  } catch (error) {
    console.error("google-ads /sync error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /optimize  - Manual trigger for autopilot optimization
// ---------------------------------------------------------------------------
router.post("/optimize", requireFeature("automated_bid_management"), async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { runAutopilotCycle } = await import("../services/google-ads-autopilot.js");
    const result = await runAutopilotCycle(tenantId);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("google-ads /optimize error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /autopilot/status  - Get autopilot config and status
// ---------------------------------------------------------------------------
router.get("/autopilot/status", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { getAutopilotStatus } = await import("../services/google-ads-autopilot.js");
    const result = await getAutopilotStatus(tenantId);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("google-ads /autopilot/status error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// POST /autopilot/config  - Update autopilot settings
// ---------------------------------------------------------------------------
router.post("/autopilot/config", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { setAutopilotConfig } = await import("../services/google-ads-autopilot.js");
    const result = await setAutopilotConfig(tenantId, req.body);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("google-ads /autopilot/config error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /autopilot/history  - Get autopilot run history
// ---------------------------------------------------------------------------
router.get("/autopilot/history", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const limit = parseInt(req.query.limit) || 20;
    const { getAutopilotHistory } = await import("../services/google-ads-autopilot.js");
    const result = await getAutopilotHistory(tenantId, limit);
    return res.json({ ok: true, entries: result });
  } catch (error) {
    console.error("google-ads /autopilot/history error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /sync/status  - Get last sync time and status
// ---------------------------------------------------------------------------
router.get("/sync/status", async (req, res) => {
  try {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;

    const { getLastSyncTime } = await import("../services/google-ads-sync.js");
    const result = await getLastSyncTime(tenantId);
    return res.json({ ok: true, lastSyncTime: result });
  } catch (error) {
    console.error("google-ads /sync/status error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
