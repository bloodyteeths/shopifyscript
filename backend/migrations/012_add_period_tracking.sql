-- =====================================================
-- Migration 012: Add Period Tracking for Time-Specific Metrics
-- Created: 2025-10-03
-- Description: Adds period field to distinguish between TODAY, LAST_7_DAYS, ALL_TIME, etc.
-- Fixes: Critical bug where all metrics show ALL_TIME data instead of time-specific data
-- =====================================================

-- STEP 1: Add period column to tenant_metrics
ALTER TABLE tenant_metrics
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

-- STEP 2: Drop existing UNIQUE constraint
ALTER TABLE tenant_metrics
DROP CONSTRAINT IF EXISTS tenant_metrics_tenant_id_date_entity_type_entity_id_key;

-- STEP 3: Create new UNIQUE constraint including period
ALTER TABLE tenant_metrics
ADD CONSTRAINT tenant_metrics_unique_period
UNIQUE(tenant_id, date, period, entity_type, entity_id);

-- STEP 4: Create index for period-based queries
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_period
ON tenant_metrics(tenant_id, period, date DESC);

-- STEP 5: Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_period_entity
ON tenant_metrics(tenant_id, period, entity_type, date DESC);

-- STEP 6: Add period to device_metrics
ALTER TABLE device_metrics
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

ALTER TABLE device_metrics
DROP CONSTRAINT IF EXISTS device_metrics_tenant_id_campaign_id_device_type_date_key;

ALTER TABLE device_metrics
ADD CONSTRAINT device_metrics_unique_period
UNIQUE(tenant_id, campaign_id, device_type, period, date);

CREATE INDEX IF NOT EXISTS idx_device_metrics_period
ON device_metrics(tenant_id, period, date DESC);

-- STEP 7: Add period to keyword_performance
ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

ALTER TABLE keyword_performance
DROP CONSTRAINT IF EXISTS keyword_performance_tenant_id_keyword_match_type_campaign_i_key;

ALTER TABLE keyword_performance
ADD CONSTRAINT keyword_performance_unique_period
UNIQUE(tenant_id, keyword, match_type, campaign_id, ad_group_id, period, date);

CREATE INDEX IF NOT EXISTS idx_keyword_performance_period
ON keyword_performance(tenant_id, period, date DESC);

-- STEP 8: Add period to hourly_patterns
ALTER TABLE hourly_patterns
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

ALTER TABLE hourly_patterns
DROP CONSTRAINT IF EXISTS hourly_patterns_tenant_id_hour_day_of_week_campaign_id_date_key;

ALTER TABLE hourly_patterns
ADD CONSTRAINT hourly_patterns_unique_period
UNIQUE(tenant_id, hour, day_of_week, campaign_id, period, date);

CREATE INDEX IF NOT EXISTS idx_hourly_patterns_period
ON hourly_patterns(tenant_id, period, date DESC);

-- STEP 9: Add period to geographic_performance
ALTER TABLE geographic_performance
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

ALTER TABLE geographic_performance
DROP CONSTRAINT IF EXISTS geographic_performance_tenant_id_country_id_region_id_city_key;

ALTER TABLE geographic_performance
ADD CONSTRAINT geographic_performance_unique_period
UNIQUE(tenant_id, country_id, region_id, city, campaign_id, period, date);

CREATE INDEX IF NOT EXISTS idx_geographic_performance_period
ON geographic_performance(tenant_id, period, date DESC);

-- STEP 10: Add period to ad_performance
ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

ALTER TABLE ad_performance
DROP CONSTRAINT IF EXISTS ad_performance_tenant_id_ad_id_date_key;

ALTER TABLE ad_performance
ADD CONSTRAINT ad_performance_unique_period
UNIQUE(tenant_id, ad_id, period, date);

CREATE INDEX IF NOT EXISTS idx_ad_performance_period
ON ad_performance(tenant_id, period, date DESC);

-- STEP 11: Add period to conversion_values
ALTER TABLE conversion_values
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

-- Note: conversion_values doesn't have a unique constraint, so just add index
CREATE INDEX IF NOT EXISTS idx_conversion_values_period
ON conversion_values(tenant_id, period, date DESC);

-- STEP 12: Add period to search_terms
ALTER TABLE search_terms
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

ALTER TABLE search_terms
DROP CONSTRAINT IF EXISTS search_terms_tenant_id_date_campaign_name_ad_group_name_se_key;

ALTER TABLE search_terms
ADD CONSTRAINT search_terms_unique_period
UNIQUE(tenant_id, date, campaign_name, ad_group_name, search_term, period);

CREATE INDEX IF NOT EXISTS idx_search_terms_period
ON search_terms(tenant_id, period, date DESC);

-- STEP 13: Create helper view for latest period data
CREATE OR REPLACE VIEW latest_metrics_by_period AS
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

-- STEP 14: Create helper function to get metrics for specific period
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
) AS $$
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
$$ LANGUAGE plpgsql;

-- STEP 15: Add comments for documentation
COMMENT ON COLUMN tenant_metrics.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN device_metrics.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN keyword_performance.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN hourly_patterns.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN geographic_performance.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN ad_performance.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN conversion_values.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN search_terms.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';

-- STEP 16: Update existing data to have period = 'ALL_TIME' (since that's what it currently is)
UPDATE tenant_metrics SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE device_metrics SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE keyword_performance SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE hourly_patterns SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE geographic_performance SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE ad_performance SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE conversion_values SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE search_terms SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';

-- STEP 17: Grant permissions
GRANT SELECT ON latest_metrics_by_period TO service_role;
GRANT EXECUTE ON FUNCTION get_metrics_for_period TO service_role;

-- STEP 18: Track migration completion
INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'schema_version_012', json_build_object(
    'version', '012',
    'created_at', NOW(),
    'description', 'Add period tracking for time-specific metrics',
    'tables_updated', ARRAY[
        'tenant_metrics',
        'device_metrics',
        'keyword_performance',
        'hourly_patterns',
        'geographic_performance',
        'ad_performance',
        'conversion_values',
        'search_terms'
    ],
    'views_created', ARRAY['latest_metrics_by_period'],
    'functions_created', ARRAY['get_metrics_for_period']
))
ON CONFLICT (tenant_id, config_key)
DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Success message
SELECT 'Migration 012: Period Tracking - SUCCESS!' AS status,
       'Added period column to 8 tables with indexes and constraints' AS message,
       'All existing data labeled as ALL_TIME, ready for time-specific data' AS details;
