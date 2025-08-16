import { getDoc, ensureSheet } from '../sheets.js';

function parseStart(s){
  if (!s) return Date.now();
  if (s.startsWith('now+')){
    const m = s.match(/now\+(\d+)m/i); if (m) return Date.now() + Number(m[1])*60*1000;
  }
  const t = Date.parse(s); return isFinite(t)? t : Date.now();
}

export async function schedulePromoteWindow(tenant, startAtMs, durationMinutes){
  const doc = await getDoc(); if (!doc) return { ok:false, error:'no_sheets' };
  const cfg = await ensureSheet(doc, `CONFIG_${tenant}`, ['key','value']);
  // naive scheduler: write intent rows and rely on an external timer (crontab/PM2) to call tick()
  const meta = await ensureSheet(doc, `PROMOTE_WINDOW_${tenant}`, ['start_at_ms','end_at_ms','state']);
  const endAtMs = startAtMs + Number(durationMinutes||60)*60*1000;
  const rows = await meta.getRows(); for (const r of rows){ await r.delete(); }
  await meta.addRow({ start_at_ms: String(startAtMs), end_at_ms: String(endAtMs), state: 'scheduled' });
  return { ok:true };
}

export async function tickPromoteWindow(tenant){
  const doc = await getDoc(); if (!doc) return;
  const meta = await ensureSheet(doc, `PROMOTE_WINDOW_${tenant}`, ['start_at_ms','end_at_ms','state']);
  const rows = await meta.getRows(); if (!rows.length) return;
  const row = rows[0]; const now = Date.now();
  const start = Number(row.start_at_ms||0), end = Number(row.end_at_ms||0), state = String(row.state||'');
  const cfg = await ensureSheet(doc, `CONFIG_${tenant}`, ['key','value']);
  async function setPromote(val){
    const all = await cfg.getRows(); const map = {}; all.forEach(r=>{ if(r.key) map[r.key]=r.value; });
    map['PROMOTE'] = String(val).toUpperCase();
    await cfg.clearRows(); await cfg.setHeaderRow(['key','value']);
    for (const k of Object.keys(map)) await cfg.addRow({ key:k, value: map[k] });
  }
  if (now >= start && now < end && state !== 'on'){
    await setPromote(true); row.state = 'on'; await row.save();
  } else if (now >= end && state !== 'off_done'){
    await setPromote(false); row.state = 'off_done'; await row.save();
  }
}




