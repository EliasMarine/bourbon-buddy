import NextAuth from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Create a wrapper for NextAuth to add additional logging
const enhancedHandler = async (req: Request, context: any) => {
  try {
    const handler = NextAuth(authOptions);
    return handler(req, context);
  } catch (error) {
    console.error('[NextAuth] Fatal error handling auth request:', error);
    // Return a generic error to avoid leaking sensitive information
    return NextResponse.json(
      { error: 'Authentication service error' },
      { status: 500 }
    );
  }
};

export { enhancedHandler as GET, enhancedHandler as POST }; 