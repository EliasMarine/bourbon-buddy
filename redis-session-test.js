/**
 * Redis Session Storage Test
 * 
 * This script tests the session storage functionality in Redis:
 * 1. Creates a session
 * 2. Retrieves a session
 * 3. Updates a session
 * 4. Deletes a session
 */

require('dotenv').config({ path: '.env.local' });
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Import the session storage functions from your codebase
// or reimplement them for testing
const redisUrl = process.env.REDIS_URL;
const redisPrefix = process.env.REDIS_PREFIX || '';

console.log('=== REDIS SESSION STORAGE TEST ===');
console.log(`Redis URL: ${redisUrl ? redisUrl.substring(0, 20) + '...' : 'not set'}`);
console.log(`Redis Prefix: ${redisPrefix}`);

// Create Redis client
const redis = redisUrl ? new Redis(redisUrl, {
  connectTimeout: 10000,
  maxRetriesPerRequest: 3
}) : null;

// Handle connection errors
if (redis) {
  redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });
}

// Helper function to create namespaced keys
function getSessionKey(sessionToken) {
  return `${redisPrefix}session:${sessionToken}`;
}

// Mock session storage
const sessionStorage = {
  // Get session data
  async getSession(sessionToken) {
    if (!redis) return null;
    
    try {
      const key = getSessionKey(sessionToken);
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting session from Redis:', error);
      return null;
    }
  },

  // Set session data with expiry
  async setSession(sessionToken, data, expiresInSeconds = 3600) {
    if (!redis) return;
    
    try {
      const key = getSessionKey(sessionToken);
      await redis.set(key, JSON.stringify(data));
      await redis.expire(key, expiresInSeconds);
    } catch (error) {
      console.error('Error setting session in Redis:', error);
    }
  },

  // Delete session data
  async deleteSession(sessionToken) {
    if (!redis) return;
    
    try {
      const key = getSessionKey(sessionToken);
      await redis.del(key);
    } catch (error) {
      console.error('Error deleting session from Redis:', error);
    }
  }
};

// Main test function
async function testRedisSessionStorage() {
  if (!redis) {
    console.error('❌ Redis is not configured or disabled. Please check your .env.local file.');
    return;
  }

  try {
    console.log('\n=== Creating test session ===');
    const sessionToken = uuidv4();
    console.log(`Session Token: ${sessionToken}`);
    
    // Create a mock session
    const mockSession = {
      userId: 'user_' + Math.floor(Math.random() * 10000),
      username: 'tester',
      email: 'test@example.com',
      lastLogin: new Date().toISOString(),
      isAuthenticated: true
    };
    
    console.log('Session data:', mockSession);
    
    // Step 1: Create session
    console.log('\nSetting session...');
    await sessionStorage.setSession(sessionToken, mockSession, 3600);
    
    // Step 2: Retrieve session
    console.log('\nRetrieving session...');
    const retrievedSession = await sessionStorage.getSession(sessionToken);
    console.log('Retrieved session:', retrievedSession);
    
    // Step 3: Update session
    console.log('\nUpdating session...');
    mockSession.lastActivity = new Date().toISOString();
    mockSession.visitCount = (mockSession.visitCount || 0) + 1;
    
    await sessionStorage.setSession(sessionToken, mockSession, 3600);
    
    // Verify update
    const updatedSession = await sessionStorage.getSession(sessionToken);
    console.log('Updated session:', updatedSession);
    
    // Step 4: Delete session
    console.log('\nDeleting session...');
    await sessionStorage.deleteSession(sessionToken);
    
    // Verify deletion
    const afterDelete = await sessionStorage.getSession(sessionToken);
    console.log('Session after deletion:', afterDelete);
    
    if (afterDelete === null) {
      console.log('\n✅ Redis session storage test completed successfully!');
    } else {
      console.log('\n⚠️ Session deletion might not have worked correctly.');
    }
  } catch (error) {
    console.error('\n❌ Redis session storage test failed:', error.message);
  } finally {
    // Close connection
    console.log('\nClosing Redis connection...');
    if (redis) {
      await redis.quit();
    }
  }
}

// Run the test
testRedisSessionStorage().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 