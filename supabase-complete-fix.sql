-- Supabase Complete Schema Fix
-- First add all missing columns, then create constraints

-- ========================================
-- STEP 1: Add all missing columns first
-- ========================================

-- Add missing columns to campaign_details
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

-- Add missing columns to device_metrics
ALTER TABLE device_metrics
ADD COLUMN IF NOT EXISTS device VARCHAR(50),  -- This was missing!
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS roas DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2);

-- Add missing columns to keyword_performance
ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS ad_group_id TEXT,
ADD COLUMN IF NOT EXISTS ad_group_name TEXT,
ADD COLUMN IF NOT EXISTS keyword_id TEXT,
ADD COLUMN IF NOT EXISTS keyword_text TEXT,
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS search_impression_share DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS search_top_impression_share DECIMAL(10, 4);

-- Add missing columns to hourly_patterns
ALTER TABLE hourly_patterns
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS hour INTEGER,
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

-- Create geographic_data table if it doesn't exist, or add columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public'
                 AND table_name = 'geographic_data') THEN
    -- Create the table
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
  ELSE
    -- Table exists, add missing columns
    ALTER TABLE geographic_data
    ADD COLUMN IF NOT EXISTS type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS campaign_id TEXT,
    ADD COLUMN IF NOT EXISTS campaign_name TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS location_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
    ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
    ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10, 2);
  END IF;
END $$;

-- Add missing columns to ad_performance
ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS campaign_id TEXT,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS ad_group_id TEXT,
ADD COLUMN IF NOT EXISTS ad_group_name TEXT,
ADD COLUMN IF NOT EXISTS ad_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS headline1 TEXT,
ADD COLUMN IF NOT EXISTS headline2 TEXT,
ADD COLUMN IF NOT EXISTS headline3 TEXT,
ADD COLUMN IF NOT EXISTS description1 TEXT,
ADD COLUMN IF NOT EXISTS description2 TEXT,
ADD COLUMN IF NOT EXISTS avg_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2);

-- Add cost column to search_terms if missing
ALTER TABLE search_terms
ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);

-- ========================================
-- STEP 2: Drop existing constraints
-- ========================================

ALTER TABLE campaign_details DROP CONSTRAINT IF EXISTS campaign_details_unique_constraint;
ALTER TABLE campaign_details DROP CONSTRAINT IF EXISTS campaign_details_unique_key;

ALTER TABLE device_metrics DROP CONSTRAINT IF EXISTS device_metrics_unique_constraint;
ALTER TABLE device_metrics DROP CONSTRAINT IF EXISTS device_metrics_unique_key;

ALTER TABLE keyword_performance DROP CONSTRAINT IF EXISTS keyword_performance_unique_constraint;
ALTER TABLE keyword_performance DROP CONSTRAINT IF EXISTS keyword_performance_unique_key;

ALTER TABLE hourly_patterns DROP CONSTRAINT IF EXISTS hourly_patterns_unique_constraint;
ALTER TABLE hourly_patterns DROP CONSTRAINT IF EXISTS hourly_patterns_unique_key;

ALTER TABLE geographic_data DROP CONSTRAINT IF EXISTS geographic_data_unique_constraint;
ALTER TABLE geographic_data DROP CONSTRAINT IF EXISTS geographic_data_unique_key;

ALTER TABLE ad_performance DROP CONSTRAINT IF EXISTS ad_performance_unique_constraint;
ALTER TABLE ad_performance DROP CONSTRAINT IF EXISTS ad_performance_unique_key;

-- ========================================
-- STEP 3: Create new unique constraints
-- ========================================

-- Campaign details: unique per tenant, campaign, date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_details_unique_key'
  ) THEN
    ALTER TABLE campaign_details
    ADD CONSTRAINT campaign_details_unique_key
    UNIQUE (tenant_id, campaign_id, date);
  END IF;
END $$;

-- Device metrics: unique per tenant, campaign, device, date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'device_metrics_unique_key'
  ) THEN
    ALTER TABLE device_metrics
    ADD CONSTRAINT device_metrics_unique_key
    UNIQUE (tenant_id, campaign_id, device, date);
  END IF;
END $$;

-- Keyword performance: unique per tenant, keyword_id, date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'keyword_performance_unique_key'
  ) THEN
    ALTER TABLE keyword_performance
    ADD CONSTRAINT keyword_performance_unique_key
    UNIQUE (tenant_id, keyword_id, date);
  END IF;
END $$;

-- Hourly patterns: unique per tenant, campaign_id, hour, date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hourly_patterns_unique_key'
  ) THEN
    ALTER TABLE hourly_patterns
    ADD CONSTRAINT hourly_patterns_unique_key
    UNIQUE (tenant_id, campaign_id, hour, date);
  END IF;
END $$;

-- Geographic data: unique per tenant, campaign_id, location, date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'geographic_data_unique_key'
  ) THEN
    ALTER TABLE geographic_data
    ADD CONSTRAINT geographic_data_unique_key
    UNIQUE (tenant_id, campaign_id, location, date);
  END IF;
END $$;

-- Ad performance: unique per tenant, ad_id, date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ad_performance_unique_key'
  ) THEN
    ALTER TABLE ad_performance
    ADD CONSTRAINT ad_performance_unique_key
    UNIQUE (tenant_id, ad_id, date);
  END IF;
END $$;

-- ========================================
-- STEP 4: Create indexes for performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_campaign_details_tenant_date
ON campaign_details(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_device_metrics_tenant_date
ON device_metrics(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_device_metrics_campaign
ON device_metrics(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_keyword_performance_tenant_date
ON keyword_performance(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_keyword_performance_campaign
ON keyword_performance(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_hourly_patterns_tenant_date
ON hourly_patterns(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_hourly_patterns_campaign
ON hourly_patterns(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_geographic_data_tenant_date
ON geographic_data(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_geographic_data_campaign
ON geographic_data(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_ad_performance_tenant_date
ON ad_performance(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_ad_performance_campaign
ON ad_performance(campaign_id, tenant_id, date);

-- ========================================
-- STEP 5: Enable RLS and create policies
-- ========================================

ALTER TABLE campaign_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Drop existing policies first to avoid conflicts
  DROP POLICY IF EXISTS tenant_isolation ON campaign_details;
  DROP POLICY IF EXISTS tenant_isolation ON device_metrics;
  DROP POLICY IF EXISTS tenant_isolation ON keyword_performance;
  DROP POLICY IF EXISTS tenant_isolation ON hourly_patterns;
  DROP POLICY IF EXISTS tenant_isolation ON geographic_data;
  DROP POLICY IF EXISTS tenant_isolation ON ad_performance;

  -- Create new policies
  CREATE POLICY tenant_isolation ON campaign_details
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), tenant_id));

  CREATE POLICY tenant_isolation ON device_metrics
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), tenant_id));

  CREATE POLICY tenant_isolation ON keyword_performance
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), tenant_id));

  CREATE POLICY tenant_isolation ON hourly_patterns
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), tenant_id));

  CREATE POLICY tenant_isolation ON geographic_data
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), tenant_id));

  CREATE POLICY tenant_isolation ON ad_performance
    FOR ALL USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), tenant_id));
END $$;

-- ========================================
-- STEP 6: Grant permissions
-- ========================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- STEP 7: Refresh schema cache
-- ========================================

-- This notifies PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';

-- ========================================
-- STEP 8: Verify columns exist
-- ========================================

DO $$
DECLARE
  missing_columns TEXT := '';
BEGIN
  -- Check device_metrics has device column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'device_metrics'
                 AND column_name = 'device') THEN
    missing_columns := missing_columns || 'device_metrics.device, ';
  END IF;

  -- Check geographic_data has location column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'geographic_data'
                 AND column_name = 'location') THEN
    missing_columns := missing_columns || 'geographic_data.location, ';
  END IF;

  -- Check keyword_performance has keyword_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'keyword_performance'
                 AND column_name = 'keyword_id') THEN
    missing_columns := missing_columns || 'keyword_performance.keyword_id, ';
  END IF;

  IF LENGTH(missing_columns) > 0 THEN
    RAISE WARNING 'Still missing columns: %', missing_columns;
  ELSE
    RAISE NOTICE 'All required columns are present!';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Schema migration completed successfully!';
  RAISE NOTICE 'All columns added, constraints created, and schema cache refreshed.';
  RAISE NOTICE 'If you still see errors, try restarting your Supabase project or waiting a few minutes for cache to clear.';
END $$;