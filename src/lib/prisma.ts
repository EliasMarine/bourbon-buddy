import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Type for the global Prisma instance using recommended namespaced approach
const globalForPrisma = globalThis as unknown as {
  __PRISMA__: PrismaClient | undefined
};

// Identify the runtime environment
const isServerless = process.env.VERCEL || process.env.VERCEL_ENV;
const isDev = process.env.NODE_ENV === 'development';

// Validate DATABASE_URL to ensure it's properly set
function validateDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Check if the URL contains placeholder text
  if (url.includes('username:password') || url.includes('your-database-url')) {
    throw new Error('DATABASE_URL contains placeholder values. Please set a real database URL.');
  }
  
  // Check if we're accidentally using the default placeholder pooler URL from Supabase
  if (url.includes('aws-0-us-west-1.pooler.supabase.com') && 
      (url.includes('postgres://postgres:postgres@') || url.includes('default_password'))) {
    throw new Error('DATABASE_URL using default Supabase pooler URL. Please set the correct database URL.');
  }
}

// Create and configure a PrismaClient instance
function createPrismaClient(): PrismaClient {
  // Check for existing instance in development mode
  if (isDev && globalForPrisma.__PRISMA__) {
    console.log('Using existing Prisma client from global cache');
    return globalForPrisma.__PRISMA__;
  }

  // First validate the database URL (will throw if invalid)
  validateDatabaseUrl();
  
  // Create the client with minimal configuration
  const prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Save prisma client to global object in development
  if (isDev) {
    globalForPrisma.__PRISMA__ = prismaClient;
  }

  return prismaClient;
}

// Export the singleton Prisma client
export const prisma = createPrismaClient();

// Export function to access the Prisma client singleton
export function getPrismaClient(): PrismaClient {
  return prisma;
}

// Function to disconnect all Prisma instances to fix "prepared statement already exists" errors
export async function disconnectAllPrismaInstances(): Promise<void> {
  try {
    if (globalForPrisma.__PRISMA__) {
      await globalForPrisma.__PRISMA__.$disconnect();
      console.log('Disconnected global Prisma instance');
    }
    
    // Also explicitly disconnect the main instance if different
    if (prisma !== globalForPrisma.__PRISMA__) {
      await prisma.$disconnect();
      console.log('Disconnected main Prisma instance');
    }
  } catch (error) {
    console.error('Error disconnecting Prisma instances:', error);
    // Don't throw the error to avoid breaking the caller
  }
}

// Set up cleanup handlers for server environments
if (typeof window === 'undefined') {
  // Handle process termination events
  process.on('SIGINT', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected (SIGINT)');
    } catch (err) {
      console.warn('Error during Prisma disconnect on SIGINT:', err);
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma client disconnected (SIGTERM)');
    } catch (err) {
      console.warn('Error during Prisma disconnect on SIGTERM:', err);
    }
    process.exit(0);
  });
}

// Add a fallback mode that returns mock data when database is unreachable
let IS_DB_REACHABLE = true;
let DB_CONNECTION_TESTED = false;

// Update the isDatabaseConnected function to cache results
export async function isDatabaseConnected(): Promise<boolean> {
  // If we've already tested, return the cached result
  if (DB_CONNECTION_TESTED) {
    return IS_DB_REACHABLE;
  }
  
  try {
    await prisma.$queryRaw`SELECT 1 as connection_test`;
    IS_DB_REACHABLE = true;
    DB_CONNECTION_TESTED = true;
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    // Cache the negative result
    IS_DB_REACHABLE = false;
    DB_CONNECTION_TESTED = true;
    
    // Check for prepared statement errors (PostgreSQL error code 42P05)
    if (error instanceof Error && 
        (error.message.includes('prepared statement') || 
        error.message.includes('42P05'))) {
      console.error('Prepared statement error detected, connection needs reset');
      
      // Here we would reconnect, but for now just log
      try {
        await prisma.$disconnect();
        console.log('Disconnected Prisma client after prepared statement error');
      } catch (disconnectError) {
        console.error('Error during disconnect after prepared statement issue:', disconnectError);
      }
    }
    
    return false;
  }
}

// Connect function for explicit connection
export async function connectPrisma(): Promise<void> {
  if (typeof window !== 'undefined') return;
  
  try {
    await prisma.$connect();
    console.log('Prisma client connected explicitly');
  } catch (error) {
    console.error('Failed to connect Prisma client:', error);
    throw error;
  }
} 