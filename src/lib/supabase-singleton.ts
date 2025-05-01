import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './supabase';  // Import the Database type

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
  console.log('⚠️ Legacy getSupabaseClient function called, using createBrowserSupabaseClient instead');
  // Import dynamically to avoid circular dependency
  const { createBrowserSupabaseClient } = require('./supabase');
  return createBrowserSupabaseClient();
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
    console.log(`Attempting auth via token endpoint for ${email.substring(0, 3)}***`);
    
    // Add a delay before attempting authentication to ensure any previous session is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use our dedicated token endpoint for authentication, which properly handles CORS
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Important for cookies
    });

    // Try to parse the response - may fail if network error
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse auth response:', parseError);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }
    
    // Check if the response is successful
    if (!response.ok) {
      console.error('Auth token endpoint error response:', {
        status: response.status,
        statusText: response.statusText,
        error: result.error
      });
      throw new Error(result.error || `Authentication failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Auth token endpoint successful, got session data');
    
    // Transform response to match Supabase format expected by other code
    const transformedResult = {
      session: {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        token_type: result.token_type || 'bearer',
        user: result.user
      },
      user: result.user
    };
    
    // Store the session data locally for Supabase client to use
    if (typeof window !== 'undefined' && transformedResult.session) {
      try {
        // Get the current instance to update its session
        console.log('Setting Supabase session from token endpoint data');
        
        // Add a delay before session setup
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Reset the client first to ensure a clean state
        resetSupabaseClient();
        const refreshedInstance = getSupabaseClient();
        
        // Store session data in local storage as a backup
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const supabaseUrlPrefix = supabaseUrl.includes('.')
            ? supabaseUrl.split('//')[1]?.split('.')[0]
            : '';
          
          const storageKey = `sb-${supabaseUrlPrefix}-auth-token`;
          
          // Store session data in localStorage
          localStorage.setItem(storageKey, JSON.stringify({
            access_token: transformedResult.session.access_token,
            refresh_token: transformedResult.session.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + (transformedResult.session.expires_in || 3600),
            user: transformedResult.user
          }));
          
          console.log('Session data also stored in localStorage');
        } catch (storageError) {
          console.warn('Could not store session in localStorage:', storageError);
        }
        
        // Manually set the auth state - this triggers the auth event listeners
        if (refreshedInstance.auth && typeof refreshedInstance.auth.setSession === 'function') {
          await refreshedInstance.auth.setSession({
            access_token: transformedResult.session.access_token,
            refresh_token: transformedResult.session.refresh_token
          });
          
          console.log('Session explicitly set in Supabase client');
          
          // After setting the session, explicitly trigger a state refresh
          // This helps ensure React components are properly updated
          console.log('Session set, getting user data');
          const { data } = await refreshedInstance.auth.getUser();
          console.log('User authenticated via token endpoint:', data.user?.email);
        } else {
          console.error('Failed to set session: auth.setSession not available');
        }
      } catch (err) {
        console.error('Error setting session from token endpoint:', err);
        // Even if setting the session fails, we can still return the data
        // The Supabase provider might be able to recover on next refresh
      }
    } else {
      console.warn('No session data in token endpoint response or not in browser context');
    }
    
    return transformedResult;
  } catch (error) {
    console.error('Authentication token endpoint error:', error);
    throw error;
  }
}

/**
 * Checks if there is a valid active session without refreshing it
 * @returns Promise<boolean> True if a valid session exists
 */
export async function hasValidSession(): Promise<boolean> {
  try {
    // Get the current Supabase instance
    const supabase = getSupabaseClient();
    
    // Check if there's an active session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error checking session:', error.message);
      return false;
    }
    
    // Verify session has access token and is not expired
    if (data?.session?.access_token) {
      // Check if expired
      const expiresAt = data.session.expires_at;
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        return expiresAt > now;
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in hasValidSession:', error);
    return false;
  }
}

// Don't export a default instance to avoid premature initialization errors
// Instead, import and call getSupabaseClient() when needed 