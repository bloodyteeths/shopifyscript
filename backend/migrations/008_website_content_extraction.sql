-- Website Content Extraction System Migration
-- Creates tables for storing and indexing scraped website content
-- Part of the intelligent ad generation system

-- Table: website_content
-- Stores main website scraping results
CREATE TABLE IF NOT EXISTS website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  homepage_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pages_scraped INTEGER DEFAULT 0,
  content_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for website_content
CREATE INDEX IF NOT EXISTS idx_website_content_tenant ON website_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_content_url ON website_content(url);
CREATE INDEX IF NOT EXISTS idx_website_content_tenant_url ON website_content(tenant_id, url);
CREATE INDEX IF NOT EXISTS idx_website_content_scraped_at ON website_content(scraped_at DESC);

-- Table: content_index
-- Stores indexed content items (products, testimonials, offers, etc.)
CREATE TABLE IF NOT EXISTS content_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  website_url TEXT NOT NULL,
  content_type TEXT NOT NULL, -- product, testimonial, offer, guarantee, usp, hook, cta, brand_voice
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ, -- For time-sensitive content like offers
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for content_index
CREATE INDEX IF NOT EXISTS idx_content_index_tenant ON content_index(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_index_type ON content_index(content_type);
CREATE INDEX IF NOT EXISTS idx_content_index_tenant_type ON content_index(tenant_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_index_website_url ON content_index(website_url);
CREATE INDEX IF NOT EXISTS idx_content_index_indexed_at ON content_index(indexed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_index_expires_at ON content_index(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_index_tags ON content_index USING GIN(tags);

-- Full-text search index on title and content
CREATE INDEX IF NOT EXISTS idx_content_index_search ON content_index USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

-- Table: content_tags
-- Stores content tagging metadata for better categorization
CREATE TABLE IF NOT EXISTS content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name TEXT NOT NULL UNIQUE,
  tag_category TEXT, -- e.g., 'product_type', 'sentiment', 'urgency'
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for content_tags
CREATE INDEX IF NOT EXISTS idx_content_tags_name ON content_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_content_tags_category ON content_tags(tag_category);

-- Table: content_extraction_log
-- Logs content extraction activities for monitoring and debugging
CREATE TABLE IF NOT EXISTS content_extraction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL, -- success, partial, failed
  pages_scraped INTEGER DEFAULT 0,
  items_extracted INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  extraction_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for content_extraction_log
CREATE INDEX IF NOT EXISTS idx_content_extraction_log_tenant ON content_extraction_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_extraction_log_status ON content_extraction_log(status);
CREATE INDEX IF NOT EXISTS idx_content_extraction_log_created_at ON content_extraction_log(created_at DESC);

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_website_content_updated_at
  BEFORE UPDATE ON website_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_index_updated_at
  BEFORE UPDATE ON content_index
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_tags_updated_at
  BEFORE UPDATE ON content_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- View: latest_website_content
-- Shows the most recent scrape for each tenant/url combination
CREATE OR REPLACE VIEW latest_website_content AS
SELECT DISTINCT ON (tenant_id, url)
  id,
  tenant_id,
  url,
  pages_scraped,
  content_summary,
  scraped_at,
  updated_at
FROM website_content
ORDER BY tenant_id, url, scraped_at DESC;

-- View: active_offers
-- Shows non-expired offers
CREATE OR REPLACE VIEW active_offers AS
SELECT
  id,
  tenant_id,
  website_url,
  title,
  content,
  metadata,
  expires_at,
  indexed_at
FROM content_index
WHERE content_type = 'offer'
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY indexed_at DESC;

-- View: content_by_type_summary
-- Aggregates content counts by type per tenant
CREATE OR REPLACE VIEW content_by_type_summary AS
SELECT
  tenant_id,
  content_type,
  COUNT(*) as item_count,
  MAX(indexed_at) as last_indexed
FROM content_index
GROUP BY tenant_id, content_type
ORDER BY tenant_id, content_type;

-- View: stale_content
-- Identifies content that may need refreshing (older than 30 days)
CREATE OR REPLACE VIEW stale_content AS
SELECT
  tenant_id,
  url,
  scraped_at,
  pages_scraped,
  EXTRACT(DAY FROM (NOW() - scraped_at)) as days_old
FROM website_content
WHERE scraped_at < NOW() - INTERVAL '30 days'
ORDER BY scraped_at ASC;

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_extraction_log ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role has full access to website_content"
  ON website_content
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to content_index"
  ON content_index
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to content_tags"
  ON content_tags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to content_extraction_log"
  ON content_extraction_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE website_content IS 'Stores scraped website data for each tenant';
COMMENT ON TABLE content_index IS 'Indexed content items extracted from websites for ad generation';
COMMENT ON TABLE content_tags IS 'Tag metadata for content categorization';
COMMENT ON TABLE content_extraction_log IS 'Audit log for content extraction activities';
COMMENT ON VIEW latest_website_content IS 'Most recent website scrape per tenant/url';
COMMENT ON VIEW active_offers IS 'Current non-expired offers available for ads';
COMMENT ON VIEW content_by_type_summary IS 'Content counts by type per tenant';
COMMENT ON VIEW stale_content IS 'Websites needing re-scraping (older than 30 days)';

-- Grant permissions
GRANT ALL ON website_content TO service_role;
GRANT ALL ON content_index TO service_role;
GRANT ALL ON content_tags TO service_role;
GRANT ALL ON content_extraction_log TO service_role;
GRANT SELECT ON latest_website_content TO service_role;
GRANT SELECT ON active_offers TO service_role;
GRANT SELECT ON content_by_type_summary TO service_role;
GRANT SELECT ON stale_content TO service_role;

-- Insert initial content tags for common categories
INSERT INTO content_tags (tag_name, tag_category) VALUES
  ('product', 'content_type'),
  ('service', 'content_type'),
  ('testimonial', 'social_proof'),
  ('review', 'social_proof'),
  ('offer', 'promotion'),
  ('discount', 'promotion'),
  ('guarantee', 'trust_signal'),
  ('warranty', 'trust_signal'),
  ('usp', 'value_proposition'),
  ('cta', 'call_to_action'),
  ('hook', 'headline'),
  ('brand-voice', 'style'),
  ('e-commerce', 'platform'),
  ('service-based', 'business_type'),
  ('b2b', 'business_type'),
  ('b2c', 'business_type'),
  ('urgent', 'sentiment'),
  ('professional', 'tone'),
  ('friendly', 'tone'),
  ('luxury', 'tone')
ON CONFLICT (tag_name) DO NOTHING;

-- Migration complete
-- This migration enables intelligent website content extraction for dynamic ad generation