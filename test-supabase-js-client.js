// Supabase JavaScript Client Test
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Print configuration without showing full keys
console.log('=== SUPABASE JAVASCRIPT CLIENT TEST ===');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 5)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 5)}` : 'Not set');
console.log('Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 5)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 5)}` : 'Not set');

// Create clients
const anonClient = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const serviceClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Commonly found tables in Supabase
const commonTables = [
  'users', 
  'profiles', 
  'posts', 
  'todos', 
  'products', 
  'items', 
  'customers', 
  'orders',
  'bookmarks',
  'comments',
  'categories'
];

// Test anonymous auth
async function testAnonymousAuth() {
  console.log('\n--- Testing Anonymous Authentication ---');
  
  if (!anonClient) {
    console.log('❌ Anonymous client not available - missing anon key');
    return false;
  }
  
  try {
    console.log('Testing auth.getSession()...');
    const { data, error } = await anonClient.auth.getSession();
    
    if (error) {
      console.log(`❌ Error fetching session: ${error.message}`);
      return false;
    }
    
    console.log('✅ Successfully fetched session state');
    console.log(`   Has active session: ${data.session ? 'Yes' : 'No'}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Unexpected error in auth.getSession(): ${error.message}`);
    return false;
  }
}

// Test signing up an anonymous user
async function testSignUp() {
  console.log('\n--- Testing Sign Up (Email + Password) ---');
  
  if (!anonClient) {
    console.log('❌ Anonymous client not available - missing anon key');
    return false;
  }
  
  try {
    // Generate a random test email
    const randomEmail = `test-${Math.random().toString(36).substring(2, 10)}@example.com`;
    const password = 'Password123!';
    
    console.log(`Attempting to sign up with email: ${randomEmail}`);
    const { data, error } = await anonClient.auth.signUp({
      email: randomEmail,
      password,
    });
    
    if (error) {
      console.log(`❌ Sign up error: ${error.message}`);
      
      if (error.message.includes('disabled') || error.message.includes('not enabled')) {
        console.log('   ℹ️ Email auth might be disabled in this project');
      }
      
      return false;
    }
    
    console.log('✅ Sign up successful');
    console.log(`   User ID: ${data.user?.id || 'Not available'}`);
    console.log(`   Email confirmation required: ${data.session ? 'No' : 'Yes'}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Unexpected error in signUp: ${error.message}`);
    return false;
  } finally {
    // Sign out after test
    try {
      await anonClient.auth.signOut();
    } catch (e) {}
  }
}

// Test service role operations
async function testServiceRole() {
  console.log('\n--- Testing Service Role Operations ---');
  
  if (!serviceClient) {
    console.log('❌ Service role client not available - missing service key');
    return false;
  }
  
  try {
    // 1. Test fetching users via admin API
    console.log('Testing admin user operations...');
    
    const { data: adminData, error: adminError } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (adminError) {
      console.log(`❌ Error fetching users: ${adminError.message}`);
    } else {
      console.log(`✅ Successfully fetched users`);
      console.log(`   Total users: ${adminData.users.length > 0 ? adminData.total : 'None found'}`);
    }
    
    return adminError ? false : true;
  } catch (error) {
    console.log(`❌ Unexpected error in service role test: ${error.message}`);
    return false;
  }
}

// Test database operations
async function testDatabase(client, label) {
  console.log(`\n--- Testing Database Operations (${label}) ---`);
  
  if (!client) {
    console.log(`❌ ${label} client not available`);
    return { success: false };
  }
  
  const discoveredTables = [];
  let foundWorkingTable = false;
  let tableSample = null;
  
  // First try to discover tables
  try {
    console.log('Discovering available tables...');
    
    // Try to list tables using system table (requires elevated privileges)
    if (label === 'Service Role') {
      try {
        const { data, error } = await client.rpc('get_tables_info');
        
        if (!error && data && data.length > 0) {
          discoveredTables.push(...data.map(t => t.table_name || t.name));
          console.log(`✅ Found ${discoveredTables.length} tables via RPC`);
        }
      } catch (e) {
        console.log('Could not discover tables via RPC');
      }
    }
    
    // If we couldn't discover using system tables, try common table names
    if (discoveredTables.length === 0) {
      console.log('Testing common table names...');
      
      for (const table of commonTables) {
        try {
          const { data, error } = await client
            .from(table)
            .select('*')
            .limit(1);
          
          if (!error) {
            discoveredTables.push(table);
            
            if (!foundWorkingTable) {
              foundWorkingTable = true;
              tableSample = { table, count: data.length, sample: data };
            }
            
            console.log(`✅ Table '${table}' exists`);
          }
        } catch (e) {
          // Ignore errors when testing tables
        }
      }
    }
    
    // Try first discovered table in more detail if found
    if (discoveredTables.length > 0 && !tableSample) {
      const firstTable = discoveredTables[0];
      
      try {
        const { data, error } = await client
          .from(firstTable)
          .select('*')
          .limit(5);
        
        if (!error) {
          foundWorkingTable = true;
          tableSample = { table: firstTable, count: data.length, sample: data };
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Report results
    if (discoveredTables.length > 0) {
      console.log(`✅ Found ${discoveredTables.length} accessible tables: ${discoveredTables.join(', ')}`);
      
      if (tableSample) {
        console.log(`✅ Successfully queried '${tableSample.table}' table`);
        console.log(`   Row count: ${tableSample.count}`);
        
        if (tableSample.count > 0) {
          console.log(`   Sample data: ${JSON.stringify(tableSample.sample[0]).substring(0, 100)}...`);
          
          // Also show column names
          const columns = Object.keys(tableSample.sample[0]);
          console.log(`   Columns: ${columns.join(', ')}`);
        }
      }
      
      return { 
        success: true, 
        tables: discoveredTables,
        sampleTable: tableSample?.table
      };
    } else {
      console.log('❌ No tables found or accessible');
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ Error testing database: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test storage operations
async function testStorage(client, label) {
  console.log(`\n--- Testing Storage (${label}) ---`);
  
  if (!client) {
    console.log(`❌ ${label} client not available`);
    return false;
  }
  
  try {
    console.log('Listing storage buckets...');
    const { data: buckets, error } = await client.storage.listBuckets();
    
    if (error) {
      console.log(`❌ Error listing buckets: ${error.message}`);
      return false;
    }
    
    if (buckets.length === 0) {
      console.log('ℹ️ No storage buckets found');
    } else {
      console.log(`✅ Found ${buckets.length} storage ${buckets.length === 1 ? 'bucket' : 'buckets'}`);
      console.log(`   Bucket names: ${buckets.map(b => b.name).join(', ')}`);
      
      // Try to list files in first bucket
      if (buckets.length > 0) {
        const firstBucket = buckets[0].name;
        console.log(`Testing list files in bucket '${firstBucket}'...`);
        
        const { data: files, error: filesError } = await client.storage
          .from(firstBucket)
          .list();
          
        if (filesError) {
          console.log(`❌ Error listing files: ${filesError.message}`);
        } else {
          console.log(`✅ File listing successful`);
          console.log(`   Files in bucket: ${files.length}`);
          
          if (files.length > 0) {
            console.log(`   Sample file: ${files[0].name}`);
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Unexpected error in storage test: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  const results = {
    auth: {
      anonymous: false,
      signup: false,
      serviceRole: false
    },
    database: {
      anonymous: { success: false },
      serviceRole: { success: false }
    },
    storage: {
      anonymous: false,
      serviceRole: false
    }
  };
  
  // Test authentication
  results.auth.anonymous = await testAnonymousAuth();
  results.auth.signup = await testSignUp();
  results.auth.serviceRole = await testServiceRole();
  
  // Test database
  results.database.anonymous = await testDatabase(anonClient, 'Anonymous');
  results.database.serviceRole = await testDatabase(serviceClient, 'Service Role');
  
  // Test storage
  results.storage.anonymous = await testStorage(anonClient, 'Anonymous');
  results.storage.serviceRole = await testStorage(serviceClient, 'Service Role');
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===');
  console.log('Authentication:');
  console.log(`  Anonymous Auth: ${results.auth.anonymous ? '✓' : '✗'}`);
  console.log(`  Sign Up: ${results.auth.signup ? '✓' : '✗'}`);
  console.log(`  Service Role Admin: ${results.auth.serviceRole ? '✓' : '✗'}`);
  
  console.log('Database:');
  console.log(`  Anonymous Access: ${results.database.anonymous.success ? '✓' : '✗'}`);
  console.log(`  Service Role Access: ${results.database.serviceRole.success ? '✓' : '✗'}`);
  
  console.log('Storage:');
  console.log(`  Anonymous Access: ${results.storage.anonymous ? '✓' : '✗'}`);
  console.log(`  Service Role Access: ${results.storage.serviceRole ? '✓' : '✗'}`);
  
  // Provide implementation example based on what's working
  console.log('\n=== RECOMMENDATIONS ===');
  
  if (results.database.serviceRole.success) {
    console.log('\n✨ Service Role Database Access is Working!');
    console.log('For server-side database operations, use:');
    
    console.log(`
// In server-side code (Next.js API routes, Server Actions, etc.)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Query example for table '${results.database.serviceRole.sampleTable || 'your_table'}'
const { data, error } = await supabase
  .from('${results.database.serviceRole.sampleTable || 'your_table'}')
  .select('*')
  .limit(10)
    `);
  }
  
  if (results.database.anonymous.success) {
    console.log('\n✨ Anonymous Database Access is Working!');
    console.log('For client-side database operations, use:');
    
    console.log(`
// In client components (with 'use client')
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// In client component
const supabase = createClientComponentClient()

// Query example for table '${results.database.anonymous.sampleTable || 'your_table'}'
const { data, error } = await supabase
  .from('${results.database.anonymous.sampleTable || 'your_table'}')
  .select('*')
  .limit(10)
    `);
  }
  
  if (results.auth.anonymous) {
    console.log('\n✨ Authentication is Working!');
    console.log('For authentication in client components:');
    
    console.log(`
// Sign in
const { error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Sign out
await supabase.auth.signOut()
    `);
  }
  
  if (!results.database.anonymous.success && !results.database.serviceRole.success) {
    console.log('\n❌ Database access is not working with either client.');
    console.log('Possible issues:');
    console.log('1. Ensure your Supabase project is active');
    console.log('2. Check that your keys have the correct permissions');
    console.log('3. Verify Row Level Security (RLS) policies are configured correctly');
    console.log('4. Make sure the database has tables with appropriate data');
  }
}

// Run the main function
main()
  .catch(error => {
    console.error('Fatal error:', error);
  })
  .finally(() => {
    console.log('\nTest completed');
  }); 