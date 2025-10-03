-- =====================================================
-- Migration 012b: Fix View Security Issue
-- Created: 2025-10-03
-- Description: Recreate view without SECURITY DEFINER to fix security warning
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS latest_metrics_by_period;

-- Recreate the view WITHOUT SECURITY DEFINER (uses SECURITY INVOKER by default)
-- This means the view will use the permissions of the querying user, not the creator
CREATE OR REPLACE VIEW latest_metrics_by_period
WITH (security_invoker = true)
AS
SELECT
    tenant_id,
    period,
    date,
    entity_type,
    entity_name,
    SUM(clicks) as total_clicks,
    SUM(impressions) as total_impressions,
    SUM(conversions) as total_conversions,
    SUM(cost_micros) as total_cost_micros,
    AVG(ctr) as avg_ctr
FROM tenant_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, period, date, entity_type, entity_name
ORDER BY tenant_id, period, date DESC;

-- Add comment to document the view
COMMENT ON VIEW latest_metrics_by_period IS 'Aggregated metrics by period for the last 30 days. Uses SECURITY INVOKER to respect RLS policies of the querying user.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ View security fixed! latest_metrics_by_period now uses SECURITY INVOKER';
END $$;
