/**
 * Script Bridge Integration Test
 * Tests the complete Script Communication Bridge functionality
 */

import scriptAuthService from './utils/script-auth.js';
import optimizationQueueService, { PRIORITY_LEVELS, OPTIMIZATION_TYPES } from './services/optimization-queue.js';
import scriptBridgeService, { REQUEST_TYPES, RESPONSE_CODES } from './services/script-bridge.js';
import tenantRegistry from './services/tenant-registry.js';
import dataStore from './services/data-store.js';

console.log('🧪 Starting Script Bridge Integration Test...\n');

async function testScriptBridge() {
  try {
    // Initialize tenant registry
    console.log('1. Initializing tenant registry...');
    await tenantRegistry.initialize();

    // Create test tenant if not exists
    const testTenantId = 'test-tenant-001';
    if (!tenantRegistry.getTenant(testTenantId)) {
      // For testing, we'll manually add a tenant
      tenantRegistry.registry.set(testTenantId, {
        id: testTenantId,
        sheetId: process.env.SHEET_ID || 'test-sheet-id',
        name: 'Test Tenant',
        plan: 'pro',
        enabled: true,
        status: 'active',
        scriptAccess: true,
        config: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    console.log('✅ Tenant registry initialized');

    // Test Authentication
    console.log('\n2. Testing HMAC Authentication...');
    const timestamp = Date.now().toString();
    const nonce = scriptAuthService.generateNonce();
    const testPayload = { test: 'data', tenantId: testTenantId };
    const signature = scriptAuthService.generateSignature(
      testPayload,
      testTenantId,
      timestamp,
      nonce
    );

    const authResult = await scriptAuthService.validateRequest({
      signature,
      payload: JSON.stringify(testPayload),
      tenantId: testTenantId,
      timestamp,
      nonce,
      scriptVersion: '1.0.0'
    });

    if (authResult.valid) {
      console.log('✅ HMAC Authentication successful');
    } else {
      throw new Error(`Authentication failed: ${authResult.message}`);
    }

    // Test Optimization Queue
    console.log('\n3. Testing Optimization Queue...');
    const testOptimization = {
      type: OPTIMIZATION_TYPES.KEYWORD_BID,
      priority: PRIORITY_LEVELS.HIGH,
      data: {
        keywords: [
          { keyword: 'test keyword 1', newBid: 1.50 },
          { keyword: 'test keyword 2', newBid: 2.00 }
        ],
        campaignId: 'test-campaign-123'
      },
      source: 'test_system',
      createdBy: 'test_user',
      estimatedImpact: 'medium',
      confidence: 85,
      tags: ['test', 'automated']
    };

    const queueResult = await optimizationQueueService.addOptimization(testTenantId, testOptimization);
    if (queueResult.success) {
      console.log('✅ Optimization queued successfully:', queueResult.optimizationId);
    } else {
      throw new Error('Failed to queue optimization');
    }

    // Test Bridge Authentication Request
    console.log('\n4. Testing Script Bridge Authentication...');
    const authRequest = {
      type: REQUEST_TYPES.AUTHENTICATE,
      signature: scriptAuthService.generateSignature(
        { tenantId: testTenantId, scriptVersion: '1.0.0', capabilities: ['compression', 'batch_processing'] },
        testTenantId,
        Date.now().toString(),
        scriptAuthService.generateNonce()
      ),
      tenantId: testTenantId,
      timestamp: Date.now().toString(),
      nonce: scriptAuthService.generateNonce(),
      scriptVersion: '1.0.0',
      payload: {
        tenantId: testTenantId,
        scriptVersion: '1.0.0',
        capabilities: ['compression', 'batch_processing']
      }
    };

    const authResponse = await scriptBridgeService.processRequest(authRequest, {
      ip: '127.0.0.1',
      userAgent: 'Test Script Bridge'
    });

    if (authResponse.success) {
      console.log('✅ Script Bridge authentication successful');
      console.log('   Session token received:', authResponse.data.sessionToken.substring(0, 8) + '...');
    } else {
      throw new Error(`Bridge authentication failed: ${authResponse.message}`);
    }

    // Test Get Optimizations
    console.log('\n5. Testing Get Optimizations...');
    const getOptRequest = {
      type: REQUEST_TYPES.GET_OPTIMIZATIONS,
      signature: scriptAuthService.generateSignature(
        { tenantId: testTenantId, limit: 10 },
        testTenantId,
        Date.now().toString(),
        scriptAuthService.generateNonce()
      ),
      tenantId: testTenantId,
      timestamp: Date.now().toString(),
      nonce: scriptAuthService.generateNonce(),
      scriptVersion: '1.0.0',
      payload: {
        tenantId: testTenantId,
        limit: 10
      }
    };

    const getOptResponse = await scriptBridgeService.processRequest(getOptRequest, {
      ip: '127.0.0.1',
      userAgent: 'Test Script Bridge'
    });

    if (getOptResponse.success) {
      console.log('✅ Retrieved optimizations:', getOptResponse.data.count);
      console.log('   Optimizations:', getOptResponse.data.optimizations.map(opt => ({
        id: opt.id,
        type: opt.type,
        priority: opt.priority
      })));
    } else {
      throw new Error(`Get optimizations failed: ${getOptResponse.message}`);
    }

    // Test Submit Results
    console.log('\n6. Testing Submit Results...');
    if (getOptResponse.data.optimizations.length > 0) {
      const optimizationId = getOptResponse.data.optimizations[0].id;

      const submitResultsRequest = {
        type: REQUEST_TYPES.SUBMIT_RESULTS,
        signature: scriptAuthService.generateSignature(
          { tenantId: testTenantId, results: [{ optimizationId, status: 'success', data: { applied: true } }] },
          testTenantId,
          Date.now().toString(),
          scriptAuthService.generateNonce()
        ),
        tenantId: testTenantId,
        timestamp: Date.now().toString(),
        nonce: scriptAuthService.generateNonce(),
        scriptVersion: '1.0.0',
        payload: {
          tenantId: testTenantId,
          results: [{
            optimizationId,
            status: 'success',
            data: {
              applied: true,
              affectedKeywords: 2,
              rollbackData: {
                originalBids: [
                  { keyword: 'test keyword 1', originalBid: 1.25 },
                  { keyword: 'test keyword 2', originalBid: 1.75 }
                ]
              }
            }
          }]
        }
      };

      const submitResponse = await scriptBridgeService.processRequest(submitResultsRequest, {
        ip: '127.0.0.1',
        userAgent: 'Test Script Bridge'
      });

      if (submitResponse.success) {
        console.log('✅ Results submitted successfully');
        console.log('   Processed:', submitResponse.data.processed);
      } else {
        throw new Error(`Submit results failed: ${submitResponse.message}`);
      }
    }

    // Test Submit Metrics
    console.log('\n7. Testing Submit Metrics...');
    const submitMetricsRequest = {
      type: REQUEST_TYPES.SUBMIT_METRICS,
      signature: scriptAuthService.generateSignature(
        {
          tenantId: testTenantId,
          metrics: {
            executionTime: 1250,
            memoryUsage: 45.2,
            apiCalls: 15,
            processedOptimizations: 1,
            successfulOptimizations: 1,
            failedOptimizations: 0
          }
        },
        testTenantId,
        Date.now().toString(),
        scriptAuthService.generateNonce()
      ),
      tenantId: testTenantId,
      timestamp: Date.now().toString(),
      nonce: scriptAuthService.generateNonce(),
      scriptVersion: '1.0.0',
      payload: {
        tenantId: testTenantId,
        metrics: {
          executionTime: 1250,
          memoryUsage: 45.2,
          apiCalls: 15,
          processedOptimizations: 1,
          successfulOptimizations: 1,
          failedOptimizations: 0
        }
      }
    };

    const metricsResponse = await scriptBridgeService.processRequest(submitMetricsRequest, {
      ip: '127.0.0.1',
      userAgent: 'Test Script Bridge'
    });

    if (metricsResponse.success) {
      console.log('✅ Metrics submitted successfully');
    } else {
      throw new Error(`Submit metrics failed: ${metricsResponse.message}`);
    }

    // Test Health Check
    console.log('\n8. Testing Health Check...');
    const healthRequest = {
      type: REQUEST_TYPES.HEALTH_CHECK,
      payload: {}
    };

    const healthResponse = await scriptBridgeService.processRequest(healthRequest, {
      ip: '127.0.0.1',
      userAgent: 'Test Script Bridge'
    });

    if (healthResponse.success) {
      console.log('✅ Health check successful');
      console.log('   System status:', healthResponse.data.status);
    } else {
      throw new Error(`Health check failed: ${healthResponse.message}`);
    }

    // Test Queue Statistics
    console.log('\n9. Testing Queue Statistics...');
    const queueStats = await optimizationQueueService.getQueueStats(testTenantId);
    console.log('✅ Queue statistics retrieved:');
    console.log('   Queue size:', queueStats.queue.total);
    console.log('   Pending:', queueStats.queue.pending);
    console.log('   Success rate:', queueStats.processing.successRate.toFixed(2) + '%');

    // Test Bridge Statistics
    console.log('\n10. Testing Bridge Statistics...');
    const bridgeStats = scriptBridgeService.getStats(testTenantId);
    console.log('✅ Bridge statistics retrieved:');
    console.log('   Active connections:', bridgeStats.activeConnections);
    console.log('   Request metrics:', Object.keys(bridgeStats.requestMetrics || {}).length, 'tracked request types');

    console.log('\n🎉 All Script Bridge Integration Tests Passed!');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('   ✅ HMAC Authentication');
    console.log('   ✅ Optimization Queue Management');
    console.log('   ✅ Script Bridge Authentication');
    console.log('   ✅ Get Optimizations');
    console.log('   ✅ Submit Results');
    console.log('   ✅ Submit Metrics');
    console.log('   ✅ Health Check');
    console.log('   ✅ Queue Statistics');
    console.log('   ✅ Bridge Statistics');

    return true;

  } catch (error) {
    console.error('\n❌ Script Bridge Integration Test Failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run tests
testScriptBridge()
  .then(success => {
    if (success) {
      console.log('\n✅ Script Bridge is ready for production use!');
      process.exit(0);
    } else {
      console.log('\n❌ Script Bridge needs attention before production use.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected test error:', error);
    process.exit(1);
  });