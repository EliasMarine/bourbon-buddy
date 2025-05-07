'use client';

import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
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
  const { supabase: supabaseClient } = useSupabase();
  const { session, user, isLoading, status } = useSessionContext();

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
      const { data: { session: supabaseSession }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message);
        return null;
      }
      
      return supabaseSession;
    } catch (err) {
      console.error('Error in getSession:', err);
      return null;
    }
  }, [supabaseClient]);
  
  // Function to handle sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
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
  }, [supabaseClient, router]);

  // Function to force refresh avatar by syncing metadata between auth and DB
  const refreshAvatar = useCallback(async () => {
    try {
      // Add a random value to prevent browser caching
      const cacheBuster = Math.random().toString(36).substring(2);
      console.log(`Refreshing avatar with cache buster: ${cacheBuster}`);
      
      // First, trigger the sync metadata endpoint
      const syncResponse = await fetch(`/api/auth/sync-metadata?cb=${cacheBuster}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!syncResponse.ok) {
        console.error('Error syncing metadata:', syncResponse.statusText);
        return false;
      }
      
      const syncData = await syncResponse.json();
      console.log('Metadata sync result:', syncData);
      
      // Explicitly force a refresh from the server
      console.log('Forcing session refresh from server...');
      const { data: { session: freshSession }, error } = 
        await supabaseClient.auth.refreshSession();
        
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
      
      if (freshSession) {
        console.log('Session refreshed successfully with new data:', {
          hasAvatar: !!freshSession.user.user_metadata?.avatar_url,
          avatarUrl: freshSession.user.user_metadata?.avatar_url
        });
      }
      
      // Try to get the user again to ensure latest metadata
      const { data: { user: latestUser }, error: userError } = 
        await supabaseClient.auth.getUser();
        
      if (userError) {
        console.error('Error getting latest user:', userError);
      } else if (latestUser) {
        console.log('Latest user data retrieved:', { 
          id: latestUser.id,
          hasAvatar: !!latestUser.user_metadata?.avatar_url,
          avatarUrl: latestUser.user_metadata?.avatar_url
        });
      }
      
      // Optionally, force a router refresh to update the UI
      router.refresh();
      
      return true;
    } catch (error) {
      console.error('Error refreshing avatar:', error);
      return false;
    }
  }, [supabaseClient, router]);

  return {
    session,
    user,
    isLoading,
    getSession,
    signOut,
    refreshAvatar, // New method to refresh avatar
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
          const { error } = await supabaseClient.auth.updateUser(data);
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