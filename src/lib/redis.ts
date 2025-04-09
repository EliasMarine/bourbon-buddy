import Redis from 'ioredis';

// Define connection options based on environment variables
const redisUrl = process.env.REDIS_URL || '';
const disableRedis = process.env.DISABLE_REDIS === 'true';

// Track if Redis is enabled
const isRedisEnabled = !disableRedis && !!redisUrl && process.env.USE_REDIS_FOR_SESSIONS === 'true';

// Add more detailed debug logging
console.log(`Redis enabled: ${isRedisEnabled}`);
console.log(`Redis URL present: ${!!redisUrl}`);
console.log(`Redis URL: ${redisUrl ? redisUrl.substring(0, 9) + '...' : 'not set'}`);
console.log(`USE_REDIS_FOR_SESSIONS: ${process.env.USE_REDIS_FOR_SESSIONS}`);
console.log(`DISABLE_REDIS: ${disableRedis}`);

// Check URL validity without causing exceptions
let isValidRedisUrl = false;
if (redisUrl) {
  try {
    // Validate URL format
    const urlPattern = /^redis(s)?:\/\//;
    isValidRedisUrl = urlPattern.test(redisUrl);
    if (isValidRedisUrl) {
      console.log(`Redis URL format appears valid`);
    } else {
      console.warn(`Redis URL doesn't match expected pattern (redis:// or rediss://)`);
    }
  } catch (error) {
    console.error('Invalid Redis URL:', error);
    isValidRedisUrl = false;
  }
} else {
  console.log('No Redis URL provided');
}

// Create a Redis client if enabled and URL is valid
let redisClient: Redis | null = null;

if (isRedisEnabled && isValidRedisUrl && !disableRedis) {
  try {
    redisClient = new Redis(redisUrl, {
      // Set reasonable connection timeouts
      connectTimeout: 5000,
      // Don't keep retrying indefinitely 
      maxRetriesPerRequest: 3,
      // Add error handling
      retryStrategy(times) {
        // Only retry a few times
        const delay = Math.min(times * 100, 3000);
        return times < 5 ? delay : null;
      }
    });
    
    // Add error handler to prevent crashing
    redisClient.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      // Don't crash the app on connection issues
    });
    
    console.log('Redis client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisClient = null;
  }
} else {
  console.log(`Redis client NOT initialized. Enabled: ${isRedisEnabled}, Valid URL: ${isValidRedisUrl}, Disabled flag: ${disableRedis}`);
}

// Export the redis client
export const redis = redisClient;

// Function to create a namespaced key for different use cases
export function getRedisKey(namespace: string, key: string): string {
  return `${process.env.REDIS_PREFIX || ''}${namespace}:${key}`;
}

// Session management functions with fallbacks
export const sessionStorage = {
  // Get session data
  async getSession(sessionToken: string): Promise<any> {
    if (!redis) return null;
    
    try {
      const key = getRedisKey('session', sessionToken);
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting session from Redis:', error);
      return null;
    }
  },

  // Set session data with expiry
  async setSession(sessionToken: string, data: any, expiresInSeconds: number): Promise<void> {
    if (!redis) return;
    
    try {
      const key = getRedisKey('session', sessionToken);
      await redis.set(key, JSON.stringify(data));
      await redis.expire(key, expiresInSeconds);
    } catch (error) {
      console.error('Error setting session in Redis:', error);
    }
  },

  // Delete session data
  async deleteSession(sessionToken: string): Promise<void> {
    if (!redis) return;
    
    try {
      const key = getRedisKey('session', sessionToken);
      await redis.del(key);
    } catch (error) {
      console.error('Error deleting session from Redis:', error);
    }
  }
};

// Health check function for Redis connection
export async function checkRedisConnection(): Promise<boolean> {
  if (!redis) return false;
  
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
} 