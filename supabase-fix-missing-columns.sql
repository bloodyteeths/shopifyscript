-- Focused Supabase Schema Fix
-- This addresses the exact errors from test-supabase-operations.js

-- ========================================
-- 1. Fix device_metrics - add missing columns
-- ========================================
ALTER TABLE device_metrics
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS device VARCHAR(50);  -- Critical missing column!

-- ========================================
-- 2. Fix keyword_performance - add missing columns
-- ========================================
ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS keyword_id TEXT;  -- Critical for unique constraint!

-- ========================================
-- 3. Fix hourly_patterns - handle day_of_week
-- ========================================
-- First check if day_of_week exists and is NOT NULL
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hourly_patterns'
        AND column_name = 'day_of_week'
    ) THEN
        -- Make it nullable if it exists
        ALTER TABLE hourly_patterns
        ALTER COLUMN day_of_week DROP NOT NULL;
        RAISE NOTICE 'Made day_of_week nullable';
    ELSE
        -- Add it as nullable
        ALTER TABLE hourly_patterns
        ADD COLUMN day_of_week INTEGER;
        RAISE NOTICE 'Added day_of_week column';
    END IF;
END $$;

-- Add other missing columns to hourly_patterns
ALTER TABLE hourly_patterns
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS hour INTEGER;  -- Critical for unique constraint!

-- ========================================
-- 4. Fix geographic_data - add missing columns
-- ========================================
ALTER TABLE geographic_data
ADD COLUMN IF NOT EXISTS location TEXT,  -- Critical missing column!
ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- ========================================
-- 5. Fix ad_performance - add missing columns
-- ========================================
ALTER TABLE ad_performance
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS ad_group_name TEXT;

-- ========================================
-- 6. Drop and recreate constraints with correct columns
-- ========================================

-- Drop all existing constraints first
ALTER TABLE campaign_details DROP CONSTRAINT IF EXISTS campaign_details_unique_key;
ALTER TABLE device_metrics DROP CONSTRAINT IF EXISTS device_metrics_unique_key;
ALTER TABLE keyword_performance DROP CONSTRAINT IF EXISTS keyword_performance_unique_key;
ALTER TABLE hourly_patterns DROP CONSTRAINT IF EXISTS hourly_patterns_unique_key;
ALTER TABLE geographic_data DROP CONSTRAINT IF EXISTS geographic_data_unique_key;
ALTER TABLE ad_performance DROP CONSTRAINT IF EXISTS ad_performance_unique_key;

-- Wait a moment for schema to update
DO $$
BEGIN
    PERFORM pg_sleep(1);
END $$;

-- Create new constraints
ALTER TABLE campaign_details
ADD CONSTRAINT campaign_details_unique_key
UNIQUE (tenant_id, campaign_id, date);

ALTER TABLE device_metrics
ADD CONSTRAINT device_metrics_unique_key
UNIQUE (tenant_id, campaign_id, device, date);

ALTER TABLE keyword_performance
ADD CONSTRAINT keyword_performance_unique_key
UNIQUE (tenant_id, keyword_id, date);

ALTER TABLE hourly_patterns
ADD CONSTRAINT hourly_patterns_unique_key
UNIQUE (tenant_id, campaign_id, hour, date);

ALTER TABLE geographic_data
ADD CONSTRAINT geographic_data_unique_key
UNIQUE (tenant_id, campaign_id, location, date);

ALTER TABLE ad_performance
ADD CONSTRAINT ad_performance_unique_key
UNIQUE (tenant_id, ad_id, date);

-- ========================================
-- 7. Verify critical columns exist
-- ========================================
DO $$
DECLARE
    missing_columns TEXT := '';
BEGIN
    -- Check device_metrics.device
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'device_metrics' AND column_name = 'device'
    ) THEN
        missing_columns := missing_columns || 'device_metrics.device, ';
    END IF;

    -- Check device_metrics.campaign_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'device_metrics' AND column_name = 'campaign_name'
    ) THEN
        missing_columns := missing_columns || 'device_metrics.campaign_name, ';
    END IF;

    -- Check keyword_performance.keyword_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'keyword_performance' AND column_name = 'keyword_id'
    ) THEN
        missing_columns := missing_columns || 'keyword_performance.keyword_id, ';
    END IF;

    -- Check keyword_performance.campaign_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'keyword_performance' AND column_name = 'campaign_name'
    ) THEN
        missing_columns := missing_columns || 'keyword_performance.campaign_name, ';
    END IF;

    -- Check hourly_patterns.hour
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hourly_patterns' AND column_name = 'hour'
    ) THEN
        missing_columns := missing_columns || 'hourly_patterns.hour, ';
    END IF;

    -- Check geographic_data.location
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'geographic_data' AND column_name = 'location'
    ) THEN
        missing_columns := missing_columns || 'geographic_data.location, ';
    END IF;

    -- Check ad_performance.campaign_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ad_performance' AND column_name = 'campaign_name'
    ) THEN
        missing_columns := missing_columns || 'ad_performance.campaign_name, ';
    END IF;

    IF LENGTH(missing_columns) > 0 THEN
        RAISE WARNING 'Still missing columns after migration: %', missing_columns;
    ELSE
        RAISE NOTICE '✅ All critical columns have been added successfully!';
    END IF;
END $$;

-- ========================================
-- 8. Refresh schema cache
-- ========================================
NOTIFY pgrst, 'reload schema';

-- Final status
DO $$
BEGIN
    RAISE NOTICE '=====================================';
    RAISE NOTICE 'Migration completed!';
    RAISE NOTICE 'Please wait 30-60 seconds for schema cache to refresh.';
    RAISE NOTICE 'Then run test-supabase-operations.js to verify.';
    RAISE NOTICE '=====================================';
END $$;