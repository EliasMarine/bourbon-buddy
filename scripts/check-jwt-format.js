import { config } from 'dotenv';
import { Buffer } from 'buffer';

config({ path: '.env.local' });

function parseJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Not a valid JWT format (should have 3 parts)' };
    }
    
    // Parse header
    const headerStr = Buffer.from(parts[0], 'base64').toString();
    const header = JSON.parse(headerStr);
    
    // Parse payload
    const payloadStr = Buffer.from(parts[1], 'base64').toString();
    const payload = JSON.parse(payloadStr);
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp && payload.exp < now;
    
    return {
      valid: true,
      header,
      payload,
      isExpired,
      expiresIn: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration',
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'No issue date',
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Main function
function checkAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!anonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local');
    return;
  }
  
  console.log('Checking NEXT_PUBLIC_SUPABASE_ANON_KEY format...');
  console.log('-'.repeat(50));
  
  const result = parseJWT(anonKey);
  
  if (!result.valid) {
    console.error(`❌ Invalid JWT format: ${result.error}`);
    console.log('\nMake sure your Supabase anon key is a valid JWT token.');
    console.log('You can find this in your Supabase dashboard under Project Settings > API.');
    return;
  }
  
  console.log('✅ Valid JWT format');
  
  if (result.isExpired) {
    console.error('❌ JWT has EXPIRED!');
    console.log(`   Expired at: ${result.expiresIn}`);
  } else {
    console.log(`✅ JWT is valid until: ${result.expiresIn}`);
  }
  
  console.log(`✅ JWT was issued at: ${result.issuedAt}`);
  console.log('-'.repeat(50));
  
  // Check header
  console.log('JWT Header:');
  console.log(result.header);
  console.log('-'.repeat(50));
  
  // Check payload
  console.log('JWT Payload:');
  console.log(result.payload);
  console.log('-'.repeat(50));
  
  // Specific checks for Supabase
  if (result.payload.role === 'anon') {
    console.log('✅ Token has the correct "anon" role');
  } else if (result.payload.role === 'service_role') {
    console.error('❌ You are using a service_role key instead of an anon key!');
    console.log('   This is NOT recommended for client-side use. Use the anon key instead.');
  } else {
    console.error(`❓ Unexpected role in token: "${result.payload.role}"`);
  }
  
  if (result.payload.iss === 'supabase') {
    console.log('✅ Token is issued by Supabase');
  } else {
    console.error(`❓ Token issuer is not Supabase: "${result.payload.iss}"`);
  }
  
  // Check for "ref" field which should be the project reference
  if (result.payload.ref) {
    console.log(`✅ Project reference: ${result.payload.ref}`);
    
    // Check if URL matches the project reference
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && supabaseUrl.includes(result.payload.ref)) {
      console.log('✅ URL and token project reference match!');
    } else {
      console.error('❌ URL and token project reference DO NOT match!');
      console.log(`   URL: ${supabaseUrl}`);
      console.log(`   Token project: ${result.payload.ref}`);
    }
  } else {
    console.error('❓ No project reference in token');
  }
}

// Run the check
checkAnonKey(); 