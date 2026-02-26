-- Google Ads OAuth & API Integration Migration
-- Version: 015 - Google Ads OAuth Connections, Quota Tracking, and Operation Logging
-- Description: Tables for managing Google Ads API OAuth connections per tenant,
--              global daily quota tracking, and an audit log of every API call.

-- ============================================================================
-- PART 1: Google Ads Connections Table
-- ============================================================================

-- One row per tenant's Google Ads connection
CREATE TABLE IF NOT EXISTS google_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  google_email TEXT,
  customer_id TEXT,
  refresh_token_encrypted TEXT NOT NULL,
  refresh_token_iv TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'active'
    CHECK (connection_status IN ('active', 'disconnected', 'error', 'token_expired')),
  login_customer_id TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Google Ads Daily Quotas Table
-- ============================================================================

-- Single-row global daily quota tracker
CREATE TABLE IF NOT EXISTS google_ads_daily_quotas (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  operations_used INTEGER NOT NULL DEFAULT 0,
  max_operations INTEGER NOT NULL DEFAULT 15000,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Google Ads Operation Log Table
-- ============================================================================

-- Audit log of every API call
CREATE TABLE IF NOT EXISTS google_ads_operation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  operations_count INTEGER NOT NULL DEFAULT 1,
  customer_id TEXT,
  request_summary TEXT,
  response_status TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 3B: Autopilot Runs Table
-- ============================================================================

-- Records each autopilot optimization cycle per tenant
CREATE TABLE IF NOT EXISTS autopilot_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'skipped', 'error')),
  campaigns_processed INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  actions_skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  summary_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 4: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_google_ads_connections_tenant_id
  ON google_ads_connections(tenant_id);

CREATE INDEX IF NOT EXISTS idx_google_ads_operation_log_tenant_created
  ON google_ads_operation_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_ads_operation_log_created_at
  ON google_ads_operation_log(created_at);

CREATE INDEX IF NOT EXISTS idx_autopilot_runs_tenant_created
  ON autopilot_runs(tenant_id, created_at DESC);

-- ============================================================================
-- PART 5: Row Level Security
-- ============================================================================

-- Enable RLS on tables with tenant_id
ALTER TABLE google_ads_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_operation_log ENABLE ROW LEVEL SECURITY;

-- google_ads_connections: tenant isolation
DROP POLICY IF EXISTS google_ads_connections_tenant_isolation ON google_ads_connections;
CREATE POLICY google_ads_connections_tenant_isolation ON google_ads_connections
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

-- google_ads_connections: service role bypass
DROP POLICY IF EXISTS google_ads_connections_service_role_bypass ON google_ads_connections;
CREATE POLICY google_ads_connections_service_role_bypass ON google_ads_connections
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- google_ads_operation_log: tenant isolation
DROP POLICY IF EXISTS google_ads_operation_log_tenant_isolation ON google_ads_operation_log;
CREATE POLICY google_ads_operation_log_tenant_isolation ON google_ads_operation_log
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

-- google_ads_operation_log: service role bypass
DROP POLICY IF EXISTS google_ads_operation_log_service_role_bypass ON google_ads_operation_log;
CREATE POLICY google_ads_operation_log_service_role_bypass ON google_ads_operation_log
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- google_ads_daily_quotas: service role only (no tenant_id column)
ALTER TABLE google_ads_daily_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS google_ads_daily_quotas_service_role_only ON google_ads_daily_quotas;
CREATE POLICY google_ads_daily_quotas_service_role_only ON google_ads_daily_quotas
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- autopilot_runs: tenant isolation
ALTER TABLE autopilot_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS autopilot_runs_tenant_isolation ON autopilot_runs;
CREATE POLICY autopilot_runs_tenant_isolation ON autopilot_runs
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)
  );

DROP POLICY IF EXISTS autopilot_runs_service_role_bypass ON autopilot_runs;
CREATE POLICY autopilot_runs_service_role_bypass ON autopilot_runs
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ============================================================================
-- PART 6: Auto-update updated_at trigger on google_ads_connections
-- ============================================================================

-- Uses the existing update_updated_at_column() function from 001_initial_schema.sql
CREATE TRIGGER update_google_ads_connections_updated_at
  BEFORE UPDATE ON google_ads_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 7: Seed initial quota row
-- ============================================================================

INSERT INTO google_ads_daily_quotas (id, date, operations_used)
VALUES (1, CURRENT_DATE, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 8: Documentation Comments
-- ============================================================================

COMMENT ON TABLE google_ads_connections IS 'Stores one OAuth connection per tenant for Google Ads API access. Tokens are AES-256 encrypted at rest.';
COMMENT ON TABLE google_ads_daily_quotas IS 'Single-row global tracker for daily Google Ads API operation quota usage.';
COMMENT ON TABLE google_ads_operation_log IS 'Audit log recording every Google Ads API call with timing, status, and quota cost.';
COMMENT ON TABLE autopilot_runs IS 'Records each autopilot optimization cycle per tenant with timing, status, and action counts.';

COMMENT ON COLUMN google_ads_connections.refresh_token_encrypted IS 'AES-256 encrypted OAuth refresh token';
COMMENT ON COLUMN google_ads_connections.refresh_token_iv IS 'Initialization vector used for AES-256 decryption of the refresh token';
COMMENT ON COLUMN google_ads_connections.customer_id IS 'Selected Google Ads customer ID (e.g., 2188388249)';
COMMENT ON COLUMN google_ads_connections.login_customer_id IS 'MCC parent account ID, used for the login-customer-id header when accessing sub-accounts';
COMMENT ON COLUMN google_ads_connections.connection_status IS 'Current state of the OAuth connection: active, disconnected, error, or token_expired';

COMMENT ON COLUMN google_ads_daily_quotas.max_operations IS 'Maximum allowed API operations per day (default 15000 for basic access)';

COMMENT ON COLUMN google_ads_operation_log.operation_type IS 'Type of API call (e.g., list_campaigns, create_campaign, update_budget)';
COMMENT ON COLUMN google_ads_operation_log.operations_count IS 'Number of mutate operations consumed by this API call';
COMMENT ON COLUMN google_ads_operation_log.duration_ms IS 'Round-trip duration of the API call in milliseconds';

-- ============================================================================
-- PART 9: Migration Record
-- ============================================================================

INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'google_ads_oauth_schema_version', json_build_object(
  'version', '015',
  'name', 'google_ads_oauth',
  'created_at', NOW(),
  'description', 'Google Ads OAuth connections, daily quota tracking, and operation audit log'
))
ON CONFLICT (tenant_id, config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Migration complete
SELECT 'Migration 015 completed successfully. Google Ads OAuth tables created.' AS status;
