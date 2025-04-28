-- Script to check and fix videos with missing playback IDs

-- First, check existing videos
SELECT id, title, status, "muxPlaybackId", "muxAssetId", "createdAt"
FROM "Video"
ORDER BY "createdAt" DESC;

-- Option 1: Update videos with placeholder playback IDs
-- Only run this if you need temporary playback IDs for testing
UPDATE "Video"
SET "muxPlaybackId" = 'placeholder-' || id,
    status = 'ready'
WHERE "muxPlaybackId" IS NULL;

-- Option 2: Add a sample playback ID to a specific video (safer)
-- Replace VIDEO_ID with the actual ID from the select above
-- UPDATE "Video"
-- SET "muxPlaybackId" = 'placeholder-test-id',
--     status = 'ready'
-- WHERE id = 'VIDEO_ID';

-- Check videos after updates
SELECT id, title, status, "muxPlaybackId", "muxAssetId", "createdAt"
FROM "Video"
ORDER BY "createdAt" DESC; 