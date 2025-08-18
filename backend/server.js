
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { getValidatedHMACSecret, initializeHMACValidation } from './utils/secret-validator.js';
import { getDoc, ensureSheet, getDocById } from './sheets.js';
import { validateRSA } from './lib/validators.js';
import { schedulePromoteWindow, tickPromoteWindow } from './jobs/promote_window.js';
import { runWeeklySummary } from './jobs/weekly_summary.js';
import { buildSegments } from './segments/materialize.js';
// Security & Privacy Services
import securityMiddleware from './middleware/security.js';
import privacyService from './services/privacy.js';
// import environmentSecurity from './services/environment-security.js'; // Disabled for Vercel compatibility
// PROMOTE Gate functions integrated
// DevOps Services
import { healthService, createHealthRoutes } from './services/health.js';
import logger from './services/logger.js';
import { createEnvironment } from '../deployment/environment.js';
import { JobScheduler } from './jobs/scheduler.js';
// Profit & Inventory Services
import profitPacer from './services/profit-pacer.js';
// Note: materialize/listSegments are stubs, not imported to avoid TS runtime issues
import fs from 'fs';
import path from 'path';
// Billing Routes
import billingRoutes from './routes/billing.js';
// Security Routes
import securityRoutes from './routes/security.js';

// Load env from root and backend/.env to ensure SHEET_ID and keys are available
dotenv.config();
try { dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') }); } catch {}

// Initialize environment with validation
let envConfig;
try {
  envConfig = createEnvironment();
  logger.info('Environment configuration loaded successfully', {
    environment: envConfig.NODE_ENV,
    port: envConfig.config.PORT
  });
} catch (error) {
  logger.error('Failed to load environment configuration', { error: error.message });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = express();
app.set('trust proxy', 1);

// ==== LOGGING MIDDLEWARE ====
// Add request logging middleware
// app.use(logger.middleware()); // Disabled for debugging

// CORS: restrict in dev; disable in prod unless configured
app.use(cors({ origin: (origin, cb)=> {
  const allowed = (process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  if (!origin || !allowed.length) return cb(null, true);
  return cb(null, allowed.includes(origin));
}}));
app.use(express.json({ limit: '2mb' }));

// ==== SECURITY MIDDLEWARE ====
// Apply advanced security middleware (DDoS protection, rate limiting, threat detection)
// Enable security middleware in production, with enhanced settings in development
if (process.env.NODE_ENV === 'production') {
  app.use(securityMiddleware.middleware());
} else {
  // Use security middleware in development with relaxed settings
  app.use(securityMiddleware.middleware());
}

// ==== BEGIN: simple cache middleware ====
const _cache = new Map();
const _ttlFor = (p) => {
  if (p.startsWith('/api/insights')) return Number(process.env.INSIGHTS_CACHE_TTL_SEC || '60');
  if (p.startsWith('/api/config'))   return Number(process.env.CONFIG_CACHE_TTL_SEC   || '15');
  if (p.startsWith('/api/run-logs')) return Number(process.env.RUNLOGS_CACHE_TTL_SEC  || '10');
  return 0;
};

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const ttl = _ttlFor(req.path);
  if (!ttl) return next();

  const key = req.originalUrl;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && hit.exp > now) {
    try { res.set('x-cache', 'HIT'); res.set('cache-control', `public, max-age=${ttl}`); } catch {}
    try { res.status(hit.status).type(hit.type).send(hit.body); } catch {}
    return;
  }

  const _send = res.send.bind(res);
  res.send = (body) => {
    try {
      const type = res.get('content-type') || '';
      const status = res.statusCode || 200;
      _cache.set(key, { body, type, status, exp: now + ttl * 1000 });
      res.set('x-cache', 'MISS');
      res.set('cache-control', `public, max-age=${ttl}`);
    } catch {}
    return _send(body);
  };
  next();
});
// ==== END: simple cache middleware ====

// ----- Minimal request logging (no secrets) -----
app.use((req, _res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const path = req.path;
    const method = req.method;
    console.log(`[req] ${method} ${path} ip=${Array.isArray(ip)?ip[0]:ip}`);
  } catch {}
  next();
});

// (Using existing custom rate limiter below; ensures JSON for 429)

// --- tiny helper for safe JSON responses and logging ---
function json(res, status, obj) {
  try { res.status(status); } catch {}
  try { res.set('content-type', 'application/json; charset=utf-8'); } catch {}
  try { return res.send(JSON.stringify(obj)); } catch { return res.end(); }
}
async function logAccess(req, status, note) {
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '') + '';
    const ua = ((req.headers['user-agent'] || '') + '').slice(0,120).replace(/\s+/g,' ');
    const line = [
      new Date().toISOString(),
      ip,
      ua,
      req.method,
      req.originalUrl || req.url || '',
      status,
      note||''
    ].join(' | ') + '\n';
    await fs.promises.appendFile('/tmp/pk_access.log', line);
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
  const doc = await getDoc(); if (!doc) return false;
  const sh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ['term']);
  const rows = await sh.getRows();
  const keep = rows.filter(r => String(r.term||'').trim().toLowerCase() !== String(term||'').trim().toLowerCase());
  if (keep.length === rows.length) return true;
  await sh.clearRows(); await sh.setHeaderRow(['term']);
  for (const r of keep) await sh.addRow({ term: r.term });
  return true;
}

async function ensureNegativeMapSheet(tenant) {
  const doc = await getDoc(); if (!doc) return null;
  return await ensureSheet(doc, `NEGATIVE_MAP_${tenant}`, ['scope','campaign','ad_group','match','term']);
}

async function addScopedNegative(tenant, { scope='account', campaign='', ad_group='', match='exact', term='' }) {
  const sh = await ensureNegativeMapSheet(tenant); if (!sh) return false;
  const row = {
    scope: String(scope||'account').toLowerCase(),
    campaign: String(campaign||''),
    ad_group: String(ad_group||''),
    match: String(match||'exact').toLowerCase(),
    term: String(term||'').trim()
  };
  await sh.addRow(row); return true;
}

async function removeScopedNegative(tenant, { scope='account', campaign='', ad_group='', match='exact', term='' }) {
  const sh = await ensureNegativeMapSheet(tenant); if (!sh) return false;
  const rows = await sh.getRows();
  const tgt = {
    scope: String(scope||'').toLowerCase(),
    campaign: String(campaign||''),
    ad_group: String(ad_group||''),
    match: String(match||'').toLowerCase(),
    term: String(term||'').trim().toLowerCase()
  };
  const keep = rows.filter(r =>
    String(r.scope||'').toLowerCase() !== tgt.scope ||
    String(r.match||'').toLowerCase() !== tgt.match ||
    String(r.term||'').trim().toLowerCase() !== tgt.term ||
    String(r.campaign||'') !== tgt.campaign ||
    String(r.ad_group||'') !== tgt.ad_group
  );
  if (keep.length === rows.length) return true;
  await sh.clearRows(); await sh.setHeaderRow(['scope','campaign','ad_group','match','term']);
  for (const r of keep) await sh.addRow({ scope:r.scope, campaign:r.campaign, ad_group:r.ad_group, match:r.match, term:r.term });
  return true;
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip') + '';
  const tenant = (req.query && req.query.tenant) ? String(req.query.tenant) : 'no-tenant';
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
    return res.status(429).json({ ok:false, error:'rate_limited' });
  }
  next();
});

// Initialize and validate HMAC secret on startup
initializeHMACValidation({ 
  allowWeakInDev: true, // Allow weak secrets in development only 
  environment: process.env.NODE_ENV || 'development'
});

// Get validated secret - this will throw if secret is weak/missing
const SECRET = getValidatedHMACSecret({ 
  allowWeakInDev: true,
  environment: process.env.NODE_ENV || 'development'
});

const PORT = Number(process.env.PORT || 3001);

// In-memory fallback store if Google Sheets isn't configured yet.
const memory = {
  configs: {},
};

// ----- HMAC helpers -----
function sign(payload) {
  if (!payload || typeof payload !== 'string') {
    throw new Error('HMAC payload must be a non-empty string');
  }
  
  try {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=+$/,'');
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
    console.error('HMAC verification error:', error.message);
    return false; 
  }
}

// ----- Minimal helpers for Google Sheets rows -----
async function upsertConfigToSheets(tenant, settings) {
  console.log(`🔍 upsertConfigToSheets called for ${tenant} with:`, Object.keys(settings));
  
  const doc = await getDoc(); 
  if (!doc) { 
    console.log(`❌ getDoc() returned null for ${tenant} - Google Sheets not accessible`);
    memory.configs[tenant] = { ...(memory.configs[tenant]||{}), ...settings }; 
    throw new Error('Google Sheets not accessible - saved to memory instead');
  }
  
  console.log(`📄 Google Sheets doc obtained for ${tenant}, creating CONFIG_${tenant} tab`);
  const sh = await ensureSheet(doc, `CONFIG_${tenant}`, ['key','value']);
  console.log(`📋 Sheet CONFIG_${tenant} ensured, reading existing rows`);
  
  const rows = await sh.getRows();
  console.log(`📖 Found ${rows.length} existing config rows for ${tenant}`);
  
  const map = {};
  rows.forEach(r => { if (r.key) map[String(r.key).trim()] = String(r.value||'').trim(); });
  Object.entries(settings||{}).forEach(([k,v]) => map[k] = String(v));
  
  console.log(`💾 Updating CONFIG_${tenant} with:`, Object.keys(map));
  await sh.clearRows();
  await sh.setHeaderRow(['key','value']);
  for (const [k,v] of Object.entries(map)) await sh.addRow({ key:k, value:v });
  
  console.log(`✅ Successfully wrote ${Object.keys(map).length} config entries to Google Sheets for ${tenant}`);
}

async function readConfigFromSheets(tenant) {
  const doc = await getDoc(); if (!doc) return memory.configs[tenant] || null;
  const sh = await ensureSheet(doc, `CONFIG_${tenant}`, ['key','value']);
  const rows = await sh.getRows();
  const map = {};
  rows.forEach(r => { if (r.key) map[String(r.key).trim()] = String(r.value||'').trim(); });
  // Build config object with defaults + table blobs:
  const cfg = {
    enabled: (map.enabled||'TRUE').toLowerCase()!=='false',
    label: map.label || 'PROOFKIT_AUTOMATED',
    default_final_url: map.default_final_url || 'https://www.proofkit.net',
    PROMOTE: (map.PROMOTE||'TRUE').toLowerCase()==='true',
    daily_budget_cap_default: Number(map.daily_budget_cap_default||'3.00'),
    cpc_ceiling_default: Number(map.cpc_ceiling_default||'0.20'),
    add_business_hours_if_none: (map.add_business_hours_if_none||'TRUE').toLowerCase()!=='false',
    business_days_csv: map.business_days_csv || 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    business_start: map.business_start || '09:00',
    business_end: map.business_end || '18:00',
    st_lookback: map.st_lookback || 'LAST_7_DAYS',
    st_min_clicks: Number(map.st_min_clicks||'2'),
    st_min_cost: Number(map.st_min_cost||'2.82'),
    master_neg_list_name: map.master_neg_list_name || 'Proofkit • Master Negatives',
    // Audience settings
    AUDIENCE_MIN_SIZE: Number(map.AUDIENCE_MIN_SIZE||'1000'),
    // Feature flags (safe defaults)
    ENABLE_SCRIPT: (map.ENABLE_SCRIPT||'TRUE').toLowerCase()!=='false',
    FEATURE_AI_DRAFTS: (map.FEATURE_AI_DRAFTS||'TRUE').toLowerCase()!=='false',
    FEATURE_INTENT_BLOCKS: (map.FEATURE_INTENT_BLOCKS||'TRUE').toLowerCase()!=='false',
    FEATURE_AUDIENCE_EXPORT: (map.FEATURE_AUDIENCE_EXPORT||'TRUE').toLowerCase()!=='false',
    FEATURE_AUDIENCE_ATTACH: (map.FEATURE_AUDIENCE_ATTACH||'TRUE').toLowerCase()!=='false',
    FEATURE_CM_API: (map.FEATURE_CM_API||'FALSE').toLowerCase()==='true',
    FEATURE_INVENTORY_GUARD: (map.FEATURE_INVENTORY_GUARD||'TRUE').toLowerCase()!=='false',
    plan: (map.PLAN||'starter').toLowerCase(),
    desired: {},
    AP: {
      objective: (map.AP_OBJECTIVE||'protect').toLowerCase(),
      mode: (map.AP_MODE||'auto').toLowerCase(),
      schedule: (map.AP_SCHEDULE||'off').toLowerCase(),
      target_cpa: Number(map.AP_TARGET_CPA||'0') || null,
      target_roas: Number(map.AP_TARGET_ROAS||'0') || null,
      desired_keywords: String(map.AP_DESIRED_KEYWORDS_PIPE||'').split('|').map(s=>s.trim()).filter(Boolean),
      playbook_prompt: map.AP_PLAYBOOK_PROMPT || ''
    },
    BUDGET_CAPS: {},
    CPC_CEILINGS: {},
    SCHEDULES: {},
    MASTER_NEGATIVES: [],
    WASTE_NEGATIVE_MAP: {},
    RSA_DEFAULT: { H:[], D:[] },
    RSA_MAP: {},
    EXCLUSIONS: {}
  };

  // Helper to read a simple map table: [key | value]
  async function readMapTable(title) {
    const sheet = await ensureSheet(doc, `${title}_${tenant}`, ['campaign','value']);
    const rows = await sheet.getRows();
    const m = {}; rows.forEach(r => { const k = String(r.campaign||'').trim(); if (k) m[k] = Number(r.value||0); });
    return m;
  }
  // Specific tables with custom headers
  async function readSchedules() {
    const sheet = await ensureSheet(doc, `SCHEDULES_${tenant}`, ['campaign','days_csv','start_hh:mm','end_hh:mm']);
    const rows = await sheet.getRows(); const m = {};
    rows.forEach(r => { const c=String(r.campaign||'').trim(); if(!c) return; m[c]={ days:String(r.days_csv||'').trim(), start:String(r['start_hh:mm']||'').trim(), end:String(r['end_hh:mm']||'').trim() }; });
    return m;
  }
  async function readList(title) {
    const sheet = await ensureSheet(doc, `${title}_${tenant}`, ['term']);
    const rows = await sheet.getRows(); const out=[]; rows.forEach(r=>{ const t=String(r.term||'').trim(); if(t) out.push(t); }); return out;
  }
  async function readNested(title) {
    const sheet = await ensureSheet(doc, `${title}_${tenant}`, ['campaign','ad_group','term']);
    const rows = await sheet.getRows(); const m={};
    rows.forEach(r => {
      const c=String(r.campaign||'').trim(), g=String(r.ad_group||'').trim(), t=String(r.term||'').trim().toLowerCase();
      if(!c||!g||!t) return; m[c]=m[c]||{}; (m[c][g]=m[c][g]||[]).push(t);
    });
    return m;
  }
  async function readRSADefault() {
    const sheet = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, ['headlines_pipe','descriptions_pipe']);
    const rows = await sheet.getRows();
    if (!rows.length) return { H:[], D:[] };
    const H = String(rows[0].headlines_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
    const D = String(rows[0].descriptions_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
    return { H, D };
  }
  async function readRSAMap() {
    const sheet = await ensureSheet(doc, `RSA_ASSETS_MAP_${tenant}`, ['campaign','ad_group','headlines_pipe','descriptions_pipe']);
    const rows = await sheet.getRows(); const m={};
    rows.forEach(r => {
      const c=String(r.campaign||'').trim(), g=String(r.ad_group||'').trim();
      if(!c||!g) return;
      const H=String(r.headlines_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
      const D=String(r.descriptions_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
      m[c]=m[c]||{}; m[c][g]={ H, D };
    });
    return m;
  }
  async function readExclusions() {
    const sheet = await ensureSheet(doc, `EXCLUSIONS_${tenant}`, ['campaign','ad_group']);
    const rows = await sheet.getRows(); const m={};
    rows.forEach(r => { const c=String(r.campaign||'').trim(), g=String(r.ad_group||'').trim(); if(!c||!g) return; m[c]=m[c]||{}; m[c][g]=true; });
    return m;
  }
  async function readAudienceMap() {
    const sheet = await ensureSheet(doc, `AUDIENCE_MAP_${tenant}`, ['campaign','ad_group','user_list_id','mode','bid_modifier']);
    const rows = await sheet.getRows(); const m={};
    rows.forEach(r => {
      const c=String(r.campaign||'').trim(), g=String(r.ad_group||'').trim();
      const listId=String(r.user_list_id||'').trim(), mode=String(r.mode||'OBSERVE').toUpperCase();
      const bidMod=String(r.bid_modifier||'').trim();
      if(!c||!g||!listId) return;
      m[c]=m[c]||{}; m[c][g]={ user_list_id: listId, mode: mode, bid_modifier: bidMod };
    });
    return m;
  }

  // Fill blobs
  cfg.BUDGET_CAPS = await readMapTable('BUDGET_CAPS');
  cfg.CPC_CEILINGS = await readMapTable('CPC_CEILINGS');
  cfg.SCHEDULES = await readSchedules();
  cfg.MASTER_NEGATIVES = await readList('MASTER_NEGATIVES');
  cfg.WASTE_NEGATIVE_MAP = await readNested('WASTE_NEGATIVE_MAP');
  cfg.RSA_DEFAULT = await readRSADefault();
  cfg.RSA_MAP = await readRSAMap();
  cfg.EXCLUSIONS = await readExclusions();
  cfg.AUDIENCE_MAP = await readAudienceMap();

  return cfg;
}

async function appendRows(tenant, title, header, rows) {
  if (!rows || !rows.length) return;
  const doc = await getDoc();
  if (!doc) return; // no-op if Sheets not configured
  const sh = await ensureSheet(doc, `${title}_${tenant}`, header);
  await sh.addRows(rows.map(arr => Object.fromEntries(header.map((h,i)=>[h, arr[i]]))));
}

async function appendMasterNegative(tenant, term) {
  const doc = await getDoc(); if (!doc) return false;
  const sh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ['term']);
  await sh.addRow({ term: String(term||'').trim() });
  return true;
}

async function upsertMapValue(tenant, title, key, value) {
  const doc = await getDoc(); if (!doc) return false;
  const sh = await ensureSheet(doc, `${title}_${tenant}`, ['campaign','value']);
  const rows = await sh.getRows();
  const k = String(key||'').trim() || '*';
  let found = null;
  for (const r of rows){ if (String(r.campaign||'').trim() === k){ found = r; break; } }
  if (found){ found.value = String(value); await found.save(); }
  else { await sh.addRow({ campaign: k, value: String(value) }); }
  return true;
}

// Read as AoA aligned to provided headers; uses toObject() when available
async function readRowsAoA(tenant, title, headers, limit = 2000) {
  const doc = await getDoc(); if (!doc) return [];
  const sheetTitle = `${title}_${tenant}`;
  const sh = await ensureSheet(doc, sheetTitle, Array.isArray(headers)&&headers.length?headers:['date']);
  try { await sh.loadHeaderRow(); } catch {}
  const hdrs = (Array.isArray(headers) && headers.length) ? headers.slice() : ((sh._headerValues||[]).slice());
  const rows = await sh.getRows();
  const start = Math.max(0, rows.length - Number(limit||2000));
  const out = [];
  for (let i=start; i<rows.length; i++){
    const r = rows[i];
    let obj = null;
    try { if (typeof r.toObject === 'function') obj = r.toObject(); } catch {}
    out.push(hdrs.map((h, idx) => {
      // prefer exact header match from row object or property accessor
      const key = String(h);
      const v = (r[key] ?? (obj && (obj[key] ?? obj[key.trim?.()] ?? obj[key.toLowerCase?.()] )));
      if (typeof v !== 'undefined' && v !== null) return v;
      // fallback to rawData by index
      const raw = Array.isArray(r._rawData) ? r._rawData[idx] : undefined;
      return (typeof raw !== 'undefined') ? raw : '';
    }));
  }
  return out;
}

async function upsertConfigKeys(tenant, kv) {
  const doc = await getDoc(); if (!doc) { memory.configs[tenant] = { ...(memory.configs[tenant]||{}), ...kv }; return; }
  const sh = await ensureSheet(doc, `CONFIG_${tenant}`, ['key','value']);
  const rows = await sh.getRows(); const map = {};
  rows.forEach(r => { if (r.key) map[String(r.key).trim()] = String(r.value||'').trim(); });
  Object.entries(kv||{}).forEach(([k,v]) => map[k] = String(v));
  await sh.clearRows(); await sh.setHeaderRow(['key','value']);
  for (const [k,v] of Object.entries(map)) await sh.addRow({ key:k, value:v });
}

async function acceptTopValidDrafts(tenant, maxCount){
  const doc = await getDoc(); if (!doc) return 0;
  const lib = await ensureSheet(doc, `ASSET_LIBRARY_${tenant}`, ['theme','headlines_pipe','descriptions_pipe','source']);
  const def = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, ['headlines_pipe','descriptions_pipe']);
  const rows = await lib.getRows();
  let picked = 0; let chosenH = [], chosenD = [];
  for (const r of rows){
    if (picked >= (maxCount||4)) break;
    const H = String(r.headlines_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
    const D = String(r.descriptions_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
    const lint = validateRSA(H,D);
    if (!lint.ok) continue;
    chosenH = lint.clipped.h; chosenD = lint.clipped.d; picked += 1; break;
  }
  if (picked > 0){
    const cur = await def.getRows();
    const H = chosenH.join('|'); const D = chosenD.join('|');
    if (cur.length){ cur[0].headlines_pipe = H; cur[0].descriptions_pipe = D; await cur[0].save(); }
    else { await def.addRow({ headlines_pipe: H, descriptions_pipe: D }); }
  }
  return picked;
}

// ===== PROMOTE GATE VALIDATION FUNCTIONS =====

/**
 * Critical PROMOTE gate validation - blocks mutations when PROMOTE=FALSE
 */
async function validatePromoteGate(tenant, mutationType = 'GENERAL') {
  try {
    // SECURITY FIX: Use secure environment validation instead of NODE_ENV bypass
    const secureValidation = environmentSecurity.validateSecurePromoteGate(tenant, mutationType);
    
    // Load tenant configuration for PROMOTE setting
    const config = await readConfigFromSheets(String(tenant));
    
    if (!config) {
      logger.error('PROMOTE Gate: Could not load config', { tenant, mutationType });
      return {
        ok: false,
        error: 'Could not load tenant configuration',
        promote: null
      };
    }

    const promoteEnabled = config.PROMOTE === true || 
                         String(config.PROMOTE).toLowerCase() === 'true';

    // Apply secure validation logic
    if (!promoteEnabled) {
      // Check if secure bypass is allowed for testing
      if (secureValidation.bypassAllowed && environmentSecurity.isShopifyTestSafe()) {
        logger.warn('PROMOTE Gate: BYPASSED for Shopify test account in safe context', { 
          tenant, 
          mutationType, 
          promote: config.PROMOTE,
          reason: secureValidation.reason,
          limitations: secureValidation.limitations
        });
        
        return {
          ok: true,
          promote: false, // Keep original value for audit
          bypassReason: secureValidation.reason,
          limitations: secureValidation.limitations,
          config: config,
          testSafeBypass: true
        };
      }
      
      logger.warn('PROMOTE Gate: BLOCKED', { 
        tenant, 
        mutationType, 
        promote: config.PROMOTE,
        secureValidation: secureValidation
      });
      
      return {
        ok: false,
        error: 'PROMOTE gate active - Live mutations blocked for safety',
        promote: config.PROMOTE,
        message: 'To enable live changes, set PROMOTE=TRUE in configuration'
      };
    }

    logger.info('PROMOTE Gate: PASSED', { 
      tenant, 
      mutationType, 
      promote: config.PROMOTE 
    });

    return {
      ok: true,
      promote: config.PROMOTE,
      config: config
    };

  } catch (error) {
    logger.error('PROMOTE Gate: Validation error', { 
      error: error.message, 
      tenant, 
      mutationType 
    });
    
    return {
      ok: false,
      error: 'PROMOTE gate validation failed',
      promote: null
    };
  }
}

/**
 * PROMOTE gate middleware for Express routes
 */
function promoteGateMiddleware(mutationType = 'GENERAL') {
  return async (req, res, next) => {
    const tenant = req.query.tenant || req.body.tenant;
    
    if (!tenant) {
      return json(res, 400, {
        ok: false,
        code: 'PROMOTE_GATE_ERROR',
        error: 'Tenant required for PROMOTE gate validation'
      });
    }

    const gateResult = await validatePromoteGate(tenant, mutationType);
    
    if (!gateResult.ok) {
      return json(res, 403, {
        ok: false,
        code: 'PROMOTE_GATE_BLOCKED',
        error: gateResult.error,
        message: gateResult.message,
        promote: gateResult.promote,
        mutationType: mutationType,
        timestamp: new Date().toISOString()
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
app.get('/health', healthRoutes.health);
app.get('/ready', healthRoutes.ready);
app.get('/live', healthRoutes.live);
app.get('/metrics', healthRoutes.metrics);

// Legacy health endpoints
app.get('/api/health', healthRoutes.health);
app.get('/api/healthz', healthRoutes.ready);

// ==== SECURITY ROUTES ====
app.use('/api/security', securityRoutes);

// ==== BILLING ROUTES ====
app.use('/api/billing', billingRoutes);

app.get('/api/diagnostics', async (req, res) => {
  try {
    // Consider Sheets connected if SHEET_ID is present (single-master pattern).
    // Still attempt to auth to surface issues via optional hint fields.
    const sheetEnv = !!process.env.SHEET_ID;
    const doc = await getDoc();
    const sheetsOk = sheetEnv || !!doc;
    const aiReady = (process.env.AI_PROVIDER||'').toLowerCase()==='google' && !!process.env.GOOGLE_API_KEY;
    const hmacOk = !!(process.env.HMAC_SECRET);
    res.json({
      ok: true,
      ai_ready: !!aiReady,
      sheets_ok: !!sheetsOk,
      hmac_ok: !!hmacOk,
      sheetsAuth: process.env.GOOGLE_SERVICE_EMAIL ? 'service_account' : 'unknown',
      serviceEmail: process.env.GOOGLE_SERVICE_EMAIL || null,
      cache: {
        insightsTTL: Number(process.env.INSIGHTS_CACHE_TTL_SEC || '60'),
        configTTL:   Number(process.env.CONFIG_CACHE_TTL_SEC   || '15'),
        runLogsTTL:  Number(process.env.RUNLOGS_CACHE_TTL_SEC  || '10')
      }
    });
  } catch (e) { res.status(200).json({ ok:false, error:String(e) }); }
});

// ----- PROMOTE Gate Status Endpoint -----
app.get('/api/promote/gate/status', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:promote_gate_status`;
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'promote_gate_status auth_fail');
    return json(res, 403, { ok:false, code:'AUTH', error:'invalid signature' });
  }
  
  try {
    const gateResult = await validatePromoteGate(tenant, 'STATUS_CHECK');
    const config = gateResult.config || {};
    
    await logAccess(req, 200, 'promote_gate_status ok');
    return json(res, 200, {
      ok: true,
      promote: gateResult.promote,
      promoteRaw: config.PROMOTE,
      label: config.label || 'PROOFKIT_AUTOMATED',
      enabled: config.enabled,
      gateStatus: gateResult.ok ? 'OPEN' : 'BLOCKED',
      message: gateResult.error || 'PROMOTE gate operational',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    await logAccess(req, 500, 'promote_gate_status error');
    return json(res, 500, { ok:false, code:'PROMOTE_GATE_STATUS', error:String(e) });
  }
});

// ----- Environment Security Endpoints -----
app.get('/api/security/environment/status', async (req, res) => {
  const tenant = req.query.tenant;
  const payload = `GET:${tenant}:environment_status`;
  if (!tenant || !verify(req.query.sig, payload)) {
    await logAccess(req, 403, 'environment_status auth_fail');
    return json(res, 403, { ok:false, code:'AUTH', error:'invalid signature' });
  }
  
  try {
    const envInfo = environmentSecurity.getEnvironmentInfo();
    const driftCheck = environmentSecurity.detectEnvironmentDrift();
    
    await logAccess(req, 200, 'environment_status ok');
    return json(res, 200, { 
      ok: true, 
      environment: envInfo,
      security: {
        drift: driftCheck,
        locked: true,
        deployment_env_locked: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    await logAccess(req, 500, 'environment_status error');
    return json(res, 500, { ok:false, code:'ENVIRONMENT_STATUS_ERROR', error:String(e) });
  }
});

app.get('/api/config', async (req, res) => {
  const tenant = String(req.query.tenant||'');
  const sig = String(req.query.sig||'');
  const payload = `GET:${tenant}:config`;
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'config auth_fail');
    return json(res, 403, { ok:false, code:'AUTH', error:'invalid signature' });
  }
  try {
    let cfg = await readConfigFromSheets(tenant);
    if (!cfg) {
      await bootstrapTenant(tenant);
      cfg = await readConfigFromSheets(tenant);
    }
    if (!cfg) { await logAccess(req, 500, 'config bootstrap_fail'); return json(res, 500, { ok:false, code:'BOOTSTRAP', error:'bootstrap_failed' }); }
    await logAccess(req, 200, 'config ok');
    return json(res, 200, { ok:true, config: cfg });
  } catch (e) {
    await logAccess(req, 500, 'config error');
    return json(res, 500, { ok:false, code:'CONFIG', error:String(e) });
  }
});

// HMAC-gated echo endpoint for diagnostics
app.get('/api/config/echo', async (req, res) => {
  const tenant = String(req.query.tenant||'');
  const sig = String(req.query.sig||'');
  const payload = `GET:${tenant}:config_echo`;
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'config_echo auth_fail');
    return json(res, 403, { ok:false, code:'AUTH', error:'invalid signature' });
  }
  const data = {
    ok: true,
    ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '') + '',
    ua: (req.headers['user-agent'] || '') + '',
    host: req.headers.host || '',
    scheme: (req.headers['x-forwarded-proto'] || req.protocol || 'http') + '',
    url: (req.originalUrl || req.url || '') + ''
  };
  await logAccess(req, 200, 'config_echo ok');
  return json(res, 200, data);
});

// (moved API error/404 handlers to the end of file)

app.post('/api/metrics', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), metrics=[], search_terms=[], run_logs=[] } = req.body || {};
  const payload = `POST:${tenant}:metrics:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    // Soft throttle: one payload per 5s per tenant
    const nowTs = Date.now(); const lastTs = metricsThrottle.get(tenant) || 0;
    if (nowTs - lastTs < 5000) return json(res, 429, { ok:false, code:'THROTTLED' });
    metricsThrottle.set(tenant, nowTs);
    const MET_HEADERS = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
    const ST_HEADERS  = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const LOG_HEADERS = ['timestamp','message'];

    // Coerce numeric fields
    const mRows = (Array.isArray(metrics)?metrics:[]).map(r=>{
      const a = Array.isArray(r)? r.slice(0, MET_HEADERS.length) : [];
      if (!a.length) return null;
      a[6] = Number(a[6]||0);
      a[7] = Number(a[7]||0);
      a[8] = Number(a[8]||0);
      a[9] = Number(a[9]||0);
      a[10]= Number(a[10]||0);
      return a;
    }).filter(Boolean);
    const stRows = (Array.isArray(search_terms)?search_terms:[]).map(r=>{
      const a = Array.isArray(r)? r.slice(0, ST_HEADERS.length) : [];
      if (!a.length) return null;
      a[4] = Number(a[4]||0);
      a[5] = Number(a[5]||0);
      a[6] = Number(a[6]||0);
      return a;
    }).filter(Boolean);
    const logRows = (Array.isArray(run_logs)?run_logs:[]).map(r=> Array.isArray(r)? r.slice(0, LOG_HEADERS.length):null).filter(Boolean);

    const totalRows = mRows.length + stRows.length + logRows.length;
    if (totalRows > 5000) return json(res, 413, { ok:false, code:'PAYLOAD_TOO_LARGE', totalRows, limit:5000 });
    let insM=0, insS=0, insL=0;
    if (mRows.length){ await appendRows(String(tenant), 'METRICS', MET_HEADERS, mRows); insM = mRows.length; }
    if (stRows.length){ await appendRows(String(tenant), 'SEARCH_TERMS', ST_HEADERS, stRows); insS = stRows.length; }
    if (logRows.length){ await appendRows(String(tenant), 'RUN_LOGS', LOG_HEADERS, logRows); insL = logRows.length; }
    return json(res, 200, { ok:true, inserted:{ metrics: insM, search_terms: insS, run_logs: insL } });
  } catch (e) {
    return json(res, 500, { ok:false, code:'METRICS', error:String(e) });
  }
});

app.post('/api/upsertConfig', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), settings={} } = req.body || {};
  const payload = `POST:${tenant}:upsertconfig:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  
  console.log(`📝 Attempting to save settings for ${tenant}:`, settings);
  
  try {
    await upsertConfigToSheets(tenant, settings);
    console.log(`✅ Settings successfully saved to Google Sheets for ${tenant}`);
    
    // Write a run log entry when possible (Sheets present)
    try { 
      await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), 'config_upsert']]); 
      console.log(`📝 Run log entry added for ${tenant}`);
    } catch {}
    
    res.json({ ok:true, saved: Object.keys(settings).length });
  } catch (e) {
    console.log(`⚠️ Google Sheets error for ${tenant}:`, e.message);
    
    // SECURITY FIX: Use secure environment validation instead of NODE_ENV
    if (environmentSecurity.isTestingAllowed()) {
      console.log(`🔧 Development/Staging mode: Settings would be saved for ${tenant}:`, settings);
      
      // Store in memory for development/staging
      global.devTenantConfigs = global.devTenantConfigs || {};
      global.devTenantConfigs[tenant] = { ...global.devTenantConfigs[tenant], ...settings };
      console.log(`💾 Stored in memory for ${tenant}:`, global.devTenantConfigs[tenant]);
      
      res.json({ 
        ok:true, 
        saved: Object.keys(settings).length, 
        mode: 'development_memory',
        environment: environmentSecurity.getEnvironmentInfo().deploymentEnv
      });
    } else {
      res.status(500).json({ ok:false, error:String(e) });
    }
  }
});

// ----- Autopilot tick (HMAC + PROMOTE Gate) -----
app.post('/api/jobs/autopilot_tick', promoteGateMiddleware('AUTOPILOT_TICK'), async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const dry = String(req.query.dry||'0')==='1';
  const force = String(req.query.force||'0')==='1';
  const payload = `POST:${tenant}:autopilot_tick:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const cfg = await readConfigFromSheets(String(tenant));
    const AP = cfg?.AP || {};
    const now = Date.now();
    if (!force) {
      const sched = (AP.schedule||'off');
      const d = new Date(); const wd = d.getDay(); const hr = d.getHours();
      const within = (sched==='hourly') || (sched==='daily' && hr===9) || (sched==='weekdays_9_18' && wd>0 && wd<6 && hr>=9 && hr<=18);
      const last = Number(cfg?.AP_LAST_RUN_MS||0);
      const spaced = (now - last) >= 45*60*1000;
      if (sched==='off' || !within || !spaced) return json(res, 200, { ok:true, skipped:true, reason:'schedule_gate', planned:[], applied:[] });
    }
    // Aggregate 7d metrics
    const MET_HEADERS = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
    const horizon = now - 7*24*60*60*1000;
    const metAoA = await readRowsAoA(String(tenant), 'METRICS', MET_HEADERS, 4000);
    let clicks=0, cost=0, conv=0;
    for (const r of metAoA){ const ts = Date.parse(String(r[0]||'')); if (!isFinite(ts) || ts<horizon) continue; clicks+=Number(r[6]||0); cost+=Number(r[7]||0); conv+=Number(r[8]||0); }
    const cpa = conv ? (cost/conv) : 0;
    // Aggregate 7d terms
    const ST_HEADERS = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const stAoA = await readRowsAoA(String(tenant), 'SEARCH_TERMS', ST_HEADERS, 5000);
    const bucket = new Map();
    for (const r of stAoA){ const ts = Date.parse(String(r[0]||'')); if (!isFinite(ts) || ts<horizon) continue; const term=String(r[3]||'').trim().toLowerCase(); if(!term) continue; const cur=bucket.get(term)||{term,clicks:0,cost:0,conv:0}; cur.clicks+=Number(r[4]||0); cur.cost+=Number(r[5]||0); cur.conv+=Number(r[6]||0); bucket.set(term,cur); }
    const rows = Array.from(bucket.values()).sort((a,b)=> b.cost-a.cost || b.clicks-a.clicks);
    // Build plan
    const plan = [];
    const targetCPA = Number(AP.target_cpa||0) || 0;
    const termCostThreshold = Math.max(targetCPA || 2, 2);
    for (const r of rows){ if (r.conv===0 && r.cost>=termCostThreshold){ plan.push({ type:'add_negative', term:r.term, match:'phrase', scope:'account' }); if (plan.length>=10) break; } }
    if (targetCPA && clicks>0){
      const tooHigh = (conv>0 && (cpa > 1.3*targetCPA));
      const tooLow  = (conv>0 && (cpa < 0.7*targetCPA));
      if (tooHigh || tooLow){
        let currentStar = Number(((cfg?.CPC_CEILINGS||{})['*'])||0) || (clicks?cost/clicks:0.2);
        let next = currentStar * (tooHigh ? 0.9 : 1.1);
        next = Math.max(0.05, Math.min(1.00, Number(next.toFixed(2))));
        if (Math.abs(next-currentStar) >= 0.01) plan.push({ type:'lower_cpc_ceiling', campaign:'*', amount: next });
      }
    }
    let applied = [], errors = [];
    if (!dry && (AP.mode||'auto')==='auto' && plan.length){
      for (const a of plan){ try {
        if (a.type==='add_negative') { await addScopedNegative(String(tenant), { scope:a.scope, match:a.match, term:a.term }); applied.push(a); }
        else if (a.type==='lower_cpc_ceiling') { await upsertMapValue(String(tenant), 'CPC_CEILINGS', a.campaign||'*', a.amount); applied.push(a); }
      } catch(e){ errors.push({ action:a, error:String(e) }); } }
      try { await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `autopilot: planned ${plan.length}, applied ${applied.length} (mode:auto, obj:${AP.objective||'protect'}, cpa:${cpa.toFixed(2)}${targetCPA?`/t${targetCPA}`:''})`]]); } catch {}
      try { await upsertConfigKeys(String(tenant), { AP_LAST_RUN_MS: String(now) }); } catch {}
    } else {
      try { await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `autopilot: planned ${plan.length} (mode:${AP.mode||'review'}, preview)`]]); } catch {}
    }
    return json(res, 200, { ok:true, planned: plan, applied, errors, kpi:{ clicks, cost, conv, cpa }, target_cpa: targetCPA });
  } catch (e) { return json(res, 500, { ok:false, code:'AUTOPILOT', error:String(e) }); }
});

// ----- CPC ceilings batch upsert (HMAC) -----
app.post('/api/cpc-ceilings/batch', promoteGateMiddleware('CPC_CEILINGS_BATCH'), async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), items=[] } = req.body||{};
  const payload = `POST:${tenant}:cpc_batch:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    let n=0;
    for (const it of (Array.isArray(items)?items:[])) {
      const c = String(it.campaign||'*');
      const v = Number(it.value);
      if (!isFinite(v)) continue;
      await upsertMapValue(String(tenant), 'CPC_CEILINGS', c, v);
      n++;
    }
    try { await appendRows(String(tenant),'RUN_LOGS',['timestamp','message'],[[new Date().toISOString(),`cpc_batch:${n}`]]);} catch {}
    return json(res, 200, { ok:true, upserted:n });
  } catch(e){ return json(res, 500, { ok:false, code:'CPC_BATCH', error:String(e) }); }
});

// ----- Audience OS: ensure required tabs exist (idempotent) -----
async function ensureAudienceTabs(tenant) {
  const doc = await getDoc(); if (!doc) return false;
  const titles = [
    `AUDIENCE_SEEDS_${tenant}`,
    `SKU_MARGIN_${tenant}`,
    `SKU_STOCK_${tenant}`,
    `AUDIENCE_SEGMENTS_${tenant}`,
    `AUDIENCE_EXPORT_${tenant}`,
      `AUDIENCE_MAP_${tenant}`,
      `ADGROUP_SKU_MAP_${tenant}`
    , `INTENT_BLOCKS_${tenant}`
    , `OVERLAY_HISTORY_${tenant}`
  ];
  const headers = {
    [`AUDIENCE_SEEDS_${tenant}`]: ['customer_id','email_hash','phone_hash','total_spent','order_count','last_order_at','top_category','last_product_ids_csv'],
    [`SKU_MARGIN_${tenant}`]: ['sku','margin'],
    [`SKU_STOCK_${tenant}`]: ['sku','stock'],
    [`AUDIENCE_SEGMENTS_${tenant}`]: ['segment_key','logic_sqlish','active'],
    [`AUDIENCE_EXPORT_${tenant}`]: ['segment_key','format','url','row_count','generated_at'],
      [`AUDIENCE_MAP_${tenant}`]: ['campaign','ad_group','user_list_id','mode','bid_modifier'],
      [`ADGROUP_SKU_MAP_${tenant}`]: ['ad_group_id','sku']
    , [`INTENT_BLOCKS_${tenant}`]: ['intent_key','hero_headline','benefit_bullets_pipe','proof_snippet','cta_text','url_target','updated_at','updated_by']
    , [`OVERLAY_HISTORY_${tenant}`]: ['timestamp','action','selector','channel','fields_json']
  };
  for (const t of titles) {
    await ensureSheet(doc, t, headers[t] || ['key','value']);
  }
  return true;
}

app.post('/api/ensureAudienceTabs', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ensureaudiencetabs:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const ok = await ensureAudienceTabs(tenant);
    if (ok) { try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), 'audience_tabs_ensured']]); } catch {} }
    res.json({ ok: !!ok });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Bootstrap a tenant (ensure tabs + sane defaults) -----
async function bootstrapTenant(tenant) {
  try { await ensureAudienceTabs(String(tenant)); } catch {}
  const defaults = {
    enabled: 'TRUE',
    label: 'Proofkit • Managed',
    plan: 'starter',
    default_final_url: 'https://example.com',
    daily_budget_cap_default: '3',
    cpc_ceiling_default: '0.2',
    add_business_hours_if_none: 'TRUE',
    business_days_csv: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',
    business_start: '09:00',
    business_end: '18:00',
    master_neg_list_name: 'Proofkit • Master Negatives',
    st_lookback: 'LAST_7_DAYS',
    st_min_clicks: '2',
    st_min_cost: '2.82',
    AUDIENCE_MIN_SIZE: '1000'
  };
  try { await upsertConfigKeys(String(tenant), defaults); } catch {}
  try { await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), 'bootstrap']]); } catch {}
  try { return await readConfigFromSheets(String(tenant)); } catch { return null; }
}

// ----- Intent OS: Apply/Revert overlays (audit only; no auto-publish) -----
app.post('/api/intent/apply', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), overlays=[] } = req.body || {};
  const payload = `POST:${tenant}:intentapply:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `intent_apply:${overlays.length}`]]); } catch {}
    res.json({ ok:true, applied: overlays.length });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post('/api/intent/revert', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), overlays=[] } = req.body || {};
  const payload = `POST:${tenant}:intentrevert:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `intent_revert:${overlays.length}`]]); } catch {}
    res.json({ ok:true, reverted: overlays.length });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Overlays (apply/revert/bulk) — snapshot-only; audit to RUN_LOGS -----
app.post('/api/overlays/apply', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), product_ids=[], collection_ids=[], channel='google', fields={} } = req.body || {};
  const payload = `POST:${tenant}:overlays_apply:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    try { await appendRows(tenant, 'OVERLAY_HISTORY', ['timestamp','action','selector','channel','fields_json'], [[new Date().toISOString(), 'apply', (product_ids.length?`products:${product_ids.length}`:(collection_ids.length?`collections:${collection_ids.length}`:'none')), channel, JSON.stringify(fields)]]); } catch {}
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `overlay_apply:${channel}`]]); } catch {}
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post('/api/overlays/revert', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), product_ids=[], collection_ids=[], channel='google' } = req.body || {};
  const payload = `POST:${tenant}:overlays_revert:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    try { await appendRows(tenant, 'OVERLAY_HISTORY', ['timestamp','action','selector','channel','fields_json'], [[new Date().toISOString(), 'revert', (product_ids.length?`products:${product_ids.length}`:(collection_ids.length?`collections:${collection_ids.length}`:'none')), channel, '{}']]); } catch {}
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `overlay_revert:${channel}`]]); } catch {}
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post('/api/overlays/bulk', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), select='collection', value='', channel='google', fields={} } = req.body || {};
  const payload = `POST:${tenant}:overlays_bulk:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    try { await appendRows(tenant, 'OVERLAY_HISTORY', ['timestamp','action','selector','channel','fields_json'], [[new Date().toISOString(), 'apply_bulk', `${select}:${value}`, channel, JSON.stringify(fields)]]); } catch {}
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `overlay_bulk:${select}:${value}`]]); } catch {}
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Seed demo data (SECURE DEV ONLY; HMAC) -----
app.post('/api/seed-demo', async (req, res) => {
  // SECURITY FIX: Use deployment environment instead of NODE_ENV
  if (environmentSecurity.isProductionExecution()) {
    return res.status(403).json({ 
      ok:false, 
      error:'forbidden_in_production',
      message: 'Seed demo only available in development/staging deployments'
    });
  }
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:seed_demo:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc();
    if (!doc) return res.status(500).json({ ok:false, error:'no_sheets' });
    const seeded = { tabs: [], rows: 0 };
    // Minimal tabs aligned to insights & planner readers
    const metHeaders = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
    const stHeaders  = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const runHeaders = ['timestamp','message'];
    const metSheet = await ensureSheet(doc, `METRICS_${tenant}`, metHeaders);
    const stSheet  = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, stHeaders);
    const rlSheet  = await ensureSheet(doc, `RUN_LOGS_${tenant}`, runHeaders);
    try { await metSheet.clearRows(); await metSheet.setHeaderRow(metHeaders); } catch {}
    try { await stSheet.clearRows(); await stSheet.setHeaderRow(stHeaders); } catch {}
    try { await rlSheet.clearRows(); await rlSheet.setHeaderRow(runHeaders); } catch {}
    const iso = new Date().toISOString().slice(0,10);
    await metSheet.addRow({ date: iso, level: 'ad_group', campaign: 'Demo Campaign', ad_group: 'Demo AdGroup', id: '1', name: 'Demo KW', clicks: '12', cost: '6.50', conversions: '1', impr: '120', ctr: '0.10' });
    await stSheet.addRow({ date: iso, campaign: 'Demo Campaign', ad_group: 'Demo AdGroup', search_term: 'demo shoes', clicks: '8', cost: '5.20', conversions: '0' });
    await rlSheet.addRow({ timestamp: new Date().toISOString(), message: 'seed_demo_data' });
    seeded.tabs.push(`METRICS_${tenant}`, `SEARCH_TERMS_${tenant}`, `RUN_LOGS_${tenant}`);
    seeded.rows = 3;
    return res.json({ ok:true, seeded });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Intent OS: CRUD -----
app.get('/api/intent/list', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:intent_list`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok:true, rows: [] });
    const sh = await ensureSheet(doc, `INTENT_BLOCKS_${tenant}`, ['intent_key','hero_headline','benefit_bullets_pipe','proof_snippet','cta_text','url_target','updated_at','updated_by']);
    const rows = await sh.getRows();
    res.json({ ok:true, rows: rows.map(r=>({
      intent_key: String(r.intent_key||'').trim(),
      hero_headline: String(r.hero_headline||''),
      benefit_bullets_pipe: String(r.benefit_bullets_pipe||''),
      proof_snippet: String(r.proof_snippet||''),
      cta_text: String(r.cta_text||''),
      url_target: String(r.url_target||'')
    })) });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post('/api/intent/upsert', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), rows=[] } = req.body || {};
  const payload = `POST:${tenant}:intent_upsert:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc(); if (!doc) return res.json({ ok:true, upserted: 0 });
    const sh = await ensureSheet(doc, `INTENT_BLOCKS_${tenant}`, ['intent_key','hero_headline','benefit_bullets_pipe','proof_snippet','cta_text','url_target','updated_at','updated_by']);
    const existing = await sh.getRows();
    const byKey = new Map(existing.map(r => [String(r.intent_key||'').trim().toLowerCase(), r]));
    let count = 0;
    for (const r of rows) {
      const key = String(r.intent_key||'').trim();
      if (!key) continue;
      const hero = String(r.hero_headline||'');
      const cta = String(r.cta_text||'');
      const bullets = String(r.benefit_bullets_pipe||'');
      if (hero.length > 80) continue;
      if (cta.length > 30) continue;
      if (bullets.split('|').some(b => b.trim().length > 100)) continue;
      const found = byKey.get(key.toLowerCase());
      if (found) {
        found.hero_headline = hero;
        found.benefit_bullets_pipe = bullets;
        found.proof_snippet = String(r.proof_snippet||'');
        found.cta_text = cta;
        found.url_target = String(r.url_target||'');
        found.updated_at = new Date().toISOString();
        found.updated_by = 'api';
        await found.save();
      } else {
        await sh.addRow({ intent_key: key, hero_headline: hero, benefit_bullets_pipe: bullets, proof_snippet: String(r.proof_snippet||''), cta_text: cta, url_target: String(r.url_target||''), updated_at: new Date().toISOString(), updated_by: 'api' });
      }
      count += 1;
    }
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `intent_upsert:${count}`]]); } catch {}
    res.json({ ok:true, upserted: count });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

app.post('/api/intent/delete', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), intent_keys=[] } = req.body || {};
  const payload = `POST:${tenant}:intent_delete:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc(); if (!doc) return res.json({ ok:true, deleted: 0 });
    const sh = await ensureSheet(doc, `INTENT_BLOCKS_${tenant}`, ['intent_key']);
    const rows = await sh.getRows();
    const del = new Set((intent_keys||[]).map((k)=>String(k||'').trim().toLowerCase()));
    let keep = [], deleted = 0;
    rows.forEach(r => { const k=String(r.intent_key||'').trim().toLowerCase(); if (!k || del.has(k)) deleted++; else keep.push(r); });
    if (deleted > 0) {
      await sh.clearRows();
      await sh.setHeaderRow(['intent_key','hero_headline','benefit_bullets_pipe','proof_snippet','cta_text','url_target','updated_at','updated_by']);
      for (const r of keep) await sh.addRow({ intent_key:r.intent_key, hero_headline:r.hero_headline, benefit_bullets_pipe:r.benefit_bullets_pipe, proof_snippet:r.proof_snippet, cta_text:r.cta_text, url_target:r.url_target, updated_at:r.updated_at, updated_by:r.updated_by });
    }
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `intent_delete:${deleted}`]]); } catch {}
    res.json({ ok:true, deleted });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Summary (KPIs + Top terms) -----
app.get('/api/summary', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:summary_get`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok:true, kpis:{ spend:0, clicks:0, conv:0, cpa:0 }, top_terms:[], last_run:null });
    const since = Date.now() - 7*24*60*60*1000;
    // KPIs
    const metrics = await ensureSheet(doc, `METRICS_${tenant}`, ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr']);
    const mRows = await metrics.getRows();
    let spend=0, clicks=0, conv=0;
    for (const r of mRows){ const ts=Date.parse(String(r.date||'')); if (isFinite(ts) && ts>=since){ clicks+=Number(r.clicks||0); spend+=Number(r.cost||0); conv+=Number(r.conversions||0); } }
    const cpa = conv>0 ? (spend/conv) : 0;
    // Top terms
    const st = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, ['date','campaign','ad_group','search_term','clicks','cost','conversions']);
    const tr = await st.getRows();
    const map = new Map();
    for (const r of tr){ const term=String(r.search_term||'').trim(); if(!term) continue; const ts=Date.parse(String(r.date||'')); if (!isFinite(ts) || ts<since) continue; const e=map.get(term)||{term,clicks:0,cost:0}; e.clicks+=Number(r.clicks||0); e.cost+=Number(r.cost||0); map.set(term,e); }
    const top_terms = Array.from(map.values()).sort((a,b)=> b.clicks-a.clicks).slice(0,10);
    res.json({ ok:true, kpis:{ spend, clicks, conv, cpa }, top_terms, last_run:null });
  } catch (e) { res.status(200).json({ ok:false, error:String(e) }); }
});

// ----- Insights (HMAC) -----
app.get('/api/insights', async (req, res) => {
  const { tenant, sig } = req.query;
  const wq = String(req.query.w||'7d').toLowerCase();
  const w = (wq==='24h'||wq==='all') ? wq : '7d';
  const payload = `GET:${tenant}:insights`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const cacheKey = `${tenant}:${w}`;
    const cached = insightsCache.get(cacheKey);
    const nowMs = Date.now();
    if (cached && (nowMs - cached.ts < 60_000)) return json(res, 200, cached.data);

    const MET_HEADERS = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
    const ST_HEADERS  = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const metAoA = await readRowsAoA(String(tenant), 'METRICS', MET_HEADERS, 4000);
    const stsAoA = await readRowsAoA(String(tenant), 'SEARCH_TERMS', ST_HEADERS, 4000);
    const toObj = (rows, headers) => rows.map(r => Object.fromEntries(headers.map((h,i)=>[h, r[i]])));
    const metObj = toObj(metAoA, MET_HEADERS).map(row=>{ const o={}; for(const [k,v] of Object.entries(row)) o[String(k).toLowerCase()] = v; return o; });
    const stObj  = toObj(stsAoA, ST_HEADERS).map(row=>{ const o={}; for(const [k,v] of Object.entries(row)) o[String(k).toLowerCase()] = v; return o; });

    // Parse ISO strings, numbers, and Google serial dates (days since 1899-12-30)
    function parseTsLoose(row){
      const raw = row?.date ?? row?.timestamp ?? row?.ts ?? '';
      if (raw instanceof Date) { const t = raw.getTime(); return Number.isFinite(t)? t : NaN; }
      const n = Number(raw);
      if (Number.isFinite(n)) {
        if (n > 10_000_000_000) return n; // ms epoch
        if (n > 10_000 && n < 1_000_000) { // serial days → ms
          const ms = (n - 25569) * 86400 * 1000; // Excel/Sheets epoch offset
          return Number.isFinite(ms) ? ms : NaN;
        }
      }
      const s = String(raw).trim();
      const p = Date.parse(s);
      return Number.isFinite(p) ? p : NaN;
    }

    const now = Date.now();
    const horizon = (w==='all') ? -Infinity : (now - (w==='24h' ? 24*60*60*1000 : 7*24*60*60*1000));

    // KPIs
    let clicks=0, cost=0, conv=0, imp=0;
    let met_scanned=0, met_in_window=0;
    for (const r of metObj){
      met_scanned++;
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      met_in_window++;
      clicks+=Number(r.clicks||0); cost+=Number(r.cost||0); conv+=Number(r.conversions||0); imp+=Number(r.impr||r.impressions||0);
    }
    const ctr = imp ? (clicks/imp) : 0; const cpc = clicks ? (cost/clicks) : 0; const cpa = conv ? (cost/conv) : 0;

    // Top terms
    const bucket = new Map();
    let sts_scanned=0, sts_in_window=0;
    for (const r of stObj){
      sts_scanned++;
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      sts_in_window++;
      const term=String(r.search_term||'').trim().toLowerCase(); if (!term) continue;
      const cur=bucket.get(term)||{term,clicks:0,cost:0,conversions:0}; cur.clicks+=Number(r.clicks||0); cur.cost+=Number(r.cost||0); cur.conversions+=Number(r.conversions||0); bucket.set(term,cur);
    }
    const top_terms = Array.from(bucket.values()).sort((a,b)=> b.cost-a.cost || b.clicks-a.clicks).slice(0,10);

    // Time series
    const roundKey = (d)=>{ const dt=new Date(d); if (w==='24h'){ dt.setMinutes(0,0,0); return dt.toISOString().slice(0,13)+':00'; } dt.setHours(0,0,0,0); return dt.toISOString().slice(0,10); };
    const seriesMap = new Map();
    for (const r of metObj){ const ts = parseTsLoose(r); if (!Number.isFinite(ts) || ts < horizon) continue; const k = roundKey(ts); const cur = seriesMap.get(k)||{t:k, clicks:0,cost:0,conv:0,impr:0}; cur.clicks+=Number(r.clicks||0); cur.cost+=Number(r.cost||0); cur.conv+=Number(r.conversions||0); cur.impr+=Number(r.impr||r.impressions||0); seriesMap.set(k,cur); }
    const series = Array.from(seriesMap.values()).sort((a,b)=> a.t.localeCompare(b.t));

    // Explain
    const explain = top_terms.slice(0,3).map(t=>{ let action='monitor', target=t.term, reason=`Cost $${(t.cost||0).toFixed(2)} • ${t.clicks||0} clicks • ${t.conversions||0} conv`; if ((t.conversions||0)===0 && (t.cost||0)>=2.82) action='add_exact_negative'; else if (cpc>0.5 && ctr<0.02) action='lower_cpc_ceiling'; return { label:t.term, reason, action, target }; });

    const debug_counts = { met_scanned, met_in_window, sts_scanned, sts_in_window };
    const data = { ok:true, w, kpi:{ clicks, cost, conversions:conv, impressions:imp, ctr, cpc, cpa }, top_terms, series, explain, debug_counts };
    insightsCache.set(cacheKey, { ts: nowMs, data });
    return json(res, 200, data);
  } catch (e) { return json(res, 500, { ok:false, code:'INSIGHTS', error:String(e) }); }
});

// ----- Terms Explorer (HMAC) -----
app.get('/api/insights/terms', async (req, res) => {
  const { tenant, sig } = req.query;
  const w = (String(req.query.w||'7d').toLowerCase());
  const q = String(req.query.q||'').toLowerCase();
  const campaignLike = String(req.query.campaign||'').toLowerCase();
  const minClicks = Number(req.query.min_clicks||0);
  const minCost = Number(req.query.min_cost||0);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit||200))); // legacy cap
  const sort = String(req.query.sort||'cost'); // cost|clicks|conversions|cpc|cpa|term
  const dir  = (String(req.query.dir||'desc').toLowerCase()==='asc')?'asc':'desc';
  const page = Math.max(1, parseInt(String(req.query.page||'1'),10));
  const pageSize = Math.min(500, Math.max(10, parseInt(String(req.query.page_size||'50'),10)));
  const includeTotal = String(req.query.include_total||'false') === 'true';
  const payload = `GET:${tenant}:insights_terms`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const ST_HEADERS = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const rowsAoA = await readRowsAoA(String(tenant), 'SEARCH_TERMS', ST_HEADERS, 5000);
    const toObj = (r)=>({ date:r[0], campaign:r[1], ad_group:r[2], search_term:r[3], clicks:Number(r[4]||0), cost:Number(r[5]||0), conversions:Number(r[6]||0) });
    const objs = rowsAoA.map(toObj);
    const horizon = (()=>{ const now=Date.now(); if (w==='24h') return now-24*60*60*1000; if (w==='30d') return now-30*24*60*60*1000; return now-7*24*60*60*1000; })();
    const bucket = new Map();
    for (const r of objs){
      const ts = Date.parse(String(r.date||'')); if (!isFinite(ts) || ts < horizon) continue;
      const term = String(r.search_term||'').trim().toLowerCase(); if (!term) continue;
      if (q && !term.includes(q)) continue;
      if (campaignLike && !String(r.campaign||'').toLowerCase().includes(campaignLike)) continue;
      const cur = bucket.get(term) || { term, clicks:0, cost:0, conversions:0 };
      cur.clicks += Number(r.clicks||0);
      cur.cost += Number(r.cost||0);
      cur.conversions += Number(r.conversions||0);
      bucket.set(term, cur);
    }
    let rows = Array.from(bucket.values()).filter(r => r.clicks >= minClicks && r.cost >= minCost);
    rows.sort((a,b)=> b.cost-a.cost || b.clicks-a.clicks);
    // load negatives to flag existing ones + locations
    let negSet = new Set();                 // account exact
    let negAccPhrase = new Set();           // account phrase
    let negCampaigns = new Map();           // term -> Set(campaign)
    let negAdGroups = new Map();            // term -> Set(`${campaign} › ${ad_group}`)
    try {
      const doc = await getDoc();
      if (doc) {
        const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ['term']);
        const nrows = await nsh.getRows();
        negSet = new Set(nrows.map(r => String(r.term||'').trim().toLowerCase()));

        const map = await ensureNegativeMapSheet(String(tenant));
        if (map) {
          const mrows = await map.getRows();
          for (const r of mrows) {
            const t = String(r.term||'').trim().toLowerCase();
            const m = String(r.match||'').toLowerCase();
            const sc = String(r.scope||'').toLowerCase();
            if (!t) continue;
            if (sc==='account' && m==='phrase') negAccPhrase.add(t);
            if (sc==='campaign') {
              const c = String(r.campaign||'');
              if (c) { const S = negCampaigns.get(t)||new Set(); S.add(c); negCampaigns.set(t,S); }
            }
            if (sc==='ad_group') {
              const c = String(r.campaign||''); const g = String(r.ad_group||'');
              if (c && g) { const S = negAdGroups.get(t)||new Set(); S.add(`${c} › ${g}`); negAdGroups.set(t,S); }
            }
          }
        }
      }
    } catch {}
    // build enriched rows first (no sort/page yet)
    rows = rows.map(r => {
      const termLc = String(r.term||'').toLowerCase();
      return {
        term: r.term,
        clicks: r.clicks,
        cost: r.cost,
        conversions: r.conversions,
        cpc: r.clicks ? r.cost/r.clicks : 0,
        cpa: r.conversions ? r.cost/r.conversions : 0,
        is_negative: negSet.has(termLc) || negAccPhrase.has(termLc) || negCampaigns.has(termLc) || negAdGroups.has(termLc),
        is_negative_account_exact: negSet.has(termLc),
        is_negative_account_phrase: negAccPhrase.has(termLc),
        in_campaigns: Array.from(negCampaigns.get(termLc)||[]),
        in_ad_groups: Array.from(negAdGroups.get(termLc)||[])
      };
    });

    // sort
    rows.sort((a,b)=>{
      const k = sort;
      const av = (k==='term') ? String(a.term) : Number(a[k]||0);
      const bv = (k==='term') ? String(b.term) : Number(b[k]||0);
      if (k==='term') return dir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir==='asc' ? (av-bv) : (bv-av);
    });

    const total = rows.length;
    const start = (page-1)*pageSize;
    const slice = rows.slice(start, start+pageSize);
    const paged = slice.slice(0, limit);
    const meta = includeTotal ? { total, page, page_size: pageSize, pages: Math.max(1, Math.ceil(total/pageSize)) } : {};
    return json(res, 200, { ok:true, w: (w==='24h'||w==='30d')?w:'7d', count: paged.length, rows: paged, ...meta });
  } catch (e) { return json(res, 500, { ok:false, code:'TERMS', error:String(e) }); }
});

// ----- Terms CSV (HMAC) -----
app.get('/api/insights/terms.csv', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:insights_terms`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    // Reuse logic by calling JSON endpoint aggregation inline (duplicated minimal flow):
    const w = (String(req.query.w||'7d').toLowerCase());
    const q = String(req.query.q||'').toLowerCase();
    const campaignLike = String(req.query.campaign||'').toLowerCase();
    const minClicks = Number(req.query.min_clicks||0);
    const minCost = Number(req.query.min_cost||0);
    const sort = String(req.query.sort||'cost');
    const dir  = (String(req.query.dir||'desc').toLowerCase()==='asc')?'asc':'desc';
    const page = Math.max(1, parseInt(String(req.query.page||'1'),10));
    const pageSize = Math.min(2000, Math.max(10, parseInt(String(req.query.page_size||'1000'),10)));

    const ST_HEADERS = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const rowsAoA = await readRowsAoA(String(tenant), 'SEARCH_TERMS', ST_HEADERS, 5000);
    const toObj = (r)=>({ date:r[0], campaign:r[1], ad_group:r[2], search_term:r[3], clicks:Number(r[4]||0), cost:Number(r[5]||0), conversions:Number(r[6]||0) });
    const objs = rowsAoA.map(toObj);
    const horizon = (()=>{ const now=Date.now(); if (w==='24h') return now-24*60*60*1000; if (w==='30d') return now-30*24*60*60*1000; return now-7*24*60*60*1000; })();
    const bucket = new Map();
    for (const r of objs){
      const ts = Date.parse(String(r.date||'')); if (!isFinite(ts) || ts < horizon) continue;
      const term = String(r.search_term||'').trim().toLowerCase(); if (!term) continue;
      if (q && !term.includes(q)) continue;
      if (campaignLike && !String(r.campaign||'').toLowerCase().includes(campaignLike)) continue;
      const cur = bucket.get(term) || { term, clicks:0, cost:0, conversions:0 };
      cur.clicks += Number(r.clicks||0);
      cur.cost += Number(r.cost||0);
      cur.conversions += Number(r.conversions||0);
      bucket.set(term, cur);
    }
    let rows = Array.from(bucket.values()).filter(r => r.clicks >= minClicks && r.cost >= minCost);
    // Enrich negatives presence
    let negSet = new Set(); let negAccPhrase = new Set(); let negCampaigns = new Map(); let negAdGroups = new Map();
    try {
      const doc = await getDoc();
      if (doc) {
        const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ['term']);
        const nrows = await nsh.getRows(); negSet = new Set(nrows.map(r => String(r.term||'').trim().toLowerCase()));
        const map = await ensureNegativeMapSheet(String(tenant));
        if (map) {
          const mrows = await map.getRows();
          for (const r of mrows) {
            const t = String(r.term||'').trim().toLowerCase(); const m = String(r.match||'').toLowerCase(); const sc = String(r.scope||'').toLowerCase();
            if (!t) continue;
            if (sc==='account' && m==='phrase') negAccPhrase.add(t);
            if (sc==='campaign') { const c=String(r.campaign||''); if (c){ const S=negCampaigns.get(t)||new Set(); S.add(c); negCampaigns.set(t,S); } }
            if (sc==='ad_group') { const c=String(r.campaign||''); const g=String(r.ad_group||''); if (c&&g){ const S=negAdGroups.get(t)||new Set(); S.add(`${c} › ${g}`); negAdGroups.set(t,S);} }
          }
        }
      }
    } catch {}
    rows = rows.map(r=>{
      const termLc = String(r.term||'').toLowerCase();
      return {
        term: r.term,
        clicks: r.clicks,
        cost: r.cost,
        conversions: r.conversions,
        cpc: r.clicks ? r.cost/r.clicks : 0,
        cpa: r.conversions ? r.cost/r.conversions : 0,
        is_negative_account_exact: negSet.has(termLc),
        is_negative_account_phrase: negAccPhrase.has(termLc),
        in_campaigns: Array.from(negCampaigns.get(termLc)||[]),
        in_ad_groups: Array.from(negAdGroups.get(termLc)||[])
      };
    });
    rows.sort((a,b)=>{
      const k = sort; const av = (k==='term')? String(a.term) : Number(a[k]||0); const bv = (k==='term')? String(b.term) : Number(b[k]||0);
      if (k==='term') return dir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir==='asc' ? (av-bv) : (bv-av);
    });
    const start = (page-1)*pageSize; const slice = rows.slice(start, start+pageSize);
    const header = ['term','clicks','cost','conversions','cpc','cpa','is_negative_account_exact','is_negative_account_phrase','in_campaigns','in_ad_groups'];
    const csv = [header.join(',')].concat(slice.map(r=>{
      const camps = (r.in_campaigns||[]).join('|'); const adgs = (r.in_ad_groups||[]).join('|');
      return [
        r.term,
        r.clicks,
        r.cost,
        r.conversions,
        (r.cpc||0).toFixed(4),
        (r.cpa||0).toFixed(4),
        r.is_negative_account_exact?1:0,
        r.is_negative_account_phrase?1:0,
        `"${camps}"`,
        `"${adgs}"`
      ].join(',');
    })).join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="terms_${tenant}_${String(req.query.w||'7d')}.csv"`);
    return res.send(csv);
  } catch(e){ return json(res, 500, { ok:false, code:'TERMS_CSV', error:String(e) }); }
});

// ----- Apply Insights Actions (HMAC) -----
// Body: { nonce, actions: [{ type:'add_exact_negative'|'lower_cpc_ceiling', target:string, campaign?:string, amount?:number }] }
app.post('/api/insights/actions/apply', promoteGateMiddleware('INSIGHTS_ACTIONS'), async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), actions = [] } = req.body || {};
  const payload = `POST:${tenant}:insights_actions:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    // Preload existing negatives for duplicate-aware skipping
    const existing = new Set();
    try {
      const doc = await getDoc();
      if (doc) {
        const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, ['term']);
        const nrows = await nsh.getRows();
        for (const r of nrows) existing.add(`account|exact|||${String(r.term||'').trim().toLowerCase()}`);
        const map = await ensureNegativeMapSheet(String(tenant));
        if (map) {
          const mrows = await map.getRows();
          for (const r of mrows) {
            existing.add(`${String(r.scope||'').toLowerCase()}|${String(r.match||'').toLowerCase()}|${String(r.campaign||'')}|${String(r.ad_group||'')}|${String(r.term||'').trim().toLowerCase()}`);
          }
        }
      }
    } catch {}
    const now = Date.now();
    const applied = []; const errors = []; const skipped = [];
    for (const a of (Array.isArray(actions)?actions:[])) {
      const type = String(a?.type||'').toLowerCase();
      const target = (a?.target ?? a?.term ?? '').toString().trim();
      const scope = String(a?.scope||'account').toLowerCase();
      const match = String(a?.match||'exact').toLowerCase();
      const campaign = (a?.campaign ?? '*').toString().trim() || '*';
      const amount = Number(a?.amount);
      const key = `${tenant}:${type}:${scope}:${campaign}:${a?.ad_group||''}:${match}:${target}:${isFinite(amount)?amount:''}`;
      const last = actionDedupe.get(key) || 0;
      if (now - last < 120_000) { skipped.push({ type, target, reason:'recent_duplicate' }); continue; }
      const comboKey = (type==='add_negative'||type==='remove_negative')
        ? `${scope}|${match}|${a?.campaign||''}|${a?.ad_group||''}|${target.toLowerCase()}`
        : (type==='add_exact_negative'||type==='remove_exact_negative')
          ? `account|exact|||${target.toLowerCase()}`
          : '';
      if (type==='add_negative' || type==='add_exact_negative') {
        if (comboKey && existing.has(comboKey)) { skipped.push({ type, target, reason:'already_exists' }); continue; }
      }
      try {
        if (type === 'add_exact_negative') {
          if (!target) throw new Error('missing_target');
          await appendMasterNegative(String(tenant), target);
          applied.push({ type, target, campaign });
        } else if (type === 'add_negative') {
          if (!target) throw new Error('missing_target');
          if (scope === 'account' && match === 'exact') {
            await appendMasterNegative(String(tenant), target);
          } else {
            await addScopedNegative(String(tenant), { scope, campaign: a?.campaign||'', ad_group: a?.ad_group||'', match, term: target });
          }
          applied.push({ type, target, scope, match, campaign: a?.campaign||'', ad_group: a?.ad_group||'' });
        } else if (type === 'remove_exact_negative') {
          if (!target) throw new Error('missing_target');
          await removeMasterNegative(String(tenant), target);
          applied.push({ type, target, campaign });
        } else if (type === 'remove_negative') {
          if (!target) throw new Error('missing_target');
          if (scope === 'account' && match === 'exact') {
            await removeMasterNegative(String(tenant), target);
          } else {
            await removeScopedNegative(String(tenant), { scope, campaign: a?.campaign||'', ad_group: a?.ad_group||'', match, term: target });
          }
          applied.push({ type, target, scope, match, campaign: a?.campaign||'', ad_group: a?.ad_group||'' });
        } else if (type === 'lower_cpc_ceiling') {
          if (!isFinite(amount)) throw new Error('missing_amount');
          await upsertMapValue(String(tenant), 'CPC_CEILINGS', campaign, amount);
          applied.push({ type, campaign, amount });
        } else {
          throw new Error('unsupported_type');
        }
        actionDedupe.set(key, now);
        if (comboKey) existing.add(comboKey);
      } catch (e) {
        errors.push({ type, target, campaign, error: String(e) });
      }
    }
    try { await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `insights_actions:${applied.length}`]]); } catch {}
    try { insightsCache.clear(); } catch {}
    return json(res, 200, { ok:true, applied, skipped, errors });
  } catch (e) { return json(res, 500, { ok:false, code:'ACTIONS', error:String(e) }); }
});

// ----- Insights debug (HMAC) -----
app.get('/api/insights/debug', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:insights`;
  if (!tenant || !verify(String(sig||''), payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const MET_HEADERS = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
    const ST_HEADERS  = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const metAoA = await readRowsAoA(String(tenant), 'METRICS', MET_HEADERS, 50);
    const stsAoA = await readRowsAoA(String(tenant), 'SEARCH_TERMS', ST_HEADERS, 50);
    const toObj = (rows, headers) => rows.map(r => Object.fromEntries(headers.map((h,i)=>[h, r[i]])));
    const met = toObj(metAoA, MET_HEADERS);
    const sts = toObj(stsAoA, ST_HEADERS);
    const preview = (rows) => rows.slice(-5).map(r=>{
      const raw = r?.date ?? r?.timestamp ?? r?.ts ?? '';
      let parsed = NaN;
      if (raw instanceof Date) parsed = raw.getTime();
      else {
        const n = Number(raw);
        if (Number.isFinite(n)) {
          if (n > 10_000_000_000) parsed = n; else if (n > 10_000 && n < 1_000_000) parsed = (n - 25569) * 86400 * 1000;
        }
        if (!Number.isFinite(parsed)) {
          const p = Date.parse(String(raw).trim());
          if (Number.isFinite(p)) parsed = p;
        }
      }
      return { ...r, _parsed_ts: Number.isFinite(parsed) ? parsed : null };
    });
    return json(res, 200, { ok:true, sample: { met: preview(met), sts: preview(sts) } });
  } catch(e){ return json(res, 500, { ok:false, code:'DEBUG', error:String(e) }); }
});

// ----- Run logs (HMAC) -----
app.get('/api/run-logs', async (req, res) => {
  const { tenant, sig } = req.query;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit||10)));
  const payload = `GET:${tenant}:run_logs`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const doc = await getDoc(); if (!doc) return json(res, 200, { ok:true, rows:[] });
    const sh = await ensureSheet(doc, `RUN_LOGS_${tenant}`, ['timestamp','message']);
    const rows = await sh.getRows();
    const out = rows.slice(Math.max(0, rows.length-limit)).map(r => ({ timestamp: String(r.timestamp||''), message: String(r.message||'') }));
    return json(res, 200, { ok:true, rows: out.reverse() });
  } catch (e) { return json(res, 500, { ok:false, code:'RUN_LOGS', error:String(e) }); }
});

// ----- Audience exports list -----
app.get('/api/audiences/export/list', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:audiences_export_list`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc(); if (!doc) return res.json({ ok:true, rows: [] });
    const sh = await ensureSheet(doc, `AUDIENCE_EXPORT_${tenant}`, ['file_name','segment_key','format','row_count','last_built_at','storage_url']);
    const rows = await sh.getRows();
    res.json({ ok:true, rows: rows.map(r=>({ file_name:r.file_name, segment_key:r.segment_key, format:r.format, row_count:Number(r.row_count||0), last_built_at:r.last_built_at, storage_url:r.storage_url })) });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Promote window -----
app.post('/api/promote/window', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), start_at='now+2m', duration_minutes=60 } = req.body || {};
  const payload = `POST:${tenant}:promote_window:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const startMs = (()=>{ if (String(start_at).startsWith('now+')){ const m = String(start_at).match(/now\+(\d+)m/i); return Date.now() + (m?Number(m[1]):2)*60*1000; } const t = Date.parse(String(start_at)); return isFinite(t)? t : (Date.now()+2*60*1000); })();
    const out = await schedulePromoteWindow(String(tenant), startMs, Number(duration_minutes||60));
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `promote_window_scheduled:${duration_minutes}`]]); } catch {}
    res.json(out.ok? { ok:true } : { ok:false, error: out.error||'schedule_failed' });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// naive in-process pulse (no-op if no schedule)
setInterval(()=>{ tickPromoteWindow('TENANT_123').catch(()=>{}); }, 60_000);

// ----- Audience map upsert (helper) -----
app.post('/api/audiences/mapUpsert', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), rows=[] } = req.body || {};
  const payload = `POST:${tenant}:audiences_map_upsert:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc(); if (!doc) return res.json({ ok:true, upserted: 0 });
    const sh = await ensureSheet(doc, `AUDIENCE_MAP_${tenant}`, ['campaign','ad_group','user_list_id','mode','bid_modifier']);
    for (const r of rows) {
      await sh.addRow({
        campaign: String(r.campaign||'').trim(),
        ad_group: String(r.ad_group||'').trim(),
        user_list_id: String(r.user_list_id||'').trim(),
        mode: String(r.mode||'OBSERVE').toUpperCase(),
        bid_modifier: String(r.bid_modifier||'')
      });
    }
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `aud_map_upsert:${rows.length}`]]); } catch {}
    res.json({ ok:true, upserted: rows.length });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- AI Writer job (optional) -----
app.post('/api/jobs/ai_writer', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), dryRun=true, limit=5 } = req.body || {};
  const payload = `POST:${tenant}:ai_writer:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const provider = (process.env.AI_PROVIDER||'').toLowerCase();
    if (provider==='openai' && !process.env.OPENAI_KEY) return res.status(400).json({ ok:false, error:'OPENAI_KEY missing' });
    if (provider==='anthropic' && !process.env.ANTHROPIC_KEY) return res.status(400).json({ ok:false, error:'ANTHROPIC_KEY missing' });
    if (dryRun){
      try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), 'ai_writer_dry_run']]); } catch {}
      return res.json({ ok:true, dryRun:true, limit });
    }
    // Shell out to node job to avoid ESM interop here
    const { spawn } = await import('child_process');
    const p = spawn('node', ['backend/jobs/ai_writer.js', `--tenant=${tenant}`, `--limit=${limit}`], { shell: true, env: process.env });
    p.on('close', async (code)=>{
      try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `ai_writer_exit:${code}`]]); } catch {}
    });
    res.json({ ok:true, started:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Weekly summary -----
app.post('/api/jobs/weekly_summary', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now() } = req.body || {};
  const payload = `POST:${tenant}:weekly_summary:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const out = await runWeeklySummary(String(tenant));
    res.json(out);
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// ----- Pixels ingest (HMAC) -----
app.post('/api/pixels/ingest', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), shop = '', event = '', payload = {} } = req.body || {};
  const payloadSig = `POST:${tenant}:pixel_ingest:${nonce}`;
  if (!tenant || !verify(sig, payloadSig)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    // Minimal PII-safe logging
    const label = String(event||'').toLowerCase();
    let msg = `pixel:${label}`;
    try {
      if (label==='purchase_completed' || label==='purchase' || label==='checkout_completed'){
        const v = Number(payload?.value||payload?.amount||payload?.total||0);
        const items = Number(payload?.items||payload?.line_items||0);
        msg += ` $${(v||0).toFixed(2)} items=${items||0}`;
      } else if (label==='cart_viewed'){
        const v = Number(payload?.value||0); msg += ` $${(v||0).toFixed(2)}`;
      } else if (label==='product_viewed'){
        const h = String(payload?.handle||payload?.product_handle||''); if (h) msg += ` ${h}`;
      } else if (label==='search_submitted'){
        const q = String(payload?.query||''); if (q) msg += ` q=${q.slice(0,40)}`;
      }
    } catch {}
    try { await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), msg]]); } catch {}
    return json(res, 200, { ok:true });
  } catch (e) { return json(res, 500, { ok:false, code:'PIXEL', error:String(e) }); }
});

// ----- Shopify SEO helpers (placeholder session) -----
async function getShopSession(shop){
  // Placeholder: wire real token after OAuth lands
  return null;
}

function applyTemplateToString(templateStr, vars){
  let out = String(templateStr||'');
  Object.entries(vars||{}).forEach(([k,v])=>{ out = out.replaceAll(`{{${k}}}`, String(v||'')); });
  return out.trim().slice(0, 140);
}

// ----- Shopify SEO Preview (HMAC) -----
app.post('/api/shopify/seo/preview', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), shop='', productIds=[], strategy='template', templateTitle='{{title}} | Free Shipping', templateDescription='Discover {{title}} by {{brand}}. Shop now with fast, free shipping.' } = req.body||{};
  const payload = `POST:${tenant}:seo_preview:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const ids = Array.isArray(productIds)?productIds:[];
    // Mock data for now (no OAuth): derive from ID
    const proposals = ids.map((id)=>{
      const vars = { title: `Product ${id}`, brand: 'Brand' };
      return {
        productId: id,
        title: strategy==='template' ? applyTemplateToString(templateTitle, vars) : `${vars.title} | Best Deal` ,
        description: strategy==='template' ? applyTemplateToString(templateDescription, vars) : `Get ${vars.title} today with fast shipping and easy returns.`,
        images: [{ id: `img_${id}_1`, altText: `${vars.title} image` }]
      };
    });
    try { await appendRows(String(tenant),'RUN_LOGS',['timestamp','message'],[[new Date().toISOString(),`seo_preview:${proposals.length}`]]);} catch {}
    return json(res, 200, { ok:true, proposals, dry: true });
  } catch(e){ return json(res, 500, { ok:false, code:'SEO_PREVIEW', error:String(e) }); }
});

// ----- Shopify SEO Apply (HMAC) -----
app.post('/api/shopify/seo/apply', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), shop='', changes=[] } = req.body||{};
  const payload = `POST:${tenant}:seo_apply:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const session = await getShopSession(String(shop||''));
    const dry = !session;
    let applied = 0;
    if (!dry){
      // Placeholder: implement GraphQL productUpdate/productImageUpdate using session token
      applied = (Array.isArray(changes)?changes:[]).length;
    }
    try { await appendRows(String(tenant),'RUN_LOGS',['timestamp','message'],[[new Date().toISOString(),`seo_apply:${dry?'dry:':''}${(Array.isArray(changes)?changes:[]).length}`]]);} catch {}
    return json(res, 200, { ok:true, applied, dry });
  } catch(e){ return json(res, 500, { ok:false, code:'SEO_APPLY', error:String(e) }); }
});

// ----- Shopify Tags batch (HMAC) -----
app.post('/api/shopify/tags/batch', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), shop='', productIds=[], add=[], remove=[] } = req.body||{};
  const payload = `POST:${tenant}:tags_batch:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok:false, code:'AUTH' });
  try {
    const session = await getShopSession(String(shop||''));
    const dry = !session;
    const ids = Array.isArray(productIds)?productIds:[];
    try { await appendRows(String(tenant),'RUN_LOGS',['timestamp','message'],[[new Date().toISOString(),`tags_batch:${dry?'dry:':''}${ids.length}:${(add||[]).length}+/${(remove||[]).length}-`]]);} catch {}
    return json(res, 200, { ok:true, updated: ids.length, dry });
  } catch(e){ return json(res, 500, { ok:false, code:'TAGS_BATCH', error:String(e) }); }
});

// ----- AI drafts list (HMAC) -----
app.get('/api/ai/drafts', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_drafts`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok:true, rsa_default: [], library: [], sitelinks: [], callouts: [], snippets: [] });
    const byTitle = doc.sheetsByTitle || {};
    const out = { rsa_default: [], library: [], sitelinks: [], callouts: [], snippets: [] };
    // Default RSA
    const defTitle = `RSA_ASSETS_DEFAULT_${tenant}`;
    if (byTitle[defTitle]) {
      const sh = byTitle[defTitle];
      const rows = await sh.getRows();
      if (rows && rows.length) {
        const H = String(rows[0].headlines_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
        const D = String(rows[0].descriptions_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
        const lint = validateRSA(H, D);
        out.rsa_default.push({ theme: 'default', headlines: H, descriptions: D, lint });
      }
    }
    // Library RSA (theme-level rows)
    const libTitle = `ASSET_LIBRARY_${tenant}`;
    if (byTitle[libTitle]) {
      const sh = byTitle[libTitle];
      const rows = await sh.getRows();
      for (const r of rows) {
        const theme = String(r.theme||'').trim() || 'theme';
        const H = (String(r.headlines_pipe||'').split('|').map(s=>s.trim()).filter(Boolean));
        const D = (String(r.descriptions_pipe||'').split('|').map(s=>s.trim()).filter(Boolean));
        const source = String(r.source||'');
        const lint = validateRSA(H, D);
        out.library.push({ theme, headlines: H, descriptions: D, source, lint });
      }
    }
    // Sitelinks
    const slTitle = `SITELINKS_${tenant}`;
    if (byTitle[slTitle]) {
      const sh = byTitle[slTitle];
      const rows = await sh.getRows();
      out.sitelinks = rows.map(r => ({ text: String(r.text||''), final_url: String(r.final_url||'') }));
    }
    // Callouts
    const coTitle = `CALLOUTS_${tenant}`;
    if (byTitle[coTitle]) {
      const sh = byTitle[coTitle];
      const rows = await sh.getRows();
      out.callouts = rows.map(r => ({ text: String(r.text||'') }));
    }
    // Snippets
    const snTitle = `SNIPPETS_${tenant}`;
    if (byTitle[snTitle]) {
      const sh = byTitle[snTitle];
      const rows = await sh.getRows();
      out.snippets = rows.map(r => ({ header: String(r.header||''), values: String(r.values_pipe||'').split('|').map(s=>s.trim()).filter(Boolean) }));
    }
    res.json({ ok:true, ...out });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ----- Connect Wizard: test/save Sheets -----
app.post('/api/connect/sheets/test', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), sheetId='' } = req.body || {};
  const payload = `POST:${tenant}:sheets_test:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    if (!sheetId) return res.json({ ok:false, error:'missing_sheetId' });
    const doc = await getDocById(String(sheetId));
    if (!doc) return res.json({ ok:false, error:'auth_or_load_failed' });
    await ensureSheet(doc, `CONFIG_${tenant}`, ['key','value']);
    return res.json({ ok:true });
  } catch (e) { res.json({ ok:false, error:String(e) }); }
});

app.post('/api/connect/sheets/save', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), sheetId='' } = req.body || {};
  const payload = `POST:${tenant}:sheets_save:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    if (!sheetId) return res.json({ ok:false, error:'missing_sheetId' });
    process.env.SHEET_ID = String(sheetId);
    await ensureAudienceTabs(String(tenant));
    return res.json({ ok:true });
  } catch (e) { res.json({ ok:false, error:String(e) }); }
});

// ----- Ads Script delivery (HMAC) -----
app.get('/api/ads-script/raw', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:script_raw`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const tenantId = String(tenant || 'TENANT_123');
    const primary = path.resolve('/Users/tamsar/Downloads/proofkit-saas', 'ads-script', 'master.gs');
    const fallback = path.resolve(process.cwd(), '..', 'ads-script', 'master.gs');
    const filePath = fs.existsSync(primary) ? primary : fallback;
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const out = raw
      .replace(/__BACKEND_URL__/g, (process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001/api').replace(/\/$/, ''))
      .replace(/__TENANT_ID__/g, tenantId)
      .replace(/__HMAC_SECRET__/g, (process.env.HMAC_SECRET || ''));
    res.set('content-type', 'text/plain; charset=utf-8');
    return res.status(200).send(out);
  } catch (e) {
    return res.status(404).json({ ok:false, error:String(e) });
  }
});

// ----- AI drafts accept (HMAC) -----
app.post('/api/ai/accept', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), items=[] } = req.body || {};
  const payload = `POST:${tenant}:ai_accept:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc();
    if (!doc) return res.json({ ok:true, accepted: 0, errors: ['no_sheets'] });
    const defaultSheet = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, ['headlines_pipe','descriptions_pipe']);
    const libSheet = await ensureSheet(doc, `ASSET_LIBRARY_${tenant}`, ['theme','headlines_pipe','descriptions_pipe','source']);
    let accepted = 0; const errors = [];
    for (const it of (Array.isArray(items)?items:[])){
      const H = String(it.headlines_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
      const D = String(it.descriptions_pipe||'').split('|').map(s=>s.trim()).filter(Boolean);
      const lint = validateRSA(H, D);
      if (!lint.ok) { errors.push({ theme: it.theme||'', errors: lint.errors }); continue; }
      // Write to library
      await libSheet.addRow({ theme: String(it.theme||'default'), headlines_pipe: lint.clipped.h.join('|'), descriptions_pipe: lint.clipped.d.join('|'), source: String(it.source||'accepted') });
      accepted += 1;
    }
    // Also set DEFAULT to the first accepted (if any)
    if (accepted > 0){
      const rows = await libSheet.getRows();
      const last = rows[rows.length-1];
      const H = String(last.headlines_pipe||'');
      const D = String(last.descriptions_pipe||'');
      const cur = await defaultSheet.getRows();
      if (cur.length){
        cur[0].headlines_pipe = H; cur[0].descriptions_pipe = D; await cur[0].save();
      } else {
        await defaultSheet.addRow({ headlines_pipe: H, descriptions_pipe: D });
      }
    }
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `ai_accept:${accepted}`]]); } catch {}
    res.json({ ok:true, accepted, errors });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// ----- Promote status (HMAC) -----
app.get('/api/promote/status', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:promote_status`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const doc = await getDoc();
    const now = Date.now();
    let start=null, end=null, state='inactive';
    if (doc){
      const meta = await ensureSheet(doc, `PROMOTE_WINDOW_${tenant}`, ['start_at_ms','end_at_ms','state']);
      const rows = await meta.getRows();
      if (rows.length){
        start = Number(rows[0].start_at_ms||0) || null;
        end = Number(rows[0].end_at_ms||0) || null;
        if (start && now < start) state = 'scheduled';
        else if (start && end && now >= start && now < end) state = 'active';
        else state = 'inactive';
      }
    }
    // Current PROMOTE flag
    let promote=false; let caps = {}; let exclusions=[];
    try {
      const cfg = await readConfigFromSheets(String(tenant));
      promote = !!cfg?.PROMOTE;
      // optional: surface defaults as caps
      caps = { budgetCap: cfg?.daily_budget_cap_default, cpcCeiling: cfg?.cpc_ceiling_default };
    } catch {}
    res.json({ ok:true, now, window: { start, end, state }, promote, caps, exclusions });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// ----- Audience export build (stub) -----
app.post('/api/audiences/export/build', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), segments=[], format='UI' } = req.body || {};
  const payload = `POST:${tenant}:audiences_export_build:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const result = await buildSegments(String(tenant), Array.isArray(segments)?segments:[], String(format).toUpperCase()==='API'?'API':'UI');
    try { await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), `aud_export_build:${format}:${(result.built||[]).length}`]]); } catch {}
    res.json({ ok:true, built: result.built||[], skipped: result.skipped||[] });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// Initialize health checks
try {
  // Register custom health checks for external services
  const sheetsService = { 
    testConnection: async () => {
      const doc = await getDoc();
      if (!doc) throw new Error('Google Sheets not accessible');
      return true;
    }
  };
  
  healthService.registerSheetsCheck(sheetsService);

  // Register AI service health check if available
  if (process.env.GEMINI_API_KEY) {
    const aiService = {
      testConnection: async () => {
        // Simple test - could be enhanced with actual API call
        if (!process.env.GEMINI_API_KEY.startsWith('AIza')) {
          throw new Error('Invalid Gemini API key format');
        }
        return true;
      }
    };
    healthService.registerGeminiCheck(aiService);
  }

  // Start health monitoring
  healthService.startMonitoring();
  
  logger.info('Health monitoring initialized', {
    checks: Array.from(healthService.checks.keys())
  });
} catch (error) {
  logger.error('Failed to initialize health monitoring', { error: error.message });
}

// Add error handling middleware
app.use(logger.errorMiddleware());

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown...');
  
  try {
    healthService.stopMonitoring();
    await logger.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, starting graceful shutdown...');
  
  try {
    healthService.stopMonitoring();
    await logger.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
});

// Production deployment safety check (disabled for Vercel compatibility)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  try {
    // Run comprehensive startup validation (skip in Vercel serverless environment)
    const bootValidation = (await import('./services/boot-validation.js')).default;
    const results = await bootValidation.validateSystemServices();
    
    // Check for critical security issues
    if (results.hmacSecurity?.status === 'critical') {
      logger.error('🛑 PRODUCTION DEPLOYMENT BLOCKED: Critical HMAC security issue detected');
      logger.error('   Fix HMAC_SECRET before production deployment');
      process.exit(1);
    }
    
    // Log security status
    logger.info('✅ Production security validation passed', {
      hmacSecurityStatus: results.hmacSecurity?.status,
      hmacLength: results.hmacSecurity?.length,
      hmacEntropy: results.hmacSecurity?.entropy?.toFixed(2) + ' bits/char'
    });
    
  } catch (error) {
    logger.error('🛑 PRODUCTION STARTUP VALIDATION FAILED:', error.message);
    process.exit(1);
  }
}

// Start the server (works for both local and Vercel)
app.listen(PORT, ()=> {
    logger.info('ProofKit backend server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      sheetsAuth: process.env.GOOGLE_SERVICE_EMAIL ? 'service_account' : 'unknown',
      hmacSecurityInitialized: true,
    pid: process.pid
  });
  
  // Start always-on automation jobs for all tenants
  const jobScheduler = new JobScheduler();
  
  // Add all tenants from registry (dynamic multi-tenant)
  const tenantRegistryJson = process.env.TENANT_REGISTRY_JSON;
  const activeTenants = [];
  if (tenantRegistryJson) {
    const tenants = JSON.parse(tenantRegistryJson);
    Object.keys(tenants).forEach(tenantId => {
      jobScheduler.addTenant(tenantId);
      activeTenants.push(tenantId);
    });
  }
  
  jobScheduler.start();
  
  logger.info('ProofKit automation jobs started', {
    tenants: activeTenants,
    jobs: ['anomaly_detection', 'weekly_summary'],
    intervals: ['15min', 'weekly'],
    note: 'Always-on automation for all registered tenants'
  });
  
  console.log(`🚀 ProofKit SaaS backend server running on port ${PORT}`);
  console.log(`📊 Health checks available at: http://localhost:${PORT}/health`);
  console.log(`🔍 Metrics available at: http://localhost:${PORT}/metrics`);
  console.log(`📈 Sheets auth: ${process.env.GOOGLE_SERVICE_EMAIL ? 'service_account ' + process.env.GOOGLE_SERVICE_EMAIL : 'unknown'}`);
});

// ----- Autopilot QuickStart (HMAC) -----
app.post('/api/autopilot/quickstart', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce=Date.now(), mode='protect', daily_budget=3, cpc_ceiling=0.2, final_url='https://example.com', start_in_minutes=2, duration_minutes=60 } = req.body || {};
  const payload = `POST:${tenant}:autopilot_quickstart:${nonce}`;
  if (!tenant || !verify(sig, payload)) return res.status(403).json({ ok:false, error:'auth' });
  try {
    const sheetsOk = !!(await getDoc());
    const aiReady = (process.env.AI_PROVIDER||'').toLowerCase()==='google' && !!process.env.GOOGLE_API_KEY;
    if (!sheetsOk) return res.json({ ok:false, code:'SHEETS', message:'Connect Google Sheets first.' });
    // Ensure tenant tabs and baseline config exist
    await bootstrapTenant(String(tenant));
    const plan = mode==='scale' ? 'growth' : (mode==='grow' ? 'pro' : 'starter');
    await upsertConfigKeys(String(tenant), {
      PLAN: plan,
      default_final_url: String(final_url||''),
      daily_budget_cap_default: String(daily_budget),
      cpc_ceiling_default: String(cpc_ceiling)
    });
    let accepted = 0; const warnings = [];
    if (aiReady){
      try {
        // Best-effort: accept any existing valid drafts; generation is optional
        accepted = await acceptTopValidDrafts(String(tenant), 4);
        if (accepted === 0) warnings.push('no_drafts_found');
      } catch(e){ warnings.push('ai_accept_failed'); }
    } else {
      warnings.push('ai_not_configured');
    }
    const start = Date.now() + Number(start_in_minutes||2)*60*1000;
    const end = start + Number(duration_minutes||60)*60*1000;
    try { await schedulePromoteWindow(String(tenant), start, Number(duration_minutes||60)); } catch {}
    try { await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], [[new Date().toISOString(), 'autopilot_quickstart']]); } catch {}
    return res.json({ ok:true, plan, scheduled:{ start, end }, accepted, warnings, zero_state:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ====== GDPR COMPLIANCE & PRIVACY ENDPOINTS ======

// Record user consent
app.post('/api/privacy/consent', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, consentData } = req.body || {};
  const payload = `POST:${tenant}:privacy_consent:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await privacyService.recordConsent(tenant, userId, consentData);
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
app.post('/api/privacy/consent/withdraw', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, consentId, reason } = req.body || {};
  const payload = `POST:${tenant}:privacy_withdraw:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await privacyService.withdrawConsent(tenant, userId, consentId, reason);
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
app.post('/api/privacy/delete', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, requestData } = req.body || {};
  const payload = `POST:${tenant}:privacy_delete:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await privacyService.processDataDeletionRequest(tenant, userId, requestData);
    if (result.success) {
      return json(res, 200, { 
        ok: true, 
        deletionId: result.deletionId,
        recordsDeleted: result.deletionResult?.summary?.records_deleted || 0
      });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Data export request (Right to Data Portability)
app.post('/api/privacy/export', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), userId, format } = req.body || {};
  const payload = `POST:${tenant}:privacy_export:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await privacyService.exportUserData(tenant, userId, format);
    if (result.success) {
      const contentType = format === 'csv' ? 'text/csv' : 
                         format === 'xml' ? 'application/xml' : 'application/json';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="user_data_export_${result.exportId}.${format || 'json'}"`);
      
      return res.send(result.data);
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Get data processing log
app.get('/api/privacy/processing-log', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:processing_log`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const filters = {
      user_id: req.query.user_id,
      activity_type: req.query.activity_type,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      limit: parseInt(req.query.limit || '100')
    };
    
    const result = await privacyService.getProcessingLog(tenant, filters);
    if (result.success) {
      return json(res, 200, { ok: true, logs: result.logs, total: result.total });
    } else {
      return json(res, 400, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Data retention compliance check
app.get('/api/privacy/retention-compliance', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:retention_compliance`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
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
app.post('/api/privacy/cleanup', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), dryRun = true } = req.body || {};
  const payload = `POST:${tenant}:privacy_cleanup:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
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
app.get('/api/security/stats', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:security_stats`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const stats = securityMiddleware.getSecurityStats();
    return json(res, 200, { ok: true, stats });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Security health check
app.get('/api/security/health', async (req, res) => {
  try {
    const health = {
      ddos_protection: securityMiddleware.ddosProtection.enabled,
      rate_limiting: securityMiddleware.rateLimiting.enabled,
      input_validation: securityMiddleware.inputValidation.enabled,
      threat_detection: securityMiddleware.threatDetection.enabled,
      privacy_service: true, // Privacy service is always enabled
      timestamp: new Date().toISOString()
    };
    
    return json(res, 200, { ok: true, health });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// ====== PROFIT & INVENTORY-AWARE PACING ENDPOINTS ======

// Compute PACE_SIGNALS (HMAC + PROMOTE Gate)
app.post('/api/profit/compute-signals', promoteGateMiddleware('PROFIT_COMPUTE_SIGNALS'), async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), forceRefresh = false } = req.body || {};
  const payload = `POST:${tenant}:profit_compute_signals:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await profitPacer.computePaceSignals(String(tenant));
    
    if (result.ok) {
      try { 
        await appendRows(String(tenant), 'RUN_LOGS', ['timestamp', 'message'], 
          [[new Date().toISOString(), `profit_signals_computed:${result.signals.length}`]]); 
      } catch {}
      
      return json(res, 200, {
        ok: true,
        signals: result.signals,
        lastUpdate: result.lastUpdate,
        signalCount: result.signals.length
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Get PACE_SIGNALS (HMAC)
app.get('/api/profit/signals', async (req, res) => {
  const { tenant, sig } = req.query;
  const forceRefresh = String(req.query.refresh || '0') === '1';
  const payload = `GET:${tenant}:profit_signals`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await profitPacer.getPaceSignals(String(tenant), forceRefresh);
    
    if (result.ok) {
      return json(res, 200, {
        ok: true,
        signals: result.signals,
        cached: result.cached || false,
        signalCount: result.signals ? result.signals.length : 0
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Reallocate budgets based on PACE_SIGNALS (HMAC + PROMOTE Gate)
app.post('/api/profit/reallocate-budgets', promoteGateMiddleware('PROFIT_REALLOCATE_BUDGETS'), async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), campaignBudgets = {}, minBudget = 1.0, maxBudget = 100.0 } = req.body || {};
  const payload = `POST:${tenant}:profit_reallocate_budgets:${nonce}`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await profitPacer.reallocateBudgets(
      String(tenant), 
      campaignBudgets, 
      Number(minBudget), 
      Number(maxBudget)
    );
    
    if (result.ok) {
      try { 
        await appendRows(String(tenant), 'RUN_LOGS', ['timestamp', 'message'], 
          [[new Date().toISOString(), `budget_reallocations:${result.reallocations.length}`]]); 
      } catch {}
      
      return json(res, 200, {
        ok: true,
        reallocations: result.reallocations,
        reallocationCount: result.reallocations.length
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Get out-of-stock ad groups (HMAC)
app.get('/api/profit/out-of-stock', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:profit_out_of_stock`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await profitPacer.getOutOfStockAdGroups(String(tenant));
    
    if (result.ok) {
      return json(res, 200, {
        ok: true,
        outOfStockAdGroups: result.outOfStockAdGroups,
        oosCount: result.outOfStockAdGroups.length
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Monitor inventory (HMAC)
app.get('/api/profit/monitor-inventory', async (req, res) => {
  const { tenant, sig } = req.query;
  const criticalStock = Number(req.query.critical_stock || 5);
  const lowStock = Number(req.query.low_stock || 10);
  const payload = `GET:${tenant}:profit_monitor_inventory`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const result = await profitPacer.monitorInventory(String(tenant), {
      criticalStock,
      lowStock
    });
    
    if (result.ok) {
      const criticalAlerts = result.alerts.filter(a => a.severity === 'CRITICAL').length;
      const highAlerts = result.alerts.filter(a => a.severity === 'HIGH').length;
      
      if (criticalAlerts > 0) {
        try { 
          await appendRows(String(tenant), 'RUN_LOGS', ['timestamp', 'message'], 
            [[new Date().toISOString(), `inventory_alerts:critical=${criticalAlerts},high=${highAlerts}`]]); 
        } catch {}
      }
      
      return json(res, 200, {
        ok: true,
        alerts: result.alerts,
        alertCount: result.alerts.length,
        criticalAlerts,
        highAlerts
      });
    } else {
      return json(res, 500, { ok: false, error: result.error });
    }
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// Get profit pacer status and statistics (HMAC)
app.get('/api/profit/status', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:profit_status`;
  if (!tenant || !verify(sig, payload)) return json(res, 403, { ok: false, code: 'AUTH' });
  
  try {
    const status = profitPacer.getStatus();
    
    return json(res, 200, {
      ok: true,
      status
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
});

// ====== MIDDLEWARES MUST BE LAST ======
app.use('/api', async (err, req, res, next) => {
  if (!err) return next();
  try { await logAccess(req, 500, 'api error'); } catch {}
  return json(res, 500, { ok:false, code:'ERR', error:String(err) });
});

app.use('/api', async (req, res) => {
  try { await logAccess(req, 404, 'api not_found'); } catch {}
  return json(res, 404, { ok:false, code:'NOT_FOUND' });
});
