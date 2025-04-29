// Script to manually apply migration for Comment model
const { PrismaClient } = require('@prisma/client');

async function runMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Running migration to update Comment model...');
    
    // Execute SQL to make reviewId optional
    console.log('Making reviewId optional...');
    await prisma.$executeRaw`
      ALTER TABLE "Comment" ALTER COLUMN "reviewId" DROP NOT NULL;
    `;
    
    // Add foreign key constraint for videoId if it doesn't exist
    console.log('Adding videoId foreign key constraint...');
    await prisma.$executeRaw`
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
    `;
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration()
  .then(() => console.log('Done!'))
  .catch(e => console.error('Migration failed:', e)); 