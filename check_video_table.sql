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

-- Detailed examination of the Video table structure and related components

-- 1. Check if the Video table exists and get its exact name casing
SELECT 
    relname AS exact_table_name
FROM 
    pg_class c
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
WHERE 
    c.relkind = 'r' 
    AND n.nspname = 'public'
    AND lower(relname) = 'video';

-- 2. Get all columns from the Video table with their exact casing
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable,
    is_identity
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND lower(table_name) = 'video'
ORDER BY 
    ordinal_position;

-- 3. Check the structure of the muxUploadId column specifically
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    is_updatable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND lower(table_name) = 'video'
    AND (
        lower(column_name) = 'muxuploadid' OR 
        column_name = 'muxUploadId' OR 
        column_name = 'mux_upload_id'
    );

-- 4. Check unique constraints on the table (to verify if muxUploadId has a unique constraint)
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM 
    information_schema.table_constraints tc
JOIN 
    information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
WHERE 
    tc.table_schema = 'public'
    AND lower(tc.table_name) = 'video'
ORDER BY 
    tc.constraint_name;

-- 5. Check indexes on the table
SELECT 
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    schemaname = 'public'
    AND lower(tablename) = 'video';

-- 6. Check RLS policies on the Video table
SELECT 
    pol.polname AS policy_name,
    CASE
        WHEN pol.polpermissive THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
    END AS permissive,
    CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
    END AS command,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM 
    pg_policy pol
JOIN 
    pg_class c ON pol.polrelid = c.oid
JOIN 
    pg_namespace n ON c.relnamespace = n.oid
WHERE 
    n.nspname = 'public'
    AND lower(c.relname) = 'video';

-- 7. Count of records in the Video table
SELECT 
    'Video table record count' AS description,
    count(*) AS count
FROM 
    "Video";

-- 8. Sample data (first 5 records) to verify schema
SELECT 
    id, 
    title,
    status,
    "muxUploadId",
    "muxAssetId",
    "muxPlaybackId",
    "userId",
    "createdAt"
FROM 
    "Video"
ORDER BY 
    "createdAt" DESC
LIMIT 5; 