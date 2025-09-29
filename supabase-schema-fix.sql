-- Supabase Schema Fix Migration
-- This migration adds missing columns and fixes table naming issues
-- to match the data being sent from Google Ads Script

-- 1. Fix search_terms table - add cost column
ALTER TABLE search_terms
ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);

-- Update cost from cost_micros if needed
UPDATE search_terms
SET cost = cost_micros / 1000000.0
WHERE cost IS NULL AND cost_micros IS NOT NULL;

-- 2. Fix campaign_details table - add missing columns for daily segmentation
ALTER TABLE campaign_details
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS daily_budget DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS budget_period VARCHAR(20),
ADD COLUMN IF NOT EXISTS cpc_ceiling DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4);

-- 3. Fix device_metrics table - add missing columns
ALTER TABLE device_metrics
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS roas DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2);

-- Rename cpc to avg_cpc if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'device_metrics'
             AND column_name = 'cpc'
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'device_metrics'
                            AND column_name = 'avg_cpc')) THEN
    ALTER TABLE device_metrics RENAME COLUMN cpc TO avg_cpc;
  END IF;
END $$;

-- 4. Fix keyword_performance table - add missing columns
ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS ad_group_name TEXT,
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS search_impression_share DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS search_top_impression_share DECIMAL(10, 4);

-- 5. Fix hourly_patterns table - add missing columns
ALTER TABLE hourly_patterns
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

-- 6. Create geographic_data table or rename geographic_performance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'geographic_performance'
             AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                            WHERE table_schema = 'public'
                            AND table_name = 'geographic_data')) THEN
    -- Rename the table
    ALTER TABLE geographic_performance RENAME TO geographic_data;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'geographic_data') THEN
    -- Create the table if it doesn't exist
    CREATE TABLE geographic_data (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id TEXT NOT NULL,
      date DATE NOT NULL,
      type VARCHAR(50),
      campaign_name TEXT,
      campaign_id TEXT,
      location TEXT,
      location_type VARCHAR(50),
      clicks INTEGER DEFAULT 0,
      cost DECIMAL(10, 2) DEFAULT 0,
      conversions DECIMAL(10, 2) DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr DECIMAL(10, 4) DEFAULT 0,
      conversion_rate DECIMAL(10, 4) DEFAULT 0,
      avg_cpc DECIMAL(10, 4) DEFAULT 0,
      cost_per_conversion DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX idx_geographic_data_tenant_date ON geographic_data(tenant_id, date);
    CREATE INDEX idx_geographic_data_campaign ON geographic_data(campaign_id);
    CREATE INDEX idx_geographic_data_location ON geographic_data(location);
  END IF;
END $$;

-- Add missing columns to geographic_data if it exists
ALTER TABLE geographic_data
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10, 2);

-- 7. Fix ad_performance table - add missing columns
ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS ad_group_name TEXT,
ADD COLUMN IF NOT EXISTS headline1 TEXT,
ADD COLUMN IF NOT EXISTS headline2 TEXT,
ADD COLUMN IF NOT EXISTS headline3 TEXT,
ADD COLUMN IF NOT EXISTS description1 TEXT,
ADD COLUMN IF NOT EXISTS description2 TEXT,
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2);

-- 8. Add composite indexes for better query performance with daily segmentation
CREATE INDEX IF NOT EXISTS idx_campaign_details_tenant_date
ON campaign_details(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_device_metrics_tenant_date
ON device_metrics(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_keyword_performance_tenant_date
ON keyword_performance(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_hourly_patterns_tenant_date
ON hourly_patterns(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_ad_performance_tenant_date
ON ad_performance(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_search_terms_tenant_date
ON search_terms(tenant_id, date);

-- 9. Update RLS policies to handle new columns
-- Enable RLS if not already enabled
ALTER TABLE campaign_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Campaign details policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_details' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON campaign_details
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Device metrics policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'device_metrics' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON device_metrics
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Keyword performance policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keyword_performance' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON keyword_performance
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Hourly patterns policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hourly_patterns' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON hourly_patterns
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Geographic data policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'geographic_data' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON geographic_data
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Ad performance policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ad_performance' AND policyname = 'tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON ad_performance
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;
END $$;

-- 10. Create a function to clean up old daily segmented data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_daily_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT
) AS $$
DECLARE
  cutoff_date DATE := CURRENT_DATE - days_to_keep;
  deleted_count BIGINT;
BEGIN
  -- Clean campaign_details
  DELETE FROM campaign_details WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'campaign_details';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean device_metrics
  DELETE FROM device_metrics WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'device_metrics';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean keyword_performance
  DELETE FROM keyword_performance WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'keyword_performance';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean hourly_patterns
  DELETE FROM hourly_patterns WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'hourly_patterns';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean geographic_data
  DELETE FROM geographic_data WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'geographic_data';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean ad_performance
  DELETE FROM ad_performance WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'ad_performance';
  rows_deleted := deleted_count;
  RETURN NEXT;

  -- Clean search_terms
  DELETE FROM search_terms WHERE date < cutoff_date;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  table_name := 'search_terms';
  rows_deleted := deleted_count;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant usage permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMENT ON FUNCTION cleanup_old_daily_data IS 'Removes daily segmented data older than specified days (default 90)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Schema migration completed successfully. Tables are now ready for daily segmented data collection.';
END $$;