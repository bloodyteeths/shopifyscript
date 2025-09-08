-- ProofKit Security Enhancements Migration
-- Version: 005 - Critical Security Improvements
-- Description: Adds security monitoring tables and enhances RLS policies

-- Security Events Table for monitoring and alerting
CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL UNIQUE,
  tenant_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  threat_type VARCHAR(100),
  threat_description TEXT,
  anomaly_type VARCHAR(100),
  anomaly_description TEXT,
  table_name VARCHAR(100),
  operation VARCHAR(20) CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UPSERT', 'SET_CONTEXT', 'MONITOR')),
  query_text TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  is_monitoring_failure BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for security events performance
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_risk_level ON security_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_threat_type ON security_events(threat_type);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);

-- Security Audit Log Table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  session_id VARCHAR(100),
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  action_description TEXT,
  ip_address INET,
  user_agent TEXT,
  request_headers JSONB DEFAULT '{}',
  request_body JSONB DEFAULT '{}',
  response_status INTEGER,
  response_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER,
  is_successful BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  security_flags JSONB DEFAULT '{}' -- For marking suspicious activities
);

-- Indexes for audit log performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_tenant_id ON security_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_timestamp ON security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action_type ON security_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_is_successful ON security_audit_log(is_successful);

-- Security Configuration Table for dynamic security settings
CREATE TABLE IF NOT EXISTS security_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Security Settings Table
CREATE TABLE IF NOT EXISTS tenant_security_settings (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  
  -- Access control settings
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
  require_2fa BOOLEAN DEFAULT FALSE,
  allowed_ip_ranges JSONB DEFAULT '[]', -- Array of CIDR ranges
  blocked_ip_addresses JSONB DEFAULT '[]',
  
  -- Rate limiting
  api_rate_limit_per_minute INTEGER DEFAULT 1000,
  query_rate_limit_per_minute INTEGER DEFAULT 500,
  
  -- Security policies
  password_policy JSONB DEFAULT '{"min_length": 8, "require_special_chars": true}',
  data_retention_days INTEGER DEFAULT 365,
  audit_retention_days INTEGER DEFAULT 2555, -- 7 years
  
  -- Alert thresholds
  failed_login_threshold INTEGER DEFAULT 5,
  suspicious_query_threshold INTEGER DEFAULT 10,
  cross_tenant_access_alerts BOOLEAN DEFAULT TRUE,
  
  -- Compliance settings
  gdpr_enabled BOOLEAN DEFAULT FALSE,
  ccpa_enabled BOOLEAN DEFAULT FALSE,
  audit_level VARCHAR(20) DEFAULT 'STANDARD' CHECK (audit_level IN ('BASIC', 'STANDARD', 'DETAILED')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reference tenant subscriptions for tier-based security
  FOREIGN KEY (tenant_id) REFERENCES tenant_subscriptions(tenant_id) ON DELETE CASCADE
);

-- Indexes for tenant security settings
CREATE INDEX IF NOT EXISTS idx_tenant_security_settings_tenant_id ON tenant_security_settings(tenant_id);

-- Enable RLS on security tables
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security tables

-- Security Events Policy (only accessible to system and tenant owner)
CREATE POLICY security_events_policy ON security_events
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true) OR
    current_setting('app.current_tenant_id', true) = 'system_admin'
  );

-- Security Audit Log Policy (tenant isolation)
CREATE POLICY security_audit_log_policy ON security_audit_log
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Tenant Security Settings Policy (tenant isolation)
CREATE POLICY tenant_security_settings_policy ON tenant_security_settings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Enhanced RLS helper functions

-- Function to validate tenant context is set
CREATE OR REPLACE FUNCTION validate_tenant_context()
RETURNS BOOLEAN AS $$
DECLARE
    current_tenant TEXT;
BEGIN
    current_tenant := current_setting('app.current_tenant_id', true);
    
    IF current_tenant IS NULL OR current_tenant = '' THEN
        RAISE EXCEPTION 'SECURITY ERROR: No tenant context set - unauthorized access attempt';
    END IF;
    
    -- Additional validation: check tenant exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM tenant_subscriptions 
        WHERE tenant_id = current_tenant AND status IN ('active', 'trialing')
    ) THEN
        RAISE EXCEPTION 'SECURITY ERROR: Invalid or inactive tenant context: %', current_tenant;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events from database triggers
CREATE OR REPLACE FUNCTION log_security_event(
    event_type TEXT,
    risk_level TEXT,
    description TEXT,
    table_name TEXT DEFAULT NULL,
    operation TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    current_tenant TEXT;
    event_id TEXT;
BEGIN
    current_tenant := current_setting('app.current_tenant_id', true);
    event_id := 'db-' || extract(epoch from now()) || '-' || generate_random_uuid();
    
    INSERT INTO security_events (
        event_id,
        tenant_id,
        event_type,
        risk_level,
        threat_description,
        table_name,
        operation,
        timestamp
    ) VALUES (
        event_id,
        current_tenant,
        event_type,
        risk_level,
        description,
        table_name,
        operation,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for suspicious query patterns
CREATE OR REPLACE FUNCTION detect_suspicious_query(query_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    suspicious_patterns TEXT[] := ARRAY[
        'DROP TABLE',
        'ALTER TABLE',
        'TRUNCATE',
        'DELETE FROM tenant_',
        '; DROP',
        'UNION SELECT',
        'OR 1=1',
        'AND 1=1'
    ];
    pattern TEXT;
BEGIN
    query_text := UPPER(query_text);
    
    FOREACH pattern IN ARRAY suspicious_patterns
    LOOP
        IF position(pattern IN query_text) > 0 THEN
            PERFORM log_security_event(
                'SUSPICIOUS_QUERY',
                'HIGH',
                'Suspicious SQL pattern detected: ' || pattern,
                NULL,
                'QUERY_ANALYSIS'
            );
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers for new tables
CREATE TRIGGER update_security_config_updated_at 
  BEFORE UPDATE ON security_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_security_settings_updated_at 
  BEFORE UPDATE ON tenant_security_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default security configuration
INSERT INTO security_config (config_key, config_value, description) VALUES
(
  'rls_enforcement',
  '{
    "enabled": true,
    "bypass_roles": ["system_admin"],
    "alert_on_bypass": true,
    "log_all_queries": false
  }',
  'Row Level Security enforcement configuration'
),
(
  'query_monitoring',
  '{
    "enabled": true,
    "log_failed_queries": true,
    "monitor_cross_tenant": true,
    "alert_thresholds": {
      "failed_queries_per_minute": 10,
      "cross_tenant_attempts": 1,
      "large_query_size": 10000
    }
  }',
  'Database query monitoring settings'
),
(
  'security_alerts',
  '{
    "email_alerts": true,
    "webhook_alerts": false,
    "alert_cooldown_minutes": 15,
    "escalation_levels": ["HIGH", "CRITICAL"]
  }',
  'Security alerting configuration'
),
(
  'audit_settings',
  '{
    "log_all_operations": true,
    "retention_days": 2555,
    "include_query_text": true,
    "include_response_data": false
  }',
  'Security audit logging settings'
);

-- Insert default tenant security settings for existing tenants
INSERT INTO tenant_security_settings (tenant_id)
SELECT DISTINCT tenant_id 
FROM tenant_subscriptions 
WHERE tenant_id NOT IN (
  SELECT tenant_id FROM tenant_security_settings
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Create function to initialize security settings for new tenants
CREATE OR REPLACE FUNCTION initialize_tenant_security_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_security_settings (tenant_id)
    VALUES (NEW.tenant_id)
    ON CONFLICT (tenant_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create security settings for new tenants
CREATE TRIGGER auto_create_tenant_security_settings
  AFTER INSERT ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION initialize_tenant_security_settings();

-- Add comments for documentation
COMMENT ON TABLE security_events IS 'Real-time security events and threat detection';
COMMENT ON TABLE security_audit_log IS 'Comprehensive audit trail of all tenant operations';
COMMENT ON TABLE security_config IS 'System-wide security configuration settings';
COMMENT ON TABLE tenant_security_settings IS 'Per-tenant security settings and policies';

COMMENT ON FUNCTION validate_tenant_context() IS 'Validates that proper tenant context is set before database operations';
COMMENT ON FUNCTION log_security_event(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Logs security events from database operations';
COMMENT ON FUNCTION detect_suspicious_query(TEXT) IS 'Detects suspicious query patterns that may indicate attacks';

-- Update migration record
INSERT INTO tenant_configs (tenant_id, config_key, config_value) 
VALUES ('migration', 'schema_version', json_build_object('version', '005', 'created_at', NOW()))
ON CONFLICT (tenant_id, config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();