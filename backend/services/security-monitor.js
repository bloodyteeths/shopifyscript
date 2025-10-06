/**
 * SECURITY MONITORING AND ALERTING SYSTEM
 * Real-time monitoring for tenant isolation breaches and security anomalies
 * 
 * Features:
 * - Real-time query monitoring
 * - Tenant isolation breach detection  
 * - Anomaly detection for unusual access patterns
 * - Security event logging and alerting
 * - Incident response automation
 */

import { supabase, isSupabaseEnabled } from './supabase-client.js';
import { createTransport } from 'nodemailer';

class SecurityMonitor {
  constructor() {
    this.alertThresholds = {
      crossTenantAccess: 1, // Alert on any cross-tenant access
      failedQueries: 10,    // Alert after 10 failed queries in 5 minutes
      unusualVolumeMultiplier: 3, // Alert if query volume 3x normal
      suspiciousPatterns: 1, // Alert on any suspicious pattern
    };
    
    this.recentEvents = new Map(); // Store recent security events
    this.alertCooldown = new Map(); // Prevent alert spam
    
    // Email configuration for alerts
    this.mailer = createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SECURITY_ALERT_EMAIL,
        pass: process.env.SECURITY_ALERT_PASSWORD
      }
    });
  }

  /**
   * Monitor database query for security violations
   */
  async monitorQuery(tenant, query, tableName, operation = 'SELECT') {
    const timestamp = new Date();
    const eventId = `${tenant}-${tableName}-${timestamp.getTime()}`;
    
    try {
      // Log the security event
      const securityEvent = {
        event_id: eventId,
        tenant_id: tenant,
        table_name: tableName,
        operation: operation,
        query_text: typeof query === 'string' ? query : JSON.stringify(query),
        timestamp: timestamp,
        ip_address: this.getCurrentIP(),
        user_agent: this.getCurrentUserAgent(),
        risk_level: 'LOW'
      };

      // Check for security violations
      await this.checkTenantIsolationBreach(securityEvent);
      await this.checkSuspiciousPatterns(securityEvent);
      await this.checkQueryAnomaly(securityEvent);
      
      // Store security event
      await this.logSecurityEvent(securityEvent);
      
      // Trigger alerts if necessary
      if (securityEvent.risk_level === 'CRITICAL' || securityEvent.risk_level === 'HIGH') {
        await this.triggerSecurityAlert(securityEvent);
      }

      return securityEvent;

    } catch (error) {
      console.error('Security monitoring error:', error.message);
      
      // Log monitoring failure as security event
      await this.logSecurityEvent({
        event_id: `monitor-error-${timestamp.getTime()}`,
        tenant_id: tenant,
        table_name: 'security_monitor',
        operation: 'MONITOR',
        query_text: `Security monitoring failed: ${error.message}`,
        timestamp: timestamp,
        risk_level: 'HIGH',
        is_monitoring_failure: true
      });
    }
  }

  /**
   * Check for tenant isolation breaches
   */
  async checkTenantIsolationBreach(event) {
    // Check if query attempts to access data for different tenant
    const suspiciousTenantAccess = [
      'WHERE tenant_id !=',
      'WHERE tenant_id <>', 
      'IN (SELECT DISTINCT tenant_id',
      'NOT EXISTS (SELECT 1 FROM',
      'tenant_id IS NULL'
    ];

    const queryText = event.query_text.toLowerCase();
    
    for (const pattern of suspiciousTenantAccess) {
      if (queryText.includes(pattern.toLowerCase())) {
        event.risk_level = 'CRITICAL';
        event.threat_type = 'TENANT_ISOLATION_BREACH';
        event.threat_description = `Suspicious tenant isolation pattern detected: ${pattern}`;
        
        console.error(`🚨 CRITICAL SECURITY ALERT: Tenant isolation breach detected`);
        console.error(`   Tenant: ${event.tenant_id}`);  
        console.error(`   Pattern: ${pattern}`);
        console.error(`   Query: ${event.query_text}`);
        
        break;
      }
    }

    // Check for queries without proper tenant context
    if (event.table_name && this.isTenantSpecificTable(event.table_name)) {
      if (!queryText.includes('app.current_tenant_id') && 
          !queryText.includes(`tenant_id = '${event.tenant_id}'`)) {
        
        event.risk_level = 'HIGH';
        event.threat_type = 'MISSING_TENANT_CONTEXT';
        event.threat_description = 'Query on tenant table without proper tenant context';
        
        console.warn(`⚠️ HIGH SECURITY RISK: Missing tenant context`);
        console.warn(`   Tenant: ${event.tenant_id}`);
        console.warn(`   Table: ${event.table_name}`);
      }
    }
  }

  /**
   * Check for suspicious query patterns
   */
  async checkSuspiciousPatterns(event) {
    const maliciousPatterns = [
      'DROP TABLE',
      'ALTER TABLE', 
      'TRUNCATE',
      'DELETE FROM tenant_',
      'UPDATE tenant_subscriptions SET tier',
      'INSERT INTO tenant_subscriptions',
      '; DROP',
      '-- ',
      '/*',
      'UNION SELECT',
      'OR 1=1',
      'AND 1=1',
      'SELECT * FROM information_schema',
      'SELECT * FROM pg_',
      'COPY (',
      '\\x'
    ];

    const queryText = event.query_text.toLowerCase();
    
    for (const pattern of maliciousPatterns) {
      if (queryText.includes(pattern.toLowerCase())) {
        event.risk_level = 'CRITICAL';
        event.threat_type = 'SQL_INJECTION_ATTEMPT';
        event.threat_description = `Malicious SQL pattern detected: ${pattern}`;
        
        console.error(`🚨 CRITICAL SECURITY ALERT: SQL injection attempt detected`);
        console.error(`   Tenant: ${event.tenant_id}`);
        console.error(`   Pattern: ${pattern}`);
        console.error(`   Query: ${event.query_text}`);
        
        break;
      }
    }

    // Check for unusually large queries (potential data exfiltration)
    if (event.query_text.length > 10000) {
      event.risk_level = 'HIGH';
      event.threat_type = 'LARGE_QUERY_ANOMALY';
      event.threat_description = `Unusually large query detected (${event.query_text.length} characters)`;
    }
  }

  /**
   * Check for query volume anomalies
   */
  async checkQueryAnomaly(event) {
    const key = `${event.tenant_id}-${event.table_name}`;
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    // Get recent events for this tenant-table combination
    if (!this.recentEvents.has(key)) {
      this.recentEvents.set(key, []);
    }

    const events = this.recentEvents.get(key);
    
    // Remove old events outside time window
    const recentEvents = events.filter(e => (now - e.timestamp) < timeWindow);
    this.recentEvents.set(key, recentEvents);

    // Add current event
    recentEvents.push({ timestamp: now, operation: event.operation });

    // Check for unusual volume
    const currentVolume = recentEvents.length;
    const avgVolume = await this.getAverageQueryVolume(event.tenant_id, event.table_name);
    
    if (currentVolume > (avgVolume * this.alertThresholds.unusualVolumeMultiplier)) {
      event.risk_level = event.risk_level === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
      event.anomaly_type = 'UNUSUAL_VOLUME';
      event.anomaly_description = `Query volume ${currentVolume} exceeds normal volume ${avgVolume} by ${this.alertThresholds.unusualVolumeMultiplier}x`;
      
      console.warn(`⚠️ ANOMALY DETECTED: Unusual query volume`);
      console.warn(`   Tenant: ${event.tenant_id}, Table: ${event.table_name}`);
      console.warn(`   Current: ${currentVolume}, Average: ${avgVolume}`);
    }
  }

  /**
   * Log security event to database
   */
  async logSecurityEvent(event) {
    if (!isSupabaseEnabled()) return;

    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_id: event.event_id,
          tenant_id: event.tenant_id,
          event_type: 'DATABASE_QUERY',
          risk_level: event.risk_level,
          threat_type: event.threat_type || null,
          threat_description: event.threat_description || null,
          anomaly_type: event.anomaly_type || null,
          anomaly_description: event.anomaly_description || null,
          table_name: event.table_name,
          operation: event.operation,
          query_text: event.query_text,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          timestamp: event.timestamp,
          is_monitoring_failure: event.is_monitoring_failure || false,
          metadata: JSON.stringify({
            original_event: event
          })
        });

      if (error) {
        console.error('Failed to log security event:', error.message);
      }

    } catch (error) {
      console.error('Security event logging error:', error.message);
    }
  }

  /**
   * Trigger security alert
   */
  async triggerSecurityAlert(event) {
    const alertKey = `${event.threat_type || event.anomaly_type}-${event.tenant_id}`;
    const cooldownPeriod = 15 * 60 * 1000; // 15 minutes
    
    // Check alert cooldown to prevent spam
    if (this.alertCooldown.has(alertKey)) {
      const lastAlert = this.alertCooldown.get(alertKey);
      if ((Date.now() - lastAlert) < cooldownPeriod) {
        return; // Skip alert due to cooldown
      }
    }

    console.error(`🚨 TRIGGERING SECURITY ALERT: ${event.risk_level}`);
    console.error(`   Event: ${event.threat_type || event.anomaly_type}`);
    console.error(`   Tenant: ${event.tenant_id}`);
    console.error(`   Description: ${event.threat_description || event.anomaly_description}`);

    // Set cooldown
    this.alertCooldown.set(alertKey, Date.now());

    // Send email alert (if configured)
    if (process.env.SECURITY_ALERT_EMAIL) {
      await this.sendEmailAlert(event);
    }

    // Log to external security service (if configured)
    await this.logToExternalSecurityService(event);
    
    // Trigger webhook alerts (if configured)
    if (process.env.SECURITY_WEBHOOK_URL) {
      await this.triggerWebhookAlert(event);
    }
  }

  /**
   * Send email security alert
   */
  async sendEmailAlert(event) {
    try {
      const subject = `🚨 Ads Autopilot AI Security Alert: ${event.risk_level} - ${event.threat_type || event.anomaly_type}`;
      
      const html = `
        <h2>Security Alert - Ads Autopilot AI Database</h2>
        <p><strong>Risk Level:</strong> <span style="color: ${event.risk_level === 'CRITICAL' ? 'red' : 'orange'}">${event.risk_level}</span></p>
        <p><strong>Tenant:</strong> ${event.tenant_id}</p>
        <p><strong>Threat Type:</strong> ${event.threat_type || event.anomaly_type}</p>
        <p><strong>Description:</strong> ${event.threat_description || event.anomaly_description}</p>
        <p><strong>Table:</strong> ${event.table_name}</p>
        <p><strong>Operation:</strong> ${event.operation}</p>
        <p><strong>Timestamp:</strong> ${event.timestamp}</p>
        <p><strong>IP Address:</strong> ${event.ip_address}</p>
        
        <h3>Query Details:</h3>
        <pre style="background: #f5f5f5; padding: 10px; max-width: 100%; overflow: auto;">
${event.query_text}
        </pre>
        
        <p><strong>Immediate Actions Required:</strong></p>
        <ul>
          <li>Investigate tenant access patterns</li>
          <li>Review query legitimacy</li>
          <li>Check for data breach indicators</li>
          <li>Validate tenant isolation</li>
          ${event.risk_level === 'CRITICAL' ? '<li style="color: red;">CONSIDER IMMEDIATE TENANT SUSPENSION</li>' : ''}
        </ul>
      `;

      await this.mailer.sendMail({
        from: process.env.SECURITY_ALERT_EMAIL,
        to: process.env.SECURITY_TEAM_EMAIL || process.env.SECURITY_ALERT_EMAIL,
        subject: subject,
        html: html
      });

      console.log('✅ Security alert email sent successfully');

    } catch (error) {
      console.error('Failed to send security alert email:', error.message);
    }
  }

  /**
   * Trigger webhook alert
   */
  async triggerWebhookAlert(event) {
    try {
      const payload = {
        alert_type: 'database_security',
        risk_level: event.risk_level,
        tenant_id: event.tenant_id,
        threat_type: event.threat_type || event.anomaly_type,
        description: event.threat_description || event.anomaly_description,
        timestamp: event.timestamp,
        metadata: event
      };

      const response = await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log('✅ Security webhook alert sent successfully');

    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  /**
   * Log to external security service
   */
  async logToExternalSecurityService(event) {
    // Placeholder for integration with services like:
    // - Datadog Security Monitoring
    // - AWS GuardDuty
    // - Azure Security Center
    // - Custom SIEM systems
    
    console.log('📝 Security event logged to external service (placeholder)');
  }

  /**
   * Check if table contains tenant-specific data
   */
  isTenantSpecificTable(tableName) {
    const tenantTables = [
      'tenant_configs', 'tenant_metrics', 'search_terms', 'run_logs',
      'tenant_subscriptions', 'campaign_configs', 'rsa_assets',
      'support_tickets', 'support_ticket_messages', 'custom_dashboards',
      'dashboard_widgets', 'custom_kpis', 'dashboard_access_logs',
      'automation_rules', 'custom_bid_strategies', 'automation_execution_logs'
    ];
    
    return tenantTables.includes(tableName);
  }

  /**
   * Get average query volume for anomaly detection
   */
  async getAverageQueryVolume(tenantId, tableName) {
    // Placeholder - would calculate from historical data
    // For now, return a baseline of 10 queries per 5-minute window
    return 10;
  }

  /**
   * Get current IP address (from request context)
   */
  getCurrentIP() {
    // Placeholder - would extract from current request
    return 'unknown';
  }

  /**
   * Get current user agent (from request context)
   */
  getCurrentUserAgent() {
    // Placeholder - would extract from current request
    return 'unknown';
  }

  /**
   * Create security events table if it doesn't exist
   */
  async createSecurityEventsTable() {
    if (!isSupabaseEnabled()) return;

    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(100) NOT NULL UNIQUE,
          tenant_id VARCHAR(100),
          event_type VARCHAR(50) NOT NULL,
          risk_level VARCHAR(20) NOT NULL,
          threat_type VARCHAR(100),
          threat_description TEXT,
          anomaly_type VARCHAR(100),
          anomaly_description TEXT,
          table_name VARCHAR(100),
          operation VARCHAR(20),
          query_text TEXT,
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          is_monitoring_failure BOOLEAN DEFAULT FALSE,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_security_events_risk_level ON security_events(risk_level);
        CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_security_events_threat_type ON security_events(threat_type);
      `;

      await supabase.rpc('exec_sql', { sql: createTableSQL });
      console.log('✅ Security events table created/verified');

    } catch (error) {
      console.error('Failed to create security events table:', error.message);
    }
  }
}

// Create global security monitor instance
const securityMonitor = new SecurityMonitor();

// Initialize security monitoring
securityMonitor.createSecurityEventsTable();

export default securityMonitor;
export { SecurityMonitor };