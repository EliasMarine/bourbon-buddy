import { createAppRouterSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase admin client for server operations that need elevated permissions
 * Note: This doesn't use cookies, so it won't have the user's session
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Create a Supabase client for server-side routes using the NextRequest object
 */
export function createRequestClient(req: NextRequest) {
  // Create a response to use for storing cookies
  let res = NextResponse.next({
    request: req
  });
  
  // Create the Supabase client with cookie handling
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res = NextResponse.next({
              request: req,
            });
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Check if a request is authenticated with Supabase
 */
export async function isAuthenticated(req: NextRequest) {
  try {
    const supabase = createRequestClient(req);
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get the current user from a request
 */
export async function getUserFromRequest(req: NextRequest) {
  try {
    const supabase = createRequestClient(req);
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error.message);
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error in getUserFromRequest:', error);
    return null;
  }
}

/**
 * Middleware helper to protect routes with Supabase Auth
 */
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<NextResponse> | NextResponse
) {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    // For API routes, return 401
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // For page routes, redirect to login
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // User is authenticated, proceed with the handler
  return handler(req, user);
}

/**
 * Server action helper to get the current user
 * Note: For use in server components and server actions
 */
export async function getCurrentUser() {
  'use server';
  
  // Note: For server components, we work directly with cookies() API
  // Cookies are now handled internally by createAppRouterSupabaseClient
// // Cookies are now handled internally by createAppRouterSupabaseClient
// const cookieStore = cookies();;;
  
  // Create a client that can read the server cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
  
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Helper function to handle auth errors consistently
 */
export function handleAuthError(error: any) {
  console.error('Authentication error:', error);
  
  // Return a user-friendly error object
  return {
    error: 'Authentication failed',
    message: error?.message || 'An error occurred during authentication',
    status: 401,
  };
} 