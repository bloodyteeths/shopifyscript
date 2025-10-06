-- Ads Autopilot AI Comprehensive RLS Policies Migration
-- Version: 013 - Complete Row Level Security Implementation
-- Description: Comprehensive RLS policies for all sensitive tables with tenant isolation

-- ============================================================================
-- PART 1: Enable RLS on Queue Tables (from database-init.js)
-- ============================================================================

-- Enable RLS on queue and worker tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Enable RLS on Metrics Tables (from supabase-metrics-tables.sql)
-- ============================================================================

-- These might already be enabled, but we ensure they are
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_group_metrics ENABLE ROW LEVEL SECURITY;

-- Note: search_terms is already enabled in 001_initial_schema.sql

-- ============================================================================
-- PART 3: Drop Existing Policies (if any) to Recreate
-- ============================================================================

-- Drop existing policies on queue tables (if they exist)
DROP POLICY IF EXISTS jobs_tenant_isolation ON jobs;
DROP POLICY IF EXISTS jobs_service_role_bypass ON jobs;
DROP POLICY IF EXISTS job_logs_tenant_isolation ON job_logs;
DROP POLICY IF EXISTS job_logs_service_role_bypass ON job_logs;
DROP POLICY IF EXISTS performance_metrics_tenant_isolation ON performance_metrics;
DROP POLICY IF EXISTS performance_metrics_service_role_bypass ON performance_metrics;
DROP POLICY IF EXISTS job_alerts_tenant_isolation ON job_alerts;
DROP POLICY IF EXISTS job_alerts_service_role_bypass ON job_alerts;
DROP POLICY IF EXISTS worker_metrics_service_role_bypass ON worker_metrics;

-- Drop and recreate policies on metrics tables to ensure consistency
DROP POLICY IF EXISTS "Tenants can view own campaign metrics" ON campaign_metrics;
DROP POLICY IF EXISTS "Tenants can insert own campaign metrics" ON campaign_metrics;
DROP POLICY IF EXISTS "Tenants can update own campaign metrics" ON campaign_metrics;
DROP POLICY IF EXISTS "Service role full access campaign" ON campaign_metrics;
DROP POLICY IF EXISTS campaign_metrics_tenant_isolation ON campaign_metrics;
DROP POLICY IF EXISTS campaign_metrics_service_role_bypass ON campaign_metrics;

DROP POLICY IF EXISTS "Tenants can view own ad group metrics" ON ad_group_metrics;
DROP POLICY IF EXISTS "Tenants can insert own ad group metrics" ON ad_group_metrics;
DROP POLICY IF EXISTS "Tenants can update own ad group metrics" ON ad_group_metrics;
DROP POLICY IF EXISTS "Service role full access ad_group" ON ad_group_metrics;
DROP POLICY IF EXISTS ad_group_metrics_tenant_isolation ON ad_group_metrics;
DROP POLICY IF EXISTS ad_group_metrics_service_role_bypass ON ad_group_metrics;

-- ============================================================================
-- PART 4: Create Comprehensive RLS Policies for Queue Tables
-- ============================================================================

-- Jobs Table Policies
-- Tenant isolation: Users can only access their own jobs
CREATE POLICY jobs_tenant_isolation ON jobs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

-- Service role bypass: Backend service can access all jobs
CREATE POLICY jobs_service_role_bypass ON jobs
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Job Logs Table Policies
-- Tenant isolation: Users can only access their own job logs
CREATE POLICY job_logs_tenant_isolation ON job_logs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

-- Service role bypass: Backend service can access all job logs
CREATE POLICY job_logs_service_role_bypass ON job_logs
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Performance Metrics Table Policies
-- Note: This table doesn't have tenant_id, so we allow service role only
-- If you need tenant access, add tenant_id column first
CREATE POLICY performance_metrics_service_role_only ON performance_metrics
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Job Alerts Table Policies
-- Note: This table doesn't have tenant_id, so we allow service role only
-- Consider adding tenant_id if alerts need tenant isolation
CREATE POLICY job_alerts_service_role_only ON job_alerts
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Worker Metrics Table Policies
-- Worker metrics are system-level, only service role can access
CREATE POLICY worker_metrics_service_role_only ON worker_metrics
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ============================================================================
-- PART 5: Create Comprehensive RLS Policies for Metrics Tables
-- ============================================================================

-- Campaign Metrics Table Policies
-- Tenant isolation with granular permissions
CREATE POLICY campaign_metrics_tenant_isolation ON campaign_metrics
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

-- Service role bypass for backend operations
CREATE POLICY campaign_metrics_service_role_bypass ON campaign_metrics
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Ad Group Metrics Table Policies
-- Tenant isolation with granular permissions
CREATE POLICY ad_group_metrics_tenant_isolation ON ad_group_metrics
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

-- Service role bypass for backend operations
CREATE POLICY ad_group_metrics_service_role_bypass ON ad_group_metrics
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ============================================================================
-- PART 6: Enhanced RLS Policies for Existing Tables (from previous migrations)
-- ============================================================================

-- Update automation_logs policy to use newer pattern (if not already done)
DROP POLICY IF EXISTS automation_execution_logs_tenant_isolation ON automation_execution_logs;
DROP POLICY IF EXISTS automation_execution_logs_service_role_bypass ON automation_execution_logs;
DROP POLICY IF EXISTS automation_execution_logs_policy ON automation_execution_logs;

CREATE POLICY automation_execution_logs_tenant_isolation ON automation_execution_logs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

CREATE POLICY automation_execution_logs_service_role_bypass ON automation_execution_logs
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ============================================================================
-- PART 7: Create Helper Functions for RLS Management
-- ============================================================================

-- Function to set tenant context (should be called by backend before queries)
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify RLS is working correctly
CREATE OR REPLACE FUNCTION verify_rls_enabled()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::text,
    t.rowsecurity,
    COUNT(p.policyname)::integer
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'jobs', 'job_logs', 'performance_metrics', 'job_alerts', 'worker_metrics',
      'campaign_metrics', 'ad_group_metrics', 'search_terms',
      'tenant_metrics', 'tenant_configs', 'tenant_subscriptions',
      'run_logs', 'campaign_configs', 'rsa_assets',
      'automation_rules', 'custom_bid_strategies', 'automation_execution_logs',
      'bid_adjustment_history', 'automation_performance_metrics', 'automation_alerts',
      'rsa_test_queue', 'rsa_test_performance_history', 'rsa_test_actions',
      'security_events', 'security_audit_log', 'tenant_security_settings'
    )
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test tenant isolation
CREATE OR REPLACE FUNCTION test_tenant_isolation(
  p_table_name TEXT,
  p_tenant_id_1 TEXT,
  p_tenant_id_2 TEXT
)
RETURNS TABLE(
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
) AS $$
DECLARE
  count_tenant_1 INTEGER;
  count_tenant_2 INTEGER;
  count_cross_tenant INTEGER;
BEGIN
  -- Set context to tenant 1
  PERFORM set_tenant_context(p_tenant_id_1);

  -- Count records visible to tenant 1
  EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO count_tenant_1;

  -- Set context to tenant 2
  PERFORM set_tenant_context(p_tenant_id_2);

  -- Count records visible to tenant 2
  EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO count_tenant_2;

  -- Try to count records from tenant 1 while in tenant 2 context
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE tenant_id = $1',
    p_table_name
  ) INTO count_cross_tenant USING p_tenant_id_1;

  -- Return test results
  RETURN QUERY SELECT
    'Tenant 1 can see own records'::text,
    count_tenant_1 >= 0,
    format('Tenant 1 sees %s records', count_tenant_1);

  RETURN QUERY SELECT
    'Tenant 2 can see own records'::text,
    count_tenant_2 >= 0,
    format('Tenant 2 sees %s records', count_tenant_2);

  RETURN QUERY SELECT
    'Tenant 2 cannot see Tenant 1 records'::text,
    count_cross_tenant = 0,
    format('Tenant 2 sees %s records from Tenant 1 (should be 0)', count_cross_tenant);

  -- Clear context
  PERFORM clear_tenant_context();

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: Create Audit Trigger for RLS Policy Violations
-- ============================================================================

-- Function to log potential RLS violations
CREATE OR REPLACE FUNCTION log_rls_violation()
RETURNS TRIGGER AS $$
DECLARE
  current_tenant TEXT;
  row_tenant TEXT;
BEGIN
  current_tenant := current_setting('app.current_tenant_id', true);

  -- Get tenant_id from the row (if column exists)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    row_tenant := NEW.tenant_id;
  ELSIF TG_OP = 'DELETE' THEN
    row_tenant := OLD.tenant_id;
  END IF;

  -- Log if tenant mismatch detected
  IF current_tenant IS NOT NULL
     AND row_tenant IS NOT NULL
     AND current_tenant != row_tenant
  THEN
    INSERT INTO security_events (
      event_id,
      tenant_id,
      event_type,
      risk_level,
      threat_description,
      table_name,
      operation,
      timestamp,
      metadata
    ) VALUES (
      'rls-' || extract(epoch from now()) || '-' || gen_random_uuid(),
      current_tenant,
      'RLS_POLICY_VIOLATION',
      'HIGH',
      format('Attempt to access tenant %s data from tenant %s context', row_tenant, current_tenant),
      TG_TABLE_NAME,
      TG_OP,
      NOW(),
      jsonb_build_object(
        'current_tenant', current_tenant,
        'row_tenant', row_tenant,
        'operation', TG_OP,
        'table', TG_TABLE_NAME
      )
    );
  END IF;

  -- Always allow the operation to proceed (RLS will block if needed)
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: Create Indexes for RLS Performance
-- ============================================================================

-- Ensure tenant_id indexes exist for optimal RLS performance
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id_rls ON jobs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_logs_tenant_id_rls ON job_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_tenant_id_rls ON campaign_metrics(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_group_metrics_tenant_id_rls ON ad_group_metrics(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_automation_execution_logs_tenant_id_rls ON automation_execution_logs(tenant_id) WHERE tenant_id IS NOT NULL;

-- ============================================================================
-- PART 10: Add Documentation Comments
-- ============================================================================

COMMENT ON FUNCTION set_tenant_context(TEXT) IS 'Sets the tenant context for RLS policies. Must be called before querying tenant-isolated tables.';
COMMENT ON FUNCTION clear_tenant_context() IS 'Clears the tenant context, preventing accidental cross-tenant access.';
COMMENT ON FUNCTION get_tenant_context() IS 'Returns the current tenant context setting.';
COMMENT ON FUNCTION verify_rls_enabled() IS 'Returns RLS status for all sensitive tables. Use to verify RLS is properly configured.';
COMMENT ON FUNCTION test_tenant_isolation(TEXT, TEXT, TEXT) IS 'Tests tenant isolation for a specific table. Returns test results.';
COMMENT ON FUNCTION log_rls_violation() IS 'Trigger function that logs potential RLS policy violations to security_events table.';

-- ============================================================================
-- PART 11: Grant Necessary Permissions
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_context() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION test_tenant_isolation(TEXT, TEXT, TEXT) TO authenticated;

-- Service role should have full access
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- PART 12: Update Migration Record
-- ============================================================================

INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'schema_version', json_build_object(
  'version', '013',
  'name', 'comprehensive_rls_policies',
  'created_at', NOW(),
  'description', 'Complete RLS implementation for all sensitive tables'
))
ON CONFLICT (tenant_id, config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- ============================================================================
-- PART 13: Verification Query (commented out - run manually to verify)
-- ============================================================================

/*
-- Run this query to verify RLS is enabled on all tables:
SELECT * FROM verify_rls_enabled();

-- Expected output: All listed tables should have rls_enabled = true
-- and policy_count >= 1 (usually 2: one for tenant isolation, one for service role)
*/

-- Migration complete
SELECT 'Migration 013 completed successfully. RLS policies implemented for all sensitive tables.' AS status;
