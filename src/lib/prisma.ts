import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// For serverless environments, create a new PrismaClient for each request
// to avoid prepared statement conflicts
let prismaInstanceCounter = 0;
const prismaInstances = new Map<number, PrismaClient>();

// Define event types for Prisma
type QueryEvent = {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
};

type LogEvent = {
  message: string;
  timestamp: Date;
  target: string;
  level: 'info' | 'warn' | 'error';
};

// Error event from Prisma
interface ErrorEvent {
  message: string;
  timestamp: Date;
  target: string;
  code?: string;
}

// Get Prisma client based on environment
export function getPrismaClient(): PrismaClient {
  // In development, use globalThis to avoid excessive connections
  if (process.env.NODE_ENV === 'development') {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        log: ['query', 'error', 'warn']
      });
    }
    return globalForPrisma.prisma;
  }

  // In Vercel serverless environment, create a new client for each request
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    // Increment counter to get a unique instance ID
    prismaInstanceCounter++;
    const instanceId = prismaInstanceCounter;
    
    // Create a new client instance
    const prisma = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    // Store in map to manage cleanup later
    prismaInstances.set(instanceId, prisma);
    
    // Set up connection error handling and cleanup
    // @ts-ignore: Prisma event types are not fully defined in TypeScript
    prisma.$on('query', (e: QueryEvent) => {
      if (e.duration > 2000) {
        console.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    });
    
    // @ts-ignore: Prisma event types are not fully defined in TypeScript
    prisma.$on('error', (e: ErrorEvent) => {
      console.error('Prisma Client Error:', e);
      
      // Handle prepared statement errors specifically
      if (e.message && (
        e.message.includes('prepared statement') || 
        e.code === 'P2010'
      )) {
        console.error('Prepared statement error detected, cleaning up connection');
        
        // Clean up this instance
        try {
          prisma.$disconnect();
          prismaInstances.delete(instanceId);
        } catch (error) {
          console.error('Error while disconnecting Prisma client:', error);
        }
      }
    });
    
    return prisma;
  }
  
  // For other environments (non-serverless production), use a singleton
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['error']
    });
  }
  return globalForPrisma.prisma;
}

// Export the prisma client
export const prisma = getPrismaClient();

// Helper function to clean up all Prisma instances
export async function disconnectAllPrismaInstances() {
  console.log(`Disconnecting ${prismaInstances.size} Prisma clients`);
  
  // Use Array.from to convert Map entries to array before iterating
  const entries = Array.from(prismaInstances.entries());
  for (const [id, client] of entries) {
    try {
      await client.$disconnect();
      console.log(`Disconnected Prisma client #${id}`);
    } catch (error) {
      console.error(`Failed to disconnect Prisma client #${id}:`, error);
    }
    prismaInstances.delete(id);
  }
}

// Set up cleanup handlers for serverless environment
if (typeof window === 'undefined') {
  // Clean up before the process exits
  process.on('beforeExit', async () => {
    await disconnectAllPrismaInstances();
  });
  
  // Handle SIGINT (e.g., when running locally and pressing Ctrl+C)
  process.on('SIGINT', async () => {
    await disconnectAllPrismaInstances();
    process.exit(0);
  });
  
  // Handle SIGTERM (e.g., when Vercel terminates the function)
  process.on('SIGTERM', async () => {
    await disconnectAllPrismaInstances();
    process.exit(0);
  });
}

// Status check function that can be used by health checks
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    return true;
  } catch (e) {
    console.error('Database connection check failed:', e);
    return false;
  }
}

// Explicit connect function for use in server code
export async function connectPrisma() {
  if (typeof window !== 'undefined') return;
  
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
} 