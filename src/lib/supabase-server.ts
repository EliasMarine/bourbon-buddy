import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import type { Database } from './supabase';

/**
 * Helper function to inspect database schema for debugging
 * This gets table column information directly without creating an RPC
 */
export async function getColumnInfo(tableName: string) {
  try {
    if (typeof window !== 'undefined') return null; // Only run on server
    
    const { data, error } = await supabaseAdmin
      .from('_columns')
      .select('*')
      .limit(1)
      .then(() => {
        // Use a direct query instead to get column info
        return supabaseAdmin
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', tableName)
          .eq('table_schema', 'public')
          .order('ordinal_position');
      });
    
    if (error) {
      console.warn('⚠️ Could not get column info:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('⚠️ Could not get column info:', error);
    return null;
  }
}

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

interface SupabaseCookie {
  name: string
  value: string
  options?: Record<string, any>
}

/**
 * Creates a Supabase client for SSR server component usage (App Router only)
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
            return cookieStore.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(({ name, value, options }: SupabaseCookie) =>
            cookieStore.set(name, value, options)
          );
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
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(({ name, value, options }: SupabaseCookie) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  return { supabase, response };
}

/**
 * Server-side Supabase client with admin privileges
 * - Uses service role key for direct table access
 * - Only use in server-side code (API routes, Server Components, etc.)
 * - Never expose this client to the browser
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Safe query wrapper for Supabase
 * Similar to safePrismaQuery, but for Supabase
 * Provides error handling and retries for common issues
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      return await queryFn()
    } catch (error) {
      attempts++
      
      // Log the error for debugging
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Supabase query error (attempt ${attempts}/${maxAttempts}):`, errorMessage)
      
      // Check for connection-related errors
      const isConnectionError = 
        errorMessage.includes('network error') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout')
      
      if (isConnectionError && attempts < maxAttempts) {
        // Wait before retry (exponential backoff)
        const delay = Math.min(100 * Math.pow(2, attempts), 3000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
  
  throw new Error(`Failed to execute Supabase query after ${maxAttempts} attempts`)
}

/**
 * Handles Supabase database errors safely for API responses
 * Prevents sensitive information from being exposed to clients
 * Returns appropriate status codes and messages
 */
export function handleSupabaseError(error: unknown, context = 'operation') {
  // Log the full error internally for debugging
  console.error(`Supabase error in ${context}:`, error)
  
  // Handle PostgreSQL error codes
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String(error.code)
    
    // Common Postgres error codes
    switch (code) {
      case '23505': // unique_violation
        return { status: 400, message: 'Resource already exists with these details' }
      case '23503': // foreign_key_violation
        return { status: 400, message: 'Referenced resource does not exist' }
      case '42P01': // undefined_table
        return { status: 500, message: 'Database configuration error' }
      case '22P02': // invalid_text_representation
        return { status: 400, message: 'Invalid data format' }
    }
  }
  
  // Default error response
  return { status: 500, message: 'Database operation failed. Please try again later.' }
}

/**
 * Check if Supabase is available and connected
 * Useful for health checks and startup verification
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Simple query to test connection
    const { data, error } = await supabaseAdmin
      .from('video')
      .select('count(*)', { count: 'exact', head: true })
    
    return !error
  } catch (err) {
    console.error('Supabase connection check failed:', err)
    return false
  }
}

/**
 * Create a Supabase client for server components
 * Uses next/headers cookies() which only works in App Router
 */
export const createServerSupabaseClient = cache(() => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookies()).getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await cookies();
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
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
 * Helper function to get a list of all tables in the database
 * Useful for checking table existence and case sensitivity issues
 */
export async function getTableNames() {
  try {
    if (typeof window !== 'undefined') return null; // Only run on server
    
    const { data, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) {
      console.warn('⚠️ Could not get table names:', error);
      return null;
    }
    
    return data.map(t => t.table_name);
  } catch (error) {
    console.warn('⚠️ Could not get table names:', error);
    return null;
  }
}

// Export the typed client as default
export default supabaseAdmin; 