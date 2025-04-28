-- Check if the video table exists in the database
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'video'
);

-- Also check if a plural 'videos' table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'videos'
);

-- List all tables in the public schema for reference
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if there might be a table with a different case
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND lower(table_name) LIKE '%video%'
ORDER BY table_name; 