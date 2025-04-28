-- Script to delete all users and set up the User.id column as UUID
-- Warning: This will delete all user data and related records

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

-- 2. Drop existing RLS policies that might reference User.id
DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END$$;

-- 3. Drop all user data and related tables
-- Truncate all tables with relationships to User
TRUNCATE TABLE "Account", "Comment", "Review", "Follows", "Session", "Stream", 
            "StreamLike", "StreamReport", "StreamSubscription", "StreamTip", 
            "StreamView", "Spirit", "Video";

-- 4. Delete all users
TRUNCATE TABLE "User";

-- 5. Change User.id to UUID type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_pkey') THEN
        ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
    END IF;
END $$;

ALTER TABLE "User" 
  ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

-- 6. Change all referencing columns to UUID
ALTER TABLE "Account" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "Comment" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "Review" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "Follows" ALTER COLUMN "followerId" SET DATA TYPE uuid;
ALTER TABLE "Follows" ALTER COLUMN "followingId" SET DATA TYPE uuid;
ALTER TABLE "Session" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "Stream" ALTER COLUMN "hostId" SET DATA TYPE uuid;
ALTER TABLE "StreamLike" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "StreamReport" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "StreamSubscription" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "StreamSubscription" ALTER COLUMN "hostId" SET DATA TYPE uuid;
ALTER TABLE "StreamTip" ALTER COLUMN "senderId" SET DATA TYPE uuid;
ALTER TABLE "StreamTip" ALTER COLUMN "hostId" SET DATA TYPE uuid;
ALTER TABLE "StreamView" ALTER COLUMN "userId" SET DATA TYPE uuid;
ALTER TABLE "Spirit" ALTER COLUMN "ownerId" SET DATA TYPE uuid;
ALTER TABLE "Video" ALTER COLUMN "userId" SET DATA TYPE uuid;

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