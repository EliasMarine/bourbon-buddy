// Script to add webImageUrl column to Spirit table
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database column update...');
    
    // First check if the database connection works
    console.log('Testing database connection...');
    const testResult = await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log('✅ Database connection successful:', testResult);
    
    // Check if Spirit table exists
    console.log('Checking if Spirit table exists...');
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Spirit'
      );
    `;
    console.log('Table exists check result:', tableExists);
    
    if (!tableExists[0].exists) {
      console.error('❌ Spirit table does not exist!');
      return;
    }
    
    // Check if webImageUrl column already exists
    console.log('Checking if webImageUrl column exists...');
    const columnExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Spirit' 
        AND column_name = 'webImageUrl'
      );
    `;
    console.log('Column exists check result:', columnExists);
    
    if (columnExists[0].exists) {
      console.log('✅ webImageUrl column already exists, no action needed');
      return;
    }
    
    // Add the column
    console.log('Adding webImageUrl column to Spirit table...');
    await prisma.$executeRaw`ALTER TABLE "Spirit" ADD COLUMN "webImageUrl" TEXT;`;
    console.log('✅ webImageUrl column added successfully!');
    
    // Verify the column was added
    const verifyColumn = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'Spirit' 
      AND column_name = 'webImageUrl';
    `;
    console.log('Column verification:', verifyColumn);
    
    if (verifyColumn.length > 0) {
      console.log('✅ Verification successful, column details:', verifyColumn[0]);
    } else {
      console.error('❌ Verification failed, column not found after adding');
    }
    
    console.log('Done! Please restart your application.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 