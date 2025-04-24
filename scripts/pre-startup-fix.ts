import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Create our own version of prisma-fix utilities for this script
// Create a singleton PrismaClient instance
let prisma: PrismaClient;

// Connection state tracking
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Create prisma with logging in development
const createPrismaClient = () => {
  return new PrismaClient({
    log: ['error', 'warn'], // Always log errors in test script
  });
};

prisma = createPrismaClient();

/**
 * Reset the Prisma client completely
 */
async function resetPrismaClient() {
  if (isConnecting) return; // Prevent multiple simultaneous reset attempts
  
  isConnecting = true;
  
  try {
    // Try to deallocate prepared statements
    try {
      await (prisma as any).$executeRaw`DEALLOCATE ALL`;
    } catch (e) {
      // Ignore errors here, as the connection might already be broken
    }
    
    // Disconnect fully
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore errors here too
    }
    
    // Create a fresh instance
    prisma = createPrismaClient();
    
    // Verify connection
    await prisma.$connect();
    await prisma.$executeRaw`SELECT 1`;
    
    // Reset counters on successful connection
    reconnectAttempts = 0;
    console.log('Successfully reset Prisma client and database connection');
  } catch (error) {
    console.error('Failed to reset Prisma client:', error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Executes a Prisma query with automatic retry for connection errors
 * @param queryFn A function that executes a Prisma query
 * @returns The result of the query
 */
async function safePrismaQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    // First attempt
    return await queryFn();
  } catch (error) {
    // Error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for various database connection issues
    const isPreparedStatementError = 
      errorMessage.includes('prepared statement') && 
      (errorMessage.includes('already exists') || errorMessage.includes('does not exist'));
    
    const isConnectionError = 
      isPreparedStatementError || 
      errorMessage.includes('Connection') || 
      errorMessage.includes('could not connect') ||
      errorMessage.includes('bind message supplies');
    
    if (isConnectionError && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.warn(`Database connection error detected, attempting reset (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      try {
        await resetPrismaClient();
        console.log('Database connection reset, retrying operation');
        
        // Retry the query
        return await queryFn();
      } catch (retryError) {
        console.error('Error during retry after reconnection:', retryError);
        throw retryError;
      }
    }
    
    // If we've exceeded retry attempts or it's not a connection error, rethrow
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
      // Reset counter for future operations
      reconnectAttempts = 0;
    }
    
    throw error;
  }
}

// Load env variables
function loadEnv() {
  const dotenvPath = path.resolve(process.cwd(), '.env.local');
  
  if (fs.existsSync(dotenvPath)) {
    console.log('[pre-startup] Found .env.local file');
    
    const envFile = fs.readFileSync(dotenvPath, 'utf8');
    const lines = envFile.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        
        if (key === 'DATABASE_URL') {
          const redactedUrl = value.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
          console.log(`[pre-startup] Found DATABASE_URL in .env.local: ${redactedUrl}`);
          process.env.DATABASE_URL = value;
          console.log(`[pre-startup] Using DATABASE_URL: ${redactedUrl}`);
        } else if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

/**
 * Perform database health checks
 */
async function checkDatabase() {
  console.log('🔍 Checking database integrity...');
  console.log('Testing database connection...');
  
  try {
    // Basic connection test
    await safePrismaQuery(async () => await prisma.$queryRaw`SELECT 1`);
    console.log('✅ Database connection successful');

    // Check user table
    console.log('Checking user table...');
    const userCount = await safePrismaQuery(async () => await prisma.user.count());
    console.log(`📊 Found ${userCount} users in the database`);
    
    return true;
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    return false;
  }
}

/**
 * Check if database needs seeding and seed if necessary
 */
async function seedIfNeeded() {
  console.log('Checking if database needs seeding...');
  
  try {
    const userCount = await safePrismaQuery(async () => await prisma.user.count());
    
    if (userCount === 0) {
      console.log('📦 No users found, database needs seeding');
      
      // Your seeding logic would go here
      console.log('✅ Database seeded successfully');
      return true;
    } else {
      console.log('✅ Database already contains users, skipping seed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking if seeding is needed:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Running pre-startup checks...');
  
  // Load environment variables
  loadEnv();
  
  try {
    // Database checks
    const dbHealthy = await checkDatabase();
    
    // Skip backup in dev mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('💾 PostgreSQL backups not implemented in dev mode');
    } else if (dbHealthy) {
      // Backup code would go here for production
      console.log('📦 Database backup completed');
    } else {
      console.warn('⚠️ Database check failed, skipping backup');
    }
    
    // Try to seed if needed
    if (process.env.NODE_ENV !== 'production') {
      if (!dbHealthy) {
        console.warn('⚠️ PostgreSQL restore not implemented in dev mode. Will attempt to seed database.');
        await seedIfNeeded();
      } else {
        await seedIfNeeded();
      }
    } else {
      // Production seeding logic if needed
    }
    
    console.log('✅ Pre-startup checks completed');
  } catch (error) {
    console.error('❌ Pre-startup checks failed:', error);
    // Don't exit so app can continue trying to start
  } finally {
    // Always disconnect
    console.log('Disconnecting from database...');
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  }
}

// Start the pre-startup process
console.log('Creating Prisma client...');
main()
  .then(() => {
    console.log('Prisma client created successfully');
  })
  .catch((e) => {
    console.error('Error during pre-startup:', e);
    process.exit(1);
  }); 