-- Create video table in Supabase
CREATE TABLE IF NOT EXISTS video (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'uploading',
  mux_upload_id TEXT UNIQUE,
  mux_asset_id TEXT UNIQUE,
  mux_playback_id TEXT,
  duration FLOAT,
  aspect_ratio TEXT,
  thumbnail_time FLOAT DEFAULT 0,
  user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  publicly_listed BOOLEAN DEFAULT TRUE,
  views INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS video_status_idx ON video(status);
CREATE INDEX IF NOT EXISTS video_user_id_idx ON video(user_id);
CREATE INDEX IF NOT EXISTS video_created_at_idx ON video(created_at);

-- Create a trigger to automatically update the updated_at field
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON video
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Optional: Add Row Level Security policies
ALTER TABLE video ENABLE ROW LEVEL SECURITY;

-- Public can view publicly listed videos
CREATE POLICY "Public videos are viewable by everyone"
  ON video
  FOR SELECT
  USING (publicly_listed = TRUE);

-- Users can view/update their own videos
CREATE POLICY "Users can manage their own videos"
  ON video
  USING (user_id = auth.uid()); 