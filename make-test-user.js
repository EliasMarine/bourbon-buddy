#!/usr/bin/env node

/**
 * This script creates a test user directly in Supabase through the admin API
 * This bypasses the normal signup flow for testing purposes
 * 
 * ⚠️ ONLY USE IN DEVELOPMENT ENVIRONMENTS ⚠️
 */

const localTest = process.argv.includes('--local');
if (!localTest) {
  console.error('❌ This script should only be run with --local flag');
  console.error('Example: node make-test-user.js --local');
  process.exit(1);
}

// Try to load dotenv for local environment variables
try {
  require('dotenv').config();
} catch (error) {
  // dotenv is probably not installed, which is okay
}

// Generate a random email and password
const randomEmail = `test${Date.now()}_${Math.random().toString(36).substring(2, 8)}@example.com`;
const randomUsername = `test_${Math.random().toString(36).substring(2, 8)}`;
const password = 'TestPassword123!';

console.log('🚀 Creating test user in local development environment');
console.log('Email:', randomEmail);
console.log('Username:', randomUsername);
console.log('Password:', password);

// Generate a test URL for the login page
const loginUrl = `http://localhost:3000/login?email=${encodeURIComponent(randomEmail)}&password=${encodeURIComponent(password)}`;

// Print instructions for manual testing
console.log('\n1. Please start your local development server (npm run dev)');
console.log('2. Direct signup should work from the UI with this test user');
console.log('3. Or you can try to signup with this user directly through the UI');
console.log('\nYou can login directly with this URL:');
console.log(loginUrl);

// Provide a curl command for API testing
console.log('\nOr test with curl:');
console.log(`curl -v -X POST -H "Content-Type: application/json" -d '{"email":"${randomEmail}","password":"${password}","username":"${randomUsername}"}' http://localhost:3000/api/auth/signup`);

console.log('\n✅ Script completed successfully'); 