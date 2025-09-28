-- =====================================================
-- Migration 010: Dashboard Views (FINAL)
-- Created: 2025-09-28
-- Description: Optimized views for AI Dashboard
-- Fixed: Added missing columns to tables before creating views
-- =====================================================

-- First, ensure all required columns exist in the tables
DO $$
BEGIN
    -- Add missing columns to content_extraction_log if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'content_extraction_log'
                   AND column_name = 'completed_at') THEN
        ALTER TABLE content_extraction_log ADD COLUMN completed_at TIMESTAMP;
    END IF;

    -- Add missing columns to website_content if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'website_content'
                   AND column_name = 'scraped_at') THEN
        ALTER TABLE website_content ADD COLUMN scraped_at TIMESTAMP DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'website_content'
                   AND column_name = 'content_type') THEN
        ALTER TABLE website_content ADD COLUMN content_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'website_content'
                   AND column_name = 'quality_score') THEN
        ALTER TABLE website_content ADD COLUMN quality_score DECIMAL(3,2);
    END IF;

    -- Add missing columns to content_index if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'content_index'
                   AND column_name = 'expires_at') THEN
        ALTER TABLE content_index ADD COLUMN expires_at TIMESTAMP;
    END IF;

    -- Add missing columns to traffic_predictions if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'prediction_date') THEN
        ALTER TABLE traffic_predictions ADD COLUMN prediction_date DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'predicted_clicks') THEN
        ALTER TABLE traffic_predictions ADD COLUMN predicted_clicks INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'predicted_impressions') THEN
        ALTER TABLE traffic_predictions ADD COLUMN predicted_impressions INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'predicted_ctr') THEN
        ALTER TABLE traffic_predictions ADD COLUMN predicted_ctr DECIMAL(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'predicted_conversions') THEN
        ALTER TABLE traffic_predictions ADD COLUMN predicted_conversions INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'confidence_score') THEN
        ALTER TABLE traffic_predictions ADD COLUMN confidence_score DECIMAL(3,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_predictions'
                   AND column_name = 'efficiency_score') THEN
        ALTER TABLE traffic_predictions ADD COLUMN efficiency_score DECIMAL(3,2);
    END IF;

    -- Add missing columns to traffic_patterns if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_patterns'
                   AND column_name = 'date') THEN
        ALTER TABLE traffic_patterns ADD COLUMN date DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_patterns'
                   AND column_name = 'clicks') THEN
        ALTER TABLE traffic_patterns ADD COLUMN clicks INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_patterns'
                   AND column_name = 'impressions') THEN
        ALTER TABLE traffic_patterns ADD COLUMN impressions INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_patterns'
                   AND column_name = 'ctr') THEN
        ALTER TABLE traffic_patterns ADD COLUMN ctr DECIMAL(5,2);
    END IF;

    -- Add missing columns to traffic_anomalies if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_anomalies'
                   AND column_name = 'detected_at') THEN
        ALTER TABLE traffic_anomalies ADD COLUMN detected_at TIMESTAMP DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traffic_anomalies'
                   AND column_name = 'description') THEN
        ALTER TABLE traffic_anomalies ADD COLUMN description TEXT;
    END IF;

    -- Add missing columns to ad_schedule_configs if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_schedule_configs'
                   AND column_name = 'is_active') THEN
        ALTER TABLE ad_schedule_configs ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_schedule_configs'
                   AND column_name = 'peak_hours') THEN
        ALTER TABLE ad_schedule_configs ADD COLUMN peak_hours JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'ad_schedule_configs'
                   AND column_name = 'bid_adjustment_percentage') THEN
        ALTER TABLE ad_schedule_configs ADD COLUMN bid_adjustment_percentage DECIMAL(5,2);
    END IF;
END
$$;

-- Drop existing views if they exist
DROP VIEW IF EXISTS dashboard_executive_summary CASCADE;
DROP VIEW IF EXISTS dashboard_competitor_intelligence CASCADE;
DROP VIEW IF EXISTS dashboard_content_insights CASCADE;
DROP VIEW IF EXISTS dashboard_traffic_overview CASCADE;
DROP VIEW IF EXISTS dashboard_serp_performance CASCADE;
DROP VIEW IF EXISTS dashboard_recent_activity CASCADE;

-- 1. Executive Summary View - High-level metrics for dashboard
CREATE VIEW dashboard_executive_summary AS
SELECT
    cp.tenant_id,

    -- Competitor Metrics
    COUNT(DISTINCT cp.id) as total_competitors,
    COUNT(DISTINCT CASE WHEN cp.threat_level = 'high' THEN cp.id END) as high_threat_competitors,
    COUNT(DISTINCT cc.id) as competitor_changes_30d,
    COUNT(DISTINCT ca.id) as competitor_ads_tracked,

    -- Website Content Metrics
    COUNT(DISTINCT wc.id) as websites_scraped,
    COUNT(DISTINCT ci.id) as content_items_indexed,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'offer' AND (ci.expires_at IS NULL OR ci.expires_at > NOW()) THEN ci.id END) as active_offers,

    -- Traffic Pattern Metrics
    COALESCE(AVG(tp.efficiency_score), 0) as avg_efficiency_score,
    COUNT(DISTINCT ta.id) as traffic_anomalies_detected,
    COUNT(DISTINCT asc_config.id) as active_ad_schedules,

    -- Activity Timestamps
    MAX(cp.last_analyzed) as last_competitor_analysis,
    MAX(wc.scraped_at) as last_content_scrape,
    MAX(tp.created_at) as last_traffic_prediction,

    -- Performance Indicators
    CASE
        WHEN COUNT(DISTINCT CASE WHEN cp.threat_level = 'high' THEN cp.id END) > 5 THEN 'high_threat'
        WHEN COUNT(DISTINCT CASE WHEN cp.threat_level = 'high' THEN cp.id END) > 2 THEN 'medium_threat'
        ELSE 'low_threat'
    END as threat_assessment,

    CASE
        WHEN MAX(wc.scraped_at) < NOW() - INTERVAL '7 days' THEN 'stale'
        WHEN MAX(wc.scraped_at) < NOW() - INTERVAL '3 days' THEN 'aging'
        ELSE 'fresh'
    END as content_freshness

FROM competitor_profiles cp
LEFT JOIN competitor_changes cc ON cp.id = cc.competitor_id
    AND cc.detected_at >= NOW() - INTERVAL '30 days'
LEFT JOIN competitor_ads ca ON cp.id = ca.competitor_id
LEFT JOIN website_content wc ON cp.tenant_id = wc.tenant_id
LEFT JOIN content_index ci ON cp.tenant_id = ci.tenant_id
LEFT JOIN traffic_predictions tp ON cp.tenant_id = tp.tenant_id
    AND tp.prediction_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN traffic_anomalies ta ON cp.tenant_id = ta.tenant_id
    AND ta.anomaly_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN ad_schedule_configs asc_config ON cp.tenant_id = asc_config.tenant_id
    AND asc_config.is_active = true
GROUP BY cp.tenant_id;

-- 2. Competitor Intelligence View - Detailed competitor analysis
CREATE VIEW dashboard_competitor_intelligence AS
SELECT
    cp.tenant_id,
    cp.id as competitor_id,
    cp.competitor_name,
    cp.domain,
    cp.threat_level,
    cp.market_position,
    cp.last_analyzed,

    -- Recent Changes
    COUNT(DISTINCT cc.id) as changes_7d,
    STRING_AGG(DISTINCT cc.change_type, ', ' ORDER BY cc.change_type) as recent_change_types,
    MAX(cc.detected_at) as latest_change_detected,

    -- Ad Intelligence
    COUNT(DISTINCT ca.id) as total_ads,
    COUNT(DISTINCT CASE WHEN ca.last_seen >= NOW() - INTERVAL '7 days' THEN ca.id END) as active_ads,
    AVG(ca.engagement_score) as avg_engagement_score,

    -- SERP Competition
    COUNT(DISTINCT sp.keyword) as keywords_competing,
    AVG(sp.our_position) as avg_our_position,
    AVG((sp.competitor_positions->cp.competitor_name->>'position')::NUMERIC) as avg_competitor_position,

    -- Market Gaps
    cp.strengths,
    CASE
        WHEN COUNT(DISTINCT cc.id) > 10 THEN 'very_active'
        WHEN COUNT(DISTINCT cc.id) > 5 THEN 'active'
        WHEN COUNT(DISTINCT cc.id) > 0 THEN 'moderate'
        ELSE 'inactive'
    END as activity_level

FROM competitor_profiles cp
LEFT JOIN competitor_changes cc ON cp.id = cc.competitor_id
    AND cc.detected_at >= NOW() - INTERVAL '7 days'
LEFT JOIN competitor_ads ca ON cp.id = ca.competitor_id
LEFT JOIN serp_positions sp ON cp.tenant_id = sp.tenant_id
    AND sp.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY cp.id, cp.tenant_id, cp.competitor_name, cp.domain,
         cp.threat_level, cp.market_position, cp.last_analyzed, cp.strengths;

-- 3. Content Insights View - Website content analysis (SIMPLIFIED)
CREATE VIEW dashboard_content_insights AS
SELECT
    wc.tenant_id,
    wc.url,
    wc.domain,
    wc.content_type,
    COALESCE(wc.scraped_at, wc.last_scraped, wc.created_at) as scraped_at,
    wc.quality_score,

    -- Content Richness
    jsonb_array_length(COALESCE(wc.products, '[]'::jsonb)) as product_count,
    jsonb_array_length(COALESCE(wc.usps, '[]'::jsonb)) as usp_count,
    jsonb_array_length(COALESCE(wc.testimonials, '[]'::jsonb)) as testimonial_count,
    jsonb_array_length(COALESCE(wc.offers, '[]'::jsonb)) as offer_count,

    -- Indexed Content
    COUNT(DISTINCT ci.id) as indexed_items,
    AVG(ci.relevance_score) as avg_relevance_score,
    SUM(ci.usage_count) as total_usage_count,

    -- Content Performance
    MAX(ci.performance_score) as best_performing_score,
    COUNT(DISTINCT CASE WHEN ci.performance_score > 0.7 THEN ci.id END) as high_performing_items,

    -- Freshness Indicator
    CASE
        WHEN COALESCE(wc.scraped_at, wc.last_scraped, wc.created_at) < NOW() - INTERVAL '30 days' THEN 'stale'
        WHEN COALESCE(wc.scraped_at, wc.last_scraped, wc.created_at) < NOW() - INTERVAL '7 days' THEN 'aging'
        ELSE 'fresh'
    END as freshness_status,

    -- Extraction Metrics (simplified - handle missing completed_at)
    el.pages_scraped,
    el.items_extracted,
    el.extraction_duration_minutes,
    el.status as last_extraction_status

FROM website_content wc
LEFT JOIN content_index ci ON wc.id = ci.website_content_id
LEFT JOIN (
    SELECT
        tenant_id,
        url,
        MAX(pages_scraped) as pages_scraped,
        MAX(items_extracted) as items_extracted,
        -- Handle missing completed_at column
        MAX(
            CASE
                WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
                THEN EXTRACT(EPOCH FROM (completed_at - started_at))/60
                ELSE NULL
            END
        ) as extraction_duration_minutes,
        MAX(status) as status
    FROM content_extraction_log
    GROUP BY tenant_id, url
) el ON wc.tenant_id = el.tenant_id AND wc.url = el.url
GROUP BY wc.id, wc.tenant_id, wc.url, wc.domain, wc.content_type,
         wc.scraped_at, wc.last_scraped, wc.created_at, wc.quality_score, wc.products, wc.usps,
         wc.testimonials, wc.offers, el.pages_scraped, el.items_extracted,
         el.extraction_duration_minutes, el.status;

-- 4. Traffic Overview View - Traffic patterns and predictions
CREATE VIEW dashboard_traffic_overview AS
SELECT
    tp.tenant_id,
    tp.prediction_date,
    tp.predicted_clicks,
    tp.predicted_impressions,
    tp.predicted_ctr,
    tp.predicted_conversions,
    tp.confidence_score,
    tp.efficiency_score,

    -- Historical Comparison
    ht.avg_clicks_7d,
    ht.avg_impressions_7d,
    ht.avg_ctr_7d,

    -- Performance vs Prediction
    CASE
        WHEN tp.predicted_clicks > ht.avg_clicks_7d * 1.2 THEN 'growth_expected'
        WHEN tp.predicted_clicks < ht.avg_clicks_7d * 0.8 THEN 'decline_expected'
        ELSE 'stable'
    END as trend,

    -- Anomalies
    ta.anomaly_count_7d,
    ta.latest_anomaly_type,
    ta.latest_anomaly_date,

    -- Ad Scheduling
    asc_config.schedule_count,
    asc_config.peak_hours,
    asc_config.optimization_potential

FROM traffic_predictions tp
LEFT JOIN (
    SELECT
        tenant_id,
        AVG(clicks) as avg_clicks_7d,
        AVG(impressions) as avg_impressions_7d,
        AVG(ctr) as avg_ctr_7d
    FROM traffic_patterns
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY tenant_id
) ht ON tp.tenant_id = ht.tenant_id
LEFT JOIN (
    SELECT
        tenant_id,
        COUNT(*) as anomaly_count_7d,
        MAX(anomaly_type) as latest_anomaly_type,
        MAX(anomaly_date) as latest_anomaly_date
    FROM traffic_anomalies
    WHERE anomaly_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY tenant_id
) ta ON tp.tenant_id = ta.tenant_id
LEFT JOIN (
    SELECT
        tenant_id,
        COUNT(*) as schedule_count,
        STRING_AGG(DISTINCT peak_hours::TEXT, ', ') as peak_hours,
        MAX(bid_adjustment_percentage) as optimization_potential
    FROM ad_schedule_configs
    WHERE is_active = true
    GROUP BY tenant_id
) asc_config ON tp.tenant_id = asc_config.tenant_id
WHERE tp.prediction_date >= CURRENT_DATE;

-- 5. SERP Performance View - Search position tracking
CREATE VIEW dashboard_serp_performance AS
SELECT
    sp.tenant_id,
    sp.date,
    sp.keyword,
    sp.location,
    sp.device,
    sp.our_position,
    sp.visibility_score,
    sp.total_ads,
    sp.bid_estimate,

    -- Competitor Analysis
    jsonb_array_length(sp.competitor_positions) as competitors_count,
    (SELECT MIN((value->>'position')::INT)
     FROM jsonb_array_elements(sp.competitor_positions)
     WHERE value->>'position' IS NOT NULL) as best_competitor_position,

    -- SERP Features
    sp.serp_features,
    jsonb_array_length(COALESCE(sp.serp_features, '[]'::jsonb)) as feature_count,

    -- Position Changes
    prev.our_position as previous_position,
    sp.our_position - COALESCE(prev.our_position, sp.our_position) as position_change,

    -- Performance Classification
    CASE
        WHEN sp.our_position <= 3 THEN 'top_3'
        WHEN sp.our_position <= 8 THEN 'first_page'
        WHEN sp.our_position IS NULL THEN 'not_showing'
        ELSE 'beyond_first_page'
    END as position_tier,

    CASE
        WHEN sp.visibility_score >= 80 THEN 'excellent'
        WHEN sp.visibility_score >= 60 THEN 'good'
        WHEN sp.visibility_score >= 40 THEN 'fair'
        ELSE 'poor'
    END as visibility_rating

FROM serp_positions sp
LEFT JOIN LATERAL (
    SELECT our_position
    FROM serp_positions sp2
    WHERE sp2.tenant_id = sp.tenant_id
    AND sp2.keyword = sp.keyword
    AND sp2.location = sp.location
    AND sp2.device = sp.device
    AND sp2.date = sp.date - INTERVAL '1 day'
    LIMIT 1
) prev ON true
WHERE sp.date >= CURRENT_DATE - INTERVAL '30 days';

-- 6. Recent Activity View - Latest system events (SIMPLIFIED)
CREATE VIEW dashboard_recent_activity AS
WITH recent_events AS (
    -- Competitor changes
    SELECT
        tenant_id,
        'competitor_change' as event_type,
        competitor_id::TEXT as entity_id,
        change_type as event_subtype,
        description as event_description,
        significance as event_significance,
        detected_at as event_timestamp
    FROM competitor_changes
    WHERE detected_at >= NOW() - INTERVAL '24 hours'

    UNION ALL

    -- Content extractions (handle missing completed_at)
    SELECT
        tenant_id,
        'content_extraction' as event_type,
        url as entity_id,
        extraction_type as event_subtype,
        status || ' - ' || COALESCE(items_extracted::TEXT || ' items', '0 items') as event_description,
        CASE
            WHEN items_extracted > 50 THEN 'high'
            WHEN items_extracted > 20 THEN 'medium'
            ELSE 'low'
        END as event_significance,
        COALESCE(completed_at, started_at) as event_timestamp
    FROM content_extraction_log
    WHERE COALESCE(completed_at, started_at) >= NOW() - INTERVAL '24 hours'

    UNION ALL

    -- Traffic anomalies (handle missing detected_at)
    SELECT
        tenant_id,
        'traffic_anomaly' as event_type,
        anomaly_type as entity_id,
        severity as event_subtype,
        COALESCE(description, 'Traffic anomaly detected') as event_description,
        severity as event_significance,
        COALESCE(detected_at, created_at) as event_timestamp
    FROM traffic_anomalies
    WHERE COALESCE(detected_at, created_at) >= NOW() - INTERVAL '24 hours'

    UNION ALL

    -- New competitor ads
    SELECT
        ca.tenant_id,
        'new_competitor_ad' as event_type,
        ca.competitor_id::TEXT as entity_id,
        ca.ad_format as event_subtype,
        LEFT(ca.headline, 100) as event_description,
        CASE
            WHEN ca.engagement_score > 0.8 THEN 'high'
            WHEN ca.engagement_score > 0.5 THEN 'medium'
            ELSE 'low'
        END as event_significance,
        ca.first_seen as event_timestamp
    FROM competitor_ads ca
    WHERE ca.first_seen >= NOW() - INTERVAL '24 hours'
)
SELECT
    tenant_id,
    event_type,
    entity_id,
    event_subtype,
    event_description,
    event_significance,
    event_timestamp,
    EXTRACT(EPOCH FROM (NOW() - event_timestamp))/3600 as hours_ago
FROM recent_events
WHERE event_timestamp IS NOT NULL
ORDER BY event_timestamp DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dashboard_competitor_tenant
    ON competitor_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_changes_detected
    ON competitor_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_serp_date
    ON serp_positions(date DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_traffic_date
    ON traffic_predictions(prediction_date DESC);

-- Create index on website_content - handle both possible column names
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'website_content'
               AND column_name = 'scraped_at') THEN
        CREATE INDEX IF NOT EXISTS idx_dashboard_content_scraped
            ON website_content(scraped_at DESC);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'website_content'
                  AND column_name = 'last_scraped') THEN
        CREATE INDEX IF NOT EXISTS idx_dashboard_content_scraped
            ON website_content(last_scraped DESC);
    END IF;
END
$$;

-- Grant permissions
GRANT SELECT ON dashboard_executive_summary TO service_role;
GRANT SELECT ON dashboard_competitor_intelligence TO service_role;
GRANT SELECT ON dashboard_content_insights TO service_role;
GRANT SELECT ON dashboard_traffic_overview TO service_role;
GRANT SELECT ON dashboard_serp_performance TO service_role;
GRANT SELECT ON dashboard_recent_activity TO service_role;

-- Success message
SELECT 'Migration 010: Dashboard Views (FINAL) - COMPLETE' AS status;