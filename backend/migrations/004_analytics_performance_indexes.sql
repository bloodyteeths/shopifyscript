-- Analytics Performance Optimization Indexes
-- Implements tier-based database optimizations for real-time analytics

-- ==================================================
-- STARTER TIER OPTIMIZATIONS
-- Basic indexes for essential query patterns
-- ==================================================

-- Basic date-based queries for METRICS table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_date_campaign 
ON METRICS (date, campaign) 
WHERE date IS NOT NULL AND campaign IS NOT NULL;

-- Basic date-based queries for SEARCH_TERMS table  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_terms_date_term 
ON SEARCH_TERMS (date, search_term)
WHERE date IS NOT NULL AND search_term IS NOT NULL;

-- Essential aggregation support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_basic_agg
ON METRICS (date, clicks, cost, conversions)
WHERE date IS NOT NULL;

-- ==================================================
-- PROFESSIONAL TIER OPTIMIZATIONS  
-- Advanced indexes for real-time and ROAS analytics
-- ==================================================

-- Advanced ROAS calculation support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_roas_calc
ON METRICS (date, cost, conversions, clicks, impr)
WHERE date IS NOT NULL AND cost > 0;

-- Real-time segmentation support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_terms_segmentation
ON SEARCH_TERMS (campaign, ad_group, date, clicks, cost, conversions)
WHERE date IS NOT NULL;

-- Advanced aggregation with covering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_covering_advanced
ON METRICS (date, campaign, ad_group) 
INCLUDE (clicks, cost, conversions, impr, ctr)
WHERE date >= CURRENT_DATE - INTERVAL '90 days';

-- Time-series optimization for charts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timeseries
ON METRICS (date, level)
INCLUDE (clicks, cost, conversions, impr)
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- ==================================================
-- ENTERPRISE TIER OPTIMIZATIONS
-- Partitioning and unlimited data support
-- ==================================================

-- Custom metrics support (Enterprise feature)
CREATE TABLE IF NOT EXISTS CUSTOM_METRICS (
    id SERIAL PRIMARY KEY,
    tenant VARCHAR(255) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    value DECIMAL(15,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise custom metrics index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_custom_metrics_tenant_date
ON CUSTOM_METRICS (tenant, metric_name, date)
WHERE date IS NOT NULL;

-- Partitioned index for unlimited data (simulated with conditional index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_partitioned_recent
ON METRICS (date, campaign, ad_group, id)
WHERE date >= CURRENT_DATE - INTERVAL '1 year';

-- Full covering index for complex Enterprise queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_terms_enterprise_covering
ON SEARCH_TERMS (campaign, ad_group, search_term, date)
INCLUDE (clicks, cost, conversions)
WHERE date >= CURRENT_DATE - INTERVAL '1 year';

-- Advanced analytics support
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_advanced_analytics
ON METRICS (level, campaign, ad_group, name, date)
INCLUDE (clicks, cost, conversions, impr, ctr)
WHERE date >= CURRENT_DATE - INTERVAL '2 years';

-- ==================================================
-- PERFORMANCE MONITORING VIEWS
-- Track query performance by tier
-- ==================================================

CREATE OR REPLACE VIEW analytics_query_performance AS
SELECT 
    'METRICS' as table_name,
    COUNT(*) as total_rows,
    MAX(date) as latest_date,
    MIN(date) as earliest_date,
    AVG(CASE WHEN clicks > 0 THEN cost/clicks ELSE 0 END) as avg_cpc,
    AVG(CASE WHEN clicks > 0 THEN conversions/clicks ELSE 0 END) as avg_conv_rate
FROM METRICS
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
    'SEARCH_TERMS' as table_name,
    COUNT(*) as total_rows,
    MAX(date) as latest_date,
    MIN(date) as earliest_date,
    AVG(CASE WHEN clicks > 0 THEN cost/clicks ELSE 0 END) as avg_cpc,
    AVG(CASE WHEN clicks > 0 THEN conversions/clicks ELSE 0 END) as avg_conv_rate
FROM SEARCH_TERMS
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- ==================================================
-- INDEX USAGE MONITORING
-- Track index effectiveness
-- ==================================================

CREATE OR REPLACE FUNCTION get_analytics_index_usage()
RETURNS TABLE (
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.schemaname,
        s.tablename,
        s.indexname,
        s.idx_scan,
        s.idx_tup_read,
        s.idx_tup_fetch,
        CASE 
            WHEN s.idx_scan = 0 THEN 0
            ELSE ROUND(s.idx_tup_fetch::NUMERIC / s.idx_scan, 2)
        END as usage_ratio
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.tablename IN ('METRICS', 'SEARCH_TERMS', 'CUSTOM_METRICS')
    AND s.indexname LIKE 'idx_%'
    ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- CACHE TABLE FOR PRE-COMPUTED METRICS (Enterprise)
-- Background computation for instant dashboards
-- ==================================================

CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    tenant VARCHAR(255) NOT NULL,
    cache_key VARCHAR(500) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX (tenant, cache_key, expires_at)
);

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_analytics_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule cache cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-analytics-cache', '0 */6 * * *', 'SELECT cleanup_expired_analytics_cache();');

-- ==================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- Recommended PostgreSQL settings for analytics workload
-- ==================================================

/*
Recommended postgresql.conf settings for analytics performance:

# Memory settings
shared_buffers = 256MB                  # 25% of RAM for small instances
effective_cache_size = 1GB              # 75% of RAM
work_mem = 4MB                          # For sorting and hash operations
maintenance_work_mem = 64MB             # For index creation/maintenance

# Query planning
random_page_cost = 1.1                  # SSD optimization
effective_io_concurrency = 200          # SSD concurrent I/O
seq_page_cost = 1                       # Sequential scan cost

# Write-ahead log
wal_buffers = 16MB                      # WAL buffer size
checkpoint_completion_target = 0.9      # Checkpoint spread
wal_writer_delay = 200ms                # WAL writer frequency

# Analytics-specific
default_statistics_target = 100         # Better query plans for analytics
constraint_exclusion = partition        # Partition pruning
enable_partitionwise_join = on          # Partition-wise joins
enable_partitionwise_aggregate = on     # Partition-wise aggregates
*/

-- ==================================================
-- INDEX MAINTENANCE PROCEDURES
-- ==================================================

CREATE OR REPLACE FUNCTION reindex_analytics_tables()
RETURNS void AS $$
BEGIN
    -- Reindex analytics tables during maintenance windows
    REINDEX TABLE METRICS;
    REINDEX TABLE SEARCH_TERMS;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_metrics') THEN
        REINDEX TABLE CUSTOM_METRICS;
    END IF;
    
    -- Update table statistics
    ANALYZE METRICS;
    ANALYZE SEARCH_TERMS;
    ANALYZE CUSTOM_METRICS;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- QUERY EXAMPLES FOR EACH TIER
-- Demonstrates optimized query patterns
-- ==================================================

-- STARTER TIER: Basic 7-day metrics (5-minute cache)
/*
SELECT 
    date,
    SUM(clicks) as total_clicks,
    SUM(cost) as total_cost,
    SUM(conversions) as total_conversions
FROM METRICS 
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    AND date IS NOT NULL
GROUP BY date
ORDER BY date;
*/

-- PROFESSIONAL TIER: Real-time ROAS by campaign (30-second cache)
/*  
SELECT 
    campaign,
    SUM(clicks) as clicks,
    SUM(cost) as cost,
    SUM(conversions) as conversions,
    CASE WHEN SUM(cost) > 0 THEN SUM(conversions * 50) / SUM(cost) ELSE 0 END as roas
FROM METRICS
WHERE date >= CURRENT_DATE - INTERVAL '24 hours'
    AND cost > 0
GROUP BY campaign
HAVING SUM(cost) > 10
ORDER BY roas DESC;
*/

-- ENTERPRISE TIER: Custom metrics with unlimited history (10-second cache)
/*
SELECT 
    m.date,
    m.campaign,
    SUM(m.clicks) as clicks,
    SUM(m.cost) as cost,
    SUM(m.conversions) as conversions,
    cm.value as custom_metric_value
FROM METRICS m
LEFT JOIN CUSTOM_METRICS cm ON cm.tenant = 'enterprise_tenant' 
    AND cm.date = m.date 
    AND cm.metric_name = 'custom_roas'
WHERE m.date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY m.date, m.campaign, cm.value
ORDER BY m.date DESC;
*/