/**
 * Browser-like Supabase Auth Test
 * 
 * This script simulates browser-like authentication using the Supabase createClient
 * rather than trying to use admin functions which might require more permissions.
 */

const { createClient } = require('@supabase/supabase-js');

// Set Supabase credentials
const SUPABASE_URL = 'https://hjodvataujilredguzig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqb2R2YXRhdWppbHJlZGd1emlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NTA1NzIsImV4cCI6MjA1OTEyNjU3Mn0.bnK7Zowo-13Uu6v4O5Tp0904Kpe543IeFZjxeDWKGUQ';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to inspect an error object
function inspectError(error) {
  if (!error) return 'No error';
  
  return {
    message: error.message,
    status: error.status,
    name: error.name,
    ...(error.details ? { details: error.details } : {})
  };
}

async function runTests() {
  console.log('=== Browser-like Supabase Auth Test ===\n');
  
  // Test Supabase connection
  console.log('1️⃣ Testing Supabase connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Connection test failed:', inspectError(error));
    } else {
      console.log('✅ Connection test successful!');
      console.log(`Session exists: ${!!data.session}`);
    }
  } catch (err) {
    console.log('❌ Connection test error:', err.message);
  }
  
  // Test public data access
  console.log('\n2️⃣ Testing Supabase public data access...');
  try {
    // Try to access the Spirit table that we can see exists in the database
    const { data, error } = await supabase
      .from('Spirit')
      .select('*')
      .limit(2);
    
    if (error) {
      console.log('❌ Supabase data access failed:', inspectError(error));
      console.log('Checking auth status instead...');
      
      // Fallback to auth status check
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.log('❌ Auth status check failed:', inspectError(authError));
      } else {
        console.log('✅ Auth status check successful!');
      }
    } else {
      console.log('✅ Supabase data access successful!');
      console.log(`Retrieved ${data.length} records from Spirit table`);
    }
  } catch (err) {
    console.log('❌ Supabase data access error:', err.message);
  }
  
  // Test auth state change
  console.log('\n3️⃣ Testing auth state change listener...');
  try {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Auth state change: ${event}`);
        console.log(`Session exists: ${!!session}`);
      }
    );
    
    console.log('✅ Auth state change listener set up successfully!');
    
    // Clean up subscription right away
    subscription.unsubscribe();
  } catch (err) {
    console.log('❌ Auth state change listener error:', err.message);
  }
  
  console.log('\n=== Testing Complete ===');
  console.log('\nRecommendation: To fully test authentication flows:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Test the login/signup flows in the browser');
  console.log('3. Verify protected routes redirect to login page when not authenticated');
}

// Run the tests
runTests().catch(err => {
  console.error('Test suite failed:', err);
}); 