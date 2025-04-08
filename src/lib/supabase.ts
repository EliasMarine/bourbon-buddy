import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

// Global singleton for browser client
let supabaseBrowserClientInstance: ReturnType<typeof createSsrBrowserClient> | null = null;

// Helper function to safely check if we're on the server side
export const isServer = () => typeof window === 'undefined';

// Helper to validate Supabase credentials
const isValidSupabaseConfig = (url?: string, key?: string) => {
  return (
    url && 
    key && 
    !url.includes('your-supabase') && 
    !key.includes('your-supabase')
  );
};

// Supabase client for browser usage (with anon key) using singleton pattern
export const createSupabaseBrowserClient = () => {
  // Return the existing instance if it exists
  if (supabaseBrowserClientInstance !== null) {
    return supabaseBrowserClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseConfig(supabaseUrl, supabaseAnonKey)) {
    console.error('Invalid or missing Supabase environment variables');
    // Return a mock client that returns empty data for all operations
    return {
      from: () => ({
        select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
      }),
      storage: {
        from: () => ({
          upload: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          download: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      }
    } as any;
  }

  // Use the modern SSR browser client
  supabaseBrowserClientInstance = createSsrBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  );
  
  return supabaseBrowserClientInstance;
};

// Browser client for client-side usage (singleton)
let browserClient: any = null;

/**
 * Creates a Supabase client for browser usage
 */
export function createBrowserClient() {
  if (browserClient) return browserClient;
  
  browserClient = createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return browserClient;
}

// Server client for server components
export function createServerClient() {
  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          try {
            // @ts-ignore - cookies() returns ReadonlyRequestCookies but TypeScript thinks it's a Promise
            return cookies().getAll();
          } catch (error) {
            console.error('Error getting cookies:', error);
            return [];
          }
        },
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // @ts-ignore - cookies() returns ReadonlyRequestCookies but TypeScript thinks it's a Promise
              cookies().set(name, value, options);
            });
          } catch (error) {
            console.error('Error setting cookies:', error);
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for middleware usage
 */
export function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  return { supabase, response };
}

// Supabase client for server usage (with service key)
export const createSupabaseServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use SUPABASE_SERVICE_ROLE_KEY as primary, with SUPABASE_SERVICE_KEY as fallback
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!isValidSupabaseConfig(supabaseUrl, supabaseKey)) {
    console.error('Invalid or missing Supabase environment variables');
    // Return a mock client that returns empty data for all operations
    return {
      from: () => ({
        select: () => ({ data: [], count: 0, error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        eq: () => ({ data: [], count: 0, error: null, select: () => ({ data: [], count: 0, error: null }) }),
      }),
      storage: {
        from: () => ({
          upload: () => ({ data: null, error: null }),
          download: () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      }
    } as any;
  }

  return createClient(supabaseUrl!, supabaseKey!);
};

/**
 * Creates a Supabase client with admin privileges
 * Only use this on the server side
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    console.error('Admin client should only be used on the server side');
    return null;
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Admin client - only use on server-side
export const supabaseAdmin = (() => {
  // Only initialize on the server side
  if (!isServer()) {
    // Return a mock client for client side
    return null as any;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!isValidSupabaseConfig(supabaseUrl, serviceKey)) {
    console.error('Invalid or missing Supabase admin environment variables');
    // Return a mock admin client
    return {
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
      }),
      storage: {
        from: () => ({
          upload: () => ({ data: null, error: null }),
          download: () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      auth: {
        admin: { 
          listUsers: () => Promise.resolve({ data: [], error: null }) 
        },
      }
    } as any;
  }
  
  return createClient(supabaseUrl!, serviceKey!);
})();

// Safe wrapper for using the admin client
export const withSupabaseAdmin = async <T>(
  callback: (admin: ReturnType<typeof createClient>) => Promise<T>
): Promise<T> => {
  if (!isServer()) {
    throw new Error('supabaseAdmin can only be used on the server side');
  }
  
  return callback(supabaseAdmin);
};

/**
 * Gets the public URL for a file in storage
 */
export function getStorageUrl(bucket: string, path: string) {
  const client = createBrowserClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
} 