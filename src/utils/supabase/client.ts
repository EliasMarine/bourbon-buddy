import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: {
        fetch: (url, options = {}) => {
          // Create custom fetch to avoid CORS issues with credentials
          const customOptions = { 
            ...options,
            credentials: undefined // Remove credentials for auth requests
          };
          
          // Don't include credentials for auth endpoints
          if (url.toString().includes('/auth/v1/')) {
            return fetch(url, customOptions);
          }
          
          // For non-auth requests, use original options
          return fetch(url, options);
        }
      }
    }
  )
} 