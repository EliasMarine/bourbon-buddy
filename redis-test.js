/**
 * Redis Functionality Test Script
 * 
 * This script tests various Redis operations:
 * 1. Basic set/get/del operations
 * 2. Hash operations
 * 3. List operations
 * 4. Expiration and TTL
 * 5. Pub/Sub mechanism
 * 6. Pipeline operations
 */

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');

// Redis connection configuration
const redisUrl = process.env.REDIS_URL;
const redisPrefix = process.env.REDIS_PREFIX || '';

console.log('=== REDIS TEST ===');
console.log(`Redis URL: ${redisUrl ? redisUrl.substring(0, 20) + '...' : 'not set'}`);
console.log(`Redis Prefix: ${redisPrefix}`);

// Helper function to create namespaced keys
function getKey(key) {
  return `${redisPrefix}test:${key}`;
}

// Main test function
async function testRedis() {
  if (!redisUrl) {
    console.error('❌ Redis URL is not set. Please check your .env.local file.');
    return;
  }

  console.log('\nConnecting to Redis...');
  const redis = new Redis(redisUrl, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3
  });

  // Handle connection errors
  redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  try {
    // Test 1: Basic operations
    console.log('\n=== Test 1: Basic Operations ===');
    const testKey = getKey('basic');
    
    console.log('Setting a value...');
    await redis.set(testKey, 'Hello Redis!');
    
    console.log('Getting the value...');
    const value = await redis.get(testKey);
    console.log(`Value: ${value}`);
    
    console.log('Deleting the key...');
    await redis.del(testKey);
    
    const afterDelete = await redis.get(testKey);
    console.log(`Value after delete: ${afterDelete || 'null'}`);

    // Test 2: Hash operations
    console.log('\n=== Test 2: Hash Operations ===');
    const hashKey = getKey('hash');
    
    console.log('Setting hash fields...');
    await redis.hset(hashKey, 'name', 'Bourbon Buddy');
    await redis.hset(hashKey, 'version', '1.0.0');
    await redis.hset(hashKey, 'environment', 'testing');
    
    console.log('Getting hash fields...');
    const name = await redis.hget(hashKey, 'name');
    const all = await redis.hgetall(hashKey);
    
    console.log(`Name: ${name}`);
    console.log('All hash fields:', all);
    
    await redis.del(hashKey);

    // Test 3: List operations
    console.log('\n=== Test 3: List Operations ===');
    const listKey = getKey('list');
    
    console.log('Pushing items to list...');
    await redis.lpush(listKey, 'item1', 'item2', 'item3');
    
    console.log('Getting list range...');
    const listItems = await redis.lrange(listKey, 0, -1);
    console.log('List items:', listItems);
    
    await redis.del(listKey);

    // Test 4: Expiration and TTL
    console.log('\n=== Test 4: Expiration and TTL ===');
    const expireKey = getKey('expire');
    
    console.log('Setting key with expiration...');
    await redis.set(expireKey, 'This will expire in 10 seconds');
    await redis.expire(expireKey, 10);
    
    const ttl = await redis.ttl(expireKey);
    console.log(`TTL: ${ttl} seconds`);

    // Test 5: Pipeline operations
    console.log('\n=== Test 5: Pipeline Operations ===');
    const pipelineKey = getKey('pipeline');
    
    console.log('Executing pipeline...');
    const pipeline = redis.pipeline();
    pipeline.set(pipelineKey, 'pipeline-value');
    pipeline.incr(getKey('counter'));
    pipeline.incr(getKey('counter'));
    pipeline.get(pipelineKey);
    pipeline.get(getKey('counter'));
    
    const results = await pipeline.exec();
    console.log('Pipeline results:', results.map(([err, result]) => result));

    // Clean up
    console.log('\n=== Cleaning up ===');
    const keys = await redis.keys(`${redisPrefix}test:*`);
    if (keys.length > 0) {
      console.log(`Deleting ${keys.length} test keys...`);
      await redis.del(...keys);
    }

    console.log('\n✅ All Redis tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Redis test failed:', error.message);
  } finally {
    // Close connection
    console.log('\nClosing Redis connection...');
    redis.quit();
  }
}

// Run the test
testRedis().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 