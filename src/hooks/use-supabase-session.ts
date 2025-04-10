'use client';

import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useSessionContext } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';

export interface UseSupabaseSessionOptions {
  /**
   * If true, redirects to login page when session is not available
   */
  required?: boolean;
  /**
   * URL to redirect to if session is not available
   */
  redirectTo?: string;
  /**
   * If true, redirects even if not mounted yet
   */
  redirectIfFound?: boolean;
  /**
   * Callback when session changes
   */
  onSessionChange?: (session: Session | null) => void;
}

/**
 * NextAuth compatible session hook that works with Supabase
 * 
 * @example
 * // Basic usage - just like useSession() from next-auth
 * const { data: session, status } = useSupabaseSession()
 * 
 * if (status === "loading") return <div>Loading...</div>
 * if (status === "unauthenticated") return <div>Not logged in</div>
 * 
 * return <div>Welcome {session.user.name}!</div>
 */
export function useSupabaseSession(options: UseSupabaseSessionOptions = {}) {
  const {
    required = false,
    redirectTo = '/login',
    redirectIfFound = false,
    onSessionChange
  } = options;

  const router = useRouter();
  const supabase = useSupabase();
  const sessionContext = useSessionContext();
  
  // Extract session data from context
  const { session, user, isLoading, status } = sessionContext;

  // Call the onSessionChange callback when session changes
  useEffect(() => {
    if (onSessionChange) {
      onSessionChange(session);
    }
  }, [session, onSessionChange]);

  // Handle redirects
  useEffect(() => {
    if (isLoading) return;
    
    if (required && !session) {
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`);
    } else if (redirectIfFound && session) {
      router.push(redirectTo);
    }
  }, [session, isLoading, required, redirectTo, redirectIfFound, router]);

  // Function to fetch session
  const getSession = useCallback(async () => {
    try {
      const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message);
        return null;
      }
      
      return supabaseSession;
    } catch (err) {
      console.error('Error in getSession:', err);
      return null;
    }
  }, [supabase]);
  
  // Function to handle sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        return false;
      }
      
      // Refresh the page to ensure all state is cleared
      router.refresh();
      return true;
    } catch (err) {
      console.error('Error in signOut:', err);
      return false;
    }
  }, [supabase, router]);

  return {
    session,
    user,
    isLoading,
    getSession,
    signOut,
    // NextAuth compatibility properties
    status,
    data: session ? {
      user: {
        id: user?.id || '',
        email: user?.email || '',
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
        image: user?.user_metadata?.avatar_url || null
      },
      expires: new Date(session.expires_at! * 1000).toISOString()
    } : null,
    update: async (data: any) => {
      if (user) {
        try {
          const { error } = await supabase.auth.updateUser(data);
          if (error) throw error;
          return await getSession();
        } catch (error) {
          console.error("Failed to update user:", error);
          return null;
        }
      }
      return null;
    }
  };
}

// For compatibility with next-auth
export const useSession = useSupabaseSession;

// Re-export the Supabase Session and User types for convenience
export type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'; 