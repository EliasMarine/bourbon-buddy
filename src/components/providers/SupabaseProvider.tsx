'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase-singleton';

// Create a context for Supabase
interface SupabaseContextType {
  supabase: ReturnType<typeof getSupabaseClient>;
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  error: AuthError | null;
  refreshSession: () => Promise<void>;
  isSyncing: boolean;
  userSynced: boolean;
  isSessionStable: boolean;
  nonce?: string; // Add nonce to context
}

// Provide a default context value
const defaultContextValue: SupabaseContextType = {
  supabase: null as any, // Will be set properly in the provider
  isLoading: true,
  isAuthenticated: false,
  session: null,
  user: null,
  error: null,
  refreshSession: async () => {},
  isSyncing: false,
  userSynced: false,
  isSessionStable: false,
  nonce: undefined, // Default nonce value
};

// Create the context
const SupabaseContext = createContext<SupabaseContextType>(defaultContextValue);

// Global tracking to prevent redundant syncs across hot reloads
let globalUserSynced = false;
// Global tracking to prevent redundant session refreshes across hot reloads
let globalRefreshingSession = false;
// Global debounce map for auth events
const globalAuthEvents: Record<string, number> = {};
// Last successful refresh time to prevent excessive refreshes
let lastSuccessfulRefresh = 0;

/**
 * Provider component that wraps your app and makes Supabase client available
 * to any child component that calls useSupabase().
 */
export function SupabaseProvider({ 
  children, 
  nonce 
}: { 
  children: React.ReactNode;
  nonce?: string; 
}) {
  // Get the singleton Supabase client
  const supabase = useMemo(() => getSupabaseClient(), []);
  
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userSynced, setUserSynced] = useState(globalUserSynced);
  
  // Track last sync time to prevent redundant syncs
  const lastSyncRef = useRef<Record<string, number>>({});
  // Track the last auth event timestamp to prevent rapid successive updates
  const lastAuthEventRef = useRef<Record<string, number>>(globalAuthEvents);
  // Minimum time between processing similar auth events (10 seconds - increased from 1 second to prevent loops)
  const MIN_AUTH_EVENT_INTERVAL = 10000;
  // Track if we're currently refreshing the session
  const isRefreshingSessionRef = useRef<boolean>(globalRefreshingSession);
  // Minimum time between session refreshes (30 seconds)
  const MIN_REFRESH_INTERVAL = 30000;
  // Track component mount state
  const isMountedRef = useRef<boolean>(false);
  // Track session stabilization to prevent premature rendering
  const [isSessionStable, setIsSessionStable] = useState(false);
  
  // Keep sessionRef.current updated with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  // Refresh session data with improved timing
  async function refreshSession() {
    const now = Date.now();
    
    // Check if there's already a session before attempting refresh
    try {
      // Get the current auth state from localStorage to avoid unnecessary refreshes
      const authStateItem = localStorage.getItem('auth_state');
      if (authStateItem === 'SIGNED_OUT') {
        console.log('Session refresh skipped - user is explicitly signed out');
        setIsSessionStable(true);
        setIsLoading(false);
        return;
      }
    } catch (storageError) {
      // Ignore localStorage errors
    }
    
    // Prevent refreshing too frequently - increase the minimum interval
    if (now - lastSuccessfulRefresh < MIN_REFRESH_INTERVAL) {
      console.log(`Session refresh skipped - last successful refresh was ${Math.round((now - lastSuccessfulRefresh) / 1000)}s ago`);
      setIsSessionStable(true);
      return;
    }
    
    // Prevent concurrent refreshes
    if (isRefreshingSessionRef.current) {
      console.log('Session refresh already in progress, skipping');
      return;
    }
    
    try {
      isRefreshingSessionRef.current = true;
      globalRefreshingSession = true;
      setIsLoading(true);
      
      // Defensive check to ensure auth is initialized
      if (!supabase?.auth) {
        console.error('Supabase auth not initialized during refreshSession');
        setError({ message: 'Authentication service unavailable', status: 500 } as AuthError);
        setIsLoading(false);
        setIsSessionStable(true);
        return;
      }
      
      console.log('Refreshing session...');
      
      // First try to get the session from cookies
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('GetSession failed:', sessionError);
      } else if (sessionData?.session) {
        console.log('Got session from cookies successfully');
        if (isMountedRef.current) {
          setSession(sessionData.session);
          setUser(sessionData.session.user);
          setError(null);
          
          // Mark successful refresh time
          lastSuccessfulRefresh = Date.now();
          setIsSessionStable(true);
          isRefreshingSessionRef.current = false;
          globalRefreshingSession = false;
          setIsLoading(false);
          
          // If session is valid for more than 10 minutes, skip further refresh
          const expiresAt = sessionData.session.expires_at;
          const expiresInMs = expiresAt ? (expiresAt * 1000) - Date.now() : 0;
          
          if (expiresInMs > 10 * 60 * 1000) {
            console.log(`Session valid for ${Math.round(expiresInMs / 1000 / 60)} minutes, skipping refresh`);
            return;
          }
        }
      } else {
        // If no session found and no sessionError, we're simply not logged in
        // This is normal behavior, not an error, so we should set state accordingly
        console.log('No session found - user is likely not logged in');
        if (isMountedRef.current) {
          setSession(null);
          setUser(null);
          setError(null);
          setIsSessionStable(true);
          isRefreshingSessionRef.current = false;
          globalRefreshingSession = false;
          setIsLoading(false);
          return;
        }
      }
      
      // Only try to refresh if we don't already have a valid session
      const shouldTryRefresh = !sessionData?.session || 
                              (sessionData.session.expires_at && 
                              sessionData.session.expires_at * 1000 < Date.now() + 60 * 60 * 1000);
      
      if (shouldTryRefresh) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            // Only log the error if we expected to have a session
            if (sessionData?.session) {
              console.warn('Session refresh failed:', refreshError);
            } else {
              // This is expected for users who aren't logged in yet
              console.log('No session to refresh - this is normal for non-authenticated users');
            }
            
            // If we already have a session from getSession, we can continue with that
            if (sessionData?.session) {
              console.log('Continuing with existing session from cookies');
              setIsSessionStable(true);
              isRefreshingSessionRef.current = false;
              globalRefreshingSession = false;
              setIsLoading(false);
              return; // Exit here, don't attempt proxy fallback
            }

            // Only log this as an error if we expected to have a session
            if (sessionData?.session) {
              console.error('Supabase refreshSession failed and no initial cookie session found. Cannot refresh.', refreshError);
              // Set error state if refresh fails completely
              if (isMountedRef.current) {
                setError(refreshError);
              }
            }

          } else if (refreshData?.session) {
            console.log('Successfully refreshed session via Supabase client');
            if (isMountedRef.current) {
              setSession(refreshData.session);
              setUser(refreshData.session.user);
              setError(null);
              lastSuccessfulRefresh = Date.now();
            }
          }
        } catch (error) {
          console.error('Unexpected error during session refresh:', error);
          setError({ message: 'Failed to refresh session', status: 500 } as AuthError);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsSessionStable(true);
      }
      isRefreshingSessionRef.current = false;
      globalRefreshingSession = false;
    }
  }
  
  // Sync user to database with deduplication logic
  async function syncUserToDatabase(user: User) {
    try {
      // Skip if already syncing
      if (isSyncing) {
        console.log('Skipping sync - already in progress');
        return;
      }
      
      // Skip if already synced
      if (userSynced) {
        console.log('Skipping sync - user already synced');
        return;
      }
      
      // Only sync in browser environment
      if (typeof window === 'undefined') return;
      
      // Check if we've synced this user recently
      const userId = user.id;
      const now = Date.now();
      const lastSync = lastSyncRef.current[userId] || 0;
      
      if (now - lastSync < MIN_AUTH_EVENT_INTERVAL) {
        console.log(`Skipping sync - last sync was ${(now - lastSync) / 1000}s ago`);
        return;
      }
      
      // Check if user is already registered via metadata in both places
      const isRegistered = user.app_metadata?.is_registered === true || 
                          user.user_metadata?.is_registered === true;
                          
      if (isRegistered) {
        const lastSynced = user.app_metadata?.last_synced_at || user.user_metadata?.last_synced_at;
        if (lastSynced) {
          console.log(`User already registered with metadata timestamp ${lastSynced}`);
          setUserSynced(true);
          globalUserSynced = true;
          return;
        }
      }
      
      // Mark as syncing
      setIsSyncing(true);
      
      // First check registration status to avoid unnecessary syncs
      try {
        const timestamp = Date.now();
        const checkResponse = await fetch(`/api/auth/check-status?t=${timestamp}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          if (data.isRegistered) {
            console.log('User already registered according to API check');
            lastSyncRef.current[userId] = now;
            setUserSynced(true);
            globalUserSynced = true;
            setIsSyncing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error checking registration status:', err);
        // Continue with sync if check fails
      }
      
      // Call API route to sync user
      console.log('Syncing user to database:', userId);
      const timestamp = Date.now(); // Add timestamp to prevent caching
      const response = await fetch(`/api/auth/sync-user?t=${timestamp}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        console.log('User sync successful');
        // Update last sync time
        lastSyncRef.current[userId] = now;
        setUserSynced(true);
        globalUserSynced = true;
        
        // Do not trigger immediate session refresh to avoid infinite loop
        // Wait longer to let changes propagate
        setTimeout(async () => {
          if (isMountedRef.current && !isRefreshingSessionRef.current) {
            await refreshSession();
          }
        }, 5000);
      } else {
        console.warn(`User sync failed: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error syncing user to database:', err);
      // Don't throw - this is a background operation
    } finally {
      setIsSyncing(false);
    }
  }
  
  // Initialize auth state when component mounts
  useEffect(() => {
    // Set mounted flag
    isMountedRef.current = true;
    let explicitlySignedOut = false; // Flag to track if we encountered this
    
    // Try to load persisted session data from localStorage first
    if (typeof window !== 'undefined') {
      try {
        // Check if we have explicit sign-out state
        const authStateItem = localStorage.getItem('auth_state');
        if (authStateItem === 'SIGNED_OUT') {
          console.log('[SupabaseProvider useEffect] Found explicit sign-out state. Initializing as logged out.');
          explicitlySignedOut = true;
          setSession(null);
          setUser(null);
          setIsLoading(false);
          setIsSessionStable(true);
          // IMPORTANT: Remove the flag so it doesn't interfere with subsequent logins on this client
          // without a hard page refresh.
          try {
            localStorage.removeItem('auth_state');
            console.log('[SupabaseProvider useEffect] Removed \'auth_state=SIGNED_OUT\' from localStorage.');
          } catch (e) { console.warn('[SupabaseProvider useEffect] Failed to remove auth_state from localStorage', e); }
          // DO NOT return here. Allow onAuthStateChange to take over if tokens in URL / subsequent login.
        }
      } catch (storageError) {
        console.warn('[SupabaseProvider useEffect] Error accessing localStorage for auth_state:', storageError);
      }
      
      // If not explicitly signed out by the flag above, proceed with trying to load from persisted session / refresh
      if (!explicitlySignedOut) {
        const sessionDataStr = localStorage.getItem('supabase.auth.session');
        if (sessionDataStr) {
          try {
            const sessionData = JSON.parse(sessionDataStr);
            if (sessionData && sessionData.user && sessionData.expires_at && sessionData.refresh_token) {
              console.log('[SupabaseProvider useEffect] Found session data in localStorage, setting as temporary fallback.');
              if (isMountedRef.current) {
                setSession(sessionData);
                setUser(sessionData.user);
                // Still keep isLoading potentially true until refreshSession confirms or onAuthStateChange fires
              }
            }
          } catch (parseError) {
            console.warn('[SupabaseProvider useEffect] Error parsing stored session data:', parseError);
            try {
              localStorage.removeItem('supabase.auth.session');
            } catch (storageError) {
              console.warn('[SupabaseProvider useEffect] Error accessing localStorage for supabase.auth.session removal:', storageError);
            }
          }
        } else {
            console.log('[SupabaseProvider useEffect] No supabase.auth.session data found in storage. Initial state likely logged-out (unless URL tokens provide one via onAuthStateChange).');
            // Avoid setting isLoading to false here if we might still get a session from URL tokens via onAuthStateChange
            // If no persisted session indicators either, then it's safe to assume not loading.
        }
        
        const hasPersistedSession = 
          !!localStorage.getItem('supabase.auth.token') || 
          !!localStorage.getItem('supabase.auth.session') || // Check again in case it was set above
          document.cookie.includes('sb-');
          
        if (hasPersistedSession) {
          console.log('[SupabaseProvider useEffect] Persisted session indicators found, scheduling refreshSession.');
          setTimeout(() => {
            if (isMountedRef.current) {
              refreshSession();
            }
          }, 800); 
        } else {
          console.log('[SupabaseProvider useEffect] No persisted session indicators, skipping initial refreshSession call.');
          // If not explicitly signed out and no persisted session indicators at all, 
          // then we are truly starting fresh and not loading a session.
          // onAuthStateChange will still fire INITIAL_SESSION (likely null).
          if (!explicitlySignedOut) { // Re-check as localStorage might have been cleared
            setIsLoading(false);
            setIsSessionStable(true);
          }
        }
      }
    }
    
    // Defensive check to ensure auth is initialized
    if (!supabase?.auth) {
      console.error('Supabase auth not initialized during setup');
      setError({ message: 'Authentication service unavailable', status: 500 } as AuthError);
      setIsLoading(false);
      return () => {
        isMountedRef.current = false;
      };
    }
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, eventSession) => {
      const now = Date.now();
      
      // --- MODIFIED DEBOUNCE ---
      // Apply debounce ONLY to USER_UPDATED and TOKEN_REFRESHED to prevent rapid loops with these specific events.
      // INITIAL_SESSION, SIGNED_IN, SIGNED_OUT should be processed more immediately.
      if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        const lastEventTime = lastAuthEventRef.current[event] || 0;
        // Custom shorter debounce for USER_UPDATED if needed, or use MIN_AUTH_EVENT_INTERVAL
        const interval = event === 'USER_UPDATED' ? 1000 : MIN_AUTH_EVENT_INTERVAL; // Shorter for USER_UPDATED, longer for TOKEN_REFRESHED
        if (now - lastEventTime < interval) { 
          console.log(`[SupabaseProvider] Debouncing auth event ${event} - too soon. Last: ${lastEventTime}, Now: ${now}, Diff: ${now-lastEventTime}ms. Interval: ${interval}ms`);
          return;
        }
      } 
      // --- END MODIFIED DEBOUNCE ---

      lastAuthEventRef.current[event] = now;
      globalAuthEvents[event] = now;
      console.log(`[SupabaseProvider] Auth event: ${event}`, { session: eventSession }); 

      if (event === 'INITIAL_SESSION') {
        if (isMountedRef.current) {
          console.log('[SupabaseProvider] INITIAL_SESSION: Setting state based on eventSession:', eventSession);
          setSession(eventSession); // Could be null or a restored session
          setUser(eventSession?.user || null);
          setIsLoading(false);
          setIsSessionStable(true); // Initial state is considered stable
        }
      } else if (event === 'SIGNED_IN' && eventSession) {
        if (isMountedRef.current) {
          console.log('[SupabaseProvider] SIGNED_IN: Initiating session update.');
          setIsLoading(true);         
          setIsSessionStable(false);  
          
          setSession(eventSession);
          setUser(eventSession.user);
          setError(null); 
          lastSuccessfulRefresh = Date.now(); 

          // Schedule stable state for the next tick or slightly after
          setTimeout(() => {
            if (isMountedRef.current) {
              console.log('[SupabaseProvider] SIGNED_IN: Completing session update, setting stable.');
              setIsLoading(false);
              setIsSessionStable(true);
            }
          }, 0); // Using setTimeout with 0ms delay
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMountedRef.current) {
          console.log('[SupabaseProvider] SIGNED_OUT: Clearing session.');
          try {
            localStorage.setItem('auth_state', 'SIGNED_OUT');
          } catch (e) {/* ignore */}
          
          setSession(null);
          setUser(null);
          setIsLoading(false);
          setIsSessionStable(true); 
        }
      } else if (event === 'USER_UPDATED' && eventSession) { // Typically means metadata changed
         if (isMountedRef.current) {
            console.log('[SupabaseProvider] USER_UPDATED: Updating session with new metadata.');
            setSession(eventSession);
            setUser(eventSession.user); // Corrected to eventSession.user
            // Don't change isLoading/isSessionStable unless necessary,
            // assume it was already stable if USER_UPDATED fires.
            // However, if it was loading, ensure it becomes not loading.
            if (isLoading) setIsLoading(false);
            if (!isSessionStable) setIsSessionStable(true);
         }
      } else if (event === 'TOKEN_REFRESHED' && eventSession) {
         if (isMountedRef.current) {
            console.log('[SupabaseProvider] TOKEN_REFRESHED: Updating session.');
            setSession(eventSession);
            setUser(eventSession.user); // Corrected to eventSession.user
            if (isLoading) setIsLoading(false);
            if (!isSessionStable) setIsSessionStable(true);
         }
      } else if (eventSession === null) {
        // Catch-all for other events that might have a null session (e.g. USER_UPDATED with error resulting in null session)
        if (isMountedRef.current) {
          console.log(`[SupabaseProvider] Event: ${event} with null eventSession. Setting session to null.`);
          setSession(null);
          setUser(null);
          setIsLoading(false);
          setIsSessionStable(true);
        }
      }
      
      // Only sync on SIGNED_IN event when we don't have a synced user already
      if (eventSession?.user && event === 'SIGNED_IN' && !userSynced && isMountedRef.current) {
        // Check if user is registered via metadata first
        if (eventSession.user.app_metadata?.is_registered === true) {
          setUserSynced(true);
          globalUserSynced = true;
        } else {
          // For SIGNED_IN, use a slight delay to avoid race conditions
          setTimeout(() => {
            if (isMountedRef.current && eventSession?.user) {
              syncUserToDatabase(eventSession.user);
            }
          }, 1000);
        }
      }
    });
    
    // Clean up subscription on unmount
    return () => {
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]); // Removed userSynced from dependency array
  
  const value = {
    supabase,
    isLoading,
    isAuthenticated: !!session,
    session,
    user,
    error,
    refreshSession,
    isSyncing,
    userSynced,
    isSessionStable,
    nonce, // Include nonce in context
  };
  
  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Hook to access Supabase client
 */
export function useSupabase() {
  const context = useContext(SupabaseContext);
  
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  
  return context;
}

/**
 * Hook to access Supabase session context with NextAuth-like API
 * This provides a unified interface for session management
 */
export function useSessionContext() {
  const context = useContext(SupabaseContext);
  
  if (!context) {
    throw new Error('useSessionContext must be used within a SupabaseProvider');
  }
  
  // Calculate status based on loading and session state
  let status: 'loading' | 'authenticated' | 'unauthenticated';
  
  if (context.isLoading || !context.isSessionStable) { // Check isSessionStable as well
    status = 'loading';
  } else if (context.session) {
    status = 'authenticated';
  } else {
    status = 'unauthenticated';
  }
  
  return {
    ...context,
    status
  };
}

// Default export for compatibility with layout import
export default SupabaseProvider;