// Import necessary modules
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Configuration for Supabase REST API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Configuration for direct PostgreSQL connection
const dbUrl = process.env.DATABASE_URL;
const directDbUrl = process.env.DIRECT_DATABASE_URL;

console.log('=== SUPABASE DATABASE CONNECTION TEST ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Database URL:', dbUrl ? dbUrl.substring(0, 45) + '...' : 'not set');
console.log('Direct Database URL:', directDbUrl ? directDbUrl.substring(0, 45) + '...' : 'not set');

// Test Supabase API
async function testSupabaseApi() {
  console.log('\n=== TESTING SUPABASE API ===');
  
  try {
    console.log('Creating service role client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing auth.getUser()...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Auth API test failed');
      console.log('Error:', userError.message);
    } else {
      console.log('✅ Auth API connection successful');
      console.log('User:', userData ? 'Retrieved' : 'Not present');
    }
    
    return !userError;
  } catch (error) {
    console.error('❌ Unexpected error during Supabase API test:', error.message);
    return false;
  }
}

// Test direct PostgreSQL connection
async function testDirectDbConnection() {
  console.log('\n=== TESTING DIRECT POSTGRESQL CONNECTION ===');
  
  if (!directDbUrl) {
    console.log('❌ No direct database URL provided');
    return false;
  }
  
  let client;
  try {
    console.log('Creating PostgreSQL client...');
    const pool = new Pool({ connectionString: directDbUrl });
    client = await pool.connect();
    
    console.log('Executing simple query...');
    const result = await client.query('SELECT 1 as connection_test');
    
    console.log('✅ Direct database connection successful!');
    console.log('Query result:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Direct database connection failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    return false;
  } finally {
    if (client) {
      console.log('Closing connection...');
      client.release();
    }
  }
}

// Test pooled PostgreSQL connection
async function testPooledDbConnection() {
  console.log('\n=== TESTING POOLED POSTGRESQL CONNECTION ===');
  
  if (!dbUrl) {
    console.log('❌ No pooled database URL provided');
    return false;
  }
  
  let client;
  try {
    console.log('Creating PostgreSQL client with connection pooling...');
    const pool = new Pool({ 
      connectionString: dbUrl,
      // Add PgBouncer specific settings
      statement_timeout: 10000, // 10s
      // Disable prepared statements for PgBouncer
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });
    client = await pool.connect();
    
    console.log('Executing simple query...');
    const result = await client.query('SELECT 1 as connection_test');
    
    console.log('✅ Pooled database connection successful!');
    console.log('Query result:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Pooled database connection failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    return false;
  } finally {
    if (client) {
      console.log('Closing connection...');
      client.release();
    }
  }
}

// Run all tests
(async () => {
  console.log('Starting database connection tests...');
  
  const apiResult = await testSupabaseApi();
  const directDbResult = await testDirectDbConnection();
  const pooledDbResult = await testPooledDbConnection();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('Supabase API test:', apiResult ? '✅ PASSED' : '❌ FAILED');
  console.log('Direct Database Connection test:', directDbResult ? '✅ PASSED' : '❌ FAILED');
  console.log('Pooled Database Connection test:', pooledDbResult ? '✅ PASSED' : '❌ FAILED');
  
  // Provide recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  
  if (!apiResult && !directDbResult && !pooledDbResult) {
    console.log('❌ All tests failed. Please check:');
    console.log('  1. Network connectivity to Supabase (firewall, VPN, etc.)');
    console.log('  2. Supabase project is active and not paused');
    console.log('  3. Database credentials are correct');
  } else if (!apiResult && (directDbResult || pooledDbResult)) {
    console.log('⚠️ Database works but Supabase API fails. Please check:');
    console.log('  1. Supabase API keys are correct');
    console.log('  2. Project reference matches between URL and keys');
  } else if (apiResult && !directDbResult && !pooledDbResult) {
    console.log('⚠️ Supabase API works but database connections fail. Please check:');
    console.log('  1. Database password is correct');
    console.log('  2. Database connection string format is correct');
    console.log('  3. Your IP address is allowed in Supabase database settings');
  }
  
  if (apiResult || directDbResult || pooledDbResult) {
    console.log('✅ At least one test passed! You can use the working connection method.');
  }
  
  process.exit(0);
})(); 