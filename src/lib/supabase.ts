import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
// Don't import next/headers directly - import dynamically in server functions
import type { CookieOptions } from '@supabase/ssr';

// Storage configuration
export const STORAGE_BUCKET = 'bourbon-buddy-prod';

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

// Check for and log any issues with environment variables
function validateSupabaseEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || supabaseUrl.includes('your-supabase')) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not properly configured');
  }
  
  if (!anonKey || anonKey.includes('your-supabase')) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not properly configured');
  }
  
  if ((!serviceKey || serviceKey.includes('your-supabase')) && isServer()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not properly configured for server operations');
  }
}

// Call validation on module import
validateSupabaseEnvVars();

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

/**
 * Creates a Supabase client for server component usage
 * Note: This function is only compatible with Next.js App Router
 * DO NOT use in pages/ directory
 */
export function createServerClient() {
  // We need to dynamically import cookies() to avoid breaking in Pages Router
  // This function should only be used in App Router
  const getCookieStore = async () => {
    try {
      // Dynamically import cookies() from next/headers
      const { cookies } = await import('next/headers');
      return cookies();
    } catch (error) {
      console.error('Error importing cookies from next/headers:', error);
      return {
        getAll: () => [],
        // Other cookie methods aren't used
      };
    }
  };
  
  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => {
          try {
            const cookieStore = await getCookieStore();
            if (typeof cookieStore.getAll !== 'function') {
              console.warn('Cookie store getAll is not a function, returning empty array');
              return [];
            }
            return cookieStore.getAll();
          } catch (error) {
            console.error('Error getting cookies:', error);
            return [];
          }
        },
        setAll: () => {
          // In server components, we can't set cookies directly
          // This will be handled by the middleware
          console.warn('Attempted to set cookies in server component - this is expected behavior');
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
export function getStorageUrl(bucket: string = STORAGE_BUCKET, path: string) {
  const client = createBrowserClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads a file to storage
 * @param path Path to store the file at
 * @param file File to upload
 * @param options Upload options
 * @returns Supabase upload response
 */
export async function uploadFile(
  path: string, 
  file: File, 
  options?: { 
    bucket?: string, 
    upsert?: boolean, 
    contentType?: string 
  }
) {
  const client = createBrowserClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).upload(path, file, {
    upsert: options?.upsert ?? false,
    contentType: options?.contentType,
  });
}

/**
 * Downloads a file from storage
 * @param path Path of the file to download
 * @param options Download options
 * @returns Supabase download response
 */
export async function downloadFile(
  path: string, 
  options?: { bucket?: string, transform?: { width?: number, height?: number, quality?: number } }
) {
  const client = createBrowserClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).download(path, {
    transform: options?.transform,
  });
}

/**
 * Lists files in a directory
 * @param directory Directory to list files from (pass empty string for root)
 * @param options List options
 * @returns Supabase list response
 */
export async function listFiles(
  directory: string = '',
  options?: { 
    bucket?: string, 
    limit?: number, 
    offset?: number, 
    sortBy?: { column: string, order: 'asc' | 'desc' }
  }
) {
  const client = createBrowserClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).list(directory, {
    limit: options?.limit,
    offset: options?.offset,
    sortBy: options?.sortBy,
  });
}

/**
 * Removes a file from storage
 * @param paths Path or array of paths to delete
 * @param options Delete options
 * @returns Supabase remove response
 */
export async function removeFiles(
  paths: string | string[],
  options?: { bucket?: string }
) {
  const client = createBrowserClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  // Accept both single string and array of strings
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  
  return client.storage.from(bucket).remove(pathsArray);
} 