-- First, check if the Video table exists
SELECT 
  table_name, 
  table_schema 
FROM 
  information_schema.tables 
WHERE 
  table_name = 'Video' 
  AND table_schema = 'public';

-- Check the columns in the existing Video table
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'Video' 
ORDER BY 
  ordinal_position;

-- Count the videos in the table
SELECT COUNT(*) FROM "Video";

-- Check for existing triggers
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM 
  information_schema.triggers
WHERE 
  event_object_table = 'Video';

-- Check for existing indexes
SELECT 
  indexname, 
  indexdef 
FROM 
  pg_indexes 
WHERE 
  tablename = 'Video';

-- Check for existing RLS policies
SELECT 
  policyname, 
  permissive, 
  cmd, 
  qual::text
FROM 
  pg_policies 
WHERE 
  tablename = 'Video';

-- Update missing columns if any (but don't recreate existing ones)
-- DO $$ 
-- BEGIN
--   -- Add missing columns
--   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'publiclyListed') THEN
--     ALTER TABLE "Video" ADD COLUMN "publiclyListed" BOOLEAN DEFAULT TRUE;
--   END IF;
--   
--   -- Add more needed columns in a similar way
-- END $$; 