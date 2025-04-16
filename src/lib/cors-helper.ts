/**
 * Utility to help detect and fix CORS issues with Supabase
 */

/**
 * Checks if we can communicate with Supabase properly
 * Returns true if successful, false if CORS issues detected
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Try a simple no-auth request first
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json'
      },
      // Don't include credentials yet to avoid CORS issues
      mode: 'cors'
    });
    
    // If we got an error response, it likely means the Supabase instance is available but possibly misconfigured
    if (!response.ok) {
      console.warn('Supabase connection check failed with status:', response.status);
      return false;
    }
    
    console.log('✅ Direct Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ CORS issue detected with Supabase connection:', error);
    return false;
  }
}

/**
 * Forces a session refresh using our proxy instead of direct Supabase calls
 */
export async function forceSessionRefreshViaProxy(refreshToken: string): Promise<boolean> {
  try {
    console.log('Attempting session refresh via proxy');
    
    const response = await fetch('/api/auth/token-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      }),
      credentials: 'include',
      mode: 'same-origin'
    });
    
    if (!response.ok) {
      console.error('Failed to refresh session via proxy:', await response.text());
      return false;
    }
    
    const data = await response.json();
    
    // Store in session storage (doesn't get cleared when refreshing the page)
    if (typeof window !== 'undefined' && data) {
      try {
        sessionStorage.setItem('sb-session-proxy-refresh', 'true');
      } catch (e) {
        console.warn('Could not write to sessionStorage', e);
      }
    }
    
    console.log('✅ Session refreshed via proxy successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to refresh session via proxy:', error);
    return false;
  }
} 