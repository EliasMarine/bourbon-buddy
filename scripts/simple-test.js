import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local file manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};

// Parse .env file content
envFile.split('\n').forEach(line => {
  const parts = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (parts) {
    const key = parts[1];
    let value = parts[2] || '';
    // Remove quotes if present
    value = value.replace(/^["'](.*)["']$/, '$1');
    envVars[key] = value;
  }
});

// Get Supabase credentials
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('======= SUPABASE CONNECTION TEST =======');
console.log('Supabase URL:', supabaseUrl?.substring(0, 20) + '...');
console.log('Anon Key first 10 chars:', supabaseAnonKey?.substring(0, 10) + '...');

// Decode JWT to check format and expiration
function decodeJwt(token) {
  try {
    if (!token || token.split('.').length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }
    
    // Decode payload
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    
    const now = Math.floor(Date.now() / 1000);
    return {
      valid: true,
      payload,
      isExpired: payload.exp && payload.exp < now,
      role: payload.role || '(no role)',
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'never'
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Check JWT format
const jwtInfo = decodeJwt(supabaseAnonKey);
if (jwtInfo.valid) {
  console.log('JWT is valid');
  console.log('Role:', jwtInfo.role);
  console.log('Expires:', jwtInfo.expiresAt);
  console.log('Is expired:', jwtInfo.isExpired ? 'YES - KEY EXPIRED!' : 'No');
  
  // Additional info
  if (jwtInfo.payload.ref) {
    console.log('Project ref:', jwtInfo.payload.ref);
    // Check if URL contains project ref
    if (supabaseUrl && supabaseUrl.includes(jwtInfo.payload.ref)) {
      console.log('✅ URL contains correct project ref');
    } else {
      console.log('❌ URL does not contain project ref - MISMATCH!');
    }
  }
} else {
  console.log('❌ Invalid JWT format:', jwtInfo.error);
}

// Create Supabase client
console.log('\nTrying to connect to Supabase...');
try {
  // Create client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test auth endpoint
  const authTest = await supabase.auth.getSession();
  if (authTest.error) {
    console.log('❌ Auth endpoint test failed:', authTest.error.message);
  } else {
    console.log('✅ Auth endpoint test passed!');
  }
  
  // Test direct API endpoint
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`);
    if (response.status === 401) {
      console.log('✅ Direct API test passed with expected 401 response');
    } else {
      console.log(`Direct API test got unexpected status: ${response.status}`);
    }
  } catch (fetchError) {
    console.log('❌ Direct API test failed:', fetchError.message);
  }
  
} catch (error) {
  console.log('❌ Failed to create Supabase client:', error.message);
}

console.log('\n======= TEST COMPLETE ======='); 