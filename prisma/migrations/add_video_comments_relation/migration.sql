-- Update Comment table to properly reference Video table
ALTER TABLE "Comment" 
ADD CONSTRAINT "Comment_videoId_fkey" 
FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE; 