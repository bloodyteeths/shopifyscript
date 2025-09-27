-- Final comprehensive fix for rsa_assets table
-- This handles all the required columns based on actual errors

-- Step 1: Check current structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Step 2: Add all missing columns
ALTER TABLE rsa_assets
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS asset_text TEXT,
ADD COLUMN IF NOT EXISTS theme VARCHAR(255),
ADD COLUMN IF NOT EXISTS headlines_pipe TEXT,
ADD COLUMN IF NOT EXISTS descriptions_pipe TEXT,
ADD COLUMN IF NOT EXISTS rationale VARCHAR(255),
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Update NULL values for required fields
UPDATE rsa_assets SET tenant_id = 'default_tenant' WHERE tenant_id IS NULL;
UPDATE rsa_assets SET asset_type = 'rsa' WHERE asset_type IS NULL;
UPDATE rsa_assets SET asset_text = COALESCE(theme, 'Default') || ' - Asset' WHERE asset_text IS NULL;
UPDATE rsa_assets SET theme = COALESCE(theme, 'Default Theme') WHERE theme IS NULL;
UPDATE rsa_assets SET headlines_pipe = COALESCE(headlines_pipe, 'Headline 1|Headline 2|Headline 3') WHERE headlines_pipe IS NULL;
UPDATE rsa_assets SET descriptions_pipe = COALESCE(descriptions_pipe, 'Description 1|Description 2') WHERE descriptions_pipe IS NULL;
UPDATE rsa_assets SET rationale = COALESCE(rationale, 'migrated_data');
UPDATE rsa_assets SET source_url = COALESCE(source_url, '');
UPDATE rsa_assets SET approval_status = COALESCE(approval_status, 'pending');
UPDATE rsa_assets SET active = COALESCE(active, true);

-- Step 4: Add NOT NULL constraints for required columns
DO $$
BEGIN
    -- Only add NOT NULL if no nulls exist
    IF NOT EXISTS (SELECT 1 FROM rsa_assets WHERE tenant_id IS NULL) THEN
        ALTER TABLE rsa_assets ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM rsa_assets WHERE asset_type IS NULL) THEN
        ALTER TABLE rsa_assets ALTER COLUMN asset_type SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM rsa_assets WHERE asset_text IS NULL) THEN
        ALTER TABLE rsa_assets ALTER COLUMN asset_text SET NOT NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some constraints already exist or cannot be added: %', SQLERRM;
END $$;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_id ON rsa_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_asset_type ON rsa_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_theme ON rsa_assets(theme);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_approval_status ON rsa_assets(approval_status);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_active ON rsa_assets(active);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_active ON rsa_assets(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_theme_active ON rsa_assets(tenant_id, theme, active);

-- Step 6: Create or update the trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_rsa_assets_updated_at ON rsa_assets;
CREATE TRIGGER update_rsa_assets_updated_at
BEFORE UPDATE ON rsa_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Display final structure
SELECT
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Step 8: Show sample data
SELECT * FROM rsa_assets WHERE tenant_id = 'mybabybymerry' ORDER BY created_at DESC LIMIT 5;