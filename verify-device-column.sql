-- Quick verification script to check device_metrics table structure
-- Run this in Supabase SQL Editor to verify the migration worked

-- 1. Check if device column exists
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'device_metrics'
    AND column_name = 'device';

-- 2. Check all columns in device_metrics
SELECT
    column_name,
    data_type,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'device_metrics'
ORDER BY ordinal_position;

-- 3. Check existing constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'device_metrics'::regclass;

-- 4. Try to manually add device column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'device_metrics'
        AND column_name = 'device'
    ) THEN
        RAISE NOTICE 'Device column is missing! Adding it now...';
        ALTER TABLE device_metrics ADD COLUMN device VARCHAR(50);
        RAISE NOTICE 'Device column added successfully!';
    ELSE
        RAISE NOTICE 'Device column already exists!';
    END IF;
END $$;

-- 5. Verify the column was added
SELECT
    'device_metrics' as table_name,
    COUNT(*) FILTER (WHERE column_name = 'device') as has_device_column,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'device_metrics';

-- 6. Check if we can create the constraint now
DO $$
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE device_metrics DROP CONSTRAINT IF EXISTS device_metrics_unique_key;

    -- Try to create new constraint
    ALTER TABLE device_metrics
    ADD CONSTRAINT device_metrics_unique_key
    UNIQUE (tenant_id, campaign_id, device, date);

    RAISE NOTICE 'Constraint created successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create constraint: %', SQLERRM;
END $$;

-- 7. Final verification
SELECT
    'VERIFICATION COMPLETE' as status,
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'device_metrics' AND column_name = 'device'
    ) as device_column_exists,
    EXISTS(
        SELECT 1 FROM pg_constraint
        WHERE conname = 'device_metrics_unique_key'
    ) as constraint_exists;