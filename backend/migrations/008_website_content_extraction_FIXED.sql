-- =====================================================
-- Migration 008: Website Content Extraction System (FIXED)
-- Created: 2025-09-28
-- Description: Database schema for website content extraction
--              with proper DROP IF EXISTS for idempotent execution
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_website_content_updated_at ON website_content;
DROP TRIGGER IF EXISTS update_content_index_updated_at ON content_index;
DROP TRIGGER IF EXISTS update_content_extraction_log_updated_at ON content_extraction_log;

-- Drop existing function if exists (in case of partial run)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Website content storage table
CREATE TABLE IF NOT EXISTS website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT,
  page_type TEXT, -- home, product, about, contact, etc.
  title TEXT,
  meta_description TEXT,
  h1_heading TEXT,

  -- Content sections
  hero_content TEXT,
  main_content TEXT,
  sidebar_content TEXT,
  footer_content TEXT,

  -- Extracted key data
  products JSONB, -- Array of product names and descriptions
  services JSONB, -- Array of services offered
  usps JSONB, -- Unique selling points
  testimonials JSONB, -- Customer testimonials
  trust_signals JSONB, -- Certifications, awards, guarantees
  contact_info JSONB, -- Phone, email, address
  social_links JSONB, -- Social media profiles

  -- Content analysis
  content_quality_score DECIMAL(3,2), -- 0-1 quality score
  readability_score DECIMAL(4,1), -- Flesch reading ease
  keyword_density JSONB, -- Top keywords and their density
  sentiment_score DECIMAL(3,2), -- -1 to 1 sentiment

  -- Offers and promotions
  offers JSONB, -- Current offers found on page
  cta_buttons JSONB, -- Call-to-action texts
  urgency_indicators TEXT[], -- "Limited time", "Only X left", etc.

  -- Technical data
  schema_markup JSONB, -- Structured data found
  images JSONB, -- Image URLs and alt texts
  videos JSONB, -- Video URLs and metadata

  -- Metadata
  last_scraped TIMESTAMP DEFAULT NOW(),
  scrape_status TEXT DEFAULT 'success', -- success, partial, failed
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_website_content UNIQUE (tenant_id, url)
);

-- Indexes for website_content
CREATE INDEX IF NOT EXISTS idx_website_content_tenant
  ON website_content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_content_domain
  ON website_content(domain);
CREATE INDEX IF NOT EXISTS idx_website_content_last_scraped
  ON website_content(last_scraped DESC);
CREATE INDEX IF NOT EXISTS idx_website_content_quality_score
  ON website_content(content_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_website_content_gin_products
  ON website_content USING gin(products);
CREATE INDEX IF NOT EXISTS idx_website_content_gin_usps
  ON website_content USING gin(usps);

-- Content index table for fast searching
CREATE TABLE IF NOT EXISTS content_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  website_content_id UUID REFERENCES website_content(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- product, testimonial, usp, offer, etc.
  content_text TEXT NOT NULL,
  content_metadata JSONB,
  relevance_score DECIMAL(3,2), -- 0-1 relevance for ads
  usage_count INTEGER DEFAULT 0, -- Times used in ads
  performance_score DECIMAL(5,2), -- CTR/conversion impact
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for content_index
CREATE INDEX IF NOT EXISTS idx_content_index_tenant_type
  ON content_index(tenant_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_index_relevance
  ON content_index(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_index_usage
  ON content_index(usage_count);
CREATE INDEX IF NOT EXISTS idx_content_index_performance
  ON content_index(performance_score DESC);

-- Full text search on content_text
CREATE INDEX IF NOT EXISTS idx_content_index_fts
  ON content_index USING gin(to_tsvector('english', content_text));

-- Content tags for categorization
CREATE TABLE IF NOT EXISTS content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_index_id UUID REFERENCES content_index(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_category TEXT, -- emotion, benefit, feature, audience, etc.
  confidence_score DECIMAL(3,2), -- 0-1 confidence
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for content_tags
CREATE INDEX IF NOT EXISTS idx_content_tags_name
  ON content_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_content_tags_category
  ON content_tags(tag_category);
CREATE INDEX IF NOT EXISTS idx_content_tags_content
  ON content_tags(content_index_id);

-- Content extraction log
CREATE TABLE IF NOT EXISTS content_extraction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  extraction_type TEXT, -- full, incremental, targeted
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  pages_scraped INTEGER DEFAULT 0,
  items_extracted INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT DEFAULT 'running', -- running, completed, failed
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for extraction log
CREATE INDEX IF NOT EXISTS idx_extraction_log_tenant
  ON content_extraction_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extraction_log_status
  ON content_extraction_log(status);

-- Views for common queries

-- Latest content per URL
CREATE OR REPLACE VIEW latest_website_content AS
SELECT DISTINCT ON (tenant_id, url) *
FROM website_content
ORDER BY tenant_id, url, last_scraped DESC;

-- Active offers
CREATE OR REPLACE VIEW active_offers AS
SELECT
  tenant_id,
  url,
  jsonb_array_elements(offers) as offer,
  last_scraped
FROM website_content
WHERE offers IS NOT NULL
  AND jsonb_array_length(offers) > 0
  AND last_scraped > NOW() - INTERVAL '7 days';

-- Content summary by type
CREATE OR REPLACE VIEW content_by_type_summary AS
SELECT
  tenant_id,
  content_type,
  COUNT(*) as item_count,
  AVG(relevance_score) as avg_relevance,
  AVG(performance_score) as avg_performance,
  SUM(usage_count) as total_usage
FROM content_index
GROUP BY tenant_id, content_type;

-- Stale content needing refresh
CREATE OR REPLACE VIEW stale_content AS
SELECT
  tenant_id,
  url,
  domain,
  last_scraped,
  EXTRACT(day FROM NOW() - last_scraped) as days_old
FROM website_content
WHERE last_scraped < NOW() - INTERVAL '30 days'
ORDER BY last_scraped ASC;

-- Enable Row Level Security
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_extraction_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to website_content" ON website_content;
DROP POLICY IF EXISTS "Service role has full access to content_index" ON content_index;
DROP POLICY IF EXISTS "Service role has full access to content_tags" ON content_tags;
DROP POLICY IF EXISTS "Service role has full access to content_extraction_log" ON content_extraction_log;

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

-- Grant permissions (IF NOT EXISTS is implicit in GRANT)
GRANT ALL ON website_content TO service_role;
GRANT ALL ON content_index TO service_role;
GRANT ALL ON content_tags TO service_role;
GRANT ALL ON content_extraction_log TO service_role;
GRANT SELECT ON latest_website_content TO service_role;
GRANT SELECT ON active_offers TO service_role;
GRANT SELECT ON content_by_type_summary TO service_role;
GRANT SELECT ON stale_content TO service_role;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (recreate them)
CREATE TRIGGER update_website_content_updated_at
  BEFORE UPDATE ON website_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_index_updated_at
  BEFORE UPDATE ON content_index
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Useful functions for content extraction

-- Function to calculate content quality score
CREATE OR REPLACE FUNCTION calculate_content_quality(
  p_content TEXT,
  p_products JSONB,
  p_usps JSONB,
  p_testimonials JSONB
) RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL := 0;
BEGIN
  -- Base score from content length
  IF LENGTH(p_content) > 500 THEN v_score := v_score + 0.2; END IF;
  IF LENGTH(p_content) > 1000 THEN v_score := v_score + 0.1; END IF;

  -- Score from products
  IF p_products IS NOT NULL AND jsonb_array_length(p_products) > 0 THEN
    v_score := v_score + LEAST(0.3, jsonb_array_length(p_products) * 0.05);
  END IF;

  -- Score from USPs
  IF p_usps IS NOT NULL AND jsonb_array_length(p_usps) > 0 THEN
    v_score := v_score + LEAST(0.2, jsonb_array_length(p_usps) * 0.1);
  END IF;

  -- Score from testimonials
  IF p_testimonials IS NOT NULL AND jsonb_array_length(p_testimonials) > 0 THEN
    v_score := v_score + LEAST(0.2, jsonb_array_length(p_testimonials) * 0.1);
  END IF;

  RETURN LEAST(1.0, v_score);
END;
$$ LANGUAGE plpgsql;

-- Migration complete
SELECT 'Migration 008: Website Content Extraction (FIXED) - COMPLETE' AS status;