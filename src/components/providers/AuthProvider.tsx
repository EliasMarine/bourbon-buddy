'use client';

import React, { useEffect, useState } from 'react';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Inner component to handle auth sync logic
function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthSynced, setIsAuthSynced] = useState(false);

  // Initialize and configure Supabase auth on client side
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Handle initial session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        // Log the current auth state for debugging
        console.log('NextAuth session:', session?.user?.email || 'no session');
        console.log('Supabase session:', supabaseSession?.user?.email || 'no session');
        
        // Only attempt to sync if we have a Supabase session but no NextAuth session
        if (supabaseSession && !session) {
          console.log('Syncing Supabase session with NextAuth');
          
          try {
            // Attempt to sign in with existing Supabase session
            await signIn('credentials', { 
              redirect: false,
              email: supabaseSession.user.email,
              // This is just a signal to our auth API - actual auth is done with the Supabase session
              supabaseSession: 'true'
            });
            
            // Refresh to update the UI with new auth state
            router.refresh();
          } catch (signInError) {
            console.error('Error signing in with Supabase session:', signInError);
            // If sign-in fails, we might need to clear the inconsistent state
            if (process.env.NODE_ENV === 'production') {
              // In production, try to force refresh tokens
              await supabase.auth.refreshSession();
            }
          }
        }
        
        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Supabase auth event:', event, session?.user?.id || 'no session');
          
          // Handle auth state changes
          if (event === 'SIGNED_IN') {
            // Refresh the page to ensure app is in sync with auth state
            router.refresh();
          } else if (event === 'SIGNED_OUT') {
            // Redirect to login or refresh
            router.refresh();
          } else if (event === 'TOKEN_REFRESHED') {
            // Silently refresh the page to ensure fresh data
            router.refresh();
          } else if (event === 'USER_UPDATED') {
            // User data changed, refresh the UI
            router.refresh();
          }
        });
        
        setIsAuthSynced(true);
        setIsInitialized(true);
        
        return () => {
          // Clean up listener
          if (authListener) {
            authListener.subscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsInitialized(true);
      }
    };
    
    initAuth();
  }, [router, session]);

  // Only render the children once auth is initialized to avoid flickering
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthSyncProvider>{children}</AuthSyncProvider>
    </SessionProvider>
  );
} 