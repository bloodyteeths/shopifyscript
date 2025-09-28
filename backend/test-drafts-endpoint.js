/**
 * Test script to verify the /api/ai/drafts endpoint
 */

import { verify, sign } from './utils/hmac.js';

async function testDraftsEndpoint() {
  console.log('🧪 Testing /api/ai/drafts endpoint...\n');

  const tenant = 'mybabybymerry';
  const payload = `GET:${tenant}:ai_drafts`;
  const sig = sign(payload);

  const url = `http://localhost:3005/api/ai/drafts?tenant=${tenant}&sig=${sig}`;

  console.log('📡 Making request to:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('📊 Response:', {
      ok: data.ok,
      status: response.status,
      hasDefault: data.rsa_default?.length || 0,
      hasLibrary: data.library?.length || 0,
      source: data.source || 'unknown',
      themes: data.library?.map(d => d.theme) || []
    });

    if (data.ok && data.library && data.library.length > 0) {
      console.log('\n✅ Success! Found themes:');
      data.library.forEach((draft, i) => {
        console.log(`   ${i + 1}. ${draft.theme}: ${draft.headlines.length} headlines, ${draft.descriptions.length} descriptions`);
      });
    } else {
      console.log('\n⚠️ No themes found in API response');
    }

  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
  }

  console.log('\n🏁 Test completed');
}

// Run the test
testDraftsEndpoint().catch(console.error);
