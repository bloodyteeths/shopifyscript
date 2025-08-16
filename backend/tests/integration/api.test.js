import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

// Mock dependencies
jest.unstable_mockModule('../../sheets.js', () => ({
  getDoc: jest.fn(),
  ensureSheet: jest.fn(),
  getDocById: jest.fn()
}));

jest.unstable_mockModule('../../services/sheets.js', () => ({
  default: {
    addRows: jest.fn(),
    getRows: jest.fn()
  }
}));

// Import the server
const { default: app } = await import('../../server.js');

describe('API Integration Tests', () => {
  let server;
  const testTenant = 'TENANT_TEST';
  const hmacSecret = process.env.HMAC_SECRET || 'test-secret';

  // Helper function to create HMAC signatures
  const createSignature = (message) => {
    return crypto.createHmac('sha256', hmacSecret).update(message).digest('hex');
  };

  beforeAll(async () => {
    // Start the server on a test port
    const port = process.env.TEST_PORT || 3002;
    server = app.listen(port);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('GET /api/health should return OK', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({ ok: true });
    });

    it('should respond quickly to health checks', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should respond in under 100ms
    });
  });

  describe('Configuration Management', () => {
    describe('POST /api/upsertConfig', () => {
      it('should accept valid HMAC signed requests', async () => {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const message = `POST:${testTenant}:upsertconfig:${nonce}`;
        const signature = createSignature(message);

        const configData = {
          nonce: parseInt(nonce),
          settings: {
            label: 'TEST_CONFIG',
            default_final_url: 'https://test.example.com'
          }
        };

        const response = await request(app)
          .post(`/api/upsertConfig?tenant=${testTenant}&sig=${signature}`)
          .send(configData)
          .expect(200);

        expect(response.body.ok).toBe(true);
      });

      it('should reject requests with invalid HMAC', async () => {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const invalidSignature = 'invalid-signature';

        const configData = {
          nonce: parseInt(nonce),
          settings: {
            label: 'TEST_CONFIG'
          }
        };

        await request(app)
          .post(`/api/upsertConfig?tenant=${testTenant}&sig=${invalidSignature}`)
          .send(configData)
          .expect(403);
      });

      it('should reject requests with old nonce', async () => {
        const oldNonce = (Math.floor(Date.now() / 1000) - 3600).toString(); // 1 hour old
        const message = `POST:${testTenant}:upsertconfig:${oldNonce}`;
        const signature = createSignature(message);

        const configData = {
          nonce: parseInt(oldNonce),
          settings: {
            label: 'TEST_CONFIG'
          }
        };

        await request(app)
          .post(`/api/upsertConfig?tenant=${testTenant}&sig=${signature}`)
          .send(configData)
          .expect(400);
      });

      it('should validate required configuration fields', async () => {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const message = `POST:${testTenant}:upsertconfig:${nonce}`;
        const signature = createSignature(message);

        const invalidConfigData = {
          nonce: parseInt(nonce),
          settings: {
            // Missing required label field
            default_final_url: 'https://test.example.com'
          }
        };

        await request(app)
          .post(`/api/upsertConfig?tenant=${testTenant}&sig=${signature}`)
          .send(invalidConfigData)
          .expect(400);
      });
    });

    describe('GET /api/summary', () => {
      it('should return tenant configuration', async () => {
        const message = `GET:${testTenant}:config`;
        const signature = createSignature(message);

        const response = await request(app)
          .get(`/api/summary?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        expect(response.body).toHaveProperty('ok', true);
        expect(response.body).toHaveProperty('config');
      });

      it('should cache configuration responses', async () => {
        const message = `GET:${testTenant}:config`;
        const signature = createSignature(message);

        // First request
        const response1 = await request(app)
          .get(`/api/summary?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        // Second request should be faster (cached)
        const start = Date.now();
        const response2 = await request(app)
          .get(`/api/summary?tenant=${testTenant}&sig=${signature}`)
          .expect(200);
        const duration = Date.now() - start;

        expect(response2.headers['x-cache']).toBe('HIT');
        expect(duration).toBeLessThan(50); // Cached response should be very fast
      });
    });
  });

  describe('Insights API', () => {
    describe('GET /api/insights', () => {
      it('should return insights data', async () => {
        const message = `GET:${testTenant}:insights`;
        const signature = createSignature(message);

        const response = await request(app)
          .get(`/api/insights?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        expect(response.body).toHaveProperty('insights');
        expect(response.body.insights).toBeInstanceOf(Array);
      });

      it('should support date range filtering', async () => {
        const message = `GET:${testTenant}:insights`;
        const signature = createSignature(message);

        const startDate = '2024-01-01';
        const endDate = '2024-12-31';

        const response = await request(app)
          .get(`/api/insights?tenant=${testTenant}&sig=${signature}&start=${startDate}&end=${endDate}`)
          .expect(200);

        expect(response.body.insights).toBeDefined();
      });

      it('should validate date range parameters', async () => {
        const message = `GET:${testTenant}:insights`;
        const signature = createSignature(message);

        const invalidStartDate = 'invalid-date';
        const endDate = '2024-12-31';

        await request(app)
          .get(`/api/insights?tenant=${testTenant}&sig=${signature}&start=${invalidStartDate}&end=${endDate}`)
          .expect(400);
      });
    });

    describe('GET /api/insights/terms', () => {
      it('should return search terms data', async () => {
        const message = `GET:${testTenant}:insights:terms`;
        const signature = createSignature(message);

        const response = await request(app)
          .get(`/api/insights/terms?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        expect(response.body).toHaveProperty('terms');
      });
    });

    describe('GET /api/insights/terms.csv', () => {
      it('should return CSV format', async () => {
        const message = `GET:${testTenant}:insights:terms:csv`;
        const signature = createSignature(message);

        const response = await request(app)
          .get(`/api/insights/terms.csv?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('term,impressions,clicks'); // Expected CSV headers
      });
    });
  });

  describe('Audience Management', () => {
    describe('GET /api/audiences', () => {
      it('should return audience data', async () => {
        const message = `GET:${testTenant}:audiences`;
        const signature = createSignature(message);

        const response = await request(app)
          .get(`/api/audiences?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        expect(response.body).toHaveProperty('audiences');
        expect(response.body.audiences).toBeInstanceOf(Array);
      });
    });

    describe('POST /api/audiences', () => {
      it('should create new audience', async () => {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const message = `POST:${testTenant}:audiences:${nonce}`;
        const signature = createSignature(message);

        const audienceData = {
          nonce: parseInt(nonce),
          name: 'Test Audience',
          criteria: {
            age: '25-34',
            interests: ['technology']
          }
        };

        const response = await request(app)
          .post(`/api/audiences?tenant=${testTenant}&sig=${signature}`)
          .send(audienceData)
          .expect(201);

        expect(response.body.ok).toBe(true);
        expect(response.body.audienceId).toBeDefined();
      });
    });
  });

  describe('AI Content Generation', () => {
    describe('POST /api/ai/generate', () => {
      it('should generate AI content', async () => {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const message = `POST:${testTenant}:ai:generate:${nonce}`;
        const signature = createSignature(message);

        const promptData = {
          nonce: parseInt(nonce),
          prompt: 'Generate a test ad headline',
          type: 'headline'
        };

        const response = await request(app)
          .post(`/api/ai/generate?tenant=${testTenant}&sig=${signature}`)
          .send(promptData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.content).toBeDefined();
      });

      it('should handle rate limiting', async () => {
        const nonce = Math.floor(Date.now() / 1000).toString();
        const message = `POST:${testTenant}:ai:generate:${nonce}`;
        const signature = createSignature(message);

        const promptData = {
          nonce: parseInt(nonce),
          prompt: 'Generate content',
          type: 'headline'
        };

        // Make multiple rapid requests
        const requests = Array(10).fill().map(() =>
          request(app)
            .post(`/api/ai/generate?tenant=${testTenant}&sig=${signature}`)
            .send({ ...promptData, nonce: promptData.nonce + Math.random() })
        );

        const responses = await Promise.all(requests);
        
        // Some should be rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Metrics and Analytics', () => {
    describe('GET /api/metrics', () => {
      it('should return performance metrics', async () => {
        const message = `GET:${testTenant}:metrics`;
        const signature = createSignature(message);

        const response = await request(app)
          .get(`/api/metrics?tenant=${testTenant}&sig=${signature}`)
          .expect(200);

        expect(response.body).toHaveProperty('metrics');
        expect(response.body.metrics).toHaveProperty('operations');
        expect(response.body.metrics).toHaveProperty('cacheHitRatio');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tenant parameter', async () => {
      await request(app)
        .get('/api/summary')
        .expect(400);
    });

    it('should handle missing signature parameter', async () => {
      await request(app)
        .get(`/api/summary?tenant=${testTenant}`)
        .expect(400);
    });

    it('should handle malformed JSON in POST requests', async () => {
      const nonce = Math.floor(Date.now() / 1000).toString();
      const message = `POST:${testTenant}:upsertconfig:${nonce}`;
      const signature = createSignature(message);

      await request(app)
        .post(`/api/upsertConfig?tenant=${testTenant}&sig=${signature}`)
        .send('invalid-json')
        .expect(400);
    });

    it('should handle internal server errors gracefully', async () => {
      // Force an internal error by providing invalid data that would cause processing to fail
      const nonce = Math.floor(Date.now() / 1000).toString();
      const message = `POST:${testTenant}:upsertconfig:${nonce}`;
      const signature = createSignature(message);

      const response = await request(app)
        .post(`/api/upsertConfig?tenant=${testTenant}&sig=${signature}`)
        .send({
          nonce: parseInt(nonce),
          settings: null // This should cause an error
        });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('Security Tests', () => {
    it('should reject requests without proper CORS headers in production', async () => {
      // This test would be more relevant in a production environment
      // For now, just verify CORS middleware is present
      const response = await request(app)
        .options('/api/health')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      // Ensure no stack traces or sensitive data in error response
      expect(response.body).not.toHaveProperty('stack');
      expect(response.text).not.toContain('at ');
    });

    it('should handle SQL injection attempts in query parameters', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const message = `GET:${testTenant}:insights`;
      const signature = createSignature(message);

      const response = await request(app)
        .get(`/api/insights?tenant=${testTenant}&sig=${signature}&search=${encodeURIComponent(maliciousInput)}`)
        .expect(200);

      // Should handle malicious input safely
      expect(response.body).toHaveProperty('insights');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const message = `GET:${testTenant}:config`;
      const signature = createSignature(message);

      const concurrentRequests = Array(20).fill().map(() =>
        request(app)
          .get(`/api/summary?tenant=${testTenant}&sig=${signature}`)
      );

      const start = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 20 concurrent requests
    });

    it('should respond to API calls within SLA limits', async () => {
      const message = `GET:${testTenant}:config`;
      const signature = createSignature(message);

      const start = Date.now();
      
      await request(app)
        .get(`/api/summary?tenant=${testTenant}&sig=${signature}`)
        .expect(200);
      
      const duration = Date.now() - start;
      
      // Should respond within 200ms SLA
      expect(duration).toBeLessThan(200);
    });
  });
});