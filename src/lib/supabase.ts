import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

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

// Define a global type for browser usage
let globalSupabaseBrowserClient: SupabaseClient | null = null;

/**
 * Creates a Supabase client for browser usage
 */
export function createBrowserClient() {
  // Use singleton for browser clients
  if (typeof window !== 'undefined' && globalSupabaseBrowserClient) {
    return globalSupabaseBrowserClient;
  }
  
  // Create a new client
  const client = createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Cache for reuse
  if (typeof window !== 'undefined') {
    globalSupabaseBrowserClient = client;
  }
  
  return client;
}

/**
 * Creates a Supabase client for server components
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies();
  
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
}

/**
 * Creates a Supabase client for middleware
 */
export function createMiddlewareClient(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );
  
  return { supabase, response };
}

/**
 * Gets the public URL for a file in storage
 */
export function getStorageUrl(bucket: string = STORAGE_BUCKET, path: string) {
  const client = createBrowserClient();
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
  const client = createBrowserClient();
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
  const client = createBrowserClient();
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
 */
export async function removeFiles(paths: string | string[], options?: { bucket?: string }) {
  const client = createBrowserClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  // Accept both single string and array of strings
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  
  return client.storage.from(bucket).remove(pathsArray);
} 