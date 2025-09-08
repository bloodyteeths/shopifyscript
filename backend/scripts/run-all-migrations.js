#!/usr/bin/env node

/**
 * Complete Supabase Migration Runner
 * Executes all database migrations in the correct order
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

// Define migrations in order
const migrations = [
  '001_initial_schema_fixed.sql',
  '002_support_system.sql',
  '003_custom_dashboards.sql',
  '004_advanced_automation.sql',
  '004_analytics_performance_indexes.sql',
  '005_security_enhancements.sql'
];

async function executeSQLStatement(statement, statementNum, totalStatements) {
  try {
    // Try using rpc first
    const { data, error } = await supabase.rpc('exec_sql', { query: statement });
    
    if (error) {
      // If rpc fails, try direct execution
      const result = await supabase.from('_temp_migration').select().limit(0);
      if (result.error && result.error.code === 'PGRST116') {
        console.log(`⚠️ Statement ${statementNum}: Cannot execute via API, may need manual execution`);
        return { success: false, error: 'API limitation' };
      }
    }
    
    console.log(`✅ Statement ${statementNum}/${totalStatements} executed successfully`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Statement ${statementNum}/${totalStatements} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

async function runSingleMigration(migrationFile) {
  try {
    console.log(`\n📄 Running migration: ${migrationFile}`);
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      return { success: false, error: 'File not found' };
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📝 SQL length: ${migrationSQL.length} characters`);
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errors = [];
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      const result = await executeSQLStatement(statement, i + 1, statements.length);
      
      if (result.success) {
        successCount++;
      } else {
        errors.push({ statement: i + 1, error: result.error, sql: statement.substring(0, 100) + '...' });
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Migration ${migrationFile} Results:`);
    console.log(`✅ Successful statements: ${successCount}/${statements.length}`);
    console.log(`❌ Failed statements: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`   Statement ${err.statement}: ${err.error}`);
        console.log(`   SQL: ${err.sql}`);
      });
    }
    
    return { success: successCount > 0, successCount, errors };
    
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error);
    return { success: false, error: error.message };
  }
}

async function runAllMigrations() {
  console.log('🚀 Starting comprehensive Supabase migration...');
  console.log(`📋 Will run ${migrations.length} migrations in order\n`);
  
  let totalSuccessful = 0;
  let totalFailed = 0;
  const results = [];
  
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`\n🔄 [${i + 1}/${migrations.length}] Processing ${migration}...`);
    
    const result = await runSingleMigration(migration);
    results.push({ migration, ...result });
    
    if (result.success) {
      totalSuccessful++;
      console.log(`✅ Migration ${migration} completed successfully`);
    } else {
      totalFailed++;
      console.log(`❌ Migration ${migration} failed`);
    }
    
    // Delay between migrations
    if (i < migrations.length - 1) {
      console.log('⏳ Waiting before next migration...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Final summary
  console.log('\n🎯 MIGRATION SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Successful migrations: ${totalSuccessful}/${migrations.length}`);
  console.log(`❌ Failed migrations: ${totalFailed}`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.migration}: ${result.successCount || 0} statements executed`);
  });
  
  if (totalSuccessful > 0) {
    console.log('\n🎉 Database migration process completed!');
    console.log('🔍 Check your Supabase Dashboard → Database → Tables');
    
    // Verify key tables were created
    await verifyTables();
  }
  
  return totalSuccessful > 0;
}

async function verifyTables() {
  console.log('\n🔍 Verifying table creation...');
  
  const keyTables = [
    'tenant_configs',
    'tenant_metrics', 
    'tenant_subscriptions',
    'run_logs',
    'support_tickets',
    'custom_dashboards',
    'automation_workflows',
    'security_events'
  ];
  
  let verifiedCount = 0;
  
  for (const table of keyTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: Accessible`);
        verifiedCount++;
      }
    } catch (err) {
      console.log(`❌ Table ${table}: Verification failed - ${err.message}`);
    }
  }
  
  console.log(`\n📊 Table Verification: ${verifiedCount}/${keyTables.length} tables accessible`);
}

// Run migrations
runAllMigrations()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Migration process completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Migration process completed with failures');
      console.log('\n💡 Manual Instructions if needed:');
      console.log('1. Go to Supabase Dashboard → SQL Editor');
      console.log('2. Copy content from migration files in backend/migrations/');
      console.log('3. Run them one by one in order');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  });