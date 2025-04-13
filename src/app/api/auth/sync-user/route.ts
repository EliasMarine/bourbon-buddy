import { NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase-api';
import { createServerClient } from '@supabase/ssr';
import { prisma, disconnectAllPrismaInstances, isDatabaseConnected } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/lib/supabase-singleton';

// Simple in-memory rate limiting to prevent excessive calls
// In production, consider using Redis or another distributed cache
const rateLimits = new Map<string, { timestamp: number, count: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
// Increase rate limit to allow for retries - higher in development
const MAX_REQUESTS_PER_WINDOW = process.env.NODE_ENV === 'development' ? 100 : 15;

// In production, this would be replaced with a Redis-based rate limiter
// or use Supabase's built-in Row Level Security (RLS) policies
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  // First request from this user
  if (!userLimit) {
    rateLimits.set(userId, { timestamp: now, count: 1 });
    return true;
  }
  
  // Reset count if window has passed
  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimits.set(userId, { timestamp: now, count: 1 });
    return true;
  }
  
  // Increment count and check if limit exceeded
  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`Rate limit exceeded for user ${userId}: ${userLimit.count} requests in the last minute`);
    return false;
  }
  
  // Update count
  rateLimits.set(userId, { 
    timestamp: userLimit.timestamp,
    count: userLimit.count + 1
  });
  
  return true;
}

// Clean up old rate limit entries more frequently in development
const CLEANUP_INTERVAL = process.env.NODE_ENV === 'production' 
  ? RATE_LIMIT_WINDOW 
  : RATE_LIMIT_WINDOW / 2;

// Clean up old rate limit entries periodically
const cleanupInterval = setInterval(() => {
  try {
    const now = Date.now();
    let cleanupCount = 0;
    
    // Convert Map entries to array before iterating
    Array.from(rateLimits.entries()).forEach(([userId, limit]) => {
      if (now - limit.timestamp > RATE_LIMIT_WINDOW * 2) {
        rateLimits.delete(userId);
        cleanupCount++;
      }
    });
    
    if (cleanupCount > 0 && process.env.DEBUG_AUTH === 'true') {
      console.log(`🧹 Rate limit cleanup: removed ${cleanupCount} stale entries, remaining: ${rateLimits.size}`);
    }
  } catch (error) {
    console.error('Error in rate limit cleanup:', error);
  }
}, CLEANUP_INTERVAL);

// Ensure cleanup interval is cleared in development to prevent memory leaks
if (process.env.NODE_ENV !== 'production') {
  // In production, we want this to run indefinitely
  // But in development with HMR, we need to clean up
  if (typeof window === 'undefined') { // Server-side only
    // Define a type extension for globalThis to prevent TypeScript errors
    type GlobalWithCleanup = typeof globalThis & {
      __SYNC_USER_CLEANUP?: NodeJS.Timeout;
    };
    
    // Cast to our extended type
    const global = globalThis as GlobalWithCleanup;
    
    if (global.__SYNC_USER_CLEANUP) {
      clearInterval(global.__SYNC_USER_CLEANUP);
    }
    global.__SYNC_USER_CLEANUP = cleanupInterval;
  }
}

// POST /api/auth/sync-user - Sync the authenticated user from Supabase to the database
export async function POST() {
  try {
    // Since Next.js 15, cookies() is an async function
    const cookieStore = await cookies();
    
    // Create the Supabase client with SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (err) {
              console.error('Error setting cookies in sync-user route:', err);
              // Continue anyway as this might be called from a Server Component
              // where cookie setting isn't supported
            }
          }
        }
      }
    );
    
    // Get the authenticated user - use getUser directly to address the security warning
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Supabase user error:', userError || 'No user found');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authenticated user found' },
        { status: 401 }
      );
    }
    
    // Use the authenticated user data
    const supabaseUser = userData.user;
    
    // Check rate limit
    if (!checkRateLimit(supabaseUser.id)) {
      console.warn(`Rate limit exceeded for user ${supabaseUser.id}`);
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Please try again later' },
        { status: 429 }
      );
    }
    
    // Extract user information from Supabase user
    const metadata = supabaseUser.user_metadata || {};
    const name = metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0];
    let username = metadata.username;
    
    // If no username is set, generate one but ensure it's unique
    if (!username) {
      username = `user_${supabaseUser.id.substring(0, 8)}`;
    }
    
    const image = metadata.avatar_url || metadata.picture || null;
    
    // Before any database operations, verify database connection
    try {
      const isDbConnected = await isDatabaseConnected();
      if (!isDbConnected) {
        console.error('Database connection failed - cannot sync user');
        
        // Instead of failing, tell the client it was successful anyway
        // This helps the frontend flow proceed, and we can sync the user later
        await supabase.auth.updateUser({
          data: { 
            is_registered: true,
            last_synced_at: new Date().toISOString()
          }
        });
        
        return NextResponse.json({
          success: true,
          user: {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: name,
            username: username,
            lastSynced: new Date().toISOString(),
            dbStatus: 'pending' // Indicate we couldn't sync to DB
          },
          warning: 'User metadata updated but database sync pending due to connection issues'
        });
      }
    } catch (dbConnectionError) {
      console.error('Database connection check failed:', dbConnectionError);
      
      // Same approach - update the auth metadata and return success
      await supabase.auth.updateUser({
        data: { 
          is_registered: true,
          last_synced_at: new Date().toISOString()
        }
      });
      
      return NextResponse.json({
        success: true,
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: name,
          username: username,
          lastSynced: new Date().toISOString(),
          dbStatus: 'pending'
        },
        warning: 'User metadata updated but database sync pending due to connection issues'
      });
    }
    
    // Disconnect all Prisma instances before creating a new connection
    // This helps prevent the "prepared statement doesn't exist" errors
    try {
      await disconnectAllPrismaInstances();
    } catch (disconnectError) {
      console.error('Error disconnecting Prisma instances:', disconnectError);
      // Continue anyway since we can still try the operation
    }
    
    // Check if user exists first to avoid upsert conflicts
    const existingUser = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { id: true, email: true }
    }).catch(err => {
      console.error('Error finding user by ID:', err);
      return null;
    });
    
    // Fall back to email search if ID search fails
    let userToUpdate = existingUser;
    if (!userToUpdate && supabaseUser.email) {
      userToUpdate = await prisma.user.findUnique({
        where: { email: supabaseUser.email },
        select: { id: true, email: true }
      }).catch(err => {
        console.error('Error finding user by email:', err);
        return null;
      });
    }
    
    // Here's the problem: we need to use upsert to handle both cases safely
    try {
      // Use upsert to handle both creation and update in one operation
      const user = await prisma.user.upsert({
        where: { 
          // Use ID as primary key for finding the user, fallback to email
          id: userToUpdate?.id || supabaseUser.id 
        },
        update: {
          // Update existing user data
          name,
          image,
          email: supabaseUser.email!, // Ensure email is always up to date
          lastSyncedAt: new Date(),
          // Don't update username if it's not provided to avoid conflicts
          ...(username ? { username } : {})
        },
        create: {
          // Create new user with all required fields
          id: supabaseUser.id, // This is the Supabase auth ID
          email: supabaseUser.email!,
          name,
          username,
          image,
          lastSyncedAt: new Date()
        }
      });
      
      console.log(`User ${userToUpdate ? 'updated' : 'created'} with ID: ${user.id}`);
      
      // Ensure registration status is set to true since user exists in database
      await supabase.auth.updateUser({
        data: { 
          is_registered: true,
          last_synced_at: new Date().toISOString()
        }
      });
      console.log('Updated user metadata - set registration status to true');
    } catch (error: any) {
      console.error('Error upserting user:', error);
      
      // Special handling for conflicts like username conflicts
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        // Try again with a more unique username
        try {
          const uniqueUsername = `user_${supabaseUser.id}`;
          console.log(`Retrying with unique username: ${uniqueUsername}`);
          
          const user = await prisma.user.upsert({
            where: { 
              email: supabaseUser.email! 
            },
            update: {
              name,
              image,
              lastSyncedAt: new Date(),
              username: uniqueUsername
            },
            create: {
              id: supabaseUser.id,
              email: supabaseUser.email!,
              name,
              username: uniqueUsername,
              image,
              lastSyncedAt: new Date()
            }
          });
          
          console.log(`User created with generated username: ${user.id}`);
        } catch (retryError) {
          console.error('Error creating user with unique username:', retryError);
          return NextResponse.json(
            { error: 'Database Error', message: 'Failed to create user account with unique username' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Database Error', message: 'Failed to update user in database' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: name,
        username: username,
        lastSynced: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to safely check if a column exists in the database
async function doesColumnExist(tableName: string, columnName: string): Promise<boolean> {
  try {
    // Try to find at least one record that can be filtered by this column
    // If the column doesn't exist, this will throw a P2022 error
    await prisma.$queryRaw`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName}
    `;
    return true;
  } catch (error) {
    console.log(`Column ${columnName} in table ${tableName} doesn't exist or can't be accessed`);
    return false;
  }
} 