import crypto from 'crypto';

/**
 * Secure HMAC Secret Validator
 * 
 * Provides production-safe secret validation with fail-fast behavior.
 * Replaces insecure 'change_me' fallbacks throughout the system.
 */

// Minimum security requirements
const MIN_SECRET_LENGTH = 32;
const MIN_ENTROPY_THRESHOLD = 3.0; // bits per character
const FORBIDDEN_SECRETS = [
  'change_me',
  'dev_secret', 
  'test-secret',
  'secret',
  'password',
  'key',
  'default'
];

/**
 * Calculate Shannon entropy of a string
 * Returns bits per character - higher values indicate better randomness
 */
function calculateEntropy(str) {
  const freq = {};
  str.split('').forEach(char => {
    freq[char] = (freq[char] || 0) + 1;
  });
  
  let entropy = 0;
  const len = str.length;
  
  Object.values(freq).forEach(count => {
    const probability = count / len;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  });
  
  return entropy;
}

/**
 * Validates HMAC secret meets production security requirements
 */
export function validateHMACSecret(secret, options = {}) {
  const {
    allowWeakInDev = false,
    environment = process.env.NODE_ENV || 'development'
  } = options;

  // Always fail on missing or null secret
  if (!secret || typeof secret !== 'string') {
    throw new Error('HMAC_SECRET is required and must be a non-empty string');
  }

  // Check for forbidden weak secrets
  const lowerSecret = secret.toLowerCase();
  for (const forbidden of FORBIDDEN_SECRETS) {
    if (lowerSecret.includes(forbidden)) {
      throw new Error(`HMAC_SECRET contains forbidden weak pattern: ${forbidden}`);
    }
  }

  // Length validation
  if (secret.length < MIN_SECRET_LENGTH) {
    const message = `HMAC_SECRET must be at least ${MIN_SECRET_LENGTH} characters (current: ${secret.length})`;
    
    // In development, allow override with warning
    if (allowWeakInDev && environment === 'development') {
      console.warn(`⚠️  WARNING: ${message} - Allowed in development only`);
      return { valid: true, warnings: [message] };
    }
    
    throw new Error(message);
  }

  // Entropy validation for production
  const entropy = calculateEntropy(secret);
  if (entropy < MIN_ENTROPY_THRESHOLD) {
    const message = `HMAC_SECRET has insufficient entropy: ${entropy.toFixed(2)} bits/char (minimum: ${MIN_ENTROPY_THRESHOLD})`;
    
    // In development, allow with warning
    if (allowWeakInDev && environment === 'development') {
      console.warn(`⚠️  WARNING: ${message} - Allowed in development only`);
      return { valid: true, warnings: [message] };
    }
    
    throw new Error(message);
  }

  // Production-specific validation
  if (environment === 'production') {
    // Ensure no common patterns
    if (/^(.)\1{10,}/.test(secret)) {
      throw new Error('HMAC_SECRET cannot contain long repeated character sequences in production');
    }
    
    // Ensure mixed character types
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasNumber = /[0-9]/.test(secret);
    const hasSpecial = /[^a-zA-Z0-9]/.test(secret);
    
    const typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (typeCount < 3) {
      throw new Error('HMAC_SECRET must contain at least 3 character types (lowercase, uppercase, numbers, special) in production');
    }
  }

  return { 
    valid: true, 
    warnings: [],
    entropy: entropy,
    length: secret.length
  };
}

/**
 * Get validated HMAC secret or throw
 * Primary interface for all HMAC operations
 */
export function getValidatedHMACSecret(options = {}) {
  const secret = process.env.HMAC_SECRET;
  
  if (!secret) {
    throw new Error('HMAC_SECRET environment variable is not set');
  }

  validateHMACSecret(secret, options);
  return secret;
}

/**
 * Initialize and validate HMAC secret at startup
 * Call this during application bootstrap
 */
export function initializeHMACValidation(options = {}) {
  try {
    const validation = validateHMACSecret(process.env.HMAC_SECRET, options);
    
    if (validation.warnings.length > 0) {
      console.warn('🔒 HMAC Secret Warnings:');
      validation.warnings.forEach(warning => console.warn(`   ${warning}`));
    }
    
    console.log(`✅ HMAC secret validated (entropy: ${validation.entropy.toFixed(2)} bits/char, length: ${validation.length})`);
    return true;
  } catch (error) {
    console.error('🚨 HMAC SECRET VALIDATION FAILED:');
    console.error(`   ${error.message}`);
    console.error('');
    console.error('🔒 SECURITY REQUIREMENTS:');
    console.error(`   - Minimum ${MIN_SECRET_LENGTH} characters`);
    console.error(`   - High entropy (random characters)`);
    console.error('   - No forbidden patterns (change_me, secret, etc.)');
    console.error('   - Mixed character types in production');
    console.error('');
    console.error('💡 Generate a secure secret:');
    console.error(`   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
    console.error('');
    
    // In production, this should terminate the process
    if (process.env.NODE_ENV === 'production') {
      console.error('🛑 APPLICATION TERMINATED - Fix HMAC_SECRET before deployment');
      process.exit(1);
    }
    
    throw error;
  }
}

/**
 * Generate a cryptographically secure HMAC secret
 * Utility for administrators
 */
export function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length / 2).toString('hex');
}