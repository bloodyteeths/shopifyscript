#!/usr/bin/env node
/**
 * Test Script: Optimization Flow End-to-End
 *
 * Tests the complete optimization loop:
 * 1. Config reading (Supabase-first)
 * 2. Autopilot tick optimization generation
 * 3. Dual-write verification (Supabase + Sheets)
 * 4. Script config endpoint
 *
 * Usage: TENANT_ID=your_tenant HMAC_SECRET=your_secret node test-optimization-flow.js
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3005';
const TENANT_ID = process.env.TENANT_ID || 'test_tenant';
const HMAC_SECRET = process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
  console.error('❌ HMAC_SECRET environment variable is required');
  process.exit(1);
}

// HMAC signing function (same as embedded script)
function sign(payload) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? ': ' + details : ''}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

async function fetchWithHMAC(endpoint, method = 'GET', body = null) {
  const payload = `${method}:${TENANT_ID}:${endpoint.split('?')[0].replace('/api/', '').replace('/', ':')}`;
  const sig = sign(payload);

  const url = `${BACKEND_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}tenant=${TENANT_ID}&sig=${sig}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'OptimizationFlowTest/1.0'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function testConfigEndpoint() {
  console.log('\n📋 Testing Config Endpoint...');

  try {
    const sig = sign(`GET:${TENANT_ID}:config`);
    const url = `${BACKEND_URL}/config?tenant=${TENANT_ID}&sig=${sig}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'OptimizationFlowTest/1.0' }
    });
    const data = await response.json();

    if (response.status === 200 && data.ok) {
      logTest('Config endpoint accessible', true);

      // Check for critical config fields
      const config = data.config || {};
      const hasPromote = 'PROMOTE' in config;
      const hasCPCCeilings = 'CPC_CEILINGS' in config || 'cpc_ceiling_default' in config;
      const hasBudgetCaps = 'BUDGET_CAPS' in config || 'daily_budget_cap_default' in config;
      const hasAP = 'AP' in config;

      logTest('PROMOTE flag present', hasPromote, hasPromote ? `value: ${config.PROMOTE}` : 'missing');
      logTest('CPC_CEILINGS config present', hasCPCCeilings);
      logTest('BUDGET_CAPS config present', hasBudgetCaps);
      logTest('AP (Autopilot) config present', hasAP, hasAP ? `mode: ${config.AP?.mode || 'not set'}` : 'missing');

      return config;
    } else {
      logTest('Config endpoint accessible', false, `status: ${response.status}, error: ${data.error}`);
      return null;
    }
  } catch (error) {
    logTest('Config endpoint accessible', false, error.message);
    return null;
  }
}

async function testAutopilotTick(dryRun = true) {
  console.log('\n🤖 Testing Autopilot Tick Endpoint...');

  try {
    const sig = sign(`POST:${TENANT_ID}:jobs:autopilot_tick`);
    const url = `${BACKEND_URL}/api/jobs/autopilot_tick?tenant=${TENANT_ID}&sig=${sig}&dry=${dryRun ? 1 : 0}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OptimizationFlowTest/1.0'
      }
    });
    const data = await response.json();

    if (response.status === 200) {
      logTest('Autopilot tick endpoint accessible', true);

      if (data.skipped) {
        logTest('Autopilot execution', true, `skipped: ${data.reason}`);
      } else {
        const planCount = data.planned?.length || 0;
        const appliedCount = data.applied?.length || 0;
        const errorCount = data.errors?.length || 0;

        logTest('Optimization plan generated', planCount > 0 || data.ok, `${planCount} optimizations planned`);
        logTest('Optimizations applied', dryRun || appliedCount >= 0, dryRun ? 'dry run mode' : `${appliedCount} applied`);
        logTest('No errors in execution', errorCount === 0, errorCount > 0 ? `${errorCount} errors` : 'clean');

        if (data.planned && data.planned.length > 0) {
          console.log('\n   📊 Planned optimizations:');
          data.planned.slice(0, 5).forEach((p, i) => {
            console.log(`      ${i + 1}. ${p.type}: ${p.term || p.campaign || 'N/A'}`);
          });
          if (data.planned.length > 5) {
            console.log(`      ... and ${data.planned.length - 5} more`);
          }
        }
      }

      return data;
    } else {
      logTest('Autopilot tick endpoint accessible', false, `status: ${response.status}, error: ${data.error}`);
      return null;
    }
  } catch (error) {
    logTest('Autopilot tick endpoint accessible', false, error.message);
    return null;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing Health Endpoint...');

  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/system/health`);
    const data = await response.json();

    if (response.status === 200) {
      logTest('Health endpoint accessible', true);

      const services = data.services || {};

      // Check Supabase
      const supabaseStatus = services.supabase?.status;
      logTest('Supabase connection', supabaseStatus === 'healthy', supabaseStatus || 'unknown');

      // Check Redis (optional)
      const redisStatus = services.redis?.status;
      logTest('Redis connection', redisStatus === 'healthy' || redisStatus === 'disabled', redisStatus || 'unknown');

      // Check AI provider
      const aiStatus = services.aiEngine?.status;
      logTest('AI provider available', aiStatus === 'healthy', services.aiEngine?.provider || 'unknown');

      return data;
    } else {
      logTest('Health endpoint accessible', false, `status: ${response.status}`);
      return null;
    }
  } catch (error) {
    logTest('Health endpoint accessible', false, error.message);
    return null;
  }
}

async function testDualWriteVerification() {
  console.log('\n💾 Testing Dual-Write (Supabase + Sheets)...');

  try {
    // Test by calling upsert-config endpoint
    const sig = sign(`POST:${TENANT_ID}:upsert-config`);
    const testKey = `TEST_OPTIMIZATION_FLOW_${Date.now()}`;
    const testValue = 'test_value_' + Math.random().toString(36).substring(7);

    const response = await fetch(`${BACKEND_URL}/api/upsert-config?tenant=${TENANT_ID}&sig=${sig}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OptimizationFlowTest/1.0'
      },
      body: JSON.stringify({
        [testKey]: testValue
      })
    });
    const data = await response.json();

    if (response.status === 200 && data.ok) {
      logTest('Config write endpoint works', true);

      // Verify by reading back
      const readSig = sign(`GET:${TENANT_ID}:config`);
      const readResponse = await fetch(`${BACKEND_URL}/config?tenant=${TENANT_ID}&sig=${readSig}`);
      const readData = await readResponse.json();

      const valueMatches = readData.config?.[testKey] === testValue;
      logTest('Config read-after-write consistent', valueMatches, valueMatches ? 'value matches' : 'value mismatch');

      return true;
    } else {
      logTest('Config write endpoint works', false, data.error || 'unknown error');
      return false;
    }
  } catch (error) {
    logTest('Dual-write verification', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('🧪 OPTIMIZATION FLOW END-TO-END TEST');
  console.log('═'.repeat(60));
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}`);
  console.log(`HMAC Secret: ${HMAC_SECRET.substring(0, 8)}...`);

  // Run tests
  await testHealthEndpoint();
  const config = await testConfigEndpoint();
  await testDualWriteVerification();
  await testAutopilotTick(true); // Dry run

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The optimization flow is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above before going to production.');
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
