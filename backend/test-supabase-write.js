/**
 * Test Supabase RSA Write Functionality
 * Run with: node test-supabase-write.js
 */

import { writeRSAAssetsToSupabase, getRSADraftsFromSupabase } from './services/rsa-supabase.js';
import { isSupabaseEnabled } from './services/supabase-client.js';

async function testSupabaseWrite() {
  console.log('\n🧪 Testing Supabase RSA Write Functionality\n');

  // Check if Supabase is enabled
  const enabled = isSupabaseEnabled();
  console.log(`Supabase Enabled: ${enabled}`);

  if (!enabled) {
    console.error('❌ Supabase is not enabled. Set SUPABASE_ENABLED=true in environment.');
    process.exit(1);
  }

  const tenant = 'test-tenant';

  // Test 1: Write some test RSA assets
  console.log('\n📝 Test 1: Writing test RSA assets...');
  const testAssets = [
    {
      type: 'headline',
      text: 'Test Headline 1',
      theme: 'test-theme',
      source: 'test'
    },
    {
      type: 'headline',
      text: 'Test Headline 2',
      theme: 'test-theme',
      source: 'test'
    },
    {
      type: 'description',
      text: 'Test Description 1',
      theme: 'test-theme',
      source: 'test'
    }
  ];

  const writeSuccess = await writeRSAAssetsToSupabase(tenant, testAssets);

  if (writeSuccess) {
    console.log('✅ Write test passed');
  } else {
    console.error('❌ Write test failed');
    process.exit(1);
  }

  // Test 2: Read back the assets
  console.log('\n📖 Test 2: Reading back RSA drafts...');
  const drafts = await getRSADraftsFromSupabase(tenant);

  if (drafts) {
    console.log('✅ Read test passed');
    console.log(`   Default drafts: ${drafts.rsa_default?.length || 0}`);
    console.log(`   Library drafts: ${drafts.library?.length || 0}`);
    console.log('\nSample draft:', JSON.stringify(drafts.library?.[0] || drafts.rsa_default?.[0], null, 2));
  } else {
    console.error('❌ Read test failed');
    process.exit(1);
  }

  console.log('\n✅ All Supabase tests passed!\n');
  process.exit(0);
}

testSupabaseWrite().catch(error => {
  console.error('\n❌ Test failed with error:', error);
  process.exit(1);
});