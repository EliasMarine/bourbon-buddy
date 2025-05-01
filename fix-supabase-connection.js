// Fix Supabase Connection SSL Issues
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;
const directDbUrl = process.env.DIRECT_DATABASE_URL;

console.log('=== SUPABASE CONNECTION FIX UTILITY ===');
console.log('Supabase URL:', supabaseUrl);
console.log('DB URL:', dbUrl ? `${dbUrl.substring(0, 25)}...` : 'Not set');

// Function to try different connection configurations
async function testConnection(connectionString, description) {
  console.log(`\n--- Testing ${description} ---`);
  console.log(`Connection string starts with: ${connectionString.substring(0, 25)}...`);
  
  // Options to try
  const sslOptions = [
    { name: "Default (no SSL override)", ssl: undefined },
    { name: "SSL Required", ssl: true },
    { name: "SSL Required + Reject Unauthorized = false", ssl: { rejectUnauthorized: false } },
    { name: "SSL Disabled", ssl: false }
  ];
  
  let overallSuccess = false;
  
  for (const sslOption of sslOptions) {
    let client;
    try {
      console.log(`\nAttempting connection with: ${sslOption.name}`);
      
      const pool = new Pool({ 
        connectionString,
        ssl: sslOption.ssl
      });
      
      // Set a short timeout to not hang forever
      pool.options.connectionTimeoutMillis = 10000;
      
      client = await pool.connect();
      console.log('✅ Connection successful!');
      
      // Test with a simple query
      const result = await client.query('SELECT NOW() as server_time');
      console.log(`✅ Query successful - Server time: ${result.rows[0].server_time}`);
      
      // Get more connection details
      const { rows: connInfo } = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          inet_server_addr() as server_ip,
          inet_server_port() as server_port,
          version() as pg_version
      `);
      
      console.log('Connection Details:');
      console.log(JSON.stringify(connInfo[0], null, 2));
      
      // Test if we can see tables
      try {
        const { rows: tables } = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          LIMIT 5
        `);
        
        if (tables.length > 0) {
          console.log(`Tables found: ${tables.map(t => t.table_name).join(', ')}`);
        } else {
          console.log('No tables found in the public schema.');
        }
      } catch (tableError) {
        console.log(`Failed to query tables: ${tableError.message}`);
      }
      
      overallSuccess = true;
      
      // Return the successful configuration
      return {
        successful: true,
        sslConfig: sslOption,
        fixedConnectionString: connectionString
      };
    } catch (error) {
      console.error(`❌ Connection failed with ${sslOption.name}: ${error.message}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  return { 
    successful: overallSuccess,
    error: 'All connection attempts failed'
  };
}

// Function to verify if sslmode is properly set in connection string
function verifyConnectionString(connString) {
  if (!connString) return connString;
  
  // Parse connection string
  try {
    const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(\?.*)?/;
    const matches = connString.match(regex);
    
    if (!matches) {
      console.log('⚠️ Could not parse connection string format');
      return connString;
    }
    
    const [full, user, pass, host, port, database, queryString] = matches;
    let params = new URLSearchParams(queryString || '');
    
    // Check if sslmode is set
    const currentSslMode = params.get('sslmode');
    console.log(`Current sslmode: ${currentSslMode || 'not set'}`);
    
    // Suggestions based on common issues
    if (!currentSslMode || currentSslMode === 'require') {
      console.log('Trying to add sslmode=prefer to connection string...');
      params.set('sslmode', 'prefer');
      
      const newConnString = `postgres://${user}:${pass}@${host}:${port}/${database}?${params.toString()}`;
      return newConnString;
    }
    
    return connString;
  } catch (error) {
    console.error('Error while parsing connection string:', error.message);
    return connString;
  }
}

// Test Supabase client
async function testSupabaseClient() {
  console.log('\n--- Testing Supabase Client ---');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Testing simple query to users table...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Supabase client query successful - ${data.length} rows returned`);
    return { successful: true };
  } catch (error) {
    console.error(`❌ Supabase client query failed: ${error.message}`);
    
    // Try common tables
    const commonTables = ['users', 'profiles', 'auth', 'todos', 'posts', 'products'];
    
    for (const table of commonTables) {
      try {
        console.log(`Trying table '${table}'...`);
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Successfully queried '${table}' table - ${data.length} rows`);
          return { successful: true, workingTable: table };
        }
      } catch {}
    }
    
    return { successful: false, error: error.message };
  }
}

// Main function
async function main() {
  const results = {};
  
  // 1. Test pooled connection (often uses PgBouncer)
  if (dbUrl) {
    // Try the original connection string
    results.pooled = await testConnection(dbUrl, 'Pooled Connection');
    
    // If it failed, try a modified connection string
    if (!results.pooled.successful) {
      console.log('\n⚠️ Pooled connection failed, trying with modified connection string...');
      const fixedConnString = verifyConnectionString(dbUrl);
      
      if (fixedConnString !== dbUrl) {
        results.pooledFixed = await testConnection(fixedConnString, 'Fixed Pooled Connection');
      }
    }
  } else {
    console.log('⚠️ Skipping pooled connection test - no DATABASE_URL provided');
  }
  
  // 2. Test direct connection
  if (directDbUrl) {
    // Try the original connection string
    results.direct = await testConnection(directDbUrl, 'Direct Connection');
    
    // If it failed, try a modified connection string
    if (!results.direct.successful) {
      console.log('\n⚠️ Direct connection failed, trying with modified connection string...');
      const fixedConnString = verifyConnectionString(directDbUrl);
      
      if (fixedConnString !== directDbUrl) {
        results.directFixed = await testConnection(fixedConnString, 'Fixed Direct Connection');
      }
    }
  } else {
    console.log('⚠️ Skipping direct connection test - no DIRECT_DATABASE_URL provided');
  }
  
  // 3. Test Supabase client
  if (supabaseUrl && supabaseServiceKey) {
    results.supabase = await testSupabaseClient();
  }
  
  // 4. Summary and recommendations
  console.log('\n=== SUMMARY ===');
  console.log(`Pooled Connection: ${results.pooled?.successful || results.pooledFixed?.successful ? '✓ Working' : '❌ Failed'}`);
  console.log(`Direct Connection: ${results.direct?.successful || results.directFixed?.successful ? '✓ Working' : '❌ Failed'}`);
  console.log(`Supabase Client: ${results.supabase?.successful ? '✓ Working' : '❌ Failed'}`);
  
  console.log('\n=== RECOMMENDATIONS ===');
  
  if ((!results.pooled?.successful && results.pooledFixed?.successful) || 
      (!results.direct?.successful && results.directFixed?.successful)) {
    console.log('\n✨ SSL CONFIGURATION FIXED!');
    console.log('Add the following configuration to your connection strings:');
    
    if (results.pooledFixed?.successful) {
      console.log('\nFor DATABASE_URL (Pooled):');
      console.log(`SSL Mode: ${JSON.stringify(results.pooledFixed.sslConfig.ssl)}`);
      console.log(`Connection string: ${results.pooledFixed.fixedConnectionString.substring(0, 40)}...`);
    }
    
    if (results.directFixed?.successful) {
      console.log('\nFor DIRECT_DATABASE_URL:');
      console.log(`SSL Mode: ${JSON.stringify(results.directFixed.sslConfig.ssl)}`);
      console.log(`Connection string: ${results.directFixed.fixedConnectionString.substring(0, 40)}...`);
    }
    
    console.log('\nFor Node.js code, use:');
    console.log(`const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: ${JSON.stringify(results.pooledFixed?.successful 
    ? results.pooledFixed.sslConfig.ssl 
    : results.directFixed.sslConfig.ssl)}
});`);
  } else if (!results.pooled?.successful && !results.direct?.successful && results.supabase?.successful) {
    console.log('\n✨ Only Supabase client works!');
    console.log('Recommendation: Use the Supabase JavaScript client for database operations.');
    console.log('Example:');
    console.log(`const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query example
const { data, error } = await supabase
  .from('${results.supabase.workingTable || 'your_table'}')
  .select('*');`);
  } else if (!results.pooled?.successful && !results.direct?.successful && !results.supabase?.successful) {
    console.log('\n❌ All connection methods failed!');
    console.log('Possible issues:');
    console.log('1. Check your Supabase project is active and not in maintenance mode');
    console.log('2. Verify your IP address is allowed in Supabase DB settings');
    console.log('3. Double-check all credentials and connection strings');
    console.log('4. Ensure your network allows connections to Supabase (no firewall blocks)');
  } else {
    console.log('\n✓ Connection is working!');
    
    if (results.pooled?.successful) {
      console.log('\nFor regular web traffic, use the pooled connection:');
      console.log(`const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: ${JSON.stringify(results.pooled.sslConfig.ssl)}
});`);
    }
    
    if (results.direct?.successful) {
      console.log('\nFor operations requiring prepared statements or transactions:');
      console.log(`const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DIRECT_DATABASE_URL,
  ssl: ${JSON.stringify(results.direct.sslConfig.ssl)}
});`);
    }
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