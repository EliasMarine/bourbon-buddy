import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Since we're handling TypeScript compatibility between different Next.js versions,
// we need to define a generic interface that works across them
type CookieInterface = {
  getAll: () => Array<{ name: string; value: string }>;
  set: (name: string, value: string, options?: any) => void;
}

/**
 * Creates a Supabase client for server components
 * Handles the cookies() API which returns different types in different Next.js versions
 */
export async function createClient() {
  // Create a compatible cookie interface that works with Supabase
  const cookieInterface: CookieInterface = {
    getAll: () => {
      try {
        // This pattern works with both synchronous and asynchronous cookies() implementation
        const cookieStore = cookies() as any;
        // Handle both Promise and direct return values
        if (cookieStore instanceof Promise) {
          // If it's a promise (newer Next.js versions), we return a Promise result
          // that will be handled correctly in the middleware/RSC environment
          return cookieStore.then(store => store.getAll()) as any;
        } else {
          // For older Next.js versions with synchronous cookies
          return cookieStore.getAll();
        }
      } catch (error) {
        console.error('Error getting cookies:', error);
        return [];
      }
    },
    set: (name, value, options) => {
      try {
        // Same pattern for setting - handle both Promise and direct implementations
        const cookieStore = cookies() as any;
        if (cookieStore instanceof Promise) {
          cookieStore
            .then(store => store.set(name, value, options))
            .catch(error => console.error('Error setting cookie:', error));
        } else {
          cookieStore.set(name, value, options);
        }
      } catch (error) {
        console.error('Error setting cookie:', error);
        // Setting cookies in server components is expected to fail sometimes
        // Middleware will handle cookies properly in these cases
      }
    }
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieInterface.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieInterface.set(name, value, options);
          });
        },
      },
    }
  );
} 