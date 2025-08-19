import crypto from 'crypto';
import { getServerShopName } from '../utils/shop-config';

// Secure HMAC secret validation for Shopify UI
function getValidatedSecret(): string {
  const secret = process.env.HMAC_SECRET;
  
  if (!secret) {
    throw new Error('HMAC_SECRET environment variable is required');
  }
  
  // Check for forbidden weak secrets
  const forbidden = ['change_me', 'dev_secret', 'test-secret', 'secret', 'password'];
  const lowerSecret = secret.toLowerCase();
  
  for (const pattern of forbidden) {
    if (lowerSecret.includes(pattern)) {
      throw new Error(`HMAC_SECRET contains forbidden weak pattern: ${pattern}`);
    }
  }
  
  // Length validation (more lenient for UI)
  if (secret.length < 16) {
    throw new Error(`HMAC_SECRET must be at least 16 characters (current: ${secret.length})`);
  }
  
  return secret;
}

export function sign(payload: string): string {
  if (!payload || typeof payload !== 'string') {
    throw new Error('HMAC payload must be a non-empty string');
  }
  
  const secret = getValidatedSecret();
  
  try {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64').replace(/=+$/,'');
  } catch (error) {
    throw new Error(`HMAC signing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function backendFetch(pathname: string, method: 'GET'|'POST', body?: any, shopNameOverride?: string){
  const rawBase = (process.env.BACKEND_PUBLIC_URL || 'https://shopifyscript-backend-9m8gmzrux-atillas-projects-3562cb36.vercel.app/api').replace(/\/$/, '');
  const base = /\/api$/.test(rawBase) ? rawBase : `${rawBase}/api`;
  
  // Use shop name from parameter, environment, or default
  const shopName = shopNameOverride || getServerShopName();
  const op = opKey(method, pathname);
  const nonce = method === 'POST' ? (body?.nonce ?? Date.now()) : undefined;
  const payload = `${method}:${shopName}:${op}${nonce!==undefined?`:${nonce}`:''}`;
  const sig = sign(payload);
  const sep = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(shopName)}&sig=${encodeURIComponent(sig)}`;
  const init: any = { method, headers: {} };
  if (method === 'POST'){ init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body||{}); }
  const res = await fetch(url, init);
  const json = await res.json().catch(()=>({ ok:false }));
  return { status: res.status, json };
}

export async function backendFetchRaw(pathname: string, method: 'GET'|'POST', shopNameOverride?: string){
  const rawBase = (process.env.BACKEND_PUBLIC_URL || 'https://shopifyscript-backend-9m8gmzrux-atillas-projects-3562cb36.vercel.app/api').replace(/\/$/, '');
  const base = /\/api$/.test(rawBase) ? rawBase : `${rawBase}/api`;
  const shopName = shopNameOverride || getServerShopName();
  const op = opKey(method, pathname);
  const nonce = undefined; // raw used for GET CSV
  const payload = `${method}:${shopName}:${op}${nonce!==undefined?`:${nonce}`:''}`;
  const sig = sign(payload);
  const sep = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(shopName)}&sig=${encodeURIComponent(sig)}`;
  return fetch(url, { method });
}

export async function backendFetchText(pathname: string, method: 'GET'|'POST' = 'GET', body?: any, shopNameOverride?: string){
  const rawBase = (process.env.BACKEND_PUBLIC_URL || 'https://shopifyscript-backend-9m8gmzrux-atillas-projects-3562cb36.vercel.app/api').replace(/\/$/, '');
  const base = /\/api$/.test(rawBase) ? rawBase : `${rawBase}/api`;
  const shopName = shopNameOverride || getServerShopName();
  const op = opKey(method, pathname);
  const nonce = method === 'POST' ? (body?.nonce ?? Date.now()) : undefined;
  const payload = `${method}:${shopName}:${op}${nonce!==undefined?`:${nonce}`:''}`;
  const sig = sign(payload);
  const sep = pathname.includes('?') ? '&' : '?';
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(shopName)}&sig=${encodeURIComponent(sig)}`;
  
  console.log(`🌐 backendFetchText calling URL: ${url}`);
  console.log(`🔑 HMAC payload: ${payload}`);
  
  const init: any = { method, headers: {} };
  if (method === 'POST'){ init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(body||{}); }
  
  const res = await fetch(url, init);
  const responseText = await res.text();
  
  console.log(`📥 Backend response: status=${res.status}, length=${responseText.length}, contentType=${res.headers.get('content-type')}`);
  console.log(`📄 Response preview: ${responseText.slice(0, 200)}...`);
  
  return responseText;
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


