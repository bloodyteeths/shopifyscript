-- First, let's see what columns actually exist in your rsa_assets table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Also check any constraints
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'rsa_assets'::regclass;