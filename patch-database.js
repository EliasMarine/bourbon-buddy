// Production-ready script to apply database changes
// Uses 'pg' directly to avoid Prisma connection issues
const { Client } = require('pg');
require('dotenv').config();

async function patchDatabase() {
  console.log('Starting database patch for Comment table videoId relation...');
  
  // Create a direct database connection
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: dbUrl,
    // Increase timeout for Supabase connections
    connectionTimeoutMillis: 15000,
    // SSL settings to handle self-signed certs
    ssl: {
      rejectUnauthorized: false // Not recommended for production, but helps for development
    }
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');
    
    // Execute the three statements in sequence within a transaction
    console.log('Starting transaction...');
    await client.query('BEGIN');
    
    try {
      // 1. Add the column
      console.log('Adding videoId column if not exists...');
      await client.query('ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "videoId" TEXT');
      
      // 2. Drop constraint if exists
      console.log('Removing any existing constraint...');
      await client.query('ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_videoId_fkey"');
      
      // 3. Add the foreign key constraint
      console.log('Adding foreign key constraint...');
      await client.query(`
        ALTER TABLE "Comment" 
        ADD CONSTRAINT "Comment_videoId_fkey" 
        FOREIGN KEY ("videoId") REFERENCES "Video"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      
      // Commit the transaction
      console.log('Committing changes...');
      await client.query('COMMIT');
      console.log('Database patch completed successfully');
      
    } catch (txError) {
      // Rollback on any error
      console.error('Transaction error, rolling back:', txError);
      await client.query('ROLLBACK');
      throw txError;
    }
    
  } catch (error) {
    console.error('Database patch failed:', error);
  } finally {
    // Always close the connection
    try {
      await client.end();
      console.log('Database connection closed');
    } catch (endError) {
      console.error('Error closing database connection:', endError);
    }
  }
}

// Execute the patch
patchDatabase().then(() => {
  console.log('Database patch script completed');
}).catch(error => {
  console.error('Unhandled error in patch script:', error);
  process.exit(1);
}); 