-- Verify the placeholder playback IDs were added
SELECT 
  id, 
  title, 
  status, 
  "muxPlaybackId",
  "createdAt",
  "publiclyListed"
FROM "Video"
ORDER BY "createdAt" DESC; 