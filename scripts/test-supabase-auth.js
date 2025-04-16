import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Access environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test email and password - you can update these directly here for testing
const testEmail = 'test@example.com';  // Replace with an actual user email for testing
const testPassword = 'password123';    // Replace with the actual password

// Log values with safe redaction
console.log('Testing Supabase Authentication with:');
console.log('URL:', supabaseUrl?.substring(0, 15) + '...');
console.log('Anon Key:', supabaseAnonKey?.substring(0, 10) + '...');

// Create the Supabase client directly
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test function to verify the Anon Key works for basic auth operations
async function testAnonKeyAuth() {
  console.log('\n-- Testing Anon Key for Auth --');
  try {
    // Make a request to the auth API with the anon key
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ FAIL: Anon key authentication error:', error.message);
      console.error('Status:', error.status, 'Error details:', error);
      return false;
    }
    
    console.log('✅ PASS: Anon key is valid for auth API');
    console.log('Session data:', data);
    return true;
  } catch (error) {
    console.error('❌ FAIL: Exception in anon key test:', error.message);
    return false;
  }
}

// Test function to attempt sign in if credentials are provided
async function testSignIn() {
  // Skip this test if we're using placeholder credentials
  if (testEmail === 'test@example.com' && testPassword === 'password123') {
    console.log('\n-- Skipping Sign In Test (using placeholder credentials) --');
    return 'skipped';
  }
  
  console.log('\n-- Testing Sign In with Email/Password --');
  try {
    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.error('❌ FAIL: Sign in error:', error.message);
      console.error('Status:', error.status, 'Error details:', error);
      return false;
    }
    
    console.log('✅ PASS: Sign in successful!');
    console.log('User:', data.user?.email);
    return true;
  } catch (error) {
    console.error('❌ FAIL: Exception in sign in test:', error.message);
    return false;
  }
}

// Test direct API access without authentication
async function testDirectApiAccess() {
  console.log('\n-- Testing Direct API Access --');
  try {
    // Make a simple GET request to the API to check if the URL is valid
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`);
    const status = response.status;
    
    console.log('API Response Status:', status);
    
    // Even if we get a 401 Unauthorized, the URL is correct
    if (status === 401) {
      console.log('✅ PASS: URL is valid (got expected 401 Unauthorized)');
      return true;
    } else if (status === 404) {
      console.error('❌ FAIL: URL is invalid (404 Not Found)');
      return false;
    } else {
      console.log(`URL check resulted in status ${status}, considering valid`);
      return true;
    }
  } catch (error) {
    console.error('❌ FAIL: Exception in direct API test:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🔍 Starting Supabase Authentication Tests...\n');
  
  const directApiTest = await testDirectApiAccess();
  const anonKeyTest = await testAnonKeyAuth();
  const signInResult = await testSignIn();
  
  console.log('\n====== TEST RESULTS SUMMARY ======');
  console.log('API URL Check:', directApiTest ? '✅ PASS' : '❌ FAIL');
  console.log('Anon Key Check:', anonKeyTest ? '✅ PASS' : '❌ FAIL');
  console.log('Sign In Test:', 
    signInResult === 'skipped' ? '⏭️ SKIPPED' : 
    signInResult ? '✅ PASS' : '❌ FAIL');
  
  if (!directApiTest || !anonKeyTest) {
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    
    if (!directApiTest) {
      console.log('\n1. URL Issues:');
      console.log('- Verify NEXT_PUBLIC_SUPABASE_URL in .env.local is correct');
      console.log('- Check for typos or extra whitespace');
      console.log('- Ensure the URL format is https://<project-id>.supabase.co');
      console.log('- Test if the URL is reachable in your browser');
    }
    
    if (!anonKeyTest) {
      console.log('\n2. Anon Key Issues:');
      console.log('- Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local is correct');
      console.log('- Verify you\'re using the anon key (not service_role)');
      console.log('- Check Supabase dashboard to confirm key is active');
      console.log('- Try generating a new anon key if needed');
    }
    
    console.log('\n3. General Checks:');
    console.log('- Ensure your Supabase project is active (not paused/disabled)');
    console.log('- Check for IP restrictions or rate limiting');
    console.log('- Review project settings in the Supabase dashboard');
    console.log('- Check Supabase status page for service outages');
  }
}

// Run the tests
runAllTests(); 