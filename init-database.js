// Script to initialize the database with tables from the Prisma schema
const { execSync } = require('child_process');
const path = require('path');

function main() {
  try {
    console.log('Starting database initialization...');
    
    console.log('1. Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('\n2. Pushing schema to database (without migrations)...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    
    console.log('\n3. Verifying tables were created...');
    const verifyScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function verify() {
      try {
        // List all tables
        const tables = await prisma.$queryRaw\`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        \`;
        
        console.log('\\nTables in the database:');
        tables.forEach(table => {
          console.log(\`- \${table.table_name}\`);
        });
        
        // Check if Spirit table exists
        const spiritTable = tables.find(t => t.table_name.toLowerCase() === 'spirit');
        
        if (spiritTable) {
          console.log('\\n✅ Spirit table exists!');
          
          // Check if Spirit table has webImageUrl column
          const columns = await prisma.$queryRaw\`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = \${spiritTable.table_name}
            ORDER BY ordinal_position;
          \`;
          
          console.log(\`\\nColumns in Spirit table:\`);
          columns.forEach(column => {
            console.log(\`- \${column.column_name} (\${column.data_type})\`);
          });
          
          const hasWebImageUrl = columns.some(c => c.column_name.toLowerCase() === 'webimageurl');
          
          if (hasWebImageUrl) {
            console.log('\\n✅ webImageUrl column exists in Spirit table!');
          } else {
            console.log('\\n❌ webImageUrl column does not exist in Spirit table.');
          }
        } else {
          console.log('\\n❌ Spirit table does not exist.');
        }
      } catch (error) {
        console.error('Verification error:', error);
      } finally {
        await prisma.$disconnect();
      }
    }

    verify();
    `;
    
    // Save the verification script to a temporary file and run it
    const fs = require('fs');
    const tempScriptPath = path.join(__dirname, 'temp-verify.js');
    
    fs.writeFileSync(tempScriptPath, verifyScript);
    console.log('\nRunning verification script...');
    
    try {
      execSync('node temp-verify.js', { stdio: 'inherit' });
    } finally {
      // Clean up the temporary file
      fs.unlinkSync(tempScriptPath);
    }
    
    console.log('\nDatabase initialization complete!');
    console.log('You can now restart your application and it should work without errors.');
    
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

main(); 