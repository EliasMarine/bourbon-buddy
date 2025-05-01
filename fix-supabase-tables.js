// Supabase Table Inspection & Fix Utility
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials. Check your .env.local file');
  process.exit(1);
}

console.log('=== SUPABASE TABLE INSPECTOR ===');
console.log('Supabase URL:', supabaseUrl);

// Create service client (has highest permissions)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Additional table names to test
const tablesToTest = [
  'profiles', 
  'streams',
  'videos',
  'Video',
  'video', 
  'users', 
  'auth',
  'products',
  'spirits'
];

// Helper to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Check if a schema exists
async function listSchemas() {
  try {
    console.log('\nQuerying available schemas...');
    
    const { data, error } = await supabase.rpc('get_schemas');
    
    if (error) {
      console.log('❌ Could not query schemas:', error.message);
      return [];
    }
    
    if (data && data.length > 0) {
      console.log('✅ Found schemas:', data.join(', '));
      return data;
    }
    
    return [];
  } catch (error) {
    console.log('Error testing schemas:', error.message);
    return [];
  }
}

// List tables in a schema
async function listTablesInSchema(schema = 'public') {
  try {
    console.log(`\nListing tables in schema: ${schema}`);
    
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', schema);
    
    if (error) {
      console.log(`❌ Could not list tables in schema ${schema}:`, error.message);
      
      // Try alternative method using PostgreSQL functions
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_tables');
        
        if (rpcError) {
          console.log('❌ RPC method also failed:', rpcError.message);
          return [];
        }
        
        if (rpcData && rpcData.length > 0) {
          console.log(`✅ Found ${rpcData.length} tables using RPC method`);
          return rpcData;
        }
        
        return [];
      } catch (rpcErr) {
        console.log('Error in RPC fallback:', rpcErr.message);
        return [];
      }
    }
    
    if (data && data.length > 0) {
      const tableNames = data.map(t => t.table_name);
      console.log(`✅ Found ${tableNames.length} tables:`, tableNames.join(', '));
      return tableNames;
    }
    
    return [];
  } catch (error) {
    console.log('Error listing tables:', error.message);
    return [];
  }
}

// Test access to a specific table
async function testTableAccess(tableName) {
  try {
    console.log(`\nTesting access to table: ${tableName}`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error accessing table ${tableName}:`, error.message);
      return false;
    }
    
    console.log(`✅ Successfully accessed table ${tableName}`);
    console.log(`   Row count:`, data.length);
    
    if (data.length > 0) {
      console.log(`   Sample data:`, JSON.stringify(data[0]).substring(0, 100) + '...');
      console.log(`   Columns:`, Object.keys(data[0]).join(', '));
    }
    
    return true;
  } catch (error) {
    console.log(`Error testing table ${tableName}:`, error);
    return false;
  }
}

// Check table permissions
async function checkTablePermissions(tableName) {
  try {
    console.log(`\nChecking permissions for table: ${tableName}`);
    
    const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: tableName });
    
    if (error) {
      console.log(`❌ Could not check permissions for ${tableName}:`, error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} policies for table ${tableName}:`);
      data.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.permissive} for ${policy.operation} operations`);
        console.log(`     Using expression: ${policy.using_expr || 'N/A'}`);
      });
    } else {
      console.log(`⚠️ No RLS policies found for table ${tableName}. This might cause access issues.`);
    }
  } catch (error) {
    console.log(`Error checking permissions:`, error.message);
  }
}

// Create a test table to verify database functionality
async function createTestTable() {
  try {
    console.log('\nAttempting to create a test table "supabase_test_table"...');
    
    // First check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'supabase_test_table');
    
    if (checkError) {
      console.log('❌ Could not check if test table exists:', checkError.message);
    } else if (existingTable && existingTable.length > 0) {
      console.log('✅ Test table already exists, skipping creation');
      return true;
    }
    
    // Create the test table using SQL
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.supabase_test_table (
          id SERIAL PRIMARY KEY,
          name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create a permissive policy
        DROP POLICY IF EXISTS "Allow all access" ON public.supabase_test_table;
        CREATE POLICY "Allow all access" ON public.supabase_test_table
          USING (true)
          WITH CHECK (true);
        
        -- Enable RLS but with a permissive policy
        ALTER TABLE public.supabase_test_table ENABLE ROW LEVEL SECURITY;
        
        -- Insert a test row
        INSERT INTO public.supabase_test_table (name) VALUES ('Test row');
      `
    });
    
    if (error) {
      console.log('❌ Failed to create test table:', error.message);
      return false;
    }
    
    console.log('✅ Test table created successfully');
    
    // Verify we can access the table
    await delay(1000); // Give it a moment to be available
    
    const { data, error: accessError } = await supabase
      .from('supabase_test_table')
      .select('*');
    
    if (accessError) {
      console.log('❌ Could not access the test table:', accessError.message);
      return false;
    }
    
    console.log('✅ Successfully accessed test table');
    console.log('   Found rows:', data.length);
    
    return true;
  } catch (error) {
    console.log('Error creating test table:', error.message);
    return false;
  }
}

// Test an anonymous client (using anon key)
async function testAnonymousClient() {
  try {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!anonKey) {
      console.log('❌ Anonymous key not found in environment variables');
      return;
    }
    
    console.log('\n--- Testing Anonymous Client ---');
    
    const anonClient = createClient(supabaseUrl, anonKey);
    
    // Test anonymous access to test table
    const { data, error } = await anonClient
      .from('supabase_test_table')
      .select('*');
    
    if (error) {
      console.log('❌ Anonymous client cannot access test table:', error.message);
      
      if (error.message.includes('permission denied')) {
        console.log('⚠️ This appears to be an RLS (Row Level Security) issue.');
        console.log('   Anonymous users need explicit permissions to access tables.');
      }
    } else {
      console.log('✅ Anonymous client can access test table');
      console.log('   Found rows:', data.length);
    }
  } catch (error) {
    console.log('Error testing anonymous client:', error.message);
  }
}

// Main function
async function main() {
  try {
    console.log('Testing service client connection...');
    
    // Verify we can access any API
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('\n❌ CRITICAL ERROR: Cannot connect to Supabase API');
      console.error('  Error:', userError.message);
      console.error('\nPlease check:');
      console.error('1. Your Supabase URL and service key are correct');
      console.error('2. Your Supabase project is online and not in maintenance mode');
      console.error('3. Your network connection to Supabase servers is working');
      return;
    }
    
    console.log('✅ Successfully connected to Supabase API');
    
    // List schemas
    const schemas = await listSchemas();
    
    // List tables in public schema
    const tables = await listTablesInSchema('public');
    
    // Test access to tables we found
    if (tables.length > 0) {
      for (const table of tables.slice(0, 5)) { // Test up to 5 tables
        await testTableAccess(table);
        await checkTablePermissions(table);
      }
    } else {
      console.log('\n⚠️ No tables found in public schema, testing additional table names...');
      
      // Test some common table names
      for (const table of tablesToTest) {
        const success = await testTableAccess(table);
        if (success) {
          await checkTablePermissions(table);
        }
      }
    }
    
    // Create a test table as a last resort
    if (tables.length === 0 || !tables.some(t => t === 'supabase_test_table')) {
      console.log('\n⚠️ Testing database functionality by creating a test table...');
      await createTestTable();
    }
    
    // Test anonymous client
    await testAnonymousClient();
    
    // Summary
    console.log('\n=== SUMMARY ===');
    
    if (tables.length > 0) {
      console.log(`✅ Database contains ${tables.length} tables`);
      console.log('   Available tables:', tables.join(', '));
    } else {
      console.log('⚠️ No tables found in the public schema');
    }
    
    console.log('\n=== RECOMMENDATIONS ===');
    
    if (tables.length === 0) {
      console.log(`
1. Your database appears to be empty or inaccessible. Consider:
   - Checking for tables in other schemas besides 'public'
   - Creating tables you need for your application
   - Verifying your service role has the correct permissions
   - Checking if your database was initialized correctly
`);
    } else {
      console.log(`
1. Use this code pattern to access your tables with the Supabase client:

   // Server components (SSR/API)
   import { createClient } from '@/utils/supabase/server'
   
   export default async function Component() {
     const supabase = await createClient()
     const { data, error } = await supabase
       .from('${tables[0]}')
       .select('*')
     
     // Handle the result
   }
   
   // Client components
   import { createClient } from '@/utils/supabase/client'
   
   export default function Component() {
     const supabase = createClient()
     
     // Use supabase client in effects or event handlers
   }
`);
    }
    
    console.log(`
2. For Row Level Security (RLS):
   - Ensure each table has appropriate RLS policies
   - For tables that should be public, use: CREATE POLICY "Public access" ON table_name USING (true);
   - For tables that should be restricted to authenticated users: USING (auth.uid() IS NOT NULL);
   - For user-specific data: USING (auth.uid() = user_id);
`);

    console.log(`
3. For direct PostgreSQL connections:
   - Always use SSL config: { ssl: { rejectUnauthorized: false } }
   - Example:
     const pool = new Pool({
       connectionString: process.env.DATABASE_URL,
       ssl: { rejectUnauthorized: false }
     });
`);
    
  } catch (error) {
    console.error('Fatal error during execution:', error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
}); 