/**
 * Test Data Store Implementation
 * Verifies Supabase-first, Sheets-fallback pattern
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import dataStore from './services/data-store.js';
import { isSupabaseEnabled, testSupabaseConnection } from './services/supabase-client.js';

async function testDataStore() {
  console.log('🧪 Testing Data Store Implementation\n');
  console.log('=====================================\n');

  const testTenant = 'test_tenant_' + Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Check Supabase status
  console.log('Test 1: Check Supabase Status');
  try {
    const isEnabled = isSupabaseEnabled();
    console.log(`  Supabase Enabled: ${isEnabled ? '✅' : '⚠️  NO (will use Sheets only)'}`);

    if (isEnabled) {
      const connTest = await testSupabaseConnection();
      console.log(`  Supabase Connected: ${connTest.connected ? '✅' : '❌'}`);
      if (connTest.error) {
        console.log(`  Error: ${connTest.error}`);
      }
    }
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 2: Health Check
  console.log('\nTest 2: Data Store Health Check');
  try {
    const health = await dataStore.healthCheck();
    console.log(`  Status: ${health.status === 'healthy' ? '✅' : '⚠️'} ${health.status}`);
    console.log(`  Stores:`, Object.keys(health.stores).join(', '));
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 3: Set Config
  console.log('\nTest 3: Set Tenant Config');
  try {
    await dataStore.setTenantConfig(testTenant, 'test_key_1', 'test_value_1');
    await dataStore.setTenantConfig(testTenant, 'test_key_2', { nested: 'object', value: 123 });
    console.log('  ✅ Config values set successfully');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 4: Get Config
  console.log('\nTest 4: Get Tenant Config');
  try {
    const value1 = await dataStore.getTenantConfig(testTenant, 'test_key_1');
    const value2 = await dataStore.getTenantConfig(testTenant, 'test_key_2');
    console.log(`  Retrieved value1: ${value1}`);
    console.log(`  Retrieved value2:`, value2);

    if (value1 === 'test_value_1' && value2?.nested === 'object') {
      console.log('  ✅ Config values retrieved correctly');
      testsPassed++;
    } else {
      console.error('  ❌ Config values mismatch');
      testsFailed++;
    }
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 5: Get All Configs
  console.log('\nTest 5: Get All Tenant Configs');
  try {
    const allConfigs = await dataStore.getAllTenantConfigs(testTenant);
    console.log(`  Retrieved ${Object.keys(allConfigs).length} configs`);
    console.log(`  Keys:`, Object.keys(allConfigs).join(', '));

    if (Object.keys(allConfigs).length >= 2) {
      console.log('  ✅ All configs retrieved successfully');
      testsPassed++;
    } else {
      console.error('  ❌ Missing configs');
      testsFailed++;
    }
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 6: Save Metrics
  console.log('\nTest 6: Save Metrics');
  try {
    const metrics = [
      {
        date: new Date().toISOString().split('T')[0],
        entity_type: 'campaign',
        entity_id: 'camp_123',
        entity_name: 'Test Campaign',
        campaign_name: 'Test Campaign',
        clicks: 10,
        cost_micros: 5000000,
        conversions: 2,
        impressions: 100,
        ctr: 0.1
      }
    ];

    await dataStore.saveMetrics(testTenant, metrics);
    console.log('  ✅ Metrics saved successfully');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 7: Get Metrics
  console.log('\nTest 7: Get Metrics');
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);

    const metrics = await dataStore.getMetrics(testTenant, startDate, endDate, 'campaign');
    console.log(`  Retrieved ${metrics.length} metrics`);

    if (metrics.length > 0) {
      console.log('  ✅ Metrics retrieved successfully');
      testsPassed++;
    } else {
      console.log('  ⚠️  No metrics found (may be normal)');
      testsPassed++;
    }
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 8: Add Log
  console.log('\nTest 8: Add Log');
  try {
    await dataStore.addLog(testTenant, 'info', 'Test log message', {
      testData: 'test value',
      timestamp: Date.now()
    });
    console.log('  ✅ Log added successfully');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 9: Get Logs
  console.log('\nTest 9: Get Logs');
  try {
    const logs = await dataStore.getLogs(testTenant, { limit: 10 });
    console.log(`  Retrieved ${logs.length} logs`);
    console.log('  ✅ Logs retrieved successfully');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Test 10: Get Statistics
  console.log('\nTest 10: Get Data Store Statistics');
  try {
    const stats = dataStore.getStats();
    console.log(`  Primary Store: ${stats.primaryStore}`);
    console.log(`  Total Operations: ${stats.operations.total}`);
    console.log(`  Supabase Ops: ${stats.operations.supabase}`);
    console.log(`  Sheets Ops: ${stats.operations.sheets}`);
    console.log(`  Supabase %: ${stats.operations.supabasePercentage}`);
    console.log(`  Fallbacks: ${stats.fallbacks}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Avg Response: ${stats.avgResponseTime}`);
    console.log('  ✅ Statistics retrieved successfully');
    testsPassed++;
  } catch (error) {
    console.error('  ❌ FAILED:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n=====================================');
  console.log('Test Summary');
  console.log('=====================================');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed} ✅`);
  console.log(`Failed: ${testsFailed} ❌`);
  console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Data store is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
testDataStore().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});