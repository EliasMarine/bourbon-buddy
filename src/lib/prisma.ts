import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Connection management
let prismaInstance: PrismaClient | undefined;

// Initialize Prisma client with connection retry logic
function createPrismaClient() {
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
        
        // Force reconnect on next request
        prismaInstance = undefined;
      }
      
      throw error;
    }
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
  process.on('beforeExit', () => {
    // Ensure database connections are closed
    if (prismaInstance) {
      prismaInstance.$disconnect();
    }
  });
} 