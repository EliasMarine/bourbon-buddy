// Script to list all tables in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting database table check...');
    
    // First check if the database connection works
    console.log('Testing database connection...');
    const testResult = await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log('✅ Database connection successful:', testResult);
    
    // List all tables in the database
    console.log('Listing all tables in the database...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('Tables in the database:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    if (tables.length === 0) {
      console.log('No tables found in the database.');
    }
    
    // If we have tables, let's check one of them for its structure
    if (tables.length > 0) {
      const firstTable = tables[0].table_name;
      console.log(`\nChecking columns for table "${firstTable}"...`);
      
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${firstTable}
        ORDER BY ordinal_position;
      `;
      
      console.log(`Columns in table "${firstTable}":`);
      columns.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 