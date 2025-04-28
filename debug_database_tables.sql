-- Debug script to find all tables in the database

-- List all tables in the public schema
SELECT 
  table_name,
  table_schema
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
ORDER BY 
  table_name;

-- Check for Video table with any capitalization
SELECT 
  table_name
FROM 
  information_schema.tables
WHERE 
  table_schema = 'public'
  AND lower(table_name) LIKE '%video%'
ORDER BY 
  table_name;

-- Try a direct query to the Video table (assuming it exists)
SELECT 
  count(*) 
FROM 
  "Video";

-- Try a direct query without double quotes
SELECT 
  count(*) 
FROM 
  Video;

-- List all columns in the video table (if it exists)
SELECT 
  column_name, 
  data_type
FROM 
  information_schema.columns
WHERE 
  table_name = 'Video'
ORDER BY 
  ordinal_position; 