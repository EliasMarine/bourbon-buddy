import NextAuth from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { disconnectAllPrismaInstances } from '@/lib/prisma';
import { redis } from '@/lib/redis';

// Create a wrapper for NextAuth to add additional logging
const enhancedHandler = async (req: Request, context: any) => {
  try {
    // Release any existing Prisma connections before handling the auth request
    // This helps prevent "prepared statement already exists" errors
    await disconnectAllPrismaInstances();
    
    // Log whether Redis is being used
    if (redis) {
      console.log('[NextAuth] Using Redis for session management');
    } else {
      console.log('[NextAuth] Redis not available, using database-only session management');
    }
    
    const handler = NextAuth(authOptions);
    return handler(req, context);
  } catch (error: any) {
    // Log the error with details for debugging
    console.error('[NextAuth] Fatal error handling auth request:', error);
    
    // Check for prepared statement errors specifically
    if (error?.message?.includes('prepared statement') || 
        error?.code === '42P05') {
      console.error('[NextAuth] Prepared statement error detected');
      
      // Try to clean up database connections
      try {
        await disconnectAllPrismaInstances();
      } catch (cleanupError) {
        console.error('[NextAuth] Error during connection cleanup:', cleanupError);
      }
      
      // Return a specialized error for this case
      return NextResponse.json(
        { error: 'Database connection error. Please try again.' },
        { status: 500 }
      );
    }
    
    // Return a generic error to avoid leaking sensitive information
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }
};

export { enhancedHandler as GET, enhancedHandler as POST }; 