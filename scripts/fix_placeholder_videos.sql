-- Script to fix videos with placeholder playback IDs
-- This script identifies videos with placeholder IDs and prepares them for proper processing

-- First, check how many videos have placeholder IDs
SELECT COUNT(*) as placeholder_count
FROM "video"
WHERE "muxPlaybackId" LIKE 'placeholder-%';

-- Check if these videos have valid Mux Asset IDs
SELECT id, title, status, "muxPlaybackId", "muxAssetId", "createdAt"
FROM "video" 
WHERE "muxPlaybackId" LIKE 'placeholder-%'
ORDER BY "createdAt" DESC;

-- Option 1: If videos have valid Mux Asset IDs but placeholder playback IDs,
-- update them to processing status to trigger re-fetch of real playback IDs
UPDATE "video"
SET "status" = 'processing',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "muxPlaybackId" LIKE 'placeholder-%'
  AND "muxAssetId" IS NOT NULL;

-- Option 2: If videos have placeholder IDs but NO Mux Asset IDs,
-- mark them as needing upload, so they can be recreated
UPDATE "video"
SET "status" = 'needs_upload',
    "updatedAt" = CURRENT_TIMESTAMP,
    "muxPlaybackId" = NULL
WHERE "muxPlaybackId" LIKE 'placeholder-%'
  AND "muxAssetId" IS NULL;

-- Check the results after updates
SELECT id, title, status, "muxPlaybackId", "muxAssetId", "createdAt"
FROM "video" 
WHERE "status" IN ('processing', 'needs_upload')
ORDER BY "updatedAt" DESC;

-- If everything looks good, you can run this command in your API routes:
-- GET /api/videos/sync-status
-- This will check each video with Mux and update with real playback IDs 