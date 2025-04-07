import Redis from 'ioredis';

// Define connection options based on environment variables
const redisUrl = process.env.REDIS_URL || '';

// Track if Redis is enabled
const isRedisEnabled = !!redisUrl && process.env.USE_REDIS_FOR_SESSIONS === 'true';

// Create a Redis client if enabled
let redisClient: Redis | null = null;

if (isRedisEnabled) {
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
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    redisClient = null;
  }
}

// Export the redis client
export const redis = redisClient;

// Function to create a namespaced key for different use cases
export function getRedisKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
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