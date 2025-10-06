-- Traffic Pattern Analysis System Migration
-- Creates tables for storing traffic pattern analysis, predictions, and GA4 data

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS traffic_predictions CASCADE;
DROP TABLE IF EXISTS traffic_anomalies CASCADE;
DROP TABLE IF EXISTS ga4_sync_logs CASCADE;
DROP TABLE IF EXISTS ad_schedule_configs CASCADE;
DROP TABLE IF EXISTS traffic_analysis_cache CASCADE;

-- Traffic Predictions Table
-- Stores ML-based traffic and conversion predictions
CREATE TABLE IF NOT EXISTS traffic_predictions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    prediction_date DATE NOT NULL,
    prediction_type VARCHAR(50) NOT NULL, -- 'daily', 'hourly', 'high_value'
    predicted_conversions DECIMAL(10, 2) DEFAULT 0,
    predicted_cost DECIMAL(10, 2) DEFAULT 0,
    predicted_clicks INTEGER DEFAULT 0,
    efficiency_score DECIMAL(5, 2) DEFAULT 0,
    confidence_level VARCHAR(20), -- 'high', 'medium', 'low'
    confidence_score INTEGER DEFAULT 0,
    hour_of_day INTEGER, -- NULL for daily predictions
    day_of_week VARCHAR(20),
    priority VARCHAR(20), -- 'high', 'medium', 'low'
    metadata JSONB, -- Additional prediction metadata
    model_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for traffic predictions
CREATE INDEX idx_traffic_predictions_tenant ON traffic_predictions(tenant_id);
CREATE INDEX idx_traffic_predictions_date ON traffic_predictions(prediction_date);
CREATE INDEX idx_traffic_predictions_type ON traffic_predictions(prediction_type);
CREATE INDEX idx_traffic_predictions_priority ON traffic_predictions(priority);
CREATE INDEX idx_traffic_predictions_tenant_date ON traffic_predictions(tenant_id, prediction_date);

-- Traffic Anomalies Table
-- Stores detected anomalies in traffic and conversion patterns
CREATE TABLE IF NOT EXISTS traffic_anomalies (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    anomaly_date DATE NOT NULL,
    metric_name VARCHAR(50) NOT NULL, -- 'conversions', 'cost', 'clicks', 'ctr'
    actual_value DECIMAL(10, 2) NOT NULL,
    expected_value DECIMAL(10, 2) NOT NULL,
    deviation_percent DECIMAL(5, 2) NOT NULL,
    z_score DECIMAL(5, 2),
    anomaly_type VARCHAR(20), -- 'spike', 'drop'
    severity VARCHAR(20), -- 'high', 'medium', 'low'
    investigated BOOLEAN DEFAULT FALSE,
    investigation_notes TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for traffic anomalies
CREATE INDEX idx_traffic_anomalies_tenant ON traffic_anomalies(tenant_id);
CREATE INDEX idx_traffic_anomalies_date ON traffic_anomalies(anomaly_date);
CREATE INDEX idx_traffic_anomalies_type ON traffic_anomalies(anomaly_type);
CREATE INDEX idx_traffic_anomalies_severity ON traffic_anomalies(severity);
CREATE INDEX idx_traffic_anomalies_resolved ON traffic_anomalies(resolved);

-- GA4 Sync Logs Table
-- Tracks Google Analytics 4 data synchronization
CREATE TABLE IF NOT EXISTS ga4_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    property_id VARCHAR(255) NOT NULL, -- GA4 property ID
    sync_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'demographics', 'geographics', 'devices'
    sync_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    records_synced INTEGER DEFAULT 0,
    date_range_start DATE,
    date_range_end DATE,
    error_message TEXT,
    sync_duration_ms INTEGER,
    data_snapshot JSONB, -- Summary of synced data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for GA4 sync logs
CREATE INDEX idx_ga4_sync_tenant ON ga4_sync_logs(tenant_id);
CREATE INDEX idx_ga4_sync_property ON ga4_sync_logs(property_id);
CREATE INDEX idx_ga4_sync_status ON ga4_sync_logs(sync_status);
CREATE INDEX idx_ga4_sync_date ON ga4_sync_logs(created_at);

-- Ad Schedule Configs Table
-- Stores automated ad scheduling configurations
CREATE TABLE IF NOT EXISTS ad_schedule_configs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    config_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    schedule_type VARCHAR(50) NOT NULL, -- 'hourly_bid_adjustment', 'dayparting', 'budget_pacing'
    schedule_rules JSONB NOT NULL, -- Array of schedule rules
    bid_adjustments JSONB, -- Bid modifier configurations
    budget_allocation JSONB, -- Budget distribution rules
    performance_thresholds JSONB, -- Trigger thresholds for adjustments
    automation_enabled BOOLEAN DEFAULT FALSE,
    last_applied TIMESTAMP,
    next_evaluation TIMESTAMP,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ad schedule configs
CREATE INDEX idx_ad_schedule_tenant ON ad_schedule_configs(tenant_id);
CREATE INDEX idx_ad_schedule_active ON ad_schedule_configs(is_active);
CREATE INDEX idx_ad_schedule_type ON ad_schedule_configs(schedule_type);
CREATE INDEX idx_ad_schedule_automation ON ad_schedule_configs(automation_enabled);

-- Traffic Analysis Cache Table
-- Caches computed traffic analysis results for performance
CREATE TABLE IF NOT EXISTS traffic_analysis_cache (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    analysis_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'seasonal', 'comprehensive'
    analysis_results JSONB NOT NULL,
    data_range_start DATE,
    data_range_end DATE,
    cache_ttl_seconds INTEGER DEFAULT 21600, -- 6 hours default
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Indexes for traffic analysis cache
CREATE INDEX idx_traffic_cache_tenant ON traffic_analysis_cache(tenant_id);
CREATE INDEX idx_traffic_cache_key ON traffic_analysis_cache(cache_key);
CREATE INDEX idx_traffic_cache_type ON traffic_analysis_cache(analysis_type);
CREATE INDEX idx_traffic_cache_expires ON traffic_analysis_cache(expires_at);
CREATE UNIQUE INDEX idx_traffic_cache_unique ON traffic_analysis_cache(tenant_id, cache_key);

-- Hourly Traffic Metrics Table
-- Stores hourly aggregated metrics for detailed time-based analysis
CREATE TABLE IF NOT EXISTS hourly_traffic_metrics (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    metric_date DATE NOT NULL,
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    sessions INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    conversions DECIMAL(10, 2) DEFAULT 0,
    cost_micros BIGINT DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5, 2),
    avg_session_duration DECIMAL(10, 2),
    engagement_rate DECIMAL(5, 2),
    source VARCHAR(50), -- 'google_ads', 'ga4', 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, metric_date, hour_of_day, source)
);

-- Indexes for hourly traffic metrics
CREATE INDEX idx_hourly_metrics_tenant ON hourly_traffic_metrics(tenant_id);
CREATE INDEX idx_hourly_metrics_date ON hourly_traffic_metrics(metric_date);
CREATE INDEX idx_hourly_metrics_hour ON hourly_traffic_metrics(hour_of_day);
CREATE INDEX idx_hourly_metrics_source ON hourly_traffic_metrics(source);
CREATE INDEX idx_hourly_metrics_tenant_date ON hourly_traffic_metrics(tenant_id, metric_date);

-- Daily Traffic Summary Table
-- Stores daily aggregated traffic summaries
CREATE TABLE IF NOT EXISTS daily_traffic_summary (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    summary_date DATE NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_users INTEGER DEFAULT 0,
    total_conversions DECIMAL(10, 2) DEFAULT 0,
    total_cost DECIMAL(10, 2) DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    avg_conversion_rate DECIMAL(5, 2),
    avg_cpa DECIMAL(10, 2),
    avg_ctr DECIMAL(5, 2),
    efficiency_score DECIMAL(5, 2),
    peak_hour INTEGER,
    peak_hour_conversions DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, summary_date)
);

-- Indexes for daily traffic summary
CREATE INDEX idx_daily_summary_tenant ON daily_traffic_summary(tenant_id);
CREATE INDEX idx_daily_summary_date ON daily_traffic_summary(summary_date);
CREATE INDEX idx_daily_summary_day ON daily_traffic_summary(day_of_week);
CREATE INDEX idx_daily_summary_efficiency ON daily_traffic_summary(efficiency_score);

-- Schedule Performance Tracking Table
-- Tracks actual performance of scheduled ad adjustments
CREATE TABLE IF NOT EXISTS schedule_performance (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    schedule_config_id BIGINT REFERENCES ad_schedule_configs(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    evaluation_period VARCHAR(20), -- 'hourly', 'daily', 'weekly'
    predicted_conversions DECIMAL(10, 2),
    actual_conversions DECIMAL(10, 2),
    predicted_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    accuracy_percent DECIMAL(5, 2),
    roi_improvement DECIMAL(5, 2),
    actions_taken JSONB, -- Log of automated actions
    performance_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for schedule performance
CREATE INDEX idx_schedule_perf_tenant ON schedule_performance(tenant_id);
CREATE INDEX idx_schedule_perf_config ON schedule_performance(schedule_config_id);
CREATE INDEX idx_schedule_perf_date ON schedule_performance(evaluation_date);
CREATE INDEX idx_schedule_perf_accuracy ON schedule_performance(accuracy_percent);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_traffic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_traffic_predictions_timestamp
    BEFORE UPDATE ON traffic_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_traffic_updated_at();

CREATE TRIGGER update_traffic_anomalies_timestamp
    BEFORE UPDATE ON traffic_anomalies
    FOR EACH ROW
    EXECUTE FUNCTION update_traffic_updated_at();

CREATE TRIGGER update_ad_schedule_configs_timestamp
    BEFORE UPDATE ON ad_schedule_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_traffic_updated_at();

CREATE TRIGGER update_hourly_metrics_timestamp
    BEFORE UPDATE ON hourly_traffic_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_traffic_updated_at();

CREATE TRIGGER update_daily_summary_timestamp
    BEFORE UPDATE ON daily_traffic_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_traffic_updated_at();

-- Create view for quick traffic insights
CREATE OR REPLACE VIEW traffic_insights_summary AS
SELECT
    t.tenant_id,
    COUNT(DISTINCT t.prediction_date) as days_with_predictions,
    AVG(t.efficiency_score) as avg_efficiency_score,
    COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_priority_periods,
    COUNT(a.id) as total_anomalies,
    COUNT(CASE WHEN a.anomaly_type = 'spike' THEN 1 END) as positive_anomalies,
    COUNT(CASE WHEN a.anomaly_type = 'drop' THEN 1 END) as negative_anomalies,
    (SELECT COUNT(*) FROM ad_schedule_configs WHERE tenant_id = t.tenant_id AND is_active = true) as active_schedules
FROM
    traffic_predictions t
    LEFT JOIN traffic_anomalies a ON t.tenant_id = a.tenant_id
WHERE
    t.prediction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY
    t.tenant_id;

-- Insert initial data or configuration (optional)
COMMENT ON TABLE traffic_predictions IS 'Stores ML-based traffic and conversion predictions for optimization';
COMMENT ON TABLE traffic_anomalies IS 'Tracks detected anomalies in traffic patterns for investigation';
COMMENT ON TABLE ga4_sync_logs IS 'Logs Google Analytics 4 data synchronization activities';
COMMENT ON TABLE ad_schedule_configs IS 'Manages automated ad scheduling configurations and rules';
COMMENT ON TABLE traffic_analysis_cache IS 'Caches computed traffic analysis results for performance';
COMMENT ON TABLE hourly_traffic_metrics IS 'Stores hourly aggregated metrics for time-based analysis';
COMMENT ON TABLE daily_traffic_summary IS 'Daily summaries of traffic performance';
COMMENT ON TABLE schedule_performance IS 'Tracks performance and accuracy of automated schedules';

-- Grant permissions (adjust based on your application user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO adsautopilot_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO adsautopilot_app;

-- Migration complete
SELECT 'Traffic Pattern Analysis migration completed successfully' AS status;