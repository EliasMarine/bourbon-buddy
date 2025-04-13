import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Global singleton for browser client
let globalBrowserClient: SupabaseClient | null = null;

/**
 * Create a Supabase client for regular client-side usage
 * Implements singleton pattern to prevent multiple instances
 */
export function createBrowserClient(): SupabaseClient {
  if (globalBrowserClient) {
    return globalBrowserClient;
  }

  globalBrowserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return globalBrowserClient;
}

/**
 * Create a Supabase client for API routes that works in both pages/ and app/ dirs
 * This version is safe to import anywhere in the codebase
 */
export function createApiClient(): SupabaseClient {
  // For client-side use, return a regular client
  if (typeof window !== 'undefined') {
    return createBrowserClient();
  }
  
  // For server-side, use a basic client without cookies
  // This ensures compatibility with both /pages and /app directories
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Create a middleware client that handles Supabase auth
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure proper cookie attributes
            const cookieOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'lax' as const : 'none' as const,
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7 days
            };
            
            request.cookies.set(name, value);
            response.cookies.set(name, value, cookieOptions);
          });
        }
      }
    }
  );
  
  return { supabase, response };
}

/**
 * Creates an admin Supabase client with full DB access
 * For server-side use only
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client should only be used on the server side');
  }
  
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
} 