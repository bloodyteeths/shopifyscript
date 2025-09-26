#!/usr/bin/env node

/**
 * Test AI Dashboard endpoints
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3005/api';
const HMAC_SECRET = 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';
const TENANT = 'proofkit';

function generateHMAC(tenant, timestamp) {
  const payload = JSON.stringify({ tenant, timestamp });
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

async function testEndpoint(path, method = 'GET', body = null) {
  const timestamp = Date.now();
  const hmac = generateHMAC(TENANT, timestamp);

  const options = {
    method,
    headers: {
      'X-HMAC-Signature': hmac,
      'X-Tenant-ID': TENANT,
      'X-Timestamp': timestamp.toString(),
      'Content-Type': 'application/json'
    }
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`\n📡 Testing ${method} ${path}`);
    const response = await fetch(`${BACKEND_URL}${path}`, options);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Success (${response.status}):`, JSON.stringify(data, null, 2));
    } else {
      console.log(`❌ Error (${response.status}):`, JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing AI Dashboard Endpoints\n');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Tenant: ${TENANT}`);
  console.log('=' .repeat(50));

  // Test 1: AI Provider Status
  console.log('\nTest 1: AI Provider Status');
  await testEndpoint('/ai/provider/status');

  // Test 2: AI Drafts
  console.log('\nTest 2: AI Drafts');
  await testEndpoint('/ai/drafts');

  // Test 3: Token Usage
  console.log('\nTest 3: Token Usage');
  await testEndpoint('/ai/tokens/usage');

  // Test 4: AI Logs
  console.log('\nTest 4: AI Activity Logs');
  await testEndpoint('/ai/logs?limit=5');

  // Test 5: Trigger AI Writer (dry run)
  console.log('\nTest 5: Trigger AI Writer (dry run)');
  await testEndpoint('/jobs/ai_writer', 'POST', {
    dryRun: true,
    limit: 3
  });

  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed');
  console.log('\nIf the endpoints returned data, the AI Dashboard should work correctly.');
  console.log('The Shopify UI app needs to be running to test the full dashboard UI.');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});