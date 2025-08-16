import crypto from 'crypto';

const SECRET = process.env.HMAC_SECRET || 'change_me';

// Sign a payload with HMAC-SHA256
export function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=+$/, '');
}

// Verify HMAC signature
export function verify(sig, payload) {
  try { 
    return sig === sign(payload); 
  } catch { 
    return false; 
  }
}