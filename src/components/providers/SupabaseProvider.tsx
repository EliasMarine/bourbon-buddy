'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Create a context for Supabase
interface SupabaseContextType {
  supabase: ReturnType<typeof createBrowserClient>;
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  error: AuthError | null;
  refreshSession: () => Promise<void>;
  isSessionStable: boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated';
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
  isSessionStable: false,
  status: 'loading'
};

// Create the context
const SupabaseContext = createContext<SupabaseContextType>(defaultContextValue);

// Track if session is currently refreshing
let isSessionRefreshing = false;
// Track the last successful refresh time
let lastSuccessfulRefresh = 0;

/**
 * Provider component that wraps your app and makes Supabase client available
 * to any child component that calls useSupabase().
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Create the Supabase client directly using ssr package
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isSessionStable, setIsSessionStable] = useState(false);
  
  // Track component mount state
  const isMountedRef = useRef<boolean>(false);
  
  // Calculate status based on loading and session state
  const status: 'loading' | 'authenticated' | 'unauthenticated' = isLoading 
    ? 'loading' 
    : session ? 'authenticated' : 'unauthenticated';
  
  // Refresh session function - only refreshes if necessary
  async function refreshSession() {
    const now = Date.now();
    
    // Prevent refreshing too frequently - minimum interval of 10 seconds
    if (now - lastSuccessfulRefresh < 10000) {
      console.log(`Session refresh skipped - last successful refresh was ${Math.round((now - lastSuccessfulRefresh) / 1000)}s ago`);
      return;
    }
    
    // Prevent concurrent refreshes
    if (isSessionRefreshing) {
      console.log('Session refresh already in progress, skipping');
      return;
    }
    
    try {
      isSessionRefreshing = true;
      setIsLoading(true);
      
      console.log('Refreshing session...');
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error.message);
        setError(error);
        setIsSessionStable(true);
      } else if (data.session) {
        console.log('Session refreshed successfully');
        setSession(data.session);
        setUser(data.session.user);
        setError(null);
        lastSuccessfulRefresh = Date.now();
      } else {
        console.log('No active session found');
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Unexpected error during session refresh:', error);
      setError({ message: 'Failed to refresh session', status: 500 } as AuthError);
    } finally {
      setIsLoading(false);
      setIsSessionStable(true);
      isSessionRefreshing = false;
    }
  }
  
  // Initialize session and set up auth state change listener
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial session fetch
    refreshSession();
    
    // Set up auth state change listener with debouncing
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`Auth state changed: ${event}`);
        
        if (!isMountedRef.current) return;
        
        // For sign-in and token refresh events, update session state
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession) {
          setIsSessionStable(false);
          setSession(newSession);
          setUser(newSession.user);
          lastSuccessfulRefresh = Date.now();
          
          // Short delay to allow session to stabilize
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsSessionStable(true);
              setIsLoading(false);
            }
          }, 300);
        } 
        // For sign-out events, clear session state
        else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          setIsSessionStable(true);
        }
        // For initial session events, handle it gracefully
        else if (event === 'INITIAL_SESSION') {
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
          }
          setIsLoading(false);
          setIsSessionStable(true);
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);
  
  const value = {
    supabase,
    isLoading,
    isAuthenticated: !!session,
    session,
    user,
    error,
    refreshSession,
    isSessionStable,
    status
  };
  
  // Show loading indicator if session is not stable yet
  if (!isSessionStable) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }
  
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
  return useContext(SupabaseContext);
}

// Default export for compatibility with layout import
export default SupabaseProvider;