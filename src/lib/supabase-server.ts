import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSupabaseSsrClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
  return createSupabaseSsrClient(
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
  
  const supabase = createSupabaseSsrClient(
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
  if (!isServer()) {
    return null as any;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!isValidSupabaseConfig(supabaseUrl, serviceKey)) {
    console.error('Invalid or missing Supabase admin environment variables');
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

export const withSupabaseAdmin = async <T>(
  callback: (admin: ReturnType<typeof createClient>) => Promise<T>
): Promise<T> => {
  if (!isServer()) {
    throw new Error('supabaseAdmin can only be used on the server side');
  }
  return callback(supabaseAdmin);
}; 