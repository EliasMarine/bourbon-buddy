// Script to check all databases for the Spirit table and webImageUrl column
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const databases = [
  'bourbon_buddy',
  'database',
  'spirits_db'
];

async function main() {
  console.log('Checking all databases for Spirit table and webImageUrl column...\n');
  
  for (const dbName of databases) {
    console.log(`\n===== Checking database: ${dbName} =====`);
    
    // Check if Spirit table exists
    try {
      const { stdout: tableCheck } = await execAsync(`
        psql -h localhost -U eliasbouzeid -d ${dbName} -c "
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'Spirit'
          );"
      `);
      
      console.log('Spirit table exists?');
      console.log(tableCheck);
      
      if (tableCheck.includes('t')) {
        // Table exists, check for webImageUrl column
        const { stdout: columnCheck } = await execAsync(`
          psql -h localhost -U eliasbouzeid -d ${dbName} -c "
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'Spirit'
            AND column_name = 'webImageUrl';"
        `);
        
        console.log('webImageUrl column exists?');
        console.log(columnCheck);
        
        if (columnCheck.includes('webImageUrl')) {
          console.log(`✅ Database ${dbName} has the Spirit table with webImageUrl column`);
          
          // Show some sample data
          const { stdout: sampleData } = await execAsync(`
            psql -h localhost -U eliasbouzeid -d ${dbName} -c "
              SELECT id, name, brand, webImageUrl 
              FROM \\"Spirit\\" 
              LIMIT 3;"
          `);
          
          console.log('Sample data:');
          console.log(sampleData);
        } else {
          console.log(`❌ Database ${dbName} has the Spirit table but NO webImageUrl column`);
          
          // Ask if we should add the column
          console.log(`\nAdding webImageUrl column to ${dbName}...`);
          const { stdout: addColumn } = await execAsync(`
            psql -h localhost -U eliasbouzeid -d ${dbName} -c "
              ALTER TABLE \\"Spirit\\" ADD COLUMN IF NOT EXISTS \\"webImageUrl\\" TEXT;"
          `);
          
          console.log('Result:');
          console.log(addColumn);
        }
      } else {
        console.log(`❌ Database ${dbName} does NOT have the Spirit table`);
      }
    } catch (error) {
      console.error(`Error checking database ${dbName}:`, error.message);
    }
  }
  
  console.log('\nDatabase check complete!');
  console.log('Update your .env file to use the correct database that has the Spirit table with webImageUrl column.');
}

main().catch(error => {
  console.error('Error in main function:', error);
}); 