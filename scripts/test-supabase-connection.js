import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Access environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log values with safe redaction
console.log('Testing connection with:');
console.log('URL:', supabaseUrl?.substring(0, 15) + '...');
console.log('Anon Key:', supabaseAnonKey?.substring(0, 10) + '...');

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test #1: Public API check
async function testPublicAPI() {
  console.log('\n-- Test #1: Public API Check --');
  try {
    const { data, error } = await supabase.from('_test_public').select('*').limit(1);
    
    if (error) {
      console.error('Error with public API:', error.message);
      console.error('Status:', error.status, 'Code:', error.code);
      return false;
    }
    
    console.log('Public API test successful!');
    return true;
  } catch (err) {
    console.error('Exception testing public API:', err.message);
    return false;
  }
}

// Test #2: Authentication check
async function testAuthentication() {
  console.log('\n-- Test #2: Authentication Check --');
  try {
    // Attempt to get the current session (should work with anon key)
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth check error:', error.message);
      console.error('Status:', error.status, 'Code:', error.code);
      return false;
    }
    
    console.log('Auth check successful:', data.session ? 'Has session' : 'No session (expected)');
    return true;
  } catch (err) {
    console.error('Exception testing auth:', err.message);
    return false;
  }
}

// Test #3: Check if URL is correct
async function testURLCorrectness() {
  console.log('\n-- Test #3: URL Check --');
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`);
    const status = response.status;
    
    // Even if we get a 401 Unauthorized, at least we know the URL exists
    // 401 is expected since we're not providing the right auth header
    if (status === 401) {
      console.log('URL check successful! (Got expected 401 response)');
      return true;
    } else if (status >= 500) {
      console.error(`URL check failed with server error: ${status}`);
      return false;
    } else if (status === 404) {
      console.error('URL check failed: Endpoint not found (404)');
      return false;
    } else {
      console.log(`URL check: Unexpected status ${status}, but URL seems reachable`);
      return true;
    }
  } catch (err) {
    console.error('Exception testing URL:', err.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Supabase connection tests...\n');
  
  const urlTest = await testURLCorrectness();
  const authTest = await testAuthentication();
  const publicTest = await testPublicAPI();
  
  console.log('\n--- Test Results Summary ---');
  console.log('URL Check:', urlTest ? '✅ PASS' : '❌ FAIL');
  console.log('Auth Check:', authTest ? '✅ PASS' : '❌ FAIL');
  console.log('Public API Check:', publicTest ? '✅ PASS' : '❌ FAIL');
  
  if (!urlTest) {
    console.log('\nSuggestions for URL issues:');
    console.log('- Check if the NEXT_PUBLIC_SUPABASE_URL in .env.local is correct');
    console.log('- Verify there are no typos or extra spaces');
    console.log('- Make sure the URL is in the format: https://your-project-id.supabase.co');
  }
  
  if (!authTest) {
    console.log('\nSuggestions for authentication issues:');
    console.log('- Check if the NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local is correct');
    console.log('- Make sure it\'s the anon key and not the service key');
    console.log('- Verify the key is not expired or revoked (check Supabase dashboard)');
  }
  
  if (!urlTest || !authTest) {
    console.log('\nAdditional troubleshooting:');
    console.log('1. Try creating a new API key in the Supabase dashboard');
    console.log('2. Check if your Supabase project is active (not paused)');
    console.log('3. Ensure your IP is not blocked by Supabase');
  }
}

runTests(); 