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
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

// Test credentials - REPLACE THESE WITH REAL TEST CREDENTIALS
const testEmail = 'test@example.com';
const testPassword = 'password';

// Console colors
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const reset = '\x1b[0m';

console.log(`${blue}======= SUPABASE DIRECT AUTH TEST =======\n${reset}`);

// Test directly against the Supabase API
async function testDirectAuth() {
  console.log(`${yellow}Testing direct auth with password grant using fetch API...${reset}\n`);
  
  console.log(`URL: ${supabaseUrl?.substring(0, 20)}...`);
  console.log(`API Key: ${supabaseAnonKey?.substring(0, 10)}...\n`);
  
  try {
    // Make direct API call to Supabase Auth
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'X-Client-Info': 'test-script'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const data = await response.json();
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`${red}Auth failed: ${data.error || 'Unknown error'}${reset}`);
      console.log(`Error description: ${data.error_description || 'No description'}`);
      
      if (response.status === 400 && data.error === 'invalid_grant') {
        console.log(`${yellow}This usually means invalid credentials (wrong email/password)${reset}`);
      } else if (response.status === 401) {
        console.log(`${yellow}This usually means invalid API key${reset}`);
      }
      
      return false;
    }
    
    console.log(`${green}Auth successful!${reset}`);
    console.log(`User UUID: ${data.user?.id || 'unknown'}`);
    console.log(`Access token received: ${data.access_token?.substring(0, 15)}...`);
    return true;
  } catch (error) {
    console.log(`${red}Error making request: ${error.message}${reset}`);
    return false;
  }
}

// Test if the user even exists
async function checkUserExists() {
  if (!serviceRoleKey) {
    console.log(`${yellow}No service role key found - can't check if user exists${reset}`);
    return 'unknown';
  }
  
  console.log(`${yellow}Checking if test user exists using service role...${reset}\n`);
  
  try {
    // Make direct API call to Supabase Auth
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=email eq "${testEmail}"`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`${red}Failed to check user: ${data.error || 'Unknown error'}${reset}`);
      return 'error';
    }
    
    if (data.users && data.users.length > 0) {
      console.log(`${green}User exists!${reset}`);
      console.log(`Email: ${data.users[0].email}`);
      console.log(`User ID: ${data.users[0].id}`);
      console.log(`Email confirmed: ${data.users[0].email_confirmed_at ? 'Yes' : 'No'}`);
      return 'exists';
    } else {
      console.log(`${red}User does not exist with email ${testEmail}${reset}`);
      return 'not_found';
    }
  } catch (error) {
    console.log(`${red}Error checking user: ${error.message}${reset}`);
    return 'error';
  }
}

// Run the tests
async function runAllTests() {
  const userStatus = await checkUserExists();
  
  if (userStatus === 'not_found') {
    console.log(`\n${yellow}Cannot test auth as user doesn't exist${reset}`);
    console.log(`Try creating a user with these credentials first`);
    return;
  }
  
  if (userStatus === 'unknown' || userStatus === 'error') {
    console.log(`\n${yellow}Proceeding with auth test anyway...${reset}`);
  }
  
  console.log(''); // Empty line
  const authResult = await testDirectAuth();
  
  console.log(`\n${blue}======= TEST SUMMARY =======\n${reset}`);
  console.log(`User exists check: ${userStatus === 'exists' ? green + 'PASS' : (userStatus === 'not_found' ? red + 'FAIL' : yellow + 'UNKNOWN')}`);
  console.log(`Direct auth test: ${authResult ? green + 'PASS' : red + 'FAIL'}${reset}`);
  
  if (!authResult) {
    console.log(`\n${yellow}Suggestions:${reset}`);
    console.log(`1. Check if your credentials are correct`);
    console.log(`2. Verify your API key is valid`);
    console.log(`3. Check if the user's email is confirmed`);
    console.log(`4. Ensure password auth is enabled for your project`);
  }
}

runAllTests(); 