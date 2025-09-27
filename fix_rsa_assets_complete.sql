-- Complete fix for rsa_assets table based on actual error messages
-- The table appears to have these columns based on the error:
-- (id, tenant_id, [some nulls], asset_type, theme, [some nulls], created_at, updated_at,
--  [more nulls], headlines_pipe, descriptions_pipe, rationale, source_url, approval_status)

-- Step 1: First check current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
ALTER TABLE rsa_assets
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS theme VARCHAR(255),
ADD COLUMN IF NOT EXISTS headlines_pipe TEXT,
ADD COLUMN IF NOT EXISTS descriptions_pipe TEXT,
ADD COLUMN IF NOT EXISTS rationale VARCHAR(255),
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';

-- Step 3: Update NULL values with defaults for ALL required columns
-- Based on error, asset_type cannot be NULL
UPDATE rsa_assets
SET asset_type = 'rsa'
WHERE asset_type IS NULL;

-- Update tenant_id if NULL
UPDATE rsa_assets
SET tenant_id = 'default_tenant'
WHERE tenant_id IS NULL;

-- Update theme if NULL
UPDATE rsa_assets
SET theme = 'Default Theme'
WHERE theme IS NULL;

-- Update headlines_pipe if NULL
UPDATE rsa_assets
SET headlines_pipe = 'Headline 1|Headline 2|Headline 3'
WHERE headlines_pipe IS NULL;

-- Update descriptions_pipe if NULL
UPDATE rsa_assets
SET descriptions_pipe = 'Description 1|Description 2'
WHERE descriptions_pipe IS NULL;

-- Update other fields with sensible defaults
UPDATE rsa_assets
SET rationale = COALESCE(rationale, 'migrated_data');

UPDATE rsa_assets
SET source_url = COALESCE(source_url, '');

UPDATE rsa_assets
SET approval_status = COALESCE(approval_status, 'pending');

-- Step 4: Now add NOT NULL constraints only for columns we know are required
-- Based on the errors, these columns definitely need NOT NULL:
DO $$
BEGIN
    -- Only add NOT NULL if column exists and has no nulls
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rsa_assets' AND column_name = 'tenant_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM rsa_assets WHERE tenant_id IS NULL
    ) THEN
        ALTER TABLE rsa_assets ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rsa_assets' AND column_name = 'asset_type'
    ) AND NOT EXISTS (
        SELECT 1 FROM rsa_assets WHERE asset_type IS NULL
    ) THEN
        ALTER TABLE rsa_assets ALTER COLUMN asset_type SET NOT NULL;
    END IF;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_id ON rsa_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_asset_type ON rsa_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_theme ON rsa_assets(theme);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_approval_status ON rsa_assets(approval_status);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_theme ON rsa_assets(tenant_id, theme);

-- Step 6: Display final structure
SELECT
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Step 7: Show a sample of data to verify
SELECT * FROM rsa_assets LIMIT 3;