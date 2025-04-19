import { createBrowserClient } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

// Storage bucket configuration
const STORAGE_BUCKET = 'spirits';

/**
 * Generate a debug ID for tracing
 */
export function generateDebugId() {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Check if we're in a server-side context
 */
function isServerSide() {
  return typeof window === 'undefined';
}

// Browser client (used in client components)
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Server component client
export const createServerComponentClient = () => {
  const cookieStore = cookies();
  
  return createServerClient(
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
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};

// Server action client 
export const createActionClient = () => {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
};

// Route handler client
export const createRouteHandlerClient = () => {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
};

// Middleware client
export const createMiddlewareClient = (request: NextRequest) => {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
            request.cookies.set(name, value);
            response.cookies.set({
              name,
              value,
              ...options,
              // Add secure flag in production
              ...(process.env.NODE_ENV === 'production' ? { secure: true } : {})
            });
          });
        },
      },
    }
  );
  
  return { supabase, response };
};

// Get current user (for server components)
export async function getUser() {
  const supabase = createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get current session (for server components)
export async function getSession() {
  const supabase = createServerComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Gets the public URL for a file in storage
 */
export function getStorageUrl(bucket: string = STORAGE_BUCKET, path: string) {
  const client = createClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads a file to storage
 */
export async function uploadFile(path: string, file: File, options?: { 
  bucket?: string, 
  upsert?: boolean, 
  contentType?: string 
}) {
  const client = createClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).upload(path, file, {
    upsert: options?.upsert ?? false,
    contentType: options?.contentType,
  });
}

/**
 * Downloads a file from storage
 */
export async function downloadFile(path: string, options?: { 
  bucket?: string, 
  transform?: { width?: number, height?: number, quality?: number } 
}) {
  const client = createClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).download(path, {
    transform: options?.transform,
  });
}

/**
 * Lists files in a directory
 */
export async function listFiles(directory: string = '', options?: { 
  bucket?: string, 
  limit?: number, 
  offset?: number, 
  sortBy?: { column: string, order: 'asc' | 'desc' }
}) {
  const client = createClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).list(directory, {
    limit: options?.limit,
    offset: options?.offset,
    sortBy: options?.sortBy,
  });
}

/**
 * Removes a file from storage
 */
export async function removeFiles(paths: string | string[], options?: { bucket?: string }) {
  const client = createClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  // Accept both single string and array of strings
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  
  return client.storage.from(bucket).remove(pathsArray);
} 