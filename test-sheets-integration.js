#!/usr/bin/env node

/**
 * Test Google Sheets Integration for ProofKit
 * Tests CONFIG_* tabs creation and data flow
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: './backend/.env' });

const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3005/api';
const HMAC_SECRET = process.env.HMAC_SECRET;
const TEST_TENANT = process.env.TEST_TENANT || 'mybabybymerry';

// Generate HMAC signature
function sign(payload) {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(payload);
  return hmac.digest('base64').replace(/=+$/, '');
}

async function testSheetsIntegration() {
  console.log('🧪 Testing Google Sheets Integration');
  console.log('================================');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log(`Tenant: ${TEST_TENANT}`);
  console.log('');

  try {
    // Test 1: Fetch configuration (should trigger sheets creation)
    console.log('📋 Test 1: Fetching configuration...');
    const configPayload = `GET:${TEST_TENANT}:config`;
    const configSig = sign(configPayload);
    const configUrl = `${BACKEND_URL}/config?tenant=${TEST_TENANT}&sig=${encodeURIComponent(configSig)}`;

    const configResponse = await fetch(configUrl);
    const configData = await configResponse.json();

    if (configData.ok && configData.config) {
      console.log('✅ Configuration fetched successfully');
      console.log('   - Enabled:', configData.config.enabled);
      console.log('   - Label:', configData.config.label);
      console.log('   - Budget Cap Default:', configData.config.daily_budget_cap_default);
      console.log('   - CPC Ceiling Default:', configData.config.cpc_ceiling_default);
      console.log('   - PROMOTE flag:', configData.config.PROMOTE);

      // Check for required tabs
      const expectedTabs = [
        'CONFIG_MAIN',
        'CONFIG_RSA_MAP',
        'CONFIG_WASTE_NEGATIVE_MAP',
        'CONFIG_BUDGET_CAPS',
        'CONFIG_CPC_CEILINGS',
        'CONFIG_AUDIENCE_MAP'
      ];

      console.log('\n📊 Checking for expected configuration keys:');
      const hasRSAMap = !!configData.config.RSA_MAP;
      const hasWasteNegMap = !!configData.config.WASTE_NEGATIVE_MAP;
      const hasBudgetCaps = !!configData.config.BUDGET_CAPS;
      const hasCPCCeilings = !!configData.config.CPC_CEILINGS;
      const hasAudienceMap = !!configData.config.AUDIENCE_MAP;

      console.log('   - RSA_MAP:', hasRSAMap ? '✅' : '❌');
      console.log('   - WASTE_NEGATIVE_MAP:', hasWasteNegMap ? '✅' : '❌');
      console.log('   - BUDGET_CAPS:', hasBudgetCaps ? '✅' : '❌');
      console.log('   - CPC_CEILINGS:', hasCPCCeilings ? '✅' : '❌');
      console.log('   - AUDIENCE_MAP:', hasAudienceMap ? '✅' : '❌');

    } else {
      console.error('❌ Failed to fetch configuration:', configData);
    }

    // Test 2: Post metrics (should write to sheets)
    console.log('\n📈 Test 2: Posting metrics...');
    const metricsPayload = {
      nonce: Date.now(),
      metrics: [
        [new Date(), 'campaign', 'Test Campaign', '', '12345', 'Test Campaign', 10, 5.50, 2, 1000, 0.01]
      ],
      search_terms: [
        [new Date(), 'Test Campaign', 'Test AdGroup', 'test keyword', 5, 2.50, 1]
      ],
      run_logs: [
        [new Date(), 'Test run log entry']
      ]
    };

    const metricsNonce = metricsPayload.nonce;
    const metricsSigPayload = `POST:${TEST_TENANT}:metrics:${metricsNonce}`;
    const metricsSig = sign(metricsSigPayload);
    const metricsUrl = `${BACKEND_URL}/metrics?tenant=${TEST_TENANT}&sig=${encodeURIComponent(metricsSig)}`;

    const metricsResponse = await fetch(metricsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metricsPayload)
    });

    const metricsData = await metricsResponse.json();

    if (metricsData.ok) {
      console.log('✅ Metrics posted successfully');
      console.log('   - Sheets write:', metricsData.sheets_updated ? '✅' : '❌');
      console.log('   - Supabase write:', metricsData.supabase_updated ? '✅' : '❌');
    } else {
      console.error('❌ Failed to post metrics:', metricsData);
    }

    // Test 3: Update configuration
    console.log('\n⚙️ Test 3: Updating configuration...');
    const updatePayload = {
      nonce: Date.now(),
      settings: {
        test_setting: 'test_value_' + Date.now(),
        daily_budget_cap_default: 5.00,
        cpc_ceiling_default: 0.30,
        PROMOTE: false
      }
    };

    const updateNonce = updatePayload.nonce;
    const updateSigPayload = `POST:${TEST_TENANT}:upsertconfig:${updateNonce}`;
    const updateSig = sign(updateSigPayload);
    const updateUrl = `${BACKEND_URL}/upsertConfig?tenant=${TEST_TENANT}&sig=${encodeURIComponent(updateSig)}`;

    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    const updateData = await updateResponse.json();

    if (updateData.ok) {
      console.log('✅ Configuration updated successfully');
      console.log('   - Sheets updated:', updateData.sheets_success ? '✅' : '❌');
      console.log('   - Supabase updated:', updateData.supabase_success ? '✅' : '❌');

      // Fetch config again to verify update
      console.log('\n🔄 Verifying configuration update...');
      const verifyResponse = await fetch(configUrl);
      const verifyData = await verifyResponse.json();

      if (verifyData.ok && verifyData.config) {
        const testSettingMatches = verifyData.config.test_setting === updatePayload.settings.test_setting;
        const budgetMatches = verifyData.config.daily_budget_cap_default === updatePayload.settings.daily_budget_cap_default;
        const cpcMatches = verifyData.config.cpc_ceiling_default === updatePayload.settings.cpc_ceiling_default;

        console.log('   - Test setting preserved:', testSettingMatches ? '✅' : '❌');
        console.log('   - Budget cap updated:', budgetMatches ? '✅' : '❌');
        console.log('   - CPC ceiling updated:', cpcMatches ? '✅' : '❌');
      }
    } else {
      console.error('❌ Failed to update configuration:', updateData);
    }

    console.log('\n✨ Google Sheets integration test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testSheetsIntegration().catch(console.error);