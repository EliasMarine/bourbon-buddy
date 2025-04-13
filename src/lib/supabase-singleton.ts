import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Type to ensure consistent client configuration
type SupabaseClientOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

// Global instance variable for client-side singleton
let browserInstance: SupabaseClient | null = null;

/**
 * Returns a Supabase client suitable for the current environment
 * - On the server: Always creates a fresh instance
 * - In the browser: Returns the global singleton instance
 */
export function getSupabaseClient(options?: SupabaseClientOptions): SupabaseClient {
  const supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = options?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Ensure we have the required config
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }

  // In a server context, always create a fresh instance
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseKey);
  }

  // In browser, use singleton pattern
  if (!browserInstance) {
    console.log('🔑 Creating new Supabase browser client instance');
    browserInstance = createBrowserClient(supabaseUrl, supabaseKey);
  }

  return browserInstance;
}

/**
 * Resets the singleton instance - helpful for testing and auth state changes
 */
export function resetSupabaseClient(): void {
  browserInstance = null;
}

/**
 * Creates an admin client with the service role key
 * IMPORTANT: Only use on trusted server contexts, never in the browser!
 */
export function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client should only be used on the server side');
  }
  
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
}

// Export a default instance for convenience
export default getSupabaseClient(); 