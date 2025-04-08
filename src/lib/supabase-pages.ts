import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';

// Global singleton for browser client
let supabaseBrowserClientInstance: ReturnType<typeof createSsrBrowserClient> | null = null;

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

// Supabase client for browser usage (with anon key) using singleton pattern
export const createSupabaseBrowserClient = () => {
  // Return the existing instance if it exists
  if (supabaseBrowserClientInstance !== null) {
    return supabaseBrowserClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidSupabaseConfig(supabaseUrl, supabaseAnonKey)) {
    console.error('Invalid or missing Supabase environment variables');
    // Return a mock client that returns empty data for all operations
    return {
      from: () => ({
        select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
      }),
      storage: {
        from: () => ({
          upload: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          download: () => ({ data: null, error: { message: 'Supabase not configured' } }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      }
    } as any;
  }

  // Use the modern SSR browser client
  supabaseBrowserClientInstance = createSsrBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
  );
  
  return supabaseBrowserClientInstance;
};

// Browser client for client-side usage (singleton)
let browserClient: any = null;

/**
 * Creates a Supabase client for browser usage
 */
export function createBrowserClient() {
  if (browserClient) return browserClient;
  
  browserClient = createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return browserClient;
}

/**
 * Gets the public URL for a file in storage
 */
export function getStorageUrl(bucket: string, path: string) {
  const client = createBrowserClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
} 