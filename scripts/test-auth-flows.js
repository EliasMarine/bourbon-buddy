/**
 * Supabase Auth Migration Test Suite
 * 
 * This script helps test authentication flows after migrating from NextAuth to Supabase Auth.
 * Run this script to ensure all authentication flows are working correctly.
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const readline = require('readline');

// Get environment variables from .env file
require('dotenv').config();

// For testing, we'll hardcode the URL and anon key
const SUPABASE_URL = 'https://hjodvataujilredguzig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqb2R2YXRhdWppbHJlZGd1emlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NTA1NzIsImV4cCI6MjA1OTEyNjU3Mn0.bnK7Zowo-13Uu6v4O5Tp0904Kpe543IeFZjxeDWKGUQ';

// Create Supabase client
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define test credentials (use test accounts only!)
const TEST_EMAIL = 'esbz0055@gmail.com';
const TEST_PASSWORD = 'Test123!@#';
const TEST_USERNAME = 'testuser';
const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Function to ask yes/no questions
function askQuestion(query) {
  return new Promise(resolve => {
    rl.question(`${query} (y/n): `, answer => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function runTests() {
  console.log('=== Supabase Auth Migration Tests ===\n');
  
  const runAllTests = await askQuestion('Do you want to run all tests?');
  let accessToken = null;
  
  // Test 1: Sign Up
  if (runAllTests || await askQuestion('Test signup flow?')) {
    console.log('\n--- Testing Signup Flow ---');
    
    try {
      // First try to delete the test user if it exists
      await supabase.auth.admin.deleteUser(TEST_EMAIL, true);
      console.log('Preparing for test: Cleaned up existing test user');
    } catch (err) {
      // Ignore errors here as the user might not exist
    }
    
    try {
      // Attempt to create a new user
      const { data, error } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        options: {
          data: {
            username: TEST_USERNAME,
            name: 'Test User',
          }
        }
      });
      
      if (error) {
        console.log('❌ Signup failed:', error.message);
      } else {
        console.log('✅ Signup successful!');
        if (data.session) {
          accessToken = data.session.access_token;
          console.log('✅ Session created after signup');
        } else {
          console.log('⚠️ No session after signup (email confirmation may be required)');
        }
      }
    } catch (err) {
      console.log('❌ Signup test error:', err.message);
    }
  }
  
  // Test 2: Sign In
  if (runAllTests || await askQuestion('Test login flow?')) {
    console.log('\n--- Testing Login Flow ---');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      
      if (error) {
        console.log('❌ Login failed:', error.message);
      } else {
        console.log('✅ Login successful!');
        accessToken = data.session.access_token;
      }
    } catch (err) {
      console.log('❌ Login test error:', err.message);
    }
  }
  
  // Test 3: Verify Session
  if ((runAllTests || await askQuestion('Test session verification?')) && accessToken) {
    console.log('\n--- Testing Session Verification ---');
    
    try {
      const { data, error } = await supabase.auth.getUser(accessToken);
      
      if (error) {
        console.log('❌ Session verification failed:', error.message);
      } else if (data.user) {
        console.log('✅ Session is valid!');
        console.log(`User ID: ${data.user.id}`);
        console.log(`Email: ${data.user.email}`);
      }
    } catch (err) {
      console.log('❌ Session verification error:', err.message);
    }
  }
  
  // Test 4: Access Protected API Route
  if ((runAllTests || await askQuestion('Test protected API access?')) && accessToken) {
    console.log('\n--- Testing Protected API Access ---');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/protected/user-profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Successfully accessed protected API route!');
        console.log('Response:', JSON.stringify(data, null, 2));
      } else {
        console.log(`❌ Failed to access protected API: ${response.status}`);
        const errorText = await response.text();
        console.log('Error:', errorText);
      }
    } catch (err) {
      console.log('❌ Protected API test error:', err.message);
    }
  }
  
  // Test 5: Logout
  if ((runAllTests || await askQuestion('Test logout flow?')) && accessToken) {
    console.log('\n--- Testing Logout Flow ---');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.log('❌ Logout failed:', error.message);
      } else {
        console.log('✅ Logout successful!');
        
        // Verify session is invalid after logout
        try {
          const { data, error } = await supabase.auth.getUser(accessToken);
          
          if (error) {
            console.log('✅ Session correctly invalidated after logout');
          } else if (data.user) {
            console.log('❌ Session still valid after logout');
          }
        } catch (err) {
          console.log('✅ Session correctly invalidated after logout');
        }
      }
    } catch (err) {
      console.log('❌ Logout test error:', err.message);
    }
  }
  
  console.log('\n=== Testing Complete ===');
  rl.close();
}

// Run the tests
runTests().catch(err => {
  console.error('Test suite failed:', err);
  rl.close();
}); 