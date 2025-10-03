-- =====================================================
-- Migration 012c: Fix Function Security (Search Path)
-- Created: 2025-10-03
-- Description: Set fixed search_path on get_metrics_for_period function to prevent security issues
-- =====================================================

-- Drop and recreate the function with SET search_path
CREATE OR REPLACE FUNCTION get_metrics_for_period(
    p_tenant_id VARCHAR(100),
    p_period VARCHAR(50),
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    clicks INTEGER,
    impressions INTEGER,
    conversions DECIMAL,
    cost_micros BIGINT,
    ctr DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp  -- FIXED: Set explicit search_path for security
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tm.date,
        COALESCE(SUM(tm.clicks), 0)::INTEGER as clicks,
        COALESCE(SUM(tm.impressions), 0)::INTEGER as impressions,
        COALESCE(SUM(tm.conversions), 0) as conversions,
        COALESCE(SUM(tm.cost_micros), 0) as cost_micros,
        COALESCE(AVG(tm.ctr), 0) as ctr
    FROM tenant_metrics tm
    WHERE tm.tenant_id = p_tenant_id
        AND tm.period = p_period
        AND tm.date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    GROUP BY tm.date
    ORDER BY tm.date DESC;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_metrics_for_period IS 'Gets metrics for a specific period with secure search_path. Uses SECURITY INVOKER to respect RLS policies.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Function security fixed! get_metrics_for_period now has SET search_path = public, pg_temp';
END $$;
