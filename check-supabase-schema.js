#!/usr/bin/env node

/**
 * Check current Supabase schema state
 * Shows exactly what columns exist in each table
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load from backend/.env
dotenv.config({ path: join(__dirname, 'backend', '.env') });

import { getSupabaseClient, isSupabaseEnabled } from './backend/services/supabase-client.js';

console.log('🔍 Checking Supabase Schema State\n');
console.log('=====================================\n');

async function checkSchema() {
  if (!isSupabaseEnabled()) {
    console.log('⚠️  Supabase is not enabled.');
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('❌ Could not initialize Supabase client');
    return;
  }

  const tables = [
    'campaign_details',
    'device_metrics',
    'keyword_performance',
    'hourly_patterns',
    'geographic_data',
    'ad_performance'
  ];

  for (const table of tables) {
    console.log(`\n📋 Table: ${table}`);
    console.log('─'.repeat(50));

    try {
      // Get one row to see the columns
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);

        // Try to extract column info from error
        if (error.message.includes('column')) {
          const columnMatch = error.message.match(/column ["'](\w+)["']/);
          if (columnMatch) {
            console.log(`   Missing column: ${columnMatch[1]}`);
          }
        }
      } else {
        // Get column names from the data or empty object
        const sampleRow = data?.[0] || {};
        const columns = Object.keys(sampleRow);

        if (columns.length === 0) {
          // Table is empty, try a different approach
          console.log('   Table is empty, trying to get schema...');

          // Try to get schema with a select that will fail gracefully
          const testColumns = [
            'id', 'tenant_id', 'date', 'campaign_id', 'campaign_name',
            'device', 'location', 'keyword_id', 'ad_id', 'hour',
            'day_of_week', 'type', 'status', 'clicks', 'impressions',
            'cost', 'conversions', 'ctr', 'avg_cpc', 'conversion_rate'
          ];

          const existingColumns = [];
          for (const col of testColumns) {
            const { error: colError } = await supabase
              .from(table)
              .select(col)
              .limit(0);

            if (!colError) {
              existingColumns.push(col);
            }
          }

          if (existingColumns.length > 0) {
            console.log('   Detected columns:');
            existingColumns.forEach(col => {
              console.log(`     ✓ ${col}`);
            });
          } else {
            console.log('   Could not detect columns (table may be empty)');
          }
        } else {
          console.log('   Existing columns:');
          columns.forEach(col => {
            const value = sampleRow[col];
            const type = value === null ? 'null' :
                        typeof value === 'number' ? 'number' :
                        typeof value === 'boolean' ? 'boolean' :
                        value instanceof Date ? 'date' : 'string';
            console.log(`     ✓ ${col} (${type})`);
          });
        }

        // Check for required columns based on our tests
        const requiredColumns = {
          'device_metrics': ['device', 'campaign_name'],
          'keyword_performance': ['keyword_id', 'campaign_name'],
          'hourly_patterns': ['hour', 'campaign_name'],
          'geographic_data': ['location', 'campaign_name'],
          'ad_performance': ['campaign_name', 'ad_group_name']
        };

        if (requiredColumns[table]) {
          console.log('\n   Required columns check:');
          for (const reqCol of requiredColumns[table]) {
            const { error: checkError } = await supabase
              .from(table)
              .select(reqCol)
              .limit(0);

            if (checkError) {
              console.log(`     ❌ Missing: ${reqCol}`);
            } else {
              console.log(`     ✅ Has: ${reqCol}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`   ❌ Unexpected error: ${error.message}`);
    }
  }

  // Check constraints
  console.log('\n\n🔐 Checking Constraints');
  console.log('─'.repeat(50));

  const constraints = [
    { table: 'campaign_details', name: 'campaign_details_unique_key' },
    { table: 'device_metrics', name: 'device_metrics_unique_key' },
    { table: 'keyword_performance', name: 'keyword_performance_unique_key' },
    { table: 'hourly_patterns', name: 'hourly_patterns_unique_key' },
    { table: 'geographic_data', name: 'geographic_data_unique_key' },
    { table: 'ad_performance', name: 'ad_performance_unique_key' }
  ];

  for (const { table, name } of constraints) {
    // Try to trigger the constraint with duplicate data
    const testData = {
      tenant_id: 'constraint_test',
      date: '2025-01-01',
      campaign_id: 'test',
      device: 'MOBILE',
      location: 'US',
      keyword_id: 'test',
      hour: 12,
      ad_id: 'test'
    };

    try {
      // Insert once
      await supabase.from(table).insert(testData);

      // Try to insert again - should fail with constraint
      const { error } = await supabase.from(table).insert(testData);

      if (error && error.message.includes('duplicate')) {
        console.log(`✅ ${name} exists and working`);
      } else if (error) {
        console.log(`⚠️  ${name}: ${error.message.substring(0, 50)}...`);
      } else {
        console.log(`⚠️  ${name} may not be configured`);
      }

      // Clean up
      await supabase.from(table).delete().eq('tenant_id', 'constraint_test');
    } catch (e) {
      // Silent fail
    }
  }

  console.log('\n=====================================');
  console.log('\n📌 SUMMARY:\n');
  console.log('If you see missing columns above, run this SQL in Supabase:');
  console.log('  supabase-fix-missing-columns.sql');
  console.log('\nThen wait 30-60 seconds for the schema cache to refresh.');
}

// Run check
checkSchema().catch(error => {
  console.error('Schema check failed:', error);
  process.exit(1);
});