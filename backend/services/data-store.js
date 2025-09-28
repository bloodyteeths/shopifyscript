/**
 * Unified Data Store Service
 * Implements Supabase-first, Google Sheets-fallback pattern for all data operations
 *
 * Architecture:
 * - Primary: Supabase (PostgreSQL) for fast, scalable data storage
 * - Fallback: Google Sheets for backward compatibility and redundancy
 * - Connection pooling and retry logic built-in
 * - Automatic failover with logging
 */

import {
  getSupabaseClient,
  isSupabaseEnabled,
  executeQuery,
  getConnectionHealth
} from './supabase-client.js';
import optimizedSheets from './sheets.js';
import tenantRegistry from './tenant-registry.js';
import logger from './logger.js';

class DataStoreService {
  constructor() {
    this.useSupabase = isSupabaseEnabled();
    this.metrics = {
      supabaseOps: 0,
      sheetsOps: 0,
      supabaseFallbacks: 0,
      errors: 0,
      avgResponseTime: 0
    };

    // Cache for frequently accessed config
    this.configCache = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5 minutes

    console.log('🗄️  Data Store initialized:', {
      primaryStore: this.useSupabase ? 'Supabase' : 'Google Sheets',
      fallbackEnabled: true
    });
  }

  /**
   * =====================================
   * TENANT CONFIG OPERATIONS
   * =====================================
   */

  /**
   * Get tenant configuration by key
   * @param {string} tenantId - Tenant identifier
   * @param {string} configKey - Configuration key
   * @param {object} options - { useCache, defaultValue }
   * @returns {Promise<any>} Configuration value
   */
  async getTenantConfig(tenantId, configKey, options = {}) {
    const { useCache = true, defaultValue = null } = options;
    const startTime = Date.now();

    // Check cache first
    if (useCache) {
      const cacheKey = `${tenantId}:${configKey}`;
      const cached = this.configCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        return cached.value;
      }
    }

    try {
      let result;

      // Try Supabase first
      if (this.useSupabase) {
        try {
          result = await this._getConfigFromSupabase(tenantId, configKey);
          this.metrics.supabaseOps++;

          if (result !== null) {
            this._updateCache(tenantId, configKey, result);
            this._trackMetrics(startTime);
            return result;
          }
        } catch (supabaseError) {
          logger.warn('Supabase config read failed, falling back to Sheets', {
            tenantId,
            configKey,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Fallback to Google Sheets
      result = await this._getConfigFromSheets(tenantId, configKey);
      this.metrics.sheetsOps++;

      if (result !== null) {
        this._updateCache(tenantId, configKey, result);
        this._trackMetrics(startTime);
        return result;
      }

      // Return default if nothing found
      return defaultValue;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get tenant config', {
        tenantId,
        configKey,
        error: error.message
      });
      return defaultValue;
    }
  }

  /**
   * Set tenant configuration
   * @param {string} tenantId - Tenant identifier
   * @param {string} configKey - Configuration key
   * @param {any} configValue - Configuration value
   * @returns {Promise<boolean>} Success status
   */
  async setTenantConfig(tenantId, configKey, configValue) {
    const startTime = Date.now();

    try {
      let supabaseSuccess = false;
      let sheetsSuccess = false;

      // Write to Supabase first
      if (this.useSupabase) {
        try {
          await this._setConfigInSupabase(tenantId, configKey, configValue);
          supabaseSuccess = true;
          this.metrics.supabaseOps++;
        } catch (supabaseError) {
          logger.error('Supabase config write failed', {
            tenantId,
            configKey,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Write to Sheets (as backup or primary)
      try {
        await this._setConfigInSheets(tenantId, configKey, configValue);
        sheetsSuccess = true;
        this.metrics.sheetsOps++;
      } catch (sheetsError) {
        logger.error('Sheets config write failed', {
          tenantId,
          configKey,
          error: sheetsError.message
        });
      }

      // Invalidate cache
      this.configCache.delete(`${tenantId}:${configKey}`);

      this._trackMetrics(startTime);

      // Success if at least one write succeeded
      const success = supabaseSuccess || sheetsSuccess;

      if (!success) {
        throw new Error('Failed to write config to both Supabase and Sheets');
      }

      return success;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to set tenant config', {
        tenantId,
        configKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all configs for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<object>} All configuration key-value pairs
   */
  async getAllTenantConfigs(tenantId) {
    const startTime = Date.now();

    try {
      // Try Supabase first
      if (this.useSupabase) {
        try {
          const configs = await this._getAllConfigsFromSupabase(tenantId);
          this.metrics.supabaseOps++;
          this._trackMetrics(startTime);
          return configs;
        } catch (supabaseError) {
          logger.warn('Supabase getAllConfigs failed, falling back to Sheets', {
            tenantId,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Fallback to Google Sheets
      const configs = await this._getAllConfigsFromSheets(tenantId);
      this.metrics.sheetsOps++;
      this._trackMetrics(startTime);
      return configs;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get all tenant configs', {
        tenantId,
        error: error.message
      });
      return {};
    }
  }

  /**
   * =====================================
   * METRICS OPERATIONS
   * =====================================
   */

  /**
   * Save metrics data
   * @param {string} tenantId - Tenant identifier
   * @param {Array} metrics - Array of metric objects
   * @returns {Promise<boolean>} Success status
   */
  async saveMetrics(tenantId, metrics) {
    const startTime = Date.now();

    try {
      let supabaseSuccess = false;

      // Write to Supabase first
      if (this.useSupabase) {
        try {
          await this._saveMetricsToSupabase(tenantId, metrics);
          supabaseSuccess = true;
          this.metrics.supabaseOps++;
        } catch (supabaseError) {
          logger.error('Supabase metrics write failed', {
            tenantId,
            count: metrics.length,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Write to Sheets as backup
      try {
        await this._saveMetricsToSheets(tenantId, metrics);
        this.metrics.sheetsOps++;
      } catch (sheetsError) {
        logger.warn('Sheets metrics write failed', {
          tenantId,
          error: sheetsError.message
        });
      }

      this._trackMetrics(startTime);
      return supabaseSuccess;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to save metrics', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get metrics for a date range
   * @param {string} tenantId - Tenant identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} entityType - Optional entity type filter
   * @returns {Promise<Array>} Metrics data
   */
  async getMetrics(tenantId, startDate, endDate, entityType = null) {
    const startTime = Date.now();

    try {
      // Try Supabase first
      if (this.useSupabase) {
        try {
          const metrics = await this._getMetricsFromSupabase(
            tenantId,
            startDate,
            endDate,
            entityType
          );
          this.metrics.supabaseOps++;
          this._trackMetrics(startTime);
          return metrics;
        } catch (supabaseError) {
          logger.warn('Supabase metrics read failed, falling back to Sheets', {
            tenantId,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Fallback to Google Sheets
      const metrics = await this._getMetricsFromSheets(
        tenantId,
        startDate,
        endDate,
        entityType
      );
      this.metrics.sheetsOps++;
      this._trackMetrics(startTime);
      return metrics;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get metrics', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * =====================================
   * SEARCH TERMS OPERATIONS
   * =====================================
   */

  /**
   * Save search terms data
   * @param {string} tenantId - Tenant identifier
   * @param {Array} searchTerms - Array of search term objects
   * @returns {Promise<boolean>} Success status
   */
  async saveSearchTerms(tenantId, searchTerms) {
    const startTime = Date.now();

    try {
      let supabaseSuccess = false;

      // Write to Supabase first
      if (this.useSupabase) {
        try {
          await this._saveSearchTermsToSupabase(tenantId, searchTerms);
          supabaseSuccess = true;
          this.metrics.supabaseOps++;
        } catch (supabaseError) {
          logger.error('Supabase search terms write failed', {
            tenantId,
            count: searchTerms.length,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Write to Sheets as backup
      try {
        await this._saveSearchTermsToSheets(tenantId, searchTerms);
        this.metrics.sheetsOps++;
      } catch (sheetsError) {
        logger.warn('Sheets search terms write failed', {
          tenantId,
          error: sheetsError.message
        });
      }

      this._trackMetrics(startTime);
      return supabaseSuccess;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to save search terms', {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get search terms for analysis
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - { startDate, endDate, limit }
   * @returns {Promise<Array>} Search terms data
   */
  async getSearchTerms(tenantId, options = {}) {
    const { startDate, endDate, limit = 1000 } = options;
    const startTime = Date.now();

    try {
      // Try Supabase first
      if (this.useSupabase) {
        try {
          const searchTerms = await this._getSearchTermsFromSupabase(
            tenantId,
            startDate,
            endDate,
            limit
          );
          this.metrics.supabaseOps++;
          this._trackMetrics(startTime);
          return searchTerms;
        } catch (supabaseError) {
          logger.warn('Supabase search terms read failed, falling back to Sheets', {
            tenantId,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Fallback to Google Sheets
      const searchTerms = await this._getSearchTermsFromSheets(
        tenantId,
        startDate,
        endDate,
        limit
      );
      this.metrics.sheetsOps++;
      this._trackMetrics(startTime);
      return searchTerms;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get search terms', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * =====================================
   * RUN LOGS OPERATIONS
   * =====================================
   */

  /**
   * Add log entry
   * @param {string} tenantId - Tenant identifier
   * @param {string} logType - Log type (info, warning, error, mutation)
   * @param {string} message - Log message
   * @param {object} details - Additional details
   * @returns {Promise<boolean>} Success status
   */
  async addLog(tenantId, logType, message, details = {}) {
    const startTime = Date.now();

    try {
      const logEntry = {
        tenant_id: tenantId,
        timestamp: new Date(),
        log_type: logType,
        message,
        details
      };

      // Write to Supabase first
      if (this.useSupabase) {
        try {
          await this._addLogToSupabase(logEntry);
          this.metrics.supabaseOps++;
        } catch (supabaseError) {
          logger.warn('Supabase log write failed', {
            tenantId,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Write to Sheets as backup (optional for logs)
      try {
        await this._addLogToSheets(tenantId, logEntry);
        this.metrics.sheetsOps++;
      } catch (sheetsError) {
        // Don't fail if sheets logging fails - logs are less critical
        logger.debug('Sheets log write failed', {
          tenantId,
          error: sheetsError.message
        });
      }

      this._trackMetrics(startTime);
      return true;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to add log', {
        tenantId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get logs for a tenant
   * @param {string} tenantId - Tenant identifier
   * @param {object} options - { logType, limit, offset }
   * @returns {Promise<Array>} Log entries
   */
  async getLogs(tenantId, options = {}) {
    const { logType = null, limit = 100, offset = 0 } = options;
    const startTime = Date.now();

    try {
      // Try Supabase first
      if (this.useSupabase) {
        try {
          const logs = await this._getLogsFromSupabase(tenantId, logType, limit, offset);
          this.metrics.supabaseOps++;
          this._trackMetrics(startTime);
          return logs;
        } catch (supabaseError) {
          logger.warn('Supabase logs read failed, falling back to Sheets', {
            tenantId,
            error: supabaseError.message
          });
          this.metrics.supabaseFallbacks++;
        }
      }

      // Fallback to Google Sheets
      const logs = await this._getLogsFromSheets(tenantId, logType, limit, offset);
      this.metrics.sheetsOps++;
      this._trackMetrics(startTime);
      return logs;

    } catch (error) {
      this.metrics.errors++;
      logger.error('Failed to get logs', {
        tenantId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * =====================================
   * PRIVATE SUPABASE IMPLEMENTATIONS
   * =====================================
   */

  async _getConfigFromSupabase(tenantId, configKey) {
    return await executeQuery(async (client) => {
      const { data, error } = await client
        .from('tenant_configs')
        .select('config_value')
        .eq('tenant_id', tenantId)
        .eq('config_key', configKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data?.config_value || null;
    });
  }

  async _setConfigInSupabase(tenantId, configKey, configValue) {
    return await executeQuery(async (client) => {
      const { error } = await client
        .from('tenant_configs')
        .upsert({
          tenant_id: tenantId,
          config_key: configKey,
          config_value: configValue,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,config_key'
        });

      if (error) throw error;
      return true;
    });
  }

  async _getAllConfigsFromSupabase(tenantId) {
    return await executeQuery(async (client) => {
      const { data, error } = await client
        .from('tenant_configs')
        .select('config_key, config_value')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Convert array to object
      const configs = {};
      (data || []).forEach(row => {
        configs[row.config_key] = row.config_value;
      });

      return configs;
    });
  }

  async _saveMetricsToSupabase(tenantId, metrics) {
    return await executeQuery(async (client) => {
      const records = metrics.map(m => ({
        tenant_id: tenantId,
        date: m.date,
        entity_type: m.entity_type || 'campaign',
        entity_id: m.entity_id,
        entity_name: m.entity_name,
        campaign_name: m.campaign_name,
        ad_group_name: m.ad_group_name,
        clicks: m.clicks || 0,
        cost_micros: m.cost_micros || 0,
        conversions: m.conversions || 0,
        impressions: m.impressions || 0,
        ctr: m.ctr || 0
      }));

      const { error } = await client
        .from('tenant_metrics')
        .upsert(records, {
          onConflict: 'tenant_id,date,entity_type,entity_id'
        });

      if (error) throw error;
      return true;
    });
  }

  async _getMetricsFromSupabase(tenantId, startDate, endDate, entityType) {
    return await executeQuery(async (client) => {
      let query = client
        .from('tenant_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  }

  async _saveSearchTermsToSupabase(tenantId, searchTerms) {
    return await executeQuery(async (client) => {
      const records = searchTerms.map(st => ({
        tenant_id: tenantId,
        date: st.date,
        campaign_name: st.campaign_name,
        ad_group_name: st.ad_group_name,
        search_term: st.search_term,
        clicks: st.clicks || 0,
        cost_micros: st.cost_micros || 0,
        conversions: st.conversions || 0
      }));

      const { error } = await client
        .from('search_terms')
        .upsert(records, {
          onConflict: 'tenant_id,date,campaign_name,ad_group_name,search_term'
        });

      if (error) throw error;
      return true;
    });
  }

  async _getSearchTermsFromSupabase(tenantId, startDate, endDate, limit) {
    return await executeQuery(async (client) => {
      let query = client
        .from('search_terms')
        .select('*')
        .eq('tenant_id', tenantId);

      if (startDate) {
        query = query.gte('date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    });
  }

  async _addLogToSupabase(logEntry) {
    return await executeQuery(async (client) => {
      const { error } = await client
        .from('run_logs')
        .insert({
          tenant_id: logEntry.tenant_id,
          timestamp: logEntry.timestamp.toISOString(),
          log_type: logEntry.log_type,
          message: logEntry.message,
          details: logEntry.details
        });

      if (error) throw error;
      return true;
    });
  }

  async _getLogsFromSupabase(tenantId, logType, limit, offset) {
    return await executeQuery(async (client) => {
      let query = client
        .from('run_logs')
        .select('*')
        .eq('tenant_id', tenantId);

      if (logType) {
        query = query.eq('log_type', logType);
      }

      const { data, error } = await query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    });
  }

  /**
   * =====================================
   * PRIVATE SHEETS IMPLEMENTATIONS
   * =====================================
   */

  async _getConfigFromSheets(tenantId, configKey) {
    try {
      const sheetTitle = `CONFIG_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 100 });

      const configRow = rows.find(row =>
        row.config_key === configKey || row.key === configKey
      );

      if (!configRow) return null;

      const valueStr = configRow.config_value || configRow.value;

      // Try to parse JSON if it looks like JSON
      if (typeof valueStr === 'string' && (valueStr.startsWith('{') || valueStr.startsWith('['))) {
        try {
          return JSON.parse(valueStr);
        } catch {
          return valueStr;
        }
      }

      return valueStr;
    } catch (error) {
      logger.error('Sheets config read error', { tenantId, configKey, error: error.message });
      throw error;
    }
  }

  async _setConfigInSheets(tenantId, configKey, configValue) {
    try {
      const sheetTitle = `CONFIG_${tenantId}`;
      await optimizedSheets.ensureSheet(tenantId, sheetTitle, ['config_key', 'config_value', 'updated_at']);

      const valueStr = typeof configValue === 'object'
        ? JSON.stringify(configValue)
        : String(configValue);

      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 100 });
      const existingRow = rows.find(row =>
        row.config_key === configKey || row.key === configKey
      );

      if (existingRow) {
        existingRow.config_value = valueStr;
        existingRow.updated_at = new Date().toISOString();
        await optimizedSheets.updateRow(tenantId, sheetTitle, existingRow);
      } else {
        await optimizedSheets.addRow(tenantId, sheetTitle, {
          config_key: configKey,
          config_value: valueStr,
          updated_at: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      logger.error('Sheets config write error', { tenantId, configKey, error: error.message });
      throw error;
    }
  }

  async _getAllConfigsFromSheets(tenantId) {
    try {
      const sheetTitle = `CONFIG_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 1000 });

      const configs = {};
      rows.forEach(row => {
        const key = row.config_key || row.key;
        const valueStr = row.config_value || row.value;

        if (!key) return;

        // Try to parse JSON
        if (typeof valueStr === 'string' && (valueStr.startsWith('{') || valueStr.startsWith('['))) {
          try {
            configs[key] = JSON.parse(valueStr);
          } catch {
            configs[key] = valueStr;
          }
        } else {
          configs[key] = valueStr;
        }
      });

      return configs;
    } catch (error) {
      logger.error('Sheets getAllConfigs error', { tenantId, error: error.message });
      throw error;
    }
  }

  async _saveMetricsToSheets(tenantId, metrics) {
    try {
      const sheetTitle = `METRICS_${tenantId}`;
      await optimizedSheets.ensureSheet(tenantId, sheetTitle, [
        'date', 'entity_type', 'entity_id', 'entity_name',
        'campaign_name', 'ad_group_name', 'clicks', 'cost_micros',
        'conversions', 'impressions', 'ctr'
      ]);

      const rows = metrics.map(m => ({
        date: m.date,
        entity_type: m.entity_type || 'campaign',
        entity_id: m.entity_id,
        entity_name: m.entity_name,
        campaign_name: m.campaign_name,
        ad_group_name: m.ad_group_name,
        clicks: m.clicks || 0,
        cost_micros: m.cost_micros || 0,
        conversions: m.conversions || 0,
        impressions: m.impressions || 0,
        ctr: m.ctr || 0
      }));

      await optimizedSheets.addRows(tenantId, sheetTitle, rows);
      return true;
    } catch (error) {
      logger.error('Sheets metrics write error', { tenantId, error: error.message });
      throw error;
    }
  }

  async _getMetricsFromSheets(tenantId, startDate, endDate, entityType) {
    try {
      const sheetTitle = `METRICS_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: 5000 });

      // Filter by date and entity type
      return rows.filter(row => {
        const rowDate = new Date(row.date);
        if (rowDate < startDate || rowDate > endDate) return false;
        if (entityType && row.entity_type !== entityType) return false;
        return true;
      });
    } catch (error) {
      logger.error('Sheets metrics read error', { tenantId, error: error.message });
      throw error;
    }
  }

  async _saveSearchTermsToSheets(tenantId, searchTerms) {
    try {
      const sheetTitle = `SEARCH_TERMS_${tenantId}`;
      await optimizedSheets.ensureSheet(tenantId, sheetTitle, [
        'date', 'campaign_name', 'ad_group_name', 'search_term',
        'clicks', 'cost_micros', 'conversions'
      ]);

      const rows = searchTerms.map(st => ({
        date: st.date,
        campaign_name: st.campaign_name,
        ad_group_name: st.ad_group_name,
        search_term: st.search_term,
        clicks: st.clicks || 0,
        cost_micros: st.cost_micros || 0,
        conversions: st.conversions || 0
      }));

      await optimizedSheets.addRows(tenantId, sheetTitle, rows);
      return true;
    } catch (error) {
      logger.error('Sheets search terms write error', { tenantId, error: error.message });
      throw error;
    }
  }

  async _getSearchTermsFromSheets(tenantId, startDate, endDate, limit) {
    try {
      const sheetTitle = `SEARCH_TERMS_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: limit || 1000 });

      // Filter by date if provided
      if (startDate || endDate) {
        return rows.filter(row => {
          const rowDate = new Date(row.date);
          if (startDate && rowDate < startDate) return false;
          if (endDate && rowDate > endDate) return false;
          return true;
        });
      }

      return rows;
    } catch (error) {
      logger.error('Sheets search terms read error', { tenantId, error: error.message });
      throw error;
    }
  }

  async _addLogToSheets(tenantId, logEntry) {
    try {
      const sheetTitle = `RUN_LOGS_${tenantId}`;
      await optimizedSheets.ensureSheet(tenantId, sheetTitle, [
        'timestamp', 'log_type', 'message', 'details'
      ]);

      await optimizedSheets.addRow(tenantId, sheetTitle, {
        timestamp: logEntry.timestamp.toISOString(),
        log_type: logEntry.log_type,
        message: logEntry.message,
        details: JSON.stringify(logEntry.details)
      });

      return true;
    } catch (error) {
      logger.error('Sheets log write error', { tenantId, error: error.message });
      throw error;
    }
  }

  async _getLogsFromSheets(tenantId, logType, limit, offset) {
    try {
      const sheetTitle = `RUN_LOGS_${tenantId}`;
      const rows = await optimizedSheets.getRows(tenantId, sheetTitle, {
        limit: limit + offset
      });

      let filtered = rows;
      if (logType) {
        filtered = rows.filter(row => row.log_type === logType);
      }

      // Apply pagination
      return filtered.slice(offset, offset + limit);
    } catch (error) {
      logger.error('Sheets logs read error', { tenantId, error: error.message });
      throw error;
    }
  }

  /**
   * =====================================
   * UTILITY METHODS
   * =====================================
   */

  _updateCache(tenantId, configKey, value) {
    const cacheKey = `${tenantId}:${configKey}`;
    this.configCache.set(cacheKey, {
      value,
      timestamp: Date.now()
    });
  }

  _trackMetrics(startTime) {
    const duration = Date.now() - startTime;
    const totalOps = this.metrics.supabaseOps + this.metrics.sheetsOps;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (totalOps - 1) + duration) / totalOps;
  }

  /**
   * Clear cache for a tenant
   */
  clearCache(tenantId = null) {
    if (tenantId) {
      // Clear specific tenant's cache
      for (const key of this.configCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.configCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.configCache.clear();
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    const totalOps = this.metrics.supabaseOps + this.metrics.sheetsOps;
    const supabasePercentage = totalOps > 0
      ? ((this.metrics.supabaseOps / totalOps) * 100).toFixed(2)
      : 0;

    return {
      primaryStore: this.useSupabase ? 'Supabase' : 'Google Sheets',
      operations: {
        total: totalOps,
        supabase: this.metrics.supabaseOps,
        sheets: this.metrics.sheetsOps,
        supabasePercentage: `${supabasePercentage}%`
      },
      fallbacks: this.metrics.supabaseFallbacks,
      errors: this.metrics.errors,
      avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
      cacheSize: this.configCache.size
    };
  }

  /**
   * =====================================
   * OPTIMIZATION OPERATIONS
   * =====================================
   */

  /**
   * Store optimization in persistent storage
   */
  async storeOptimization(optimization) {
    const startTime = Date.now();

    try {
      if (this.useSupabase) {
        return await this._storeOptimizationSupabase(optimization);
      } else {
        return await this._storeOptimizationSheets(optimization);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Store optimization error', {
        optimizationId: optimization.id,
        error: error.message
      });

      // Try fallback
      try {
        if (this.useSupabase) {
          this.metrics.supabaseFallbacks++;
          return await this._storeOptimizationSheets(optimization);
        }
      } catch (fallbackError) {
        logger.error('Optimization storage fallback failed', {
          optimizationId: optimization.id,
          error: fallbackError.message
        });
      }

      throw error;
    } finally {
      this._updateMetrics(Date.now() - startTime);
    }
  }

  /**
   * Get optimization by ID
   */
  async getOptimizationById(optimizationId) {
    const startTime = Date.now();

    try {
      if (this.useSupabase) {
        return await this._getOptimizationByIdSupabase(optimizationId);
      } else {
        return await this._getOptimizationByIdSheets(optimizationId);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Get optimization by ID error', {
        optimizationId,
        error: error.message
      });

      // Try fallback
      try {
        if (this.useSupabase) {
          this.metrics.supabaseFallbacks++;
          return await this._getOptimizationByIdSheets(optimizationId);
        }
      } catch (fallbackError) {
        logger.error('Get optimization fallback failed', {
          optimizationId,
          error: fallbackError.message
        });
      }

      throw error;
    } finally {
      this._updateMetrics(Date.now() - startTime);
    }
  }

  /**
   * Get optimization history for a tenant
   */
  async getOptimizationHistory(tenantId, filters = {}) {
    const startTime = Date.now();

    try {
      if (this.useSupabase) {
        return await this._getOptimizationHistorySupabase(tenantId, filters);
      } else {
        return await this._getOptimizationHistorySheets(tenantId, filters);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Get optimization history error', {
        tenantId,
        error: error.message
      });

      // Try fallback
      try {
        if (this.useSupabase) {
          this.metrics.supabaseFallbacks++;
          return await this._getOptimizationHistorySheets(tenantId, filters);
        }
      } catch (fallbackError) {
        logger.error('Get optimization history fallback failed', {
          tenantId,
          error: fallbackError.message
        });
      }

      throw error;
    } finally {
      this._updateMetrics(Date.now() - startTime);
    }
  }

  /**
   * Store script metrics
   */
  async storeMetrics(metricsData) {
    const startTime = Date.now();

    try {
      if (this.useSupabase) {
        return await this._storeMetricsSupabase(metricsData);
      } else {
        return await this._storeMetricsSheets(metricsData);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Store metrics error', {
        tenantId: metricsData.tenantId,
        error: error.message
      });

      // Try fallback
      try {
        if (this.useSupabase) {
          this.metrics.supabaseFallbacks++;
          return await this._storeMetricsSheets(metricsData);
        }
      } catch (fallbackError) {
        logger.error('Store metrics fallback failed', {
          tenantId: metricsData.tenantId,
          error: fallbackError.message
        });
      }

      throw error;
    } finally {
      this._updateMetrics(Date.now() - startTime);
    }
  }

  /**
   * Store script error
   */
  async storeError(errorData) {
    const startTime = Date.now();

    try {
      if (this.useSupabase) {
        return await this._storeErrorSupabase(errorData);
      } else {
        return await this._storeErrorSheets(errorData);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Store error error', {
        tenantId: errorData.tenantId,
        error: error.message
      });

      // Try fallback
      try {
        if (this.useSupabase) {
          this.metrics.supabaseFallbacks++;
          return await this._storeErrorSheets(errorData);
        }
      } catch (fallbackError) {
        logger.error('Store error fallback failed', {
          tenantId: errorData.tenantId,
          error: fallbackError.message
        });
      }

      throw error;
    } finally {
      this._updateMetrics(Date.now() - startTime);
    }
  }

  // Supabase implementations for optimization operations
  async _storeOptimizationSupabase(optimization) {
    const query = `
      INSERT INTO optimizations (
        id, tenant_id, type, priority, status, data, metadata,
        retries, max_retries, expires_at, rollback_data,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        status = $5, data = $6, metadata = $7, retries = $8,
        rollback_data = $11, updated_at = $13
      RETURNING *
    `;

    const values = [
      optimization.id,
      optimization.tenantId,
      optimization.type,
      optimization.priority,
      optimization.status,
      JSON.stringify(optimization.data),
      JSON.stringify(optimization.metadata),
      optimization.retries,
      optimization.maxRetries,
      optimization.expiresAt,
      optimization.rollbackData ? JSON.stringify(optimization.rollbackData) : null,
      optimization.metadata.createdAt,
      optimization.lastUpdatedAt || new Date().toISOString()
    ];

    const result = await executeQuery(query, values);
    this.metrics.supabaseOps++;
    return result.rows[0];
  }

  async _getOptimizationByIdSupabase(optimizationId) {
    const query = 'SELECT * FROM optimizations WHERE id = $1';
    const result = await executeQuery(query, [optimizationId]);
    this.metrics.supabaseOps++;

    if (result.rows.length === 0) return null;

    const opt = result.rows[0];
    return {
      ...opt,
      data: JSON.parse(opt.data),
      metadata: JSON.parse(opt.metadata),
      rollbackData: opt.rollback_data ? JSON.parse(opt.rollback_data) : null
    };
  }

  async _getOptimizationHistorySupabase(tenantId, filters) {
    let query = 'SELECT * FROM optimizations WHERE tenant_id = $1';
    const values = [tenantId];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${++paramCount}`;
      values.push(filters.status);
    }

    if (filters.type) {
      query += ` AND type = $${++paramCount}`;
      values.push(filters.type);
    }

    if (filters.dateFrom) {
      query += ` AND created_at >= $${++paramCount}`;
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ` AND created_at <= $${++paramCount}`;
      values.push(filters.dateTo);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }

    const result = await executeQuery(query, values);
    this.metrics.supabaseOps++;

    return result.rows.map(opt => ({
      ...opt,
      data: JSON.parse(opt.data),
      metadata: JSON.parse(opt.metadata),
      rollbackData: opt.rollback_data ? JSON.parse(opt.rollback_data) : null
    }));
  }

  async _storeMetricsSupabase(metricsData) {
    const query = `
      INSERT INTO script_metrics (
        tenant_id, type, metrics, timestamp
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      metricsData.tenantId,
      metricsData.type,
      JSON.stringify(metricsData.metrics),
      metricsData.timestamp
    ];

    const result = await executeQuery(query, values);
    this.metrics.supabaseOps++;
    return result.rows[0];
  }

  async _storeErrorSupabase(errorData) {
    const query = `
      INSERT INTO script_errors (
        tenant_id, type, error, context, timestamp
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      errorData.tenantId,
      errorData.type,
      JSON.stringify(errorData.error),
      JSON.stringify(errorData.context),
      errorData.timestamp
    ];

    const result = await executeQuery(query, values);
    this.metrics.supabaseOps++;
    return result.rows[0];
  }

  // Sheets implementations for optimization operations
  async _storeOptimizationSheets(optimization) {
    const sheetTitle = `OPTIMIZATIONS_${optimization.tenantId}`;
    await optimizedSheets.ensureSheet(optimization.tenantId, sheetTitle, [
      'id', 'type', 'priority', 'status', 'data', 'metadata',
      'retries', 'max_retries', 'expires_at', 'rollback_data',
      'created_at', 'updated_at'
    ]);

    const row = {
      id: optimization.id,
      type: optimization.type,
      priority: optimization.priority,
      status: optimization.status,
      data: JSON.stringify(optimization.data),
      metadata: JSON.stringify(optimization.metadata),
      retries: optimization.retries,
      max_retries: optimization.maxRetries,
      expires_at: optimization.expiresAt,
      rollback_data: optimization.rollbackData ? JSON.stringify(optimization.rollbackData) : '',
      created_at: optimization.metadata.createdAt,
      updated_at: optimization.lastUpdatedAt || new Date().toISOString()
    };

    // Check if exists and update, otherwise add
    const rows = await optimizedSheets.getRows(optimization.tenantId, sheetTitle, { limit: 1000 });
    const existingIndex = rows.findIndex(r => r.id === optimization.id);

    if (existingIndex !== -1) {
      await optimizedSheets.updateRow(optimization.tenantId, sheetTitle, existingIndex, row);
    } else {
      await optimizedSheets.addRows(optimization.tenantId, sheetTitle, [row]);
    }

    this.metrics.sheetsOps++;
    return row;
  }

  async _getOptimizationByIdSheets(optimizationId) {
    // Search across all tenant sheets (less efficient but necessary for sheets)
    // In production, you might want to maintain an index
    const tenants = await tenantRegistry.getAllTenants();

    for (const tenant of tenants) {
      try {
        const sheetTitle = `OPTIMIZATIONS_${tenant.id}`;
        const rows = await optimizedSheets.getRows(tenant.id, sheetTitle, { limit: 1000 });
        const optimization = rows.find(row => row.id === optimizationId);

        if (optimization) {
          this.metrics.sheetsOps++;
          return {
            ...optimization,
            data: JSON.parse(optimization.data),
            metadata: JSON.parse(optimization.metadata),
            rollbackData: optimization.rollback_data ? JSON.parse(optimization.rollback_data) : null
          };
        }
      } catch (error) {
        // Sheet might not exist, continue searching
        continue;
      }
    }

    this.metrics.sheetsOps++;
    return null;
  }

  async _getOptimizationHistorySheets(tenantId, filters) {
    const sheetTitle = `OPTIMIZATIONS_${tenantId}`;
    const rows = await optimizedSheets.getRows(tenantId, sheetTitle, { limit: filters.limit || 1000 });

    let filteredRows = rows;

    if (filters.status) {
      filteredRows = filteredRows.filter(row => row.status === filters.status);
    }

    if (filters.type) {
      filteredRows = filteredRows.filter(row => row.type === filters.type);
    }

    if (filters.dateFrom) {
      filteredRows = filteredRows.filter(row =>
        new Date(row.created_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filteredRows = filteredRows.filter(row =>
        new Date(row.created_at) <= new Date(filters.dateTo)
      );
    }

    this.metrics.sheetsOps++;

    return filteredRows.map(row => ({
      ...row,
      data: JSON.parse(row.data),
      metadata: JSON.parse(row.metadata),
      rollbackData: row.rollback_data ? JSON.parse(row.rollback_data) : null
    }));
  }

  async _storeMetricsSheets(metricsData) {
    const sheetTitle = `SCRIPT_METRICS_${metricsData.tenantId}`;
    await optimizedSheets.ensureSheet(metricsData.tenantId, sheetTitle, [
      'tenant_id', 'type', 'metrics', 'timestamp'
    ]);

    const row = {
      tenant_id: metricsData.tenantId,
      type: metricsData.type,
      metrics: JSON.stringify(metricsData.metrics),
      timestamp: metricsData.timestamp
    };

    await optimizedSheets.addRows(metricsData.tenantId, sheetTitle, [row]);
    this.metrics.sheetsOps++;
    return row;
  }

  async _storeErrorSheets(errorData) {
    const sheetTitle = `SCRIPT_ERRORS_${errorData.tenantId}`;
    await optimizedSheets.ensureSheet(errorData.tenantId, sheetTitle, [
      'tenant_id', 'type', 'error', 'context', 'timestamp'
    ]);

    const row = {
      tenant_id: errorData.tenantId,
      type: errorData.type,
      error: JSON.stringify(errorData.error),
      context: JSON.stringify(errorData.context),
      timestamp: errorData.timestamp
    };

    await optimizedSheets.addRows(errorData.tenantId, sheetTitle, [row]);
    this.metrics.sheetsOps++;
    return row;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      stores: {},
      timestamp: new Date().toISOString()
    };

    // Check Supabase
    if (this.useSupabase) {
      try {
        const supabaseHealth = await getConnectionHealth();
        health.stores.supabase = {
          status: supabaseHealth.healthy ? 'healthy' : 'unhealthy',
          metrics: supabaseHealth.metrics
        };
      } catch (error) {
        health.stores.supabase = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }

    // Check Sheets
    try {
      const sheetsHealth = await optimizedSheets.healthCheck();
      health.stores.sheets = {
        status: sheetsHealth.status,
        checks: sheetsHealth.checks
      };
    } catch (error) {
      health.stores.sheets = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Overall status
    const hasHealthyStore = Object.values(health.stores).some(
      store => store.status === 'healthy'
    );
    health.status = hasHealthyStore ? 'healthy' : 'unhealthy';

    return health;
  }
}

// Export singleton instance
const dataStore = new DataStoreService();

export default dataStore;
export { DataStoreService };