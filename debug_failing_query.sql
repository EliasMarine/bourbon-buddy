-- This script replicates the query from the API logs that's failing
-- Original query: GET https://hjodvataujilredguzig.supabase.co/rest/v1/video?select=*&order=createdAt.desc&limit=20&or=(status.eq.ready,status.eq.processing)&publiclyListed=eq.true

-- Try to recreate the failing query with proper column names
-- Comparing camelCase vs snake_case variants

-- First version: Using camelCase column names (as might be in Prisma schema)
SELECT *
FROM video
WHERE (status = 'ready' OR status = 'processing')
  AND "publiclyListed" = true  -- Try with quotes & camelCase
ORDER BY "createdAt" DESC
LIMIT 20;

-- Second version: Using snake_case column names (as in Supabase convention)
SELECT *
FROM video
WHERE (status = 'ready' OR status = 'processing')
  AND publicly_listed = true  -- Try with snake_case
ORDER BY created_at DESC
LIMIT 20;

-- Check actual column name for created_at/createdAt 
-- (since the logs showed ordering by createdAt)
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'video'
  AND (column_name = 'created_at' OR column_name = 'createdAt');

-- Check actual column name for publicly_listed/publiclyListed
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'video'
  AND (column_name = 'publicly_listed' OR column_name = 'publiclyListed'); 