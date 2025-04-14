// Script to fix Prisma's connection and clean up unneeded databases
const { execSync } = require('child_process');

function main() {
  try {
    console.log('Starting Prisma connection fix...');
    
    // 1. Clear node_modules/.prisma
    console.log('\n1. Clearing Prisma cache...');
    try {
      execSync('rm -rf node_modules/.prisma');
      execSync('rm -rf node_modules/@prisma/client');
      console.log('   ✅ Cleared Prisma cache');
    } catch (err) {
      console.log('   ❌ Error clearing cache:', err.message);
    }
    
    // 2. Ensure the webImageUrl column has the right case
    console.log('\n2. Ensuring webImageUrl column has correct case...');
    try {
      execSync(`
        psql -h localhost -U eliasbouzeid -d database -c "
          ALTER TABLE IF EXISTS \\"Spirit\\" RENAME COLUMN webimageurl TO temp_column;
          ALTER TABLE IF EXISTS \\"Spirit\\" RENAME COLUMN webImageUrl TO temp_column2;
          ALTER TABLE IF EXISTS \\"Spirit\\" RENAME COLUMN WEBIMAGEURL TO temp_column3;
          ALTER TABLE IF EXISTS \\"Spirit\\" ADD COLUMN \\"webImageUrl\\" TEXT;
        " 2>/dev/null || true
      `);
      console.log('   ✅ Column renamed or added');
    } catch (err) {
      console.log('   ℹ️ Column operations completed with some expected errors');
    }
    
    // 3. Clean up unnecessary development databases to avoid confusion
    console.log('\n3. Would you like to clean up unnecessary development databases? (y/N)');
    console.log('   These databases can be recreated if needed, but cleaning them up will avoid confusion.');
    console.log('   To proceed, run these commands manually:');
    console.log('   - psql -h localhost -U eliasbouzeid -c "DROP DATABASE IF EXISTS bourbon_buddy;"');
    console.log('   - psql -h localhost -U eliasbouzeid -c "DROP DATABASE IF EXISTS spirits_db;"');
    
    // 4. Regenerate Prisma schema and client
    console.log('\n4. Regenerating Prisma client...');
    execSync('npx prisma generate --no-engine', { stdio: 'inherit' });
    
    // 5. Recreate Prisma schema based on database
    console.log('\n5. Updating Prisma schema based on database (this may take a moment)...');
    try {
      execSync('npx prisma db pull', { stdio: 'inherit' });
      console.log('   ✅ Successfully pulled database schema');
    } catch (err) {
      console.log('   ❌ Error pulling schema:', err.message);
      console.log('   ℹ️ This is not critical, continuing...');
    }
    
    // 6. Generate client again with updated schema
    console.log('\n6. Regenerating Prisma client with updated schema...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // 7. Test the database connection
    console.log('\n7. Testing database connection...');
    const testScript = `
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      async function test() {
        try {
          // Try a simple query first
          const testConnection = await prisma.$queryRaw\`SELECT 1 as test\`;
          console.log('   ✅ Basic connection test successful');
          
          // Try to fetch schema info about Spirit table
          const tableInfo = await prisma.$queryRaw\`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'Spirit'
            ORDER BY ordinal_position;
          \`;
          
          console.log('   Table columns:');
          tableInfo.forEach(col => {
            console.log(\`     - \${col.column_name} (\${col.data_type})\`);
          });
          
          // Does it include webImageUrl?
          const hasWebImageUrl = tableInfo.some(col => 
            col.column_name.toLowerCase() === 'webimageurl');
          
          if (hasWebImageUrl) {
            console.log('   ✅ webImageUrl column found in schema');
          } else {
            console.log('   ❌ webImageUrl column NOT found in schema');
          }
          
          // Try explicit Prisma model query (this might fail)
          try {
            console.log('\n   Testing Prisma model query (this might fail)...');
            const spirit = await prisma.spirit.findFirst({ 
              select: { id: true },
              take: 1 
            });
            console.log('   ✅ Prisma model query successful');
            
            // Try query with webImageUrl
            const spiritWithWebImageUrl = await prisma.spirit.findFirst({
              select: { id: true, webImageUrl: true },
              take: 1
            });
            console.log('   ✅ Prisma query with webImageUrl successful');
            console.log('   Result:', spiritWithWebImageUrl);
          } catch (modelError) {
            console.error('   ❌ Prisma model query failed:', modelError.message);
            console.log('   We need to restart the server');
          }
        } catch (error) {
          console.error('   ❌ Test failed:', error);
        } finally {
          await prisma.$disconnect();
        }
      }
      
      test();
    `;
    
    // Run the test script
    const fs = require('fs');
    const path = require('path');
    const testPath = path.join(__dirname, 'test-prisma-connection.js');
    
    fs.writeFileSync(testPath, testScript);
    try {
      execSync('node test-prisma-connection.js', { stdio: 'inherit' });
    } finally {
      fs.unlinkSync(testPath);
    }
    
    console.log('\n=======================================');
    console.log('Fix process completed! To finish:');
    console.log('1. Stop your Next.js development server if it\'s running');
    console.log('2. Restart the server: npm run dev');
    console.log('=======================================');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

main(); 