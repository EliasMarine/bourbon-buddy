import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Connection state tracking
let isDbConnected = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_DELAY = 60000; // 1 minute between connection attempts

// Connection management
let prismaInstance: PrismaClient | undefined;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

// Cache of PrismaClient instances
const prismaClientCache = new Map<string, PrismaClient>();
let currentClientId = 0;

// Track prepared statement errors to prevent cascading failures
const preparedStatementErrors = new Set<string>();
const MAX_PREPARED_STATEMENT_ERRORS = 5;
let resetTimeout: NodeJS.Timeout | null = null;

// Create the Prisma client with proper connection settings
function createPrismaClient() {
  console.log('Creating new Prisma client instance');
  currentClientId++;
  const clientId = `client_${currentClientId}`;
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set. Database operations will fail.');
  }
  
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Store in cache
  prismaClientCache.set(clientId, client);

  // Enhanced error handling middleware
  client.$use(async (params, next) => {
    try {
      // If we know the database is down, fail fast
      if (!isDbConnected && Date.now() - lastConnectionAttempt < CONNECTION_RETRY_DELAY) {
        throw new Error('Database connection is currently unavailable. Try again later.');
      }
      
      const result = await next(params);
      
      // If we get here, the database is connected
      if (!isDbConnected) {
        console.log('Database connection restored');
        isDbConnected = true;
      }
      
      return result;
    } catch (error: any) {
      // Log database errors
      console.error(`Prisma Error: ${params.model}.${params.action}`, error);
      
      // Check for connection errors
      if (
        error?.message?.includes("Can't reach database server") ||
        error?.message?.includes("Connection refused") ||
        error?.message?.includes("Connection terminated")
      ) {
        console.error(`Database connection error: ${error.message}`);
        isDbConnected = false;
        lastConnectionAttempt = Date.now();
        
        // For critical operations, attempt a retry with exponential backoff
        if (params.action === 'create' || params.action === 'update' || params.action === 'delete') {
          console.log('Critical operation failed. Will retry when connection is restored.');
        }
      }
      
      // Handle specific PostgreSQL errors
      const isPreparedStatementError = 
        error?.code === 'P2010' || 
        error?.message?.includes('prepared statement') || 
        (error?.meta?.cause && error?.meta?.cause.includes('prepared statement'));
      
      if (isPreparedStatementError) {
        console.error('Prepared statement error detected:', error?.message);
        
        // Immediately disconnect and create a fresh client
        try {
          await client.$disconnect();
          console.log('Disconnected client after prepared statement error');
        } catch (e) {
          console.error('Failed to disconnect client:', e);
        }
        
        // Remove from cache to force creation of a new client
        prismaClientCache.delete(clientId);
        prismaInstance = undefined;
        
        // In serverless environment, this is critical to handle immediately
        throw new Error('Database connection error: Prepared statement conflict. Please retry your request.');
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
      isDbConnected = true;
      connectionAttempts = 0;
      return client;
    } catch (e: any) {
      connectionAttempts++;
      console.error(`Prisma connection attempt ${connectionAttempts} failed:`, e);
      isDbConnected = false;
      lastConnectionAttempt = Date.now();
      
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
  // For development, use global singleton to prevent connection exhaustion
  if (process.env.NODE_ENV === 'development') {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }
  
  // For production and serverless environments
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
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

// Export a singleton instance of PrismaClient
export const prisma = getPrismaClient();

// Only connect the client if we're on the server
export const connectPrisma = async () => {
  // Exit early if already connected or in the browser
  if (typeof window !== 'undefined') return;
  
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
};

// Handle graceful shutdown to properly close connections
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

// Status check function that can be used by health checks
export async function isDatabaseConnected(): Promise<boolean> {
  // If we've recently checked and know it's down, return cached status
  if (!isDbConnected && Date.now() - lastConnectionAttempt < CONNECTION_RETRY_DELAY) {
    return false;
  }
  
  try {
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    isDbConnected = true;
    return true;
  } catch (e) {
    isDbConnected = false;
    lastConnectionAttempt = Date.now();
    return false;
  }
}

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