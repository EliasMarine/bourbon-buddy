import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// We need to create our own version of the prisma utilities for this test
// since we can't directly import from src/lib in a script

// Create a singleton PrismaClient instance
let prisma: PrismaClient

// Connection state tracking
let isConnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 3

// Create prisma with logging in development
const createPrismaClient = () => {
  return new PrismaClient({
    log: ['error', 'warn'], // Always log errors in test script
  })
}

prisma = createPrismaClient()

/**
 * Reset the Prisma client completely
 */
async function resetPrismaClient() {
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
    prisma = createPrismaClient()
    
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
async function safePrismaQuery<T>(queryFn: () => Promise<T>): Promise<T> {
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

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from ${envLocalPath}`)
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found, using default .env')
  dotenv.config()
}

async function testConnection() {
  console.log('🔍 Testing Prisma Database Connection')
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:.+@/, ':****@')) // Hide credentials
  
  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...')
    await safePrismaQuery(async () => {
      return await prisma.$queryRaw`SELECT 1 as result`
    })
    console.log('✅ Basic connection successful')
    
    // Test query with parameters
    console.log('2️⃣ Testing parameterized query...')
    const testResult = await safePrismaQuery(async () => {
      return await prisma.$queryRaw`SELECT $1::text as param_test, $2::int as number_test`, 'test-string', 42
    })
    console.log('✅ Parameterized query successful:', testResult)
    
    // Test user table query
    console.log('3️⃣ Testing user table query...')
    const userCount = await safePrismaQuery(async () => {
      return await prisma.user.count()
    })
    console.log(`✅ User table query successful. Found ${userCount} users.`)
    
    // Test a more complex query
    console.log('4️⃣ Testing complex join query...')
    const testJoin = await safePrismaQuery(async () => {
      // Get first user with their sessions if available
      return await prisma.user.findFirst({
        include: {
          sessions: true,
        },
        take: 1,
      })
    })
    console.log('✅ Complex join query successful')
    if (testJoin) {
      console.log(`- Found user: ${testJoin.name || testJoin.email || 'Anonymous'}`)
      console.log(`- User has ${testJoin.sessions.length} sessions`)
    } else {
      console.log('- No users found in database')
    }
    
    // Test prepared statement handling
    console.log('5️⃣ Testing prepared statement handling...')
    // Run the same query multiple times to verify prepared statements work
    for (let i = 0; i < 3; i++) {
      await safePrismaQuery(async () => {
        return await prisma.user.findFirst({ where: { id: 'test-' + i } })
      })
    }
    console.log('✅ Prepared statement handling successful')
    
    // Success!
    console.log('\n🎉 All database tests passed successfully!\n')
    
  } catch (error) {
    console.error('\n❌ Database connection test failed:')
    console.error(error)
    
    console.log('\n🔄 Attempting to reset Prisma client...')
    try {
      // Use the resetPrismaClient function from prisma-fix
      await resetPrismaClient()
      console.log('✅ Prisma client reset successful')
      
      // Try basic query again
      console.log('🔄 Retrying basic query...')
      await prisma.$queryRaw`SELECT 1 as result`
      console.log('✅ Basic query successful after reset')
    } catch (resetError) {
      console.error('❌ Failed to reset Prisma client:', resetError)
    }
  } finally {
    // Always disconnect when done
    console.log('👋 Disconnecting from database...')
    await prisma.$disconnect()
    console.log('✅ Disconnected')
  }
}

console.log('🚀 Starting Prisma connection test...')
testConnection()
  .then(() => {
    console.log('🏁 Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }) 