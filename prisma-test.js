// Import dotenv to load environment variables
require('dotenv').config({ path: '.env.local' });

// Import the PrismaClient from the Prisma package
const { PrismaClient } = require('@prisma/client');

// Create a new PrismaClient instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Test function
async function testPrismaConnection() {
  console.log('=== PRISMA DATABASE CONNECTION TEST ===');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 45) + '...' : 'not set');
  
  try {
    console.log('\nAttempting to query using Prisma...');
    
    // Try to execute a simple query
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
    
    console.log('✅ Database connection successful!');
    console.log('Query result:', result);
    
    // Try to query a real table
    console.log('\nTrying to query an actual table (_prisma_migrations)...');
    
    const migrations = await prisma.$queryRaw`SELECT * FROM "_prisma_migrations" LIMIT 1`;
    console.log('✅ Migration query successful!');
    console.log('Migrations found:', migrations.length);
    
    if (migrations.length > 0) {
      console.log('Sample migration:');
      console.log('  ID:', migrations[0].id);
      console.log('  Name:', migrations[0].name);
      console.log('  Applied at:', migrations[0].applied_at);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Check for specific error types
    if (error.message.includes('ENOTFOUND')) {
      console.error('\nThis looks like a DNS resolution issue - the database hostname cannot be found.');
      console.error('Check your network connection and DNS settings.');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('\nConnection timed out - the database server is unreachable.');
      console.error('This could be due to network issues, firewall rules, or VPN settings.');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\nAuthentication failed - the username or password is incorrect.');
      console.error('Update your DATABASE_URL with the correct credentials.');
    }
    
    return false;
  } finally {
    // Always disconnect to clean up
    await prisma.$disconnect();
  }
}

// Run the test
testPrismaConnection()
  .then(success => {
    console.log('\n=== TEST SUMMARY ===');
    console.log('Prisma connection test:', success ? '✅ PASSED' : '❌ FAILED');
    
    // Exit with an appropriate code
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error in test runner:', error);
    process.exit(1);
  }); 