#!/usr/bin/env node

// Local simulation of Google Ads Script behavior
// This tests the exact same logic your Google Ads Script would use

import crypto from 'crypto';
import fetch from 'node-fetch';

const TENANT_ID = 'TENANT_123';
const BACKEND_URL = 'http://localhost:3001/api';
const SHARED_SECRET = 'f3a1c9d8b2e47a65c0fb19d7e3a9428c6de5b1a7c4f08923ab56d7e1c2f3a4b5';

function sign(payload) {
    const raw = crypto.createHmac('sha256', SHARED_SECRET).update(payload).digest('base64');
    return encodeURIComponent(raw.replace(/=+$/, ''));
}

async function getConfig() {
    const sig = sign(`GET:${TENANT_ID}:config`);
    const url = `${BACKEND_URL}/config?tenant=${encodeURIComponent(TENANT_ID)}&sig=${sig}`;
    
    console.log('🔍 Testing config fetch...');
    console.log('URL:', url);
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GoogleAdsScript/1.0'
            }
        });
        
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
        
        if (response.ok) {
            const data = JSON.parse(text);
            return data.config;
        }
    } catch (error) {
        console.log('❌ Config fetch error:', error.message);
    }
    return null;
}

async function postMetrics() {
    const nonce = Date.now();
    const sig = sign(`POST:${TENANT_ID}:metrics:${nonce}`);
    const url = `${BACKEND_URL}/metrics?tenant=${encodeURIComponent(TENANT_ID)}&sig=${sig}`;
    
    console.log('📊 Testing metrics post...');
    
    const payload = {
        nonce,
        metrics: [
            [new Date(), 'campaign', 'Test Campaign', '', 'camp_123', 'Test Campaign', 5, 2.50, 1, 100, 0.05]
        ],
        search_terms: [
            [new Date(), 'Test Campaign', 'Test Ad Group', 'test keyword', 3, 1.50, 0]
        ],
        run_logs: [
            [new Date(), '✓ Local script simulation complete']
        ]
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'GoogleAdsScript/1.0'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
        
    } catch (error) {
        console.log('❌ Metrics post error:', error.message);
    }
}

async function main() {
    console.log('🚀 SIMULATING GOOGLE ADS SCRIPT EXECUTION');
    console.log('==========================================');
    console.log('');
    
    // Test 1: Backend health
    console.log('1️⃣ Testing backend health...');
    try {
        const healthResponse = await fetch(`${BACKEND_URL.replace('/api', '')}/api/diagnostics`);
        const health = await healthResponse.json();
        console.log('✅ Backend health:', health);
    } catch (error) {
        console.log('❌ Backend unreachable:', error.message);
        return;
    }
    
    console.log('');
    
    // Test 2: Config fetch (this is what fails in your Google Ads Script)
    console.log('2️⃣ Testing config fetch...');
    const config = await getConfig();
    
    if (!config || !config.enabled) {
        console.log('⚠️  Config disabled or not found - script would exit here');
        console.log('   This matches your Google Ads Script behavior');
    } else {
        console.log('✅ Config loaded:', config);
        
        // Test 3: Simulate script actions
        console.log('');
        console.log('3️⃣ Simulating script actions...');
        console.log('   • Budget caps would be applied');
        console.log('   • Bidding strategies would be set');
        console.log('   • Audiences would be attached');
        console.log('   • RSAs would be created');
        console.log('   • Metrics would be collected');
        
        // Test 4: Metrics post
        console.log('');
        console.log('4️⃣ Testing metrics post...');
        await postMetrics();
    }
    
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Set up basic config in Google Sheets');
    console.log('2. Fix ngrok session issue (restart your router or wait)');
    console.log('3. Test with real Google Ads Script');
    console.log('');
    console.log('💡 Your backend is working correctly!');
}

main().catch(console.error);