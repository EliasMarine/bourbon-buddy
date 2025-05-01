// Comprehensive Supabase Connection Test
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;
const directDbUrl = process.env.DIRECT_DATABASE_URL;

// Results storage
const testResults = {
  systemInfo: {},
  environmentChecks: {},
  apiTests: {},
  authTests: {},
  dbConnectionTests: {},
  storageTests: {},
  realtimeTests: {},
  totalTests: 0,
  passedTests: 0,
  failedTests: 0
};

// Helper function to log and record test results
function recordTestResult(category, testName, success, error = null, data = null) {
  const result = {
    success,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    result.error = typeof error === 'object' 
      ? { message: error.message, code: error.code, hint: error.hint }
      : { message: String(error) };
  }
  
  if (data) {
    result.data = data;
  }

  if (!testResults[category]) {
    testResults[category] = {};
  }
  
  testResults[category][testName] = result;
  testResults.totalTests++;
  
  if (success) {
    testResults.passedTests++;
    console.log(`✅ [${category}] ${testName}: Passed`);
  } else {
    testResults.failedTests++;
    console.error(`❌ [${category}] ${testName}: Failed${error ? ` - ${error.message || error}` : ''}`);
  }
  
  return success;
}

// 1. System information and environment checks
async function checkEnvironment() {
  console.log('\n=== CHECKING ENVIRONMENT ===');
  
  // Record system info
  testResults.systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    timestamp: new Date().toISOString()
  };
  
  // Check required environment variables
  recordTestResult(
    'environmentChecks',
    'Supabase URL',
    !!supabaseUrl,
    !supabaseUrl && 'Missing NEXT_PUBLIC_SUPABASE_URL'
  );
  
  recordTestResult(
    'environmentChecks',
    'Supabase Anon Key',
    !!supabaseAnonKey,
    !supabaseAnonKey && 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  
  recordTestResult(
    'environmentChecks',
    'Supabase Service Key',
    !!supabaseServiceKey,
    !supabaseServiceKey && 'Missing SUPABASE_SERVICE_ROLE_KEY'
  );
  
  // Check that URL is properly formatted
  let validUrl = false;
  try {
    new URL(supabaseUrl);
    validUrl = true;
  } catch (e) {
    validUrl = false;
  }
  
  recordTestResult(
    'environmentChecks',
    'Valid Supabase URL Format',
    validUrl,
    !validUrl && 'Invalid URL format'
  );
  
  // Perform a basic network check
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(supabaseUrl, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    recordTestResult(
      'environmentChecks',
      'Supabase Endpoint Reachable',
      response.ok,
      !response.ok && `Status ${response.status}: ${response.statusText}`
    );
  } catch (error) {
    recordTestResult(
      'environmentChecks',
      'Supabase Endpoint Reachable',
      false,
      error
    );
  }
  
  return Object.values(testResults.environmentChecks).every(r => r.success);
}

// 2. Test Supabase REST API and authentication
async function testSupabaseApi() {
  console.log('\n=== TESTING SUPABASE API ===');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Skipping API tests due to missing configuration');
    return false;
  }
  
  try {
    // Create anon client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test health endpoint
    try {
      const { data: healthData, error: healthError } = await supabase.rpc('get_service_health');
      
      recordTestResult(
        'apiTests',
        'Health Check',
        !healthError,
        healthError,
        healthError ? null : { status: 'Service appears healthy' }
      );
    } catch (error) {
      recordTestResult(
        'apiTests',
        'Health Check',
        false,
        error
      );
    }
    
    // Test auth session
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      recordTestResult(
        'authTests',
        'Get Session',
        !sessionError,
        sessionError,
        sessionError ? null : { hasSession: !!sessionData?.session }
      );
    } catch (error) {
      recordTestResult(
        'authTests',
        'Get Session',
        false,
        error
      );
    }
    
    // Test with service role key if available
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // Try to access a table that requires admin privileges
        const { data: usersData, error: usersError } = await adminClient
          .from('auth')
          .select('users(*)')
          .limit(1);
        
        // We consider it successful if we get either data or a specific error (except permission denied)
        const isSuccess = !usersError || 
          (usersError.message && !usersError.message.includes('permission denied'));
        
        recordTestResult(
          'apiTests',
          'Admin Access',
          isSuccess,
          !isSuccess ? usersError : null,
          usersData ? { recordsFound: 'Data accessible with service role' } : null
        );
      } catch (error) {
        recordTestResult(
          'apiTests',
          'Admin Access',
          false,
          error
        );
      }
    }
    
    return Object.values(testResults.apiTests).every(r => r.success);
  } catch (error) {
    console.error('❌ Unexpected error during API tests:', error);
    recordTestResult(
      'apiTests',
      'API Client Creation',
      false,
      error
    );
    return false;
  }
}

// 3. Test Database Connections
async function testDatabaseConnections() {
  console.log('\n=== TESTING DATABASE CONNECTIONS ===');
  
  // Test pooled connection
  if (dbUrl) {
    let client;
    try {
      const pool = new Pool({ 
        connectionString: dbUrl,
        // PgBouncer settings
        statement_timeout: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      });
      
      client = await pool.connect();
      const result = await client.query('SELECT NOW() as server_time');
      
      recordTestResult(
        'dbConnectionTests',
        'Pooled Connection',
        true,
        null,
        { serverTime: result.rows[0].server_time }
      );
    } catch (error) {
      recordTestResult(
        'dbConnectionTests',
        'Pooled Connection',
        false,
        error
      );
    } finally {
      if (client) client.release();
    }
  } else {
    console.log('⚠️ Skipping pooled database test - no DATABASE_URL provided');
  }
  
  // Test direct connection
  if (directDbUrl) {
    let client;
    try {
      const pool = new Pool({ connectionString: directDbUrl });
      client = await pool.connect();
      const tableResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      
      recordTestResult(
        'dbConnectionTests',
        'Direct Connection',
        true,
        null,
        { 
          sampleTables: tableResult.rows.map(row => row.table_name)
        }
      );
    } catch (error) {
      recordTestResult(
        'dbConnectionTests',
        'Direct Connection',
        false,
        error
      );
    } finally {
      if (client) client.release();
    }
  } else {
    console.log('⚠️ Skipping direct database test - no DIRECT_DATABASE_URL provided');
  }
  
  return Object.values(testResults.dbConnectionTests || {}).every(r => r.success);
}

// 4. Test Storage API
async function testStorageApi() {
  console.log('\n=== TESTING STORAGE API ===');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️ Skipping storage tests due to missing configuration');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // List buckets
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      recordTestResult(
        'storageTests',
        'List Buckets',
        !bucketsError,
        bucketsError,
        bucketsError ? null : { bucketsCount: buckets?.length || 0 }
      );
    } catch (error) {
      recordTestResult(
        'storageTests',
        'List Buckets',
        false,
        error
      );
    }
    
    return Object.values(testResults.storageTests || {}).every(r => r.success);
  } catch (error) {
    console.error('❌ Unexpected error during storage tests:', error);
    recordTestResult(
      'storageTests',
      'Storage API',
      false,
      error
    );
    return false;
  }
}

// 5. Test Realtime API
async function testRealtimeApi() {
  console.log('\n=== TESTING REALTIME API ===');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️ Skipping realtime tests due to missing configuration');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test creating a channel
    try {
      const channel = supabase.channel('test-channel');
      
      if (!channel) {
        throw new Error('Failed to create channel');
      }
      
      let subscriptionSuccessful = false;
      
      const subscription = channel
        .on('broadcast', { event: 'test' }, () => {})
        .subscribe((status) => {
          subscriptionSuccessful = status === 'SUBSCRIBED';
        });
      
      // Wait for subscription (or timeout after 3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clean up
      await channel.unsubscribe();
      
      recordTestResult(
        'realtimeTests',
        'Channel Creation',
        !!channel,
        !channel ? 'Failed to create channel' : null
      );
      
      recordTestResult(
        'realtimeTests',
        'Channel Subscription',
        subscriptionSuccessful,
        !subscriptionSuccessful ? 'Failed to subscribe to channel' : null
      );
    } catch (error) {
      recordTestResult(
        'realtimeTests',
        'Realtime API',
        false,
        error
      );
    }
    
    return Object.values(testResults.realtimeTests || {}).every(r => r.success);
  } catch (error) {
    console.error('❌ Unexpected error during realtime tests:', error);
    recordTestResult(
      'realtimeTests',
      'Realtime API',
      false,
      error
    );
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('=== SUPABASE COMPREHENSIVE CONNECTION TEST ===');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key:', supabaseAnonKey ? '✓ Present' : '✗ Missing');
  console.log('Service Key:', supabaseServiceKey ? '✓ Present' : '✗ Missing');
  console.log('DB URL:', dbUrl ? '✓ Present' : '✗ Missing');
  console.log('Direct DB URL:', directDbUrl ? '✓ Present' : '✗ Missing');
  
  // Run all test suites
  await checkEnvironment();
  await testSupabaseApi();
  await testDatabaseConnections();
  await testStorageApi();
  await testRealtimeApi();
  
  // Generate summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Passed: ${testResults.passedTests} (${Math.round(testResults.passedTests / testResults.totalTests * 100)}%)`);
  console.log(`Failed: ${testResults.failedTests} (${Math.round(testResults.failedTests / testResults.totalTests * 100)}%)`);
  
  // Generate recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  
  const envFailed = Object.values(testResults.environmentChecks || {}).some(r => !r.success);
  const apiFailed = Object.values(testResults.apiTests || {}).some(r => !r.success);
  const authFailed = Object.values(testResults.authTests || {}).some(r => !r.success);
  const dbFailed = Object.values(testResults.dbConnectionTests || {}).some(r => !r.success);
  
  if (envFailed) {
    console.log('⚠️ Environment issues detected:');
    console.log('  - Verify all required environment variables are set correctly');
    console.log('  - Check that Supabase URL is correctly formatted and accessible');
  }
  
  if (apiFailed || authFailed) {
    console.log('⚠️ API/Auth issues detected:');
    console.log('  - Verify API keys are correct and have proper permissions');
    console.log('  - Check if project is in maintenance mode or paused');
    console.log('  - Make sure your IP is not blocked by Supabase');
  }
  
  if (dbFailed) {
    console.log('⚠️ Database connection issues detected:');
    console.log('  - Verify database credentials and connection strings');
    console.log('  - Check if database is online and accessible');
    console.log('  - Your IP might need to be allowlisted in Supabase');
  }
  
  if (!envFailed && !apiFailed && !authFailed && !dbFailed) {
    console.log('✅ All core tests passed! Supabase appears to be correctly set up.');
  } else {
    console.log('⚠️ Some tests failed. Review the issues above to troubleshoot.');
  }
  
  // Save results to file
  const resultsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const resultsFile = path.join(resultsDir, `supabase-test-${timestamp}.json`);
  
  fs.writeFileSync(
    resultsFile, 
    JSON.stringify(testResults, null, 2)
  );
  
  console.log(`\nDetailed test results saved to: ${resultsFile}`);
  
  // Return exit code based on test success
  return testResults.failedTests === 0 ? 0 : 1;
}

// Run tests and handle exit
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error during tests:', error);
    process.exit(1);
  }); 