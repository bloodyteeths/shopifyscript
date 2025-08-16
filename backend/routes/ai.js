import express from 'express';
import { json, logAccess } from '../utils/response.js';
import { verify } from '../utils/hmac.js';

const router = express.Router();

// Import services dynamically to avoid circular dependencies
async function getSheetOperations() {
  return await import('../services/sheets.js');
}

async function getValidators() {
  return await import('../lib/validators.js');
}

// GET /api/ai/drafts - List AI generated drafts and assets
router.get('/drafts', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_drafts`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getDoc } = await getSheetOperations();
    const doc = await getDoc();
    
    if (!doc) {
      return res.json({ 
        ok: true, 
        rsa_default: [], 
        library: [], 
        sitelinks: [], 
        callouts: [], 
        snippets: [] 
      });
    }
    
    const byTitle = doc.sheetsByTitle || {};
    const out = { rsa_default: [], library: [], sitelinks: [], callouts: [], snippets: [] };
    
    // Default RSA
    const defTitle = `RSA_ASSETS_DEFAULT_${tenant}`;
    if (byTitle[defTitle]) {
      const sh = byTitle[defTitle];
      const rows = await sh.getRows();
      if (rows && rows.length) {
        const H = String(rows[0].headlines_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
        const D = String(rows[0].descriptions_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
        const { validateRSA } = await getValidators();
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
        const theme = String(r.theme || '').trim() || 'theme';
        const H = String(r.headlines_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
        const D = String(r.descriptions_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
        const source = String(r.source || '');
        const { validateRSA } = await getValidators();
        const lint = validateRSA(H, D);
        out.library.push({ theme, headlines: H, descriptions: D, source, lint });
      }
    }
    
    // Sitelinks
    const slTitle = `SITELINKS_${tenant}`;
    if (byTitle[slTitle]) {
      const sh = byTitle[slTitle];
      const rows = await sh.getRows();
      out.sitelinks = rows.map(r => ({ 
        text: String(r.text || ''), 
        final_url: String(r.final_url || '') 
      }));
    }
    
    // Callouts
    const coTitle = `CALLOUTS_${tenant}`;
    if (byTitle[coTitle]) {
      const sh = byTitle[coTitle];
      const rows = await sh.getRows();
      out.callouts = rows.map(r => ({ text: String(r.text || '') }));
    }
    
    // Snippets
    const snTitle = `SNIPPETS_${tenant}`;
    if (byTitle[snTitle]) {
      const sh = byTitle[snTitle];
      const rows = await sh.getRows();
      out.snippets = rows.map(r => ({ 
        header: String(r.header || ''), 
        values: String(r.values_pipe || '').split('|').map(s => s.trim()).filter(Boolean) 
      }));
    }
    
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/accept - Accept AI generated drafts
router.post('/accept', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), items = [] } = req.body || {};
  const payload = `POST:${tenant}:ai_accept:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getDoc, ensureSheet, appendRows } = await getSheetOperations();
    const doc = await getDoc();
    
    if (!doc) {
      return res.json({ ok: true, accepted: 0, errors: ['no_sheets'] });
    }
    
    const defaultSheet = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, 
      ['headlines_pipe','descriptions_pipe']);
    const libSheet = await ensureSheet(doc, `ASSET_LIBRARY_${tenant}`, 
      ['theme','headlines_pipe','descriptions_pipe','source']);
    
    let accepted = 0;
    const errors = [];
    
    for (const it of (Array.isArray(items) ? items : [])) {
      const H = String(it.headlines_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
      const D = String(it.descriptions_pipe || '').split('|').map(s => s.trim()).filter(Boolean);
      const { validateRSA } = await getValidators();
      const lint = validateRSA(H, D);
      
      if (!lint.ok) { 
        errors.push({ theme: it.theme || '', errors: lint.errors }); 
        continue; 
      }
      
      // Write to library
      await libSheet.addRow({ 
        theme: String(it.theme || 'default'), 
        headlines_pipe: lint.clipped.h.join('|'), 
        descriptions_pipe: lint.clipped.d.join('|'), 
        source: String(it.source || 'accepted') 
      });
      accepted += 1;
    }
    
    // Also set DEFAULT to the first accepted (if any)
    if (accepted > 0) {
      const rows = await libSheet.getRows();
      const last = rows[rows.length - 1];
      const H = String(last.headlines_pipe || '');
      const D = String(last.descriptions_pipe || '');
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
      await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], 
        [[new Date().toISOString(), `ai_accept:${accepted}`]]); 
    } catch {}
    
    res.json({ ok: true, accepted, errors });
  } catch (e) { 
    res.status(500).json({ ok: false, error: String(e) }); 
  }
});

// POST /api/jobs/ai_writer - Trigger AI writer job
router.post('/jobs/ai_writer', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), dryRun = true, limit = 5 } = req.body || {};
  const payload = `POST:${tenant}:ai_writer:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const provider = (process.env.AI_PROVIDER || '').toLowerCase();
    if (provider === 'openai' && !process.env.OPENAI_KEY) {
      return res.status(400).json({ ok: false, error: 'OPENAI_KEY missing' });
    }
    if (provider === 'anthropic' && !process.env.ANTHROPIC_KEY) {
      return res.status(400).json({ ok: false, error: 'ANTHROPIC_KEY missing' });
    }
    
    if (dryRun) {
      try {
        const { appendRows } = await getSheetOperations();
        await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], 
          [[new Date().toISOString(), 'ai_writer_dry_run']]);
      } catch {}
      return res.json({ ok: true, dryRun: true, limit });
    }
    
    // Shell out to node job to avoid ESM interop here
    const { spawn } = await import('child_process');
    const p = spawn('node', [`backend/jobs/ai_writer.js`, `--tenant=${tenant}`, `--limit=${limit}`], 
      { shell: true, env: process.env });
    
    p.on('close', async (code) => {
      try {
        const { appendRows } = await getSheetOperations();
        await appendRows(tenant, 'RUN_LOGS', ['timestamp','message'], 
          [[new Date().toISOString(), `ai_writer_exit:${code}`]]);
      } catch {}
    });
    
    res.json({ ok: true, started: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/jobs/weekly_summary - Generate weekly summary report
router.post('/jobs/weekly_summary', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:weekly_summary:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { runWeeklySummary } = await import('../jobs/weekly_summary.js');
    const out = await runWeeklySummary(String(tenant));
    res.json(out);
  } catch (e) { 
    res.status(500).json({ ok: false, error: String(e) }); 
  }
});

// POST /api/jobs/autopilot_tick - Execute autopilot optimization
router.post('/jobs/autopilot_tick', async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const dry = String(req.query.dry || '0') === '1';
  const force = String(req.query.force || '0') === '1';
  const payload = `POST:${tenant}:autopilot_tick:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: 'AUTH' });
  }
  
  try {
    const { readConfigFromSheets, readRowsAoA, appendRows, addScopedNegative, upsertMapValue, upsertConfigKeys } = await getSheetOperations();
    const cfg = await readConfigFromSheets(String(tenant));
    const AP = cfg?.AP || {};
    const now = Date.now();
    
    if (!force) {
      const sched = (AP.schedule || 'off');
      const d = new Date(); 
      const wd = d.getDay(); 
      const hr = d.getHours();
      const within = (sched === 'hourly') || 
                    (sched === 'daily' && hr === 9) || 
                    (sched === 'weekdays_9_18' && wd > 0 && wd < 6 && hr >= 9 && hr <= 18);
      const last = Number(cfg?.AP_LAST_RUN_MS || 0);
      const spaced = (now - last) >= 45 * 60 * 1000;
      
      if (sched === 'off' || !within || !spaced) {
        return json(res, 200, { 
          ok: true, 
          skipped: true, 
          reason: 'schedule_gate', 
          planned: [], 
          applied: [] 
        });
      }
    }
    
    // Aggregate 7d metrics
    const MET_HEADERS = ['date','level','campaign','ad_group','id','name','clicks','cost','conversions','impr','ctr'];
    const horizon = now - 7 * 24 * 60 * 60 * 1000;
    const metAoA = await readRowsAoA(String(tenant), 'METRICS', MET_HEADERS, 4000);
    let clicks = 0, cost = 0, conv = 0;
    
    for (const r of metAoA) { 
      const ts = Date.parse(String(r[0] || '')); 
      if (!isFinite(ts) || ts < horizon) continue; 
      clicks += Number(r[6] || 0); 
      cost += Number(r[7] || 0); 
      conv += Number(r[8] || 0); 
    }
    
    const cpa = conv ? (cost / conv) : 0;
    
    // Aggregate 7d terms
    const ST_HEADERS = ['date','campaign','ad_group','search_term','clicks','cost','conversions'];
    const stAoA = await readRowsAoA(String(tenant), 'SEARCH_TERMS', ST_HEADERS, 5000);
    const bucket = new Map();
    
    for (const r of stAoA) { 
      const ts = Date.parse(String(r[0] || '')); 
      if (!isFinite(ts) || ts < horizon) continue; 
      const term = String(r[3] || '').trim().toLowerCase(); 
      if (!term) continue; 
      const cur = bucket.get(term) || { term, clicks: 0, cost: 0, conv: 0 }; 
      cur.clicks += Number(r[4] || 0); 
      cur.cost += Number(r[5] || 0); 
      cur.conv += Number(r[6] || 0); 
      bucket.set(term, cur); 
    }
    
    const rows = Array.from(bucket.values()).sort((a, b) => b.cost - a.cost || b.clicks - a.clicks);
    
    // Build plan
    const plan = [];
    const targetCPA = Number(AP.target_cpa || 0) || 0;
    const termCostThreshold = Math.max(targetCPA || 2, 2);
    
    for (const r of rows) { 
      if (r.conv === 0 && r.cost >= termCostThreshold) { 
        plan.push({ 
          type: 'add_negative', 
          term: r.term, 
          match: 'phrase', 
          scope: 'account' 
        }); 
        if (plan.length >= 10) break; 
      } 
    }
    
    if (targetCPA && clicks > 0) {
      const tooHigh = (conv > 0 && (cpa > 1.3 * targetCPA));
      const tooLow  = (conv > 0 && (cpa < 0.7 * targetCPA));
      
      if (tooHigh || tooLow) {
        let currentStar = Number(((cfg?.CPC_CEILINGS || {})['*']) || 0) || (clicks ? cost / clicks : 0.2);
        let next = currentStar * (tooHigh ? 0.9 : 1.1);
        next = Math.max(0.05, Math.min(1.00, Number(next.toFixed(2))));
        
        if (Math.abs(next - currentStar) >= 0.01) {
          plan.push({ type: 'lower_cpc_ceiling', campaign: '*', amount: next });
        }
      }
    }
    
    let applied = [], errors = [];
    
    if (!dry && (AP.mode || 'auto') === 'auto' && plan.length) {
      for (const a of plan) { 
        try {
          if (a.type === 'add_negative') { 
            await addScopedNegative(String(tenant), { 
              scope: a.scope, 
              match: a.match, 
              term: a.term 
            }); 
            applied.push(a); 
          }
          else if (a.type === 'lower_cpc_ceiling') { 
            await upsertMapValue(String(tenant), 'CPC_CEILINGS', a.campaign || '*', a.amount); 
            applied.push(a); 
          }
        } catch(e) { 
          errors.push({ action: a, error: String(e) }); 
        } 
      }
      
      try { 
        await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], 
          [[new Date().toISOString(), `autopilot: planned ${plan.length}, applied ${applied.length} (mode:auto, obj:${AP.objective || 'protect'}, cpa:${cpa.toFixed(2)}${targetCPA ? `/t${targetCPA}` : ''})`]]); 
      } catch {}
      
      try { 
        await upsertConfigKeys(String(tenant), { AP_LAST_RUN_MS: String(now) }); 
      } catch {}
    } else {
      try { 
        await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], 
          [[new Date().toISOString(), `autopilot: planned ${plan.length} (mode:${AP.mode || 'review'}, preview)`]]); 
      } catch {}
    }
    
    return json(res, 200, { 
      ok: true, 
      planned: plan, 
      applied, 
      errors, 
      kpi: { clicks, cost, conv, cpa }, 
      target_cpa: targetCPA 
    });
  } catch (e) { 
    return json(res, 500, { ok: false, code: 'AUTOPILOT', error: String(e) }); 
  }
});

// POST /api/autopilot/quickstart - Quick setup for autopilot mode
router.post('/autopilot/quickstart', async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    nonce = Date.now(), 
    mode = 'protect', 
    daily_budget = 3, 
    cpc_ceiling = 0.2, 
    final_url = 'https://example.com', 
    start_in_minutes = 2, 
    duration_minutes = 60 
  } = req.body || {};
  const payload = `POST:${tenant}:autopilot_quickstart:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getDoc, bootstrapTenant, upsertConfigKeys, appendRows } = await getSheetOperations();
    const sheetsOk = !!(await getDoc());
    const aiReady = (process.env.AI_PROVIDER || '').toLowerCase() === 'google' && !!process.env.GOOGLE_API_KEY;
    
    if (!sheetsOk) {
      return res.json({ ok: false, code: 'SHEETS', message: 'Connect Google Sheets first.' });
    }
    
    // Ensure tenant tabs and baseline config exist
    await bootstrapTenant(String(tenant));
    const plan = mode === 'scale' ? 'growth' : (mode === 'grow' ? 'pro' : 'starter');
    
    await upsertConfigKeys(String(tenant), {
      PLAN: plan,
      default_final_url: String(final_url || ''),
      daily_budget_cap_default: String(daily_budget),
      cpc_ceiling_default: String(cpc_ceiling)
    });
    
    let accepted = 0;
    const warnings = [];
    
    if (aiReady) {
      try {
        // Best-effort: accept any existing valid drafts; generation is optional
        const { acceptTopValidDrafts } = await getSheetOperations();
        accepted = await acceptTopValidDrafts(String(tenant), 4);
        if (accepted === 0) warnings.push('no_drafts_found');
      } catch(e) { 
        warnings.push('ai_accept_failed'); 
      }
    } else {
      warnings.push('ai_not_configured');
    }
    
    const start = Date.now() + Number(start_in_minutes || 2) * 60 * 1000;
    const end = start + Number(duration_minutes || 60) * 60 * 1000;
    
    try { 
      const { schedulePromoteWindow } = await import('../jobs/promote_window.js');
      await schedulePromoteWindow(String(tenant), start, Number(duration_minutes || 60)); 
    } catch {}
    
    try { 
      await appendRows(String(tenant), 'RUN_LOGS', ['timestamp','message'], 
        [[new Date().toISOString(), 'autopilot_quickstart']]); 
    } catch {}
    
    return res.json({ 
      ok: true, 
      plan, 
      scheduled: { start, end }, 
      accepted, 
      warnings, 
      zero_state: true 
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/generate/rsa - Generate RSA content using new service
router.post('/generate/rsa', async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    nonce = Date.now(), 
    theme = 'Business', 
    industry = 'general',
    keywords = [],
    tone = 'professional',
    headlineCount = 15,
    descriptionCount = 4
  } = req.body || {};
  const payload = `POST:${tenant}:ai_generate_rsa:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getRSAGenerator } = await import('../services/rsa-generator.js');
    const generator = getRSAGenerator();
    
    const result = await generator.generateRSAContent({
      theme,
      industry,
      keywords,
      tone,
      headlineCount,
      descriptionCount,
      includeOffers: true,
      includeBranding: true
    });
    
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/analyze/negatives - Analyze search terms for negative keywords
router.post('/analyze/negatives', async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    nonce = Date.now(), 
    searchTerms = [],
    industry = 'general',
    costThreshold = 5.0,
    clickThreshold = 3,
    conversionRate = 0,
    useAI = true
  } = req.body || {};
  const payload = `POST:${tenant}:ai_analyze_negatives:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getNegativeAnalyzer } = await import('../services/negative-analyzer.js');
    const analyzer = getNegativeAnalyzer();
    
    const result = await analyzer.analyzeSearchTerms(searchTerms, {
      industry,
      costThreshold,
      clickThreshold,
      conversionRate,
      useAI
    });
    
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/approval/submit - Submit content for approval
router.post('/approval/submit', async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    nonce = Date.now(), 
    content,
    contentType,
    submittedBy = 'user',
    priority = 'normal',
    autoApprove = false,
    metadata = {}
  } = req.body || {};
  const payload = `POST:${tenant}:ai_approval_submit:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getApprovalWorkflow } = await import('../services/content-approval.js');
    const workflow = getApprovalWorkflow();
    
    const result = await workflow.submitForApproval(content, {
      contentType,
      tenant,
      submittedBy,
      priority,
      autoApprove,
      metadata
    });
    
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/approval/pending - Get pending approvals
router.get('/approval/pending', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_approval_pending`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getApprovalWorkflow } = await import('../services/content-approval.js');
    const workflow = getApprovalWorkflow();
    
    const pending = workflow.getPendingApprovals({ tenant });
    const stats = workflow.getWorkflowStats(tenant);
    
    res.json({ ok: true, pending, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST /api/ai/approval/review - Review content (approve/reject/request revisions)
router.post('/approval/review', async (req, res) => {
  const { tenant, sig } = req.query;
  const { 
    nonce = Date.now(), 
    submissionId,
    action, // 'approve', 'reject', 'revise'
    reviewerId,
    reason = '',
    revisionRequests = []
  } = req.body || {};
  const payload = `POST:${tenant}:ai_approval_review:${nonce}`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getApprovalWorkflow } = await import('../services/content-approval.js');
    const workflow = getApprovalWorkflow();
    
    let result;
    switch (action) {
      case 'approve':
        result = await workflow.approveContent(submissionId, reviewerId, { reason });
        break;
      case 'reject':
        result = await workflow.rejectContent(submissionId, reviewerId, { reason });
        break;
      case 'revise':
        result = await workflow.requestRevisions(submissionId, reviewerId, revisionRequests);
        break;
      default:
        throw new Error('Invalid action. Must be approve, reject, or revise');
    }
    
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET /api/ai/provider/status - Get AI provider status
router.get('/provider/status', async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ai_provider_status`;
  
  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: 'auth' });
  }
  
  try {
    const { getAIProviderService, validateAIConfig } = await import('../services/ai-provider.js');
    const service = getAIProviderService();
    
    const status = service.getStatus();
    const config = validateAIConfig();
    
    res.json({ ok: true, status, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export default router;