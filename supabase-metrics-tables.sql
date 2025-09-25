-- Supabase Tables for Google Ads Metrics Storage
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Campaign Metrics Table
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  clicks INTEGER DEFAULT 0,
  cost DECIMAL(10, 2) DEFAULT 0,
  conversions DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint to handle upserts
  UNIQUE(tenant_id, campaign_id, date)
);

-- Ad Group Metrics Table
CREATE TABLE IF NOT EXISTS ad_group_metrics (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  clicks INTEGER DEFAULT 0,
  cost DECIMAL(10, 2) DEFAULT 0,
  conversions DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint to handle upserts
  UNIQUE(tenant_id, ad_group_id, date)
);

-- Search Terms Table
CREATE TABLE IF NOT EXISTS search_terms (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  ad_group_name TEXT NOT NULL,
  search_term TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  clicks INTEGER DEFAULT 0,
  cost DECIMAL(10, 2) DEFAULT 0,
  conversions DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint to handle upserts
  UNIQUE(tenant_id, campaign_name, ad_group_name, search_term, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_tenant_date ON campaign_metrics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_group_metrics_tenant_date ON ad_group_metrics(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_group_metrics_ad_group ON ad_group_metrics(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_search_terms_tenant_date ON search_terms(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_search_terms_search_term ON search_terms(search_term);

-- Row Level Security Policies
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_group_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_terms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY "Tenants can view own campaign metrics" ON campaign_metrics
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can insert own campaign metrics" ON campaign_metrics
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can update own campaign metrics" ON campaign_metrics
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can view own ad group metrics" ON ad_group_metrics
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can insert own ad group metrics" ON ad_group_metrics
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can update own ad group metrics" ON ad_group_metrics
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can view own search terms" ON search_terms
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can insert own search terms" ON search_terms
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenants can update own search terms" ON search_terms
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Service role bypass policies (for backend with service role key)
CREATE POLICY "Service role full access campaign" ON campaign_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access ad_group" ON ad_group_metrics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access terms" ON search_terms
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at timestamp
CREATE TRIGGER update_campaign_metrics_updated_at BEFORE UPDATE ON campaign_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_group_metrics_updated_at BEFORE UPDATE ON ad_group_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_terms_updated_at BEFORE UPDATE ON search_terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON campaign_metrics TO authenticated;
GRANT ALL ON ad_group_metrics TO authenticated;
GRANT ALL ON search_terms TO authenticated;
GRANT ALL ON campaign_metrics TO service_role;
GRANT ALL ON ad_group_metrics TO service_role;
GRANT ALL ON search_terms TO service_role;