-- Fix existing rsa_assets table by adding missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
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

-- Update any NULL values to defaults
UPDATE rsa_assets
SET approval_status = 'pending'
WHERE approval_status IS NULL;

UPDATE rsa_assets
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

UPDATE rsa_assets
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

-- Add NOT NULL constraints after setting defaults
ALTER TABLE rsa_assets
ALTER COLUMN tenant SET NOT NULL,
ALTER COLUMN theme SET NOT NULL,
ALTER COLUMN headlines_pipe SET NOT NULL,
ALTER COLUMN descriptions_pipe SET NOT NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant ON rsa_assets(tenant);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_tenant_theme ON rsa_assets(tenant, theme);
CREATE INDEX IF NOT EXISTS idx_rsa_assets_approval_status ON rsa_assets(approval_status);

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_rsa_assets_updated_at ON rsa_assets;

CREATE TRIGGER update_rsa_assets_updated_at
BEFORE UPDATE ON rsa_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;