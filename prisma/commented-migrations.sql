/*
This file contains SQL statements that need to be run manually against
the database to fix the videoId field in Comment table.

These statements should be executed directly through a database client
like pgAdmin, psql, or a similar PostgreSQL client.

Execute these statements in order:
*/

-- 1. Add the videoId column if it doesn't exist
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "videoId" TEXT;

-- 2. Remove any existing constraint to avoid conflicts
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_videoId_fkey";

-- 3. Add the foreign key constraint
ALTER TABLE "Comment" 
ADD CONSTRAINT "Comment_videoId_fkey" 
FOREIGN KEY ("videoId") REFERENCES "Video"("id") 
ON DELETE SET NULL ON UPDATE CASCADE; 