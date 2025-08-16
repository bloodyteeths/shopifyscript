
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use('/app', express.static(path.join(__dirname, 'public')));

function joinPath(base, p){
  const b = String(base||'').replace(/\/$/, '');
  const s = String(p||'').replace(/^\//, '');
  return `${b}/${s}`;
}
const BACKEND_BASE = process.env.BACKEND_URL || 'http://localhost:3001/api';
const TENANT = process.env.TENANT_ID || 'TENANT_123';
const SECRET  = process.env.HMAC_SECRET || 'change_me';

function sign(payload){ return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=+$/,''); }

// Merchant settings UI would normally require Shopify OAuth; this is a skeleton.
let merchantSettings = { ga4Id:'', awId:'', awLabel:'', enhancedConversions:true };

app.get('/health', (_,res)=> res.json({ ok:true }));

app.post('/settings', async (req,res)=>{
  merchantSettings = { ...merchantSettings, ...(req.body||{}) };
  // push relevant config to backend (e.g., default_final_url, label, etc.)
  const nonce = Date.now();
  const sig = sign(`POST:${TENANT}:upsertconfig:${nonce}`);
  await fetch(`${BACKEND}/upsertConfig?tenant=${encodeURIComponent(TENANT)}&sig=${encodeURIComponent(sig)}`, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ nonce, settings: { default_final_url: req.body.defaultUrl || '' } })
  });
  res.json({ ok:true, saved: merchantSettings });
});

// ---- Proxy helpers ----
async function proxyGet(res, path, payload){
  const sig = sign(payload);
  const url = joinPath(BACKEND_BASE, path) + `?tenant=${encodeURIComponent(TENANT)}&sig=${encodeURIComponent(sig)}`;
  const r = await fetch(url);
  const j = await r.json();
  res.status(r.status).json(j);
}
async function proxyPost(req, res, path, payload){
  const sig = sign(payload);
  const url = joinPath(BACKEND_BASE, path) + `?tenant=${encodeURIComponent(TENANT)}&sig=${encodeURIComponent(sig)}`;
  const r = await fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(req.body||{}) });
  const j = await r.json();
  res.status(r.status).json(j);
}

// ---- Intent proxies ----
app.get('/app/api/intent/list', async (_req, res)=>{
  await proxyGet(res, '/intent/list', `GET:${TENANT}:intent_list`);
});
app.post('/app/api/intent/upsert', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/intent/upsert', `POST:${TENANT}:intent_upsert:${nonce}`);
});
app.post('/app/api/intent/delete', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/intent/delete', `POST:${TENANT}:intent_delete:${nonce}`);
});

// ---- Overlays proxies ----
app.post('/app/api/overlays/apply', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/overlays/apply', `POST:${TENANT}:overlays_apply:${nonce}`);
});
app.post('/app/api/overlays/revert', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/overlays/revert', `POST:${TENANT}:overlays_revert:${nonce}`);
});
app.post('/app/api/overlays/bulk', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/overlays/bulk', `POST:${TENANT}:overlays_bulk:${nonce}`);
});

// ---- Audience export proxies ----
app.get('/app/api/audiences/export/list', async (_req, res)=>{
  await proxyGet(res, '/audiences/export/list', `GET:${TENANT}:audiences_export_list`);
});
app.post('/app/api/audiences/export/build', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/audiences/export/build', `POST:${TENANT}:audiences_export_build:${nonce}`);
});

// Canary helpers
app.post('/app/api/promote/window', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/promote/window', `POST:${TENANT}:promote_window:${nonce}`);
});
app.post('/app/api/audiences/mapUpsert', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/audiences/mapUpsert', `POST:${TENANT}:audiences_map_upsert:${nonce}`);
});
app.post('/app/api/ai/writer', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/jobs/ai_writer', `POST:${TENANT}:ai_writer:${nonce}`);
});

// Diagnostics
app.get('/app/api/diagnostics', async (_req, res)=>{
  await proxyGet(res, '/diagnostics', `GET:${TENANT}:diagnostics`);
});

// Upsert config passthrough (for billing/test plan)
app.post('/app/api/upsertConfig', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/upsertConfig', `POST:${TENANT}:upsertconfig:${nonce}`);
});

// AI drafts list
app.get('/app/api/ai/drafts', async (_req, res)=>{
  await proxyGet(res, '/ai/drafts', `GET:${TENANT}:ai_drafts`);
});

// AI drafts accept
app.post('/app/api/ai/accept', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/ai/accept', `POST:${TENANT}:ai_accept:${nonce}`);
});

// Promote status
app.get('/app/api/promote/status', async (_req, res)=>{
  await proxyGet(res, '/promote/status', `GET:${TENANT}:promote_status`);
});

// Config fetch
app.get('/app/api/config', async (_req, res)=>{
  await proxyGet(res, '/config', `GET:${TENANT}:config`);
});

// Autopilot QuickStart
app.post('/app/api/autopilot/quickstart', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/autopilot/quickstart', `POST:${TENANT}:autopilot_quickstart:${nonce}`);
});

// Connect Wizard proxies
app.post('/app/api/connect/sheets/test', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/connect/sheets/test', `POST:${TENANT}:sheets_test:${nonce}`);
});
app.post('/app/api/connect/sheets/save', async (req, res)=>{
  const nonce = Number(req.body?.nonce || Date.now());
  await proxyPost(req, res, '/connect/sheets/save', `POST:${TENANT}:sheets_save:${nonce}`);
});

// Ads Script raw
app.get('/app/api/ads-script/raw', async (_req, res)=>{
  await proxyGet(res, '/ads-script/raw', `GET:${TENANT}:script_raw`);
});

// Summary (KPIs)
app.get('/app/api/summary', async (_req, res)=>{
  await proxyGet(res, '/summary', `GET:${TENANT}:summary_get`);
});

app.listen(process.env.PORT||3002, ()=> console.log('Proofkit Shopify skeleton on :' + (process.env.PORT||3002)));
