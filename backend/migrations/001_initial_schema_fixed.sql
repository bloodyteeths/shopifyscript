-- ProofKit Supabase Schema Migration (Fixed)
-- Version: 001 - Initial Schema
-- Description: Core tables for tenant data, metrics, and logs

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET row_security = on;

-- Tenant Configurations
-- Replaces Google Sheets CONFIG_* tabs
CREATE TABLE IF NOT EXISTS tenant_configs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, config_key)
);

-- Create index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_tenant_configs_tenant_id 
ON tenant_configs(tenant_id);

-- Tenant Metrics
-- Replaces Google Sheets METRICS_* tabs  
CREATE TABLE IF NOT EXISTS tenant_metrics (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'campaign', 'ad_group', 'keyword'
  entity_id VARCHAR(100),
  entity_name VARCHAR(500),
  campaign_name VARCHAR(500),
  ad_group_name VARCHAR(500),
  clicks INTEGER DEFAULT 0,
  cost_micros BIGINT DEFAULT 0,
  conversions DECIMAL(10,4) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, date, entity_type, entity_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_tenant_date 
ON tenant_metrics(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_tenant_metrics_entity_type 
ON tenant_metrics(entity_type);

-- Search Terms Data  
-- Replaces Google Sheets SEARCH_TERMS_* tabs
CREATE TABLE IF NOT EXISTS search_terms (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  campaign_name VARCHAR(500),
  ad_group_name VARCHAR(500),
  search_term VARCHAR(1000),
  clicks INTEGER DEFAULT 0,
  cost_micros BIGINT DEFAULT 0,
  conversions DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, date, campaign_name, ad_group_name, search_term)
);

-- Index for search term analysis
CREATE INDEX IF NOT EXISTS idx_search_terms_tenant_date
ON search_terms(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_search_terms_campaign
ON search_terms(tenant_id, campaign_name);

-- Run Logs
-- Replaces Google Sheets RUN_LOGS_* tabs
CREATE TABLE IF NOT EXISTS run_logs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  log_type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'error', 'mutation'
  message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX IF NOT EXISTS idx_run_logs_tenant_timestamp
ON run_logs(tenant_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_run_logs_type
ON run_logs(log_type);

-- Tenant Subscriptions  
-- For billing and feature access tracking
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL UNIQUE,
  shop_domain VARCHAR(255),
  platform VARCHAR(20) DEFAULT 'shopify', -- 'shopify', 'wordpress'
  subscription_id VARCHAR(255),
  tier VARCHAR(50), -- 'starter', 'professional', 'enterprise'
  status VARCHAR(50), -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id
ON tenant_subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status
ON tenant_subscriptions(status);

-- Campaign Configurations
-- For storing campaign-specific settings and exclusions
CREATE TABLE IF NOT EXISTS campaign_configs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  campaign_name VARCHAR(500) NOT NULL,
  config_type VARCHAR(50) NOT NULL, -- 'budget_cap', 'cpc_ceiling', 'exclusion'
  config_value JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, campaign_name, config_type)
);

-- Index for campaign config lookups
CREATE INDEX IF NOT EXISTS idx_campaign_configs_tenant_campaign
ON campaign_configs(tenant_id, campaign_name);

-- RSA Assets and Templates
-- For storing AI-generated and custom ad copy
CREATE TABLE IF NOT EXISTS rsa_assets (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL, -- 'headline', 'description'
  campaign_name VARCHAR(500),
  ad_group_name VARCHAR(500),
  asset_text VARCHAR(1000) NOT NULL,
  theme VARCHAR(100),
  source VARCHAR(100), -- 'ai_generated', 'user_created', 'template'
  performance_score DECIMAL(3,2), -- 0.00 to 1.00
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for asset retrieval
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_type
ON rsa_assets(tenant_id, asset_type);

CREATE INDEX IF NOT EXISTS idx_rsa_assets_campaign_adgroup
ON rsa_assets(tenant_id, campaign_name, ad_group_name);

-- Enable Row Level Security (RLS) for tenant isolation
ALTER TABLE tenant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_metrics ENABLE ROW LEVEL SECURITY;  
ALTER TABLE search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_assets ENABLE ROW LEVEL SECURITY;

-- Create helper function for tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for tenant isolation
-- Each tenant can only access their own data

-- Tenant Configs Policy
CREATE POLICY tenant_configs_policy ON tenant_configs
  FOR ALL 
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Tenant Metrics Policy  
CREATE POLICY tenant_metrics_policy ON tenant_metrics
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Search Terms Policy
CREATE POLICY search_terms_policy ON search_terms
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Run Logs Policy
CREATE POLICY run_logs_policy ON run_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Tenant Subscriptions Policy  
CREATE POLICY tenant_subscriptions_policy ON tenant_subscriptions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Campaign Configs Policy
CREATE POLICY campaign_configs_policy ON campaign_configs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- RSA Assets Policy
CREATE POLICY rsa_assets_policy ON rsa_assets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_tenant_configs_updated_at 
  BEFORE UPDATE ON tenant_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_configs_updated_at
  BEFORE UPDATE ON campaign_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsa_assets_updated_at
  BEFORE UPDATE ON rsa_assets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial migration record with corrected syntax
INSERT INTO tenant_configs (tenant_id, config_key, config_value) 
VALUES ('migration', 'schema_version', json_build_object('version', '001', 'created_at', NOW()))
ON CONFLICT (tenant_id, config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE tenant_configs IS 'Stores tenant-specific configuration data, replacing Google Sheets CONFIG tabs';
COMMENT ON TABLE tenant_metrics IS 'Stores campaign/ad group performance metrics, replacing Google Sheets METRICS tabs';
COMMENT ON TABLE search_terms IS 'Stores search terms data for analysis, replacing Google Sheets SEARCH_TERMS tabs';
COMMENT ON TABLE run_logs IS 'Stores script execution logs, replacing Google Sheets RUN_LOGS tabs';
COMMENT ON TABLE tenant_subscriptions IS 'Stores subscription and billing information for each tenant';
COMMENT ON TABLE campaign_configs IS 'Stores campaign-specific settings like budget caps and exclusions';
COMMENT ON TABLE rsa_assets IS 'Stores RSA headlines and descriptions with performance tracking';