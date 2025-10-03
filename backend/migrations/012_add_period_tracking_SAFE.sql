-- =====================================================
-- Migration 012: Add Period Tracking for Time-Specific Metrics (SAFE VERSION)
-- Created: 2025-10-03
-- Description: Adds period field only to tables that exist
-- Fixes: Critical bug where all metrics show ALL_TIME data instead of time-specific data
-- =====================================================

-- STEP 1: Add period column to tenant_metrics (CORE TABLE - definitely exists)
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

-- STEP 6: Add period to search_terms (CORE TABLE - definitely exists)
ALTER TABLE search_terms
ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

-- STEP 7: Drop existing UNIQUE constraint from search_terms
ALTER TABLE search_terms
DROP CONSTRAINT IF EXISTS search_terms_tenant_id_date_campaign_name_ad_group_name_se_key;

-- STEP 8: Create new UNIQUE constraint for search_terms
ALTER TABLE search_terms
ADD CONSTRAINT search_terms_unique_period
UNIQUE(tenant_id, date, campaign_name, ad_group_name, search_term, period);

-- STEP 9: Create index for search_terms period queries
CREATE INDEX IF NOT EXISTS idx_search_terms_period
ON search_terms(tenant_id, period, date DESC);

-- STEP 10: Try to add period to device_metrics (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_metrics') THEN
        ALTER TABLE device_metrics ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

        ALTER TABLE device_metrics DROP CONSTRAINT IF EXISTS device_metrics_tenant_id_campaign_id_device_type_date_key;

        ALTER TABLE device_metrics ADD CONSTRAINT device_metrics_unique_period
        UNIQUE(tenant_id, campaign_id, device_type, period, date);

        CREATE INDEX IF NOT EXISTS idx_device_metrics_period
        ON device_metrics(tenant_id, period, date DESC);

        RAISE NOTICE 'Added period to device_metrics';
    ELSE
        RAISE NOTICE 'device_metrics table does not exist - skipping';
    END IF;
END $$;

-- STEP 11: Try to add period to keyword_performance (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_performance') THEN
        ALTER TABLE keyword_performance ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

        ALTER TABLE keyword_performance DROP CONSTRAINT IF EXISTS keyword_performance_tenant_id_keyword_match_type_campaign_i_key;

        ALTER TABLE keyword_performance ADD CONSTRAINT keyword_performance_unique_period
        UNIQUE(tenant_id, keyword, match_type, campaign_id, ad_group_id, period, date);

        CREATE INDEX IF NOT EXISTS idx_keyword_performance_period
        ON keyword_performance(tenant_id, period, date DESC);

        RAISE NOTICE 'Added period to keyword_performance';
    ELSE
        RAISE NOTICE 'keyword_performance table does not exist - skipping';
    END IF;
END $$;

-- STEP 12: Try to add period to hourly_patterns (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hourly_patterns') THEN
        ALTER TABLE hourly_patterns ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

        ALTER TABLE hourly_patterns DROP CONSTRAINT IF EXISTS hourly_patterns_tenant_id_hour_day_of_week_campaign_id_date_key;

        ALTER TABLE hourly_patterns ADD CONSTRAINT hourly_patterns_unique_period
        UNIQUE(tenant_id, hour, day_of_week, campaign_id, period, date);

        CREATE INDEX IF NOT EXISTS idx_hourly_patterns_period
        ON hourly_patterns(tenant_id, period, date DESC);

        RAISE NOTICE 'Added period to hourly_patterns';
    ELSE
        RAISE NOTICE 'hourly_patterns table does not exist - skipping';
    END IF;
END $$;

-- STEP 13: Try to add period to geographic_performance (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geographic_performance') THEN
        ALTER TABLE geographic_performance ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

        ALTER TABLE geographic_performance DROP CONSTRAINT IF EXISTS geographic_performance_tenant_id_country_id_region_id_city_key;

        ALTER TABLE geographic_performance ADD CONSTRAINT geographic_performance_unique_period
        UNIQUE(tenant_id, country_id, region_id, city, campaign_id, period, date);

        CREATE INDEX IF NOT EXISTS idx_geographic_performance_period
        ON geographic_performance(tenant_id, period, date DESC);

        RAISE NOTICE 'Added period to geographic_performance';
    ELSE
        RAISE NOTICE 'geographic_performance table does not exist - skipping';
    END IF;
END $$;

-- STEP 14: Try to add period to ad_performance (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_performance') THEN
        ALTER TABLE ad_performance ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

        ALTER TABLE ad_performance DROP CONSTRAINT IF EXISTS ad_performance_tenant_id_ad_id_date_key;

        ALTER TABLE ad_performance ADD CONSTRAINT ad_performance_unique_period
        UNIQUE(tenant_id, ad_id, period, date);

        CREATE INDEX IF NOT EXISTS idx_ad_performance_period
        ON ad_performance(tenant_id, period, date DESC);

        RAISE NOTICE 'Added period to ad_performance';
    ELSE
        RAISE NOTICE 'ad_performance table does not exist - skipping';
    END IF;
END $$;

-- STEP 15: Try to add period to conversion_values (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversion_values') THEN
        ALTER TABLE conversion_values ADD COLUMN IF NOT EXISTS period VARCHAR(50) DEFAULT 'UNKNOWN';

        CREATE INDEX IF NOT EXISTS idx_conversion_values_period
        ON conversion_values(tenant_id, period, date DESC);

        RAISE NOTICE 'Added period to conversion_values';
    ELSE
        RAISE NOTICE 'conversion_values table does not exist - skipping';
    END IF;
END $$;

-- STEP 16: Create helper view for latest period data (only if tenant_metrics exists with period)
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

-- STEP 17: Create helper function to get metrics for specific period
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

-- STEP 18: Add comments for documentation
COMMENT ON COLUMN tenant_metrics.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
COMMENT ON COLUMN search_terms.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';

-- STEP 19: Update existing data to have period = 'ALL_TIME' (since that's what it currently is)
UPDATE tenant_metrics SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
UPDATE search_terms SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';

-- Update other tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_metrics') THEN
        UPDATE device_metrics SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
        COMMENT ON COLUMN device_metrics.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_performance') THEN
        UPDATE keyword_performance SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
        COMMENT ON COLUMN keyword_performance.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hourly_patterns') THEN
        UPDATE hourly_patterns SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
        COMMENT ON COLUMN hourly_patterns.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geographic_performance') THEN
        UPDATE geographic_performance SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
        COMMENT ON COLUMN geographic_performance.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_performance') THEN
        UPDATE ad_performance SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
        COMMENT ON COLUMN ad_performance.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversion_values') THEN
        UPDATE conversion_values SET period = 'ALL_TIME' WHERE period = 'UNKNOWN';
        COMMENT ON COLUMN conversion_values.period IS 'Time period for metrics: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, ALL_TIME';
    END IF;
END $$;

-- STEP 20: Grant permissions (only if role exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT SELECT ON latest_metrics_by_period TO service_role;
        GRANT EXECUTE ON FUNCTION get_metrics_for_period TO service_role;
    END IF;
END $$;

-- STEP 21: Track migration completion
INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'schema_version_012', json_build_object(
    'version', '012',
    'created_at', NOW(),
    'description', 'Add period tracking for time-specific metrics',
    'status', 'completed'
))
ON CONFLICT (tenant_id, config_key) DO UPDATE
SET config_value = json_build_object(
    'version', '012',
    'updated_at', NOW(),
    'description', 'Add period tracking for time-specific metrics',
    'status', 'completed'
);

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 012 completed successfully!';
    RAISE NOTICE 'Added period tracking to tenant_metrics and search_terms (core tables)';
    RAISE NOTICE 'Conditionally added period to additional tables if they exist';
END $$;
