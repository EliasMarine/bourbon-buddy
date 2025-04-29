#!/usr/bin/env node

/**
 * This script simulates the client-side signup flow for debugging
 * It more accurately reproduces the flow that the browser Supabase client would use
 */

// These are required to use in Node.js
// npm install node-fetch@2 abort-controller

const fetch = require('node-fetch');
const AbortController = require('abort-controller');

async function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  // Generate unique user credentials
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  
  const testUser = {
    email: `test${timestamp}_${randomStr}@example.com`,
    password: 'TestPassword123!',
    username: `test_${randomStr}`,
    name: 'Test User'
  };
  
  console.log('🧪 Testing signup flow with:');
  console.log(`Email: ${testUser.email}`);
  console.log(`Username: ${testUser.username}`);
  console.log(`Password: ${testUser.password}`);
  
  // Check if testing against production or local
  const isProd = process.argv.includes('--prod');
  const baseUrl = isProd ? 'https://bourbonbuddy.live' : 'http://localhost:3000';
  
  console.log(`\n🌐 Testing against: ${baseUrl}`);
  
  try {
    // Step 1: Check if we need a CSRF token
    let csrfToken = '';
    try {
      console.log('🔑 Attempting to get CSRF token...');
      const csrfResponse = await fetchWithTimeout(`${baseUrl}/api/auth/csrf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken;
        console.log(`✅ Got CSRF token: ${csrfToken.substring(0, 8)}...`);
      } else {
        console.log('⚠️ Could not get CSRF token, continuing without it');
      }
    } catch (csrfError) {
      console.log('⚠️ Error fetching CSRF token:', csrfError.message);
    }
    
    // Step 2: Simulate the intercepted Supabase auth.signUp call
    console.log('\n📤 Sending signup request to:', `${baseUrl}/api/auth/signup`);
    
    // Create headers with CSRF token if available
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    // This structure matches how the Supabase client would format the request
    const supabaseBody = {
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          username: testUser.username,
          full_name: testUser.name,
          display_name: testUser.name || testUser.username
        },
        emailRedirectTo: `${baseUrl}/auth/callback`
      }
    };
    
    // Log what we're sending (without the full password)
    console.log('📦 Request payload:', JSON.stringify({
      ...supabaseBody,
      password: '********'
    }, null, 2));
    
    // Send the signup request
    const signupResponse = await fetchWithTimeout(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify(supabaseBody)
    });
    
    console.log(`\n📥 Response status: ${signupResponse.status} ${signupResponse.statusText}`);
    
    // Log response headers
    console.log('\n📋 Response headers:');
    signupResponse.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });
    
    // Parse and log the response body
    let responseBody;
    try {
      const text = await signupResponse.text();
      try {
        responseBody = JSON.parse(text);
        console.log('\n📄 Response body (JSON):', JSON.stringify(responseBody, null, 2));
      } catch (e) {
        console.log('\n📄 Response body (text):', text.substring(0, 500));
        if (text.length > 500) {
          console.log(`... (${text.length - 500} more characters)`);
        }
      }
    } catch (e) {
      console.log('❌ Error reading response:', e.message);
    }
    
    // Final status
    if (signupResponse.ok) {
      console.log('\n✅ Signup request successful!');
      if (responseBody?.user) {
        console.log(`📧 Confirmation email should be sent to: ${testUser.email}`);
        console.log(`👤 User ID: ${responseBody.user.id}`);
      }
    } else {
      console.log('\n❌ Signup request failed!');
      
      if (responseBody?.error) {
        console.log(`🔴 Error: ${responseBody.error}`);
      }
      
      if (signupResponse.status === 403) {
        console.log('💡 This might be a CSRF protection issue. Try running with --bypass-csrf');
      } else if (signupResponse.status === 409) {
        console.log('💡 This user might already exist. Try with a different email.');
      } else if (signupResponse.status === 400) {
        console.log('💡 This might be a validation issue. Check the request format.');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 