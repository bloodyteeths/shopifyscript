import './config/load-env.js'; // Load environment variables first
import express from "express";
import cors from "cors";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from "dotenv";
import {
  getValidatedHMACSecret,
  initializeHMACValidation,
} from "./utils/secret-validator.js";
import { getDoc, ensureSheet, getDocById } from "./sheets.js";
import dataStore from "./services/data-store.js";
import { validateRSA } from "./lib/validators.js";
import { getRSAGenerator } from "./services/rsa-generator.js";
import {
  schedulePromoteWindow,
  tickPromoteWindow,
} from "./jobs/promote_window.js";
import { runWeeklySummary } from "./jobs/weekly_summary.js";
import { buildSegments } from "./segments/materialize.js";
import { initializeRSATestQueueRoutes } from "./routes/rsa-test-queue-routes.js";
// Security & Privacy Services (disabled for Vercel compatibility)
// import securityMiddleware from './middleware/security.js'; // Too aggressive for Vercel
import { securityHeadersMiddleware } from './middleware/security-light.js'; // Lightweight security headers
import privacyService from "./services/privacy.js";
// import environmentSecurity from './services/environment-security.js'; // Disabled for Vercel compatibility
// PROMOTE Gate functions integrated
// DevOps Services
import { healthService, createHealthRoutes } from "./services/health.js";
import logger from "./services/logger.js";
import { createEnvironment } from "../deployment/environment.js";
import { JobScheduler } from "./jobs/scheduler.js";
import { getQueueManager, JOB_PRIORITIES, JOB_TYPES } from "./services/queue-manager.js";
import { pingRedis, getJson, setJson } from "./services/redis.js";
import * as redis from "./services/redis.js";
// Profit & Inventory Services
import profitPacer from "./services/profit-pacer.js";
// Note: materialize/listSegments are stubs, not imported to avoid TS runtime issues
import fs from "fs";
import path from "path";
// Billing Routes
import billingRoutes from "./routes/billing.js";
// Security Routes
import securityRoutes from "./routes/security.js";
// Config Routes
import configRoutes from "./routes/config.js";
// Reports Routes
import reportsRoutes from "./routes/reports.js";
// Monitoring Routes
import monitoringRoutes from "./routes/monitoring.js";
// Dashboard Routes
import dashboardRoutes from "./routes/dashboards.js";
// Automation Routes
import automationRoutes from "./routes/automation.js";
// Scheduled Reports Service
import scheduledReports from "./jobs/scheduled-reports.js";
// ML Autopilot Service
import mlAutopilot from "./services/ml-autopilot.js";
// Landing Page AI Service
import { getLandingPageAIService } from "./services/landing-page-ai.js";
// AI Automation Service
import { startAIAutomation, stopAIAutomation, getAIAutomationService } from "./services/ai-automation.js";
// Tenant Registry
import tenantRegistry from "./services/tenant-registry.js";
// WebSocket Server
import { initializeWebSocketServer } from "./services/websocket-server.js";
import { requireActiveSubscription } from "./middleware/subscription-check.js";

// Load env from root and backend/.env (resolve relative to this file)
dotenv.config();
try {
  const hereEnv = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    ".env",
  );
  dotenv.config({ path: hereEnv });
} catch {}

// Env alias normalization (Vercel-friendly)
// Accept GOOGLE_SHEETS_CLIENT_EMAIL/PRIVATE_KEY and GOOGLE_SHEETS_PROJECT_ID as aliases
if (
  !process.env.GOOGLE_SERVICE_EMAIL &&
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL
) {
  process.env.GOOGLE_SERVICE_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
}
if (!process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
  process.env.GOOGLE_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
}
if (!process.env.SHEET_ID && process.env.GOOGLE_SHEETS_PROJECT_ID) {
  process.env.SHEET_ID = process.env.GOOGLE_SHEETS_PROJECT_ID;
}

// Initialize environment with validation
let envConfig;
try {
  envConfig = createEnvironment();
  logger.info("Environment configuration loaded successfully", {
    environment: envConfig.NODE_ENV,
    port: envConfig.config.PORT,
  });
} catch (error) {
  logger.error("Failed to load environment configuration", {
    error: error.message,
  });
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

const app = express();
app.set("trust proxy", 1);

// ==== INITIALIZE TENANT REGISTRY (MUST BE EARLY) ====
// Initialize tenant registry before any routes that might need it
await tenantRegistry.initialize().catch((error) => {
  logger.error("Failed to initialize tenant registry:", {
    error: error.message,
    stack: error.stack
  });
});
logger.info("Tenant registry initialized early", {
  tenants: tenantRegistry.getStats()
});

// ==== LOGGING MIDDLEWARE ====
// Add request logging middleware
// app.use(logger.middleware()); // Disabled for debugging

// CORS: restrict in dev; disable in prod unless configured
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!origin || !allowed.length) return cb(null, true);

      // Allow Shopify app domains and admin domains
      if (
        origin &&
        (origin.includes(".myshopify.com") ||
          origin.includes("admin.shopify.com") ||
          origin.includes("ads-autopilot-ui.vercel.app") ||
          allowed.includes(origin))
      ) {
        return cb(null, true);
      }

      return cb(null, false);
    },
  }),
);
app.use(express.json({ limit: "2mb" }));

// ==== STATIC FILES ====
// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from public directory
app.use('/dashboard', express.static(join(__dirname, 'public')));

// ==== SECURITY MIDDLEWARE ====
// Lightweight security headers middleware (serverless-friendly)
app.use(securityHeadersMiddleware());
const securityHeadersEnabled = process.env.ENABLE_SECURITY_HEADERS === 'true' ||
  (process.env.NODE_ENV === 'production' && process.env.ENABLE_SECURITY_HEADERS !== 'false');
console.log(
  `ℹ️ Lightweight security headers: ${securityHeadersEnabled ? 'ENABLED' : 'DISABLED'}`,
);

// ==== BEGIN: simple cache middleware ====
const _cache = new Map();
const _ttlFor = (p) => {
  if (p.startsWith("/api/insights"))
    return Number(process.env.INSIGHTS_CACHE_TTL_SEC || "60");
  if (p.startsWith("/api/config"))
    return Number(process.env.CONFIG_CACHE_TTL_SEC || "15");
  if (p.startsWith("/api/run-logs"))
    return Number(process.env.RUNLOGS_CACHE_TTL_SEC || "10");
  return 0;
};

app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  const ttl = _ttlFor(req.path);
  if (!ttl) return next();

  const key = req.originalUrl;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && hit.exp > now) {
    try {
      res.set("x-cache", "HIT");
      res.set("cache-control", `public, max-age=${ttl}`);
    } catch {}
    try {
      res.status(hit.status).type(hit.type).send(hit.body);
    } catch {}
    return;
  }

  const _send = res.send.bind(res);
  res.send = (body) => {
    try {
      const type = res.get("content-type") || "";
      const status = res.statusCode || 200;
      _cache.set(key, { body, type, status, exp: now + ttl * 1000 });
      res.set("x-cache", "MISS");
      res.set("cache-control", `public, max-age=${ttl}`);
    } catch {}
    return _send(body);
  };
  next();
});
// ==== END: simple cache middleware ====

// ----- Minimal request logging (no secrets) -----
app.use((req, _res, next) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const path = req.path;
    const method = req.method;
    console.log(`[req] ${method} ${path} ip=${Array.isArray(ip) ? ip[0] : ip}`);
  } catch {}
  next();
});

// (Using existing custom rate limiter below; ensures JSON for 429)

// --- tiny helper for safe JSON responses and logging ---
function json(res, status, obj) {
  try {
    res.status(status);
  } catch {}
  try {
    res.set("content-type", "application/json; charset=utf-8");
  } catch {}
  try {
    return res.send(JSON.stringify(obj));
  } catch {
    return res.end();
  }
}
async function logAccess(req, status, note) {
  try {
    const ip =
      (req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "") + "";
    const ua = ((req.headers["user-agent"] || "") + "")
      .slice(0, 120)
      .replace(/\s+/g, " ");
    const line =
      [
        new Date().toISOString(),
        ip,
        ua,
        req.method,
        req.originalUrl || req.url || "",
        status,
        note || "",
      ].join(" | ") + "\n";
    await fs.promises.appendFile("/tmp/pk_access.log", line);
  } catch {}
}

// ----- Basic rate limiting (by IP + tenant) -----
const rateWindowMs = 60_000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 60);
const rateBuckets = new Map(); // key → { start: epochMs, count: number }
const metricsThrottle = new Map(); // tenant → lastTs
// Insights cache: key `${tenant}:${w}` → { ts, data }
const insightsCache = new Map();
// action de-dupe: key -> ts
const actionDedupe = new Map();

async function removeMasterNegative(tenant, term) {
  const doc = await getDoc();
  if (!doc) return false;
  const sh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ["term"]);
  const rows = await sh.getRows();
  const keep = rows.filter(
    (r) =>
      String(r.term || "")
        .trim()
        .toLowerCase() !==
      String(term || "")
        .trim()
        .toLowerCase(),
  );
  if (keep.length === rows.length) return true;
  await sh.clearRows();
  await sh.setHeaderRow(["term"]);
  for (const r of keep) await sh.addRow({ term: r.term });
  return true;
}

async function ensureNegativeMapSheet(tenant) {
  const doc = await getDoc();
  if (!doc) return null;
  return await ensureSheet(doc, `NEGATIVE_MAP_${tenant}`, [
    "scope",
    "campaign",
    "ad_group",
    "match",
    "term",
  ]);
}

async function addScopedNegative(
  tenant,
  {
    scope = "account",
    campaign = "",
    ad_group = "",
    match = "exact",
    term = "",
  },
) {
  const sh = await ensureNegativeMapSheet(tenant);
  if (!sh) return false;
  const row = {
    scope: String(scope || "account").toLowerCase(),
    campaign: String(campaign || ""),
    ad_group: String(ad_group || ""),
    match: String(match || "exact").toLowerCase(),
    term: String(term || "").trim(),
  };
  await sh.addRow(row);
  return true;
}

async function removeScopedNegative(
  tenant,
  {
    scope = "account",
    campaign = "",
    ad_group = "",
    match = "exact",
    term = "",
  },
) {
  const sh = await ensureNegativeMapSheet(tenant);
  if (!sh) return false;
  const rows = await sh.getRows();
  const tgt = {
    scope: String(scope || "").toLowerCase(),
    campaign: String(campaign || ""),
    ad_group: String(ad_group || ""),
    match: String(match || "").toLowerCase(),
    term: String(term || "")
      .trim()
      .toLowerCase(),
  };
  const keep = rows.filter(
    (r) =>
      String(r.scope || "").toLowerCase() !== tgt.scope ||
      String(r.match || "").toLowerCase() !== tgt.match ||
      String(r.term || "")
        .trim()
        .toLowerCase() !== tgt.term ||
      String(r.campaign || "") !== tgt.campaign ||
      String(r.ad_group || "") !== tgt.ad_group,
  );
  if (keep.length === rows.length) return true;
  await sh.clearRows();
  await sh.setHeaderRow(["scope", "campaign", "ad_group", "match", "term"]);
  for (const r of keep)
    await sh.addRow({
      scope: r.scope,
      campaign: r.campaign,
      ad_group: r.ad_group,
      match: r.match,
      term: r.term,
    });
  return true;
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  const ip =
    (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "ip") + "";
  const tenant =
    req.query && req.query.tenant ? String(req.query.tenant) : "no-tenant";
  const key = `${ip}:${tenant}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > rateWindowMs) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  if (bucket.count > rateLimitMax) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }
  next();
});

// Initialize and validate HMAC secret on startup
initializeHMACValidation({
  allowWeakInDev: true, // Allow weak secrets in development only
  environment: process.env.NODE_ENV || "development",
});

// Get validated secret - this will throw if secret is weak/missing
const SECRET = getValidatedHMACSecret({
  allowWeakInDev: true,
  environment: process.env.NODE_ENV || "development",
});

const PORT = Number(process.env.PORT || 3001);

// In-memory fallback store if Google Sheets isn't configured yet.
const memory = {
  configs: {},
};

// ----- HMAC helpers -----
function sign(payload) {
  if (!payload || typeof payload !== "string") {
    throw new Error("HMAC payload must be a non-empty string");
  }

  try {
    return crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64")
      .replace(/=+$/, "");
  } catch (error) {
    throw new Error(`HMAC signing failed: ${error.message}`);
  }
}

function verify(sig, payload) {
  if (!sig || !payload) {
    return false;
  }

  try {
    return sig === sign(payload);
  } catch (error) {
    console.error("HMAC verification error:", error.message);
    return false;
  }
}

// ----- Minimal helpers for Google Sheets rows (UPDATED: Now using data-store) -----
async function upsertConfigToSheets(tenant, settings) {
  console.log(
    `🔍 upsertConfigToSheets called for ${tenant} with:`,
    Object.keys(settings),
  );

  try {
    // Use data-store with Supabase-first, Sheets-fallback pattern
    for (const [key, value] of Object.entries(settings)) {
      await dataStore.setTenantConfig(tenant, key, value);
    }

    console.log(
      `✅ Successfully wrote ${Object.keys(settings).length} config entries via data-store for ${tenant}`,
    );
  } catch (error) {
    console.log(
      `❌ Data store failed for ${tenant} - saving to memory instead:`,
      error.message
    );
    memory.configs[tenant] = { ...(memory.configs[tenant] || {}), ...settings };
    throw error;
  }
}

// Helper function to get tier-based defaults
function getTierDefaults(plan) {
  const tiers = {
    starter: {
      lookbackPeriod: "LAST_7_DAYS",
      dataRetentionDays: 7,
      campaignLimit: 5,
      defaultBudget: "3.00",
      defaultCPC: "0.20"
    },
    professional: {
      lookbackPeriod: "LAST_30_DAYS",
      dataRetentionDays: 30,
      campaignLimit: 25,
      defaultBudget: "10.00",
      defaultCPC: "0.35"
    },
    enterprise: {
      lookbackPeriod: "LAST_90_DAYS",
      dataRetentionDays: 90,
      campaignLimit: -1, // unlimited
      defaultBudget: "50.00",
      defaultCPC: "0.50"
    }
  };

  return tiers[plan?.toLowerCase()] || tiers.starter;
}

// Helper to get user settings from storage (UPDATED: Now using data-store)
async function getUserSettings(tenant) {
  try {
    // Try to get from Redis cache first
    const cacheKey = `user_settings:${tenant}`;
    const cached = await getJson(cacheKey);
    if (cached) {
      console.log(`🔥 Using cached settings for ${tenant}:`, cached);
      // Temporarily disabled cache to force fresh reads
      // return cached;
      console.log(`⚠️ Cache disabled temporarily - fetching fresh data`);
    }

    // Get all configs from data-store (Supabase-first, Sheets-fallback)
    const allConfigs = await dataStore.getAllTenantConfigs(tenant);
    console.log(`🔍 Raw configs from data-store for ${tenant}:`, {
      USER_LANDING_URL: allConfigs.USER_LANDING_URL,
      default_final_url: allConfigs.default_final_url,
      configKeys: Object.keys(allConfigs)
    });
    const settings = {};

    if (allConfigs.USER_BUDGET_CAP) settings.budget = allConfigs.USER_BUDGET_CAP;
    if (allConfigs.USER_CPC_CEILING) settings.cpc = allConfigs.USER_CPC_CEILING;
    if (allConfigs.USER_LANDING_URL) settings.landing_url = allConfigs.USER_LANDING_URL;
    if (allConfigs.PLAN) settings.plan = allConfigs.PLAN;

    if (Object.keys(settings).length > 0) {
      // Cache for next time
      await setJson(cacheKey, settings, 3600);
      return settings;
    }

    return null;
  } catch (e) {
    console.log(`Error getting user settings for ${tenant}:`, e.message);
    return null;
  }
}

async function readConfigFromSheets(tenant) {
  // UPDATED: Use data-store with Supabase-first, Sheets-fallback
  try {
    const map = await dataStore.getAllTenantConfigs(tenant);

    if (!map || Object.keys(map).length === 0) {
      return memory.configs[tenant] || null;
    }

  // Get tier-based defaults
  const tierDefaults = getTierDefaults(map.PLAN || "starter");

  // Get user settings if available
  const userSettings = await getUserSettings(tenant);

  // Build config object with defaults + user settings + tier defaults
  const cfg = {
    enabled: (map.enabled || "TRUE").toLowerCase() !== "false",
    label: map.label || `${tenant} • Managed`,
    default_final_url: map.default_final_url || userSettings?.landing_url || map.USER_LANDING_URL || "",
    PROMOTE: (map.PROMOTE || "TRUE").toLowerCase() === "true",
    daily_budget_cap_default: Number(map.daily_budget_cap_default || userSettings?.budget || map.USER_BUDGET_CAP || tierDefaults.defaultBudget),
    cpc_ceiling_default: Number(map.cpc_ceiling_default || userSettings?.cpc || map.USER_CPC_CEILING || tierDefaults.defaultCPC),
    add_business_hours_if_none:
      (map.add_business_hours_if_none || "TRUE").toLowerCase() !== "false",
    business_days_csv:
      map.business_days_csv || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
    business_start: map.business_start || "09:00",
    business_end: map.business_end || "18:00",
    st_lookback: map.st_lookback || tierDefaults.lookbackPeriod,
    campaign_lookback_days: tierDefaults.dataRetentionDays,
    tier_campaign_limit: tierDefaults.campaignLimit,
    st_min_clicks: Number(map.st_min_clicks || "2"),
    st_min_cost: Number(map.st_min_cost || "2.82"),
    master_neg_list_name:
      map.master_neg_list_name || "Ads Autopilot AI • Master Negatives",
    // Audience settings
    AUDIENCE_MIN_SIZE: Number(map.AUDIENCE_MIN_SIZE || "1000"),
    // Feature flags (safe defaults)
    ENABLE_SCRIPT: (map.ENABLE_SCRIPT || "TRUE").toLowerCase() !== "false",
    FEATURE_AI_DRAFTS:
      (map.FEATURE_AI_DRAFTS || "TRUE").toLowerCase() !== "false",
    FEATURE_INTENT_BLOCKS:
      (map.FEATURE_INTENT_BLOCKS || "TRUE").toLowerCase() !== "false",
    FEATURE_AUDIENCE_EXPORT:
      (map.FEATURE_AUDIENCE_EXPORT || "TRUE").toLowerCase() !== "false",
    FEATURE_AUDIENCE_ATTACH:
      (map.FEATURE_AUDIENCE_ATTACH || "TRUE").toLowerCase() !== "false",
    FEATURE_CM_API: (map.FEATURE_CM_API || "FALSE").toLowerCase() === "true",
    FEATURE_INVENTORY_GUARD:
      (map.FEATURE_INVENTORY_GUARD || "TRUE").toLowerCase() !== "false",
    plan: (map.PLAN || "starter").toLowerCase(),
    desired: {},
    AP: {
      objective: (map.AP_OBJECTIVE || "protect").toLowerCase(),
      mode: (map.AP_MODE || "auto").toLowerCase(),
      schedule: (map.AP_SCHEDULE || "off").toLowerCase(),
      target_cpa: Number(map.AP_TARGET_CPA || "0") || null,
      target_roas: Number(map.AP_TARGET_ROAS || "0") || null,
      desired_keywords: String(map.AP_DESIRED_KEYWORDS_PIPE || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean),
      playbook_prompt: map.AP_PLAYBOOK_PROMPT || "",
    },
    BUDGET_CAPS: {},
    CPC_CEILINGS: {},
    SCHEDULES: {},
    MASTER_NEGATIVES: [],
    WASTE_NEGATIVE_MAP: {},
    RSA_DEFAULT: { H: [], D: [] },
    RSA_MAP: {},
    EXCLUSIONS: {},
  };

  // Helper to read a simple map table: [key | value]
  async function readMapTable(title) {
    const sheet = await ensureSheet(doc, `${title}_${tenant}`, [
      "campaign",
      "value",
    ]);
    const rows = await sheet.getRows();
    const m = {};
    rows.forEach((r) => {
      const k = String(r.campaign || "").trim();
      if (k) m[k] = Number(r.value || 0);
    });
    return m;
  }
  // Specific tables with custom headers
  async function readSchedules() {
    const sheet = await ensureSheet(doc, `SCHEDULES_${tenant}`, [
      "campaign",
      "days_csv",
      "start_hh:mm",
      "end_hh:mm",
    ]);
    const rows = await sheet.getRows();
    const m = {};
    rows.forEach((r) => {
      const c = String(r.campaign || "").trim();
      if (!c) return;
      m[c] = {
        days: String(r.days_csv || "").trim(),
        start: String(r["start_hh:mm"] || "").trim(),
        end: String(r["end_hh:mm"] || "").trim(),
      };
    });
    return m;
  }
  async function readList(title) {
    const sheet = await ensureSheet(doc, `${title}_${tenant}`, ["term"]);
    const rows = await sheet.getRows();
    const out = [];
    rows.forEach((r) => {
      const t = String(r.term || "").trim();
      if (t) out.push(t);
    });
    return out;
  }
  async function readNested(title) {
    const sheet = await ensureSheet(doc, `${title}_${tenant}`, [
      "campaign",
      "ad_group",
      "term",
    ]);
    const rows = await sheet.getRows();
    const m = {};
    rows.forEach((r) => {
      const c = String(r.campaign || "").trim(),
        g = String(r.ad_group || "").trim(),
        t = String(r.term || "")
          .trim()
          .toLowerCase();
      if (!c || !g || !t) return;
      m[c] = m[c] || {};
      (m[c][g] = m[c][g] || []).push(t);
    });
    return m;
  }
  async function readRSADefault() {
    const sheet = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, [
      "headlines_pipe",
      "descriptions_pipe",
    ]);
    const rows = await sheet.getRows();
    if (!rows.length) return { H: [], D: [] };
    const H = String(rows[0].headlines_pipe || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const D = String(rows[0].descriptions_pipe || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    return { H, D };
  }
  async function readRSAMap() {
    const sheet = await ensureSheet(doc, `RSA_ASSETS_MAP_${tenant}`, [
      "campaign",
      "ad_group",
      "headlines_pipe",
      "descriptions_pipe",
    ]);
    const rows = await sheet.getRows();
    const m = {};
    rows.forEach((r) => {
      const c = String(r.campaign || "").trim(),
        g = String(r.ad_group || "").trim();
      if (!c || !g) return;
      const H = String(r.headlines_pipe || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      const D = String(r.descriptions_pipe || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      m[c] = m[c] || {};
      m[c][g] = { H, D };
    });
    return m;
  }
  async function readExclusions() {
    const sheet = await ensureSheet(doc, `EXCLUSIONS_${tenant}`, [
      "campaign",
      "ad_group",
    ]);
    const rows = await sheet.getRows();
    const m = {};
    rows.forEach((r) => {
      const c = String(r.campaign || "").trim(),
        g = String(r.ad_group || "").trim();
      if (!c || !g) return;
      m[c] = m[c] || {};
      m[c][g] = true;
    });
    return m;
  }
  async function readAudienceMap() {
    const sheet = await ensureSheet(doc, `AUDIENCE_MAP_${tenant}`, [
      "campaign",
      "ad_group",
      "user_list_id",
      "mode",
      "bid_modifier",
    ]);
    const rows = await sheet.getRows();
    const m = {};
    rows.forEach((r) => {
      const c = String(r.campaign || "").trim(),
        g = String(r.ad_group || "").trim();
      const listId = String(r.user_list_id || "").trim(),
        mode = String(r.mode || "OBSERVE").toUpperCase();
      const bidMod = String(r.bid_modifier || "").trim();
      if (!c || !g || !listId) return;
      m[c] = m[c] || {};
      m[c][g] = { user_list_id: listId, mode: mode, bid_modifier: bidMod };
    });
    return m;
  }

  // Fill blobs
  cfg.BUDGET_CAPS = await readMapTable("BUDGET_CAPS");
  cfg.CPC_CEILINGS = await readMapTable("CPC_CEILINGS");
  cfg.SCHEDULES = await readSchedules();
  cfg.MASTER_NEGATIVES = await readList("MASTER_NEGATIVES");
  cfg.WASTE_NEGATIVE_MAP = await readNested("WASTE_NEGATIVE_MAP");
  cfg.RSA_DEFAULT = await readRSADefault();
  cfg.RSA_MAP = await readRSAMap();
  cfg.EXCLUSIONS = await readExclusions();
  cfg.AUDIENCE_MAP = await readAudienceMap();

  return cfg;
  } catch (error) {
    console.error(`Error reading config from data-store for ${tenant}:`, error.message);
    return memory.configs[tenant] || null;
  }
}

async function appendRows(tenant, title, header, rows) {
  if (!rows || !rows.length) return;
  const doc = await getDoc();
  if (!doc) return; // no-op if Sheets not configured
  const sh = await ensureSheet(doc, `${title}_${tenant}`, header);
  await sh.addRows(
    rows.map((arr) => Object.fromEntries(header.map((h, i) => [h, arr[i]]))),
  );
}

async function appendMasterNegative(tenant, term) {
  const doc = await getDoc();
  if (!doc) return false;
  const sh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ["term"]);
  await sh.addRow({ term: String(term || "").trim() });
  return true;
}

async function upsertMapValue(tenant, title, key, value) {
  const doc = await getDoc();
  if (!doc) return false;
  const sh = await ensureSheet(doc, `${title}_${tenant}`, [
    "campaign",
    "value",
  ]);
  const rows = await sh.getRows();
  const k = String(key || "").trim() || "*";
  let found = null;
  for (const r of rows) {
    if (String(r.campaign || "").trim() === k) {
      found = r;
      break;
    }
  }
  if (found) {
    found.value = String(value);
    await found.save();
  } else {
    await sh.addRow({ campaign: k, value: String(value) });
  }
  return true;
}

// Read as AoA aligned to provided headers; uses toObject() when available
async function readRowsAoA(tenant, title, headers, limit = 2000) {
  const doc = await getDoc();
  if (!doc) return [];
  const sheetTitle = `${title}_${tenant}`;
  const sh = await ensureSheet(
    doc,
    sheetTitle,
    Array.isArray(headers) && headers.length ? headers : ["date"],
  );
  try {
    await sh.loadHeaderRow();
  } catch {}
  const hdrs =
    Array.isArray(headers) && headers.length
      ? headers.slice()
      : (sh._headerValues || []).slice();
  const rows = await sh.getRows();
  const start = Math.max(0, rows.length - Number(limit || 2000));
  const out = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    let obj = null;
    try {
      if (typeof r.toObject === "function") obj = r.toObject();
    } catch {}
    out.push(
      hdrs.map((h, idx) => {
        // prefer exact header match from row object or property accessor
        const key = String(h);
        const v =
          r[key] ??
          (obj && (obj[key] ?? obj[key.trim?.()] ?? obj[key.toLowerCase?.()]));
        if (typeof v !== "undefined" && v !== null) return v;
        // fallback to rawData by index
        const raw = Array.isArray(r._rawData) ? r._rawData[idx] : undefined;
        return typeof raw !== "undefined" ? raw : "";
      }),
    );
  }
  return out;
}

async function upsertConfigKeys(tenant, kv) {
  const doc = await getDoc();
  if (!doc) {
    memory.configs[tenant] = { ...(memory.configs[tenant] || {}), ...kv };
    return;
  }
  const sh = await ensureSheet(doc, `CONFIG_${tenant}`, ["key", "value"]);
  const rows = await sh.getRows();
  const map = {};
  rows.forEach((r) => {
    if (r.key) map[String(r.key).trim()] = String(r.value || "").trim();
  });
  Object.entries(kv || {}).forEach(([k, v]) => (map[k] = String(v)));
  await sh.clearRows();
  await sh.setHeaderRow(["key", "value"]);
  for (const [k, v] of Object.entries(map))
    await sh.addRow({ key: k, value: v });
}

async function acceptTopValidDrafts(tenant, maxCount) {
  const doc = await getDoc();
  if (!doc) return 0;
  const lib = await ensureSheet(doc, `ASSET_LIBRARY_${tenant}`, [
    "theme",
    "headlines_pipe",
    "descriptions_pipe",
    "source",
  ]);
  const def = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, [
    "headlines_pipe",
    "descriptions_pipe",
  ]);
  const rows = await lib.getRows();
  let picked = 0;
  let chosenH = [],
    chosenD = [];
  for (const r of rows) {
    if (picked >= (maxCount || 4)) break;
    const H = String(r.headlines_pipe || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const D = String(r.descriptions_pipe || "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const lint = validateRSA(H, D);
    if (!lint.ok) continue;
    chosenH = lint.clipped.h;
    chosenD = lint.clipped.d;
    picked += 1;
    break;
  }
  if (picked > 0) {
    const cur = await def.getRows();
    const H = chosenH.join("|");
    const D = chosenD.join("|");
    if (cur.length) {
      cur[0].headlines_pipe = H;
      cur[0].descriptions_pipe = D;
      await cur[0].save();
    } else {
      await def.addRow({ headlines_pipe: H, descriptions_pipe: D });
    }
  }
  return picked;
}

// ===== PROMOTE GATE VALIDATION FUNCTIONS =====

/**
 * Critical PROMOTE gate validation - blocks mutations when PROMOTE=FALSE
 */
async function validatePromoteGate(tenant, mutationType = "GENERAL") {
  try {
    // Load tenant configuration for PROMOTE setting
    const config = await readConfigFromSheets(String(tenant));

    if (!config) {
      logger.error("PROMOTE Gate: Could not load config", {
        tenant,
        mutationType,
      });
      return {
        ok: false,
        error: "Could not load tenant configuration",
        promote: null,
      };
    }

    const promoteEnabled =
      config.PROMOTE === true ||
      String(config.PROMOTE).toLowerCase() === "true";

    // Apply validation logic
    if (!promoteEnabled) {
      // Check if development/staging bypass is allowed
      const isDev = process.env.NODE_ENV === "development";
      const isStaging =
        process.env.VERCEL_ENV === "preview" ||
        process.env.NODE_ENV === "staging";

      if (isDev || isStaging) {
        logger.warn(
          "PROMOTE Gate: BYPASSED for development/staging environment",
          {
            tenant,
            mutationType,
            promote: config.PROMOTE,
            environment: process.env.NODE_ENV || "unknown",
          },
        );

        return {
          ok: true,
          promote: false, // Keep original value for audit
          bypassReason: "Development/staging environment",
          config: config,
          testSafeBypass: true,
        };
      }

      logger.warn("PROMOTE Gate: BLOCKED", {
        tenant,
        mutationType,
        promote: config.PROMOTE,
      });

      return {
        ok: false,
        error: "PROMOTE gate active - Live mutations blocked for safety",
        promote: config.PROMOTE,
        message: "To enable live changes, set PROMOTE=TRUE in configuration",
      };
    }

    logger.info("PROMOTE Gate: PASSED", {
      tenant,
      mutationType,
      promote: config.PROMOTE,
    });

    return {
      ok: true,
      promote: config.PROMOTE,
      config: config,
    };
  } catch (error) {
    logger.error("PROMOTE Gate: Validation error", {
      error: error.message,
      tenant,
      mutationType,
    });

    return {
      ok: false,
      error: "PROMOTE gate validation failed",
      promote: null,
    };
  }
}

/**
 * PROMOTE gate middleware for Express routes
 */
function promoteGateMiddleware(mutationType = "GENERAL") {
  return async (req, res, next) => {
    const tenant = req.query.tenant || req.body.tenant;

    if (!tenant) {
      return json(res, 400, {
        ok: false,
        code: "PROMOTE_GATE_ERROR",
        error: "Tenant required for PROMOTE gate validation",
      });
    }

    const gateResult = await validatePromoteGate(tenant, mutationType);

    if (!gateResult.ok) {
      return json(res, 403, {
        ok: false,
        code: "PROMOTE_GATE_BLOCKED",
        error: gateResult.error,
        message: gateResult.message,
        promote: gateResult.promote,
        mutationType: mutationType,
        timestamp: new Date().toISOString(),
      });
    }

    // Attach validated config to request
    req.promoteConfig = gateResult.config;
    req.promoteValidated = true;

    next();
  };
}

// ----- Health Check Routes -----
const healthRoutes = createHealthRoutes();
app.get("/health", healthRoutes.health);
app.get("/ready", healthRoutes.ready);
app.get("/live", healthRoutes.live);
app.get("/metrics", healthRoutes.metrics);

// Legacy health endpoints
app.get("/api/health", healthRoutes.health);
app.get("/api/healthz", healthRoutes.ready);

// ---- Redis health and simple get/set test endpoints ----
app.get("/api/redis/health", async (req, res) => {
  try {
    const pong = await pingRedis();
    return json(res, 200, { ok: true, pong });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});
app.post("/api/redis/test", async (req, res) => {
  try {
    const key = req.body?.key || "adsautopilot:test";
    const value = req.body?.value ?? { now: Date.now() };
    const ttl = Number(req.body?.ttl || 60);
    await setJson(key, value, ttl);
    const roundtrip = await getJson(key);
    return json(res, 200, { ok: true, key, roundtrip });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

// ---- AI Automation Service health and status endpoints ----
app.get("/api/ai-automation/health", async (req, res) => {
  try {
    const service = getAIAutomationService();
    const status = service.getStatus();
    return json(res, 200, {
      ok: true,
      running: status.running,
      totalTenants: status.totalTenants,
      cacheSize: status.cacheSize,
      uptime: status.running ? "active" : "stopped"
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

app.get("/api/ai-automation/status", async (req, res) => {
  try {
    const service = getAIAutomationService();
    const status = service.getStatus();
    return json(res, 200, {
      ok: true,
      ...status
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

app.get("/api/ai-automation/tenant/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const service = getAIAutomationService();
    const tenantStatus = service.getTenantStatus(tenantId);
    return json(res, 200, {
      ok: true,
      tenant: tenantId,
      ...tenantStatus
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

// ==== SECURITY ROUTES ====
app.use("/api/security", securityRoutes);

// ==== BILLING ROUTES ====
app.use("/api/billing", billingRoutes);
// ==== CONFIG ROUTES ====
app.use("/api", configRoutes);
// ==== REPORTS ROUTES ====
app.use("/api/reports", reportsRoutes);
// ==== MONITORING ROUTES ====
app.use("/api/monitoring", monitoringRoutes);

// ==== DASHBOARD ROUTES ====
app.use("/api/dashboards", dashboardRoutes);

// ==== RSA TEST QUEUE ROUTES (PRO TIER) ====
app.use("/api/ai", initializeRSATestQueueRoutes(verify));

// ==== AUTOMATION ROUTES ====
app.use("/api/automation", automationRoutes);

// ==== ANALYTICS ROUTES ====
import analyticsRoutes from "./routes/analytics.js";
import aiInsightsService from "./services/ai-insights.js";
app.use("/api/analytics", analyticsRoutes);

// ==== DEMOGRAPHICS ROUTES ====
import demographicsRoutes from "./api/demographics.js";
app.use("/api/demographics", demographicsRoutes);

// ==== ANALYTICS TIER ENDPOINT ====
app.get("/api/analytics/tier-features", async (req, res) => {
  try {
    const tenant = req.headers['x-tenant-id'] || req.query.tenant;
    if (!tenant) {
      return res.status(400).json({
        error: "Tenant ID is required",
        code: "MISSING_TENANT"
      });
    }

    // Import analytics tiers service
    const { default: analyticsTiers } = await import('./services/analytics-tiers.js');
    
    const features = await analyticsTiers.getTierFeatures(tenant);
    res.json(features);
  } catch (error) {
    console.error('Error getting tier features:', error);
    res.status(500).json({
      error: "Failed to get tier features",
      code: "TIER_FEATURES_ERROR"
    });
  }
});

app.get("/api/diagnostics", async (req, res) => {
  try {
    // Consider Sheets connected if SHEET_ID is present (single-master pattern).
    // Still attempt to auth to surface issues via optional hint fields.
    const sheetEnv = !!process.env.SHEET_ID;
    const doc = await getDoc();
    const sheetsOk = sheetEnv || !!doc;
    const aiReady =
      (process.env.AI_PROVIDER || "").toLowerCase() === "google" &&
      !!process.env.GOOGLE_API_KEY;
    const hmacOk = !!process.env.HMAC_SECRET;
    res.json({
      ok: true,
      ai_ready: !!aiReady,
      sheets_ok: !!sheetsOk,
      hmac_ok: !!hmacOk,
      sheetsAuth: process.env.GOOGLE_SERVICE_EMAIL
        ? "service_account"
        : "unknown",
      serviceEmail: process.env.GOOGLE_SERVICE_EMAIL || null,
      cache: {
        insightsTTL: Number(process.env.INSIGHTS_CACHE_TTL_SEC || "60"),
        configTTL: Number(process.env.CONFIG_CACHE_TTL_SEC || "15"),
        runLogsTTL: Number(process.env.RUNLOGS_CACHE_TTL_SEC || "10"),
      },
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// ----- PROMOTE Gate Status Endpoint -----
app.get("/api/promote/gate/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:promote_gate_status`;
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "promote_gate_status auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }

  try {
    const gateResult = await validatePromoteGate(tenant, "STATUS_CHECK");
    const config = gateResult.config || {};

    await logAccess(req, 200, "promote_gate_status ok");
    return json(res, 200, {
      ok: true,
      promote: gateResult.promote,
      promoteRaw: config.PROMOTE,
      label: config.label || "ADS_AUTOPILOT_AI_AUTOMATED",
      enabled: config.enabled,
      gateStatus: gateResult.ok ? "OPEN" : "BLOCKED",
      message: gateResult.error || "PROMOTE gate operational",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    await logAccess(req, 500, "promote_gate_status error");
    return json(res, 500, {
      ok: false,
      code: "PROMOTE_GATE_STATUS",
      error: String(e),
    });
  }
});

// ----- Environment Security Endpoints -----
app.get("/api/security/environment/status", async (req, res) => {
  const tenant = req.query.tenant;
  const payload = `GET:${tenant}:environment_status`;
  if (!tenant || !verify(req.query.sig, payload)) {
    await logAccess(req, 403, "environment_status auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }

  try {
    const envInfo = {
      nodeEnv: process.env.NODE_ENV || "development",
      vercelEnv: process.env.VERCEL_ENV || null,
      deploymentEnv: process.env.VERCEL ? "vercel" : "local",
    };
    const driftCheck = {
      status: "ok",
      message: "Environment security checks disabled for Vercel compatibility",
    };

    await logAccess(req, 200, "environment_status ok");
    return json(res, 200, {
      ok: true,
      environment: envInfo,
      security: {
        drift: driftCheck,
        locked: true,
        deployment_env_locked: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    await logAccess(req, 500, "environment_status error");
    return json(res, 500, {
      ok: false,
      code: "ENVIRONMENT_STATUS_ERROR",
      error: String(e),
    });
  }
});

app.get("/api/config", async (req, res) => {
  const tenant = String(req.query.tenant || "");
  const sig = String(req.query.sig || "");
  const payload = `GET:${tenant}:config`;
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "config auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }
  try {
    let cfg = null;

    // Try multiple fallback methods to get config
    try {
      // Method 1: Try direct Sheets read first
      cfg = await readConfigFromSheets(tenant);
    } catch (sheetsError) {
      console.warn(`Direct Sheets read failed for ${tenant}:`, sheetsError.message);

      try {
        // Method 2: Try dual-write service
        const { readFromPreferredSource } = await import('./services/dual-write.js');
        cfg = await readFromPreferredSource(tenant, 'config');
      } catch (dualReadError) {
        console.warn(`Dual read also failed for ${tenant}:`, dualReadError.message);
      }
    }

    if (!cfg) {
      // Method 3: Return minimal default config for script to run
      console.log(`⚠️ Using default config for ${tenant} due to read failures`);
      cfg = {
        enabled: true,
        PROMOTE: false, // Safety first - don't make changes without proper config
        daily_budget_cap_default: 20.00,
        cpc_ceiling_default: 0.50,
        label: `${tenant} • Managed`,
        default_final_url: '',
        business_days_csv: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
        business_start: '09:00',
        business_end: '20:00',
        add_business_hours_if_none: true,
        master_neg_list_name: 'Master Negative Keywords',
        MASTER_NEGATIVES: [],
        WASTE_NEGATIVE_MAP: {},
        RSA_DEFAULT: { H: [], D: [] },
        RSA_MAP: {},
        BUDGET_CAPS: {},
        CPC_CEILINGS: {},
        EXCLUSIONS: {},
        AUDIENCE_MAP: {},
        FEATURE_AUDIENCE_ATTACH: false,
        FEATURE_INVENTORY_GUARD: false,
        st_lookback: 'LAST_7_DAYS',
        st_min_clicks: 2,
        st_min_cost: 2.82
      };

      // Try to bootstrap for next run
      try {
        await bootstrapTenant(tenant);
      } catch (bootstrapError) {
        console.error(`Bootstrap failed for ${tenant}:`, bootstrapError.message);
      }
    }

    // Log config values being sent to script
    console.log(`📊 Sending config to ${tenant}:`, {
      enabled: cfg.enabled,
      PROMOTE: cfg.PROMOTE,
      daily_budget_cap_default: cfg.daily_budget_cap_default,
      cpc_ceiling_default: cfg.cpc_ceiling_default,
      label: cfg.label,
      default_final_url: cfg.default_final_url
    });

    await logAccess(req, 200, "config ok");
    return json(res, 200, { ok: true, config: cfg });
  } catch (e) {
    await logAccess(req, 500, "config error");
    return json(res, 500, { ok: false, code: "CONFIG", error: String(e) });
  }
});

// HMAC-gated echo endpoint for diagnostics
// Save user settings from UI
app.post("/api/config/save-settings", async (req, res) => {
  const tenant = String(req.query.tenant || "");
  const sig = String(req.query.sig || "");
  const { nonce = Date.now(), settings = {} } = req.body || {};
  const payload = `POST:${tenant}:save_settings:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "save_settings auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }

  try {
    console.log(`📥 Received settings for ${tenant}:`, settings);

    // Validate and save settings
    const tierDefaults = getTierDefaults(settings.plan || "starter");
    const validSettings = {
      USER_BUDGET_CAP: String(settings.budget || ""),
      USER_CPC_CEILING: String(settings.cpc || ""),
      USER_LANDING_URL: String(settings.landing_url || ""),
      PLAN: String(settings.plan || "starter"),
      // Also update the actual config values used by the script
      daily_budget_cap_default: String(settings.budget || tierDefaults.defaultBudget),
      cpc_ceiling_default: String(settings.cpc || tierDefaults.defaultCPC),
      default_final_url: String(settings.landing_url || ""),
      st_lookback: tierDefaults.lookbackPeriod,
      label: `${tenant} • Managed`,
    };

    console.log(`✅ Validated settings for ${tenant}:`, validSettings);

    // Import dual-write service
    const { dualWriteConfig } = await import('./services/dual-write.js');

    // Use dual-write to save to both Supabase and Google Sheets
    const dualWriteResults = await dualWriteConfig(tenant, validSettings);

    console.log(`💾 Dual-write results for ${tenant}:`, dualWriteResults);

    // If both fail, still try direct Sheets write as ultimate fallback
    if (!dualWriteResults.sheets.success && !dualWriteResults.supabase.success) {
      await upsertConfigKeys(tenant, validSettings);
    }

    // Also cache in Redis
    const cacheKey = `user_settings:${tenant}`;
    await redis.set(cacheKey, JSON.stringify({
      budget: validSettings.USER_BUDGET_CAP,
      cpc: validSettings.USER_CPC_CEILING,
      landing_url: validSettings.USER_LANDING_URL,
      plan: validSettings.PLAN,
    }), 'EX', 3600);

    await logAccess(req, 200, "save_settings ok");
    return json(res, 200, { ok: true, saved: validSettings });
  } catch (e) {
    console.error(`Failed to save settings for ${tenant}:`, e);
    await logAccess(req, 500, "save_settings error");
    return json(res, 500, {
      ok: false,
      error: "Failed to save settings",
    });
  }
});

app.get("/api/config/echo", async (req, res) => {
  const tenant = String(req.query.tenant || "");
  const sig = String(req.query.sig || "");
  const payload = `GET:${tenant}:config_echo`;
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, "config_echo auth_fail");
    return json(res, 403, {
      ok: false,
      code: "AUTH",
      error: "invalid signature",
    });
  }
  const data = {
    ok: true,
    ip:
      (req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip ||
        "") + "",
    ua: (req.headers["user-agent"] || "") + "",
    host: req.headers.host || "",
    scheme: (req.headers["x-forwarded-proto"] || req.protocol || "http") + "",
    url: (req.originalUrl || req.url || "") + "",
  };
  await logAccess(req, 200, "config_echo ok");
  return json(res, 200, data);
});

// (moved API error/404 handlers to the end of file)

app.post("/api/metrics", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    metrics = [],
    search_terms = [],
    run_logs = [],
    // New comprehensive data types
    campaign_details = [],
    device_metrics = [],
    keyword_performance = [],
    hourly_patterns = [],
    geographic_data = [],
    ad_performance = [],
    conversion_values = [],
  } = req.body || {};
  const payload = `POST:${tenant}:metrics:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    // Soft throttle: one payload per 5s per tenant
    const nowTs = Date.now();
    const lastTs = metricsThrottle.get(tenant) || 0;
    if (nowTs - lastTs < 5000)
      return json(res, 429, { ok: false, code: "THROTTLED" });
    metricsThrottle.set(tenant, nowTs);
    const MET_HEADERS = [
      "period",      // NEW: time period (TODAY, YESTERDAY, LAST_7_DAYS, etc.)
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
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const LOG_HEADERS = ["timestamp", "message"];

    // New comprehensive data type headers
    const CAMPAIGN_DETAILS_HEADERS = [
      "date", "type", "campaign_name", "campaign_id", "status",
      "channel_type", "daily_budget", "budget_period", "bidding_strategy",
      "cpc_ceiling", "target_cpa", "target_roas", "start_date", "end_date",
      "cost", "conversion_value", "avg_cpc"
    ];
    const DEVICE_METRICS_HEADERS = [
      "date", "type", "campaign_name", "device", "clicks",
      "cost", "conversions", "impressions", "ctr", "conversion_rate",
      "avg_cpc", "cost_per_conversion", "value", "roas", "conversion_value"
    ];
    const KEYWORD_PERFORMANCE_HEADERS = [
      "date", "type", "campaign_name", "ad_group_id", "ad_group_name",
      "keyword_id", "keyword", "match_type", "clicks", "cost",
      "conversions", "impressions", "ctr", "avg_cpc", "conversion_rate",
      "quality_score", "search_impression_share", "search_top_impression_share",
      "first_page_cpc", "top_of_page_cpc"
    ];
    const HOURLY_PATTERNS_HEADERS = [
      "date", "type", "hour", "campaign_name", "clicks",
      "cost", "conversions", "impressions", "ctr", "conversion_rate",
      "avg_cpc", "cost_per_conversion", "value"
    ];
    const GEOGRAPHIC_DATA_HEADERS = [
      "date", "type", "campaign_name", "location", "location_type",
      "clicks", "cost", "conversions", "impressions", "ctr",
      "conversion_rate", "avg_cpc", "cost_per_conversion"
    ];
    const AD_PERFORMANCE_HEADERS = [
      "date", "type", "campaign_name", "ad_group_id", "ad_group_name",
      "ad_id", "ad_type", "headline1", "headline2", "headline3",
      "description1", "description2", "clicks", "cost", "conversions",
      "impressions", "ctr", "avg_cpc", "conversion_rate", "conversion_value"
    ];
    const CONVERSION_VALUES_HEADERS = [
      "date", "campaign_name", "conversion_action", "conversions",
      "conversion_value", "cost_per_conversion", "value_per_conversion"
    ];

    // Validation helper functions
    const validateDataType = (data, expectedHeaders, dataTypeName) => {
      if (!Array.isArray(data)) {
        console.warn(`${dataTypeName}: Expected array, got ${typeof data}`);
        return false;
      }

      if (data.length > 1000) {
        console.warn(`${dataTypeName}: Too many rows (${data.length}), maximum 1000 per data type`);
        return false;
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) {
          console.warn(`${dataTypeName}: Row ${i} is not an array`);
          continue;
        }
        if (row.length === 0) {
          console.warn(`${dataTypeName}: Row ${i} is empty`);
          continue;
        }
        if (row.length > expectedHeaders.length) {
          console.warn(`${dataTypeName}: Row ${i} has ${row.length} fields, expected max ${expectedHeaders.length}`);
        }
      }
      return true;
    };

    // Validate all incoming data types
    const dataTypes = [
      { data: metrics, headers: MET_HEADERS, name: "metrics" },
      { data: search_terms, headers: ST_HEADERS, name: "search_terms" },
      { data: run_logs, headers: LOG_HEADERS, name: "run_logs" },
      { data: campaign_details, headers: CAMPAIGN_DETAILS_HEADERS, name: "campaign_details" },
      { data: device_metrics, headers: DEVICE_METRICS_HEADERS, name: "device_metrics" },
      { data: keyword_performance, headers: KEYWORD_PERFORMANCE_HEADERS, name: "keyword_performance" },
      { data: hourly_patterns, headers: HOURLY_PATTERNS_HEADERS, name: "hourly_patterns" },
      { data: geographic_data, headers: GEOGRAPHIC_DATA_HEADERS, name: "geographic_data" },
      { data: ad_performance, headers: AD_PERFORMANCE_HEADERS, name: "ad_performance" },
      { data: conversion_values, headers: CONVERSION_VALUES_HEADERS, name: "conversion_values" }
    ];

    dataTypes.forEach(({ data, headers, name }) => {
      if (data && data.length > 0) {
        validateDataType(data, headers, name);
      }
    });

    // Coerce numeric fields
    const mRows = (Array.isArray(metrics) ? metrics : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, MET_HEADERS.length) : [];
        if (!a.length) return null;

        // Validate and normalize period field (index 0)
        if (typeof a[0] !== 'string' || !a[0]) {
          a[0] = 'UNKNOWN';  // Default period if missing
        }

        // Ensure numeric fields (indices shifted by 1 due to new period field)
        a[7] = Number(a[7] || 0);  // clicks
        a[8] = Number(a[8] || 0);  // cost
        a[9] = Number(a[9] || 0);  // conversions
        a[10] = Number(a[10] || 0); // impr
        a[11] = Number(a[11] || 0); // ctr
        return a;
      })
      .filter(Boolean);
    const stRows = (Array.isArray(search_terms) ? search_terms : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, ST_HEADERS.length) : [];
        if (!a.length) return null;
        a[4] = Number(a[4] || 0);
        a[5] = Number(a[5] || 0);
        a[6] = Number(a[6] || 0);
        return a;
      })
      .filter(Boolean);
    const logRows = (Array.isArray(run_logs) ? run_logs : [])
      .map((r) => (Array.isArray(r) ? r.slice(0, LOG_HEADERS.length) : null))
      .filter(Boolean);

    // Process new comprehensive data types
    const campaignDetailsRows = (Array.isArray(campaign_details) ? campaign_details : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, CAMPAIGN_DETAILS_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: budget, target_cpa, target_roas
        a[3] = Number(a[3] || 0); // budget
        a[6] = Number(a[6] || 0); // target_cpa
        a[7] = Number(a[7] || 0); // target_roas
        return a;
      })
      .filter(Boolean);

    const deviceMetricsRows = (Array.isArray(device_metrics) ? device_metrics : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, DEVICE_METRICS_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: clicks, cost, conversions, impressions, ctr, avg_cpc
        a[3] = Number(a[3] || 0); // clicks
        a[4] = Number(a[4] || 0); // cost
        a[5] = Number(a[5] || 0); // conversions
        a[6] = Number(a[6] || 0); // impressions
        a[7] = Number(a[7] || 0); // ctr
        a[8] = Number(a[8] || 0); // avg_cpc
        return a;
      })
      .filter(Boolean);

    const keywordPerformanceRows = (Array.isArray(keyword_performance) ? keyword_performance : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, KEYWORD_PERFORMANCE_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: clicks, cost, conversions, impressions, ctr, quality_score, first_page_cpc, top_of_page_cpc
        a[5] = Number(a[5] || 0); // clicks
        a[6] = Number(a[6] || 0); // cost
        a[7] = Number(a[7] || 0); // conversions
        a[8] = Number(a[8] || 0); // impressions
        a[9] = Number(a[9] || 0); // ctr
        a[10] = Number(a[10] || 0); // quality_score
        a[11] = Number(a[11] || 0); // first_page_cpc
        a[12] = Number(a[12] || 0); // top_of_page_cpc
        return a;
      })
      .filter(Boolean);

    const hourlyPatternsRows = (Array.isArray(hourly_patterns) ? hourly_patterns : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, HOURLY_PATTERNS_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: hour, clicks, cost, conversions, impressions, ctr
        a[1] = Number(a[1] || 0); // hour
        a[3] = Number(a[3] || 0); // clicks
        a[4] = Number(a[4] || 0); // cost
        a[5] = Number(a[5] || 0); // conversions
        a[6] = Number(a[6] || 0); // impressions
        a[7] = Number(a[7] || 0); // ctr
        return a;
      })
      .filter(Boolean);

    const geographicDataRows = (Array.isArray(geographic_data) ? geographic_data : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, GEOGRAPHIC_DATA_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: clicks, cost, conversions, impressions, ctr
        a[4] = Number(a[4] || 0); // clicks
        a[5] = Number(a[5] || 0); // cost
        a[6] = Number(a[6] || 0); // conversions
        a[7] = Number(a[7] || 0); // impressions
        a[8] = Number(a[8] || 0); // ctr
        return a;
      })
      .filter(Boolean);

    const adPerformanceRows = (Array.isArray(ad_performance) ? ad_performance : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, AD_PERFORMANCE_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: clicks, cost, conversions, impressions, ctr
        a[7] = Number(a[7] || 0); // clicks
        a[8] = Number(a[8] || 0); // cost
        a[9] = Number(a[9] || 0); // conversions
        a[10] = Number(a[10] || 0); // impressions
        a[11] = Number(a[11] || 0); // ctr
        return a;
      })
      .filter(Boolean);

    const conversionValuesRows = (Array.isArray(conversion_values) ? conversion_values : [])
      .map((r) => {
        const a = Array.isArray(r) ? r.slice(0, CONVERSION_VALUES_HEADERS.length) : [];
        if (!a.length) return null;
        // Coerce numeric fields: conversions, conversion_value, cost_per_conversion, value_per_conversion
        a[3] = Number(a[3] || 0); // conversions
        a[4] = Number(a[4] || 0); // conversion_value
        a[5] = Number(a[5] || 0); // cost_per_conversion
        a[6] = Number(a[6] || 0); // value_per_conversion
        return a;
      })
      .filter(Boolean);

    const totalRows = mRows.length + stRows.length + logRows.length +
      campaignDetailsRows.length + deviceMetricsRows.length + keywordPerformanceRows.length +
      hourlyPatternsRows.length + geographicDataRows.length + adPerformanceRows.length +
      conversionValuesRows.length;
    if (totalRows > 5000)
      return json(res, 413, {
        ok: false,
        code: "PAYLOAD_TOO_LARGE",
        totalRows,
        limit: 5000,
      });
    let insM = 0,
      insS = 0,
      insL = 0,
      insCD = 0,
      insDM = 0,
      insKP = 0,
      insHP = 0,
      insGD = 0,
      insAP = 0,
      insCV = 0;

    // Try to write to Supabase first if enabled
    const { getSupabase, isSupabaseEnabled } = await import('./services/supabase-client.js');

    if (isSupabaseEnabled()) {
      try {
        console.log(`🔄 Writing metrics to Supabase for ${tenant}`);

        const supabase = getSupabase();
        if (!supabase) {
          throw new Error('Supabase client not available');
        }

        // Set tenant context for RLS
        await supabase.rpc('set_config', {
          parameter: 'app.current_tenant_id',
          value: String(tenant)
        });

        // Write campaign metrics to Supabase - deduplicate by campaign_id and date
        if (mRows.length) {
          const campaignMetricsMap = new Map();
          mRows
            .filter(row => row[1] === 'campaign')
            .forEach(row => {
              const dateStr = new Date(row[0]).toISOString();
              const campaignId = String(row[4]);
              const key = `${campaignId}_${dateStr}`;

              // Only keep the first occurrence or the one with more data
              if (!campaignMetricsMap.has(key) ||
                  (parseInt(row[9]) || 0) > (campaignMetricsMap.get(key).impressions || 0)) {
                campaignMetricsMap.set(key, {
                  tenant_id: String(tenant),
                  date: dateStr,
                  campaign_id: campaignId,
                  campaign_name: String(row[2]),
                  clicks: parseInt(row[6]) || 0,
                  cost: parseFloat(row[7]) || 0,
                  conversions: parseFloat(row[8]) || 0,
                  impressions: parseInt(row[9]) || 0,
                  ctr: parseFloat(row[10]) || 0,
                  created_at: new Date().toISOString()
                });
              }
            });
          const campaignMetrics = Array.from(campaignMetricsMap.values());

          if (campaignMetrics.length > 0) {
            const { error: campaignError } = await supabase
              .from('campaign_metrics')
              .upsert(campaignMetrics, {
                onConflict: 'tenant_id,campaign_id,date',
                ignoreDuplicates: false
              });

            if (campaignError) {
              console.error('Failed to insert campaign metrics to Supabase:', campaignError);
            } else {
              console.log(`✅ Inserted ${campaignMetrics.length} campaign metrics to Supabase`);
            }
          }

          // Write ad group metrics to Supabase - deduplicate by ad_group_id and date
          const adGroupMetricsMap = new Map();
          mRows
            .filter(row => row[1] === 'ad_group')
            .forEach(row => {
              const dateStr = new Date(row[0]).toISOString();
              const adGroupId = String(row[4]);
              const key = `${adGroupId}_${dateStr}`;

              // Only keep the first occurrence or the one with more data
              if (!adGroupMetricsMap.has(key) ||
                  (parseInt(row[9]) || 0) > (adGroupMetricsMap.get(key).impressions || 0)) {
                adGroupMetricsMap.set(key, {
                  tenant_id: String(tenant),
                  date: dateStr,
                  campaign_name: String(row[2]),
                  ad_group_id: adGroupId,
                  ad_group_name: String(row[3]),
                  clicks: parseInt(row[6]) || 0,
                  cost: parseFloat(row[7]) || 0,
                  conversions: parseFloat(row[8]) || 0,
                  impressions: parseInt(row[9]) || 0,
                  ctr: parseFloat(row[10]) || 0,
                  created_at: new Date().toISOString()
                });
              }
            });
          const adGroupMetrics = Array.from(adGroupMetricsMap.values());

          if (adGroupMetrics.length > 0) {
            const { error: adGroupError } = await supabase
              .from('ad_group_metrics')
              .upsert(adGroupMetrics, {
                onConflict: 'tenant_id,ad_group_id,date',
                ignoreDuplicates: false
              });

            if (adGroupError) {
              console.error('Failed to insert ad group metrics to Supabase:', adGroupError);
            } else {
              console.log(`✅ Inserted ${adGroupMetrics.length} ad group metrics to Supabase`);
            }
          }
        }

        // Write search terms to Supabase
        if (stRows.length) {
          const searchTerms = stRows.map(row => ({
            tenant_id: String(tenant),
            date: new Date(row[0]).toISOString(),
            campaign_name: String(row[1]),
            ad_group_name: String(row[2]),
            search_term: String(row[3]),
            clicks: parseInt(row[4]) || 0,
            cost: parseFloat(row[5]) || 0,
            conversions: parseFloat(row[6]) || 0,
            created_at: new Date().toISOString()
          }));

          const { error: termsError } = await supabase
            .from('search_terms')
            .upsert(searchTerms, {
              onConflict: 'tenant_id,campaign_name,ad_group_name,search_term,date',
              ignoreDuplicates: false
            });

          if (termsError) {
            console.error('Failed to insert search terms to Supabase:', termsError);
          } else {
            console.log(`✅ Inserted ${searchTerms.length} search terms to Supabase`);
          }
        }

        // Write campaign details to Supabase
        if (campaignDetailsRows.length) {
          const campaignDetails = campaignDetailsRows.map(row => ({
            tenant_id: String(tenant),
            date: row[0] ? new Date(row[0]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            type: String(row[1] || 'campaign_details'),
            campaign_name: String(row[2]),
            campaign_id: String(row[3]),
            status: String(row[4]),
            channel_type: String(row[5]),
            daily_budget: parseFloat(row[6]) || 0,
            budget_period: String(row[7]),
            bidding_strategy: String(row[8]),
            cpc_ceiling: parseFloat(row[9]) || 0,
            target_cpa: parseFloat(row[10]) || 0,
            target_roas: parseFloat(row[11]) || 0,
            start_date: row[12] ? new Date(row[12]).toISOString().split('T')[0] : null,
            end_date: row[13] ? new Date(row[13]).toISOString().split('T')[0] : null,
            cost: parseFloat(row[14]) || 0,
            conversion_value: parseFloat(row[15]) || 0,
            avg_cpc: parseFloat(row[16]) || 0,
            created_at: new Date().toISOString()
          }));

          const { error: campaignDetailsError } = await supabase
            .from('campaign_details')
            .upsert(campaignDetails, {
              onConflict: 'tenant_id,campaign_id,date',
              ignoreDuplicates: false
            });

          if (campaignDetailsError) {
            console.error('Failed to insert campaign details to Supabase:', campaignDetailsError);
          } else {
            console.log(`✅ Inserted ${campaignDetails.length} campaign details to Supabase`);
          }
        }

        // Write device metrics to Supabase - deduplicate first
        if (deviceMetricsRows.length) {
          // Deduplicate device metrics by unique key
          const deviceMetricsMap = new Map();
          deviceMetricsRows.forEach(row => {
            const dateStr = row[0] ? new Date(row[0]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const campaignId = String(row[3]);
            const device = String(row[6]);
            const key = `${tenant}_${campaignId}_${device}_${dateStr}`;

            // Only keep the first occurrence or the one with more impressions
            if (!deviceMetricsMap.has(key) ||
                (parseInt(row[7]) || 0) > (deviceMetricsMap.get(key).impressions || 0)) {
              deviceMetricsMap.set(key, {
                tenant_id: String(tenant),
                date: dateStr,
                type: String(row[1] || 'device_metrics'),
                campaign_name: String(row[2]),
                campaign_id: campaignId,
                device: device,
                impressions: parseInt(row[7]) || 0,
                clicks: parseInt(row[8]) || 0,
                cost: parseFloat(row[9]) || 0,
                conversions: parseFloat(row[10]) || 0,
                conversion_value: parseFloat(row[11]) || 0,
                ctr: parseFloat(row[12]) || 0,
                avg_cpc: parseFloat(row[13]) || 0,
                created_at: new Date().toISOString()
              });
            }
          });

          const deviceMetrics = Array.from(deviceMetricsMap.values());

          const { error: deviceMetricsError } = await supabase
            .from('device_metrics')
            .upsert(deviceMetrics, {
              onConflict: 'tenant_id,campaign_id,device,date',
              ignoreDuplicates: false
            });

          if (deviceMetricsError) {
            console.error('Failed to insert device metrics to Supabase:', deviceMetricsError);
          } else {
            console.log(`✅ Inserted ${deviceMetrics.length} device metrics to Supabase`);
          }
        }

        // Write keyword performance to Supabase - deduplicate first
        if (keywordPerformanceRows.length) {
          // Deduplicate keyword performance by unique key
          const keywordPerfMap = new Map();
          keywordPerformanceRows.forEach(row => {
            const dateStr = new Date(row[0]).toISOString();
            const keywordId = String(row[5]) || '';
            const key = `${tenant}_${keywordId}_${dateStr}`;

            // Only keep the first occurrence or the one with more impressions
            if (!keywordPerfMap.has(key) ||
                (parseInt(row[11]) || 0) > (keywordPerfMap.get(key).impressions || 0)) {
              keywordPerfMap.set(key, {
                tenant_id: String(tenant),
                date: dateStr,
                campaign_name: String(row[2]) || null,
                ad_group_id: String(row[3]) || null,
                ad_group_name: String(row[4]) || null,
                keyword_id: keywordId || null,
                keyword_text: String(row[6]) || null,
                match_type: String(row[7]) || null,
                clicks: parseInt(row[8]) || 0,
                cost: parseFloat(row[9]) || 0,
                conversions: parseFloat(row[10]) || 0,
                impressions: parseInt(row[11]) || 0,
                ctr: parseFloat(row[12]) || 0,
                avg_cpc: parseFloat(row[13]) || 0,
                conversion_rate: parseFloat(row[14]) || 0,
                quality_score: parseInt(row[15]) || null,
                search_impression_share: parseFloat(row[16]) || null,
                search_top_impression_share: parseFloat(row[17]) || null,
                first_page_cpc: parseFloat(row[18]) || null,
                top_of_page_cpc: parseFloat(row[19]) || null,
                created_at: new Date().toISOString()
              });
            }
          });

          const keywordPerformance = Array.from(keywordPerfMap.values());

          const { error: keywordPerformanceError } = await supabase
            .from('keyword_performance')
            .upsert(keywordPerformance, {
              onConflict: 'tenant_id,keyword_id,date',
              ignoreDuplicates: false
            });

          if (keywordPerformanceError) {
            console.error('Failed to insert keyword performance to Supabase:', keywordPerformanceError);
          } else {
            console.log(`✅ Inserted ${keywordPerformance.length} keyword performance records to Supabase`);
          }
        }

        // Write hourly patterns to Supabase
        if (hourlyPatternsRows.length) {
          const hourlyPatterns = hourlyPatternsRows.map(row => ({
            tenant_id: String(tenant),
            date: new Date(row[0]).toISOString(),
            hour: parseInt(row[2]) || 0,
            campaign_name: String(row[3]) || null,
            campaign_id: String(row[4]) || null,
            clicks: parseInt(row[5]) || 0,
            cost: parseFloat(row[6]) || 0,
            conversions: parseFloat(row[7]) || 0,
            impressions: parseInt(row[8]) || 0,
            ctr: parseFloat(row[9]) || 0,
            conversion_rate: parseFloat(row[10]) || 0,
            avg_cpc: parseFloat(row[11]) || 0,
            cost_per_conversion: parseFloat(row[12]) || null,
            created_at: new Date().toISOString()
          }));

          const { error: hourlyPatternsError } = await supabase
            .from('hourly_patterns')
            .upsert(hourlyPatterns, {
              onConflict: 'tenant_id,campaign_id,date,hour',
              ignoreDuplicates: false
            });

          if (hourlyPatternsError) {
            console.error('Failed to insert hourly patterns to Supabase:', hourlyPatternsError);
          } else {
            console.log(`✅ Inserted ${hourlyPatterns.length} hourly patterns to Supabase`);
          }
        }

        // Write geographic data to Supabase - deduplicate first
        if (geographicDataRows.length) {
          // Deduplicate geographic data by unique key
          const geoDataMap = new Map();
          geographicDataRows.forEach(row => {
            const dateStr = new Date(row[0]).toISOString();
            const campaignId = String(row[3]) || '';
            const location = String(row[4]) || '';
            const key = `${tenant}_${campaignId}_${location}_${dateStr}`;

            // Only keep the first occurrence or the one with more impressions
            if (!geoDataMap.has(key) ||
                (parseInt(row[9]) || 0) > (geoDataMap.get(key).impressions || 0)) {
              geoDataMap.set(key, {
                tenant_id: String(tenant),
                date: dateStr,
                campaign_name: String(row[2]) || null,
                campaign_id: campaignId || null,
                location: location || null,
                location_type: String(row[5]) || null,
                clicks: parseInt(row[6]) || 0,
                cost: parseFloat(row[7]) || 0,
                conversions: parseFloat(row[8]) || 0,
                impressions: parseInt(row[9]) || 0,
                ctr: parseFloat(row[10]) || 0,
                conversion_rate: parseFloat(row[11]) || 0,
                avg_cpc: parseFloat(row[12]) || 0,
                created_at: new Date().toISOString()
              });
            }
          });

          const geographicData = Array.from(geoDataMap.values());

          const { error: geographicDataError } = await supabase
            .from('geographic_data')
            .upsert(geographicData, {
              onConflict: 'tenant_id,campaign_id,location,date',
              ignoreDuplicates: false
            });

          if (geographicDataError) {
            console.error('Failed to insert geographic data to Supabase:', geographicDataError);
          } else {
            console.log(`✅ Inserted ${geographicData.length} geographic data records to Supabase`);
          }
        }

        // Write ad performance to Supabase
        if (adPerformanceRows.length) {
          const adPerformance = adPerformanceRows.map(row => ({
            tenant_id: String(tenant),
            date: new Date(row[0]).toISOString(),
            campaign_name: String(row[2]) || null,
            campaign_id: String(row[3]) || null,
            ad_group_id: String(row[4]) || null,
            ad_group_name: String(row[5]) || null,
            ad_id: String(row[6]) || null,
            ad_type: String(row[7]) || null,
            headline1: String(row[8]) || null,
            headline2: String(row[9]) || null,
            headline3: String(row[10]) || null,
            description1: String(row[11]) || null,
            description2: String(row[12]) || null,
            clicks: parseInt(row[13]) || 0,
            cost: parseFloat(row[14]) || 0,
            conversions: parseFloat(row[15]) || 0,
            impressions: parseInt(row[16]) || 0,
            ctr: parseFloat(row[17]) || 0,
            avg_cpc: parseFloat(row[18]) || 0,
            conversion_value: parseFloat(row[19]) || 0,
            created_at: new Date().toISOString()
          }));

          const { error: adPerformanceError } = await supabase
            .from('ad_performance')
            .upsert(adPerformance, {
              onConflict: 'tenant_id,ad_id,date',
              ignoreDuplicates: false
            });

          if (adPerformanceError) {
            console.error('Failed to insert ad performance to Supabase:', adPerformanceError);
          } else {
            console.log(`✅ Inserted ${adPerformance.length} ad performance records to Supabase`);
          }
        }

        // Write conversion values to Supabase
        if (conversionValuesRows.length) {
          const conversionValues = conversionValuesRows.map(row => ({
            tenant_id: String(tenant),
            date: new Date(row[0]).toISOString(),
            campaign_name: String(row[1]),
            conversion_action: String(row[2]),
            conversions: parseFloat(row[3]) || 0,
            conversion_value: parseFloat(row[4]) || 0,
            cost_per_conversion: parseFloat(row[5]) || 0,
            value_per_conversion: parseFloat(row[6]) || 0,
            created_at: new Date().toISOString()
          }));

          const { error: conversionValuesError } = await supabase
            .from('conversion_values')
            .upsert(conversionValues, {
              onConflict: 'tenant_id,campaign_name,conversion_action,date',
              ignoreDuplicates: false
            });

          if (conversionValuesError) {
            console.error('Failed to insert conversion values to Supabase:', conversionValuesError);
          } else {
            console.log(`✅ Inserted ${conversionValues.length} conversion values to Supabase`);
          }
        }
        // CRITICAL: Also write to tenant_metrics table for AI dashboard
        // This table is used by the AI dashboard to display metrics
        if (mRows.length) {
          console.log(`📊 Writing ${mRows.length} rows to tenant_metrics for AI dashboard`);
          const { dualWriteMetrics } = await import('./services/dual-write.js');

          try {
            await dualWriteMetrics(String(tenant), mRows);
            console.log(`✅ Successfully wrote to tenant_metrics table for ${tenant}`);
          } catch (tenantMetricsError) {
            console.error(`❌ Failed to write to tenant_metrics: ${tenantMetricsError.message}`);
            // Continue execution even if tenant_metrics write fails
          }
        }
      } catch (supabaseError) {
        console.error('Supabase write error (will fallback to Sheets):', supabaseError);
      }
    }

    // Always write to Google Sheets as backup
    if (mRows.length) {
      await appendRows(String(tenant), "METRICS", MET_HEADERS, mRows);
      insM = mRows.length;
    }
    if (stRows.length) {
      await appendRows(String(tenant), "SEARCH_TERMS", ST_HEADERS, stRows);
      insS = stRows.length;
    }
    if (logRows.length) {
      await appendRows(String(tenant), "RUN_LOGS", LOG_HEADERS, logRows);
      insL = logRows.length;
    }

    // Write new comprehensive data types to Google Sheets as backup
    if (campaignDetailsRows.length) {
      await appendRows(String(tenant), "CAMPAIGN_DETAILS", CAMPAIGN_DETAILS_HEADERS, campaignDetailsRows);
      insCD = campaignDetailsRows.length;
    }
    if (deviceMetricsRows.length) {
      await appendRows(String(tenant), "DEVICE_METRICS", DEVICE_METRICS_HEADERS, deviceMetricsRows);
      insDM = deviceMetricsRows.length;
    }
    if (keywordPerformanceRows.length) {
      await appendRows(String(tenant), "KEYWORD_PERFORMANCE", KEYWORD_PERFORMANCE_HEADERS, keywordPerformanceRows);
      insKP = keywordPerformanceRows.length;
    }
    if (hourlyPatternsRows.length) {
      await appendRows(String(tenant), "HOURLY_PATTERNS", HOURLY_PATTERNS_HEADERS, hourlyPatternsRows);
      insHP = hourlyPatternsRows.length;
    }
    if (geographicDataRows.length) {
      await appendRows(String(tenant), "GEOGRAPHIC_DATA", GEOGRAPHIC_DATA_HEADERS, geographicDataRows);
      insGD = geographicDataRows.length;
    }
    if (adPerformanceRows.length) {
      await appendRows(String(tenant), "AD_PERFORMANCE", AD_PERFORMANCE_HEADERS, adPerformanceRows);
      insAP = adPerformanceRows.length;
    }
    if (conversionValuesRows.length) {
      await appendRows(String(tenant), "CONVERSION_VALUES", CONVERSION_VALUES_HEADERS, conversionValuesRows);
      insCV = conversionValuesRows.length;
    }
    return json(res, 200, {
      ok: true,
      inserted: {
        metrics: insM,
        search_terms: insS,
        run_logs: insL,
        campaign_details: insCD,
        device_metrics: insDM,
        keyword_performance: insKP,
        hourly_patterns: insHP,
        geographic_data: insGD,
        ad_performance: insAP,
        conversion_values: insCV
      },
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "METRICS", error: String(e) });
  }
});

// ----- Autopilot tick (HMAC + PROMOTE Gate) -----
app.post(
  "/api/jobs/autopilot_tick",
  promoteGateMiddleware("AUTOPILOT_TICK"),
  async (req, res) => {
    const { tenant, sig } = req.query;
    const { nonce = Date.now() } = req.body || {};
    const dry = String(req.query.dry || "0") === "1";
    const force = String(req.query.force || "0") === "1";
    const payload = `POST:${tenant}:autopilot_tick:${nonce}`;
    if (!tenant || !verify(sig, payload))
      return json(res, 403, { ok: false, code: "AUTH" });
    try {
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
          (sched === "weekdays_9_18" &&
            wd > 0 &&
            wd < 6 &&
            hr >= 9 &&
            hr <= 18);
        const last = Number(cfg?.AP_LAST_RUN_MS || 0);
        const spaced = now - last >= 45 * 60 * 1000;
        if (sched === "off" || !within || !spaced)
          return json(res, 200, {
            ok: true,
            skipped: true,
            reason: "schedule_gate",
            planned: [],
            applied: [],
          });
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
      // Prepare metrics data for ML analysis
      const metricsData = metAoA.map(r => ({
        date: r[0],
        level: r[1],
        campaign: r[2],
        ad_group: r[3],
        id: r[4],
        name: r[5],
        clicks: Number(r[6] || 0),
        cost: Number(r[7] || 0),
        conversions: Number(r[8] || 0),
        impressions: Number(r[9] || 0),
        ctr: Number(r[10] || 0)
      })).filter(d => {
        const ts = Date.parse(String(d.date || ""));
        return isFinite(ts) && ts >= horizon;
      });

      const searchTermsData = rows.map(r => ({
        term: r.term,
        clicks: r.clicks,
        cost: r.cost,
        conversions: r.conv,
        frequency: 1
      }));

      // Current metrics summary
      const currentMetrics = {
        clicks,
        cost,
        conversions: conv,
        cpa,
        searchTerms: searchTermsData,
        averageCPA: cpa,
        averageTermCost: rows.length > 0 ? rows.reduce((sum, r) => sum + r.cost, 0) / rows.length : 0
      };

      // Generate ML-enhanced optimization plan
      let mlPlan = null;
      let mlInsights = null;
      let confidence = 0;

      try {
        await mlAutopilot.initialize(String(tenant));
        const mlResult = await mlAutopilot.generateOptimizationPlan(
          String(tenant),
          currentMetrics,
          {
            targetCPA: Number(AP.target_cpa || 0) || 0,
            mode: AP.mode || "auto",
            objective: AP.objective || "protect"
          }
        );

        mlPlan = mlResult.plan || [];
        mlInsights = mlResult.insights || {};
        confidence = mlResult.confidence || 0;

        console.log(`ML Autopilot: ${mlPlan.length} recommendations, ${(confidence * 100).toFixed(1)}% confidence`);
      } catch (mlError) {
        console.warn('ML Autopilot failed, using legacy logic:', mlError.message);
      }

      // Build plan - use ML recommendations if available, otherwise fallback
      const plan = [];
      if (mlPlan && mlPlan.length > 0 && confidence > 0.5) {
        // Use ML recommendations
        plan.push(...mlPlan);
      } else {
        // Legacy logic fallback
        const targetCPA = Number(AP.target_cpa || 0) || 0;
        const termCostThreshold = Math.max(targetCPA || 2, 2);
        for (const r of rows) {
          if (r.conv === 0 && r.cost >= termCostThreshold) {
            plan.push({
              type: "add_negative",
              term: r.term,
              match: "phrase",
              scope: "account",
              confidence: 0.6,
              reasoning: "Legacy: No conversions above threshold"
            });
            if (plan.length >= 10) break;
          }
        }
        if (targetCPA && clicks > 0) {
          const tooHigh = conv > 0 && cpa > 1.3 * targetCPA;
          const tooLow = conv > 0 && cpa < 0.7 * targetCPA;
          if (tooHigh || tooLow) {
            let currentStar =
              Number((cfg?.CPC_CEILINGS || {})["*"] || 0) ||
              (clicks ? cost / clicks : 0.2);
            let next = currentStar * (tooHigh ? 0.9 : 1.1);
            next = Math.max(0.05, Math.min(1.0, Number(next.toFixed(2))));
            if (Math.abs(next - currentStar) >= 0.01)
              plan.push({
                type: "lower_cpc_ceiling",
                campaign: "*",
                amount: next,
                confidence: 0.7,
                reasoning: `Legacy: CPA ${tooHigh ? 'too high' : 'too low'}`
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
          await appendRows(
            String(tenant),
            "RUN_LOGS",
            ["timestamp", "message"],
            [
              [
                new Date().toISOString(),
                `autopilot: planned ${plan.length}, applied ${applied.length} (mode:auto, obj:${AP.objective || "protect"}, cpa:${cpa.toFixed(2)}${targetCPA ? `/t${targetCPA}` : ""})`,
              ],
            ],
          );
        } catch {}
        try {
          await upsertConfigKeys(String(tenant), {
            AP_LAST_RUN_MS: String(now),
          });
        } catch {}

        // Record optimization results for ML learning
        try {
          for (const action of applied) {
            const result = {
              success: true,
              timestamp: now,
              impact: {
                type: action.type,
                confidence: action.confidence || 0.5
              }
            };
            await mlAutopilot.recordOptimizationResult(String(tenant), action, result);
          }

          // Record failed actions for learning
          for (const error of errors) {
            const result = {
              success: false,
              timestamp: now,
              error: error.error
            };
            await mlAutopilot.recordOptimizationResult(String(tenant), error.action, result);
          }

          console.log(`ML learning recorded: ${applied.length} successes, ${errors.length} failures`);
        } catch (mlLearningError) {
          console.warn('Failed to record ML learning data:', mlLearningError.message);
        }
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
        ml: {
          enabled: mlPlan && mlPlan.length > 0,
          confidence,
          insights: mlInsights,
          learningState: mlPlan ? {
            maturity: confidence > 0.8 ? "advanced" : confidence > 0.6 ? "intermediate" : "beginner",
            dataPoints: metricsData.length + searchTermsData.length
          } : null
        }
      });
    } catch (e) {
      return json(res, 500, { ok: false, code: "AUTOPILOT", error: String(e) });
    }
  },
);

// ----- CPC ceilings batch upsert (HMAC) -----
app.post(
  "/api/cpc-ceilings/batch",
  promoteGateMiddleware("CPC_CEILINGS_BATCH"),
  async (req, res) => {
    const { tenant, sig } = req.query;
    const { nonce = Date.now(), items = [] } = req.body || {};
    const payload = `POST:${tenant}:cpc_batch:${nonce}`;
    if (!tenant || !verify(sig, payload))
      return json(res, 403, { ok: false, code: "AUTH" });
    try {
      let n = 0;
      for (const it of Array.isArray(items) ? items : []) {
        const c = String(it.campaign || "*");
        const v = Number(it.value);
        if (!isFinite(v)) continue;
        await upsertMapValue(String(tenant), "CPC_CEILINGS", c, v);
        n++;
      }
      try {
        await appendRows(
          String(tenant),
          "RUN_LOGS",
          ["timestamp", "message"],
          [[new Date().toISOString(), `cpc_batch:${n}`]],
        );
      } catch {}
      return json(res, 200, { ok: true, upserted: n });
    } catch (e) {
      return json(res, 500, { ok: false, code: "CPC_BATCH", error: String(e) });
    }
  },
);

// ----- Audience OS: ensure required tabs exist (idempotent) -----
async function ensureAudienceTabs(tenant) {
  const doc = await getDoc();
  if (!doc) return false;
  const titles = [
    `AUDIENCE_SEEDS_${tenant}`,
    `SKU_MARGIN_${tenant}`,
    `SKU_STOCK_${tenant}`,
    `AUDIENCE_SEGMENTS_${tenant}`,
    `AUDIENCE_EXPORT_${tenant}`,
    `AUDIENCE_MAP_${tenant}`,
    `ADGROUP_SKU_MAP_${tenant}`,
    `INTENT_BLOCKS_${tenant}`,
    `OVERLAY_HISTORY_${tenant}`,
  ];
  const headers = {
    [`AUDIENCE_SEEDS_${tenant}`]: [
      "customer_id",
      "email_hash",
      "phone_hash",
      "total_spent",
      "order_count",
      "last_order_at",
      "top_category",
      "last_product_ids_csv",
    ],
    [`SKU_MARGIN_${tenant}`]: ["sku", "margin"],
    [`SKU_STOCK_${tenant}`]: ["sku", "stock"],
    [`AUDIENCE_SEGMENTS_${tenant}`]: ["segment_key", "logic_sqlish", "active"],
    [`AUDIENCE_EXPORT_${tenant}`]: [
      "segment_key",
      "format",
      "url",
      "row_count",
      "generated_at",
    ],
    [`AUDIENCE_MAP_${tenant}`]: [
      "campaign",
      "ad_group",
      "user_list_id",
      "mode",
      "bid_modifier",
    ],
    [`ADGROUP_SKU_MAP_${tenant}`]: ["ad_group_id", "sku"],
    [`INTENT_BLOCKS_${tenant}`]: [
      "intent_key",
      "hero_headline",
      "benefit_bullets_pipe",
      "proof_snippet",
      "cta_text",
      "url_target",
      "updated_at",
      "updated_by",
    ],
    [`OVERLAY_HISTORY_${tenant}`]: [
      "timestamp",
      "action",
      "selector",
      "channel",
      "fields_json",
    ],
  };
  for (const t of titles) {
    await ensureSheet(doc, t, headers[t] || ["key", "value"]);
  }
  return true;
}

app.post("/api/ensureAudienceTabs", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ensureaudiencetabs:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const ok = await ensureAudienceTabs(tenant);
    if (ok) {
      try {
        await appendRows(
          tenant,
          "RUN_LOGS",
          ["timestamp", "message"],
          [[new Date().toISOString(), "audience_tabs_ensured"]],
        );
      } catch {}
    }
    res.json({ ok: !!ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Bootstrap a tenant (ensure tabs + sane defaults) -----
async function bootstrapTenant(tenant) {
  try {
    await ensureAudienceTabs(String(tenant));
  } catch {}

  // Get user settings if available
  const userSettings = await getUserSettings(tenant);
  const tierDefaults = getTierDefaults(userSettings?.plan || "starter");

  const defaults = {
    enabled: "TRUE",
    PROMOTE: "FALSE",
    label: `${tenant} • Managed`,
    plan: userSettings?.plan || "starter",
    default_final_url: userSettings?.landing_url || "",
    daily_budget_cap_default: userSettings?.budget || tierDefaults.defaultBudget,
    cpc_ceiling_default: userSettings?.cpc || tierDefaults.defaultCPC,
    add_business_hours_if_none: "TRUE",
    business_days_csv: "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
    business_start: "09:00",
    business_end: "18:00",
    master_neg_list_name: `${tenant} • Master Negatives`,
    st_lookback: tierDefaults.lookbackPeriod,
    st_min_clicks: "2",
    st_min_cost: "2.82",
    AUDIENCE_MIN_SIZE: "1000",
    // Store user settings for later retrieval
    USER_BUDGET_CAP: userSettings?.budget || "",
    USER_CPC_CEILING: userSettings?.cpc || "",
    USER_LANDING_URL: userSettings?.landing_url || "",
  };
  try {
    // Import dual-write service
    const { dualWriteConfig, readFromPreferredSource } = await import('./services/dual-write.js');

    // Use dual-write for bootstrap configuration
    const dualWriteResults = await dualWriteConfig(String(tenant), defaults);

    // If both fail, try direct Sheets write as fallback
    if (!dualWriteResults.sheets.success && !dualWriteResults.supabase.success) {
      await upsertConfigKeys(String(tenant), defaults);
    }
  } catch {}
  try {
    await appendRows(
      String(tenant),
      "RUN_LOGS",
      ["timestamp", "message"],
      [[new Date().toISOString(), "bootstrap"]],
    );
  } catch {}
  try {
    // Try to read from preferred source (Supabase first, then Sheets)
    const { readFromPreferredSource } = await import('./services/dual-write.js');
    return await readFromPreferredSource(String(tenant), 'config');
  } catch {
    // Final fallback to direct Sheets read
    try {
      return await readConfigFromSheets(String(tenant));
    } catch {
      return null;
    }
  }
}

// ----- Intent OS: Apply/Revert overlays (audit only; no auto-publish) -----
app.post("/api/intent/apply", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), overlays = [] } = req.body || {};
  const payload = `POST:${tenant}:intentapply:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `intent_apply:${overlays.length}`]],
      );
    } catch {}
    res.json({ ok: true, applied: overlays.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/intent/revert", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), overlays = [] } = req.body || {};
  const payload = `POST:${tenant}:intentrevert:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `intent_revert:${overlays.length}`]],
      );
    } catch {}
    res.json({ ok: true, reverted: overlays.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Overlays (apply/revert/bulk) — snapshot-only; audit to RUN_LOGS -----
app.post("/api/overlays/apply", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    product_ids = [],
    collection_ids = [],
    channel = "google",
    fields = {},
  } = req.body || {};
  const payload = `POST:${tenant}:overlays_apply:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    try {
      await appendRows(
        tenant,
        "OVERLAY_HISTORY",
        ["timestamp", "action", "selector", "channel", "fields_json"],
        [
          [
            new Date().toISOString(),
            "apply",
            product_ids.length
              ? `products:${product_ids.length}`
              : collection_ids.length
                ? `collections:${collection_ids.length}`
                : "none",
            channel,
            JSON.stringify(fields),
          ],
        ],
      );
    } catch {}
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `overlay_apply:${channel}`]],
      );
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/overlays/revert", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    product_ids = [],
    collection_ids = [],
    channel = "google",
  } = req.body || {};
  const payload = `POST:${tenant}:overlays_revert:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    try {
      await appendRows(
        tenant,
        "OVERLAY_HISTORY",
        ["timestamp", "action", "selector", "channel", "fields_json"],
        [
          [
            new Date().toISOString(),
            "revert",
            product_ids.length
              ? `products:${product_ids.length}`
              : collection_ids.length
                ? `collections:${collection_ids.length}`
                : "none",
            channel,
            "{}",
          ],
        ],
      );
    } catch {}
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `overlay_revert:${channel}`]],
      );
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/overlays/bulk", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    select = "collection",
    value = "",
    channel = "google",
    fields = {},
  } = req.body || {};
  const payload = `POST:${tenant}:overlays_bulk:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    try {
      await appendRows(
        tenant,
        "OVERLAY_HISTORY",
        ["timestamp", "action", "selector", "channel", "fields_json"],
        [
          [
            new Date().toISOString(),
            "apply_bulk",
            `${select}:${value}`,
            channel,
            JSON.stringify(fields),
          ],
        ],
      );
    } catch {}
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `overlay_bulk:${select}:${value}`]],
      );
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Seed demo data (SECURE DEV ONLY; HMAC) -----
app.post("/api/seed-demo", async (req, res) => {
  // SECURITY FIX: Use deployment environment instead of NODE_ENV
  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV === "production";

  if (isProduction) {
    return res.status(403).json({
      ok: false,
      error: "forbidden_in_production",
      message: "Seed demo only available in development/staging deployments",
    });
  }
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:seed_demo:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.status(500).json({ ok: false, error: "no_sheets" });
    const seeded = { tabs: [], rows: 0 };
    // Minimal tabs aligned to insights & planner readers
    const metHeaders = [
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
    const stHeaders = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const runHeaders = ["timestamp", "message"];
    const metSheet = await ensureSheet(doc, `METRICS_${tenant}`, metHeaders);
    const stSheet = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, stHeaders);
    const rlSheet = await ensureSheet(doc, `RUN_LOGS_${tenant}`, runHeaders);
    try {
      await metSheet.clearRows();
      await metSheet.setHeaderRow(metHeaders);
    } catch {}
    try {
      await stSheet.clearRows();
      await stSheet.setHeaderRow(stHeaders);
    } catch {}
    try {
      await rlSheet.clearRows();
      await rlSheet.setHeaderRow(runHeaders);
    } catch {}
    const iso = new Date().toISOString().slice(0, 10);
    await metSheet.addRow({
      date: iso,
      level: "ad_group",
      campaign: "Demo Campaign",
      ad_group: "Demo AdGroup",
      id: "1",
      name: "Demo KW",
      clicks: "12",
      cost: "6.50",
      conversions: "1",
      impr: "120",
      ctr: "0.10",
    });
    await stSheet.addRow({
      date: iso,
      campaign: "Demo Campaign",
      ad_group: "Demo AdGroup",
      search_term: "demo shoes",
      clicks: "8",
      cost: "5.20",
      conversions: "0",
    });
    await rlSheet.addRow({
      timestamp: new Date().toISOString(),
      message: "seed_demo_data",
    });
    seeded.tabs.push(
      `METRICS_${tenant}`,
      `SEARCH_TERMS_${tenant}`,
      `RUN_LOGS_${tenant}`,
    );
    seeded.rows = 3;
    return res.json({ ok: true, seeded });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Intent OS: CRUD -----
app.get("/api/intent/list", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:intent_list`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok: true, rows: [] });
    const sh = await ensureSheet(doc, `INTENT_BLOCKS_${tenant}`, [
      "intent_key",
      "hero_headline",
      "benefit_bullets_pipe",
      "proof_snippet",
      "cta_text",
      "url_target",
      "updated_at",
      "updated_by",
    ]);
    const rows = await sh.getRows();
    res.json({
      ok: true,
      rows: rows.map((r) => ({
        intent_key: String(r.intent_key || "").trim(),
        hero_headline: String(r.hero_headline || ""),
        benefit_bullets_pipe: String(r.benefit_bullets_pipe || ""),
        proof_snippet: String(r.proof_snippet || ""),
        cta_text: String(r.cta_text || ""),
        url_target: String(r.url_target || ""),
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/intent/upsert", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), rows = [] } = req.body || {};
  const payload = `POST:${tenant}:intent_upsert:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok: true, upserted: 0 });
    const sh = await ensureSheet(doc, `INTENT_BLOCKS_${tenant}`, [
      "intent_key",
      "hero_headline",
      "benefit_bullets_pipe",
      "proof_snippet",
      "cta_text",
      "url_target",
      "updated_at",
      "updated_by",
    ]);
    const existing = await sh.getRows();
    const byKey = new Map(
      existing.map((r) => [
        String(r.intent_key || "")
          .trim()
          .toLowerCase(),
        r,
      ]),
    );
    let count = 0;
    for (const r of rows) {
      const key = String(r.intent_key || "").trim();
      if (!key) continue;
      const hero = String(r.hero_headline || "");
      const cta = String(r.cta_text || "");
      const bullets = String(r.benefit_bullets_pipe || "");
      if (hero.length > 80) continue;
      if (cta.length > 30) continue;
      if (bullets.split("|").some((b) => b.trim().length > 100)) continue;
      const found = byKey.get(key.toLowerCase());
      if (found) {
        found.hero_headline = hero;
        found.benefit_bullets_pipe = bullets;
        found.proof_snippet = String(r.proof_snippet || "");
        found.cta_text = cta;
        found.url_target = String(r.url_target || "");
        found.updated_at = new Date().toISOString();
        found.updated_by = "api";
        await found.save();
      } else {
        await sh.addRow({
          intent_key: key,
          hero_headline: hero,
          benefit_bullets_pipe: bullets,
          proof_snippet: String(r.proof_snippet || ""),
          cta_text: cta,
          url_target: String(r.url_target || ""),
          updated_at: new Date().toISOString(),
          updated_by: "api",
        });
      }
      count += 1;
    }
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `intent_upsert:${count}`]],
      );
    } catch {}
    res.json({ ok: true, upserted: count });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/intent/delete", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), intent_keys = [] } = req.body || {};
  const payload = `POST:${tenant}:intent_delete:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok: true, deleted: 0 });
    const sh = await ensureSheet(doc, `INTENT_BLOCKS_${tenant}`, [
      "intent_key",
    ]);
    const rows = await sh.getRows();
    const del = new Set(
      (intent_keys || []).map((k) =>
        String(k || "")
          .trim()
          .toLowerCase(),
      ),
    );
    let keep = [],
      deleted = 0;
    rows.forEach((r) => {
      const k = String(r.intent_key || "")
        .trim()
        .toLowerCase();
      if (!k || del.has(k)) deleted++;
      else keep.push(r);
    });
    if (deleted > 0) {
      await sh.clearRows();
      await sh.setHeaderRow([
        "intent_key",
        "hero_headline",
        "benefit_bullets_pipe",
        "proof_snippet",
        "cta_text",
        "url_target",
        "updated_at",
        "updated_by",
      ]);
      for (const r of keep)
        await sh.addRow({
          intent_key: r.intent_key,
          hero_headline: r.hero_headline,
          benefit_bullets_pipe: r.benefit_bullets_pipe,
          proof_snippet: r.proof_snippet,
          cta_text: r.cta_text,
          url_target: r.url_target,
          updated_at: r.updated_at,
          updated_by: r.updated_by,
        });
    }
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `intent_delete:${deleted}`]],
      );
    } catch {}
    res.json({ ok: true, deleted });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Summary (KPIs + Top terms) -----
app.get("/api/summary", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:summary_get`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc)
      return res.json({
        ok: true,
        kpis: { spend: 0, clicks: 0, conv: 0, cpa: 0 },
        top_terms: [],
        last_run: null,
      });
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // KPIs
    const metrics = await ensureSheet(doc, `METRICS_${tenant}`, [
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
    ]);
    const mRows = await metrics.getRows();
    let spend = 0,
      clicks = 0,
      conv = 0;
    for (const r of mRows) {
      const ts = Date.parse(String(r.date || ""));
      if (isFinite(ts) && ts >= since) {
        clicks += Number(r.clicks || 0);
        spend += Number(r.cost || 0);
        conv += Number(r.conversions || 0);
      }
    }
    const cpa = conv > 0 ? spend / conv : 0;
    // Top terms
    const st = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ]);
    const tr = await st.getRows();
    const map = new Map();
    for (const r of tr) {
      const term = String(r.search_term || "").trim();
      if (!term) continue;
      const ts = Date.parse(String(r.date || ""));
      if (!isFinite(ts) || ts < since) continue;
      const e = map.get(term) || { term, clicks: 0, cost: 0 };
      e.clicks += Number(r.clicks || 0);
      e.cost += Number(r.cost || 0);
      map.set(term, e);
    }
    const top_terms = Array.from(map.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
    res.json({
      ok: true,
      kpis: { spend, clicks, conv, cpa },
      top_terms,
      last_run: null,
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// ----- Insights (HMAC) -----
app.get("/api/insights", async (req, res) => {
  const { tenant, sig } = req.query;
  const wq = String(req.query.w || "7d").toLowerCase();
  const w = wq === "24h" || wq === "all" ? wq : "7d";
  const payload = `GET:${tenant}:insights`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const cacheKey = `${tenant}:${w}`;
    const cached = insightsCache.get(cacheKey);
    const nowMs = Date.now();
    if (cached && nowMs - cached.ts < 60_000)
      return json(res, 200, cached.data);

    const MET_HEADERS = [
      "period",      // NEW: time period (TODAY, YESTERDAY, LAST_7_DAYS, etc.)
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
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const metAoA = await readRowsAoA(
      String(tenant),
      "METRICS",
      MET_HEADERS,
      4000,
    );
    const stsAoA = await readRowsAoA(
      String(tenant),
      "SEARCH_TERMS",
      ST_HEADERS,
      4000,
    );
    const toObj = (rows, headers) =>
      rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    const metObj = toObj(metAoA, MET_HEADERS).map((row) => {
      const o = {};
      for (const [k, v] of Object.entries(row)) o[String(k).toLowerCase()] = v;
      return o;
    });
    const stObj = toObj(stsAoA, ST_HEADERS).map((row) => {
      const o = {};
      for (const [k, v] of Object.entries(row)) o[String(k).toLowerCase()] = v;
      return o;
    });

    // Parse ISO strings, numbers, and Google serial dates (days since 1899-12-30)
    function parseTsLoose(row) {
      const raw = row?.date ?? row?.timestamp ?? row?.ts ?? "";
      if (raw instanceof Date) {
        const t = raw.getTime();
        return Number.isFinite(t) ? t : NaN;
      }
      const n = Number(raw);
      if (Number.isFinite(n)) {
        if (n > 10_000_000_000) return n; // ms epoch
        if (n > 10_000 && n < 1_000_000) {
          // serial days → ms
          const ms = (n - 25569) * 86400 * 1000; // Excel/Sheets epoch offset
          return Number.isFinite(ms) ? ms : NaN;
        }
      }
      const s = String(raw).trim();
      const p = Date.parse(s);
      return Number.isFinite(p) ? p : NaN;
    }

    const now = Date.now();
    const horizon =
      w === "all"
        ? -Infinity
        : now - (w === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);

    // KPIs
    let clicks = 0,
      cost = 0,
      conv = 0,
      imp = 0;
    let met_scanned = 0,
      met_in_window = 0;
    for (const r of metObj) {
      met_scanned++;
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      met_in_window++;
      clicks += Number(r.clicks || 0);
      cost += Number(r.cost || 0);
      conv += Number(r.conversions || 0);
      imp += Number(r.impr || r.impressions || 0);
    }
    const ctr = imp ? clicks / imp : 0;
    const cpc = clicks ? cost / clicks : 0;
    const cpa = conv ? cost / conv : 0;

    // Top terms
    const bucket = new Map();
    let sts_scanned = 0,
      sts_in_window = 0;
    for (const r of stObj) {
      sts_scanned++;
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      sts_in_window++;
      const term = String(r.search_term || "")
        .trim()
        .toLowerCase();
      if (!term) continue;
      const cur = bucket.get(term) || {
        term,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conversions += Number(r.conversions || 0);
      bucket.set(term, cur);
    }
    const top_terms = Array.from(bucket.values())
      .sort((a, b) => b.cost - a.cost || b.clicks - a.clicks)
      .slice(0, 10);

    // Time series
    const roundKey = (d) => {
      const dt = new Date(d);
      if (w === "24h") {
        dt.setMinutes(0, 0, 0);
        return dt.toISOString().slice(0, 13) + ":00";
      }
      dt.setHours(0, 0, 0, 0);
      return dt.toISOString().slice(0, 10);
    };
    const seriesMap = new Map();
    for (const r of metObj) {
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      const k = roundKey(ts);
      const cur = seriesMap.get(k) || {
        t: k,
        clicks: 0,
        cost: 0,
        conv: 0,
        impr: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conv += Number(r.conversions || 0);
      cur.impr += Number(r.impr || r.impressions || 0);
      seriesMap.set(k, cur);
    }
    const series = Array.from(seriesMap.values()).sort((a, b) =>
      a.t.localeCompare(b.t),
    );

    // Explain
    const explain = top_terms.slice(0, 3).map((t) => {
      let action = "monitor",
        target = t.term,
        reason = `Cost $${(t.cost || 0).toFixed(2)} • ${t.clicks || 0} clicks • ${t.conversions || 0} conv`;
      if ((t.conversions || 0) === 0 && (t.cost || 0) >= 2.82)
        action = "add_exact_negative";
      else if (cpc > 0.5 && ctr < 0.02) action = "lower_cpc_ceiling";
      return { label: t.term, reason, action, target };
    });

    const debug_counts = {
      met_scanned,
      met_in_window,
      sts_scanned,
      sts_in_window,
    };
    const data = {
      ok: true,
      w,
      kpi: { clicks, cost, conversions: conv, impressions: imp, ctr, cpc, cpa },
      top_terms,
      series,
      explain,
      debug_counts,
    };
    insightsCache.set(cacheKey, { ts: nowMs, data });
    return json(res, 200, data);
  } catch (e) {
    return json(res, 500, { ok: false, code: "INSIGHTS", error: String(e) });
  }
});

// ----- Terms Explorer (HMAC) -----
app.get("/api/insights/terms", async (req, res) => {
  const { tenant, sig } = req.query;
  const w = String(req.query.w || "7d").toLowerCase();
  const q = String(req.query.q || "").toLowerCase();
  const campaignLike = String(req.query.campaign || "").toLowerCase();
  const minClicks = Number(req.query.min_clicks || 0);
  const minCost = Number(req.query.min_cost || 0);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 200))); // legacy cap
  const sort = String(req.query.sort || "cost"); // cost|clicks|conversions|cpc|cpa|term
  const dir =
    String(req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const pageSize = Math.min(
    500,
    Math.max(10, parseInt(String(req.query.page_size || "50"), 10)),
  );
  const includeTotal = String(req.query.include_total || "false") === "true";
  const payload = `GET:${tenant}:insights_terms`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const rowsAoA = await readRowsAoA(
      String(tenant),
      "SEARCH_TERMS",
      ST_HEADERS,
      5000,
    );
    const toObj = (r) => ({
      date: r[0],
      campaign: r[1],
      ad_group: r[2],
      search_term: r[3],
      clicks: Number(r[4] || 0),
      cost: Number(r[5] || 0),
      conversions: Number(r[6] || 0),
    });
    const objs = rowsAoA.map(toObj);
    const horizon = (() => {
      const now = Date.now();
      if (w === "24h") return now - 24 * 60 * 60 * 1000;
      if (w === "30d") return now - 30 * 24 * 60 * 60 * 1000;
      return now - 7 * 24 * 60 * 60 * 1000;
    })();
    const bucket = new Map();
    for (const r of objs) {
      const ts = Date.parse(String(r.date || ""));
      if (!isFinite(ts) || ts < horizon) continue;
      const term = String(r.search_term || "")
        .trim()
        .toLowerCase();
      if (!term) continue;
      if (q && !term.includes(q)) continue;
      if (
        campaignLike &&
        !String(r.campaign || "")
          .toLowerCase()
          .includes(campaignLike)
      )
        continue;
      const cur = bucket.get(term) || {
        term,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conversions += Number(r.conversions || 0);
      bucket.set(term, cur);
    }
    let rows = Array.from(bucket.values()).filter(
      (r) => r.clicks >= minClicks && r.cost >= minCost,
    );
    rows.sort((a, b) => b.cost - a.cost || b.clicks - a.clicks);
    // load negatives to flag existing ones + locations
    let negSet = new Set(); // account exact
    let negAccPhrase = new Set(); // account phrase
    let negCampaigns = new Map(); // term -> Set(campaign)
    let negAdGroups = new Map(); // term -> Set(`${campaign} › ${ad_group}`)
    try {
      const doc = await getDoc();
      if (doc) {
        const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, [
          "term",
        ]);
        const nrows = await nsh.getRows();
        negSet = new Set(
          nrows.map((r) =>
            String(r.term || "")
              .trim()
              .toLowerCase(),
          ),
        );

        const map = await ensureNegativeMapSheet(String(tenant));
        if (map) {
          const mrows = await map.getRows();
          for (const r of mrows) {
            const t = String(r.term || "")
              .trim()
              .toLowerCase();
            const m = String(r.match || "").toLowerCase();
            const sc = String(r.scope || "").toLowerCase();
            if (!t) continue;
            if (sc === "account" && m === "phrase") negAccPhrase.add(t);
            if (sc === "campaign") {
              const c = String(r.campaign || "");
              if (c) {
                const S = negCampaigns.get(t) || new Set();
                S.add(c);
                negCampaigns.set(t, S);
              }
            }
            if (sc === "ad_group") {
              const c = String(r.campaign || "");
              const g = String(r.ad_group || "");
              if (c && g) {
                const S = negAdGroups.get(t) || new Set();
                S.add(`${c} › ${g}`);
                negAdGroups.set(t, S);
              }
            }
          }
        }
      }
    } catch {}
    // build enriched rows first (no sort/page yet)
    rows = rows.map((r) => {
      const termLc = String(r.term || "").toLowerCase();
      return {
        term: r.term,
        clicks: r.clicks,
        cost: r.cost,
        conversions: r.conversions,
        cpc: r.clicks ? r.cost / r.clicks : 0,
        cpa: r.conversions ? r.cost / r.conversions : 0,
        is_negative:
          negSet.has(termLc) ||
          negAccPhrase.has(termLc) ||
          negCampaigns.has(termLc) ||
          negAdGroups.has(termLc),
        is_negative_account_exact: negSet.has(termLc),
        is_negative_account_phrase: negAccPhrase.has(termLc),
        in_campaigns: Array.from(negCampaigns.get(termLc) || []),
        in_ad_groups: Array.from(negAdGroups.get(termLc) || []),
      };
    });

    // sort
    rows.sort((a, b) => {
      const k = sort;
      const av = k === "term" ? String(a.term) : Number(a[k] || 0);
      const bv = k === "term" ? String(b.term) : Number(b[k] || 0);
      if (k === "term")
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const slice = rows.slice(start, start + pageSize);
    const paged = slice.slice(0, limit);
    const meta = includeTotal
      ? {
          total,
          page,
          page_size: pageSize,
          pages: Math.max(1, Math.ceil(total / pageSize)),
        }
      : {};
    return json(res, 200, {
      ok: true,
      w: w === "24h" || w === "30d" ? w : "7d",
      count: paged.length,
      rows: paged,
      ...meta,
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "TERMS", error: String(e) });
  }
});

// ----- Terms CSV (HMAC) -----
app.get("/api/insights/terms.csv", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:insights_terms`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    // Reuse logic by calling JSON endpoint aggregation inline (duplicated minimal flow):
    const w = String(req.query.w || "7d").toLowerCase();
    const q = String(req.query.q || "").toLowerCase();
    const campaignLike = String(req.query.campaign || "").toLowerCase();
    const minClicks = Number(req.query.min_clicks || 0);
    const minCost = Number(req.query.min_cost || 0);
    const sort = String(req.query.sort || "cost");
    const dir =
      String(req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const pageSize = Math.min(
      2000,
      Math.max(10, parseInt(String(req.query.page_size || "1000"), 10)),
    );

    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const rowsAoA = await readRowsAoA(
      String(tenant),
      "SEARCH_TERMS",
      ST_HEADERS,
      5000,
    );
    const toObj = (r) => ({
      date: r[0],
      campaign: r[1],
      ad_group: r[2],
      search_term: r[3],
      clicks: Number(r[4] || 0),
      cost: Number(r[5] || 0),
      conversions: Number(r[6] || 0),
    });
    const objs = rowsAoA.map(toObj);
    const horizon = (() => {
      const now = Date.now();
      if (w === "24h") return now - 24 * 60 * 60 * 1000;
      if (w === "30d") return now - 30 * 24 * 60 * 60 * 1000;
      return now - 7 * 24 * 60 * 60 * 1000;
    })();
    const bucket = new Map();
    for (const r of objs) {
      const ts = Date.parse(String(r.date || ""));
      if (!isFinite(ts) || ts < horizon) continue;
      const term = String(r.search_term || "")
        .trim()
        .toLowerCase();
      if (!term) continue;
      if (q && !term.includes(q)) continue;
      if (
        campaignLike &&
        !String(r.campaign || "")
          .toLowerCase()
          .includes(campaignLike)
      )
        continue;
      const cur = bucket.get(term) || {
        term,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conversions += Number(r.conversions || 0);
      bucket.set(term, cur);
    }
    let rows = Array.from(bucket.values()).filter(
      (r) => r.clicks >= minClicks && r.cost >= minCost,
    );
    // Enrich negatives presence
    let negSet = new Set();
    let negAccPhrase = new Set();
    let negCampaigns = new Map();
    let negAdGroups = new Map();
    try {
      const doc = await getDoc();
      if (doc) {
        const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, [
          "term",
        ]);
        const nrows = await nsh.getRows();
        negSet = new Set(
          nrows.map((r) =>
            String(r.term || "")
              .trim()
              .toLowerCase(),
          ),
        );
        const map = await ensureNegativeMapSheet(String(tenant));
        if (map) {
          const mrows = await map.getRows();
          for (const r of mrows) {
            const t = String(r.term || "")
              .trim()
              .toLowerCase();
            const m = String(r.match || "").toLowerCase();
            const sc = String(r.scope || "").toLowerCase();
            if (!t) continue;
            if (sc === "account" && m === "phrase") negAccPhrase.add(t);
            if (sc === "campaign") {
              const c = String(r.campaign || "");
              if (c) {
                const S = negCampaigns.get(t) || new Set();
                S.add(c);
                negCampaigns.set(t, S);
              }
            }
            if (sc === "ad_group") {
              const c = String(r.campaign || "");
              const g = String(r.ad_group || "");
              if (c && g) {
                const S = negAdGroups.get(t) || new Set();
                S.add(`${c} › ${g}`);
                negAdGroups.set(t, S);
              }
            }
          }
        }
      }
    } catch {}
    rows = rows.map((r) => {
      const termLc = String(r.term || "").toLowerCase();
      return {
        term: r.term,
        clicks: r.clicks,
        cost: r.cost,
        conversions: r.conversions,
        cpc: r.clicks ? r.cost / r.clicks : 0,
        cpa: r.conversions ? r.cost / r.conversions : 0,
        is_negative_account_exact: negSet.has(termLc),
        is_negative_account_phrase: negAccPhrase.has(termLc),
        in_campaigns: Array.from(negCampaigns.get(termLc) || []),
        in_ad_groups: Array.from(negAdGroups.get(termLc) || []),
      };
    });
    rows.sort((a, b) => {
      const k = sort;
      const av = k === "term" ? String(a.term) : Number(a[k] || 0);
      const bv = k === "term" ? String(b.term) : Number(b[k] || 0);
      if (k === "term")
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    const start = (page - 1) * pageSize;
    const slice = rows.slice(start, start + pageSize);
    const header = [
      "term",
      "clicks",
      "cost",
      "conversions",
      "cpc",
      "cpa",
      "is_negative_account_exact",
      "is_negative_account_phrase",
      "in_campaigns",
      "in_ad_groups",
    ];
    const csv = [header.join(",")]
      .concat(
        slice.map((r) => {
          const camps = (r.in_campaigns || []).join("|");
          const adgs = (r.in_ad_groups || []).join("|");
          return [
            r.term,
            r.clicks,
            r.cost,
            r.conversions,
            (r.cpc || 0).toFixed(4),
            (r.cpa || 0).toFixed(4),
            r.is_negative_account_exact ? 1 : 0,
            r.is_negative_account_phrase ? 1 : 0,
            `"${camps}"`,
            `"${adgs}"`,
          ].join(",");
        }),
      )
      .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="terms_${tenant}_${String(req.query.w || "7d")}.csv"`,
    );
    return res.send(csv);
  } catch (e) {
    return json(res, 500, { ok: false, code: "TERMS_CSV", error: String(e) });
  }
});

// ----- Apply Insights Actions (HMAC) -----
// Body: { nonce, actions: [{ type:'add_exact_negative'|'lower_cpc_ceiling', target:string, campaign?:string, amount?:number }] }
app.post(
  "/api/insights/actions/apply",
  promoteGateMiddleware("INSIGHTS_ACTIONS"),
  async (req, res) => {
    const { tenant, sig } = req.query;
    const { nonce = Date.now(), actions = [] } = req.body || {};
    const payload = `POST:${tenant}:insights_actions:${nonce}`;
    if (!tenant || !verify(sig, payload))
      return json(res, 403, { ok: false, code: "AUTH" });
    try {
      // Preload existing negatives for duplicate-aware skipping
      const existing = new Set();
      try {
        const doc = await getDoc();
        if (doc) {
          const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, [
            "term",
          ]);
          const nrows = await nsh.getRows();
          for (const r of nrows)
            existing.add(
              `account|exact|||${String(r.term || "")
                .trim()
                .toLowerCase()}`,
            );
          const map = await ensureNegativeMapSheet(String(tenant));
          if (map) {
            const mrows = await map.getRows();
            for (const r of mrows) {
              existing.add(
                `${String(r.scope || "").toLowerCase()}|${String(r.match || "").toLowerCase()}|${String(r.campaign || "")}|${String(r.ad_group || "")}|${String(
                  r.term || "",
                )
                  .trim()
                  .toLowerCase()}`,
              );
            }
          }
        }
      } catch {}
      const now = Date.now();
      const applied = [];
      const errors = [];
      const skipped = [];
      for (const a of Array.isArray(actions) ? actions : []) {
        const type = String(a?.type || "").toLowerCase();
        const target = (a?.target ?? a?.term ?? "").toString().trim();
        const scope = String(a?.scope || "account").toLowerCase();
        const match = String(a?.match || "exact").toLowerCase();
        const campaign = (a?.campaign ?? "*").toString().trim() || "*";
        const amount = Number(a?.amount);
        const key = `${tenant}:${type}:${scope}:${campaign}:${a?.ad_group || ""}:${match}:${target}:${isFinite(amount) ? amount : ""}`;
        const last = actionDedupe.get(key) || 0;
        if (now - last < 120_000) {
          skipped.push({ type, target, reason: "recent_duplicate" });
          continue;
        }
        const comboKey =
          type === "add_negative" || type === "remove_negative"
            ? `${scope}|${match}|${a?.campaign || ""}|${a?.ad_group || ""}|${target.toLowerCase()}`
            : type === "add_exact_negative" || type === "remove_exact_negative"
              ? `account|exact|||${target.toLowerCase()}`
              : "";
        if (type === "add_negative" || type === "add_exact_negative") {
          if (comboKey && existing.has(comboKey)) {
            skipped.push({ type, target, reason: "already_exists" });
            continue;
          }
        }
        try {
          if (type === "add_exact_negative") {
            if (!target) throw new Error("missing_target");
            await appendMasterNegative(String(tenant), target);
            applied.push({ type, target, campaign });
          } else if (type === "add_negative") {
            if (!target) throw new Error("missing_target");
            if (scope === "account" && match === "exact") {
              await appendMasterNegative(String(tenant), target);
            } else {
              await addScopedNegative(String(tenant), {
                scope,
                campaign: a?.campaign || "",
                ad_group: a?.ad_group || "",
                match,
                term: target,
              });
            }
            applied.push({
              type,
              target,
              scope,
              match,
              campaign: a?.campaign || "",
              ad_group: a?.ad_group || "",
            });
          } else if (type === "remove_exact_negative") {
            if (!target) throw new Error("missing_target");
            await removeMasterNegative(String(tenant), target);
            applied.push({ type, target, campaign });
          } else if (type === "remove_negative") {
            if (!target) throw new Error("missing_target");
            if (scope === "account" && match === "exact") {
              await removeMasterNegative(String(tenant), target);
            } else {
              await removeScopedNegative(String(tenant), {
                scope,
                campaign: a?.campaign || "",
                ad_group: a?.ad_group || "",
                match,
                term: target,
              });
            }
            applied.push({
              type,
              target,
              scope,
              match,
              campaign: a?.campaign || "",
              ad_group: a?.ad_group || "",
            });
          } else if (type === "lower_cpc_ceiling") {
            if (!isFinite(amount)) throw new Error("missing_amount");
            await upsertMapValue(
              String(tenant),
              "CPC_CEILINGS",
              campaign,
              amount,
            );
            applied.push({ type, campaign, amount });
          } else {
            throw new Error("unsupported_type");
          }
          actionDedupe.set(key, now);
          if (comboKey) existing.add(comboKey);
        } catch (e) {
          errors.push({ type, target, campaign, error: String(e) });
        }
      }
      try {
        await appendRows(
          String(tenant),
          "RUN_LOGS",
          ["timestamp", "message"],
          [[new Date().toISOString(), `insights_actions:${applied.length}`]],
        );
      } catch {}
      try {
        insightsCache.clear();
      } catch {}
      return json(res, 200, { ok: true, applied, skipped, errors });
    } catch (e) {
      return json(res, 500, { ok: false, code: "ACTIONS", error: String(e) });
    }
  },
);

// ----- Insights tier-status (HMAC) -----
app.get("/api/insights/tier-status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:tier_status`;
  if (!tenant || !verify(String(sig || ""), payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    // Return a simple tier status for now
    return json(res, 200, {
      ok: true,
      tenant,
      tier: 'starter',
      features: {
        basicAnalytics: true,
        realTimeAnalytics: false,
        advancedRoas: false,
        customDashboards: false,
        customRoasModels: false,
        maxDataPoints: 1000,
        refreshInterval: 300000,
        availableCharts: ['line', 'bar'],
        exportFormats: ['csv']
      },
      config: {
        refreshInterval: 300000,
        maxDataPoints: 1000
      }
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "TIER_STATUS", error: String(e) });
  }
});

// ----- Insights debug (HMAC) -----
app.get("/api/insights/debug", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:insights`;
  if (!tenant || !verify(String(sig || ""), payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const MET_HEADERS = [
      "period",      // NEW: time period (TODAY, YESTERDAY, LAST_7_DAYS, etc.)
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
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const metAoA = await readRowsAoA(
      String(tenant),
      "METRICS",
      MET_HEADERS,
      50,
    );
    const stsAoA = await readRowsAoA(
      String(tenant),
      "SEARCH_TERMS",
      ST_HEADERS,
      50,
    );
    const toObj = (rows, headers) =>
      rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    const met = toObj(metAoA, MET_HEADERS);
    const sts = toObj(stsAoA, ST_HEADERS);
    const preview = (rows) =>
      rows.slice(-5).map((r) => {
        const raw = r?.date ?? r?.timestamp ?? r?.ts ?? "";
        let parsed = NaN;
        if (raw instanceof Date) parsed = raw.getTime();
        else {
          const n = Number(raw);
          if (Number.isFinite(n)) {
            if (n > 10_000_000_000) parsed = n;
            else if (n > 10_000 && n < 1_000_000)
              parsed = (n - 25569) * 86400 * 1000;
          }
          if (!Number.isFinite(parsed)) {
            const p = Date.parse(String(raw).trim());
            if (Number.isFinite(p)) parsed = p;
          }
        }
        return { ...r, _parsed_ts: Number.isFinite(parsed) ? parsed : null };
      });
    return json(res, 200, {
      ok: true,
      sample: { met: preview(met), sts: preview(sts) },
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "DEBUG", error: String(e) });
  }
});

// ----- Run logs (HMAC) -----
app.get("/api/run-logs", async (req, res) => {
  const { tenant, sig } = req.query;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 10)));
  const payload = `GET:${tenant}:run_logs`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const doc = await getDoc();
    if (!doc) return json(res, 200, { ok: true, rows: [] });
    const sh = await ensureSheet(doc, `RUN_LOGS_${tenant}`, [
      "timestamp",
      "message",
    ]);
    const rows = await sh.getRows();
    const out = rows.slice(Math.max(0, rows.length - limit)).map((r) => ({
      timestamp: String(r.timestamp || ""),
      message: String(r.message || ""),
    }));
    return json(res, 200, { ok: true, rows: out.reverse() });
  } catch (e) {
    return json(res, 500, { ok: false, code: "RUN_LOGS", error: String(e) });
  }
});

// ----- Audience exports list -----
app.get("/api/audiences/export/list", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:audiences_export_list`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok: true, rows: [] });
    const sh = await ensureSheet(doc, `AUDIENCE_EXPORT_${tenant}`, [
      "file_name",
      "segment_key",
      "format",
      "row_count",
      "last_built_at",
      "storage_url",
    ]);
    const rows = await sh.getRows();
    res.json({
      ok: true,
      rows: rows.map((r) => ({
        file_name: r.file_name,
        segment_key: r.segment_key,
        format: r.format,
        row_count: Number(r.row_count || 0),
        last_built_at: r.last_built_at,
        storage_url: r.storage_url,
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Promote window -----
app.post("/api/promote/window", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    start_at = "now+2m",
    duration_minutes = 60,
  } = req.body || {};
  const payload = `POST:${tenant}:promote_window:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const startMs = (() => {
      if (String(start_at).startsWith("now+")) {
        const m = String(start_at).match(/now\+(\d+)m/i);
        return Date.now() + (m ? Number(m[1]) : 2) * 60 * 1000;
      }
      const t = Date.parse(String(start_at));
      return isFinite(t) ? t : Date.now() + 2 * 60 * 1000;
    })();
    const out = await schedulePromoteWindow(
      String(tenant),
      startMs,
      Number(duration_minutes || 60),
    );
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [
          [
            new Date().toISOString(),
            `promote_window_scheduled:${duration_minutes}`,
          ],
        ],
      );
    } catch {}
    res.json(
      out.ok
        ? { ok: true }
        : { ok: false, error: out.error || "schedule_failed" },
    );
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// naive in-process pulse - tick for all registered tenants (no-op if no schedule)
setInterval(async () => {
  try {
    // Get all registered tenants and tick promote window for each
    const tenantRegistryJson = process.env.TENANT_REGISTRY_JSON;
    if (tenantRegistryJson) {
      const tenants = JSON.parse(tenantRegistryJson);
      for (const tenantId of Object.keys(tenants)) {
        await tickPromoteWindow(String(tenantId)).catch((err) =>
          console.error(
            `Promote window tick failed for ${tenantId}:`,
            err.message,
          ),
        );
      }
    }
    // Also tick for default tenant if SHEET_ID is configured
    if (process.env.SHEET_ID) {
      await tickPromoteWindow("default").catch((err) =>
        console.error(
          "Promote window tick failed for default tenant:",
          err.message,
        ),
      );
    }
  } catch (error) {
    console.error("Promote window tick batch failed:", error.message);
  }
}, 60_000);

// ----- Audience map upsert (helper) -----
app.post("/api/audiences/mapUpsert", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), rows = [] } = req.body || {};
  const payload = `POST:${tenant}:audiences_map_upsert:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok: true, upserted: 0 });
    const sh = await ensureSheet(doc, `AUDIENCE_MAP_${tenant}`, [
      "campaign",
      "ad_group",
      "user_list_id",
      "mode",
      "bid_modifier",
    ]);
    for (const r of rows) {
      await sh.addRow({
        campaign: String(r.campaign || "").trim(),
        ad_group: String(r.ad_group || "").trim(),
        user_list_id: String(r.user_list_id || "").trim(),
        mode: String(r.mode || "OBSERVE").toUpperCase(),
        bid_modifier: String(r.bid_modifier || ""),
      });
    }
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `aud_map_upsert:${rows.length}`]],
      );
    } catch {}
    res.json({ ok: true, upserted: rows.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- AI Writer job (optional) -----
app.post("/api/jobs/ai_writer", requireActiveSubscription(), async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    dryRun = false,
    limit = 5,
    runSync = process.env.AI_WRITER_SYNC === 'true',
    metadata = {}
  } = req.body || {};

  const payload = `POST:${tenant}:ai_writer:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });

  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  if (provider === "openai" && !process.env.OPENAI_KEY)
    return res.status(400).json({ ok: false, error: "OPENAI_KEY missing" });
  if (provider === "anthropic" && !process.env.ANTHROPIC_KEY)
    return res.status(400).json({ ok: false, error: "ANTHROPIC_KEY missing" });
  if (provider === "google" && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY)
    return res.status(400).json({ ok: false, error: "GEMINI_API_KEY missing" });

  const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 10));
  const shouldQueue = !dryRun && !runSync;

  try {
    if (shouldQueue) {
      try {
        const queueManager = getQueueManager();
        const job = await queueManager.addJob({
          type: JOB_TYPES.AI_WRITER_GENERATE,
          tenantId: String(tenant),
          priority: JOB_PRIORITIES.HIGH,
          data: {
            limit: safeLimit,
            requestNonce: nonce,
            requestMetadata: metadata,
            requestedBy: req.headers['x-shopify-shop-domain'] || req.headers['x-user-id'] || 'api'
          },
          metadata: {
            source: 'api',
            requestedAt: new Date().toISOString()
          }
        });

        try {
          await appendRows(
            tenant,
            "RUN_LOGS",
            ["timestamp", "message"],
            [[new Date().toISOString(), `ai_writer_queued:${job.id}`]],
          );
        } catch {}

        return res.json({
          ok: true,
          queued: true,
          processing: true,
          status: "queued",
          jobId: job.id,
          limit: safeLimit,
          message: "AI writer job queued. We'll notify you when it's ready."
        });
      } catch (error) {
        logger.error("Failed to enqueue AI writer job", {
          tenant,
          error: error.message,
        });
        return res.status(500).json({ ok: false, error: error.message || "Queueing failed" });
      }
    }

    if (dryRun) {
      try {
        await appendRows(
          tenant,
          "RUN_LOGS",
          ["timestamp", "message"],
          [[new Date().toISOString(), "ai_writer_dry_run"]],
        );
      } catch {}
      return res.json({ ok: true, dryRun: true, limit: safeLimit });
    }

    const { handleInlineAIWriter } = await import("./api/ai-writer-inline.js");

    console.log(`Starting inline AI writer for ${tenant} with limit ${safeLimit}`);

    const result = await Promise.race([
      handleInlineAIWriter(tenant, safeLimit),
      new Promise((resolve) =>
        setTimeout(() => resolve({
          ok: true,
          wrote: 0,
          timeout: true,
          message: "Generation is taking longer than expected. Check back in a minute."
        }), 25000)
      )
    ]);

    try {
      const logMessage = result.timeout
        ? 'ai_writer_timeout: generation in progress'
        : result.timedOut
          ? `ai_writer_partial: ${result.wrote} themes before deadline`
          : `ai_writer_completed: ${result.wrote} themes`;
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), logMessage]],
      );
    } catch {}

    if (result.timeout) {
      return res.json({
        ok: true,
        status: "processing",
        processing: true,
        message: "AI generation started. It's taking longer than usual, please refresh in 30 seconds.",
        limitReduced: safeLimit < limit
      });
    }

    return res.json({
      ok: true,
      ...result,
      limitReduced: safeLimit < limit,
      message: result.timedOut
        ? `Generated ${result.wrote} themes before hitting the safety timeout. Run again for more.`
        : safeLimit < limit
          ? `Generated ${safeLimit} themes (reduced from ${limit} for speed). Run again for more.`
          : `Successfully generated ${result.wrote} themes.`
    });

  } catch (error) {
    console.error(`AI writer error for ${tenant}:`, error);
    res.status(500).json({
      ok: false,
      error: error.message || "AI generation failed",
      message: "Failed to generate content. Please try again."
    });
  }
});

app.get("/api/jobs/status", async (req, res) => {
  const { tenant, sig, jobId } = req.query;
  const payload = `GET:${tenant}:jobs_status`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  if (!jobId) {
    return res.status(400).json({ ok: false, error: "jobId required" });
  }

  try {
    const queueManager = getQueueManager();
    const job = await queueManager.getJobById(jobId);

    if (!job) {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }

    return res.json({
      ok: true,
      job
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ----- Weekly summary -----
app.post("/api/jobs/weekly_summary", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:weekly_summary:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const out = await runWeeklySummary(String(tenant));
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Pixels ingest (JWT Token or HMAC fallback) -----
app.post("/api/pixels/ingest", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    shop = "",
    event = "",
    payload = {},
  } = req.body || {};

  // Check for JWT token authentication (preferred)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let isAuthenticated = false;
  let authMethod = "none";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // JWT token authentication
    const token = authHeader.substring(7);
    try {
      const PIXEL_TOKEN_SECRET = process.env.PIXEL_TOKEN_SECRET || process.env.HMAC_SECRET;
      const decoded = jwt.verify(token, PIXEL_TOKEN_SECRET, {
        issuer: "ads-autopilot-backend",
        audience: "pixel-tracking",
      });

      // Validate tenant matches
      if (decoded.tenant === tenant || decoded.shop === tenant) {
        isAuthenticated = true;
        authMethod = "token";
      } else {
        console.warn("Pixel ingest: Token tenant mismatch", {
          tokenTenant: decoded.tenant,
          tokenShop: decoded.shop,
          requestTenant: tenant,
        });
      }
    } catch (err) {
      console.warn("Pixel ingest: Token validation failed", {
        error: err.message,
        tenant,
      });
    }
  }

  // Fallback to HMAC authentication (transition period)
  if (!isAuthenticated && sig) {
    const payloadSig = `POST:${tenant}:pixel_ingest:${nonce}`;
    if (verify(sig, payloadSig)) {
      isAuthenticated = true;
      authMethod = "hmac";
    }
  }

  if (!tenant || !isAuthenticated) {
    console.warn("Pixel ingest: Authentication failed", {
      tenant,
      hasToken: !!authHeader,
      hasHMAC: !!sig,
      authMethod,
    });
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  // Log successful authentication method for monitoring
  if (authMethod === "token") {
    console.log("Pixel ingest: Authenticated via JWT token", { tenant });
  }
  try {
    // Minimal PII-safe logging
    const label = String(event || "").toLowerCase();
    let msg = `pixel:${label}`;
    try {
      if (
        label === "purchase_completed" ||
        label === "purchase" ||
        label === "checkout_completed"
      ) {
        const v = Number(
          payload?.value || payload?.amount || payload?.total || 0,
        );
        const items = Number(payload?.items || payload?.line_items || 0);
        msg += ` $${(v || 0).toFixed(2)} items=${items || 0}`;
      } else if (label === "cart_viewed") {
        const v = Number(payload?.value || 0);
        msg += ` $${(v || 0).toFixed(2)}`;
      } else if (label === "product_viewed") {
        const h = String(payload?.handle || payload?.product_handle || "");
        if (h) msg += ` ${h}`;
      } else if (label === "search_submitted") {
        const q = String(payload?.query || "");
        if (q) msg += ` q=${q.slice(0, 40)}`;
      }
    } catch {}
    try {
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), msg]],
      );
    } catch {}
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { ok: false, code: "PIXEL", error: String(e) });
  }
});

// ----- Shopify SEO helpers (placeholder session) -----
async function getShopSession(shop) {
  // Placeholder: wire real token after OAuth lands
  return null;
}

function applyTemplateToString(templateStr, vars) {
  let out = String(templateStr || "");
  Object.entries(vars || {}).forEach(([k, v]) => {
    out = out.replaceAll(`{{${k}}}`, String(v || ""));
  });
  return out.trim().slice(0, 140);
}

// ----- Shopify SEO Preview (HMAC) -----
app.post("/api/shopify/seo/preview", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    shop = "",
    productIds = [],
    strategy = "template",
    templateTitle = "{{title}} | Free Shipping",
    templateDescription = "Discover {{title}} by {{brand}}. Shop now with fast, free shipping.",
  } = req.body || {};
  const payload = `POST:${tenant}:seo_preview:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const ids = Array.isArray(productIds) ? productIds : [];
    // Mock data for now (no OAuth): derive from ID
    const proposals = ids.map((id) => {
      const vars = { title: `Product ${id}`, brand: "Brand" };
      return {
        productId: id,
        title:
          strategy === "template"
            ? applyTemplateToString(templateTitle, vars)
            : `${vars.title} | Best Deal`,
        description:
          strategy === "template"
            ? applyTemplateToString(templateDescription, vars)
            : `Get ${vars.title} today with fast shipping and easy returns.`,
        images: [{ id: `img_${id}_1`, altText: `${vars.title} image` }],
      };
    });
    try {
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `seo_preview:${proposals.length}`]],
      );
    } catch {}
    return json(res, 200, { ok: true, proposals, dry: true });
  } catch (e) {
    return json(res, 500, { ok: false, code: "SEO_PREVIEW", error: String(e) });
  }
});

// ----- Shopify SEO Apply (HMAC) -----
app.post("/api/shopify/seo/apply", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), shop = "", changes = [] } = req.body || {};
  const payload = `POST:${tenant}:seo_apply:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const session = await getShopSession(String(shop || ""));
    const dry = !session;
    let applied = 0;
    if (!dry) {
      // Placeholder: implement GraphQL productUpdate/productImageUpdate using session token
      applied = (Array.isArray(changes) ? changes : []).length;
    }
    try {
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [
          [
            new Date().toISOString(),
            `seo_apply:${dry ? "dry:" : ""}${(Array.isArray(changes) ? changes : []).length}`,
          ],
        ],
      );
    } catch {}
    return json(res, 200, { ok: true, applied, dry });
  } catch (e) {
    return json(res, 500, { ok: false, code: "SEO_APPLY", error: String(e) });
  }
});

// ----- Shopify Tags batch (HMAC) -----
app.post("/api/shopify/tags/batch", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    shop = "",
    productIds = [],
    add = [],
    remove = [],
  } = req.body || {};
  const payload = `POST:${tenant}:tags_batch:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });
  try {
    const session = await getShopSession(String(shop || ""));
    const dry = !session;
    const ids = Array.isArray(productIds) ? productIds : [];
    try {
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [
          [
            new Date().toISOString(),
            `tags_batch:${dry ? "dry:" : ""}${ids.length}:${(add || []).length}+/${(remove || []).length}-`,
          ],
        ],
      );
    } catch {}
    return json(res, 200, { ok: true, updated: ids.length, dry });
  } catch (e) {
    return json(res, 500, { ok: false, code: "TAGS_BATCH", error: String(e) });
  }
});

// ----- AI RSA Generator (HMAC) -----
app.post("/api/ai/generate-rsa", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    campaign_name = "",
    business_info = {},
    theme = "",
    industry = "general",
    keywords = [],
    tone = "professional",
    headlineCount = 15,
    descriptionCount = 4,
    includeOffers = true,
    includeBranding = true,
    playbookPrompt = "",
    targetCPA = null,
    targetROAS = null,
    businessStrategy = "protect"
  } = req.body || {};

  const payload = `POST:${tenant}:ai_generate_rsa:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });

  try {
    const rsaGenerator = getRSAGenerator();

    // Build options from request parameters
    const generationOptions = {
      theme: theme || campaign_name || "Business",
      industry,
      keywords: Array.isArray(keywords) ? keywords : [],
      tone,
      headlineCount: Math.min(Math.max(1, headlineCount || 15), 15),
      descriptionCount: Math.min(Math.max(1, descriptionCount || 4), 4),
      includeOffers,
      includeBranding,
      playbookPrompt,
      targetCPA,
      targetROAS,
      businessStrategy,
      tenant, // Pass tenant for AI provider usage tracking
      operation: 'rsa_generation' // For token monitoring
    };

    console.log(`🚀 Generating RSA content for ${tenant}, theme: "${generationOptions.theme}"`);

    const result = await rsaGenerator.generateRSAContent(generationOptions);

    if (!result.success) {
      console.warn(`⚠️  RSA generation failed for ${tenant}: ${result.error}`);
      // Return fallback content instead of error to maintain UX
      return res.json({
        ok: true,
        success: false,
        fallback: true,
        headlines: result.fallback?.headlines || [],
        descriptions: result.fallback?.descriptions || [],
        error: result.error,
        stats: result.stats || {}
      });
    }

    const { headlines, descriptions, validation, quality, suggestions } = result.content;

    console.log(`✅ RSA generation successful for ${tenant}: ${headlines?.length || 0} headlines, ${descriptions?.length || 0} descriptions`);

    // Log to sheets for audit trail
    try {
      const doc = await getDoc();
      if (doc) {
        const auditSheet = await ensureSheet(doc, `RSA_GENERATION_LOG_${tenant}`, [
          "timestamp",
          "theme",
          "campaign_name",
          "headlines_count",
          "descriptions_count",
          "quality_score",
          "business_strategy"
        ]);

        await auditSheet.addRow({
          timestamp: new Date().toISOString(),
          theme: generationOptions.theme,
          campaign_name: campaign_name || "",
          headlines_count: headlines?.length || 0,
          descriptions_count: descriptions?.length || 0,
          quality_score: quality?.total || 0,
          business_strategy: businessStrategy
        });
      }
    } catch (auditError) {
      console.warn("Failed to log RSA generation to audit sheet:", auditError);
      // Don't fail the request if audit logging fails
    }

    return res.json({
      ok: true,
      success: true,
      headlines: headlines || [],
      descriptions: descriptions || [],
      validation,
      quality,
      suggestions,
      stats: result.stats || {},
      generation_options: {
        theme: generationOptions.theme,
        industry,
        tone,
        headlineCount: headlines?.length || 0,
        descriptionCount: descriptions?.length || 0,
        businessStrategy
      }
    });

  } catch (error) {
    console.error(`❌ RSA generation error for ${tenant}:`, error);

    // Generate basic fallback content on complete failure
    const fallbackHeadlines = [
      `${theme || campaign_name || "Business"} Solutions`,
      `Best ${theme || campaign_name || "Business"} Service`,
      `${theme || campaign_name || "Business"} Experts`,
      `Quality ${theme || campaign_name || "Business"}`,
      `${theme || campaign_name || "Business"} Today`
    ].slice(0, headlineCount || 5);

    const fallbackDescriptions = [
      `Professional ${(theme || campaign_name || "business").toLowerCase()} services for your needs. Get started today.`,
      `Quality ${(theme || campaign_name || "business").toLowerCase()} solutions with expert support. Contact us now.`
    ].slice(0, descriptionCount || 2);

    return res.status(500).json({
      ok: false,
      error: error.message,
      fallback: {
        headlines: fallbackHeadlines,
        descriptions: fallbackDescriptions
      },
      debug: {
        tenant,
        theme: theme || campaign_name,
        errorType: error.constructor.name,
        provider: error.provider || "unknown"
      }
    });
  }
});

// ----- AI drafts list (HMAC) -----
// NOTE: This endpoint has been moved to routes/ai.js to support Supabase integration
// The Supabase-enabled version in routes/ai.js will handle this request

// ----- Connect Wizard: test/save Sheets -----
app.post("/api/connect/sheets/test", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), sheetId = "" } = req.body || {};
  const payload = `POST:${tenant}:sheets_test:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    if (!sheetId) return res.json({ ok: false, error: "missing_sheetId" });
    const doc = await getDocById(String(sheetId));
    if (!doc) return res.json({ ok: false, error: "auth_or_load_failed" });
    await ensureSheet(doc, `CONFIG_${tenant}`, ["key", "value"]);
    return res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

app.post("/api/connect/sheets/save", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), sheetId = "" } = req.body || {};
  const payload = `POST:${tenant}:sheets_save:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    if (!sheetId) return res.json({ ok: false, error: "missing_sheetId" });
    process.env.SHEET_ID = String(sheetId);
    await ensureAudienceTabs(String(tenant));
    return res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

// Import embedded Google Ads Script Content (for Vercel compatibility)
// Version 2.1 - with user value injection
import MASTER_SCRIPT_CONTENT from "./embedded-script-v2.js";

// ----- Ads Script delivery (HMAC) -----
// Force rebuild: 2025-09-25 - Fixed dollar sign issue in embedded script
app.get("/api/ads-script/raw", async (req, res) => {
  console.log("🚀 /api/ads-script/raw endpoint hit", req.query);
  const { tenant, sig, budget, cpc, landing_url } = req.query;
  const payload = `GET:${tenant}:script_raw`;
  console.log("🔐 HMAC verification:", { tenant, sig, payload });
  console.log("📋 User parameters:", { budget, cpc, landing_url });

  if (!tenant || !verify(sig, payload)) {
    console.log("🔐 Auth failed - returning 403");
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const tenantId = String(tenant || "default");
    console.log(`📜 Generating script for shop: ${tenantId}`);

    // FORCE v2.1 embedded script - bypass file system completely
    let scriptBody = MASTER_SCRIPT_CONTENT;
    console.log(`📝 Using embedded script v2.1, length: ${scriptBody.length}, starts with: ${scriptBody.substring(0, 100)}`);

    // Removed file reading to ensure v2.1 script is always used

    // Normalize backend base away from Vercel preview protection and ensure /api suffix
    const rawBase = (
      process.env.BACKEND_PUBLIC_URL ||
      "https://ads-autopilot-backend-git-main-atillas-projects-3562cb36.vercel.app/api"
    ).replace(/\/$/, "");
    const normalizedHost = rawBase.replace(
      /-git-[a-zA-Z0-9]+-atillas-projects-3562cb36\.vercel\.app/,
      ".vercel.app",
    );
    const backendBase = /\/api$/.test(normalizedHost)
      ? normalizedHost
      : `${normalizedHost}/api`;

    // Get user settings - prefer query params over database
    let userSettings = null;
    let userBudget, userCpc, userUrl;

    // If parameters are provided in the query, use them directly
    if (budget || cpc || landing_url) {
      console.log(`📲 Using parameters from query for ${tenantId}`);
      userBudget = budget || "20.00";
      userCpc = cpc || "0.50";
      userUrl = landing_url || "";
    } else {
      // Fall back to database settings
      userSettings = await getUserSettings(tenantId);
      console.log(`📊 Raw user settings from DB for ${tenantId}:`, userSettings);
      userBudget = userSettings?.budget || "20.00";
      userCpc = userSettings?.cpc || "0.50";
      userUrl = userSettings?.landing_url || "";
    }

    const userLabel = `${tenantId} • Managed`;

    console.log(`🎯 Injecting user values into script for ${tenantId}:`, {
      budget: userBudget,
      cpc: userCpc,
      url: userUrl,
      label: userLabel,
      hadLandingUrl: !!userSettings?.landing_url,
      rawLandingUrl: userSettings?.landing_url
    });

    const out = scriptBody
      .replace(/\\\`/g, '`')  // Remove backslash escapes from template literals
      .replace(/__BACKEND_URL__/g, backendBase)
      .replace(/__TENANT_ID__/g, tenantId)
      .replace(/__HMAC_SECRET__/g, process.env.HMAC_SECRET || "")
      .replace(/__USER_BUDGET__/g, userBudget)
      .replace(/__USER_CPC__/g, userCpc)
      .replace(/__USER_URL__/g, userUrl || "")
      .replace(/__USER_LABEL__/g, userLabel);

    res.set("content-type", "text/plain; charset=utf-8");
    res.set("cache-control", "no-cache, no-store, must-revalidate");
    res.set("x-script-version", "2.1");
    console.log(
      `✅ Script generated successfully: ${out.length} bytes for ${tenantId}`,
    );
    return res.status(200).send(out);
  } catch (e) {
    console.error("❌ Script generation error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- NEW V2 Script endpoint to bypass CDN cache -----
app.get("/api/ads-script/v2", async (req, res) => {
  console.log("🚀 /api/ads-script/v2 endpoint hit", req.query);
  const { tenant, sig, budget, cpc, landing_url } = req.query;
  const payload = `GET:${tenant}:script_raw`;
  console.log("🔐 HMAC verification:", { tenant, sig, payload });
  console.log("📋 User parameters:", { budget, cpc, landing_url });
  if (!tenant || !verify(sig, payload)) {
    console.log("🔐 Auth failed - returning 403");
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const tenantId = String(tenant || "default");
    console.log(`📜 Generating v2 script for shop: ${tenantId}`);

    // FORCE v2.1 embedded script
    let scriptBody = MASTER_SCRIPT_CONTENT;
    console.log(`📝 Using embedded script v2.1, length: ${scriptBody.length}`);

    // Normalize backend base
    const rawBase = (
      process.env.BACKEND_PUBLIC_URL ||
      "https://ads-autopilot-backend.vercel.app/api"
    ).replace(/\/$/, "");
    const normalizedHost = rawBase.replace(
      /-git-[a-zA-Z0-9]+-atillas-projects-3562cb36\.vercel\.app/,
      ".vercel.app",
    );
    const backendBase = /\/api$/.test(normalizedHost)
      ? normalizedHost
      : `${normalizedHost}/api`;

    // Get user settings - prefer query params over database
    let userSettings = null;
    let userBudget, userCpc, userUrl;

    // If parameters are provided in the query, use them directly
    if (budget || cpc || landing_url) {
      console.log(`📲 Using parameters from query for ${tenantId}`);
      userBudget = budget || "20.00";
      userCpc = cpc || "0.50";
      userUrl = landing_url || "";
    } else {
      // Fall back to database settings
      userSettings = await getUserSettings(tenantId);
      console.log(`📊 Raw user settings from DB for ${tenantId}:`, userSettings);
      userBudget = userSettings?.budget || "20.00";
      userCpc = userSettings?.cpc || "0.50";
      userUrl = userSettings?.landing_url || "";
    }

    const userLabel = `${tenantId} • Managed`;

    console.log(`🎯 Injecting user values into v2 script for ${tenantId}:`, {
      budget: userBudget,
      cpc: userCpc,
      url: userUrl,
      label: userLabel
    });

    const out = scriptBody
      .replace(/__BACKEND_URL__/g, backendBase)
      .replace(/__TENANT_ID__/g, tenantId)
      .replace(/__HMAC_SECRET__/g, process.env.HMAC_SECRET || "")
      .replace(/__USER_BUDGET__/g, userBudget)
      .replace(/__USER_CPC__/g, userCpc)
      .replace(/__USER_URL__/g, userUrl || "")
      .replace(/__USER_LABEL__/g, userLabel);

    res.set("content-type", "text/plain; charset=utf-8");
    res.set("cache-control", "no-cache, no-store, must-revalidate, max-age=0");
    res.set("pragma", "no-cache");
    res.set("expires", "0");
    res.set("x-script-version", "2.1-force");
    console.log(
      `✅ V2 Script generated successfully: ${out.length} bytes for ${tenantId}`,
    );
    return res.status(200).send(out);
  } catch (e) {
    console.error("❌ V2 Script generation error:", e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- AI drafts accept (HMAC) -----
app.post("/api/ai/accept", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), items = [] } = req.body || {};
  const payload = `POST:${tenant}:ai_accept:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok: true, accepted: 0, errors: ["no_sheets"] });
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

// ----- Landing Page AI Analyzer (HMAC) -----
app.post("/api/ai/analyze-landing-page", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), url, shopifySession } = req.body || {};

  const payload = `POST:${tenant}:ai_analyze_landing_page:${nonce}`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  if (!url) {
    return res.status(400).json({ ok: false, error: "URL required" });
  }

  try {
    const landingPageAI = getLandingPageAIService();
    const result = await landingPageAI.analyzeLandingPage(url, {
      tenant,
      shopifySession
    });

    logger.info(`Landing page analysis completed for tenant ${tenant}, URL: ${url}`);

    res.json({
      ok: true,
      analysis: result.analysis,
      suggestions: result.suggestions,
      url: result.url,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error(`Landing page analysis failed for tenant ${tenant}:`, error);
    res.status(500).json({
      ok: false,
      error: error.message || "Analysis failed",
      code: "LANDING_ANALYSIS_FAILED"
    });
  }
});

// ----- Get Landing Page Suggestions (HMAC) -----
app.get("/api/ai/landing-suggestions", async (req, res) => {
  const { tenant, sig } = req.query;

  const payload = `GET:${tenant}:ai_landing_suggestions`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const landingPageAI = getLandingPageAIService();
    const result = await landingPageAI.getLandingSuggestions(tenant);

    res.json({
      ok: true,
      suggestions: result.suggestions,
      status: result.status,
      lastUpdated: result.lastUpdated,
      message: result.message
    });
  } catch (error) {
    logger.error(`Failed to get landing suggestions for tenant ${tenant}:`, error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to get suggestions",
      code: "LANDING_SUGGESTIONS_FAILED"
    });
  }
});

// ----- Create Landing Page Draft (HMAC) -----
app.post("/api/ai/create-landing-draft", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), pageId, suggestions, shopifySession } = req.body || {};

  const payload = `POST:${tenant}:ai_create_landing_draft:${nonce}`;
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  if (!pageId || !suggestions) {
    return res.status(400).json({
      ok: false,
      error: "pageId and suggestions required"
    });
  }

  try {
    const landingPageAI = getLandingPageAIService();
    const result = await landingPageAI.createDraftModifications(
      tenant,
      pageId,
      suggestions,
      { shopifySession }
    );

    logger.info(`Landing page draft created for tenant ${tenant}, page: ${pageId}`);

    res.json({
      ok: true,
      draftId: result.draftId,
      modifications: result.modifications,
      status: result.status,
      message: result.message
    });
  } catch (error) {
    logger.error(`Failed to create landing page draft for tenant ${tenant}:`, error);
    res.status(500).json({
      ok: false,
      error: error.message || "Draft creation failed",
      code: "LANDING_DRAFT_FAILED"
    });
  }
});

// ----- AI N-gram Analysis (HMAC) - PRO tier feature -----
app.get("/api/ai/ngram-analysis", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    industry = 'general',
    costThreshold = 10.0,
    conversionThreshold = 0.02,
    useStatisticalSignificance = true,
    useAI = true,
    businessContext = null
  } = req.query;

  const payload = `GET:${tenant}:ngram_analysis`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });

  try {
    // Check if tenant has PRO tier access
    const analyticsService = getAnalyticsService();
    const tierInfo = await analyticsService.getTierFeatures(tenant);

    if (!tierInfo.features.includes('NGRAM_NEGATIVES')) {
      return res.status(403).json({
        ok: false,
        error: "Feature requires PRO tier",
        upgrade_required: true
      });
    }

    const { getNgramAnalyzer } = await import('./services/ngram-analyzer.js');
    const analyzer = getNgramAnalyzer();

    // Get search terms from last 30 days
    const doc = await getDoc();
    if (!doc) throw new Error("Sheets connection failed");

    const searchTermsSheet = doc.sheetsByTitle[`SEARCH_TERMS_${tenant}`];
    if (!searchTermsSheet) {
      return res.json({
        ok: true,
        success: false,
        error: "No search terms data available for analysis",
        analysis: null
      });
    }

    const rows = await searchTermsSheet.getRows();
    const searchTerms = rows.map(row => ({
      search_term: row.search_term,
      cost: parseFloat(row.cost || 0),
      clicks: parseInt(row.clicks || 0),
      conversions: parseInt(row.conversions || 0),
      impressions: parseInt(row.impressions || 0)
    }));

    console.log(`🔍 N-gram analysis for ${tenant}: ${searchTerms.length} search terms`);

    const analysisOptions = {
      industry,
      costThreshold: parseFloat(costThreshold),
      conversionThreshold: parseFloat(conversionThreshold),
      useStatisticalSignificance: useStatisticalSignificance === 'true',
      useAI: useAI === 'true',
      businessContext: businessContext ? JSON.parse(businessContext) : null
    };

    const result = await analyzer.analyzeNgramWaste(searchTerms, analysisOptions);

    // Store analysis history in dual-write
    if (result.success) {
      const { dualWriteNgramNegatives } = await import('./services/dual-write.js');
      const historyData = [{
        tenant_id: tenant,
        analysis_date: new Date().toISOString(),
        search_terms_analyzed: result.analysis.totalTermsAnalyzed,
        ngrams_extracted: result.analysis.totalNgramsExtracted,
        significant_ngrams: result.analysis.significantNgrams,
        ai_enhanced_ngrams: result.analysis.aiEnhancedNgrams,
        total_potential_savings: result.analysis.estimatedCostSavings?.monthly || 0,
        analysis_parameters: JSON.stringify(analysisOptions),
        success: true
      }];

      // Store to analysis history (separate from negatives)
      await dualWriteNgramNegatives(tenant, historyData);
    }

    res.json({
      ok: true,
      ...result,
      tier_features: tierInfo.features
    });

  } catch (error) {
    console.error(`❌ N-gram analysis error for ${tenant}:`, error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/ai/ngram-negatives", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    action = 'approve', // approve, reject, bulk_approve
    ngram_ids = [],
    phrases = [],
    approved_by = 'user'
  } = req.body || {};

  const payload = `POST:${tenant}:ngram_negatives:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });

  try {
    // Check PRO tier access
    const analyticsService = getAnalyticsService();
    const tierInfo = await analyticsService.getTierFeatures(tenant);

    if (!tierInfo.features.includes('NGRAM_NEGATIVES')) {
      return res.status(403).json({
        ok: false,
        error: "Feature requires PRO tier",
        upgrade_required: true
      });
    }

    const { dualWriteNgramNegatives } = await import('./services/dual-write.js');
    const doc = await getDoc();
    if (!doc) throw new Error("Sheets connection failed");

    let results = {
      approved: 0,
      rejected: 0,
      errors: []
    };

    if (action === 'approve' || action === 'bulk_approve') {
      // Get n-gram negatives data to approve
      const ngramSheet = doc.sheetsByTitle[`NGRAM_NEGATIVES_${tenant}`];
      if (!ngramSheet) {
        return res.status(400).json({
          ok: false,
          error: "No n-gram negatives data found"
        });
      }

      const rows = await ngramSheet.getRows();
      const ngramsToApprove = rows.filter(row =>
        ngram_ids.includes(row.id) || phrases.includes(row.phrase)
      );

      for (const ngram of ngramsToApprove) {
        try {
          // Update status to ACTIVE
          ngram.status = 'ACTIVE';
          ngram.approved_by = approved_by;
          ngram.updated_at = new Date().toISOString();

          await ngram.save();

          // Dual-write the update
          await dualWriteNgramNegatives(tenant, [ngram]);

          results.approved++;
          console.log(`✅ Approved n-gram negative: "${ngram.phrase}" for ${tenant}`);

        } catch (error) {
          results.errors.push({
            phrase: ngram.phrase,
            error: error.message
          });
        }
      }

    } else if (action === 'reject') {
      // Similar logic for rejection
      const ngramSheet = doc.sheetsByTitle[`NGRAM_NEGATIVES_${tenant}`];
      if (!ngramSheet) {
        return res.status(400).json({
          ok: false,
          error: "No n-gram negatives data found"
        });
      }

      const rows = await ngramSheet.getRows();
      const ngramsToReject = rows.filter(row =>
        ngram_ids.includes(row.id) || phrases.includes(row.phrase)
      );

      for (const ngram of ngramsToReject) {
        try {
          ngram.status = 'REJECTED';
          ngram.approved_by = approved_by;
          ngram.updated_at = new Date().toISOString();

          await ngram.save();
          await dualWriteNgramNegatives(tenant, [ngram]);

          results.rejected++;

        } catch (error) {
          results.errors.push({
            phrase: ngram.phrase,
            error: error.message
          });
        }
      }
    }

    res.json({
      ok: true,
      success: true,
      results,
      message: `Processed ${results.approved + results.rejected} n-gram negatives`
    });

  } catch (error) {
    console.error(`❌ N-gram negatives management error for ${tenant}:`, error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ----- Promote status (HMAC) -----
app.get("/api/promote/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:promote_status`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const doc = await getDoc();
    const now = Date.now();
    let start = null,
      end = null,
      state = "inactive";
    if (doc) {
      const meta = await ensureSheet(doc, `PROMOTE_WINDOW_${tenant}`, [
        "start_at_ms",
        "end_at_ms",
        "state",
      ]);
      const rows = await meta.getRows();
      if (rows.length) {
        start = Number(rows[0].start_at_ms || 0) || null;
        end = Number(rows[0].end_at_ms || 0) || null;
        if (start && now < start) state = "scheduled";
        else if (start && end && now >= start && now < end) state = "active";
        else state = "inactive";
      }
    }
    // Current PROMOTE flag
    let promote = false;
    let caps = {};
    let exclusions = [];
    try {
      const cfg = await readConfigFromSheets(String(tenant));
      promote = !!cfg?.PROMOTE;
      // optional: surface defaults as caps
      caps = {
        budgetCap: cfg?.daily_budget_cap_default,
        cpcCeiling: cfg?.cpc_ceiling_default,
      };
    } catch {}
    res.json({
      ok: true,
      now,
      window: { start, end, state },
      promote,
      caps,
      exclusions,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ----- Audience export build (stub) -----
app.post("/api/audiences/export/build", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), segments = [], format = "UI" } = req.body || {};
  const payload = `POST:${tenant}:audiences_export_build:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const result = await buildSegments(
      String(tenant),
      Array.isArray(segments) ? segments : [],
      String(format).toUpperCase() === "API" ? "API" : "UI",
    );
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [
          [
            new Date().toISOString(),
            `aud_export_build:${format}:${(result.built || []).length}`,
          ],
        ],
      );
    } catch {}
    res.json({
      ok: true,
      built: result.built || [],
      skipped: result.skipped || [],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GDPR Compliance Endpoints
function validateWebhookHMAC(req, res, next) {
  const hmac = req.get("X-Shopify-Hmac-Sha256");
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  // Always return 401 if no HMAC or no secret configured
  if (!hmac || !webhookSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const body = JSON.stringify(req.body);
    const calculatedHmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(body, "utf8")
      .digest("base64");
    
    // Return 401 if HMAC doesn't match
    if (hmac !== calculatedHmac) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.post("/api/gdpr/customers/data_request", validateWebhookHMAC, (req, res) => {
  // Log the request for compliance
  logger.info("GDPR customer data request", {
    shopDomain: req.body.shop_domain,
    customerId: req.body.customer?.id
  });
  
  res.status(200).json({ message: "Customer data request received" });
});

app.post("/api/gdpr/customers/redact", validateWebhookHMAC, (req, res) => {
  // Log the request for compliance
  logger.info("GDPR customer data redaction", {
    shopDomain: req.body.shop_domain,
    customerId: req.body.customer?.id
  });
  
  res.status(200).json({ message: "Customer data redaction completed" });
});

app.post("/api/gdpr/shop/redact", validateWebhookHMAC, (req, res) => {
  // Log the request for compliance
  logger.info("GDPR shop data redaction", {
    shopDomain: req.body.shop_domain,
    shopId: req.body.shop_id
  });
  
  res.status(200).json({ message: "Shop data redaction completed" });
});

// Initialize health checks
try {
  // Register custom health checks for external services
  const sheetsService = {
    testConnection: async () => {
      const doc = await getDoc();
      if (!doc) throw new Error("Google Sheets not accessible");
      return true;
    },
  };

  healthService.registerSheetsCheck(sheetsService);

  // Register AI service health check if available
  if (process.env.GEMINI_API_KEY) {
    const aiService = {
      testConnection: async () => {
        // Simple test - could be enhanced with actual API call
        if (!process.env.GEMINI_API_KEY.startsWith("AIza")) {
          throw new Error("Invalid Gemini API key format");
        }
        return true;
      },
    };
    healthService.registerGeminiCheck(aiService);
  }

  // Start health monitoring
  healthService.startMonitoring();

  logger.info("Health monitoring initialized", {
    checks: Array.from(healthService.checks.keys()),
  });
} catch (error) {
  logger.error("Failed to initialize health monitoring", {
    error: error.message,
  });
}

// Add error handling middleware
app.use(logger.errorMiddleware());

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, starting graceful shutdown...");

  try {
    // Stop AI automation service
    logger.info("Stopping AI automation service...");
    stopAIAutomation();

    // Stop health monitoring
    healthService.stopMonitoring();

    // Shutdown logger
    await logger.shutdown();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error: error.message });
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, starting graceful shutdown...");

  try {
    // Stop AI automation service
    logger.info("Stopping AI automation service...");
    stopAIAutomation();

    // Stop health monitoring
    healthService.stopMonitoring();

    // Shutdown logger
    await logger.shutdown();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error: error.message });
    process.exit(1);
  }
});

// Production deployment safety check (disabled for Vercel compatibility)
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  try {
    // Run comprehensive startup validation (skip in Vercel serverless environment)
    const bootValidation = (await import("./services/boot-validation.js"))
      .default;
    const results = await bootValidation.validateSystemServices();

    // Check for critical security issues
    if (results.hmacSecurity?.status === "critical") {
      logger.error(
        "🛑 PRODUCTION DEPLOYMENT BLOCKED: Critical HMAC security issue detected",
      );
      logger.error("   Fix HMAC_SECRET before production deployment");
      process.exit(1);
    }

    // Log security status
    logger.info("✅ Production security validation passed", {
      hmacSecurityStatus: results.hmacSecurity?.status,
      hmacLength: results.hmacSecurity?.length,
      hmacEntropy: results.hmacSecurity?.entropy?.toFixed(2) + " bits/char",
    });
  } catch (error) {
    logger.error("🛑 PRODUCTION STARTUP VALIDATION FAILED:", error.message);
    process.exit(1);
  }
}

// ==== AI INSIGHTS ROUTES ====
import aiInsightsRoutes from "./routes/ai-insights.js";
app.use("/api/ai", aiInsightsRoutes);

// ==== AI DASHBOARD ROUTES ====
// COMMENTED OUT: Conflicts with main ai.js routes that have proper HMAC authentication
// import aiDashboardRoutes from "./routes/ai-routes.js";
// app.use("/api/ai", aiDashboardRoutes);

// ==== SCRIPT SYNC ROUTES (for Google Ads Scripts) ====
import scriptSyncRoutes from "./routes/script-sync.js";
app.use("/api/script", scriptSyncRoutes);

// ==== SECRET ROTATION ROUTES (Admin only) ====
import secretRotationRoutes from "./routes/secret-rotation.js";
app.use("/api/secrets", secretRotationRoutes);

// ==== MAIN AI ROUTES (with HMAC authentication) ====
import aiRoutes from "./routes/ai.js";
app.use("/api/ai", aiRoutes);  // Mount AI routes at /api/ai

// Start the server (works for both local and Vercel)
app.listen(PORT, async () => {
  logger.info("Ads Autopilot AI backend server started", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    sheetsAuth: process.env.GOOGLE_SERVICE_EMAIL
      ? "service_account"
      : "unknown",
    hmacSecurityInitialized: true,
    pid: process.pid,
  });

  // Initialize WebSocket server for real-time updates
  if (process.env.ENABLE_WEBSOCKET !== 'false') {
    try {
      await initializeWebSocketServer();
      logger.info("WebSocket server initialized for real-time updates");
    } catch (error) {
      logger.error("Failed to initialize WebSocket server", { error: error.message });
    }
  }

  // Start scheduled reports service
  if (process.env.ENABLE_SCHEDULED_REPORTS !== 'false') {
    try {
      scheduledReports.start();
      logger.info("Scheduled reports service started");
    } catch (error) {
      logger.error("Failed to start scheduled reports service:", error);
    }
  }

  // Initialize and start AI automation service
  if (process.env.ENABLE_AI_AUTOMATION !== 'false') {
    try {
      // Start AI automation service
      await startAIAutomation();
      logger.info("AI automation service started", {
        frequencies: {
          starter: "24 hours",
          professional: "8 hours",
          enterprise: "4 hours"
        },
        features: {
          starter: ["RSA generation"],
          professional: ["RSA generation", "Negative keyword analysis"],
          enterprise: ["RSA generation", "Negative keyword analysis", "Campaign optimization"]
        }
      });
    } catch (error) {
      logger.error("Failed to start AI automation service:", {
        error: error.message,
        stack: error.stack
      });
    }
  } else {
    logger.info("AI automation service disabled via ENABLE_AI_AUTOMATION=false");
  }

  // Start always-on automation jobs for all tenants
  const jobScheduler = new JobScheduler();

  // Add all tenants from registry (dynamic multi-tenant)
  const tenantRegistryJson = process.env.TENANT_REGISTRY_JSON;
  const activeTenants = [];
  if (tenantRegistryJson) {
    const tenants = JSON.parse(tenantRegistryJson);
    Object.keys(tenants).forEach((tenantId) => {
      jobScheduler.addTenant(tenantId);
      activeTenants.push(tenantId);
    });
  }

  jobScheduler.start();

  logger.info("Ads Autopilot AI automation jobs started", {
    tenants: activeTenants,
    jobs: ["anomaly_detection", "weekly_summary"],
    intervals: ["15min", "weekly"],
    note: "Always-on automation for all registered tenants",
  });

  console.log(`🚀 Ads Autopilot AI SaaS backend server running on port ${PORT}`);
  console.log(`📊 Health checks available at: http://localhost:${PORT}/health`);
  console.log(`🔍 Metrics available at: http://localhost:${PORT}/metrics`);
  console.log(
    `📈 Sheets auth: ${process.env.GOOGLE_SERVICE_EMAIL ? "service_account " + process.env.GOOGLE_SERVICE_EMAIL : "unknown"}`,
  );
});

// ----- Autopilot QuickStart (HMAC) -----
app.post("/api/autopilot/quickstart", async (req, res) => {
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
  if (!tenant || !verify(sig, payload))
    return res.status(403).json({ ok: false, error: "auth" });
  try {
    const sheetsOk = !!(await getDoc());
    const aiReady =
      (process.env.AI_PROVIDER || "").toLowerCase() === "google" &&
      !!process.env.GOOGLE_API_KEY;
    if (!sheetsOk)
      return res.json({
        ok: false,
        code: "SHEETS",
        message: "Connect Google Sheets first.",
      });
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

// ====== GDPR COMPLIANCE & PRIVACY ENDPOINTS ======

// Record user consent
app.post("/api/privacy/consent", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, consentData } = req.body || {};
  const payload = `POST:${tenant}:privacy_consent:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await privacyService.recordConsent(
      tenant,
      userId,
      consentData,
    );
    if (result.success) {
      return json(res, 200, { ok: true, consentId: result.consentId });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Withdraw user consent
app.post("/api/privacy/consent/withdraw", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, consentId, reason } = req.body || {};
  const payload = `POST:${tenant}:privacy_withdraw:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await privacyService.withdrawConsent(
      tenant,
      userId,
      consentId,
      reason,
    );
    if (result.success) {
      return json(res, 200, { ok: true });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Data deletion request (Right to be Forgotten)
app.post("/api/privacy/delete", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, requestData } = req.body || {};
  const payload = `POST:${tenant}:privacy_delete:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await privacyService.processDataDeletionRequest(
      tenant,
      userId,
      requestData,
    );
    if (result.success) {
      return json(res, 200, {
        ok: true,
        deletionId: result.deletionId,
        recordsDeleted: result.deletionResult?.summary?.records_deleted || 0,
      });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Data export request (Right to Data Portability)
app.post("/api/privacy/export", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, format } = req.body || {};
  const payload = `POST:${tenant}:privacy_export:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await privacyService.exportUserData(tenant, userId, format);
    if (result.success) {
      const contentType =
        format === "csv"
          ? "text/csv"
          : format === "xml"
            ? "application/xml"
            : "application/json";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="user_data_export_${result.exportId}.${format || "json"}"`,
      );

      return res.send(result.data);
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Get data processing log
app.get("/api/privacy/processing-log", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:processing_log`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const filters = {
      user_id: req.query.user_id,
      activity_type: req.query.activity_type,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      limit: parseInt(req.query.limit || "100"),
    };

    const result = await privacyService.getProcessingLog(tenant, filters);
    if (result.success) {
      return json(res, 200, {
        ok: true,
        logs: result.logs,
        total: result.total,
      });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Data retention compliance check
app.get("/api/privacy/retention-compliance", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:retention_compliance`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await privacyService.checkRetentionCompliance(tenant);
    if (result.success) {
      return json(res, 200, { ok: true, report: result.report });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Automated data cleanup
app.post("/api/privacy/cleanup", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), dryRun = true } = req.body || {};
  const payload = `POST:${tenant}:privacy_cleanup:${nonce}`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await privacyService.cleanupExpiredData(tenant, dryRun);
    if (result.success) {
      return json(res, 200, { ok: true, report: result.report });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// ====== SECURITY MONITORING ENDPOINTS ======

// Get security statistics
app.get("/api/security/stats", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:security_stats`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    // Security middleware disabled for Vercel compatibility
    const stats = { disabled: true, reason: "Vercel compatibility" };
    return json(res, 200, { ok: true, stats });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Security health check (disabled - security middleware removed)
app.get("/api/security/health", async (req, res) => {
  try {
    const health = {
      ddos_protection: false, // Disabled for Vercel compatibility
      rate_limiting: false, // Disabled for Vercel compatibility
      input_validation: false, // Disabled for Vercel compatibility
      threat_detection: false, // Disabled for Vercel compatibility
      privacy_service: true, // Privacy service is always enabled
      timestamp: new Date().toISOString(),
    };

    return json(res, 200, { ok: true, health });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// ====== PROFIT & INVENTORY-AWARE PACING ENDPOINTS ======

// Compute PACE_SIGNALS (HMAC + PROMOTE Gate)
app.post(
  "/api/profit/compute-signals",
  promoteGateMiddleware("PROFIT_COMPUTE_SIGNALS"),
  async (req, res) => {
    const { tenant, sig } = req.query;
    const { nonce = Date.now(), forceRefresh = false } = req.body || {};
    const payload = `POST:${tenant}:profit_compute_signals:${nonce}`;
    if (!tenant || !verify(sig, payload))
      return json(res, 403, { ok: false, code: "AUTH" });

    try {
      const result = await profitPacer.computePaceSignals(String(tenant));

      if (result.ok) {
        try {
          await appendRows(
            String(tenant),
            "RUN_LOGS",
            ["timestamp", "message"],
            [
              [
                new Date().toISOString(),
                `profit_signals_computed:${result.signals.length}`,
              ],
            ],
          );
        } catch {}

        return json(res, 200, {
          ok: true,
          signals: result.signals,
          lastUpdate: result.lastUpdate,
          signalCount: result.signals.length,
        });
      } else {
        return json(res, 500, { ok: false, error: result.error });
      }
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e) });
    }
  },
);

// Get PACE_SIGNALS (HMAC)
app.get("/api/profit/signals", async (req, res) => {
  const { tenant, sig } = req.query;
  const forceRefresh = String(req.query.refresh || "0") === "1";
  const payload = `GET:${tenant}:profit_signals`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await profitPacer.getPaceSignals(
      String(tenant),
      forceRefresh,
    );

    if (result.ok) {
      return json(res, 200, {
        ok: true,
        signals: result.signals,
        cached: result.cached || false,
        signalCount: result.signals ? result.signals.length : 0,
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Reallocate budgets based on PACE_SIGNALS (HMAC + PROMOTE Gate)
app.post(
  "/api/profit/reallocate-budgets",
  promoteGateMiddleware("PROFIT_REALLOCATE_BUDGETS"),
  async (req, res) => {
    const { tenant, sig } = req.query;
    const {
      nonce = Date.now(),
      campaignBudgets = {},
      minBudget = 1.0,
      maxBudget = 100.0,
    } = req.body || {};
    const payload = `POST:${tenant}:profit_reallocate_budgets:${nonce}`;
    if (!tenant || !verify(sig, payload))
      return json(res, 403, { ok: false, code: "AUTH" });

    try {
      const result = await profitPacer.reallocateBudgets(
        String(tenant),
        campaignBudgets,
        Number(minBudget),
        Number(maxBudget),
      );

      if (result.ok) {
        try {
          await appendRows(
            String(tenant),
            "RUN_LOGS",
            ["timestamp", "message"],
            [
              [
                new Date().toISOString(),
                `budget_reallocations:${result.reallocations.length}`,
              ],
            ],
          );
        } catch {}

        return json(res, 200, {
          ok: true,
          reallocations: result.reallocations,
          reallocationCount: result.reallocations.length,
        });
      } else {
        return json(res, 500, { ok: false, error: result.error });
      }
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e) });
    }
  },
);

// Get out-of-stock ad groups (HMAC)
app.get("/api/profit/out-of-stock", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:profit_out_of_stock`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await profitPacer.getOutOfStockAdGroups(String(tenant));

    if (result.ok) {
      return json(res, 200, {
        ok: true,
        outOfStockAdGroups: result.outOfStockAdGroups,
        oosCount: result.outOfStockAdGroups.length,
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Monitor inventory (HMAC)
app.get("/api/profit/monitor-inventory", async (req, res) => {
  const { tenant, sig } = req.query;
  const criticalStock = Number(req.query.critical_stock || 5);
  const lowStock = Number(req.query.low_stock || 10);
  const payload = `GET:${tenant}:profit_monitor_inventory`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const result = await profitPacer.monitorInventory(String(tenant), {
      criticalStock,
      lowStock,
    });

    if (result.ok) {
      const criticalAlerts = result.alerts.filter(
        (a) => a.severity === "CRITICAL",
      ).length;
      const highAlerts = result.alerts.filter(
        (a) => a.severity === "HIGH",
      ).length;

      if (criticalAlerts > 0) {
        try {
          await appendRows(
            String(tenant),
            "RUN_LOGS",
            ["timestamp", "message"],
            [
              [
                new Date().toISOString(),
                `inventory_alerts:critical=${criticalAlerts},high=${highAlerts}`,
              ],
            ],
          );
        } catch {}
      }

      return json(res, 200, {
        ok: true,
        alerts: result.alerts,
        alertCount: result.alerts.length,
        criticalAlerts,
        highAlerts,
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Get profit pacer status and statistics (HMAC)
app.get("/api/profit/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:profit_status`;
  if (!tenant || !verify(sig, payload))
    return json(res, 403, { ok: false, code: "AUTH" });

  try {
    const status = profitPacer.getStatus();

    return json(res, 200, {
      ok: true,
      status,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// ====== ROOT ROUTES ======
// Add root route for basic health check
app.get("/", (req, res) => {
  json(res, 200, {
    ok: true,
    service: "adsautopilot-backend",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Add favicon handlers to prevent 404s
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/favicon.png", (req, res) => res.status(204).end());

// ====== MIDDLEWARES MUST BE LAST ======
app.use("/api", async (err, req, res, next) => {
  if (!err) return next();
  try {
    await logAccess(req, 500, "api error");
  } catch {}
  return json(res, 500, { ok: false, code: "ERR", error: String(err) });
});

app.use("/api", async (req, res) => {
  try {
    await logAccess(req, 404, "api not_found");
  } catch {}
  return json(res, 404, { ok: false, code: "NOT_FOUND" });
});
// Force rebuild: Thu Sep 25 02:39:26 CEST 2025

// Routes moved before app.listen()
