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
  const isDev = process.env.NODE_ENV === 'development';
  
  // In production, we need a real database URL
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Check if the URL contains placeholder text
  const hasPlaceholders = url.includes('username:password') || url.includes('your-database-url');
  
  // Allow placeholder URLs in development for testing authentication flows
  if (hasPlaceholders) {
    if (isProd) {
      throw new Error('DATABASE_URL contains placeholder values. Please set a real database URL.');
    } else {
      console.warn('⚠️ DATABASE_URL contains placeholder values. Some features will not work.');
      console.warn('👉 This is allowed in development mode for testing authentication.');
      // Continue anyway in development
      return;
    }
  }
  
  // Check if we're accidentally using the default placeholder pooler URL from Supabase
  if (url.includes('aws-0-us-west-1.pooler.supabase.com') && 
      (url.includes('postgres://postgres:postgres@') || url.includes('default_password'))) {
    if (isProd) {
      throw new Error('DATABASE_URL using default Supabase pooler URL. Please set the correct database URL.');
    } else {
      console.warn('⚠️ DATABASE_URL uses default Supabase pooler URL. Some features will not work.');
      // Continue anyway in development
    }
  }
}

// Create and configure a PrismaClient instance with improved connection handling
function createPrismaClient(): PrismaClient {
  // Check for existing instance in development mode
  if (isDev && globalForPrisma.__PRISMA__) {
    return globalForPrisma.__PRISMA__;
  }

  // First validate the database URL (will throw if invalid)
  validateDatabaseUrl();
  
  // Create the client with improved connection handling for serverless environments
  const prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Add logs in development
    log: isDev ? ['query', 'error', 'warn'] : ['error'],
  });

  // Clear existing prepared statements on connection to prevent conflicts
  if (typeof window === 'undefined') {
    prismaClient.$use(async (params, next) => {
      if (params.action === 'findFirst' && 
          params.model === 'User' && 
          Object.keys(params.args || {}).length === 0) {
        // This is likely a connection test, let's handle it directly
        try {
          // Use raw query to deallocate prepared statements to prevent 42P05 errors
          await prismaClient.$executeRaw`DEALLOCATE ALL`;
          console.log('🧹 Cleared existing prepared statements');
        } catch (deallocError) {
          // Ignore errors during deallocate, this is just a preemptive cleanup
          console.log('Note: Could not clear prepared statements (this is normal for first connection)');
        }
      }
      return next(params);
    });
  }

  // Create connection validator interval
  let isCheckingConnection = false; 
  const connectionCheckInterval = isDev ? 30000 : 120000; // 30s in dev, 2min in prod
  
  if (typeof window === 'undefined') {
    // Only run on server side
    setInterval(async () => {
      // Prevent concurrent checks
      if (isCheckingConnection) return;
      
      try {
        isCheckingConnection = true;
        await prismaClient.$queryRaw`SELECT 1`;
        isCheckingConnection = false;
      } catch (e) {
        isCheckingConnection = false;
        console.error('Connection check failed, reconnecting Prisma client...');
        try {
          await prismaClient.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prismaClient.$connect();
        } catch (reconnectError) {
          console.error('Failed to reconnect Prisma client:', reconnectError);
        }
      }
    }, connectionCheckInterval);
  }
  
  // Add an error handler for common connection issues
  // Use a track to avoid recursive reconnection attempts
  let isRecoveringConnection = false;
  
  prismaClient.$use(async (params, next) => {
    try {
      // Simple case - just execute the query
      return await next(params);
    } catch (error: any) {
      // Skip recovery if we're already in the process of recovering
      if (isRecoveringConnection) {
        throw error;
      }
      
      try {
        // Identify connection and statement errors
        const isPreparedStatementError = 
          error?.message?.includes('prepared statement') || 
          error?.code === '42P05' || 
          error?.message?.includes('statement \"s0\" already exists') ||
          error?.code === '26000';
        
        const isConnectionError = 
          error?.message?.includes('connection') ||
          error?.code === 'P2023';
        
        // Only attempt recovery for certain errors
        if (isPreparedStatementError || isConnectionError) {
          console.error(`Prisma error detected: ${error.message}`);
          
          // Prevent recursive recovery attempts
          isRecoveringConnection = true;
          
          console.log('Attempting database reconnection...');
          
          // First try to deallocate all prepared statements if this is a prepared statement error
          if (isPreparedStatementError) {
            try {
              await prismaClient.$executeRaw`DEALLOCATE ALL`;
              console.log('Successfully deallocated prepared statements');
            } catch (deallocError) {
              console.warn('Could not deallocate prepared statements, continuing with reconnection');
            }
          }
          
          // Perform clean disconnection and reconnection
          await prismaClient.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await prismaClient.$connect();
          
          console.log('Database reconnected, retrying operation');
          
          // Clear recovery flag after reconnection
          isRecoveringConnection = false;
          
          // For query retries, use a simpler approach to avoid cascading errors
          if (params.action === 'findMany' || 
              params.action === 'findFirst' || 
              params.action === 'findUnique') {
            // For read operations, retry directly
            return await next(params);
          } else {
            // For write operations, be more cautious
            throw new Error('Database connection recovered, but write operation needs to be retried');
          }
        }
        
        // For other types of errors, just rethrow
        throw error;
      } catch (recoveryError) {
        // Clear the recovery flag to allow future recovery attempts
        isRecoveringConnection = false;
        
        // Prefer the original error for better diagnostics
        throw error;
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
    // In development, try to clear the global instance first
    if (process.env.NODE_ENV === 'development' && globalForPrisma.__PRISMA__) {
      try {
        await globalForPrisma.__PRISMA__.$disconnect();
        console.log('Disconnected global Prisma instance');
        
        // Clear it from global to force a fresh connection on next use
        globalForPrisma.__PRISMA__ = undefined;
      } catch (globalError) {
        console.warn('Error disconnecting global Prisma instance:', globalError);
      }
    }
    
    // Also explicitly disconnect the main instance if different
    if (prisma && prisma !== globalForPrisma.__PRISMA__) {
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
    if (process.env.NODE_ENV === 'development' && globalForPrisma.__PRISMA__) {
      globalForPrisma.__PRISMA__ = undefined;
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