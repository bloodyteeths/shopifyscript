import crypto from 'crypto';
import { getValidatedHMACSecret } from './secret-validator.js';

// Get validated secret - throws on missing/weak secrets
const SECRET = getValidatedHMACSecret({ 
  allowWeakInDev: true, // Allow weak secrets in development only
  environment: process.env.NODE_ENV || 'development'
});

// Sign a payload with HMAC-SHA256
export function sign(payload) {
  if (!payload || typeof payload !== 'string') {
    throw new Error('HMAC payload must be a non-empty string');
  }
  
  try {
    return crypto.createHmac('sha256', SECRET).update(payload).digest('base64').replace(/=+$/, '');
  } catch (error) {
    throw new Error(`HMAC signing failed: ${error.message}`);
  }
}

// Verify HMAC signature
export function verify(sig, payload) {
  if (!sig || !payload) {
    return false;
  }
  
  try { 
    return sig === sign(payload); 
  } catch (error) {
    console.error('HMAC verification error:', error.message);
    return false; 
  }
}

// Create HMAC for compatibility with existing code
export function createHMAC(payload) {
  if (!process.env.HMAC_SECRET) {
    throw new Error('HMAC_SECRET not configured');
  }
  return sign(payload);
}