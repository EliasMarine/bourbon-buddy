-- Make reviewId optional in Comment model
ALTER TABLE "Comment" ALTER COLUMN "reviewId" DROP NOT NULL;

-- Add foreign key constraint for videoId if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_videoId_fkey'
  ) THEN
    ALTER TABLE "Comment" 
    ADD CONSTRAINT "Comment_videoId_fkey" 
    FOREIGN KEY ("videoId") REFERENCES "Video"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$; 