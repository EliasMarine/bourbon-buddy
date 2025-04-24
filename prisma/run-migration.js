// Script to directly execute ALTER TABLE statement using the Prisma client
const { PrismaClient } = require('@prisma/client');

async function runMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Running migration to add videoId column to Comment table...');
    
    // Execute raw SQL to add the videoId column if it doesn't exist
    const result = await prisma.$executeRaw`
      ALTER TABLE "Comment" 
      ADD COLUMN IF NOT EXISTS "videoId" TEXT;
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