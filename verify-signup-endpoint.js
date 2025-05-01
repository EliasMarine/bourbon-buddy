#!/usr/bin/env node

/**
 * This script tests the signup endpoint directly from Node.js
 * It uses node-fetch to send a POST request to the signup endpoint
 */

// Import node-fetch if running in Node.js environment
let fetch;
try {
  // Try native fetch (Node.js 18+)
  fetch = global.fetch;
} catch (e) {
  console.log('Native fetch not available, you may need to install node-fetch');
  console.log('Run: npm install node-fetch');
  process.exit(1);
}

// Helper function to make a fetch request with timeout
async function fetchWithTimeout(url, options, timeout = 30000) {
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

/**
 * Get CSRF token from the server
 */
async function getCsrfToken(baseUrl) {
  console.log('🔑 Fetching CSRF token...');
  
  try {
    // First request the login page to get a CSRF token
    const tokenUrl = `${baseUrl}/api/auth/csrf`;
    const response = await fetchWithTimeout(tokenUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SignupVerifier/1.0'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to get CSRF token: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.csrfToken) {
      console.error('❌ No CSRF token found in response');
      return null;
    }
    
    console.log(`✅ Got CSRF token: ${data.csrfToken.substring(0, 8)}...`);
    return data.csrfToken;
  } catch (error) {
    console.error('❌ Error fetching CSRF token:', error.message);
    return null;
  }
}

async function main() {
  // Check if production mode is specified
  const isProd = !process.argv.includes('--local');
  const baseUrl = isProd ? 'https://bourbonbuddy.live' : 'http://localhost:3000';
  
  if (isProd) {
    console.log('🌐 Running in PRODUCTION mode (targeting production API)');
    console.log('To test against local server, use --local flag');
  } else {
    console.log('🏠 Running in LOCAL mode (targeting localhost:3000)');
    console.log('Make sure your local development server is running');
  }
  
  // Get a CSRF token first
  const csrfToken = await getCsrfToken(baseUrl);
  
  // Test data - generate unique values to avoid conflicts
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);
  
  const testUser = {
    email: `test${timestamp}${randomNum}@example.com`,
    username: `testuser${randomNum}`,
    password: 'TestPassword123!',
    name: 'Test User'
  };
  
  console.log('\n🧪 Testing signup endpoint with test user:');
  console.log(`Email: ${testUser.email}`);
  console.log(`Username: ${testUser.username}`);
  console.log('Password: [REDACTED]');
  
  try {
    const url = `${baseUrl}/api/auth/signup`;
    
    console.log(`\n🔗 Making POST request to: ${url}`);
    
    // Log headers and body
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'SignupVerifier/1.0',
      'Accept': 'application/json' // Explicitly request JSON response
    };
    
    // Add CSRF token if available
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
      console.log('🔐 Using CSRF token in request');
    } else {
      console.log('⚠️ No CSRF token available - request may fail with 403 Forbidden');
    }
    
    console.log('📝 Request headers:', headers);
    console.log('📦 Request body:', { ...testUser, password: '[REDACTED]' });
    
    // Send the request
    console.log('\n⏳ Sending request...');
    const startTime = Date.now();
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(testUser),
      redirect: 'follow', // Follow any redirects
      credentials: 'include' // Include cookies
    });
    
    const endTime = Date.now();
    console.log(`⏱️ Request took ${endTime - startTime}ms`);
    
    // Get response data
    console.log(`\n📊 Response status: ${response.status} ${response.statusText}`);
    
    // Log all response headers
    console.log('\n📑 Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Get response body
    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      const text = await response.text();
      console.log('\n📄 Raw response body (first 500 chars):');
      console.log(text.substring(0, 500));
      if (text.length > 500) {
        console.log(`... (${text.length - 500} more characters)`);
      }
      
      // Try to parse as JSON
      try {
        responseData = JSON.parse(text);
        console.log('\n🔄 Parsed as JSON:', responseData);
      } catch (parseError) {
        console.log('\n❌ Could not parse response as JSON');
        if (text.includes('<html') || text.includes('<!DOCTYPE')) {
          console.log('⚠️ Response appears to be HTML, not JSON');
        }
      }
    } catch (readError) {
      console.error('\n❌ Error reading response body:', readError.message);
    }
    
    // Result summary
    if (response.ok) {
      console.log('\n✅ Test passed! Signup endpoint is working correctly.');
      
      if (responseData && responseData.user) {
        console.log(`👤 Created user with ID: ${responseData.user.id}`);
      }
    } else {
      console.log('\n❌ Test failed! Signup endpoint returned an error.');
      
      if (responseData && responseData.error) {
        console.log(`🔴 Error message: ${responseData.error}`);
      }
      
      // Specific handling for common errors
      if (response.status === 403) {
        console.log('🔑 This could be a CSRF protection issue - our token might be invalid or missing');
      } else if (response.status === 400) {
        console.log('📋 This could be a validation error - check the request body');
      } else if (response.status === 409) {
        console.log('👤 This could be a user already exists error');
      } else if (response.status === 500) {
        console.log('💥 This is a server error - check the server logs');
      }
    }
  } catch (error) {
    console.error('\n💥 Error during test:', error.message);
    if (error.name === 'AbortError') {
      console.error('⏱️ Request timed out');
    }
    
    console.error('\nDebug information:');
    console.error('- Node.js version:', process.version);
    console.error('- Platform:', process.platform);
    
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 