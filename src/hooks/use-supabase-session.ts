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

      // IMPORTANT: Explicitly update the local session state with the synced data
      if (syncData.user && syncData.user.image) {
        console.log('Updating local session with synced image URL:', syncData.user.image);
        if (supabaseClient) {
          // Force update the user metadata in the supabase client
          await supabaseClient.auth.updateUser({
            data: {
              avatar_url: syncData.user.image
            }
          });
        }
      }
      
      // SAFER APPROACH: Instead of explicitly refreshing the session (which can cause logout),
      // just get the current user data which will reflect any changes without disrupting the session
      console.log('Getting updated user data without refreshing token...');
      const { data: { user: latestUser }, error: userError } = 
        await supabaseClient.auth.getUser();
        
      if (userError) {
        console.error('Error getting latest user:', userError);
        return false;
      } 
      
      if (latestUser) {
        const avatarUrl = latestUser.user_metadata?.avatar_url;
        console.log('Latest user data retrieved:', { 
          id: latestUser.id,
          hasAvatar: !!avatarUrl,
          avatarUrl: avatarUrl
        });

        // If there's still a mismatch between the database image and auth metadata,
        // try one more explicit update to auth metadata
        if (syncData.user && syncData.user.image && syncData.user.image !== avatarUrl) {
          console.log('Final attempt to fix metadata mismatch - Updating auth avatar_url');
          await supabaseClient.auth.updateUser({
            data: {
              avatar_url: syncData.user.image
            }
          });
        }
      }
      
      // Force router refresh to update the UI without full page reload
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
        image: user?.user_metadata?.avatar_url || null,
        avatar_url: user?.user_metadata?.avatar_url || null,
        hasAvatar: !!user?.user_metadata?.avatar_url
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