import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import autocannon from 'autocannon';
import { spawn } from 'child_process';
import crypto from 'crypto';

describe('Performance Load Tests', () => {
  let backendServer;
  let frontendServer;
  const testTenant = 'PERF_TEST_TENANT';
  const hmacSecret = process.env.HMAC_SECRET || 'test-secret';

  // Helper function to create HMAC signatures
  const createSignature = (message) => {
    return crypto.createHmac('sha256', hmacSecret).update(message).digest('hex');
  };

  beforeAll(async () => {
    // Start backend server for testing
    backendServer = spawn('node', ['server.js'], {
      cwd: './backend',
      env: { ...process.env, PORT: '3001', NODE_ENV: 'test' }
    });

    // Start frontend server for testing
    frontendServer = spawn('npm', ['run', 'start:express'], {
      cwd: './shopify-ui',
      env: { ...process.env, PORT: '3000', NODE_ENV: 'test' }
    });

    // Wait for servers to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    if (backendServer) {
      backendServer.kill();
    }
    if (frontendServer) {
      frontendServer.kill();
    }
  });

  describe('Backend API Performance', () => {
    it('should handle high load on health endpoint', async () => {
      const result = await autocannon({
        url: 'http://localhost:3001/api/health',
        connections: 100,
        duration: 30, // 30 seconds
        requests: [
          {
            method: 'GET',
            path: '/api/health'
          }
        ]
      });

      // Performance requirements
      expect(result.latency.average).toBeLessThan(50); // Average latency < 50ms
      expect(result.latency.p99).toBeLessThan(200); // 99th percentile < 200ms
      expect(result.requests.average).toBeGreaterThan(1000); // > 1000 req/sec
      expect(result.errors).toBe(0); // No errors
      
      console.log(`Health endpoint performance:
        Average latency: ${result.latency.average}ms
        99th percentile: ${result.latency.p99}ms
        Requests/sec: ${result.requests.average}
        Errors: ${result.errors}`);
    });

    it('should handle concurrent configuration requests', async () => {
      const message = `GET:${testTenant}:config`;
      const signature = createSignature(message);

      const result = await autocannon({
        url: 'http://localhost:3001',
        connections: 50,
        duration: 20,
        requests: [
          {
            method: 'GET',
            path: `/api/summary?tenant=${testTenant}&sig=${signature}`
          }
        ]
      });

      // Configuration API should handle concurrent requests efficiently
      expect(result.latency.average).toBeLessThan(100); // Average < 100ms
      expect(result.latency.p95).toBeLessThan(250); // 95th percentile < 250ms
      expect(result.requests.average).toBeGreaterThan(400); // > 400 req/sec
      expect(result.errors).toBe(0);

      console.log(`Configuration API performance:
        Average latency: ${result.latency.average}ms
        95th percentile: ${result.latency.p95}ms
        Requests/sec: ${result.requests.average}`);
    });

    it('should handle mixed workload efficiently', async () => {
      const getSignature = createSignature(`GET:${testTenant}:config`);
      const postNonce = Math.floor(Date.now() / 1000).toString();
      const postSignature = createSignature(`POST:${testTenant}:upsertconfig:${postNonce}`);

      const result = await autocannon({
        url: 'http://localhost:3001',
        connections: 30,
        duration: 30,
        requests: [
          {
            method: 'GET',
            path: `/api/summary?tenant=${testTenant}&sig=${getSignature}`,
            weight: 70 // 70% read requests
          },
          {
            method: 'POST',
            path: `/api/upsertConfig?tenant=${testTenant}&sig=${postSignature}`,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              nonce: parseInt(postNonce),
              settings: { label: 'PERF_TEST', default_final_url: 'https://test.com' }
            }),
            weight: 20 // 20% write requests
          },
          {
            method: 'GET',
            path: `/api/insights?tenant=${testTenant}&sig=${getSignature}`,
            weight: 10 // 10% analytics requests
          }
        ]
      });

      // Mixed workload should maintain good performance
      expect(result.latency.average).toBeLessThan(150);
      expect(result.latency.p99).toBeLessThan(500);
      expect(result.requests.average).toBeGreaterThan(200);
      expect(result.non2xx).toBeLessThan(result.requests.total * 0.01); // < 1% error rate

      console.log(`Mixed workload performance:
        Average latency: ${result.latency.average}ms
        99th percentile: ${result.latency.p99}ms
        Requests/sec: ${result.requests.average}
        Error rate: ${(result.non2xx / result.requests.total * 100).toFixed(2)}%`);
    });

    it('should maintain performance under memory pressure', async () => {
      // Create large payload to simulate memory pressure
      const largeData = 'x'.repeat(50000); // 50KB payload
      const nonce = Math.floor(Date.now() / 1000).toString();
      const signature = createSignature(`POST:${testTenant}:upsertconfig:${nonce}`);

      const result = await autocannon({
        url: 'http://localhost:3001',
        connections: 20,
        duration: 15,
        requests: [
          {
            method: 'POST',
            path: `/api/upsertConfig?tenant=${testTenant}&sig=${signature}`,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              nonce: parseInt(nonce),
              settings: { 
                label: 'LARGE_PAYLOAD_TEST',
                default_final_url: 'https://test.com',
                data: largeData
              }
            })
          }
        ]
      });

      // Should handle large payloads without significant degradation
      expect(result.latency.average).toBeLessThan(300);
      expect(result.latency.p99).toBeLessThan(1000);
      expect(result.errors).toBe(0);

      console.log(`Large payload performance:
        Average latency: ${result.latency.average}ms
        99th percentile: ${result.latency.p99}ms`);
    });
  });

  describe('Frontend Performance', () => {
    it('should load dashboard page quickly', async () => {
      const result = await autocannon({
        url: 'http://localhost:3000/app',
        connections: 10,
        duration: 15,
        requests: [
          {
            method: 'GET',
            path: '/app'
          }
        ]
      });

      // Frontend should serve pages quickly
      expect(result.latency.average).toBeLessThan(200);
      expect(result.latency.p95).toBeLessThan(500);
      expect(result.requests.average).toBeGreaterThan(50);
      expect(result.errors).toBe(0);

      console.log(`Frontend dashboard performance:
        Average latency: ${result.latency.average}ms
        95th percentile: ${result.latency.p95}ms
        Requests/sec: ${result.requests.average}`);
    });

    it('should handle static asset requests efficiently', async () => {
      const result = await autocannon({
        url: 'http://localhost:3000',
        connections: 20,
        duration: 10,
        requests: [
          {
            method: 'GET',
            path: '/build/root-*.js', // Built JS files
            weight: 40
          },
          {
            method: 'GET',
            path: '/build/_shared/*.js', // Shared chunks
            weight: 30
          },
          {
            method: 'GET',
            path: '/favicon.ico',
            weight: 30
          }
        ]
      });

      // Static assets should be served very quickly
      expect(result.latency.average).toBeLessThan(100);
      expect(result.latency.p99).toBeLessThan(300);
      expect(result.requests.average).toBeGreaterThan(100);

      console.log(`Static assets performance:
        Average latency: ${result.latency.average}ms
        99th percentile: ${result.latency.p99}ms`);
    });
  });

  describe('End-to-End Performance', () => {
    it('should handle realistic user workflow efficiently', async () => {
      // Simulate realistic user workflow
      const workflows = [
        { path: '/app', weight: 30 }, // Dashboard visits
        { path: '/app/audiences', weight: 25 }, // Audience management
        { path: '/app/insights', weight: 20 }, // Analytics viewing
        { path: '/app/advanced', weight: 15 }, // Advanced features
        { path: '/app/autopilot', weight: 10 } // Autopilot features
      ];

      const result = await autocannon({
        url: 'http://localhost:3000',
        connections: 15,
        duration: 25,
        requests: workflows.map(workflow => ({
          method: 'GET',
          path: workflow.path,
          weight: workflow.weight
        }))
      });

      // Realistic workflow should perform well
      expect(result.latency.average).toBeLessThan(250);
      expect(result.latency.p90).toBeLessThan(500);
      expect(result.requests.average).toBeGreaterThan(30);
      expect(result.non2xx).toBeLessThan(result.requests.total * 0.05); // < 5% error rate

      console.log(`User workflow performance:
        Average latency: ${result.latency.average}ms
        90th percentile: ${result.latency.p90}ms
        Requests/sec: ${result.requests.average}
        Error rate: ${(result.non2xx / result.requests.total * 100).toFixed(2)}%`);
    });

    it('should maintain performance during peak load simulation', async () => {
      // Simulate peak load with both frontend and backend requests
      const getSignature = createSignature(`GET:${testTenant}:config`);

      const backendTest = autocannon({
        url: 'http://localhost:3001',
        connections: 40,
        duration: 20,
        requests: [
          {
            method: 'GET',
            path: `/api/summary?tenant=${testTenant}&sig=${getSignature}`
          }
        ]
      });

      const frontendTest = autocannon({
        url: 'http://localhost:3000',
        connections: 20,
        duration: 20,
        requests: [
          {
            method: 'GET',
            path: '/app'
          }
        ]
      });

      const [backendResult, frontendResult] = await Promise.all([backendTest, frontendTest]);

      // Both services should maintain performance under combined load
      expect(backendResult.latency.average).toBeLessThan(200);
      expect(frontendResult.latency.average).toBeLessThan(300);
      expect(backendResult.errors + frontendResult.errors).toBe(0);

      console.log(`Peak load test results:
        Backend avg latency: ${backendResult.latency.average}ms
        Frontend avg latency: ${frontendResult.latency.average}ms
        Combined RPS: ${backendResult.requests.average + frontendResult.requests.average}`);
    });
  });

  describe('Resource Utilization', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      // Run intensive load test
      await autocannon({
        url: 'http://localhost:3001/api/health',
        connections: 50,
        duration: 30
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (< 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(`Memory usage:
        Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle connection pooling efficiently', async () => {
      // Test connection pool behavior with burst requests
      const burstRequests = Array(10).fill().map(() =>
        autocannon({
          url: 'http://localhost:3001/api/health',
          connections: 10,
          duration: 5
        })
      );

      const results = await Promise.all(burstRequests);

      // All bursts should succeed without connection errors
      results.forEach(result => {
        expect(result.errors).toBe(0);
        expect(result.latency.average).toBeLessThan(100);
      });

      const totalRequests = results.reduce((sum, result) => sum + result.requests.total, 0);
      console.log(`Connection pool test: ${totalRequests} total requests across ${results.length} bursts`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in API response times', async () => {
      // Baseline performance test
      const baseline = await autocannon({
        url: 'http://localhost:3001/api/health',
        connections: 10,
        duration: 10
      });

      // Current performance test
      const current = await autocannon({
        url: 'http://localhost:3001/api/health',
        connections: 10,
        duration: 10
      });

      // Performance should not regress significantly
      const latencyRatio = current.latency.average / baseline.latency.average;
      const throughputRatio = current.requests.average / baseline.requests.average;

      expect(latencyRatio).toBeLessThan(1.2); // Latency shouldn't increase > 20%
      expect(throughputRatio).toBeGreaterThan(0.8); // Throughput shouldn't decrease > 20%

      console.log(`Regression test:
        Latency ratio: ${latencyRatio.toFixed(2)}
        Throughput ratio: ${throughputRatio.toFixed(2)}`);
    });
  });
});