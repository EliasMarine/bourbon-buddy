import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API route to help debug authentication issues
 */
export async function GET(request: NextRequest) {
  try {
    // Get NextAuth session
    const nextAuthSession = await getServerSession(authOptions);
    
    // Get cookie information from request headers
    const cookieHeader = request.headers.get('cookie');
    const cookieNames = cookieHeader 
      ? cookieHeader.split(';').map(c => c.trim().split('=')[0])
      : [];
    
    // Get basic headers
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const authHeader = request.headers.get('authorization') || null;
    
    // Only include user IDs and emails for security
    const safeNextAuthSession = nextAuthSession ? {
      user: {
        id: nextAuthSession.user?.id,
        email: nextAuthSession.user?.email,
        name: nextAuthSession.user?.name,
      },
      expires: nextAuthSession.expires
    } : null;
    
    // Return session data
    return NextResponse.json({
      nextAuth: {
        isAuthenticated: !!nextAuthSession,
        session: safeNextAuthSession
      },
      cookies: {
        names: cookieNames,
        hasNextAuthSession: cookieNames.some(name => 
          name === 'next-auth.session-token' || 
          name === '__Secure-next-auth.session-token'
        ),
        hasSupabaseCookies: cookieNames.some(name => 
          name.startsWith('sb-')
        )
      },
      request: {
        url: request.url,
        userAgent,
        hasAuthHeader: !!authHeader
      },
      environment: {
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Error in auth debug endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Error fetching authentication state', 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 