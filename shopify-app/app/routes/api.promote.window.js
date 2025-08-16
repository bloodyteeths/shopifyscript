export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ ok:false });
  const TENANT = process.env.TENANT_ID || 'TENANT_123';
  const SECRET  = process.env.HMAC_SECRET || 'change_me';
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001/api';
  const crypto = (await import('crypto')).default || (await import('crypto'));
  function sign(payload){ return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=+$/,''); }
  const nonce = Number(req.body?.nonce || Date.now());
  const sig = sign(`POST:${TENANT}:promote_window:${nonce}`);
  const r = await fetch(`${BACKEND}/promote/window?tenant=${encodeURIComponent(TENANT)}&sig=${encodeURIComponent(sig)}`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(req.body||{}) });
  const j = await r.json();
  res.status(r.status).json(j);
}




