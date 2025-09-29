#!/usr/bin/env node

/**
 * Test actual Supabase operations that were failing
 * This simulates the exact operations from the Google Ads script
 */

import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient, isSupabaseEnabled } from './backend/services/supabase-client.js';

console.log('🧪 Testing Supabase Operations\n');
console.log('=====================================\n');

async function testOperations() {
  if (!isSupabaseEnabled()) {
    console.log('⚠️  Supabase is not enabled. Set SUPABASE_ENABLED=true and configure credentials.');
    process.exit(0);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('❌ Could not initialize Supabase client');
    process.exit(1);
  }

  const tenantId = 'test_tenant_' + Date.now();
  const testDate = new Date().toISOString().split('T')[0];

  console.log(`Using test tenant: ${tenantId}`);
  console.log(`Test date: ${testDate}\n`);

  const tests = [
    {
      name: 'Campaign Details Upsert',
      table: 'campaign_details',
      data: {
        tenant_id: tenantId,
        campaign_id: 'test_campaign_1',
        date: testDate,
        type: 'SEARCH',
        campaign_name: 'Test Campaign',
        status: 'ENABLED',
        channel_type: 'SEARCH',
        daily_budget: 50.00,
        budget_period: 'DAILY',
        bidding_strategy: 'MAXIMIZE_CLICKS',
        cpc_ceiling: 1.50,
        target_cpa: null,
        target_roas: null,
        start_date: testDate,
        end_date: null,
        cost: 25.50,
        conversion_value: 150.00,
        avg_cpc: 0.85
      }
    },
    {
      name: 'Device Metrics Upsert',
      table: 'device_metrics',
      data: {
        tenant_id: tenantId,
        campaign_id: 'test_campaign_1',
        campaign_name: 'Test Campaign',
        device: 'MOBILE',  // Critical field that was missing!
        date: testDate,
        type: 'SEARCH',
        clicks: 100,
        impressions: 5000,
        cost: 85.00,
        conversions: 5,
        ctr: 0.02,
        avg_cpc: 0.85,
        conversion_rate: 0.05,
        cost_per_conversion: 17.00,
        value: 250.00,
        roas: 2.94,
        conversion_value: 250.00
      }
    },
    {
      name: 'Keyword Performance Upsert',
      table: 'keyword_performance',
      data: {
        tenant_id: tenantId,
        keyword_id: 'kw_123',
        keyword_text: 'test keyword',
        date: testDate,
        type: 'SEARCH',
        campaign_id: 'test_campaign_1',
        campaign_name: 'Test Campaign',
        ad_group_id: 'ag_456',
        ad_group_name: 'Test Ad Group',
        clicks: 50,
        impressions: 2000,
        cost: 42.50,
        conversions: 3,
        ctr: 0.025,
        avg_cpc: 0.85,
        conversion_rate: 0.06,
        search_impression_share: 0.75,
        search_top_impression_share: 0.60
      }
    },
    {
      name: 'Hourly Patterns Upsert',
      table: 'hourly_patterns',
      data: {
        tenant_id: tenantId,
        campaign_id: 'test_campaign_1',
        campaign_name: 'Test Campaign',
        hour: 14,
        date: testDate,
        type: 'SEARCH',
        clicks: 10,
        impressions: 500,
        cost: 8.50,
        conversions: 1,
        conversion_rate: 0.10,
        avg_cpc: 0.85,
        cost_per_conversion: 8.50,
        value: 50.00
      }
    },
    {
      name: 'Geographic Data Upsert',
      table: 'geographic_data',
      data: {
        tenant_id: tenantId,
        campaign_id: 'test_campaign_1',
        campaign_name: 'Test Campaign',
        location: 'United States',  // Critical field!
        location_type: 'COUNTRY',
        date: testDate,
        type: 'SEARCH',
        clicks: 80,
        impressions: 4000,
        cost: 68.00,
        conversions: 4,
        ctr: 0.02,
        conversion_rate: 0.05,
        avg_cpc: 0.85,
        cost_per_conversion: 17.00
      }
    },
    {
      name: 'Ad Performance Upsert',
      table: 'ad_performance',
      data: {
        tenant_id: tenantId,
        ad_id: 'ad_789',
        date: testDate,
        type: 'EXPANDED_TEXT_AD',
        campaign_id: 'test_campaign_1',
        campaign_name: 'Test Campaign',
        ad_group_id: 'ag_456',
        ad_group_name: 'Test Ad Group',
        ad_type: 'EXPANDED_TEXT_AD',
        headline1: 'Test Headline 1',
        headline2: 'Test Headline 2',
        headline3: 'Test Headline 3',
        description1: 'Test Description 1',
        description2: 'Test Description 2',
        clicks: 25,
        impressions: 1000,
        cost: 21.25,
        conversions: 2,
        ctr: 0.025,
        avg_cpc: 0.85,
        conversion_rate: 0.08,
        conversion_value: 100.00
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n📝 Testing: ${test.name}`);
    console.log(`   Table: ${test.table}`);

    try {
      // First, try to insert
      const { data: insertData, error: insertError } = await supabase
        .from(test.table)
        .insert(test.data)
        .select();

      if (insertError) {
        // If insert fails due to duplicate, try upsert
        if (insertError.message.includes('duplicate')) {
          console.log('   ⚠️  Insert failed (duplicate), trying upsert...');

          const { data: upsertData, error: upsertError } = await supabase
            .from(test.table)
            .upsert(test.data)
            .select();

          if (upsertError) {
            console.error(`   ❌ Upsert failed: ${upsertError.message}`);
            results.push({ test: test.name, status: 'FAIL', error: upsertError.message });
          } else {
            console.log(`   ✅ Upsert successful!`);
            results.push({ test: test.name, status: 'PASS' });
          }
        } else {
          console.error(`   ❌ Insert failed: ${insertError.message}`);
          results.push({ test: test.name, status: 'FAIL', error: insertError.message });
        }
      } else {
        console.log(`   ✅ Insert successful!`);
        results.push({ test: test.name, status: 'PASS' });
      }

      // Verify the data was written
      const { data: verifyData, error: verifyError } = await supabase
        .from(test.table)
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (verifyError) {
        console.log(`   ⚠️  Could not verify: ${verifyError.message}`);
      } else {
        console.log(`   ✓ Data verified in database`);
      }

    } catch (error) {
      console.error(`   ❌ Unexpected error: ${error.message}`);
      results.push({ test: test.name, status: 'FAIL', error: error.message });
    }
  }

  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  for (const test of tests) {
    try {
      await supabase
        .from(test.table)
        .delete()
        .eq('tenant_id', tenantId);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 RESULTS SUMMARY\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.test}`);
      console.log(`    Error: ${r.error}`);
    });

    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Run the SQL script: supabase-complete-fix.sql');
    console.log('2. Or run: verify-device-column.sql for quick fix');
    console.log('3. Check Supabase logs for more details');
    console.log('4. Ensure all migrations have been applied');

    // Check for specific known issues
    const deviceError = results.some(r =>
      r.error && r.error.includes("column 'device'")
    );
    const locationError = results.some(r =>
      r.error && r.error.includes("column 'location'")
    );

    if (deviceError) {
      console.log('\n⚠️  DEVICE COLUMN ISSUE DETECTED!');
      console.log('Run this SQL in Supabase:');
      console.log('ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS device VARCHAR(50);');
    }

    if (locationError) {
      console.log('\n⚠️  LOCATION COLUMN ISSUE DETECTED!');
      console.log('Run this SQL in Supabase:');
      console.log('ALTER TABLE geographic_data ADD COLUMN IF NOT EXISTS location TEXT;');
    }

    process.exit(1);
  } else {
    console.log('\n✅ All operations successful!');
    console.log('Your Supabase schema is properly configured.');
    process.exit(0);
  }
}

// Run tests
testOperations().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});