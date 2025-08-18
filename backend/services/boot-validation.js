/**
 * Boot-time Validation Service
 * Ensures all required sheets and schemas are properly configured at startup
 */

import sheetsSchema from './sheets-schema.js';
import sheetsBackup from './sheets-backup.js';
import optimizedSheets from './sheets.js';
import tenantRegistry from './tenant-registry.js';
import logger from './logger.js';
import { validateHMACSecret } from '../utils/secret-validator.js';

class BootValidationService {
  constructor() {
    this.validationResults = new Map();
    this.lastValidation = null;
    this.isValidating = false;
    
    // Validation metrics
    this.metrics = {
      validationsRun: 0,
      tenantsValidated: 0,
      sheetsCreated: 0,
      schemasValidated: 0,
      errorsFound: 0,
      warningsFound: 0,
      avgValidationTime: 0
    };
  }

  /**
   * Run complete boot-time validation
   */
  async runBootValidation(options = {}) {
    if (this.isValidating) {
      logger.warn('Boot validation already in progress, skipping');
      return this.lastValidation;
    }

    this.isValidating = true;
    const startTime = Date.now();
    const validationId = `boot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Starting boot-time validation', { validationId });
    
    const results = {
      validationId,
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      tenants: new Map(),
      systemChecks: {},
      summary: {
        tenantsChecked: 0,
        tenantsHealthy: 0,
        totalSheets: 0,
        totalErrors: 0,
        totalWarnings: 0
      },
      duration: 0
    };

    try {
      // 1. Validate system services
      results.systemChecks = await this.validateSystemServices();
      
      // 2. Validate all tenants
      const tenants = options.tenantId ? 
        [tenantRegistry.getTenant(options.tenantId)].filter(Boolean) : 
        tenantRegistry.getAllTenants();
      
      for (const tenant of tenants) {
        if (!tenant.enabled && !options.includeDisabled) {
          continue;
        }
        
        try {
          const tenantResult = await this.validateTenant(tenant.id, options);
          results.tenants.set(tenant.id, tenantResult);
          results.summary.tenantsChecked++;
          
          if (tenantResult.status === 'healthy') {
            results.summary.tenantsHealthy++;
          }
          
          results.summary.totalSheets += tenantResult.sheetsValidated;
          results.summary.totalErrors += tenantResult.errors.length;
          results.summary.totalWarnings += tenantResult.warnings.length;
          
        } catch (error) {
          const errorResult = {
            tenantId: tenant.id,
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            sheetsValidated: 0,
            errors: [{ type: 'tenant_validation', message: error.message }],
            warnings: []
          };
          
          results.tenants.set(tenant.id, errorResult);
          results.summary.tenantsChecked++;
          results.summary.totalErrors++;
        }
      }
      
      // 3. Determine overall status
      if (results.summary.totalErrors > 0) {
        results.overallStatus = 'unhealthy';
      } else if (results.summary.totalWarnings > 0) {
        results.overallStatus = 'degraded';
      }
      
      // 4. Update metrics
      const validationTime = Date.now() - startTime;
      results.duration = validationTime;
      this.updateMetrics(results, validationTime);
      
      // 5. Store validation results
      this.validationResults.set(validationId, results);
      this.lastValidation = results;
      
      // 6. Create emergency backup if critical issues found
      if (options.createBackupOnIssues && results.summary.totalErrors > 0) {
        await this.createEmergencyBackups(results);
      }
      
      logger.info('Boot-time validation completed', {
        validationId,
        overallStatus: results.overallStatus,
        tenantsChecked: results.summary.tenantsChecked,
        totalErrors: results.summary.totalErrors,
        duration: validationTime
      });
      
      return results;
      
    } catch (error) {
      results.overallStatus = 'failed';
      results.error = error.message;
      
      logger.error('Boot-time validation failed', {
        validationId,
        error: error.message
      });
      
      return results;
      
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Validate system services
   */
  async validateSystemServices() {
    const checks = {};
    
    try {
      // Critical: Validate HMAC secret security
      try {
        const secretValidation = validateHMACSecret(process.env.HMAC_SECRET, {
          allowWeakInDev: process.env.NODE_ENV === 'development',
          environment: process.env.NODE_ENV || 'development'
        });
        
        checks.hmacSecurity = {
          status: 'healthy',
          entropy: secretValidation.entropy,
          length: secretValidation.length,
          warnings: secretValidation.warnings,
          details: { message: 'HMAC secret validation passed' }
        };
        
        if (secretValidation.warnings.length > 0) {
          checks.hmacSecurity.status = 'warning';
        }
        
      } catch (error) {
        checks.hmacSecurity = {
          status: 'critical',
          error: error.message,
          details: { 
            message: 'HMAC secret validation failed - SECURITY VULNERABILITY',
            recommendation: 'Generate secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
          }
        };
        
        logger.error('🚨 CRITICAL SECURITY ISSUE: HMAC secret validation failed', {
          error: error.message,
          environment: process.env.NODE_ENV
        });
      }
      
      // Check sheets service
      const sheetsHealth = await optimizedSheets.healthCheck();
      checks.sheetsService = {
        status: sheetsHealth.status,
        details: sheetsHealth
      };
      
      // Check schema service
      const schemaHealth = await sheetsSchema.healthCheck();
      checks.schemaService = {
        status: schemaHealth.status,
        details: schemaHealth
      };
      
      // Check backup service
      const backupHealth = await sheetsBackup.healthCheck();
      checks.backupService = {
        status: backupHealth.status,
        details: backupHealth
      };
      
      // Check tenant registry
      const tenantCount = tenantRegistry.getAllTenants().length;
      checks.tenantRegistry = {
        status: tenantCount > 0 ? 'healthy' : 'warning',
        tenantCount,
        details: { message: `${tenantCount} tenants registered` }
      };
      
    } catch (error) {
      checks.systemValidation = {
        status: 'error',
        error: error.message
      };
    }
    
    return checks;
  }

  /**
   * Validate individual tenant
   */
  async validateTenant(tenantId, options = {}) {
    const startTime = Date.now();
    
    const result = {
      tenantId,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sheetsValidated: 0,
      sheetsCreated: 0,
      schemaIssues: [],
      errors: [],
      warnings: [],
      schemas: {},
      sheets: {},
      duration: 0
    };
    
    try {
      logger.info(`Validating tenant: ${tenantId}`);
      
      // 1. Verify tenant configuration
      const tenant = tenantRegistry.getTenant(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }
      
      if (!tenant.sheetId) {
        throw new Error(`No sheet ID configured for tenant: ${tenantId}`);
      }
      
      // 2. Test basic connectivity
      try {
        await optimizedSheets.getTenantDoc(tenantId);
      } catch (error) {
        result.errors.push({
          type: 'connectivity',
          message: `Cannot connect to Google Sheets: ${error.message}`
        });
        result.status = 'unhealthy';
        return result;
      }
      
      // 3. Validate each schema
      const schemas = sheetsSchema.schemaDefinitions;
      
      for (const [sheetName, schema] of schemas) {
        try {
          const sheetResult = await this.validateSheetSchema(tenantId, sheetName, schema, options);
          result.schemas[sheetName] = sheetResult;
          result.sheetsValidated++;
          
          if (sheetResult.created) {
            result.sheetsCreated++;
          }
          
          if (sheetResult.issues.length > 0) {
            result.schemaIssues.push(...sheetResult.issues);
          }
          
        } catch (error) {
          result.errors.push({
            type: 'schema_validation',
            sheet: sheetName,
            message: error.message
          });
          result.status = 'unhealthy';
        }
      }
      
      // 4. Validate system sheets
      await this.validateSystemSheets(tenantId, result, options);
      
      // 5. Check data integrity
      if (options.checkDataIntegrity) {
        await this.validateDataIntegrity(tenantId, result);
      }
      
      // 6. Determine final status
      if (result.errors.length > 0) {
        result.status = 'unhealthy';
      } else if (result.warnings.length > 0 || result.schemaIssues.length > 0) {
        result.status = 'degraded';
      }
      
      result.duration = Date.now() - startTime;
      
      logger.info(`Tenant validation completed: ${tenantId}`, {
        status: result.status,
        sheetsValidated: result.sheetsValidated,
        sheetsCreated: result.sheetsCreated,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
      
      return result;
      
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      
      logger.error(`Tenant validation failed: ${tenantId}`, {
        error: error.message
      });
      
      return result;
    }
  }

  /**
   * Validate individual sheet schema
   */
  async validateSheetSchema(tenantId, sheetName, schema, options = {}) {
    const sheetResult = {
      sheetName,
      exists: false,
      created: false,
      schemaValid: false,
      headerMatch: false,
      rowCount: 0,
      issues: [],
      lastValidated: new Date().toISOString()
    };
    
    try {
      // Check if sheet exists and create if needed
      const sheetInfo = await sheetsSchema.ensureSheetWithSchema(tenantId, sheetName);
      sheetResult.exists = true;
      sheetResult.rowCount = sheetInfo.rowCount || 0;
      
      if (sheetInfo.rowCount === 0 && sheetInfo.columnCount === schema.headers.length) {
        sheetResult.created = true;
      }
      
      // Validate schema
      const validation = await sheetsSchema.validateSheetSchema(tenantId, sheetName, schema);
      sheetResult.schemaValid = validation.valid;
      sheetResult.headerMatch = validation.valid;
      
      if (!validation.valid) {
        sheetResult.issues.push(...validation.issues);
      }
      
      // Check for data if autofix is enabled
      if (options.autoFix && !validation.valid) {
        try {
          await this.fixSchemaIssues(tenantId, sheetName, validation);
          sheetResult.autoFixed = true;
        } catch (fixError) {
          sheetResult.issues.push(`Auto-fix failed: ${fixError.message}`);
        }
      }
      
    } catch (error) {
      sheetResult.issues.push(`Validation error: ${error.message}`);
    }
    
    return sheetResult;
  }

  /**
   * Validate system sheets (schema tracking, backups)
   */
  async validateSystemSheets(tenantId, result, options = {}) {
    try {
      // Ensure schema tracking sheet
      await optimizedSheets.ensureSheet(tenantId, '_proofkit_schema', [
        'sheet_name', 'version', 'hash', 'last_validated', 
        'header_count', 'description', 'tenant_id'
      ]);
      
      // Ensure backup tracking sheet
      await optimizedSheets.ensureSheet(tenantId, '_proofkit_backups', [
        'backup_id', 'type', 'file_path', 'size_bytes', 'sheet_count',
        'created_at', 'status', 'error', 'restored_at', 'tenant_id'
      ]);
      
      result.sheets.systemSheets = {
        schemaTracking: true,
        backupTracking: true
      };
      
    } catch (error) {
      result.errors.push({
        type: 'system_sheets',
        message: `Failed to validate system sheets: ${error.message}`
      });
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(tenantId, result) {
    try {
      const integrityIssues = [];
      
      // Check for duplicate records
      const schemas = sheetsSchema.schemaDefinitions;
      
      for (const [sheetName, schema] of schemas) {
        try {
          const rows = await optimizedSheets.getRows(tenantId, sheetName, { limit: 1000 });
          
          // Check for duplicates based on unique fields
          if (schema.indexes && rows.length > 0) {
            const seen = new Set();
            const duplicates = [];
            
            for (const row of rows) {
              const key = schema.indexes.map(field => row[field]).join('|');
              if (seen.has(key)) {
                duplicates.push(key);
              } else {
                seen.add(key);
              }
            }
            
            if (duplicates.length > 0) {
              integrityIssues.push({
                sheet: sheetName,
                type: 'duplicates',
                count: duplicates.length,
                fields: schema.indexes
              });
            }
          }
          
          // Validate row data against schema
          let invalidRows = 0;
          for (const row of rows.slice(0, 100)) { // Sample first 100 rows
            try {
              sheetsSchema.validateRowData(sheetName, row);
            } catch (validationError) {
              invalidRows++;
            }
          }
          
          if (invalidRows > 0) {
            integrityIssues.push({
              sheet: sheetName,
              type: 'invalid_data',
              count: invalidRows,
              sample: rows.length
            });
          }
          
        } catch (error) {
          integrityIssues.push({
            sheet: sheetName,
            type: 'validation_error',
            error: error.message
          });
        }
      }
      
      if (integrityIssues.length > 0) {
        result.warnings.push({
          type: 'data_integrity',
          message: `Found ${integrityIssues.length} data integrity issues`,
          details: integrityIssues
        });
      }
      
    } catch (error) {
      result.errors.push({
        type: 'integrity_check',
        message: `Data integrity check failed: ${error.message}`
      });
    }
  }

  /**
   * Attempt to fix schema issues automatically
   */
  async fixSchemaIssues(tenantId, sheetName, validation) {
    if (validation.valid) {
      return; // Nothing to fix
    }
    
    logger.info(`Attempting to fix schema issues for sheet: ${sheetName}`, {
      tenantId,
      issues: validation.issues
    });
    
    // Get current sheet and expected schema
    const schema = sheetsSchema.schemaDefinitions.get(sheetName);
    const connection = await optimizedSheets.getTenantDoc(tenantId);
    const sheet = connection.doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    
    try {
      // Load current headers
      await sheet.loadHeaderRow();
      const currentHeaders = sheet._headerValues || [];
      const expectedHeaders = schema.headers.map(h => h.name);
      
      // Add missing headers
      const missingHeaders = expectedHeaders.filter(h => !currentHeaders.includes(h));
      if (missingHeaders.length > 0) {
        const newHeaders = [...currentHeaders, ...missingHeaders];
        await sheet.setHeaderRow(newHeaders);
        logger.info(`Added missing headers to sheet: ${sheetName}`, {
          tenantId,
          missingHeaders
        });
      }
      
      // Note: We don't remove extra headers to avoid data loss
      // This would need manual intervention
      
    } finally {
      connection.release();
    }
  }

  /**
   * Create emergency backups for tenants with critical issues
   */
  async createEmergencyBackups(validationResults) {
    const tenantsWithErrors = [];
    
    for (const [tenantId, result] of validationResults.tenants) {
      if (result.status === 'unhealthy' || result.errors.length > 0) {
        tenantsWithErrors.push(tenantId);
      }
    }
    
    if (tenantsWithErrors.length === 0) {
      return;
    }
    
    logger.info(`Creating emergency backups for ${tenantsWithErrors.length} tenants with issues`);
    
    const backupPromises = tenantsWithErrors.map(async (tenantId) => {
      try {
        const backupId = sheetsBackup.queueBackup(tenantId, {
          reason: 'emergency_backup_validation_errors',
          priority: 'high'
        });
        
        logger.info(`Emergency backup queued for tenant: ${tenantId}`, { backupId });
        return { tenantId, backupId, success: true };
        
      } catch (error) {
        logger.error(`Failed to queue emergency backup for tenant: ${tenantId}`, {
          error: error.message
        });
        return { tenantId, success: false, error: error.message };
      }
    });
    
    const results = await Promise.allSettled(backupPromises);
    logger.info('Emergency backup queueing completed', {
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value.success).length
    });
  }

  /**
   * Update service metrics
   */
  updateMetrics(results, validationTime) {
    this.metrics.validationsRun++;
    this.metrics.tenantsValidated += results.summary.tenantsChecked;
    this.metrics.schemasValidated += results.summary.totalSheets;
    this.metrics.errorsFound += results.summary.totalErrors;
    this.metrics.warningsFound += results.summary.totalWarnings;
    
    // Update average validation time
    this.metrics.avgValidationTime = (
      (this.metrics.avgValidationTime * (this.metrics.validationsRun - 1)) + validationTime
    ) / this.metrics.validationsRun;
  }

  /**
   * Get validation results
   */
  getValidationResults(validationId = null) {
    if (validationId) {
      return this.validationResults.get(validationId);
    }
    
    return this.lastValidation;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      lastValidation: this.lastValidation?.timestamp || null,
      isValidating: this.isValidating
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
      lastValidation: this.lastValidation ? {
        timestamp: this.lastValidation.timestamp,
        status: this.lastValidation.overallStatus,
        tenantsChecked: this.lastValidation.summary.tenantsChecked,
        errors: this.lastValidation.summary.totalErrors
      } : null
    };
    
    // Check if last validation found critical issues
    if (this.lastValidation && this.lastValidation.overallStatus === 'unhealthy') {
      health.status = 'degraded';
      health.warning = 'Last validation found critical issues';
    }
    
    return health;
  }
}

// Singleton instance
const bootValidation = new BootValidationService();

export default bootValidation;
export { BootValidationService };