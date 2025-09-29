-- Fix Remaining Supabase Issues from Script Run
-- Run this after the previous migrations

-- ========================================
-- 1. Add missing first_page_cpc column to keyword_performance
-- ========================================
ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS first_page_cpc DECIMAL(10, 4);

-- ========================================
-- 2. Verify and fix device_metrics constraint
-- ========================================

-- First check what constraints exist
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Check if the constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'device_metrics_unique_key'
        AND conrelid = 'device_metrics'::regclass
    ) INTO constraint_exists;

    IF constraint_exists THEN
        RAISE NOTICE 'device_metrics_unique_key exists, dropping and recreating...';
        ALTER TABLE device_metrics DROP CONSTRAINT device_metrics_unique_key;
    ELSE
        RAISE NOTICE 'device_metrics_unique_key does not exist, creating...';
    END IF;
END $$;

-- Create the correct unique constraint for device_metrics
ALTER TABLE device_metrics
ADD CONSTRAINT device_metrics_unique_key
UNIQUE (tenant_id, campaign_id, device, date);

-- Also create an alternative constraint for backward compatibility
ALTER TABLE device_metrics
DROP CONSTRAINT IF EXISTS device_metrics_tenant_date_device;

ALTER TABLE device_metrics
ADD CONSTRAINT device_metrics_tenant_date_device
UNIQUE (tenant_id, date, device, campaign_id);

-- ========================================
-- 3. Fix geographic_data constraint for duplicate handling
-- ========================================

-- Drop existing constraint
ALTER TABLE geographic_data DROP CONSTRAINT IF EXISTS geographic_data_unique_key;

-- Create a more specific constraint to prevent duplicates
ALTER TABLE geographic_data
ADD CONSTRAINT geographic_data_unique_key
UNIQUE (tenant_id, campaign_id, location, date);

-- Also add location_type to make it more specific if needed
ALTER TABLE geographic_data
DROP CONSTRAINT IF EXISTS geographic_data_full_unique;

ALTER TABLE geographic_data
ADD CONSTRAINT geographic_data_full_unique
UNIQUE (tenant_id, campaign_id, location, location_type, date);

-- ========================================
-- 4. Check and verify all constraints
-- ========================================
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== Current Constraints ===';

    FOR rec IN
        SELECT
            conname as constraint_name,
            pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid IN (
            'device_metrics'::regclass,
            'keyword_performance'::regclass,
            'geographic_data'::regclass
        )
        AND contype = 'u'  -- unique constraints only
    LOOP
        RAISE NOTICE '% : %', rec.constraint_name, rec.definition;
    END LOOP;
END $$;

-- ========================================
-- 5. Add any other missing columns that might be needed
-- ========================================

-- Add more columns to keyword_performance if needed
ALTER TABLE keyword_performance
ADD COLUMN IF NOT EXISTS top_of_page_cpc DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS absolute_top_impression_share DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS search_exact_match_impression_share DECIMAL(10, 4);

-- Add location_type if missing from geographic_data
ALTER TABLE geographic_data
ADD COLUMN IF NOT EXISTS location_type VARCHAR(50);

-- ========================================
-- 6. Create indexes for better upsert performance
-- ========================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_device_metrics_upsert;
DROP INDEX IF EXISTS idx_geographic_data_upsert;
DROP INDEX IF EXISTS idx_keyword_performance_upsert;

-- Create new composite indexes matching the constraints
CREATE INDEX idx_device_metrics_upsert
ON device_metrics(tenant_id, campaign_id, device, date);

CREATE INDEX idx_geographic_data_upsert
ON geographic_data(tenant_id, campaign_id, location, date);

CREATE INDEX idx_keyword_performance_upsert
ON keyword_performance(tenant_id, keyword_id, date);

-- ========================================
-- 7. Refresh schema cache
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- 8. Final verification
-- ========================================
DO $$
DECLARE
    missing_cols TEXT := '';
BEGIN
    -- Check for first_page_cpc
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'keyword_performance'
        AND column_name = 'first_page_cpc'
    ) THEN
        missing_cols := missing_cols || 'keyword_performance.first_page_cpc, ';
    END IF;

    -- Check device_metrics constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'device_metrics_unique_key'
    ) THEN
        missing_cols := missing_cols || 'device_metrics constraint missing, ';
    END IF;

    -- Check geographic_data constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'geographic_data_unique_key'
    ) THEN
        missing_cols := missing_cols || 'geographic_data constraint missing, ';
    END IF;

    IF LENGTH(missing_cols) > 0 THEN
        RAISE WARNING 'Issues found: %', missing_cols;
    ELSE
        RAISE NOTICE '✅ All issues fixed successfully!';
        RAISE NOTICE 'Columns added: first_page_cpc and related CPC columns';
        RAISE NOTICE 'Constraints fixed: device_metrics and geographic_data';
        RAISE NOTICE 'Indexes created for better performance';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '✅ Migration completed!';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '1. Added first_page_cpc column to keyword_performance';
    RAISE NOTICE '2. Fixed device_metrics ON CONFLICT constraint';
    RAISE NOTICE '3. Fixed geographic_data duplicate handling';
    RAISE NOTICE '4. Added performance indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Please wait 30-60 seconds for cache refresh.';
END $$;