// Import necessary modules
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== SUPABASE DIRECT CONNECTION TEST ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key Present:', !!supabaseAnonKey);
console.log('Service Key Present:', !!supabaseServiceKey);

async function testSupabase() {
  try {
    console.log('\nCreating Supabase client with Anon Key...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('Testing Auth API...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Auth API test failed');
      console.log('Error:', sessionError.message);
    } else {
      console.log('✅ Auth API connection successful');
      console.log('Session:', session ? 'Present' : 'Not present (expected if not logged in)');
    }
    
    console.log('\nTesting creating a service role client...');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Fetching tables list...');
    const { data: tables, error: tablesError } = await adminClient
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public')
      .order('tablename', { ascending: true });
    
    if (tablesError) {
      console.log('❌ Database query failed');
      console.log('Error:', tablesError.message);
    } else {
      console.log('✅ Database query successful');
      console.log(`Found ${tables.length} tables in the public schema`);
      
      if (tables.length > 0) {
        console.log('\nTables in database:');
        tables.forEach(table => {
          console.log(`- ${table.tablename}`);
        });
      }
    }
    
    return !tablesError;
  } catch (error) {
    console.error('❌ Unexpected error during test:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Network connection test
async function testNetworkConnectivity() {
  console.log('\n=== NETWORK CONNECTIVITY TEST ===');
  const domain = new URL(supabaseUrl).hostname;
  
  console.log(`Testing network connectivity to ${domain}...`);
  
  try {
    const dns = require('dns');
    const util = require('util');
    const lookup = util.promisify(dns.lookup);
    
    console.log(`Attempting DNS lookup for ${domain}...`);
    const result = await lookup(domain);
    
    console.log('✅ DNS lookup successful');
    console.log(`IP address: ${result.address}`);
    
    return true;
  } catch (error) {
    console.error('❌ DNS lookup failed. Network connectivity issues detected.');
    console.error('Error:', error.message);
    return false;
  }
}

// Run both tests
(async () => {
  console.log('Starting Supabase connection tests...');
  
  const networkOk = await testNetworkConnectivity();
  const supabaseOk = await testSupabase();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('Network connectivity test:', networkOk ? '✅ PASSED' : '❌ FAILED');
  console.log('Supabase API test:', supabaseOk ? '✅ PASSED' : '❌ FAILED');
  
  // Provide recommendations based on test results
  console.log('\n=== RECOMMENDATIONS ===');
  if (!networkOk) {
    console.log('❌ Network connectivity issues detected. Please check:');
    console.log('  1. Your internet connection');
    console.log('  2. Any firewalls or VPNs that might be blocking connections');
    console.log('  3. DNS settings on your machine');
  }
  
  if (!supabaseOk && networkOk) {
    console.log('❌ Supabase connection issues detected. Please check:');
    console.log('  1. Your Supabase project is active (not paused)');
    console.log('  2. The API keys are correct');
    console.log('  3. The database is available and not in maintenance mode');
  }
  
  if (networkOk && supabaseOk) {
    console.log('✅ All tests passed! Supabase appears to be correctly configured.');
  }
  
  process.exit(0);
})(); 