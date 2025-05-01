// Supabase Connection Pooling Test
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;
const directDbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL?.replace('postgres://', 'postgresql://');

console.log('=== SUPABASE CONNECTION POOLING TEST ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? '✓ Present' : '✗ Missing');
console.log('DATABASE_URL:', dbUrl ? '✓ Present' : '✗ Missing');
console.log('DIRECT_DATABASE_URL:', directDbUrl ? '✓ Present' : '✗ Missing');

// Helper to execute a simple query and measure time
async function executeQuery(client, queryText, label, iterations = 3) {
  console.log(`\n------ Testing ${label} ------`);

  const results = [];
  let totalTime = 0;
  let failedQueries = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      console.log(`Query ${i + 1}/${iterations}...`);
      const startTime = Date.now();
      
      const result = await client.query(queryText);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      totalTime += executionTime;
      results.push({
        success: true,
        time: executionTime,
        rowCount: result.rowCount
      });
      
      console.log(`✅ Success - ${executionTime}ms - ${result.rowCount} rows`);
    } catch (error) {
      failedQueries++;
      console.error(`❌ Error: ${error.message}`);
      results.push({
        success: false,
        error: error.message
      });
    }
  }

  // Calculate average time for successful queries
  const successfulQueries = results.filter(r => r.success);
  const avgTime = successfulQueries.length > 0 
    ? totalTime / successfulQueries.length 
    : 0;

  console.log(`\n${label} Summary:`);
  console.log(`  Queries: ${iterations - failedQueries}/${iterations} successful`);
  console.log(`  Average time: ${Math.round(avgTime)}ms`);
  
  return {
    successRate: (iterations - failedQueries) / iterations,
    averageTime: avgTime,
    results
  };
}

// Main test function
async function runTests() {
  const results = {
    pooled: null,
    direct: null,
    supabase: null
  };

  // 1. Test PgBouncer pooled connection
  if (dbUrl) {
    try {
      console.log('\n=== TESTING POOLED CONNECTION (PgBouncer) ===');
      const pooledPool = new Pool({ 
        connectionString: dbUrl,
        // PgBouncer specific settings
        statement_timeout: 30000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });
      
      const pooledClient = await pooledPool.connect();
      console.log('✅ Pooled connection established successfully');
      
      try {
        // Test with a simple query
        results.pooled = await executeQuery(
          pooledClient,
          'SELECT NOW() as time, pg_sleep(0.1)',
          'Pooled Connection'
        );
        
        // Test with a query that shows connection info
        const { rows: connInfo } = await pooledClient.query(`
          SELECT 
            current_user,
            inet_server_addr() as server_addr,
            inet_server_port() as server_port,
            current_database()
        `);
        
        console.log('\nPooled Connection Info:');
        console.log(JSON.stringify(connInfo[0], null, 2));
      } finally {
        pooledClient.release();
        await pooledPool.end();
      }
    } catch (error) {
      console.error('❌ Pooled connection test failed:', error.message);
      results.pooled = { error: error.message };
    }
  } else {
    console.log('⚠️ Skipping pooled connection test - no DATABASE_URL provided');
  }

  // 2. Test direct connection (no pooling)
  if (directDbUrl) {
    try {
      console.log('\n=== TESTING DIRECT CONNECTION (No PgBouncer) ===');
      const directPool = new Pool({ 
        connectionString: directDbUrl
      });
      
      const directClient = await directPool.connect();
      console.log('✅ Direct connection established successfully');
      
      try {
        // Test with a simple query
        results.direct = await executeQuery(
          directClient,
          'SELECT NOW() as time, pg_sleep(0.1)',
          'Direct Connection'
        );
        
        // Test with a prepared statement (which doesn't work in PgBouncer)
        try {
          console.log('\nTesting prepared statement (should work with direct connection):');
          await directClient.query('PREPARE test_stmt (int) AS SELECT $1 as num');
          const { rows } = await directClient.query('EXECUTE test_stmt(42)');
          console.log('✅ Prepared statement successful:', rows[0]);
          await directClient.query('DEALLOCATE test_stmt');
        } catch (prepError) {
          console.error('❌ Prepared statement failed:', prepError.message);
        }
        
        // Test with a query that shows connection info
        const { rows: connInfo } = await directClient.query(`
          SELECT 
            current_user,
            inet_server_addr() as server_addr,
            inet_server_port() as server_port,
            current_database()
        `);
        
        console.log('\nDirect Connection Info:');
        console.log(JSON.stringify(connInfo[0], null, 2));
      } finally {
        directClient.release();
        await directPool.end();
      }
    } catch (error) {
      console.error('❌ Direct connection test failed:', error.message);
      results.direct = { error: error.message };
    }
  } else {
    console.log('⚠️ Skipping direct connection test - no DIRECT_DATABASE_URL provided');
  }

  // 3. Test Supabase client connection
  if (supabaseUrl && supabaseServiceKey) {
    try {
      console.log('\n=== TESTING SUPABASE CLIENT CONNECTION ===');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      console.log('Testing Supabase client with simple query...');
      
      // Test with query timing
      const results = [];
      let totalTime = 0;
      const iterations = 3;
      
      for (let i = 0; i < iterations; i++) {
        try {
          console.log(`Query ${i + 1}/${iterations}...`);
          const startTime = Date.now();
          
          const { data, error } = await supabase
            .from('_prisma_migrations')
            .select('*')
            .limit(5);
          
          const endTime = Date.now();
          const executionTime = endTime - startTime;
          
          if (error) throw error;
          
          totalTime += executionTime;
          results.push({
            success: true,
            time: executionTime,
            rowCount: data?.length || 0
          });
          
          console.log(`✅ Success - ${executionTime}ms - ${data?.length || 0} rows`);
        } catch (error) {
          console.error(`❌ Error: ${error.message}`);
          
          if (error.message.includes('relation "_prisma_migrations" does not exist')) {
            console.log('Trying a different table...');
            try {
              const startTime = Date.now();
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .limit(5);
              
              const endTime = Date.now();
              const executionTime = endTime - startTime;
              
              if (error) throw error;
              
              totalTime += executionTime;
              results.push({
                success: true,
                time: executionTime,
                rowCount: data?.length || 0
              });
              
              console.log(`✅ Success with users table - ${executionTime}ms - ${data?.length || 0} rows`);
            } catch (retryError) {
              console.error(`❌ Retry error: ${retryError.message}`);
              results.push({
                success: false,
                error: retryError.message
              });
            }
          } else {
            results.push({
              success: false,
              error: error.message
            });
          }
        }
      }
      
      // Calculate average time for successful queries
      const successfulQueries = results.filter(r => r.success);
      const avgTime = successfulQueries.length > 0 
        ? totalTime / successfulQueries.length 
        : 0;
      
      console.log(`\nSupabase Client Summary:`);
      console.log(`  Queries: ${successfulQueries.length}/${iterations} successful`);
      console.log(`  Average time: ${Math.round(avgTime)}ms`);
      
      // Store results
      results.supabase = {
        successRate: successfulQueries.length / iterations,
        averageTime: avgTime,
        results
      };
    } catch (error) {
      console.error('❌ Supabase client test failed:', error.message);
      results.supabase = { error: error.message };
    }
  } else {
    console.log('⚠️ Skipping Supabase client test - missing required credentials');
  }

  // 4. Print the comparison
  console.log('\n=== CONNECTION COMPARISON ===');
  
  const pooledResult = results.pooled?.error 
    ? `❌ Failed: ${results.pooled.error}` 
    : (results.pooled 
      ? `✓ ${Math.round(results.pooled.averageTime)}ms avg, ${results.pooled.successRate * 100}% success` 
      : 'Not tested');
  
  const directResult = results.direct?.error 
    ? `❌ Failed: ${results.direct.error}` 
    : (results.direct 
      ? `✓ ${Math.round(results.direct.averageTime)}ms avg, ${results.direct.successRate * 100}% success` 
      : 'Not tested');
  
  const supabaseResult = results.supabase?.error 
    ? `❌ Failed: ${results.supabase.error}` 
    : (results.supabase 
      ? `✓ ${Math.round(results.supabase.averageTime)}ms avg, ${results.supabase.successRate * 100}% success` 
      : 'Not tested');
  
  console.log(`Pooled Connection:   ${pooledResult}`);
  console.log(`Direct Connection:   ${directResult}`);
  console.log(`Supabase Client:     ${supabaseResult}`);
  
  // 5. Recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  
  const poolFailed = results.pooled?.error;
  const directFailed = results.direct?.error;
  const supFailed = results.supabase?.error;
  
  if (poolFailed && !directFailed) {
    console.log('✨ Your direct connection works, but pooled connection fails.');
    console.log('   This likely indicates a PgBouncer configuration issue.');
    console.log('   Recommendation: Check DATABASE_URL for correct formatting.');
  } else if (!poolFailed && directFailed) {
    console.log('✨ Your pooled connection works, but direct connection fails.');
    console.log('   Recommendation: Check DIRECT_DATABASE_URL for correct formatting.');
  } else if (poolFailed && directFailed && !supFailed) {
    console.log('✨ Only Supabase client connection works.');
    console.log('   Recommendation: Use the Supabase client for all database operations.');
    console.log('   If you need direct DB access, check your db credentials and IP allowlisting.');
  } else if (!poolFailed && !directFailed) {
    console.log('✨ Both pooled and direct connections work correctly!');
    
    if (results.pooled && results.direct && 
        results.pooled.averageTime < results.direct.averageTime) {
      console.log('   Pooled connection is faster than direct connection.');
      console.log('   Recommendation: Use pooled connections for most operations.');
    } else if (results.pooled && results.direct) {
      console.log('   Direct connection is faster than pooled connection.');
      console.log('   Recommendation: Use direct connections for performance-critical operations,');
      console.log('   but be aware of connection limits.');
    }
  } else {
    console.log('✨ Review the test results to identify connection issues.');
    console.log('   Make sure your environment variables are set correctly.');
  }
  
  if (supFailed) {
    console.log('\n⚠️ Supabase client connection failed. Check:');
    console.log('   1. Your Supabase API keys are valid');
    console.log('   2. Your Supabase project is active');
    console.log('   3. Network connectivity to Supabase servers');
  }
  
  console.log('\nTo determine which connection type to use:');
  console.log('• Use pooled connections (DATABASE_URL) for most web traffic');
  console.log('• Use direct connections for operations that need:');
  console.log('  - Prepared statements');
  console.log('  - Long-running transactions');
  console.log('  - Session variables');
  console.log('  - Special PostgreSQL features not supported by PgBouncer');
}

// Run tests
runTests()
  .catch(error => {
    console.error('Fatal error during tests:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\nTests completed');
  }); 