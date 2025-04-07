'use client';

import React, { useEffect, useState } from 'react';
import { SessionProvider, signIn } from 'next-auth/react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and configure Supabase auth on client side
  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Handle initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Supabase session detected:', session.user.id);
          
          // Sync Supabase session with NextAuth
          // This helps ensure both auth systems are in sync
          const result = await fetch('/api/auth/session');
          if (!result.ok) {
            // If no NextAuth session but Supabase session exists, sync them
            console.log('Syncing Supabase session with NextAuth');
            await signIn('credentials', { 
              redirect: false,
              email: session.user.email,
              // This is just a signal to our auth API - actual auth is done with the Supabase session
              supabaseSession: 'true'
            });
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
          }
        });
        
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
  }, [router]);

  // Only render the children once auth is initialized to avoid flickering
  return (
    <SessionProvider>
      {isInitialized ? children : 
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      }
    </SessionProvider>
  );
} 