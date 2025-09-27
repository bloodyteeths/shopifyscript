-- Fix existing rsa_assets table by adding missing columns
-- This version handles existing NULL values safely
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns if they don't exist (allow NULL initially)
ALTER TABLE rsa_assets
ADD COLUMN IF NOT EXISTS tenant VARCHAR(255),
ADD COLUMN IF NOT EXISTS theme VARCHAR(255),
ADD COLUMN IF NOT EXISTS headlines_pipe TEXT,
ADD COLUMN IF NOT EXISTS descriptions_pipe TEXT,
ADD COLUMN IF NOT EXISTS rationale VARCHAR(255),
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Check if there are any existing rows
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM rsa_assets;
    RAISE NOTICE 'Table has % existing rows', row_count;
END $$;

-- Step 3: Update NULL values with defaults for existing rows
UPDATE rsa_assets
SET tenant = COALESCE(tenant, 'default_tenant')
WHERE tenant IS NULL;

UPDATE rsa_assets
SET theme = COALESCE(theme, 'Theme 1')
WHERE theme IS NULL;

UPDATE rsa_assets
SET headlines_pipe = COALESCE(headlines_pipe, 'Headline 1|Headline 2|Headline 3')
WHERE headlines_pipe IS NULL;

UPDATE rsa_assets
SET descriptions_pipe = COALESCE(descriptions_pipe, 'Description 1|Description 2')
WHERE descriptions_pipe IS NULL;

UPDATE rsa_assets
SET rationale = COALESCE(rationale, 'migrated_data')
WHERE rationale IS NULL;

UPDATE rsa_assets
SET source_url = COALESCE(source_url, '')
WHERE source_url IS NULL;

UPDATE rsa_assets
SET approval_status = COALESCE(approval_status, 'pending')
WHERE approval_status IS NULL;

UPDATE rsa_assets
SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE created_at IS NULL;

UPDATE rsa_assets
SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

-- Step 4: Now add NOT NULL constraints (only after fixing NULL values)
ALTER TABLE rsa_assets
ALTER COLUMN tenant SET NOT NULL,
ALTER COLUMN theme SET NOT NULL,
ALTER COLUMN headlines_pipe SET NOT NULL,
ALTER COLUMN descriptions_pipe SET NOT NULL;

-- Step 5: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant ON rsa_assets(tenant);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_theme ON rsa_assets(tenant, theme);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_approval_status ON rsa_assets(approval_status);

-- Step 6: Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_rsa_assets_updated_at ON rsa_assets;

CREATE TRIGGER update_rsa_assets_updated_at
BEFORE UPDATE ON rsa_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Display the final table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Step 9: Show sample data to verify
SELECT * FROM rsa_assets LIMIT 5;