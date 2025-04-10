// Import necessary modules
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== SUPABASE CONNECTION TEST ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? '✓ Present' : '✗ Missing');
console.log('Service Key:', supabaseServiceKey ? '✓ Present' : '✗ Missing');

async function testSupabase() {
  try {
    // Try with anon key first
    console.log('\nTesting with anonymous key...');
    const anonymousClient = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('Testing /auth/v1/user endpoint...');
    const { data: userData, error: userError } = await anonymousClient.auth.getUser();
    
    if (userError) {
      console.log('Auth endpoint test result: ❌ Failed');
      console.log('Error:', userError.message);
    } else {
      console.log('Auth endpoint test result: ✅ Success');
      console.log('User:', userData);
    }
    
    // Try a simple query
    console.log('\nTesting basic query...');
    const { data, error } = await anonymousClient
      .from('_prisma_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Query test result: ❌ Failed');
      console.log('Error:', error.message);
      
      if (error.message.includes('permission denied')) {
        console.log('This appears to be a permissions issue, not a connection issue.');
        console.log('The connection to Supabase is working, but the anonymous key lacks permissions.');
      }
    } else {
      console.log('Query test result: ✅ Success');
      console.log('Data:', data);
    }
    
    // If we have a service key, try with that
    if (supabaseServiceKey) {
      console.log('\nTesting with service role key...');
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      console.log('Testing service role query...');
      const { data: adminData, error: adminError } = await adminClient
        .from('_prisma_migrations')
        .select('*')
        .limit(1);
      
      if (adminError) {
        console.log('Service role query test result: ❌ Failed');
        console.log('Error:', adminError.message);
      } else {
        console.log('Service role query test result: ✅ Success');
        console.log('Data count:', adminData.length);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error during test:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testSupabase().then(success => {
  console.log('\n=== TEST SUMMARY ===');
  console.log('Supabase connection test:', success ? '✅ Completed' : '❌ Failed');
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}); 