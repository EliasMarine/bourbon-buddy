/**
 * Quick Supabase Auth Test
 * 
 * A simplified script to test basic Supabase authentication operations.
 */

const { createClient } = require('@supabase/supabase-js');

// Set Supabase credentials
const SUPABASE_URL = 'https://hjodvataujilredguzig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqb2R2YXRhdWppbHJlZGd1emlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NTA1NzIsImV4cCI6MjA1OTEyNjU3Mn0.bnK7Zowo-13Uu6v4O5Tp0904Kpe543IeFZjxeDWKGUQ';

// Test credentials
const TEST_EMAIL = 'esbz0055@gmail.com';
const TEST_PASSWORD = 'Test123!@#';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTests() {
  console.log('=== Quick Supabase Auth Test ===\n');
  
  // Test Supabase connection
  console.log('Testing Supabase connection...');
  try {
    // Fetch the current session to verify connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Connection test failed:', error.message);
    } else {
      console.log('✅ Connection test successful!');
      console.log(`Session exists: ${!!data.session}`);
    }
  } catch (err) {
    console.log('❌ Connection test error:', err.message);
  }
  
  // Test signup
  console.log('\nTesting signup...');
  try {
    // First try to delete the test user if it exists
    try {
      await supabase.auth.admin.deleteUser(TEST_EMAIL, true);
      console.log('Cleaned up existing test user');
    } catch (err) {
      // Ignore errors here as the user might not exist
    }
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: {
          username: 'testuser',
          name: 'Test User',
        }
      }
    });
    
    if (signUpError) {
      console.log('❌ Signup failed:', signUpError.message);
    } else {
      console.log('✅ Signup test passed!');
      console.log('User ID:', signUpData.user?.id);
      console.log('Email:', signUpData.user?.email);
    }
  } catch (err) {
    console.log('❌ Signup test error:', err.message);
  }
  
  // Test sign in
  console.log('\nTesting sign in...');
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
    } else {
      console.log('✅ Sign in test passed!');
      console.log('User ID:', signInData.user?.id);
      console.log('Session exists:', !!signInData.session);
    }
  } catch (err) {
    console.log('❌ Sign in test error:', err.message);
  }
  
  // Test sign out
  console.log('\nTesting sign out...');
  try {
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.log('❌ Sign out failed:', signOutError.message);
    } else {
      console.log('✅ Sign out test passed!');
      
      // Verify session is gone
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session after signout:', sessionData.session ? 'Still exists (❌)' : 'Correctly removed (✅)');
    }
  } catch (err) {
    console.log('❌ Sign out test error:', err.message);
  }
  
  console.log('\n=== Testing Complete ===');
}

// Run the tests
runTests().catch(err => {
  console.error('Test suite failed:', err);
}); 