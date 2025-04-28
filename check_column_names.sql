-- Check column names to identify case-sensitivity issues
-- The API might be looking for snake_case (publicly_listed) 
-- but the DB might have camelCase (publiclyListed)

-- Check all column names in the Video table (case-sensitive)
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'Video'
ORDER BY ordinal_position;

-- Specifically check for 'publiclyListed' vs 'publicly_listed'
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Video' AND column_name = 'publiclyListed'
  ) THEN 'camelCase (publiclyListed) exists' ELSE 'camelCase not found' END AS camel_case,
  
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Video' AND column_name = 'publicly_listed'
  ) THEN 'snake_case (publicly_listed) exists' ELSE 'snake_case not found' END AS snake_case;

-- Check the structure of any query that might be failing
EXPLAIN (ANALYZE, VERBOSE, COSTS off, TIMING off, SUMMARY off)
SELECT *
FROM "Video"
WHERE "publiclyListed" = true
ORDER BY "createdAt" DESC
LIMIT 20; 