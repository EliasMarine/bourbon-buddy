import { NextResponse } from 'next/server';
import { isDatabaseConnected } from '@/lib/prisma';
import { checkRedisConnection } from '@/lib/redis';

export async function GET() {
  // Check database connection
  const dbConnected = await isDatabaseConnected();
  
  // Check Redis connection
  const redisConnected = await checkRedisConnection();
  
  // Return health status
  return NextResponse.json({
    status: dbConnected && redisConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    components: {
      database: {
        status: dbConnected ? 'connected' : 'error',
      },
      redis: {
        status: redisConnected ? 'connected' : 'error',
      }
    }
  });
} 