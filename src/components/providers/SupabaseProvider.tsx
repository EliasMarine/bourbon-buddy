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
  
  // Refresh session data with improved timing
  async function refreshSession() {
    const now = Date.now();
    
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
      }
      
      // Only try to refresh if we don't already have a valid session
      const shouldTryRefresh = !sessionData?.session || 
                              (sessionData.session.expires_at && 
                              sessionData.session.expires_at * 1000 < Date.now() + 60 * 60 * 1000); // 1 hour
      
      if (shouldTryRefresh) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.warn('Session refresh failed:', refreshError);
            
            // If we already have a session from getSession, we can continue with that
            if (sessionData?.session) {
              console.log('Continuing with existing session from cookies');
              setIsSessionStable(true);
              isRefreshingSessionRef.current = false;
              globalRefreshingSession = false;
              setIsLoading(false);
              return; // Exit here, don't attempt proxy fallback
            }

            console.error('Supabase refreshSession failed and no initial cookie session found. Cannot refresh.', refreshError);
            // Set error state if refresh fails completely
            if (isMountedRef.current) {
              setError(refreshError);
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
  
  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;
    
    // Initialize session only if not already loading
    if (!isRefreshingSessionRef.current) {
      // Check local storage for session data as a fallback
      if (typeof window !== 'undefined') {
        try {
          // Check if we have a session in localStorage
          const storedSession = localStorage.getItem('sb:session');
          
          // Only restore if there's a stored session and we're not explicitly signed out
          const isSignedOut = localStorage.getItem('auth_state') === 'SIGNED_OUT';
          
          if (storedSession && !isSignedOut) {
            try {
              const parsedSession = JSON.parse(storedSession);
              console.log('Found session data in localStorage, setting as fallback');
              
              // Only set if we have a valid session object with tokens
              if (parsedSession?.access_token && parsedSession?.refresh_token) {
                // Manually set the session to ensure we're authenticated
                supabase.auth.setSession({
                  access_token: parsedSession.access_token,
                  refresh_token: parsedSession.refresh_token
                }).then(({ data }) => {
                  if (data.session) {
                    console.log('Successfully restored session from localStorage');
                  }
                }).catch(err => {
                  console.warn('Error restoring session from localStorage:', err);
                });
              }
            } catch (parseError) {
              console.warn('Error parsing stored session:', parseError);
            }
          } else if (isSignedOut) {
            console.log('Not restoring session from localStorage - user was explicitly signed out');
          }
        } catch (storageError) {
          console.warn('Error accessing localStorage:', storageError);
        }
      }
      
      // Delay the initial session refresh to give cookies time to settle
      setTimeout(() => {
        if (isMountedRef.current) {
          refreshSession();
        }
      }, 800); // Increased from 500ms to give cookies more time to settle
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
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Implement aggressive debouncing for auth events to prevent rapid state changes
        const now = Date.now();
        const lastEventTime = lastAuthEventRef.current[event] || 0;
        
        // Don't process the same event if it occurred too recently
        if (now - lastEventTime < MIN_AUTH_EVENT_INTERVAL) {
          console.log(`Debouncing auth event ${event} - too soon after previous event`);
          return;
        }
        
        // Update the last event timestamp (globally)
        lastAuthEventRef.current[event] = now;
        globalAuthEvents[event] = now;
        
        console.log(`Auth state changed: ${event}`);
        
        // For SIGNED_IN events, always update session and user state right away
        // This ensures the UI reflects the authenticated state promptly
        if (event === 'SIGNED_IN' && session) {
          // Mark session unstable during state transition
          setIsSessionStable(false);
          
          if (isMountedRef.current) {
            setSession(session);
            setUser(session.user);
            setIsLoading(false);
            
            // Mark successful refresh time to avoid immediate refresh after login
            lastSuccessfulRefresh = Date.now();
            
            // Wait a bit for session to stabilize before marking as stable
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsSessionStable(true);
              }
            }, 500);
          }
        }
        // Special handling for TOKEN_REFRESHED to prevent infinite loops
        else if (event === 'TOKEN_REFRESHED') {
          // Only process token refreshed events once every 30 seconds max
          const lastTokenRefreshTime = lastAuthEventRef.current['TOKEN_REFRESHED'] || 0;
          
          if (now - lastTokenRefreshTime < 30000) {
            console.log('Ignoring TOKEN_REFRESHED event - throttling to max once per 30s');
            return;
          }
          
          if (isMountedRef.current) {
            console.log('Processing allowed TOKEN_REFRESHED event with session update');
            setSession(session);
            setUser(session?.user || null);
          }
        } 
        // Special handling for SIGNED_OUT events
        else if (event === 'SIGNED_OUT') {
          if (isMountedRef.current) {
            // Mark explicitly signed out in localStorage to prevent auto-restore
            try {
              localStorage.setItem('auth_state', 'SIGNED_OUT');
            } catch (e) {
              // Ignore storage errors
            }
            
            // Small delay before clearing session to allow any in-flight renders to complete
            setTimeout(() => {
              if (isMountedRef.current) {
                setSession(null);
                setUser(null);
                setIsLoading(false);
              }
            }, 100);
          }
        }
        else {
          // For other events, update normally
          if (isMountedRef.current) {
            setSession(session);
            setUser(session?.user || null);
            setIsLoading(false);
          }
        }
        
        // Only sync on SIGNED_IN event when we don't have a synced user already
        if (session?.user && event === 'SIGNED_IN' && !userSynced && isMountedRef.current) {
          // Check if user is registered via metadata first
          if (session.user.app_metadata?.is_registered === true) {
            setUserSynced(true);
            globalUserSynced = true;
          } else {
            // For SIGNED_IN, use a slight delay to avoid race conditions
            setTimeout(() => {
              if (isMountedRef.current && session?.user) {
                syncUserToDatabase(session.user);
              }
            }, 1000);
          }
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, userSynced]);
  
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
  
  if (context.isLoading) {
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