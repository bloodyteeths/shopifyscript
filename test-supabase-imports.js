#!/usr/bin/env node

/**
 * Test script to verify all Supabase imports work correctly
 */

console.log('Testing Supabase imports...\n');

async function testImports() {
  const results = [];

  // Test 1: supabase-client.js exports
  try {
    const { supabase, getSupabaseClient, isSupabaseEnabled } = await import('./backend/services/supabase-client.js');

    console.log('✅ supabase-client.js imports successfully');
    console.log(`   - supabase is: ${supabase === null ? 'null (expected if not configured)' : 'initialized'}`);
    console.log(`   - getSupabaseClient is: ${typeof getSupabaseClient}`);
    console.log(`   - isSupabaseEnabled returns: ${isSupabaseEnabled()}`);

    results.push({ file: 'supabase-client.js', status: 'PASS' });
  } catch (error) {
    console.error('❌ supabase-client.js import failed:', error.message);
    results.push({ file: 'supabase-client.js', status: 'FAIL', error: error.message });
  }

  // Test 2: dual-write.js
  try {
    const dualWrite = await import('./backend/services/dual-write.js');
    console.log('✅ dual-write.js imports successfully');
    results.push({ file: 'dual-write.js', status: 'PASS' });
  } catch (error) {
    console.error('❌ dual-write.js import failed:', error.message);
    results.push({ file: 'dual-write.js', status: 'FAIL', error: error.message });
  }

  // Test 3: dashboard-builder.js
  try {
    const dashboardBuilder = await import('./backend/services/dashboard-builder.js');
    console.log('✅ dashboard-builder.js imports successfully');
    results.push({ file: 'dashboard-builder.js', status: 'PASS' });
  } catch (error) {
    console.error('❌ dashboard-builder.js import failed:', error.message);
    results.push({ file: 'dashboard-builder.js', status: 'FAIL', error: error.message });
  }

  // Test 4: support-system.js
  try {
    const supportSystem = await import('./backend/services/support-system.js');
    console.log('✅ support-system.js imports successfully');
    results.push({ file: 'support-system.js', status: 'PASS' });
  } catch (error) {
    console.error('❌ support-system.js import failed:', error.message);
    results.push({ file: 'support-system.js', status: 'FAIL', error: error.message });
  }

  // Test 5: subscription-check.js dynamic import
  try {
    // Simulate the dynamic import pattern used in subscription-check.js
    const { getSupabaseClient } = await import('./backend/services/supabase-client.js');
    const supabase = getSupabaseClient();
    console.log('✅ subscription-check.js dynamic import pattern works');
    console.log(`   - Dynamic supabase client is: ${supabase === null ? 'null (expected if not configured)' : 'initialized'}`);
    results.push({ file: 'subscription-check.js pattern', status: 'PASS' });
  } catch (error) {
    console.error('❌ subscription-check.js dynamic import pattern failed:', error.message);
    results.push({ file: 'subscription-check.js pattern', status: 'FAIL', error: error.message });
  }

  // Test 6: Check other service files
  const otherFiles = [
    './backend/services/campaign-counter.js',
    './backend/services/security-monitor.js',
    './backend/services/advanced-automation.js',
    './backend/services/secure-db-client.js',
    './backend/services/rsa-test-queue.js'
  ];

  for (const file of otherFiles) {
    try {
      await import(file);
      console.log(`✅ ${file} imports successfully`);
      results.push({ file, status: 'PASS' });
    } catch (error) {
      console.error(`❌ ${file} import failed:`, error.message);
      results.push({ file, status: 'FAIL', error: error.message });
    }
  }

  // Summary
  console.log('\n========== TEST SUMMARY ==========');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Supabase imports are working correctly.');
    console.log('Note: Supabase client will be null if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.');
    process.exit(0);
  }
}

// Run tests
testImports().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});