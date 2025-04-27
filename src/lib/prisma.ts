import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Type for the global Prisma instance using recommended namespaced approach
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Identify the runtime environment
const isServerless = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
const isDev = process.env.NODE_ENV === 'development';

// Validate DATABASE_URL to ensure it's properly set
function validateDatabaseUrl(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  if (url.includes('username:password') || url.includes('your-database-url')) {
    throw new Error('DATABASE_URL contains placeholder values. Please set a real database URL.');
  }
}

validateDatabaseUrl();

export const prisma =
  isServerless
    ? new PrismaClient()
    : globalForPrisma.prisma ?? new PrismaClient();

if (!isServerless && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Optional: Add a simple health check in dev only
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      // console.log('✅ Prisma health check passed');
    } catch (e) {
      console.error('❌ Prisma health check failed:', e);
    }
  }, 5 * 60 * 1000);
}

// Export function to access the Prisma client singleton
export function getPrismaClient(): PrismaClient {
  return prisma;
}

// Function to disconnect all Prisma instances to fix "prepared statement already exists" errors
export async function disconnectAllPrismaInstances(): Promise<void> {
  try {
    // In development, try to clear the global instance first
    if (process.env.NODE_ENV === 'development' && globalForPrisma.prisma) {
      try {
        await globalForPrisma.prisma.$disconnect();
        console.log('Disconnected global Prisma instance');
        
        // Clear it from global to force a fresh connection on next use
        globalForPrisma.prisma = undefined;
      } catch (globalError) {
        console.warn('Error disconnecting global Prisma instance:', globalError);
      }
    }
    
    // Also explicitly disconnect the main instance if different
    if (prisma && prisma !== globalForPrisma.prisma) {
      try {
        await prisma.$disconnect();
        console.log('Disconnected main Prisma instance');
      } catch (mainError) {
        console.warn('Error disconnecting main Prisma instance:', mainError);
      }
    }
    
    // Optional: add a small delay to ensure connections have time to close
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.error('Error in disconnectAllPrismaInstances:', error);
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

// Update the isDatabaseConnected function to handle connection issues
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    // Instead of a raw query which can cause prepared statement issues,
    // use a simple client query that's less likely to conflict
    await prisma.user.findFirst({
      select: { id: true },
      take: 1
    });
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    
    // Try to recover from connection issues with a more robust approach
    try {
      // Force a complete disconnect
      await prisma.$disconnect();
      
      // Wait a small delay to ensure connection pool is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reconnect
      await prisma.$connect();
      
      // Test with a simple query again
      try {
        await prisma.user.findFirst({
          select: { id: true },
          take: 1
        });
        console.log('Database reconnection successful');
        return true;
      } catch (secondAttemptError) {
        console.error('Second query attempt failed after reconnect:', secondAttemptError);
        return false;
      }
    } catch (reconnectError) {
      console.error('Failed to reconnect to database:', reconnectError);
      return false;
    }
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

// Enhanced function to force reconnection with improved error handling
export async function reconnectPrisma(): Promise<boolean> {
  console.log('🔄 Forcing Prisma reconnection to resolve connection issues...');
  
  try {
    // First disconnect
    await prisma.$disconnect();
    console.log('✅ Disconnected from database');
    
    // Clear the global instance in development
    if (process.env.NODE_ENV === 'development' && globalForPrisma.prisma) {
      globalForPrisma.prisma = undefined;
      console.log('✅ Cleared global Prisma instance');
    }
    
    // Wait longer to ensure all connections are properly closed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a new connection
    await prisma.$connect();
    console.log('✅ Successfully reconnected to database');
    
    // Test the new connection with a simple query
    await prisma.user.findFirst({
      select: { id: true },
      take: 1,
      orderBy: { id: 'asc' }
    });
    
    console.log('✅ Database query test successful');
    return true;
  } catch (error) {
    console.error('❌ Failed to reconnect to database:', error);
    return false;
  }
}

// Set up a periodic health check in development to catch issues early
if (isDev && typeof window === 'undefined') {
  // Check database connection every 5 minutes in development
  const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  let healthCheckInterval: NodeJS.Timeout | null = null;

  const setupHealthCheck = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    
    healthCheckInterval = setInterval(async () => {
      try {
        // Simple health check query
        await prisma.user.findFirst({
          select: { id: true },
          take: 1
        });
        console.log('✅ Database health check passed');
      } catch (error) {
        console.error('❌ Database health check failed:', error);
        
        // Try to reconnect
        const reconnected = await reconnectPrisma();
        if (!reconnected) {
          console.error('❌ Failed to automatically recover database connection');
        }
      }
    }, HEALTH_CHECK_INTERVAL);
    
    // Ensure the interval is cleared when the process exits
    process.on('beforeExit', () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    });
  };
  
  // Start health check after a delay to ensure initial setup is complete
  setTimeout(setupHealthCheck, 30000);
} 