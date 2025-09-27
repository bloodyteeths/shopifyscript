-- Show the exact schema of your rsa_assets table
-- Run this first to see what columns actually exist

SELECT
    ordinal_position as pos,
    column_name,
    data_type,
    character_maximum_length as max_len,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;

-- Also show any constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'rsa_assets'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Show recent data to understand structure
SELECT * FROM rsa_assets
ORDER BY created_at DESC
LIMIT 3;