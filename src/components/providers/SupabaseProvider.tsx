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
};

// Create the context
const SupabaseContext = createContext<SupabaseContextType>(defaultContextValue);

// Global tracking to prevent redundant syncs across hot reloads
let globalUserSynced = false;
// Global tracking to prevent redundant session refreshes across hot reloads
let globalRefreshingSession = false;
// Global debounce map for auth events
const globalAuthEvents: Record<string, number> = {};

/**
 * Provider component that wraps your app and makes Supabase client available
 * to any child component that calls useSupabase().
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
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
  // Minimum time between syncs for the same user (5 seconds)
  const MIN_SYNC_INTERVAL = 5000;
  // Minimum time between processing similar auth events (10 seconds - increased from 1 second to prevent loops)
  const MIN_AUTH_EVENT_INTERVAL = 10000;
  // Track if we're currently refreshing the session
  const isRefreshingSessionRef = useRef<boolean>(globalRefreshingSession);
  // Track component mount state
  const isMountedRef = useRef<boolean>(false);
  
  // Refresh session data
  async function refreshSession() {
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
        return;
      }
      
      console.log('Refreshing session...');
      
      // First try to refresh the session to get the latest metadata
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      // If refresh fails, try getSession
      if (refreshError) {
        console.warn('Session refresh failed, falling back to getSession:', refreshError);
        
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('GetSession also failed:', error);
            
            // Only try to recover if we're actually mounted
            if (isMountedRef.current && typeof window !== 'undefined') {
              const storedSession = localStorage.getItem('supabase.auth.token');
              if (storedSession) {
                console.log('Found stored session, attempting to recover');
                // We have a stored session, let's try to recover by calling refreshSession again in 1s
                setTimeout(() => {
                  if (isMountedRef.current) refreshSession();
                }, 1000);
              }
            }
            
            setError(error);
          } else {
            // Successfully got session
            if (isMountedRef.current) {
              setSession(data.session);
              setUser(data.session?.user || null);
              setError(null); // Clear any previous errors
            }
          }
        } catch (innerError) {
          console.error('Critical error in getSession fallback:', innerError);
          if (isMountedRef.current) {
            setError({ message: 'Failed to retrieve session', status: 500 } as AuthError);
          }
        }
      } else {
        // Use the refreshed session data
        if (isMountedRef.current) {
          setSession(refreshData.session);
          setUser(refreshData.session?.user || null);
          setError(null); // Clear any previous errors
        }
      }
      
      // Check for registration status in both app_metadata and user_metadata
      const currentUser = refreshData?.session?.user || user;
      if (currentUser && isMountedRef.current) {
        const isRegistered = currentUser.app_metadata?.is_registered === true || 
                            currentUser.user_metadata?.is_registered === true;
                            
        const hasLastSyncTime = !!currentUser.app_metadata?.last_synced_at || 
                               !!currentUser.user_metadata?.last_synced_at;
        
        // Mark as synced if registered or if we have a last_synced_at timestamp
        if (isRegistered || hasLastSyncTime) {
          console.log('User has is_registered flag or last_synced_at timestamp');
          setUserSynced(true);
          globalUserSynced = true;
        }
      }
    } catch (err) {
      console.error('Error in refreshSession:', err);
      if (isMountedRef.current) {
        setError(err as AuthError);
      }
      
      // Implement retry mechanism only if mounted
      if (isMountedRef.current && typeof window !== 'undefined') {
        console.log('Setting up retry for session refresh');
        setTimeout(() => {
          if (isMountedRef.current) refreshSession();
        }, 3000); // Retry after 3 seconds
      }
    } finally {
      isRefreshingSessionRef.current = false;
      globalRefreshingSession = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
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
      
      if (now - lastSync < MIN_SYNC_INTERVAL) {
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
      refreshSession();
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
        
        // Special handling for TOKEN_REFRESHED to prevent infinite loops
        if (event === 'TOKEN_REFRESHED') {
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
        } else {
          // For other events, update normally
          if (isMountedRef.current) {
            setSession(session);
            setUser(session?.user || null);
          }
        }
        
        if (isMountedRef.current) {
          setIsLoading(false);
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