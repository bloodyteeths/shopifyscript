#!/usr/bin/env node

/**
 * Migration Script: Sheets to Supabase
 * Migrates tenant data from Google Sheets to Supabase
 *
 * Usage:
 *   node migrate-sheets-to-supabase.js [options]
 *
 * Options:
 *   --tenant=<id>      Migrate specific tenant (can specify multiple)
 *   --dry-run          Show what would be migrated without actually migrating
 *   --no-skip-existing Overwrite existing records in Supabase
 *   --verify           Verify migration after completion
 *   --help             Show this help message
 *
 * Examples:
 *   node migrate-sheets-to-supabase.js --dry-run
 *   node migrate-sheets-to-supabase.js --tenant=tenant1 --tenant=tenant2
 *   node migrate-sheets-to-supabase.js --verify
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import dataMigration from '../services/data-migration.js';
import { isSupabaseEnabled } from '../services/supabase-client.js';

// Parse command line arguments
function parseArgs() {
  const args = {
    tenantIds: [],
    dryRun: false,
    skipExisting: true,
    verify: false,
    help: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--tenant=')) {
      args.tenantIds.push(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--no-skip-existing') {
      args.skipExisting = false;
    } else if (arg === '--verify') {
      args.verify = true;
    } else if (arg === '--help') {
      args.help = true;
    }
  }

  return args;
}

// Show help message
function showHelp() {
  console.log(`
Migration Script: Sheets to Supabase
Migrates tenant data from Google Sheets to Supabase

Usage:
  node migrate-sheets-to-supabase.js [options]

Options:
  --tenant=<id>      Migrate specific tenant (can specify multiple)
  --dry-run          Show what would be migrated without actually migrating
  --no-skip-existing Overwrite existing records in Supabase
  --verify           Verify migration after completion
  --help             Show this help message

Examples:
  node migrate-sheets-to-supabase.js --dry-run
  node migrate-sheets-to-supabase.js --tenant=tenant1 --tenant=tenant2
  node migrate-sheets-to-supabase.js --verify

Environment Variables Required:
  SUPABASE_URL               - Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY  - Supabase service role key
  SUPABASE_ENABLED=true      - Enable Supabase
  GOOGLE_SERVICE_EMAIL       - Google Sheets service account email
  GOOGLE_PRIVATE_KEY         - Google Sheets service account private key
`);
}

// Main migration function
async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🚀 Ads Autopilot AI Data Migration: Sheets → Supabase');
  console.log('================================================\n');

  // Check Supabase is enabled
  if (!isSupabaseEnabled()) {
    console.error('❌ ERROR: Supabase is not enabled!');
    console.error('Please set the following environment variables:');
    console.error('  - SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('  - SUPABASE_ENABLED=true');
    process.exit(1);
  }

  console.log('✅ Supabase is enabled and configured\n');

  // Show configuration
  console.log('Configuration:');
  console.log(`  Dry Run: ${args.dryRun ? 'YES' : 'NO'}`);
  console.log(`  Skip Existing: ${args.skipExisting ? 'YES' : 'NO'}`);
  console.log(`  Verify After: ${args.verify ? 'YES' : 'NO'}`);
  if (args.tenantIds.length > 0) {
    console.log(`  Tenants: ${args.tenantIds.join(', ')}`);
  } else {
    console.log(`  Tenants: ALL`);
  }
  console.log('');

  if (args.dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be written to Supabase\n');
  }

  try {
    // Run migration
    const result = await dataMigration.migrateAllTenants({
      tenantIds: args.tenantIds.length > 0 ? args.tenantIds : null,
      dryRun: args.dryRun,
      skipExisting: args.skipExisting
    });

    // Show results
    console.log('\n📊 Migration Summary');
    console.log('====================');
    console.log(`Total Tenants: ${result.totalTenants}`);
    console.log(`Successful: ${result.successfulTenants}`);
    console.log(`Failed: ${result.failedTenants}`);
    console.log(`Total Records: ${result.totalRecords}`);
    console.log(`Migrated: ${result.migratedRecords}`);
    console.log(`Duration: ${((Date.now() - result.startTime) / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(err => {
        console.log(`  - ${err.tenant}: ${err.error}`);
      });
    }

    // Verify if requested
    if (args.verify && !args.dryRun && result.successfulTenants > 0) {
      console.log('\n🔍 Running verification...');
      const tenantsToVerify = args.tenantIds.length > 0
        ? args.tenantIds
        : ['default']; // Verify at least one tenant

      for (const tenantId of tenantsToVerify.slice(0, 3)) { // Verify up to 3 tenants
        const verification = await dataMigration.verifyMigration(tenantId);
        console.log(`\n  ${tenantId}:`, verification.allMatch ? '✅ VERIFIED' : '⚠️  MISMATCH');
        console.log(`    Configs: ${verification.checks.configs.supabase}/${verification.checks.configs.sheets}`);
        console.log(`    Metrics: ${verification.checks.metrics.supabase}/${verification.checks.metrics.sheets}`);
        console.log(`    Search Terms: ${verification.checks.searchTerms.supabase}/${verification.checks.searchTerms.sheets}`);
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});