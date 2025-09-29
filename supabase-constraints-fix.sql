-- Supabase Constraints and Schema Fix
-- This fixes the unique constraints and missing columns

-- 1. Drop existing constraints if they exist
ALTER TABLE campaign_details
DROP CONSTRAINT IF EXISTS campaign_details_unique_constraint;

ALTER TABLE device_metrics
DROP CONSTRAINT IF EXISTS device_metrics_unique_constraint;

ALTER TABLE keyword_performance
DROP CONSTRAINT IF EXISTS keyword_performance_unique_constraint;

ALTER TABLE hourly_patterns
DROP CONSTRAINT IF EXISTS hourly_patterns_unique_constraint;

ALTER TABLE geographic_data
DROP CONSTRAINT IF EXISTS geographic_data_unique_constraint;

ALTER TABLE ad_performance
DROP CONSTRAINT IF EXISTS ad_performance_unique_constraint;

-- 2. Add campaign_id column to tables that don't have it
ALTER TABLE device_metrics
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

ALTER TABLE hourly_patterns
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

ALTER TABLE geographic_data
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

-- 3. Add conversion_value column where missing
ALTER TABLE device_metrics
ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2);

-- 4. Create proper unique constraints for upserts
-- Campaign details: unique per tenant, campaign, date
ALTER TABLE campaign_details
ADD CONSTRAINT campaign_details_unique_key
UNIQUE (tenant_id, campaign_id, date);

-- Device metrics: unique per tenant, campaign, device, date
ALTER TABLE device_metrics
ADD CONSTRAINT device_metrics_unique_key
UNIQUE (tenant_id, campaign_id, device, date);

-- Keyword performance: unique per tenant, keyword_id, date
ALTER TABLE keyword_performance
ADD CONSTRAINT keyword_performance_unique_key
UNIQUE (tenant_id, keyword_id, date);

-- Hourly patterns: unique per tenant, campaign_id, hour, date
ALTER TABLE hourly_patterns
ADD CONSTRAINT hourly_patterns_unique_key
UNIQUE (tenant_id, campaign_id, hour, date);

-- Geographic data: unique per tenant, campaign_id, location, date
ALTER TABLE geographic_data
ADD CONSTRAINT geographic_data_unique_key
UNIQUE (tenant_id, campaign_id, location, date);

-- Ad performance: unique per tenant, ad_id, date
ALTER TABLE ad_performance
ADD CONSTRAINT ad_performance_unique_key
UNIQUE (tenant_id, ad_id, date);

-- 5. Add missing location column to geographic_data if it doesn't exist
ALTER TABLE geographic_data
ADD COLUMN IF NOT EXISTS location TEXT;

-- 6. Refresh schema cache - this is important!
NOTIFY pgrst, 'reload schema';

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_metrics_campaign
ON device_metrics(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_keyword_performance_campaign
ON keyword_performance(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_hourly_patterns_campaign
ON hourly_patterns(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_geographic_data_campaign
ON geographic_data(campaign_id, tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_ad_performance_campaign
ON ad_performance(campaign_id, tenant_id, date);

-- 8. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Constraints and schema fixes applied successfully. Schema cache will be refreshed.';
END $$;