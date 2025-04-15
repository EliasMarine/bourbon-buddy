import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Type to ensure consistent client configuration
type SupabaseClientOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

// Global instance variable for client-side singleton
let browserInstance: SupabaseClient | null = null;

// Track WebSocket reconnection attempts
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;

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
    
    // Get the domain for cookie config
    const domain = typeof window !== 'undefined' ? window.location.hostname : undefined;
    // Don't use localhost as domain for cookies to avoid issues
    const cookieDomain = domain && !domain.includes('localhost') ? domain : undefined;
    
    browserInstance = createBrowserClient(
      supabaseUrl,
      supabaseKey,
      {
        // Enhanced realtime config with more robust settings
        realtime: {
          params: {
            eventsPerSecond: 2, // Reduced rate to avoid limits
            heartbeatIntervalMs: 40000, // Longer heartbeat interval
            timeout: 120000 // Longer timeout (2 minutes)
          }
        },
        auth: {
          // Ensure cookies are used for auth
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce' // Use PKCE flow for better security
        },
        // Use cookieOptions instead of cookies for domain
        ...(cookieDomain ? {
          cookieOptions: {
            domain: cookieDomain,
            secure: true,
            sameSite: 'lax',
            path: '/'
          }
        } : {}),
        global: {
          // Properly handles credentials for CORS
          fetch: (url, options = {}) => {
            const headers = new Headers(options.headers || {});
            headers.set('X-Client-Info', 'supabase-js/browser/singleton');
            
            // Create a new AbortController with a longer timeout
            const timeoutMs = 90000; // 90 seconds
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            
            // Always use 'include' for credentials to ensure cookies are sent
            return fetch(url, {
              ...options,
              headers,
              // Always include credentials for Supabase requests
              credentials: 'include',
              signal: controller.signal
            }).finally(() => {
              clearTimeout(timeoutId);
            });
          }
        }
      }
    );
    
    // Add robust error handling for WebSocket connections
    if (typeof window !== 'undefined') {
      // Setup global unhandled promise rejection handler for WebSocket issues
      window.addEventListener('unhandledrejection', (event) => {
        if (
          event.reason && 
          (event.reason.message?.includes('WebSocket connection') || 
           event.reason.message?.includes('Connection closed'))
        ) {
          console.warn('WebSocket connection issue detected:', event.reason.message);
          handleWebSocketReconnection();
        }
      });
      
      // Monitor for WebSocket errors using a global handler
      window.addEventListener('error', (event) => {
        if (
          event.message && 
          (event.message.includes('WebSocket') || 
           event.message.includes('Connection closed'))
        ) {
          console.warn('WebSocket connection issue detected:', event.message);
          handleWebSocketReconnection();
        }
      });
    }
  }

  return browserInstance;
}

/**
 * Attempts to reconnect the WebSocket with exponential backoff
 */
function handleWebSocketReconnection() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(`Reached maximum WebSocket reconnection attempts (${MAX_RECONNECT_ATTEMPTS})`);
    // Reset for future attempts
    reconnectAttempts = 0;
    return;
  }
  
  // Clear any existing timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  // Calculate exponential backoff delay
  const backoffDelay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
  console.log(`Attempting WebSocket reconnection in ${backoffDelay/1000}s (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  
  reconnectTimeout = setTimeout(() => {
    if (browserInstance) {
      try {
        // Attempt to reconnect the realtime client
        console.log('Reconnecting Supabase realtime client...');
        const channel = browserInstance.channel('system');
        channel.subscribe((status) => {
          console.log('Supabase channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully reconnected to Supabase realtime');
            reconnectAttempts = 0;
          }
        });
      } catch (error) {
        console.error('Failed to reconnect Supabase realtime:', error);
        reconnectAttempts++;
        // Try again with longer delay
        handleWebSocketReconnection();
      }
    }
  }, backoffDelay);
  
  reconnectAttempts++;
}

/**
 * Resets the singleton instance - helpful for testing and auth state changes
 */
export function resetSupabaseClient(): void {
  // Clear any reconnection attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  reconnectAttempts = 0;
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

/**
 * Sign in using our proxy endpoint to avoid CORS issues
 */
export async function signInWithProxyEndpoint(email: string, password: string) {
  try {
    // Use our proxy endpoint for authentication, which properly handles CORS
    const response = await fetch('/api/auth/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important for cookies
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Authentication failed');
    }
    
    // Store the session data locally for Supabase client to use
    if (typeof window !== 'undefined' && result.data?.session) {
      try {
        // Get the current instance to update its session
        const currentInstance = getSupabaseClient();
        
        // Manually set the auth state - this triggers the auth event listeners
        if (currentInstance.auth && typeof currentInstance.auth.setSession === 'function') {
          await currentInstance.auth.setSession({
            access_token: result.data.session.access_token,
            refresh_token: result.data.session.refresh_token
          });
          
          // After setting the session, explicitly trigger a state refresh
          // This helps ensure React components are properly updated
          const { data } = await currentInstance.auth.getUser();
          console.log('User authenticated:', data.user?.email);
        }
      } catch (err) {
        console.error('Error setting session:', err);
        // Even if setting the session fails, we can still return the data
        // The Supabase provider might be able to recover on next refresh
      }
    }
    
    return result.data;
  } catch (error) {
    console.error('Authentication proxy error:', error);
    throw error;
  }
}

// Export a default instance for convenience
export default getSupabaseClient(); 