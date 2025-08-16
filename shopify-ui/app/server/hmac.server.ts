import crypto from 'crypto';

export function sign(payload: string): string {
  const secret = process.env.HMAC_SECRET || 'change_me';
  return crypto.createHmac('sha256', secret).update(payload).digest('base64').replace(/=+$/,'');
}

export async function backendFetch(pathname: string, method: 'GET'|'POST', body?: any, tenantOverride?: string){
  const base = (process.env.BACKEND_PUBLIC_URL || 'http://localhost:3005/api').replace(/\/$/, '');
  
  // Dynamic tenant detection (for production: get from Shopify session)
  // For local dev: use environment variable
  const tenant = tenantOverride || 
                 process.env.TENANT_ID || 
                 'mybabybymerry'; // Default to shop name from your example
  const op = opKey(method, pathname);
  const nonce = method === 'POST' ? (body?.nonce ?? Date.now()) : undefined;
  const payload = `${method}:${tenant}:${op}${nonce!==undefined?`:${nonce}`:''}`;
  const sig = sign(payload);
  const sep = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(tenant)}&sig=${encodeURIComponent(sig)}`;
  const init: any = { method, headers: {} };
  if (method === 'POST'){ init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body||{}); }
  const res = await fetch(url, init);
  const json = await res.json().catch(()=>({ ok:false }));
  return { status: res.status, json };
}

export async function backendFetchRaw(pathname: string, method: 'GET'|'POST'){
  const base = (process.env.BACKEND_PUBLIC_URL || 'http://localhost:3005/api').replace(/\/$/, '');
  const tenant = process.env.TENANT_ID || 'mybabybymerry';
  const op = opKey(method, pathname);
  const nonce = undefined; // raw used for GET CSV
  const payload = `${method}:${tenant}:${op}${nonce!==undefined?`:${nonce}`:''}`;
  const sig = sign(payload);
  const sep = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(tenant)}&sig=${encodeURIComponent(sig)}`;
  return fetch(url, { method });
}

export async function backendFetchText(pathname: string){
  const base = (process.env.BACKEND_PUBLIC_URL || 'http://localhost:3005/api').replace(/\/$/, '');
  const tenant = process.env.TENANT_ID || 'mybabybymerry';
  const payload = `GET:${tenant}:script_raw`;
  const sig = sign(payload);
  const sep = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(tenant)}&sig=${encodeURIComponent(sig)}`;
  const res = await fetch(url);
  return res.text();
}

function opKey(method: string, pathname: string): string{
  // Map UI proxy path → backend op key used for HMAC
  if (pathname.includes('/autopilot/quickstart')) return 'autopilot_quickstart';
  if (pathname.includes('/connect/sheets/test')) return 'sheets_test';
  if (pathname.includes('/connect/sheets/save')) return 'sheets_save';
  if (pathname.includes('/promote/status')) return 'promote_status';
  if (pathname.includes('/insights/terms')) return 'insights_terms';
  if (pathname.includes('/run-logs')) return 'run_logs';
  if (pathname.includes('/insights/actions/apply')) return 'insights_actions';
  if (pathname.includes('/insights')) return 'insights';
  if (pathname.includes('/ads-script/raw')) return 'script_raw';
  if (pathname.includes('/summary')) return 'summary_get';
  if (pathname.includes('/diagnostics')) return 'diagnostics';
  if (pathname.endsWith('/config')) return 'config';
  if (pathname.includes('/upsertConfig')) return 'upsertconfig';
  if (pathname.includes('/jobs/autopilot_tick')) return 'autopilot_tick';
  if (pathname.includes('/cpc-ceilings/batch')) return 'cpc_batch';
  if (pathname.includes('/jobs/autopilot_tick')) return 'autopilot_tick';
  if (pathname.includes('/pixels/ingest')) return 'pixel_ingest';
  if (pathname.includes('/shopify/seo/preview')) return 'seo_preview';
  if (pathname.includes('/shopify/seo/apply')) return 'seo_apply';
  if (pathname.includes('/shopify/tags/batch')) return 'tags_batch';
  if (pathname.includes('/seed-demo')) return 'seed_demo';
  return 'unknown';
}


