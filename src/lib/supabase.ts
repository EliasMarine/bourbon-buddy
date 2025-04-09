import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
// Don't import next/headers directly - import dynamically in server functions
import type { CookieOptions } from '@supabase/ssr';
import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Storage configuration
export const STORAGE_BUCKET = 'bourbon-buddy-prod';

// Global singleton for browser client
let supabaseBrowserClientInstance: ReturnType<typeof createSsrBrowserClient> | null = null;

// Helper function to safely check if we're on the server side
export const isServer = () => typeof window === 'undefined';

// Helper to generate debug ID for tracing
export const generateDebugId = () => Math.random().toString(36).substring(2, 8);

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
  const debugId = generateDebugId();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || supabaseUrl.includes('your-supabase')) {
    console.error(`[${debugId}] ❌ NEXT_PUBLIC_SUPABASE_URL is not properly configured`);
  }
  
  if (!anonKey || anonKey.includes('your-supabase')) {
    console.error(`[${debugId}] ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not properly configured`);
  }
  
  if ((!serviceKey || serviceKey.includes('your-supabase')) && isServer()) {
    console.error(`[${debugId}] ❌ SUPABASE_SERVICE_ROLE_KEY is not properly configured for server operations`);
  }
  
  console.log(`[${debugId}] 🔧 Supabase environment validation complete. URL configured: ${!!supabaseUrl}, Anon key configured: ${!!anonKey}, Service key configured: ${!!(serviceKey && isServer())}`);
}

// Call validation on module import
validateSupabaseEnvVars();

// Supabase client for browser usage (with anon key) using singleton pattern
export const createSupabaseBrowserClient = () => {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 🔑 Creating Browser Client`);
  
  // Return the existing instance if it exists
  if (supabaseBrowserClientInstance !== null) {
    console.log(`[${debugId}] ♻️ Reusing existing browser client instance`);
    return supabaseBrowserClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseConfig(supabaseUrl, supabaseAnonKey)) {
    console.error(`[${debugId}] ❌ Invalid or missing Supabase environment variables`);
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

  console.log(`[${debugId}] 🔨 Creating new Supabase browser client with URL: ${supabaseUrl?.substring(0, 15)}...`);
  
  // Use the modern SSR browser client
  try {
    supabaseBrowserClientInstance = createSsrBrowserClient(
      supabaseUrl!,
      supabaseAnonKey!
    );
    console.log(`[${debugId}] ✅ Supabase browser client created successfully`);
  } catch (error) {
    console.error(`[${debugId}] ❌ Error creating Supabase browser client:`, error);
    throw error; // Rethrow to ensure error is visible
  }
  
  return supabaseBrowserClientInstance;
};

// Browser client for client-side usage (singleton)
let browserClient: any = null;

/**
 * Creates a Supabase client for browser usage
 */
export function createBrowserClient() {
  const debugId = generateDebugId();
  if (browserClient) {
    console.log(`[${debugId}] ♻️ Reusing existing browser client`);
    return browserClient;
  }
  
  console.log(`[${debugId}] 🔨 Creating new browser client`);
  try {
    browserClient = createSsrBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    console.log(`[${debugId}] ✅ Browser client created successfully`);
  } catch (error) {
    console.error(`[${debugId}] ❌ Error creating browser client:`, error);
    throw error;
  }
  
  return browserClient;
}

/**
 * Creates a Supabase client for server component usage
 * Note: This function is only compatible with Next.js App Router
 * DO NOT use in pages/ directory
 */
export function createServerClient() {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 🔨 Creating server client`);
  
  // We need to dynamically import cookies() to avoid breaking in Pages Router
  // This function should only be used in App Router
  const getCookieStore = async () => {
    try {
      // Dynamically import cookies() from next/headers
      console.log(`[${debugId}] 🍪 Importing cookies from next/headers`);
      const { cookies } = await import('next/headers');
      const cookieStore = cookies();
      
      // Test if we can access the cookies to determine API version
      let cookieCount = "unknown";
      let hasGetAll = false;
      
      if (typeof cookieStore === 'object' && cookieStore !== null) {
        if ('getAll' in cookieStore && typeof cookieStore.getAll === 'function') {
          hasGetAll = true;
          cookieCount = cookieStore.getAll().length.toString();
        } else if (Symbol.iterator in cookieStore) {
          cookieCount = Array.from(cookieStore as Iterable<RequestCookie>).length.toString();
        }
      }
      
      console.log(`[${debugId}] ✅ Got cookie store:`, {
        hasGetAll,
        cookieCount
      });
      
      return cookieStore;
    } catch (error) {
      console.error(`[${debugId}] ❌ Error importing cookies from next/headers:`, error);
      return {
        getAll: () => {
          console.log(`[${debugId}] ⚠️ Using fallback empty cookie array`);
          return [];
        }
        // Other cookie methods aren't used
      };
    }
  };
  
  /**
   * Safely gets all cookies from the cookie store
   * Handles both the older synchronous and newer Promise-based cookies API
   */
  const safeGetAllCookies = async (cookieStore: any) => {
    try {
      if (typeof cookieStore === 'object' && cookieStore !== null) {
        if ('getAll' in cookieStore && typeof cookieStore.getAll === 'function') {
          // Traditional API
          return cookieStore.getAll();
        } else if (Symbol.iterator in cookieStore) {
          // Iterable API
          return Array.from(cookieStore as Iterable<RequestCookie>);
        } 
      }
      
      console.warn(`[${debugId}] ⚠️ Cookie store cannot be accessed, returning empty array`);
      return [];
    } catch (error) {
      console.error(`[${debugId}] ❌ Error getting cookies:`, error);
      return [];
    }
  };
  
  try {
    return createSsrServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: async () => {
            try {
              console.log(`[${debugId}] 🍪 Server client getAll cookies called`);
              const cookieStore = await getCookieStore();
              const cookies = await safeGetAllCookies(cookieStore);
              
              console.log(`[${debugId}] 🍪 Server client got ${cookies.length} cookies`);
              // Log cookie names but not values for security
              console.log(`[${debugId}] 🍪 Cookie names:`, cookies.map(c => c.name));
              return cookies;
            } catch (error) {
              console.error(`[${debugId}] ❌ Error getting cookies:`, error);
              return [];
            }
          },
          setAll: () => {
            // In server components, we can't set cookies directly
            // This will be handled by the middleware
            console.warn(`[${debugId}] ⚠️ Attempted to set cookies in server component - this is expected behavior`);
          },
        },
      }
    );
  } catch (error) {
    console.error(`[${debugId}] ❌ Error creating server client:`, error);
    throw error;
  }
}

/**
 * Creates a Supabase client for middleware usage
 */
export function createMiddlewareClient(request: NextRequest) {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 🔨 Creating middleware client for path: ${request.nextUrl.pathname}`);
  
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  try {
    const supabase = createSsrServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            console.log(`[${debugId}] 🍪 Middleware client getAll cookies called`);
            const cookies = request.cookies.getAll();
            console.log(`[${debugId}] 🍪 Found ${cookies.length} cookies`);
            // Log cookie names but not values for security
            if (cookies.length > 0) {
              console.log(`[${debugId}] 🍪 Cookie names:`, cookies.map(c => c.name));
            }
            return cookies;
          },
          setAll(cookiesToSet) {
            console.log(`[${debugId}] 🍪 Middleware client setAll called with ${cookiesToSet.length} cookies`);
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`[${debugId}] 🍪 Setting cookie: ${name}, length: ${value.length}, options: ${JSON.stringify(options || {})}`);
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    
    console.log(`[${debugId}] ✅ Middleware client created successfully`);
    return { supabase, response };
  } catch (error) {
    console.error(`[${debugId}] ❌ Error creating middleware client:`, error);
    throw error;
  }
}

// Add a flag to check if we should use REST API only
const useRestOnly = process.env.USE_SUPABASE_REST_ONLY === 'true';
const fallbackToRest = process.env.FALLBACK_TO_REST_API === 'true'; 
const enableOfflineFallback = process.env.ENABLE_OFFLINE_FALLBACK === 'true';

// Log the configuration
console.log('Supabase configuration:');
console.log('- USE_SUPABASE_REST_ONLY:', useRestOnly);
console.log('- FALLBACK_TO_REST_API:', fallbackToRest);
console.log('- ENABLE_OFFLINE_FALLBACK:', enableOfflineFallback);

// Track database connection status
let isDatabaseReachable = !useRestOnly; // Assume database is reachable unless REST-only mode
let connectionTested = false;

// Function to test database connectivity (to be called once)
async function testDatabaseConnectivity() {
  if (connectionTested) return isDatabaseReachable;
  
  try {
    if (useRestOnly) {
      console.log('REST-only mode enabled, skipping database connectivity test');
      isDatabaseReachable = false;
      connectionTested = true;
      return false;
    }
    
    // Create a database client
    const dbClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Try a simple query
    const { data, error } = await dbClient
      .from('_prisma_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error.message);
      isDatabaseReachable = false;
    } else {
      console.log('Database connection test successful');
      isDatabaseReachable = true;
    }
  } catch (error) {
    console.error('Error testing database connectivity:', error);
    isDatabaseReachable = false;
  }
  
  connectionTested = true;
  console.log('Database reachable:', isDatabaseReachable);
  return isDatabaseReachable;
}

// Supabase client for server usage (with service key)
export const createSupabaseServerClient = async () => {
  // Run connection test if not already done
  if (!connectionTested) {
    await testDatabaseConnectivity();
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use SUPABASE_SERVICE_ROLE_KEY as primary, with SUPABASE_SERVICE_KEY as fallback
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!isValidSupabaseConfig(supabaseUrl, supabaseKey)) {
    console.error('Invalid or missing Supabase environment variables');
    // Return a mock client that returns empty data for all operations
    return getMockClient();
  }

  if (useRestOnly || (fallbackToRest && !isDatabaseReachable)) {
    console.log('Using REST API client for Supabase operations');
    // Return a client that uses the REST API
    return createClient(supabaseUrl!, supabaseKey!);
  }

  return createClient(supabaseUrl!, supabaseKey!);
};

// Helper function to generate a mock client when Supabase is unavailable
function getMockClient() {
  console.warn('Creating mock Supabase client due to connection issues');
  
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