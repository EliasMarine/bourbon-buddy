import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { createServerClient } from '@supabase/ssr';
import { getCsrfCookieName } from '@/lib/csrf';

/**
 * Debug endpoint to check auth state
 * IMPORTANT: This should be disabled or protected in production
 */
export async function GET(request: NextRequest) {
  // Simple security check - only enable in development or with special token
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-debug-token')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get NextAuth session
    const user = await getCurrentUser();

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // This is not used for reading, so we can return empty response
            const response = NextResponse.next();
            return;
          }
        }
      }
    );

    // Get Supabase session
    const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();

    // Get all cookies (with sensitive values masked)
    const cookies = request.cookies.getAll().map(cookie => {
      // Mask sensitive values
      const isSensitive = ['token', 'auth'].some(part => cookie.name.toLowerCase().includes(part));
      return {
        name: cookie.name,
        exists: true,
        length: cookie.value.length,
        value: isSensitive ? '***' : cookie.value.substring(0, 5) + '...'
      };
    });

    // Check for important cookies
    const hasCsrfCookie = request.cookies.has(getCsrfCookieName());
    const hasNextAuthCookie = request.cookies.has('next-auth.session-token');
    const hasSupabaseCookies = request.cookies.has('sb-access-token') || 
                              request.cookies.has('sb-refresh-token');

    // Return debug information
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      nextAuth: {
        authenticated: !!session,
        email: user?.email || null,
        sessionExpiry: session?.expires || null,
      },
      supabase: {
        authenticated: !!supabaseSession,
        email: supabaseSession?.user?.email || null,
        expiresAt: supabaseSession?.expires_at 
          ? new Date(supabaseSession.expires_at * 1000).toISOString() 
          : null,
        error: error?.message
      },
      cookies: {
        count: cookies.length,
        hasCsrfCookie,
        hasNextAuthCookie,
        hasSupabaseCookies,
        all: cookies
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
        isDevelopment: process.env.NODE_ENV !== 'production',
      }
    });
  } catch (error) {
    console.error('Error in auth debug endpoint:', error);
    return NextResponse.json(
      { error: 'Server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 