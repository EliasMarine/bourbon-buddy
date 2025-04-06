import { createClient } from '@supabase/supabase-js';

// Supabase client for browser usage (with anon key)
export const createSupabaseBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    throw new Error('Missing required environment variables for Supabase');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

// Supabase client for server usage (with service key)
export const createSupabaseServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use SUPABASE_SERVICE_ROLE_KEY as primary, with SUPABASE_SERVICE_KEY as fallback
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    throw new Error('Missing required environment variables for Supabase');
  }

  return createClient(supabaseUrl, supabaseKey);
};

// Helper for getting public URLs
export const getStoragePublicUrl = (bucket: string, path: string) => {
  const client = createSupabaseBrowserClient();
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

// Admin client - only use on server-side
export const supabaseAdmin = (() => {
  // Only initialize on the server side
  if (typeof window !== 'undefined') {
    // Return a mock client or null for client side
    return null as any; // This prevents the client-side from trying to access environment variables
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase admin environment variables');
    throw new Error('Missing required environment variables for Supabase admin client');
  }
  
  return createClient(supabaseUrl, serviceKey);
})();

// Helper function to safely check if we're on the server side
export const isServer = () => typeof window === 'undefined';

// Safe wrapper for using the admin client
export const withSupabaseAdmin = async <T>(
  callback: (admin: ReturnType<typeof createClient>) => Promise<T>
): Promise<T> => {
  if (!isServer()) {
    throw new Error('supabaseAdmin can only be used on the server side');
  }
  
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not initialized');
  }
  
  return callback(supabaseAdmin);
}; 