-- Create Video table in Supabase (without quotes in the table name)
CREATE TABLE IF NOT EXISTS Video (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'uploading',
  "muxUploadId" TEXT UNIQUE,
  "muxAssetId" TEXT UNIQUE,
  "muxPlaybackId" TEXT,
  duration FLOAT,
  "aspectRatio" TEXT,
  "thumbnailTime" FLOAT DEFAULT 0,
  "userId" UUID,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "publiclyListed" BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS video_status_idx ON Video(status);
CREATE INDEX IF NOT EXISTS video_user_id_idx ON Video("userId");
CREATE INDEX IF NOT EXISTS video_created_at_idx ON Video("createdAt");

-- Create a trigger to automatically update the updated_at field
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON Video
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Optional: Add Row Level Security policies
ALTER TABLE Video ENABLE ROW LEVEL SECURITY;

-- Public can view publicly listed videos
CREATE POLICY "Public videos are viewable by everyone"
  ON Video
  FOR SELECT
  USING ("publiclyListed" = TRUE);

-- Users can view/update their own videos
CREATE POLICY "Users can manage their own videos"
  ON Video
  USING ("userId"::TEXT = auth.uid()::TEXT); 