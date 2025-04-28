-- Comprehensive migration script to convert User.id and all related foreign keys to UUID

-- 0. First, check if the User.id column is already UUID type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name = 'id';

-- 0a. First, identify and fix invalid UUID values
-- Identify invalid UUIDs in User table
SELECT 'Invalid UUID in User.id' as error_source, id::text as invalid_value
FROM "User"
WHERE id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND id::text !~* '^[0-9a-f]{32}$';

-- Clean up related tables that reference invalid User.id values
-- Account
UPDATE "Account" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- Comment
UPDATE "Comment" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- Review
UPDATE "Review" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- Follows (followerId)
UPDATE "Follows" SET "followerId" = NULL 
WHERE "followerId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "followerId"::text !~* '^[0-9a-f]{32}$';

-- Follows (followingId)
UPDATE "Follows" SET "followingId" = NULL 
WHERE "followingId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "followingId"::text !~* '^[0-9a-f]{32}$';

-- Session
UPDATE "Session" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- Stream
UPDATE "Stream" SET "hostId" = NULL 
WHERE "hostId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "hostId"::text !~* '^[0-9a-f]{32}$';

-- StreamLike
UPDATE "StreamLike" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- StreamReport
UPDATE "StreamReport" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- StreamSubscription (userId)
UPDATE "StreamSubscription" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- StreamSubscription (hostId)
UPDATE "StreamSubscription" SET "hostId" = NULL 
WHERE "hostId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "hostId"::text !~* '^[0-9a-f]{32}$';

-- StreamTip (senderId)
UPDATE "StreamTip" SET "senderId" = NULL 
WHERE "senderId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "senderId"::text !~* '^[0-9a-f]{32}$';

-- StreamTip (hostId)
UPDATE "StreamTip" SET "hostId" = NULL 
WHERE "hostId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "hostId"::text !~* '^[0-9a-f]{32}$';

-- StreamView
UPDATE "StreamView" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- Spirit
UPDATE "Spirit" SET "ownerId" = NULL 
WHERE "ownerId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "ownerId"::text !~* '^[0-9a-f]{32}$';

-- Video
UPDATE "Video" SET "userId" = NULL 
WHERE "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  AND "userId"::text !~* '^[0-9a-f]{32}$';

-- Create a temporary table to map old IDs to new UUIDs
CREATE TEMPORARY TABLE id_mapping (
  old_id TEXT PRIMARY KEY,
  new_id UUID DEFAULT gen_random_uuid()
);

-- Insert ONLY valid UUID-formatted User IDs into the mapping table
INSERT INTO id_mapping (old_id)
SELECT id::text FROM "User"
WHERE id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR id::text ~* '^[0-9a-f]{32}$';

-- Check if User_id_backup exists, drop it if it does
DROP TABLE IF EXISTS "User_id_backup";

-- Handle email-based or other invalid format IDs by backing them up and creating new UUIDs
CREATE TABLE "User_id_backup" AS
SELECT id::text as original_id, gen_random_uuid() as new_uuid, CURRENT_TIMESTAMP as changed_at
FROM "User"
WHERE id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND id::text !~* '^[0-9a-f]{32}$';

-- Add new entries to mapping table with generated UUIDs
INSERT INTO id_mapping (old_id, new_id)
SELECT original_id, new_uuid
FROM "User_id_backup";

-- 1. Drop all foreign key constraints referencing User.id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Account_userId_fkey') THEN
        ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Comment_userId_fkey') THEN
        ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Review_userId_fkey') THEN
        ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Follows_followerId_fkey') THEN
        ALTER TABLE "Follows" DROP CONSTRAINT "Follows_followerId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Follows_followingId_fkey') THEN
        ALTER TABLE "Follows" DROP CONSTRAINT "Follows_followingId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Session_userId_fkey') THEN
        ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Stream_hostId_fkey') THEN
        ALTER TABLE "Stream" DROP CONSTRAINT "Stream_hostId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamLike_userId_fkey') THEN
        ALTER TABLE "StreamLike" DROP CONSTRAINT "StreamLike_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamReport_userId_fkey') THEN
        ALTER TABLE "StreamReport" DROP CONSTRAINT "StreamReport_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamSubscription_userId_fkey') THEN
        ALTER TABLE "StreamSubscription" DROP CONSTRAINT "StreamSubscription_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamSubscription_hostId_fkey') THEN
        ALTER TABLE "StreamSubscription" DROP CONSTRAINT "StreamSubscription_hostId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamTip_senderId_fkey') THEN
        ALTER TABLE "StreamTip" DROP CONSTRAINT "StreamTip_senderId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamTip_hostId_fkey') THEN
        ALTER TABLE "StreamTip" DROP CONSTRAINT "StreamTip_hostId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'StreamView_userId_fkey') THEN
        ALTER TABLE "StreamView" DROP CONSTRAINT "StreamView_userId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Spirit_ownerId_fkey') THEN
        ALTER TABLE "Spirit" DROP CONSTRAINT "Spirit_ownerId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Video_userId_fkey') THEN
        ALTER TABLE "Video" DROP CONSTRAINT "Video_userId_fkey";
    END IF;
END $$;

-- 2. Store existing policies and drop them individually
DO $$
DECLARE
    policy_record record;
BEGIN
    -- Create table to store existing policies
    CREATE TEMPORARY TABLE policy_backup AS
    SELECT
        schemaname,
        tablename,
        policyname
    FROM
        pg_policies
    WHERE
        schemaname = 'public';
        
    -- Drop each policy individually
    FOR policy_record IN SELECT * FROM policy_backup LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       policy_record.policyname, 
                       policy_record.schemaname, 
                       policy_record.tablename);
    END LOOP;
END$$;

-- 3. Create a backup of the User table with original IDs
DROP TABLE IF EXISTS "User_backup";
CREATE TABLE "User_backup" AS 
SELECT * FROM "User";

-- 4. Update foreign key columns to use the new UUID mappings
-- Account
UPDATE "Account" a
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE a."userId"::text = m.old_id;

-- Comment
UPDATE "Comment" c
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE c."userId"::text = m.old_id;

-- Review
UPDATE "Review" r
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE r."userId"::text = m.old_id;

-- Follows (follower)
UPDATE "Follows" f
SET "followerId" = m.new_id::text
FROM id_mapping m
WHERE f."followerId"::text = m.old_id;

-- Follows (following)
UPDATE "Follows" f
SET "followingId" = m.new_id::text
FROM id_mapping m
WHERE f."followingId"::text = m.old_id;

-- Session
UPDATE "Session" s
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE s."userId"::text = m.old_id;

-- Stream
UPDATE "Stream" s
SET "hostId" = m.new_id::text
FROM id_mapping m
WHERE s."hostId"::text = m.old_id;

-- StreamLike
UPDATE "StreamLike" sl
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE sl."userId"::text = m.old_id;

-- StreamReport
UPDATE "StreamReport" sr
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE sr."userId"::text = m.old_id;

-- StreamSubscription (userId)
UPDATE "StreamSubscription" ss
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE ss."userId"::text = m.old_id;

-- StreamSubscription (hostId)
UPDATE "StreamSubscription" ss
SET "hostId" = m.new_id::text
FROM id_mapping m
WHERE ss."hostId"::text = m.old_id;

-- StreamTip (senderId)
UPDATE "StreamTip" st
SET "senderId" = m.new_id::text
FROM id_mapping m
WHERE st."senderId"::text = m.old_id;

-- StreamTip (hostId)
UPDATE "StreamTip" st
SET "hostId" = m.new_id::text
FROM id_mapping m
WHERE st."hostId"::text = m.old_id;

-- StreamView
UPDATE "StreamView" sv
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE sv."userId"::text = m.old_id;

-- Spirit
UPDATE "Spirit" s
SET "ownerId" = m.new_id::text
FROM id_mapping m
WHERE s."ownerId"::text = m.old_id;

-- Video
UPDATE "Video" v
SET "userId" = m.new_id::text
FROM id_mapping m
WHERE v."userId"::text = m.old_id;

-- 5. Update the User table with new UUIDs
-- First add a temporary column for the new UUID
ALTER TABLE "User" ADD COLUMN new_id UUID;

-- Update the new UUID column based on the mapping
UPDATE "User" u
SET new_id = m.new_id
FROM id_mapping m
WHERE u.id::text = m.old_id;

-- Drop the primary key constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_pkey') THEN
        ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
    END IF;
END $$;

-- Change the id column to UUID type and fill with the new UUID values
ALTER TABLE "User" 
  ALTER COLUMN id TYPE UUID USING new_id,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop the temporary column
ALTER TABLE "User" DROP COLUMN new_id;

-- Add back the primary key constraint
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

-- 6. Change all referencing columns to UUID type
ALTER TABLE "Account" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "Comment" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "Review" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "Follows" ALTER COLUMN "followerId" SET DATA TYPE uuid USING "followerId"::uuid;
ALTER TABLE "Follows" ALTER COLUMN "followingId" SET DATA TYPE uuid USING "followingId"::uuid;
ALTER TABLE "Session" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "Stream" ALTER COLUMN "hostId" SET DATA TYPE uuid USING "hostId"::uuid;
ALTER TABLE "StreamLike" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "StreamReport" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "StreamSubscription" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "StreamSubscription" ALTER COLUMN "hostId" SET DATA TYPE uuid USING "hostId"::uuid;
ALTER TABLE "StreamTip" ALTER COLUMN "senderId" SET DATA TYPE uuid USING "senderId"::uuid;
ALTER TABLE "StreamTip" ALTER COLUMN "hostId" SET DATA TYPE uuid USING "hostId"::uuid;
ALTER TABLE "StreamView" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;
ALTER TABLE "Spirit" ALTER COLUMN "ownerId" SET DATA TYPE uuid USING "ownerId"::uuid;
ALTER TABLE "Video" ALTER COLUMN "userId" SET DATA TYPE uuid USING "userId"::uuid;

-- 7. Recreate all foreign key constraints
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Follows" ADD CONSTRAINT "Follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Follows" ADD CONSTRAINT "Follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "StreamLike" ADD CONSTRAINT "StreamLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "StreamReport" ADD CONSTRAINT "StreamReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "StreamSubscription" ADD CONSTRAINT "StreamSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "StreamSubscription" ADD CONSTRAINT "StreamSubscription_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "StreamTip" ADD CONSTRAINT "StreamTip_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "StreamTip" ADD CONSTRAINT "StreamTip_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "StreamView" ADD CONSTRAINT "StreamView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Spirit" ADD CONSTRAINT "Spirit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 8. Recreate common Supabase RLS policies
-- User table policies
CREATE POLICY "Allow authenticated insert" ON "User"
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view other users" ON "User"
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can update own record" ON "User"
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Video table policies
CREATE POLICY "users_can_manage_own_videos" ON "Video"
FOR ALL
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Everyone can view videos" ON "Video"
FOR SELECT
TO authenticated
USING (true);

-- Add any other critical policies that might have existed
-- You may need to check these and adjust based on your actual policy requirements

-- Clean up temporary tables
DROP TABLE IF EXISTS policy_backup; 