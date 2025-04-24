import { PrismaClient } from '@prisma/client'

// Create a singleton PrismaClient instance
let prisma: PrismaClient

// Connection state tracking
let isConnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 3

// Create prisma with logging in development
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  // In development, use a global variable to avoid multiple instances during hot reloading
  if (!(global as any).prisma) {
    (global as any).prisma = createPrismaClient()
  }
  prisma = (global as any).prisma
}

/**
 * Reset the Prisma client completely
 */
export async function resetPrismaClient() {
  if (isConnecting) return // Prevent multiple simultaneous reset attempts
  
  isConnecting = true
  
  try {
    // Try to deallocate prepared statements
    try {
      await (prisma as any).$executeRaw`DEALLOCATE ALL`
    } catch (e) {
      // Ignore errors here, as the connection might already be broken
    }
    
    // Disconnect fully
    try {
      await prisma.$disconnect()
    } catch (e) {
      // Ignore errors here too
    }
    
    // Create a fresh instance
    if (process.env.NODE_ENV === 'production') {
      prisma = createPrismaClient()
    } else {
      (global as any).prisma = createPrismaClient()
      prisma = (global as any).prisma
    }
    
    // Verify connection
    await prisma.$connect()
    await prisma.$executeRaw`SELECT 1`
    
    // Reset counters on successful connection
    reconnectAttempts = 0
    console.log('Successfully reset Prisma client and database connection')
  } catch (error) {
    console.error('Failed to reset Prisma client:', error)
    throw error
  } finally {
    isConnecting = false
  }
}

/**
 * Executes a Prisma query with automatic retry for connection errors
 * @param queryFn A function that executes a Prisma query
 * @returns The result of the query
 */
export async function safePrismaQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    // First attempt
    return await queryFn()
  } catch (error) {
    // Error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Check for various database connection issues
    const isPreparedStatementError = 
      errorMessage.includes('prepared statement') && 
      (errorMessage.includes('already exists') || errorMessage.includes('does not exist'))
    
    const isConnectionError = 
      isPreparedStatementError || 
      errorMessage.includes('Connection') || 
      errorMessage.includes('could not connect') ||
      errorMessage.includes('bind message supplies')
    
    if (isConnectionError && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++
      console.warn(`Database connection error detected, attempting reset (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
      
      try {
        await resetPrismaClient()
        console.log('Database connection reset, retrying operation')
        
        // Retry the query
        return await queryFn()
      } catch (retryError) {
        console.error('Error during retry after reconnection:', retryError)
        throw retryError
      }
    }
    
    // If we've exceeded retry attempts or it's not a connection error, rethrow
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`)
      // Reset counter for future operations
      reconnectAttempts = 0
    }
    
    throw error
  }
}

export { prisma } 