// Script to force Prisma to reload schema and regenerate client
const { execSync } = require('child_process');

function main() {
  try {
    console.log('Starting Prisma reload process...');
    
    // Step 1: Delete the Prisma client
    console.log('1. Cleaning Prisma generated files...');
    try {
      execSync('rm -rf node_modules/.prisma');
      execSync('rm -rf node_modules/@prisma/client');
      console.log('   - Removed .prisma folder and @prisma/client');
    } catch (err) {
      console.log('   - Error removing folders (might not exist):', err.message);
    }
    
    // Step 2: Regenerate the Prisma client
    console.log('\n2. Regenerating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('\n3. Testing database schema...');
    const testScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function test() {
      try {
        // Try to describe the Spirit table
        const columns = await prisma.$queryRaw\`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'Spirit'
          ORDER BY ordinal_position;
        \`;
        
        console.log('\\nColumns in Spirit table:');
        columns.forEach(column => {
          console.log(\`- \${column.column_name} (\${column.data_type})\`);
        });
        
        const hasWebImageUrl = columns.some(c => c.column_name.toLowerCase() === 'webimageurl');
        if (hasWebImageUrl) {
          console.log('\\n✅ webImageUrl column exists in database schema!');
        } else {
          console.log('\\n❌ webImageUrl column NOT FOUND in database schema.');
          console.log('   - Adding the column now...');
          
          try {
            await prisma.$executeRaw\`ALTER TABLE "Spirit" ADD COLUMN IF NOT EXISTS "webImageUrl" TEXT;\`;
            console.log('   - Column added successfully!');
          } catch (addError) {
            console.error('   - Failed to add column:', addError);
          }
        }
        
        // Test a direct query using the webImageUrl field
        console.log('\\n4. Testing direct Prisma query with webImageUrl field...');
        try {
          const testSpirit = await prisma.spirit.findFirst({
            select: {
              id: true,
              webImageUrl: true
            },
            take: 1
          });
          
          console.log('✅ Direct query successful! Result:', testSpirit);
        } catch (queryError) {
          console.error('❌ Direct query failed:', queryError.message);
          console.log('   This suggests the column exists in database but not in Prisma cache.');
          console.log('   Try restarting your application completely.');
        }
      } catch (error) {
        console.error('Schema test error:', error);
      } finally {
        await prisma.$disconnect();
      }
    }

    test();
    `;
    
    // Save the test script to a temporary file and run it
    const fs = require('fs');
    const path = require('path');
    const tempScriptPath = path.join(__dirname, 'temp-test.js');
    
    fs.writeFileSync(tempScriptPath, testScript);
    console.log('\nRunning test script...');
    
    try {
      execSync('node temp-test.js', { stdio: 'inherit' });
    } finally {
      // Clean up the temporary file
      fs.unlinkSync(tempScriptPath);
    }
    
    console.log('\nPrisma client reload process complete!');
    console.log('To fully apply changes, please restart your Next.js development server:');
    console.log('1. Stop your current server (Ctrl+C)');
    console.log('2. Start it again with: npm run dev');
    
  } catch (error) {
    console.error('Error during Prisma reload:', error);
    process.exit(1);
  }
}

main(); 