-- Examine table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Video'
ORDER BY ordinal_position;

-- Count total videos
SELECT COUNT(*) AS total_videos FROM "Video";

-- Check video statuses
SELECT status, COUNT(*) AS count 
FROM "Video" 
GROUP BY status 
ORDER BY count DESC;

-- View recent videos
SELECT 
  id,
  title,
  description,
  status,
  "muxPlaybackId",
  "userId",
  "createdAt",
  "publiclyListed",
  views
FROM "Video"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check if videos have playback IDs
SELECT 
  COUNT(*) AS total,
  COUNT("muxPlaybackId") AS with_playback_id,
  COUNT(*) - COUNT("muxPlaybackId") AS missing_playback_id
FROM "Video"; 