import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

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
let globalSupabaseBrowserClient: ReturnType<typeof createSsrBrowserClient> | null = null;

/**
 * Creates a Supabase client for browser usage
 */
export function createBrowserClient() {
  // Use singleton for browser clients
  if (!isServerSide() && globalSupabaseBrowserClient) {
    return globalSupabaseBrowserClient;
  }
  
  // Create a new client
  const client = createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Cache for reuse
  if (!isServerSide()) {
    globalSupabaseBrowserClient = client;
  }
  
  return client;
}

/**
 * Creates a Supabase client for server components
 * Note: This function is only compatible with Next.js App Router
 * DO NOT use in pages/ directory
 */
export async function createServerComponentClient() {
  // Import cookies dynamically to avoid issues with pages/ directory
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
  
  return client;
}

/**
 * Creates a Supabase client for middleware
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
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          // Ensure proper cookie attributes based on environment
          const cookieOptions = {
            ...options,
            // In production, use the proper domain & security settings
            // In development, use less restrictive settings to aid in testing
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'lax' as const : 'none' as const,
            path: '/',
            // Ensure the cookie lasts a reasonable amount of time
            maxAge: 60 * 60 * 24 * 7, // 7 days
          };
          
          request.cookies.set(name, value);
          response.cookies.set(name, value, cookieOptions);
        },
        remove(name, options) {
          request.cookies.delete(name);
          response.cookies.set(name, '', { 
            ...options,
            maxAge: 0,
          });
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