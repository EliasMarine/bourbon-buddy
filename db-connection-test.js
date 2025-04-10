// Import necessary modules directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Print current configuration
console.log('=== CONFIGURATION ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 45) + '...' : 'not set');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 20) + '...' : 'not set');
console.log('DISABLE_REDIS:', process.env.DISABLE_REDIS);
console.log('USE_REDIS_FOR_SESSIONS:', process.env.USE_REDIS_FOR_SESSIONS);
console.log();

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('=== TESTING SUPABASE CONNECTION ===');
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('Supabase client created successfully');
    
    // Test query
    console.log('Testing Supabase query...');
    const { data, error } = await supabase.from('_prisma_migrations').select('*').limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase query successful!');
    console.log('Migration data sample:', data);
    
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

// Test Redis connection
async function testRedisConnection() {
  console.log('\n=== TESTING REDIS CONNECTION ===');
  
  // Check if Redis is disabled
  if (process.env.DISABLE_REDIS === 'true') {
    console.log('Redis is disabled by configuration (DISABLE_REDIS=true)');
    return false;
  }
  
  // Check if Redis URL is set
  if (!process.env.REDIS_URL) {
    console.log('Redis URL is not set');
    return false;
  }
  
  try {
    console.log('Creating Redis client...');
    const redis = new Redis(process.env.REDIS_URL, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 2
    });
    
    // Handle connection errors
    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
    
    console.log('Testing Redis ping...');
    await redis.ping();
    console.log('✅ Redis connection successful!');
    
    // Test set/get
    console.log('Testing Redis set/get...');
    const testKey = 'test:connection:' + Date.now();
    await redis.set(testKey, 'Connection test successful');
    const value = await redis.get(testKey);
    console.log(`Test key value: ${value}`);
    
    // Clean up
    await redis.del(testKey);
    await redis.quit();
    
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  console.log('Starting database connection tests...');
  
  const supabaseConnected = await testSupabaseConnection();
  const redisConnected = await testRedisConnection();
  
  console.log('\n=== TEST RESULTS ===');
  console.log('Supabase:', supabaseConnected ? '✅ CONNECTED' : '❌ FAILED');
  console.log('Redis:', redisConnected ? '✅ CONNECTED' : '❌ FAILED');
  
  process.exit(0);
})();
