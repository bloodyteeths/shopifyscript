-- =====================================================
-- Migration 010: Dashboard Views
-- Created: 2025-09-28
-- Description: Optimized dashboard views for performance
--              Combines data from competitor intelligence,
--              website content, and traffic patterns
-- =====================================================

-- Executive Dashboard Summary View
-- Provides high-level metrics for tenant dashboard
CREATE OR REPLACE VIEW executive_dashboard_summary AS
SELECT
    cp.tenant_id,

    -- Competitor Intelligence Metrics
    COUNT(DISTINCT cp.id) as total_competitors,
    COUNT(DISTINCT CASE WHEN cp.threat_level = 'high' THEN cp.id END) as high_threat_competitors,
    COUNT(DISTINCT cc.id) as recent_competitor_changes,
    COUNT(DISTINCT ca.id) as competitor_ads_tracked,

    -- Website Content Metrics
    COUNT(DISTINCT wc.id) as websites_scraped,
    COUNT(DISTINCT ci.id) as content_items_indexed,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'offer' AND (ci.expires_at IS NULL OR ci.expires_at > NOW()) THEN ci.id END) as active_offers,

    -- Traffic Pattern Metrics
    COALESCE(AVG(tp.efficiency_score), 0) as avg_efficiency_score,
    COUNT(DISTINCT ta.id) as traffic_anomalies_detected,
    COUNT(DISTINCT asc.id) as active_ad_schedules,

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
LEFT JOIN ad_schedule_configs asc ON cp.tenant_id = asc.tenant_id
    AND asc.is_active = true
GROUP BY cp.tenant_id;

-- Competitor Intelligence Dashboard View
-- Detailed competitor tracking and analysis
CREATE OR REPLACE VIEW competitor_intelligence_dashboard AS
SELECT
    cp.tenant_id,
    cp.id as competitor_id,
    cp.competitor_name,
    cp.domain,
    cp.threat_level,
    cp.market_position,
    cp.last_analyzed,

    -- Recent Activity Metrics
    COUNT(DISTINCT cc.id) as changes_last_30_days,
    COUNT(DISTINCT ca.id) as total_ads_tracked,
    MAX(cc.detected_at) as last_change_detected,
    MAX(ca.last_seen) as last_ad_seen,

    -- Ad Intelligence Metrics
    AVG(ca.engagement_score) as avg_ad_engagement,
    COUNT(DISTINCT CASE WHEN ca.engagement_score >= 70 THEN ca.id END) as high_performing_ads,

    -- Change Significance Distribution
    COUNT(CASE WHEN cc.significance = 'high' THEN 1 END) as high_significance_changes,
    COUNT(CASE WHEN cc.significance = 'medium' THEN 1 END) as medium_significance_changes,
    COUNT(CASE WHEN cc.significance = 'low' THEN 1 END) as low_significance_changes,

    -- Most Recent Changes (JSON aggregation)
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'change_type', cc.change_type,
                'significance', cc.significance,
                'detected_at', cc.detected_at,
                'description', cc.description
            ) ORDER BY cc.detected_at DESC
        ) FILTER (WHERE cc.id IS NOT NULL AND cc.detected_at >= NOW() - INTERVAL '7 days'),
        '[]'::json
    ) as recent_changes,

    -- Top Performing Ads (JSON aggregation)
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'headline', ca.headline,
                'engagement_score', ca.engagement_score,
                'patterns', ca.patterns,
                'last_seen', ca.last_seen
            ) ORDER BY ca.engagement_score DESC
        ) FILTER (WHERE ca.id IS NOT NULL AND ca.engagement_score >= 70),
        '[]'::json
    ) as top_ads

FROM competitor_profiles cp
LEFT JOIN competitor_changes cc ON cp.id = cc.competitor_id
    AND cc.detected_at >= NOW() - INTERVAL '30 days'
LEFT JOIN competitor_ads ca ON cp.id = ca.competitor_id
GROUP BY cp.tenant_id, cp.id, cp.competitor_name, cp.domain, cp.threat_level, cp.market_position, cp.last_analyzed
ORDER BY cp.threat_level = 'high' DESC, COUNT(DISTINCT cc.id) DESC;

-- Content Intelligence Dashboard View
-- Website content analysis and optimization insights
CREATE OR REPLACE VIEW content_intelligence_dashboard AS
SELECT
    wc.tenant_id,
    wc.url,
    wc.pages_scraped,
    wc.scraped_at,

    -- Content Distribution
    COUNT(DISTINCT ci.id) as total_content_items,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'product' THEN ci.id END) as products_found,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'testimonial' THEN ci.id END) as testimonials_found,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'offer' THEN ci.id END) as offers_found,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'usp' THEN ci.id END) as usps_found,
    COUNT(DISTINCT CASE WHEN ci.content_type = 'cta' THEN ci.id END) as ctas_found,

    -- Active vs Expired Content
    COUNT(DISTINCT CASE
        WHEN ci.content_type = 'offer' AND (ci.expires_at IS NULL OR ci.expires_at > NOW())
        THEN ci.id
    END) as active_offers,
    COUNT(DISTINCT CASE
        WHEN ci.content_type = 'offer' AND ci.expires_at <= NOW()
        THEN ci.id
    END) as expired_offers,

    -- Content Freshness
    MAX(ci.indexed_at) as last_content_indexed,
    EXTRACT(DAY FROM (NOW() - MAX(ci.indexed_at))) as days_since_last_index,

    -- Content Quality Indicators
    AVG(ARRAY_LENGTH(ci.tags, 1)) as avg_tags_per_item,
    COUNT(DISTINCT CASE WHEN ARRAY_LENGTH(ci.tags, 1) >= 3 THEN ci.id END) as well_tagged_items,

    -- Most Common Tags (top 5)
    COALESCE(
        (SELECT JSON_AGG(tag_data ORDER BY tag_count DESC)
         FROM (
             SELECT UNNEST(ci.tags) as tag_name, COUNT(*) as tag_count
             FROM content_index ci2
             WHERE ci2.tenant_id = wc.tenant_id AND ci2.website_url = wc.url
             GROUP BY UNNEST(ci.tags)
             ORDER BY COUNT(*) DESC
             LIMIT 5
         ) tag_data),
        '[]'::json
    ) as top_tags,

    -- Content Freshness Status
    CASE
        WHEN wc.scraped_at < NOW() - INTERVAL '30 days' THEN 'stale'
        WHEN wc.scraped_at < NOW() - INTERVAL '7 days' THEN 'aging'
        ELSE 'fresh'
    END as content_status

FROM website_content wc
LEFT JOIN content_index ci ON wc.tenant_id = ci.tenant_id AND wc.url = ci.website_url
GROUP BY wc.tenant_id, wc.url, wc.pages_scraped, wc.scraped_at
ORDER BY wc.scraped_at DESC;

-- Traffic Performance Dashboard View
-- Traffic analysis and optimization insights
CREATE OR REPLACE VIEW traffic_performance_dashboard AS
SELECT
    tp.tenant_id,

    -- Prediction Accuracy Metrics
    COUNT(DISTINCT tp.prediction_date) as days_with_predictions,
    AVG(tp.efficiency_score) as avg_efficiency_score,
    AVG(tp.confidence_score) as avg_confidence_score,

    -- Performance Distribution
    COUNT(CASE WHEN tp.priority = 'high' THEN 1 END) as high_priority_periods,
    COUNT(CASE WHEN tp.priority = 'medium' THEN 1 END) as medium_priority_periods,
    COUNT(CASE WHEN tp.priority = 'low' THEN 1 END) as low_priority_periods,

    -- Predictions vs Actuals (where available)
    AVG(tp.predicted_conversions) as avg_predicted_conversions,
    AVG(tp.predicted_cost) as avg_predicted_cost,
    AVG(tp.predicted_clicks) as avg_predicted_clicks,

    -- Anomaly Detection
    COUNT(DISTINCT ta.id) as total_anomalies,
    COUNT(CASE WHEN ta.anomaly_type = 'spike' THEN 1 END) as positive_anomalies,
    COUNT(CASE WHEN ta.anomaly_type = 'drop' THEN 1 END) as negative_anomalies,
    COUNT(CASE WHEN ta.severity = 'high' THEN 1 END) as high_severity_anomalies,
    COUNT(CASE WHEN ta.resolved = false THEN 1 END) as unresolved_anomalies,

    -- Schedule Performance
    COUNT(DISTINCT asc.id) as total_schedules,
    COUNT(DISTINCT CASE WHEN asc.is_active = true THEN asc.id END) as active_schedules,
    COUNT(DISTINCT CASE WHEN asc.automation_enabled = true THEN asc.id END) as automated_schedules,

    -- Recent Performance Trends
    MAX(tp.created_at) as last_prediction_date,
    MAX(ta.anomaly_date) as last_anomaly_date,

    -- Traffic Insights Summary
    CASE
        WHEN AVG(tp.efficiency_score) >= 80 THEN 'excellent'
        WHEN AVG(tp.efficiency_score) >= 60 THEN 'good'
        WHEN AVG(tp.efficiency_score) >= 40 THEN 'fair'
        ELSE 'poor'
    END as overall_performance,

    CASE
        WHEN COUNT(CASE WHEN ta.resolved = false AND ta.severity = 'high' THEN 1 END) > 0 THEN 'critical'
        WHEN COUNT(CASE WHEN ta.resolved = false THEN 1 END) > 5 THEN 'attention_needed'
        ELSE 'stable'
    END as anomaly_status

FROM traffic_predictions tp
LEFT JOIN traffic_anomalies ta ON tp.tenant_id = ta.tenant_id
    AND ta.anomaly_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN ad_schedule_configs asc ON tp.tenant_id = asc.tenant_id
WHERE tp.prediction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tp.tenant_id;

-- SERP Intelligence Dashboard View
-- Search engine positioning and competitive analysis
CREATE OR REPLACE VIEW serp_intelligence_dashboard AS
SELECT
    sp.tenant_id,

    -- Position Tracking
    COUNT(DISTINCT sp.keyword) as keywords_tracked,
    COUNT(DISTINCT sp.date) as tracking_days,
    AVG(sp.our_position) FILTER (WHERE sp.our_position IS NOT NULL) as avg_our_position,
    COUNT(CASE WHEN sp.our_position <= 3 THEN 1 END) as top_3_positions,
    COUNT(CASE WHEN sp.our_position <= 8 THEN 1 END) as page_1_positions,

    -- Visibility Metrics
    AVG(sp.visibility_score) as avg_visibility_score,
    MAX(sp.visibility_score) as peak_visibility_score,
    MIN(sp.visibility_score) as lowest_visibility_score,

    -- Competition Analysis
    AVG(sp.total_ads) as avg_total_ads,
    AVG(sp.bid_estimate) FILTER (WHERE sp.bid_estimate > 0) as avg_estimated_bid,

    -- Performance by Device/Location
    COUNT(CASE WHEN sp.device = 'mobile' THEN 1 END) as mobile_tracked,
    COUNT(CASE WHEN sp.device = 'desktop' THEN 1 END) as desktop_tracked,

    -- Recent Performance
    MAX(sp.date) as last_tracked_date,
    EXTRACT(DAY FROM (CURRENT_DATE - MAX(sp.date))) as days_since_last_track,

    -- Position Distribution (last 7 days)
    AVG(sp.our_position) FILTER (
        WHERE sp.our_position IS NOT NULL
        AND sp.date >= CURRENT_DATE - INTERVAL '7 days'
    ) as recent_avg_position,

    -- Top Keywords (based on visibility)
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'keyword', sp.keyword,
                'our_position', sp.our_position,
                'visibility_score', sp.visibility_score,
                'date', sp.date
            ) ORDER BY sp.visibility_score DESC
        ) FILTER (WHERE sp.date >= CURRENT_DATE - INTERVAL '7 days'),
        '[]'::json
    ) as top_performing_keywords

FROM serp_positions sp
WHERE sp.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY sp.tenant_id
ORDER BY AVG(sp.visibility_score) DESC;

-- Real-time Activity Feed View
-- Combined activity feed for dashboard notifications
CREATE OR REPLACE VIEW activity_feed_dashboard AS
(
    -- Competitor Changes
    SELECT
        cc.tenant_id,
        'competitor_change' as activity_type,
        cc.detected_at as activity_timestamp,
        'high' as priority,
        JSON_BUILD_OBJECT(
            'competitor_name', cp.competitor_name,
            'change_type', cc.change_type,
            'significance', cc.significance,
            'description', cc.description
        ) as activity_data
    FROM competitor_changes cc
    JOIN competitor_profiles cp ON cc.competitor_id = cp.id
    WHERE cc.detected_at >= NOW() - INTERVAL '7 days'
      AND cc.significance IN ('high', 'medium')
)
UNION ALL
(
    -- Traffic Anomalies
    SELECT
        ta.tenant_id,
        'traffic_anomaly' as activity_type,
        ta.created_at as activity_timestamp,
        CASE ta.severity
            WHEN 'high' THEN 'high'
            WHEN 'medium' THEN 'medium'
            ELSE 'low'
        END as priority,
        JSON_BUILD_OBJECT(
            'metric_name', ta.metric_name,
            'anomaly_type', ta.anomaly_type,
            'severity', ta.severity,
            'deviation_percent', ta.deviation_percent
        ) as activity_data
    FROM traffic_anomalies ta
    WHERE ta.anomaly_date >= CURRENT_DATE - INTERVAL '7 days'
      AND ta.resolved = false
)
UNION ALL
(
    -- New Content Discoveries
    SELECT
        ci.tenant_id,
        'content_discovery' as activity_type,
        ci.indexed_at as activity_timestamp,
        'medium' as priority,
        JSON_BUILD_OBJECT(
            'content_type', ci.content_type,
            'title', ci.title,
            'website_url', ci.website_url,
            'tags', ci.tags
        ) as activity_data
    FROM content_index ci
    WHERE ci.indexed_at >= NOW() - INTERVAL '7 days'
      AND ci.content_type IN ('offer', 'product', 'testimonial')
)
ORDER BY activity_timestamp DESC
LIMIT 100;

-- Comments for documentation
COMMENT ON VIEW executive_dashboard_summary IS 'High-level executive dashboard metrics across all intelligence modules';
COMMENT ON VIEW competitor_intelligence_dashboard IS 'Detailed competitor tracking and analysis dashboard';
COMMENT ON VIEW content_intelligence_dashboard IS 'Website content analysis and optimization insights';
COMMENT ON VIEW traffic_performance_dashboard IS 'Traffic analysis and performance optimization dashboard';
COMMENT ON VIEW serp_intelligence_dashboard IS 'Search engine positioning and competitive SERP analysis';
COMMENT ON VIEW activity_feed_dashboard IS 'Real-time activity feed for dashboard notifications';

-- Create indexes on commonly filtered columns for better performance
CREATE INDEX IF NOT EXISTS idx_competitor_changes_detected_at_filtered
    ON competitor_changes(detected_at)
    WHERE detected_at >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_traffic_predictions_date_filtered
    ON traffic_predictions(prediction_date)
    WHERE prediction_date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_traffic_anomalies_date_filtered
    ON traffic_anomalies(anomaly_date)
    WHERE anomaly_date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_content_index_indexed_at_filtered
    ON content_index(indexed_at)
    WHERE indexed_at >= NOW() - INTERVAL '7 days';

-- Grant permissions for dashboard access
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO dashboard_role;
-- GRANT SELECT ON executive_dashboard_summary TO dashboard_role;
-- GRANT SELECT ON competitor_intelligence_dashboard TO dashboard_role;
-- GRANT SELECT ON content_intelligence_dashboard TO dashboard_role;
-- GRANT SELECT ON traffic_performance_dashboard TO dashboard_role;
-- GRANT SELECT ON serp_intelligence_dashboard TO dashboard_role;
-- GRANT SELECT ON activity_feed_dashboard TO dashboard_role;

-- Migration complete
SELECT 'Migration 010: Dashboard Views - COMPLETE' AS status;