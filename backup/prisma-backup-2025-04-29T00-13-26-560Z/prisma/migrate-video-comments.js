// Script to add proper foreign key constraint for videoId in the Comment model
const { PrismaClient } = require('@prisma/client');

async function runMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Running migration to update Comment table for video relations...');
    
    // Execute raw SQL to add the foreign key constraint if it doesn't exist
    const result = await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Comment_videoId_fkey'
        ) THEN
          ALTER TABLE "Comment" 
          ADD CONSTRAINT "Comment_videoId_fkey" 
          FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END
      $$;
    `;
    
    console.log('Migration completed successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .catch((error) => {
    console.error('Failed to run migration:', error);
    process.exit(1);
  }); 