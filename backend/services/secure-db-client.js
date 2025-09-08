/**
 * SECURE DATABASE CLIENT WRAPPER
 * Enforces tenant isolation and security policies for all database operations
 * 
 * SECURITY FEATURES:
 * - Mandatory tenant context validation
 * - Automatic RLS policy enforcement
 * - Query monitoring and logging
 * - SQL injection prevention
 * - Cross-tenant access prevention
 * - Audit trail for all operations
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';
import securityMonitor from './security-monitor.js';

class SecureDBClient {
  constructor() {
    this.currentTenant = null;
    this.sessionContext = new Map();
    
    // List of tables that require tenant context
    this.tenantSpecificTables = [
      'tenant_configs', 'tenant_metrics', 'search_terms', 'run_logs',
      'tenant_subscriptions', 'campaign_configs', 'rsa_assets',
      'support_tickets', 'support_ticket_messages', 'custom_dashboards',
      'dashboard_widgets', 'custom_kpis', 'dashboard_access_logs',
      'automation_rules', 'custom_bid_strategies', 'automation_execution_logs',
      'advanced_reports', 'scheduled_reports'
    ];
  }

  /**
   * MANDATORY: Set tenant context before any database operations
   * This enforces RLS policies and prevents cross-tenant access
   */
  async setTenantContext(tenantId, options = {}) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('SECURITY ERROR: Invalid tenant ID provided');
    }

    // Validate tenant ID format to prevent injection
    if (!this.isValidTenantId(tenantId)) {
      throw new Error('SECURITY ERROR: Malformed tenant ID detected');
    }

    try {
      // Set Supabase session context for RLS
      const { error } = await supabase.rpc('set_config', {
        parameter: 'app.current_tenant_id',
        value: tenantId
      });

      if (error) {
        throw new Error(`Failed to set tenant context: ${error.message}`);
      }

      // Update internal state
      this.currentTenant = tenantId;
      this.sessionContext.set('tenant_id', tenantId);
      this.sessionContext.set('context_set_at', new Date());

      // Log security event
      await securityMonitor.monitorQuery(
        tenantId,
        `SET app.current_tenant_id = '${tenantId}'`,
        'session_context',
        'SET_CONTEXT'
      );

      console.log(`✅ Tenant context set successfully: ${tenantId}`);
      return true;

    } catch (error) {
      console.error('🚨 CRITICAL: Failed to set tenant context:', error.message);
      
      // Log critical security event
      await securityMonitor.monitorQuery(
        tenantId,
        `FAILED: SET app.current_tenant_id = '${tenantId}' - ${error.message}`,
        'session_context',
        'SET_CONTEXT_FAILED'
      );

      throw error;
    }
  }

  /**
   * Validate tenant context is set before any operation
   */
  validateTenantContext(requiredTenant = null) {
    if (!this.currentTenant) {
      throw new Error('SECURITY ERROR: No tenant context set - call setTenantContext() first');
    }

    if (requiredTenant && this.currentTenant !== requiredTenant) {
      throw new Error(`SECURITY ERROR: Tenant context mismatch - expected ${requiredTenant}, got ${this.currentTenant}`);
    }

    // Check if context is stale (older than 1 hour)
    const contextAge = Date.now() - this.sessionContext.get('context_set_at');
    if (contextAge > 60 * 60 * 1000) {
      throw new Error('SECURITY ERROR: Tenant context is stale - please refresh context');
    }

    return true;
  }

  /**
   * Secure SELECT operation with mandatory tenant validation
   */
  async select(tableName, columns = '*', conditions = {}) {
    this.validateTenantContext();
    
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('SECURITY ERROR: Invalid table name');
    }

    // Check if table requires tenant context
    if (this.tenantSpecificTables.includes(tableName)) {
      // Ensure tenant condition is included
      if (!conditions.tenant_id && !conditions.eq?.tenant_id) {
        conditions = { ...conditions, tenant_id: this.currentTenant };
      }

      // Validate that tenant_id matches current context
      const requestedTenant = conditions.tenant_id || conditions.eq?.tenant_id;
      if (requestedTenant !== this.currentTenant) {
        throw new Error(`SECURITY ERROR: Attempted to access tenant ${requestedTenant} while context is ${this.currentTenant}`);
      }
    }

    try {
      let query = supabase.from(tableName).select(columns);
      
      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        if (key !== 'tenant_id') { // tenant_id handled above
          query = query.eq(key, value);
        }
      });

      // Execute query
      const { data, error } = await query;

      // Monitor the query
      await securityMonitor.monitorQuery(
        this.currentTenant,
        { table: tableName, columns, conditions },
        tableName,
        'SELECT'
      );

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      // Validate returned data doesn't contain other tenants' data
      if (data && Array.isArray(data) && this.tenantSpecificTables.includes(tableName)) {
        const foreignTenantData = data.filter(row => 
          row.tenant_id && row.tenant_id !== this.currentTenant
        );

        if (foreignTenantData.length > 0) {
          // CRITICAL SECURITY BREACH DETECTED
          console.error('🚨 CRITICAL SECURITY BREACH: Cross-tenant data returned');
          console.error('Foreign tenant data:', foreignTenantData);
          
          await securityMonitor.monitorQuery(
            this.currentTenant,
            `SECURITY BREACH: Returned data for tenants: ${foreignTenantData.map(r => r.tenant_id).join(', ')}`,
            tableName,
            'SECURITY_BREACH'
          );

          throw new Error('SECURITY BREACH: Cross-tenant data detected in results');
        }
      }

      return data;

    } catch (error) {
      console.error(`🚨 Secure SELECT failed for ${tableName}:`, error.message);
      
      await securityMonitor.monitorQuery(
        this.currentTenant,
        `FAILED SELECT: ${tableName} - ${error.message}`,
        tableName,
        'SELECT_FAILED'
      );

      throw error;
    }
  }

  /**
   * Secure INSERT operation with tenant validation
   */
  async insert(tableName, data) {
    this.validateTenantContext();

    if (!tableName || !data) {
      throw new Error('SECURITY ERROR: Invalid table name or data');
    }

    // Ensure tenant_id is set for tenant-specific tables
    if (this.tenantSpecificTables.includes(tableName)) {
      if (Array.isArray(data)) {
        data = data.map(row => ({ ...row, tenant_id: this.currentTenant }));
      } else {
        data = { ...data, tenant_id: this.currentTenant };
      }
    }

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select();

      // Monitor the query
      await securityMonitor.monitorQuery(
        this.currentTenant,
        { table: tableName, operation: 'INSERT', recordCount: Array.isArray(data) ? data.length : 1 },
        tableName,
        'INSERT'
      );

      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }

      return result;

    } catch (error) {
      console.error(`🚨 Secure INSERT failed for ${tableName}:`, error.message);
      
      await securityMonitor.monitorQuery(
        this.currentTenant,
        `FAILED INSERT: ${tableName} - ${error.message}`,
        tableName,
        'INSERT_FAILED'
      );

      throw error;
    }
  }

  /**
   * Secure UPDATE operation with tenant validation
   */
  async update(tableName, updates, conditions = {}) {
    this.validateTenantContext();

    if (!tableName || !updates) {
      throw new Error('SECURITY ERROR: Invalid table name or update data');
    }

    // For tenant-specific tables, ensure we only update current tenant's data
    if (this.tenantSpecificTables.includes(tableName)) {
      conditions = { ...conditions, tenant_id: this.currentTenant };
    }

    try {
      let query = supabase.from(tableName).update(updates);

      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.select();

      // Monitor the query
      await securityMonitor.monitorQuery(
        this.currentTenant,
        { table: tableName, operation: 'UPDATE', conditions, updateCount: data?.length || 0 },
        tableName,
        'UPDATE'
      );

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error(`🚨 Secure UPDATE failed for ${tableName}:`, error.message);
      
      await securityMonitor.monitorQuery(
        this.currentTenant,
        `FAILED UPDATE: ${tableName} - ${error.message}`,
        tableName,
        'UPDATE_FAILED'
      );

      throw error;
    }
  }

  /**
   * Secure DELETE operation with tenant validation
   */
  async delete(tableName, conditions = {}) {
    this.validateTenantContext();

    if (!tableName) {
      throw new Error('SECURITY ERROR: Invalid table name');
    }

    // CRITICAL: Prevent accidental deletion of all data
    if (Object.keys(conditions).length === 0) {
      throw new Error('SECURITY ERROR: DELETE without conditions not allowed');
    }

    // For tenant-specific tables, ensure we only delete current tenant's data
    if (this.tenantSpecificTables.includes(tableName)) {
      conditions = { ...conditions, tenant_id: this.currentTenant };
    }

    try {
      let query = supabase.from(tableName).delete();

      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.select();

      // Monitor the query
      await securityMonitor.monitorQuery(
        this.currentTenant,
        { table: tableName, operation: 'DELETE', conditions, deleteCount: data?.length || 0 },
        tableName,
        'DELETE'
      );

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error(`🚨 Secure DELETE failed for ${tableName}:`, error.message);
      
      await securityMonitor.monitorQuery(
        this.currentTenant,
        `FAILED DELETE: ${tableName} - ${error.message}`,
        tableName,
        'DELETE_FAILED'
      );

      throw error;
    }
  }

  /**
   * Secure UPSERT operation with tenant validation
   */
  async upsert(tableName, data, options = {}) {
    this.validateTenantContext();

    if (!tableName || !data) {
      throw new Error('SECURITY ERROR: Invalid table name or data');
    }

    // Ensure tenant_id is set for tenant-specific tables
    if (this.tenantSpecificTables.includes(tableName)) {
      if (Array.isArray(data)) {
        data = data.map(row => ({ ...row, tenant_id: this.currentTenant }));
      } else {
        data = { ...data, tenant_id: this.currentTenant };
      }
    }

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .upsert(data, options)
        .select();

      // Monitor the query
      await securityMonitor.monitorQuery(
        this.currentTenant,
        { table: tableName, operation: 'UPSERT', recordCount: Array.isArray(data) ? data.length : 1 },
        tableName,
        'UPSERT'
      );

      if (error) {
        throw new Error(`Upsert failed: ${error.message}`);
      }

      return result;

    } catch (error) {
      console.error(`🚨 Secure UPSERT failed for ${tableName}:`, error.message);
      
      await securityMonitor.monitorQuery(
        this.currentTenant,
        `FAILED UPSERT: ${tableName} - ${error.message}`,
        tableName,
        'UPSERT_FAILED'
      );

      throw error;
    }
  }

  /**
   * Validate tenant ID format to prevent injection
   */
  isValidTenantId(tenantId) {
    // Tenant ID should be alphanumeric with hyphens/underscores only
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    
    // Check length (reasonable limit)
    if (tenantId.length > 100) {
      return false;
    }

    // Check for SQL injection patterns
    const maliciousPatterns = [
      "'", '"', ';', '--', '/*', '*/', '\\', 'DROP', 'DELETE', 'UPDATE', 'INSERT',
      'UNION', 'SELECT', '=', '<', '>', 'OR', 'AND'
    ];

    const upperTenantId = tenantId.toUpperCase();
    for (const pattern of maliciousPatterns) {
      if (upperTenantId.includes(pattern)) {
        return false;
      }
    }

    return validPattern.test(tenantId);
  }

  /**
   * Clear tenant context (for session cleanup)
   */
  async clearTenantContext() {
    try {
      await supabase.rpc('set_config', {
        parameter: 'app.current_tenant_id',
        value: null
      });

      this.currentTenant = null;
      this.sessionContext.clear();

      console.log('✅ Tenant context cleared successfully');

    } catch (error) {
      console.error('⚠️ Failed to clear tenant context:', error.message);
      throw error;
    }
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant() {
    return this.currentTenant;
  }

  /**
   * Check if client is properly configured
   */
  isConfigured() {
    return isSupabaseEnabled();
  }
}

// Create singleton instance
const secureDB = new SecureDBClient();

export default secureDB;
export { SecureDBClient };