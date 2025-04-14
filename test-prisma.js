// Simple script to test Prisma connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing Prisma connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Basic connection test result:', result);
    
    // Check Spirit table columns
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Spirit'
      ORDER BY ordinal_position;
    `;
    
    console.log('\nSpirit table columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Test if we can query the webImageUrl column
    try {
      console.log('\nTesting Prisma model query...');
      const spirits = await prisma.spirit.findMany({
        select: { 
          id: true, 
          name: true,
          // Try excluding webImageUrl first
        },
        take: 1
      });
      
      console.log('Basic model query successful. Result:', spirits);
      
      // Now try with webImageUrl
      console.log('\nTesting query with webImageUrl...');
      const spiritsWithImage = await prisma.spirit.findMany({
        select: {
          id: true,
          name: true,
          webImageUrl: true
        },
        take: 1
      });
      
      console.log('Query with webImageUrl successful! Result:', spiritsWithImage);
      console.log('\n✅ All tests passed! The webImageUrl column is working correctly.');
    } catch (error) {
      console.error('\n❌ Model query failed:', error);
      console.log('\nFalling back to explicit field selection...');
      
      try {
        // Try with explicit field selection
        const spirits = await prisma.$queryRaw`
          SELECT id, name, "webImageUrl" 
          FROM "Spirit" 
          LIMIT 1
        `;
        
        console.log('Raw SQL query successful. Result:', spirits);
        
        if (spirits.length > 0) {
          const hasWebImageUrl = 'webImageUrl' in spirits[0];
          console.log('\nColumn webImageUrl exists in results:', hasWebImageUrl);
        }
      } catch (sqlError) {
        console.error('Raw SQL query failed:', sqlError);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test(); 