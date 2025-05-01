// Minimal Supabase Credentials Verification
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== SUPABASE CREDENTIALS CHECK ===');
console.log('URL:', url || 'MISSING');
console.log('Anon Key:', anonKey ? `${anonKey.substring(0, 3)}...${anonKey.substring(anonKey.length - 3)}` : 'MISSING');
console.log('Service Key:', serviceKey ? `${serviceKey.substring(0, 3)}...${serviceKey.substring(serviceKey.length - 3)}` : 'MISSING');

// Check if required variables exist
if (!url) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL is missing in .env.local');
  process.exit(1);
}

if (!anonKey) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local');
  process.exit(1);
}

if (!serviceKey) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local');
  process.exit(1);
}

// Test anon client
async function testAnonClient() {
  console.log('\n--- Testing Anonymous Client ---');
  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Anonymous client error:', error.message);
      return false;
    }
    
    console.log('✅ Anonymous client connected successfully');
    console.log('   Session:', data.session ? 'Active' : 'None');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error with anonymous client:', error.message);
    return false;
  }
}

// Test service client
async function testServiceClient() {
  console.log('\n--- Testing Service Role Client ---');
  try {
    const supabase = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Try to list users (admin operation)
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.error('❌ Service client error:', error.message);
      return false;
    }
    
    console.log('✅ Service client connected successfully');
    console.log('   Users count:', data.users.length);
    return true;
  } catch (error) {
    console.error('❌ Unexpected error with service client:', error.message);
    console.error(error);
    return false;
  }
}

// Run tests
async function main() {
  // First check URL formatting
  try {
    new URL(url);
    console.log('✅ URL format is valid');
  } catch (e) {
    console.error('❌ URL format is invalid');
    process.exit(1);
  }
  
  // Check if keys look valid (basic check)
  if (anonKey.length < 20) {
    console.warn('⚠️ Anonymous key looks too short, might be invalid');
  }
  
  if (serviceKey.length < 20) {
    console.warn('⚠️ Service key looks too short, might be invalid');
  }
  
  // Test clients
  const anonResult = await testAnonClient();
  const serviceResult = await testServiceClient();
  
  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('Anonymous Client:', anonResult ? 'WORKING ✅' : 'FAILED ❌');
  console.log('Service Role Client:', serviceResult ? 'WORKING ✅' : 'FAILED ❌');
  
  if (!anonResult && !serviceResult) {
    console.error('\n❌ CRITICAL: Both clients failed to connect.');
    console.error('This indicates either:');
    console.error('1. Invalid credentials in your .env.local file');
    console.error('2. Network connectivity issues to Supabase');
    console.error('3. Your Supabase project might be offline or in maintenance mode');
    
    console.error('\nTry these steps:');
    console.error('1. Double-check the credentials in your Supabase dashboard');
    console.error('2. Ensure you can access your Supabase project in the browser');
    console.error('3. Check if any firewalls are blocking outbound connections');
  } else if (!serviceResult) {
    console.error('\n⚠️ Anonymous client works but service role client fails.');
    console.error('This usually means the service role key is incorrect or expired.');
    console.error('Get a new service role key from: Project Settings > API > service_role key');
  } else {
    console.log('\n✅ All credentials appear to be working correctly!');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
}); 