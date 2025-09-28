/**
 * Test script to verify getRSADraftsFromSupabase function
 */

import { getRSADraftsFromSupabase } from './services/rsa-supabase.js';
import { isSupabaseEnabled, getSupabaseClient } from './services/supabase-client.js';

async function testSupabaseDrafts() {
  console.log('🧪 Testing Supabase drafts functionality...\n');

  // Test 1: Check if Supabase is enabled
  console.log('1. Checking Supabase configuration:');
  const enabled = isSupabaseEnabled();
  console.log(`   Supabase enabled: ${enabled}`);

  if (!enabled) {
    console.log('❌ Supabase not enabled. Please set:');
    console.log('   - SUPABASE_ENABLED=true');
    console.log('   - SUPABASE_URL=your_url');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY=your_key');
    return;
  }

  // Test 2: Check Supabase client
  console.log('\n2. Checking Supabase client:');
  const client = getSupabaseClient();
  console.log(`   Client available: ${!!client}`);

  if (!client) {
    console.log('❌ Supabase client not available');
    return;
  }

  // Test 3: Test with a real tenant
  console.log('\n3. Testing getRSADraftsFromSupabase:');
  const testTenant = 'mybabybymerry'; // Use the tenant from your logs
  
  try {
    const result = await getRSADraftsFromSupabase(testTenant);
    
    console.log('📊 Result:', {
      hasResult: !!result,
      isNull: result === null,
      hasDefault: result?.rsa_default?.length || 0,
      hasLibrary: result?.library?.length || 0,
      themes: result?.library?.map(d => d.theme) || []
    });

    if (result && result.library && result.library.length > 0) {
      console.log('\n✅ Success! Found themes:');
      result.library.forEach((draft, i) => {
        console.log(`   ${i + 1}. ${draft.theme}: ${draft.headlines.length} headlines, ${draft.descriptions.length} descriptions`);
      });
    } else {
      console.log('\n⚠️ No themes found. This could mean:');
      console.log('   - No data in Supabase for this tenant');
      console.log('   - Data exists but asset_type is not "rsa"');
      console.log('   - Data exists but missing headlines_pipe/descriptions_pipe');
    }

  } catch (error) {
    console.error('❌ Error testing getRSADraftsFromSupabase:', error.message);
  }

  console.log('\n🏁 Test completed');
}

// Run the test
testSupabaseDrafts().catch(console.error);
