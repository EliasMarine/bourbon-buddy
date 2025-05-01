// Import necessary modules
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let dbUrl = process.env.DATABASE_URL;
const dbUrlNonPooling = process.env.POSTGRES_URL_NON_POOLING;

// Prefer DATABASE_URL, fallback to POSTGRES_URL_NON_POOLING
if (!dbUrl && dbUrlNonPooling) {
  dbUrl = dbUrlNonPooling;
  console.log('Using POSTGRES_URL_NON_POOLING as the database connection string.');
}

console.log('=== SUPABASE CONNECTION TEST ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? '✓ Present' : '✗ Missing');
console.log('Service Key:', supabaseServiceKey ? '✓ Present' : '✗ Missing');
console.log('Database URL:', dbUrl ? '✓ Present' : '✗ Missing');

// Detect Supavisor (pooler) connection string
if (dbUrl && dbUrl.includes('pooler.supabase.com')) {
  console.error('\n❌ ERROR: You are using a Supavisor (pooler) connection string.');
  console.error('This type of connection string is ONLY for serverless platforms like Vercel.');
  console.error('It will NOT work with local scripts or the pg client.');
  console.error('\nTo test your database connection locally, use the direct connection string:');
  console.error('  - Go to Supabase Dashboard > Project Settings > Database > Connection Info');
  console.error('  - Use the "Connection string: Non-pooling" (db.<ref>.supabase.co:5432)');
  console.error('  - Set this as your DATABASE_URL or POSTGRES_URL_NON_POOLING in .env.local');
  process.exit(1);
}

// Function to test the REST API
async function testRestApi() {
  console.log('\n=== TESTING SUPABASE REST API ===');
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing auth.getUser()...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Auth API test failed');
      console.log('Error:', userError.message);
      console.log('(This is normal if you\'re not logged in)');
    } else {
      console.log('✅ Auth API connection successful');
      console.log('User:', userData ? 'Retrieved' : 'Not present');
    }
    
    return !userError;
  } catch (error) {
    console.error('❌ Unexpected error during API test:', error.message);
    return false;
  }
}

// Function to test direct database connection
async function testDbConnection() {
  console.log('\n=== TESTING DIRECT DATABASE CONNECTION ===');
  
  if (!dbUrl) {
    console.log('❌ No database URL provided in .env.local');
    console.log('Please add a DATABASE_URL environment variable with your Supabase connection string');
    return false;
  }
  
  let client;
  try {
    // Parse the URL to mask the password when logging
    const maskedUrl = dbUrl.replace(/:[^:@]*@/, ':****@');
    console.log('Connecting to database...', maskedUrl);
    
    const pool = new Pool({ 
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000 // 15 seconds
    });
    
    console.log('Requesting client from pool...');
    client = await pool.connect();
    
    console.log('Executing simple test query...');
    const result = await client.query('SELECT 1 as connection_test');
    
    console.log('✅ Database connection successful!');
    console.log('Query result:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️ PASSWORD AUTHENTICATION FAILED ⚠️');
      console.log('The database password in your DATABASE_URL is incorrect.');
      console.log('This confirms that your Supabase database password has changed.');
      console.log('\nYou need to update the POSTGRES_PASSWORD in your Vercel environment variables.');
    } 
    else if (error.message.includes('self-signed certificate')) {
      console.log('\n⚠️ SSL CONNECTION ISSUE ⚠️');
      console.log('Try modifying the script to use different SSL settings:');
      console.log('1. Try { ssl: true } with rejectUnauthorized: false');
      console.log('2. Try { ssl: false } to disable SSL completely');
    }
    
    return false;
  } finally {
    if (client) {
      console.log('Releasing client back to pool...');
      client.release();
    }
  }
}

// Function to test network connectivity
async function testNetworkConnectivity() {
  console.log('\n=== TESTING NETWORK CONNECTIVITY ===');
  
  try {
    const domain = new URL(supabaseUrl).hostname;
    console.log(`Testing connectivity to ${domain}...`);
    
    const response = await fetch(`${supabaseUrl}/auth/v1/`);
    console.log(`✅ Network connectivity successful (status: ${response.status})`);
    return true;
  } catch (error) {
    console.error('❌ Network connectivity failed!');
    console.error('Error:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Starting Supabase connection tests...');
  
  const networkOk = await testNetworkConnectivity();
  const apiOk = await testRestApi();
  const dbOk = await testDbConnection();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('Network connectivity test:', networkOk ? '✅ PASSED' : '❌ FAILED');
  console.log('Supabase API test:', apiOk ? '✅ PASSED' : '❌ FAILED');
  console.log('Database connection test:', dbOk ? '✅ PASSED' : '❌ FAILED');
  
  console.log('\n=== RECOMMENDATIONS ===');
  
  if (!dbOk && networkOk) {
    console.log('1. Your database connection is failing. This could be due to:');
    console.log('   - Incorrect password in your DATABASE_URL');
    console.log('   - SSL connection issues');
    console.log('   - Network restrictions to the database');
    console.log('\nActions to take:');
    console.log('   - Update POSTGRES_PASSWORD in your Vercel project environment variables');
    console.log('   - Make sure it matches the password you set in Supabase');
    console.log('   - After updating in Vercel, redeploy your application');
  } else if (dbOk) {
    console.log('✅ Database connection is working correctly!');
    console.log('Your password appears to be correct.');
  }
  
  process.exit(0);
}

// Run all tests
runTests(); 