// Simple script to test Supavisor connection with special handling
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Get database URL from .env.local
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please ensure you have a DATABASE_URL in your .env.local file');
  process.exit(1);
}

// Remove SSL mode and custom parameters which might be causing issues
if (connectionString.includes('?')) {
  console.log('Removing query parameters from connection string...');
  connectionString = connectionString.split('?')[0];
}

// Mask the password for logging
const maskedUrl = connectionString.replace(/(postgres:\/\/[^:]+:)([^@]+)(@.*)/, '$1****$3');
console.log(`Attempting to connect to: ${maskedUrl}`);

// Create a client with proper SSL settings for Supavisor
const client = new Client({
  connectionString,
  // No SSL for Supavisor connections from Vercel
  ssl: false,  
  // Extended timeout
  connectionTimeoutMillis: 20000,
});

// Try to connect
console.log('Connecting to Supavisor...');
client.connect()
  .then(() => {
    console.log('✅ SUCCESS: Connected to database successfully!');
    console.log('This confirms your database password is correct.');
    console.log('Running test query...');
    
    return client.query('SELECT NOW() as server_time');
  })
  .then(result => {
    if (result && result.rows && result.rows[0]) {
      console.log('Query result:', result.rows[0]);
      console.log('\nDatabase connection is WORKING!');
      console.log('\nIf you\'re having issues with Vercel:');
      console.log('1. Make sure the POSTGRES_PASSWORD in Vercel matches your Supabase password');
      console.log('2. After updating the password in Vercel, redeploy your application');
    }
  })
  .catch(err => {
    console.error('❌ ERROR: Failed to connect to database');
    console.error('Error type:', err.constructor.name);
    console.error('Error message:', err.message);
    
    if (err.message.includes('password authentication failed')) {
      console.error('\n⚠️ PASSWORD AUTHENTICATION FAILED ⚠️');
      console.error('The database password in your DATABASE_URL is incorrect.');
      console.error('This confirms that your Supabase database password has changed.');
      console.error('\nYou need to update the POSTGRES_PASSWORD in your Vercel environment variables.');
    } else if (err.message.includes('certificate')) {
      console.error('\n⚠️ SSL CERTIFICATE ISSUE ⚠️');
      console.error('Try these alternatives:');
      console.error('1. Use the Supabase SDK instead of direct connections');
      console.error('2. Create a direct connection string (not pooler) for testing');
    }
  })
  .finally(() => {
    // Close the client connection
    client.end().catch(console.error);
  }); 