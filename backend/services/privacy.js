/**
 * GDPR Compliance Service
 * Handles data privacy, user consent, and data deletion rights
 */

import crypto from 'crypto';
import { getDoc, ensureSheet } from './sheets.js';

class PrivacyService {
  constructor() {
    this.consentRecords = new Map(); // In-memory cache
    this.dataProcessingLogs = new Map();
    this.deletionQueue = new Set();
    
    // GDPR data retention periods (in days)
    this.retentionPeriods = {
      user_data: 365 * 3, // 3 years
      analytics_data: 365 * 2, // 2 years  
      marketing_data: 365 * 1, // 1 year
      logs: 90, // 90 days
      consent_records: 365 * 7, // 7 years (legal requirement)
      financial_data: 365 * 7 // 7 years
    };
    
    // Data categories for GDPR classification
    this.dataCategories = {
      PERSONAL_IDENTIFIABLE: 'personal_identifiable',
      ANALYTICS: 'analytics',
      MARKETING: 'marketing',
      TECHNICAL: 'technical',
      FINANCIAL: 'financial',
      CONSENT: 'consent'
    };
    
    // Legal bases for data processing under GDPR
    this.legalBases = {
      CONSENT: 'consent',
      CONTRACT: 'contract',
      LEGAL_OBLIGATION: 'legal_obligation',
      VITAL_INTERESTS: 'vital_interests',
      PUBLIC_TASK: 'public_task',
      LEGITIMATE_INTERESTS: 'legitimate_interests'
    };
    
    // Start background cleanup process
    this.startCleanupTimer();
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(tenantId, userId, consentData) {
    try {
      const timestamp = new Date().toISOString();
      const consentId = crypto.randomUUID();
      
      const record = {
        consent_id: consentId,
        tenant_id: tenantId,
        user_id: this.hashUserId(userId),
        consent_type: consentData.type || 'general',
        purpose: consentData.purpose || 'data_processing',
        legal_basis: consentData.legalBasis || this.legalBases.CONSENT,
        consented: consentData.consented === true,
        consent_method: consentData.method || 'web_form',
        ip_address: this.hashIP(consentData.ipAddress),
        user_agent_hash: this.hashUserAgent(consentData.userAgent),
        consent_version: consentData.version || '1.0',
        timestamp: timestamp,
        expires_at: consentData.expiresAt || this.calculateConsentExpiry(timestamp),
        metadata: JSON.stringify(consentData.metadata || {})
      };
      
      // Store in memory cache
      this.consentRecords.set(consentId, record);
      
      // Store in persistent storage
      await this.storeConsentRecord(tenantId, record);
      
      // Log the data processing activity
      await this.logDataProcessing(tenantId, {
        activity_type: 'consent_recorded',
        user_id: this.hashUserId(userId),
        data_categories: [this.dataCategories.CONSENT],
        legal_basis: record.legal_basis,
        purpose: record.purpose,
        timestamp: timestamp
      });
      
      console.log(`Privacy: Consent recorded for tenant ${tenantId}, consent_id: ${consentId}`);
      return { success: true, consentId, record };
      
    } catch (error) {
      console.error('Privacy: Error recording consent:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(tenantId, userId, consentId, reason = 'user_request') {
    try {
      const timestamp = new Date().toISOString();
      const hashedUserId = this.hashUserId(userId);
      
      // Update consent record
      const withdrawalRecord = {
        consent_id: consentId,
        tenant_id: tenantId,
        user_id: hashedUserId,
        withdrawn: true,
        withdrawal_timestamp: timestamp,
        withdrawal_reason: reason,
        withdrawal_method: 'api'
      };
      
      // Store withdrawal record
      await this.storeConsentWithdrawal(tenantId, withdrawalRecord);
      
      // Trigger data deletion for withdrawn consent
      await this.triggerDataDeletion(tenantId, hashedUserId, 'consent_withdrawn');
      
      // Log the activity
      await this.logDataProcessing(tenantId, {
        activity_type: 'consent_withdrawn',
        user_id: hashedUserId,
        data_categories: [this.dataCategories.CONSENT],
        legal_basis: this.legalBases.CONSENT,
        purpose: 'consent_management',
        timestamp: timestamp
      });
      
      console.log(`Privacy: Consent withdrawn for tenant ${tenantId}, user: ${hashedUserId}`);
      return { success: true, withdrawalRecord };
      
    } catch (error) {
      console.error('Privacy: Error withdrawing consent:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process data deletion request (Right to be Forgotten)
   */
  async processDataDeletionRequest(tenantId, userId, requestData = {}) {
    try {
      const timestamp = new Date().toISOString();
      const hashedUserId = this.hashUserId(userId);
      const deletionId = crypto.randomUUID();
      
      const deletionRequest = {
        deletion_id: deletionId,
        tenant_id: tenantId,
        user_id: hashedUserId,
        request_type: requestData.type || 'full_deletion',
        requested_at: timestamp,
        requester_method: requestData.method || 'api',
        verification_status: 'pending',
        processing_status: 'initiated',
        completion_deadline: this.calculateDeletionDeadline(timestamp),
        retention_exceptions: requestData.retentionExceptions || [],
        metadata: JSON.stringify(requestData.metadata || {})
      };
      
      // Store deletion request
      await this.storeDeletionRequest(tenantId, deletionRequest);
      
      // Add to processing queue
      this.deletionQueue.add(deletionId);
      
      // Start deletion process
      const deletionResult = await this.executeDeletion(tenantId, hashedUserId, deletionRequest);
      
      // Update request status
      deletionRequest.processing_status = deletionResult.success ? 'completed' : 'failed';
      deletionRequest.completed_at = new Date().toISOString();
      deletionRequest.deletion_summary = JSON.stringify(deletionResult.summary || {});
      
      await this.updateDeletionRequest(tenantId, deletionRequest);
      
      // Log the activity
      await this.logDataProcessing(tenantId, {
        activity_type: 'data_deletion_processed',
        user_id: hashedUserId,
        data_categories: Object.values(this.dataCategories),
        legal_basis: this.legalBases.LEGAL_OBLIGATION,
        purpose: 'gdpr_compliance',
        timestamp: timestamp
      });
      
      console.log(`Privacy: Data deletion processed for tenant ${tenantId}, deletion_id: ${deletionId}`);
      return { 
        success: true, 
        deletionId, 
        deletionRequest, 
        deletionResult 
      };
      
    } catch (error) {
      console.error('Privacy: Error processing data deletion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute actual data deletion across all systems
   */
  async executeDeletion(tenantId, hashedUserId, deletionRequest) {
    const summary = {
      sheets_deleted: 0,
      records_deleted: 0,
      tables_processed: [],
      errors: []
    };
    
    try {
      const doc = await getDoc();
      if (!doc) {
        throw new Error('Google Sheets not available for deletion');
      }
      
      // Define all sheet types that may contain user data
      const userDataSheets = [
        'AUDIENCE_SEEDS',
        'PIXELS_INGEST',
        'USER_SESSIONS',
        'CONSENT_RECORDS',
        'DATA_PROCESSING_LOGS',
        'OVERLAY_HISTORY'
      ];
      
      // Process each sheet type
      for (const sheetType of userDataSheets) {
        try {
          const sheetName = `${sheetType}_${tenantId}`;
          
          // Get appropriate headers for each sheet type
          const headers = this.getSheetHeaders(sheetType);
          const sheet = await ensureSheet(doc, sheetName, headers);
          
          if (sheet) {
            const rows = await sheet.getRows();
            let deletedCount = 0;
            
            // Filter out rows belonging to the user
            const remainingRows = [];
            for (const row of rows) {
              if (this.shouldDeleteRow(row, hashedUserId, sheetType)) {
                deletedCount++;
              } else {
                remainingRows.push(row);
              }
            }
            
            if (deletedCount > 0) {
              // Clear sheet and rewrite with remaining data
              await sheet.clearRows();
              await sheet.setHeaderRow(headers);
              
              // Re-add remaining rows
              for (const row of remainingRows) {
                const rowData = {};
                headers.forEach(header => {
                  rowData[header] = row[header] || '';
                });
                await sheet.addRow(rowData);
              }
              
              summary.records_deleted += deletedCount;
              summary.tables_processed.push({
                sheet: sheetName,
                records_deleted: deletedCount,
                records_remaining: remainingRows.length
              });
            }
          }
        } catch (error) {
          summary.errors.push({
            sheet: sheetType,
            error: error.message
          });
        }
      }
      
      // Pseudonymize remaining references (where legal retention is required)
      await this.pseudonymizeRetainedData(tenantId, hashedUserId);
      
      summary.sheets_deleted = summary.tables_processed.length;
      
      console.log(`Privacy: Deletion executed for ${tenantId}, deleted ${summary.records_deleted} records across ${summary.sheets_deleted} sheets`);
      return { success: true, summary };
      
    } catch (error) {
      console.error('Privacy: Error executing deletion:', error);
      summary.errors.push({ general: error.message });
      return { success: false, summary };
    }
  }

  /**
   * Export user data (Right to Data Portability)
   */
  async exportUserData(tenantId, userId, format = 'json') {
    try {
      const hashedUserId = this.hashUserId(userId);
      const exportId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const userDataExport = {
        export_id: exportId,
        tenant_id: tenantId,
        user_id: hashedUserId,
        export_format: format,
        requested_at: timestamp,
        data_categories: Object.values(this.dataCategories),
        data: {}
      };
      
      const doc = await getDoc();
      if (doc) {
        // Extract user data from various sheets
        const dataSheets = ['AUDIENCE_SEEDS', 'CONSENT_RECORDS', 'OVERLAY_HISTORY'];
        
        for (const sheetType of dataSheets) {
          try {
            const sheetName = `${sheetType}_${tenantId}`;
            const headers = this.getSheetHeaders(sheetType);
            const sheet = await ensureSheet(doc, sheetName, headers);
            
            if (sheet) {
              const rows = await sheet.getRows();
              const userData = rows.filter(row => 
                this.belongsToUser(row, hashedUserId, sheetType)
              ).map(row => {
                const data = {};
                headers.forEach(header => {
                  data[header] = row[header] || '';
                });
                return data;
              });
              
              if (userData.length > 0) {
                userDataExport.data[sheetType.toLowerCase()] = userData;
              }
            }
          } catch (error) {
            console.warn(`Privacy: Error exporting from ${sheetType}:`, error.message);
          }
        }
      }
      
      // Format the export
      let formattedExport;
      switch (format.toLowerCase()) {
        case 'csv':
          formattedExport = this.formatAsCSV(userDataExport.data);
          break;
        case 'xml':
          formattedExport = this.formatAsXML(userDataExport.data);
          break;
        default:
          formattedExport = JSON.stringify(userDataExport, null, 2);
      }
      
      // Log the export activity
      await this.logDataProcessing(tenantId, {
        activity_type: 'data_exported',
        user_id: hashedUserId,
        data_categories: Object.values(this.dataCategories),
        legal_basis: this.legalBases.LEGAL_OBLIGATION,
        purpose: 'gdpr_compliance',
        timestamp: timestamp
      });
      
      console.log(`Privacy: Data export completed for tenant ${tenantId}, export_id: ${exportId}`);
      return { 
        success: true, 
        exportId, 
        format, 
        data: formattedExport,
        metadata: {
          categories: Object.keys(userDataExport.data),
          record_count: Object.values(userDataExport.data).reduce((sum, arr) => sum + arr.length, 0),
          exported_at: timestamp
        }
      };
      
    } catch (error) {
      console.error('Privacy: Error exporting user data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get data processing activities log
   */
  async getProcessingLog(tenantId, filters = {}) {
    try {
      const doc = await getDoc();
      if (!doc) {
        return { success: false, error: 'Sheets not available' };
      }
      
      const sheet = await ensureSheet(doc, `DATA_PROCESSING_LOGS_${tenantId}`, [
        'activity_id', 'activity_type', 'user_id', 'data_categories', 
        'legal_basis', 'purpose', 'timestamp', 'metadata'
      ]);
      
      const rows = await sheet.getRows();
      let logs = rows.map(row => ({
        activity_id: row.activity_id,
        activity_type: row.activity_type,
        user_id: row.user_id,
        data_categories: row.data_categories ? row.data_categories.split(',') : [],
        legal_basis: row.legal_basis,
        purpose: row.purpose,
        timestamp: row.timestamp,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
      
      // Apply filters
      if (filters.user_id) {
        const hashedUserId = this.hashUserId(filters.user_id);
        logs = logs.filter(log => log.user_id === hashedUserId);
      }
      
      if (filters.activity_type) {
        logs = logs.filter(log => log.activity_type === filters.activity_type);
      }
      
      if (filters.from_date) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.from_date));
      }
      
      if (filters.to_date) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.to_date));
      }
      
      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return { 
        success: true, 
        logs: logs.slice(0, filters.limit || 100),
        total: logs.length 
      };
      
    } catch (error) {
      console.error('Privacy: Error getting processing log:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance(tenantId) {
    try {
      const now = new Date();
      const complianceReport = {
        tenant_id: tenantId,
        checked_at: now.toISOString(),
        violations: [],
        recommendations: [],
        summary: {
          total_records: 0,
          expired_records: 0,
          categories_checked: 0
        }
      };
      
      const doc = await getDoc();
      if (!doc) {
        throw new Error('Sheets not available for compliance check');
      }
      
      // Check each data category
      for (const [category, retentionDays] of Object.entries(this.retentionPeriods)) {
        const cutoffDate = new Date(now - (retentionDays * 24 * 60 * 60 * 1000));
        
        // Map category to sheet types
        const sheetTypes = this.getCategorySheetTypes(category);
        
        for (const sheetType of sheetTypes) {
          try {
            const sheetName = `${sheetType}_${tenantId}`;
            const headers = this.getSheetHeaders(sheetType);
            const sheet = await ensureSheet(doc, sheetName, headers);
            
            if (sheet) {
              const rows = await sheet.getRows();
              complianceReport.summary.total_records += rows.length;
              
              const expiredRows = rows.filter(row => {
                const rowDate = this.extractRowDate(row);
                return rowDate && rowDate < cutoffDate;
              });
              
              if (expiredRows.length > 0) {
                complianceReport.violations.push({
                  sheet: sheetName,
                  category: category,
                  retention_period_days: retentionDays,
                  expired_records: expiredRows.length,
                  oldest_record: Math.min(...expiredRows.map(row => 
                    this.extractRowDate(row).getTime()
                  )),
                  recommendation: `Delete ${expiredRows.length} expired records from ${sheetName}`
                });
                
                complianceReport.summary.expired_records += expiredRows.length;
              }
            }
          } catch (error) {
            complianceReport.violations.push({
              sheet: sheetType,
              category: category,
              error: error.message
            });
          }
        }
        
        complianceReport.summary.categories_checked++;
      }
      
      // Generate recommendations
      if (complianceReport.violations.length > 0) {
        complianceReport.recommendations.push(
          'Implement automated data retention cleanup',
          'Review data collection practices to minimize retention',
          'Update privacy policy to reflect actual retention periods'
        );
      }
      
      console.log(`Privacy: Retention compliance check completed for ${tenantId}, found ${complianceReport.violations.length} violations`);
      return { success: true, report: complianceReport };
      
    } catch (error) {
      console.error('Privacy: Error checking retention compliance:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Automated cleanup of expired data
   */
  async cleanupExpiredData(tenantId, dryRun = true) {
    try {
      const now = new Date();
      const cleanupReport = {
        tenant_id: tenantId,
        cleanup_at: now.toISOString(),
        dry_run: dryRun,
        cleaned_records: 0,
        cleaned_sheets: [],
        errors: []
      };
      
      const doc = await getDoc();
      if (!doc) {
        throw new Error('Sheets not available for cleanup');
      }
      
      // Process each data category
      for (const [category, retentionDays] of Object.entries(this.retentionPeriods)) {
        const cutoffDate = new Date(now - (retentionDays * 24 * 60 * 60 * 1000));
        const sheetTypes = this.getCategorySheetTypes(category);
        
        for (const sheetType of sheetTypes) {
          try {
            const sheetName = `${sheetType}_${tenantId}`;
            const headers = this.getSheetHeaders(sheetType);
            const sheet = await ensureSheet(doc, sheetName, headers);
            
            if (sheet) {
              const rows = await sheet.getRows();
              const validRows = [];
              let deletedCount = 0;
              
              for (const row of rows) {
                const rowDate = this.extractRowDate(row);
                if (!rowDate || rowDate >= cutoffDate) {
                  validRows.push(row);
                } else {
                  deletedCount++;
                }
              }
              
              if (deletedCount > 0 && !dryRun) {
                // Clear and rewrite with valid rows
                await sheet.clearRows();
                await sheet.setHeaderRow(headers);
                
                for (const row of validRows) {
                  const rowData = {};
                  headers.forEach(header => {
                    rowData[header] = row[header] || '';
                  });
                  await sheet.addRow(rowData);
                }
              }
              
              if (deletedCount > 0) {
                cleanupReport.cleaned_records += deletedCount;
                cleanupReport.cleaned_sheets.push({
                  sheet: sheetName,
                  category: category,
                  records_deleted: deletedCount,
                  records_remaining: validRows.length
                });
              }
            }
          } catch (error) {
            cleanupReport.errors.push({
              sheet: sheetType,
              category: category,
              error: error.message
            });
          }
        }
      }
      
      console.log(`Privacy: Cleanup ${dryRun ? 'simulation' : 'execution'} completed for ${tenantId}, ${cleanupReport.cleaned_records} records processed`);
      return { success: true, report: cleanupReport };
      
    } catch (error) {
      console.error('Privacy: Error during cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  
  hashUserId(userId) {
    return crypto.createHash('sha256').update(String(userId)).digest('hex').substring(0, 16);
  }
  
  hashIP(ipAddress) {
    if (!ipAddress) return 'unknown';
    return crypto.createHash('sha256').update(String(ipAddress)).digest('hex').substring(0, 12);
  }
  
  hashUserAgent(userAgent) {
    if (!userAgent) return 'unknown';
    return crypto.createHash('sha256').update(String(userAgent)).digest('hex').substring(0, 12);
  }
  
  calculateConsentExpiry(timestamp) {
    const expiry = new Date(timestamp);
    expiry.setFullYear(expiry.getFullYear() + 2); // 2 years default
    return expiry.toISOString();
  }
  
  calculateDeletionDeadline(timestamp) {
    const deadline = new Date(timestamp);
    deadline.setDate(deadline.getDate() + 30); // 30 days to process
    return deadline.toISOString();
  }
  
  getSheetHeaders(sheetType) {
    const headerMap = {
      'AUDIENCE_SEEDS': ['customer_id', 'email_hash', 'phone_hash', 'total_spent', 'order_count', 'last_order_at', 'top_category', 'last_product_ids_csv'],
      'CONSENT_RECORDS': ['consent_id', 'tenant_id', 'user_id', 'consent_type', 'purpose', 'legal_basis', 'consented', 'consent_method', 'ip_address', 'user_agent_hash', 'consent_version', 'timestamp', 'expires_at', 'metadata'],
      'CONSENT_WITHDRAWALS': ['consent_id', 'tenant_id', 'user_id', 'withdrawn', 'withdrawal_timestamp', 'withdrawal_reason', 'withdrawal_method'],
      'DATA_PROCESSING_LOGS': ['activity_id', 'activity_type', 'user_id', 'data_categories', 'legal_basis', 'purpose', 'timestamp', 'metadata'],
      'DATA_DELETION_REQUESTS': ['deletion_id', 'tenant_id', 'user_id', 'request_type', 'requested_at', 'requester_method', 'verification_status', 'processing_status', 'completion_deadline', 'completed_at', 'deletion_summary', 'retention_exceptions', 'metadata'],
      'PIXELS_INGEST': ['timestamp', 'tenant_id', 'user_id', 'event_type', 'event_data'],
      'OVERLAY_HISTORY': ['timestamp', 'action', 'selector', 'channel', 'fields_json']
    };
    
    return headerMap[sheetType] || ['timestamp', 'user_id', 'data'];
  }
  
  shouldDeleteRow(row, hashedUserId, sheetType) {
    // Define user identification patterns for different sheet types
    const userFields = ['user_id', 'customer_id', 'email_hash'];
    
    for (const field of userFields) {
      if (row[field] === hashedUserId) {
        return true;
      }
    }
    
    return false;
  }
  
  belongsToUser(row, hashedUserId, sheetType) {
    return this.shouldDeleteRow(row, hashedUserId, sheetType);
  }
  
  extractRowDate(row) {
    const dateFields = ['timestamp', 'created_at', 'updated_at', 'last_order_at'];
    
    for (const field of dateFields) {
      if (row[field]) {
        const date = new Date(row[field]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return null;
  }
  
  getCategorySheetTypes(category) {
    const categoryMap = {
      'user_data': ['AUDIENCE_SEEDS', 'PIXELS_INGEST'],
      'analytics_data': ['METRICS', 'SEARCH_TERMS'],
      'marketing_data': ['OVERLAY_HISTORY'],
      'logs': ['RUN_LOGS', 'DATA_PROCESSING_LOGS'],
      'consent_records': ['CONSENT_RECORDS', 'CONSENT_WITHDRAWALS'],
      'financial_data': ['BILLING_RECORDS']
    };
    
    return categoryMap[category] || [];
  }
  
  async storeConsentRecord(tenantId, record) {
    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, `CONSENT_RECORDS_${tenantId}`, this.getSheetHeaders('CONSENT_RECORDS'));
        await sheet.addRow(record);
      }
    } catch (error) {
      console.error('Privacy: Error storing consent record:', error);
    }
  }
  
  async storeConsentWithdrawal(tenantId, record) {
    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, `CONSENT_WITHDRAWALS_${tenantId}`, this.getSheetHeaders('CONSENT_WITHDRAWALS'));
        await sheet.addRow(record);
      }
    } catch (error) {
      console.error('Privacy: Error storing consent withdrawal:', error);
    }
  }
  
  async logDataProcessing(tenantId, activity) {
    try {
      const activityId = crypto.randomUUID();
      const record = {
        activity_id: activityId,
        activity_type: activity.activity_type,
        user_id: activity.user_id,
        data_categories: Array.isArray(activity.data_categories) ? activity.data_categories.join(',') : activity.data_categories,
        legal_basis: activity.legal_basis,
        purpose: activity.purpose,
        timestamp: activity.timestamp,
        metadata: JSON.stringify(activity.metadata || {})
      };
      
      // Store in memory cache
      this.dataProcessingLogs.set(activityId, record);
      
      // Store in persistent storage
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, `DATA_PROCESSING_LOGS_${tenantId}`, this.getSheetHeaders('DATA_PROCESSING_LOGS'));
        await sheet.addRow(record);
      }
    } catch (error) {
      console.error('Privacy: Error logging data processing:', error);
    }
  }
  
  async storeDeletionRequest(tenantId, record) {
    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, `DATA_DELETION_REQUESTS_${tenantId}`, this.getSheetHeaders('DATA_DELETION_REQUESTS'));
        await sheet.addRow(record);
      }
    } catch (error) {
      console.error('Privacy: Error storing deletion request:', error);
    }
  }
  
  async updateDeletionRequest(tenantId, record) {
    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = await ensureSheet(doc, `DATA_DELETION_REQUESTS_${tenantId}`, this.getSheetHeaders('DATA_DELETION_REQUESTS'));
        const rows = await sheet.getRows();
        
        const existingRow = rows.find(row => row.deletion_id === record.deletion_id);
        if (existingRow) {
          Object.assign(existingRow, record);
          await existingRow.save();
        }
      }
    } catch (error) {
      console.error('Privacy: Error updating deletion request:', error);
    }
  }
  
  async triggerDataDeletion(tenantId, hashedUserId, reason) {
    // Add to deletion queue for background processing
    this.deletionQueue.add(`${tenantId}:${hashedUserId}:${reason}`);
  }
  
  async pseudonymizeRetainedData(tenantId, hashedUserId) {
    // Replace identifiable data with pseudonymized versions where legal retention is required
    const pseudonym = `PSEUDO_${crypto.randomUUID().substring(0, 8)}`;
    
    try {
      const doc = await getDoc();
      if (doc) {
        // Pseudonymize financial records (must be retained for 7 years)
        const financialSheets = ['BILLING_RECORDS', 'PAYMENT_HISTORY'];
        
        for (const sheetType of financialSheets) {
          try {
            const sheetName = `${sheetType}_${tenantId}`;
            const headers = this.getSheetHeaders(sheetType);
            const sheet = await ensureSheet(doc, sheetName, headers);
            
            if (sheet) {
              const rows = await sheet.getRows();
              
              for (const row of rows) {
                if (this.belongsToUser(row, hashedUserId, sheetType)) {
                  // Replace identifiable fields with pseudonym
                  if (row.user_id) row.user_id = pseudonym;
                  if (row.customer_id) row.customer_id = pseudonym;
                  if (row.email_hash) row.email_hash = 'PSEUDONYMIZED';
                  
                  await row.save();
                }
              }
            }
          } catch (error) {
            console.warn(`Privacy: Error pseudonymizing ${sheetType}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Privacy: Error during pseudonymization:', error);
    }
  }
  
  formatAsCSV(data) {
    const csvParts = [];
    
    for (const [category, records] of Object.entries(data)) {
      if (records.length > 0) {
        csvParts.push(`\n### ${category.toUpperCase()} ###`);
        
        const headers = Object.keys(records[0]);
        csvParts.push(headers.join(','));
        
        records.forEach(record => {
          const values = headers.map(header => {
            const value = record[header] || '';
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          });
          csvParts.push(values.join(','));
        });
      }
    }
    
    return csvParts.join('\n');
  }
  
  formatAsXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<user_data_export>\n';
    
    for (const [category, records] of Object.entries(data)) {
      xml += `  <${category}>\n`;
      
      records.forEach(record => {
        xml += '    <record>\n';
        Object.entries(record).forEach(([key, value]) => {
          xml += `      <${key}>${this.escapeXML(value)}</${key}>\n`;
        });
        xml += '    </record>\n';
      });
      
      xml += `  </${category}>\n`;
    }
    
    xml += '</user_data_export>';
    return xml;
  }
  
  escapeXML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  
  startCleanupTimer() {
    // Run automated cleanup every 24 hours
    setInterval(async () => {
      try {
        console.log('Privacy: Starting automated data retention cleanup...');
        // This would need to be implemented for all tenants
        // For now, it's a placeholder for the automated cleanup logic
      } catch (error) {
        console.error('Privacy: Error in automated cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

// Singleton instance
const privacyService = new PrivacyService();

export default privacyService;
export { PrivacyService };