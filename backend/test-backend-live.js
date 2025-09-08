#!/usr/bin/env node

/**
 * Live Backend Testing - Tests actual running backend server
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

const BACKEND_URL = 'http://localhost:3005';
const TEST_TENANT = 'test-validation';

// Helper to create HMAC
function createHMAC(data) {
  const secret = process.env.HMAC_SECRET || 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
}

async function testAPI() {
  console.log('🔍 LIVE BACKEND API TESTING');
  console.log('=' .repeat(40));
  
  // Test 1: Health Check
  console.log('\n1️⃣ Testing Health Endpoint...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Health Data:`, data);
  } catch (error) {
    console.log(`❌ Health Check Failed:`, error.message);
  }
  
  // Test 2: Configuration endpoint
  console.log('\n2️⃣ Testing Configuration Endpoint...');
  try {
    const payload = { tenant_id: TEST_TENANT };
    const hmac = createHMAC(payload);
    
    const response = await fetch(`${BACKEND_URL}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HMAC-Signature': hmac
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`✅ Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Config Response:`, data);
    }
  } catch (error) {
    console.log(`❌ Config Test Failed:`, error.message);
  }
  
  // Test 3: Metrics endpoint  
  console.log('\n3️⃣ Testing Metrics Endpoint...');
  try {
    const payload = { 
      tenant_id: TEST_TENANT,
      date_range: '7d' 
    };
    const hmac = createHMAC(payload);
    
    const response = await fetch(`${BACKEND_URL}/api/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HMAC-Signature': hmac
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`✅ Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Metrics Data:`, Object.keys(data));
    }
  } catch (error) {
    console.log(`❌ Metrics Test Failed:`, error.message);
  }
  
  // Test 4: Insights endpoint
  console.log('\n4️⃣ Testing Insights Endpoint...');
  try {
    const payload = { 
      tenant_id: TEST_TENANT,
      tier: 'professional' 
    };
    const hmac = createHMAC(payload);
    
    const response = await fetch(`${BACKEND_URL}/api/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HMAC-Signature': hmac
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`✅ Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Insights Response:`, Object.keys(data));
    }
  } catch (error) {
    console.log(`❌ Insights Test Failed:`, error.message);
  }
}

testAPI().catch(console.error);