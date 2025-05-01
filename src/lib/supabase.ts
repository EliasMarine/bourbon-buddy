import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { cookies as nextCookies } from 'next/headers';

// Avoid direct imports from next/headers to make this file compatible with pages router
// Instead, have functions accept cookies as parameters

// Storage bucket configuration
const STORAGE_BUCKET = 'spirits';

// Types to match our database schema
export type Database = {
  public: {
    Tables: {
      User: {
        Row: any
        Insert: any
        Update: any
      }
      Spirit: {
        Row: any
        Insert: any
        Update: any
      }
      Review: {
        Row: any
        Insert: any
        Update: any
      }
      Stream: {
        Row: any
        Insert: any
        Update: any
      }
      StreamLike: {
        Row: any
        Insert: any
        Update: any
      }
      StreamSubscription: {
        Row: any
        Insert: any
        Update: any
      }
      StreamReport: {
        Row: any
        Insert: any
        Update: any
      }
      StreamTip: {
        Row: any
        Insert: any
        Update: any
      }
      StreamView: {
        Row: any
        Insert: any
        Update: any
      }
      Video: {
        Row: any
        Insert: any
        Update: any
      }
      Account: {
        Row: any
        Insert: any
        Update: any
      }
      Comment: {
        Row: any
        Insert: any
        Update: any
      }
      Follows: {
        Row: any
        Insert: any
        Update: any
      }
      Session: {
        Row: any
        Insert: any
        Update: any
      }
      VerificationToken: {
        Row: any
        Insert: any
        Update: any
      }
      SecurityEvent: {
        Row: any
        Insert: any
        Update: any
      }
    }
  }
}

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
let globalSupabaseBrowserClient: SupabaseClient<Database> | null = null;

/**
 * Creates a Supabase client for browser usage
 */
export function createBrowserSupabaseClient() {
  // Use singleton for browser clients
  if (typeof window !== 'undefined' && globalSupabaseBrowserClient) {
    return globalSupabaseBrowserClient;
  }
  
  // Create a new client
  const client = createBrowserClient<Database>(
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
export const createServerSupabaseClient = cache(async () => {
  const cookieStore = await nextCookies();
  
  return createServerClient<Database>(
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
});

/**
 * Creates a Supabase client for middleware
 */
export function createMiddlewareSupabaseClient(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

// For direct access (server-side only)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Gets the public URL for a file in storage
 */
export function getStorageUrl(bucket: string = STORAGE_BUCKET, path: string) {
  const client = createBrowserSupabaseClient();
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
  const client = createBrowserSupabaseClient();
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
  const client = createBrowserSupabaseClient();
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
  const client = createBrowserSupabaseClient();
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
  const client = createBrowserSupabaseClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  // Accept both single string and array of strings
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  
  return client.storage.from(bucket).remove(pathsArray);
}

// Health check function similar to the Prisma one
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('User').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('❌ Supabase health check failed:', e);
    return false;
  }
}

// Equivalent of safePrismaQuery for Supabase
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let attempts = 0;
  let lastError: any;

  while (attempts < maxAttempts) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      attempts++;
      
      // For specific Supabase errors that might need retry
      if (
        error?.message?.includes('connection') ||
        error?.message?.includes('timeout') ||
        error?.code === 'PGRST') {
        console.warn(`Supabase query failed (attempt ${attempts}/${maxAttempts}):`, error);
        await new Promise(resolve => setTimeout(resolve, 500 * attempts));
        continue;
      }
      
      // For other errors, just throw immediately
      throw error;
    }
  }

  throw lastError || new Error(`Failed to execute Supabase query after ${maxAttempts} attempts.`);
}

/**
 * Ensures the specified storage bucket exists
 */
export async function ensureStorageBucketExists(bucketName: string) {
  console.log(`Ensuring storage bucket exists: ${bucketName}`);
  
  try {
    const client = createBrowserSupabaseClient();
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing storage buckets:', listError);
      return false;
    }
    
    // Check if our bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      const { error: createError } = await client.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`Bucket ${bucketName} created successfully`);
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring storage bucket exists:', error);
    return false;
  }
}

// Default export for convenience
export default supabase; 