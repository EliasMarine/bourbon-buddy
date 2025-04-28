-- Insert sample video data for testing
INSERT INTO "Video" (
  id,
  title,
  description,
  status,
  "muxPlaybackId",
  duration,
  "aspectRatio",
  "userId",
  "publiclyListed",
  views,
  "updatedAt"
) VALUES 
(
  gen_random_uuid(),
  'Bourbon Tasting: Buffalo Trace',
  'A detailed tasting of Buffalo Trace bourbon with notes on flavor profile and finish.',
  'ready',
  'sample-playback-id-1',
  325.5,
  '16:9',
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID if needed
  true,
  42,
  CURRENT_TIMESTAMP
),
(
  gen_random_uuid(),
  'Whiskey Collection Review',
  'Reviewing my top 5 bourbons for 2024 with tasting notes and recommendations.',
  'ready',
  'sample-playback-id-2',
  612.2,
  '16:9',
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID if needed
  true,
  128,
  CURRENT_TIMESTAMP
),
(
  gen_random_uuid(),
  'Eagle Rare vs Blanton''s Comparison',
  'Side-by-side comparison of Eagle Rare and Blanton''s with detailed tasting notes.',
  'ready',
  'sample-playback-id-3',
  483.7,
  '16:9',
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID if needed
  true,
  95,
  CURRENT_TIMESTAMP
),
(
  gen_random_uuid(),
  'Kentucky Bourbon Trail Tastings',
  'Highlights from my recent trip to the Kentucky Bourbon Trail with tastings from multiple distilleries.',
  'processing',
  'sample-playback-id-4',
  NULL,
  '16:9',
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID if needed
  true,
  0,
  CURRENT_TIMESTAMP
);

-- Verify data was inserted correctly
SELECT * FROM "Video" ORDER BY "createdAt" DESC LIMIT 10; 