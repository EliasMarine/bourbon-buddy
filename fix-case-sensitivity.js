// Script to fix case sensitivity issue with webImageUrl column
const { execSync } = require('child_process');

function main() {
  try {
    console.log('Checking current table structure...');
    // Use a case-insensitive check for the column
    const columnCheckOutput = execSync(`
      psql -h localhost -U eliasbouzeid -d database -c "
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Spirit'
        AND lower(column_name) = lower('webImageUrl');"
    `).toString();
    
    console.log('Column check results:');
    console.log(columnCheckOutput);
    
    console.log('\nTrying to rename the column to a temporary name and back to fix case sensitivity...');
    
    try {
      // First try adding the column with IF NOT EXISTS
      execSync(`
        psql -h localhost -U eliasbouzeid -d database -c "
          ALTER TABLE \\"Spirit\\" ADD COLUMN IF NOT EXISTS temp_web_image_url TEXT;"
      `);
      
      console.log('Added temporary column successfully');
      
      // Copy data from old column to new column if old column exists
      console.log('Copying data to temporary column (will fail if old column doesn\'t exist)...');
      try {
        execSync(`
          psql -h localhost -U eliasbouzeid -d database -c "
            UPDATE \\"Spirit\\" SET temp_web_image_url = \\"webImageUrl\\";"
        `);
        console.log('Data copied successfully');
      } catch (error) {
        console.log('Copy failed (old column might not exist): ', error.message);
      }
      
      // Drop the old column
      console.log('Dropping old column (will fail if it doesn\'t exist)...');
      try {
        execSync(`
          psql -h localhost -U eliasbouzeid -d database -c "
            ALTER TABLE \\"Spirit\\" DROP COLUMN \\"webImageUrl\\";"
        `);
        console.log('Old column dropped successfully');
      } catch (error) {
        console.log('Drop failed (column might not exist): ', error.message);
      }
      
      // Rename the temp column to the correct name
      console.log('Renaming temporary column to webImageUrl...');
      execSync(`
        psql -h localhost -U eliasbouzeid -d database -c "
          ALTER TABLE \\"Spirit\\" RENAME COLUMN temp_web_image_url TO \\"webImageUrl\\";"
      `);
      
      console.log('Column renamed successfully');
    } catch (error) {
      console.error('Error during column operations:', error.message);
    }
    
    // Verify the fix
    console.log('\nVerifying the fix...');
    const verifyOutput = execSync(`
      psql -h localhost -U eliasbouzeid -d database -c "
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Spirit'
        AND lower(column_name) = lower('webImageUrl');"
    `).toString();
    
    console.log('Verification results:');
    console.log(verifyOutput);
    
    // Test a query
    console.log('\nTesting a query with the new column...');
    try {
      const queryOutput = execSync(`
        psql -h localhost -U eliasbouzeid -d database -c "
          SELECT id, name, \\"webImageUrl\\" FROM \\"Spirit\\" LIMIT 1;"
      `).toString();
      
      console.log('Query results:');
      console.log(queryOutput);
      console.log('\n✅ Fix successful! The webImageUrl column now works correctly.');
    } catch (error) {
      console.error('Query test failed:', error.message);
      console.log('\n❌ Fix unsuccessful. Please try a different approach.');
    }
    
    // Restart instructions
    console.log('\nTo complete the fix:');
    console.log('1. Stop your Next.js development server (Ctrl+C)');
    console.log('2. Run: npx prisma generate');
    console.log('3. Restart your server: npm run dev');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

main(); 