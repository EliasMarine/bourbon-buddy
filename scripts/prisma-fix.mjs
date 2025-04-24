import { PrismaClient } from '@prisma/client';

// Create a singleton PrismaClient instance
const prisma = new PrismaClient();

/**
 * Executes a Prisma query with automatic retry for the "prepared statement already exists" error
 * @param {Function} queryFn A function that executes a Prisma query
 * @returns {Promise<any>} The result of the query
 */
async function safePrismaQuery(queryFn) {
  try {
    // First attempt
    return await queryFn();
  } catch (error) {
    // Check if it's a "prepared statement already exists" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('prepared statement') && errorMessage.includes('already exists')) {
      console.warn('Encountered prepared statement error, attempting to deallocate and retry');
      
      try {
        // Attempt to deallocate all prepared statements
        await prisma.$executeRaw`DEALLOCATE ALL`;
        console.log('Successfully deallocated prepared statements');
      } catch (deallocError) {
        console.error('Failed to deallocate prepared statements:', deallocError);
      }
      
      try {
        // Disconnect and reconnect to clear the connection
        await prisma.$disconnect();
        console.log('Disconnected Prisma client');
        
        // Reconnect
        await prisma.$connect();
        console.log('Reconnected Prisma client');
        
        // Retry the query
        return await queryFn();
      } catch (retryError) {
        console.error('Error during retry after reconnection:', retryError);
        throw retryError;
      }
    }
    
    // If it's not a prepared statement error, or retry failed, rethrow
    throw error;
  }
}

export { prisma, safePrismaQuery }; 