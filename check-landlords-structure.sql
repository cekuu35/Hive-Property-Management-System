-- Check the actual structure of your landlords table
-- Run this FIRST to see what columns you have

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'landlords'
ORDER BY ordinal_position;

-- Also check a sample of data
SELECT * FROM landlords LIMIT 3;

