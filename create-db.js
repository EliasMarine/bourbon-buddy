// Direct database initialization
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking if Spirit table exists with webImageUrl column...');
    
    try {
      // Try to query for a spirit with webImageUrl to see if the column exists
      await prisma.spirit.findFirst({
        select: { webImageUrl: true },
        take: 1
      });
      console.log('✅ webImageUrl column already exists');
    } catch (error) {
      if (error.message.includes('webImageUrl')) {
        console.log('❌ webImageUrl column does not exist, adding it...');
        
        // Use a raw query to add the column
        const result = await prisma.$executeRaw`ALTER TABLE "Spirit" ADD COLUMN IF NOT EXISTS "webImageUrl" TEXT;`;
        console.log('✅ Column added successfully');
      } else {
        throw error;
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 