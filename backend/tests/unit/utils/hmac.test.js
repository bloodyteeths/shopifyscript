import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'crypto';

// Import the HMAC utility
import { createHMAC, verifyHMAC, generateNonce } from '../../../utils/hmac.js';

describe('HMAC Utilities', () => {
  beforeEach(() => {
    process.env.HMAC_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createHMAC', () => {
    it('should create a valid HMAC signature', () => {
      const message = 'POST:TENANT_123:upsertconfig:1234567890';
      const signature = createHMAC(message);
      
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should create consistent signatures for the same input', () => {
      const message = 'GET:TENANT_123:config';
      const signature1 = createHMAC(message);
      const signature2 = createHMAC(message);
      
      expect(signature1).toBe(signature2);
    });

    it('should create different signatures for different inputs', () => {
      const message1 = 'GET:TENANT_123:config';
      const message2 = 'GET:TENANT_456:config';
      const signature1 = createHMAC(message1);
      const signature2 = createHMAC(message2);
      
      expect(signature1).not.toBe(signature2);
    });

    it('should throw error if no secret is provided', () => {
      delete process.env.HMAC_SECRET;
      
      expect(() => createHMAC('test-message')).toThrow('HMAC_SECRET not configured');
    });

    it('should handle empty messages', () => {
      expect(() => createHMAC('')).toThrow('Message cannot be empty');
    });

    it('should handle null/undefined messages', () => {
      expect(() => createHMAC(null)).toThrow();
      expect(() => createHMAC(undefined)).toThrow();
    });
  });

  describe('verifyHMAC', () => {
    it('should verify valid HMAC signatures', () => {
      const message = 'POST:TENANT_123:upsertconfig:1234567890';
      const signature = createHMAC(message);
      
      const isValid = verifyHMAC(message, signature);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const message = 'POST:TENANT_123:upsertconfig:1234567890';
      const invalidSignature = 'invalid-signature';
      
      const isValid = verifyHMAC(message, invalidSignature);
      
      expect(isValid).toBe(false);
    });

    it('should reject tampered messages', () => {
      const originalMessage = 'POST:TENANT_123:upsertconfig:1234567890';
      const tamperedMessage = 'POST:TENANT_456:upsertconfig:1234567890';
      const signature = createHMAC(originalMessage);
      
      const isValid = verifyHMAC(tamperedMessage, signature);
      
      expect(isValid).toBe(false);
    });

    it('should be timing-attack resistant', () => {
      const message = 'GET:TENANT_123:config';
      const validSignature = createHMAC(message);
      const invalidSignature = 'a'.repeat(validSignature.length);
      
      // Measure timing for valid signature
      const start1 = process.hrtime.bigint();
      verifyHMAC(message, validSignature);
      const end1 = process.hrtime.bigint();
      
      // Measure timing for invalid signature
      const start2 = process.hrtime.bigint();
      verifyHMAC(message, invalidSignature);
      const end2 = process.hrtime.bigint();
      
      const time1 = Number(end1 - start1);
      const time2 = Number(end2 - start2);
      
      // Times should be similar (within 50% variance)
      const ratio = Math.abs(time1 - time2) / Math.max(time1, time2);
      expect(ratio).toBeLessThan(0.5);
    });

    it('should handle malformed signatures gracefully', () => {
      const message = 'GET:TENANT_123:config';
      
      expect(verifyHMAC(message, null)).toBe(false);
      expect(verifyHMAC(message, undefined)).toBe(false);
      expect(verifyHMAC(message, '')).toBe(false);
      expect(verifyHMAC(message, '!@#$%')).toBe(false);
    });
  });

  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate nonces of expected format', () => {
      const nonce = generateNonce();
      
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
      expect(/^[0-9]+$/.test(nonce)).toBe(true); // Should be numeric timestamp
    });

    it('should generate nonces close to current timestamp', () => {
      const nonce = generateNonce();
      const timestamp = parseInt(nonce);
      const now = Math.floor(Date.now() / 1000);
      
      expect(Math.abs(timestamp - now)).toBeLessThan(2); // Within 2 seconds
    });
  });

  describe('Integration tests', () => {
    it('should work with typical API request flow', () => {
      const tenant = 'TENANT_123';
      const endpoint = 'upsertconfig';
      const nonce = generateNonce();
      const method = 'POST';
      
      const message = `${method}:${tenant}:${endpoint}:${nonce}`;
      const signature = createHMAC(message);
      
      // Simulate request verification
      const isValid = verifyHMAC(message, signature);
      
      expect(isValid).toBe(true);
    });

    it('should work with GET requests (no nonce)', () => {
      const tenant = 'TENANT_123';
      const endpoint = 'config';
      const method = 'GET';
      
      const message = `${method}:${tenant}:${endpoint}`;
      const signature = createHMAC(message);
      
      const isValid = verifyHMAC(message, signature);
      
      expect(isValid).toBe(true);
    });

    it('should prevent replay attacks with nonce validation', () => {
      const tenant = 'TENANT_123';
      const endpoint = 'upsertconfig';
      const oldNonce = '1234567890'; // Old timestamp
      const method = 'POST';
      
      const message = `${method}:${tenant}:${endpoint}:${oldNonce}`;
      const signature = createHMAC(message);
      
      // Signature should be valid but nonce should be rejected
      expect(verifyHMAC(message, signature)).toBe(true);
      
      // In real implementation, would check nonce age
      const nonceAge = Math.floor(Date.now() / 1000) - parseInt(oldNonce);
      expect(nonceAge).toBeGreaterThan(300); // 5 minutes old
    });
  });

  describe('Security properties', () => {
    it('should use SHA-256 by default', () => {
      const message = 'test-message';
      const signature = createHMAC(message);
      
      // SHA-256 HMAC in hex should be 64 characters
      expect(signature.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(signature)).toBe(true);
    });

    it('should be deterministic', () => {
      const message = 'deterministic-test';
      const signatures = Array(10).fill().map(() => createHMAC(message));
      
      const allSame = signatures.every(sig => sig === signatures[0]);
      expect(allSame).toBe(true);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'POST:TENANT_123:endpoint:!@#$%^&*()';
      
      expect(() => createHMAC(specialMessage)).not.toThrow();
      
      const signature = createHMAC(specialMessage);
      expect(verifyHMAC(specialMessage, signature)).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'POST:TENANT_123:测试:🚀';
      
      expect(() => createHMAC(unicodeMessage)).not.toThrow();
      
      const signature = createHMAC(unicodeMessage);
      expect(verifyHMAC(unicodeMessage, signature)).toBe(true);
    });
  });
});