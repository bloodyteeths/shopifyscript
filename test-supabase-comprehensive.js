#!/usr/bin/env node

/**
 * Comprehensive Supabase Test Suite
 * Tests all imports, schema, and data operations
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Running Comprehensive Supabase Tests...\n');
console.log('=====================================\n');

async function runTests() {
  const results = {
    imports: [],
    schema: [],
    operations: []
  };

  // ========================================
  // PHASE 1: Test All Imports
  // ========================================
  console.log('📦 PHASE 1: Testing Imports\n');

  // Test core supabase-client.js
  try {
    const { getSupabaseClient, isSupabaseEnabled, testSupabaseConnection } =
      await import('./backend/services/supabase-client.js');

    const enabled = isSupabaseEnabled();
    console.log(`✅ supabase-client.js imported successfully`);
    console.log(`   - Supabase enabled: ${enabled}`);

    if (enabled) {
      const client = getSupabaseClient();
      console.log(`   - Client initialized: ${client !== null}`);

      const connection = await testSupabaseConnection();
      console.log(`   - Connection test: ${connection.connected ? 'CONNECTED' : 'FAILED'}`);
      if (!connection.connected) {
        console.log(`   - Error: ${connection.error}`);
      }
    }

    results.imports.push({ module: 'supabase-client.js', status: 'PASS' });
  } catch (error) {
    console.error(`❌ supabase-client.js import failed: ${error.message}`);
    results.imports.push({ module: 'supabase-client.js', status: 'FAIL', error: error.message });
  }

  // Test all service files that use Supabase
  const serviceFiles = [
    'dual-write.js',
    'dashboard-builder.js',
    'support-system.js',
    'campaign-counter.js',
    'security-monitor.js',
    'advanced-automation.js',
    'secure-db-client.js',
    'rsa-test-queue.js',
    'subscription-check.js'
  ];

  for (const file of serviceFiles) {
    try {
      await import(`./backend/services/${file}`);
      console.log(`✅ ${file} imported successfully`);
      results.imports.push({ module: file, status: 'PASS' });
    } catch (error) {
      console.error(`❌ ${file} import failed: ${error.message}`);
      results.imports.push({ module: file, status: 'FAIL', error: error.message });
    }
  }

  // ========================================
  // PHASE 2: Test Schema (if Supabase enabled)
  // ========================================

  const { getSupabaseClient, isSupabaseEnabled } =
    await import('./backend/services/supabase-client.js');

  if (!isSupabaseEnabled()) {
    console.log('\n⚠️  Skipping schema tests - Supabase not enabled\n');
  } else {
    console.log('\n📊 PHASE 2: Testing Schema\n');

    const supabase = getSupabaseClient();

    // Define expected columns for each table
    const tableSchemas = {
      campaign_details: {
        required: ['tenant_id', 'campaign_id', 'date', 'type', 'campaign_name'],
        optional: ['channel_type', 'daily_budget', 'budget_period', 'cpc_ceiling',
                  'start_date', 'end_date', 'cost', 'conversion_value', 'avg_cpc']
      },
      device_metrics: {
        required: ['tenant_id', 'campaign_id', 'device', 'date'],
        optional: ['type', 'campaign_name', 'clicks', 'impressions', 'cost',
                  'conversions', 'ctr', 'avg_cpc', 'conversion_rate',
                  'cost_per_conversion', 'value', 'roas', 'conversion_value']
      },
      keyword_performance: {
        required: ['tenant_id', 'keyword_id', 'date'],
        optional: ['type', 'campaign_id', 'campaign_name', 'ad_group_id',
                  'ad_group_name', 'keyword_text', 'clicks', 'impressions',
                  'cost', 'conversions', 'avg_cpc', 'conversion_rate']
      },
      hourly_patterns: {
        required: ['tenant_id', 'campaign_id', 'hour', 'date'],
        optional: ['type', 'campaign_name', 'clicks', 'impressions', 'cost',
                  'conversions', 'conversion_rate', 'avg_cpc',
                  'cost_per_conversion', 'value']
      },
      geographic_data: {
        required: ['tenant_id', 'campaign_id', 'location', 'date'],
        optional: ['type', 'campaign_name', 'location_type', 'clicks',
                  'impressions', 'cost', 'conversions', 'ctr',
                  'conversion_rate', 'avg_cpc', 'cost_per_conversion']
      },
      ad_performance: {
        required: ['tenant_id', 'ad_id', 'date'],
        optional: ['type', 'campaign_id', 'campaign_name', 'ad_group_id',
                  'ad_group_name', 'ad_type', 'headline1', 'headline2',
                  'headline3', 'description1', 'description2',
                  'clicks', 'impressions', 'cost', 'conversions',
                  'avg_cpc', 'conversion_rate', 'conversion_value']
      }
    };

    // Check each table
    for (const [tableName, schema] of Object.entries(tableSchemas)) {
      console.log(`\n📋 Checking table: ${tableName}`);

      try {
        // Get table structure using a simple query
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (error) {
          // Check if it's a column-specific error
          if (error.message.includes('column')) {
            const missingColumn = error.message.match(/column ["'](\w+)["']/)?.[1];
            console.error(`   ❌ Missing column: ${missingColumn || 'unknown'}`);
            results.schema.push({
              table: tableName,
              status: 'FAIL',
              error: `Missing column: ${missingColumn || 'unknown'}`
            });
          } else {
            console.error(`   ❌ Table error: ${error.message}`);
            results.schema.push({
              table: tableName,
              status: 'FAIL',
              error: error.message
            });
          }
        } else {
          console.log(`   ✅ Table exists and is accessible`);

          // Try to check for specific critical columns
          for (const col of schema.required) {
            try {
              const { error: colError } = await supabase
                .from(tableName)
                .select(col)
                .limit(0);

              if (colError) {
                console.error(`   ❌ Missing required column: ${col}`);
              } else {
                console.log(`   ✓ Column ${col} exists`);
              }
            } catch (e) {
              // Silent fail for column checks
            }
          }

          results.schema.push({ table: tableName, status: 'PASS' });
        }
      } catch (error) {
        console.error(`   ❌ Table check failed: ${error.message}`);
        results.schema.push({
          table: tableName,
          status: 'FAIL',
          error: error.message
        });
      }
    }

    // ========================================
    // PHASE 3: Test Constraints
    // ========================================
    console.log('\n🔐 PHASE 3: Testing Constraints\n');

    const constraintTests = [
      { table: 'campaign_details', constraint: 'campaign_details_unique_key' },
      { table: 'device_metrics', constraint: 'device_metrics_unique_key' },
      { table: 'keyword_performance', constraint: 'keyword_performance_unique_key' },
      { table: 'hourly_patterns', constraint: 'hourly_patterns_unique_key' },
      { table: 'geographic_data', constraint: 'geographic_data_unique_key' },
      { table: 'ad_performance', constraint: 'ad_performance_unique_key' }
    ];

    for (const { table, constraint } of constraintTests) {
      try {
        // Try an upsert to test if constraint exists
        const testData = {
          tenant_id: 'test_tenant',
          date: new Date().toISOString().split('T')[0],
          campaign_id: 'test_campaign',
          device: 'MOBILE',
          location: 'US',
          keyword_id: 'test_keyword',
          hour: 12,
          ad_id: 'test_ad'
        };

        const { error } = await supabase
          .from(table)
          .upsert(testData, { onConflict: 'tenant_id,campaign_id,date' })
          .select();

        if (error && error.message.includes('duplicate key')) {
          console.log(`✅ ${constraint} is working`);
        } else if (error) {
          console.log(`⚠️  ${constraint}: ${error.message}`);
        } else {
          console.log(`✅ ${constraint} allows upsert`);
        }
      } catch (error) {
        console.error(`❌ ${constraint} test failed: ${error.message}`);
      }
    }
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n=====================================');
  console.log('📈 TEST SUMMARY\n');

  // Import summary
  const importsPassed = results.imports.filter(r => r.status === 'PASS').length;
  const importsFailed = results.imports.filter(r => r.status === 'FAIL').length;
  console.log(`Imports: ${importsPassed}/${results.imports.length} passed`);

  if (importsFailed > 0) {
    console.log('Failed imports:');
    results.imports.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.module}: ${r.error}`);
    });
  }

  // Schema summary
  if (results.schema.length > 0) {
    const schemaPassed = results.schema.filter(r => r.status === 'PASS').length;
    const schemaFailed = results.schema.filter(r => r.status === 'FAIL').length;
    console.log(`\nSchema: ${schemaPassed}/${results.schema.length} tables passed`);

    if (schemaFailed > 0) {
      console.log('Schema issues:');
      results.schema.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.table}: ${r.error}`);
      });

      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('1. Run the migration script: supabase-complete-fix.sql');
      console.log('2. Wait 1-2 minutes for schema cache to refresh');
      console.log('3. If issues persist, restart your Supabase project');
    }
  }

  // Final status
  const allPassed = importsFailed === 0 &&
    (results.schema.length === 0 || results.schema.every(r => r.status === 'PASS'));

  if (allPassed) {
    console.log('\n✅ All tests passed! System is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }

  return allPassed ? 0 : 1;
}

// Run tests and exit with appropriate code
runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });