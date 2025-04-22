-- Create Video table for Mux integration

CREATE TABLE IF NOT EXISTS "Video" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'uploading',
  "muxUploadId" TEXT,
  "muxAssetId" TEXT,
  "muxPlaybackId" TEXT,
  "duration" DOUBLE PRECISION,
  "aspectRatio" TEXT,
  "thumbnailTime" DOUBLE PRECISION DEFAULT 0,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "publiclyListed" BOOLEAN NOT NULL DEFAULT true,
  "views" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Video_muxUploadId_key" ON "Video"("muxUploadId");
CREATE UNIQUE INDEX IF NOT EXISTS "Video_muxAssetId_key" ON "Video"("muxAssetId");
CREATE INDEX IF NOT EXISTS "Video_status_idx" ON "Video"("status");
CREATE INDEX IF NOT EXISTS "Video_userId_idx" ON "Video"("userId");
CREATE INDEX IF NOT EXISTS "Video_createdAt_idx" ON "Video"("createdAt");

-- Optional: Add foreign key constraint to User if needed
-- ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add a trigger to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Video"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Grant necessary permissions to web_user
GRANT ALL PRIVILEGES ON TABLE "Video" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE "Video" TO service_role; 