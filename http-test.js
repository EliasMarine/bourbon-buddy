// Import necessary modules
require('dotenv').config({ path: '.env.local' });
const https = require('https');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = new URL(supabaseUrl).hostname;
const dbHost = `db.${supabaseHost.split('.').slice(1).join('.')}`;

console.log('=== HTTP CONNECTIVITY TEST ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase API host:', supabaseHost);
console.log('Database host:', dbHost);

// Test HTTP connectivity to Supabase API
function testHttpConnectivity(host, path, port = 443) {
  return new Promise((resolve, reject) => {
    console.log(`Testing HTTP connectivity to ${host}${path}...`);
    
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000, // 5 seconds timeout
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data.substring(0, 100) + (data.length > 100 ? '...' : '')
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Run the tests
async function runTests() {
  try {
    // Test Supabase REST API connectivity
    console.log('\n=== TESTING SUPABASE API ===');
    const apiResult = await testHttpConnectivity(supabaseHost, '/rest/v1/');
    console.log('✅ Supabase API is reachable');
    console.log('Status code:', apiResult.statusCode);
    console.log('Response:', apiResult.data);
    
    // Try to reach the Auth API
    console.log('\n=== TESTING SUPABASE AUTH API ===');
    const authResult = await testHttpConnectivity(supabaseHost, '/auth/v1/');
    console.log('✅ Supabase Auth API is reachable');
    console.log('Status code:', authResult.statusCode);
    console.log('Response:', authResult.data);
    
    // Try to ping the database host directly
    console.log('\n=== TESTING DATABASE HOST CONNECTIVITY ===');
    try {
      await testHttpConnectivity(dbHost, '/');
      console.log('✅ Database host is reachable via HTTPS');
    } catch (error) {
      console.log('❌ Database host is not reachable via HTTPS');
      console.log('This is expected because database hosts don\'t typically respond to HTTPS');
      console.log('Error:', error.message);
    }
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('Supabase is reachable via HTTP/HTTPS');
    console.log('You can use the Supabase REST API for your application');
    console.log('For direct database access, you may need to:');
    console.log('  1. Check if your IP is allowed in Supabase Database settings');
    console.log('  2. Connect from a different network');
    console.log('  3. Use Supabase\'s REST API instead of direct database connections');
    
  } catch (error) {
    console.error('\n❌ HTTP connectivity test failed');
    console.error('Error:', error.message);
    console.error('\nThis suggests network connectivity issues to Supabase.');
    console.error('Please check:');
    console.error('  1. Your internet connection');
    console.error('  2. Firewall settings');
    console.error('  3. VPN configuration (if using one)');
    console.error('  4. DNS settings');
  }
}

runTests(); 