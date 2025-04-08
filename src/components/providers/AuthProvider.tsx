'use client';

import React, { useEffect, useState } from 'react';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './SupabaseProvider';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Inner component to handle auth sync logic
function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const supabase = useSupabase();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and configure auth sync on client side
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Handle initial session
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        // Log the current auth state for debugging
        console.log('NextAuth session:', session?.user?.email || 'no session');
        console.log('Supabase session:', supabaseSession?.user?.email || 'no session');
        
        // Sync Supabase with NextAuth
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
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsInitialized(true);
      }
    };
    
    initAuth();
  }, [router, session, supabase]);

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