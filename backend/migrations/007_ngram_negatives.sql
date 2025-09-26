-- Migration 007: N-gram Negative Keywords (PRO tier feature)
-- Creates tables for n-gram waste detection and phrase-level blocking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- N-gram negatives table for storing detected wasteful phrase patterns
CREATE TABLE IF NOT EXISTS ngram_negatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    phrase TEXT NOT NULL,
    ngram_length INTEGER NOT NULL CHECK (ngram_length >= 2 AND ngram_length <= 4),
    waste_score DECIMAL(5,4) NOT NULL CHECK (waste_score >= 0 AND waste_score <= 1),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    occurrences INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    pattern_type VARCHAR(50),
    match_type VARCHAR(20) DEFAULT 'phrase' CHECK (match_type IN ('phrase', 'exact', 'broad')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED', 'ARCHIVED')),
    approved_by VARCHAR(255),
    applied_campaigns JSONB DEFAULT '[]',
    sample_search_terms JSONB DEFAULT '[]',
    ai_reason TEXT,
    business_impact VARCHAR(20) DEFAULT 'medium' CHECK (business_impact IN ('high', 'medium', 'low')),
    estimated_monthly_savings DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_analyzed TIMESTAMP WITH TIME ZONE,

    -- Unique constraint on phrase per tenant
    UNIQUE(tenant_id, phrase)
);

-- N-gram analysis history for tracking performance over time
CREATE TABLE IF NOT EXISTS ngram_analysis_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    search_terms_analyzed INTEGER NOT NULL DEFAULT 0,
    ngrams_extracted INTEGER NOT NULL DEFAULT 0,
    significant_ngrams INTEGER NOT NULL DEFAULT 0,
    ai_enhanced_ngrams INTEGER NOT NULL DEFAULT 0,
    total_potential_savings DECIMAL(10,2) DEFAULT 0,
    analysis_parameters JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- N-gram performance tracking for measuring impact
CREATE TABLE IF NOT EXISTS ngram_performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ngram_negative_id UUID NOT NULL REFERENCES ngram_negatives(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) NOT NULL,
    tracking_date DATE NOT NULL,
    campaigns_applied INTEGER DEFAULT 0,
    estimated_blocked_clicks INTEGER DEFAULT 0,
    estimated_cost_saved DECIMAL(10,2) DEFAULT 0,
    false_positive_reports INTEGER DEFAULT 0,
    accuracy_score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Unique constraint for daily tracking per ngram
    UNIQUE(ngram_negative_id, tracking_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ngram_negatives_tenant_id ON ngram_negatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ngram_negatives_status ON ngram_negatives(status);
CREATE INDEX IF NOT EXISTS idx_ngram_negatives_waste_score ON ngram_negatives(waste_score DESC);
CREATE INDEX IF NOT EXISTS idx_ngram_negatives_phrase ON ngram_negatives(phrase);
CREATE INDEX IF NOT EXISTS idx_ngram_negatives_pattern_type ON ngram_negatives(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ngram_negatives_created_at ON ngram_negatives(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ngram_analysis_history_tenant_id ON ngram_analysis_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ngram_analysis_history_date ON ngram_analysis_history(analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_ngram_performance_tenant_id ON ngram_performance_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ngram_performance_date ON ngram_performance_tracking(tracking_date DESC);
CREATE INDEX IF NOT EXISTS idx_ngram_performance_ngram_id ON ngram_performance_tracking(ngram_negative_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on ngram_negatives
DROP TRIGGER IF EXISTS update_ngram_negatives_updated_at ON ngram_negatives;
CREATE TRIGGER update_ngram_negatives_updated_at
    BEFORE UPDATE ON ngram_negatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies for multi-tenancy
ALTER TABLE ngram_negatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngram_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngram_performance_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY ngram_negatives_tenant_isolation ON ngram_negatives
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY ngram_analysis_history_tenant_isolation ON ngram_analysis_history
    USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY ngram_performance_tracking_tenant_isolation ON ngram_performance_tracking
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Views for easier querying
CREATE OR REPLACE VIEW active_ngram_negatives AS
SELECT
    nn.*,
    npt.estimated_cost_saved as total_savings,
    npt.estimated_blocked_clicks as total_blocked_clicks
FROM ngram_negatives nn
LEFT JOIN (
    SELECT
        ngram_negative_id,
        SUM(estimated_cost_saved) as estimated_cost_saved,
        SUM(estimated_blocked_clicks) as estimated_blocked_clicks
    FROM ngram_performance_tracking
    GROUP BY ngram_negative_id
) npt ON nn.id = npt.ngram_negative_id
WHERE nn.status = 'ACTIVE';

CREATE OR REPLACE VIEW ngram_analysis_summary AS
SELECT
    tenant_id,
    DATE(analysis_date) as analysis_date,
    COUNT(*) as analyses_run,
    AVG(search_terms_analyzed) as avg_terms_analyzed,
    AVG(ngrams_extracted) as avg_ngrams_extracted,
    AVG(significant_ngrams) as avg_significant_ngrams,
    SUM(total_potential_savings) as total_potential_savings,
    AVG(execution_time_ms) as avg_execution_time_ms,
    COUNT(*) FILTER (WHERE success = true) as successful_analyses,
    COUNT(*) FILTER (WHERE success = false) as failed_analyses
FROM ngram_analysis_history
GROUP BY tenant_id, DATE(analysis_date)
ORDER BY analysis_date DESC;

-- Comments for documentation
COMMENT ON TABLE ngram_negatives IS 'Stores detected n-gram patterns identified as wasteful for phrase-level negative keyword blocking';
COMMENT ON TABLE ngram_analysis_history IS 'Historical record of n-gram analysis runs for performance tracking';
COMMENT ON TABLE ngram_performance_tracking IS 'Tracks the real-world performance impact of applied n-gram negatives';

COMMENT ON COLUMN ngram_negatives.waste_score IS 'Algorithm-calculated waste score from 0-1, higher means more wasteful';
COMMENT ON COLUMN ngram_negatives.confidence IS 'Statistical confidence in the waste detection from 0-1';
COMMENT ON COLUMN ngram_negatives.pattern_type IS 'Category of wasteful pattern (job_related, price_shopping, research_intent, etc.)';
COMMENT ON COLUMN ngram_negatives.ai_reason IS 'AI-generated explanation for why this pattern is considered wasteful';
COMMENT ON COLUMN ngram_negatives.business_impact IS 'Estimated business impact of blocking this pattern';

-- Insert default configuration for n-gram feature
INSERT INTO tenant_configs (tenant_id, config_key, config_value, created_at, updated_at)
VALUES
    ('DEFAULT', 'FEATURE_NGRAM_NEGATIVES', 'false', NOW(), NOW()),
    ('DEFAULT', 'NGRAM_MIN_SAMPLE_SIZE', '50', NOW(), NOW()),
    ('DEFAULT', 'NGRAM_MIN_WASTE_SCORE', '0.6', NOW(), NOW()),
    ('DEFAULT', 'NGRAM_MAX_CONVERSION_RATE', '0.02', NOW(), NOW()),
    ('DEFAULT', 'NGRAM_USE_AI_ENHANCEMENT', 'true', NOW(), NOW())
ON CONFLICT (tenant_id, config_key) DO NOTHING;