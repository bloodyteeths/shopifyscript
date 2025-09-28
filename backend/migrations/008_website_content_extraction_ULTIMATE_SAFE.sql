-- =====================================================
-- Migration 008: Website Content Extraction System (ULTIMATE SAFE VERSION)
-- Created: 2025-09-28
-- Description: Handles ALL edge cases - adds missing columns to ALL tables
-- =====================================================

-- FIRST: Fix the website_content table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_content') THEN
        -- Add all missing columns to website_content
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'domain') THEN
            ALTER TABLE website_content ADD COLUMN domain TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'page_type') THEN
            ALTER TABLE website_content ADD COLUMN page_type TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'title') THEN
            ALTER TABLE website_content ADD COLUMN title TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'meta_description') THEN
            ALTER TABLE website_content ADD COLUMN meta_description TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'h1_heading') THEN
            ALTER TABLE website_content ADD COLUMN h1_heading TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'hero_content') THEN
            ALTER TABLE website_content ADD COLUMN hero_content TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'main_content') THEN
            ALTER TABLE website_content ADD COLUMN main_content TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'sidebar_content') THEN
            ALTER TABLE website_content ADD COLUMN sidebar_content TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'footer_content') THEN
            ALTER TABLE website_content ADD COLUMN footer_content TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'products') THEN
            ALTER TABLE website_content ADD COLUMN products JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'services') THEN
            ALTER TABLE website_content ADD COLUMN services JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'usps') THEN
            ALTER TABLE website_content ADD COLUMN usps JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'testimonials') THEN
            ALTER TABLE website_content ADD COLUMN testimonials JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'trust_signals') THEN
            ALTER TABLE website_content ADD COLUMN trust_signals JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'contact_info') THEN
            ALTER TABLE website_content ADD COLUMN contact_info JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'social_links') THEN
            ALTER TABLE website_content ADD COLUMN social_links JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'content_quality_score') THEN
            ALTER TABLE website_content ADD COLUMN content_quality_score DECIMAL(3,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'readability_score') THEN
            ALTER TABLE website_content ADD COLUMN readability_score DECIMAL(4,1);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'keyword_density') THEN
            ALTER TABLE website_content ADD COLUMN keyword_density JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'sentiment_score') THEN
            ALTER TABLE website_content ADD COLUMN sentiment_score DECIMAL(3,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'offers') THEN
            ALTER TABLE website_content ADD COLUMN offers JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'cta_buttons') THEN
            ALTER TABLE website_content ADD COLUMN cta_buttons JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'urgency_indicators') THEN
            ALTER TABLE website_content ADD COLUMN urgency_indicators TEXT[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'schema_markup') THEN
            ALTER TABLE website_content ADD COLUMN schema_markup JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'images') THEN
            ALTER TABLE website_content ADD COLUMN images JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'videos') THEN
            ALTER TABLE website_content ADD COLUMN videos JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'last_scraped') THEN
            ALTER TABLE website_content ADD COLUMN last_scraped TIMESTAMP DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'scrape_status') THEN
            ALTER TABLE website_content ADD COLUMN scrape_status TEXT DEFAULT 'success';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'error_message') THEN
            ALTER TABLE website_content ADD COLUMN error_message TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'processing_time_ms') THEN
            ALTER TABLE website_content ADD COLUMN processing_time_ms INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'created_at') THEN
            ALTER TABLE website_content ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'website_content' AND column_name = 'updated_at') THEN
            ALTER TABLE website_content ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE website_content (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            url TEXT NOT NULL,
            domain TEXT,
            page_type TEXT,
            title TEXT,
            meta_description TEXT,
            h1_heading TEXT,
            hero_content TEXT,
            main_content TEXT,
            sidebar_content TEXT,
            footer_content TEXT,
            products JSONB,
            services JSONB,
            usps JSONB,
            testimonials JSONB,
            trust_signals JSONB,
            contact_info JSONB,
            social_links JSONB,
            content_quality_score DECIMAL(3,2),
            readability_score DECIMAL(4,1),
            keyword_density JSONB,
            sentiment_score DECIMAL(3,2),
            offers JSONB,
            cta_buttons JSONB,
            urgency_indicators TEXT[],
            schema_markup JSONB,
            images JSONB,
            videos JSONB,
            last_scraped TIMESTAMP DEFAULT NOW(),
            scrape_status TEXT DEFAULT 'success',
            error_message TEXT,
            processing_time_ms INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT unique_website_content UNIQUE (tenant_id, url)
        );
    END IF;
END
$$;

-- SECOND: Fix the content_index table - THIS IS WHERE relevance_score IS MISSING!
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_index') THEN
        -- Add missing columns to content_index
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_index' AND column_name = 'content_metadata') THEN
            ALTER TABLE content_index ADD COLUMN content_metadata JSONB;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_index' AND column_name = 'relevance_score') THEN
            ALTER TABLE content_index ADD COLUMN relevance_score DECIMAL(3,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_index' AND column_name = 'usage_count') THEN
            ALTER TABLE content_index ADD COLUMN usage_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_index' AND column_name = 'performance_score') THEN
            ALTER TABLE content_index ADD COLUMN performance_score DECIMAL(5,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_index' AND column_name = 'created_at') THEN
            ALTER TABLE content_index ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_index' AND column_name = 'updated_at') THEN
            ALTER TABLE content_index ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE content_index (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            website_content_id UUID REFERENCES website_content(id) ON DELETE CASCADE,
            content_type TEXT NOT NULL,
            content_text TEXT NOT NULL,
            content_metadata JSONB,
            relevance_score DECIMAL(3,2),
            usage_count INTEGER DEFAULT 0,
            performance_score DECIMAL(5,2),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END
$$;

-- THIRD: Fix the content_tags table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_tags') THEN
        -- Add missing columns to content_tags
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_tags' AND column_name = 'confidence_score') THEN
            ALTER TABLE content_tags ADD COLUMN confidence_score DECIMAL(3,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_tags' AND column_name = 'created_at') THEN
            ALTER TABLE content_tags ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE content_tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content_index_id UUID REFERENCES content_index(id) ON DELETE CASCADE,
            tag_name TEXT NOT NULL,
            tag_category TEXT,
            confidence_score DECIMAL(3,2),
            created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END
$$;

-- FOURTH: Fix the content_extraction_log table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_extraction_log') THEN
        CREATE TABLE content_extraction_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id TEXT NOT NULL,
            url TEXT NOT NULL,
            extraction_type TEXT,
            started_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP,
            pages_scraped INTEGER DEFAULT 0,
            items_extracted INTEGER DEFAULT 0,
            errors JSONB,
            status TEXT DEFAULT 'running',
            created_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
END
$$;

-- Add constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'website_content'
        AND constraint_name = 'unique_website_content'
    ) THEN
        ALTER TABLE website_content ADD CONSTRAINT unique_website_content UNIQUE (tenant_id, url);
    END IF;
END
$$;

-- Create indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_website_content_tenant ON website_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_content_domain ON website_content(domain);
CREATE INDEX IF NOT EXISTS idx_website_content_last_scraped ON website_content(last_scraped DESC);
CREATE INDEX IF NOT EXISTS idx_website_content_quality_score ON website_content(content_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_website_content_gin_products ON website_content USING gin(products);
CREATE INDEX IF NOT EXISTS idx_website_content_gin_usps ON website_content USING gin(usps);

CREATE INDEX IF NOT EXISTS idx_content_index_tenant_type ON content_index(tenant_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_index_relevance ON content_index(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_index_usage ON content_index(usage_count);
CREATE INDEX IF NOT EXISTS idx_content_index_performance ON content_index(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_index_fts ON content_index USING gin(to_tsvector('english', content_text));

CREATE INDEX IF NOT EXISTS idx_content_tags_name ON content_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_content_tags_category ON content_tags(tag_category);
CREATE INDEX IF NOT EXISTS idx_content_tags_content ON content_tags(content_index_id);

CREATE INDEX IF NOT EXISTS idx_extraction_log_tenant ON content_extraction_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_log_status ON content_extraction_log(status);

-- Drop ALL views first to avoid dependency issues
DROP VIEW IF EXISTS latest_website_content CASCADE;
DROP VIEW IF EXISTS active_offers CASCADE;
DROP VIEW IF EXISTS content_by_type_summary CASCADE;
DROP VIEW IF EXISTS stale_content CASCADE;

-- Now recreate views with all columns present
CREATE VIEW latest_website_content AS
SELECT DISTINCT ON (tenant_id, url) *
FROM website_content
ORDER BY tenant_id, url, last_scraped DESC;

CREATE VIEW active_offers AS
SELECT
    tenant_id,
    url,
    jsonb_array_elements(offers) as offer,
    last_scraped
FROM website_content
WHERE offers IS NOT NULL
    AND jsonb_array_length(offers) > 0
    AND last_scraped > NOW() - INTERVAL '7 days';

-- This view uses relevance_score which should now exist
CREATE VIEW content_by_type_summary AS
SELECT
    tenant_id,
    content_type,
    COUNT(*) as item_count,
    AVG(relevance_score) as avg_relevance,
    AVG(performance_score) as avg_performance,
    SUM(usage_count) as total_usage
FROM content_index
GROUP BY tenant_id, content_type;

CREATE VIEW stale_content AS
SELECT
    tenant_id,
    url,
    domain,
    last_scraped,
    EXTRACT(day FROM NOW() - last_scraped) as days_old
FROM website_content
WHERE last_scraped < NOW() - INTERVAL '30 days'
ORDER BY last_scraped ASC;

-- Enable Row Level Security (check first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'website_content' AND rowsecurity = true) THEN
        ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_index' AND rowsecurity = true) THEN
        ALTER TABLE content_index ENABLE ROW LEVEL SECURITY;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_tags' AND rowsecurity = true) THEN
        ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_extraction_log' AND rowsecurity = true) THEN
        ALTER TABLE content_extraction_log ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Service role has full access to website_content" ON website_content;
DROP POLICY IF EXISTS "Service role has full access to content_index" ON content_index;
DROP POLICY IF EXISTS "Service role has full access to content_tags" ON content_tags;
DROP POLICY IF EXISTS "Service role has full access to content_extraction_log" ON content_extraction_log;

CREATE POLICY "Service role has full access to website_content"
    ON website_content FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to content_index"
    ON content_index FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to content_tags"
    ON content_tags FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to content_extraction_log"
    ON content_extraction_log FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Update function and triggers
DROP TRIGGER IF EXISTS update_website_content_updated_at ON website_content;
DROP TRIGGER IF EXISTS update_content_index_updated_at ON content_index;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_website_content_updated_at
    BEFORE UPDATE ON website_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_index_updated_at
    BEFORE UPDATE ON content_index
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Content quality function
CREATE OR REPLACE FUNCTION calculate_content_quality(
    p_content TEXT,
    p_products JSONB,
    p_usps JSONB,
    p_testimonials JSONB
) RETURNS DECIMAL AS $$
DECLARE
    v_score DECIMAL := 0;
BEGIN
    IF LENGTH(p_content) > 500 THEN v_score := v_score + 0.2; END IF;
    IF LENGTH(p_content) > 1000 THEN v_score := v_score + 0.1; END IF;
    IF p_products IS NOT NULL AND jsonb_array_length(p_products) > 0 THEN
        v_score := v_score + LEAST(0.3, jsonb_array_length(p_products) * 0.05);
    END IF;
    IF p_usps IS NOT NULL AND jsonb_array_length(p_usps) > 0 THEN
        v_score := v_score + LEAST(0.2, jsonb_array_length(p_usps) * 0.1);
    END IF;
    IF p_testimonials IS NOT NULL AND jsonb_array_length(p_testimonials) > 0 THEN
        v_score := v_score + LEAST(0.2, jsonb_array_length(p_testimonials) * 0.1);
    END IF;
    RETURN LEAST(1.0, v_score);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON website_content TO service_role;
GRANT ALL ON content_index TO service_role;
GRANT ALL ON content_tags TO service_role;
GRANT ALL ON content_extraction_log TO service_role;
GRANT SELECT ON latest_website_content TO service_role;
GRANT SELECT ON active_offers TO service_role;
GRANT SELECT ON content_by_type_summary TO service_role;
GRANT SELECT ON stale_content TO service_role;

-- Success!
SELECT 'Migration 008: Website Content Extraction (ULTIMATE SAFE) - COMPLETE!' AS status,
       'All tables and columns have been fixed!' AS message;