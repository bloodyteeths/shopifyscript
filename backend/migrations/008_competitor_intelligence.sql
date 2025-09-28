-- =====================================================
-- Migration 008: Competitor Intelligence Engine
-- Created: 2025-09-28
-- Description: Database schema for competitor tracking,
--              SERP monitoring, and ad intelligence
-- =====================================================

-- Competitor profiles table
CREATE TABLE IF NOT EXISTS competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  market_position TEXT, -- leader, challenger, niche
  threat_level TEXT, -- low, medium, high
  first_seen TIMESTAMP DEFAULT NOW(),
  last_analyzed TIMESTAMP,
  strengths JSONB, -- Array of competitive strengths
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_competitor_domain UNIQUE (tenant_id, domain)
);

-- Indexes for competitor profiles
CREATE INDEX IF NOT EXISTS idx_competitor_profiles_tenant
  ON competitor_profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_competitor_profiles_domain
  ON competitor_profiles(domain);

CREATE INDEX IF NOT EXISTS idx_competitor_profiles_last_analyzed
  ON competitor_profiles(last_analyzed DESC);

-- Competitor changes tracking
CREATE TABLE IF NOT EXISTS competitor_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  competitor_id UUID REFERENCES competitor_profiles(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- ad_copy_changes, landing_page_updates, new_products, etc.
  description TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  significance TEXT, -- low, medium, high
  details JSONB, -- Detailed change information
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for competitor changes
CREATE INDEX IF NOT EXISTS idx_competitor_changes_tenant
  ON competitor_changes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_competitor_changes_competitor
  ON competitor_changes(competitor_id);

CREATE INDEX IF NOT EXISTS idx_competitor_changes_detected
  ON competitor_changes(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_changes_significance
  ON competitor_changes(significance);

-- SERP positions tracking
CREATE TABLE IF NOT EXISTS serp_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  location TEXT DEFAULT 'US',
  device TEXT DEFAULT 'mobile', -- mobile, desktop
  date DATE DEFAULT CURRENT_DATE,
  our_position INTEGER, -- Our ad position (1-8, null if not showing)
  competitor_positions JSONB, -- Array of competitor positions
  serp_features JSONB, -- Array of SERP features present
  bid_estimate DECIMAL(10,2), -- Estimated bid for top position
  visibility_score DECIMAL(5,2), -- 0-100 visibility score
  total_ads INTEGER, -- Total ads shown
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_serp_position UNIQUE (tenant_id, keyword, location, device, date)
);

-- Indexes for SERP positions
CREATE INDEX IF NOT EXISTS idx_serp_positions_tenant_date
  ON serp_positions(tenant_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_serp_positions_keyword
  ON serp_positions(keyword);

CREATE INDEX IF NOT EXISTS idx_serp_positions_our_position
  ON serp_positions(our_position) WHERE our_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_serp_positions_date
  ON serp_positions(date DESC);

-- Competitor ads intelligence
CREATE TABLE IF NOT EXISTS competitor_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  competitor_id UUID REFERENCES competitor_profiles(id) ON DELETE CASCADE,
  ad_format TEXT, -- responsive_search_ad, expanded_text_ad, shopping_ad, etc.
  headline TEXT NOT NULL,
  description TEXT,
  call_to_action TEXT,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  impressions_estimate INTEGER, -- Estimated impressions
  engagement_score DECIMAL(5,2), -- 0-100 engagement score
  patterns JSONB, -- Array of detected patterns (urgency, scarcity, etc.)
  offers JSONB, -- Array of detected offers
  metadata JSONB, -- Additional ad metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_competitor_ad UNIQUE (tenant_id, competitor_id, headline, description)
);

-- Indexes for competitor ads
CREATE INDEX IF NOT EXISTS idx_competitor_ads_tenant
  ON competitor_ads(tenant_id);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_competitor
  ON competitor_ads(competitor_id);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_last_seen
  ON competitor_ads(last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_format
  ON competitor_ads(ad_format);

CREATE INDEX IF NOT EXISTS idx_competitor_ads_engagement
  ON competitor_ads(engagement_score DESC);

-- Market gaps analysis (stored as config)
-- This is stored in tenant_configs table with key 'market_gap_analysis'

-- Ad analysis results (stored as config)
-- This is stored in tenant_configs table with key 'competitor_ad_analyses'

-- Landing page analyses (stored as config)
-- This is stored in tenant_configs table with key 'landing_analysis_{competitor_id}'

-- Comments on design decisions
COMMENT ON TABLE competitor_profiles IS 'Stores information about identified competitors for each tenant';
COMMENT ON TABLE competitor_changes IS 'Tracks detected changes in competitor strategies over time';
COMMENT ON TABLE serp_positions IS 'Daily snapshots of keyword positions for tenant and competitors';
COMMENT ON TABLE competitor_ads IS 'Intelligence on competitor ad copy, formats, and strategies';

COMMENT ON COLUMN competitor_profiles.threat_level IS 'Assessment of competitive threat: low, medium, high';
COMMENT ON COLUMN competitor_changes.significance IS 'Impact level of the change: low, medium, high';
COMMENT ON COLUMN serp_positions.visibility_score IS 'Calculated visibility score (0-100) based on positions';
COMMENT ON COLUMN competitor_ads.patterns IS 'JSON array of detected advertising patterns (urgency, scarcity, etc.)';

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE competitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE serp_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_ads ENABLE ROW LEVEL SECURITY;

-- Policies to allow tenant-based access
CREATE POLICY competitor_profiles_tenant_policy ON competitor_profiles
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY competitor_changes_tenant_policy ON competitor_changes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY serp_positions_tenant_policy ON serp_positions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY competitor_ads_tenant_policy ON competitor_ads
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant', true));

-- Helper function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_competitor_profiles_updated_at
  BEFORE UPDATE ON competitor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitor_ads_updated_at
  BEFORE UPDATE ON competitor_ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- View: Recent competitor activity
CREATE OR REPLACE VIEW recent_competitor_activity AS
SELECT
  cc.tenant_id,
  cp.competitor_name,
  cp.domain,
  cc.change_type,
  cc.significance,
  cc.detected_at,
  cc.description
FROM competitor_changes cc
JOIN competitor_profiles cp ON cc.competitor_id = cp.id
WHERE cc.detected_at >= NOW() - INTERVAL '30 days'
ORDER BY cc.detected_at DESC;

-- View: Latest SERP positions
CREATE OR REPLACE VIEW latest_serp_positions AS
SELECT DISTINCT ON (tenant_id, keyword)
  tenant_id,
  keyword,
  our_position,
  competitor_positions,
  visibility_score,
  date
FROM serp_positions
ORDER BY tenant_id, keyword, date DESC;

-- View: Top performing competitor ads
CREATE OR REPLACE VIEW top_competitor_ads AS
SELECT
  ca.tenant_id,
  cp.competitor_name,
  ca.headline,
  ca.description,
  ca.engagement_score,
  ca.patterns,
  ca.offers,
  ca.last_seen
FROM competitor_ads ca
JOIN competitor_profiles cp ON ca.competitor_id = cp.id
WHERE ca.engagement_score >= 70
ORDER BY ca.engagement_score DESC;

-- Analytics: Competitor threat matrix
CREATE OR REPLACE VIEW competitor_threat_matrix AS
SELECT
  cp.tenant_id,
  cp.competitor_name,
  cp.threat_level,
  COUNT(DISTINCT cc.id) as total_changes,
  COUNT(DISTINCT ca.id) as total_ads,
  MAX(cc.detected_at) as last_activity
FROM competitor_profiles cp
LEFT JOIN competitor_changes cc ON cp.id = cc.competitor_id
LEFT JOIN competitor_ads ca ON cp.id = ca.competitor_id
GROUP BY cp.tenant_id, cp.competitor_name, cp.threat_level
ORDER BY
  CASE cp.threat_level
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  total_changes DESC;

-- Sample data cleanup function (useful for testing)
CREATE OR REPLACE FUNCTION cleanup_old_competitor_data(
  days_to_keep INTEGER DEFAULT 90
) RETURNS void AS $$
BEGIN
  -- Delete old SERP positions
  DELETE FROM serp_positions
  WHERE date < CURRENT_DATE - days_to_keep;

  -- Delete old competitor changes
  DELETE FROM competitor_changes
  WHERE detected_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  -- Delete old competitor ads not seen recently
  DELETE FROM competitor_ads
  WHERE last_seen < NOW() - (days_to_keep || ' days')::INTERVAL;

  RAISE NOTICE 'Cleaned up competitor data older than % days', days_to_keep;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Migration complete
SELECT 'Migration 008: Competitor Intelligence Engine - COMPLETE' AS status;