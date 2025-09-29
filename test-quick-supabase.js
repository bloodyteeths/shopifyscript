#!/usr/bin/env node

/**
 * Quick test for Supabase - tests only the failing operations
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'backend', '.env') });

import { getSupabaseClient, isSupabaseEnabled } from './backend/services/supabase-client.js';

async function quickTest() {
  console.log('🧪 Quick Supabase Test\n');

  if (!isSupabaseEnabled()) {
    console.log('⚠️  Supabase not enabled');
    return;
  }

  const supabase = getSupabaseClient();
  const testDate = new Date().toISOString().split('T')[0];
  const tenantId = 'quick_test_' + Date.now();

  const tests = [
    {
      name: 'Device Metrics',
      table: 'device_metrics',
      data: {
        tenant_id: tenantId,
        campaign_id: 'test_campaign',
        campaign_name: 'Test Campaign',
        device: 'MOBILE',  // We're sending 'device'
        // device_type is NOT in our data - should be nullable
        date: testDate,
        type: 'SEARCH',
        clicks: 100,
        impressions: 5000,
        cost: 85.00,
        conversions: 5
      }
    },
    {
      name: 'Keyword Performance',
      table: 'keyword_performance',
      data: {
        tenant_id: tenantId,
        keyword_id: 'kw_123',
        keyword_text: 'test keyword',  // We send keyword_text
        // keyword is NOT in our data - should be nullable
        date: testDate,
        campaign_id: 'test_campaign',
        campaign_name: 'Test Campaign',
        clicks: 50,
        impressions: 2000
      }
    },
    {
      name: 'Hourly Patterns',
      table: 'hourly_patterns',
      data: {
        tenant_id: tenantId,
        campaign_id: 'test_campaign',
        campaign_name: 'Test Campaign',
        hour: 14,
        date: testDate,
        // day_of_week is NOT in our data - should be nullable
        clicks: 10,
        impressions: 500
      }
    }
  ];

  console.log('Testing the 3 failing tables:\n');

  for (const test of tests) {
    try {
      console.log(`📝 ${test.name}:`);
      const { data, error } = await supabase
        .from(test.table)
        .insert(test.data)
        .select();

      if (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        if (error.message.includes('not-null')) {
          const column = error.message.match(/column "(\w+)"/)?.[1];
          console.log(`   → Column '${column}' should be nullable`);
        }
      } else {
        console.log(`   ✅ Success!`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  // Cleanup
  for (const test of tests) {
    await supabase.from(test.table).delete().eq('tenant_id', tenantId);
  }

  console.log('\n📌 If you see NOT NULL errors above, run:');
  console.log('   supabase-fix-null-constraints.sql');
}

quickTest().catch(console.error);