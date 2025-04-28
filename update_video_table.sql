-- Check if all required columns exist and add any missing ones
DO $$ 
BEGIN
  -- Check and add required columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'id') THEN
    ALTER TABLE "Video" ADD COLUMN "id" UUID PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'title') THEN
    ALTER TABLE "Video" ADD COLUMN "title" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'description') THEN
    ALTER TABLE "Video" ADD COLUMN "description" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'status') THEN
    ALTER TABLE "Video" ADD COLUMN "status" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'muxPlaybackId') THEN
    ALTER TABLE "Video" ADD COLUMN "muxPlaybackId" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'muxAssetId') THEN
    ALTER TABLE "Video" ADD COLUMN "muxAssetId" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'userId') THEN
    ALTER TABLE "Video" ADD COLUMN "userId" TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'publiclyListed') THEN
    ALTER TABLE "Video" ADD COLUMN "publiclyListed" BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'createdAt') THEN
    ALTER TABLE "Video" ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'updatedAt') THEN
    ALTER TABLE "Video" ADD COLUMN "updatedAt" TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'duration') THEN
    ALTER TABLE "Video" ADD COLUMN "duration" FLOAT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'aspectRatio') THEN
    ALTER TABLE "Video" ADD COLUMN "aspectRatio" FLOAT DEFAULT 1.7778;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Video' AND column_name = 'views') THEN
    ALTER TABLE "Video" ADD COLUMN "views" INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN
  -- Create indexes if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Video_userId_idx') THEN
    CREATE INDEX IF NOT EXISTS "Video_userId_idx" ON "Video" ("userId");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Video_muxPlaybackId_idx') THEN
    CREATE INDEX IF NOT EXISTS "Video_muxPlaybackId_idx" ON "Video" ("muxPlaybackId");
  END IF;
END $$;

-- Check if trigger already exists, if not, create it
DO $$
BEGIN
  -- Skip if trigger already exists (which is the error we got)
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'set_timestamp' AND event_object_table = 'Video') THEN
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $BODY$
    BEGIN
      NEW."updatedAt" = NOW();
      RETURN NEW;
    END;
    $BODY$ LANGUAGE plpgsql;

    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON "Video"
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();
  END IF;
END $$;

-- Enable RLS if not enabled
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;

-- Check for existing RLS policies and add if missing
DO $$
BEGIN
  -- Public access policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_videos' AND tablename = 'Video') THEN
    CREATE POLICY "public_videos" ON "Video"
    FOR SELECT
    USING ("publiclyListed" = TRUE);
  END IF;
  
  -- User can manage their own videos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_manage_own_videos' AND tablename = 'Video') THEN
    CREATE POLICY "users_can_manage_own_videos" ON "Video"
    FOR ALL
    USING ("userId"::TEXT = auth.uid()::TEXT);
  END IF;
END $$; 