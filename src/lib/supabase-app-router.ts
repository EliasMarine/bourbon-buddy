'use client';

import { createServerClient, createBrowserClient } from '@supabase/ssr';
import type { Database } from './supabase';
import type { CookieOptions } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

/**
 * Creates a Supabase client specifically for App Router server components.
 * This is intended to be used only in app/ directory server components.
 * 
 * Usage:
 * ```
 * // In a Server Component:
 * import { createAppRouterSupabaseClient } from '@/lib/supabase-app-router';
 * 
 * export default async function MyServerComponent() {
 *   const supabase = await createAppRouterSupabaseClient();
 *   const { data } = await supabase.from('myTable').select('*');
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 */
export async function createAppRouterSupabaseClient() {
  try {
    // Dynamic import to avoid build errors in Pages Router
    const { cookies } = await import('next/headers');
    
    // Create our client
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => {
            try {
              // Access the cookies API and resolve the promise
              const cookieStore = cookies();
              // Type assertion since we know this is the correct structure
              return (cookieStore as unknown as ReadonlyRequestCookies).getAll();
            } catch (error) {
              console.warn('Error getting cookies:', error);
              return [];
            }
          },
          setAll: (cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) => {
            try {
              const cookieStore = cookies();
              cookiesToSet.forEach(({ name, value, options }) => {
                // Type assertion since we know this is the correct structure
                (cookieStore as unknown as ReadonlyRequestCookies).set(name, value, options);
              });
            } catch (error) {
              // This will throw in Server Components, which is expected
              // and can be ignored if middleware is refreshing user sessions
              console.warn('Could not set cookies in server component');
            }
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to create App Router Supabase client, falling back to browser client', error);
    
    // Fall back to browser client as a safety measure
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}

/**
 * Creates a browser-specific Supabase client.
 * This is suitable for client components in the app/ directory.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
} 