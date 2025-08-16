/**
 * Google Sheets Schema Management Service
 * Handles schema versioning, backups, migrations, and data integrity
 */

import optimizedSheets from './sheets.js';
import tenantRegistry from './tenant-registry.js';
import logger from './logger.js';
import { createHash } from 'crypto';

const SCHEMA_VERSION = '1.0.0';
const BACKUP_RETENTION_DAYS = 30;
const SCHEMA_SHEET_NAME = '_proofkit_schema';
const BACKUP_SHEET_NAME = '_proofkit_backups';

class SheetsSchemaService {
  constructor() {
    this.schemaDefinitions = new Map();
    this.migrations = new Map();
    this.backupSchedule = null;
    
    // Performance metrics
    this.metrics = {
      schemaValidations: 0,
      backupsCreated: 0,
      migrationsRun: 0,
      integrityChecks: 0,
      errors: 0
    };

    // Default schema definitions
    this.defineDefaultSchemas();
    
    // Start backup scheduler
    this.initializeBackupScheduler();
  }

  /**
   * Define default sheet schemas for ProofKit
   */
  defineDefaultSchemas() {
    // Core tracking sheet schema
    this.defineSchema('events', {
      version: '1.0.0',
      description: 'Core event tracking data',
      headers: [
        { name: 'timestamp', type: 'datetime', required: true, description: 'Event timestamp' },
        { name: 'event', type: 'string', required: true, description: 'Event type' },
        { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
        { name: 'session_id', type: 'string', required: false, description: 'Session identifier' },
        { name: 'user_id', type: 'string', required: false, description: 'User identifier' },
        { name: 'page_url', type: 'string', required: false, description: 'Page URL' },
        { name: 'page_title', type: 'string', required: false, description: 'Page title' },
        { name: 'referrer', type: 'string', required: false, description: 'Referrer URL' },
        { name: 'utm_source', type: 'string', required: false, description: 'UTM source' },
        { name: 'utm_medium', type: 'string', required: false, description: 'UTM medium' },
        { name: 'utm_campaign', type: 'string', required: false, description: 'UTM campaign' },
        { name: 'device_type', type: 'string', required: false, description: 'Device type' },
        { name: 'browser', type: 'string', required: false, description: 'Browser name' },
        { name: 'os', type: 'string', required: false, description: 'Operating system' },
        { name: 'country', type: 'string', required: false, description: 'Country code' },
        { name: 'revenue', type: 'number', required: false, description: 'Revenue amount' },
        { name: 'currency', type: 'string', required: false, description: 'Currency code' },
        { name: 'event_data', type: 'json', required: false, description: 'Additional event data' }
      ],
      indexes: ['timestamp', 'event', 'tenant_id'],
      validations: [
        { field: 'timestamp', rule: 'isDate' },
        { field: 'event', rule: 'notEmpty' },
        { field: 'tenant_id', rule: 'notEmpty' },
        { field: 'revenue', rule: 'isNumeric', optional: true },
        { field: 'currency', rule: 'isLength', options: { min: 3, max: 3 }, optional: true }
      ]
    });

    // Audience data schema
    this.defineSchema('audiences', {
      version: '1.0.0',
      description: 'Customer audience segments',
      headers: [
        { name: 'user_id', type: 'string', required: true, description: 'User identifier' },
        { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
        { name: 'segment', type: 'string', required: true, description: 'Audience segment' },
        { name: 'first_seen', type: 'datetime', required: true, description: 'First interaction' },
        { name: 'last_seen', type: 'datetime', required: true, description: 'Last interaction' },
        { name: 'ltv', type: 'number', required: false, description: 'Lifetime value' },
        { name: 'order_count', type: 'number', required: false, description: 'Number of orders' },
        { name: 'avg_order_value', type: 'number', required: false, description: 'Average order value' },
        { name: 'tags', type: 'string', required: false, description: 'Customer tags (comma-separated)' },
        { name: 'source', type: 'string', required: false, description: 'Acquisition source' },
        { name: 'email', type: 'string', required: false, description: 'Email address' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' }
      ],
      indexes: ['user_id', 'tenant_id', 'segment'],
      validations: [
        { field: 'user_id', rule: 'notEmpty' },
        { field: 'tenant_id', rule: 'notEmpty' },
        { field: 'segment', rule: 'notEmpty' },
        { field: 'first_seen', rule: 'isDate' },
        { field: 'last_seen', rule: 'isDate' },
        { field: 'ltv', rule: 'isNumeric', optional: true },
        { field: 'email', rule: 'isEmail', optional: true }
      ]
    });

    // Campaign performance schema
    this.defineSchema('campaigns', {
      version: '1.0.0',
      description: 'Campaign performance tracking',
      headers: [
        { name: 'campaign_id', type: 'string', required: true, description: 'Campaign identifier' },
        { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
        { name: 'campaign_name', type: 'string', required: true, description: 'Campaign name' },
        { name: 'date', type: 'date', required: true, description: 'Performance date' },
        { name: 'impressions', type: 'number', required: false, description: 'Ad impressions' },
        { name: 'clicks', type: 'number', required: false, description: 'Ad clicks' },
        { name: 'spend', type: 'number', required: false, description: 'Ad spend' },
        { name: 'conversions', type: 'number', required: false, description: 'Conversions' },
        { name: 'revenue', type: 'number', required: false, description: 'Revenue attributed' },
        { name: 'platform', type: 'string', required: false, description: 'Ad platform' },
        { name: 'ad_group', type: 'string', required: false, description: 'Ad group' },
        { name: 'keyword', type: 'string', required: false, description: 'Target keyword' }
      ],
      indexes: ['campaign_id', 'tenant_id', 'date'],
      validations: [
        { field: 'campaign_id', rule: 'notEmpty' },
        { field: 'tenant_id', rule: 'notEmpty' },
        { field: 'campaign_name', rule: 'notEmpty' },
        { field: 'date', rule: 'isDate' },
        { field: 'impressions', rule: 'isNumeric', optional: true },
        { field: 'clicks', rule: 'isNumeric', optional: true },
        { field: 'spend', rule: 'isNumeric', optional: true }
      ]
    });

    // Analytics insights schema
    this.defineSchema('insights', {
      version: '1.0.0',
      description: 'Analytics insights and reports',
      headers: [
        { name: 'insight_id', type: 'string', required: true, description: 'Insight identifier' },
        { name: 'tenant_id', type: 'string', required: true, description: 'Tenant identifier' },
        { name: 'type', type: 'string', required: true, description: 'Insight type' },
        { name: 'title', type: 'string', required: true, description: 'Insight title' },
        { name: 'description', type: 'string', required: false, description: 'Insight description' },
        { name: 'date_range_start', type: 'date', required: true, description: 'Analysis period start' },
        { name: 'date_range_end', type: 'date', required: true, description: 'Analysis period end' },
        { name: 'metric_value', type: 'number', required: false, description: 'Primary metric value' },
        { name: 'metric_change', type: 'number', required: false, description: 'Metric change percentage' },
        { name: 'confidence_score', type: 'number', required: false, description: 'Confidence score (0-1)' },
        { name: 'recommendations', type: 'json', required: false, description: 'Actionable recommendations' },
        { name: 'data_points', type: 'json', required: false, description: 'Supporting data points' },
        { name: 'created_at', type: 'datetime', required: true, description: 'Creation timestamp' }
      ],
      indexes: ['insight_id', 'tenant_id', 'type', 'created_at'],
      validations: [
        { field: 'insight_id', rule: 'notEmpty' },
        { field: 'tenant_id', rule: 'notEmpty' },
        { field: 'type', rule: 'notEmpty' },
        { field: 'title', rule: 'notEmpty' },
        { field: 'date_range_start', rule: 'isDate' },
        { field: 'date_range_end', rule: 'isDate' },
        { field: 'confidence_score', rule: 'isFloat', options: { min: 0, max: 1 }, optional: true }
      ]
    });
  }

  /**
   * Define a new sheet schema
   */
  defineSchema(sheetName, schema) {
    // Validate schema structure
    this.validateSchemaDefinition(schema);
    
    // Add metadata
    schema.createdAt = new Date().toISOString();
    schema.hash = this.generateSchemaHash(schema);
    
    this.schemaDefinitions.set(sheetName, schema);
    logger.info(`Schema defined for sheet: ${sheetName}`, { version: schema.version });
  }

  /**
   * Validate schema definition structure
   */
  validateSchemaDefinition(schema) {
    if (!schema.version) {
      throw new Error('Schema must have a version');
    }
    
    if (!schema.headers || !Array.isArray(schema.headers)) {
      throw new Error('Schema must have headers array');
    }
    
    schema.headers.forEach((header, index) => {
      if (!header.name) {
        throw new Error(`Header at index ${index} must have a name`);
      }
      if (!header.type) {
        throw new Error(`Header '${header.name}' must have a type`);
      }
      if (typeof header.required !== 'boolean') {
        throw new Error(`Header '${header.name}' must specify required property`);
      }
    });
  }

  /**
   * Generate hash for schema definition
   */
  generateSchemaHash(schema) {
    const schemaString = JSON.stringify({
      version: schema.version,
      headers: schema.headers,
      validations: schema.validations || []
    });
    return createHash('sha256').update(schemaString).digest('hex').substring(0, 16);
  }

  /**
   * Ensure sheet exists with proper schema
   */
  async ensureSheetWithSchema(tenantId, sheetName) {
    const schema = this.schemaDefinitions.get(sheetName);
    if (!schema) {
      throw new Error(`No schema defined for sheet: ${sheetName}`);
    }

    try {
      // Get header values from schema
      const headers = schema.headers.map(h => h.name);
      
      // Ensure sheet exists
      const sheetInfo = await optimizedSheets.ensureSheet(tenantId, sheetName, headers);
      
      // Validate existing schema
      await this.validateSheetSchema(tenantId, sheetName, schema);
      
      // Update schema metadata
      await this.updateSchemaMetadata(tenantId, sheetName, schema);
      
      this.metrics.schemaValidations++;
      return sheetInfo;
      
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Failed to ensure sheet with schema: ${sheetName}`, { 
        tenantId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate sheet against schema
   */
  async validateSheetSchema(tenantId, sheetName, schema) {
    try {
      const sheetInfo = await optimizedSheets.ensureSheet(tenantId, sheetName);
      const currentHeaders = sheetInfo.headerValues || [];
      const expectedHeaders = schema.headers.map(h => h.name);
      
      // Check if headers match
      const missingHeaders = expectedHeaders.filter(h => !currentHeaders.includes(h));
      const extraHeaders = currentHeaders.filter(h => !expectedHeaders.includes(h));
      
      if (missingHeaders.length > 0 || extraHeaders.length > 0) {
        const issues = [];
        if (missingHeaders.length > 0) {
          issues.push(`Missing headers: ${missingHeaders.join(', ')}`);
        }
        if (extraHeaders.length > 0) {
          issues.push(`Extra headers: ${extraHeaders.join(', ')}`);
        }
        
        logger.warn(`Schema mismatch in sheet: ${sheetName}`, {
          tenantId,
          issues,
          currentHeaders,
          expectedHeaders
        });
        
        return {
          valid: false,
          issues,
          currentHeaders,
          expectedHeaders
        };
      }
      
      return {
        valid: true,
        currentHeaders,
        expectedHeaders
      };
      
    } catch (error) {
      logger.error(`Schema validation failed for sheet: ${sheetName}`, {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update schema metadata in special schema tracking sheet
   */
  async updateSchemaMetadata(tenantId, sheetName, schema) {
    try {
      const schemaData = {
        sheet_name: sheetName,
        version: schema.version,
        hash: schema.hash,
        last_validated: new Date().toISOString(),
        header_count: schema.headers.length,
        description: schema.description || '',
        tenant_id: tenantId
      };
      
      // Ensure schema tracking sheet exists
      await optimizedSheets.ensureSheet(tenantId, SCHEMA_SHEET_NAME, [
        'sheet_name', 'version', 'hash', 'last_validated', 
        'header_count', 'description', 'tenant_id'
      ]);
      
      // Check if record exists
      const rows = await optimizedSheets.getRows(tenantId, SCHEMA_SHEET_NAME);
      const existingRow = rows.find(row => 
        row.sheet_name === sheetName && row.tenant_id === tenantId
      );
      
      if (existingRow) {
        // Update existing record
        Object.assign(existingRow, schemaData);
        await optimizedSheets.updateRow(tenantId, SCHEMA_SHEET_NAME, existingRow);
      } else {
        // Add new record
        await optimizedSheets.addRow(tenantId, SCHEMA_SHEET_NAME, schemaData);
      }
      
    } catch (error) {
      logger.error(`Failed to update schema metadata for sheet: ${sheetName}`, {
        tenantId,
        error: error.message
      });
      // Don't throw, this is metadata only
    }
  }

  /**
   * Validate data against schema before insertion
   */
  validateRowData(sheetName, rowData) {
    const schema = this.schemaDefinitions.get(sheetName);
    if (!schema) {
      throw new Error(`No schema defined for sheet: ${sheetName}`);
    }

    const errors = [];
    
    // Check required fields
    schema.headers.forEach(header => {
      if (header.required && !rowData[header.name]) {
        errors.push(`Required field missing: ${header.name}`);
      }
    });
    
    // Run validations
    if (schema.validations) {
      schema.validations.forEach(validation => {
        const value = rowData[validation.field];
        
        // Skip validation if field is optional and empty
        if (validation.optional && (!value || value === '')) {
          return;
        }
        
        try {
          this.runValidationRule(validation.rule, value, validation.options);
        } catch (error) {
          errors.push(`Validation failed for ${validation.field}: ${error.message}`);
        }
      });
    }
    
    if (errors.length > 0) {
      throw new Error(`Data validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Run individual validation rule
   */
  runValidationRule(rule, value, options = {}) {
    switch (rule) {
      case 'notEmpty':
        if (!value || value.toString().trim() === '') {
          throw new Error('Value cannot be empty');
        }
        break;
        
      case 'isDate':
        if (value && isNaN(Date.parse(value))) {
          throw new Error('Value must be a valid date');
        }
        break;
        
      case 'isNumeric':
        if (value && isNaN(Number(value))) {
          throw new Error('Value must be numeric');
        }
        break;
        
      case 'isFloat':
        const num = Number(value);
        if (value && isNaN(num)) {
          throw new Error('Value must be a number');
        }
        if (options.min !== undefined && num < options.min) {
          throw new Error(`Value must be >= ${options.min}`);
        }
        if (options.max !== undefined && num > options.max) {
          throw new Error(`Value must be <= ${options.max}`);
        }
        break;
        
      case 'isEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('Value must be a valid email address');
        }
        break;
        
      case 'isLength':
        if (value && (value.length < options.min || value.length > options.max)) {
          throw new Error(`Value length must be between ${options.min} and ${options.max}`);
        }
        break;
        
      default:
        logger.warn(`Unknown validation rule: ${rule}`);
    }
  }

  /**
   * Create backup of sheet data
   */
  async createBackup(tenantId, sheetName, backupType = 'manual') {
    try {
      const backupId = `${sheetName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      
      // Get current data
      const rows = await optimizedSheets.getRows(tenantId, sheetName, { useCache: false });
      const sheetInfo = await optimizedSheets.ensureSheet(tenantId, sheetName);
      
      // Create backup data
      const backupData = {
        backup_id: backupId,
        tenant_id: tenantId,
        sheet_name: sheetName,
        backup_type: backupType,
        created_at: timestamp,
        row_count: rows.length,
        schema_version: this.schemaDefinitions.get(sheetName)?.version || 'unknown',
        schema_hash: this.schemaDefinitions.get(sheetName)?.hash || '',
        headers: JSON.stringify(sheetInfo.headerValues || []),
        data_sample: JSON.stringify(rows.slice(0, 5)), // Store first 5 rows as sample
        size_bytes: JSON.stringify(rows).length
      };
      
      // Ensure backup tracking sheet exists
      await optimizedSheets.ensureSheet(tenantId, BACKUP_SHEET_NAME, [
        'backup_id', 'tenant_id', 'sheet_name', 'backup_type', 'created_at',
        'row_count', 'schema_version', 'schema_hash', 'headers', 'data_sample', 'size_bytes'
      ]);
      
      // Store backup metadata
      await optimizedSheets.addRow(tenantId, BACKUP_SHEET_NAME, backupData);
      
      // For full backups, create snapshot sheet
      if (backupType === 'daily' || backupType === 'manual') {
        const snapshotSheetName = `${sheetName}_backup_${timestamp.split('T')[0]}`;
        
        // Create snapshot with data
        await optimizedSheets.ensureSheet(tenantId, snapshotSheetName, sheetInfo.headerValues);
        if (rows.length > 0) {
          await optimizedSheets.addRows(tenantId, snapshotSheetName, rows);
        }
        
        // Update backup record with snapshot sheet
        backupData.snapshot_sheet = snapshotSheetName;
        const backupRows = await optimizedSheets.getRows(tenantId, BACKUP_SHEET_NAME);
        const backupRow = backupRows.find(row => row.backup_id === backupId);
        if (backupRow) {
          backupRow.snapshot_sheet = snapshotSheetName;
          await optimizedSheets.updateRow(tenantId, BACKUP_SHEET_NAME, backupRow);
        }
      }
      
      this.metrics.backupsCreated++;
      logger.info(`Backup created for sheet: ${sheetName}`, {
        tenantId,
        backupId,
        backupType,
        rowCount: rows.length
      });
      
      return {
        backupId,
        rowCount: rows.length,
        timestamp,
        snapshotSheet: backupData.snapshot_sheet
      };
      
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Failed to create backup for sheet: ${sheetName}`, {
        tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize backup scheduler for daily backups
   */
  initializeBackupScheduler() {
    // Run daily backups at 2 AM UTC
    const scheduleBackups = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(2, 0, 0, 0);
      
      const msUntilBackup = tomorrow.getTime() - now.getTime();
      
      setTimeout(async () => {
        await this.runDailyBackups();
        scheduleBackups(); // Schedule next backup
      }, msUntilBackup);
    };
    
    scheduleBackups();
    logger.info('Daily backup scheduler initialized');
  }

  /**
   * Run daily backups for all tenants
   */
  async runDailyBackups() {
    try {
      const tenants = tenantRegistry.getAllTenants();
      const backupPromises = [];
      
      for (const tenant of tenants) {
        if (!tenant.enabled) continue;
        
        // Backup core sheets for each tenant
        for (const sheetName of this.schemaDefinitions.keys()) {
          backupPromises.push(
            this.createBackup(tenant.id, sheetName, 'daily').catch(error => {
              logger.error(`Daily backup failed for ${tenant.id}:${sheetName}`, {
                error: error.message
              });
            })
          );
        }
      }
      
      await Promise.allSettled(backupPromises);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      logger.info('Daily backups completed', {
        tenantsProcessed: tenants.length,
        schemasBackedUp: this.schemaDefinitions.size
      });
      
    } catch (error) {
      logger.error('Daily backup process failed', { error: error.message });
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);
      const cutoffTimestamp = cutoffDate.toISOString();
      
      const tenants = tenantRegistry.getAllTenants();
      
      for (const tenant of tenants) {
        if (!tenant.enabled) continue;
        
        try {
          // Get backup records
          const backupRows = await optimizedSheets.getRows(tenant.id, BACKUP_SHEET_NAME);
          const oldBackups = backupRows.filter(row => 
            row.created_at < cutoffTimestamp && row.backup_type === 'daily'
          );
          
          for (const backup of oldBackups) {
            // Delete snapshot sheet if exists
            if (backup.snapshot_sheet) {
              try {
                const connection = await optimizedSheets.getTenantDoc(tenant.id);
                const sheet = connection.doc.sheetsByTitle[backup.snapshot_sheet];
                if (sheet) {
                  await sheet.delete();
                }
                connection.release();
              } catch (error) {
                logger.warn(`Failed to delete snapshot sheet: ${backup.snapshot_sheet}`, {
                  error: error.message
                });
              }
            }
            
            // Delete backup record
            await optimizedSheets.deleteRow(tenant.id, BACKUP_SHEET_NAME, backup);
          }
          
          if (oldBackups.length > 0) {
            logger.info(`Cleaned up ${oldBackups.length} old backups for tenant: ${tenant.id}`);
          }
          
        } catch (error) {
          logger.error(`Backup cleanup failed for tenant: ${tenant.id}`, {
            error: error.message
          });
        }
      }
      
    } catch (error) {
      logger.error('Backup cleanup process failed', { error: error.message });
    }
  }

  /**
   * Boot-time schema validation and sheet creation
   */
  async bootTimeValidation(tenantId) {
    const results = {
      tenant: tenantId,
      timestamp: new Date().toISOString(),
      sheetsValidated: 0,
      sheetsCreated: 0,
      errors: [],
      warnings: []
    };
    
    try {
      logger.info(`Starting boot-time validation for tenant: ${tenantId}`);
      
      // Validate each defined schema
      for (const [sheetName, schema] of this.schemaDefinitions) {
        try {
          const sheetInfo = await this.ensureSheetWithSchema(tenantId, sheetName);
          results.sheetsValidated++;
          
          if (sheetInfo.rowCount === 0) {
            results.sheetsCreated++;
          }
          
        } catch (error) {
          results.errors.push({
            sheet: sheetName,
            error: error.message
          });
        }
      }
      
      // Create schema tracking sheet if not exists
      try {
        await optimizedSheets.ensureSheet(tenantId, SCHEMA_SHEET_NAME);
        await optimizedSheets.ensureSheet(tenantId, BACKUP_SHEET_NAME);
      } catch (error) {
        results.errors.push({
          sheet: 'system_sheets',
          error: error.message
        });
      }
      
      this.metrics.integrityChecks++;
      
      logger.info(`Boot-time validation completed for tenant: ${tenantId}`, {
        sheetsValidated: results.sheetsValidated,
        sheetsCreated: results.sheetsCreated,
        errors: results.errors.length
      });
      
      return results;
      
    } catch (error) {
      this.metrics.errors++;
      results.errors.push({
        sheet: 'general',
        error: error.message
      });
      
      logger.error(`Boot-time validation failed for tenant: ${tenantId}`, {
        error: error.message
      });
      
      return results;
    }
  }

  /**
   * Run schema migration
   */
  async runMigration(tenantId, sheetName, fromVersion, toVersion) {
    try {
      const migrationKey = `${sheetName}:${fromVersion}:${toVersion}`;
      const migration = this.migrations.get(migrationKey);
      
      if (!migration) {
        throw new Error(`No migration defined for ${migrationKey}`);
      }
      
      logger.info(`Running migration for sheet: ${sheetName}`, {
        tenantId,
        fromVersion,
        toVersion
      });
      
      // Create backup before migration
      await this.createBackup(tenantId, sheetName, 'migration');
      
      // Run migration
      await migration.migrate(tenantId, sheetName);
      
      // Update schema metadata
      const newSchema = this.schemaDefinitions.get(sheetName);
      if (newSchema) {
        await this.updateSchemaMetadata(tenantId, sheetName, newSchema);
      }
      
      this.metrics.migrationsRun++;
      
      logger.info(`Migration completed for sheet: ${sheetName}`, {
        tenantId,
        fromVersion,
        toVersion
      });
      
      return { success: true };
      
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Migration failed for sheet: ${sheetName}`, {
        tenantId,
        fromVersion,
        toVersion,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      schemasDefinied: this.schemaDefinitions.size,
      migrationsDefinied: this.migrations.size,
      retentionDays: BACKUP_RETENTION_DAYS,
      schemaVersion: SCHEMA_VERSION
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      schemas: Array.from(this.schemaDefinitions.keys())
    };
    
    try {
      // Test schema definition access
      if (this.schemaDefinitions.size === 0) {
        health.status = 'unhealthy';
        health.error = 'No schemas defined';
      }
      
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }
    
    return health;
  }
}

// Singleton instance
const sheetsSchema = new SheetsSchemaService();

export default sheetsSchema;
export { SheetsSchemaService, SCHEMA_VERSION };