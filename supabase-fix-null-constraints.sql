-- Fix remaining NOT NULL constraints
-- Run this AFTER supabase-complete-fix.sql

-- ========================================
-- 1. Fix device_metrics - make device_type nullable
-- ========================================
ALTER TABLE device_metrics
ALTER COLUMN device_type DROP NOT NULL;

-- ========================================
-- 2. Fix keyword_performance - make keyword nullable
-- ========================================
ALTER TABLE keyword_performance
ALTER COLUMN keyword DROP NOT NULL;

-- ========================================
-- 3. Fix hourly_patterns - make day_of_week nullable
-- ========================================
ALTER TABLE hourly_patterns
ALTER COLUMN day_of_week DROP NOT NULL;

-- ========================================
-- 4. Verify the constraints are working
-- ========================================

-- Drop and recreate constraints to ensure they work
ALTER TABLE device_metrics DROP CONSTRAINT IF EXISTS device_metrics_unique_key;
ALTER TABLE keyword_performance DROP CONSTRAINT IF EXISTS keyword_performance_unique_key;
ALTER TABLE hourly_patterns DROP CONSTRAINT IF EXISTS hourly_patterns_unique_key;

-- Recreate with correct columns
ALTER TABLE device_metrics
ADD CONSTRAINT device_metrics_unique_key
UNIQUE (tenant_id, campaign_id, device, date);

ALTER TABLE keyword_performance
ADD CONSTRAINT keyword_performance_unique_key
UNIQUE (tenant_id, keyword_id, date);

ALTER TABLE hourly_patterns
ADD CONSTRAINT hourly_patterns_unique_key
UNIQUE (tenant_id, campaign_id, hour, date);

-- ========================================
-- 5. Refresh schema cache
-- ========================================
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed NOT NULL constraints!';
    RAISE NOTICE 'device_type, keyword, and day_of_week are now nullable.';
    RAISE NOTICE 'Constraints have been recreated.';
    RAISE NOTICE 'Please wait 30 seconds for cache to refresh.';
END $$;