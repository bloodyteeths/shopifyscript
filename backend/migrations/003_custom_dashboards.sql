-- Ads Autopilot AI Custom Dashboards Migration
-- Version: 003 - Enterprise Custom Dashboards
-- Description: Tables for Enterprise-tier custom dashboard configurations

-- Custom Dashboards Table
-- Stores the main dashboard configuration
CREATE TABLE IF NOT EXISTS custom_dashboards (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  dashboard_name VARCHAR(200) NOT NULL,
  dashboard_slug VARCHAR(100) NOT NULL, -- URL-friendly identifier
  description TEXT,
  layout_config JSONB NOT NULL, -- Stores widget layout, sizes, positions
  theme_config JSONB DEFAULT '{}', -- Colors, fonts, styling
  is_default BOOLEAN DEFAULT false, -- Can only have one default per tenant
  is_shared BOOLEAN DEFAULT false, -- For dashboard sharing functionality
  share_token VARCHAR(100), -- Token for public sharing (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  
  UNIQUE(tenant_id, dashboard_slug),
  UNIQUE(tenant_id, dashboard_name)
);

-- Dashboard Widgets Table
-- Stores individual widget configurations within dashboards
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id SERIAL PRIMARY KEY,
  dashboard_id INTEGER NOT NULL REFERENCES custom_dashboards(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL, -- 'metric_card', 'line_chart', 'bar_chart', 'pie_chart', 'table', 'kpi_grid'
  widget_title VARCHAR(200) NOT NULL,
  widget_config JSONB NOT NULL, -- Chart settings, data source, filters, etc.
  position_config JSONB NOT NULL, -- { x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1 }
  data_source VARCHAR(100) NOT NULL, -- 'metrics', 'campaigns', 'search_terms', 'custom_query'
  filters JSONB DEFAULT '{}', -- Date range, campaign filters, etc.
  refresh_interval INTEGER DEFAULT 300, -- Seconds between refreshes (null = manual only)
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard Templates Table
-- Pre-built dashboard templates for quick setup
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL UNIQUE,
  template_description TEXT,
  template_category VARCHAR(50), -- 'performance', 'roas', 'campaign_overview', 'custom'
  layout_config JSONB NOT NULL,
  widget_configs JSONB NOT NULL, -- Array of widget configurations
  theme_config JSONB DEFAULT '{}',
  tier_requirement VARCHAR(20) DEFAULT 'enterprise', -- 'starter', 'professional', 'enterprise'
  is_system_template BOOLEAN DEFAULT true,
  preview_image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom KPI Definitions Table  
-- Enterprise users can define custom KPIs and calculations
CREATE TABLE IF NOT EXISTS custom_kpis (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  kpi_name VARCHAR(100) NOT NULL,
  kpi_description TEXT,
  calculation_formula TEXT NOT NULL, -- SQL-like formula or function name
  data_sources JSONB NOT NULL, -- Which tables/metrics this KPI uses
  display_format JSONB DEFAULT '{}', -- Number formatting, units, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, kpi_name)
);

-- Dashboard Access Logs Table
-- Track usage for analytics and billing
CREATE TABLE IF NOT EXISTS dashboard_access_logs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL,
  dashboard_id INTEGER REFERENCES custom_dashboards(id) ON DELETE SET NULL,
  access_type VARCHAR(20) NOT NULL, -- 'view', 'edit', 'export', 'share'
  user_agent TEXT,
  ip_address INET,
  session_id VARCHAR(100),
  access_duration INTEGER, -- Seconds spent on dashboard (for 'view' type)
  exported_format VARCHAR(20), -- 'pdf', 'excel', 'png' (for 'export' type)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_tenant_id ON custom_dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_tenant_slug ON custom_dashboards(tenant_id, dashboard_slug);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX IF NOT EXISTS idx_custom_kpis_tenant_id ON custom_kpis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_access_logs_tenant_date ON dashboard_access_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_category ON dashboard_templates(template_category);

-- Enable Row Level Security (RLS) for tenant isolation
ALTER TABLE custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation

-- Custom Dashboards Policy
CREATE POLICY custom_dashboards_policy ON custom_dashboards
  FOR ALL 
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Dashboard Widgets Policy (through dashboard ownership)
CREATE POLICY dashboard_widgets_policy ON dashboard_widgets
  FOR ALL
  USING (
    dashboard_id IN (
      SELECT id FROM custom_dashboards 
      WHERE tenant_id = current_setting('app.current_tenant_id', true)
    )
  );

-- Custom KPIs Policy
CREATE POLICY custom_kpis_policy ON custom_kpis
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Dashboard Access Logs Policy
CREATE POLICY dashboard_access_logs_policy ON dashboard_access_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Add updated_at triggers
CREATE TRIGGER update_custom_dashboards_updated_at 
  BEFORE UPDATE ON custom_dashboards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at 
  BEFORE UPDATE ON dashboard_widgets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_templates_updated_at 
  BEFORE UPDATE ON dashboard_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_kpis_updated_at 
  BEFORE UPDATE ON custom_kpis 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default dashboard templates
INSERT INTO dashboard_templates (template_name, template_description, template_category, layout_config, widget_configs, theme_config) VALUES 
(
  'Enterprise Performance Overview',
  'Comprehensive performance dashboard with advanced metrics and custom visualizations',
  'performance',
  '{
    "cols": 12,
    "rowHeight": 60,
    "margin": [10, 10],
    "containerPadding": [10, 10]
  }',
  '[
    {
      "widget_type": "kpi_grid",
      "widget_title": "Key Performance Indicators",
      "position_config": {"x": 0, "y": 0, "w": 12, "h": 3, "minW": 8, "minH": 2},
      "data_source": "metrics",
      "widget_config": {
        "kpis": ["clicks", "cost", "conversions", "ctr", "cpc", "roas", "profit_margin", "conversion_rate"],
        "showComparison": true,
        "comparisonPeriod": "previous_period"
      }
    },
    {
      "widget_type": "line_chart", 
      "widget_title": "Performance Trends",
      "position_config": {"x": 0, "y": 3, "w": 8, "h": 4, "minW": 6, "minH": 3},
      "data_source": "metrics",
      "widget_config": {
        "metrics": ["clicks", "conversions", "cost"],
        "chartType": "multi_line",
        "showTrendlines": true
      }
    },
    {
      "widget_type": "pie_chart",
      "widget_title": "Campaign Distribution",
      "position_config": {"x": 8, "y": 3, "w": 4, "h": 4, "minW": 3, "minH": 3},
      "data_source": "campaigns",
      "widget_config": {
        "metric": "cost",
        "groupBy": "campaign_name",
        "maxItems": 6
      }
    }
  ]',
  '{
    "primaryColor": "#5C6AC4",
    "secondaryColor": "#00A047",
    "backgroundColor": "#f8f9fa",
    "cardStyle": "elevated"
  }'
),
(
  'ROAS Analysis Dashboard',
  'Advanced return on ad spend analysis with custom ROAS modeling',
  'roas',
  '{
    "cols": 12,
    "rowHeight": 60,
    "margin": [10, 10],
    "containerPadding": [10, 10]
  }',
  '[
    {
      "widget_type": "metric_card",
      "widget_title": "Overall ROAS",
      "position_config": {"x": 0, "y": 0, "w": 3, "h": 2, "minW": 2, "minH": 2},
      "data_source": "metrics",
      "widget_config": {
        "metric": "roas",
        "format": "decimal",
        "showTrend": true,
        "trendPeriod": "7d"
      }
    },
    {
      "widget_type": "bar_chart",
      "widget_title": "ROAS by Campaign",
      "position_config": {"x": 3, "y": 0, "w": 9, "h": 4, "minW": 6, "minH": 3},
      "data_source": "metrics",
      "widget_config": {
        "metric": "roas",
        "groupBy": "campaign_name",
        "sortBy": "roas",
        "sortOrder": "desc"
      }
    },
    {
      "widget_type": "table",
      "widget_title": "Top Performing Keywords",
      "position_config": {"x": 0, "y": 4, "w": 12, "h": 3, "minW": 8, "minH": 2},
      "data_source": "search_terms",
      "widget_config": {
        "columns": ["search_term", "clicks", "cost", "conversions", "roas"],
        "sortBy": "roas",
        "sortOrder": "desc",
        "maxRows": 10
      }
    }
  ]',
  '{
    "primaryColor": "#28a745",
    "secondaryColor": "#ffc107",
    "backgroundColor": "#ffffff",
    "cardStyle": "bordered"
  }'
),
(
  'Campaign Deep Dive',
  'Detailed campaign analysis with advanced segmentation',
  'campaign_overview',
  '{
    "cols": 12,
    "rowHeight": 60,
    "margin": [10, 10],
    "containerPadding": [10, 10]
  }',
  '[
    {
      "widget_type": "line_chart",
      "widget_title": "Daily Performance",
      "position_config": {"x": 0, "y": 0, "w": 12, "h": 4, "minW": 8, "minH": 3},
      "data_source": "metrics",
      "widget_config": {
        "metrics": ["clicks", "impressions", "cost", "conversions"],
        "chartType": "area",
        "granularity": "daily"
      }
    },
    {
      "widget_type": "table",
      "widget_title": "Campaign Performance",
      "position_config": {"x": 0, "y": 4, "w": 8, "h": 4, "minW": 6, "minH": 3},
      "data_source": "metrics",
      "widget_config": {
        "columns": ["campaign_name", "clicks", "cost", "conversions", "ctr", "cpc", "roas"],
        "groupBy": "campaign_name",
        "sortBy": "cost",
        "sortOrder": "desc"
      }
    },
    {
      "widget_type": "pie_chart",
      "widget_title": "Budget Allocation",
      "position_config": {"x": 8, "y": 4, "w": 4, "h": 4, "minW": 3, "minH": 3},
      "data_source": "metrics",
      "widget_config": {
        "metric": "cost",
        "groupBy": "campaign_name",
        "maxItems": 8
      }
    }
  ]',
  '{
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "backgroundColor": "#f8f9fa",
    "cardStyle": "minimal"
  }'
);

-- Update migration record
INSERT INTO tenant_configs (tenant_id, config_key, config_value) 
VALUES ('migration', 'schema_version', json_build_object('version', '003', 'created_at', NOW()))
ON CONFLICT (tenant_id, config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE custom_dashboards IS 'Enterprise-tier custom dashboard configurations';
COMMENT ON TABLE dashboard_widgets IS 'Individual widgets within custom dashboards';
COMMENT ON TABLE dashboard_templates IS 'Pre-built dashboard templates for quick setup';
COMMENT ON TABLE custom_kpis IS 'User-defined key performance indicators';
COMMENT ON TABLE dashboard_access_logs IS 'Audit trail for dashboard usage and access patterns';

-- Create function to generate dashboard share token
CREATE OR REPLACE FUNCTION generate_dashboard_share_token() 
RETURNS VARCHAR(100) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Create function to validate dashboard tier access
CREATE OR REPLACE FUNCTION validate_dashboard_tier_access(tenant_id_param TEXT, required_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT tier INTO user_tier 
  FROM tenant_subscriptions 
  WHERE tenant_id = tenant_id_param;
  
  -- Enterprise has access to everything
  IF user_tier = 'enterprise' THEN
    RETURN TRUE;
  END IF;
  
  -- Professional has access to starter features
  IF user_tier = 'professional' AND required_tier = 'starter' THEN
    RETURN TRUE;
  END IF;
  
  -- Exact tier match
  IF user_tier = required_tier THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;