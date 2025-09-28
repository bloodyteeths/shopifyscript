/**
 * Data Migration Utilities
 * Syncs data from Google Sheets to Supabase
 *
 * Use this to migrate existing tenant data from Sheets to Supabase
 */

import dataStore from './data-store.js';
import optimizedSheets from './sheets.js';
import tenantRegistry from './tenant-registry.js';
import logger from './logger.js';
import { getSupabaseClient, isSupabaseEnabled } from './supabase-client.js';

class DataMigrationService {
  constructor() {
    this.migrationStats = {
      totalTenants: 0,
      successfulTenants: 0,
      failedTenants: 0,
      totalRecords: 0,
      migratedRecords: 0,
      errors: []
    };
  }

  /**
   * Migrate all tenants from Sheets to Supabase
   * @param {object} options - { tenantIds, dryRun, skipExisting }
   * @returns {Promise<object>} Migration results
   */
  async migrateAllTenants(options = {}) {
    const { tenantIds = null, dryRun = false, skipExisting = true } = options;

    if (!isSupabaseEnabled()) {
      throw new Error('Supabase is not enabled. Cannot perform migration.');
    }

    console.log('🚀 Starting data migration from Sheets to Supabase...');
    console.log('Options:', { dryRun, skipExisting });

    this.migrationStats = {
      totalTenants: 0,
      successfulTenants: 0,
      failedTenants: 0,
      totalRecords: 0,
      migratedRecords: 0,
      errors: [],
      startTime: Date.now()
    };

    try {
      // Get tenant list
      let tenantsToMigrate;
      if (tenantIds && Array.isArray(tenantIds)) {
        tenantsToMigrate = tenantIds;
      } else {
        // Get all active tenants from registry
        await tenantRegistry.initialize();
        const allTenants = tenantRegistry.getAllTenants();
        tenantsToMigrate = allTenants
          .filter(t => t.enabled !== false)
          .map(t => t.id);
      }

      this.migrationStats.totalTenants = tenantsToMigrate.length;
      console.log(`📋 Found ${tenantsToMigrate.length} tenants to migrate`);

      // Migrate each tenant
      for (const tenantId of tenantsToMigrate) {
        try {
          console.log(`\n🔄 Migrating tenant: ${tenantId}`);
          const result = await this.migrateTenant(tenantId, { dryRun, skipExisting });

          if (result.success) {
            this.migrationStats.successfulTenants++;
            this.migrationStats.totalRecords += result.totalRecords;
            this.migrationStats.migratedRecords += result.migratedRecords;
          } else {
            this.migrationStats.failedTenants++;
            this.migrationStats.errors.push({
              tenant: tenantId,
              error: result.error
            });
          }
        } catch (error) {
          console.error(`❌ Failed to migrate tenant ${tenantId}:`, error.message);
          this.migrationStats.failedTenants++;
          this.migrationStats.errors.push({
            tenant: tenantId,
            error: error.message
          });
        }
      }

      const duration = Date.now() - this.migrationStats.startTime;
      console.log('\n✅ Migration completed!');
      console.log('Statistics:', {
        ...this.migrationStats,
        duration: `${(duration / 1000).toFixed(2)}s`
      });

      return this.migrationStats;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single tenant
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - { dryRun, skipExisting }
   * @returns {Promise<object>} Migration result
   */
  async migrateTenant(tenantId, options = {}) {
    const { dryRun = false, skipExisting = true } = options;
    const result = {
      success: false,
      tenant: tenantId,
      totalRecords: 0,
      migratedRecords: 0,
      skippedRecords: 0,
      errors: []
    };

    try {
      // 1. Migrate tenant configs
      console.log(`  📝 Migrating configs for ${tenantId}...`);
      const configResult = await this.migrateTenantConfigs(tenantId, { dryRun, skipExisting });
      result.totalRecords += configResult.total;
      result.migratedRecords += configResult.migrated;
      result.skippedRecords += configResult.skipped;
      if (configResult.errors.length > 0) {
        result.errors.push(...configResult.errors);
      }

      // 2. Migrate metrics
      console.log(`  📊 Migrating metrics for ${tenantId}...`);
      const metricsResult = await this.migrateTenantMetrics(tenantId, { dryRun, skipExisting });
      result.totalRecords += metricsResult.total;
      result.migratedRecords += metricsResult.migrated;
      result.skippedRecords += metricsResult.skipped;
      if (metricsResult.errors.length > 0) {
        result.errors.push(...metricsResult.errors);
      }

      // 3. Migrate search terms
      console.log(`  🔍 Migrating search terms for ${tenantId}...`);
      const searchTermsResult = await this.migrateTenantSearchTerms(tenantId, { dryRun, skipExisting });
      result.totalRecords += searchTermsResult.total;
      result.migratedRecords += searchTermsResult.migrated;
      result.skippedRecords += searchTermsResult.skipped;
      if (searchTermsResult.errors.length > 0) {
        result.errors.push(...searchTermsResult.errors);
      }

      // 4. Migrate logs (optional - may be large)
      console.log(`  📋 Migrating logs for ${tenantId}...`);
      const logsResult = await this.migrateTenantLogs(tenantId, { dryRun, skipExisting, limit: 1000 });
      result.totalRecords += logsResult.total;
      result.migratedRecords += logsResult.migrated;
      result.skippedRecords += logsResult.skipped;
      if (logsResult.errors.length > 0) {
        result.errors.push(...logsResult.errors);
      }

      result.success = result.errors.length === 0;
      console.log(`  ✅ Tenant ${tenantId}: ${result.migratedRecords}/${result.totalRecords} records migrated`);

      return result;
    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Migrate tenant configs
   */
  async migrateTenantConfigs(tenantId, options = {}) {
    const { dryRun = false, skipExisting = true } = options;
    const result = { total: 0, migrated: 0, skipped: 0, errors: [] };

    try {
      const sheetTitle = `CONFIG_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 1000 });

      result.total = rows.length;

      for (const row of rows) {
        try {
          const key = String(row.config_key || row.key || '').trim();
          const valueStr = String(row.config_value || row.value || '').trim();

          if (!key) continue;

          // Parse JSON if applicable
          let value = valueStr;
          if (valueStr.startsWith('{') || valueStr.startsWith('[')) {
            try {
              value = JSON.parse(valueStr);
            } catch {
              // Keep as string if not valid JSON
            }
          }

          if (dryRun) {
            console.log(`    [DRY RUN] Would migrate: ${key} = ${valueStr.substring(0, 50)}...`);
            result.migrated++;
          } else {
            // Check if exists (if skipExisting)
            if (skipExisting) {
              const existing = await dataStore.getTenantConfig(tenantId, key, { useCache: false });
              if (existing !== null) {
                result.skipped++;
                continue;
              }
            }

            await dataStore.setTenantConfig(tenantId, key, value);
            result.migrated++;
          }
        } catch (error) {
          result.errors.push(`Config ${row.key}: ${error.message}`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Configs: ${error.message}`);
      return result;
    }
  }

  /**
   * Migrate tenant metrics
   */
  async migrateTenantMetrics(tenantId, options = {}) {
    const { dryRun = false, skipExisting = true } = options;
    const result = { total: 0, migrated: 0, skipped: 0, errors: [] };

    try {
      const sheetTitle = `METRICS_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 10000 });

      result.total = rows.length;

      if (rows.length === 0) {
        return result;
      }

      // Batch metrics for efficiency
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const metrics = batch.map(row => ({
          date: row.date,
          entity_type: row.entity_type || 'campaign',
          entity_id: row.entity_id,
          entity_name: row.entity_name,
          campaign_name: row.campaign_name,
          ad_group_name: row.ad_group_name,
          clicks: parseInt(row.clicks) || 0,
          cost_micros: parseInt(row.cost_micros) || 0,
          conversions: parseFloat(row.conversions) || 0,
          impressions: parseInt(row.impressions) || 0,
          ctr: parseFloat(row.ctr) || 0
        })).filter(m => m.date && m.entity_id);

        if (dryRun) {
          console.log(`    [DRY RUN] Would migrate ${metrics.length} metrics`);
          result.migrated += metrics.length;
        } else {
          try {
            await dataStore.saveMetrics(tenantId, metrics);
            result.migrated += metrics.length;
          } catch (error) {
            result.errors.push(`Metrics batch ${i}: ${error.message}`);
          }
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Metrics: ${error.message}`);
      return result;
    }
  }

  /**
   * Migrate tenant search terms
   */
  async migrateTenantSearchTerms(tenantId, options = {}) {
    const { dryRun = false, skipExisting = true } = options;
    const result = { total: 0, migrated: 0, skipped: 0, errors: [] };

    try {
      const sheetTitle = `SEARCH_TERMS_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 10000 });

      result.total = rows.length;

      if (rows.length === 0) {
        return result;
      }

      // Batch search terms for efficiency
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const searchTerms = batch.map(row => ({
          date: row.date,
          campaign_name: row.campaign_name,
          ad_group_name: row.ad_group_name,
          search_term: row.search_term,
          clicks: parseInt(row.clicks) || 0,
          cost_micros: parseInt(row.cost_micros) || 0,
          conversions: parseFloat(row.conversions) || 0
        })).filter(st => st.date && st.search_term);

        if (dryRun) {
          console.log(`    [DRY RUN] Would migrate ${searchTerms.length} search terms`);
          result.migrated += searchTerms.length;
        } else {
          try {
            await dataStore.saveSearchTerms(tenantId, searchTerms);
            result.migrated += searchTerms.length;
          } catch (error) {
            result.errors.push(`Search terms batch ${i}: ${error.message}`);
          }
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Search terms: ${error.message}`);
      return result;
    }
  }

  /**
   * Migrate tenant logs
   */
  async migrateTenantLogs(tenantId, options = {}) {
    const { dryRun = false, skipExisting = true, limit = 1000 } = options;
    const result = { total: 0, migrated: 0, skipped: 0, errors: [] };

    try {
      const sheetTitle = `RUN_LOGS_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit });

      result.total = rows.length;

      for (const row of rows) {
        try {
          const logType = row.log_type || 'info';
          const message = row.message || '';
          const timestamp = row.timestamp ? new Date(row.timestamp) : new Date();

          let details = {};
          if (row.details) {
            try {
              details = typeof row.details === 'string'
                ? JSON.parse(row.details)
                : row.details;
            } catch {
              details = { raw: row.details };
            }
          }

          if (dryRun) {
            console.log(`    [DRY RUN] Would migrate log: ${logType} - ${message.substring(0, 50)}...`);
            result.migrated++;
          } else {
            await dataStore.addLog(tenantId, logType, message, details);
            result.migrated++;
          }
        } catch (error) {
          result.errors.push(`Log: ${error.message}`);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(`Logs: ${error.message}`);
      return result;
    }
  }

  /**
   * Verify migration - compare Sheets vs Supabase counts
   */
  async verifyMigration(tenantId) {
    console.log(`\n🔍 Verifying migration for ${tenantId}...`);

    const verification = {
      tenant: tenantId,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // Check configs
      const sheetsConfigs = await optimizedSheets.getRows(tenantId, `CONFIG_${tenantId}`, { limit: 1000 });
      const supabaseConfigs = await dataStore.getAllTenantConfigs(tenantId);
      verification.checks.configs = {
        sheets: sheetsConfigs.length,
        supabase: Object.keys(supabaseConfigs).length,
        match: sheetsConfigs.length === Object.keys(supabaseConfigs).length
      };

      // Check metrics
      const sheetsMetrics = await optimizedSheets.getRows(tenantId, `METRICS_${tenantId}`, { limit: 10000 });
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1); // Last year
      const supabaseMetrics = await dataStore.getMetrics(tenantId, startDate, endDate);
      verification.checks.metrics = {
        sheets: sheetsMetrics.length,
        supabase: supabaseMetrics.length,
        match: Math.abs(sheetsMetrics.length - supabaseMetrics.length) < 10 // Allow small variance
      };

      // Check search terms
      const sheetsSearchTerms = await optimizedSheets.getRows(tenantId, `SEARCH_TERMS_${tenantId}`, { limit: 10000 });
      const supabaseSearchTerms = await dataStore.getSearchTerms(tenantId, { startDate, endDate, limit: 10000 });
      verification.checks.searchTerms = {
        sheets: sheetsSearchTerms.length,
        supabase: supabaseSearchTerms.length,
        match: Math.abs(sheetsSearchTerms.length - supabaseSearchTerms.length) < 10
      };

      // Overall result
      verification.allMatch = Object.values(verification.checks).every(check => check.match);

      console.log('Verification results:', verification);
      return verification;
    } catch (error) {
      verification.error = error.message;
      console.error('Verification failed:', error);
      return verification;
    }
  }

  /**
   * Get migration statistics
   */
  getStats() {
    return this.migrationStats;
  }
}

// Export singleton
const dataMigration = new DataMigrationService();

export default dataMigration;
export { DataMigrationService };