// Simple script to verify database password by attempting to connect
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

// Get database URL from .env.local
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('Please ensure you have a DATABASE_URL in your .env.local file');
  process.exit(1);
}

// Mask the password for logging
const maskedUrl = connectionString.replace(/(postgres:\/\/[^:]+:)([^@]+)(@.*)/, '$1****$3');
console.log(`Attempting to connect to: ${maskedUrl}`);

// SSL connection options to try
const sslOptions = [
  { name: 'SSL Disabled', options: { ssl: false } },
  { name: 'SSL with rejectUnauthorized: false', options: { ssl: { rejectUnauthorized: false } } },
  { name: 'SSL Required', options: { ssl: true } }
];

// Try each SSL option
async function tryConnections() {
  let success = false;
  
  for (const sslOption of sslOptions) {
    console.log(`\nTrying connection with ${sslOption.name}...`);
    
    const client = new Client({
      connectionString,
      ...sslOption.options,
      connectionTimeoutMillis: 15000,
    });
    
    try {
      await client.connect();
      console.log(`✅ SUCCESS: Connected to database with ${sslOption.name}!`);
      
      const result = await client.query('SELECT NOW() as server_time');
      console.log('Query result:', result.rows[0]);
      
      console.log('\nThis confirms your database password is correct.');
      console.log('\nIf you\'re having issues with Vercel:');
      console.log('1. Make sure the POSTGRES_PASSWORD in Vercel matches your Supabase password');
      console.log('2. After updating the password in Vercel, redeploy your application');
      
      success = true;
      await client.end();
      break;
    } catch (err) {
      console.error(`❌ ERROR: Failed to connect with ${sslOption.name}`);
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      
      if (err.message.includes('password authentication failed')) {
        console.error('\n⚠️ PASSWORD AUTHENTICATION FAILED ⚠️');
        console.error('The database password is incorrect!');
        console.error('This confirms that your Supabase database password has changed.');
        console.error('\nYou need to update the POSTGRES_PASSWORD in your Vercel environment variables.');
        
        // No need to try other options if password is wrong
        try { await client.end(); } catch (e) {}
        return false;
      }
      
      try { await client.end(); } catch (e) {}
    }
  }
  
  return success;
}

// Run the tests
tryConnections()
  .then(success => {
    if (!success) {
      console.error('\n❌ All connection attempts failed!');
      console.error('Actions to try:');
      console.error('1. Verify your DATABASE_URL is correct');
      console.error('2. Check if Supabase is running and accessible');
      console.error('3. Try updating your database password in Supabase and Vercel');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error in test runner:', err);
    process.exit(1);
  }); 