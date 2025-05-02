import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

// Storage bucket configuration
const STORAGE_BUCKET = 'spirits';

// Types to match our database schema
export type Database = {
  public: {
    Tables: {
      User: {
        Row: Record<string, unknown>  // TODO: Replace with proper type definitions
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Spirit: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Review: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Stream: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      StreamLike: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      StreamSubscription: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      StreamReport: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      StreamTip: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      StreamView: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Video: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Account: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Comment: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Follows: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      Session: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      VerificationToken: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      SecurityEvent: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
  }
}

/**
 * Generate a debug ID for tracing
 */
export function generateDebugId(): string {
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
export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  // Use singleton for browser clients
  if (typeof window !== 'undefined' && globalSupabaseBrowserClient) {
    return globalSupabaseBrowserClient;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables for Supabase client');
  }
  
  // Create a new client
  const client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
  
  // Cache for reuse
  if (typeof window !== 'undefined') {
    globalSupabaseBrowserClient = client;
  }
  
  return client;
}

/**
 * Creates a Supabase client for server components
 * This is a basic client that doesn't use cookie handling
 * Use createAppRouterSupabaseClient for App Router components
 */
export const createServerSupabaseClient = cache((): SupabaseClient<Database> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables for Supabase client');
  }
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
});

/**
 * Creates a Supabase client for middleware
 */
export function createMiddlewareSupabaseClient(request: NextRequest): {
  supabase: SupabaseClient<Database>;
  response: NextResponse;
} {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables for Supabase client');
  }
  
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Gets the public URL for a file in storage
 */
export function getStorageUrl(bucket: string = STORAGE_BUCKET, path: string): string {
  const client = createBrowserSupabaseClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads a file to storage
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
export async function downloadFile(
  path: string, 
  options?: { 
    bucket?: string, 
    transform?: { width?: number, height?: number, quality?: number } 
  }
) {
  const client = createBrowserSupabaseClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  return client.storage.from(bucket).download(path, {
    transform: options?.transform,
  });
}

/**
 * Lists files in a directory
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
export async function removeFiles(
  paths: string | string[], 
  options?: { bucket?: string }
) {
  const client = createBrowserSupabaseClient();
  const bucket = options?.bucket || STORAGE_BUCKET;
  
  // Accept both single string and array of strings
  const pathsArray = Array.isArray(paths) ? paths : [paths];
  
  return client.storage.from(bucket).remove(pathsArray);
}

// Health check function similar to the Prisma one
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('User').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error('❌ Supabase health check failed:', error);
    return false;
  }
}

// Equivalent of safePrismaQuery for Supabase
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let attempts = 0;
  let lastError: unknown = null;

  while (attempts < maxAttempts) {
    try {
      return await queryFn();
    } catch (error: unknown) {
      lastError = error;
      attempts++;
      
      // For specific Supabase errors that might need retry
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        (error instanceof Error && 'code' in error && error.code === 'PGRST')) {
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

// Default export for convenience
export default supabase; 