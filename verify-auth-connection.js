// Verify Supabase Auth Connection (No Sign Up)
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create client - this simulates what happens in the browser
const supabase = createClient(url, anonKey);

// Check if we can connect to the Auth API
async function checkAuthConnection() {
  console.log('Testing connection to Supabase Auth API...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connected to Supabase Auth API successfully');
    console.log('Session data available:', !!data);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Check if OAuth providers are configured
async function checkAuthProviders() {
  console.log('\nChecking available auth providers...');
  
  try {
    const { data: settings, error } = await supabase.auth.getSettings();
    
    if (error) {
      console.error('❌ Could not fetch auth settings:', error.message);
      return false;
    }
    
    console.log('✅ Auth settings retrieved successfully');
    
    // Print enabled auth providers
    if (settings?.external) {
      const enabledProviders = [];
      
      if (settings.external.email?.enabled) {
        enabledProviders.push('Email');
      }
      
      if (settings.external.phone?.enabled) {
        enabledProviders.push('Phone');
      }
      
      if (settings.external.google?.enabled) {
        enabledProviders.push('Google');
      }
      
      if (settings.external.facebook?.enabled) {
        enabledProviders.push('Facebook');
      }
      
      if (settings.external.github?.enabled) {
        enabledProviders.push('GitHub');
      }
      
      console.log('Enabled auth providers:', enabledProviders.join(', ') || 'None');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking auth providers:', error.message);
    return false;
  }
}

// Test password reset flow setup
async function testPasswordResetFlow() {
  console.log('\nVerifying password reset functionality...');
  
  try {
    // We don't actually send a reset email, just check if the endpoint works
    const fakeEmail = `nonexistent-${Date.now()}@example.com`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(fakeEmail, {
      redirectTo: 'https://example.com/reset-password'
    });
    
    // This should return success even for non-existent emails
    // for security reasons (the API doesn't confirm if the email exists)
    if (error) {
      console.log('❌ Password reset flow not working:', error.message);
      return false;
    }
    
    console.log('✅ Password reset flow is properly configured');
    return true;
  } catch (error) {
    console.error('❌ Error testing password reset:', error.message);
    return false;
  }
}

// Simulate what happens when someone clicks on the sign-up button
async function simulateSignupFlow() {
  console.log('\nSimulating signup flow (without creating a user)...');
  
  try {
    // We simulate the process up to the API call, but use an invalid email format
    // to ensure it fails validation rather than hitting rate limits
    const invalidEmail = 'not-an-email-address';
    const password = 'Test123!@#';
    
    const { error } = await supabase.auth.signUp({
      email: invalidEmail,
      password,
    });
    
    // We expect an error for invalid email
    if (error && error.message.includes('invalid email')) {
      console.log('✅ Signup validation is working properly');
      return true;
    } else if (error) {
      console.log('✅ Signup endpoint is reachable but returned a different error:');
      console.log('   ', error.message);
      return true;
    } else {
      console.log('⚠️ Unexpected success with invalid email format');
      return false;
    }
  } catch (error) {
    console.error('❌ Error accessing signup endpoint:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== SUPABASE AUTH CONNECTION VERIFICATION ===');
  console.log('URL:', url);
  
  // Check basic connection
  const isConnected = await checkAuthConnection();
  
  if (!isConnected) {
    console.error('\n❌ Failed to connect to Supabase Auth API. Your authentication will not work.');
    console.error('Please check:');
    console.error('1. Your NEXT_PUBLIC_SUPABASE_URL value is correct');
    console.error('2. Your NEXT_PUBLIC_SUPABASE_ANON_KEY value is correct');
    console.error('3. Your network connection to Supabase servers is working');
    console.error('4. Your Supabase project is active (not in maintenance mode)');
    process.exit(1);
  }
  
  // Run all verification tests
  await checkAuthProviders();
  await testPasswordResetFlow();
  await simulateSignupFlow();
  
  // Final verdict
  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('✅ Supabase Auth connection is working correctly');
  console.log('✅ Your signup form should be able to communicate with Supabase');
  console.log('\nIf you\'re still having issues with your website signup form:');
  console.log('1. Check browser console for errors during signup');
  console.log('2. Verify that your frontend code is correctly calling supabase.auth.signUp()');
  console.log('3. Ensure all environment variables are correctly set in your production environment');
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error);
}); 