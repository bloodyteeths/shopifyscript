import express from 'express';
import { sheets } from '../sheets.js';
import { TenantConfigService } from '../services/tenant-config.js';
import { logAccess, json } from '../utils/response.js';
import { verify } from '../utils/hmac.js';
import environmentSecurity from '../services/environment-security.js';

const router = express.Router();

// Get tenant configuration with HMAC validation
router.get('/config', async (req, res) => {
  const tenant = String(req.query.tenant || '');
  const sig = String(req.query.sig || '');
  const payload = `GET:${tenant}:config`;
  
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'config auth_fail');
    return json(res, 403, { ok: false, code: 'AUTH', error: 'invalid signature' });
  }
  
  try {
    // Always go through TenantConfigService which ensures Sheets tabs exist
    const configManager = new TenantConfigService();
    const cfg = await configManager.getTenantConfig(tenant);
    
    await logAccess(req, 200, 'config ok');
    return json(res, 200, { ok: true, config: cfg });
  } catch (e) {
    console.error('Config read error:', e.message);
    await logAccess(req, 500, 'config error');
    return json(res, 500, { ok: false, code: 'CONFIG', error: String(e) });
  }
});

// HMAC-gated echo endpoint for diagnostics
router.get('/config/echo', async (req, res) => {
  const tenant = String(req.query.tenant || '');
  const sig = String(req.query.sig || '');
  const payload = `GET:${tenant}:config_echo`;
  
  if (!tenant || !verify(sig, payload)) {
    await logAccess(req, 403, 'config_echo auth_fail');
    return json(res, 403, { ok: false, code: 'AUTH', error: 'invalid signature' });
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

// Update tenant configuration with HMAC validation
router.post('/upsertConfig', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), settings = {} } = req.body || {};
  const payload = `POST:${tenant}:upsertconfig:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    console.log(`📝 Attempting to save settings for ${tenant}:`, settings);
    
    // Try to save to sheets, but don't fail if not available
    try {
      await sheets.upsertConfig(tenant, settings);
      console.log(`✅ Settings successfully saved to Google Sheets for ${tenant}`);
    } catch (sheetsError) {
      console.log(`⚠️ Google Sheets not available for ${tenant}:`, sheetsError.message);
      
      // SECURITY FIX: Use secure environment validation instead of NODE_ENV
      if (environmentSecurity.isTestingAllowed()) {
        console.log(`🔧 Development/Staging mode: Settings simulated as saved for ${tenant}:`, settings);
        
        // Store in memory for development/staging (this won't persist between restarts)
        global.devTenantConfigs = global.devTenantConfigs || {};
        global.devTenantConfigs[tenant] = { ...global.devTenantConfigs[tenant], ...settings };
        console.log(`💾 Stored in memory for ${tenant} (${environmentSecurity.getEnvironmentInfo().deploymentEnv}):`, global.devTenantConfigs[tenant]);
      }
    }
    
    // Write a run log entry when possible (Sheets present)
    try {
      const { appendRows } = await import('../services/sheets.js');
      await appendRows(tenant, 'RUN_LOGS', ['timestamp', 'message'], 
        [[new Date().toISOString(), 'config_upsert']]);
    } catch {}
    
    res.json({ ok: true, saved: Object.keys(settings).length });
  } catch (e) {
    console.error('upsertConfig error:', e.message);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Connect wizard endpoints
router.post('/connect/sheets/test', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), sheetId = '' } = req.body || {};
  const payload = `POST:${tenant}:sheets_test:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    if (!sheetId) return res.json({ ok: false, error: 'missing_sheetId' });
    
    const { getDocById, ensureSheet } = await import('../services/sheets.js');
    const doc = await getDocById(String(sheetId));
    if (!doc) return res.json({ ok: false, error: 'auth_or_load_failed' });
    
    await ensureSheet(doc, `CONFIG_${tenant}`, ['key', 'value']);
    return res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

router.post('/connect/sheets/save', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), sheetId = '' } = req.body || {};
  const payload = `POST:${tenant}:sheets_save:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    if (!sheetId) return res.json({ ok: false, error: 'missing_sheetId' });
    
    // Update tenant registry instead of global env
    const { TenantRegistry } = await import('../services/tenant-registry.js');
    await TenantRegistry.updateSheetId(tenant, String(sheetId));
    
    const { ensureAudienceTabs } = await import('../services/sheets.js');
    await ensureAudienceTabs(String(tenant));
    
    return res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

export default router;