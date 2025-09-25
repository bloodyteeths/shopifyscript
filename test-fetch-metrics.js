#!/usr/bin/env node

/**
 * Test script to fetch actual Google Ads metrics from backend
 * This will show what data was collected from your Google Ads account
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const BACKEND_URL = 'https://ads-autopilot-backend.vercel.app/api';
const HMAC_SECRET = process.env.HMAC_SECRET || 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';
const TENANT_ID = 'mybabybymerry';

function sign(payload) {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(payload);
  return hmac.digest('base64').replace(/=+$/, '');
}

async function fetchMetrics() {
  try {
    console.log('🔍 Fetching metrics for tenant:', TENANT_ID);
    console.log('📍 Backend URL:', BACKEND_URL);

    // Fetch config to see what's stored
    const configPayload = `GET:${TENANT_ID}:config`;
    const configSig = sign(configPayload);
    const configUrl = `${BACKEND_URL}/config?tenant=${encodeURIComponent(TENANT_ID)}&sig=${encodeURIComponent(configSig)}`;

    console.log('\n📊 Fetching configuration...');
    const configResponse = await fetch(configUrl, {
      headers: {
        'User-Agent': 'MetricsTest/1.0',
      },
    });

    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Config fetched successfully');

      // Check if there are any metrics-related settings
      if (configData.config) {
        console.log('\n📈 Metrics Configuration:');
        console.log('- Budget Cap:', configData.config.daily_budget_cap_default || 'Not set');
        console.log('- CPC Ceiling:', configData.config.cpc_ceiling_default || 'Not set');
        console.log('- Label:', configData.config.label || 'Not set');
        console.log('- Lookback Period:', configData.config.st_lookback || 'LAST_7_DAYS');
      }
    } else {
      console.log('❌ Failed to fetch config:', configResponse.status, configResponse.statusText);
    }

    // Try to fetch analytics/tier-features to see subscription info
    console.log('\n📊 Checking analytics tier features...');
    const tierUrl = `${BACKEND_URL}/analytics/tier-features?tenant=${encodeURIComponent(TENANT_ID)}`;
    const tierResponse = await fetch(tierUrl, {
      headers: {
        'X-Tenant-Id': TENANT_ID,
      },
    });

    if (tierResponse.ok) {
      const tierData = await tierResponse.json();
      console.log('✅ Tier features:', tierData);
    } else {
      console.log('⚠️ Could not fetch tier features');
    }

    console.log('\n📋 Summary:');
    console.log('Your metrics are being stored in Google Sheets in the sheet: METRICS_' + TENANT_ID);
    console.log('To view your actual data:');
    console.log('1. Open your Google Sheet (check SHEET_ID in .env)');
    console.log('2. Look for the "METRICS_mybabybymerry" tab');
    console.log('3. You should see columns: date, level, campaign, ad_group, id, name, clicks, cost, conversions, impr, ctr');
    console.log('\nThe insights page currently shows demo data. To see real data, the frontend needs to be updated to fetch from the backend.');

  } catch (error) {
    console.error('❌ Error fetching metrics:', error);
  }
}

// Run the test
fetchMetrics();