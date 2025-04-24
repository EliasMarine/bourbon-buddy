/**
 * Prisma Transaction Fix
 * 
 * This utility implements a more robust transaction handler for Prisma
 * that works around the "prepared statement s0 already exists" error.
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Maximum number of retries for a transaction before giving up
 */
const MAX_RETRIES = 3;

/**
 * Run a transaction with built-in retry logic for handling prepared statement errors
 * 
 * @param fn The transaction function to execute
 * @returns The result of the transaction
 */
export async function runTransaction<T>(
  fn: (prisma: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let attempts = 0;
  let lastError: any;

  while (attempts < MAX_RETRIES) {
    attempts++;
    
    try {
      // Before attempting the transaction, try to deallocate all prepared statements
      if (attempts > 1) {
        try {
          await prisma.$executeRaw`DEALLOCATE ALL`;
          console.log(`🧹 [Attempt ${attempts}] Cleared prepared statements before transaction`);
        } catch (deallocError) {
          // Ignore errors from deallocate, this is expected sometimes
        }
      }
      
      // Run the transaction with a short timeout to avoid long-running transactions
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5000, // 5s max wait time
        timeout: 10000, // 10s timeout
      });
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a prepared statement error
      const isPreparedStatementError = 
        (error?.message?.includes('prepared statement') || 
        error?.code === '42P05' || 
        error?.message?.includes('statement "s0" already exists')) &&
        attempts < MAX_RETRIES;
      
      if (isPreparedStatementError) {
        console.log(`⚠️ [Attempt ${attempts}] Prepared statement error, reconnecting and retrying...`);
        
        // Try to fix the connection before retrying
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Increasingly longer waits
          await prisma.$connect();
          console.log(`✅ [Attempt ${attempts}] Reconnected to database`);
          
          // Try to deallocate everything again
          try {
            await prisma.$executeRaw`DEALLOCATE ALL`;
          } catch {}
          
          // Continue to the next attempt
          continue;
        } catch (reconnectError) {
          console.error(`❌ [Attempt ${attempts}] Failed to reconnect:`, reconnectError);
        }
      }
      
      // For other errors or if we've exhausted retries, rethrow
      throw error;
    }
  }
  
  // If we get here, we've exhausted all retries
  throw lastError;
}

/**
 * A more reliable version of prisma.create that handles prepared statement errors
 */
export async function createVideoSafely(data: any) {
  return runTransaction(async (tx) => {
    // Create the video using the transaction client with a type assertion
    return (tx as any).video.create({
      data
    });
  });
} 