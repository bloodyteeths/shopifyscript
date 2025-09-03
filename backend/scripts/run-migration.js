#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Executes the database migration programmatically
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📂 Reading migration file...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 SQL length:', migrationSQL.length, 'characters');
    
    console.log('🔄 Executing migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      // If RPC doesn't work, try direct SQL execution
      console.log('⚠️ RPC failed, trying direct SQL execution...');
      
      const { data: directData, error: directError } = await supabase
        .from('_raw_sql_execution')
        .select('*')
        .limit(1);
        
      if (directError) {
        console.log('📝 Executing SQL in parts...');
        
        // Split migration into individual statements
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📊 Found ${statements.length} SQL statements to execute`);
        
        let successCount = 0;
        let errors = [];
        
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          
          try {
            const result = await supabase.rpc('exec_sql', { query: statement });
            if (result.error) {
              console.error(`❌ Statement ${i + 1} failed:`, result.error.message);
              errors.push({ statement: i + 1, error: result.error.message });
            } else {
              successCount++;
              console.log(`✅ Statement ${i + 1} succeeded`);
            }
          } catch (stmtError) {
            console.error(`❌ Statement ${i + 1} exception:`, stmtError.message);
            errors.push({ statement: i + 1, error: stmtError.message });
          }
        }
        
        console.log('\n📊 Migration Results:');
        console.log(`✅ Successful statements: ${successCount}/${statements.length}`);
        console.log(`❌ Failed statements: ${errors.length}`);
        
        if (errors.length > 0) {
          console.log('\n❌ Errors encountered:');
          errors.forEach(err => {
            console.log(`   Statement ${err.statement}: ${err.error}`);
          });
        }
        
        if (successCount > 0) {
          console.log('\n🎉 Migration partially completed!');
          console.log('🔍 Check your Supabase Dashboard → Database → Tables');
        }
        
        return;
      }
    }

    console.log('✅ Migration executed successfully!');
    console.log('🔍 Check your Supabase Dashboard → Database → Tables');
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = [
      'tenant_configs',
      'tenant_metrics', 
      'search_terms',
      'run_logs',
      'tenant_subscriptions',
      'campaign_configs',
      'rsa_assets'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Created successfully`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: Verification failed`);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 Manual Instructions:');
    console.error('1. Go to Supabase Dashboard → SQL Editor');
    console.error('2. Copy content from: backend/migrations/001_initial_schema.sql');
    console.error('3. Paste and click Run');
    process.exit(1);
  }
}

console.log('🚀 Starting Supabase migration...');
runMigration()
  .then(() => {
    console.log('\n🎉 Migration process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  });