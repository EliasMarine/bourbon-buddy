// Test Supabase Authentication and Signup
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Get credentials from environment
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create client - this simulates what happens in the browser
const supabase = createClient(url, anonKey);

// Interactive prompt
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test authentication by signing up a test user
async function testSignUp(email, password) {
  console.log(`\nTesting signup with email: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Signup failed:', error.message);
      return false;
    }
    
    console.log('✅ Signup successful!');
    console.log('User ID:', data.user.id);
    console.log('Email confirmation required:', data.session ? 'No' : 'Yes');
    
    if (data.session) {
      console.log('Session established - user is logged in');
    } else {
      console.log('User created but needs to confirm email before logging in');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during signup:', error.message);
    return false;
  }
}

// Check if a user exists by email
async function checkUserExists(email) {
  console.log(`\nChecking if user exists: ${email}`);
  
  try {
    // Try to sign in with invalid credentials (to check if user exists)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'invalid-password-to-check-existence'
    });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        console.log('✅ User exists but password is incorrect (as expected)');
        return true;
      } else if (error.message.includes('Email not confirmed')) {
        console.log('✅ User exists but email is not confirmed');
        return true;
      } else if (error.message.toLowerCase().includes('user not found')) {
        console.log('❌ User does not exist');
        return false;
      } else {
        console.log('⚠️ Unexpected error, cannot determine if user exists:', error.message);
        return null;
      }
    }
    
    // Should not reach here with invalid password
    console.log('⚠️ Unexpected successful login with invalid password');
    return true;
  } catch (error) {
    console.error('❌ Error checking user existence:', error.message);
    return null;
  }
}

// Test a login
async function testLogin(email, password) {
  console.log(`\nTesting login with: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
    
    console.log('✅ Login successful!');
    console.log('User:', data.user.email);
    console.log('Session established:', !!data.session);
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error during login:', error.message);
    return false;
  }
}

// Test connection to Supabase API
async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connected to Supabase Auth API successfully');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

// Generate a random test email
function generateTestEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${random}-${timestamp}@example.com`;
}

// Main function
async function main() {
  console.log('=== SUPABASE AUTH TEST ===');
  console.log('URL:', url);
  console.log('Testing connection to Supabase...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('\n❌ Cannot connect to Supabase. Please check your credentials.');
    rl.close();
    return;
  }
  
  console.log('\n=== AUTH TEST OPTIONS ===');
  console.log('1. Test signup with randomly generated email');
  console.log('2. Test signup with specific email');
  console.log('3. Test login with existing account');
  console.log('4. Check if a user exists');
  console.log('5. Quit');
  
  rl.question('\nChoose an option (1-5): ', async (answer) => {
    switch (answer.trim()) {
      case '1':
        const testEmail = generateTestEmail();
        const testPassword = 'Test123!@#';
        
        console.log('\nUsing test credentials:');
        console.log('Email:', testEmail);
        console.log('Password:', testPassword);
        
        await testSignUp(testEmail, testPassword);
        rl.close();
        break;
        
      case '2':
        rl.question('\nEnter email to use for signup: ', (email) => {
          rl.question('Enter password (min 6 chars): ', async (password) => {
            await testSignUp(email, password);
            rl.close();
          });
        });
        break;
        
      case '3':
        rl.question('\nEnter email: ', (email) => {
          rl.question('Enter password: ', async (password) => {
            await testLogin(email, password);
            rl.close();
          });
        });
        break;
        
      case '4':
        rl.question('\nEnter email to check: ', async (email) => {
          await checkUserExists(email);
          rl.close();
        });
        break;
        
      case '5':
      default:
        console.log('Exiting...');
        rl.close();
    }
  });
}

// Run main function
main(); 