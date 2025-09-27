-- Check the actual column structure of rsa_assets table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rsa_assets'
ORDER BY ordinal_position;