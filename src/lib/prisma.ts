import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Connection management
let prismaInstance: PrismaClient | undefined;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

// Initialize Prisma client with connection retry logic
function createPrismaClient() {
  console.log('Creating new Prisma client instance');
  
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

  // Enhanced error handling middleware
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error: any) {
      // Log database errors
      console.error(`Prisma Error: ${params.model}.${params.action}`, error);
      
      // Handle specific PostgreSQL errors
      if (error?.message?.includes('prepared statement') || 
          (error?.meta?.cause && error?.meta?.cause.includes('prepared statement'))) {
        console.warn('Detected prepared statement conflict, reconnecting...');
        
        // Force reconnect on next request by clearing the instance
        prismaInstance = undefined;
        connectionAttempts = 0;
      }
      
      throw error;
    }
  });

  // Test connection and handle reconnection logic
  const testConnection = async () => {
    try {
      // Test a simple query to verify connection works
      await client.$queryRaw`SELECT 1 as test`;
      console.log('Prisma connection test successful');
      connectionAttempts = 0;
      return client;
    } catch (e) {
      connectionAttempts++;
      console.error(`Prisma connection attempt ${connectionAttempts} failed:`, e);
      
      if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        console.log(`Retrying connection in ${RECONNECT_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));
        return testConnection();
      } else {
        console.error('Max connection attempts reached. Returning client anyway.');
        connectionAttempts = 0;
        return client;
      }
    }
  };

  // Test the connection immediately (but don't await it)
  testConnection().catch(e => {
    console.error('Background connection test failed:', e);
  });

  return client;
}

// Get Prisma client (singleton pattern)
function getPrismaClient() {
  if (!prismaInstance) {
    // In development, we want to use a global variable
    if (process.env.NODE_ENV === 'development') {
      const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createPrismaClient();
      }
      prismaInstance = globalForPrisma.prisma;
    } else {
      // In production, use a local instance
      prismaInstance = createPrismaClient();
    }
  }
  
  return prismaInstance;
}

export const prisma = getPrismaClient();

// Ensure connections are closed properly
if (process.env.NODE_ENV !== 'development') {
  process.on('beforeExit', async () => {
    // Ensure database connections are closed
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      console.log('Prisma client disconnected');
    }
  });
} 