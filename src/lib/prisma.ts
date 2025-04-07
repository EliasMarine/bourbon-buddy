import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Connection management
let prismaInstance: PrismaClient | undefined;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

// Cache of PrismaClient instances
const prismaClientCache = new Map<string, PrismaClient>();
let currentClientId = 0;

// Initialize Prisma client with connection retry logic
function createPrismaClient() {
  console.log('Creating new Prisma client instance');
  currentClientId++;
  const clientId = `client_${currentClientId}`;
  
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

  // Store in cache
  prismaClientCache.set(clientId, client);

  // Enhanced error handling middleware
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error: any) {
      // Log database errors
      console.error(`Prisma Error: ${params.model}.${params.action}`, error);
      
      // Handle specific PostgreSQL errors
      if (
        error?.code === 'P2010' || 
        error?.message?.includes('prepared statement') || 
        (error?.meta?.cause && error?.meta?.cause.includes('prepared statement'))
      ) {
        console.warn('Detected prepared statement conflict, reconnecting...');
        
        // Disconnect this client
        try {
          await client.$disconnect();
        } catch (e) {
          console.error('Failed to disconnect client:', e);
        }
        
        // Remove from cache and force creation of a new client
        prismaClientCache.delete(clientId);
        prismaInstance = undefined;
        connectionAttempts = 0;
        
        // Create a new client for the next operation
        getPrismaClient();
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
    } catch (e: any) {
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

// Get Prisma client (singleton pattern with reconnection logic)
function getPrismaClient() {
  if (!prismaInstance) {
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

// Cleanup function to disconnect all clients
async function disconnectAllClients() {
  console.log(`Disconnecting ${prismaClientCache.size} Prisma clients`);
  
  // Use Array.from to convert Map entries to an array before iterating
  for (const [id, client] of Array.from(prismaClientCache.entries())) {
    try {
      await client.$disconnect();
      console.log(`Disconnected client ${id}`);
    } catch (e) {
      console.error(`Failed to disconnect client ${id}:`, e);
    }
  }
  
  prismaClientCache.clear();
  prismaInstance = undefined;
}

export const prisma = getPrismaClient();

// Handle build-time disconnection
// This ensures connections are properly closed during SSG/ISR
if (typeof window === 'undefined') {
  // For Next.js build-time (server-side)
  process.on('beforeExit', async () => {
    await disconnectAllClients();
  });
  
  // Also handle SIGINT and SIGTERM
  process.on('SIGINT', async () => {
    await disconnectAllClients();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await disconnectAllClients();
    process.exit(0);
  });
} 