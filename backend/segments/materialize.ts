import fs from 'fs';
import path from 'path';
import { getDoc, ensureSheet } from '../sheets.js';

type SegmentDef = { segment_key: string; logic_sqlish: string; lookback_days?: number; refresh_freq?: string; target_use?: string; bidding_hint?: string };

export async function listSegments(tenant: string): Promise<SegmentDef[]> {
  const doc = await getDoc(); if (!doc) return [];
  const sh = await ensureSheet(doc, `AUDIENCE_SEGMENTS_${tenant}`, ['segment_key','logic_sqlish','lookback_days','refresh_freq','target_use','bidding_hint']);
  const rows = await sh.getRows();
  return rows.map((r:any) => ({
    segment_key: String(r.segment_key||'').trim(),
    logic_sqlish: String(r.logic_sqlish||'').trim(),
    lookback_days: Number(r.lookback_days||0),
    refresh_freq: String(r.refresh_freq||'').trim(),
    target_use: String(r.target_use||'').trim(),
    bidding_hint: String(r.bidding_hint||'').trim()
  }));
}

export async function materialize(tenant: string, seg: SegmentDef): Promise<{ ok: boolean; filePath: string; rows: number }>{
  // Stub: produce empty CSV with header; future agents will implement data source wiring
  const dir = path.resolve(process.cwd(), 'storage', 'audiences', tenant);
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const file = path.resolve(dir, `${seg.segment_key}-${ts}.csv`);
  const header = 'email,phone,first_name,last_name,country,zip\n';
  fs.writeFileSync(file, header, 'utf8');
  return { ok: true, filePath: file, rows: 0 };
}




