import express from 'express';
import { sheets } from '../sheets.js';
import { json } from '../utils/response.js';
import { verify } from '../utils/hmac.js';

const router = express.Router();

// In-memory throttle tracking
const metricsThrottle = new Map();

// Standard headers for different data types
const MET_HEADERS = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
const ST_HEADERS  = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
const LOG_HEADERS = ['timestamp','message'];

// Post metrics, search terms, and run logs
router.post('/metrics', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), metrics = [], search_terms = [], run_logs = [] } = req.body || {};
  const payload = `POST:${tenant}:metrics:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: 'AUTH' });
  }
  
  try {
    // Soft throttle: one payload per 5s per tenant
    const nowTs = Date.now();
    const lastTs = metricsThrottle.get(tenant) || 0;
    if (nowTs - lastTs < 5000) {
      return json(res, 429, { ok: false, code: 'THROTTLED' });
    }
    metricsThrottle.set(tenant, nowTs);

    // Coerce numeric fields for metrics
    const mRows = (Array.isArray(metrics) ? metrics : []).map(r => {
      const a = Array.isArray(r) ? r.slice(0, MET_HEADERS.length) : [];
      if (!a.length) return null;
      // Ensure numeric fields
      a[6] = Number(a[6] || 0);  // clicks
      a[7] = Number(a[7] || 0);  // cost
      a[8] = Number(a[8] || 0);  // conversions
      a[9] = Number(a[9] || 0);  // impr
      a[10] = Number(a[10] || 0); // ctr
      return a;
    }).filter(Boolean);

    // Coerce numeric fields for search terms
    const stRows = (Array.isArray(search_terms) ? search_terms : []).map(r => {
      const a = Array.isArray(r) ? r.slice(0, ST_HEADERS.length) : [];
      if (!a.length) return null;
      a[4] = Number(a[4] || 0);  // clicks
      a[5] = Number(a[5] || 0);  // cost
      a[6] = Number(a[6] || 0);  // conversions
      return a;
    }).filter(Boolean);

    // Process run logs
    const logRows = (Array.isArray(run_logs) ? run_logs : []).map(r => 
      Array.isArray(r) ? r.slice(0, LOG_HEADERS.length) : null
    ).filter(Boolean);

    const totalRows = mRows.length + stRows.length + logRows.length;
    if (totalRows > 5000) {
      return json(res, 413, { 
        ok: false, 
        code: 'PAYLOAD_TOO_LARGE', 
        totalRows, 
        limit: 5000 
      });
    }

    let insM = 0, insS = 0, insL = 0;

    if (mRows.length) {
      await sheets.addRows(String(tenant), 'METRICS', mRows);
      insM = mRows.length;
    }
    
    if (stRows.length) {
      await sheets.addRows(String(tenant), 'SEARCH_TERMS', stRows);
      insS = stRows.length;
    }
    
    if (logRows.length) {
      await sheets.addRows(String(tenant), 'RUN_LOGS', logRows);
      insL = logRows.length;
    }

    return json(res, 200, { 
      ok: true, 
      inserted: { 
        metrics: insM, 
        search_terms: insS, 
        run_logs: insL 
      } 
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: 'METRICS', error: String(e) });
  }
});

// Get run logs with pagination
router.get('/run-logs', async (req, res) => {
  const { tenant, sig } = req.query;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 10)));
  const payload = `GET:${tenant}:run_logs`;
  
  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: 'AUTH' });
  }
  
  try {
    const rowsAoA = await sheets.getRows(String(tenant), 'RUN_LOGS', { limit });
    const rows = rowsAoA.map(r => ({ 
      timestamp: String(r[0] || ''), 
      message: String(r[1] || '') 
    }));
    
    return json(res, 200, { ok: true, rows: rows.reverse() });
  } catch (e) {
    return json(res, 500, { ok: false, code: 'RUN_LOGS', error: String(e) });
  }
});

// Summary endpoint for quick KPIs
router.get('/summary', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:summary_get`;
  
  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, error: 'auth' });
  }
  
  try {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    
    // Get metrics for KPIs
    const metricRows = await sheets.getRows(String(tenant), 'METRICS', { limit: 1000 });
    let spend = 0, clicks = 0, conv = 0;
    
    for (const r of metricRows) {
      const ts = Date.parse(String(r[0] || ''));
      if (isFinite(ts) && ts >= since) {
        clicks += Number(r[6] || 0);
        spend += Number(r[7] || 0);
        conv += Number(r[8] || 0);
      }
    }
    
    const cpa = conv > 0 ? (spend / conv) : 0;
    
    // Get top search terms
    const termRows = await sheets.getRows(String(tenant), 'SEARCH_TERMS', { limit: 1000 });
    const termMap = new Map();
    
    for (const r of termRows) {
      const term = String(r[3] || '').trim();
      if (!term) continue;
      
      const ts = Date.parse(String(r[0] || ''));
      if (!isFinite(ts) || ts < since) continue;
      
      const current = termMap.get(term) || { term, clicks: 0, cost: 0 };
      current.clicks += Number(r[4] || 0);
      current.cost += Number(r[5] || 0);
      termMap.set(term, current);
    }
    
    const top_terms = Array.from(termMap.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
    
    return json(res, 200, {
      ok: true,
      kpis: { spend, clicks, conv, cpa },
      top_terms,
      last_run: null
    });
  } catch (e) {
    return json(res, 200, { ok: false, error: String(e) });
  }
});

// Seed demo data for development/testing
router.post('/seed-demo', async (req, res) => {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:seed_demo:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getDoc, ensureSheet } = await import('../services/sheets.js');
    const doc = await getDoc();
    if (!doc) return res.status(500).json({ ok: false, error: 'no_sheets' });
    
    const seeded = { tabs: [], rows: 0 };
    const iso = new Date().toISOString().slice(0, 10);
    
    // Create and populate demo sheets
    const metSheet = await ensureSheet(doc, `METRICS_${tenant}`, MET_HEADERS);
    const stSheet = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, ST_HEADERS);
    const rlSheet = await ensureSheet(doc, `RUN_LOGS_${tenant}`, LOG_HEADERS);
    
    // Clear and reset
    try {
      await metSheet.clearRows();
      await metSheet.setHeaderRow(MET_HEADERS);
      await stSheet.clearRows();
      await stSheet.setHeaderRow(ST_HEADERS);
      await rlSheet.clearRows();
      await rlSheet.setHeaderRow(LOG_HEADERS);
    } catch {}
    
    // Add demo data
    await metSheet.addRow({
      date: iso, level: 'ad_group', campaign: 'Demo Campaign',
      ad_group: 'Demo AdGroup', id: '1', name: 'Demo KW',
      clicks: '12', cost: '6.50', conversions: '1', impr: '120', ctr: '0.10'
    });
    
    await stSheet.addRow({
      date: iso, campaign: 'Demo Campaign', ad_group: 'Demo AdGroup',
      search_term: 'demo shoes', clicks: '8', cost: '5.20', conversions: '0'
    });
    
    await rlSheet.addRow({
      timestamp: new Date().toISOString(),
      message: 'seed_demo_data'
    });
    
    seeded.tabs.push(`METRICS_${tenant}`, `SEARCH_TERMS_${tenant}`, `RUN_LOGS_${tenant}`);
    seeded.rows = 3;
    
    return res.json({ ok: true, seeded });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;