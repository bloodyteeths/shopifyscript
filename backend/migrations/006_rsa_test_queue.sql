-- RSA Test Queue Migration
-- Version: 006 - RSA Test Queue System
-- Description: Tables for automated RSA testing with statistical significance

-- RSA Test Queue Table
-- For managing automated RSA A/B tests
CREATE TABLE IF NOT EXISTS rsa_test_queue (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  campaign_name VARCHAR(500) NOT NULL,
  ad_group_name VARCHAR(500) NOT NULL,
  control_headlines JSONB DEFAULT '[]'::jsonb,
  control_descriptions JSONB DEFAULT '[]'::jsonb,
  variant_headlines JSONB NOT NULL DEFAULT '[]'::jsonb,
  variant_descriptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING', -- 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'
  performance_metrics JSONB DEFAULT '{
    "control": {"impressions": 0, "clicks": 0, "conversions": 0, "cost": 0},
    "variant": {"impressions": 0, "clicks": 0, "conversions": 0, "cost": 0}
  }'::jsonb,
  statistical_result JSONB, -- Results from statistical significance calculation
  winner VARCHAR(20), -- 'CONTROL', 'VARIANT', 'INCONCLUSIVE'
  confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
  test_configuration JSONB DEFAULT '{
    "rotation_strategy": "EVEN_ROTATION",
    "success_metric": "CTR",
    "minimum_runtime_days": 7,
    "auto_conclude": true
  }'::jsonb,
  conclusion_type VARCHAR(20), -- 'AUTO', 'MANUAL'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rsa_test_queue_tenant_id
ON rsa_test_queue(tenant_id);

CREATE INDEX IF NOT EXISTS idx_rsa_test_queue_status
ON rsa_test_queue(status);

CREATE INDEX IF NOT EXISTS idx_rsa_test_queue_tenant_status
ON rsa_test_queue(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_rsa_test_queue_campaign
ON rsa_test_queue(tenant_id, campaign_name);

CREATE INDEX IF NOT EXISTS idx_rsa_test_queue_start_date
ON rsa_test_queue(start_date);

CREATE INDEX IF NOT EXISTS idx_rsa_test_queue_created_at
ON rsa_test_queue(created_at);

-- Test Performance History Table
-- For storing detailed performance snapshots over time
CREATE TABLE IF NOT EXISTS rsa_test_performance_history (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(100) NOT NULL REFERENCES rsa_test_queue(id) ON DELETE CASCADE,
  tenant_id VARCHAR(100) NOT NULL,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  control_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  variant_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  statistical_snapshot JSONB, -- Statistical calculations at this point in time
  days_running INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance history lookups
CREATE INDEX IF NOT EXISTS idx_rsa_test_performance_history_test_id
ON rsa_test_performance_history(test_id);

CREATE INDEX IF NOT EXISTS idx_rsa_test_performance_history_tenant_date
ON rsa_test_performance_history(tenant_id, snapshot_date);

-- Test Actions Log Table
-- For tracking automated actions taken based on test results
CREATE TABLE IF NOT EXISTS rsa_test_actions (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(100) NOT NULL REFERENCES rsa_test_queue(id) ON DELETE CASCADE,
  tenant_id VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'PROMOTE_VARIANT', 'PAUSE_CONTROL', etc.
  action_description TEXT,
  action_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'EXECUTED', 'FAILED', 'SKIPPED'
  execution_result JSONB,
  priority VARCHAR(10) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
  auto_apply BOOLEAN DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for action lookups
CREATE INDEX IF NOT EXISTS idx_rsa_test_actions_test_id
ON rsa_test_actions(test_id);

CREATE INDEX IF NOT EXISTS idx_rsa_test_actions_tenant_status
ON rsa_test_actions(tenant_id, action_status);

-- Enable Row Level Security
ALTER TABLE rsa_test_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_test_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_test_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation

-- RSA Test Queue Policy
CREATE POLICY rsa_test_queue_policy ON rsa_test_queue
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- RSA Test Performance History Policy
CREATE POLICY rsa_test_performance_history_policy ON rsa_test_performance_history
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- RSA Test Actions Policy
CREATE POLICY rsa_test_actions_policy ON rsa_test_actions
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Add updated_at triggers
CREATE TRIGGER update_rsa_test_queue_updated_at
  BEFORE UPDATE ON rsa_test_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraints and validations
ALTER TABLE rsa_test_queue
  ADD CONSTRAINT chk_rsa_test_queue_status
  CHECK (status IN ('RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'));

ALTER TABLE rsa_test_queue
  ADD CONSTRAINT chk_rsa_test_queue_winner
  CHECK (winner IS NULL OR winner IN ('CONTROL', 'VARIANT', 'INCONCLUSIVE'));

ALTER TABLE rsa_test_queue
  ADD CONSTRAINT chk_rsa_test_queue_confidence_score
  CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE rsa_test_actions
  ADD CONSTRAINT chk_rsa_test_actions_status
  CHECK (action_status IN ('PENDING', 'EXECUTED', 'FAILED', 'SKIPPED'));

ALTER TABLE rsa_test_actions
  ADD CONSTRAINT chk_rsa_test_actions_priority
  CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'));

-- Functions for test management

-- Function to automatically conclude tests based on criteria
CREATE OR REPLACE FUNCTION auto_conclude_rsa_tests()
RETURNS TABLE(concluded_test_id VARCHAR, tenant_id VARCHAR, winner VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
    test_record RECORD;
    days_running INTEGER;
    significance_result JSONB;
BEGIN
    -- Loop through running tests
    FOR test_record IN
        SELECT * FROM rsa_test_queue
        WHERE status = 'RUNNING'
        AND test_configuration->>'auto_conclude' = 'true'
        AND start_date <= NOW() - INTERVAL '7 days' -- Minimum 7 days
    LOOP
        -- Calculate days running
        days_running := EXTRACT(EPOCH FROM (NOW() - test_record.start_date)) / 86400;

        -- Get latest statistical result
        significance_result := test_record.statistical_result;

        -- Check if test should be concluded
        IF significance_result IS NOT NULL
           AND (significance_result->>'isSignificant')::boolean = true
           AND (significance_result->>'confidenceLevel')::numeric >= 0.95
           AND days_running >= (test_record.test_configuration->>'minimum_runtime_days')::integer
        THEN
            -- Update test to completed
            UPDATE rsa_test_queue
            SET
                status = 'COMPLETED',
                end_date = NOW(),
                conclusion_type = 'AUTO',
                updated_at = NOW()
            WHERE id = test_record.id;

            -- Return concluded test info
            concluded_test_id := test_record.id;
            tenant_id := test_record.tenant_id;
            winner := test_record.winner;

            RETURN NEXT;
        END IF;
    END LOOP;

    RETURN;
END;
$$;

-- Function to get test summary statistics
CREATE OR REPLACE FUNCTION get_rsa_test_summary(p_tenant_id VARCHAR)
RETURNS TABLE(
    total_tests INTEGER,
    running_tests INTEGER,
    completed_tests INTEGER,
    avg_test_duration NUMERIC,
    win_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::integer as total_tests,
        COUNT(*) FILTER (WHERE status = 'RUNNING')::integer as running_tests,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::integer as completed_tests,
        COALESCE(
            AVG(EXTRACT(EPOCH FROM (COALESCE(end_date, NOW()) - start_date)) / 86400),
            0
        )::numeric as avg_test_duration,
        COALESCE(
            (COUNT(*) FILTER (WHERE winner = 'VARIANT')::numeric /
             NULLIF(COUNT(*) FILTER (WHERE status = 'COMPLETED'), 0)) * 100,
            0
        )::numeric as win_rate
    FROM rsa_test_queue
    WHERE tenant_id = p_tenant_id;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE rsa_test_queue IS 'Manages automated RSA A/B testing queue for PRO tier tenants';
COMMENT ON TABLE rsa_test_performance_history IS 'Stores performance snapshots for RSA tests over time';
COMMENT ON TABLE rsa_test_actions IS 'Tracks automated actions taken based on RSA test results';

COMMENT ON COLUMN rsa_test_queue.performance_metrics IS 'JSON object containing control and variant performance data';
COMMENT ON COLUMN rsa_test_queue.statistical_result IS 'Statistical significance calculation results including confidence level, p-value, etc.';
COMMENT ON COLUMN rsa_test_queue.test_configuration IS 'Test configuration including rotation strategy, success metrics, and auto-conclude settings';

-- Migration complete
INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'rsa_test_queue_schema_version', json_build_object('version', '006', 'created_at', NOW()))
ON CONFLICT (tenant_id, config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();