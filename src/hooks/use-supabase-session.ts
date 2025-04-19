'use client';

import { useCallback, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { useSupabase, useSessionContext } from '@/components/providers/SupabaseProvider';
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
  const { supabase } = useSupabase();
  const { session, user, isLoading, status, isSessionStable } = useSessionContext();

  // Call the onSessionChange callback when session changes
  useEffect(() => {
    if (onSessionChange && isSessionStable) {
      onSessionChange(session);
    }
  }, [session, onSessionChange, isSessionStable]);

  // Handle redirects only when session state is stable
  useEffect(() => {
    // Don't redirect if we're still loading or session is not stable
    if (isLoading || !isSessionStable) return;
    
    if (required && status === 'unauthenticated') {
      // Only redirect to login when we're sure the user is not authenticated
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.href)}`);
    } else if (redirectIfFound && status === 'authenticated') {
      // Only redirect when we're sure the user is authenticated
      router.push(redirectTo);
    }
  }, [status, isSessionStable, required, redirectTo, redirectIfFound, router, isLoading]);

  // Function to handle sign out - simplified and more reliable
  const signOut = useCallback(async () => {
    try {
      console.log('🚪 Starting sign out process');
      
      // First, call the server-side logout endpoint to clear cookies
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!logoutResponse.ok) {
        console.error('Server logout failed:', await logoutResponse.text());
      } else {
        console.log('Server logout successful');
      }
      
      // Then use the Supabase client to sign out (revokes refresh token)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out with Supabase client:', error.message);
      }
      
      // Redirect to login page
      router.push('/login');
      return true;
    } catch (err) {
      console.error('Error in signOut:', err);
      // Even if there's an error, try to redirect
      router.push('/login');
      return false;
    }
  }, [supabase, router]);

  return {
    session,
    user,
    isLoading,
    signOut,
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
          return true;
        } catch (error) {
          console.error("Failed to update user:", error);
          return false;
        }
      }
      return false;
    }
  };
}

// For compatibility with next-auth
export const useSession = useSupabaseSession;

// Re-export the Supabase Session and User types for convenience
export type { Session as SupabaseSession } from '@supabase/supabase-js'; 