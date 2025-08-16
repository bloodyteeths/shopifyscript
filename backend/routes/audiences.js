import express from 'express';
import { json, logAccess } from '../utils/response.js';
import { verify } from '../utils/hmac.js';

const router = express.Router();

// Import sheet operations dynamically to avoid circular dependencies
async function getSheetOperations() {
  return await import('../services/sheets.js');
}

// Ensure required audience tabs exist (idempotent)
async function ensureAudienceTabs(tenant) {
  const { getDoc, ensureSheet } = await getSheetOperations();
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
    `OVERLAY_HISTORY_${tenant}`
  ];
  
  const headers = {
    [`AUDIENCE_SEEDS_${tenant}`]: ['customer_id','email_hash','phone_hash','total_spent','order_count','last_order_at','top_category','last_product_ids_csv'],
    [`SKU_MARGIN_${tenant}`]: ['sku','margin'],
    [`SKU_STOCK_${tenant}`]: ['sku','stock'],
    [`AUDIENCE_SEGMENTS_${tenant}`]: ['segment_key','logic_sqlish','active'],
    [`AUDIENCE_EXPORT_${tenant}`]: ['segment_key','format','url','row_count','generated_at'],
    [`AUDIENCE_MAP_${tenant}`]: ['campaign','ad_group','user_list_id','mode','bid_modifier'],
    [`ADGROUP_SKU_MAP_${tenant}`]: ['ad_group_id','sku'],
    [`INTENT_BLOCKS_${tenant}`]: ['intent_key','hero_headline','benefit_bullets_pipe','proof_snippet','cta_text','url_target','updated_at','updated_by'],
    [`OVERLAY_HISTORY_${tenant}`]: ['timestamp','action','selector','channel','fields_json']
  };
  
  for (const t of titles) {
    await ensureSheet(doc, t, headers[t] || ['key','value']);
  }
  return true;
}

// POST /api/ensureAudienceTabs - Create required audience management sheets
router.post('/ensureAudienceTabs', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:ensureaudiencetabs:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const ok = await ensureAudienceTabs(tenant);
    if (ok) {
      try {
        const { appendRows } = await getSheetOperations();
        await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], 
          [[new Date().toISOString(), 'audience_tabs_ensured']]);
      } catch {}
    }
    res.json({ ok: !!ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/audiences/export/list - List audience export files
router.get('/export/list', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:audiences_export_list`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getDoc, ensureSheet } = await getSheetOperations();
    const doc = await getDoc(); 
    if (!doc) return res.json({ ok: true, rows: [] });
    
    const sh = await ensureSheet(doc, `AUDIENCE_EXPORT_${tenant}`, 
      ['file_name','segment_key','format','row_count','last_built_at','storage_url']);
    const rows = await sh.getRows();
    
    res.json({ 
      ok: true, 
      rows: rows.map(r => ({
        file_name: r.file_name,
        segment_key: r.segment_key,
        format: r.format,
        row_count: Number(r.row_count || 0),
        last_built_at: r.last_built_at,
        storage_url: r.storage_url
      }))
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/audiences/export/build - Build audience segment exports
router.post('/export/build', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), segments = [], format = 'UI' } = req.body || {};
  const payload = `POST:${tenant}:audiences_export_build:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { buildSegments } = await import('../segments/materialize.js');
    const result = await buildSegments(
      String(tenant), 
      Array.isArray(segments) ? segments : [], 
      String(format).toUpperCase() === 'API' ? 'API' : 'UI'
    );
    
    try {
      const { appendRows } = await getSheetOperations();
      await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], 
        [[new Date().toISOString(), `aud_export_build:${format}:${(result.built || []).length}`]]);
    } catch {}
    
    res.json({ 
      ok: true, 
      built: result.built || [], 
      skipped: result.skipped || [] 
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/audiences/mapUpsert - Upsert audience map entries
router.post('/mapUpsert', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), rows = [] } = req.body || {};
  const payload = `POST:${tenant}:audiences_map_upsert:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getDoc, ensureSheet } = await getSheetOperations();
    const doc = await getDoc(); 
    if (!doc) return res.json({ ok: true, upserted: 0 });
    
    const sh = await ensureSheet(doc, `AUDIENCE_MAP_${tenant}`, 
      ['campaign','ad_group','user_list_id','mode','bid_modifier']);
    
    for (const r of rows) {
      await sh.addRow({
        campaign: String(r.campaign || '').trim(),
        ad_group: String(r.ad_group || '').trim(),
        user_list_id: String(r.user_list_id || '').trim(),
        mode: String(r.mode || 'OBSERVE').toUpperCase(),
        bid_modifier: String(r.bid_modifier || '')
      });
    }
    
    try {
      const { appendRows } = await getSheetOperations();
      await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], 
        [[new Date().toISOString(), `aud_map_upsert:${rows.length}`]]);
    } catch {}
    
    res.json({ ok: true, upserted: rows.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;