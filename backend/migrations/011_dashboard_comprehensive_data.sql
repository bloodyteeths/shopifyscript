-- =====================================================
-- Migration 011: Dashboard Comprehensive Data Tables
-- Created: 2025-09-29
-- Description: Creates comprehensive data tables for enhanced dashboard functionality
-- Includes device metrics, keywords, geographic data, ad performance, and conversion tracking
-- =====================================================

-- CAMPAIGN DETAILS TABLE
-- Stores comprehensive campaign information for enhanced dashboard analytics
CREATE TABLE IF NOT EXISTS campaign_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'removed', 'draft'
    budget DECIMAL(10,2),
    bidding_strategy TEXT, -- 'manual_cpc', 'target_cpa', 'target_roas', 'maximize_clicks', etc.
    target_cpa DECIMAL(10,2),
    target_roas DECIMAL(5,2),
    budget_type TEXT DEFAULT 'daily', -- 'daily', 'shared'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, campaign_id)
);

-- Indexes for campaign_details
CREATE INDEX IF NOT EXISTS idx_campaign_details_tenant ON campaign_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_details_status ON campaign_details(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_details_budget ON campaign_details(tenant_id, budget DESC);

-- DEVICE METRICS TABLE
-- Tracks performance metrics broken down by device type
CREATE TABLE IF NOT EXISTS device_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    campaign_id TEXT,
    device_type TEXT NOT NULL, -- 'desktop', 'mobile', 'tablet'
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,4) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(10,6) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(10,6) DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, campaign_id, device_type, date)
);

-- Indexes for device_metrics
CREATE INDEX IF NOT EXISTS idx_device_metrics_tenant_date ON device_metrics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_device_metrics_device ON device_metrics(tenant_id, device_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_device_metrics_campaign ON device_metrics(tenant_id, campaign_id, date DESC);

-- KEYWORD PERFORMANCE TABLE
-- Tracks detailed keyword-level performance metrics
CREATE TABLE IF NOT EXISTS keyword_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    match_type TEXT, -- 'exact', 'phrase', 'broad'
    quality_score INTEGER,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,4) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    avg_cpc DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(10,6) DEFAULT 0,
    conversion_rate DECIMAL(10,6) DEFAULT 0,
    avg_position DECIMAL(3,1),
    search_impression_share DECIMAL(5,2),
    campaign_id TEXT,
    ad_group_id TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, keyword, match_type, campaign_id, ad_group_id, date)
);

-- Indexes for keyword_performance
CREATE INDEX IF NOT EXISTS idx_keyword_performance_tenant_date ON keyword_performance(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_keyword ON keyword_performance(tenant_id, keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_quality ON keyword_performance(tenant_id, quality_score DESC, date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_campaign ON keyword_performance(tenant_id, campaign_id, date DESC);

-- HOURLY PATTERNS TABLE
-- Captures performance patterns by hour and day of week for optimization
CREATE TABLE IF NOT EXISTS hourly_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,4) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(10,6) DEFAULT 0,
    conversion_rate DECIMAL(10,6) DEFAULT 0,
    avg_cpc DECIMAL(10,2) DEFAULT 0,
    campaign_id TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, hour, day_of_week, campaign_id, date)
);

-- Indexes for hourly_patterns
CREATE INDEX IF NOT EXISTS idx_hourly_patterns_tenant_date ON hourly_patterns(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_patterns_hour_dow ON hourly_patterns(tenant_id, hour, day_of_week);
CREATE INDEX IF NOT EXISTS idx_hourly_patterns_performance ON hourly_patterns(tenant_id, conversion_rate DESC, ctr DESC);

-- GEOGRAPHIC PERFORMANCE TABLE
-- Tracks performance by geographic locations for geo-targeting optimization
CREATE TABLE IF NOT EXISTS geographic_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    country_id TEXT, -- ISO country code
    region_id TEXT, -- State/province code
    city TEXT,
    metro_area TEXT,
    postal_code TEXT,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,4) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(10,6) DEFAULT 0,
    conversion_rate DECIMAL(10,6) DEFAULT 0,
    avg_cpc DECIMAL(10,2) DEFAULT 0,
    campaign_id TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, country_id, region_id, city, campaign_id, date)
);

-- Indexes for geographic_performance
CREATE INDEX IF NOT EXISTS idx_geographic_performance_tenant_date ON geographic_performance(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_performance_country ON geographic_performance(tenant_id, country_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_performance_region ON geographic_performance(tenant_id, country_id, region_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_performance_city ON geographic_performance(tenant_id, city, date DESC);

-- AD PERFORMANCE TABLE
-- Tracks individual ad creative performance metrics
CREATE TABLE IF NOT EXISTS ad_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    ad_id TEXT NOT NULL,
    ad_type TEXT, -- 'text_ad', 'responsive_search_ad', 'display_ad', 'video_ad'
    campaign_id TEXT,
    ad_group_id TEXT,
    headline TEXT,
    description TEXT,
    final_url TEXT,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    conversions DECIMAL(10,4) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    ctr DECIMAL(10,6) DEFAULT 0,
    conversion_rate DECIMAL(10,6) DEFAULT 0,
    avg_cpc DECIMAL(10,2) DEFAULT 0,
    avg_position DECIMAL(3,1),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, ad_id, date)
);

-- Indexes for ad_performance
CREATE INDEX IF NOT EXISTS idx_ad_performance_tenant_date ON ad_performance(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_performance_ad_type ON ad_performance(tenant_id, ad_type, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_performance_campaign ON ad_performance(tenant_id, campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_performance_ctr ON ad_performance(tenant_id, ctr DESC, date DESC);

-- CONVERSION VALUES TABLE
-- Tracks conversion value and order value data for ROAS calculation
CREATE TABLE IF NOT EXISTS conversion_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    campaign_id TEXT,
    ad_group_id TEXT,
    keyword TEXT,
    conversion_action TEXT, -- 'purchase', 'signup', 'download', 'lead'
    conversion_value DECIMAL(10,2) DEFAULT 0,
    order_value DECIMAL(10,2) DEFAULT 0,
    conversion_count INTEGER DEFAULT 1,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversion_values
CREATE INDEX IF NOT EXISTS idx_conversion_values_tenant_date ON conversion_values(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_values_campaign ON conversion_values(tenant_id, campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_values_action ON conversion_values(tenant_id, conversion_action, date DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_values_value ON conversion_values(tenant_id, conversion_value DESC, date DESC);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE campaign_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
-- Each tenant can only access their own data

-- Campaign Details Policy
CREATE POLICY campaign_details_policy ON campaign_details
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Device Metrics Policy
CREATE POLICY device_metrics_policy ON device_metrics
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Keyword Performance Policy
CREATE POLICY keyword_performance_policy ON keyword_performance
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Hourly Patterns Policy
CREATE POLICY hourly_patterns_policy ON hourly_patterns
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Geographic Performance Policy
CREATE POLICY geographic_performance_policy ON geographic_performance
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Ad Performance Policy
CREATE POLICY ad_performance_policy ON ad_performance
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Conversion Values Policy
CREATE POLICY conversion_values_policy ON conversion_values
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Foreign Key Constraints for data integrity
-- Note: Using soft foreign keys with campaign_id as TEXT to allow flexibility
-- for different advertising platforms that may have different ID formats

-- Add updated_at triggers for tables with updated_at columns
CREATE TRIGGER update_campaign_details_updated_at
    BEFORE UPDATE ON campaign_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add performance calculation triggers for derived metrics
-- These triggers automatically calculate CTR, conversion rate, and CPC when data is inserted/updated

-- Campaign Details CTR/Conversion Rate Trigger
CREATE OR REPLACE FUNCTION calculate_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be extended to auto-calculate aggregate metrics
    -- For now, it serves as a placeholder for future enhancements
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Device Metrics calculation trigger
CREATE OR REPLACE FUNCTION calculate_device_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    ELSE
        NEW.ctr = 0;
    END IF;

    -- Calculate CPC
    IF NEW.clicks > 0 THEN
        NEW.cpc = (NEW.cost / NEW.clicks);
    ELSE
        NEW.cpc = 0;
    END IF;

    -- Calculate conversion rate
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate = (NEW.conversions / NEW.clicks);
    ELSE
        NEW.conversion_rate = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_device_metrics_trigger
    BEFORE INSERT OR UPDATE ON device_metrics
    FOR EACH ROW EXECUTE FUNCTION calculate_device_metrics();

-- Keyword Performance calculation trigger
CREATE OR REPLACE FUNCTION calculate_keyword_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    ELSE
        NEW.ctr = 0;
    END IF;

    -- Calculate conversion rate
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate = (NEW.conversions / NEW.clicks);
    ELSE
        NEW.conversion_rate = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_keyword_metrics_trigger
    BEFORE INSERT OR UPDATE ON keyword_performance
    FOR EACH ROW EXECUTE FUNCTION calculate_keyword_metrics();

-- Hourly Patterns calculation trigger
CREATE OR REPLACE FUNCTION calculate_hourly_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    ELSE
        NEW.ctr = 0;
    END IF;

    -- Calculate conversion rate
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate = (NEW.conversions / NEW.clicks);
        NEW.avg_cpc = (NEW.cost / NEW.clicks);
    ELSE
        NEW.conversion_rate = 0;
        NEW.avg_cpc = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_hourly_metrics_trigger
    BEFORE INSERT OR UPDATE ON hourly_patterns
    FOR EACH ROW EXECUTE FUNCTION calculate_hourly_metrics();

-- Geographic Performance calculation trigger
CREATE OR REPLACE FUNCTION calculate_geographic_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    ELSE
        NEW.ctr = 0;
    END IF;

    -- Calculate conversion rate
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate = (NEW.conversions / NEW.clicks);
        NEW.avg_cpc = (NEW.cost / NEW.clicks);
    ELSE
        NEW.conversion_rate = 0;
        NEW.avg_cpc = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_geographic_metrics_trigger
    BEFORE INSERT OR UPDATE ON geographic_performance
    FOR EACH ROW EXECUTE FUNCTION calculate_geographic_metrics();

-- Ad Performance calculation trigger
CREATE OR REPLACE FUNCTION calculate_ad_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CTR
    IF NEW.impressions > 0 THEN
        NEW.ctr = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    ELSE
        NEW.ctr = 0;
    END IF;

    -- Calculate conversion rate and CPC
    IF NEW.clicks > 0 THEN
        NEW.conversion_rate = (NEW.conversions / NEW.clicks);
        NEW.avg_cpc = (NEW.cost / NEW.clicks);
    ELSE
        NEW.conversion_rate = 0;
        NEW.avg_cpc = 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_ad_metrics_trigger
    BEFORE INSERT OR UPDATE ON ad_performance
    FOR EACH ROW EXECUTE FUNCTION calculate_ad_metrics();

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_device_metrics_composite ON device_metrics(tenant_id, device_type, date DESC, ctr DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_composite ON keyword_performance(tenant_id, quality_score DESC, ctr DESC, date DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_patterns_composite ON hourly_patterns(tenant_id, hour, day_of_week, conversion_rate DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_performance_composite ON geographic_performance(tenant_id, country_id, conversion_rate DESC, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_performance_composite ON ad_performance(tenant_id, ad_type, ctr DESC, date DESC);

-- Create summary views for dashboard aggregations
CREATE OR REPLACE VIEW dashboard_device_summary AS
SELECT
    tenant_id,
    device_type,
    DATE_TRUNC('week', date) as week,
    SUM(clicks) as total_clicks,
    SUM(impressions) as total_impressions,
    SUM(conversions) as total_conversions,
    SUM(cost) as total_cost,
    AVG(ctr) as avg_ctr,
    AVG(conversion_rate) as avg_conversion_rate,
    CASE WHEN SUM(clicks) > 0 THEN SUM(cost) / SUM(clicks) ELSE 0 END as avg_cpc
FROM device_metrics
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, device_type, DATE_TRUNC('week', date);

CREATE OR REPLACE VIEW dashboard_top_keywords AS
SELECT
    tenant_id,
    keyword,
    match_type,
    SUM(clicks) as total_clicks,
    SUM(impressions) as total_impressions,
    SUM(conversions) as total_conversions,
    SUM(cost) as total_cost,
    AVG(quality_score) as avg_quality_score,
    AVG(ctr) as avg_ctr,
    AVG(conversion_rate) as avg_conversion_rate
FROM keyword_performance
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, keyword, match_type
HAVING SUM(impressions) >= 100  -- Only include keywords with significant traffic
ORDER BY SUM(conversions) DESC, SUM(clicks) DESC;

-- Grant permissions to service role
GRANT ALL ON campaign_details TO service_role;
GRANT ALL ON device_metrics TO service_role;
GRANT ALL ON keyword_performance TO service_role;
GRANT ALL ON hourly_patterns TO service_role;
GRANT ALL ON geographic_performance TO service_role;
GRANT ALL ON ad_performance TO service_role;
GRANT ALL ON conversion_values TO service_role;
GRANT SELECT ON dashboard_device_summary TO service_role;
GRANT SELECT ON dashboard_top_keywords TO service_role;

-- Add table comments for documentation
COMMENT ON TABLE campaign_details IS 'Stores comprehensive campaign configuration and status information for enhanced dashboard analytics';
COMMENT ON TABLE device_metrics IS 'Tracks performance metrics broken down by device type (desktop, mobile, tablet) for device-specific optimization';
COMMENT ON TABLE keyword_performance IS 'Stores detailed keyword-level performance metrics including quality scores and match types';
COMMENT ON TABLE hourly_patterns IS 'Captures performance patterns by hour and day of week for ad scheduling optimization';
COMMENT ON TABLE geographic_performance IS 'Tracks performance by geographic locations for geo-targeting and location-based optimization';
COMMENT ON TABLE ad_performance IS 'Monitors individual ad creative performance including headlines, descriptions, and CTR metrics';
COMMENT ON TABLE conversion_values IS 'Records conversion value and order value data for accurate ROAS calculation and revenue tracking';

-- Migration completion tracking
INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'schema_version_011', json_build_object(
    'version', '011',
    'created_at', NOW(),
    'description', 'Dashboard comprehensive data tables',
    'tables_created', ARRAY[
        'campaign_details',
        'device_metrics',
        'keyword_performance',
        'hourly_patterns',
        'geographic_performance',
        'ad_performance',
        'conversion_values'
    ],
    'views_created', ARRAY[
        'dashboard_device_summary',
        'dashboard_top_keywords'
    ]
))
ON CONFLICT (tenant_id, config_key)
DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Success message
SELECT 'Migration 011: Dashboard Comprehensive Data - SUCCESS!' AS status,
       'Created 7 new tables with RLS policies, indexes, and triggers' AS message,
       'All tables include automatic metric calculations and tenant isolation' AS details;