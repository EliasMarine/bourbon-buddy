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
  const supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options?.supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Ensure we have the required config
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }

  // Validate URL format
  try {
    // This will throw if the URL is invalid
    new URL(supabaseUrl);
  } catch (error) {
    console.error('Invalid Supabase URL:', error);
    throw new Error(`Invalid Supabase URL: ${supabaseUrl}. Please check your environment variables.`);
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
            try {
              const headers = new Headers(options.headers || {});
              headers.set('X-Client-Info', 'supabase-js/browser/singleton');
              
              // Create a new AbortController with a longer timeout
              const timeoutMs = 90000; // 90 seconds
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
              
              // Get URL as string for easier pattern matching
              const urlString = url.toString();
              
              console.log(`Supabase fetch: ${options.method || 'GET'} ${urlString.split('?')[0]}`);
              
              // Detect browser
              const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
              const isFirefox = userAgent.includes('Firefox');
              const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
              
              // ========================
              // AUTH REQUEST INTERCEPTION
              // ========================
              
              // Handle auth-related requests to avoid CORS issues
              if (urlString.includes('/auth/v1/')) {
                // For ALL browsers, use proxy for logout (not just Firefox)
                if (urlString.includes('/auth/v1/logout')) {
                  clearTimeout(timeoutId);
                  console.log('Intercepting logout request to use proxy');
                  
                  // Get the authorization header safely
                  const authHeader = typeof options.headers === 'object' && options.headers !== null 
                    ? (options.headers as Record<string, string>)['Authorization'] || ''
                    : '';
                  
                  return fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': authHeader
                    },
                    credentials: 'include'
                  });
                }
                
                // Handle user info requests to avoid CORS issues
                if (urlString.includes('/auth/v1/user')) {
                  clearTimeout(timeoutId);
                  console.log('Intercepting user info request to use proxy');
                  
                  // Get the authorization header safely
                  const authHeader = typeof options.headers === 'object' && options.headers !== null 
                    ? (options.headers as Record<string, string>)['Authorization'] || ''
                    : '';
                  
                  return fetch('/api/auth/user', {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': authHeader
                    },
                    credentials: 'include',
                    mode: 'same-origin'
                  }).catch(error => {
                    console.error('Error using auth user proxy:', error);
                    throw error;
                  });
                }
                
                // Handle token requests with URL parameters (GET requests with refresh_token)
                if (urlString.includes('/auth/v1/token') && urlString.includes('grant_type=refresh_token')) {
                  clearTimeout(timeoutId);
                  console.log('Intercepting refresh token URL request to use proxy');
                  
                  // Extract the refresh token from URL
                  const url = new URL(urlString);
                  const refreshToken = url.searchParams.get('refresh_token');
                  
                  // Get CSRF token if available
                  let csrfToken = '';
                  try {
                    if (typeof window !== 'undefined' && window.sessionStorage) {
                      csrfToken = window.sessionStorage.getItem('csrfToken') || '';
                    }
                  } catch (error) {
                    console.warn('Unable to retrieve CSRF token from sessionStorage:', error);
                  }
                  
                  return fetch('/api/auth/token-refresh', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                    },
                    body: JSON.stringify({
                      refresh_token: refreshToken
                    }),
                    credentials: 'include',
                    mode: 'same-origin'
                  }).catch(error => {
                    console.error('Error using refresh token proxy (URL params):', error);
                    throw error;
                  });
                }
                
                // Handle token requests
                if (urlString.includes('/auth/v1/token')) {
                  // Parse body data - handle both string and other formats
                  let body: Record<string, any> = {};
                  try {
                    if (options.body) {
                      if (typeof options.body === 'string') {
                        body = JSON.parse(options.body);
                      } else if (options.body instanceof FormData) {
                        // Convert FormData to object
                        const formData = options.body;
                        formData.forEach((value, key) => {
                          body[key] = value;
                        });
                      } else if (options.body instanceof URLSearchParams) {
                        // Convert URLSearchParams to object
                        const params = options.body;
                        params.forEach((value, key) => {
                          body[key] = value;
                        });
                      } else if (typeof options.body === 'object') {
                        // Already an object
                        body = options.body as Record<string, any>;
                      }
                    }
                  } catch (err) {
                    console.error('Error parsing request body:', err);
                  }
                  
                  // Password sign-in
                  if ('email' in body && 'password' in body && body.grant_type === 'password') {
                    clearTimeout(timeoutId);
                    console.log('Intercepting sign-in request to use proxy');
                    
                    return fetch('/api/auth/token', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email: body.email,
                        password: body.password
                      }),
                      credentials: 'include',
                      mode: 'same-origin' // Set to same-origin to avoid CORS
                    }).catch(error => {
                      console.error('Error using auth token proxy:', error);
                      throw error;
                    });
                  }
                  
                  // Token refresh - ALWAYS use our proxy for all browsers
                  if ('refresh_token' in body && body.grant_type === 'refresh_token') {
                    clearTimeout(timeoutId);
                    console.log('Intercepting refresh token request to use proxy');
                    
                    // Check if we've been explicitly signed out
                    let isSignedOut = false;
                    try {
                      isSignedOut = localStorage.getItem('auth_state') === 'SIGNED_OUT';
                    } catch (e) {
                      // Ignore storage errors
                    }
                    
                    // Abort token refresh if user was signed out
                    if (isSignedOut) {
                      console.log('Aborting token refresh - user was explicitly signed out');
                      return Promise.resolve(new Response(JSON.stringify({ 
                        error: 'User is signed out',
                        error_description: 'Authentication has been terminated'
                      }), { 
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                      }));
                    }
                    
                    // If refresh token is invalid or missing, don't attempt the refresh
                    // This prevents the 400 error that requires a second click
                    if (!body.refresh_token || typeof body.refresh_token !== 'string' || body.refresh_token.length < 10) {
                      console.log('Invalid or missing refresh token - skipping refresh attempt');
                      return Promise.resolve(new Response(JSON.stringify({ 
                        error: 'Invalid refresh token',
                        error_description: 'Session expired or invalid'
                      }), { 
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                      }));
                    }
                    
                    // Get CSRF token if available
                    let csrfToken = '';
                    try {
                      if (typeof window !== 'undefined' && window.sessionStorage) {
                        csrfToken = window.sessionStorage.getItem('csrfToken') || '';
                      }
                    } catch (error) {
                      console.warn('Unable to retrieve CSRF token from sessionStorage:', error);
                    }
                    
                    // Extract refresh token from request
                    const refreshToken = body.refresh_token;
                    
                    return fetch('/api/auth/token-refresh', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                      },
                      body: JSON.stringify({
                        refresh_token: refreshToken
                      }),
                      credentials: 'include',
                      mode: 'same-origin'
                    }).then(response => {
                      if (!response.ok) {
                        console.error(`Refresh token proxy error: ${response.status} ${response.statusText}`);
                        // Let the Supabase client handle this error
                      } else {
                        console.log('Refresh token proxy successful');
                      }
                      return response;
                    }).catch(error => {
                      console.error('Error using refresh token proxy:', error);
                      throw error;
                    });
                  }
                }
                
                // For any other auth endpoint, add CORS mode explicitly
                console.log(`Auth request: ${urlString} with credentials`);
              }
              
              // For all other requests, add CORS mode and credentials
              const fetchPromise = fetch(url, {
                ...options,
                headers,
                // Always include credentials for Supabase requests
                credentials: 'include',
                signal: controller.signal,
                mode: 'cors'
              });
              
              // Add timeout cleanup
              return fetchPromise.finally(() => {
                clearTimeout(timeoutId);
              });
            } catch (error) {
              console.error('Error in Supabase fetch interceptor:', error);
              // Re-throw to maintain expected error handling
              throw error;
            }
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